/* eslint-disable no-bitwise */

const { BusUtil } = require('@johntalton/and-other-delights');
const { Bank, CommonMode } = require('../defines.js');
const { REGISTERS, REGISTERS_BANK0, REGISTERS_BANK1 } = require('./registers.js');

/**
 * A more direct access to this chip that by-passes the Mode Selection
 *  this allows for some simplicity.
 * Most notably `profile` get/set are here as well as `sniffMode`
 *
 * Used as the base class for Common itself to isolate the direct access
 *   code used here from Commons more common usage pattern
 **/
class CommonDirect {
  // cheat method that sidesteps itself directly writing reset
  static softwareReset(bus) {
    console.log(' ** attempting software reset (zero bytes) ** ');
    return Promise.all((new Array(30).fill(0))
      .map((_, index) => bus.write(index, Buffer.from([0])).catch(e => { console.log('reset err', index, e); })))
      .then(() => {
        const iocon = 0x08;
        return CommonDirect.setProfile(bus, CommonMode.MODE_MAP_DEFAULT, iocon);
      })
      .then(() => bus.write(0, [0xFF, 0xFF])); // iodirA
  }

  // cheat method that sidesteps itself by bit manipulation
  static sniffMode(bus, hint) {
    function lowZero(iocon) { return (iocon & 0x01) === 0; }
    function highZero(iocon) { return ((iocon >> 7) & 1) === 0; }
    function allIocon(iocons) {
      const first = iocons[0];
      if(!lowZero(first)) { return false; }
      return iocons.every(iocon => first === iocon, true);
    }
    // creates a common mode from iocon register
    function guessIocon(i) {
      const bank = (i >> 7) === 1 ? Bank.BANK1 : Bank.BANK0;
      const sequential = ((i & 0x20) >> 5) === 0;
      // console.log('guessing from iocon 0x' + i.toString(16), bank, sequential);
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

        const h = sniffed.readUInt8(0);
        const i = sniffed.readUInt8(1);
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
        // interlaced   0/t: [iocon iocona] [iocona gppuA] [gpintenB defvalA]  [olatB undef]
        // dual blocks  1/t: [olatA undef]  [undef undef]  [iocon gppuA]       [iocona gppuB]
        // 16bit        0/f: [iocon iocona] [iocona iocon] [gpintenB gpintenA] [olatB olatA]
        // 8bit         1/f: [olatA olatA]  [undef undef]  [iocon iocon]       [iocona iocona]

        // run 00...
        //
        // interlaced: iodirA iodirB polA polB
        // dual block: iodirA polA gpintenA defvalA
        // 16bit     : iodirA iodirB iodirA iodirB
        // 8bit      : iodirA iodirA iodirA iodirA

        // given this: it is possible to rule out some mode (bank / sequential) configurations

        const hi = h === i;
        // const jk = j === k;
        // const lm = l === m;
        // const no = n === o;

        // const hj = h === j;
        const ln = l === n;

        const hLz = lowZero(h);
        const lLz = lowZero(l);

        const hHz = highZero(h);
        const lHz = highZero(l);

        const hG = guessIocon(h);
        const lG = guessIocon(l);

        let mib = 0;
        let mdb = 0;
        let m16p = 0;
        let m8p = 0;

        // if not all in run equal, then not 8bit
        if(run[0] !== run[1] || run[0] !== run[2] || run[0] !== run[3]) {
          m8p -= Infinity;
        }
        // if first and third not equal, then not 16bit
        if(run[0] !== run[2]) {
          m16p -= Infinity;
        }

        // must pass to be one of these
        // we do this first as bellow we assume that
        //  when testing (h and l) the tie is already broke
        //  by all equal
        if(!allIocon([h, i, j])) { mib -= Infinity; }
        if(!allIocon([l, n])) { mdb -= Infinity; }
        if(!allIocon([h, i, j, k])) { m16p -= Infinity; }
        if(!allIocon([l, m, n, o])) { m8p -= Infinity; }

        // if all possible iocon banks are low, then, not bank1
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
        if(!ln) { mdb -= Infinity; m8p -= Infinity; }

        // if 8bit, hi must match (read olat twice)
        if(!hi) { m8p -= Infinity; }

        // the guess must match the iocon setting
        if(!CommonMode.match(hG, CommonMode.MODE_MAP_INTERLACED_BLOCK)) { mib -= Infinity; }
        if(!CommonMode.match(lG, CommonMode.MODE_MAP_DUAL_BLOCKS)) { mdb -= Infinity; }
        if(!CommonMode.match(hG, CommonMode.MODE_MAP_16BIT_POLL)) { m16p -= Infinity; }
        if(!CommonMode.match(lG, CommonMode.MODE_MAP_8BIT_POLL)) { m8p -= Infinity; }

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

        // undef all currently return 0, so that is a good indicator
        if(o === 0) { mib += 1000; }
        if(i === 0 && j === 0 && k === 0) { mdb += 1000; }
        if(j === 0 && k === 0) { m8p += 1000; }
        if(true) { m16p += 1000; } // to be fair

        // hint
        if(hint !== undefined) {
          if(CommonMode.match(hG, hint)) { mib += 1; m16p += 1; }
          if(CommonMode.match(lG, hint)) { mdb += 1; m8p += 1; }
        }

        //
        console.log(mib, mdb, m16p, m8p);
        const guess = [
          [mib, CommonMode.MODE_MAP_INTERLACED_BLOCK],
          [mdb, CommonMode.MODE_MAP_DUAL_BLOCKS],
          [m16p, CommonMode.MODE_MAP_16BIT_POLL],
          [m8p, CommonMode.MODE_MAP_8BIT_POLL]]
          .reduce((max, item) => (item[0] > max[0] ? item : max), [-Infinity, undefined])[1];

        if(guess === undefined) { throw Error('undefined guess'); }
        console.log('sniff', guess);
        return guess;
      })
      .catch(e => {
        console.log('error sniffing', e);
        return CommonMode.MODE_MAP_DEFAULT;
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
    // we skip the modeSelection here for simplicity
    return bus.write(REGISTERS[mode.bank].IOCON, iocon);
  }
}

module.exports = { CommonDirect };
