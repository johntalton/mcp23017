
/**
 *
 **/
class Transaction {

}

/**
 *
 **/
class Gpio {
  constructor(pin, controller) {
    this.pin = pin;
    this.controller = controller;
  }

  direction() { return this.controller.pinDirection(this.pin); }
  setDirection(direction) { return Promise.reject(Error('setDirection')); }

  edge() { return Promise.reject(Error('edge')); }
  setEdge(edge) { return Promise.reject(Error('setEdge')); }

  activeLow() { return Promise.reject(Error('activeLow')); }
  setActiveLow(activeLow) { return Promise.reject(Error('setActiveLow')); }

  read() { return this.controller.read(this.pin); }
  write(value) { return this.controller.write(this.pin, value); }

  watch(cb) { return this.controller.watch(this.pin, cb); }
  unwatch(cb) { return Promise.reject(Error('unwatch')); }
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

module.exports = { Gpio, Port, Word };
