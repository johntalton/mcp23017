const { EventEmitter } = require('events');

const { BusUtil, BitUtil } = require('@johntalton/and-other-delights');

const { Converter } = require('./converter.js');
const { Common } = require('./common/common.js');
const { DEFAULT_NAMES } = require('./names.js');
const Bank = require('./defines.js');

const BASE_10 = 10;

/**
 *
 **/
class Mcp23Base {
  static from(bus, options) {
    return Promise.resolve(new Mcp23(bus, options));
  }

  constructor(bus, options) {
    this._bus = bus;
    this._mode = Common.MODE_MAP_DEFAULT;
    this._pinmap = options.names !== undefined ? options.names : DEFAULT_NAMES;;
  }

  get mode() { return Converter.fromIoconMode(this._mode.bank, this._mode.sequential); }
  set mode(m) { this._mode = Converter.toIoconMode(m); }

  close() {}

  //
  interruptPortA() {}
  interruptPortB() {}

  softwareReset() { return Common.softwareReset(this._bus); }
  sniffMode() {
    return Common.sniffMode(this._bus).then(guess => {
      return Converter.fromIoconMode(guess.bank, guess.sequential);
    });
  }

  setProfile(profile) {
    const newUserMode = (profile.mode !== undefined && profile.mode !== false) ? profile.mode : this._mode;
    console.log('setProfile', newUserMode);
    const newMode = Converter.toIoconMode(newUserMode);
    return Common.setProfile(this._bus, this._mode, Converter.toIocon(profile, newMode))
      .then(() => {
        this._mode = newMode;
      });
  }

  //touchProfile() {}
  //wasProfileTouched() {}

  profile() {
    return Common.profile(this._bus, this._mode)
      .then(iocon => { console.log('iocon', BitUtil.unpackbits(BitUtil.TRUE_8_PACKMAP, iocon));  return iocon; })
      .then(Converter.fromIocon)
      .then(profile => {
        this._bank = profile.bank;
        this._sequential = profile.sequential;
        return profile;
      });
  }

  state() {
    return Common.state(this._bus, this._mode)
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
