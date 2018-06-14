const { CommonBank } = require('./commonbank.js');

const WORD_SIZE = 2;

/**
 *
 **/
class CommonBank0 extends CommonBank {
  static readAB(bus, registerA, registerB) {
    // its your lucky day: all that API just to get this optimization!
    return bus.read(registerA, WORD_SIZE);
  }
}

module.exports = { CommonBank0, WORD_SIZE };
