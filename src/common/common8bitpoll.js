const { CommonBank1 } = require('./commonbank1.js');
const { REGISTERS_BANK1 } = require('./registers.js');

// read
const PIN_STATE_8BIT_POLL_READ = [
  REGISTERS_BANK1.IODIRA,
  REGISTERS_BANK1.IPOLA,
  REGISTERS_BANK1.GPINTENA,
  REGISTERS_BANK1.DEFVALA,
  REGISTERS_BANK1.INTCONA,
  REGISTERS_BANK1.IOCON,
  REGISTERS_BANK1.GPPUA,
  REGISTERS_BANK1.INTFA,
  REGISTERS_BANK1.OLATA,

  //
  REGISTERS_BANK1.IODIRB,
  REGISTERS_BANK1.IPOLB,
  REGISTERS_BANK1.GPINTENB,
  REGISTERS_BANK1.DEFVALB,
  REGISTERS_BANK1.INTCONB,
  REGISTERS_BANK1.IOCON_ALT,
  REGISTERS_BANK1.GPPUB,
  REGISTERS_BANK1.INTFB,
  REGISTERS_BANK1.OLATB
];

// write
const PIN_STATE_8BIT_POLL_WRITE = [
  REGISTERS_BANK1.IODIRA,
  REGISTERS_BANK1.IPOLA,
  REGISTERS_BANK1.GPINTENA, // todo move to end
  REGISTERS_BANK1.DEFVALA,
  REGISTERS_BANK1.INTCONA,
  REGISTERS_BANK1.GPPUA,
  REGISTERS_BANK1.OLATA,

  //
  REGISTERS_BANK1.IODIRB,
  REGISTERS_BANK1.IPOLB,
  REGISTERS_BANK1.GPINTENB, // todo move end
  REGISTERS_BANK1.DEFVALB,
  REGISTERS_BANK1.INTCONB,
  REGISTERS_BANK1.GPPUB,
  REGISTERS_BANK1.OLATB
];

/**
 *
 **/
class Common8bitPoll {
  static state(bus) {
    return CommonBank1.state(bus, PIN_STATE_8BIT_POLL_READ);
  }

  static exportAll(bus, buffer) {
    return CommonBank1.exportAll(bus, PIN_STATE_8BIT_POLL_WRITE, buffer);
  }

  static readPort(bus, register) {
    return CommonBank1.readPort(bus, register);
  }

  static readAB(bus, registerA, registerB) {
    return CommonBank1.readAB(bus, registerA, registerB);
  }

  static writePort(bus, register, value) {
    return CommonBank1.writePort(bus, register, value);
  }
}

module.exports = { Common8bitPoll };
