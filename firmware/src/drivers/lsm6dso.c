/**
 * ══════════════════════════════════════
 * PART:   LSM6DSO 6-Axis IMU Driver
 * ACTOR:  Claude Opus 4.6
 * PHASE:  19 — SPI Full-Duplex Accel+Gyro
 * ══════════════════════════════════════
 *
 * LSM6DSO via SPI1 @ 4MHz, Mode 0 (CPOL=0, CPHA=0)
 * Pins: MOSI=P0.13, MISO=P0.14, SCK=P0.15, CS=P0.11
 * Config: 104Hz ODR, ±4g accel, ±500dps gyro
 *
 * Motion detection: |accel| > 2.0g → set MOTION_FLAG
 * Used by Opus Phase 12 to skip noisy PPG samples
 */

#include <zephyr/kernel.h>
#include <zephyr/drivers/spi.h>
#include <zephyr/drivers/gpio.h>
#include <zephyr/logging/log.h>

#include "lsm6dso.h"

LOG_MODULE_REGISTER(lsm6dso, LOG_LEVEL_INF);

/* ── SPI Device ── */
static const struct device *spi_dev;
static struct spi_config spi_cfg;
static struct spi_cs_control cs_ctrl;

/* ── SPI Read/Write Helpers ── */
static int spi_reg_read(uint8_t reg, uint8_t *val, int len)
{
    /* SPI read: set bit 7 of register address */
    uint8_t tx_buf = reg | 0x80;
    struct spi_buf tx = { .buf = &tx_buf, .len = 1 };
    struct spi_buf_set tx_set = { .buffers = &tx, .count = 1 };

    uint8_t rx_skip;
    struct spi_buf rx_bufs[2] = {
        { .buf = &rx_skip, .len = 1 },  /* skip first byte (sent during TX) */
        { .buf = val, .len = len },
    };
    struct spi_buf_set rx_set = { .buffers = rx_bufs, .count = 2 };

    return spi_transceive(spi_dev, &spi_cfg, &tx_set, &rx_set);
}

static int spi_reg_write(uint8_t reg, uint8_t val)
{
    /* SPI write: bit 7 = 0 */
    uint8_t tx_data[2] = { reg & 0x7F, val };
    struct spi_buf tx = { .buf = tx_data, .len = 2 };
    struct spi_buf_set tx_set = { .buffers = &tx, .count = 1 };

    return spi_write(spi_dev, &spi_cfg, &tx_set);
}

/* ── Init ── */
int lsm6dso_init(void)
{
    spi_dev = DEVICE_DT_GET(DT_NODELABEL(spi1));
    if (!device_is_ready(spi_dev)) {
        LOG_ERR("SPI1 device not ready");
        return -ENODEV;
    }

    /* Configure SPI: 4MHz, Mode 0, 8-bit */
    spi_cfg.frequency = LSM6DSO_SPI_MAX_FREQ;
    spi_cfg.operation = SPI_WORD_SET(8) | SPI_TRANSFER_MSB;
    spi_cfg.cs = &cs_ctrl;

    /* Configure CS pin */
    cs_ctrl.gpio.port = DEVICE_DT_GET(DT_NODELABEL(gpio0));
    cs_ctrl.gpio.pin = 11;
    cs_ctrl.gpio.dt_flags = GPIO_ACTIVE_LOW;
    cs_ctrl.delay = 0;

    /* Verify WHO_AM_I */
    uint8_t who;
    int err = spi_reg_read(LSM6DSO_REG_WHO_AM_I, &who, 1);
    if (err || who != LSM6DSO_WHO_AM_I_VAL) {
        LOG_ERR("LSM6DSO WHO_AM_I mismatch: 0x%02X (expected 0x%02X)",
                who, LSM6DSO_WHO_AM_I_VAL);
        return -ENODEV;
    }

    /* Accel: 104Hz ODR, ±4g */
    spi_reg_write(LSM6DSO_REG_CTRL1_XL, LSM6DSO_CTRL1_XL_104HZ_4G);

    /* Gyro: 104Hz ODR, ±500dps */
    spi_reg_write(LSM6DSO_REG_CTRL2_G, LSM6DSO_CTRL2_G_104HZ_500);

    /* BDU=1, IF_INC=1 (auto-increment) */
    spi_reg_write(LSM6DSO_REG_CTRL3_C, LSM6DSO_CTRL3_BDU_IFINC);

    /* Data-ready interrupt on INT1 */
    spi_reg_write(LSM6DSO_REG_INT1_CTRL, 0x01);

    /* Accel high-performance OFF to save power */
    spi_reg_write(LSM6DSO_REG_CTRL6_C, 0x10);

    LOG_INF("LSM6DSO initialized (104Hz, ±4g, ±500dps)");
    return 0;
}

/* ── Read Accel + Gyro ── */
int lsm6dso_read(struct lsm6dso_data *data)
{
    /* Check data ready */
    uint8_t status;
    int err = spi_reg_read(LSM6DSO_REG_STATUS, &status, 1);
    if (err) return err;

    if (!(status & 0x03)) {
        return -EAGAIN;  /* No new data */
    }

    /* Burst read 12 bytes: gyro (6B) + accel (6B) starting from OUTX_L_G */
    uint8_t raw[12];
    err = spi_reg_read(LSM6DSO_REG_OUTX_L_G, raw, 12);
    if (err) return err;

    /* Parse gyroscope (little-endian int16) */
    int16_t gx = (int16_t)(raw[0]  | (raw[1]  << 8));
    int16_t gy = (int16_t)(raw[2]  | (raw[3]  << 8));
    int16_t gz = (int16_t)(raw[4]  | (raw[5]  << 8));

    /* Parse accelerometer */
    int16_t ax = (int16_t)(raw[6]  | (raw[7]  << 8));
    int16_t ay = (int16_t)(raw[8]  | (raw[9]  << 8));
    int16_t az = (int16_t)(raw[10] | (raw[11] << 8));

    /* Convert to physical units */
    data->accel_g[0] = (float)ax * LSM6DSO_ACCEL_SENS_4G / 1000.0f;
    data->accel_g[1] = (float)ay * LSM6DSO_ACCEL_SENS_4G / 1000.0f;
    data->accel_g[2] = (float)az * LSM6DSO_ACCEL_SENS_4G / 1000.0f;

    data->gyro_dps[0] = (float)gx * LSM6DSO_GYRO_SENS_500 / 1000.0f;
    data->gyro_dps[1] = (float)gy * LSM6DSO_GYRO_SENS_500 / 1000.0f;
    data->gyro_dps[2] = (float)gz * LSM6DSO_GYRO_SENS_500 / 1000.0f;

    return 0;
}
