
const { BusUtil, BitUtil } = require('@johntalton/and-other-delights');

const { CommonBank1 } = require('./commonbank1.js');
const { REGISTERS_BANK1, PIN_STATE_SIZE, BANK1_AB_GAP_SIZE } = require('./registers.js');

// read
const FIRST_BLOCK_START = REGISTERS_BANK1.IODIRA;
const SECOND_BLOCK_START = REGISTERS_BANK1.IODIRB;

const FIRST_BLOCK_SIZE = 8;
const SECOND_BLOCK_SIZE = 8;
// 1

const PIN_STATE_DUAL_BLOCKS_READ = [
  [FIRST_BLOCK_START, FIRST_BLOCK_SIZE],
  REGISTERS_BANK1.OLATA,
  [SECOND_BLOCK_START, SECOND_BLOCK_SIZE],
  REGISTERS_BANK1.OLATB
];

// write
const WRITE_RUN_SIZE = 5;
// 1
// 1

const PIN_STATE_DUAL_BLOCKS_WRITE = [
  [FIRST_BLOCK_START, WRITE_RUN_SIZE], // todo move intenAB to end
  REGISTERS_BANK1.GPPUA,
  REGISTERS_BANK1.OLATA,
  [SECOND_BLOCK_START, WRITE_RUN_SIZE],
  REGISTERS_BANK1.GPPUB,
  REGISTERS_BANK1.OLATB
];

/*
// handwriten fillmapBlock
        console.log('dualblock read', buffer);
        return Buffer.concat([
          buffer.slice(0, FIRST_BLOCK_SIZE),
          Buffer.from(new Array(2).fill(0)),
          buffer.slice(FIRST_BLOCK_SIZE, FIRST_BLOCK_SIZE + 1),
          Buffer.from(new Array(BANK1_AB_GAP_SIZE).fill(0)),
          buffer.slice(FIRST_BLOCK_SIZE + 1, FIRST_BLOCK_SIZE + 1 + SECOND_BLOCK_SIZE),
          Buffer.from(new Array(2).fill(0)),
          buffer.slice(FIRST_BLOCK_SIZE + 1 + SECOND_BLOCK_SIZE)
        ], 27);
      });
*/

/**
 *
 **/
class CommonDualBlocks {
  static state(bus) {
    return CommonBank1.state(bus, PIN_STATE_DUAL_BLOCKS_READ);
  }

  static exportAll(bus, buffer) {
    return CommonBank1.exportAll(bus, PIN_STATE_DUAL_BLOCKS_WRITE, buffer);
  }

  static readPort(bus, register) {
    return CommonBank1.readPort(bus, register);
  }

  static readAB(bus, registerA, registerB) {
    return CommonBank1.readAB(bus, registerA, registerB);
  }
}

module.exports = { CommonDualBlocks };
