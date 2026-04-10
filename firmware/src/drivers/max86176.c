/**
 * ══════════════════════════════════════
 * PART:   MAX86176 PPG/SpO₂ Driver
 * ACTOR:  Claude Opus 4.6
 * PHASE:  19 — I2C Dual-Channel PPG Driver
 * ══════════════════════════════════════
 *
 * MAX86176 via I2C0 @ 400kHz
 * Address: 0x54
 * Pins: SDA=P0.26, SCL=P0.27
 * Mode: SpO₂ (RED 660nm + IR 940nm alternating)
 * Sample rate: 25Hz, 18-bit ADC resolution
 * AC/DC separation via moving average (window=50)
 */

#include <zephyr/kernel.h>
#include <zephyr/drivers/i2c.h>
#include <zephyr/logging/log.h>

#include "max86176.h"

LOG_MODULE_REGISTER(max86176, LOG_LEVEL_INF);

/* ── I2C Device ── */
static const struct device *i2c_dev;

/* ── Moving Average State for AC/DC Separation ── */
#define DC_WINDOW 50
static int32_t red_dc_buf[DC_WINDOW];
static int32_t ir_dc_buf[DC_WINDOW];
static int dc_idx;
static int32_t red_dc_sum;
static int32_t ir_dc_sum;

/* ── Helper: Write Register ── */
static int reg_write(uint8_t reg, uint8_t val)
{
    uint8_t buf[2] = { reg, val };
    return i2c_write(i2c_dev, buf, 2, MAX86176_I2C_ADDR);
}

/* ── Helper: Read Register ── */
static int reg_read(uint8_t reg, uint8_t *val)
{
    return i2c_write_read(i2c_dev, MAX86176_I2C_ADDR, &reg, 1, val, 1);
}

/* ── Helper: Burst Read ── */
static int reg_burst_read(uint8_t reg, uint8_t *buf, int len)
{
    return i2c_write_read(i2c_dev, MAX86176_I2C_ADDR, &reg, 1, buf, len);
}

/* ── Update Moving Average for AC/DC ── */
static void update_dc(int32_t red_raw, int32_t ir_raw,
                       int16_t *red_ac_out, int16_t *red_dc_out,
                       int16_t *ir_ac_out, int16_t *ir_dc_out)
{
    /* Update circular buffer */
    red_dc_sum -= red_dc_buf[dc_idx];
    ir_dc_sum  -= ir_dc_buf[dc_idx];

    red_dc_buf[dc_idx] = red_raw;
    ir_dc_buf[dc_idx]  = ir_raw;

    red_dc_sum += red_raw;
    ir_dc_sum  += ir_raw;

    dc_idx = (dc_idx + 1) % DC_WINDOW;

    /* DC = moving average */
    int32_t red_dc = red_dc_sum / DC_WINDOW;
    int32_t ir_dc  = ir_dc_sum  / DC_WINDOW;

    /* AC = raw - DC */
    *red_dc_out = (int16_t)(red_dc >> 4);  /* Scale to int16 range */
    *ir_dc_out  = (int16_t)(ir_dc >> 4);
    *red_ac_out = (int16_t)((red_raw - red_dc) >> 4);
    *ir_ac_out  = (int16_t)((ir_raw - ir_dc) >> 4);
}

/* ── Init ── */
int max86176_init(void)
{
    i2c_dev = DEVICE_DT_GET(DT_NODELABEL(i2c0));
    if (!device_is_ready(i2c_dev)) {
        LOG_ERR("I2C0 device not ready");
        return -ENODEV;
    }

    /* Soft reset */
    int err = reg_write(MAX86176_REG_MODE_CONFIG, MAX86176_MODE_RESET);
    if (err) {
        LOG_ERR("MAX86176 reset failed (err %d)", err);
        return err;
    }
    k_sleep(K_MSEC(10));

    /* Configure LED currents */
    reg_write(MAX86176_REG_LED1_PA, MAX86176_LED_CURRENT_20MA);  /* RED */
    reg_write(MAX86176_REG_LED2_PA, MAX86176_LED_CURRENT_20MA);  /* IR */

    /* SpO₂ config: 25 SPS, 18-bit ADC */
    reg_write(MAX86176_REG_SPO2_CONFIG, MAX86176_SPO2_ADC_18BIT_25HZ);

    /* FIFO: average 4 samples, rollover enabled */
    reg_write(MAX86176_REG_FIFO_CONFIG, MAX86176_FIFO_AVG4_ROLLOVER);

    /* SpO₂ mode: RED + IR alternate */
    reg_write(MAX86176_REG_MODE_CONFIG, MAX86176_MODE_SPO2);

    /* Clear DC buffers */
    memset(red_dc_buf, 0, sizeof(red_dc_buf));
    memset(ir_dc_buf, 0, sizeof(ir_dc_buf));
    dc_idx = 0;
    red_dc_sum = 0;
    ir_dc_sum = 0;

    LOG_INF("MAX86176 initialized (SpO2 mode, 25Hz, 18-bit)");
    return 0;
}

/* ── Read FIFO ── */
int max86176_read_fifo(struct max86176_sample *samples, int max_samples)
{
    uint8_t wr_ptr, rd_ptr;
    int err;

    err = reg_read(MAX86176_REG_FIFO_WR_PTR, &wr_ptr);
    if (err) return err;

    err = reg_read(MAX86176_REG_FIFO_RD_PTR, &rd_ptr);
    if (err) return err;

    int num_available = (wr_ptr - rd_ptr) & 0x1F;
    if (num_available == 0) return 0;

    int to_read = (num_available < max_samples) ? num_available : max_samples;

    for (int i = 0; i < to_read; i++) {
        /* Each sample = 6 bytes: [RED_H, RED_M, RED_L, IR_H, IR_M, IR_L] */
        uint8_t raw[6];
        err = reg_burst_read(MAX86176_REG_FIFO_DATA, raw, 6);
        if (err) return i;  /* return samples already read */

        /* Parse 18-bit packed values */
        uint32_t red_raw = ((uint32_t)raw[0] << 16 |
                            (uint32_t)raw[1] << 8 |
                            (uint32_t)raw[2]) & 0x3FFFF;
        uint32_t ir_raw  = ((uint32_t)raw[3] << 16 |
                            (uint32_t)raw[4] << 8 |
                            (uint32_t)raw[5]) & 0x3FFFF;

        samples[i].red_raw = red_raw;
        samples[i].ir_raw = ir_raw;

        /* AC/DC separation */
        update_dc(red_raw, ir_raw,
                  &samples[i].red_ac, &samples[i].red_dc,
                  &samples[i].ir_ac, &samples[i].ir_dc);
    }

    return to_read;
}
