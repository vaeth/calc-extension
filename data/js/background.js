/* Copyright (C) 2018-2020 Martin Väth <martin@mvath.de>
 * This project is under the GNU public license 2.0
 */

"use strict";

const state = {
  virgin: true,
  options: null,
  details: null,
  session: null,
  last: null,
  haveStorage: false
};

function sendCommand(command, message) {
  if (!message) {
    message = {
      options: state.options,
      details: state.details
    };
    if (state.haveStorage) {
      message.haveStorage = true;
    }
    if (state.last) {
      message.last = state.last;
    }
  }
  message.command = command;
  compatible.browser.runtime.sendMessage(message);
}

function flagSendHaveStorage() {
  const send = !state.haveStorage;
  state.haveStorage = true;
  if (send) {
    sendCommand("haveStorageChanges", { haveStorage: true });
  }
}

function sendStorageDetailsChanges(changes) {
  sendCommand("storageDetailsChanges", { changes: changes });
}

function sendStoredLastChanges() {
  sendCommand("storedLastChanges", { last: state.last });
}

function optionsChanges(options, changes, store) {
  if (!options && changes) {
    options = Object.assign({}, state.options || {});
  }
  if (changes) {
    applyChanges(options, changes)
  }
  changes = calcChanges(state.options, options);
  if (!changes && state.options) {
    return;
  }
  if (options && !Object.getOwnPropertyNames(options).length) {
    options = null;
  }
  state.options = options;  // first store to avoid race
  function finish() {
    if (changes) {
      sendCommand("storageOptionsChanges", { changes: changes });
    }
  }
  if (store) {
    if (options) {
      flagSendHaveStorage();  // We might have partial storage if failure
      compatible.storageSet({ optionsV1: options }, finish);
    } else {
      compatible.storageRemove("optionsV1", finish);
    }
  } else {
    finish();
  }
}

function detailsChanges(details, changes, store) {
  if (!details) {
    if (changes) {
      details = Object.assign({}, state.details || {});
    }
  }
  if (changes) {
    applyChanges(details, changes)
  }
  changes = calcChanges(state.details, details);
  if (!changes && state.details) {
    return;
  }
  if (details && !Object.getOwnPropertyNames(details).length) {
    details = null;
  }
  state.details = details;  // first store to avoid race
  function finish() {
    if (changes) {
      sendCommand("storageDetailsChanges", { changes: changes });
    }
  }
  if (store) {
    if (details) {
      flagSendHaveStorage();  // We might have partial storage if failure
      compatible.storageSet({ detailsV1: details }, finish);
    } else {
      compatible.storageRemove("detailsV1", finish);
    }
  } else {
    finish();
  }
}

// This differs from DetailsChanges(null, null, true),
// because we never forward "storageDetailsChanges"
function clearDetailsTacitly() {
  if (state.details) {
    state.details = null;
    compatible.storageRemove("detailsV1");
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

function changedLast(last1, last2) {
  if (last1 === null) {
    return (last2 !== null);
  }
  if (last2 === null) {
    return true;
  }
  return !(Object.is(last1[0], last2[0]) && Object.is(last1[1], last2[1]));
}

function sessionChanges(session, store) {
  const sessionStore = ((store && session) ?
    Object.assign({}, session) : null);
  const last = splitLast(session);
  const changed = changedLast(state.last, last);
  state.last = last;  // first store to avoid race
  state.session = session;  // first store to avoid race
  function finish() {
    if (changed) {
      sendCommand("storedLastChanges", { last: last });
    }
  }
  if (store) {
    if (session) {
      flagSendHaveStorage();  // We might have partial storage if failure
      compatible.storageSet({ sessionV1: sessionStore }, finish);
    } else {
      compatible.storageRemove("sessionV1", finish);
    }
  } else {
    finish();
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
    optionsChanges(changes.optionsV1.newValue || null);
  }
  if (changes.detailsV1) {
    detailsChanges(changes.detailsV1.newValue || null);
  }
  if (changes.sessionV1) {
    sessionChanges(changes.sessionV1.newValue || null);
  }
}

function clearStorage() {
  compatible.storageClear(() => {
    if (!state.haveStorage) {
      return;
    }
    state.haveStorage = false;
    const empty = state.options = state.details = {};
    sendCommand("haveStorageChanges", empty);
    sendCommand("storageOptionsChanges", { options: empty });
    sendCommand("storageDetailsChanges", { details: empty });
    // in case the handler does not apply for self-invoked
    sessionChanges(null);
  });
}

function removeObsoleteOptions(options) {
  if (!options) {
    return;
  }
  delete options.inputMode;  // existed up to calc-extension-4.0
}

function sendInit(reply) {
  if (!state.virgin) {
    sendCommand(reply);
    return;
  }
  compatible.storageGet((storage) => {
    delete state.virgin;
    if (storage && Object.getOwnPropertyNames(storage).length) {
      state.haveStorage = true;
      state.options = (storage.optionsV1 || null);
      removeObsoleteOptions(state.options);
      state.details = (storage.detailsV1 || null);
      const session = (storage.sessionV1 || null);
      state.last = splitLast(session);
      state.session = session;
    }
    sendCommand(reply);
  }, () => {
    sendCommand(reply);
  });
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
    case "optionsChanges":
      optionsChanges(message.options, message.changes, true);
      return;
    case "detailsChanges":
      detailsChanges(message.details, message.changes, true);
      return;
    case "storeSession":
      sessionChanges(message.session, true);
      return;
    case "clearSession":
      sessionChanges(null, true);
      return;
    case "clearDetails":
      clearDetailsTacitly();
      return;
    case "clearStorage":
      clearStorage();
      return;
  }
}

compatible.browser.storage.onChanged.addListener(storageListener);
compatible.browser.runtime.onMessage.addListener(messageListener);
compatible.browser.browserAction.onClicked.addListener(() => {
  compatible.browser.tabs.create({
    url: compatible.browser.extension.getURL("data/html/tab.html"),
    active: true
  });
});
