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

function getCheckboxClipboard() {
  return document.getElementById("checkboxClipboard");
}

function getInputSize() {
  return document.getElementById("inputSize");
}

function getInputBase() {
  return document.getElementById("inputBase");
}

function getLastHead() {
  return document.getElementById("lastHead");
}

function enableButtonClipboard() {
  enableButton(document.getElementById("buttonClipboard"), true);
}

function enableStorageButtons(enable) {
  enableButton(document.getElementById("buttonAddSession"), enable);
  enableButton(document.getElementById("buttonClearStored"), enable);
}

function setCheckboxInputMode(checked) {
  setChecked(getCheckboxInputMode(), checked);
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
}

function clearWindow() {
  const top = getTop();
  const lastHead = getLastHead();
  while (top.lastChild != lastHead) {
    top.removeChild(top.lastChild);
  }
}

function appendNext(state, input, output) {
  const index = String(++state.counter);
  const outputId = "output=" + index;
  const top = getTop();
  let second;
  let element;
  if (isChecked(getCheckboxInputMode())) {
    const row = document.createElement("TR");
    appendX(row, "TD", appendTextNode, "textResult");
    appendX(row, "TD", appendTextNode, null, outputId, null, output);
    element = appendX(top, "P", appendFormInput,
      "form=" + index, "input=" + index, state.size, input);
    second = appendX(top, "TABLE", row);
  } else {
    const row = document.createElement("TR");
    second = appendX(row, "TD", appendButton, "button=" + index,
      "buttonResult");
    appendX(row, "TD", appendTextNode, null, outputId, null, output);
    element = appendX(top, "P", appendTextarea, "area=" + index,
      state.size, input);
    appendX(top, "TABLE", row);
  }
  if (second.focus) {
    second.focus();
  }
  if (second.scrollIntoView) {
    second.scrollIntoView(false);
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

function addOptionLine(parent, state, options) {
  const row = document.createElement("TR");
  appendCheckboxCol(row, "checkboxInputMode", options.inputMode,
    "checkboxInputMode", "titleCheckboxInputMode");
  appendInputCol(row, "inputSize", 3, getSizeText(state.size),
    "inputSize", "titleInputSize");
  appendInputCol(row, "inputBase", 1, getBaseText(state.base),
    "inputBase", "titleinputBase");
  appendX(parent, "TABLE", row);
}

function addStorageLine(parent, disabled) {
  const row = document.createElement("TR");
  appendX(row, "TD", appendButton, "buttonAllClipboard");
  appendX(row, "TD", appendButton, "buttonStoreSession", null);
  appendX(row, "TD", appendButton, "buttonAddSession", null, disabled);
  appendX(row, "TD", appendButton, "buttonClearStored", null, disabled);
  appendX(row, "TD", appendButton, "buttonClear");
  appendX(row, "TD", appendTextNode, "textClear", null, "titleTextClear");
  appendX(parent, "TABLE", row);
}

function initWindow(state, options) {
  const row = getLastRow();
  appendCheckboxCol(row, "checkboxClipboard", options.clipboard, null,
    "titleCheckboxClipboard");
  appendX(row, "TD", appendButton, "buttonClipboard", null, true);
  const optionLine = document.createElement("P");
  addOptionLine(optionLine, state, options);
  const storageLine = document.createElement("P");
  addStorageLine(storageLine, !state.storedLast);
  const top = getTop();
  top.appendChild(optionLine);
  storageLine.id = "lastHead";
  top.appendChild(storageLine);
  appendNext(state);
}

function clearAll(state) {
  clearWindow();
  state.count = 0;
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

function toClipboardUnsafe(text) {
  const textarea = document.createElement("TEXTAREA");
  textarea.value = (text || "");
  const top = getTop();
  top.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  top.removeChild(textarea);
}

function toClipboard(text) {
  try {
    toClipboardUnsafe(text);
  }
  catch (error) {  // tacitly ignore clipboard issues
  }
}

function lastToClipboard(state) {
  const lastString = state.lastString;
  if (typeof(lastString) == "string") {
    toClipboard(lastString);
  }
}
