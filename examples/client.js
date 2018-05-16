
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
      });
  }
}

class Config {
  static defaults() {
    return Promise.resolve({
      mqtt: { },
      devices: [
        {
          nane: "extention",
          bus: { driver: "i2c-bus", id: [ 42, 0x20 ] }
        }
      ]
    });
  }
}


function setupDevices(config) {
  return config.devices.map(device => Device.setupWithRetry(device));
}

function setupStore(config) {
  return Promise.resolve();
}

Config.defaults().then(config => {
  return Promise.all([
    setupDevices(config),
    setupStore(config)
  ]);
})
.catch(e => {
  console.log('error', e);
});
