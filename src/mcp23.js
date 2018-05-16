
const BASE_10 = 10;

const HIGH = 1;
const LOW = 0;

/**
 *
 **/
class Gpio {
  constructor(pin, controller) {
    this.pin = pin;
    this.controller = controller;
  }

  get direction() { return this.controller.direction(this.pin); }
  set direction(direction) {}

  get edge() {}
  set edge(edge) {}

  get activeLow() {}
  set activeLow(activeLow) {}

  read() {}
  write(value) {}

  watch(cb) {}
  unwatch(cb) {}

  readTransaction() {}
}

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
    this.bus = bus;
  }

  close() {}

  set profile(profile) {}
  get profile() {
    return this.bus.read();
  }

  getGpio(gpio, options) {
    const [bank, pin] = Common.parseGpio(gpio);
    return Promise.resolve(new Gpio(bank, pin, options))
  }

  getPort(port) { return Promise.reject(); }
}

/**
 *
 **/
class Common {
  static sniffBank() {}


  static parseGpio(gpio) {
    if(Number.isNaN(parseInt(gpio, BASE_10))) {
      // its not a number, we also accept a string
      if(typeof gpio !== 'string') { throw Error('unknown gpio param'); }
      if(gpio.length < 2) { throw Error('must specify bank and pin'); }
      const bankStr = gpio.charAt(0);
      const gpioStr = gpio.charAt(1);

      if(bankStr !== 'A' &&  bankStr !== 'B') { throw Error('unknown bank name'); }
      const bank = bankStr === 'A' ? 0 : 1;

      const pin = parseInt(gpioStr, BASE_10);
      if(Number.isNaN(pin)) { throw Error('unknown gpio pin'); }

      return [bank, pin];
    }

    if(gpio < 0 || gpio > 15) { throw Error('out of range'); }

    if(gpio >= 8) { return [1, gpio - 8]; }

    return [0, pin];
  }
}


module.exports = { Mcp23 };
