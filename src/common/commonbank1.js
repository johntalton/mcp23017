const { BusUtil, BitUtil } = require('@johntalton/and-other-delights');

const { REGISTERS_BANK1 } = require('./registers.js');

/**
 *
 **/
class CommonBank1 {
  static state(bus, block) {
    return BusUtil.readblock(bus, block)
      .then(buffer => BusUtil.fillmapBlock(block, buffer));
  }

  static exportAll(bus, block, buffer) {
    if(!Buffer.isBuffer(buffer)) { throw Error('export is not a buffer'); }
    return BusUtil.writeblock(bus, block, buffer);
  }

  static readPort(bus, register) {
    return bus.read(register);
  }

  static readAB(bus, registerA, registerB) {
    return Promise.all([
      bus.read(registerA),
      bus.read(registerB)
    ]);
  }
}

module.exports = { CommonBank1 };






