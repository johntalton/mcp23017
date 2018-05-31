
const { BusUtil, BitUtil } = require('@johntalton/and-other-delights');

const PIN_STATE_SIZE = 8;

const PIN_STATE_16BIT_POLL_READ = [
  [0x00, 2], [0x02, 2], [0x04, 2], [0x06, 2],
  [0x08, 2], [0x0A, 2], [0x0C, 2], [0x0E, 2], [0x14, 2]
];

const PIN_STATE_16BIT_POLL_WRITE = [
  [0x00, 2], [0x02, 2], [0x04, 2], [0x06, 2],
  [0x08, 2], [0x0A, 2], [0x0C, 2], [0x0E, 2], [0x14, 2]
];

class Common16bitPoll {
  static state(bus) {
    return BusUtil.readblock(bus, PIN_STATE_16BIT_POLL_READ)
      .then(buffer => {
        if(buffer.length !== 18) { throw Error('buffer length strange: ' + buffer.length); }
        return Buffer.concat([
          Buffer.from(buffer.buffer, 0, PIN_STATE_SIZE),
          Buffer.from(new Array(4).fill(0)),
          Buffer.from(buffer.buffer, PIN_STATE_SIZE)
        ]);
      });
  }
}

module.exports = { Common16bitPoll };
