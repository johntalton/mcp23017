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
    // Detatch from bus. No close needed.
    return Promise.resolve();
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

        const pcm = Converter.toIoconMode(profile.mode);
        if(!CommonMode.match(pcm, mode)) {
          console.log('read profiles bank is not the bank used to read!', profile.mode, mode);
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

  bulkData(mode) {
    return Common.bulkData(this.bus, mode)
      .then(data => {
        return Converter.fromData(data, this.pinmap);
      });
  }
}

module.exports = { Mcp23Base };
