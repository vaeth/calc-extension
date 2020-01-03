/* Copyright (C) 2018-2020 Martin Väth <martin@mvath.de>
 * This project is under the GNU public license 2.0
 */

"use strict";

function getElementById(id) {
  return (typeof(id) == "string") ? document.getElementById(id) : null;
}

function clearItem(top) {
  while (top.lastChild) {
    top.removeChild(top.lastChild);
  }
}

function setOpen(details, open) {
  if (details && (!details.open != !open)) {
    details.open = !!open;
  }
}

function isChecked(checkbox) {
    return !!(checkbox && checkbox.checked);
}

function setChecked(checkbox, checked) {
  if (checkbox && (!checkbox.checked != !checked)) {
    checkbox.checked = !!checked;
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
  return 80;
}

function sanitizeHeight(size) {
  const height = ((Array.isArray(size) && size[1]) || 0);
  if (height && (height > 0)) {
    return Math.min(height, 20);
  }
  return 5;
}

function appendCheckbox(parent, id, checked, titleId) {
  const checkbox = document.createElement("INPUT");
  checkbox.type = "checkbox";
  if (checked) {
    checkbox.checked = checked;
  }
  if (titleId) {
    checkbox.title = compatible.getMessage(titleId);
  }
  checkbox.id = id;
  parent.appendChild(checkbox);
  return checkbox;
}

function appendTextarea(parent, id, size, value, titleId) {
  const textarea = document.createElement("TEXTAREA");
  textarea.cols = sanitizeWidth(size);
  textarea.rows = sanitizeHeight(size);
  textarea.id = id;
  if (value) {
    textarea.value = value;
  }
  if (titleId) {
    textarea.title = compatible.getMessage(titleId);
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
    input.title = compatible.getMessage(titleId);
  }
  parent.appendChild(input);
  return input;
}

function appendFormInput(parent, formId, id, size, value, titleId) {
  const form = document.createElement("FORM");
  form.id = formId;
  form.autocomplete = "off";
  const input = appendInput(form, id, size, value, titleId);
  parent.appendChild(form);
  return input;
}

function appendButton(parent, id, textId, disabled, text, titleId, fontWeightId) {
  const button = document.createElement("BUTTON");
  button.type = "button";
  button.id = id;
  if (disabled) {
    button.disabled = true;
  }
  if (titleId) {
    button.title = compatible.getMessage(titleId);
  }
  if (fontWeightId) {
    button.style.fontWeight = compatible.getMessage(fontWeightId);
  }
  button.textContent = (text || compatible.getMessage(textId || id));
  parent.appendChild(button);
  return button;
}

function appendTextNode(parent, textId, id, titleId, text) {
  if (id) {
    parent.id = id;
  }
  if (titleId) {
    parent.title = compatible.getMessage(titleId);
  }
  const textNode = document.createTextNode(textId ?
    compatible.getMessage(textId) : (text || ""));
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
  const element = document.getElementById(id);
  if (element) {
    element.textContent = text;
  }
}
