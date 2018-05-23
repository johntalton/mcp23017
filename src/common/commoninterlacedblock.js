
const { BusUtil, BitUtil } = require('and-other-delights');

const { REGISTERS_BANK0, PIN_STATE_SIZE } = require('./registers.js');

// bank 0 layout (interlaced)
// read
const FIRST_BLOCK = REGISTERS_BANK0.IODIRA;
const SECOND_OLAT = REGISTERS_BANK0.OLATA;

const OLAT_SIZE = 2;

const PIN_STATE_INTERLACED_BLOCK_READ = [
  [FIRST_BLOCK, PIN_STATE_SIZE + PIN_STATE_SIZE],
  [SECOND_OLAT, OLAT_SIZE]
];

// write
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

class CommonInterlacedBlock {
  static state(bus) {
    return  BusUtil.readblock(bus, PIN_STATE_INTERLACED_BLOCK_READ)
      .then(buffer => {
        if(buffer.length !== 18) { throw Error('buffer length strange: ' + buffer.length); }
        return Buffer.concat([
          buffer.slice(0, -2),
          Buffer.from(new Array(4).fill(0)),
          buffer.slice(-2)
        ]);
      });
  }

  static exportAll(bus, buffer) {
    //console.log('exportall', PIN_STATE_INTERLACED_BLOCK_WRITE, buffer);
    if(!Buffer.isBuffer(buffer)) { throw Error('export is not a buffer'); }
    return BusUtil.writeblock(bus, PIN_STATE_INTERLACED_BLOCK_WRITE, buffer);  }
}

module.exports = { CommonInterlacedBlock };
