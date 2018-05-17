
const { BusUtil, BitUtil } = require('and-other-delights');

const BASE_10 = 10;

const HIGH = 1;
const LOW = 0;





const BANK0 = 0; // interlaces ABABAB
const BANK1 = 1; // block AAAA | BBBB

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
const PIN_STATE_BLOCKS = [
  [[0x00, PIN_STATE_SIZE + PIN_STATE_SIZE]], // bank 0 layout (interlaced)
  [[0x00, PIN_STATE_SIZE], [0x10, PIN_STATE_SIZE]] // bank 1 layout (split)
];


/**
 *
 **/
class Gpio {
  constructor(pin, controller) {
    this.pin = pin;
    this.controller = controller;
  }

  direction() { return Common.direction(this.controller, this.pin); }
  setDirection(direction) {}

  edge() {}
  setEdge(edge) {}

  activeLow() {}
  setActiveLow(activeLow) {}

  read() { return Common.read(this.controller, this.pin); }
  write(value) { return Common.write(this.controller, this.pin, value); }

  watch(cb) {}
  unwatch(cb) {}

  readTransaction() {}
}

/**
 *
 **/
class Port {
  readUInt8() {}
  readInt8() {}

  writeUInt8(value) {}
  writeInt8(value) {}

  readTransaction() {}
}

/**
 *
 **/
class DualPort {
  readUInt16BE() {}
  readInt16BE() {}
  readUInt16LE() {}
  readInt16LE() {}

  readTransaction() {

  }
}


/**
 *
 **/
class Transaction {

}

const DEFAULT_PIN_MAP = {
  0: { port: 'A', pin: 0 },
  7: { port: 'A', pin: 7 },
  8: { port: 'B', pin: 0 },
 16: { port: 'B', pin: 7 }
};

/**
 *
 **/
class Mcp23 {
  static from(bus, options) {
    return Promise.resolve(new Mcp23(bus, options));
  }

  constructor(bus, options) {
    this._bus = bus;
    this._bank = 0;
    this._pinmap = DEFAULT_PIN_MAP;
  }

  get bank() { return this._bank; }
  set bank(b) { this._bank = b; }

  close() {}

  sniffBank() { return Common.sniffBank(this._bus); }

  setProfile(profile) {
    return Common.setProfile(this._bus, this._bank, profile)
      .then(newbank => this._bank = newbank); // cache new bankX
  }

  profile() { return Common.profile(this._bus, this.bank); }

  state() { return Common.state(this._bus, this.bank); }

  interruptPortA() {}
  interruptPortB() {}

  getGpio(gpio, opts) {
    const options = Util.gpioOptions(opts);
    return Common.exportGpio(gpio, options);
    return Promise.resolve(new Gpio(bank, pin, options))
  }

  getPort(port) { return Promise.reject(); }
}


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
      if(zero && !one) { return BANK0; }
      if(!zero && one) { return BANK1; }
      return undefined;
    }

    return Promise.all([
      bus.read(REGISTERS[BANK0].IOCON).catch(e => undefined),
      bus.read(REGISTERS[BANK0].IOCON_ALT).catch(e => undefined),
      bus.read(REGISTERS[BANK1].IOCON).catch(e => undefined),
      bus.read(REGISTERS[BANK1].IOCON_ALT).catch(e => undefined)
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

        const z = maybe(b0, b0a, BANK0);
        const o = maybe(b1, b1a, BANK1);
        const g = guess(z, o);
        return {
          zero: z,
          one: o,
          guess: g
        };
      })
      .catch(e => {
        console.log('error sniffing', e);
        return { zero: false, one: false, guess: BANK0 };
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
    return bus.write(REGISTERS[bank].IOCON, iocon)
      .then(() => pb);
  }

  static state(bus, bank) {
    // return the split read buffer to its memmapped
    // offset/size, such that we can use the same
    // register addresses to access each buffer
    function fixUp(buf) {
      if(bank === BANK0) { return Buffer.from(buf); }
      return Buffer.concat([
        buf.slice(0, 0 + PIN_STATE_SIZE),
        Buffer.from(new Array(8)), // +3 to get to 11 and skip +5 to next block
        buf.slice(8, 8 + PIN_STATE_SIZE)
      ]);
    }

    return BusUtil.readblock(bus, PIN_STATE_BLOCKS[bank])
      .then(fixUp)
      .then(buf => {
        console.log('reading state for bankk', bank, buf);
        const iocon = buf.readUInt8(REGISTERS[bank].IOCON)
        const ioconAlt = buf.readUInt8(REGISTERS[bank].IOCON_ALT)
        if(iocon !== ioconAlt) { throw Error('iocon missmatch: ' + iocon.toString(16) + ' != ' + ioconAlt.toString(16)); }

        const a = Converter.fromPortState({
          iodir: buf.readUInt8(REGISTERS[bank].IODIRA),
          iopol: buf.readUInt8(REGISTERS[bank].IPOLA),
          gpinten: buf.readUInt8(REGISTERS[bank].GPINTENA),
          defval: buf.readUInt8(REGISTERS[bank].DEFVALA),
          intcon: buf.readUInt8(REGISTERS[bank].INTCONA),
          gppu: buf.readUInt8(REGISTERS[bank].GPPUA),
          intf: buf.readUInt8(REGISTERS[bank].INTFA)
        });

        const b = Converter.fromPortState({
          iodir: buf.readUInt8(REGISTERS[bank].IODIRB),
          iopol: buf.readUInt8(REGISTERS[bank].IPOLB),
          gpinten: buf.readUInt8(REGISTERS[bank].GPINTENB),
          defval: buf.readUInt8(REGISTERS[bank].DEFVALB),
          intcon: buf.readUInt8(REGISTERS[bank].INTCONB),
          gppu: buf.readUInt8(REGISTERS[bank].GPPUB),
          intf: buf.readUInt8(REGISTERS[bank].INTFB)
        });

        return {
          profile: Converter.fromIocon(iocon),
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

const PORT_PACKMAP = BinUtil.TRUE_8_BITMAP;
const IOCON_PACKMAP = BinUtil.TRUE_8_BITMAP;
const MIR_EN = 1;
const SEQ_EN = 0;
const SLEW_EN = 0;
const HWA_EN = 1;
const ODR_OPENDRAIN = 1;
const POL_LOW = 0;

const MIR_DEN = 0;
const SEQ_DEN = 1;
const SLEW_DEN = 1;
const HWA_DEN = 0;
const ODR_ACTIVEDRIVER = 0;
const POL_HIGH = 1;

/**
 *
 **/
class Converter {
  static fromPortState(state) {
    // there are 8 pins in a port // todo global for pinsPerPort: 8
    const pins = [0, 1, 2, 3, 4, 5, 6, 7]; // todo range(pinsPerPort)
    const directions = BitUtil.unpackbits(PORT_PACKMAP, state.iodir);
    const polarities = BitUtil.unpackbits(PORT_PACKMAP, state.iopol);
    const intEnableds = BitUtil.unpackbits(PORT_PACKMAP, state.gpinten);
    const defaultValues = BitUtil.unpackbits(PORT_PACKMAP, state.defval);
    const intControls = BitUtil.unpackbits(PORT_PACKMAP, state.intcon);
    const pullUps = BitUtil.unpackbits(PORT_PACKMAP, state.gppu);
    const intFlags = BitUtil.unpackbits(PORT_PACKMAP, state.intf);

    return pins.map(pin => ({
      pin: pin,
      direction: directions[pin],
      polarity: polarities[pin],
      interruptEnabled: intEnableds[pin],
      defaultValue: defaultValues[pin],
      interruptControl: intControls[pin],
      pullup: pullUps[pin],
      interruptFlag: intFlags[pin]
    }));
  }

  static toIocon(profile, bank) {
    const b = bank;
    const m = profile.interrupt.mirror ? MIR_EN : MIR_DEN;
    const s = profile.sequential ? SEQ_EN : SEQ_DEN;
    const d = profile.slew ? SLEW_EN : SLEW_DEN;
    const h = profile.hardwareAddress ? HWA_EN : HWA_DEN;
    const o = profile.interrupt.openDrain ? ODR_OPENDRAIN : ODR_ACTIVEDRIVER;
    const i = profile.interrupt.activeLow ? POL_LOW : POL_HIGH;

    // console.log('toIocon', b, m, s, d, h, o, i, 0, obj);

    return BitUtil.packbits(IOCON_PACKMAP, b, m, s, d, h, o, i, 0);
  }

  static fromIocon(iocon) {
    const [b, m, s, d, h, o, i, u] = BitUtil.unpackbits(IOCON_PACKMAP, iocon);

    const bank = b === 0 ? BANK0 : BANK1;
    const mirror = m === MIR_EN
    const sequential = s === SEQ_EN;
    const slew = d === SLEW_EN;
    const hwaddr = h === HWA_EN;
    const opendrain = o === ODR_OPENDRAIN;
    const activelow = i === POL_LOW;

    // sanity check, according to doc, always zero
    if(u !== 0) { throw Error('iocon unpack error / zero bit'); }

    // console.log('fromIocon', iocon.toString(2), b, m, s, d, h, o, i);

    return {
      bank: bank,
      sequential: sequential,
      slew: slew,
      hardwareAddress: hwaddr,
      interrupt: {
        mirror: mirror,
        mode: Converter.parseIntMode(opendrain, activelow),
        openDrain: opendrain,
        activeLow: activelow
      }
    };
  }

  static parseIntMode(odEn, activeLow) {
    return odEn ? 'open-drain' : activeLow ? 'active-low' : 'active-high';
  }
}

/**
 *
 **/
class Util {
  static parseGpio(gpio) {
    if(Number.isNaN(parseInt(gpio, BASE_10))) {
      // its not a number, we also accept a string
      if(typeof gpio !== 'string') { throw Error('unknown gpio param'); }
      if(gpio.length < 2) { throw Error('must specify bank and pin'); }
      const bankStr = gpio.charAt(0);
      const gpioStr = gpio.charAt(1);

      if(bankStr !== 'A' &&  bankStr !== 'B') { throw Error('unknown bank name'); }
      const bank = bankStr === 'A' ? 0 : 1;

      const pin = parseInt(gpioStr, BASE_10);
      if(Number.isNaN(pin)) { throw Error('unknown gpio pin'); }

      return [bank, pin];
    }

    if(gpio < 0 || gpio > 15) { throw Error('out of range'); }

    if(gpio >= 8) { return [1, gpio - 8]; }

    return [0, pin];
  }
}

Mcp23.BANK0 = BANK0;
Mcp23.BANK1 = BANK1;

module.exports = { Mcp23, BANK0, BANK1 };
