/* Copyright (C) 2018 Martin Väth <martin@mvath.de>
 * This project is under the GNU public license 2.0
*/

"use strict";

function booleanChanges(object, property, value) {
  if (value) {
    if (object[property]) {
      object[property] = true;  // normalize
      return null;
    }
    object[property] = true;
    let changes = {}
    changes[property] = { value: true };
    return changes;
  }
  if (!object[property]) {
    delete object.property;  // normalize
    return null;
  }
  delete object[property];
  let changes = {};
  changes[property] = {};
  return changes;
}

function calcChanges(oldObject, newObject) {
  const changes = {};
  let changed = false;
  if (!oldObject) {
    if (!newObject) {
      return null;
    }
    oldObject = {};
  } else if (!newObject) {
    newObject = {};
  }
  for (let i of Object.getOwnPropertyNames(oldObject)) {
    if (newObject.hasOwnProperty(i)) {
      continue;
    }
    changed = true;
    changes[i] = {};
  }
  for (let i of Object.getOwnPropertyNames(newObject)) {
    if (!newObject.hasOwnProperty(i)) {
      continue;
    }
    const value = newObject[i];
    if(oldObject.hasOwnProperty(i) && (oldObject[i] === value)) {
      continue;
    }
    changed = true;
    changes[i] = {
        value: value
    };
  }
  return changed ? changes : null;
}

function applyChanges(object, changes) {
  if (!changes) {
    return false;
  }
  let changed = false;
  for (let i of Object.getOwnPropertyNames(changes)) {
    const change = changes[i];
    if (change.hasOwnProperty("value")) {
      if (!object.hasOwnProperty(i) || object[i] !== change.value) {
        changed = true;
        object[i] = change.value;
      }
    } else if (object.hasOwnProperty(i)) {
        changed = true;
        delete object[i];
    }
  }
  return changed;
}
