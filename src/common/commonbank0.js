const { BusUtil } = require('@johntalton/and-other-delights');

const WORD_SIZE = 2;

/**
 *
 **/
class CommonBank0 {
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
    // its your lucky day: all that API just to get this optimization!
    return bus.read(registerA, WORD_SIZE);
  }

  static writePort(bus, register, value) {
    return bus.write(register, value);
  }
}

module.exports = { CommonBank0, WORD_SIZE };