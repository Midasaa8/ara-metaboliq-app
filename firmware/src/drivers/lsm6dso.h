/**
 * ══════════════════════════════════════
 * PART:   LSM6DSO 6-Axis IMU Driver
 * ACTOR:  Claude Opus 4.6
 * PHASE:  19 — SPI Sensor Driver Interface
 * ══════════════════════════════════════
 */

#ifndef ARA_LSM6DSO_H
#define ARA_LSM6DSO_H

#include <zephyr/types.h>

/* ── SPI Config ── */
#define LSM6DSO_SPI_MAX_FREQ  4000000  /* 4MHz */

/* ── Register Map ── */
#define LSM6DSO_REG_WHO_AM_I     0x0F
#define LSM6DSO_REG_CTRL1_XL     0x10  /* Accel control */
#define LSM6DSO_REG_CTRL2_G      0x11  /* Gyro control */
#define LSM6DSO_REG_CTRL3_C      0x12  /* Common control */
#define LSM6DSO_REG_CTRL6_C      0x15  /* Accel perf mode */
#define LSM6DSO_REG_INT1_CTRL    0x0D  /* Interrupt config */
#define LSM6DSO_REG_STATUS       0x1E
#define LSM6DSO_REG_OUTX_L_G     0x22  /* Gyro data start */
#define LSM6DSO_REG_OUTX_L_A     0x28  /* Accel data start */

/* ── Expected Values ── */
#define LSM6DSO_WHO_AM_I_VAL     0x6C

/* ── Config: 104Hz ODR, ±4g accel, ±500dps gyro ── */
#define LSM6DSO_CTRL1_XL_104HZ_4G  0x40
#define LSM6DSO_CTRL2_G_104HZ_500  0x40
#define LSM6DSO_CTRL3_BDU_IFINC    0x44

/* ── Sensitivity Constants ── */
#define LSM6DSO_ACCEL_SENS_4G    0.122f  /* mg/LSB at ±4g */
#define LSM6DSO_GYRO_SENS_500    17.50f  /* mdps/LSB at ±500dps */

/* ── Data Structure ── */
struct lsm6dso_data {
    float accel_g[3];   /* accelerometer in g */
    float gyro_dps[3];  /* gyroscope in degrees/sec */
};

/* ── API ── */
int lsm6dso_init(void);
int lsm6dso_read(struct lsm6dso_data *data);

#endif /* ARA_LSM6DSO_H */
