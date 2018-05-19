
const { BusUtil, BitUtil } = require('and-other-delights');

const { Converter } = require('./converter.js');

const BASE_10 = 10;

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

/**
 *
 **/
class Common {
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
      if(zero && !one) { return Common.BANK0; }
      if(!zero && one) { return Common.BANK1; }
      return undefined;
    }

    return Promise.all([
      bus.read(REGISTERS[Common.BANK0].IOCON).catch(e => undefined),
      bus.read(REGISTERS[Common.BANK0].IOCON_ALT).catch(e => undefined),
      bus.read(REGISTERS[Common.BANK1].IOCON).catch(e => undefined),
      bus.read(REGISTERS[Common.BANK1].IOCON_ALT).catch(e => undefined)
    ])
      .then(results => results.map(r => Buffer.isBuffer(r) ? r.readUInt8(0) : r))
      .then(([b0, b0a, b1, b1a]) => {
        // if actaull bank0: iocon iocona gpiniteB olatB
        // if actaull bank1: olatA undef iocon iocona
        if(b1 === undefined) {
          console.log(' --- expected --- b1 undef (invalid register), bank0 maybe');
        }

        if(b0 === undefined) { console.log('likely error b0');}
        if(b1 === undefined) { console.log('likely error b1'); }
        if(b1a === undefined) { console.log('likely error b1a'); }

        const z = maybe(b0, b0a, Common.BANK0);
        const o = maybe(b1, b1a, Common.BANK1);
        const g = guess(z, o);
        return {
          zero: z,
          one: o,
          guess: g
        };
      })
      .catch(e => {
        console.log('error sniffing', e);
        return { zero: false, one: false, guess: Common.BANK0 };
      });
  }

  static profile(bus, bank) {
    return bus.read(REGISTERS[bank].IOCON)
      .then(buf => buf.readUInt8(0))
      .then(Converter.fromIocon);
  }

  static setProfile(bus, bank, profile) {
    const pb = (profile.bank !== undefined && profile.bank !== false) ? profile.bank : bank;
    const iocon = Converter.toIocon(profile, pb);

    console.log('setProfile', iocon.toString(2));

    //console.log(' --------------------');
    //if(bank === Common.BANK0 && profile.sequential) { console.log(' Sequential addressing / interlaced')}
    //if(bank === Common.BANK0 && !profile.sequential) { console.log(' Byte Mode (Wobble AB)'); }
    //if(bank === Common.BANK1 && profile.sequential) { console.log(' Sequential addressing / block'); }
    //if(bank === Common.BANK1 && !profile.sequential) { console.log(' Byte Mode'); }
    //console.log(' --------------------');

    return bus.write(REGISTERS[bank].IOCON, iocon)
      .then(() => pb);
  }

  static state(bus, bank, sequential) {
    // return the split read buffer to its memmapped
    // offset/size, such that we can use the same
    // register addresses to access each buffer
    function fixUp(buf) {
      if(bank === Common.BANK0) { return Buffer.from(buf); }
      return Buffer.concat([
        buf.slice(0, PIN_STATE_SIZE),
        Buffer.from(new Array(8)), // +3 to get to 11 and skip +5 to next block
        buf.slice(PIN_STATE_SIZE)
      ]);
    }
    function fixUpWithOlat(buf) {
      if(buf.length !== 18) { throw Error('buffer length strange: ' + buf.length); }

      if(bank === Common.BANK0) {
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

        const profile = Converter.fromIocon(iocon);
        if(profile.bank !== bank) {
          console.log('read profiles bank is not the bank used to read!');
        }


        const a = Converter.fromPortState({
          iodir: buf.readUInt8(REGISTERS[bank].IODIRA),
          iopol: buf.readUInt8(REGISTERS[bank].IPOLA),
          gpinten: buf.readUInt8(REGISTERS[bank].GPINTENA),
          defval: buf.readUInt8(REGISTERS[bank].DEFVALA),
          intcon: buf.readUInt8(REGISTERS[bank].INTCONA),
          gppu: buf.readUInt8(REGISTERS[bank].GPPUA),
          intf: buf.readUInt8(REGISTERS[bank].INTFA),
          olat: buf.readUInt8(REGISTERS[bank].OLATA)
        });

        const b = Converter.fromPortState({
          iodir: buf.readUInt8(REGISTERS[bank].IODIRB),
          iopol: buf.readUInt8(REGISTERS[bank].IPOLB),
          gpinten: buf.readUInt8(REGISTERS[bank].GPINTENB),
          defval: buf.readUInt8(REGISTERS[bank].DEFVALB),
          intcon: buf.readUInt8(REGISTERS[bank].INTCONB),
          gppu: buf.readUInt8(REGISTERS[bank].GPPUB),
          intf: buf.readUInt8(REGISTERS[bank].INTFB),
          olat: buf.readUInt8(REGISTERS[bank].OLATB)
        });

        return {
          profile: profile,
          a: a,
          b: b
        };
      })
  }

  static readInterrupts() { } // return [pin, value]

  static read(controller, pin) {}
  static write(controller, pin, value) {}

  static readPort(controller, port) {}
  static writePort(controller, port, value) {}
  static wrtiePortLatch(controller, port, value) {}
}

Common.BANK0 = Converter.BANK0;
Common.BANK1 = Converter.BANK1;

module.exports = { Common };
