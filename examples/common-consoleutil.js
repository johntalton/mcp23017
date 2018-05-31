const { Util } = require('./common-util.js');

class ConsoleUtil {
  static logProfile(profile) {
    console.log(ConsoleUtil.profileToString(profile));
  }

  static logState(state) {
    console.log(ConsoleUtil.stateToString(profile));
  }

  static logGpio(gpio) {
    console.log(ConsoleUtil.gpioToString(profile));
  }


  static profileToString(profile) {
    const slewStr = profile.slew ? 'true' : 'false (slow-mode)';
    const intStr = (profile.interrupt.mirror ? 'mirrored' : '') + profile.interrupt.mode;
    return 'Operational Mode: ' + profile.mode + '\n' +
      ' slew: ' + slewStr + ' / hw addressing: ' + profile.hardwareAddress + '\n' +
      ' interrupt ' + intStr;
  }

  static stateToString(state) {
    const skipDefaults = true; // todo move out

    const profileStr = ConsoleUtil.profileToString(state.profile) + '\n';
    return state.gpios.reduce((acc, gpio) => {
      if(skipDefaults && Util.isDefaultGpio(gpio)) { return acc; }
      return acc + ConsoleUtil.gpioToString(gpio) + '\n';
    }, profileStr);
  }

  static gpioToString(gpio) {
    const lines = [];

    if(gpio.direction === 'in') { // todo should we use const here or is string a better interface
      lines.push('\u21E6 Input Port: ' + gpio.port + ' Pin: ' + gpio.pin + ' Edge: ' + gpio.edge);
      if(gpio.pendingInterrupt) { lines.push('  \uD83D\uDD14 pending interrupt'); }
    }
    else if(gpio.direction === 'out'){
      lines.push('\u21E8 Ouptput Port: ' + gpio.port + ' Pin: ' + gpio.pin);
    }
    else { throw Error('unknown direction ' + gpio.direction); }

    lines.push('  active-low: ' + gpio.activeLow);
    lines.push('  pull-up: ' + (gpio.pullup ? 'enabled 100 k\u2126' : 'disabled'));

    return lines.join('\n');
  }
}


module.exports = { ConsoleUtil };
