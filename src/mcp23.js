
const BASE_10 = 10;

const HIGH = 1;
const LOW = 0;





const BANK0 = 0;
const BANK1 = 1;

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

  IODIRA: 0x10,
  IPOLA: 0x11,
  GPINTENA: 0x12,
  DEFVALA: 0x13,
  INTCONA: 0x14,
  IOCON_ALT: 0x15,
  GPPUA: 0x16,
  INTFA: 0x17,
  INTCAPA: 0x18,
  GPIOA: 0x19,
  OLATA: 0x1A
}];



/**
 *
 **/
class Gpio {
  constructor(pin, controller) {
    this.pin = pin;
    this.controller = controller;
  }

  get direction() { return Common.direction(this.controller, this.pin); }
  set direction(direction) {}

  get edge() {}
  set edge(edge) {}

  get activeLow() {}
  set activeLow(activeLow) {}

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

/**
 *
 **/
class Mcp23 {
  static from(bus, options) {
    return Promise.resolve(new Mcp23(bus, options));
  }

  constructor(bus, options) {
    this.bus = bus;
    this.bank = 0;
  }

  close() {}

  setProfile(profile) { return Common.setProfile(profile); }
  profile() { return Common.profile(this.bus, this.bank); }

  processInterrupt(bankName) {}

  getGpio(gpio, options) {
    const [bank, pin] = Util.parseGpio(gpio);
    return Promise.resolve(new Gpio(bank, pin, options))
  }

  getPort(port) { return Promise.reject(); }
}

class BitUtil {
  /**
   *  packbits([2, [3, 2]], onoff, quad)
   **/
  static packbits(packmap, ...params) {
    return BitUtil._normalPackmap(packmap)
      .reduce((accum, [position, length], idx) => {
        const mask = Math.pow(2, length) - 1;
        const value = params[idx] & mask;
        const shift = position + 1 - length;
        return accum | (value << shift);
      }, 0);
  }

  /**
   *  const [onoff, quad] = unpackbits([2, [3, 2]])
   **/
  static unpackbits(packmap, bits) {
    return BitUtil._normalizePackmap(packmap)
      .map(([position, length]) => {
        return BitUtil._readBits(bits, position. length);
      });
  }

  // position if from left->right with zero index
  static _readBits(bits, position, length) {
    const shift = position - length + 1;
    const mask = Math.pow(2, length) - 1;
    return (bits >> shift) & mask;
  }

  static _normalizePackmap(packmap) {
    return packmap.map(item => {
      if(Array.isArray(item)) {
        if(item.length !== 2) { console.log('sloppy packmap fomrat', item); return [item[0], 1]; }
        return item;
      }
      return [item, 1];
    });
  }
}

/**
 *
 **/
class Common {
  static sniffBank() {}

  static profile(bus, bank) {
    return bus.read(REGISTERS[bank].IOCON).then(Converter.fromIocon);
  }
  static setProfile(profile) {}

  static readInterrupts() { } // return [pin, value]

  static read(controller, pin) {}
  static write(controller, pin, value) {}

  static readPort(controller, port) {}
  static writePort(controller, port, value) {}
  static wrtiePortLatch(controller, port, value) {}
}


const IOCON_PACKMAP = [0, 1, 2, 3, 4, 5, 6, 7];
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
  static toIocon(obj) {
    const b = obj.bank;
    const m = obj.interrupt.mirror ? MIR_EN : MIR_DEN;
    const s = obj.sequential ? SEQ_EN : SEQ_DEN;
    const d = obj.slew ? SLEW_EN : SLEW_DEN;
    const h = obj.hardwareAddress ? HWA_EN : HWA_DEN;
    const o = object.openDrain ? ODR_OPENDRAIN : ODR_ACTIVEDRIVER;
    const i = object.activeLow ? POL_LOW : POL_HIGH;

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


module.exports = { Mcp23 };
