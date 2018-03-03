/* Copyright (C) 2018 Nartin Väth <martin@mvath.de>
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

function getInputSize() {
  return document.getElementById("inputSize");
}

function getInputBase() {
  return document.getElementById("inputBase");
}

function getButtonClearStorage() {
  return document.getElementById("buttonClearStorage");
}

function setCheckboxTextarea(checked) {
  setChecked(getCheckboxTextarea(), checked);
}

function setCheckboxClipboard(checked) {
  setChecked(getCheckboxClipboard(), checked);
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
  appendX(table, "TR", appendButtonTextCol, "buttonClearStorage", null,
    !haveStorage, "titleButtonClearStorage");
  const top = getTop();
  top.appendChild(table);
  appendX(top, "P", appendLink, top);
}

function initOptions(state, options, haveStorage) {
  if (getCheckboxTextarea()) {  // already initialized
    return;
  }
  const stateOptions = state.options = {};
  if (options.textarea) {
    stateOptions.textarea = true;
  }
  if (options.clipboard) {
    stateOptions.clipboard = true;
  }
  if (options.size) {
    const size = sanitizeSize(options.size);
    if (!isDefaultSize(size)) {
      stateOptions.size = size;
    }
  }
  if (options.base) {
    const base = sanitizeBase(options.base);
    if (!isDefaultBase(base)) {
      stateOptions.base = base;
    }
  }
  initPage(stateOptions, haveStorage);
}

function optionsChanges(state, options, changes) {
  if (!state.options) {
    state.options = {};
  }
  if (!options) {
    options = state.options;
  }
  if (changes) {
    applyChanges(options, changes);
  } else {
    changes = calcChanges(state.options, options);
  }
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
  sendCommand("optionsChanges", changes);
}

function changeTextarea(options) {
  const value = isChecked(getCheckboxTextarea());
  if (value == !!options.textarea) {
    return;
  }
  const textareaChange = {};
  const changes = {
    textarea: textareaChange
  };
  if (value) {
    textareaChange.value = options.textarea = true;
  } else {
    delete options.textarea;
  }
  sendChanges(changes);
}

function changeClipboard(options) {
  const value = isChecked(getCheckboxClipboard());
  if (value == !!options.clipboard) {
    return;
  }
  const clipboardChange = {};
  const changes = {
    clipboard: clipboardChange
  };
  if (value) {
    clipboardChange.value = options.clipboard = true;
  } else {
    delete options.clipboard;
  }
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
    case "checkboxClipboard":
      changeClipboard(state.options);
      return;
    case "inputSize":
      changeSize(state.options);
      return;
    case "inputBase":
      changeBase(state.options);
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
    options: null
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
