/* Copyright (C) 2018 Nartin Väth <martin@mvath.de>
 * This project is under the GNU public license 2.0
*/

"use strict";

function getInput(indexString) {
  return document.getElementById("area=" + indexString) ||
      document.getElementById("input=" + indexString);
}

function addContent(seed, counter) {
  let textResult;
  if (!Array.isArray(seed)) {
    textResult = browser.i18n.getMessage("textResult");
  }
  for (let i = 0; i <= counter; ++i) {
    const indexString = String(i);
    const output = document.getElementById("output=" + indexString);
    if (!output) {
      continue;
    }
    const inputValue = getInput(indexString).value;
    if (!inputValue) {
      continue;
    }
    if (Array.isArray(seed)) {
      seed.push([inputValue, output.textContent]);
    } else {
      seed += inputValue;
      seed += "\n";
      seed += textResult;
      seed += output.textContent;
      seed += "\n";
    }
  }
  return seed;
}

function restoreSessionLast(state, checkOnly) {
  const storedLast = state.storedLast;
  if (!Array.isArray(storedLast)) {
    return false;
  }
  const lastString = storedLast[1];
  if ((typeof(lastString) == "string") && lastString) {
    if (checkOnly) {
      return true;
    }
    state.lastString = lastString;
    displayLastString();
  }
  if (checkOnly) {
    return false;
  }
  const last = storedLast[0];
  if (typeof(last) == "number") {
    state.last = last;
  }
}

function addSessionPrepare(state) {
  // Setting the clipboard cannot be done in the messageListener,
  // since otherwise we would need clipboard permissions
  if (restoreSessionLast(state, true) && isChecked(getCheckboxClipboard())) {
    toClipboard(state.storedLast[1]);
  }
  sendCommand("sendSession");
}

function addSession(state, session) {
  if (!session) {
    return;
  }
  restoreSessionLast(state);
  const variables = session.variables;
  if (Array.isArray(variables)) {
    state.parser.setVariables(variables);
  }
  const content = session.content;
  if (Array.isArray(content)) {
    const indexString = String(state.counter);  // end of current session
    for (let [input, output] of content) {
      appendNext(state, input, output);
    }
    const input = getInput(indexString);
    if (input) {  // focus end of original session
      input.focus();
    }
  }
}

function optionsChanges(state, changes) {
  if (changes.clipboard) {
    setCheckboxClipboard(changes.clipboard.value);
  }
  if (changes.inputMode) {
    setCheckboxInputMode(changes.inputMode.value);
  }
  if (changes.size) {
    changeSize(state, sanitizeSize(changes.size.value));
  }
  if (changes.base) {
    changeBase(state, sanitizeBase(changes.base.value));
  }
}

function displayResult(state, id, indexString) {
  const input = document.getElementById(id).value;
  let last = false;
  let text;
  try {
    if ((text = calculate(state, input))) {
      last = true;
    }
  }
  catch (error) {
    text = browser.i18n.getMessage("messageError", error);
  }
  if (last) {
    displayLastString(state);
    if (isChecked(getCheckboxClipboard())) {
      toClipboard(state.lastString);
    }
  }
  let current = Number.parseInt(indexString, 10);
  if (text != null) {
    changeText("output=" + indexString, text);
  } else {  // null means to remove the line
    removeLine("output=" + indexString);
    removeLine(id);
    if (current == state.counter) {  // We removed last: next becomes counter
      state.counter = --current;
    }
  }
  while (current < state.counter) {
    ++current;
    const nextIndex = String(current);
    const nextNode = getInput(nextIndex);
    if (nextNode) {
      nextNode.focus();
      return;
    }
  }
  appendNext(state);
}

function initCalc(state, options) {
  if (getCheckboxInputMode()) {  // already initialized
    return;
  }
  state.size = sanitizeSize(options.size)
  state.base = sanitizeBase(options.base);
  initWindow(state, options);
}

function sendCommand(command, message) {
  if (!message) {
    message = {};
  }
  message.command = command;
  browser.runtime.sendMessage(message);
}

function storeSession(state) {
  const session = {
    content: addContent([], state.counter)
  };
  const last = state.last;
  const lastString = state.lastString;
  const sessionLast = [
    (typeof(last) == "number") ? last : null,
    ((typeof(lastString) == "string") && lastString) || null
  ];
  if ((sessionLast[0] !== null) || (sessionLast[1] !== null)) {
    session.last = sessionLast;
  }
  const variables = state.parser.pushVariables([]);
  if (variables.length) {
    session.variables = variables;
  }
  sendCommand("storeSession", { session: session });
}

function insertButtonAbbr(state, id) {
  const inputId = state.inputId;
  if (!inputId) {
    return;
  }
  const text = state.buttonsAbbr[id];
  if (!text) {
    return;
  }
  const input = document.getElementById(inputId);
  if (!input) {
    return;
  }
  if (typeof(input.selectionStart) == "number") {
    input.value = input.value.substr(0, input.selectionStart) +
      text + input.value.substr(input.selectionEnd);
  } else {
    input.value += text;
  }
  input.focus();
}

function clickListener(state, event) {
  if (!event.target || !event.target.id) {
    return;
  }
  const id = event.target.id;
  switch (id) {
    case "buttonClipboard":
      toClipboard(state.lastString);
      return;
    case "buttonAllClipboard":
      toClipboard(addContent("", state.counter));
      return;
    case "buttonClear":
      clearAll(state);
      return;
    case "buttonStoreSession":
      storeSession(state);
      return;
    case "buttonAddSession":
      addSessionPrepare(state);
      return;
    case "buttonClearStored":
      sendCommand("clearSession");
      return;
    default:
      if (id.startsWith("buttonAbbr")) {
        insertButtonAbbr(state, id);
        return;
      }
  }
  if (!id.startsWith("button=")) {
    return;
  }
  const indexString = id.substr(7);  // 7 = "button=".length
  displayResult(state, "area=" + indexString, indexString);
}

function submitListener(state, event) {
  if (!event.target || !event.target.id) {
    return;
  }
  const id = event.target.id;
  if (!id.startsWith("form=")) {
    return;
  }
  event.preventDefault();
  const indexString = id.substr(5);  // 5 = "form=".length
  displayResult(state, "input=" + indexString, indexString);
}

function changeListener(state, event) {
  if (!event.target || !event.target.id) {
    return;
  }
  switch (event.target.id) {
    case "inputSize":
      changeSize(state, getSize(getInputSize().value), true);
      return;
    case "inputBase":
      changeBase(state, getBase(getInputBase().value), true);
      return;
  }
}

function focusinListener(state, event) {
  let target = event.target;
  if (!target) {
    return;
  }
  while (!target.id && target.hasChildNodes()) {
    target = target.firstChild;
  }
  if (!target.id) {
    return;
  }
  const id = target.id;
  if (id.startsWith("area=") || id.startsWith("input")) {
    state.inputId = id;
    return;
  }
  if (id.startsWith("form=")) {
    state.inputId = id.replace(/^form/, "input");
    return;
  }
  if (id.startsWith("button=")) {
    state.inputId = id.replace(/^button/, "area");
    return;
  }
}

function messageListener(state, message) {
  if (!message.command) {
    return;
  }
  switch (message.command) {
    case "initCalc":
      state.storedLast = message.last;
      initCalc(state, message.options);
      return;
    case "optionsChanges":
    case "storageOptionsChanges":
      optionsChanges(state, message.changes);
      return;
    case "storedLastChanges":
      enableStorageButtons((state.storedLast = message.last));
      return;
    case "session":
      addSession(state, message.session);
      return;
  }
}

function initMain() {
  const state = {
    inputId: null,
    counter: 0,
    last: null,
    lastString: null,
    storedLast: null,
    size: [0, 0],
    base: 0,
    parser: new Parser(),
    buttonsAbbr: {
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
      buttonAbbrA: "a ",
      buttonAbbrB: "b ",
      buttonAbbrC: "c ",
      buttonAbbrI: "i ",
      buttonAbbrJ: "j ",
      buttonAbbrK: "k ",
      buttonAbbrL: "l ",
      buttonAbbrM: "m ",
      buttonAbbrN: "n ",
      buttonAbbrU: "u ",
      buttonAbbrV: "v ",
      buttonAbbrW: "w ",
      buttonAbbrX: "x ",
      buttonAbbrY: "y ",
      buttonAbbrZ: "z ",
      buttonAbbrLast: "#",
      buttonAbbrExclam: "!",
      buttonAbbrQuestion: "?",
      buttonAbbrSize805: "'80:5'",
      buttonAbbrSize00: "'0:0'",
      buttonAbbrBase16: '"16"',
      buttonAbbrBase8: '"8"',
      buttonAbbrBaseEmpty: '""'
    }
  };
  document.addEventListener("submit", (event) => {
    submitListener(state, event);
  });
  document.addEventListener("change", (event) => {
    changeListener(state, event);
  });
  document.addEventListener("click", (event) => {
    clickListener(state, event);
  });
  document.addEventListener("focusin", (event) => {
    focusinListener(state, event);
  });
  browser.runtime.onMessage.addListener((message) => {
    messageListener(state, message);
  });
}

initLayout();  // do this quickly
initMain();
sendCommand("sendInitCalc");
