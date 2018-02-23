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

function getInputSize() {
  return document.getElementById("inputSize");
}

function getInputBase() {
  return document.getElementById("inputBase");
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

function appendNext(state) {
  const index = String(++state.counter);
  const outputId = "output=" + index;
  const top = getTop();
  let element;
  if (isCheckedInputMode()) {
    element = appendX(top, "P", appendFormInput,
      "form=" + index, "input=" + index, state.size);
    const row = document.createElement("TR");
    appendX(row, "TD", appendTextNode, "textResult");
    appendX(row, "TD", appendTextNode, null, outputId);
    appendX(top, "P", appendX, "TABLE", row);
  } else {
    const row = document.createElement("TR");
    appendX(row, "TD", appendButton, "button=" + index, "buttonResult");
    appendX(row, "TD", appendTextNode, null, outputId);
    const paragraph = document.createElement("P");
    appendX(paragraph, "TABLE", row);
    element = appendX(top, "P", appendTextarea, "area=" + index, state.size);
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

function initCalc(state, options) {
  if (getCheckboxInputMode()) {  // already initialized
    return;
  }
  const row = document.createElement("TR");
  appendCheckboxCol(row, "checkboxInputMode", options.inputMode,
    "checkboxInputMode", "titleCheckboxInputMode");
  appendInputCol(row, "inputSize", 3, getSizeText(options.size),
    "inputSize", "titleInputSize");
  appendInputCol(row, "inputBase", 1, getBaseText(options.base),
    "inputBase", "titleinputBase");
  const table = document.createElement("TABLE");
  table.appendChild(row);
  const top = getTop();
  appendX(top, "P", table);
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
