/* Copyright (C) 2018 Nartin Väth <martin@mvath.de>
 * This project is under the GNU public license 2.0
*/

"use strict";

function isChecked(checkbox) {
    return !!(checkbox && checkbox.checked);
}

function setChecked(checkbox, checked) {
  if (checkbox && (!checkbox.checked != !checked)) {
    checkboxInputMode.checked = !!checked;
  }
}

function enableButton(button, enable) {
  if (button && (!button.disabled == !enable)) {
    button.disabled = !enable;
  }
}

function sanitizeWidth(size) {
  const width = ((typeof(size) === "number") ? size :
    ((Array.isArray(size) && size[0]) || 0));
  if (width && (width > 0)) {
    return Math.min(width, 200);
  }
  return 60;
}

function sanitizeHeight(size) {
  const height = ((Array.isArray(size) && size[1]) || 0);
  if (height && (height > 0)) {
    return Math.min(height, 20);
  }
  return 1;
}

function appendCheckbox(parent, id, checked, titleId) {
  const checkbox = document.createElement("INPUT");
  checkbox.type = "checkbox";
  if (checked) {
    checkbox.checked = checked;
  }
  if (titleId) {
    checkbox.title = browser.i18n.getMessage(titleId);
  }
  checkbox.id = id;
  parent.appendChild(checkbox);
}

function appendTextarea(parent, id, size, value) {
  const textarea = document.createElement("TEXTAREA");
  textarea.cols = sanitizeWidth(size);
  textarea.rows = sanitizeHeight(size);
  textarea.id = id;
  if (value) {
    textarea.value = value;
  }
  parent.appendChild(textarea);
  return textarea;
}

function appendInput(parent, id, size, value, titleId) {
  const input = document.createElement("INPUT");
  input.type = "text";
  input.id = id;
  input.size = sanitizeWidth(size);
  if (value) {
    input.value = value;
  }
  if (titleId) {
    input.title = browser.i18n.getMessage(titleId);
  }
  parent.appendChild(input);
  return input;
}

function appendFormInput(parent, formId, id, size) {
  const form = document.createElement("FORM");
  form.id = formId;
  form.autocomplete = "off";
  const input = appendInput(form, id, size);
  parent.appendChild(form);
  return input;
}

function appendButton(parent, id, textId, disabled) {
  const button = document.createElement("BUTTON");
  button.type = "button";
  button.id = id;
  if (disabled) {
    button.disabled = true;
  }
  button.textContent = browser.i18n.getMessage(textId || id);
  parent.appendChild(button);
  return button;
}

function appendTextNode(parent, textId, id, titleId, text) {
  if (id) {
    parent.id = id;
  }
  if (titleId) {
    parent.title = browser.i18n.getMessage(titleId);
  }
  const textNode = document.createTextNode(textId ?
    browser.i18n.getMessage(textId) : (text || ""));
  parent.appendChild(textNode);
  return textNode;
}

function appendX(parent, type, appendItem) {
  const item = document.createElement(type);
  if (typeof(appendItem) !== "function") {
    item.appendChild(appendItem);
    parent.appendChild(item);
    return appendItem;
  }
  const args = Array.apply(null, arguments);
  args.splice(0, 3, item);
  const element = appendItem.apply(null, args);
  parent.appendChild(item);
  return element;
}

function appendCheckboxCol(parent, id, checked, textId, titleId) {
  appendX(parent, "TD", appendCheckbox, id, checked, titleId);
  appendX(parent, "TD", appendTextNode, textId || id, null, titleId);
}

function appendInputCol(parent, id, size, value, textId, titleId) {
  appendX(parent, "TD", appendInput, id, size, value, titleId);
  appendX(parent, "TD", appendTextNode, textId || id, null, titleId);
}

function appendButtonTextCol(parent, id, buttonTextId, disabled, textId) {
  appendX(parent, "TD", appendButton, id, buttonTextId, disabled);
  appendX(parent, "TD", appendTextNode, textId);
}

function changeText(id, text) {
  document.getElementById(id).textContent = text;
}
