
const { BusUtil, BitUtil } = require('and-other-delights');

const Bank = require('./defines.js')
const { ModeSelection } = require('./modeselection.js');

const BASE_10 = 10;

// theses follow similarly to the ones defined
// in the converter, but should not be confused
// ofocurse they provide similar functionality here.
const MODE_MAP_8BIT_POLL = { bank: Bank.BANK1, sequential: true };
const MODE_MAP_16BIT_POLL = { bank: Bank.BANK0, sequential: true };
const MODE_MAP_DUAL_BLOCKS = { bank: Bank.BANK1, sequential: false };
const MODE_MAP_INTERLACED_BLOCK = { bank: Bank.BANK0, sequential: false };

// ddata sheet defined register layout for bank0 and bank1
const REGISTERS = [{
  // bank 0 layout
  IODIRA: 0x00,
  IODIRB: 0x01,
  IPOLA: 0x02,
  IPOLB: 0x03,
  GPINTENA: 0x04,
  GPINTENB: 0x05,
  DEFVALA: 0x06,
  DEFVALB: 0x07,
  INTCONA: 0x08,
  INTCONB: 0x09,
  IOCON: 0x0A,
  IOCON_ALT: 0x0B,
  GPPUA: 0x0C,
  GPPUB: 0x0D,
  INTFA: 0x0E,
  INTFB: 0x0F,
  INTCAPA: 0x10,
  INTCAPB: 0x11,
  GPIOA: 0x12,
  GPIOB: 0x13,
  OLATA: 0x14,
  OLATB: 0x15
},
{ // bank 1 layout
  IODIRA: 0x00,
  IPOLA: 0x01,
  GPINTENA: 0x02,
  DEFVALA: 0x03,
  INTCONA: 0x04,
  IOCON: 0x05,
  GPPUA: 0x06,
  INTFA: 0x07,
  INTCAPA: 0x08,
  GPIOA: 0x09,
  OLATA: 0x0A,

  IODIRB: 0x10,
  IPOLB: 0x11,
  GPINTENB: 0x12,
  DEFVALB: 0x13,
  INTCONB: 0x14,
  IOCON_ALT: 0x15,
  GPPUB: 0x16,
  INTFB: 0x17,
  INTCAPB: 0x18,
  GPIOB: 0x19,
  OLATB: 0x1A
}];


// only read non-data bytes (aka, do not cause interupt reset)
// note, we also exclude OLAT // todo include OLAT
// todo these hardcodes should alias to above REGISTER[bank].XX values
const PIN_STATE_SIZE = 8;
const PIN_STATE_SEQ_BLOCKS = [
  [[0x00, PIN_STATE_SIZE + PIN_STATE_SIZE], [0x14, 2]], // bank 0 layout (interlaced)
  [[0x00, PIN_STATE_SIZE], 0x0A, [0x10, PIN_STATE_SIZE], 0x1A] // bank 1 layout (split)
  // ... above could also be writen [0x0A, PIN_STAET_SIZE + 1] to save *a* command packet
];
const PIN_STATE_BYTE_BLOCKS = [
  [[0x00, 2], [0x02, 2], [0x04, 2], [0x06, 2],
   [0x08, 2], [0x0A, 2], [0x0C, 2], [0x0E, 2], [0x14, 2]], // bank 0 (wobleAB)
  [0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x0A,
   0x10,0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x1A] // bank 1 (split)
];

// write without olat or profile
// read just gpio
//S
//B

// write with profile but not olat? odd
//SwithIocon
//BwithIocon

// write full state
//SwithOlat
//BwithOlat

// good for bulk read all
//SwithIoconOlat
//BwithIoconOlat

const PIN_STATE_8BIT_POLL_READ = [
  0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x0A,
  0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x1A
];

const PIN_STATE_8BIT_POLL_WRITE = [
  0x00, 0x01, 0x02, 0x03, 0x04,  0x06, 0x07,
  0x10, 0x11, 0x12, 0x13, 0x14,  0x16, 0x17
];

class CommonReject {
  static state() { return Promise.reject(Error('common reject')); }
  static exportAll() { return Promise.reject(Error('common reject')); }
}

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

const PIN_STATE_16BIT_POLL_READ = [
  [0x00, 2], [0x02, 2], [0x04, 2], [0x06, 2],
  [0x08, 2], [0x0A, 2], [0x0C, 2], [0x0E, 2], [0x14, 2]
];

const PIN_STATE_16BIT_POLL_WRITE = [
  [0x00, 2], [0x02, 2], [0x04, 2], [0x06, 2],
  [0x08, 2], [0x0A, 2], [0x0C, 2], [0x0E, 2], [0x14, 2]
];

class Common16bitPoll extends CommonReject{
  static state(bus) {
    return BusUtil.readblock(bus, PIN_STATE_16BIT_POLL_READ)
      .then(buffer => {
        if(buffer.length !== 18) { throw Error('buffer length strange: ' + buffer.length); }
        return Buffer.concat([
          buffer.slice(0, -2),
          Buffer.from(new Array(4).fill(0)),
          buffer.slice(-2)
        ]);
      });
  }
}

class CommonDualBlocks {
  static state() { return Promise.reject('dualblock'); }
}

class CommonInterlacedBlock {
  static state() { return Promise.reject('interlaced'); }
}


/**
 *
 **/
class Common {
  static softwareReset(bus) {
    console.log(' ** attempting software reset (zero bytes) ** ');
    return Promise.all((new Array(30).fill(0)).map((_, index) => bus.write(index, Buffer.from([0])).catch(e => console.log('reset err', index, e))));
  }

  static sniffBank(bus) {
    function lowZero(iocon) { return (iocon & 0x01) === 0; }
    function bankFrom(iocon) { return iocon >> 7 & 1; }
    function maybe(iocon, ioconAlt, bank) {
      //console.log('maybe', iocon, ioconAlt, bank);
      if(iocon === undefined) { return false; }
      if(ioconAlt === undefined) { return false; }
      if(!lowZero(iocon)) { return false; }
      if(!lowZero(ioconAlt)) { return false; }
      if(iocon !== ioconAlt) { return false; }
      return bankFrom(iocon) === bank;
    }
    function guess(zero, one) {
      if(zero && one) { return undefined; } // todo should be guess bank0
      if(zero && !one) { return Bank.BANK0; }
      if(!zero && one) { return Bank.BANK1; }
      return undefined;
    }

    const block = [
      REGISTERS[Bank.BANK0].IOCON,
      REGISTERS[Bank.BANK0].IOCON_ALT,
      REGISTERS[Bank.BANK1].IOCON,
      REGISTERS[Bank.BANK1].IOCON_ALT
    ];

    return BusUtil.readblock(bus, block)
      .then(sniffed => {
        // console.log('sniffed raw', sniffed);
        // 0A.. 0B.. 05.. 15..
        // if actaull bank0: iocon iocona gpiniteB olatB
        // if actaull bank1: olatA undef iocon iocona
        const [b0, b0a, b1, b1a] = sniffed;
        if(b1 === undefined) {
          console.log(' --- expected --- b1 undef (invalid register), bank0 maybe');
        }

        if(b0 === undefined) { console.log('likely error b0');}
        if(b1 === undefined) { console.log('likely error b1'); }
        if(b1a === undefined) { console.log('likely error b1a'); }

        const z = maybe(b0, b0a, Bank.BANK0);
        const o = maybe(b1, b1a, Bank.BANK1);
        const g = guess(z, o);
        return {
          zero: z,
          one: o,
          guess: g,
          sequential: undefined // todo sniff this
        };
      })
      .catch(e => {
        console.log('error sniffing', e);
        return { zero: false, one: false, guess: Bank.BANK0 };
      });
  }

  static profile(bus, bank) {
    return bus.read(REGISTERS[bank].IOCON)
      .then(buf => buf.readUInt8(0));
  }

  static setProfile(bus, bank, iocon) {
    //console.log('setProfile', iocon.toString(2));
    return bus.write(REGISTERS[bank].IOCON, iocon);
  }

  static state(bus, bank, sequential) {
    return ModeSelection.from(bank, sequential)
      .on(MODE_MAP_8BIT_POLL, Common8bitPoll)
      .on(MODE_MAP_16BIT_POLL, Common16bitPoll)
      .on(MODE_MAP_DUAL_BLOCKS, CommonDualBlocks)
      .on(MODE_MAP_INTERLACED_BLOCK, CommonInterlacedBlock)
      .catch({ state: () => Promise.reject(Error('unknown mode: ' + bank + ' / ' +sequential)) })
      .state(bus).then(buf => {
        console.log('state read from bank', bank);
        console.log(buf);

        const iocon = buf.readUInt8(REGISTERS[bank].IOCON)
        const ioconAlt = buf.readUInt8(REGISTERS[bank].IOCON_ALT)
        if(iocon !== ioconAlt) { throw Error('iocon missmatch: ' + iocon.toString(16) + ' != ' + ioconAlt.toString(16)); }
        // todo also test profile against bank/seq used to read to validate

        const a = {
          iodir: buf.readUInt8(REGISTERS[bank].IODIRA),
          iopol: buf.readUInt8(REGISTERS[bank].IPOLA),
          gpinten: buf.readUInt8(REGISTERS[bank].GPINTENA),
          defval: buf.readUInt8(REGISTERS[bank].DEFVALA),
          intcon: buf.readUInt8(REGISTERS[bank].INTCONA),
          gppu: buf.readUInt8(REGISTERS[bank].GPPUA),
          intf: buf.readUInt8(REGISTERS[bank].INTFA),
          olat: buf.readUInt8(REGISTERS[bank].OLATA)
        };

        const b = {
          iodir: buf.readUInt8(REGISTERS[bank].IODIRB),
          iopol: buf.readUInt8(REGISTERS[bank].IPOLB),
          gpinten: buf.readUInt8(REGISTERS[bank].GPINTENB),
          defval: buf.readUInt8(REGISTERS[bank].DEFVALB),
          intcon: buf.readUInt8(REGISTERS[bank].INTCONB),
          gppu: buf.readUInt8(REGISTERS[bank].GPPUB),
          intf: buf.readUInt8(REGISTERS[bank].INTFB),
          olat: buf.readUInt8(REGISTERS[bank].OLATB)
        };

        // console.log(iocon, a, b)
        return {
          iocon: iocon,
          a: a, b: b
        };
    });
  }

  static stateOld(bus, bank, sequential) {
    // return the split read buffer to its memmapped
    // offset/size, such that we can use the same
    // register addresses to access each buffer
    function fixUp(buf) {
      if(bank === Bank.BANK0) { return Buffer.from(buf); }
      return Buffer.concat([
        buf.slice(0, PIN_STATE_SIZE),
        Buffer.from(new Array(8)), // +3 to get to 11 and skip +5 to next block
        buf.slice(PIN_STATE_SIZE)
      ]);
    }
    function fixUpWithOlat(buf) {
      if(buf.length !== 18) { throw Error('buffer length strange: ' + buf.length); }

      if(bank === Bank.BANK0) {
        return Buffer.concat([
          buf.slice(0, -2),
          Buffer.from(new Array(4).fill(0)),
          buf.slice(-2)
        ]);
      }

      return Buffer.concat([
        buf.slice(0, PIN_STATE_SIZE),
        Buffer.from(new Array(2).fill(0)),
        buf.slice(PIN_STATE_SIZE, PIN_STATE_SIZE + 1),
        Buffer.from(new Array(5).fill(0)),
        buf.slice(PIN_STATE_SIZE + 1, -1),
        Buffer.from(new Array(2).fill(0)),
        buf.slice(-1)
      ]);
    }

    const block = sequential ? PIN_STATE_SEQ_BLOCKS[bank] : PIN_STATE_BYTE_BLOCKS[bank];

    return BusUtil.readblock(bus, block)
      //.then(fixUp)
      .then(fixUpWithOlat)
      .then(buf => {
        console.log('state read from bank', bank);
        console.log(buf);

        const iocon = buf.readUInt8(REGISTERS[bank].IOCON)
        const ioconAlt = buf.readUInt8(REGISTERS[bank].IOCON_ALT)
        if(iocon !== ioconAlt) { throw Error('iocon missmatch: ' + iocon.toString(16) + ' != ' + ioconAlt.toString(16)); }
        // todo also test profile against bank/seq used to read to validate

        const a = {
          iodir: buf.readUInt8(REGISTERS[bank].IODIRA),
          iopol: buf.readUInt8(REGISTERS[bank].IPOLA),
          gpinten: buf.readUInt8(REGISTERS[bank].GPINTENA),
          defval: buf.readUInt8(REGISTERS[bank].DEFVALA),
          intcon: buf.readUInt8(REGISTERS[bank].INTCONA),
          gppu: buf.readUInt8(REGISTERS[bank].GPPUA),
          intf: buf.readUInt8(REGISTERS[bank].INTFA),
          olat: buf.readUInt8(REGISTERS[bank].OLATA)
        };

        const b = {
          iodir: buf.readUInt8(REGISTERS[bank].IODIRB),
          iopol: buf.readUInt8(REGISTERS[bank].IPOLB),
          gpinten: buf.readUInt8(REGISTERS[bank].GPINTENB),
          defval: buf.readUInt8(REGISTERS[bank].DEFVALB),
          intcon: buf.readUInt8(REGISTERS[bank].INTCONB),
          gppu: buf.readUInt8(REGISTERS[bank].GPPUB),
          intf: buf.readUInt8(REGISTERS[bank].INTFB),
          olat: buf.readUInt8(REGISTERS[bank].OLATB)
        };

        return {
          iocon: iocon,
          a: a, b: b
        };
      })
  }

  static exportAll(bus, bank, sequential, exports) {
    console.log('common exportall', exports);
    const a = exports.a;
    const b = exports.b;
    const profile = exports.profile !== undefined ? exports.profile : false;
    const withProfile = profile !== false;
    const withOlat = false; // todo

    // todo this creates our memory map, however we need to
    // explicityl call out it size and calcuations in some const some place
    // its also of note that while thie buffer should be the correct size
    // an overszied buffer works well also :P
    const buffer = bank === Bank.BANK0 ? Buffer.alloc(22, 0) : Buffer.alloc(27, 0);

    if(withProfile) {
      buffer.writeUInt8(iocon, REGISTER[bank].IOCON);
    }

    buffer.writeUInt8(a.iodir, REGISTERS[bank].IODIRA);
    buffer.writeUInt8(a.iopol, REGISTERS[bank].IPOLA);
    buffer.writeUInt8(a.gpinten, REGISTERS[bank].GPINTENA);
    buffer.writeUInt8(a.defval, REGISTERS[bank].DEFVALA);
    buffer.writeUInt8(a.intcon, REGISTERS[bank].INTCONA);
    buffer.writeUInt8(a.gppu, REGISTERS[bank].GPPUA);
    buffer.writeUInt8(a.olat, REGISTERS[bank].OLATA);

    buffer.writeUInt8(b.iodir, REGISTERS[bank].IODIRB);
    buffer.writeUInt8(b.iopol, REGISTERS[bank].IPOLB);
    buffer.writeUInt8(b.gpinten, REGISTERS[bank].GPINTENB);
    buffer.writeUInt8(b.defval, REGISTERS[bank].DEFVALB);
    buffer.writeUInt8(b.intcon, REGISTERS[bank].INTCONB);
    buffer.writeUInt8(b.gppu, REGISTERS[bank].GPPUB);
    buffer.writeUInt8(b.olat, REGISTERS[bank].OLATB);

    console.log('buffer', buffer);

    return ModeSelection.from(bank, sequential)
      .on(MODE_MAP_8BIT_POLL, Common8bitPoll)
      .on(MODE_MAP_16BIT_POLL, Common16bitPoll)
      .on(MODE_MAP_DUAL_BLOCKS, CommonDualBlocks)
      .on(MODE_MAP_INTERLACED_BLOCK, CommonInterlacedBlock)
      .catch(CommonReject)
      .exportAll(bus, buffer);
  }


  static readInterrupts() { } // return [pin, value]

  static read(controller, pin) {}
  static write(controller, pin, value) {}

  static readPort(controller, port) {}
  static writePort(controller, port, value) {}
  static wrtiePortLatch(controller, port, value) {}
}

module.exports = { Common };
