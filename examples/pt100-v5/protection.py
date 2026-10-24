"""Independent ngspice input protection; generic diodes, powered ideal 3.3V rail.

Not an ESD qualification or a transistor-level model of an AVR input.
"""
import argparse
import json
import subprocess
from pathlib import Path


def simulate(exe, output):
    output.mkdir(parents=True, exist_ok=True)
    results = []
    for name, voltage in [('normal100', 1.54018127), ('hot180', 2.73907),
                          ('short', -3.99996), ('high30k', 5.0)]:
        folder = (output / name).resolve()
        folder.mkdir(exist_ok=True)
        model = f'''PT100 V5 generic input clamp, independent ngspice
VSOURCE source 0 {voltage}
VDD vdd 0 3.3
RLIMIT source adc 10k
DUP adc vdd clamp
DLOW 0 adc clamp
CSTORE adc 0 100n
RPRELOAD vdd 0 1k
.model clamp D(Is=2n N=1.1 Rs=0.5)
.control
set wr_vecnames
set wr_singlescale
op
wrdata result.dat v(source) v(adc) i(VSOURCE) i(VDD)
quit
.endc
.end
'''
        (folder / 'model.cir').write_text(model, encoding='ascii')
        run = subprocess.run([exe, '-b', 'model.cir'], cwd=folder,
                             capture_output=True, text=True)
        (folder / 'run.log').write_text(run.stdout + run.stderr, encoding='utf8')
        if run.returncode:
            raise RuntimeError(f'{name}: ngspice exit {run.returncode}; see run.log')
        row = list(map(float, (folder / 'result.dat').read_text().splitlines()[-1].split()))
        vin, adc, source_i, supply_i = row[1:]
        assert -0.5 < adc < 3.8, (name, adc)
        assert abs(source_i) < 0.0005, (name, source_i)
        if name in ('normal100', 'hot180'):
            assert abs(adc - vin) < 0.0001, (name, adc, vin)
        assert supply_i < 0, 'Preload must keep supply sourcing current'
        results.append(dict(name=name, sourceV=vin, adcV=adc,
                            inputCurrentA=source_i, railSourceCurrentA=-supply_i))
    summary = dict(provenance='Independent ngspice generic diode protection model, '
                   'not native SmartEDA measurement or hardware qualification',
                   railPowered=True, seriesOhms=10000, storageCapacitanceF=1e-7,
                   preloadOhms=1000, cases=results)
    (output / 'summary.json').write_text(json.dumps(summary, indent=2), encoding='utf8')
    return summary


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--exe', default='ngspice')
    parser.add_argument('--output', type=Path, default=Path('protection-results'))
    args = parser.parse_args()
    print(json.dumps(simulate(args.exe, args.output)))

