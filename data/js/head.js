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
  enableButton(document.getElementById("buttonRestoreSession"), enable);
  enableButton(document.getElementById("buttonAddSession"), enable);
  enableButton(document.getElementById("buttonClearStored"), enable);
}

function setCheckboxInputMode(checked) {
  setChecked(getCheckboxInputMode(), checked);
}

function setCheckboxClipboard(checked) {
  setChecked(getCheckboxClipboard(), checked);
}

function enableCurrent(lines, enable) {
  if (!lines.enabled == !enable) {
    return;
  }
  lines.enabled = !!enable;
  for (let i of State.buttonsAbbrArray) {
    enableButton(document.getElementById(i), enable);
  }
  for (let i of [
    "buttonRedrawLine",
    "buttonCleanLine",
    "buttonRemoveLine",
    "buttonMoveLineUp",
    "buttonMoveLineDown",
    "buttonInsertLine"
    ]) {
    enableButton(document.getElementById(i), enable);
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
  for (let id of [
    "textResult1",
    "textResult2"
    ]) {
    const element = document.getElementById(id);
    element.textContent =
      browser.i18n.getMessage("messageResult", [element.textContent, "16"]);
  }
}

function initLayout() {
  const title = browser.i18n.getMessage("extensionName");
  setTitle(title);
  setHead(title);
  for (let id of [
    "announceExamples",
    "announceBinaryOperators",
    "announceFunctions",
    "announceConstants",
    "announceNumbers",
    "announceLast",
    "announceOptions",
    "announceSession",
    "announceEditing"
    ]) {
    const translation = browser.i18n.getMessage(id);
    document.getElementById(id).textContent = translation;
  }
  translateExamples();
  const textRightToLeft = browser.i18n.getMessage("textRightToLeft");
  for (let id of [
    "textRightToLeft1",
    "textRightToLeft2"
    ]) {
    document.getElementById(id).textContent = textRightToLeft;
  }
}

function clearWindow() {
  const top = getTop();
  while (top.lastChild) {
    top.removeChild(top.lastChild);
  }
}

function appendNext(state, input, output, before, omitFocus) {
  const lines = state.lines;
  const beforeNode = (lines.isValidIndex(before) ?
    document.getElementById(lines.getLine(before).paragraph) : null);
  const line = lines.generateLine(!isChecked(getCheckboxInputMode()));
  lines.currentIndex = lines.insertLine(line, before);
  const paragraph = document.createElement("P");
  paragraph.id = line.paragraph;
  const row = document.createElement("TR");
  if (line.isInput) {
    appendFormInput(paragraph, line.form, line.input, state.size, input);
    appendX(row, "TD", appendTextNode, "textResult", line.result);
    appendX(row, "TD", appendTextNode, null, line.output, null, output);
  } else {
    appendTextarea(paragraph, line.input, state.size, input);
    appendX(row, "TD", appendButton, line.result, "buttonResult");
    appendX(row, "TD", appendTextNode, null, line.output, null, output);
  }
  const table = document.createElement("TABLE");
  table.id = line.table;
  table.appendChild(row);
  const top = getTop();
  top.insertBefore(paragraph, beforeNode);
  top.insertBefore(table, beforeNode);
  if (!omitFocus) {
    lines.focus();
  }
}

function swapLines(line1, line2) {
  const top = getTop();
  const a1 = document.getElementById(line1.paragraph);
  const b1 = document.getElementById(line1.table);
  const a2 = document.getElementById(line2.paragraph);
  const b2 = document.getElementById(line2.table);
  top.removeChild(b1);
  top.insertBefore(b1, a2);
  top.removeChild(b2);
  top.insertBefore(b2, a1);
  top.removeChild(a1);
  top.insertBefore(a1, b1);
  top.removeChild(a2);
  top.insertBefore(a2, b2);
}

function removeLine(lines, index) {
  const line = lines.getLine(index);
  if (!line) {
    return false;
  }
  if (!lines.isValidIndex(index) || (index === lines.currentIndex)) {
    enableCurrent(lines, false);  // race: disable until we get focus again
  }
  lines.removeLine(index);  // order matters: first invalidate currentIndex
  const top = getTop();
  top.removeChild(document.getElementById(line.table));
  top.removeChild(document.getElementById(line.paragraph));
  return true;
}

function initWindowLast(clipboard) {
  const row = document.getElementById("lastRow");
  appendCheckboxCol(row, "checkboxClipboard", clipboard, null,
    "titleCheckboxClipboard");
  appendX(row, "TD", appendButton, "buttonClipboard", null, true);
  appendX(row, "TD", appendButton, "buttonAllClipboard");
}

function initWindowOptions(inputMode, size, base, linesEnabled) {
  const disabled = !linesEnabled;
  const rowInputMode = document.getElementById("rowInputMode");
  const rowSize = document.getElementById("rowSize");
  const rowBase = document.getElementById("rowBase");
  appendCheckboxCol(rowInputMode, "checkboxInputMode", inputMode,
    null, "titleCheckboxInputMode");
  appendX(rowInputMode, "TD", appendButton, "buttonAbbrExclam",
    null, disabled, "!");
  appendX(rowInputMode, "TD", appendTextNode, "textOptionOn");
  appendX(rowInputMode, "TD", appendButton, "buttonAbbrQuestion",
    null, disabled, "?");
  appendX(rowInputMode, "TD", appendTextNode, "textOptionOff");
  appendX(rowInputMode, "TD", appendButton, "buttonRedrawLine", null,
    disabled);
  appendX(rowInputMode, "TD", appendButton, "buttonRedrawWindow");
  appendInputCol(rowSize, "inputSize", 3, getSizeText(size),
    "inputSize", "titleInputSize");
  appendX(rowSize, "TD", appendButton, "buttonAbbrSize805",
    null, disabled, "'80:5'");
  appendX(rowSize, "TD", appendButton, "buttonAbbrSize00",
    null, disabled, "'0:0'");
  appendInputCol(rowBase, "inputBase", 1, getBaseText(base),
    "inputBase", "titleinputBase");
  appendX(rowBase, "TD", appendButton, "buttonAbbrBase16", null,
    disabled, '"16"');
  appendX(rowBase, "TD", appendButton, "buttonAbbrBase8", null,
    disabled, '"8"');
  appendX(rowBase, "TD", appendButton, "buttonAbbrBaseEmpty", null,
    disabled, '""');
}

function initWindowSession(haveStored) {
  const disabled = !haveStored;
  const row = document.getElementById("rowSession");
  appendX(row, "TD", appendButton, "buttonStoreSession");
  appendX(row, "TD", appendButton, "buttonRestoreSession", null, disabled);
  appendX(row, "TD", appendButton, "buttonAddSession", null, disabled);
  appendX(row, "TD", appendButton, "buttonClearStored", null, disabled);
}

function initWindowEditing(linesEnabled) {
  const disabled = !linesEnabled;
  const row = document.getElementById("rowEditing");
  appendX(row, "TD", appendButton, "buttonCleanLine", null, disabled);
  const div = document.createElement("DIV");
  div.title = browser.i18n.getMessage("titleButtonRemoveLine");
  div.style.border = "solid";
  appendButton(div, "buttonRemoveLine", null, disabled, null,
    "titleButtonRemoveLine");
  appendTextNode(div, "textRemoveLine", null, "titleButtonRemoveLine");
  appendX(row, "TD", div);
  appendX(row, "TD", appendButton, "buttonMoveLineUp", null, disabled);
  appendX(row, "TD", appendButton, "buttonMoveLineDown", null, disabled);
  appendX(row, "TD", appendButton, "buttonInsertLine", null, disabled);
  appendX(row, "TD", appendButton, "buttonClearWindow");
}

function initWindow(state, options) {
  initWindowLast(options.clipboard);
  initWindowOptions(options.inputMode, state.size, state.base,
    state.lines.enabled);
  initWindowSession(state.storedLast);
  initWindowEditing(state.lines.enabled);
  appendNext(state);
}

function clearAllLines(lines) {
  enableCurrent(lines, false);  // race: disable until we get focus again
  lines.clearLines();  // order matters: first invalidate lines data
  clearWindow();
}

function clearAll(state) {
  clearAllLines(state.lines);
  appendNext(state);
}

function changeInputWidth(lines, width) {
  for (let line of lines.lines) {
    if (line.isInput) {
      document.getElementById(line.input).size = width;
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
    changeInputWidth(state.lines, size[0] || 60);
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
