/* Copyright (C) 2018 Nartin Väth <martin@mvath.de>
 * This project is under the GNU public license 2.0
*/

"use strict";

function getNumeric(number) {
  if (typeof(number) == "number") {
    return number;
  }
  if (typeof(numer) != "string") {
    return null;
  }
  return (Number.parseInt || parseInt)(number, 10);
}

function numberOrZero(text) {
  if (!text) {
    return 0;
  }
  const result = (Number.parseInt || parseInt)(text, 10);
  if (Number.isNaN(result)) {
    return 0;
  }
  return result;
}

function isPositive(number) {
  return ((typeof(number) == "number") && (number > 0));
}

function getPositiveText(number, nonPositive) {
  return (isPositive(number) ? number : nonPositive);
}

function sanitizeBase(base) {
  return (isPositive(base) ? base : 0);
}

function isDefaultBase(base) {
  return !isPositive(base);
}

function isDefaultSize(size) {
  if (!Array.isArray(size)) {
    return true;
  }
  return (!isPositive(size[0]) && !isPositive(size[1]));
}

function equalSize(sizeA, sizeB) {
  return ((sizeA[0] === sizeB[0]) && (sizeA[1] == sizeB[1]));
}

function sanitizeSize(size) {
  if (!Array.isArray(size)) {
    return [0, 0];
  }
  if (!isPositive(size[0])) {
    size[0] = 0;
  }
  if (!isPositive(size[1])) {
    size[1] = 0;
  }
  return size;
}

function getSize(text) {
  const parse = /^\s*(\d*)(?:\s*\D\s*(\d*))?/.exec(text);
  return [ numberOrZero(parse[1]), numberOrZero(parse[2]) ];
}

function getSizeText(size) {
  if (!Array.isArray(size)) {
    return "0:0";
  }
  return getPositiveText(size[0], "0") + ":" + getPositiveText(size[1], "0");
}

function getBase(text) {
  return numberOrZero(text && text.replace(/^\s+/, ""));
}

function isBase(base) {
  return (isPositive(base) && (base >= 2) && (base <= 36));
}

function getBaseText(base) {
  if (isBase(base)) {
    return String(base);
  }
  return "";
}

function addOptions(options, add) {
  if (!add) {
    return options;
  }
  if (add.textarea) {
    options.textarea = true;
  }
  if (add.clipboard) {
    options.clipboard = true;
  }
  if (add.accordion) {
    options.accordion = true;
  }
  if (add.store) {
    options.store = true;
  }
  if (add.size) {
    const size = sanitizeSize(add.size);
    if (!isDefaultSize(size)) {
      options.size = size;
    }
  }
  if (add.base) {
    const base = sanitizeBase(add.base);
    if (!isDefaultBase(base)) {
      options.base = base;
    }
  }
  return options;
}
