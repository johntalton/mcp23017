
const { BusUtil, BitUtil } = require('@johntalton/and-other-delights');

const { CommonBank0 } = require('./commonbank0.js');
const { REGISTERS_BANK0, PIN_STATE_SIZE } = require('./registers.js');

// bank 0 layout (interlaced)
// read
const FIRST_BLOCK = REGISTERS_BANK0.IODIRA;
const SECOND_OLAT = REGISTERS_BANK0.OLATA;

const FIRST_BLOCK_SIZE = 16;
const SECOND_OLAT_SIZE = 2;

const PIN_STATE_INTERLACED_BLOCK_READ = [
  [FIRST_BLOCK, FIRST_BLOCK_SIZE],
  [SECOND_OLAT, SECOND_OLAT_SIZE]
];

// write
// todo move gpintenAB to end
const PART_ONE_START = REGISTERS_BANK0.IODIRA;
const PART_TWO_START = REGISTERS_BANK0.GPPUA;
const PART_THREE_START = REGISTERS_BANK0.OLATA;

const PART_ONE_SIZE = 10;
const PART_TWO_SIZE = 2;
const PART_THREE_SIZE = 2;

const PIN_STATE_INTERLACED_BLOCK_WRITE = [
  [PART_ONE_START, PART_ONE_SIZE],
  [PART_TWO_START, PART_TWO_SIZE],
  [PART_THREE_START, PART_THREE_SIZE]
];


/*

// hand writen version of fillmapBank
        if(buffer.length !== 18) { throw Error('buffer length strange: ' + buffer.length); }
        return Buffer.concat([
          buffer.slice(0, -SECOND_OLAT_SIZE),
          Buffer.from(new Array(4).fill(0)),
          buffer.slice(-SECOND_OLAT_SIZE)
        ], 22);
      });

*/

/**
 *
 **/
class CommonInterlacedBlock {
  static state(bus) {
    return  CommonBank0.state(bus, PIN_STATE_INTERLACED_BLOCK_READ);
  }

  static exportAll(bus, buffer) {
    return CommonBank0.exportAll(bus, PIN_STATE_INTERLACED_BLOCK_WRITE, buffer);
  }

  static readPort(bus, register) {
    return CommonBank0.readPort(bus, register);
  }

  static readAB(bus, registerA, registerB) {
    return CommonBank0.readAB(bus, registerA, registerB);
  }
}

module.exports = { CommonInterlacedBlock };
