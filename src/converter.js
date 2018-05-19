
const { BitUtil } = require('and-other-delights');

//
const BANK0 = 0; // ABAB
const BANK1 = 1; // AA BB

//
const HIGH = 1;
const LOW = 0;

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
  static fromPortState(state) {
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
    return pins.map(pin => {
      const dir = directions[pin] === BIT_SET ? DIRECTION_OUT : DIRECTION_IN;
      const alow = polarities[pin] === BIT_SET;
      const pul = pullUps[pin] === BIT_SET;
      const pint = intFlags[pin] === BIT_SET;
      const inten = intEnableds[pin] === BIT_SET;
      const defVal = defaultValues[pin] === BIT_SET ? HIGH : LOW;
      const intCtrl = intControls[pin] === BIT_SET;
      const olat = olats[pin] === BIT_SET ? OLAT_LOGIC_HIGH : OLAT_LOCIG_LOW;

      return {
        pin: Converter.fromInternalPin(pin),
        direction: dir,
        pullup: pul,
        activeLow: alow,
        pendingInterrupt: pint,
        mode: Converter.fromGpioInterrupt(inten, defVal, intCtrl)
      };
    });
  }

  static fromInternalPin(pin, map) { return pin; }

  static fromGpioInterrupt(inten, ctrl, dVal) {
    if(!inten) { return EDGE_NONE; }
    if(!ctrl) { return EDGE_BOTH; }
    return dVal === HIGH ? EDGE_LOW : EDGE_HIGH; // todo correct direction
  }

  static toIocon(profile, bank) {
    const b = bank;
    const m = profile.interrupt.mirror ? MIR_EN : MIR_DEN;
    const s = profile.sequential ? SEQ_EN : SEQ_DEN;
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

    const bank = b === 0 ? BANK0 : BANK1;
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

  static fromIoconInterrupt(odEn, activeLow) {
    return odEn ? INT_OPEN_DRAIN : activeLow ? INT_ACTIVE_LOW : INT_ACTIVE_HIGH;
  }
}

Converter.BANK0 = BANK0;
Converter.BANK1 = BANK1;

Converter.HIGH = HIGH;
Converter.LOW = LOW;

module.exports = { Converter };
