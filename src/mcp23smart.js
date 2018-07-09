
/**
 * Smart mode provides, if allowed, switching
 *  Modes specifically to support operations
 *  that can take advantage of them.
 * This requires cached / locked iocon/mode
 *  setup to and switching logic.
 **/
class Mcp23SmartMode extends Mcp23Cached {
  // get/set mode override to set all transactions dirty
  stableMode() {
    // capture / switch / lock mode
    return Promise.reject(Error('stable mode'));
  }
}

