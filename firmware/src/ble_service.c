/**
 * ══════════════════════════════════════
 * PART:   ARA Health BLE GATT Service
 * ACTOR:  Claude Opus 4.6
 * PHASE:  18 — BLE Service Implementation
 * ══════════════════════════════════════
 *
 * Custom GATT service for ARA Patch with 4 characteristics:
 *   ARA1: Sensor Data (notify, 20B @ 25Hz)
 *   ARA2: PPG Raw     (notify, 20B for SpO₂)
 *   ARA3: Patch ID    (read-only)
 *   ARA4: Audio       (notify + write for mic control)
 */

#include <zephyr/kernel.h>
#include <zephyr/bluetooth/bluetooth.h>
#include <zephyr/bluetooth/gatt.h>
#include <zephyr/bluetooth/uuid.h>
#include <zephyr/logging/log.h>
#include <string.h>

#include "ble_service.h"

LOG_MODULE_REGISTER(ara_ble, LOG_LEVEL_INF);

/* ── State ── */
static bool ble_connected;
static uint8_t audio_cmd;  /* current mic command */
static char patch_id[32];

/* ── UUID Declarations ── */
static struct bt_uuid_128 ara_svc_uuid = BT_UUID_INIT_128(ARA_SERVICE_UUID);
static struct bt_uuid_128 sensor_data_uuid = BT_UUID_INIT_128(ARA_CHAR_SENSOR_DATA_UUID);
static struct bt_uuid_128 ppg_raw_uuid = BT_UUID_INIT_128(ARA_CHAR_PPG_RAW_UUID);
static struct bt_uuid_128 patch_id_uuid = BT_UUID_INIT_128(ARA_CHAR_PATCH_ID_UUID);
static struct bt_uuid_128 audio_uuid = BT_UUID_INIT_128(ARA_CHAR_AUDIO_UUID);

/* ── Patch ID Read Callback ── */
static ssize_t read_patch_id(struct bt_conn *conn,
                             const struct bt_gatt_attr *attr,
                             void *buf, uint16_t len, uint16_t offset)
{
    return bt_gatt_attr_read(conn, attr, buf, len, offset,
                             patch_id, strlen(patch_id));
}

/* ── Audio Command Write Callback ── */
static ssize_t write_audio_cmd(struct bt_conn *conn,
                               const struct bt_gatt_attr *attr,
                               const void *buf, uint16_t len,
                               uint16_t offset, uint8_t flags)
{
    if (len != 1) {
        return BT_GATT_ERR(BT_ATT_ERR_INVALID_ATTRIBUTE_LEN);
    }

    uint8_t cmd = ((const uint8_t *)buf)[0];
    if (cmd != ARA_AUDIO_CMD_VOICE &&
        cmd != ARA_AUDIO_CMD_GUT &&
        cmd != ARA_AUDIO_CMD_STOP) {
        return BT_GATT_ERR(BT_ATT_ERR_VALUE_NOT_ALLOWED);
    }

    audio_cmd = cmd;
    LOG_INF("Audio command received: 0x%02X", cmd);
    return len;
}

/* ── CCC Changed Callbacks ── */
static void sensor_data_ccc_changed(const struct bt_gatt_attr *attr, uint16_t value)
{
    LOG_INF("Sensor data notifications %s",
            (value == BT_GATT_CCC_NOTIFY) ? "enabled" : "disabled");
}

static void ppg_raw_ccc_changed(const struct bt_gatt_attr *attr, uint16_t value)
{
    LOG_INF("PPG raw notifications %s",
            (value == BT_GATT_CCC_NOTIFY) ? "enabled" : "disabled");
}

static void audio_ccc_changed(const struct bt_gatt_attr *attr, uint16_t value)
{
    LOG_INF("Audio notifications %s",
            (value == BT_GATT_CCC_NOTIFY) ? "enabled" : "disabled");
}

/* ── GATT Service Definition ── */
BT_GATT_SERVICE_DEFINE(ara_svc,
    /* Primary Service */
    BT_GATT_PRIMARY_SERVICE(&ara_svc_uuid),

    /* Characteristic 1: Sensor Data (notify) */
    BT_GATT_CHARACTERISTIC(&sensor_data_uuid.uuid,
                           BT_GATT_CHRC_NOTIFY,
                           BT_GATT_PERM_NONE,
                           NULL, NULL, NULL),
    BT_GATT_CCC(sensor_data_ccc_changed,
                 BT_GATT_PERM_READ | BT_GATT_PERM_WRITE),

    /* Characteristic 2: PPG Raw (notify) */
    BT_GATT_CHARACTERISTIC(&ppg_raw_uuid.uuid,
                           BT_GATT_CHRC_NOTIFY,
                           BT_GATT_PERM_NONE,
                           NULL, NULL, NULL),
    BT_GATT_CCC(ppg_raw_ccc_changed,
                 BT_GATT_PERM_READ | BT_GATT_PERM_WRITE),

    /* Characteristic 3: Patch ID (read) */
    BT_GATT_CHARACTERISTIC(&patch_id_uuid.uuid,
                           BT_GATT_CHRC_READ,
                           BT_GATT_PERM_READ,
                           read_patch_id, NULL, NULL),

    /* Characteristic 4: Audio (notify + write) */
    BT_GATT_CHARACTERISTIC(&audio_uuid.uuid,
                           BT_GATT_CHRC_NOTIFY | BT_GATT_CHRC_WRITE,
                           BT_GATT_PERM_WRITE,
                           NULL, write_audio_cmd, NULL),
    BT_GATT_CCC(audio_ccc_changed,
                 BT_GATT_PERM_READ | BT_GATT_PERM_WRITE),
);

/* ── Connection Callbacks ── */
static void connected(struct bt_conn *conn, uint8_t err)
{
    if (err) {
        LOG_ERR("Connection failed (err 0x%02x)", err);
        return;
    }
    ble_connected = true;
    audio_cmd = ARA_AUDIO_CMD_STOP;
    LOG_INF("BLE connected");
}

static void disconnected(struct bt_conn *conn, uint8_t reason)
{
    ble_connected = false;
    audio_cmd = ARA_AUDIO_CMD_STOP;
    LOG_INF("BLE disconnected (reason 0x%02x)", reason);
}

BT_CONN_CB_DEFINE(conn_callbacks) = {
    .connected = connected,
    .disconnected = disconnected,
};

/* ── Advertising Data ── */
static const struct bt_data ad[] = {
    BT_DATA_BYTES(BT_DATA_FLAGS,
                  (BT_LE_AD_GENERAL | BT_LE_AD_NO_BREDR)),
    BT_DATA(BT_DATA_NAME_COMPLETE, "ARA-PATCH", 9),
};

/* ── Public API ── */

int ara_ble_service_init(void)
{
    /* Build Patch ID string */
    bt_addr_le_t addr;
    size_t count = 1;
    bt_id_get(&addr, &count);
    snprintf(patch_id, sizeof(patch_id), "ARA-PATCH-%02X%02X-P1-1.0.0",
             addr.a.val[1], addr.a.val[0]);
    LOG_INF("Patch ID: %s", patch_id);

    /* Start advertising */
    int err = bt_le_adv_start(BT_LE_ADV_CONN, ad, ARRAY_SIZE(ad), NULL, 0);
    if (err) {
        LOG_ERR("Advertising failed to start (err %d)", err);
        return err;
    }
    LOG_INF("BLE advertising started");
    return 0;
}

int ara_ble_notify_sensor_data(const struct ara_sensor_packet *pkt)
{
    if (!ble_connected) {
        return -ENOTCONN;
    }
    return bt_gatt_notify(NULL, &ara_svc.attrs[2], pkt,
                          sizeof(struct ara_sensor_packet));
}

int ara_ble_notify_ppg_raw(const struct ara_ppg_raw_packet *pkt)
{
    if (!ble_connected) {
        return -ENOTCONN;
    }
    return bt_gatt_notify(NULL, &ara_svc.attrs[5], pkt,
                          sizeof(struct ara_ppg_raw_packet));
}

int ara_ble_notify_audio(const uint8_t *data, uint16_t len)
{
    if (!ble_connected || len > 20) {
        return -EINVAL;
    }
    return bt_gatt_notify(NULL, &ara_svc.attrs[11], data, len);
}

bool ara_ble_is_connected(void)
{
    return ble_connected;
}

uint8_t ara_ble_get_audio_cmd(void)
{
    return audio_cmd;
}
