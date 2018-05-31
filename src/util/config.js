
class ConfigUtil {
  static normalizeDevice(device, idx) {
    const name = device.name !== undefined ? device.name : idx.toString(10);
    const active = device.active !== undefined ? device.active : true;

    const resetOS = device.resetOnStart !== undefined ? device.resetOnStart : false; // done not clober anything, safe
    const sniffMode = device.sniffMode !== undefined ? device.sniffMode : true;
    const setPoS = device.setProfileOnStart !== undefined ? device.setProfileOnStart : true;
    const validPoS = device.validateProfileOnStart !== undefined ? device.validateProfileOnStart : true;

    const setEoS = device.setExportsOnStart !== undefined ? device.setExportsOnStart : false; // stay safe out there cowboy
    const validEoS = device.validateExportsOnStart !== undefined ? device.validateExportsOnStart : true; // sure
    const adoptE = device.adoptExistingExports !== undefined ? device.adoptExistingExports : true; // play it safe again

    return {
      name: name,
      active: active,
      bus: { ...device.bus },

      resetOnStart: resetOS,
      sniffMode: sniffMode,

      setProfileOnStart: setPoS,
      validateProfileOnStart: validPoS,

      profile: ConfigUtil.normalizeProfile(device.profile),

      names: ConfigUtil.normalizeNames(device.names),

      setExportsOnStart: setEoS,
      validateExportsOnStart: validEoS,
      adoptExistingExports: adoptE,
      exports: ConfigUtil.normalizeExports(device.exports)
    };
  }

  static normalizeExports(exports) {
    return exports.map((exp, index) => {
      const name = exp.name !== undefined ? exp.name : index;
      const type = exp.type !== undefined ? exp.type : 'gpio';
      const active = exp.active !== undefined ? exp.active : true;
      const pin = exp.pin;
      const port = exp.port;

      if(type === 'gpio' && pin === undefined) { throw Error('gpio must specify pin'); }
      if(type === 'port' && port === undefined) { throw Error('port must specify ... uh, port')}

      const dir = exp.direction !== undefined ? exp.direction : 'out'; // todo default_directyion
      const edge = exp.edge !== undefined ? exp.edge : 'none'; // todo default_edge
      const activeLow = exp.activeLow !== undefined ? exp.activeLow : false; // default_activeLow
      const pullup = exp.pullup !== undefined ? exp.pullup : false; // todo default_pullup

      const pinOrder = exp.pinOrder !== undefined ? exp.pinOrder : [];

      return {
        name: name,
        type: type,
        active: active,

        pin: pin,
        port: port,

        direction: dir,
        edge: edge,
        activeLow: activeLow,
        pullup: pullup,

        pinOrder: pinOrder
      };
    });
  }

  static normalizeNames(names) { return names; } // todo

  static normalizeProfile(profile) {
    const mutable = profile.mutable !== undefined ? profile.mutable : true;

    const slew = profile.slew !== undefined ? profile.slew : true;
    const hwAddr = profile.hardwareAddress !== undefined ? profile.hardwareAddress : false;
    const int = profile.interrupt !== undefined ? profile.interrupt : { };

    const mode = profile.mode !== undefined ? profile.mode : false;

    return {
      mutable: mutable,

      mode: mode,
      slew: slew,
      hardwareAddress: hwAddr,

      interrupt: ConfigUtil.normalizeInterrupt(int)
    };
  }

  static normalizeInterrupt(interrupt) {
    const mirror = interrupt.mirror !== undefined ? interrupt.mirror : false;
    const [odr, alow] = ConfigUtil.normalizeProfileInterruptMode(interrupt.mode);

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

module.exports = { ConfigUtil };
