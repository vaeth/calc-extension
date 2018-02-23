/* Copyright (C) 2018 Nartin Väth <martin@mvath.de>
 * This project is under the GNU public license 2.0
*/

"use strict";

function handleInlineToken(state, token) {
  switch (token.inline) {
    case "inputMode":
      setCheckboxInputMode(token.value);
      return;
    case "size":
      changeSize(state, token.value);
      return;
    case "base":
      changeBase(state, token.value);
      return;
  }
}

function errorUnexpected(text) {
  return browser.i18n.getMessage("errorUnexpectedToken", text);
}

function errorUninitialized(text) {
  return browser.i18n.getMessage("errorUninitializedVariable", text);
}

function errorNonNumeric(expression) {
  if (expression.type === "variable") {
    return errorUninitialized(expression.name);
  }
  if (expression.type === "function") {
    return browser.i18n.getMessage("errorUnresolvableFunction",
      expression.name);
  }
  return browser.i18n.getMessage("errorParse");  // should not happen
}

class ParserState {
  constructor(tokens, last) {
    this.tokens = tokens;
    this.tokenIndex = 0;
    this.last = last;
    // this.left   // serves as parameter to parser actions
    // this.token  // serves as parameter to parser actions
    // this.getExpression // main recursive function; needs context variables
  }

  getToken() {
    const tokenIndex = this.tokenIndex;
    const tokens = this.tokens;
    if (tokenIndex < tokens.length) {
      return tokens[tokenIndex];
    }
    return null;  // EOF
  }

  gobbleQuick() {
    ++this.tokenIndex;
  }

  gobble(token) {  // gobble and check or return token
    const gobbled = this.getToken();
    if (!token) {
      if (gobbled) {
        this.gobbleQuick();
        return gobbled;
      }
      throw browser.i18n.getMessage("errorIncomplete");
    }
    if (gobbled && (gobbled.type === token)) {
      this.gobbleQuick();
      return;
    }
    throw browser.i18n.getMessage("errorMissingToken", token);
  }
}

// We use a Pratt type parser, registering functions in 2 token maps.
// This is loosely inspired by https://github.com/munificent/bantam

class Parser {
  registerPrefix(name, action) {
    this.prefix.set(name, action);
    return action;
  }

  registerInfix(name, precedence, action) {
    this.infix.set(name, {
      precedence: precedence,
      action: action
    });
  }

  getInfix(token) {
    return this.infix.get(token)
  }

  getPrefixOrRegister(token) {
    const prefixAction = this.prefix.get(token.type);
    if (prefixAction) {
      return prefixAction;
    }
    if (!token.isName) {
      return null;
    }
    const name = token.text;
    const returnValue = {
      type: "variable",
      name: name
    };
    const value = this.variables.get(name);
    if (typeof(value) == "numeric") {  // import externally stored value
      returnValue.numeric = true,
      returnValue.value = value
    }
    return this.registerPrefix(name, () => returnValue);
  }

  // Convenience wrappers for registerPrefix and registerInfix.
  // They are needed only in the constructor

  registerConstant(name, value) {
    this.registerPrefix(name, () => ({
      type: "result",
      numeric: true,
      value: value
    }));
  }

  registerNumber(name) {
    this.registerPrefix(name, (parserState)  => ({
      type: "result",
      numeric: true,
      value: parserState.token.value
    }));
  }

  registerLast(name) {
    this.registerPrefix(name, (parserState)  => {
      if (parserState.last === null) {
        throw browser.i18n.getMessage("errorNoLast");
      }
      return {
        type: "result",
        numeric: true,
        value: parserState.last
      };
    });
  }

  registerFunction(name, action) {
    this.registerPrefix(name, () => ({
      type: "function",
      name: name,
      value: action
    }));
  }

  registerUnary(name, precedence, action) {
    this.registerPrefix(name, (parserState)  => {
      const right = parserState.getExpression(precedence);
      if (!right.numeric) {
        throw errorNonNumeric(right);
      }
      if (action) {
        right.value = action(right.value);
      }
      return right;
    });
  }

  registerGroup(name) {
    this.registerPrefix(name, (parserState)  => {
      const right = parserState.getExpression();
      parserState.gobble(")");
      return right;
    });
  }

  registerBinary(name, precedence, action, rightToLeft) {
    this.registerInfix(name, precedence, (parserState) => {
      const left = parserState.left;
      if (!left.numeric) {
        throw errorNonNumeric(left);
      }
      const right = parserState.getExpression(precedence, rightToLeft);
      if (!right.numeric) {
        throw errorNonNumeric(right);
      }
      return {
        type: "result",
        numeric: true,
        value: action(left.value, right.value)
      };
    });
  }

  registerAssign(name, precedence, rightToLeft) {
    this.registerInfix(name, precedence, (parserState) => {
      const left = parserState.left;
      if (left.type !== "variable") {
        throw browser.i18n.getMessage("errorAssignNonVariable");
      }
      const right = parserState.getExpression(precedence, rightToLeft);
      if (!right.numeric) {
        throw errorNonNumeric(right);
      }
      left.numeric = true;
      const name = left.name;
      const value = left.value = right.value;
      this.registerPrefix(name, () => left);  // assign for future use
      this.variables.set(name, value); //  set value for external storage
      return left;
    });
  }

  registerCall(name, precedence) {
    this.registerInfix(name, precedence, (parserState) => {
      const left = parserState.left;
      if (left.type !== "function") {
        throw browser.i18n.getMessage("errorCallNonFunction");
      }
      const arg = parserState.getExpression();
      if (!arg.numeric) {
        throw errorNonNumeric(arg);
      }
      parserState.gobble(")");
      return {
        type: "result",
        numeric: true,
        value: left.value(arg.value)
      };
    });
  }

  constructor(variables) {
    this.variables = (variables || new Map());
    this.infix = new Map();
    this.prefix = new Map();

    this.registerConstant("PI", Math.PI);
    this.registerConstant("E", Math.E);
    this.registerConstant("SQRT2", Math.SQRT2);
    this.registerConstant("SQRT1_2", Math.SQRT1_2);
    this.registerConstant("LN2", Math.LN2);
    this.registerConstant("LN10", Math.LN10);
    this.registerConstant("LOG2E", Math.LOG2E);
    this.registerConstant("LOG10E", Math.LOG10E);
    this.registerNumber("number");
    this.registerLast("#");
    this.registerFunction("log", Math.log);
    this.registerFunction("exp", Math.exp);
    this.registerFunction("sin", Math.sin);
    this.registerFunction("cos", Math.cos);
    this.registerFunction("tan", Math.tan);
    this.registerFunction("asin", Math.asin);
    this.registerFunction("acos", Math.acos);
    this.registerFunction("atan", Math.atan);
    this.registerFunction("sqrt", Math.sqrt);
    this.registerFunction("abs", Math.abs);
    this.registerFunction("floor", Math.floor);
    this.registerFunction("ceil", Math.ceil);
    this.registerFunction("round", Math.round);
    this.registerAssign("=", 3, true);
    this.registerBinary("|", 7, (a, b) => (a | b));
    this.registerBinary("^", 8, (a, b) => (a ^ b));
    this.registerBinary("&", 9, (a, b) => (a & b));
    this.registerBinary("+", 13, (a, b) => (a + b));
    this.registerBinary("-", 13, (a, b) => (a - b));
    this.registerBinary("*", 14, (a, b) => (a * b));
    this.registerBinary("/", 14, (a, b) => (a / b));
    this.registerBinary("%", 14, (a, b) => (a % b));
    this.registerBinary("**", 15, (a, b) => (a ** b), true);
    this.registerUnary("+", 16);
    this.registerUnary("-", 16, (a) => (-a));
    this.registerCall("(", 20);
    this.registerGroup("(");
  }
}

function lexToken(input) {
  const token = {};
  const first = input.charAt(0);
  if (/[\!\?\'\"\(\)\+\-\*\/\%\=\#\|\&\^]/.test(first)) {
    if (first === "!") {
      token.text = first;
      token.value = true;
      token.type = "inline";
      token.inline = "inputMode";
    } else if (first === "?") {
      token.text = first;
      token.value = false;
      token.type = "inline";
      token.inline = "inputMode";
    } else if (first === "'") {
      const quote = /^\'([\s\d]*[^\s\d]?[\s\d]*)\'/.exec(input);
      if (!quote) {
        throw browser.i18n.getMessage("errorBadSingleQuote");
      }
      token.text = quote[0];
      token.value = getSize(quote[1]);
      token.type = "inline";
      token.inline = "size";
    } else if (first === '"') {
      const quote = /^\"([\s\d]*)\"/.exec(input);
      if (!quote) {
        throw  browser.i18n.getMessage("errorBadDoubleQuote");
      }
      token.text = quote[0];
      token.value = getBase(quote[1]);
      token.type = "inline";
      token.inline = "base";
    } else if (input.startsWith("**")) {
      token.text = token.type = "**";
    } else {
      token.text = token.type = first;
    }
    return token;
  }
  const number = /^\d*\.?\d+([eE][+-]?\d+)?/.exec(input);
  if (!number) {
    const identifier = /\w+/.exec(input);
    if (!identifier) {
      throw browser.i18n.getMessage("errorIllegalCharacter", first);
    } else {
      token.text = token.type = identifier[0];
      token.isName = true;
    }
    return token;
  }
  token.type = "number";
  if (first == "0") {
    const hex = /^0[xX][0-9a-fA-F]+/.exec(input);
    if (hex) {
      token.value = Number.parseInt(hex[0].substr(2), 16);
      token.text = hex[0];
      return token;
    }
    const octal = /^0[0-7]+/.exec(input);
    if (octal && (octal[0].length >= number[0].length)) {
      token.value = Number.parseInt(octal[0].substr(1), 8);
      token.text = octal[0];
      return token;
    }
  }
  token.value = Number.parseFloat(number[0]);
  token.text = number[0];
  return token;
}

function getTokenArray(state, input) {
  const tokens = [];
  while ((input = input.replace(/^[;\s]+/, ""))) {
    const token = lexToken(input);
    if (token.type === "inline") {
      handleInlineToken(state, token);
    } else {
      tokens.push(token);
    }
    input = input.substr(token.text.length);
  }
  return tokens;
}

function calculate(state, input) {
  const tokens = getTokenArray(state, input);
  if (!tokens.length) {
    return null;
  }
  const parser = state.parser;
  const parserState = new ParserState(tokens, state.last);

  function getExpression(precedence = 0, rightToLeft) {
    parserState.getExpression = getExpression;
    {  // prefix first
      const token = parserState.token = parserState.gobble();
      const prefix = parser.getPrefixOrRegister(token);
      if (!prefix) {  // token is neither prefix nor new variable name
        throw errorUnexpected(token.text);
      }
      parserState.left = prefix(parserState);
    }
    for (;;) {  // while (precedence - 0.5*right  < getToken().precedence)
      const token = parserState.token = parserState.getToken();
      if (!token) {  // EOF has precedence 0
        break;
      }
      const infix = parser.getInfix(token.type);
      if (!infix) {  // non-infix tokens have precedence 0
        break;
      }
      if (precedence > infix.precedence) {
        break;
      }
      if (!rightToLeft && (precedence == infix.precedence)) {
        break;  // equal precedence only continues loop in case left to right
      }
      parserState.gobbleQuick();
      parserState.left = infix.action(parserState);
    }
    return parserState.left;
  }

  const result = getExpression();
  const token = parserState.getToken();
  if (token) {
    throw errorUnexpected(token.text);
  }
  if (!result.numeric) {
    throw errorNonNumeric(result);
  }
  const value = state.last = result.value;
  const base = state.base;
  if (isBase(base)) {
    return browser.i18n.getMessage("messageResult",
      [value.toString(base), String(base)]);
  }
  return String(value);
}
