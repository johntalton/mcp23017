
const { Config } = require('./client-config.js');
const { Device } = require('./client-device.js');


Lifecycle.configure('client.json')
// Lifecycle.empty()
  .registerEventing(EventEmitter)
  .registerEventingOptional(Mqtt)
  .registerDeviceOptional(Onoff)
  .registerDevice(Tcs)
  .registerDevice(Mcp23)



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
  console.log('top-level error', e);
});
