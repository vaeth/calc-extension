/* Copyright (C) 2018 Nartin Väth <martin@mvath.de>
 * This project is under the GNU public license 2.0
*/

"use strict";

function sendCommand(command, message) {
  if (!message) {
    message = {};
  }
  message.command = command;
  browser.runtime.sendMessage(message);
}

function sendChanges(changes) {
  if (changes) {
    sendCommand("optionsChanges", { changes: changes });
  }
}

function sendOptions(options) {
  sendCommand("optionsChanges", { options: options });
}

function getContent(line) {
  return [
    document.getElementById(line.input).value,
    document.getElementById(line.output).textContent
  ];
}

function getSizeOf(line) {
  const input = document.getElementById(line.input);
  if (!input) {
    return null;
  }
  if (line.isInput) {
    return getNumeric(input.size);
  }
  const cols = getNumeric(input.cols);
  const rows = getNumeric(input.rows);
  if (!cols && !rows) {
    return null;
  }
  return [ cols || 0, rows || 0 ];
}

function addContent(seed, lines, withSize) {
  let textResult;
  if (!Array.isArray(seed)) {
    textResult = browser.i18n.getMessage("textResult");
  }
  for (let line of lines.lines) {
    const content = getContent(line);
    if (Array.isArray(seed)) {
      if (withSize) {
        const size = getSizeOf(line);
        if (size) {
          content.push(size);
        }
      }
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

function redrawLine(lines, options) {
  const line = lines.currentLine;
  if (!line) {
    return;
  }
  const content = getContent(line);
  appendNext(lines, options, content[0], content[1], lines.currentIndex);
  removeLine(lines, lines.currentIndex + 1);
}

function redrawWindow(lines, options) {
  const content = addContent([], lines);
  const index = lines.currentIndex;
  clearAllLines(lines);
  for (let [input, output] of content) {
    appendNext(lines, options, input, output);
  }
  lines.setCurrentIndex(index);
}

function backspace(lines) {
  const input = lines.currentInput;
  if (!input) {
    return;
  }
  const value = input.value;
  if (value) {
    if (typeof(input.selectionStart) == "number") {
      if (input.selectionStart > 0) {
        const rest = input.selectionStart;
        const next = rest - 1;
        input.value = value.substr(0, next) + value.substr(rest);
        input.selectionStart = input.selectionEnd = next;
      }
    } else {
      input.value = value.substr(0, value.length - 1);
    }
  }
}

function cleanLine(lines) {
  const input = lines.currentInput;
  if (!input) {
    return;
  }
  input.value = "";
}

function removeCurrentLine(lines, options) {
  const index = lines.currentIndex;
  if (!removeLine(lines)) {
    return;
  }
  if (!lines.setCurrentIndex(index)) {
    appendNext(lines, options);
  }
}

function moveLine(lines, add) {
  const index = lines.currentIndex;
  if (!lines.isValidIndex(index)) {
    return;
  }
  const swapIndex = index + add;
  if (!lines.isValidIndex(swapIndex)) {
    return;
  }
  const line = lines.currentLine;
  lines.setCurrentIndex(swapIndex);
  const swapLine = lines.currentLine;
  lines.swapLines(index, swapIndex);
  swapLines(line, swapLine);
}

function insertLine(lines, options) {
  const line = lines.currentLine;
  if (!line) {
    return;
  }
  appendNext(lines, options, null, null, lines.currentIndex);
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
    displayLastString((state.lastString = lastString));
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
  if (restoreSessionLast(state, true) && state.options.clipboard) {
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
    const options = state.options;
    for (let [input, output, size] of content) {
      appendNext(lines, options, input, output, null, size);
    }
    if (lastIndex !== null) {
      lines.currentIndex = lastIndex;
    }
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
  catch(error) {
    text = browser.i18n.getMessage("messageError", error);
  }
  if (last) {
    displayLastString(state.lastString);
    if (state.options.clipboard) {
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
  if (!lines.setCurrentIndex(nextIndex)) {
    appendNext(lines, state.options);
  }
  return true;
}

function storeChanges(options, property) {
  if (!options.store) {
    return;
  }
  const value = {};
  if (options.hasOwnProperty(property)) {
    value.value = options[property];
  }
  const changes = {};
  changes[property] = value;
  sendChanges(changes);
}

function initCalc(state, options, haveStorage) {
  if (document.getElementById("buttonCollapseAccordion")) {
    return;  // already initialized
  }
  state.options = addOptions({}, options);
  initWindow(state.lines, state.options, state.storedLast, haveStorage);
}

function storeSession(state) {
  const session = {
    content: addContent([], state.lines, true)
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
    const next = input.selectionStart + text.length;
    input.value = input.value.substr(0, input.selectionStart) +
      text + input.value.substr(input.selectionEnd);
    input.selectionStart = input.selectionEnd = next;
  } else {
    input.value += text;
  }
}

function detailsStore() {
  const details = {};
  const defaultDetails = State.details;
  for (let name of Object.getOwnPropertyNames(defaultDetails)) {
    const list = document.getElementById("details" + name);
    if (list && (defaultDetails[name] == !list.open)) {
      details[name] = true;
    }
  }
  sendCommand("detailsChanges", { details: details });
}

function detailsAll(options, open) {
  for (let name of Object.getOwnPropertyNames(State.details)) {
    setOpen(document.getElementById("details" + name), open);
  }
  if (options.accordion) {
    detailsStore();
  }
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
  for (let name of modify) {
    if (!defaultDetails.hasOwnProperty(name)) {
      continue;
    }
    const list = document.getElementById("details" + name);
    const open = (defaultDetails[name] == !details[name]);
    setOpen(list, open);
  }
}

function changeTextarea(options) {
  const value = isCheckedTextarea();
  const changes = booleanChanges(options, "textarea", value);
  if (options.store) {
    sendChanges(changes);
  }
}

function changeSize(lines, options) {
  changeSizeValue(lines, options, getSize(getInputSize().value), true);
}

function changeBase(options) {
  changeBaseValue(options, getBase(getInputBase().value), true);
}

function changeClipboard(options) {
  const value = isCheckedClipboard();
  const changes = booleanChanges(options, "clipboard", value);
  if (options.store) {
    sendChanges(changes);
  }
}

function changeAccordion(options) {
  const value = isCheckedAccordion();
  const changes = booleanChanges(options, "accordion", value);
  if (!changes) {
    return;
  }
  if (value) {
    detailsStore();
  } else {
    sendCommand("clearDetails");
  }
  if (options.store) {
    sendChanges(changes);
  }
}

function changeStore(options) {
  const value = isCheckedStore();
  const changes = booleanChanges(options, "store", value);
  if (!changes) {
    return;
  }
  if (value) {
    sendOptions(options);
  } else {
    sendChanges(changes);
  }
}

function optionsChanges(state, options, changes) {
  if (!options) {
    options = Object.assign({}, state.options);
  }
  if (changes) {
    applyChanges(options, changes);
  }
  changes = calcChanges(state.options, options);
  if (!changes) {
    return;
  }
  state.options = options;
  if (changes.textarea) {
    changeTextareaValue(options, changes.textarea.value, true);
  }
  if (changes.size) {
    changeSizeValue(state.lines, state.options,
      sanitizeSize(changes.size.value), true);
  }
  if (changes.base) {
    changeBaseValue(state.options, sanitizeBase(changes.base.value), true);
  }
  if (changes.clipboard) {
    setCheckboxClipboard(changes.clipboard.value);
  }
  if (changes.accordion) {
    if (changes.accordion.value) {
      detailsStore();
    }
    setCheckboxAccordion(changes.accordion.value);
  }
  if (changes.store) {
    if (changes.store.value) {
      sendOptions(options);
    }
    setCheckboxStore(changes.store.value);
  }
}

function toggleListener(state, name, node, defaultOpen) {
  if (!state.options.accordion) {
    return;
  }
  const value = {};
  const changes = {};
  changes[name] = value;
  if (defaultOpen == !node.open) {
    value.value = true;
  }
  sendCommand("detailsChanges", { changes: changes });
}

function clickListener(state, event) {
  if (!event.target || !event.target.id) {
    return;
  }
  const id = event.target.id;
  switch (id) {
    case "buttonClipboard":
      toClipboard(state.lastString);
      break;
    case "buttonAllClipboard":
      toClipboard(addContent("", state.lines));
      break;
    case "buttonRedrawLine":
      redrawLine(state.lines, state.options);
      break;
    case "buttonBackspace":
      backspace(state.lines);
      break;
    case "buttonCleanLine":
      cleanLine(state.lines);
      break;
    case "buttonRemoveLine":
      removeCurrentLine(state.lines, state.options);
      break;
    case "buttonMoveLineUp":
      moveLine(state.lines, -1);
      break;
    case "buttonMoveLineDown":
      moveLine(state.lines, 1);
      break;
    case "buttonInsertLine":
      insertLine(state.lines, state.options);
      break;
    case "buttonRedrawWindow":
      redrawWindow(state.lines, state.options);
      break;
    case "buttonClearWindow":
      clearAll(state.lines, state.options);
      break;
    case "buttonStoreSession":
      storeSession(state);
      break;
    case "buttonRestoreSession":
      addSessionPrepare(state, true);
      break;
    case "buttonAddSession":
      addSessionPrepare(state, false);
      break;
    case "buttonClearStored":
      sendCommand("clearSession");
      break;
    case "buttonClearStorage":
      sendCommand("clearStorage");
      break;
    case "buttonExpandAccordion":
      event.preventDefault();
      detailsAll(state.options, true);
      break;
    case "buttonCollapseAccordion":
      event.preventDefault();
      detailsAll(state.options, false);
      break;
    default:
      if (!id) {
        break;
      }
      if (id.startsWith("buttonAbbr")) {
        insertButtonAbbr(state.lines, id);
        break;
      }
      if (id.startsWith("button=")) {
        displayResult(state, id);
        break;
      }
      return;
  }
  state.lines.focus();
}

function submitListener(state, event) {
  if (!event.target || !event.target.id) {
    return;
  }
  if (displayResult(state, event.target.id)) {
    event.preventDefault();
    state.lines.focus();
  }
}

function changeListener(state, event) {
  if (!event.target || !event.target.id) {
    return;
  }
  switch (event.target.id) {
    case "checkboxTextarea":
      changeTextarea(state.options);
      break;
    case "inputSize":
      changeSize(state.lines, state.options);
      break;
    case "inputBase":
      changeBase(state.options);
      break;
    case "checkboxClipboard":
      changeClipboard(state.options);
      break;
    case "checkboxAccordion":
      changeAccordion(state.options);
      break;
    case "checkboxStore":
      changeStore(state.options);
      break;
    default:
      return;
  }
  state.lines.focus();
}

function focusinListener(state, event) {
  let target = event.target;
  if (!target) {
    return;
  }
  while (!target.id && target.hasChildNodes()) {
    target = target.firstChild;
  }
  if (state.lines.setCurrentId(target.id)) {
    enableCurrent(state.lines, true);
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
      detailsChanges(message.details || {});
      break;
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
      break;
  }
  state.lines.focus();
}

function initMain() {
  const state = new State();
  state.parser = new Parser();
  State.storeChanges = storeChanges;
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
  // for some reason "toggle" does not work if bound to document. We must hack:
  for (let name of Object.getOwnPropertyNames(State.details)) {
    const node = document.getElementById("details" + name);
    node.addEventListener("toggle", (event) => {
      toggleListener(state, name, node, State.details[name]);
    });
  }
  browser.runtime.onMessage.addListener((message) => {
    messageListener(state, message);
  });
}

initLayout();  // do this early
initMain();
sendCommand("sendInitCalc");
