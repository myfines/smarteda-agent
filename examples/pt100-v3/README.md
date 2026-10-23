# V3: paper, hysteresis and scope interoperability

71 native non-connector objects / 81 connectors. Custom sheet750x550mm; centered network and reserved title-block clearance. The normal100C state was restored and reopened from cloud, preserving all81wires and one scope.

Added100k/10M positive feedback to three comparators. Overtemperature reference2.2866386V gives ideal rising/falling thresholds2.309505/2.276505V (about151.1/148.9C). Native initial-condition experiments at150C with filter capacitor0V/3V retained low/high overtemperature output. These are initial-condition tests rather than a continuous heating/cooling sweep.

Native acceptance screenshots also confirmed180C overtemperature, finite short and finite high-resistance faults. Current source and op-amp/rail models remain ideal/generic; practical compliance/protection, ADC/MCU integration and complete presentation/video are pending.

Circuit files have identical repeated Oscope attributes normalized for strict XML interoperability. No component values or electrical connections were changed by this normalization. Raw vendor export is a separate format; these files do not impersonate it.

Oscope-90 first two physical channels connect VOUT and overtemperature. The buffered callback reports two voltages with0.01V resolution. Some callback tail values were transient/stale and disagreed with instantaneous probe displays. See scope-buffer-observations.json and the skill reference: callback freshness is not sample freshness. Extra channel selection was not verified. Do not use the callback tail for current fault classification.
