"""ngspice cross-check: explicit Howland network + reduced front-end transfer.
Not a transistor model and not a native SmartEDA waveform export.
"""
import argparse,json,subprocess,re
from pathlib import Path
def netlist(rtd=138.5055,lead=2,dynamic=False):
 sensor='RRTD x y R={100*(1+0.0039083*v(temp)-0.0000005775*v(temp)^2)}' if dynamic else f'RRTD x y {rtd}'
 temp='VTEMP temp 0 PWL(0 100 0.05 100 0.050001 180 0.15 180)' if dynamic else ''
 return f'''PT100 V4 Howland compliance and RC independent cross-check
VREF ref 0 0.1
RHW1 ref plus 10meg
RHW2 plus va 10meg
RHW3 drive minus 10meg
RHW4 minus 0 10meg
BAMP drive 0 V=min(5,max(0,1e6*(v(plus)-v(minus))))
RSET drive va 100
RL1 va x {lead}
RL2 x vb {lead}
RL3 y 0 {lead}
{sensor}
RIN vb 0 10g
* Reduced equivalent of ideal buffered compensation/gain stages:
BCOMP comp 0 V=2*v(vb)-v(va)
BGAIN gain 0 V=min(5,max(-5,40*(v(comp)-0.1)))
RFILTER gain out 1k
CFILTER out 0 10u
{temp}
.control
set wr_vecnames
set wr_singlescale
{'tran 0.0001 0.15' if dynamic else 'op'}
wrdata result.dat v(va) v(vb) v(drive) v(comp) v(out)
quit
.endc
.end
'''
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--exe',default='ngspice');ap.add_argument('--output',type=Path,default=Path('spice-results'));a=ap.parse_args();a.output.mkdir(parents=True,exist_ok=True)
 results=[]
 for name,r,lead,dyn in [('normal100',138.5055,2,False),('lead20',138.5055,20,False),('short',.001,2,False),('high30k',30000,2,False),('step100to180',138.5055,2,True)]:
  d=(a.output/name).resolve();d.mkdir(exist_ok=True);(d/'model.cir').write_text(netlist(r,lead,dyn),encoding='ascii')
  p=subprocess.run([a.exe,'-b','model.cir'],cwd=d,capture_output=True,text=True)
  (d/'run.log').write_text(p.stdout+p.stderr,encoding='utf8')
  if p.returncode or not (d/'result.dat').exists():raise RuntimeError(f'{name}: ngspice failed; see {d}/run.log')
  lines=(d/'result.dat').read_text().strip().splitlines();rows=[list(map(float,l.split())) for l in lines[1:]]
  result=dict(name=name,points=len(rows),last=dict(zip(['time' if dyn else 'scale','va','vb','drive','comp','out'],rows[-1])))
  if dyn:
   baseline=min(rows,key=lambda x:abs(x[0]-.049))[5];final=rows[-1][5];target=baseline+(1-1/2.718281828)*(final-baseline)
   row=min((x for x in rows if x[0]>.050001),key=lambda x:abs(x[5]-target));result['estimated_tau_s']=row[0]-.050001
   assert .009<result['estimated_tau_s']<.011
  if name=='normal100':assert abs(rows[-1][5]-1.540181)<.0001
  if name=='high30k':assert rows[-1][3]<=5.00001 and rows[-1][1]<5.01
  results.append(result)
 (a.output/'summary.json').write_text(json.dumps({'provenance':'ngspice explicit Howland + reduced ideal front end, distinct from SmartEDA','cases':results},indent=2),encoding='utf8')
 print(json.dumps(results))
if __name__=='__main__':main()
