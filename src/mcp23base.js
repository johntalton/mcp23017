const { Converter } = require('./converter.js');
const { Common } = require('./common');
const { DEFAULT_NAMES } = require('./names.js');
const { CommonMode } = require('./defines.js');

/**
 * Base for bus and options, pin names resolve here.
 **/
class Mcp23Base {
  constructor(bus, options) {
    const opts = options !== undefined ? options : { };
    this.bus = bus;
    this.pinmap = opts.names !== undefined ? opts.names : DEFAULT_NAMES;
  }

  close() {
    // todo
  }

  softwareReset() { return Common.softwareReset(this.bus); }

  sniffMode(hint) {
    return Common.sniffMode(this.bus, hint)
      .then(guess => Converter.fromIoconMode(guess.bank, guess.sequential));
  }

  // note that the mode need to be passed here as the
  // profile may be trying to switch it etc.
  setProfile(mode, profile) {
    console.log('setProfile', mode, profile);
    return Common.setProfile(this.bus, mode, Converter.toIocon(profile));
  }

  profile(mode) {
    return Common.profile(this.bus, mode)
      .then(Converter.fromIocon);
  }

  state(mode) {
    return Common.state(this.bus, mode)
      .then(state => {
        const profile = Converter.fromIocon(state.iocon);
        if(profile.bank !== mode.bank) {
          console.log('read profiles bank is not the bank used to read!');
        }
        //
        return {
          profile: profile,
          gpios: [].concat(
            Converter.fromPortState(state.a, this.pinmap.portA),
            Converter.fromPortState(state.b, this.pinmap.portB)
          )
        };
      });
  }

  exportAll(mode, gpios) {
    const state = Converter.toState(gpios, this.pinmap);
    return Common.exportAll(this.bus, mode, state);
  }
}

/**
 * Adding Cache support for mode.
 **/
class Mcp23Cached extends Mcp23Base {
  constructor(bus, options) {
    super(bus, options);
    this.commonMode = CommonMode.MODE_MAP_DEFAULT;
    // todo _iocon
  }

  get mode() { return Converter.fromIoconMode(this.commonMode.bank, this.commonMode.sequential); }
  set mode(m) { this.commonMode = Converter.toIoconMode(m); }

  sniffMode() {
    return super.sniffMode(this.commonMode);
  }

  // wrap setProfile to use cached mode
  setProfile(profile) {
    // pick the target mode form out cached common mode or the profiles
    const userProfile = (profile.mode !== undefined && profile.mode !== false);
    const target = {
      mode: userProfile ? profile.mode : Converter.fromIoconMode(...this.commonMode),
      cmode: userProfile ? Converter.toIoconMode(profile.mode) : this.commonMode
    };

    // we use our cached mode to write, and then update to the newly
    //  set profile on success
    return super.setProfile(this.commonMode, {
      ...profile,
      mode: target.mode
    })
      .then(ret => {
        this.commonModeode = target.cmode;
        return ret;
      });
  }

  profile() {
    // console.log('using cached mode for profile read', this.commonMode);
    return super.profile(this.commonMode);
    // todo cache read mode here. or provide option
  }

  state() {
    return super.state(this.commonMode);
  }

  exportAll(gpios) {
    return super.exportAll(this.commonMode, gpios);
  }
}

/**
 *
 **/
class Mcp23 extends Mcp23Cached {
  static from(bus, options) {
    return Promise.resolve(new Mcp23(bus, options));
  }
}

module.exports = { Mcp23, Mcp23Cached };
