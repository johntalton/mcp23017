
const { ClassSelector } = require('@johntalton/and-other-delights');
const { CommonMode } = require('../defines.js');

/**
 * Withing this context `mode` refers to the common mode bank / seq object.
 **/
class ModeSelection extends ClassSelector {
  static from(mode) {
    return new ModeSelection(mode);
  }

  on(modemap, result) {
    return super.on(inval => CommonMode.match(inval, modemap), result);
  }
}

module.exports = { ModeSelection };
