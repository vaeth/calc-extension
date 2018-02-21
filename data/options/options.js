/* Copyright (C) 2018 Nartin Väth <martin@mvath.de>
 * This project is under the GNU public license 2.0
*/

function getTop() {
  return document.getElementById("top");
}

function setTitle(title) {
  document.getElementById("pageTitle").textContent = title;
}

function initLayout() {
  const title = browser.i18n.getMessage("extensionName");
  setTitle(title);
}

function getCheckboxInputMode() {
  return document.getElementById("checkboxInputMode");
}

function appendCheckbox(parent, id, checked) {
  const checkbox = document.createElement("INPUT");
  checkbox.type = "checkbox";
  if (checked) {
    checkbox.checked = checked;
  }
  checkbox.id = id;
  parent.appendChild(checkbox);
}

function appendCheckboxCol(row, id, checked) {
  const col = document.createElement("TD");
  appendCheckbox(col, id, checked);
  row.appendChild(col);
}

function appendTextNodeCol(parent, id) {
  const col = document.createElement("TD");
  const textNode = document.createTextNode(browser.i18n.getMessage(id));
  col.appendChild(textNode);
  parent.appendChild(col);
}

function appendLink(parent) {
  const link = document.createElement("A");
  const url = browser.extension.getURL("data/tab/index.html");
  link.href = url;
  link.target = "_blank";
  link.textContent = browser.i18n.getMessage("textLinkOpen");
  link.referrerpolicy = "no-referrer";
  parent.appendChild(link);
}

function appendLinkParagraph(parent) {
  const paragraph = document.createElement("A");
  appendLink(paragraph);
  parent.appendChild(paragraph);
}

function appendCheckboxRow(parent, id, checked) {
  const row = document.createElement("TR");
  appendCheckboxCol(row, id, checked);
  appendTextNodeCol(row, id);
  parent.appendChild(row);
}

function appendInitially(options) {
  const table = document.createElement("TABLE");
  appendCheckboxRow(table, "checkboxInputMode", options.inputMode);
  const paragraph = document.createElement("P");
  paragraph.appendChild(table);
  const top = getTop();
  top.appendChild(paragraph);
  appendLinkParagraph(top);
}

function sendCommand(command, options) {
  const message = {
    command: command
  };
  if (options) {
    message.options = options;
  }
  browser.runtime.sendMessage(message);
}

function sendOptions(options) {
  sendCommand("setOptions", options);
}

function checkboxListener(state, event) {
  if (!event.target || !event.target.id) {
    return;
  }
  const options = state.options;
  switch (event.target.id) {
    case "checkboxInputMode":
      if (getCheckboxInputMode().checked) {
        if (!options.inputMode) {
          options.inputMode = true;
          sendOptions(options);
        }
        return;
      }
      if (options.inputMode) {
        delete options.inputMode;
        sendOptions(options);
      }
      return;
  }
}

function setOptions(state, options) {
  state.options = (options || {});
  const checkboxInputMode = getCheckboxInputMode();
  if (!checkboxInputMode) {
    appendInitially(options);
    return;
  }
  const inputMode = !!options.inputMode;
  if (inputMode != !!checkboxInputMode.checked) {
    checkboxInputMode.checked = inputMode;
  }
}

function messageListener(state, message) {
  if (!message.command) {
    return;
  }
  switch (message.command) {
    case "options":
      setOptions(state, message.options || {});
      return;
  }
}

function mainInit() {
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
mainInit();
sendCommand("sendOptions");
