/* Copyright (C) 2018 Nartin Väth <martin@mvath.de>
 * This project is under the GNU public license 2.0
*/

"use strict";

function numberOrZero(text) {
  if (!text) {
    return 0;
  }
  const plain = text.replace(/\s+/g, "");
  if (!plain) {
    return 0;
  }
  const result = Number.parseInt(plain, 10);
  if (isNaN(result)) {
    return 0;
  }
  return result;
}

function isPositive(number) {
  return ((typeof(number) === "number") && (number > 0));
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
  const quote = /([\s\d]*)[^\s\d]?([\s\d]*)/.exec(text);
  return [ numberOrZero(quote[1]), numberOrZero(quote[2]) ];
}

function getSizeText(size) {
  if (!Array.isArray(size)) {
    return "0:0";
  }
  return getPositiveText(size[0], "0") + ":" + getPositiveText(size[1], "0");
}

function getBase(text) {
  return numberOrZero(text);
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
