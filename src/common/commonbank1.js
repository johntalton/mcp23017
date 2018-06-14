const { CommonBank } = require('./commonbank.js');

/**
 *
 **/
class CommonBank1 extends CommonBank {
  static readAB(bus, registerA, registerB) {
    return Promise.all([
      bus.read(registerA),
      bus.read(registerB)
    ]);
  }
}

module.exports = { CommonBank1 };
