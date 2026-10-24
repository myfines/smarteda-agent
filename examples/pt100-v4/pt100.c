#include "pt100.h"
#include <math.h>
int pt100_calibrate(pt100_cal *c,double v0,double v100){
  if(!c||!isfinite(v0)||!isfinite(v100)||v100-v0<0.5)return 0;
  c->zero_v=v0;c->span_v=v100-v0;return 1;
}
pt100_result pt100_decode(uint32_t code,unsigned low,unsigned high,
 unsigned alarm,unsigned settled,const pt100_cal *c){
  pt100_result r={PT100_INVALID,NAN,0};
  if(!c||!c->adc_max||code>c->adc_max||!isfinite(c->vref)||c->vref<=0||
    !isfinite(c->zero_v)||!isfinite(c->span_v)||c->span_v<=0)return r;
  if(!settled){r.status=PT100_WARMUP;return r;}
  if(low&&high)return r;
  if(low){r.status=PT100_SENSOR_LOW;return r;}
  if(high){r.status=PT100_SENSOR_HIGH;return r;}
  double v=(double)code/c->adc_max*c->vref;
  /* 100 C resistance increment = 38.5055 ohm; two-point calibration. */
  double resistance=100.0+(v-c->zero_v)*38.5055/c->span_v;
  const double a=3.9083e-3,b=-5.775e-7;
  double q=resistance/100.0-1.0,d=a*a+4*b*q;
  if(!isfinite(d)||d<0){r.status=PT100_OUT_OF_RANGE;return r;}
  /* Stable root avoids cancellation near 0 C. */
  double t=2*q/(a+sqrt(d));
  if(!isfinite(t)||t < -0.15 || t > 200.15){r.status=PT100_OUT_OF_RANGE;return r;}
  r.temperature_c=t<0?0:(t>200?200:t);
  r.overtemp=alarm!=0;r.status=PT100_OK;return r;
}
