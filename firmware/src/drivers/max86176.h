/**
 * ══════════════════════════════════════
 * PART:   MAX86176 PPG/SpO₂ Driver
 * ACTOR:  Claude Opus 4.6
 * PHASE:  19 — I2C Sensor Driver
 * ══════════════════════════════════════
 */

#ifndef ARA_MAX86176_H
#define ARA_MAX86176_H

#include <zephyr/types.h>

/* ── I2C Address ── */
#define MAX86176_I2C_ADDR       0x54

/* ── Register Map ── */
#define MAX86176_REG_INT_STATUS     0x00
#define MAX86176_REG_INT_ENABLE     0x02
#define MAX86176_REG_FIFO_WR_PTR   0x04
#define MAX86176_REG_OVF_COUNTER   0x05
#define MAX86176_REG_FIFO_RD_PTR   0x06
#define MAX86176_REG_FIFO_DATA     0x07
#define MAX86176_REG_MODE_CONFIG   0x09
#define MAX86176_REG_SPO2_CONFIG   0x0A
#define MAX86176_REG_LED1_PA       0x0C  /* RED 660nm */
#define MAX86176_REG_LED2_PA       0x0D  /* IR 940nm */
#define MAX86176_REG_FIFO_CONFIG   0x08

/* ── Config Values ── */
#define MAX86176_MODE_SPO2         0x03  /* RED + IR alternate */
#define MAX86176_MODE_RESET        0x40
#define MAX86176_SPO2_ADC_18BIT_25HZ 0x27  /* 25 SPS, 18-bit, 411µs pulse */
#define MAX86176_LED_CURRENT_20MA  0x3F
#define MAX86176_FIFO_AVG4_ROLLOVER 0x06

/* ── Contact Detection Threshold ── */
#define MAX86176_CONTACT_THRESHOLD 5000

/* ── Sample Structure ── */
struct max86176_sample {
    uint32_t red_raw;   /* 18-bit raw RED */
    uint32_t ir_raw;    /* 18-bit raw IR */
    int16_t  red_ac;    /* AC component */
    int16_t  red_dc;    /* DC component (moving avg) */
    int16_t  ir_ac;
    int16_t  ir_dc;
};

/* ── API ── */
int max86176_init(void);
int max86176_read_fifo(struct max86176_sample *samples, int max_samples);

#endif /* ARA_MAX86176_H */
