/* Copyright (C) 2018 Nartin Väth <martin@mvath.de>
 * This project is under the GNU public license 2.0
*/

// For documentation on the tab API see e.g.
// https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/tabs
// For documentation on the storage API see e.g.
// https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/storage/

"use strict";

const state = {
  virgin: true,
  options: {},
  session: null,
  last: null,
  haveStorage: false
};

function sendCommand(command, message) {
  if (!message) {
    message = {
      options: state.options
    };
    if (state.haveStorage) {
      message.haveStorage = true;
    }
    if (state.last) {
      message.last = state.last;
    }
  }
  message.command = command;
  browser.runtime.sendMessage(message);
}

function storageOptionsChanges(newOptions) {
  const changes = calcChanges(state.options, newOptions);
  if (changes) {
    state.options = newOptions;
    sendCommand("storageOptionsChanges", { changes: changes });
  }
}

function splitLast(session) {  // returns session.last, deleting from session
  if (!session) {
    return null;
  }
  const last = session.last;
  delete session.last;
  if (!Array.isArray(last) || (last.length != 2)) {
     return [ null, null ];
  }
  return last;
}


function storageSessionChanges(newSession) {
  let changedLast = false;
  const last = splitLast(newSession);
  state.session = newSession;
  const oldLast = state.last;
  if (newSession) {
    if (!oldLast || !Object.is(oldLast[0], last[0]) ||
      !Object.is(oldLast[1], last[1])) {
      changedLast = true;
    }
  } else if (oldLast) {
    changedLast = true;
  }
  if (changedLast) {
    state.last = last;
    sendCommand("storedLastChanges", { last: last });
  }
}

function flagSendHaveStorage() {
  const send = !state.haveStorage;
  state.haveStorage = true;
  if (send) {
    sendCommand("haveStorageChanges", { haveStorage: true });
  }
}

function storageListener(changes) {
  if (!state.haveStorage) {
    for (let i of Object.getOwnPropertyNames(changes)) {
      if (changes[i].hasOwnProperty("newValue")) {
        flagSendHaveStorage();
        break;
      }
    }
  }
  if (changes.optionsV1) {
    storageOptionsChanges(changes.optionsV1.newValue || {});
  }
  if (changes.sessionV1) {
    storageSessionChanges(changes.sessionV1.newValue || null);
  }
}

function storeSession(session) {
  browser.storage.local.set({
    sessionV1: session
  }).then(() => {  // in case the handler does not apply for self-invoked
    flagSendHaveStorage();
    storageSessionChanges(session);
  });
}

function storeOptions(options) {
  browser.storage.local.set({
    optionsV1: options
  }).then(() => {  // in case the handler does not apply for self-invoked
    flagSendHaveStorage();
    storageOptionsChanges(options);
  });
}

function clearSession() {
  browser.storage.local.remove("sessionV1").then(() => {
    // in case the handler does not apply for self-invoked
    storageSessionChanges(null);
  });
}

function clearStorage() {
  browser.storage.local.clear().then(() => {
    if (!state.haveStorage) {
      return;
    }
    state.haveStorage = false;
    sendCommand("haveStorageChanges", {});
    const options = state.options = {};
    sendCommand("storageOptionsChanges", { options: options });
    // in case the handler does not apply for self-invoked
    storageSessionChanges(null);
  });
}

function sendInit(reply) {
  if (!state.virgin) {
    sendCommand(reply);
    return;
  }
  browser.storage.local.get().then((storage) => {
    delete state.virgin;
    if (storage && Object.getOwnPropertyNames(storage).length) {
      state.haveStorage = true;
      state.options = (storage.optionsV1 || {});
      const session = (storage.sessionV1 || null);
      state.last = splitLast(session);
      state.session = session;
    }
    sendCommand(reply);
  }, () => {
    sendCommand(reply);
  });
}

function optionsChanges(options, changes) {
  const newOptions = options || Object.assign({}, state.options);
  if (changes) {
    applyChanges(newOptions, changes);
  } else {
    changes = calcChanges(state.options, newOptions);
  }
  if (changes) {
    storeOptions(newOptions);
  }
}

function messageListener(message) {
  if (!message.command) {
    return;
  }
  switch (message.command) {
    case "sendInitCalc":
      sendInit("initCalc");
      return;
    case "sendInitOptions":
      sendInit("initOptions");
      return;
    case "sendSession":
      message.session = state.session;
      sendCommand("session", message);
      return;
    case "storeSession":
      storeSession(message.session);
      return;
    case "optionsChanges":
      optionsChanges(message.options, message.changes);
      return;
    case "clearSession":
      clearSession();
      return;
    case "clearStorage":
      clearStorage();
      return;
  }
}

browser.storage.onChanged.addListener(storageListener);
browser.runtime.onMessage.addListener(messageListener);
browser.browserAction.onClicked.addListener(() => {
  browser.tabs.create({
    url: browser.extension.getURL("data/html/tab.html"),
    active: true
  });
});
