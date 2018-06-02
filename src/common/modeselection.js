
const { ClassSelector } = require('@johntalton/and-other-delights');

/**
 *
 **/
class ModeSelection extends ClassSelector {
  static from(bank, sequential) {
    return new ModeSelection({ bank: bank, sequential: sequential });
  }

  static matches(mm1, mm2) {
    if(mm1.bank !== mm2.bank) { return false; }
    if(mm1.sequential !== mm2.sequential) { return false; }

    return true;
  }

  constructor(modemap) {
    super(modemap);
  }

  on(modemap, result) {
    return super.on(inval => ModeSelection.matches(inval, modemap), result);
  }
}

module.exports = { ModeSelection };
