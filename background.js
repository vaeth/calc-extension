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

function sendOptions() {
  const message = {
    command: "options"
  }
  if (state.options) {
    message.options = state.options;
  }
  browser.runtime.sendMessage(message);
}

function storageListener(changes, storageArea) {
  if (changes.optionsV1 && changes.optionsV1.newValue) {
    state.options = changes.optionsV1.newValue;
    sendOptions();
  }
}

function getAndSendOptions() {
  if (state.options) {
    sendOptions();
    return;
  }
  browser.storage.local.get().then((storage) => {
    state.options = (storage.optionsV1 || {});
    sendOptions();
  }, sendOptions);
}

function setOptions(options) {
  browser.storage.local.set({
    optionsV1: (state.options = options)
  });
}

function messageListener(message) {
  if (!message.command) {
    return;
  }
  switch (message.command) {
    case "sendOptions":
      getAndSendOptions();
      return;
    case "setOptions":
      setOptions(message.options);
      return;
  }
}

browser.storage.onChanged.addListener(storageListener);
browser.runtime.onMessage.addListener(messageListener);
browser.browserAction.onClicked.addListener(() => {
  browser.tabs.create({
    url: browser.extension.getURL("data/tab/index.html"),
    active: true
  });
});
