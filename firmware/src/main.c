/**
 * ══════════════════════════════════════
 * PART:   ARA Patch Firmware — Entry Point
 * ACTOR:  Claude Opus 4.6
 * PHASE:  18 — Zephyr RTOS Main
 * ══════════════════════════════════════
 *
 * nRF52840-DK entry point for ARA Health Patch
 *
 * Threads:
 *   ppg_thread   — MAX86176 PPG read @ 25Hz (K_PRIO_COOP 5)
 *   imu_thread   — LSM6DSO IMU read @ 25Hz  (K_PRIO_COOP 6)
 *   temp_thread  — NTC thermistor @ 1Hz      (K_PRIO_COOP 7)
 *   mic_thread   — MEMS mic on-demand         (K_PRIO_COOP 8)
 *
 * Main loop: pack sensor data → BLE notify @ 25Hz (40ms)
 */

#include <zephyr/kernel.h>
#include <zephyr/bluetooth/bluetooth.h>
#include <zephyr/logging/log.h>
#include <string.h>

#include "ble_service.h"
#include "drivers/max86176.h"
#include "drivers/lsm6dso.h"
#include "drivers/ntc_adc.h"
#include "drivers/mems_mic.h"

LOG_MODULE_REGISTER(ara_main, LOG_LEVEL_INF);

/* ── Thread Stacks ── */
#define STACK_SIZE 1024
K_THREAD_STACK_DEFINE(ppg_stack,  STACK_SIZE);
K_THREAD_STACK_DEFINE(imu_stack,  STACK_SIZE);
K_THREAD_STACK_DEFINE(temp_stack, STACK_SIZE);
K_THREAD_STACK_DEFINE(mic_stack,  STACK_SIZE);

static struct k_thread ppg_thread;
static struct k_thread imu_thread;
static struct k_thread temp_thread;
static struct k_thread mic_thread;

/* ── Shared Sensor State (updated by driver threads) ── */
static struct {
    /* PPG */
    int16_t ppg_samples[6];
    int16_t ppg_red_ac[2], ppg_red_dc[2];
    int16_t ppg_ir_ac[2], ppg_ir_dc[2];
    uint16_t ppg_seq;
    uint16_t hr_x10;       /* HR × 10 */
    uint8_t  spo2;

    /* IMU */
    float accel_g[3];
    float gyro_dps[3];
    bool  motion_flag;

    /* Temperature */
    float temperature;

    /* Contact detect (from PPG IR DC level) */
    bool contact_flag;
} sensor_state;

static K_MUTEX_DEFINE(sensor_mutex);

/* ── Disconnect idle timer ── */
static int64_t last_connected_time;

/* ── PPG Read Thread ── */
static void ppg_read_loop(void *p1, void *p2, void *p3)
{
    ARG_UNUSED(p1); ARG_UNUSED(p2); ARG_UNUSED(p3);

    while (1) {
        struct max86176_sample samples[4];
        int count = max86176_read_fifo(samples, 4);

        if (count > 0) {
            k_mutex_lock(&sensor_mutex, K_FOREVER);

            /* Store last 6 PPG samples (IR channel) for sensor packet */
            for (int i = 0; i < count && i < 6; i++) {
                sensor_state.ppg_samples[i] = samples[i].ir_raw >> 4;
            }

            /* Store AC/DC for SpO₂ (last 2 samples) */
            int last = (count > 2) ? count - 2 : 0;
            for (int i = 0; i < 2 && (last + i) < count; i++) {
                sensor_state.ppg_red_ac[i] = samples[last + i].red_ac;
                sensor_state.ppg_red_dc[i] = samples[last + i].red_dc;
                sensor_state.ppg_ir_ac[i]  = samples[last + i].ir_ac;
                sensor_state.ppg_ir_dc[i]  = samples[last + i].ir_dc;
            }

            sensor_state.ppg_seq++;

            /* Contact detection: IR DC > threshold = skin contact */
            sensor_state.contact_flag =
                (samples[count - 1].ir_dc > MAX86176_CONTACT_THRESHOLD);

            k_mutex_unlock(&sensor_mutex);
        }

        k_sleep(K_MSEC(40));  /* 25Hz */
    }
}

/* ── IMU Read Thread ── */
static void imu_read_loop(void *p1, void *p2, void *p3)
{
    ARG_UNUSED(p1); ARG_UNUSED(p2); ARG_UNUSED(p3);

    struct lsm6dso_data imu_data;

    while (1) {
        if (lsm6dso_read(&imu_data) == 0) {
            k_mutex_lock(&sensor_mutex, K_FOREVER);

            memcpy(sensor_state.accel_g, imu_data.accel_g, sizeof(float) * 3);
            memcpy(sensor_state.gyro_dps, imu_data.gyro_dps, sizeof(float) * 3);

            /* Motion detection: |accel| > 2.0g */
            float mag = imu_data.accel_g[0] * imu_data.accel_g[0] +
                        imu_data.accel_g[1] * imu_data.accel_g[1] +
                        imu_data.accel_g[2] * imu_data.accel_g[2];
            sensor_state.motion_flag = (mag > 4.0f);  /* 2.0² = 4.0 */

            k_mutex_unlock(&sensor_mutex);
        }

        k_sleep(K_MSEC(40));  /* 25Hz (decimated from 104Hz ODR) */
    }
}

/* ── Temperature Read Thread ── */
static void temp_read_loop(void *p1, void *p2, void *p3)
{
    ARG_UNUSED(p1); ARG_UNUSED(p2); ARG_UNUSED(p3);

    while (1) {
        float temp = ntc_adc_read_celsius();
        if (temp > 0.0f) {
            k_mutex_lock(&sensor_mutex, K_FOREVER);
            sensor_state.temperature = temp;
            k_mutex_unlock(&sensor_mutex);
        }

        k_sleep(K_MSEC(1000));  /* 1Hz — temperature changes slowly */
    }
}

/* ── Microphone Thread (on-demand) ── */
static void mic_read_loop(void *p1, void *p2, void *p3)
{
    ARG_UNUSED(p1); ARG_UNUSED(p2); ARG_UNUSED(p3);

    uint8_t audio_buf[20];  /* 8 int16 samples + 2B seq + 2B flags */
    uint16_t audio_seq = 0;

    while (1) {
        uint8_t cmd = ara_ble_get_audio_cmd();

        if (cmd == ARA_AUDIO_CMD_VOICE || cmd == ARA_AUDIO_CMD_GUT) {
            int duration_ms = (cmd == ARA_AUDIO_CMD_VOICE) ? 5000 : 30000;
            int total_samples = (duration_ms / 1000) * 16000;  /* 16kHz */
            int packets = total_samples / 16;  /* 8 samples at 8kHz after downsample */

            LOG_INF("Mic recording started: %dms (%d packets)", duration_ms, packets);
            mems_mic_start();

            for (int p = 0; p < packets; p++) {
                if (ara_ble_get_audio_cmd() == ARA_AUDIO_CMD_STOP) {
                    break;
                }

                int16_t pcm[8];
                mems_mic_read_downsampled(pcm, 8);

                memcpy(audio_buf, pcm, 16);
                audio_buf[16] = (uint8_t)(audio_seq & 0xFF);
                audio_buf[17] = (uint8_t)(audio_seq >> 8);
                audio_buf[18] = cmd;
                audio_buf[19] = 0;
                audio_seq++;

                ara_ble_notify_audio(audio_buf, 20);
                k_sleep(K_MSEC(1));  /* pace BLE notifications */
            }

            mems_mic_stop();
            LOG_INF("Mic recording complete");
        }

        k_sleep(K_MSEC(100));  /* poll for commands */
    }
}

/* ── Main Entry ── */
void main(void)
{
    LOG_INF("ARA Patch Firmware v1.0.0 starting...");

    /* 1. Init BLE stack */
    int err = bt_enable(NULL);
    if (err) {
        LOG_ERR("Bluetooth init failed (err %d)", err);
        return;
    }
    LOG_INF("Bluetooth initialized");

    err = ara_ble_service_init();
    if (err) {
        LOG_ERR("BLE service init failed (err %d)", err);
        return;
    }

    /* 2. Init sensor drivers */
    err = max86176_init();
    if (err) { LOG_ERR("MAX86176 init failed (err %d)", err); }

    err = lsm6dso_init();
    if (err) { LOG_ERR("LSM6DSO init failed (err %d)", err); }

    err = ntc_adc_init();
    if (err) { LOG_ERR("NTC ADC init failed (err %d)", err); }

    err = mems_mic_init();
    if (err) { LOG_ERR("MEMS mic init failed (err %d)", err); }

    /* 3. Start sensor threads */
    k_thread_create(&ppg_thread, ppg_stack, STACK_SIZE,
                    ppg_read_loop, NULL, NULL, NULL,
                    K_PRIO_COOP(5), 0, K_NO_WAIT);
    k_thread_name_set(&ppg_thread, "ppg");

    k_thread_create(&imu_thread, imu_stack, STACK_SIZE,
                    imu_read_loop, NULL, NULL, NULL,
                    K_PRIO_COOP(6), 0, K_NO_WAIT);
    k_thread_name_set(&imu_thread, "imu");

    k_thread_create(&temp_thread, temp_stack, STACK_SIZE,
                    temp_read_loop, NULL, NULL, NULL,
                    K_PRIO_COOP(7), 0, K_NO_WAIT);
    k_thread_name_set(&temp_thread, "temp");

    k_thread_create(&mic_thread, mic_stack, STACK_SIZE,
                    mic_read_loop, NULL, NULL, NULL,
                    K_PRIO_COOP(8), 0, K_NO_WAIT);
    k_thread_name_set(&mic_thread, "mic");

    LOG_INF("All sensor threads started");

    /* 4. Main loop: pack sensor data → BLE notify @ 25Hz */
    last_connected_time = k_uptime_get();

    while (1) {
        if (ara_ble_is_connected()) {
            last_connected_time = k_uptime_get();

            /* Pack sensor data packet */
            struct ara_sensor_packet sensor_pkt;
            struct ara_ppg_raw_packet ppg_pkt;

            k_mutex_lock(&sensor_mutex, K_FOREVER);

            sensor_pkt.hr_x10 = sensor_state.hr_x10;
            sensor_pkt.spo2 = sensor_state.spo2;
            sensor_pkt.temperature = sensor_state.temperature;
            memcpy(sensor_pkt.ppg_samples, sensor_state.ppg_samples,
                   sizeof(int16_t) * 6);
            sensor_pkt.flags = 0;
            if (sensor_state.motion_flag)  sensor_pkt.flags |= 0x01;
            if (sensor_state.contact_flag) sensor_pkt.flags |= 0x02;

            /* Pack PPG raw packet for SpO₂ */
            memcpy(ppg_pkt.red_ac, sensor_state.ppg_red_ac, sizeof(int16_t) * 2);
            memcpy(ppg_pkt.red_dc, sensor_state.ppg_red_dc, sizeof(int16_t) * 2);
            memcpy(ppg_pkt.ir_ac, sensor_state.ppg_ir_ac, sizeof(int16_t) * 2);
            memcpy(ppg_pkt.ir_dc, sensor_state.ppg_ir_dc, sizeof(int16_t) * 2);
            ppg_pkt.seq = sensor_state.ppg_seq;
            ppg_pkt.flags = sensor_pkt.flags;

            k_mutex_unlock(&sensor_mutex);

            /* Send BLE notifications */
            ara_ble_notify_sensor_data(&sensor_pkt);
            ara_ble_notify_ppg_raw(&ppg_pkt);

        } else {
            /* Power management: idle if disconnected > 60s */
            int64_t now = k_uptime_get();
            if ((now - last_connected_time) > 60000) {
                k_cpu_idle();
            }
        }

        k_sleep(K_MSEC(40));  /* 25Hz main loop */
    }
}
