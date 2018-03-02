/* Copyright (C) 2018 Nartin Väth <martin@mvath.de>
 * This project is under the GNU public license 2.0
*/

"use strict";

function getContent(line) {
  return [
    document.getElementById(line.input).value,
    document.getElementById(line.output).textContent
  ];
}

function addContent(seed, lines) {
  let textResult;
  if (!Array.isArray(seed)) {
    textResult = browser.i18n.getMessage("textResult");
  }
  for (let line of lines.lines) {
    const content = getContent(line);
    if (Array.isArray(seed)) {
      seed.push(content);
    } else {
      seed += content[0];
      seed += "\n";
      seed += textResult;
      seed += content[1];
      seed += "\n";
    }
  }
  return seed;
}

function redrawLine(state) {
  const lines = state.lines;
  const line = lines.currentLine;
  if (!line) {
    return;
  }
  const content = getContent(line);
  appendNext(state, content[0], content[1], lines.currentIndex, true);
  removeLine(lines, lines.currentIndex + 1);
  lines.focus();
}

function redrawWindow(state) {
  const lines = state.lines;
  const content = addContent([], lines);
  const index = state.lines.currentIndex;
  clearAllLines(lines);
  for (let [input, output] of content) {
    appendNext(state, input, output, null, true);
  }
  lines.setCurrentIndex(index);
  lines.focus();
}

function cleanLine(lines) {
  const input = lines.currentInput;
  if (!input) {
    return;
  }
  input.value = "";
  input.focus();
}

function removeCurrentLine(state) {
  const lines = state.lines;
  const index = lines.currentIndex;
  if (!removeLine(lines)) {
    return;
  }
  if (lines.setCurrentIndex(index)) {
    lines.focus();
  } else {
    appendNext(state);
  }
}

function moveLine(lines, add) {
  const index = lines.currentIndex;
  if (!lines.isValidIndex(index)) {
    return;
  }
  const swapIndex = index + add;
  if (!lines.isValidIndex(swapIndex)) {
    lines.focus();
    return;
  }
  const line = lines.currentLine;
  lines.setCurrentIndex(swapIndex);
  const swapLine = lines.currentLine;
  lines.swapLines(index, swapIndex);
  swapLines(line, swapLine);
  lines.focus();
}

function insertLine(state) {
  const lines = state.lines;
  const line = lines.currentLine;
  if (!line) {
    return;
  }
  appendNext(state, null, null, lines.currentIndex);
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
    displayLastString(state);
  }
  if (checkOnly) {
    return false;
  }
  const last = storedLast[0];
  if (typeof(last) == "number") {
    state.last = last;
  }
}

function addSessionPrepare(state, clear) {
  // Setting the clipboard cannot be done in the messageListener,
  // since otherwise we would need clipboard permissions
  if (restoreSessionLast(state, true) && isChecked(getCheckboxClipboard())) {
    toClipboard(state.storedLast[1]);
  }
  sendCommand("sendSession", { clear: clear });
}

function addSession(state, session, clear) {
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
    if (clear) {
      clearAllLines(lines);
    }
    const lastIndex = lines.currentIndex;
    for (let [input, output] of content) {
      appendNext(state, input, output, null, true);
    }
    if (lastIndex !== null) {
      lines.currentIndex = lastIndex;
    }
    lines.focus();
  }
}

function optionsChanges(state, options, changes) {
  if (options) {
    changes = {};
    for (let i of [
      "clipboard",
      "inputMode",
      "size",
      "base"
      ]) {
      const change = changes[i] = {};
      if (options.hasOwnProperty(i)) {
        change.value = options[i];
      }
    }
  }
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

function initCalc(state, options, haveStorage) {
  if (getCheckboxInputMode()) {  // already initialized
    return;
  }
  state.parser = new Parser();
  state.size = sanitizeSize(options.size)
  state.base = sanitizeBase(options.base);
  initWindow(state, options, haveStorage);
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

function storeOptions(state) {
  const options = {};
  if (isChecked(getCheckboxInputMode())) {
    options.inputMode = true;
  }
  if (isChecked(getCheckboxClipboard())) {
    options.clipboard = true;
  }
  if (!isDefaultSize(state.size)) {
    options.size = state.size;
  }
  if (!isDefaultBase(state.base)) {
    options.base = state.base;
  }
  sendCommand("optionsChanges", { options: options });
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

function detailsClicked(id) {
  const name = id.substr(7);  // 7 = "details".length
  const open = State.details[name];
  if (typeof(open) != "boolean") {
    return false;
  }
  const list = document.getElementById("details" + name);
  if (!list) {
    return false;
  }
  const value = {};
  const changes = {};
  changes[name] = value;
  if (open ? list.open : !list.open) {
    value.value = true;
  }
  sendCommand("detailsChanges", { changes: changes });
  return true;
}

function detailsChanges(details, changes) {
  const defaultDetails = State.details;
  const modify = Object.getOwnPropertyNames(details ?
    defaultDetails : changes);
  if (!details) {
    details = {};
  }
  if (changes) {
    applyChanges(details, changes);
  }
  for (let i of modify) {
    if (!defaultDetails.hasOwnProperty(i)) {
      continue;
    }
    const list = document.getElementById("details" + i);
    if (list) {
      setOpen(list, defaultDetails[i] == !details[i]);
    }
  }
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
    case "buttonRedrawLine":
      redrawLine(state);
      return;
    case "buttonCleanLine":
      cleanLine(state.lines);
      return;
    case "buttonRemoveLine":
      removeCurrentLine(state);
      return;
    case "buttonMoveLineUp":
      moveLine(state.lines, -1);
      return;
    case "buttonMoveLineDown":
      moveLine(state.lines, 1);
      return;
    case "buttonInsertLine":
      insertLine(state);
      return;
    case "buttonRedrawWindow":
      redrawWindow(state);
      return;
    case "buttonClearWindow":
      clearAll(state);
      return;
    case "buttonStoreSession":
      storeSession(state);
      return;
    case "buttonRestoreSession":
      addSessionPrepare(state, true);
      return;
    case "buttonAddSession":
      addSessionPrepare(state, false);
      return;
    case "buttonClearStored":
      sendCommand("clearSession");
      return;
    case "buttonStoreOptions":
      storeOptions(state);
      return;
    case "buttonClearStorage":
      sendCommand("clearStorage");
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
      if (id.startsWith("summary") && detailsClicked(id)) {
        state.lines.focus();
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
      initCalc(state, message.options, message.haveStorage);
      detailsChanges(message.details);
      return;
    case "optionsChanges":
    case "storageOptionsChanges":
      optionsChanges(state, message.options, message.changes);
      return;
    case "detailsChanges":
    case "storageDetailsChanges":
      detailsChanges(message.details, message.changes);
      return;
    case "storedLastChanges":
      enableStorageButtons((state.storedLast = message.last));
      return;
    case "haveStorageChanges":
      enableButton(getButtonClearStorage(), message.haveStorage);
      return;
    case "session":
      addSession(state, message.session, message.clear);
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

initLayout();  // do this early
initMain();
sendCommand("sendInitCalc");
