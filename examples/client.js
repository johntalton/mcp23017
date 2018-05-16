
const rasbus = require('rasbus');

const { Mcp23 } = require('../');

class Device {
  static setupWithRetry(config) {
    return Device._setup(config)
      .catch(e => {
        console.log('initial setup error', e);
      });
  }

  static _setup(config) {
    return  rasbus.byname(config.bus.driver).init(...config.bus.id)
      .then(bus => Mcp23.from(bus))
      .then(mcp => {
        console.log('Microchip MCP27x17 up.');
        config.client = mcp;
        return mcp.profile().then(console.log);
      });
  }
}

const fs = require('fs');
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
    return json;
  }
}

function setupDevices(config) {
  return config.devices.map(device => Device.setupWithRetry(device));
}

function setupStore(config) {
  return Promise.resolve();
}

Config.config('client.json').then(config => {
  return Promise.all([
    setupDevices(config),
    setupStore(config)
  ]);
})
.catch(e => {
  console.log('error', e);
});
