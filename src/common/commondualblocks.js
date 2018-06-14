const { CommonBank1 } = require('./commonbank1.js');
const { REGISTERS_BANK1 } = require('./registers.js');

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

const BULK_DATA_DUAL_BLOCKS_READ = [
  [REGISTERS_BANK1.INTFA, 4],
  [REGISTERS_BANK1.INTFB, 4]
];

// write
const WRITE_RUN_SIZE = 5;
// 1
// 1

const PIN_STATE_DUAL_BLOCKS_WRITE = [
  [FIRST_BLOCK_START, WRITE_RUN_SIZE], // todo move gpinten AB to end
  REGISTERS_BANK1.GPPUA,
  REGISTERS_BANK1.OLATA,
  [SECOND_BLOCK_START, WRITE_RUN_SIZE],
  REGISTERS_BANK1.GPPUB,
  REGISTERS_BANK1.OLATB
];

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

  static writePort(bus, register, value) {
    return CommonBank1.writePort(bus, register, value);
  }

  static bulkData(bus) {
    return CommonBank1.bulkData(bus, BULK_DATA_DUAL_BLOCKS_READ);
  }
}

module.exports = { CommonDualBlocks };
