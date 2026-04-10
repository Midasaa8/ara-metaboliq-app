/**
 * ══════════════════════════════════════
 * PART:   MEMS Microphone PDM Driver
 * ACTOR:  Claude Opus 4.6
 * PHASE:  19 — PDM Audio Capture + Downsample
 * ══════════════════════════════════════
 *
 * SPU0410HR5H-PB MEMS Microphone via nRF52840 PDM
 * Pins: CLK=P0.25, DATA=P0.24
 * PDM clock: 1.024 MHz → hardware decimation → 16kHz PCM
 * Output: 8kHz downsampled (factor 2 with anti-alias LPF)
 * BLE streaming: 8 int16 samples per 20B packet
 *
 * Modes:
 *   VOICE: 5s recording  → MARVEL voice analysis
 *   GUT:   30s recording → BowelRCNN spectrogram (Phase 24)
 *
 * Privacy: Mic is ALWAYS OFF unless app requests via BLE write
 */

#include <zephyr/kernel.h>
#include <nrfx_pdm.h>
#include <zephyr/logging/log.h>
#include <string.h>

#include "mems_mic.h"

LOG_MODULE_REGISTER(mems_mic, LOG_LEVEL_INF);

/* ── Buffers ── */
static int16_t pdm_buf_a[MEMS_MIC_BUF_SAMPLES];
static int16_t pdm_buf_b[MEMS_MIC_BUF_SAMPLES];
static volatile bool buf_ready;
static volatile int16_t *active_buf;

/* ── Downsample State ── */
/* Simple 2x downsample with 2-tap average anti-alias */
static int16_t downsample_buf[MEMS_MIC_BUF_SAMPLES / 2];
static volatile int ds_samples_available;
static volatile int ds_read_idx;

/* ── PDM Event Handler ── */
static void pdm_event_handler(nrfx_pdm_evt_t const *event)
{
    if (event->buffer_released != NULL) {
        /* Downsample 16kHz → 8kHz: average adjacent pairs */
        int16_t *src = (int16_t *)event->buffer_released;
        int out_idx = 0;
        for (int i = 0; i < MEMS_MIC_BUF_SAMPLES - 1; i += 2) {
            downsample_buf[out_idx++] = (src[i] + src[i + 1]) / 2;
        }
        ds_samples_available = out_idx;
        ds_read_idx = 0;
        buf_ready = true;
    }

    if (event->buffer_requested) {
        /* Provide next buffer */
        int16_t *next = (active_buf == pdm_buf_a) ? pdm_buf_b : pdm_buf_a;
        active_buf = next;
        nrfx_pdm_buffer_set(next, MEMS_MIC_BUF_SAMPLES);
    }
}

/* ── Init ── */
int mems_mic_init(void)
{
    nrfx_pdm_config_t config = NRFX_PDM_DEFAULT_CONFIG(
        MEMS_MIC_PDM_CLK_PIN, MEMS_MIC_PDM_DATA_PIN);

    config.clock_freq = NRF_PDM_FREQ_1032K;  /* closest to 1.024MHz */
    config.mode = NRF_PDM_MODE_MONO;
    config.edge = NRF_PDM_EDGE_LEFTFALLING;
    config.gain_l = NRF_PDM_GAIN_DEFAULT;

    nrfx_err_t err = nrfx_pdm_init(&config, pdm_event_handler);
    if (err != NRFX_SUCCESS) {
        LOG_ERR("PDM init failed (err 0x%08X)", err);
        return -EIO;
    }

    LOG_INF("MEMS mic initialized (PDM, 16kHz → 8kHz downsample)");
    return 0;
}

/* ── Start Recording ── */
int mems_mic_start(void)
{
    active_buf = pdm_buf_a;
    buf_ready = false;
    ds_samples_available = 0;
    ds_read_idx = 0;

    nrfx_err_t err = nrfx_pdm_start();
    if (err != NRFX_SUCCESS) {
        LOG_ERR("PDM start failed (err 0x%08X)", err);
        return -EIO;
    }

    /* Provide initial buffer */
    nrfx_pdm_buffer_set((int16_t *)active_buf, MEMS_MIC_BUF_SAMPLES);

    LOG_INF("Mic recording started");
    return 0;
}

/* ── Stop Recording ── */
int mems_mic_stop(void)
{
    nrfx_pdm_stop();
    buf_ready = false;
    LOG_INF("Mic recording stopped");
    return 0;
}

/* ── Read Downsampled PCM (8kHz) ── */
int mems_mic_read_downsampled(int16_t *pcm_out, int num_samples)
{
    /* Wait for buffer to be ready */
    int timeout = 100;  /* max 100ms wait */
    while (!buf_ready && timeout > 0) {
        k_sleep(K_MSEC(1));
        timeout--;
    }

    if (!buf_ready) {
        memset(pcm_out, 0, num_samples * sizeof(int16_t));
        return 0;
    }

    int to_copy = num_samples;
    if (to_copy > ds_samples_available - ds_read_idx) {
        to_copy = ds_samples_available - ds_read_idx;
    }

    if (to_copy > 0) {
        memcpy(pcm_out, &downsample_buf[ds_read_idx], to_copy * sizeof(int16_t));
        ds_read_idx += to_copy;
    }

    /* Zero-fill remaining */
    if (to_copy < num_samples) {
        memset(&pcm_out[to_copy], 0, (num_samples - to_copy) * sizeof(int16_t));
    }

    /* Reset ready flag if all consumed */
    if (ds_read_idx >= ds_samples_available) {
        buf_ready = false;
    }

    return to_copy;
}
