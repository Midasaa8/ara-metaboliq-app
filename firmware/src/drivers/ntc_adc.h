/**
 * ══════════════════════════════════════
 * PART:   NTC Thermistor ADC Driver
 * ACTOR:  Claude Opus 4.6
 * PHASE:  19 — ADC Temperature Driver Interface
 * ══════════════════════════════════════
 */

#ifndef ARA_NTC_ADC_H
#define ARA_NTC_ADC_H

#include <zephyr/types.h>

/* ── ADC Config ── */
#define NTC_ADC_CHANNEL       0       /* AIN0 = P0.02 */
#define NTC_ADC_RESOLUTION    12      /* 12-bit (0-4095) */
#define NTC_ADC_VREF          3.6f    /* Internal 0.6V + 1/6 gain */
#define NTC_VCC               3.3f    /* Supply voltage */
#define NTC_R_REF             10000.0f /* Reference resistor 10kΩ */

/* ── Steinhart-Hart Coefficients (NTC 10kΩ) ── */
#define NTC_SH_A  1.009249522e-3f
#define NTC_SH_B  2.378405444e-4f
#define NTC_SH_C  2.019202697e-7f

/* ── API ── */
int ntc_adc_init(void);
float ntc_adc_read_celsius(void);

#endif /* ARA_NTC_ADC_H */
