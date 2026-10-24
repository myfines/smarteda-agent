"""Independent circuit calculations, not SmartEDA measurements. Python stdlib."""
import csv,json,math,random
from pathlib import Path
OUT=Path(__file__).parent
A=3.9083e-3; B=-5.775e-7
def resistance(t):return 100*(1+A*t+B*t*t)
def temperature(r):
 q=r/100-1
 return 2*q/(A+math.sqrt(A*A+4*B*q))
def dc(t=100,r0=100,l1=2,l2=2,l3=2,ref=.1,rs=100,ratios=(1,1,1,1)):
 # Loaded three-wire network: lead2 has a real 10 Gohm input shunt.
 r=r0*(1+A*t+B*t*t); rin=1e10; sense=l2+rin
 load=(r+l3)*sense/(r+l3+sense); total=l1+load
 r1,r2,r3,r4=[1e7*x for x in ratios]
 # vplus = alpha*ref + beta*VA; vminus = gamma*drive.
 alpha=r2/(r1+r2);beta=r1/(r1+r2);gamma=r4/(r3+r4)
 k=1/(gamma+1e-6)
 # output drive = k*(alpha*ref+beta*VA), limited to 0..5 V.
 den=1/total+(1-k*beta)/rs+1/(r1+r2)
 va=(k*alpha*ref/rs+ref/(r1+r2))/den
 drive=k*(alpha*ref+beta*va)
 if drive>5 or drive<0:
  drive=max(0,min(5,drive));va=(drive/rs+ref/(r1+r2))/(1/total+1/rs+1/(r1+r2))
 vb=va*load/total*rin/sense
 comp=2*vb-va;out=max(-5,min(5,40*(comp-.1)))
 return dict(temperature=t,rtd_ohm=r,va_v=va,vb_v=vb,drive_v=drive,
  current_ma=va/total*1000,comp_v=comp,vout_v=out)
def main():
 rows=[dc(t=t) for t in range(201)]
 with (OUT/'dc-sweep-calculated.csv').open('w',newline='') as f:
  w=csv.DictWriter(f,fieldnames=rows[0]);w.writeheader();w.writerows(rows)
 rand=random.Random(20261024);errors=[];cal_errors=[]
 for _ in range(10000):
  kw=dict(ref=.1*(1+rand.uniform(-.0005,.0005)),rs=100*(1+rand.uniform(-.0001,.0001)),ratios=tuple(1+rand.uniform(-.0001,.0001) for _ in range(4)))
  z=dc(t=0,**kw)['vout_v'];h=dc(t=100,**kw)['vout_v'];v=dc(t=200,**kw)['vout_v']
  errors.append(temperature(100+v/.04)-200)
  cal_errors.append(temperature(100+(v-z)*38.5055/(h-z))-200)
 # ADC quantization excluded here; sensor tolerance and lead mismatch listed separately.
 mismatch=dc(l3=2.1);matched=dc()
 summary={
  'provenance':'Independent analytical calculations; not native measured samples',
  'normal100':matched,'fault30k':dc(t=0,r0=30000),
  'lead20':dc(l1=20,l2=20,l3=20),
  'lead_mismatch_0p1_ohm_error_c':temperature(100+mismatch['vout_v']/.04)-temperature(100+matched['vout_v']/.04),
  'two_wire_4_ohm_error_at100_c':temperature(resistance(100)+4)-100,
  'filter':{'tau_s':.01,'fc_hz':1/(2*math.pi*.01),'t99_s':-math.log(.01)*.01,'gain_50hz':1/math.sqrt(1+(2*math.pi*50*.01)**2),'gain_100hz':1/math.sqrt(1+(2*math.pi*100*.01)**2)},
  'self_heating_assumed_0p4_c_per_mw_max_c':(.001**2*resistance(200)*1000)*.4,
  'sensor_class_A_bound_at200_c':.15+.002*200,
  'adc_12bit_3p3v_half_lsb_max_c':3.3/4095/2/(.04*100*(A+2*B*200)),
  'monte_carlo':{'seed':20261024,'n':10000,'untrimmed_200c_error_minmax_c':[min(errors),max(errors)],'two_point_trim_200c_error_minmax_c':[min(cal_errors),max(cal_errors)],'assumptions':'Vref +/-0.05%, set resistor and each Howland ratio resistor +/-0.01% independent uniform; remaining stages ideal. Calibration voltages unquantized. No total-system accuracy claim.'}}
 (OUT/'calculated-analysis.json').write_text(json.dumps(summary,indent=2),encoding='utf8')
 assert abs(matched['vout_v']-1.5402)<.001
 assert summary['fault30k']['drive_v']==5
 assert summary['fault30k']['current_ma']<.2
 print(json.dumps({'dc_points':len(rows),'mc_cases':len(errors),'normal100_v':matched['vout_v'],'fault30k_ma':summary['fault30k']['current_ma'],'mismatch_error_c':summary['lead_mismatch_0p1_ohm_error_c']}))
if __name__=='__main__':main()
