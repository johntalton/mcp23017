const { BusUtil } = require('@johntalton/and-other-delights');

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
    // console.log('reading from register 0x' + register.toString(16));
    return bus.read(register);
  }

  static readAB(bus, registerA, registerB) {
    return Promise.all([
      bus.read(registerA),
      bus.read(registerB)
    ]);
  }

  static writePort(bus, register, value) {
    // console.log('writing to register 0x' + register.toString(16), value);
    return bus.write(register, value);
  }
}

module.exports = { CommonBank1 };
