
const { BitUtil } = require('@johntalton/and-other-delights');
const Bank = require('./defines.js');

// for `.indexOf` return
const NOT_FOUND = -1;


//
const HIGH = 1;
const LOW = 0;

//
const BIT_SET = 1;
const BIT_UNSET = 0;

function NOT_BIT(bit) { return bit === BIT_SET ? BIT_UNSET : BIT_SET; }

//
const PORT_PACKMAP = BitUtil.REVERSE_TRUE_8_PACKMAP;
const REVERSE_PORT_PACKMAP = BitUtil.TRUE_8_PACKMAP;
const IOCON_PACKMAP = BitUtil.TRUE_8_PACKMAP;

//
const MIR_EN = BIT_SET;
const SEQ_EN = BIT_UNSET;
const SLEW_EN = BIT_UNSET;
const HWA_EN = BIT_SET;
const ODR_OPENDRAIN = BIT_SET;
const POL_ACTIVELOW = BIT_UNSET;

const MIR_DEN =  NOT_BIT(MIR_EN);
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
const DEFAULT_POL = POL_ACTIVELOW

const UNUSED_IOCON_BIT = BIT_UNSET; // they say the last bit is unset

const DEFAULT_IOCON = BitUtil.packbits(IOCON_PACKMAP,
  DEFAULT_MIR,
  DEFAULT_SEQ,
  DEFAULT_SLEW,
  DEFAULT_HWA,
  DEFAULT_ODR,
  DEFAULT_POL,
  UNUSED_IOCON_BIT
);

const MODE_8BIT_POLL = '8bit-poll';
const MODE_16BIT_POLL = '16bit-poll'; // AB Wobble
const MODE_DUAL_BLOCKS = 'dual-blocks';
const MODE_INTERLACED_BLOCK = 'interlaced-block'; // default

const INT_ACTIVE_LOW = 'active-low';
const INT_ACTIVE_HIGH = 'active-high';
const INT_OPEN_DRAIN = 'open-drain';

//
const DIRECTION_IN = 'in';
const DIRECTION_OUT = 'out';

const EDGE_NONE = 'none';
const EDGE_RISING = 'rising';
const EDGE_FALLING = 'falling';
const EDGE_BOTH = 'both';

const OLAT_LOGIC_HIGH = HIGH; // map to h/l as we export those for comparison
const OLAT_LOGIC_LOW = LOW;

/**
 *
 **/
class Converter {
  static toState(gpios, pinmap, profile) {
    const byPort = gpios.reduce((acc, gpio) => {
      // todo its a waist we don't pass down the foundIndex
      //  instead of recalculating it
      const ai = pinmap.portA.gpios.indexOf(gpio.pin);
      const bi = pinmap.portB.gpios.indexOf(gpio.pin);

      if(ai === NOT_FOUND && bi === NOT_FOUND) { throw Error('gpio pin not found: ' + gpio.pin); }
      if(ai !== NOT_FOUND && bi !== NOT_FOUND) { throw Error('giop found in both port maps'); }

      if(ai !== NOT_FOUND) { acc.a.push(gpio); }
      if(bi !== NOT_FOUND) { acc.b.push(gpio); }

      return acc;
    }, { a: [], b: [] });

    return {
      //iocon: Converter.toIocon(profile), // todo how to specify do-not-set
      a: Converter.toPortState(byPort.a, pinmap.portA),
      b: Converter.toPortState(byPort.b, pinmap.portB)
    };
  }

  static makeBit(offset, fill, value) {
    const tail = new Array(8 - offset - 1).fill(fill);
    const prams = new Array(offset).fill(fill).concat([value], tail);
    //console.log('prams', offset, prams);
    return BitUtil.packbits(PORT_PACKMAP, ...prams);
  }

  static makeSetBit(offset, value) {
    return Converter.makeBit(offset, BIT_UNSET, value);
  }

  static makeUnsetBit(offset, value) {
    return Converter.makeBit(offset, BIT_SET, value);
  }

  static toPortState(gpios, portPinmap) {
    return gpios.reduce((state, gpio) => {
      const pin = portPinmap.gpios.indexOf(gpio.pin);
      //console.log('to port state pin', pin, state);

      if(pin === undefined) { throw Error('pin not found in map: ' + gpio.pin); }
      if(!Number.isInteger(pin)) { throw Error('pin not resolved to integer: ' + gpio.pin + ' / ' + pin); }
      if(pin === NOT_FOUND) { throw Error('pin not found in map'); }
      if(pin < 0 || pin >= 8) { throw Error('pin range error 0 - 7' + pin); }

      const direction = gpio.direction === DIRECTION_IN ? BIT_SET : BIT_UNSET;
      const polarity = gpio.activeLow ? BIT_SET : BIT_UNSET;
      const pullup = gpio.pullup ? BIT_SET : BIT_UNSET;
      const [intenabled, intcontrol, defaultval] = Converter.toGpioInterrupt(gpio.edge);

      console.log('\tadding pin to state', gpio.pin, pin, direction, gpio.direction);
      console.log('\t\t', gpio.edge, intenabled, intcontrol, defaultval);

      const iodir = Converter.makeUnsetBit(pin, direction);
      const iopol = Converter.makeSetBit(pin, polarity);
      const gpinten = Converter.makeSetBit(pin, intenabled);
      const defval = Converter.makeSetBit(pin, defaultval);
      const intcon = Converter.makeSetBit(pin, intcontrol);
      const gppu = Converter.makeSetBit(pin, pullup);
      const olat = Converter.makeSetBit(pin, BIT_UNSET); // todo .. uhh


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
      iodir: 0xFF, // note the io dir start // todo make const
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
    case EDGE_NONE: return [BIT_UNSET, DNC, DNC]; break;
    case EDGE_RISING: return [BIT_SET, BIT_SET, LOW]; break; // todo
    case EDGE_FALLING: return [BIT_SET, BIT_SET, HIGH]; break; // todo correct directions?
    case EDGE_BOTH: return [BIT_SET, BIT_UNSET, DNC]; break;
    default: throw Error('unknown edge: ' + edge); break;
    }
  }

  static fromPortState(state, portNameMap) {
    // console.log('from port state', state);
    const directions = BitUtil.unpackbits(PORT_PACKMAP, state.iodir);
    const polarities = BitUtil.unpackbits(PORT_PACKMAP, state.iopol);
    const intEnableds = BitUtil.unpackbits(PORT_PACKMAP, state.gpinten);
    const defaultValues = BitUtil.unpackbits(PORT_PACKMAP, state.defval);
    const intControls = BitUtil.unpackbits(PORT_PACKMAP, state.intcon);
    const pullUps = BitUtil.unpackbits(PORT_PACKMAP, state.gppu);
    const intFlags = BitUtil.unpackbits(PORT_PACKMAP, state.intf);
    const olats = BitUtil.unpackbits(PORT_PACKMAP, state.olat);

    // our packmap is setup to return gpio pin info in acending
    // order.  thus we can use array 0 as pin 0 etc.
    // there are 8 pins in a port
    // todo global for pinsPerPort: 8, and the use ragne(8) here
    const pins = [0, 1, 2, 3, 4, 5, 6, 7];
    return pins.map(index => {
      const pin = portNameMap.gpios[index];
      const dir = directions[index] === BIT_SET ? DIRECTION_IN : DIRECTION_OUT;
      const alow = polarities[index] === BIT_SET;
      const pul = pullUps[index] === BIT_SET;
      const pint = intFlags[index] === BIT_SET;
      const inten = intEnableds[index] === BIT_SET;
      const defVal = defaultValues[index] === BIT_SET ? HIGH : LOW;
      const intCtrl = intControls[index] === BIT_SET;
      const olat = olats[index] === BIT_SET ? OLAT_LOGIC_HIGH : OLAT_LOGIC_LOW;

      return {
        port: portNameMap.name,
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

  static fromGpioInterrupt(inten, ctrl, dVal) {
    // console.log('make gpio int from ', inten, ctrl, dVal);
    if(!inten) { return EDGE_NONE; }
    if(!ctrl) { return EDGE_BOTH; }
    return dVal === HIGH ? EDGE_FALLING : EDGE_RISING; // todo correct direction?
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
    const i = mi !== undefined ? mi : il

    // console.log('toIocon', b, m, s, d, h, o, i, 0, obj);

    return BitUtil.packbits(IOCON_PACKMAP, b, m, s, d, h, o, i, UNUSED_IOCON_BIT);
  }

  static toIoconInterrupt(mode) {
    if(mode === undefined) { return []; }
    if(mode === INT_OPEN_DRAIN) { return [ODR_OPENDRAIN, POL_ACTIVELOW]; }
    if(mode === INT_ACTIVE_LOW) { return [ODR_ACTIVEDRIVER, POL_ACTIVELOW]; }
    if(mode === INT_ACTIVE_HIGH) { return [ODR_ACTIVEDRIVER, POL_ACTIVEHIGH]; }
    throw Error('unknonw iocon interrupt mode: ' + mode);
  }

  static fromIocon(iocon) {
    const [b, m, s, d, h, o, i, u] = BitUtil.unpackbits(IOCON_PACKMAP, iocon);

    const bank = b === 0 ? Bank.BANK0 : Bank.BANK1;
    const mirror = m === MIR_EN
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
    if(bank === Bank.BANK0 && sequential) { return MODE_INTERLACED_BLOCK; }
    if(bank === Bank.BANK0 && !sequential) { return MODE_16BIT_POLL; }
    if(bank === Bank.BANK1 && sequential) { return MODE_DUAL_BLOCKS; }
    if(bank === Bank.BANK1 && !sequential) { return MODE_8BIT_POLL; }
    throw Error('unknown mode / sequentail: ' + bank + ' / ' + sequential);
  }

  static toIoconMode(mode) {
    if(mode === MODE_INTERLACED_BLOCK) { return { bank: Bank.BANK0, sequential: true }; }
    if(mode === MODE_DUAL_BLOCKS) { return { bank: Bank.BANK1, sequential: true }; }
    if(mode === MODE_16BIT_POLL) { return { bank: Bank.BANK0, sequential: false }; }
    if(mode === MODE_8BIT_POLL) { return { bank: Bank.BANK1, sequential: false }; }
    throw Error('unknonw mode');
  }

  static fromIoconInterrupt(odEn, activeLow) {
    return odEn ? INT_OPEN_DRAIN : activeLow ? INT_ACTIVE_LOW : INT_ACTIVE_HIGH;
  }
}

Converter.HIGH = HIGH;
Converter.LOW = LOW;

module.exports = { Converter };
