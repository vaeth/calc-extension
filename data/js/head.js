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

function setHead(text) {
  const head = document.getElementById("headTitle");
  head.appendChild(document.createTextNode("\xa0" + text));
}

function getLastRow() {
  return document.getElementById("lastRow");
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

function enableStorageButtons(enable) {
  enableButton(document.getElementById("buttonAddSession"), enable);
  enableButton(document.getElementById("buttonClearStored"), enable);
}

function setCheckboxInputMode(checked) {
  setChecked(getCheckboxInputMode(), checked);
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

function initLayout() {
  const title = browser.i18n.getMessage("extensionName");
  setTitle(title);
  setHead(title);
  const translateId = [
    "announceExamples",
    "announceOperators",
    "announceFunctions",
    "announceConstants",
    "announceInline", "textInline",
    "announceLast"
  ];
  for (let id of translateId) {
    const translation = browser.i18n.getMessage(id);
    document.getElementById(id).textContent = translation;
  }
  const row = getLastRow();
  appendX(row, "TD", appendTextNode, null, null, null, "#");
}

function appendNext(state, input, output) {
  const index = String(++state.counter);
  const outputId = "output=" + index;
  const top = getTop();
  let element;
  if (isChecked(getCheckboxInputMode())) {
    element = appendX(top, "P", appendFormInput,
      "form=" + index, "input=" + index, state.size, input);
    const row = document.createElement("TR");
    appendX(row, "TD", appendTextNode, "textResult");
    appendX(row, "TD", appendTextNode, null, outputId, null, output);
    appendX(top, "P", appendX, "TABLE", row);
  } else {
    const row = document.createElement("TR");
    appendX(row, "TD", appendButton, "button=" + index, "buttonResult");
    appendX(row, "TD", appendTextNode, null, outputId, null, output);
    const paragraph = document.createElement("P");
    appendX(paragraph, "TABLE", row);
    element = appendX(top, "P", appendTextarea, "area=" + index,
      state.size, input);
    top.appendChild(paragraph);
  }
  element.focus();
}

function removeLine(id) {
  let node = document.getElementById(id);
  if (!node) {
    return;
  }
  const topNode = getTop();
  for (;;) {
    const parentNode = node.parentNode;
    if (parentNode == topNode) {
      break;
    }
    node = parentNode;
  }
  topNode.removeChild(node);
}

function addOptionLine(parent, options) {
  const row = document.createElement("TR");
  appendCheckboxCol(row, "checkboxInputMode", options.inputMode,
    "checkboxInputMode", "titleCheckboxInputMode");
  appendInputCol(row, "inputSize", 3, getSizeText(options.size),
    "inputSize", "titleInputSize");
  appendInputCol(row, "inputBase", 1, getBaseText(options.base),
    "inputBase", "titleinputBase");
  appendX(parent, "TABLE", row);
}

function addStorageLine(parent, session) {
  const row = document.createElement("TR");
  appendX(row, "TD", appendButton, "buttonStoreSession");
  appendX(row, "TD", appendButton, "buttonAddSession", null, !session);
  appendX(row, "TD", appendButton, "buttonClearStored", null, !session);
  appendX(parent, "TABLE", row);
}

function initCalc(state, options, session) {
  if (getCheckboxInputMode()) {  // already initialized
    return;
  }
  const optionLine = document.createElement("P");
  addOptionLine(optionLine, options);
  const storageLine = document.createElement("P");
  addStorageLine(storageLine, session);
  const top = getTop();
  top.appendChild(optionLine);
  top.appendChild(storageLine);
  appendNext(state);
}

function changeInputWidth(parent, width) {
  if (!parent.hasChildNodes()) {
    return;
  }
  for (let child of parent.childNodes) {
    if ((child.nodeName === "INPUT") && child.id.startsWith("input=")) {
      child.size = width;
    } else {
      changeInputWidth(child, width);
    }
  }
}

function changeSize(state, size, forceRedisplay) {
  const oldSize = state.size;
  state.size = size;
  if (forceRedisplay || !equalSize(oldSize, size)) {
    setInputSize(size);
  }
  if (oldSize[0] != size[0]) {
    changeInputWidth(getTop(), size[0]);
  }
}

function changeBase(state, base, forceRedisplay) {
   if (forceRedisplay || (state.base != base)) {
     setInputBase(base);
   }
   state.base = base;
}

function toClipboard(text) {
  const textarea = document.createElement("TEXTAREA");
  textarea.value = (text || "");
  textarea.select();
  document.execCommand("copy");
}
