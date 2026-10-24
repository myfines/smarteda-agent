#ifndef PT100_H
#define PT100_H
#include <stdint.h>
/* Board-independent conversion. ADC/GPIO drivers are supplied by the board.
 * Not firmware executed in SmartEDA. Valid measurement range: 0..200 C. */
enum pt100_status {PT100_OK, PT100_WARMUP, PT100_SENSOR_LOW,
  PT100_SENSOR_HIGH, PT100_INVALID, PT100_OUT_OF_RANGE};
typedef struct { double zero_v, span_v, vref; uint32_t adc_max; } pt100_cal;
typedef struct { enum pt100_status status; double temperature_c; int overtemp; } pt100_result;
int pt100_calibrate(pt100_cal *cal, double v0, double v100);
pt100_result pt100_decode(uint32_t code, unsigned fault_low,
  unsigned fault_high, unsigned alarm, unsigned settled, const pt100_cal *cal);
#endif
