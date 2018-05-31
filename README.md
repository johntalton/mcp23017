# Microchip 8/16-bit I/O Expander (mcp23xxx)

Microchip's 8bit and 16bit wide gpio chip provides the ability to offload gpio to dedicated chip via i2c or spi interface.

This implmentation sports several feature not found elsewere (js or otherwise). Providing direct access to the full
feautre set of the chip.

Such as:
 - Smart Bank 0/1 Sniffing
 - Block addressing (bulk access)
 - Wobble A/B addressing (fast access)
 - Dual / Single and Poll interrupt support
 - Pull-up resistor state access
 - Output and Output Latch access
 - Gpio / Byte / Word interface (with access optimizations)
 - Dynamic Pin naming schemes
 - I2C and SPI generic interface (beta)
 - 8-bit version support (beta - missing proper iocon register setup)
 - Detailed profile configuration (slew, hardward address, etc.)

### Example

Create a new instance using `from`

```javascript
  bus.init(...)
    .then(bus => Mcp23.from(bus))
    .then(client => {
      ...
    })
    .catch(e => ...)
```

### Pins / Ports / Word up

The expander can be accessed in multiple use cases, by pin, port or full word, and multiple interrupt can be configured 
to drive specific use cases.  Further use of banking can optimize use case interactions and provide performance increases.

Pins and Ports can be mixed as long as they do not overlap. Word requires the entire 16-bit chip and thus is exclusive.

##### Pins

The chip provides 16 individual gpio pins.  These can be used directly as singular pins and interacted with in a similar
way to sysfs interactions (see `onoff`).

Addressing of the pins can be mapped though commonly referenced as [0, 1, ... 15] or ['A0' ... 'A7', 'B0' ... 'B7'].
Though this map can be augmented to support custom names (useful when multiple mcp23 chips are used to keep one sane)

##### Port A/B

The chip is naturally split into two 8-bit ports. Referenced as `A` and `B` and specifically labeled in the specs (aka see doc for wiring etc).

This interface provides a `readUInt8`/`readInt8` methods to allow for a more natural interaction.  This also attempts to optimize the chip interaction where possible.

Depending on overall configuration, Port A and B can utilize independent Interrupts to further prioritize interactions

And will a Port can be using independently, or with other single Pins, it can be a common use case to allocate a read-port and a write-port and use interrupt to drive transformation.

##### Word

Full 16-bit word write.  This is for the most part a wrapper around the combined PortAB and creating the higher level access method: `readUInt16LE`, `readUInt16BE`, `readInt16LE`, `readInt16BE`.



### Bank 0/1

The expander exposes the ability to address the chip memory map as interlaced Port A/B (`BANK0`) or in block A / B (`BANK1`) modes.
Such that reading bytes in interlaced mode results in ABAB... and block requires two reads of AAA... and BBB....

Setting the chips profile (via `setProfile`) can update the chips access mode. 

While the chips defaults to `BANK0` on power-on-reset (aka on power up), and is the most common operational mode, the nature of the api needs to assume correctly the current bank prior to other actions (including `setProfile` - which is used to change the bank and even `profile` may fail if bank is assumed incorrectly).  Thus, `.bank` is expossed on the chip which can be pre-set to the bank value prior to other actions (it makes no bus calls, it just updates this instances cache of expected bank value).

Give this complexity, the chip also offers the `sniffBank` method.

##### Sniff Bank

Calling `sniffBank` will attempt to safely access the bus and registers, assuming this may not be a mcp23x17 chip, and/or the `bank` may be set incorrectly.

It does this by reading several addressing and probing state to attempt to guess the correct bank.

```javascript
  ...
  client.sniffBank().then(guess => {
    console.log('smells like bank/sequential', guess);
  })
```

### Dynamic naming

Naming in the first pain of all developers, and as such the library can be initialized with custom name maps.
Name map descripe the port and pin layout.

Three common layouts are included
 - gpio16
 - port names
 - pysical names

While using the existing constant `PHYSICAL_NAME` this example shows how to init with a custom map.

```javascript
   ...
    .then(bus => Mcp23.from(bus, {
      portA: { name: 'A', gpios: [21, 22, 23, 24, 25, 26, 27, 28] },
      portB: { name: 'B', gpios: [1, 2, 3, 4, 5, 6, 7] }
    }))
    .then(device => {
      ...
      const button = device.exportGpio(21, ...)
    })
    
```

The `DEFAULT_NAMES` constant is an alias for `GPIO16_NAMES` (which lists the names a 0 .. 15).
Note that `gpios` array values must be globaly unique to the chip (aka you can not have 0..7 and 0..7 on each port, 
`PORT_NAME` constant solves this by scoping A0..A7, B0..B7).

Custom maps can use a mix of types (such as "led" etc) as long as they are unique and equitable (aka `===`)


### SysFS (device tree overlay)

Existing device tree overlays exist for the mcp23x17 chip and expose the default `/sys/class/gpio` interface. 
And can be accessed via libs like `onoff`.

 - overlay works mostly - have run into some issues with the code
 - requires system mod - require permissions to modify boot config / not portable across generic platform
 - does not expos some advanced features - bank access, fast poll, multiple A/B Interrupts, etc.
 

