
const { BusUtil, BitUtil } = require('@johntalton/and-other-delights');

const { REGISTERS_BANK1, PIN_STATE_SIZE } = require('./registers.js');

const FIRST_BLOCK_START = REGISTERS_BANK1.IODIRA;
const SECOND_BLOCK_START = REGISTERS_BANK1.IODIRB;

// read
const PIN_STATE_DUAL_BLOCKS_READ = [
  [FIRST_BLOCK_START, PIN_STATE_SIZE],
  REGISTERS_BANK1.OLATA,
  [SECOND_BLOCK_START, PIN_STATE_SIZE],
  REGISTERS_BANK1.OLATB
];

// write
const PIN_STATE_DUAL_BLOCKS_WRITE = [
  [FIRST_BLOCK_START, 5],
  REGISTERS_BANK1.GPPUA,
  REGISTERS_BANK1.OLATA,
  [SECOND_BLOCK_START, 5],
  REGISTERS_BANK1.GPPUB,
  REGISTERS_BANK1.OLATB
];

/**
 *
 **/
class CommonDualBlocks {
  static state(bus) {
    return BusUtil.readblock(bus, PIN_STATE_DUAL_BLOCKS_READ)
      .then(buffer => {
        console.log('dualblock read', buffer);
        return Buffer.concat([
          buffer.slice(0, PIN_STATE_SIZE),
          Buffer.from(new Array(2).fill(0)),
          buffer.slice(PIN_STATE_SIZE, PIN_STATE_SIZE + 1),
          Buffer.from(new Array(5).fill(0)),
          buffer.slice(PIN_STATE_SIZE + 1, PIN_STATE_SIZE + 1 + PIN_STATE_SIZE),
          Buffer.from(new Array(2).fill(0)),
          buffer.slice(PIN_STATE_SIZE + 1 + PIN_STATE_SIZE)
        ], 27);
      });
  }

  static exportAll(bus, buffer) {
    return BusUtil.writeblock(bus, PIN_STATE_DUAL_BLOCKS_WRITE, buffer);
  }
}

module.exports = { CommonDualBlocks };
