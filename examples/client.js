
// 1st party imports
const rasbus = require('rasbus');

// local imports
const { Mcp23 } = require('../');

class Util {
  static logProfile(profile) {
    console.log('#');
    console.log('# Operational Mode ', Util.operationalMode(profile));
    console.log('#  Slew', profile.slew, ' hwAddr', profile.hardwareAddress);
    console.log('#  Interrupt', profile.interrupt.mirror ? '' : '', Util.interruptMode(profile.interrupt));
    console.log('#');
  }

  static operationalMode(profile) {
    if(profile.bank === Mcp23.BANK0 && profile.sequential) { return 'Sequential addressing / interlaced (default)'; }
    if(profile.bank === Mcp23.BANK0 && !profile.sequential) { return 'Byte Mode / wobble AB'; }
    if(profile.bank === Mcp23.BANK1 && profile.sequential) { return 'Sequential addressing / block'; }
    if(profile.bank === Mcp23.BANK1 && !profile.sequential) { return 'Byte Mode'; }
    throw Error('unknown mode');
  }

  static interruptMode(interrupt) {
    if(interrupt.openDrain) { return 'open-drain'; }
    if(!interrupt.activeLow) { return 'active-high'; }
    return 'active-low (default)';
  }

  static logState(state) {
    console.log('#');
    Util.logProfile(state.profile);
    console.log('# Port A');
    state.a.forEach(Util.logGpio);
    console.log('# Port B');
    state.b.forEach(Util.logGpio);
    console.log('#');
  }

  static logGpio(gpio) {
    console.log('#  Pin', gpio.pin);
    console.log('#   Direction', gpio.direction);
    console.log('#   Polarity', gpio.polarity);
    console.log('#   Interrupt', gpio.interruptEnabled);
    console.log('#   default Value', gpio.defaultValue);
    console.log('#   Pull-Up', gpio.pullup);
    console.log('#   interruptFlag', gpio.interruptFlag);
  }
}

class Device {
  static setupWithRetry(config) {
    return Device._setup(config)
      .then(device => {
        config.client = device;
        return Device._configure(config);
      })
      .catch(e => {
        console.log('initial setup error', e);
      });
  }

  static _setup(config) {
    return rasbus.byname(config.bus.driver).init(...config.bus.id)
      .then(bus => Mcp23.from(bus));
  }

  static _configure(config) {
    return config.client.sniffBank()
      .then(({ one, zero, guess }) => {
        if(one && zero) { console.log('# ambigious sniff'); }
        if(!one && !zero) { console.log('# sniff found no bank, is this even a mcp23'); }
        if(!one && zero) { console.log('# sniffed Zero'); }
        if(one && !zero) { console.log('# sniffed One'); }

        return guess;
      })
      .then(sniffedBank => {
        if(sniffedBank === undefined) { console.log('no sniff update'); return; }

        config.client.bank = sniffedBank; // update init state so set profile works

        const lastBank = config.profile.bank;

        if(config.profile.mutable) {
          console.log('mutable profile, lets update', config.profile.bank);
          if(lastBank === undefined) {
            console.log('mutating client bank to match sniffed');
            config.profile.bank = sniffedBank;
          }
          else {
            //
            if(lastBank !== sniffedBank) {
              console.log('overriting last bank ', lastBank, sniffedBank);
              config.profile.bank = sniffedBank;
            }
          }
        }
        else {
          // todo if immutable profile, and bank is not a match,
          //   we might be in for a rocky start
          if(lastBank !== undefined ) {
            if(lastBank !== sniffedBank) {
              console.log('sniffed bank and fixed do not match, set profile will update');
            }
          }
          else {
            console.log('last is unset and will default (bank0), sniffed is', sniffedBank);
            if(sniffedBank !== config.client.bank) {
              console.log('sniffed bank not active bank, likely faulure ! ');
            }
          }
        }
      })
      .then(() => config.client.profile()).then(profile => {
        console.log('profile after sniff');
        Util.logProfile(profile);
      })

      .then(() => config.client.setProfile(config.profile))
      .then(() => config.client.profile()).then(profile => {
        console.log('profile after set (validate...)')
        Util.logProfile(profile);
        // Todo return validation result
      })

      .then(() => config.client.state()).then(Util.logState);
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
    const bank = profile.bank !== undefined ? profile.bank : Mcp23.BANK0;
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
