
const { BusUtil, BitUtil } = require('and-other-delights');

const { Common } = require('./common.js');
const { DEFAULT_NAMES } = require('./names.js');

const BASE_10 = 10;

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
    this._sequential = true;
    this._pinmap = options.names !== undefined ? options.names : DEFAULT_NAMES;;
  }

  get bank() { return this._bank; }
  set bank(b) { this._bank = b; }

  close() {}

  sniffBank() { return Common.sniffBank(this._bus); }

  setProfile(profile) {
    return Common.setProfile(this._bus, this._bank, profile)
      .then(newbank => {
        this._bank = newbank; // cache new bankX
        this._sequential = profile.sequential;
      });
  }

  profile() { return Common.profile(this._bus, this._bank); }

  state() { return Common.state(this._bus, this._bank, this._sequential); }

  interruptPortA() {}
  interruptPortB() {}

  exportGpio(gpio, direction, edge, opts) {
    const options = {
      direction: direction,
      edge: edge,
      ...opts
    };
    return Common.exportGpio(gpio, options);
  }

  getPort(port) { return Promise.reject(); }
}

Mcp23.BANK0 = Common.BANK0;
Mcp23.BANK1 = Common.BANK1;

module.exports = { Mcp23 };
