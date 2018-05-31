
const { BusUtil, BitUtil } = require('@johntalton/and-other-delights');

const PIN_STATE_SIZE = 8;

const PIN_STATE_8BIT_POLL_READ = [
  0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x0A,
  0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x1A
];

const PIN_STATE_8BIT_POLL_WRITE = [
  0x00, 0x01, 0x02, 0x03, 0x04,  0x06, 0x07,
  0x10, 0x11, 0x12, 0x13, 0x14,  0x16, 0x17
];

class Common8bitPoll {
  static state(bus) {
    return BusUtil.readblock(bus, PIN_STATE_8BIT_POLL_READ)
      .then(buffer => {
        if(buffer.length !== 18) { throw Error('buffer length strange: ' + buffer.length); }
        console.log('common8bit buffer', buffer);

        return Buffer.concat([
          buffer.slice(0, PIN_STATE_SIZE),
          Buffer.from(new Array(2).fill(0)),
          buffer.slice(PIN_STATE_SIZE, PIN_STATE_SIZE + 1),
          Buffer.from(new Array(5).fill(0)),
          buffer.slice(PIN_STATE_SIZE + 1, -1),
          Buffer.from(new Array(2).fill(0)),
          buffer.slice(-1)
        ]);
      });
  }

  static exports() {}

  static exportAll(bus, buffer) {
    if(!Buffer.isBuffer(buffer)) { throw Error('export is not a buffer'); }
    return BusUtil.writeblock(bus, PIN_STATE_8BIT_POLL_WRITE, buffer);
  }
}

module.exports = { Common8bitPoll };
