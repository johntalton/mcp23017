const { Mcp23Base } = require('./mcp23base.js');
const { Converter } = require('./converter.js');
const { CommonMode } = require('./defines.js');

/**
 * Adding Cache support for mode.
 **/
class Mcp23Cached extends Mcp23Base {
  constructor(bus, options) {
    super(bus, options);
    this.commonMode = CommonMode.MODE_MAP_DEFAULT;
    // todo _iocon
  }

  get mode() { return Converter.fromIoconMode(this.commonMode.bank, this.commonMode.sequential); }
  set mode(m) { this.commonMode = Converter.toIoconMode(m); }

  sniffMode() {
    return super.sniffMode(this.commonMode);
  }

  // wrap setProfile to use cached mode
  setProfile(profile) {
    // pick the target mode form out cached common mode or the profiles
    const userProfile = (profile.mode !== undefined && profile.mode !== false);
    const target = {
      mode: userProfile ? profile.mode : Converter.fromIoconMode(...this.commonMode),
      cmode: userProfile ? Converter.toIoconMode(profile.mode) : this.commonMode
    };

    // we use our cached mode to write, and then update to the newly
    //  set profile on success
    return super.setProfile(this.commonMode, {
      ...profile,
      mode: target.mode
    })
      .then(ret => {
        this.commonMode = target.cmode;
        return ret;
      });
  }

  profile() {
    // console.log('using cached mode for profile read', this.commonMode);
    return super.profile(this.commonMode);
    // todo cache read mode here. or provide option
  }

  state() {
    return super.state(this.commonMode);
  }

  exportAll(gpios) {
    return super.exportAll(this.commonMode, gpios);
  }

  bulkData() {
    return super.bulkData(this.commonMode);
  }
}

module.exports = { Mcp23Cached };
