
const { BusUtil, BitUtil } = require('@johntalton/and-other-delights');

const Bank = require('../defines.js')
const { ModeSelection } = require('./modeselection.js');

const { REGISTERS, REGISTERS_BANK0, REGISTERS_BANK1 } = require('./registers.js');

const { Common8bitPoll } = require ('./common8bitpoll.js')
const { Common16bitPoll } = require ('./common16bitpoll.js')
const { CommonInterlacedBlock } = require ('./commoninterlacedblock.js')
const { CommonDualBlocks } = require ('./commondualblocks.js')

// theses follow similarly to the ones defined
// in the converter, but should not be confused.
// can also be called common modes. as they are the
//  terms in which the `Common` defines the word mode
// ofocurse they provide similar functionality here.
const MODE_MAP_8BIT_POLL = { bank: Bank.BANK1, sequential: false };
const MODE_MAP_16BIT_POLL = { bank: Bank.BANK0, sequential: false };
const MODE_MAP_DUAL_BLOCKS = { bank: Bank.BANK1, sequential: true };
const MODE_MAP_INTERLACED_BLOCK = { bank: Bank.BANK0, sequential: true };

// mode defiend by chip as reset mode (exported bellow)
const MODE_MAP_DEFAULT = MODE_MAP_INTERLACED_BLOCK;

/**
 * Duck type class for common interface, to support modeSelection class.
 **/
class CommonReject {
  static status() { return Promise.reject(Error('common reject status')); }
  static exportAll() { return Promise.reject(Error('common reject exportAll')); }
  static readPort() { return Promise.reject(Error('common reject readPort')); }
  static readAB() { return Promise.reject(Error('common reject readAB')); }
}

/**
 *
 **/
class Common {
  // cheat method that sidesteps itself directly writing reset
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

  // cheat method that sidesteps itself by bit manipulation
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
    function guessIocon(i) {
      const bank = i >> 7;
      const sequential = ((i & 0x20) >> 5) === 0;
      //console.log('guessing from iocon 0x' + i.toString(16), bank, sequential);
      return { bank, sequential };
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

        // given this: it is posible to rule out some mode (bank / sequential) configuratoins

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

        if(h === 0) {} // not helpfull (low confidence / initial state though)
        if(run[0] === 0xFF && run[1] === 0x00 && run[2] == 0x00 && run[3] === 0x00) {
          // initial state bank 1
        }
        if(run[0] === 0xFF && run[1] === 0xFF && run[2] == 0x00 && run[3] === 0x00) {
          // initial state bank 0
        }

        // must pass to be one of these
        // we do this first as bellow we assume that
        //  when testing (h and l) the tie is already broke
        //  by all equal
        if(allIocon(h, i, j)) { mib += 5000; }
        if(allIocon(l, n)) { mdb += 5000; }
        if(allIocon(h, i, j, k)) { m16p += 5000; }
        if(allIocon(l, m, n, o)) { m8p += 5000; }

        // if all posible iocon banks are low, then, not bank1
        if(hHz && lHz) { mdb -= Infinity; m8p -= Infinity; }
        // etc, not bank0
        if(!hHz && !lHz) { mib -= Infinity; m16p -= Infinity; }

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

        // undef all currently return 0, so thats a good indicator
        if(o === 0) { mib += 10; }
        if(i === 0 && j === 0 && k === 0) { mdb += 10; }
        if(j === 0 && k === 0) { m8p += 10; }
        if(true) { m16p += 10; } // to be fair


        //
        if(m8p === -Infinity && mdb === -Infinity) {
          // bank 0
          const guess = guessIocon(h);
          console.log('struck gold (fools) BANK 0, h is iocon 0x' + h.toString(16), guess);
          return guess;
        }
        else if(m16p === -Infinity && mib === -Infinity) {
          // bank 1
          const guess = guessIocon(l);
          console.log('struck gold (fools) BANK 1, l is iocon 0x' + l.toString(16), guess);
          return guess;
        }

        //
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

  // cheat method that sidesteps itself by direct lookup and read
  static profile(bus, mode) {
    console.log('profile', mode);
    // we skip the modeSelection here for simplicity
    return bus.read(REGISTERS[mode.bank].IOCON)
      .then(buf => buf.readUInt8(0));
  }

  // cheat method that sidesteps itself by direct lookup and write
  static setProfile(bus, mode, iocon) {
    console.log('setProfile', mode, iocon.toString(2));
    // we skipt the modeSelection here form simplicity
    return bus.write(REGISTERS[mode.bank].IOCON, iocon);
  }

  // helper to read and name memmapped buffer
  static statusMemmapToNamedBytes(buf, mode) {
    const iocon = buf.readUInt8(REGISTERS[mode.bank].IOCON)
    const ioconAlt = buf.readUInt8(REGISTERS[mode.bank].IOCON_ALT)
    if(iocon !== ioconAlt) { throw Error('iocon missmatch: ' + iocon.toString(16) + ' != ' + ioconAlt.toString(16)); }

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
  }

  // retrived the sate (ios and profile) in one go
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

        return Common.statusMemmapToNamedBytes(buf, mode);
        // todo also test profile against bank/seq used to read to validate
    });
  }

  // set the 
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

  // read single register
  static readPort(bus, mode, register) {
    return ModeSelection.form(mode.bank, mode.sequential)
      .on(MODE_MAP_8BIT_POLL, Common8bitPoll)
      .on(MODE_MAP_16BIT_POLL, Common16bitPoll)
      .on(MODE_MAP_DUAL_BLOCKS, CommonDualBlocks)
      .on(MODE_MAP_INTERLACED_BLOCK, CommonInterlacedBlock)
      .catch(CommonReject)
      .readPort(bus, register)
      .then(buf => buf.readUInt8(0));
  }

  // read dual register (16bit mode if possible)
  static readAB(bus, mode, registerA, registerB) {
    return ModeSelection.form(mode.bank, mode.sequential)
      .on(MODE_MAP_8BIT_POLL, Common8bitPoll)
      .on(MODE_MAP_16BIT_POLL, Common16bitPoll)
      .on(MODE_MAP_DUAL_BLOCKS, CommonDualBlocks)
      .on(MODE_MAP_INTERLACED_BLOCK, CommonInterlacedBlock)
      .catch(CommonReject)
      .readAB(bus, registerA, registerB)
      .then(buf = ({
        A: buf.readUInt8(0),
        B: buf.readUInt8(1)
      }));
  }

  // read (alias methods for register names)
  static readIntfA(bus, mode) { return Common.readPort(bus, mode, REGISTERS[mode.bank].INTFA); }
  readIntfB() { return Common.readPort(bus, mode, REGISTERS[mode.bank].INTFB); }
  readIntfAB() { return Common.readAB(bus, mode, REGISTERS[mode.bank].INTFA, REGISTERS[mode.bank].INTFB); }

  readGpioA() { return Common.readPort(bus, mode, REGISTERS[mode.bank].GPIOA); }
  readGpioB() { return Common.readPort(bus, mode, REGISTERS[mode.bank].GPIOB); }
  readGpioAB() { return Common.readAB(bus, mode, REGISTERS[mode.bank].GPIOA, REGISTERS[mode.bank].GPIOB); }

  readIntcapA() { return Common.readPort(bus, mode, REGISTERS[mode.bank].INTCAPA); }
  readIntcapB() { return Common.readPort(bus, mode, REGISTERS[mode.bank].INTCAPB); }
  readIntcapAB() { return Common.readAB(bus, mode, REGISTERS[mode.bank].INTCAPA, REGISTERS[mode.bank].INTCAPB); }

  readOlatA() { return Common.readPort(bus, mode, REGISTERS[mode.bank].OLATA); }
  readOlabB() { return Common.readPort(bus, mode, REGISTERS[mode.bank].OLATB); }
  readOlabAB() { return Common.readAB(bus, mode, REGISTERS[mode.bank].OLATA, REGISTERS[mode.bank].OLATB); }

  // write (alias methods for register names)
  writeGpioA() { }
  writeGpioB() { }
  writeGpioAB() { }

  writeOlatA() { }
  writeOlatB() { }
  writeOlatAB() { }
}

Common.MODE_MAP_DEFAULT = MODE_MAP_DEFAULT;

module.exports = { Common };
