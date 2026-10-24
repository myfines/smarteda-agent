# Finite-rail excitation and evidence boundaries

The V4 example adds a native generic opAmp + four 10 Mohm resistors and
a 100 ohm set resistor. Noninverting input averages 0.1 V reference and
sensor drive VA; inverting input divides op-amp output by two. Ideally
Vdrive=VA+0.1 V and Iset=1 mA. Positive-input resistor loading is small,
but not zero; use the loaded-network calculations in examples/pt100-v4.
Set native opAmp limits to 0 V/5 V, gain 1e6. Finite compliance must be
verified under a high-resistance case instead of assuming constant current.

Capture backup before replacing the source; retain the exact original
source-output destination pin. Do not guess the junction pin from position.
Wait for the new HOWLAND_5V object in native serialization before starting.
Reopening is asynchronous: settle, stop, attach setSimTime callback, start,
then require two distinct time events. Restore original callbacks when
instrumentation ends. Native toolbar text can disagree with actual time.

V4 acceptance: eight cases, 93 connectors after cloud reopen, one scope.
The 30 kohm sensor case gives sensor drive VA approximately 4.98 V and
high-fault flag, rather than the original unbounded current source case.
Use screenshots for voltage acceptance only; numerical scope buffers
are not current probes. Public scripts independently calculate/verify
Howland compliance and RC settling. Label those calculations/ngspice
results separately from native SmartEDA observations.

Model limitations: generic op-amp has no validated bandwidth, phase
margin, bias/noise or surge behavior. No hardware ESD/ADC protection is
verified. Host-compiled C temperature conversion is not MCU integration.
Do not describe presentation readiness as completion of those features.
