"""Build real AVR HEX. Supply --bin pointing to a trusted AVR toolchain bin folder."""
import argparse
from pathlib import Path
import subprocess
import tempfile
import os

ap = argparse.ArgumentParser()
ap.add_argument('--bin', type=Path)
args = ap.parse_args()
root = Path(__file__).resolve().parent
suffix = '.exe' if os.name == 'nt' else ''
def exe(name):
    return str(args.bin / (name + suffix)) if args.bin else name
with tempfile.TemporaryDirectory(prefix='pt100-build-') as folder:
    elf = str(Path(folder) / 'firmware.elf')
    subprocess.run([exe('avr-gcc'), '-mmcu=atmega328p', '-DF_CPU=8000000UL',
                    '-std=gnu11', '-Os', '-Wall', '-Wextra', '-Werror',
                    str(root / 'firmware.c'), str(root.parent / 'pt100-v4/pt100.c'),
                    '-lm', '-o', elf], check=True)
    subprocess.run([exe('avr-objcopy'), '-O', 'ihex', '-R', '.eeprom', elf,
                    str(root / 'firmware.hex')], check=True)
    subprocess.run([exe('avr-size'), elf], check=True)
