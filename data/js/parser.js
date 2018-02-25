/* Copyright (C) 2018 Nartin Väth <martin@mvath.de>
 * This project is under the GNU public license 2.0
*/

"use strict";

// Handling of the special tokens ! ? '...' "...":

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

// Frequent parser errors:

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

/*
The ParserState contains all relevant options needed for the lexer
(and also "last" from state needed to interpret #).
The ParserState is the argument given to the actions of the parselets
(see below for the latter).
As such it will also contain current parser data like the current result
of the "left" side and a callback to the recursive parser.
*/

class ParserState {
  constructor(tokens, last) {
    this.tokens = tokens;
    this.tokenIndex = 0;
    this.last = last;
    // this.left   // serves as parameter to parselet actions
    // this.token  // serves as parameter to parselet actions
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

/*
We use a Pratt type parser, registering parselets in prefix and infix maps.
This is loosely inspired by https://github.com/munificent/bantam
However, our parselets immediately do the calculation and return a result
object, and we store precedence and binding (right-to-left? which
corresponds to a lookup with an implicitly lowered precedence of EPSILON
on the right-hand side) as properties of the "infix" parselets.
The tokens of variables/functions are the names themselves in order to
safe an additional lookup in a table. The disadvantage is that for variable
import/export (when storing/restoring a session), we have to mark those
parselets referring to variables explicitly and execute/modify them.
*/

class Parser {
  registerPrefix(name, action, isVariable) {
    const prefix = {
      action: action
    };
    if (isVariable) {
      prefix.isVariable = true;
    }
    this.prefix.set(name, prefix);
    return prefix;
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
    return this.registerPrefix(name, () => ({
      type: "variable",
      name: name
    }), true);
  }

  // Add/modify a variable parselet for import
  setVariable(name, value) {  // return true in case of successful setting
    if (typeof(name) != "string") {  // sanity check
      return false;
    }
    {  // Make sure to not re-register non-variable tokens (like sin)
      const previous = this.prefix.get(name);
      if (previous && !previous.isVariable) {
        return false;
      }
    }
    const returnValue = {
      type: "variable",
      name: name
    };
    if (typeof(value) == "number") {
      returnValue.numeric = true;
      returnValue.value = value;
    }
    this.registerPrefix(name, () => returnValue, true);
    return true;
  }

  // Call setVariable with an array of objects [variable, value]
  setVariables(variables) {  // return array of failures
    const failures = [];
    for (let [name, value] of variables) {
      if (!this.setVariable(name, value)) {
        failures.push(i);
      }
    }
    return failures;
  }

  // Export an array of objects [variable, value] for each numeric variable
  pushVariables(variables) {
    for (let [name, prefix] of this.prefix) {
      if (!prefix.isVariable) {
        continue;
      }
      const returnValue = prefix.action();
      if (returnValue.numeric) {  // push only variables with a numerical value
        variables.push([name, returnValue.value]);
      }
    }
    return variables;
  }

  // Convenience wrappers for registerPrefix and registerInfix.
  // They are needed only in the Parser constructor

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
      left.value = right.value;  // the assignments return value
      this.registerPrefix(left.name, () => left, true);  // set variable
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

  constructor() {
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
    this.registerConstant("EPSILON", (Math.EPSILON || Math.pow(2, -52)));
    this.registerNumber("#number");
    this.registerLast("#");
    this.registerFunction("log10", Math.log10);
    this.registerFunction("log2", Math.log2);
    this.registerFunction("log1p", Math.log1p);
    this.registerFunction("log", Math.log);
    this.registerFunction("exp", Math.exp);
    this.registerFunction("expm1", Math.expm1);
    this.registerFunction("sin", Math.sin);
    this.registerFunction("cos", Math.cos);
    this.registerFunction("tan", Math.tan);
    this.registerFunction("asin", Math.asin);
    this.registerFunction("acos", Math.acos);
    this.registerFunction("atan", Math.atan);
    this.registerFunction("sinh", Math.sinh);
    this.registerFunction("cosh", Math.cosh);
    this.registerFunction("tanh", Math.tanh);
    this.registerFunction("asinh", Math.asinh);
    this.registerFunction("acosh", Math.acosh);
    this.registerFunction("atanh", Math.atanh);
    this.registerFunction("sqrt", Math.sqrt);
    this.registerFunction("cbrt", Math.cbrt);
    this.registerFunction("abs", Math.abs);
    this.registerFunction("sign", Math.sign);
    this.registerFunction("floor", Math.floor);
    this.registerFunction("ceil", Math.ceil);
    this.registerFunction("round", Math.round);
    this.registerFunction("trunc", Math.trunc);
    this.registerFunction("fround", Math.fround);
    this.registerFunction("clz32", Math.clz32);
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

/*
Our lexer. Simplicity is preferred over speed: We use regular expressions.
For the list of char symbols in the beginning, this is probably faster than
anything else (even than a Set lookup), if the regular expression
precompilation of the javascript interpreter is sane.
*/

function lexToken(input) {
  const token = {};
  const first = input.charAt(0);
  if (/[\!\?\'\"\(\)\+\-\*\/\%\=\#\|\&\^]/.test(first)) {
    if (first === "!") {
      token.text = first;
      token.value = true;
      token.type = "#inline";
      token.inline = "inputMode";
    } else if (first === "?") {
      token.text = first;
      token.value = false;
      token.type = "#inline";
      token.inline = "inputMode";
    } else if (first === "'") {
      const quote = /^\'([\s\d]*[^\s\d]?[\s\d]*)\'/.exec(input);
      if (!quote) {
        throw browser.i18n.getMessage("errorBadSingleQuote");
      }
      token.text = quote[0];
      token.value = getSize(quote[1]);
      token.type = "#inline";
      token.inline = "size";
    } else if (first === '"') {
      const quote = /^\"([\s\d]*)\"/.exec(input);
      if (!quote) {
        throw  browser.i18n.getMessage("errorBadDoubleQuote");
      }
      token.text = quote[0];
      token.value = getBase(quote[1]);
      token.type = "#inline";
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
  token.type = "#number";
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

/*
For simplicity, we first scan the whole expression and handle
the inline tokens already in this step to keep them off the parser.
*/

function getTokenArray(state, input) {
  const tokens = [];
  while ((input = input.replace(/^[;\s]+/, ""))) {
    const token = lexToken(input);
    if (token.type === "#inline") {
      handleInlineToken(state, token);
    } else {
      tokens.push(token);
    }
    input = input.substr(token.text.length);
  }
  return tokens;
}

/*
The main function which returns the output by getting "input".
state is only needed to get/set the last result for #
(and to set the corresponding lastString for copying to clipboard).
In the error case, we just throw.
*/

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
      parserState.left = prefix.action(parserState);
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
    const resultString = state.lastString = value.toString(base);
    return browser.i18n.getMessage("messageResult",
      [resultString, String(base)]);
  }
  return ((state.lastString = String(value)));
}
