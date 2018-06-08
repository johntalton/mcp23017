class Bank {}
Bank.BANK0 = 0; // ABAB
Bank.BANK1 = 1; // AA BB

class CommonMode {
  static match(one, two) {
    if(one.bank !== two.bank) { return false; }
    if(one.sequential !== two.sequential) { return false; }
    return true;
  }
}
// theses follow similarly to the ones defined
// in the converter, but should not be confused.
// can also be called common modes. as they are the
//  terms in which the `Common` defines the word mode
// of course they provide similar functionality here.
CommonMode.MODE_MAP_8BIT_POLL = { bank: Bank.BANK1, sequential: false };
CommonMode.MODE_MAP_16BIT_POLL = { bank: Bank.BANK0, sequential: false };
CommonMode.MODE_MAP_DUAL_BLOCKS = { bank: Bank.BANK1, sequential: true };
CommonMode.MODE_MAP_INTERLACED_BLOCK = { bank: Bank.BANK0, sequential: true };

// mode defined by chip as reset mode (exported bellow)
CommonMode.MODE_MAP_DEFAULT = CommonMode.MODE_MAP_INTERLACED_BLOCK;

// ------------------------------------

class DigitalIO {}
DigitalIO.HIGH = 1;
DigitalIO.LOW = 0;

class ProfileMode {}
ProfileMode.MODE_8BIT_POLL = '8bit-poll';
ProfileMode.MODE_16BIT_POLL = '16bit-poll'; // AB Wobble
ProfileMode.MODE_DUAL_BLOCKS = 'dual-blocks';
ProfileMode.MODE_INTERLACED_BLOCK = 'interlaced-block'; // default

class InterruptMode {}
InterruptMode.INT_ACTIVE_LOW = 'active-low';
InterruptMode.INT_ACTIVE_HIGH = 'active-high';
InterruptMode.INT_OPEN_DRAIN = 'open-drain';

class Direction {}
Direction.DIRECTION_IN = 'in';
Direction.DIRECTION_OUT = 'out';
Direction.DIRECTION_OUT_HIGH = 'high';
Direction.DIRECTION_OUT_LOW = 'low';

class Edge {}
Edge.EDGE_NONE = 'none';
Edge.EDGE_RISING = 'rising';
Edge.EDGE_FALLING = 'falling';
Edge.EDGE_BOTH = 'both';

module.exports = {
  Bank,
  CommonMode,
  DigitalIO,
  ProfileMode,
  InterruptMode,
  Direction,
  Edge
};
