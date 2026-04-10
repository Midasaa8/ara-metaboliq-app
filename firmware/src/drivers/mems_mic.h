/**
 * ══════════════════════════════════════
 * PART:   MEMS Microphone PDM Driver
 * ACTOR:  Claude Opus 4.6
 * PHASE:  19 — PDM Audio Driver Interface
 * ══════════════════════════════════════
 */

#ifndef ARA_MEMS_MIC_H
#define ARA_MEMS_MIC_H

#include <zephyr/types.h>

/* ── PDM Config ── */
#define MEMS_MIC_PDM_CLK_PIN   25     /* P0.25 */
#define MEMS_MIC_PDM_DATA_PIN  24     /* P0.24 */
#define MEMS_MIC_PDM_CLOCK     1024000  /* 1.024 MHz → 16kHz PCM after decimation */
#define MEMS_MIC_SAMPLE_RATE   16000    /* 16kHz output */
#define MEMS_MIC_BUF_SAMPLES   256      /* PDM buffer size in samples */

/* ── API ── */
int mems_mic_init(void);
int mems_mic_start(void);
int mems_mic_stop(void);
int mems_mic_read_downsampled(int16_t *pcm_out, int num_samples);

#endif /* ARA_MEMS_MIC_H */
