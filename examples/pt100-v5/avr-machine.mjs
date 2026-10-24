import {
  CPU,
  avrInstruction,
  AVRIOPort,
  portBConfig,
  portCConfig,
  portDConfig,
  AVRADC,
  adcConfig,
  AVRUSART,
  usart0Config,
} from "avr8js";
export function createMachine(hex) {
  const bytes = new Uint8Array(32768);
  let upper = 0,
    eof = false,
    hasData = false;
  for (const line of hex.trim().split(/\r?\n/)) {
    if (eof || !/^:(?:[0-9a-f]{2}){5,}$/i.test(line))
      throw Error("Invalid HEX record");
    const data = Uint8Array.from(
      line
        .slice(1)
        .match(/../g)
        .map((x) => parseInt(x, 16)),
    );
    if (data.length !== data[0] + 5 || data.reduce((a, b) => a + b, 0) & 255)
      throw Error("Invalid HEX checksum");
    const address = (data[1] << 8) | data[2],
      type = data[3];
    if (type === 4) {
      if (data[0] !== 2) throw Error("Invalid HEX address");
      upper = ((data[4] << 8) | data[5]) * 65536;
    } else if (type === 1) {
      if (data[0] !== 0) throw Error("Invalid HEX EOF");
      eof = true;
    } else if (type === 0) {
      if (upper + address + data[0] > bytes.length)
        throw Error("Flash overflow");
      bytes.set(data.slice(4, 4 + data[0]), upper + address);
      hasData = true;
    } else throw Error("Unsupported HEX record type");
  }
  if (!eof || !hasData) throw Error("Incomplete HEX firmware");
  const cpu = new CPU(new Uint16Array(bytes.buffer));
  const portB = new AVRIOPort(cpu, portBConfig),
    portC = new AVRIOPort(cpu, portCConfig),
    portD = new AVRIOPort(cpu, portDConfig);
  const adc = new AVRADC(cpu, adcConfig);
  adc.avcc = 3.3;
  adc.aref = 3.3;
  const usart = new AVRUSART(cpu, usart0Config, 8000000);
  let output = "",
    mode4 = false,
    pending = null,
    address = 0,
    lastPort = 0,
    heartbeatEdges = 0;
  const ram = Array(128).fill(" "),
    lines = [];
  portB.addListener((v, old) => {
    if ((v ^ old) & 32) heartbeatEdges++;
  });
  usart.onByteTransmit = (v) => {
    output = (output + String.fromCharCode(v)).slice(-12000);
    if (v === 10) {
      lines.push(output.trim().split("\n").at(-1));
      if (lines.length > 100) lines.shift();
    }
  };
  portD.addListener((v) => {
    if (lastPort & 8 && !(v & 8)) {
      const nib = v >> 4;
      if (!mode4) {
        if (nib === 2) mode4 = true;
      } else if (pending === null) pending = nib;
      else {
        const b = (pending << 4) | nib;
        pending = null;
        if (v & 4) {
          ram[address & 127] = String.fromCharCode(b);
          address = (address + 1) & 127;
        } else if (b & 128) address = b & 127;
        else if (b === 1) {
          ram.fill(" ");
          address = 0;
        }
      }
    }
    lastPort = v;
  });
  const lcd = () => [ram.slice(0, 16).join(""), ram.slice(64, 80).join("")];
  function run(milliseconds, voltage, flags) {
    if (
      !Number.isFinite(milliseconds) ||
      milliseconds < 0 ||
      milliseconds > 2000 ||
      !Number.isFinite(voltage) ||
      !Number.isInteger(flags) ||
      flags < 0 ||
      flags > 7
    )
      throw Error("Invalid AVR run arguments");
    adc.channelValues[0] = voltage;
    for (let i = 1; i <= 3; i++) portC.setPin(i, !!(flags & (1 << (i - 1))));
    const end = cpu.cycles + milliseconds * 8000;
    while (cpu.cycles < end) {
      avrInstruction(cpu);
      cpu.tick();
    }
    return {
      cycles: cpu.cycles,
      lcd: lcd(),
      uart: lines.at(-1),
      heartbeatEdges,
    };
  }

  return { run };
}
