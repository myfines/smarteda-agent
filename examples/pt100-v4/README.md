# V4: finite-rail Howland excitation and reproducible engineering evidence

The native model replaces the ideal 1 mA source with a generic 1e6-gain
op-amp, 0..5 V output limits, a 100 ohm set resistor and four 10 Mohm
Howland network resistors. Its 0.1 V reference gives approximately 1 mA
within compliance. At a finite 30 kohm sensor fault, drive saturates at
5 V instead of generating the previous model's approximately 30 V.

This is an analog front-end competition example. It is not a completed
physical instrument or a native MCU firmware simulation. Generic op-amp
models omit bandwidth, noise, stability and real protection behavior.
10 Mohm networks demand low input bias/leakage and matched ratios in
hardware. External surge/ESD protection is not implemented or verified.

Native acceptance covered 0/100/180 C, matched 20 ohm leads, finite short,
finite 30 kohm fault, and two capacitor initial conditions at 150 C.
All eight runs had advancing native simulation time. Alarm screenshots
were checked visually; editing and simulation use native/DOM operations.
Initial-condition hysteresis checks are not continuous temperature sweeps.
The model reopens with 93 connectors and one scope. Paper: 1100x650 mm.

`analyze.py` uses independent loaded-network equations for 201 DC points,
10,000 deterministic tolerance samples, lead mismatch and error estimates.
The Monte Carlo covers the excitation network only; the remaining stages
are ideal. It is not a total instrument accuracy result.

`spice_verify.py --exe /path/to/ngspice --output /private/results`
cross-checks the explicit Howland network and a reduced equivalent of the
buffer/compensation/gain stages. It records actual ngspice logs/data for
four DC cases plus a 100-to-180 C RC transient (estimated tau ~9.96 ms).
This waveform is independent of SmartEDA and is identified accordingly.
Ngspice is optional and is not bundled.

`pt100.c`/`pt100.h` provide board-independent ADC-code conversion, stable
quadratic inversion, two-point calibration, startup validity and external
fault-GPIO priority. `test_pt100.c` exercises 20,001 temperatures, invalid
codes, fault combinations and calibration with a real C compiler:

```sh
cc -std=c11 -Wall -Wextra -Werror pt100.c test_pt100.c -lm -o pt100-test
./pt100-test
python analyze.py
```

The C program is host-tested; no ADC driver, MCU execution, display or
closed-loop heater controller is claimed. Fault flags must come from real
GPIOs/diagnostics; a zero ADC code alone cannot distinguish 0 C from faults.
Allow at least 100 ms settling before declaring readings valid. Hardware
ADC inputs need protection from negative/5 V front-end fault outputs.

The official vendor archive remains separate from plaintext native XML.
Oscope callbacks retain the V3 buffered-data limitations: a new callback
does not prove current samples. No instantaneous nonvisual voltage API
has been verified.
