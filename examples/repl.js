const Repler = require('repler');
const { Rasbus } = require('@johntalton/rasbus');
const { Mcp23Gpio, ConsoleUtil, Util } = require('../');

const BASE_10 = 10;

function properParts(parts) { console.log('parts', parts);
  if(parts.length <= 0) { return [undefined]; }

  const pin = parseInt(parts[0], 10);

  if(parts.length === 1) {
    // read pin
    return [pin, false];
  }

  if(parts > 2) { throw Error('too many parts'); }

  // write pin
  const hl = parseInt(parts[1], 10);
  if(hl !== 1 && hl !== 0) { throw Error('value not high/low'); }

  return [pin, hl];
}


Repler.addPrompt(state => state.device !== undefined ? 'mcp23> ' : '> ');

Repler.addCommand({
  name: 'init',
  valid: state => state.device === undefined,
  callback: state => {
    const parts = state.line.split(' ').slice(1);
    if(parts.length !== 1) { return Promise.reject(Error('must pass address parameter')); }
    const address = parseInt(parts[0], BASE_10); // todo where is .first
    console.log('address', '0x' + address.toString(16));

    const type = 'i2c';
    const config = [ 1, address ]; // todo assume bus 1, sorry
    return Rasbus.bytype(type).init(...config)
      .then(bus => Mcp23Gpio.from(bus))
      .then(device => state.device = device);
  }
});

Repler.addCommand({
  name: 'sniff',
  valid: state => state.device !== undefined,
  callback: state => {
    return state.device.sniffMode().then(guess => {
      console.log('sniff mode guess', guess);
      state.device.mode = guess; // cached
    });
  }
});

Repler.addCommand({
  name: 'reset',
  valid: state => state.device !== undefined,
  callback: state => {
    return state.device.softwareReset().then(() => {
      console.log('software reset success');
    });
  }
});

Repler.addCommand({
  name: 'profile',
  valid: state => state.device !== undefined,
  callback: state => {
    return state.device.profile().then(profile => {
      console.log(ConsoleUtil.profileToString(profile));
    });
  }
});

Repler.addCommand({
  name: 'state',
  valid: state => state.device !== undefined,
  callback: state => {
    return state.device.state().then(s => {
      console.log('Gpio State', ConsoleUtil.stateToString(s));
    });
  }
});

Repler.addCommand({
  name: 'mode',
  valid: state => state.device !== undefined,
  callback: state => {
    const parts = state.line.split(' ');
    console.log('parts', parts);
    if(parts.length === 2) {
      // set mode
      console.log('setting mode to', parts[1]);
      state.device.mode = parts[1];
      return Promise.resolve();
    }

    console.log('mode currently is', state.device.mode);
    return Promise.resolve();
  }
});

Repler.addCommand({
  name: 'bulk',
  valid: state => state.device !== undefined,
  callback: state => {
    return state.device.bulkData().then(data => {
      console.log('read data', data);
    });
  }
});

Repler.addCommand({
  name: 'gpio',
  valid: state => state.device !== undefined,
  callback: state => {
    const parts = state.line.split(' ').slice(1);
    const [pin, whl] = properParts(parts);
    console.log('pin/whl', pin, whl);
    if(pin === undefined) { return Promise.reject(Error('undefined pin')); }

    if(whl === false) {
      // read mode
      return state.device.read(pin).then(result => console.log('result', result));
    }

    // write
    return state.device.write(pin, whl);
  }
});

Repler.addCommand({
  name: 'in',
  valid: state => state.device !== undefined,
  callback: state => {
    const parts = state.line.split(' ').slice(1);
    const [pin, whl] = properParts(parts);
    console.log('pin/whl', pin, whl);
    if(pin === undefined) { return Promise.reject(Error('undefined pin')); }

    if(whl === false) {
      // read mode
      return state.device.read(pin).then(result => console.log('result', result));
    }

    // write
    return state.device.write(pin, whl);
  }
});





Repler.go({ autologoutMs: 120 * 1000 });
