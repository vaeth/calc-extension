/* Copyright (C) 2018 Nartin Väth <martin@mvath.de>
 * This project is under the GNU public license 2.0
*/

"use strict";

function addContent(seed, lines) {
  let textResult;
  if (!Array.isArray(seed)) {
    textResult = browser.i18n.getMessage("textResult");
  }
  for (let line of lines.lines) {
    const output = document.getElementById(line.output).textContent;
    const input = document.getElementById(line.input).value;
    if (Array.isArray(seed)) {
      seed.push([input, output]);
    } else {
      seed += input;
      seed += "\n";
      seed += textResult;
      seed += output;
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
    const lines = state.lines;
    const lastIndex = lines.currentIndex;
    for (let [input, output] of content) {
      appendNext(state, input, output);
    }
    if (lastIndex !== null) {
      lines.currentIndex = lastIndex;
    }
    lines.focus();
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

function displayResult(state, id) {
  const lines = state.lines;
  if (!lines.setCurrentId(id)) {  // no valid id
    return false;
  }
  const line = lines.currentLine;
  const input = document.getElementById(line.input).value;
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
  let nextIndex;
  if (text != null) {
    changeText(line.output, text);
    nextIndex = (lines.currentIndex + 1);
  } else {  // null means to remove the line
    nextIndex = lines.currentIndex;
    removeLine(lines);  // invalidates lines.currentIndex
  }
  if (lines.setCurrentIndex(nextIndex)) {
    lines.focus();
  } else {
    appendNext(state);
  }
  return true;
}

function initCalc(state, options) {
  if (getCheckboxInputMode()) {  // already initialized
    return;
  }
  state.parser = new Parser();
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
    content: addContent([], state.lines)
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

function insertButtonAbbr(lines, id) {
  const input = lines.currentInput;
  if (!input) {
    return;
  }
  const text = State.getButtonsAbbr(id);
  if (!text) {
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
      toClipboard(addContent("", state.lines));
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
        insertButtonAbbr(state.lines, id);
        return;
      }
      if (id.startsWith("button=")) {
        displayResult(state, id);
        return;
      }
  }
}

function submitListener(state, event) {
  if (!event.target || !event.target.id) {
    return;
  }
  if (displayResult(state, event.target.id)) {
    event.preventDefault();
  }
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
  const lines = state.lines;
  if (lines.setCurrentId(target.id)) {
    enableCurrent(lines, true);
    lines.focus(true);
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
  let state = new State();
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
