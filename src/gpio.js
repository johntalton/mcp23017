const { EventEmitter } = require('events');

/**
 *
 **/
class Gpio extends EventEmitter {
  constructor(pin, controller) {
    super();
    this.pin = pin;
    this.controller = controller;
  }

  direction() { return this.controller.pinDirection(this.pin); }
  setDirection(direction) { return Promise.reject(); }

  edge() { return Promise.reject(); }
  setEdge(edge) { return Promise.reject(); }

  activeLow() { return Promise.reject(); }
  setActiveLow(activeLow) { return Promise.reject(); }

  read() { return Common.read(this.controller, this.pin); }
  write(value) { return Common.write(this.controller, this.pin, value); }

  watch(cb) { this.controller.watch(this.pin, cb); }
  unwatch(cb) { return Promise.reject(); }

  readTransaction() { return Promise.reject(); }
  writeTransaction() { return Promise.rejec(); }
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

module.exports = { Gpio, Port, Word };
