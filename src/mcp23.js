const { Mcp23Cached } = require('./mcp23cached.js');
const { Mcp23Gpio } = require('./gpio');
const { ConfigUtil, ConsoleUtil, Util } = require('./util');

/**
 * Wrapper for basic API support around the chip.
 *
 * This does not provide any application interface (like gpio)
 * or others.  It does serve as the core set of functionally
 * exposed by the chip.  Other applications should build
 * on top of this.
 *
 * Such as the `mcp23gpio` application (a common use case).
 **/
class Mcp23 extends Mcp23Cached {
  static from(bus, options) {
    return Promise.resolve(new Mcp23(bus, options));
  }
}

module.exports = {
  Mcp23,
  Mcp23Gpio,
  ConfigUtil,
  ConsoleUtil,
  Util
};
