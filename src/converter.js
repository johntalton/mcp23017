
const { BitUtil } = require('and-other-delights');

// const BASE_10 = 10;

const BANK0 = 0; // ABAB
const BANK1 = 1; // AA BB

const PORT_PACKMAP = BitUtil.TRUE_8_BITMAP;
const IOCON_PACKMAP = BitUtil.TRUE_8_BITMAP;
const MIR_EN = 1;
const SEQ_EN = 0;
const SLEW_EN = 0;
const HWA_EN = 1;
const ODR_OPENDRAIN = 1;
const POL_LOW = 0;

const MIR_DEN = 0;
const SEQ_DEN = 1;
const SLEW_DEN = 1;
const HWA_DEN = 0;
const ODR_ACTIVEDRIVER = 0;
const POL_HIGH = 1;

/**
 *
 **/
class Converter {
  static fromPortState(state) {
    // there are 8 pins in a port // todo global for pinsPerPort: 8
    const pins = [0, 1, 2, 3, 4, 5, 6, 7]; // todo range(pinsPerPort)
    const directions = BitUtil.unpackbits(PORT_PACKMAP, state.iodir);
    const polarities = BitUtil.unpackbits(PORT_PACKMAP, state.iopol);
    const intEnableds = BitUtil.unpackbits(PORT_PACKMAP, state.gpinten);
    const defaultValues = BitUtil.unpackbits(PORT_PACKMAP, state.defval);
    const intControls = BitUtil.unpackbits(PORT_PACKMAP, state.intcon);
    const pullUps = BitUtil.unpackbits(PORT_PACKMAP, state.gppu);
    const intFlags = BitUtil.unpackbits(PORT_PACKMAP, state.intf);

    return pins.map(pin => ({
      pin: pin,
      direction: directions[pin],
      polarity: polarities[pin],
      interruptEnabled: intEnableds[pin],
      defaultValue: defaultValues[pin],
      interruptControl: intControls[pin],
      pullup: pullUps[pin],
      interruptFlag: intFlags[pin]
    }));
  }

  static toIocon(profile, bank) {
    const b = bank;
    const m = profile.interrupt.mirror ? MIR_EN : MIR_DEN;
    const s = profile.sequential ? SEQ_EN : SEQ_DEN;
    const d = profile.slew ? SLEW_EN : SLEW_DEN;
    const h = profile.hardwareAddress ? HWA_EN : HWA_DEN;
    const o = profile.interrupt.openDrain ? ODR_OPENDRAIN : ODR_ACTIVEDRIVER;
    const i = profile.interrupt.activeLow ? POL_LOW : POL_HIGH;

    // console.log('toIocon', b, m, s, d, h, o, i, 0, obj);

    return BitUtil.packbits(IOCON_PACKMAP, b, m, s, d, h, o, i, 0);
  }

  static fromIocon(iocon) {
    const [b, m, s, d, h, o, i, u] = BitUtil.unpackbits(IOCON_PACKMAP, iocon);

    const bank = b === 0 ? BANK0 : BANK1;
    const mirror = m === MIR_EN
    const sequential = s === SEQ_EN;
    const slew = d === SLEW_EN;
    const hwaddr = h === HWA_EN;
    const opendrain = o === ODR_OPENDRAIN;
    const activelow = i === POL_LOW;

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
        mode: Converter.parseIntMode(opendrain, activelow),
        openDrain: opendrain,
        activeLow: activelow
      }
    };
  }

  static parseIntMode(odEn, activeLow) {
    return odEn ? 'open-drain' : activeLow ? 'active-low' : 'active-high';
  }
}

Converter.BANK0 = BANK0;
Converter.BANK1 = BANK1;

module.exports = { Converter };
