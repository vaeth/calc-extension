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

function displayLastString(state) {
  changeText("lastString", state.lastString);
  enableButtonClipboard();
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

function translateExamples() {
  const examples = document.getElementById("detailsExamples");
  const td = document.createElement("TD");
  appendTextNode(td, "textResult");
  for (let table of examples.children) {
    if (table.nodeName !== "TABLE") {
      continue;
    }
    let row = table;
    while (row.nodeName !== "TR") {
      row = row.firstChild;
    }
    row.insertBefore(td.cloneNode(true), row.firstChild);
  }
  const baseResults = [
    "textResult1",
    "textResult2"
  ];
  for (let id of baseResults) {
    const element = document.getElementById(id);
    element.textContent =
      browser.i18n.getMessage("messageResult", [element.textContent, "16"]);
  }
}

function initLayout() {
  const title = browser.i18n.getMessage("extensionName");
  setTitle(title);
  setHead(title);
  const translateId = [
    "announceExamples",
    "announceBinaryOperators",
    "announceFunctions",
    "announceConstants",
    "announceNumbers",
    "announceLast",
    "announceOptions",
    "announceSession",
    "announceEditing"
  ];
  for (let id of translateId) {
    const translation = browser.i18n.getMessage(id);
    document.getElementById(id).textContent = translation;
  }
  translateExamples();
  const rightToLeftId = [
    "textRightToLeft1",
    "textRightToLeft2"
  ];
  const textRightToLeft = browser.i18n.getMessage("textRightToLeft");
  for (let id of rightToLeftId) {
    document.getElementById(id).textContent = textRightToLeft;
  }
}

function clearWindow() {
  const top = getTop();
  while (top.lastChild) {
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

function initWindowLast(clipboard) {
  const row = document.getElementById("lastRow");
  appendCheckboxCol(row, "checkboxClipboard", clipboard, null,
    "titleCheckboxClipboard");
  appendX(row, "TD", appendButton, "buttonClipboard", null, true);
  appendX(row, "TD", appendButton, "buttonAllClipboard");
}

function initWindowOptions(inputMode, size, base) {
  const rowInputMode = document.getElementById("rowInputMode");
  const rowSize = document.getElementById("rowSize");
  const rowBase = document.getElementById("rowBase");
  appendCheckboxCol(rowInputMode, "checkboxInputMode", inputMode,
    null, "titleCheckboxInputMode");
  appendX(rowInputMode, "TD", appendButton, "buttonAbbrExclam",
    null, null, "!");
  appendX(rowInputMode, "TD", appendTextNode, "textOptionOn");
  appendX(rowInputMode, "TD", appendButton, "buttonAbbrQuestion",
    null, null, "?");
  appendX(rowInputMode, "TD", appendTextNode, "textOptionOff");
  appendInputCol(rowSize, "inputSize", 3, getSizeText(size),
    "inputSize", "titleInputSize");
  appendX(rowSize, "TD", appendButton, "buttonAbbrSize805",
    null, null, "'80:5'");
  appendX(rowSize, "TD", appendButton, "buttonAbbrSize00",
    null, null, "'0:0'");
  appendInputCol(rowBase, "inputBase", 1, getBaseText(base),
    "inputBase", "titleinputBase");
  appendX(rowBase, "TD", appendButton, "buttonAbbrBase16", null, null, '"16"');
  appendX(rowBase, "TD", appendButton, "buttonAbbrBase8", null, null, '"8"');
  appendX(rowBase, "TD", appendButton, "buttonAbbrBaseEmpty",
    null, null, '""');
}

function initWindowSession(disabled) {
  const row = document.getElementById("rowSession");
  appendX(row, "TD", appendButton, "buttonStoreSession", null);
  appendX(row, "TD", appendButton, "buttonAddSession", null, disabled);
  appendX(row, "TD", appendButton, "buttonClearStored", null, disabled);
}

function initWindowEditing() {
  const row = document.getElementById("rowEditing");
  appendX(row, "TD", appendButton, "buttonClear");
  appendX(row, "TD", appendTextNode, "textClear", null, "titleTextClear");
}

function initWindow(state, options) {
  initWindowLast(options.clipboard);
  initWindowOptions(options.inputMode, state.size, state.base);
  initWindowSession(!state.storedLast);
  initWindowEditing();
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
    changeInputWidth(getTop(), size[0] || 60);
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
