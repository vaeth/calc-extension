/* Copyright (C) 2018 Nartin Väth <martin@mvath.de>
 * This project is under the GNU public license 2.0
*/

"use strict";

function optionChanges(state, changes) {
  if (changes.inputMode) {
    setCheckboxInputMode(changes.inputMode.value);
  }
  if (changes.size) {
    changeSize(state, sanitizeSize(changes.size.value));
  }
  if (changes.base) {
    changeBase(state, sanitizeBase(changes.base.value));
  }
}

function displayResult(state, id, index) {
  const input = document.getElementById(id).value;
  let text;
  try {
    text = calculate(state, input);
  }
  catch (error) {
    text = browser.i18n.getMessage("messageError", error);
  }
  let current = Number.parseInt(index, 10);
  if (text != null) {
    changeText("output=" + index, text);
  } else {
    removeLine("output=" + index);
    removeLine(id);
    if (current == state.counter) {  // We removed last: next becomes counter
      state.counter = --current;
    }
  }
  while (current < state.counter) {
    ++current;
    const nextIndex = String(current);
    const nextNode = (document.getElementById("area=" + nextIndex) ||
      document.getElementById("input=" + nextIndex));
    if (nextNode) {
      nextNode.focus();
      return;
    }
  }
  appendNext(state);
}

function clickListener(state, event) {
  if (!event.target || !event.target.id) {
    return;
  }
  const id = event.target.id;
  if (!id.startsWith("button=")) {
    return;
  }
  const index = id.substr(7);  // 7 = "button=".length
  displayResult(state, "area=" + index, index);
}

function submitListener(state, event) {
  if (!event.target || !event.target.id) {
    return;
  }
  const id = event.target.id;
  if (!id.startsWith("form=")) {
    return;
  }
  event.preventDefault();
  const index = id.substr(5);  // 5 = "form=".length
  displayResult(state, "input=" + index, index);
}

function changeListener(state, event) {
  if (!event.target || !event.target.id) {
    return;
  }
  switch (event.target.id) {
    case "inputSize":
      changeSize(state, valueInputSize(), true);
      return;
    case "inputBase":
      changeBase(state, valueInputBase(), true);
      return;
  }
}

function messageListener(state, message) {
  if (!message.command) {
    return;
  }
  switch (message.command) {
    case "initCalc":
      initCalc(state, message.options);
      return;
    case "optionChanges":
      optionChanges(state, message.changes);
      return;
  }
}

function sendCommand(command) {
  browser.runtime.sendMessage({
    command: command
  });
}

function initMain() {
  const state = {
    counter: 0,
    last: null,
    base: 0,
    size: [0, 0],
    parser: new Parser()
  };
  document.addEventListener("submit", (event) => {
    submitListener(state, event);
  });
  document.addEventListener("change", (event) => {
    changeListener(state, event);
  })
  document.addEventListener("click", (event) => {
    clickListener(state, event);
  });
  browser.runtime.onMessage.addListener((message) => {
    messageListener(state, message);
  });
}

initLayout();  // do this quickly
initMain();
sendCommand("sendInitCalc");
