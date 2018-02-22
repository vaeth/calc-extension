/* Copyright (C) 2018 Nartin Väth <martin@mvath.de>
 * This project is under the GNU public license 2.0
*/

"use strict";

function sanitizeWidth(size) {
  return Math.min(((typeof(size) === "number") ? size :
    (size && size[0])) || 60, 200);
}

function sanitizeHeight(size) {
  return Math.min((size && size[1]) || 1, 20);
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

function appendTextarea(parent, id, size) {
  const textarea = document.createElement("TEXTAREA");
  textarea.cols = sanitizeWidth(size);
  textarea.rows = sanitizeHeight(size);
  textarea.id = id;
  parent.appendChild(textarea);
  return textarea;
}

function appendInput(parent, id, size) {
  const input = document.createElement("INPUT");
  input.type = "text";
  input.id = id;
  input.size = sanitizeWidth(size);
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

function appendButton(parent, id, textId) {
  const button = document.createElement("BUTTON");
  button.type = "button";
  button.id = id;
  button.textContent = browser.i18n.getMessage(textId);
  parent.appendChild(button);
  return button;
}

function appendTextNode(parent, textId, id) {
  if (id) {
    parent.id = id;
  }
  const textNode = document.createTextNode(textId ?
    browser.i18n.getMessage(textId) : "");
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

function appendCheckboxCol(parent, id, checked, textId) {
  appendX(parent, "TD", appendCheckbox, id, checked);
  appendX(parent, "TD", appendTextNode, textId || id);
}

function changeText(id, text) {
  document.getElementById(id).textContent = text;
}
