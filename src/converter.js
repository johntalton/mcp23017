/* eslint-disable no-bitwise */

const { BitUtil } = require('@johntalton/and-other-delights');
const {
  Bank,
  DigitalIO,
  ProfileMode,
  InterruptMode,
  CommonMode,
  Direction,
  Edge
} = require('./defines.js');

// for `.indexOf` return
const NOT_FOUND = -1;

//
const IODIR_BASE_VALUE = 0xFF;
// const IODIR_DEFAULT_VALUE = 0xFF;

//
const BIT_SET = 1;
const BIT_UNSET = 0;

function NOT_BIT(bit) { return bit === BIT_SET ? BIT_UNSET : BIT_SET; }

//
const PORT_PACKMAP = BitUtil.REVERSE_TRUE_8_PACKMAP;
const IOCON_PACKMAP = BitUtil.TRUE_8_PACKMAP;

//
const MIR_EN = BIT_SET;
const SEQ_EN = BIT_UNSET;
const SLEW_EN = BIT_UNSET;
const HWA_EN = BIT_SET;
const ODR_OPENDRAIN = BIT_SET;
const POL_ACTIVELOW = BIT_UNSET;

const MIR_DEN = NOT_BIT(MIR_EN);
const SEQ_DEN = NOT_BIT(SEQ_EN);
const SLEW_DEN = NOT_BIT(SLEW_EN);
const HWA_DEN = NOT_BIT(HWA_EN);
const ODR_ACTIVEDRIVER = NOT_BIT(ODR_OPENDRAIN);
const POL_ACTIVEHIGH = NOT_BIT(POL_ACTIVELOW);

const DEFAULT_MIR = MIR_DEN;
const DEFAULT_SEQ = SEQ_EN;
const DEFAULT_SLEW = SLEW_EN;
const DEFAULT_HWA = HWA_DEN;
const DEFAULT_ODR = ODR_ACTIVEDRIVER;
const DEFAULT_POL = POL_ACTIVELOW;

const UNUSED_IOCON_BIT = BIT_UNSET; // they say the last bit is unset

const DEFAULT_IOCON = BitUtil.packbits(
  IOCON_PACKMAP,
  DEFAULT_MIR,
  DEFAULT_SEQ,
  DEFAULT_SLEW,
  DEFAULT_HWA,
  DEFAULT_ODR,
  DEFAULT_POL,
  UNUSED_IOCON_BIT
);

const OLAT_LOGIC_HIGH = DigitalIO.HIGH; // map to h/l as we export those for comparison
const OLAT_LOGIC_LOW = DigitalIO.LOW;

/**
 *
 **/
class Converter {
  static toHighLow(high) {
    return high ? DigitalIO.HIGH : DigitalIO.LOW;
  }

  static bitFlagToPinSet(value, portPinmap) {
    const bits = BitUtil.unpackbits(PORT_PACKMAP, value);
    // now zip the arrays and test set as bit high.
    return portPinmap.gpios.map((name, i) => ({ pin: name, set: bits[i] === DigitalIO.HIGH }));
  }

  static calculateNewPinValue(current, pin, value, portPinmap) {
    const index = portPinmap.gpios.indexOf(pin);
    if(index === NOT_FOUND) { console.log(portPinmap); throw Error('gpio pin not found: ' + pin); }

    const currentBits = BitUtil.unpackbits(PORT_PACKMAP, current);

    if(currentBits[index] === value) { console.log('REDUNDANT BIT SET'); }

    currentBits[index] = value;

    const pb = BitUtil.packbits(PORT_PACKMAP, ...currentBits);
    console.log('converter calculate pin value', current, pin, value, index, currentBits, pb.toString(16));
    return pb;
  }

  static toState(gpios, pinmap, profile) {
    const byPort = gpios.reduce((acc, gpio) => {
      // todo its a waist we don't pass down the foundIndex
      //  instead of recalculating it
      const ai = pinmap.portA.gpios.indexOf(gpio.pin);
      const bi = pinmap.portB.gpios.indexOf(gpio.pin);

      if(ai === NOT_FOUND && bi === NOT_FOUND) { throw Error('gpio pin not found: ' + gpio.pin); }
      if(ai !== NOT_FOUND && bi !== NOT_FOUND) { throw Error('gpio found in both port maps'); }

      if(ai !== NOT_FOUND) { acc.a.push(gpio); }
      if(bi !== NOT_FOUND) { acc.b.push(gpio); }

      return acc;
    }, { a: [], b: [] });

    return {
      // iocon: Converter.toIocon(profile), // todo how to specify do-not-set
      a: Converter.toPortState(byPort.a, pinmap.portA),
      b: Converter.toPortState(byPort.b, pinmap.portB)
    };
  }

  // ----
  // todo these don't seem to be in the correct class

  static makeBit(offset, fill, value) {
    const tail = new Array(8 - offset - 1).fill(fill);
    const prams = new Array(offset).fill(fill).concat([value], tail);
    // console.log('prams', offset, prams);
    return BitUtil.packbits(PORT_PACKMAP, ...prams);
  }

  static makeSetBit(offset, value) {
    return Converter.makeBit(offset, BIT_UNSET, value);
  }

  static makeUnsetBit(offset, value) {
    return Converter.makeBit(offset, BIT_SET, value);
  }

  // -----

  static toPortState(gpios, portPinmap) {
    return gpios.reduce((state, gpio) => {
      const pin = portPinmap.gpios.indexOf(gpio.pin);
      // console.log('to port state pin', pin, state);

      if(pin === undefined) { throw Error('pin not found in map: ' + gpio.pin); }
      if(!Number.isInteger(pin)) { throw Error('pin not resolved to integer: ' + gpio.pin + ' / ' + pin); }
      if(pin === NOT_FOUND) { throw Error('pin not found in map'); }
      if(pin < 0 || pin >= 8) { throw Error('pin range error 0 - 7' + pin); }

      const direction = gpio.direction === Direction.DIRECTION_IN ? BIT_SET : BIT_UNSET;
      const polarity = gpio.activeLow ? BIT_SET : BIT_UNSET;
      const pullup = gpio.pullup ? BIT_SET : BIT_UNSET;
      const [intenabled, intcontrol, defaultval] = Converter.toGpioInterrupt(gpio.edge);
      const outputLatch = gpio.olat ? BIT_UNSET : BIT_SET;

      console.log('\tadding pin to state', gpio.pin, pin, direction, gpio.direction);
      console.log('\t\t', gpio.edge, intenabled, intcontrol, defaultval);

      const iodir = Converter.makeUnsetBit(pin, direction); // unset
      const iopol = Converter.makeSetBit(pin, polarity);
      const gpinten = Converter.makeSetBit(pin, intenabled);
      const defval = Converter.makeSetBit(pin, defaultval);
      const intcon = Converter.makeSetBit(pin, intcontrol);
      const gppu = Converter.makeSetBit(pin, pullup);
      const olat = Converter.makeSetBit(pin, outputLatch);

      return {
        iodir: state.iodir & iodir, // not the iodir And
        iopol: state.iopol | iopol,
        gpinten: state.gpinten | gpinten,
        defval: state.defval | defval,
        intcon: state.intcon | intcon,
        gppu: state.gppu | gppu,
        olat: state.olat | olat
      };
    }, {
      iodir: IODIR_BASE_VALUE, // note the iodir start value
      iopol: 0,
      gpinten: 0,
      defval: 0,
      intcon: 0,
      gppu: 0,
      olat: 0
    });
  }

  static toGpioInterrupt(edge) {
    const DNC = BIT_SET; // todo this creates a signature for out interactions

    switch(edge) {
      case Edge.EDGE_NONE: return [BIT_UNSET, DNC, DNC]; break;
      case Edge.EDGE_RISING: return [BIT_SET, BIT_SET, DigitalIO.LOW]; break; // todo
      case Edge.EDGE_FALLING: return [BIT_SET, BIT_SET, DigitalIO.HIGH]; break; // todo correct directions?
      case Edge.EDGE_BOTH: return [BIT_SET, BIT_UNSET, DNC]; break;
      default: throw Error('unknown edge: ' + edge); break;
    }
  }

  static fromPortState(state, portPinmap) {
    // console.log('from port state', state);
    const directions = BitUtil.unpackbits(PORT_PACKMAP, state.iodir);
    const polarities = BitUtil.unpackbits(PORT_PACKMAP, state.iopol);
    const intEnableds = BitUtil.unpackbits(PORT_PACKMAP, state.gpinten);
    const defaultValues = BitUtil.unpackbits(PORT_PACKMAP, state.defval);
    const intControls = BitUtil.unpackbits(PORT_PACKMAP, state.intcon);
    const pullUps = BitUtil.unpackbits(PORT_PACKMAP, state.gppu);
    const intFlags = BitUtil.unpackbits(PORT_PACKMAP, state.intf);
    const olats = BitUtil.unpackbits(PORT_PACKMAP, state.olat);

    // our port pin map is setup to return gpio pin info in ascending
    // order.  thus we can use array 0 as pin 0 etc.
    // there are 8 pins in a port
    // todo global for pinsPerPort: 8, and the use range(8) here
    const pins = [0, 1, 2, 3, 4, 5, 6, 7];
    return pins.map(index => {
      const pin = portPinmap.gpios[index];
      const dir = directions[index] === BIT_SET ? Direction.DIRECTION_IN : Direction.DIRECTION_OUT;
      const alow = polarities[index] === BIT_SET;
      const pul = pullUps[index] === BIT_SET;
      const pint = intFlags[index] === BIT_SET;
      const inten = intEnableds[index] === BIT_SET;
      const defVal = defaultValues[index] === BIT_SET ? DigitalIO.HIGH : DigitalIO.LOW;
      const intCtrl = intControls[index] === BIT_SET;
      const olat = olats[index] === BIT_SET ? OLAT_LOGIC_HIGH : OLAT_LOGIC_LOW;

      return {
        port: portPinmap.name,
        pin: pin,
        direction: dir,
        pullup: pul,
        activeLow: alow,
        pendingInterrupt: pint,
        edge: Converter.fromGpioInterrupt(inten, intCtrl, defVal),
        outputLatch: olat
      };
    });
  }

  static fromGpioInterrupt(gpinten, ctrl, dVal) {
    if(!gpinten) { return Edge.EDGE_NONE; }
    if(!ctrl) { return Edge.EDGE_BOTH; }
    return dVal === DigitalIO.HIGH ? Edge.EDGE_FALLING : Edge.EDGE_RISING; // todo correct direction?
  }

  static toIocon(profile) {
    const mode = Converter.toIoconMode(profile.mode);

    const b = mode.bank;
    const s = mode.sequential ? SEQ_EN : SEQ_DEN;
    const m = profile.interrupt.mirror ? MIR_EN : MIR_DEN;
    const d = profile.slew ? SLEW_EN : SLEW_DEN;
    const h = profile.hardwareAddress ? HWA_EN : HWA_DEN;

    const [mo, mi] = Converter.toIoconInterrupt(profile.interrupt.mode);
    const od = profile.interrupt.openDrain ? ODR_OPENDRAIN : ODR_ACTIVEDRIVER;
    const il = profile.interrupt.activeLow ? POL_ACTIVELOW : POL_ACTIVEHIGH;
    const o = mo !== undefined ? mo : od;
    const i = mi !== undefined ? mi : il;

    // console.log('toIocon', b, m, s, d, h, o, i, 0, obj);

    return BitUtil.packbits(IOCON_PACKMAP, b, m, s, d, h, o, i, UNUSED_IOCON_BIT);
  }

  static toIoconInterrupt(mode) {
    if(mode === undefined) { throw Error('undefined interrupt mode'); }

    const POL_DNC = POL_ACTIVELOW; // todo can be made to signature
    const lookup = [
      { key: InterruptMode.INT_OPEN_DRAIN, odrPol: [ODR_OPENDRAIN, POL_DNC] },
      { key: InterruptMode.INT_ACTIVE_LOW, odrPol: [ODR_ACTIVEDRIVER, POL_ACTIVELOW] },
      { key: InterruptMode.INT_ACTIVE_HIGH, odrPol: [ODR_ACTIVEDRIVER, POL_ACTIVEHIGH] }
    ];

    const item = lookup.find(kvp => kvp.key === mode);
    if(item === undefined) { throw Error('unknown iocon interrupt mode: ' + mode); }

    return item.odrPol;
  }

  static fromIocon(iocon) {
    const [b, m, s, d, h, o, i, u] = BitUtil.unpackbits(IOCON_PACKMAP, iocon);

    const bank = b === 0 ? Bank.BANK0 : Bank.BANK1;
    const mirror = m === MIR_EN;
    const sequential = s === SEQ_EN;
    const slew = d === SLEW_EN;
    const hwaddr = h === HWA_EN;
    const opendrain = o === ODR_OPENDRAIN;
    const activelow = i === POL_ACTIVELOW;

    // sanity check, according to doc, always zero
    if(u !== 0) { throw Error('iocon unpack error / zero bit'); }

    // console.log('fromIocon', iocon.toString(2), b, m, s, d, h, o, i);

    return {
      bank: bank,
      sequential: sequential,
      mode: Converter.fromIoconMode(bank, sequential),
      slew: slew,
      hardwareAddress: hwaddr,
      interrupt: {
        mirror: mirror,
        mode: Converter.fromIoconInterrupt(opendrain, activelow),
        openDrain: opendrain,
        activeLow: activelow
      }
    };
  }

  static fromIoconMode(bank, sequential) {
    if(bank === Bank.BANK0 && sequential) { return ProfileMode.MODE_INTERLACED_BLOCK; }
    if(bank === Bank.BANK0 && !sequential) { return ProfileMode.MODE_16BIT_POLL; }
    if(bank === Bank.BANK1 && sequential) { return ProfileMode.MODE_DUAL_BLOCKS; }
    if(bank === Bank.BANK1 && !sequential) { return ProfileMode.MODE_8BIT_POLL; }
    throw Error('unknown mode / sequential: ' + bank + ' / ' + sequential);
  }

  static toIoconMode(mode) {
    if(mode === ProfileMode.MODE_INTERLACED_BLOCK) { return CommonMode.MODE_MAP_INTERLACED_BLOCK; }
    if(mode === ProfileMode.MODE_DUAL_BLOCKS) { return CommonMode.MODE_MAP_DUAL_BLOCKS; }
    if(mode === ProfileMode.MODE_16BIT_POLL) { return CommonMode.MODE_MAP_16BIT_POLL; }
    if(mode === ProfileMode.MODE_8BIT_POLL) { return CommonMode.MODE_MAP_8BIT_POLL; }
    throw Error('unknown mode: ' + mode);
  }

  static fromIoconInterrupt(odEn, activeLow) {
    if(odEn) { return InterruptMode.INT_OPEN_DRAIN; }
    if(activeLow) { return InterruptMode.INT_ACTIVE_LOW; }
    return InterruptMode.INT_ACTIVE_HIGH;
  }
}

module.exports = { Converter };
