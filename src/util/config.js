const aod = require('@johntalton/and-other-delights');
const { DEFAULT_NAMES } = require('../names.js');

class ConfigUtil {
  static normalizeDevice(device, fallbackName) {
    const fallback = fallbackName !== undefined ? falbackName.toString() : 'todo_random_name';
    const name = device.name !== undefined ? device.name : fallback;
    const active = device.active !== undefined ? device.active : true;

    const intA = device.interruptA;
    const intB = device.interruptB;

    const resetOS = device.resetOnStart !== undefined ? device.resetOnStart : false; // done not clobber anything, safe
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
      interruptA: intA,
      interruptB: intB,

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
      const { pin, port } = exp;

      if(type === 'gpio' && pin === undefined) { throw Error('gpio must specify pin'); }
      if(type === 'port' && port === undefined) { throw Error('port must specify ... uh, port'); }

      const dir = exp.direction !== undefined ? exp.direction : 'out'; // todo default_direction
      const edge = exp.edge !== undefined ? exp.edge : 'none'; // todo default_edge
      const activeLow = exp.activeLow !== undefined ? exp.activeLow : false; // default_activeLow
      const pullUp = exp.pullUp !== undefined ? exp.pullUp : false; // todo default_pullUp

      // todo, if this is an output then direction of "high" or "low" should control initial latch
      const olatch = exp.outputLatch !== undefined ? exp.outputLatch : false; // todo match value?

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
        pullUp: pullUp,
        outputLatch: olatch,

        pinOrder: pinOrder
      };
    });
  }

  static normalizeNames(names) {
    if(names === undefined) {
      return DEFAULT_NAMES;
    }

    return names; // todo
  }

  static normalizeProfile(profile) {
    const mutable = profile.mutable !== undefined ? profile.mutable : true;

    const slew = profile.slew !== undefined ? profile.slew : true;
    const hwAddr = profile.hardwareAddress !== undefined ? profile.hardwareAddress : true; // todo this is not power on default
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
    const ODR_ALOW_OPEN_DRAIN = [true, false];
    const ODR_ALOW_ACTIVE_LOW = [false, true];
    const ODR_ALOW_ACTIVE_HIGH = [false, false];
    const ODR_ALOW_DEFAULT = ODR_ALOW_OPEN_DRAIN; // todo this is not the chips default

    if(mode === undefined) { return ODR_ALOW_DEFAULT; }

    const intModeOdrAlowMap = [ // todo keys should be const values
      { key: 'open-drain', odrAlow: ODR_ALOW_OPEN_DRAIN },
      { key: 'active-low', odrAlow: ODR_ALOW_ACTIVE_LOW },
      { key: 'active-high', odrAlow: ODR_ALOW_ACTIVE_HIGH }
    ];

    const item = intModeOdrAlowMap.find(kvp => kvp.key === mode);
    if(item === undefined) { throw Error('unknown mode: ' + mode); }
    return item.odrAlow;
  }
}

module.exports = { ConfigUtil };
