/* Copyright (C) 2018 Nartin Väth <martin@mvath.de>
 * This project is under the GNU public license 2.0
*/

"use strict";

function getInput(indexString) {
  return document.getElementById("area=" + indexString) ||
      document.getElementById("input=" + indexString);
}

function addContent(seed, counter) {
  let textResult;
  if (!Array.isArray(seed)) {
    textResult = browser.i18n.getMessage("textResult");
  }
  for (let i = 0; i <= counter; ++i) {
    const indexString = String(i);
    const output = document.getElementById("output=" + indexString);
    if (!output) {
      continue;
    }
    const inputValue = getInput(indexString).value;
    if (!inputValue) {
      continue;
    }
    if (Array.isArray(seed)) {
      seed.push([inputValue, output.textContent]);
    } else {
      seed += inputValue;
      seed += "\n";
      seed += textResult;
      seed += output.textContent;
      seed += "\n";
    }
  }
  return seed;
}

function addSession(state, session) {
  if (!session) {
    return;
  }
  const last = session.last;
  if (typeof(last) == "number") {
    state.last = last;
  }
  const variables = session.variables;
  if (variables && Array.isArray(variables)) {
    state.parser.setVariables(variables);
  }
  const content = session.content;
  if (content && Array.isArray(content)) {
    const indexString = String(state.counter);  // end of current session
    for (let [input, output] of content) {
      appendNext(state, input, output);
    }
    const input = getInput(indexString);
    if (input) {  // focus end of original session
      input.focus();
    }
  }
}

function optionsChanges(state, changes) {
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

function displayResult(state, id, indexString) {
  const input = document.getElementById(id).value;
  let text;
  try {
    text = calculate(state, input);
  }
  catch (error) {
    text = browser.i18n.getMessage("messageError", error);
  }
  let current = Number.parseInt(indexString, 10);
  if (text != null) {
    changeText("output=" + indexString, text);
  } else {
    removeLine("output=" + indexString);
    removeLine(id);
    if (current == state.counter) {  // We removed last: next becomes counter
      state.counter = --current;
    }
  }
  while (current < state.counter) {
    ++current;
    const nextIndex = String(current);
    const nextNode = getInput(nextIndex);
    if (nextNode) {
      nextNode.focus();
      return;
    }
  }
  appendNext(state);
}

function sendCommand(command, session) {
  const message = {
    command: command,
  };
  if (session) {
    message.session = session;
  }
  browser.runtime.sendMessage(message);
}

function storeSession(state) {
  const session = {
    content: addContent([], state.counter)
  };
  const last = state.last;
  if (typeof(last) == "number") {
    session.last = last;
  }
  const variables = state.parser.pushVariables([]);
  if (variables.length) {
    session.variables = variables;
  }
  sendCommand("storeSession", session);
}

function clickListener(state, event) {
  if (!event.target || !event.target.id) {
    return;
  }
  const id = event.target.id;
  switch (id) {
    case "buttonStoreSession":
      storeSession(state);
      return;
    case "buttonAddSession":
      sendCommand("sendSession");
      return;
    case "buttonClearStored":
      sendCommand("clearSession");
      return;
  }
  if (!id.startsWith("button=")) {
    return;
  }
  const indexString = id.substr(7);  // 7 = "button=".length
  displayResult(state, "area=" + indexString, indexString);
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
  const indexString = id.substr(5);  // 5 = "form=".length
  displayResult(state, "input=" + indexString, indexString);
}

function changeListener(state, event) {
  if (!event.target || !event.target.id) {
    return;
  }
  switch (event.target.id) {
    case "inputSize":
      changeSize(state, getSize(getInputSize().value), true);
      return;
    case "inputBase":
      changeBase(state, getBase(getInputBase().value), true);
      return;
  }
}

function messageListener(state, message) {
  if (!message.command) {
    return;
  }
  switch (message.command) {
    case "initCalc":
      initCalc(state, message.options, message.session);
      return;
    case "optionsChanges":
    case "storageOptionsChanges":
      optionsChanges(state, message.changes);
      return;
    case "storageSessionChanges":
      enableStorageButtons(message.session);
      return;
    case "session":
      addSession(state, message.session);
      return;
  }
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
