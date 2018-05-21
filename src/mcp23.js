const { EventEmitter } = require('events');

const { BusUtil, BitUtil } = require('and-other-delights');

const { Converter } = require('./converter.js');
const { Common } = require('./common.js');
const { DEFAULT_NAMES } = require('./names.js');
const Bank = require('./defines.js');

const BASE_10 = 10;

/**
 *
 **/
class Gpio extends EventEmitter {
  constructor(pin, controller) {
    this.pin = pin;
    this.controller = controller;
  }

  direction() { return this.controller.pinDirection(this.pin); }
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
  writeTransaction() {}
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
  writeTransaction() {}
}

/**
 *
 **/
class Word {
  readUInt16BE() {}
  readInt16BE() {}
  readUInt16LE() {}
  readInt16LE() {}

  readTransaction() {
  }
  writeTransaction() {}
}

/**
 *
 **/
class Transaction {

}


/**
 *
 **/
class Mcp23Base {
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

  //
  interruptPortA() {}
  interruptPortB() {}

  softwareReset() { return Common.softwareReset(this._bus); }
  sniffBank() { return Common.sniffBank(this._bus); }

  setProfile(profile) {
    const newBank = (profile.bank !== undefined && profile.bank !== false) ? profile.bank : this._bank;
    return Common.setProfile(this._bus, this._bank, Converter.toIocon(profile, newBank))
      .then(() => {
        this._bank = newBank; // cache new bankX
        this._sequential = profile.sequential;
      });
  }

  //touchProfile() {}
  //wasProfileTouched() {}

  profile() {
    return Common.profile(this._bus, this._bank)
      .then(Converter.fromIocon)
      .then(profile => {
        console.log(' --- ', this._bank, profile.bank);
        this._bank = profile.bank;
        this._sequential = profile.sequential;
        return profile;
      });
  }

  state() {
    return Common.state(this._bus, this._bank, this._sequential)
      .then(state => {
        const profile = Converter.fromIocon(state.iocon);
        if(profile.bank !== this._bank) {
          console.log('read profiles bank is not the bank used to read!');
        }
        //
        return {
          profile: profile,
          gpios: [].concat(
            Converter.fromPortState(state.a, this._pinmap.portA),
            Converter.fromPortState(state.b, this._pinmap.portB)
          )
        };
      });
  }

  exportAll(gpios) {
    const state = Converter.toState(gpios, this._pinmap);
    return Common.exportAll(this._bus, this._bank, this._sequential, state);
//      .then(Mcp23.exportsToObjects(exports));
  }

  unexportAll(exports) {
    return Common.unexportAll(this._bus, this._bank, this._sequential, exports);
  }
}

class Mcp23SmartMode extends Mcp23Base {

}

class Mcp23Cached extends Mcp23SmartMode {

}

/**
 *
 **/
class Mcp23 extends Mcp23Cached {
  constructor(bus, options) {
    super(bus, options);
  }

  exportGpio(gpio) {
    return this.rawState().then(state => {});
    return Common.exportGpio(this._bus, this._bank, this._sequential, gpio);
  }

  unexportGpio(gpio) {

  }

  exportPort(port) { return Promise.reject(); }

  unexportPort(port) { return Promise.reject(); }

  exportWord() {}
  unexportWord() {}

}

/*
    const byType = exports.reduce((acc, exp) => {
      switch(exp.type) {
      case 'gpio': acc.gpios.push(exp); break;
      case 'port': acc.ports.push(exp); break;
      case 'word': acc.word.push(exp); break;
      default: throw Error('unknown export type: ' + exp.type); break;
      }
      return acc;
    }, { gpios: [], ports: [], word: [] });

*/

module.exports = { Mcp23 };
