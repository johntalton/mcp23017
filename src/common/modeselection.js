
/**
 *
 **/
class ModeSelection {
  static from(bank, sequential) {
    return new ModeSelection({ bank: bank, sequential: sequential });
  }

  static matches(mm1, mm2) {
    if(mm1.bank !== mm2.bank) { return false; }
    if(mm1.sequential !== mm2.sequential) { return false; }

    return true;
  }

  constructor(modemap) {
    this.modemap = modemap;
    this.result = undefined;
  }

  on(modemap, result) {
    if(ModeSelection.matches(this.modemap, modemap)) { this.result = result; }
    return this;
  }

  catch(err) {
    return this.result !== undefined ? this.result : err;
  }
}

module.exports = { ModeSelection };
