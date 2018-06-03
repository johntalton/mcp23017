
const { BusUtil, BitUtil } = require('@johntalton/and-other-delights');

const { CommonBank1 } = require('./commonbank1.js');
const { REGISTERS_BANK1, PIN_STATE_SIZE, BANK1_AB_GAP_SIZE } = require('./registers.js');

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
  REGISTERS_BANK1.OLATB,
];

// write
const PIN_STATE_8BIT_POLL_WRITE = [
  REGISTERS_BANK1.IODIRA,
  REGISTERS_BANK1.IPOLA,
  REGISTERS_BANK1.GPINTENA, //todo move to end
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

/*
// hand writen fillmapBlock

        if(buffer.length !== 18) { throw Error('buffer length strange: ' + buffer.length); }
        console.log('common8bit buffer', buffer);

        return Buffer.concat([
          buffer.slice(0, PIN_STATE_SIZE),
          Buffer.from(new Array(2).fill(0)),
          buffer.slice(PIN_STATE_SIZE, PIN_STATE_SIZE + 1),
          Buffer.from(new Array(BANK1_AB_GAP_SIZE).fill(0)),
          buffer.slice(PIN_STATE_SIZE + 1, -1),
          Buffer.from(new Array(2).fill(0)),
          buffer.slice(-1)
        ], 27);
      });
*/

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
}

module.exports = { Common8bitPoll };
