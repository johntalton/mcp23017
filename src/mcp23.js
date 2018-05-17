
const { BusUtil, BitUtil } = require('and-other-delights');

const { Common } = require('./common.js');
// const { Converter } = require('./converter.js');

const BASE_10 = 10;

const HIGH = 1;
const LOW = 0;

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

Mcp23.BANK0 = Common.BANK0;
Mcp23.BANK1 = Common.BANK1;

module.exports = { Mcp23  };
