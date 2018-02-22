/* Copyright (C) 2018 Nartin Väth <martin@mvath.de>
 * This project is under the GNU public license 2.0
*/

// For documentation on the tab API see e.g.
// https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/tabs
// For documentation on the storage API see e.g.
// https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/storage/

"use strict";

const state = {
  options: null
};

function sendOptions(reply, changes) {
  const message = {
    command: reply
  };
  if (changes) {
    message.changes = changes;
  } else {
    message.options = (state.options || {});
  }
  browser.runtime.sendMessage(message);
}

function storageOptionChanges(newOptions) {
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
    sendOptions("optionChanges", changes);
  }
}

function storageListener(storageChanges, storageArea) {
  if (state.options && storageChanges.optionsV1) {
    storageOptionChanges(storageChanges.optionsV1.newValue || {});
  }
}

function sendInit(reply) {
  if (state.options) {
    sendOptions(reply);
    return;
  }
  browser.storage.local.get().then((storage) => {
    state.options = (storage.optionsV1 || {});
    sendOptions(reply);
  }, () => {
    sendOptions(reply);
  });
}

function optionChanges(changes) {
  if (!state.options) {
    state.options = {};
  }
  const options = state.options;
  for (let i in changes) {
    if (!changes.hasOwnProperty(i)) {
      continue;
    }
    const change = changes[i];
    if (change.hasOwnProperty("value")) {
      options[i] = change.value;
    } else {
      delete options[i];
    }
  }
  browser.storage.local.set({
    optionsV1: options
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
    case "optionChanges":
      optionChanges(message.changes);
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
