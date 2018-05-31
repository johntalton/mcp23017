
const fs = require('fs');

// local imports
const { Mcp23, ConfigUtil } = require('../');

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
      devices: json.devices.map((d, idx) => ConfigUtil.normalizeDevice(d, idx))
    };
  }

  static normalizeMqtt(mqtt) {
    return {
      ...mqtt,
      url: mqtt.url !== undefined ? mqtt.url : process.env.mqtturl
    };
  }
}

module.exports = { Config };
