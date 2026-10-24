# MCU pin discovery and honest fallback

Observed October 2026, version-dependent. These are interface facts, not redistributed vendor package resources.

- `MCU` with local component ID `mega328-300` constructs an ATmega328 component. Its canonical endpoint suffixes are `PORTC0`..`PORTC5`, `PORTD0`..`PORTD7`, `PORTB0`..`PORTB7`, `VCC`, `GND1`, `GND2`, `PORTV0` (AVCC), `PORTV1` (AREF). Short `PD2` aliases silently lost connectors. Require exact retained connector counts after native round-trip.
- `Hd44780_1602` has endpoint suffixes `PinRS`, `PinRW`, `PinEn`, `dataPin0`..`dataPin7`. Four-bit data use 4..7. RW must be grounded for write-only firmware.
- `Program` and `Code` are string properties. A string/HEX preserved there does **not** prove native firmware loading. Direct `__Z12loadFirmwirev()` without verified current native component context raised an unaligned-access WASM error. Do not retry blindly or expose it as a working MCP firmware tool.
- A model-derived pointer interaction can verify its target by temporarily intercepting the observed property callback and requiring its returned component ID. Restore the callback in `finally`. A bounded hit-test must also escape any pending native wire operation; inspect serialized connectors for empty endpoints afterward. Do not reuse coordinates after layout or zoom changes.
- `qtLoader.status === 'Running'` can precede `qtLoader.module()` availability. Wait for the specific native method and then the expected serialized model, not status alone. A reload/open sequence may temporarily serialize zero components; never overwrite a valid local source with that empty result.
- Native canvas screenshots remained stale after model changes during testing; reload recovered rendering. Count and parameter checks, advancing simulation and visual acceptance are distinct gates.
- Generic diode `SatCurrent` was recalculated from other parameters. Read it back rather than assume the requested value persisted. Record native model parameters separately from independent ngspice assumptions.

If native firmware execution cannot be verified, preserve a stable analog project and use the open-source `examples/pt100-v5` AVR8js runner. It executes real compiled AVR instructions, ADC and UART peripherals, decoding LCD text from GPIO edges. Its fault GPIOs are injected scenario inputs and its ADC uses independently verified DC values; identify it as staged validation, not native execution or live mixed-signal cosimulation. Do not import vendor runtime/catalog files into this repository.
