
const { BusUtil, BitUtil } = require('and-other-delights');

const Bank = require('../defines.js')
const { ModeSelection } = require('./modeselection.js');

const { REGISTERS, REGISTERS_BANK0, REGISTERS_BANK1 } = require('./registers.js');

const { Common8bitPoll } = require ('./common8bitpoll.js')
const { Common16bitPoll } = require ('./common16bitpoll.js')
const { CommonInterlacedBlock } = require ('./commoninterlacedblock.js')
const { CommonDualBlocks } = require ('./commondualblocks.js')

const BASE_10 = 10;

// theses follow similarly to the ones defined
// in the converter, but should not be confused
// ofocurse they provide similar functionality here.
const MODE_MAP_8BIT_POLL = { bank: Bank.BANK1, sequential: false };
const MODE_MAP_16BIT_POLL = { bank: Bank.BANK0, sequential: false };
const MODE_MAP_DUAL_BLOCKS = { bank: Bank.BANK1, sequential: true };
const MODE_MAP_INTERLACED_BLOCK = { bank: Bank.BANK0, sequential: true };

const MODE_MAP_DEFAULT = MODE_MAP_INTERLACED_BLOCK;


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



/**
 *
 **/
class CommonReject {
  static status() { return Promise.reject(Error('common reject status')); }
  static exportAll() { return Promise.reject(Error('common reject exportAll')); }
}

/**
 *
 **/
class Common {
  static softwareReset(bus) {
    console.log(' ** attempting software reset (zero bytes) ** ');
    return Promise.all((new Array(30).fill(0))
      .map((_, index) => {
        return bus.write(index, Buffer.from([0])).catch(e => { console.log('reset err', index, e); })
      }))
      .then(() => {
        const iocon = 0x08;
        return Common.setProfile(bus, MODE_MAP_DEFAULT, iocon);
      })
      .then(() => bus.write(0, [0xFF, 0xFF])) // iodirA
  }

  static sniffMode(bus) {
    function lowZero(iocon) { return (iocon & 0x01) === 0; }
    function highZero(iocon) { return (iocon >> 7 & 1) === 0; }
    function allIocon(...iocons) {
      const first = iocons[0];
      if(!lowZero(first)) { return false; }
      return iocons.every(iocon => {
        return first === iocon;
      }, true);
    }

    const block = [
      [REGISTERS_BANK0.IOCON, 2],
      [REGISTERS_BANK0.IOCON_ALT, 2],
      [REGISTERS_BANK1.IOCON, 2],
      [REGISTERS_BANK1.IOCON_ALT, 2],
      [REGISTERS_BANK0.IODIRA, 4]
    ];

    return BusUtil.readblock(bus, block)
      .then(sniffed => {
        console.log('sniffed raw', sniffed);

        const h = sniffed.readUInt8(0)
        const i = sniffed.readUInt8(1)
        const j = sniffed.readUInt8(2);
        const k = sniffed.readUInt8(3);
        const l = sniffed.readUInt8(4);
        const m = sniffed.readUInt8(5);
        const n = sniffed.readUInt8(6);
        const o = sniffed.readUInt8(7);
        const run = [
          sniffed.readUInt8(8),
          sniffed.readUInt8(9),
          sniffed.readUInt8(10),
          sniffed.readUInt8(11)
        ];

        console.log(h, i, j, k, l, m, n, o, run);

        // 0A.. 0B.. 05.. 15..
        //                   h i            j k            l m                 n o
        // interlaced   0/t: [iocon iocona] [iocona gppuA] [gpiniteB defvalA]  [olatB undef]
        // dual blocks  1/t: [olatA undef]  [undef undef]  [iocon gppuA]       [iocona gppuB]
        // 16bit        0/f: [iocon iocona] [iocona iocon] [gpiniteB gpintenA] [olatB olatA]
        // 8bit         1/f: [olatA olatA]  [undef undef]  [iocon iocon]       [iocona iocona]

        const hi = h === i;
        const jk = j === k;
        const lm = l === m;
        const no = n === o;

        const hj = h === j
        const ln = l === n;

        const hl = h === l;

        const hLz = lowZero(h);
        const lLz = lowZero(l);

        const hHz = highZero(h);
        const lHz = highZero(l);

        let mib = 0;
        let mdb = 0;
        let m16p = 0;
        let m8p = 0;

        if(h === 0) {}

        // if all posible iocon banks are low, then, not bank1
        if(hHz && lHz) { mdb -= Infinity; m8p -= Infinity; }
        // etc, not bank0
        if(!hHz && !lHz) { mib -= Infinity; m16 -= Infinity; }

        // if h high reserved low bit, cannot be iocon for bank0
        if(!hLz) { mib -= Infinity; m16p -= Infinity; }
        // etc, for bank1
        if(!lLz) { mdb -= Infinity; m8p -= Infinity; }

        // iocon not match ioconAlt, can not be bank0
        if(!hi) { mib -= Infinity; m16p -= Infinity; }
        // etc, bank1
        if(!ln) { mdb -= Infinity; m8bp -= Infinity; }

        // if 8bit, hi must match
        if(!hi) { m8p -= Infinity; }

        // must pass to be one of these
        if(allIocon(h, i, j)) { mib += 5000; }
        if(allIocon(l, n)) { mdb += 5000; }
        if(allIocon(h, i, j, k)) { m16p += 5000; }
        if(allIocon(l, m, n, o)) { m8p += 5000; }

        // undef all currently return 0, so thats a good indicator
        if(o === 0) { mib += 10; }
        if(i === 0 && j === 0 && k === 0) { mdb += 10; }
        if(j === 0 && k === 0) { m8p += 10; }

/*
        // good signals but can be wrong
        // mib
        if(!lz) { mib += 1; }
        if(!hl) { mib += 1; }
        if(!jk) { mib += 1; }
        if(!ln) { mib += 1; }
        if(o === 0) { mib += 2; }
        // mdb
        if(!hz) { mdb += 1; }
        if(!hi) { mdb += 1; }
        if(!lm) { mdb += 1; }
        if(!no) { mdb += 1; }
        if(!hl) { mdb += 1; }
        if(jk && j === 0) { mdb += 2; }
        // m16p
        if(!lz) { m16p += 1; }
        if(!hl) { m16p += 1; }
        if(!lm) { m16p += 1; }
        if(!no) { m16p += 1; }
        if(!ln) { m16p += 1; }
        // m8p
        if(!hz) { m8p += 1 };
        if(!hl) { m8p += 1; }
        if(jk && j === 0) { m8p += 2 }

        // some strikes against
        // mib
        if(jk) { mib -= 2; }
        if(lm) { mib -= 2; }
        if(no) { mib -= 2; }
        // mdb
        if(hi) { mdb -= 2; }
        if(lm) { mdb -= 2; }
        if(no) { mdb -= 2; }
        // m16p
        if(lm) { m16p -= 3; }
        if(no) { m16p -= 3; }
*/



        console.log(mib, mdb, m16p, m8p);
        const guess = [[mib, MODE_MAP_INTERLACED_BLOCK],
         [mdb, MODE_MAP_DUAL_BLOCKS],
         [m16p, MODE_MAP_16BIT_POLL],
         [m8p, MODE_MAP_8BIT_POLL]]
          .reduce((max, item) => (item[0] > max[0] ? item : max), [-Infinity, undefined])[1];

        if(guess === undefined) { throw Error('undefined guess'); }
        console.log('sniff', guess);
        return guess;
      })
      .catch(e => {
        console.log('error sniffing', e);
        return MODE_MAP_DEFAULT;
      });
  }

  static profile(bus, mode) {
    console.log('profile', mode);
    return bus.read(REGISTERS[mode.bank].IOCON)
      .then(buf => buf.readUInt8(0));
  }

  static setProfile(bus, mode, iocon) {
    console.log('setProfile', mode, iocon.toString(2));
    return bus.write(REGISTERS[mode.bank].IOCON, iocon);
  }

  static state(bus, mode) {
    return ModeSelection.from(mode.bank, mode.sequential)
      .on(MODE_MAP_8BIT_POLL, Common8bitPoll)
      .on(MODE_MAP_16BIT_POLL, Common16bitPoll)
      .on(MODE_MAP_DUAL_BLOCKS, CommonDualBlocks)
      .on(MODE_MAP_INTERLACED_BLOCK, CommonInterlacedBlock)
      .catch(CommonReject)
      .state(bus).then(buf => {
        console.log('state read from bank', mode.bank);
        console.log(buf);

        const iocon = buf.readUInt8(REGISTERS[mode.bank].IOCON)
        const ioconAlt = buf.readUInt8(REGISTERS[mode.bank].IOCON_ALT)
        if(iocon !== ioconAlt) { throw Error('iocon missmatch: ' + iocon.toString(16) + ' != ' + ioconAlt.toString(16)); }
        // todo also test profile against bank/seq used to read to validate

        const a = {
          iodir: buf.readUInt8(REGISTERS[mode.bank].IODIRA),
          iopol: buf.readUInt8(REGISTERS[mode.bank].IPOLA),
          gpinten: buf.readUInt8(REGISTERS[mode.bank].GPINTENA),
          defval: buf.readUInt8(REGISTERS[mode.bank].DEFVALA),
          intcon: buf.readUInt8(REGISTERS[mode.bank].INTCONA),
          gppu: buf.readUInt8(REGISTERS[mode.bank].GPPUA),
          intf: buf.readUInt8(REGISTERS[mode.bank].INTFA),
          olat: buf.readUInt8(REGISTERS[mode.bank].OLATA)
        };

        const b = {
          iodir: buf.readUInt8(REGISTERS[mode.bank].IODIRB),
          iopol: buf.readUInt8(REGISTERS[mode.bank].IPOLB),
          gpinten: buf.readUInt8(REGISTERS[mode.bank].GPINTENB),
          defval: buf.readUInt8(REGISTERS[mode.bank].DEFVALB),
          intcon: buf.readUInt8(REGISTERS[mode.bank].INTCONB),
          gppu: buf.readUInt8(REGISTERS[mode.bank].GPPUB),
          intf: buf.readUInt8(REGISTERS[mode.bank].INTFB),
          olat: buf.readUInt8(REGISTERS[mode.bank].OLATB)
        };

        // console.log(iocon, a, b)
        return {
          iocon: iocon,
          a: a, b: b
        };
    });
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

Common.MODE_MAP_DEFAULT = MODE_MAP_DEFAULT;

module.exports = { Common };
