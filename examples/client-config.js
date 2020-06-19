const fs = require('fs').promises;

// local imports
const { ConfigUtil } = require('../');

class Config {
  static config(path) {
    return fs.readFile(path, { encoding: 'utf-8', flag: 'r' })
      .then(JSON.parse)
      .then(Config.normalize)
      .then(config => Object.freeze(config));
  }

  static normalize(json) {
    // console.log('normalizing', json);
    return {
      mqtt: Config.normalizeMqtt(json.mqtt),
      devices: json.devices.map((d, idx) => ConfigUtil.normalizeDevice(d, idx))
    };
  }

  static normalizeMqtt(mqtt) {
    return {
      ...mqtt,
      url: mqtt.url !== undefined ? mqtt.url : process.env.mqtturl // eslint-disable-line no-process-env
    };
  }
}

module.exports = { Config };
