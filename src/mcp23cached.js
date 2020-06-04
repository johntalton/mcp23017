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
    // todo _iocon ?
  }

  get mode() { return Converter.fromIoconMode(this.commonMode.bank, this.commonMode.sequential); }
  set mode(m) { this.commonMode = Converter.toIoconMode(m); }

  sniffMode() {
    return super.sniffMode(this.commonMode);
  }

  // wrap setProfile to use cached mode
  setProfile(profile) {
    // this is where profile.mode vs this.mode is resolved
    // we also handle this.mode false case in the profile as
    // explicit use this.mode
    // the result is a target mode-pair (mode and common mode)
    // that is used to set, and then cache the commonMode for
    // subsequent calls
    const notAuto = profile.mode !== false;
    const useProfile = notAuto && profile.mode !== undefined;

    const targetMode = useProfile ? profile.mode : Converter.fromIoconMode(this.commonMode.bank, this.commonMode.sequential);
    const targetCommonMode = useProfile ? Converter.toIoconMode(profile.mode) : this.commonMode;

    const matchMode = CommonMode.match(targetCommonMode, this.commonMode);
    const stableMode = !notAuto || matchMode;

    if(stableMode) {
      console.log('Mode is stable', targetMode);
      // todo this could provide the ability to create extended
      //  write buffer during a mixed profile data set operation.
      //  that is, because the mode is stable we can assume
      //  normal mode write optimization can be done

      // todo this can be optimized bellow to not include the
      //   re-caching of the commonMode, nor the profile
      //   decomposition and injection of targetMode.
    } else {
      console.log(' -- FLASH FLASH FLASH (mode change)  --', targetMode);
      // todo similarly to the above stable mode, we have some
      //   ability to add further operation now that we can assume
      //   the mode to some degree.
      //   this is, more risky behavior and is advised against
      //   in the data-sheet

      // todo the profile.mutable concept needs to be managed or
      //   extended into this context, if we are not allowed to
      //   change the profile (in this case the mode) then this
      //   operation should be blocked
    }

    // we use our cached mode to write, and then update to the newly
    //  set profile on success
    return super.setProfile(this.commonMode, {
      ...profile,
      mode: targetMode
    })
      .then(ret => {
        this.commonMode = targetCommonMode;
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
