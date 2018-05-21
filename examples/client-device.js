
// 1st party imports
const rasbus = require('rasbus');

// local imports
const { Mcp23 } = require('../');



class Util {
  static logProfile(profile) {
    //console.log(profile);
    console.log('#');
    console.log('# Operational Mode ', profile.mode);
    console.log('#  Slew', profile.slew, (profile.slew ? '' : '(slow-mode)'), 'hwAddr', profile.hardwareAddress);
    console.log('#  Interrupt', profile.interrupt.mirror ? 'mirror' : '', profile.interrupt.mode);
    console.log('#');
  }

  static logState(state) {
    console.log('#');
    Util.logProfile(state.profile);
    state.gpios.forEach(Util.logGpio);
    console.log('#');
  }

  static logGpio(gpio) {
    if(gpio.direction === 'in') { // todo should we use const here or is string a better interface
      console.log('#  \u21E6 Input Port:', gpio.port, 'Pin:', gpio.pin, '(edge', gpio.mode, 'activeLow', gpio.activeLow + ')');
      if(gpio.interruptEnabled) {
        if(gpio.pendingInterrupt) { console.log('#   \uD83D\uDD14 (pending interrupt) \uD83D\uDECE'); }
      }
      else {
        console.log('#   interrupts disabled');
      }
    }
    else if(gpio.direction === 'out'){
      console.log('#  \u21E8 Ouptput Port:', gpio.port, 'Pin:', gpio.pin);
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
      .then(() => config.client.softwareReset())
      .then(() => Device.configSniff(config))
      .then(guess => Device.configUpdateBank(config, guess))
      .then(() => config.client.profile())
      .then(profile => {
        console.log('# Initial Device Profile');
        Util.logProfile(profile);

        const [match, why] = Device.configValidateProfile(config, config.profile, profile);

        if(!match && config.setProfileOnStart) { console.log('about to overrite profile -', why); }
        if(!match && !config.setProfileOnStart) { console.log('profile missmatch, no update (risky) -', why); }
        if(match && config.setProfileOnStart) { console.log('matching profile, redundent profile set'); }

        //
        const force = true;
        const pedanticValidation = true;

        if(config.setProfileOnStart && (force || !match)) {
          return config.client.setProfile(config.profile)
            .then(() => {
              if(!pedanticValidation) {
                console.log('profile after set (no re-read, profile is config)')
                Util.logProfile(config.profile);
                return Promise.resolve();
              }

              return config.client.profile().then(profile => {
                const [match, why] = Device.configValidateProfile(config, config.profile, profile);
                if(!match) { throw Error('pedantic validation missmatch: ' + why); }
                console.log('passed pedantic validation');
                Util.logProfile(profile);
              });
            });
        }
        else {
          console.log('skipping profile set on startup');
        }
        return Promise.resolve();
      })
      .then(() => config.client.state())
      .then(state => {
        const effectiveExports = Device.configValidateExports(config, state)
        return Device.configExports(config, effectiveExports);
      });
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

  static configValidateProfile(config, userProfile, activeProfile) {
    if(!config.validateProfileOnStart) {
      console.log('skipping profile validation');
      return [false, 'skipped'];
    }

    //console.log('# Validating active device profile');
    // Util.logProfile(activeProfile);

    // todo less hardcody
    if(activeProfile.mode !== userProfile.mode) { return [false, 'invalid mode']; }
    if(activeProfile.hardwareAddress !== userProfile.hardwareAddress) { return [false, 'invalid hardware address']; }
    if(activeProfile.slew !== userProfile.slew) { return [false, 'invalid slew']; }
    if(activeProfile.interrupt.mirror !== userProfile.interrupt.mirror) { return [false, 'invalid interrupt mirror']; }
    if(activeProfile.interrupt.mode !== userProfile.interrupt.mode) { return [false, 'invalid interrupt mode']; }

    return [true, ''];
  }

  static exportFor(pin, exports) {
    // find Words // todo
    // find Bytes // todo
    // find Bits
    const bits = exports.find(exp => exp.pin === pin);

    return bits;
  }

  static isDefaultGpio(gpio) { // todo these function have knowledge (move out)
    if(gpio.direction !== 'out') { return false; }
    if(gpio.pullup !== false) { return false; }
    if(gpio.activeLow !== false) { return false; }
    if(gpio.mode !== 'none') { return false; }
    return true;
  }

  static matchGpios(exportGpio, activeGpio) { // todo these function have knowledge (move out)
    if(exportGpio.direction !== activeGpio.direction) { return [false, 'direction']; }
    if(exportGpio.pullup !== activeGpio.pullup) { return [false, 'pullup']; }
    if(exportGpio.activeLow !== activeGpio.activeLow) { return [false, 'activeLow']; }
    if(exportGpio.mode !== activeGpio.mode) { return [false, 'mode']; }
    return [true, ''];
  }

  static configValidateExports(config, state) {
    if(config.validateExports === false) {
      console.log('skipping existing export validation');
      return config.exports;
    }

    const effective = [];

    // our names should match as we inited via our names map.
    // thus we need to walk each and validate configuration
    // state includes all names, use it to iterate
    state.gpios.forEach(gpio => {
      // do we have an export for this
      const exp = Device.exportFor(gpio.pin, config.exports);
      if(exp === undefined) {
        // nothing exported
        if(!Device.isDefaultGpio(gpio)) {
          if(config.adoptExistingExports) {
            // add to effectiveExports
            console.log('chip has configured gpio that is not defined by exports (adopting on update)');
            effective.push(gpio);
          }
          else {
            console.log('chip has configured gpio that is not defined by exports (no adopt, reseting on update)');
            console.log('old', gpio);
          }
        }
      }
      else {
        // we have a defined export, if not configured, validate it matches
        if(Device.isDefaultGpio(gpio)) {
          console.log('chip has unconfigured gpio, exports defined new (semi-safe to add on update)');
          effective.push(exp);
        }
        else {
          const [match, why] = Device.matchGpios(gpio, exp);
          if(match) {
            console.log('happy day, gpio and export match');
            effective.push(exp);
          }
          else {
            if(true) {
              console.log(' !! gpio / export missmatch - pick export', exp.pin, why);
              effective.push(exp)
            }
            else {
              console.log('gpio / export missmatch - pick gpio', gpio.pin, why);
              effective.push(gpio)
            }
          }
        }
      }
    });

    //
    return effective;
  }

  static configExports(config, exports) {
    if(config.export === false) {
      console.log('skiping export of gpio');
      return Promise.resolve();
    }

    console.log('# configuring exports (this may be distruptive to attached io)');
    return config.client.exportAll(exports);
  }
}

module.exports = { Device };
