
const fs = require('fs');

// local imports
const { Mcp23 } = require('../');


class Config {
  static config(path) {
    return new Promise((resolve, reject) => {
      fs.readFile(path, { encoding: 'utf-8', flag: 'r' }, (err, data) => {
        if(err) { reject(err); return; }
        resolve(data);
      });
    })
    .then(JSON.parse)
    .then(Config.normalize);
  }

  static normalize(json) {
    // console.log('normalizing', json);
    return {
      mqtt: Config.normalizeMqtt(json.mqtt),
      devices: json.devices.map((d, idx) => Config.normalizeDevice(d, idx))
    };
  }

  static normalizeMqtt(mqtt) {
    return {
      ...mqtt,
      url: mqtt.url !== undefined ? mqtt.url : process.env.mqtturl
    };
  }

  static normalizeDevice(device, idx) {
    const name = device.name !== undefined ? device.name : idx.toString(10);
    const active = device.active !== undefined ? device.active : true;

    const sniffBank = device.sniffBank !== undefined ? device.sniffBank : true;
    const setPoS = device.setProfileOnStart !== undefined ? device.setProfileOnStart : true;
    const validPoS = device.validateProfileOnStart !== undefined ? device.validateProfileOnStart : true;

    return {
      name: name,
      active: active,
      bus: { ...device.bus },

      sniffBank: sniffBank,
      setProfileOnStart: setPoS,
      validateProfileOnStart: validPoS,

      profile: Config.normalizeProfile(device.profile)
    };
  }

  static normalizeProfile(profile) {
    const mutable = profile.mutable !== undefined ? profile.mutable : true;
    const bank = profile.bank !== undefined ? profile.bank : false;
    const seq = profile.sequential !== undefined ? profile.sequential : true;
    const slew = profile.slew !== undefined ? profile.slew : true;
    const hwAddr = profile.hardwareAddress !== undefined ? profile.hardwareAddress : false;
    const int = profile.interrupt !== undefined ? profile.interrupt : { };

    return {
      mutable: mutable,

      bank: bank,
      sequential: seq,
      slew: slew,
      hardwareAddress: hwAddr,

      interrupt: Config.normalizeInterrupt(int)
    };
  }

  static normalizeInterrupt(interrupt) {
    const mirror = interrupt.mirror !== undefined ? interrupt.mirror : false;
    const [odr, alow] = Config.normalizeProfileInterruptMode(interrupt.mode);

    return {
      mirror: mirror,
      mode: interrupt.mode,
      openDrain: odr,
      activeLow: alow
    };
  }

  static normalizeProfileInterruptMode(mode) {
    if(mode === undefined) { return [false, true]; } // default to active-low
    if(mode.toLowerCase() === 'open-drain') { return [true, false]; }
    if(mode.toLowerCase() === 'active-low') { return [false, true]; }
    if(mode.toLowerCase() === 'active-high') { return [false, false]; }

    throw Error('unknonw interrupt mode: ' + mode);
  }
}

module.exports = { Config };
