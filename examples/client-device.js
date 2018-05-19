
// 1st party imports
const rasbus = require('rasbus');

// local imports
const { Mcp23 } = require('../');



class Util {
  static logProfile(profile) {
    console.log('#');
    console.log('# Operational Mode ', Util.operationalMode(profile));
    console.log('#  Slew', profile.slew, (profile.slew ? '' : '(slow-mode)'), ' hwAddr', profile.hardwareAddress);
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
    //console.log('#   Direction', gpio.direction ? 'out' : 'in');
    if(gpio.direction === 'in') { // todo should we use const here or is string a better interface
      console.log('#  \u21E6 Input Pin', gpio.pin, '(edge', gpio.mode, 'activeLow', gpio.activeLow + ')');
      if(gpio.interruptEnabled) {
        if(gpio.pendingInterrupt) { console.log('#   \uD83D\uDD14 (pending interrupt) \uD83D\uDECE'); }
      }
      else {
        console.log('#   interrupts disabled');
      }
    }
    else if(gpio.direction === 'out'){
      console.log('#  \u21E8 Ouptput Pin', gpio.pin);
    }
    else { throw Error('unknown direction ' + gpio.direction); }
    console.log('#   active-low', gpio.polarity === 1, 'pull-up', gpio.pullup ? 'enabled 100 k\u2126' : 'disabled');
    console.log('#');
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
      .then(bus => Mcp23.from(bus, { names: config.names }));
  }

  static _configure(config) {
    return Promise.resolve()
      .then(() => Device.configSniff(config))
      .then(guess => Device.configUpdateBank(config, guess))
      .then(() => config.client.profile()).then(profile => {
        console.log('# Initial Device Profile');
        Util.logProfile(profile);
      })
      .then(() => {
        if(config.setProfileOnStart) {
          // console.log('# Setting Profile to');
          // Util.logProfile(config.profile);
          return config.client.setProfile(config.profile);
        }
        return Promise.resolve();
      })
      .then(() => Device.configValidateProfile(config))


      .then(() => config.client.state()).then(Util.logState);
  }

  static configSniff(config) {
    if(!config.sniffBank) {
      console.log('skipping sniff (you are trusting)');
      return Promise.resolve();
    }

    return config.client.sniffBank()
      .then(({ one, zero, guess }) => {
        if(one && zero) { console.log('# ambigious sniff'); }
        if(!one && !zero) { console.log('# sniff found no bank, is this even a mcp23'); }
        if(!one && zero) { console.log('# sniffed Zero'); }
        if(one && !zero) { console.log('# sniffed One'); }

        return guess;
      });
  }

  static configUpdateBank(config, guess) {
    // guess can be undefined indicating we skipped any sniffing
    // the profiles bank can be false or a bank number
    // false would indicate that the current bank should be used
    const curPB = config.profile.bank;
    const curCB = config.client.bank;

    if(guess === undefined) {
      if(curPB !== false && curPB === curCB) {
        console.log('no guess, matched profile and client (best effort)');
        return;
      }

      if(curPB === false) {
        console.log('no guess, profile agnostic, assume client (no net)');
        return;
      }

      console.log('no guess, assuming from profile bank (hope you are right)');
      // update working bank
      config.client.bank = curPB;
      return;
    }

    if(guess === curCB) {
      if(curPB === false) {
        console.log('guess matches client, profile is bank agnostic');
        return;
      }

     if(curPB === guess) {
        console.log('guess matches client and profile');
        return;
      }
      else {
        console.log('guess matches client, profile will overrite if set');
        return;
      }
    }

    if(curPB === false) {
      console.log('updating client from guess, profile is bank agnostic');
    }
    else {
      console.log('updating clinet from guess, profile will override if set')
    }

    // update working bank
    config.client.bank = guess;
    return;
  }

  static configValidateProfile(config) {
    if(!config.validateProfileOnStart) { return Promise.resolve(); }

    return config.client.profile()
      .then(profile => {
        console.log('# Validating active device profile');
        Util.logProfile(profile);
        // todo less hardcody
        if(profile.bank !== config.profile.bank && config.profile.bank !== false) { throw Error('invalide bank'); }
        if(profile.sequential !== config.profile.sequential) { throw Error('invalid sequential'); }
        if(profile.hardwareAddress !== config.profile.hardwareAddress) { throw Error('invalid hardware address'); }
        if(profile.slew !== config.profile.slew) { throw Error('invalid slew'); }
        if(profile.interrupt.mirror !== config.profile.interrupt.mirror) { throw Error('invalid interrupt mirror'); }
        if(profile.interrupt.mode !== config.profile.interrupt.mode) { throw Error('invalid interrupt mode'); }
      });
  }
}

module.exports = { Device };
