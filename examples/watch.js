
const onoff = require('onoff');

const pin5 = new onoff.Gpio(5, 'in', 'both', { activeLow: true });
const pin6 = new onoff.Gpio(6, 'in', 'both', { activeLow: true });

console.log('current pin 5 value', pin5.readSync());
console.log('current pin 6 value', pin6.readSync());

pin5.watch((err, value) => { console.log('watch pin 5 event', err, value); });
pin6.watch((err, value) => { console.log('watch pin 6 event', err, value); });
