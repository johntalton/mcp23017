const { CommonBank0, WORD_SIZE } = require('./commonbank0.js');
const { REGISTERS_BANK0 } = require('./registers.js');

// read
// these could have also been all B first
const IODIR = REGISTERS_BANK0.IODIRA;
const IPOL = REGISTERS_BANK0.IPOLA;
const GPINTEN = REGISTERS_BANK0.GPINTENA;
const DEFVAL = REGISTERS_BANK0.DEFVALA;
const INTCON = REGISTERS_BANK0.INTCONA;
const IOCON = REGISTERS_BANK0.IOCON;
const GPPU = REGISTERS_BANK0.GPPUA;
const INTF = REGISTERS_BANK0.INTFA;
const OLAT = REGISTERS_BANK0.OLATA;

const PIN_STATE_16BIT_POLL_READ = [
  [IODIR, WORD_SIZE],
  [IPOL, WORD_SIZE],
  [GPINTEN, WORD_SIZE],
  [DEFVAL, WORD_SIZE],
  [INTCON, WORD_SIZE],
  [IOCON, WORD_SIZE],
  [GPPU, WORD_SIZE],
  [INTF, WORD_SIZE],

  [OLAT, WORD_SIZE]
];

// write
const PIN_STATE_16BIT_POLL_WRITE = [
  [IODIR, WORD_SIZE],
  [IPOL, WORD_SIZE],
  [GPINTEN, WORD_SIZE], // todo move to end
  [DEFVAL, WORD_SIZE],
  [INTCON, WORD_SIZE],
  [GPPU, WORD_SIZE],

  [OLAT, WORD_SIZE]
];

/**
 *
 **/
class Common16bitPoll {
  static state(bus) {
    return CommonBank0.state(bus, PIN_STATE_16BIT_POLL_READ);
  }

  static exportAll(bus, buffer) {
    return CommonBank0.exportAll(bus, PIN_STATE_16BIT_POLL_WRITE, buffer);
  }

  static readPort(bus, register) {
    return CommonBank0.readPort(register);
  }

  static readAB(bus, registerA, registerB) {
    return CommonBank0.readAB(registerA, registerB);
  }

  static writePort(bus, register, value) {
    return CommonBank0.writePort(bus, register, value);
  }
}

module.exports = { Common16bitPoll };
