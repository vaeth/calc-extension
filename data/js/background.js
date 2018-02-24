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
  haveStorage: false
};

function sendCommand(reply, changes, session) {
  const message = {
    command: reply
  };
  if (state.haveStorage) {
    message.haveStorage = true;
  }
  if (changes) {
    message.changes = changes;
  } else if (changes !== null) {
    message.options = state.options;
    message.session = !!state.session;
  } else if (session !== undefined) {
    message.session = session;
  }
  browser.runtime.sendMessage(message);
}

function storageOptionsChanges(newOptions) {
  const options = state.options;
  const changes = {};
  let send = false;
  for (let i in options) {
    if (newOptions.hasOwnProperty(i) || !options.hasOwnProperty(i)) {
      continue;
    }
    send = true;
    changes[i] = {};
  }
  for (let i in newOptions) {
    if (!newOptions.hasOwnProperty(i)) {
      continue;
    }
    const value = newOptions[i];
    if(options.hasOwnProperty(i) && (options[i] === value)) {
      continue;
    }
    send = true;
    changes[i] = {
        value: value
    };
  }
  if (send) {
    sendCommand("storageOptionsChanges", changes);
  }
}

function storageSessionChanges(newSession) {
  const send = (!state.session != !newSession);
  state.session = newSession;
  if (send) {
    sendCommand("storageSessionChanges", null, !!newSession);
  }
}

function flagSendHaveStorage() {
  const send = !state.haveStorage;
  state.haveStorage = true;
  if (send) {
    sendCommand("haveStorageChanges", null);
  }
}

function storageListener(changes) {
  if (!state.haveStorage) {
    for (let i in changes) {
      if (changes.hasOwnProperty(i) &&
        changes[i].hasOwnProperty("newValue")) {
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
    if (state.haveStorage) {
      storageOptionsChanges({});
      storageSessionChanges(null);
      state.haveStorage = false;
      sendCommand("haveStorageChanges", null);
    }
  });
}

function sendInit(reply) {
  if (!state.virgin) {
    sendCommand(reply);
    return;
  }
  browser.storage.local.get().then((storage) => {
    delete state.virgin;
    state.haveStorage = !!storage;
    state.options = (storage.optionsV1 || {});
    state.session = (storage.sessionV1 || null);
    sendCommand(reply);
  }, () => {
    sendCommand(reply);
  });
}

function optionsChanges(changes) {
  const options = Object.assign({}, state.options);
  let store = false;
  for (let i in changes) {
    if (!changes.hasOwnProperty(i)) {
      continue;
    }
    const change = changes[i];
    if (change.hasOwnProperty("value")) {
      if (!options.hasOwnProperty(i) || options[i] !== change.value) {
        store = true;
        options[i] = change.value;
      }
    } else if (options.hasOwnProperty(i)) {
        store = true;
        delete options[i];
    }
  }
  if (store) {
    storeOptions(options);
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
      sendCommand("session", null, state.session);
      return;
    case "storeSession":
      storeSession(message.session);
      return;
    case "optionsChanges":
      optionsChanges(message.changes);
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
