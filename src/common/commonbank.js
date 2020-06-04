const { BusUtil } = require('@johntalton/and-other-delights');

/**
 *
 **/
class CommonBank {
  static state(bus, block) {
    return BusUtil.readblock(bus, block)
      .then(buffer => BusUtil.fillmapBlock(block, buffer));
  }

  static exportAll(bus, block, buffer) {
    if(!Buffer.isBuffer(buffer)) { throw new Error('export is not a buffer'); }
    return BusUtil.writeblock(bus, block, buffer);
  }

  static readPort(bus, register) {
    return bus.read(register);
  }

  static writePort(bus, register, value) {
    return bus.write(register, value);
  }

  static bulkData(bus, block) {
    return BusUtil.readblock(bus, block)
      .then(buffer => BusUtil.fillmapBlock(block, buffer));
  }
}

module.exports = { CommonBank };
