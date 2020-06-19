/* eslint-disable promise/no-nesting */

// eslint-disable-next-line import/no-dynamic-require
function tryRequire(name) { try { return require(name); } catch (_) { console.log(name, 'unavailable'); return undefined; } } // eslint-disable-line global-require
// const i2c = tryRequire('i2c-bus');

const { I2CMockBus, I2CAddressedBus } = require('@johntalton/and-other-delights');

// local imports
const { Mcp23, Util, ConsoleUtil } = require('../');

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
    const [busNumber, busAddress] = config.bus.id;

    if(config.mock) {
      //
      const deviceDefinition_mcp23017 = { commandMask: 0xFF, register: { 1: {} }, registers: { 'BANK0': { 1: {} } } };
      // todo this method is called only once, move code to main
      I2CMockBus.addDevice(busNumber, busAddress, deviceDefinition_mcp23017);
    }

    const provider = config.mock ? I2CMockBus : i2c;
    return provider.openPromisified(busNumber)
      .then(bus => Mcp23.from(new I2CAddressedBus(bus, busAddress), { names: config.names }));
  }

  static _configure(config) {
    return Promise.resolve()
      .then(() => (config.resetOnStart ? config.client.softwareReset() : Promise.resolve()))
      .then(() => Device.configSniff(config))
      .then(guess => Device.configUpdateMode(config, guess))
      .then(() => config.client.profile())
      .then(profile => {
        console.log('# Initial Device Profile');
        ConsoleUtil.logProfile(profile);

        const [match, why] = Device.configValidateProfile(config, config.profile, profile);

        if(!match && config.setProfileOnStart) { console.log('about to over write profile -', why); }
        if(!match && !config.setProfileOnStart) { console.log('profile mismatch, no update (risky) -', why); }
        if(match && config.setProfileOnStart) { console.log('matching profile, redundant profile set'); }

        //
        const force = true;
        const pedanticValidation = true;

        if(config.setProfileOnStart && (force || !match)) {
          return config.client.setProfile(config.profile)
            .then(() => {
              if(!pedanticValidation) {
                console.log('profile after set (no re-read, profile is config)');
                ConsoleUtil.logProfile(config.profile);
                return;
              }

              return config.client.profile().then(identity => {
                const [identifyMatch, identityWhy] = Util.compairProfiles(config.profile, identity);
                if(!identifyMatch) { throw new Error('pedantic validation mismatch: ' + identityWhy); }
                console.log('passed pedantic validation');
                ConsoleUtil.logProfile(identity);
                return;
              });

            });
        }

        console.log('skipping profile set on startup');
        return;
      })
      .then(() => config.client.state())
      .then(state => {
        ConsoleUtil.logState(state);
        const effectiveExports = Device.configValidateExports(config, state);
        return Device.configExports(config, effectiveExports);
      });
  }


  static configSniff(config) {
    if(!config.sniffMode) {
      console.log('skipping sniff (you are trusting)');
      return Promise.resolve();
    }

    return config.client.sniffMode()
      .then(guess => {
        console.log('sniffMode guess', guess);
        return guess;
      });
  }

  static configUpdateMode(config, guess) {
    // guess can be undefined indicating we skipped any sniffing
    // the profiles mode can be false or a mode
    // false would indicate that the current mode should be used
    const curPM = config.profile.mode;
    const curCM = config.client.mode;

    if(guess === undefined) {
      if(curPM !== false && curPM === curCM) {
        console.log('no guess, matched profile and client (best effort)');
        return;
      }

      if(curPM === false) {
        console.log('no guess, profile agnostic, assume client (no net)');
        return;
      }

      console.log('no guess, assuming from profile mode (hope you are right)');
      // update working mode
      console.log(' update client cache', guess);
      config.client.mode = curPM;
      return;
    }

    if(guess === curCM) {
      if(curPM === false) {
        console.log('guess matches client, profile is mode agnostic');
        return;
      }

      if(curPM === guess) {
        console.log('guess matches client and profile');
        return;
      }

      console.log('guess matches client, profile will over write if set');
    }

    if(curPM === false) {
      console.log('updating client from guess, profile is mode agnostic');
    } else {
      console.log('updating client from guess, profile will override if set');
    }

    // update working mode
    console.log(' update client cache', guess);
    config.client.mode = guess;
  }

  static configValidateProfile(config, userProfile, activeProfile) {
    if(!config.validateProfileOnStart) {
      console.log('skipping profile validation');
      return [false, 'skipped'];
    }
    return Util.compairProfiles(userProfile, activeProfile);
  }


  static configValidateExports(config, state) {
    if(config.validateExports === false) {
      console.log('skipping existing export validation');
      return config.exports;
    }

    const effective = [];

    // our names should match as we init via our names map.
    // thus we need to walk each and validate configuration
    // state includes all names, use it to iterate
    state.gpios.forEach(gpio => {
      // do we have an export for this
      const exp = Util.exportFor(gpio.pin, config.exports);
      if(exp === undefined) {
        // nothing exported
        if(!Util.isDefaultGpio(gpio)) {
          if(config.adoptExistingExports) {
            // add to effectiveExports
            console.log('chip has configured gpio that is not defined by exports (adopting on update)');
            effective.push(gpio);
          } else {
            console.log('chip has configured gpio that is not defined by exports (no adopt, reset on update)');
            console.log('old', gpio);
          }
        }
      } else {
        // we have a defined export, if not configured, validate it matches
        if(Util.isDefaultGpio(gpio)) {
          console.log('chip has un-configured gpio, exports defined new (semi-safe to add on update)');
          effective.push(exp);
        } else {
          const [match, why] = Util.matchGpios(gpio, exp);
          if(match) {
            console.log('happy day, gpio and export match');
            effective.push(exp);
          } else {
            if(true) {
              console.log(' !! gpio / export mismatch - pick export', exp.pin, why);
              effective.push(exp);
            } else {
              console.log('gpio / export mismatch - pick gpio', gpio.pin, why);
              effective.push(gpio);
            }
          }
        }
      }
    });

    //
    return effective;
  }

  static configExports(config, exports) {
    if(config.setExportsOnStart === false) {
      console.log('skipping export of gpio');
      return Promise.resolve();
    }

    console.log('# configuring exports (this may be disruptive to attached io)');
    return config.client.exportAll(exports);
  }
}

module.exports = { Device };
