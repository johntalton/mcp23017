const { EventEmitter } = require('events');

const { BusUtil, BitUtil } = require('@johntalton/and-other-delights');

const { Gpio } = require('./gpio.js');
const { Converter } = require('./converter.js');
const { Common } = require('./common/common.js');
const { DEFAULT_NAMES } = require('./names.js');
const Bank = require('./defines.js');

const BASE_10 = 10;

/**
 * Base for bus and options, pinmap resolves here.
 **/
class Mcp23Base {
  constructor(bus, options) {
    const opts = options !== undefined ? options : { };
    this._bus = bus;
    this._pinmap = opts.names !== undefined ? opts.names : DEFAULT_NAMES;;
  }

  close() {
    // todo
  }

  //
  interruptPortA() {}
  interruptPortB() {}

  softwareReset() { return Common.softwareReset(this._bus); }

  sniffMode() {
    return Common.sniffMode(this._bus).then(guess => {
      return Converter.fromIoconMode(guess.bank, guess.sequential);
    });
  }

  // note that the mode need to be passed here as the
  // profile may be trying to switch it etc.
  setProfile(mode, profile) {
    console.log('setProfile', mode, profile);
    return Common.setProfile(this._bus, mode, Converter.toIocon(profile));
  }

  //touchProfile() {}
  //wasProfileTouched() {}

  profile(mode) {
    return Common.profile(this._bus, mode)
      .then(iocon => { console.log('iocon', BitUtil.unpackbits(BitUtil.TRUE_8_PACKMAP, iocon));  return iocon; })
      .then(Converter.fromIocon)
      .then(profile => {
        this._bank = profile.bank;
        this._sequential = profile.sequential;
        return profile;
      });
  }

  state(mode) {
    return Common.state(this._bus, mode)
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

  exportAll(mode, gpios) {
    const state = Converter.toState(gpios, this._pinmap);
    return Common.exportAll(this._bus, mode.bank, mode.sequential, state); // todo pass cmode
//      .then(Mcp23.exportsToObjects(exports));
  }
}

/**
 * Adding Cache support for mode.
 **/
class Mcp23Cached extends Mcp23Base {
  constructor(bus, options) {
    super(bus, options);
    this._mode = Common.MODE_MAP_DEFAULT;
    // todo _iocon
  }

  get mode() { return Converter.fromIoconMode(this._mode.bank, this._mode.sequential); }
  set mode(m) { this._mode = Converter.toIoconMode(m); }

  // wrap setProfile to use cached mode
  setProfile(profile) {
    // pick the target mode form out cahced common mode or the profiles
    const userProfile = (profile.mode !== undefined && profile.mode !== false);
    const target = {
      mode: userProfile ? profile.mode : Converter.fromIoconMode(...this._mode),
      cmode: userProfile ? Converter.toIoconMode(profile.mode) : this._mode
    };

    // we use our cached mode to write, and then update to the newly
    //  set profile one it succeds
    return super.setProfile(this._mode, {
      ...profile,
      mode: target.mode
    })
    .then(ret => {
      this._mode = target.cmode;
      return ret;
    });
  }

  profile() {
    // console.log('using cached mode for profile read', this._mode);
    return super.profile(this._mode);
  }

  state(mode) {
    return super.state(this._mode);
  }

  exportAll(mode, gpios) {
    return super.exportAll(this._mode, gpios);
  }
}

/**
 * Smart mode provides, if allowed, switching
 *  Modes specificly to support operations
 *  that can take advantage of them.
 * This requires cached / locked iocon/mode
 *  setup to and switching logic.
 **/
class Mcp23SmartMode extends Mcp23Cached {
  constructor(bus, options) {
    super(bus, options);
  }
}

/**
 *
 **/
class Mcp23 extends Mcp23SmartMode {
  static from(bus, options) {
    return Promise.resolve(new Mcp23(bus, options));
  }

  constructor(bus, options) {
    super(bus, options);
  }

  exportGpio(gpio) {
    return Promise.reject(Error('no convieance methods yet'));
  }

  exportGpioFromExisting(gpio) {
    return Promise.resolve(new Gpio(gpio.name, this));
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
