/* Copyright (C) 2018 Nartin Väth <martin@mvath.de>
 * This project is under the GNU public license 2.0
*/

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

function getCheckboxInputMode() {
  return document.getElementById("checkboxInputMode");
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

function isCheckedInputMode() {
  const checkboxInputMode = getCheckboxInputMode();
  return !!(checkboxInputMode && checkboxInputMode.checked);
}

function setCheckboxInputMode(checked) {
  const checkboxInputMode = getCheckboxInputMode();
  if (checkboxInputMode && (checkboxInputMode.checked != !!checked)) {
    checkboxInputMode.checked = !!checked;
  }
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

function valueInputSize() {
  return getSize(getInputSize().value);
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

function valueInputBase() {
  return getBase(getInputBase().value);
}

function enableButtonClearStorage(enable) {
  const buttonClearStorage = getButtonClearStorage();
  const disabled = (enable ? false : true);
  if (buttonClearStorage && (!!buttonClearStorage.disabled != disabled)) {
    buttonClearStorage.disabled = disabled;
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
  appendX(table, "TR", appendCheckboxCol, "checkboxInputMode",
    options.inputMode, "titleInputMode");
  appendX(table, "TR", appendInputCol, "inputSize", 3,
    getSizeText(options.size), "titleInputSize");
  appendX(table, "TR", appendInputCol, "inputBase", 1,
    getBaseText(options.base), "titleInputBase");
  appendX(table, "TR", appendButtonTextCol, "buttonClearStorage",
    "buttonClearStorage", !haveStorage, "textClearStorage");
  const top = getTop();
  appendX(top, "P", table);
  appendX(top, "P", appendLink, top);
}

function initOptions(state, options, haveStorage) {
  if (getCheckboxInputMode()) {  // already initialized
    return;
  }
  const stateOptions = state.options = {};
  if (options.inputMode) {
    stateOptions.inputMode = true;
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

function optionChanges(state, changes) {
  if (!state.options) {
    state.options = {};
  }
  const options = state.options;
  if (changes.inputMode) {
    if (changes.inputMode.value) {
      if (!options.inputMode) {
        options.inputMode = true;
        setCheckboxInputMode(true);
      }
    } else {
      delete options.inputMode;
      setCheckboxInputMode(false);
    }
  }
  if (changes.size) {
    const size = sanitizeSize(changes.size.value);
    if (!equalSize(sanitizeSize(options.size), size)) {
      if (isDefaultSize(size)) {
        delete options.size;
      } else {
        options.size = size;
      }
      setInputSize(size);
    }
  }
  if (changes.base) {
    const base = sanitizeBase(changes.base.value);
    if (sanitizeBase(options.base) !== base) {
      if (isDefaultBase(base)) {
        delete options.base;
      } else {
        options.base = base;
      }
    }
    setInputBase(base);
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
  sendCommand("optionChanges", changes);
}

function changeInputMode(options) {
  const value = !!isCheckedInputMode();
  if (value == !!options.inputMode) {
    return;
  }
  const inputModeChange = {};
  const changes = {
    inputMode: inputModeChange
  };
  if (value) {
    inputModeChange.value = options.inputMode = true;
  } else {
    delete options.inputMode;
  }
  sendChanges(changes);
}

function changeSize(options) {
  const size = valueInputSize();
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
  const base = valueInputBase();
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
    case "checkboxInputMode":
      changeInputMode(state.options);
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
    case "optionChanges":
      optionChanges(state, message.changes);
      return;
    case "haveStorageChanges":
      enableButtonClearStorage(message.haveStorage);
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
