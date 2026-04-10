/**
 * ══════════════════════════════════════
 * PART:   ARA Health BLE GATT Service
 * ACTOR:  Claude Opus 4.6
 * PHASE:  18 — BLE Service Interface
 * ══════════════════════════════════════
 */

#ifndef ARA_BLE_SERVICE_H
#define ARA_BLE_SERVICE_H

#include <zephyr/types.h>
#include <zephyr/bluetooth/bluetooth.h>
#include <zephyr/bluetooth/gatt.h>

/* ── Service UUID: 0000ARA0-0000-1000-8000-00805F9B34FB ── */
#define ARA_SERVICE_UUID \
    BT_UUID_128_ENCODE(0x0000ARA0, 0x0000, 0x1000, 0x8000, 0x00805F9B34FB)

/* ── Characteristic UUIDs ── */
#define ARA_CHAR_SENSOR_DATA_UUID \
    BT_UUID_128_ENCODE(0x0000ARA1, 0x0000, 0x1000, 0x8000, 0x00805F9B34FB)

#define ARA_CHAR_PPG_RAW_UUID \
    BT_UUID_128_ENCODE(0x0000ARA2, 0x0000, 0x1000, 0x8000, 0x00805F9B34FB)

#define ARA_CHAR_PATCH_ID_UUID \
    BT_UUID_128_ENCODE(0x0000ARA3, 0x0000, 0x1000, 0x8000, 0x00805F9B34FB)

#define ARA_CHAR_AUDIO_UUID \
    BT_UUID_128_ENCODE(0x0000ARA4, 0x0000, 0x1000, 0x8000, 0x00805F9B34FB)

/* ── Sensor Data Packet (20 bytes) ── */
struct ara_sensor_packet {
    uint16_t hr_x10;        /* HR × 10, e.g. 725 = 72.5 BPM */
    uint8_t  spo2;          /* SpO₂ percentage */
    float    temperature;   /* Celsius, float32 */
    int16_t  ppg_samples[6];/* Last 6 PPG samples (25Hz) */
    uint8_t  flags;         /* bit0=motion, bit1=contact */
} __packed;

/* ── PPG Raw Packet (20 bytes) ── */
struct ara_ppg_raw_packet {
    int16_t red_ac[2];
    int16_t red_dc[2];
    int16_t ir_ac[2];
    int16_t ir_dc[2];
    uint16_t seq;
    uint16_t flags;
} __packed;

/* ── Audio Command Bytes ── */
#define ARA_AUDIO_CMD_VOICE  0x01   /* 5s voice check */
#define ARA_AUDIO_CMD_GUT    0x02   /* 30s gut sound */
#define ARA_AUDIO_CMD_STOP   0x00

/* ── API ── */
int ara_ble_service_init(void);
int ara_ble_notify_sensor_data(const struct ara_sensor_packet *pkt);
int ara_ble_notify_ppg_raw(const struct ara_ppg_raw_packet *pkt);
int ara_ble_notify_audio(const uint8_t *data, uint16_t len);
bool ara_ble_is_connected(void);
uint8_t ara_ble_get_audio_cmd(void);

#endif /* ARA_BLE_SERVICE_H */
