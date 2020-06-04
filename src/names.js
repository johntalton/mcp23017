/**
 * Simple set of Name configurations that most people would expect.
 */

// Pins individual names in A0.7 B0.7 (common for multi single gpio usage)
const GPIO16_NAMES = {
  portA: { name: 'A', gpios: [0, 1, 2, 3, 4, 5, 6, 7] },
  portB: { name: 'B', gpios: [8, 9, 10, 11, 12, 13, 14, 15] }
};

// Port based names
const PORT_NAMES = {
  portA: { name: 'A', gpios: ['A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7'] },
  portB: { name: 'B', gpios: ['B0', 'B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7'] }
};

// Physical pin numbering matching the standard mcp23017 package type
const PHYSICAL_NAMES = {
  portA: { name: 'A', gpios: [21, 22, 23, 24, 25, 26, 27, 28] },
  portB: { name: 'B', gpios: [1, 2, 3, 4, 5, 6, 7] }
};

// by default, most use cases are as a block of 16 single gpio pins
const DEFAULT_NAMES = GPIO16_NAMES;

module.exports = {
  GPIO16_NAMES,
  PORT_NAMES,
  PHYSICAL_NAMES,

  DEFAULT_NAMES
};
