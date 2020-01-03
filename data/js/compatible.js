/* Copyright (C) 2018-2020 Martin Väth <martin@mvath.de>
 * This project is under the GNU public license 2.0
 */

"use strict";

function callbackOrError(callback, errorCallback) {
  return callback ? (arg) => {
    if (chrome.runtime.lastError) {
      if (errorCallback) {
        errorCallback(chrome.runtime.lastError);
      }
    } else {
      callback(arg);
    }
  } : (arg) => {};
}

const compatible = (typeof(browser) != "undefined"
    && Object.getPrototypeOf(browser) === Object.prototype) ? {
  browser: browser,
  getMessage: browser.i18n.getMessage,
  storageGet: function(callback, errorCallback) {
    browser.storage.local.get().then(callback, errorCallback);
  },
  storageClear: function(callback, errorCallback) {
    browser.storage.local.clear().then(callback, errorCallback);
  },
  storageSet: function(arg, callback, errorCallback) {
    browser.storage.local.set(arg).then(callback, errorCallback);
  },
  storageRemove: function(arg, callback, errorCallback) {
    browser.storage.local.remove(arg).then(callback, errorCallback);
  }
} : {
  browser: chrome,
  getMessage: chrome.i18n.getMessage,
  storageGet: function(callback, errorCallback) {
    chrome.storage.local.get(callbackOrError(callback, errorCallback));
  },
  storageClear: function(callback, errorCallback) {
    chrome.storage.local.get(callbackOrError(callback, errorCallback));
  },
  storageSet: function(arg, callback, errorCallback) {
    chrome.storage.local.set(arg, callbackOrError(callback, errorCallback));
  },
  storageRemove: function(arg, callback, errorCallback) {
    chrome.storage.local.remove(arg, callbackOrError(callback, errorCallback));
  }
};
