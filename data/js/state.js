/* Copyright (C) 2018 Nartin Väth <martin@mvath.de>
 * This project is under the GNU public license 2.0
*/

"use strict";

class State {
  constructor() {
    this.lines = new Lines();
    this.last = null;
    this.lastString = null;
    this.storedLast = null;
    this.options = {};
    this.parser = null;
  }

  static getButtonsAbbr(name) {
    return (State.buttonsAbbr[name] || null);
  }

  static get buttonsAbbrArray() {
    return Object.getOwnPropertyNames(State.buttonsAbbr);
  }
}

State.buttonsAbbr = {
  buttonAbbrUarr: "\u2191",
  buttonAbbrDoubleAst: "**",
  buttonAbbrTimes: "\xD7",
  buttonAbbrMiddot: "\xB7",
  buttonAbbrAst: "*",
  buttonAbbrSlash: "/",
  buttonAbbrColon: ":",
  buttonAbbrPercentage: "%",
  buttonAbbrPlus: " + ",
  buttonAbbrMinus: " - ",
  buttonAbbrAmp: " & ",
  buttonAbbrPow: " ^ ",
  buttonAbbrVert: " | ",
  buttonAbbrAssign: " = ",
  buttonAbbrSin: "sin ",
  buttonAbbrCos: "cos ",
  buttonAbbrTan: "tan ",
  buttonAbbrAsin: "asin ",
  buttonAbbrAcos: "acos ",
  buttonAbbrAtan: "atan ",
  buttonAbbrSinh: "sinh ",
  buttonAbbrCosh: "cosh ",
  buttonAbbrTanh: "tanh ",
  buttonAbbrAsinh: "asinh ",
  buttonAbbrAcosh: "acosh ",
  buttonAbbrAtanh: "atanh ",
  buttonAbbrLog10: "log10 ",
  buttonAbbrLog2: "log2 ",
  buttonAbbrLog: "log ",
  buttonAbbrLog1p: "log1p ",
  buttonAbbrExp: "exp ",
  buttonAbbrExpm1: "expm1 ",
  buttonAbbrSqrt: "sqrt ",
  buttonAbbrRadic: "\u221A",
  buttonAbbrCbrt: "cbrt ",
  buttonAbbrCuberoot: "\u221B",
  buttonAbbrClz32: "clz32 ",
  buttonAbbrAbs: "abs ",
  buttonAbbrSign: "sign ",
  buttonAbbrFloor: "floor ",
  buttonAbbrCeil: "ceil ",
  buttonAbbrRound: "round ",
  buttonAbbrTrunc: "trunc ",
  buttonAbbrFround: "fround ",
  buttonAbbrE: "E ",
  buttonAbbrPi: "\u03C0",
  buttonAbbrPI: "PI ",
  buttonAbbrSQRT2: "SQRT2 ",
  buttonAbbrSQRT1_2: "SQRT1_2 ",
  buttonAbbrLN2: "LN2 ",
  buttonAbbrLN10: "LN10 ",
  buttonAbbrLOG2E: "LOG2E ",
  buttonAbbrLOG10E: "LOG10E ",
  buttonAbbrEPSILON: "EPSILON ",
  buttonAbbrEpsilon: "\u03B5",
  buttonAbbrUnaryPlus: "+",
  buttonAbbrUnaryMinus: "-",
  buttonAbbrOpen: "(",
  buttonAbbrClose: ")",
  buttonAbbr0: "0",
  buttonAbbr1: "1",
  buttonAbbr2: "2",
  buttonAbbr3: "3",
  buttonAbbr4: "4",
  buttonAbbr5: "5",
  buttonAbbr6: "6",
  buttonAbbr7: "7",
  buttonAbbr8: "8",
  buttonAbbr9: "9",
  buttonAbbrDot: ".",
  buttonAbbrNumericE: "e",
  buttonAbbrSpace: " ",
  buttonAbbr0x: "0x",
  buttonAbbrHexA: "A",
  buttonAbbrHexB: "B",
  buttonAbbrHexC: "C",
  buttonAbbrHexD: "D",
  buttonAbbrHexE: "E",
  buttonAbbrHexF: "F",
  buttonAbbrVarA: "a ",
  buttonAbbrVarB: "b ",
  buttonAbbrVarC: "c ",
  buttonAbbrVarD: "d ",
  buttonAbbrVarE: "e ",
  buttonAbbrVarF: "f ",
  buttonAbbrVarG: "g ",
  buttonAbbrVarH: "h ",
  buttonAbbrVarI: "i ",
  buttonAbbrVarJ: "j ",
  buttonAbbrVarK: "k ",
  buttonAbbrVarL: "l ",
  buttonAbbrVarM: "m ",
  buttonAbbrVarN: "n ",
  buttonAbbrVarO: "o ",
  buttonAbbrVarP: "p ",
  buttonAbbrVarQ: "q ",
  buttonAbbrVarR: "r ",
  buttonAbbrVarS: "s ",
  buttonAbbrVarT: "t ",
  buttonAbbrVarU: "u ",
  buttonAbbrVarV: "v ",
  buttonAbbrVarW: "w ",
  buttonAbbrVarX: "x ",
  buttonAbbrVarY: "y ",
  buttonAbbrVarZ: "z ",
  buttonAbbrLast: "#",
  buttonAbbrExclam: "!",
  buttonAbbrQuestion: "?",
  buttonAbbrSize603: "'60:3'",
  buttonAbbrSize00: "'0:0'",
  buttonAbbrBase16: '"16"',
  buttonAbbrBase8: '"8"',
  buttonAbbrBaseEmpty: '""'
};

State.details = {
  Head: true,
  Examples: false,
  BinaryOperators: false,
  Functions: false,
  Constants: false,
  Numbers: false,
  Last: false,
  Options: false,
  Storage: false,
  Editing: false
};

State.storeChanges = function () {};
