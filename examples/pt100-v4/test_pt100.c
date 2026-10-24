#include "pt100.h"
#include <assert.h>
#include <math.h>
#include <stdio.h>
int main(void){
 pt100_cal c={0,1.54022,3.3,4095};double worst=0;
 for(int i=0;i<=20000;i++){
  double t=i/100.0,r=100*(1+3.9083e-3*t-5.775e-7*t*t),v=.04*(r-100);
  pt100_result x=pt100_decode((uint32_t)lround(v/3.3*4095),0,0,t>151,1,&c);
  assert(x.status==PT100_OK);double e=fabs(x.temperature_c-t);if(e>worst)worst=e;
 }
 assert(worst<.03);
 assert(pt100_decode(1000,1,0,1,1,&c).status==PT100_SENSOR_LOW);
 assert(pt100_decode(1000,0,1,1,1,&c).status==PT100_SENSOR_HIGH);
 assert(pt100_decode(1000,1,1,1,1,&c).status==PT100_INVALID);
 assert(pt100_decode(1000,0,0,0,0,&c).status==PT100_WARMUP);
 assert(pt100_decode(4096,0,0,0,1,&c).status==PT100_INVALID);
 assert(pt100_decode(4095,0,0,0,1,&c).status==PT100_OUT_OF_RANGE);
 assert(!pt100_calibrate(&c,1,1));
 assert(!pt100_calibrate(&c,NAN,1));
 pt100_cal bad=c;bad.span_v=1e-320;
 assert(pt100_decode(4095,0,0,0,1,&bad).status==PT100_OUT_OF_RANGE);
 bad=c;bad.vref=NAN;
 assert(pt100_decode(1,0,0,0,1,&bad).status==PT100_INVALID);
 assert(pt100_calibrate(&c,.02,1.57));
 assert(fabs(pt100_decode((uint32_t)lround(1.57/3.3*4095),0,0,0,1,&c).temperature_c-100)<.03);
 printf("PASS 20001 temperature points and fault/calibration tests; max quantization error %.6f C\n",worst);
 return 0;
}
