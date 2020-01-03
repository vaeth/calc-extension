/* Copyright (C) 2018-2020 Martin Väth <martin@mvath.de>
 * This project is under the GNU public license 2.0
 */

"use strict";

class Lines {
  clearLines() {
    this.lines = [];
    this.lineNumber = new Map();
    this.currentIndex = null;
  }

  constructor() {
    this.clearLines();
    this.counter = 0;
    this.enabled = false;
  }

  isValidIndex(index) {
    return ((typeof(index) == "number") &&
      (index >= 0) && (index < this.lines.length));
  }

  setCurrentIndex(index) {
    if (this.isValidIndex(index)) {
      this.currentIndex = index;
      return true;
    }
    this.currentIndex = null;
    return false;
  }

  unique() {
    return String(++this.counter);
  }

  generateLine(textarea) {
    const unique = this.unique();
    const line = {
      button: "button=" + unique,
      output: "output=" + unique,
      div: "div=" + unique,
      table: "table=" + unique
    }
    if (textarea) {
      line.input = "area=" + unique;
      return line;
    }
    line.isInput = true;
    line.input = "input=" + unique;
    line.form = "form=" + unique;
    return line;
  }

  getIndex(id) {
    const index = this.lineNumber.get(id);
    return ((typeof(index) == "number") ? index : null);
  }

  getLine(index) {
    if (!this.isValidIndex(index)) {
      index = this.currentIndex;
      if (!this.isValidIndex(index)) {
        return null;
      }
    }
    return this.lines[index];
  }

  get currentLine() {
    return this.getLine();
  }

  getId(index, type) {
    const line = this.getLine(index, type);
    return (line && (line[type || "input"] || null));
  }

  setCurrentId(id) {
    const newIndex = this.getIndex(id);
    if (newIndex === null) {
      return false;
    }
    this.currentIndex = newIndex;
    return true;
  }

  get currentInput() {
    const id = this.getId();
    return (id && document.getElementById(id));
  }

  setMap(line, index) {
    for (let i of Lines.indexedItems) {
      const s = line[i];
      if (typeof(s) == "string") {
        this.lineNumber.set(s, index);
      }
    }
  }

  deleteMap(index) {  // does not invalidate this.currentIndex!
    const line = this.lines[index];
    for (let i of Lines.indexedItems) {
      const s = line[i];
      if (typeof(s) == "string") {
        this.lineNumber.delete(s);
      }
    }
  }

  insertLine(line, index) {
    if (!this.isValidIndex(index)) {
      const lastIndex = this.lines.length;
      this.lines.push(line);
      this.setMap(line, lastIndex);
      return lastIndex;
    }
    this.lines.splice(index, 0, line);
    this.setMap(line, index);
    for (let i = this.lines.length - 1; i > index; --i) {
      this.setMap(this.lines[i], i);
    }
    return index;
  }

  removeLine(index) {
    if (!this.isValidIndex(index)) {
      index = this.currentIndex;
      if (!this.isValidIndex(index)) {
        return;
      }
    }
    this.deleteMap(index);
    this.lines.splice(index, 1);
    for (let i = this.lines.length - 1; i >= index; --i) {
      this.setMap(this.lines[i], i);
    }
    if (!this.isValidIndex(this.currentIndex)) {
      this.currentIndex = null;  // invalidate currentIndex
    }
  }

  swapLines(index1, index2) {
    this.setMap(this.lines[index1], index2);
    this.setMap(this.lines[index2], index1);
    const swap = this.lines[index1];
    this.lines[index1] = this.lines[index2];
    this.lines[index2] = swap;
  }

  focus() {
    const line = this.getLine();
    if (!line) {
      return;
    }
    for (let i of Lines.scrollIntoView) {
      const item = getElementById(line[i]);
      if (!item) {
        continue;
      }
      if (item.focus) {
        item.focus();
      }
      if ((i !== "input") && item.scrollIntoView) {
        item.scrollIntoView(false);
      }
    }
  }
}

Lines.indexedItems = [ "input", "output", "button", "form", "div", "table" ];
Lines.scrollIntoView = [ "table", "button", "output", "input" ];
