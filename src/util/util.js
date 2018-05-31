
class Util {
  static isDefaultGpio(gpio) { // todo these function have knowledge (move out)
    if(gpio.direction !== 'in') { return false; }
    if(gpio.pullup !== false) { return false; }
    if(gpio.activeLow !== false) { return false; }
    if(gpio.edge !== 'none') { return false; }
    return true;
  }

  static compairProfiles(userProfile, activeProfile) {
    //console.log('# Validating active device profile');
    // Util.logProfile(activeProfile);

    const ap = activeProfile;
    const up = userProfile;

    // todo less hardcod
    if(ap.mode !== up.mode) { return [false, 'invalid mode']; }
    if(ap.hardwareAddress !== up.hardwareAddress) { return [false, 'invalid hardware address']; }
    if(ap.slew !== up.slew) { return [false, 'invalid slew']; }
    if(ap.interrupt.mirror !== up.interrupt.mirror) { return [false, 'invalid interrupt mirror']; }
    if(ap.interrupt.mode !== up.interrupt.mode) { return [false, 'invalid interrupt mode']; }

    return [true, ''];
  }

  static matchGpios(exportGpio, activeGpio) { // todo these function have knowledge (move out)
    if(exportGpio.direction !== activeGpio.direction) { return [false, 'direction']; }
    if(exportGpio.pullup !== activeGpio.pullup) { return [false, 'pullup']; }
    if(exportGpio.activeLow !== activeGpio.activeLow) { return [false, 'activeLow']; }
    if(exportGpio.mode !== activeGpio.mode) { return [false, 'mode']; }
    return [true, ''];
  }

  static exportFor(pin, exports) {
    // find Words // todo
    // find Bytes // todo
    // find Bits
    const bits = exports.find(exp => exp.pin === pin);

    return bits;
  }

}

module.exports = { Util };
