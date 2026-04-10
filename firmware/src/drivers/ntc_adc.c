/**
 * ══════════════════════════════════════
 * PART:   NTC Thermistor ADC Driver
 * ACTOR:  Claude Opus 4.6
 * PHASE:  19 — ADC Temperature Measurement
 * ══════════════════════════════════════
 *
 * NTC 10kΩ thermistor via nRF52840 SAADC
 * Channel: AIN0 (P0.02)
 * Resolution: 12-bit
 * Voltage divider: Vcc(3.3V) — [R_ref 10kΩ] — AIN0 — [NTC] — GND
 * Temperature: Steinhart-Hart equation
 *   1/T = A + B×ln(R) + C×(ln(R))³
 * Coefficients match Opus Phase 14 TemperatureProcessor.ts
 */

#include <zephyr/kernel.h>
#include <zephyr/drivers/adc.h>
#include <zephyr/logging/log.h>
#include <math.h>

#include "ntc_adc.h"

LOG_MODULE_REGISTER(ntc_adc, LOG_LEVEL_INF);

/* ── ADC Device ── */
static const struct device *adc_dev;
static int16_t adc_buffer;

static struct adc_channel_cfg channel_cfg = {
    .gain = ADC_GAIN_1_6,
    .reference = ADC_REF_INTERNAL,           /* 0.6V internal */
    .acquisition_time = ADC_ACQ_TIME_DEFAULT,
    .channel_id = NTC_ADC_CHANNEL,
    .input_positive = NRF_SAADC_AIN0,
};

static struct adc_sequence sequence = {
    .channels = BIT(NTC_ADC_CHANNEL),
    .buffer = &adc_buffer,
    .buffer_size = sizeof(adc_buffer),
    .resolution = NTC_ADC_RESOLUTION,
};

/* ── Init ── */
int ntc_adc_init(void)
{
    adc_dev = DEVICE_DT_GET(DT_NODELABEL(adc));
    if (!device_is_ready(adc_dev)) {
        LOG_ERR("ADC device not ready");
        return -ENODEV;
    }

    int err = adc_channel_setup(adc_dev, &channel_cfg);
    if (err) {
        LOG_ERR("ADC channel setup failed (err %d)", err);
        return err;
    }

    LOG_INF("NTC ADC initialized (AIN0, 12-bit, Steinhart-Hart)");
    return 0;
}

/* ── Read Temperature in Celsius ── */
float ntc_adc_read_celsius(void)
{
    int err = adc_read(adc_dev, &sequence);
    if (err) {
        LOG_ERR("ADC read failed (err %d)", err);
        return -1.0f;
    }

    int16_t raw = adc_buffer;
    if (raw <= 0 || raw >= 4095) {
        LOG_WRN("ADC out of range: %d", raw);
        return -1.0f;
    }

    /* Convert ADC to voltage */
    float v_out = (float)raw * (NTC_ADC_VREF / 4096.0f);

    /* Calculate NTC resistance via voltage divider */
    float denominator = NTC_VCC - v_out;
    if (denominator <= 0.001f) {
        return -1.0f;  /* Prevent division by zero */
    }
    float ntc_r = NTC_R_REF * v_out / denominator;

    /* Steinhart-Hart equation */
    float ln_r = logf(ntc_r);
    float inv_t = NTC_SH_A +
                  NTC_SH_B * ln_r +
                  NTC_SH_C * ln_r * ln_r * ln_r;

    float t_celsius = (1.0f / inv_t) - 273.15f;

    /* Sanity check: body temperature range */
    if (t_celsius < 20.0f || t_celsius > 45.0f) {
        LOG_WRN("Temperature out of body range: %.1f°C", (double)t_celsius);
    }

    return t_celsius;
}
