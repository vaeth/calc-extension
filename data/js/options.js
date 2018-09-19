/* Copyright (C) 2018 Martin Väth <martin@mvath.de>
 * This project is under the GNU public license 2.0
*/

"use strict";

function getTop() {
  return document.getElementById("top");
}

function setTitle(title) {
  changeText("pageTitle", title);
}

function initLayout() {
  const title = browser.i18n.getMessage("extensionName");
  setTitle(title);
}

function getCheckboxTextarea() {
  return document.getElementById("checkboxTextarea");
}

function getCheckboxClipboard() {
  return document.getElementById("checkboxClipboard");
}

function getCheckboxAccordion() {
  return document.getElementById("checkboxAccordion");
}

function getCheckboxStore() {
  return document.getElementById("checkboxStore");
}

function getInputSize() {
  return document.getElementById("inputSize");
}

function getInputBase() {
  return document.getElementById("inputBase");
}

function getButtonClearStorage() {
  return document.getElementById("buttonClearStorage");
}

function isCheckedTextarea() {
  return isChecked(getCheckboxTextarea());
}

function setCheckboxTextarea(checked) {
  setChecked(getCheckboxTextarea(), checked);
}

function isCheckedClipboard() {
  return isChecked(getCheckboxClipboard());
}

function setCheckboxClipboard(checked) {
  setChecked(getCheckboxClipboard(), checked);
}

function isCheckedAccordion() {
  return isChecked(getCheckboxAccordion());
}

function setCheckboxAccordion(checked) {
  setChecked(getCheckboxAccordion(), checked);
}

function isCheckedStore() {
  return isChecked(getCheckboxStore());
}

function setCheckboxStore(checked) {
  setChecked(getCheckboxStore(), checked);
}

function setInputSize(size) {
  const inputSize = getInputSize();
  if (!inputSize) {
    return;
  }
  const text = getSizeText(size);
  if (inputSize.value !== text) {
    inputSize.value = text;
  }
}

function setInputBase(base) {
  const inputBase = getInputBase();
  if (!inputBase) {
    return;
  }
  const text = getBaseText(base);
  if (inputBase.value !== text) {
    inputBase.value = text;
  }
}

function appendLink(parent) {
  const link = document.createElement("A");
  const url = browser.extension.getURL("data/html/tab.html");
  link.href = url;
  link.target = "_blank";
  link.textContent = browser.i18n.getMessage("textLinkOpen");
  link.referrerpolicy = "no-referrer";
  parent.appendChild(link);
}

function initPage(options, haveStorage) {
  const table = document.createElement("TABLE");
  appendX(table, "TR", appendCheckboxCol, "checkboxTextarea",
    options.textarea, "titleCheckboxTextarea");
  appendX(table, "TR", appendInputCol, "inputSize", 3,
    getSizeText(options.size), "titleInputSize");
  appendX(table, "TR", appendInputCol, "inputBase", 1,
    getBaseText(options.base), "titleInputBase");
  appendX(table, "TR", appendCheckboxCol, "checkboxClipboard",
    options.clipboard, "titleCheckboxClipboard");
  appendX(table, "TR", appendCheckboxCol, "checkboxAccordion",
    options.textarea, "titleCheckboxAccordion");
  appendX(table, "TR", appendCheckboxCol, "checkboxStore",
    options.store, "titleCheckboxStore");
  appendX(table, "TR", appendButtonTextCol, "buttonClearStorage", null,
    !haveStorage, "titleButtonClearStorage");
  const top = getTop();
  top.appendChild(table);
  appendX(top, "DIV", appendLink, top);
}

function initOptions(state, options, haveStorage) {
  if (getCheckboxAccordion()) {  // already initialized
    return;
  }
  state.options = addOptions({}, options);
  initPage(state.options, haveStorage);
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
    setCheckboxTextarea(changes.textarea.value);
  }
  if (changes.size) {
    const size = sanitizeSize(changes.size.value);
    if (isDefaultSize(size)) {
      delete options.size;
    }
    setInputSize(size);
  }
  if (changes.base) {
    const base = sanitizeBase(changes.base.value);
    if (isDefaultBase(base)) {
      delete options.base;
    }
    setInputBase(base);
  }
  if (changes.clipboard) {
    setCheckboxClipboard(changes.clipboard.value);
  }
  if (changes.accordion) {
    setCheckboxAccordion(changes.accordion.value);
  }
  if (changes.store) {
    setCheckboxStore(changes.store.value);
  }
}

function sendCommand(command, changes) {
  const message = {
    command: command
  };
  if (changes) {
    message.changes = changes;
  }
  browser.runtime.sendMessage(message);
}

function sendChanges(changes) {
  if (changes) {
    sendCommand("optionsChanges", changes);
  }
}

function changeTextarea(options) {
  const value = isCheckedTextarea();
  const changes = booleanChanges(options, "textarea", value);
  sendChanges(changes);
}

function changeClipboard(options) {
  const value = isCheckedClipboard();
  const changes = booleanChanges(options, "clipboard", value);
  sendChanges(changes);
}

function changeAccordion(options) {
  const value = isCheckedAccordion();
  const changes = booleanChanges(options, "accordion", value);
  if (changes && !value) {
    sendCommand("clearDetails");
  }
  sendChanges(changes);
}

function changeStore(options) {
  const value = isCheckedStore();
  const changes = booleanChanges(options, "store", value);
  sendChanges(changes);
}

function changeSize(options) {
  const size = getSize(getInputSize().value);
  if (!equalSize(sanitizeSize(options.size), size)) {
    const sizeChange = {};
    const changes = {
      size: sizeChange
    }
    if (isDefaultSize(size)) {
      delete options.size;
    } else {
      sizeChange.value = options.size = size;
    }
    sendChanges(changes);
  }
  setInputSize(size);
}

function changeBase(options) {
  const base = getBase(getInputBase().value);
  if (sanitizeBase(options.base) != base) {
    const baseChange = {};
    const changes = {
      base: baseChange
    }
    if (isDefaultBase(base)) {
      delete options.base;
    } else {
      baseChange.value = options.base = base;
    }
    sendChanges(changes);
  }
  setInputBase(base);
}

function changeListener(state, event) {
  if (!event.target || !event.target.id) {
    return;
  }
  switch (event.target.id) {
    case "checkboxTextarea":
      changeTextarea(state.options);
      return;
    case "inputSize":
      changeSize(state.options);
      return;
    case "inputBase":
      changeBase(state.options);
      return;
    case "checkboxClipboard":
      changeClipboard(state.options);
      return;
    case "checkboxAccordion":
      changeAccordion(state.options);
      return;
    case "checkboxStore":
      changeStore(state.options);
      return;
  }
}

function clickListener(state, event) {
  if (!event.target || !event.target.id) {
    return;
  }
  switch (event.target.id) {
    case "buttonClearStorage":
      sendCommand("clearStorage");
      return;
  }
}

function messageListener(state, message) {
  if (!message.command) {
    return;
  }
  switch (message.command) {
    case "initOptions":
      initOptions(state, message.options, message.haveStorage);
      return;
    case "optionsChanges":
    case "storageOptionsChanges":
      optionsChanges(state, message.options, message.changes);
      return;
    case "haveStorageChanges":
      enableButton(getButtonClearStorage(), message.haveStorage);
      return;
  }
}

function initMain() {
  const state = {
    options: {}
  };
  document.addEventListener("change", (event) => {
    changeListener(state, event);
  })
  document.addEventListener("click", (event) => {
    clickListener(state, event);
  });
  browser.runtime.onMessage.addListener((message) => {
    messageListener(state, message);
  });
}

initLayout();  // do this quickly
initMain();
sendCommand("sendInitOptions");
