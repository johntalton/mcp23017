/* eslint-disable max-classes-per-file */

const { Bank, CommonMode } = require('../defines.js');
const { REGISTERS } = require('./registers.js');
const { ModeSelection } = require('./modeselection.js');
const { Common8bitPoll } = require('./common8bitpoll.js');
const { Common16bitPoll } = require('./common16bitpoll.js');
const { CommonInterlacedBlock } = require('./commoninterlacedblock.js');
const { CommonDualBlocks } = require('./commondualblocks.js');
const { CommonDirect } = require('./commondirect.js');

/**
 * Duck type class for common interface, to support modeSelection class.
 **/
class CommonReject {
  static status() { return Promise.reject(Error('common reject status')); }
  static exportAll() { return Promise.reject(Error('common reject exportAll')); }
  static readPort() { return Promise.reject(Error('common reject readPort')); }
  static readAB() { return Promise.reject(Error('common reject readAB')); }
  static wrtiePort() { return Promise.reject(Error('common reject writePort')); }
  static bulkData() { return Promise.reject(Error('common reject bulkData')); }
}

/**
 *
 **/
class Common extends CommonDirect {
  // helper to read and name memory mapped buffer
  static statusMemmapToNamedBytes(buf, mode) {
    const iocon = buf.readUInt8(REGISTERS[mode.bank].IOCON);
    const ioconAlt = buf.readUInt8(REGISTERS[mode.bank].IOCON_ALT);
    if(iocon !== ioconAlt) { throw new Error('iocon miss-match: ' + iocon.toString(16) + ' != ' + ioconAlt.toString(16)); }
    // todo also could validate low bit and mode from iocon

    const a = {
      iodir: buf.readUInt8(REGISTERS[mode.bank].IODIRA),
      iopol: buf.readUInt8(REGISTERS[mode.bank].IPOLA),
      gpinten: buf.readUInt8(REGISTERS[mode.bank].GPINTENA),
      defval: buf.readUInt8(REGISTERS[mode.bank].DEFVALA),
      intcon: buf.readUInt8(REGISTERS[mode.bank].INTCONA),
      gppu: buf.readUInt8(REGISTERS[mode.bank].GPPUA),
      intf: buf.readUInt8(REGISTERS[mode.bank].INTFA),
      olat: buf.readUInt8(REGISTERS[mode.bank].OLATA)
    };

    const b = {
      iodir: buf.readUInt8(REGISTERS[mode.bank].IODIRB),
      iopol: buf.readUInt8(REGISTERS[mode.bank].IPOLB),
      gpinten: buf.readUInt8(REGISTERS[mode.bank].GPINTENB),
      defval: buf.readUInt8(REGISTERS[mode.bank].DEFVALB),
      intcon: buf.readUInt8(REGISTERS[mode.bank].INTCONB),
      gppu: buf.readUInt8(REGISTERS[mode.bank].GPPUB),
      intf: buf.readUInt8(REGISTERS[mode.bank].INTFB),
      olat: buf.readUInt8(REGISTERS[mode.bank].OLATB)
    };

    console.log(iocon, a, b);
    return {
      iocon: iocon,
      a: a,
      b: b
    };
  }

  // fetch the state (gpio list and profile) in one go using proper mode
  static state(bus, mode) {
    return ModeSelection.from(mode)
      .on(CommonMode.MODE_MAP_8BIT_POLL, Common8bitPoll)
      .on(CommonMode.MODE_MAP_16BIT_POLL, Common16bitPoll)
      .on(CommonMode.MODE_MAP_DUAL_BLOCKS, CommonDualBlocks)
      .on(CommonMode.MODE_MAP_INTERLACED_BLOCK, CommonInterlacedBlock)
      .catch(CommonReject)
      .state(bus)
      .then(buffer => Common.statusMemmapToNamedBytes(buffer, mode));
  }

  // set the entire gpio in one go using proper mode
  static exportAll(bus, mode, exports) {
    console.log('common exportAll', exports);
    if(exports.profile !== undefined) { throw new Error('setting profile during exportAll not recommended'); }

    // todo this creates our memory map, however we need to
    // explicitly call out its size and calculate  in some const some place
    // its also of note that while this buffer should be the correct size
    // an over size buffer works well also :P
    const buffer = mode.bank === Bank.BANK0 ? Buffer.alloc(22, 0) : Buffer.alloc(27, 0);

    const { a, b } = exports; // short hand a bit
    buffer.writeUInt8(a.iodir, REGISTERS[mode.bank].IODIRA);
    buffer.writeUInt8(a.iopol, REGISTERS[mode.bank].IPOLA);
    buffer.writeUInt8(a.gpinten, REGISTERS[mode.bank].GPINTENA);
    buffer.writeUInt8(a.defval, REGISTERS[mode.bank].DEFVALA);
    buffer.writeUInt8(a.intcon, REGISTERS[mode.bank].INTCONA);
    buffer.writeUInt8(a.gppu, REGISTERS[mode.bank].GPPUA);
    buffer.writeUInt8(a.olat, REGISTERS[mode.bank].OLATA);

    buffer.writeUInt8(b.iodir, REGISTERS[mode.bank].IODIRB);
    buffer.writeUInt8(b.iopol, REGISTERS[mode.bank].IPOLB);
    buffer.writeUInt8(b.gpinten, REGISTERS[mode.bank].GPINTENB);
    buffer.writeUInt8(b.defval, REGISTERS[mode.bank].DEFVALB);
    buffer.writeUInt8(b.intcon, REGISTERS[mode.bank].INTCONB);
    buffer.writeUInt8(b.gppu, REGISTERS[mode.bank].GPPUB);
    buffer.writeUInt8(b.olat, REGISTERS[mode.bank].OLATB); // todo suppress or support suppression

    console.log('buffer', buffer);

    return ModeSelection.from(mode)
      .on(CommonMode.MODE_MAP_8BIT_POLL, Common8bitPoll)
      .on(CommonMode.MODE_MAP_16BIT_POLL, Common16bitPoll)
      .on(CommonMode.MODE_MAP_DUAL_BLOCKS, CommonDualBlocks)
      .on(CommonMode.MODE_MAP_INTERLACED_BLOCK, CommonInterlacedBlock)
      .catch(CommonReject)
      .exportAll(bus, buffer);
  }

  // read bulk data registers via proper mode
  static bulkData(bus, mode) {
    return ModeSelection.from(mode)
      .on(CommonMode.MODE_MAP_8BIT_POLL, Common8bitPoll)
      .on(CommonMode.MODE_MAP_16BIT_POLL, Common16bitPoll)
      .on(CommonMode.MODE_MAP_DUAL_BLOCKS, CommonDualBlocks)
      .on(CommonMode.MODE_MAP_INTERLACED_BLOCK, CommonInterlacedBlock)
      .catch(CommonReject)
      .bulkData(bus)
      .then(buffer => {
        console.log('bulkData memory map', buffer);

        // convert buffer to named values
        return {
          intfA: buffer.readUInt8(REGISTERS[mode.bank].INTFA),
          intfB: buffer.readUInt8(REGISTERS[mode.bank].INTFB),
          intcapA: buffer.readUInt8(REGISTERS[mode.bank].INTCAPA),
          intcapB: buffer.readUInt8(REGISTERS[mode.bank].INTCAPB),
          gpioA: buffer.readUInt8(REGISTERS[mode.bank].GPIOA),
          gpioB: buffer.readUInt8(REGISTERS[mode.bank].GPIOB),
          olatA: buffer.readUInt8(REGISTERS[mode.bank].OLATA),
          olatB: buffer.readUInt8(REGISTERS[mode.bank].OLATB)
        };
      });
  }

  // read single register via proper mode
  static readPort(bus, mode, register) {
    return ModeSelection.from(mode)
      .on(CommonMode.MODE_MAP_8BIT_POLL, Common8bitPoll)
      .on(CommonMode.MODE_MAP_16BIT_POLL, Common16bitPoll)
      .on(CommonMode.MODE_MAP_DUAL_BLOCKS, CommonDualBlocks)
      .on(CommonMode.MODE_MAP_INTERLACED_BLOCK, CommonInterlacedBlock)
      .catch(CommonReject)
      .readPort(bus, register)
      .then(buffer => buffer.readUInt8(0));
  }

  // read dual register (16bit mode if possible) via proper mode
  static readAB(bus, mode, registerA, registerB) {
    return ModeSelection.from(mode)
      .on(CommonMode.MODE_MAP_8BIT_POLL, Common8bitPoll)
      .on(CommonMode.MODE_MAP_16BIT_POLL, Common16bitPoll)
      .on(CommonMode.MODE_MAP_DUAL_BLOCKS, CommonDualBlocks)
      .on(CommonMode.MODE_MAP_INTERLACED_BLOCK, CommonInterlacedBlock)
      .catch(CommonReject)
      .readAB(bus, registerA, registerB)
      .then(buffer => ({
        A: buffer.readUInt8(0),
        B: buffer.readUInt8(1)
      }));
  }

  static writePort(bus, mode, register, value) {
    return ModeSelection.from(mode)
      .on(CommonMode.MODE_MAP_8BIT_POLL, Common8bitPoll)
      .on(CommonMode.MODE_MAP_16BIT_POLL, Common16bitPoll)
      .on(CommonMode.MODE_MAP_DUAL_BLOCKS, CommonDualBlocks)
      .on(CommonMode.MODE_MAP_INTERLACED_BLOCK, CommonInterlacedBlock)
      .catch(CommonReject)
      .writePort(bus, register, value);
  }

  // read (alias methods for register names)
  static readIntfA(bus, mode) { return Common.readPort(bus, mode, REGISTERS[mode.bank].INTFA); }
  static readIntfB(bus, mode) { return Common.readPort(bus, mode, REGISTERS[mode.bank].INTFB); }
  static readIntfAB(bus, mode) { return Common.readAB(bus, mode, REGISTERS[mode.bank].INTFA, REGISTERS[mode.bank].INTFB); }

  static readGpioA(bus, mode) { return Common.readPort(bus, mode, REGISTERS[mode.bank].GPIOA); }
  static readGpioB(bus, mode) { return Common.readPort(bus, mode, REGISTERS[mode.bank].GPIOB); }
  static readGpioAB(bus, mode) { return Common.readAB(bus, mode, REGISTERS[mode.bank].GPIOA, REGISTERS[mode.bank].GPIOB); }

  static readIntcapA(bus, mode) { return Common.readPort(bus, mode, REGISTERS[mode.bank].INTCAPA); }
  static readIntcapB(bus, mode) { return Common.readPort(bus, mode, REGISTERS[mode.bank].INTCAPB); }
  static readIntcapAB(bus, mode) { return Common.readAB(bus, mode, REGISTERS[mode.bank].INTCAPA, REGISTERS[mode.bank].INTCAPB); }

  static readOlatA(bus, mode) { return Common.readPort(bus, mode, REGISTERS[mode.bank].OLATA); }
  static readOlatB(bus, mode) { return Common.readPort(bus, mode, REGISTERS[mode.bank].OLATB); }
  static readOlatAB(bus, mode) { return Common.readAB(bus, mode, REGISTERS[mode.bank].OLATA, REGISTERS[mode.bank].OLATB); }

  // write (alias methods for register names)
  static writeGpioA(bus, mode, value) { return Common.writePort(bus, mode, REGISTERS[mode.bank].GPIOA, value); }
  static writeGpioB(bus, mode, value) { return Promise.reject(Error('writeGpioB')); }
  static writeGpioAB(bus, mode, value) { return Promise.reject(Error('writeGpioAB')); }

  static writeOlatA(bus, mode, value) { return Common.writePort(bus, mode, REGISTERS[mode.bank].OLATA, value); }
  static writeOlatB(bus, mode, value) { return Promise.reject(Error('writeOlatB')); }
  static writeOlatAB(bus, mode, value) { return Promise.reject(Error('writeOlatAB')); }
}

module.exports = { Common };
