# Enhanced PT100 native example

54 components, 58 connectors. Two buffers, three-wire compensation, 100mV offset subtraction with gain40, RC filter and three automatic comparator outputs. See root README for scope and limitations. Circuit files are native serialized readbacks, not vendor-encrypted project archives.

Native acceptance readings at 100 C: VCOMP about138.505mV and VOUT about1540.14mV. At180C the overtemperature output was3.3V; a1milliohm short substitute activated low fault; a30kilohm high-resistance substitute activated high fault (and overtemperature). These were screenshot acceptance readings; the MCP does not expose a verified voltage numerical API.

The mismatch and final100 cases were repeated with explicit lead-value readback checks after detecting a possible stale-case wait. The source is ideal and high-resistance faults produce physically unrealistic compliance voltages. Generic comparators have no hysteresis. No ADC or MCU is implemented.
