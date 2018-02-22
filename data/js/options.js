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

function checkedInputMode() {
  return getCheckboxInputMode().checked;
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

function initOptions(state, options) {
  if (getCheckboxInputMode()) {  // already initialized
    return;
  }
  state.options = (options || {});
  const table = document.createElement("TABLE");
  appendX(table, "TR", appendCheckboxCol, "checkboxInputMode",
    state.options.inputMode, "optionsInputMode");
  const top = getTop();
  appendX(top, "P", table);
  appendX(top, "P", appendLink, top);
}

function optionChanges(state, changes) {
  const checkboxInputMode = getCheckboxInputMode();
  if (!state.options) {
    state.options = {};
  }
  const options = state.options;
  if (changes.inputMode) {
    if (changes.inputMode.value) {
      if (!options.inputMode) {
        options.inputMode = true;
        if (checkboxInputMode) {
          checkboxInputMode.checked = true;
        }
      }
    } else {
      delete options.inputMode;
      if (checkboxInputMode) {
        checkboxInputMode.checked = false;
      }
    }
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

function changeInputMode(state) {
  const value = !!checkedInputMode();
  const options = state.options;
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

function checkboxListener(state, event) {
  if (!event.target || !event.target.id) {
    return;
  }
  const options = state.options;
  switch (event.target.id) {
    case "checkboxInputMode":
      changeInputMode(state);
      return;
  }
}

function messageListener(state, message) {
  if (!message.command) {
    return;
  }
  switch (message.command) {
    case "initOptions":
      initOptions(state, message.options);
      return;
    case "optionChanges":
      optionChanges(state, message.changes);
      return;
  }
}

function initMain() {
  const state = {
    options: null
  };
  document.addEventListener("CheckboxStateChange", (event) => {
    checkboxListener(state, event);
  });
  browser.runtime.onMessage.addListener((message) => {
    messageListener(state, message);
  });
}

initLayout();  // do this quickly
initMain();
sendCommand("sendInitOptions");
