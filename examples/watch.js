// using existing gpio library to access native raspberry pi pins
const onoff = require('onoff');

// Pins 5 and 6 have pull up resistors on the pi
// thus they make use full INT A and INT B open-drain interrupt
// pins to watch for the mcp23 chip
// we watch `both` here only for diagnostics, it is not needed
// (in the mcp23 library gpio application implementation) to
// monitor the clear condition. also, activeLow is set in order
// to create the binary 1 on the interrupt flag (as apposed to the
// actual value of the open drain of LOW).  Again, if you had only
// watch a single edge, then the value returned is irrelevant as
// the edge itself is the indication of an interrupt.
const pin5 = new onoff.Gpio(5, 'in', 'both', { activeLow: true });
const pin6 = new onoff.Gpio(6, 'in', 'both', { activeLow: true });

// there may be existing interrupts...
console.log('current pin 5 value', pin5.readSync());
console.log('current pin 6 value', pin6.readSync());

// and watch forever
pin5.watch((err, value) => { console.log('watch pin 5 event', err, value); });
pin6.watch((err, value) => { console.log('watch pin 6 event', err, value); });
