var INUMBER = 'INUMBER';
var IOP1 = 'IOP1';
var IOP2 = 'IOP2';
var IOP3 = 'IOP3';
var IVAR = 'IVAR';
var IVARNAME = 'IVARNAME';
var IFUNCALL = 'IFUNCALL';
var IFUNDEF = 'IFUNDEF';
var IEXPR = 'IEXPR';
var IEXPREVAL = 'IEXPREVAL';
var IMEMBER = 'IMEMBER';
var IENDSTATEMENT = 'IENDSTATEMENT';
var IARRAY = 'IARRAY';

function Instruction(type, value) {
  this.type = type;
  this.value = (value !== undefined && value !== null) ? value : 0;
}

Instruction.prototype.toString = function () {
  switch (this.type) {
    case INUMBER:
    case IOP1:
    case IOP2:
    case IOP3:
    case IVAR:
    case IVARNAME:
    case IENDSTATEMENT:
      return this.value;
    case IFUNCALL:
      return 'CALL ' + this.value;
    case IFUNDEF:
      return 'DEF ' + this.value;
    case IARRAY:
      return 'ARRAY ' + this.value;
    case IMEMBER:
      return '.' + this.value;
    default:
      return 'Invalid Instruction';
  }
};

function unaryInstruction(value) {
  return new Instruction(IOP1, value);
}

function binaryInstruction(value) {
  return new Instruction(IOP2, value);
}

function ternaryInstruction(value) {
  return new Instruction(IOP3, value);
}

function simplify(tokens, unaryOps, binaryOps, ternaryOps, values) {
  var nstack = [];
  var newexpression = [];
  var n1, n2, n3;
  var f;
  for (var i = 0; i < tokens.length; i++) {
    var item = tokens[i];
    var type = item.type;
    if (type === INUMBER || type === IVARNAME) {
      if (Array.isArray(item.value)) {
        nstack.push.apply(nstack, simplify(item.value.map(function (x) {
          return new Instruction(INUMBER, x);
        }).concat(new Instruction(IARRAY, item.value.length)), unaryOps, binaryOps, ternaryOps, values));
      } else {
        nstack.push(item);
      }
    } else if (type === IVAR && values.hasOwnProperty(item.value)) {
      item = new Instruction(INUMBER, values[item.value]);
      nstack.push(item);
    } else if (type === IOP2 && nstack.length > 1) {
      n2 = nstack.pop();
      n1 = nstack.pop();
      f = binaryOps[item.value];
      item = new Instruction(INUMBER, f(n1.value, n2.value));
      nstack.push(item);
    } else if (type === IOP3 && nstack.length > 2) {
      n3 = nstack.pop();
      n2 = nstack.pop();
      n1 = nstack.pop();
      if (item.value === '?') {
        nstack.push(n1.value ? n2.value : n3.value);
      } else {
        f = ternaryOps[item.value];
        item = new Instruction(INUMBER, f(n1.value, n2.value, n3.value));
        nstack.push(item);
      }
    } else if (type === IOP1 && nstack.length > 0) {
      n1 = nstack.pop();
      f = unaryOps[item.value];
      item = new Instruction(INUMBER, f(n1.value));
      nstack.push(item);
    } else if (type === IEXPR) {
      while (nstack.length > 0) {
        newexpression.push(nstack.shift());
      }
      newexpression.push(new Instruction(IEXPR, simplify(item.value, unaryOps, binaryOps, ternaryOps, values)));
    } else if (type === IMEMBER && nstack.length > 0) {
      n1 = nstack.pop();
      nstack.push(new Instruction(INUMBER, n1.value[item.value]));
    } /* else if (type === IARRAY && nstack.length >= item.value) {
      var length = item.value;
      while (length-- > 0) {
        newexpression.push(nstack.pop());
      }
      newexpression.push(new Instruction(IARRAY, item.value));
    } */ else {
      while (nstack.length > 0) {
        newexpression.push(nstack.shift());
      }
      newexpression.push(item);
    }
  }
  while (nstack.length > 0) {
    newexpression.push(nstack.shift());
  }
  return newexpression;
}

function substitute(tokens, variable, expr) {
  var newexpression = [];
  for (var i = 0; i < tokens.length; i++) {
    var item = tokens[i];
    var type = item.type;
    if (type === IVAR && item.value === variable) {
      for (var j = 0; j < expr.tokens.length; j++) {
        var expritem = expr.tokens[j];
        var replitem;
        if (expritem.type === IOP1) {
          replitem = unaryInstruction(expritem.value);
        } else if (expritem.type === IOP2) {
          replitem = binaryInstruction(expritem.value);
        } else if (expritem.type === IOP3) {
          replitem = ternaryInstruction(expritem.value);
        } else {
          replitem = new Instruction(expritem.type, expritem.value);
        }
        newexpression.push(replitem);
      }
    } else if (type === IEXPR) {
      newexpression.push(new Instruction(IEXPR, substitute(item.value, variable, expr)));
    } else {
      newexpression.push(item);
    }
  }
  return newexpression;
}

function evaluate(tokens, expr, values) {
  var nstack = [];
  var n1, n2, n3;
  var f, args, argCount;

  if (isExpressionEvaluator(tokens)) {
    return resolveExpression(tokens, values);
  }

  var numTokens = tokens.length;

  for (var i = 0; i < numTokens; i++) {
    var item = tokens[i];
    var type = item.type;
    if (type === INUMBER || type === IVARNAME) {
      nstack.push(item.value);
    } else if (type === IOP2) {
      n2 = nstack.pop();
      n1 = nstack.pop();
      if (item.value === 'and') {
        nstack.push(n1 ? !!evaluate(n2, expr, values) : false);
      } else if (item.value === 'or') {
        nstack.push(n1 ? true : !!evaluate(n2, expr, values));
      } else if (item.value === '=') {
        f = expr.binaryOps[item.value];
        nstack.push(f(n1, evaluate(n2, expr, values), values));
      } else {
        f = expr.binaryOps[item.value];
        nstack.push(f(resolveExpression(n1, values), resolveExpression(n2, values)));
      }
    } else if (type === IOP3) {
      n3 = nstack.pop();
      n2 = nstack.pop();
      n1 = nstack.pop();
      if (item.value === '?') {
        nstack.push(evaluate(n1 ? n2 : n3, expr, values));
      } else {
        f = expr.ternaryOps[item.value];
        nstack.push(f(resolveExpression(n1, values), resolveExpression(n2, values), resolveExpression(n3, values)));
      }
    } else if (type === IVAR) {
      if (item.value in expr.functions) {
        nstack.push(expr.functions[item.value]);
      } else if (item.value in expr.unaryOps && expr.parser.isOperatorEnabled(item.value)) {
        nstack.push(expr.unaryOps[item.value]);
      } else {
        var v = values[item.value];
        if (v !== undefined) {
          nstack.push(v);
        } else {
          throw new Error('undefined variable: ' + item.value);
        }
      }
    } else if (type === IOP1) {
      n1 = nstack.pop();
      f = expr.unaryOps[item.value];
      nstack.push(f(resolveExpression(n1, values)));
    } else if (type === IFUNCALL) {
      argCount = item.value;
      args = [];
      while (argCount-- > 0) {
        args.unshift(resolveExpression(nstack.pop(), values));
      }
      f = nstack.pop();
      if (f.apply && f.call) {
        nstack.push(f.apply(undefined, args));
      } else {
        throw new Error(f + ' is not a function');
      }
    } else if (type === IFUNDEF) {
      // Create closure to keep references to arguments and expression
      nstack.push((function () {
        var n2 = nstack.pop();
        var args = [];
        var argCount = item.value;
        while (argCount-- > 0) {
          args.unshift(nstack.pop());
        }
        var n1 = nstack.pop();
        var f = function () {
          var scope = Object.assign({}, values);
          for (var i = 0, len = args.length; i < len; i++) {
            scope[args[i]] = arguments[i];
          }
          return evaluate(n2, expr, scope);
        };
        // f.name = n1
        Object.defineProperty(f, 'name', {
          value: n1,
          writable: false
        });
        values[n1] = f;
        return f;
      })());
    } else if (type === IEXPR) {
      nstack.push(createExpressionEvaluator(item, expr));
    } else if (type === IEXPREVAL) {
      nstack.push(item);
    } else if (type === IMEMBER) {
      n1 = nstack.pop();
      nstack.push(n1[item.value]);
    } else if (type === IENDSTATEMENT) {
      nstack.pop();
    } else if (type === IARRAY) {
      argCount = item.value;
      args = [];
      while (argCount-- > 0) {
        args.unshift(nstack.pop());
      }
      nstack.push(args);
    } else {
      throw new Error('invalid Expression');
    }
  }
  if (nstack.length > 1) {
    throw new Error('invalid Expression (parity)');
  }
  // Explicitly return zero to avoid test issues caused by -0
  return nstack[0] === 0 ? 0 : resolveExpression(nstack[0], values);
}

function createExpressionEvaluator(token, expr, values) {
  if (isExpressionEvaluator(token)) return token;
  return {
    type: IEXPREVAL,
    value: function (scope) {
      return evaluate(token.value, expr, scope);
    }
  };
}

function isExpressionEvaluator(n) {
  return n && n.type === IEXPREVAL;
}

function resolveExpression(n, values) {
  return isExpressionEvaluator(n) ? n.value(values) : n;
}

function expressionToString(tokens, toJS) {
  var nstack = [];
  var n1, n2, n3;
  var f, args, argCount;
  for (var i = 0; i < tokens.length; i++) {
    var item = tokens[i];
    var type = item.type;
    if (type === INUMBER) {
      if (typeof item.value === 'number' && item.value < 0) {
        nstack.push('(' + item.value + ')');
      } else if (Array.isArray(item.value)) {
        nstack.push('[' + item.value.map(escapeValue).join(', ') + ']');
      } else {
        nstack.push(escapeValue(item.value));
      }
    } else if (type === IOP2) {
      n2 = nstack.pop();
      n1 = nstack.pop();
      f = item.value;
      if (toJS) {
        if (f === '^') {
          nstack.push('Math.pow(' + n1 + ', ' + n2 + ')');
        } else if (f === 'and') {
          nstack.push('(!!' + n1 + ' && !!' + n2 + ')');
        } else if (f === 'or') {
          nstack.push('(!!' + n1 + ' || !!' + n2 + ')');
        } else if (f === '||') {
          nstack.push('(function(a,b){ return Array.isArray(a) && Array.isArray(b) ? a.concat(b) : String(a) + String(b); }((' + n1 + '),(' + n2 + ')))');
        } else if (f === '==') {
          nstack.push('(' + n1 + ' === ' + n2 + ')');
        } else if (f === '!=') {
          nstack.push('(' + n1 + ' !== ' + n2 + ')');
        } else if (f === '[') {
          nstack.push(n1 + '[(' + n2 + ') | 0]');
        } else {
          nstack.push('(' + n1 + ' ' + f + ' ' + n2 + ')');
        }
      } else {
        if (f === '[') {
          nstack.push(n1 + '[' + n2 + ']');
        } else {
          nstack.push('(' + n1 + ' ' + f + ' ' + n2 + ')');
        }
      }
    } else if (type === IOP3) {
      n3 = nstack.pop();
      n2 = nstack.pop();
      n1 = nstack.pop();
      f = item.value;
      if (f === '?') {
        nstack.push('(' + n1 + ' ? ' + n2 + ' : ' + n3 + ')');
      } else {
        throw new Error('invalid Expression');
      }
    } else if (type === IVAR || type === IVARNAME) {
      nstack.push(item.value);
    } else if (type === IOP1) {
      n1 = nstack.pop();
      f = item.value;
      if (f === '-' || f === '+') {
        nstack.push('(' + f + n1 + ')');
      } else if (toJS) {
        if (f === 'not') {
          nstack.push('(' + '!' + n1 + ')');
        } else if (f === '!') {
          nstack.push('fac(' + n1 + ')');
        } else {
          nstack.push(f + '(' + n1 + ')');
        }
      } else if (f === '!') {
        nstack.push('(' + n1 + '!)');
      } else {
        nstack.push('(' + f + ' ' + n1 + ')');
      }
    } else if (type === IFUNCALL) {
      argCount = item.value;
      args = [];
      while (argCount-- > 0) {
        args.unshift(nstack.pop());
      }
      f = nstack.pop();
      nstack.push(f + '(' + args.join(', ') + ')');
    } else if (type === IFUNDEF) {
      n2 = nstack.pop();
      argCount = item.value;
      args = [];
      while (argCount-- > 0) {
        args.unshift(nstack.pop());
      }
      n1 = nstack.pop();
      if (toJS) {
        nstack.push('(' + n1 + ' = function(' + args.join(', ') + ') { return ' + n2 + ' })');
      } else {
        nstack.push('(' + n1 + '(' + args.join(', ') + ') = ' + n2 + ')');
      }
    } else if (type === IMEMBER) {
      n1 = nstack.pop();
      nstack.push(n1 + '.' + item.value);
    } else if (type === IARRAY) {
      argCount = item.value;
      args = [];
      while (argCount-- > 0) {
        args.unshift(nstack.pop());
      }
      nstack.push('[' + args.join(', ') + ']');
    } else if (type === IEXPR) {
      nstack.push('(' + expressionToString(item.value, toJS) + ')');
    } else if (type === IENDSTATEMENT) ; else {
      throw new Error('invalid Expression');
    }
  }
  if (nstack.length > 1) {
    if (toJS) {
      nstack = [ nstack.join(',') ];
    } else {
      nstack = [ nstack.join(';') ];
    }
  }
  return String(nstack[0]);
}

function escapeValue(v) {
  if (typeof v === 'string') {
    return JSON.stringify(v).replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  }
  return v;
}

function contains(array, obj) {
  for (var i = 0; i < array.length; i++) {
    if (array[i] === obj) {
      return true;
    }
  }
  return false;
}

function getSymbols(tokens, symbols, options) {
  options = options || {};
  var withMembers = !!options.withMembers;
  var prevVar = null;

  for (var i = 0; i < tokens.length; i++) {
    var item = tokens[i];
    if (item.type === IVAR || item.type === IVARNAME) {
      if (!withMembers && !contains(symbols, item.value)) {
        symbols.push(item.value);
      } else if (prevVar !== null) {
        if (!contains(symbols, prevVar)) {
          symbols.push(prevVar);
        }
        prevVar = item.value;
      } else {
        prevVar = item.value;
      }
    } else if (item.type === IMEMBER && withMembers && prevVar !== null) {
      prevVar += '.' + item.value;
    } else if (item.type === IEXPR) {
      getSymbols(item.value, symbols, options);
    } else if (prevVar !== null) {
      if (!contains(symbols, prevVar)) {
        symbols.push(prevVar);
      }
      prevVar = null;
    }
  }

  if (prevVar !== null && !contains(symbols, prevVar)) {
    symbols.push(prevVar);
  }
}

function Expression(tokens, parser) {
  this.tokens = tokens;
  this.parser = parser;
  this.unaryOps = parser.unaryOps;
  this.binaryOps = parser.binaryOps;
  this.ternaryOps = parser.ternaryOps;
  this.functions = parser.functions;
}

Expression.prototype.simplify = function (values) {
  values = values || {};
  return new Expression(simplify(this.tokens, this.unaryOps, this.binaryOps, this.ternaryOps, values), this.parser);
};

Expression.prototype.substitute = function (variable, expr) {
  if (!(expr instanceof Expression)) {
    expr = this.parser.parse(String(expr));
  }

  return new Expression(substitute(this.tokens, variable, expr), this.parser);
};

Expression.prototype.evaluate = function (values) {
  values = values || {};
  return evaluate(this.tokens, this, values);
};

Expression.prototype.toString = function () {
  return expressionToString(this.tokens, false);
};

Expression.prototype.symbols = function (options) {
  options = options || {};
  var vars = [];
  getSymbols(this.tokens, vars, options);
  return vars;
};

Expression.prototype.variables = function (options) {
  options = options || {};
  var vars = [];
  getSymbols(this.tokens, vars, options);
  var functions = this.functions;
  return vars.filter(function (name) {
    return !(name in functions);
  });
};

Expression.prototype.toJSFunction = function (param, variables) {
  var expr = this;
  var f = new Function(param, 'with(this.functions) with (this.ternaryOps) with (this.binaryOps) with (this.unaryOps) { return ' + expressionToString(this.simplify(variables).tokens, true) + '; }'); // eslint-disable-line no-new-func
  return function () {
    return f.apply(expr, arguments);
  };
};

var TEOF = 'TEOF';
var TOP = 'TOP';
var TNUMBER = 'TNUMBER';
var TSTRING = 'TSTRING';
var TPAREN = 'TPAREN';
var TBRACKET = 'TBRACKET';
var TCOMMA = 'TCOMMA';
var TNAME = 'TNAME';
var TSEMICOLON = 'TSEMICOLON';

function Token(type, value, index) {
  this.type = type;
  this.value = value;
  this.index = index;
}

Token.prototype.toString = function () {
  return this.type + ': ' + this.value;
};

function TokenStream(parser, expression) {
  this.pos = 0;
  this.current = null;
  this.unaryOps = parser.unaryOps;
  this.binaryOps = parser.binaryOps;
  this.ternaryOps = parser.ternaryOps;
  this.consts = parser.consts;
  this.expression = expression;
  this.savedPosition = 0;
  this.savedCurrent = null;
  this.options = parser.options;
  this.parser = parser;
}

TokenStream.prototype.newToken = function (type, value, pos) {
  return new Token(type, value, pos != null ? pos : this.pos);
};

TokenStream.prototype.save = function () {
  this.savedPosition = this.pos;
  this.savedCurrent = this.current;
};

TokenStream.prototype.restore = function () {
  this.pos = this.savedPosition;
  this.current = this.savedCurrent;
};

TokenStream.prototype.next = function () {
  if (this.pos >= this.expression.length) {
    return this.newToken(TEOF, 'EOF');
  }

  if (this.isWhitespace() || this.isComment()) {
    return this.next();
  } else if (this.isRadixInteger() ||
      this.isNumber() ||
      this.isOperator() ||
      this.isString() ||
      this.isParen() ||
      this.isBracket() ||
      this.isComma() ||
      this.isSemicolon() ||
      this.isNamedOp() ||
      this.isConst() ||
      this.isName()) {
    return this.current;
  } else {
    this.parseError('Unknown character "' + this.expression.charAt(this.pos) + '"');
  }
};

TokenStream.prototype.isString = function () {
  var r = false;
  var startPos = this.pos;
  var quote = this.expression.charAt(startPos);

  if (quote === '\'' || quote === '"') {
    var index = this.expression.indexOf(quote, startPos + 1);
    while (index >= 0 && this.pos < this.expression.length) {
      this.pos = index + 1;
      if (this.expression.charAt(index - 1) !== '\\') {
        var rawString = this.expression.substring(startPos + 1, index);
        this.current = this.newToken(TSTRING, this.unescape(rawString), startPos);
        r = true;
        break;
      }
      index = this.expression.indexOf(quote, index + 1);
    }
  }
  return r;
};

TokenStream.prototype.isParen = function () {
  var c = this.expression.charAt(this.pos);
  if (c === '(' || c === ')') {
    this.current = this.newToken(TPAREN, c);
    this.pos++;
    return true;
  }
  return false;
};

TokenStream.prototype.isBracket = function () {
  var c = this.expression.charAt(this.pos);
  if ((c === '[' || c === ']') && this.isOperatorEnabled('[')) {
    this.current = this.newToken(TBRACKET, c);
    this.pos++;
    return true;
  }
  return false;
};

TokenStream.prototype.isComma = function () {
  var c = this.expression.charAt(this.pos);
  if (c === ',') {
    this.current = this.newToken(TCOMMA, ',');
    this.pos++;
    return true;
  }
  return false;
};

TokenStream.prototype.isSemicolon = function () {
  var c = this.expression.charAt(this.pos);
  if (c === ';') {
    this.current = this.newToken(TSEMICOLON, ';');
    this.pos++;
    return true;
  }
  return false;
};

TokenStream.prototype.isConst = function () {
  var startPos = this.pos;
  var i = startPos;
  for (; i < this.expression.length; i++) {
    var c = this.expression.charAt(i);
    if (c.toUpperCase() === c.toLowerCase()) {
      if (i === this.pos || (c !== '_' && c !== '.' && (c < '0' || c > '9'))) {
        break;
      }
    }
  }
  if (i > startPos) {
    var str = this.expression.substring(startPos, i);
    if (str in this.consts) {
      this.current = this.newToken(TNUMBER, this.consts[str]);
      this.pos += str.length;
      return true;
    }
  }
  return false;
};

TokenStream.prototype.isNamedOp = function () {
  var startPos = this.pos;
  var i = startPos;
  for (; i < this.expression.length; i++) {
    var c = this.expression.charAt(i);
    if (c.toUpperCase() === c.toLowerCase()) {
      if (i === this.pos || (c !== '_' && (c < '0' || c > '9'))) {
        break;
      }
    }
  }
  if (i > startPos) {
    var str = this.expression.substring(startPos, i);
    if (this.isOperatorEnabled(str) && (str in this.binaryOps || str in this.unaryOps || str in this.ternaryOps)) {
      this.current = this.newToken(TOP, str);
      this.pos += str.length;
      return true;
    }
  }
  return false;
};

TokenStream.prototype.isName = function () {
  var startPos = this.pos;
  var i = startPos;
  var hasLetter = false;
  for (; i < this.expression.length; i++) {
    var c = this.expression.charAt(i);
    if (c.toUpperCase() === c.toLowerCase()) {
      if (i === this.pos && (c === '$' || c === '_')) {
        if (c === '_') {
          hasLetter = true;
        }
        continue;
      } else if (i === this.pos || !hasLetter || (c !== '_' && (c < '0' || c > '9'))) {
        break;
      }
    } else {
      hasLetter = true;
    }
  }
  if (hasLetter) {
    var str = this.expression.substring(startPos, i);
    this.current = this.newToken(TNAME, str);
    this.pos += str.length;
    return true;
  }
  return false;
};

TokenStream.prototype.isWhitespace = function () {
  var r = false;
  var c = this.expression.charAt(this.pos);
  while (c === ' ' || c === '\t' || c === '\n' || c === '\r') {
    r = true;
    this.pos++;
    if (this.pos >= this.expression.length) {
      break;
    }
    c = this.expression.charAt(this.pos);
  }
  return r;
};

var codePointPattern = /^[0-9a-f]{4}$/i;

TokenStream.prototype.unescape = function (v) {
  var index = v.indexOf('\\');
  if (index < 0) {
    return v;
  }

  var buffer = v.substring(0, index);
  while (index >= 0) {
    var c = v.charAt(++index);
    switch (c) {
      case '\'':
        buffer += '\'';
        break;
      case '"':
        buffer += '"';
        break;
      case '\\':
        buffer += '\\';
        break;
      case '/':
        buffer += '/';
        break;
      case 'b':
        buffer += '\b';
        break;
      case 'f':
        buffer += '\f';
        break;
      case 'n':
        buffer += '\n';
        break;
      case 'r':
        buffer += '\r';
        break;
      case 't':
        buffer += '\t';
        break;
      case 'u':
        // interpret the following 4 characters as the hex of the unicode code point
        var codePoint = v.substring(index + 1, index + 5);
        if (!codePointPattern.test(codePoint)) {
          this.parseError('Illegal escape sequence: \\u' + codePoint);
        }
        buffer += String.fromCharCode(parseInt(codePoint, 16));
        index += 4;
        break;
      default:
        throw this.parseError('Illegal escape sequence: "\\' + c + '"');
    }
    ++index;
    var backslash = v.indexOf('\\', index);
    buffer += v.substring(index, backslash < 0 ? v.length : backslash);
    index = backslash;
  }

  return buffer;
};

TokenStream.prototype.isComment = function () {
  var c = this.expression.charAt(this.pos);
  if (c === '/' && this.expression.charAt(this.pos + 1) === '*') {
    this.pos = this.expression.indexOf('*/', this.pos) + 2;
    if (this.pos === 1) {
      this.pos = this.expression.length;
    }
    return true;
  }
  return false;
};

TokenStream.prototype.isRadixInteger = function () {
  var pos = this.pos;

  if (pos >= this.expression.length - 2 || this.expression.charAt(pos) !== '0') {
    return false;
  }
  ++pos;

  var radix;
  var validDigit;
  if (this.expression.charAt(pos) === 'x') {
    radix = 16;
    validDigit = /^[0-9a-f]$/i;
    ++pos;
  } else if (this.expression.charAt(pos) === 'b') {
    radix = 2;
    validDigit = /^[01]$/i;
    ++pos;
  } else {
    return false;
  }

  var valid = false;
  var startPos = pos;

  while (pos < this.expression.length) {
    var c = this.expression.charAt(pos);
    if (validDigit.test(c)) {
      pos++;
      valid = true;
    } else {
      break;
    }
  }

  if (valid) {
    this.current = this.newToken(TNUMBER, parseInt(this.expression.substring(startPos, pos), radix));
    this.pos = pos;
  }
  return valid;
};

TokenStream.prototype.isNumber = function () {
  var valid = false;
  var pos = this.pos;
  var startPos = pos;
  var resetPos = pos;
  var foundDot = false;
  var foundDigits = false;
  var c;

  while (pos < this.expression.length) {
    c = this.expression.charAt(pos);
    if ((c >= '0' && c <= '9') || (!foundDot && c === '.')) {
      if (c === '.') {
        foundDot = true;
      } else {
        foundDigits = true;
      }
      pos++;
      valid = foundDigits;
    } else {
      break;
    }
  }

  if (valid) {
    resetPos = pos;
  }

  if (c === 'e' || c === 'E') {
    pos++;
    var acceptSign = true;
    var validExponent = false;
    while (pos < this.expression.length) {
      c = this.expression.charAt(pos);
      if (acceptSign && (c === '+' || c === '-')) {
        acceptSign = false;
      } else if (c >= '0' && c <= '9') {
        validExponent = true;
        acceptSign = false;
      } else {
        break;
      }
      pos++;
    }

    if (!validExponent) {
      pos = resetPos;
    }
  }

  if (valid) {
    this.current = this.newToken(TNUMBER, parseFloat(this.expression.substring(startPos, pos)));
    this.pos = pos;
  } else {
    this.pos = resetPos;
  }
  return valid;
};

TokenStream.prototype.isOperator = function () {
  var startPos = this.pos;
  var c = this.expression.charAt(this.pos);

  if (c === '+' || c === '-' || c === '*' || c === '/' || c === '%' || c === '^' || c === '?' || c === ':' || c === '.') {
    this.current = this.newToken(TOP, c);
  } else if (c === '∙' || c === '•') {
    this.current = this.newToken(TOP, '*');
  } else if (c === '>') {
    if (this.expression.charAt(this.pos + 1) === '=') {
      this.current = this.newToken(TOP, '>=');
      this.pos++;
    } else {
      this.current = this.newToken(TOP, '>');
    }
  } else if (c === '<') {
    if (this.expression.charAt(this.pos + 1) === '=') {
      this.current = this.newToken(TOP, '<=');
      this.pos++;
    } else {
      this.current = this.newToken(TOP, '<');
    }
  } else if (c === '|') {
    if (this.expression.charAt(this.pos + 1) === '|') {
      this.current = this.newToken(TOP, '||');
      this.pos++;
    } else {
      return false;
    }
  } else if (c === '=') {
    if (this.expression.charAt(this.pos + 1) === '=') {
      this.current = this.newToken(TOP, '==');
      this.pos++;
    } else {
      this.current = this.newToken(TOP, c);
    }
  } else if (c === '!') {
    if (this.expression.charAt(this.pos + 1) === '=') {
      this.current = this.newToken(TOP, '!=');
      this.pos++;
    } else {
      this.current = this.newToken(TOP, c);
    }
  } else {
    return false;
  }
  this.pos++;

  if (this.isOperatorEnabled(this.current.value)) {
    return true;
  } else {
    this.pos = startPos;
    return false;
  }
};

TokenStream.prototype.isOperatorEnabled = function (op) {
  return this.parser.isOperatorEnabled(op);
};

TokenStream.prototype.getCoordinates = function () {
  var line = 0;
  var column;
  var newline = -1;
  do {
    line++;
    column = this.pos - newline;
    newline = this.expression.indexOf('\n', newline + 1);
  } while (newline >= 0 && newline < this.pos);

  return {
    line: line,
    column: column
  };
};

TokenStream.prototype.parseError = function (msg) {
  var coords = this.getCoordinates();
  throw new Error('parse error [' + coords.line + ':' + coords.column + ']: ' + msg);
};

function ParserState(parser, tokenStream, options) {
  this.parser = parser;
  this.tokens = tokenStream;
  this.current = null;
  this.nextToken = null;
  this.next();
  this.savedCurrent = null;
  this.savedNextToken = null;
  this.allowMemberAccess = options.allowMemberAccess !== false;
}

ParserState.prototype.next = function () {
  this.current = this.nextToken;
  return (this.nextToken = this.tokens.next());
};

ParserState.prototype.tokenMatches = function (token, value) {
  if (typeof value === 'undefined') {
    return true;
  } else if (Array.isArray(value)) {
    return contains(value, token.value);
  } else if (typeof value === 'function') {
    return value(token);
  } else {
    return token.value === value;
  }
};

ParserState.prototype.save = function () {
  this.savedCurrent = this.current;
  this.savedNextToken = this.nextToken;
  this.tokens.save();
};

ParserState.prototype.restore = function () {
  this.tokens.restore();
  this.current = this.savedCurrent;
  this.nextToken = this.savedNextToken;
};

ParserState.prototype.accept = function (type, value) {
  if (this.nextToken.type === type && this.tokenMatches(this.nextToken, value)) {
    this.next();
    return true;
  }
  return false;
};

ParserState.prototype.expect = function (type, value) {
  if (!this.accept(type, value)) {
    var coords = this.tokens.getCoordinates();
    throw new Error('parse error [' + coords.line + ':' + coords.column + ']: Expected ' + (value || type));
  }
};

ParserState.prototype.parseAtom = function (instr) {
  var unaryOps = this.tokens.unaryOps;
  function isPrefixOperator(token) {
    return token.value in unaryOps;
  }

  if (this.accept(TNAME) || this.accept(TOP, isPrefixOperator)) {
    instr.push(new Instruction(IVAR, this.current.value));
  } else if (this.accept(TNUMBER)) {
    instr.push(new Instruction(INUMBER, this.current.value));
  } else if (this.accept(TSTRING)) {
    instr.push(new Instruction(INUMBER, this.current.value));
  } else if (this.accept(TPAREN, '(')) {
    this.parseExpression(instr);
    this.expect(TPAREN, ')');
  } else if (this.accept(TBRACKET, '[')) {
    if (this.accept(TBRACKET, ']')) {
      instr.push(new Instruction(IARRAY, 0));
    } else {
      var argCount = this.parseArrayList(instr);
      instr.push(new Instruction(IARRAY, argCount));
    }
  } else {
    throw new Error('unexpected ' + this.nextToken);
  }
};

ParserState.prototype.parseExpression = function (instr) {
  var exprInstr = [];
  if (this.parseUntilEndStatement(instr, exprInstr)) {
    return;
  }
  this.parseVariableAssignmentExpression(exprInstr);
  if (this.parseUntilEndStatement(instr, exprInstr)) {
    return;
  }
  this.pushExpression(instr, exprInstr);
};

ParserState.prototype.pushExpression = function (instr, exprInstr) {
  for (var i = 0, len = exprInstr.length; i < len; i++) {
    instr.push(exprInstr[i]);
  }
};

ParserState.prototype.parseUntilEndStatement = function (instr, exprInstr) {
  if (!this.accept(TSEMICOLON)) return false;
  if (this.nextToken && this.nextToken.type !== TEOF && !(this.nextToken.type === TPAREN && this.nextToken.value === ')')) {
    exprInstr.push(new Instruction(IENDSTATEMENT));
  }
  if (this.nextToken.type !== TEOF) {
    this.parseExpression(exprInstr);
  }
  instr.push(new Instruction(IEXPR, exprInstr));
  return true;
};

ParserState.prototype.parseArrayList = function (instr) {
  var argCount = 0;

  while (!this.accept(TBRACKET, ']')) {
    this.parseExpression(instr);
    ++argCount;
    while (this.accept(TCOMMA)) {
      this.parseExpression(instr);
      ++argCount;
    }
  }

  return argCount;
};

ParserState.prototype.parseVariableAssignmentExpression = function (instr) {
  this.parseConditionalExpression(instr);
  while (this.accept(TOP, '=')) {
    var varName = instr.pop();
    var varValue = [];
    var lastInstrIndex = instr.length - 1;
    if (varName.type === IFUNCALL) {
      if (!this.tokens.isOperatorEnabled('()=')) {
        throw new Error('function definition is not permitted');
      }
      for (var i = 0, len = varName.value + 1; i < len; i++) {
        var index = lastInstrIndex - i;
        if (instr[index].type === IVAR) {
          instr[index] = new Instruction(IVARNAME, instr[index].value);
        }
      }
      this.parseVariableAssignmentExpression(varValue);
      instr.push(new Instruction(IEXPR, varValue));
      instr.push(new Instruction(IFUNDEF, varName.value));
      continue;
    }
    if (varName.type !== IVAR && varName.type !== IMEMBER) {
      throw new Error('expected variable for assignment');
    }
    this.parseVariableAssignmentExpression(varValue);
    instr.push(new Instruction(IVARNAME, varName.value));
    instr.push(new Instruction(IEXPR, varValue));
    instr.push(binaryInstruction('='));
  }
};

ParserState.prototype.parseConditionalExpression = function (instr) {
  this.parseOrExpression(instr);
  while (this.accept(TOP, '?')) {
    var trueBranch = [];
    var falseBranch = [];
    this.parseConditionalExpression(trueBranch);
    this.expect(TOP, ':');
    this.parseConditionalExpression(falseBranch);
    instr.push(new Instruction(IEXPR, trueBranch));
    instr.push(new Instruction(IEXPR, falseBranch));
    instr.push(ternaryInstruction('?'));
  }
};

ParserState.prototype.parseOrExpression = function (instr) {
  this.parseAndExpression(instr);
  while (this.accept(TOP, 'or')) {
    var falseBranch = [];
    this.parseAndExpression(falseBranch);
    instr.push(new Instruction(IEXPR, falseBranch));
    instr.push(binaryInstruction('or'));
  }
};

ParserState.prototype.parseAndExpression = function (instr) {
  this.parseComparison(instr);
  while (this.accept(TOP, 'and')) {
    var trueBranch = [];
    this.parseComparison(trueBranch);
    instr.push(new Instruction(IEXPR, trueBranch));
    instr.push(binaryInstruction('and'));
  }
};

var COMPARISON_OPERATORS = ['==', '!=', '<', '<=', '>=', '>', 'in'];

ParserState.prototype.parseComparison = function (instr) {
  this.parseAddSub(instr);
  while (this.accept(TOP, COMPARISON_OPERATORS)) {
    var op = this.current;
    this.parseAddSub(instr);
    instr.push(binaryInstruction(op.value));
  }
};

var ADD_SUB_OPERATORS = ['+', '-', '||'];

ParserState.prototype.parseAddSub = function (instr) {
  this.parseTerm(instr);
  while (this.accept(TOP, ADD_SUB_OPERATORS)) {
    var op = this.current;
    this.parseTerm(instr);
    instr.push(binaryInstruction(op.value));
  }
};

var TERM_OPERATORS = ['*', '/', '%'];

ParserState.prototype.parseTerm = function (instr) {
  this.parseFactor(instr);
  while (this.accept(TOP, TERM_OPERATORS)) {
    var op = this.current;
    this.parseFactor(instr);
    instr.push(binaryInstruction(op.value));
  }
};

ParserState.prototype.parseFactor = function (instr) {
  var unaryOps = this.tokens.unaryOps;
  function isPrefixOperator(token) {
    return token.value in unaryOps;
  }

  this.save();
  if (this.accept(TOP, isPrefixOperator)) {
    if (this.current.value !== '-' && this.current.value !== '+') {
      if (this.nextToken.type === TPAREN && this.nextToken.value === '(') {
        this.restore();
        this.parseExponential(instr);
        return;
      } else if (this.nextToken.type === TSEMICOLON || this.nextToken.type === TCOMMA || this.nextToken.type === TEOF || (this.nextToken.type === TPAREN && this.nextToken.value === ')')) {
        this.restore();
        this.parseAtom(instr);
        return;
      }
    }

    var op = this.current;
    this.parseFactor(instr);
    instr.push(unaryInstruction(op.value));
  } else {
    this.parseExponential(instr);
  }
};

ParserState.prototype.parseExponential = function (instr) {
  this.parsePostfixExpression(instr);
  while (this.accept(TOP, '^')) {
    this.parseFactor(instr);
    instr.push(binaryInstruction('^'));
  }
};

ParserState.prototype.parsePostfixExpression = function (instr) {
  this.parseFunctionCall(instr);
  while (this.accept(TOP, '!')) {
    instr.push(unaryInstruction('!'));
  }
};

ParserState.prototype.parseFunctionCall = function (instr) {
  var unaryOps = this.tokens.unaryOps;
  function isPrefixOperator(token) {
    return token.value in unaryOps;
  }

  if (this.accept(TOP, isPrefixOperator)) {
    var op = this.current;
    this.parseAtom(instr);
    instr.push(unaryInstruction(op.value));
  } else {
    this.parseMemberExpression(instr);
    while (this.accept(TPAREN, '(')) {
      if (this.accept(TPAREN, ')')) {
        instr.push(new Instruction(IFUNCALL, 0));
      } else {
        var argCount = this.parseArgumentList(instr);
        instr.push(new Instruction(IFUNCALL, argCount));
      }
    }
  }
};

ParserState.prototype.parseArgumentList = function (instr) {
  var argCount = 0;

  while (!this.accept(TPAREN, ')')) {
    this.parseExpression(instr);
    ++argCount;
    while (this.accept(TCOMMA)) {
      this.parseExpression(instr);
      ++argCount;
    }
  }

  return argCount;
};

ParserState.prototype.parseMemberExpression = function (instr) {
  this.parseAtom(instr);
  while (this.accept(TOP, '.') || this.accept(TBRACKET, '[')) {
    var op = this.current;

    if (op.value === '.') {
      if (!this.allowMemberAccess) {
        throw new Error('unexpected ".", member access is not permitted');
      }

      this.expect(TNAME);
      instr.push(new Instruction(IMEMBER, this.current.value));
    } else if (op.value === '[') {
      if (!this.tokens.isOperatorEnabled('[')) {
        throw new Error('unexpected "[]", arrays are disabled');
      }

      this.parseExpression(instr);
      this.expect(TBRACKET, ']');
      instr.push(binaryInstruction('['));
    } else {
      throw new Error('unexpected symbol: ' + op.value);
    }
  }
};

function add(a, b) {
  return Number(a) + Number(b);
}

function sub(a, b) {
  return a - b;
}

function mul(a, b) {
  return a * b;
}

function div(a, b) {
  return a / b;
}

function mod(a, b) {
  return a % b;
}

function concat(a, b) {
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.concat(b);
  }
  return '' + a + b;
}

function equal(a, b) {
  return a === b;
}

function notEqual(a, b) {
  return a !== b;
}

function greaterThan(a, b) {
  return a > b;
}

function lessThan(a, b) {
  return a < b;
}

function greaterThanEqual(a, b) {
  return a >= b;
}

function lessThanEqual(a, b) {
  return a <= b;
}

function andOperator(a, b) {
  return Boolean(a && b);
}

function orOperator(a, b) {
  return Boolean(a || b);
}

function inOperator(a, b) {
  return contains(b, a);
}

function sinh(a) {
  return ((Math.exp(a) - Math.exp(-a)) / 2);
}

function cosh(a) {
  return ((Math.exp(a) + Math.exp(-a)) / 2);
}

function tanh(a) {
  if (a === Infinity) return 1;
  if (a === -Infinity) return -1;
  return (Math.exp(a) - Math.exp(-a)) / (Math.exp(a) + Math.exp(-a));
}

function asinh(a) {
  if (a === -Infinity) return a;
  return Math.log(a + Math.sqrt((a * a) + 1));
}

function acosh(a) {
  return Math.log(a + Math.sqrt((a * a) - 1));
}

function atanh(a) {
  return (Math.log((1 + a) / (1 - a)) / 2);
}

function log10(a) {
  return Math.log(a) * Math.LOG10E;
}

function neg(a) {
  return -a;
}

function not(a) {
  return !a;
}

function trunc(a) {
  return a < 0 ? Math.ceil(a) : Math.floor(a);
}

function random(a) {
  return Math.random() * (a || 1);
}

function factorial(a) { // a!
  return gamma(a + 1);
}

function isInteger(value) {
  return isFinite(value) && (value === Math.round(value));
}

var GAMMA_G = 4.7421875;
var GAMMA_P = [
  0.99999999999999709182,
  57.156235665862923517, -59.597960355475491248,
  14.136097974741747174, -0.49191381609762019978,
  0.33994649984811888699e-4,
  0.46523628927048575665e-4, -0.98374475304879564677e-4,
  0.15808870322491248884e-3, -0.21026444172410488319e-3,
  0.21743961811521264320e-3, -0.16431810653676389022e-3,
  0.84418223983852743293e-4, -0.26190838401581408670e-4,
  0.36899182659531622704e-5
];

// Gamma function from math.js
function gamma(n) {
  var t, x;

  if (isInteger(n)) {
    if (n <= 0) {
      return isFinite(n) ? Infinity : NaN;
    }

    if (n > 171) {
      return Infinity; // Will overflow
    }

    var value = n - 2;
    var res = n - 1;
    while (value > 1) {
      res *= value;
      value--;
    }

    if (res === 0) {
      res = 1; // 0! is per definition 1
    }

    return res;
  }

  if (n < 0.5) {
    return Math.PI / (Math.sin(Math.PI * n) * gamma(1 - n));
  }

  if (n >= 171.35) {
    return Infinity; // will overflow
  }

  if (n > 85.0) { // Extended Stirling Approx
    var twoN = n * n;
    var threeN = twoN * n;
    var fourN = threeN * n;
    var fiveN = fourN * n;
    return Math.sqrt(2 * Math.PI / n) * Math.pow((n / Math.E), n) *
      (1 + (1 / (12 * n)) + (1 / (288 * twoN)) - (139 / (51840 * threeN)) -
      (571 / (2488320 * fourN)) + (163879 / (209018880 * fiveN)) +
      (5246819 / (75246796800 * fiveN * n)));
  }

  --n;
  x = GAMMA_P[0];
  for (var i = 1; i < GAMMA_P.length; ++i) {
    x += GAMMA_P[i] / (n + i);
  }

  t = n + GAMMA_G + 0.5;
  return Math.sqrt(2 * Math.PI) * Math.pow(t, n + 0.5) * Math.exp(-t) * x;
}

function stringOrArrayLength(s) {
  if (Array.isArray(s)) {
    return s.length;
  }
  return String(s).length;
}

function hypot() {
  var sum = 0;
  var larg = 0;
  for (var i = 0; i < arguments.length; i++) {
    var arg = Math.abs(arguments[i]);
    var div;
    if (larg < arg) {
      div = larg / arg;
      sum = (sum * div * div) + 1;
      larg = arg;
    } else if (arg > 0) {
      div = arg / larg;
      sum += div * div;
    } else {
      sum += arg;
    }
  }
  return larg === Infinity ? Infinity : larg * Math.sqrt(sum);
}

function condition(cond, yep, nope) {
  return cond ? yep : nope;
}

/**
* Decimal adjustment of a number.
* From @escopecz.
*
* @param {Number} value The number.
* @param {Integer} exp  The exponent (the 10 logarithm of the adjustment base).
* @return {Number} The adjusted value.
*/
function roundTo(value, exp) {
  // If the exp is undefined or zero...
  if (typeof exp === 'undefined' || +exp === 0) {
    return Math.round(value);
  }
  value = +value;
  exp = -(+exp);
  // If the value is not a number or the exp is not an integer...
  if (isNaN(value) || !(typeof exp === 'number' && exp % 1 === 0)) {
    return NaN;
  }
  // Shift
  value = value.toString().split('e');
  value = Math.round(+(value[0] + 'e' + (value[1] ? (+value[1] - exp) : -exp)));
  // Shift back
  value = value.toString().split('e');
  return +(value[0] + 'e' + (value[1] ? (+value[1] + exp) : exp));
}

function setVar(name, value, variables) {
  if (variables) variables[name] = value;
  return value;
}

function arrayIndex(array, index) {
  return array[index | 0];
}

function max(array) {
  if (arguments.length === 1 && Array.isArray(array)) {
    return Math.max.apply(Math, array);
  } else {
    return Math.max.apply(Math, arguments);
  }
}

function min(array) {
  if (arguments.length === 1 && Array.isArray(array)) {
    return Math.min.apply(Math, array);
  } else {
    return Math.min.apply(Math, arguments);
  }
}

function arrayMap(f, a) {
  if (typeof f !== 'function') {
    throw new Error('First argument to map is not a function');
  }
  if (!Array.isArray(a)) {
    throw new Error('Second argument to map is not an array');
  }
  return a.map(function (x, i) {
    return f(x, i);
  });
}

function arrayFold(f, init, a) {
  if (typeof f !== 'function') {
    throw new Error('First argument to fold is not a function');
  }
  if (!Array.isArray(a)) {
    throw new Error('Second argument to fold is not an array');
  }
  return a.reduce(function (acc, x, i) {
    return f(acc, x, i);
  }, init);
}

function arrayFilter(f, a) {
  if (typeof f !== 'function') {
    throw new Error('First argument to filter is not a function');
  }
  if (!Array.isArray(a)) {
    throw new Error('Second argument to filter is not an array');
  }
  return a.filter(function (x, i) {
    return f(x, i);
  });
}

function stringOrArrayIndexOf(target, s) {
  if (!(Array.isArray(s) || typeof s === 'string')) {
    throw new Error('Second argument to indexOf is not a string or array');
  }

  return s.indexOf(target);
}

function arrayJoin(sep, a) {
  if (!Array.isArray(a)) {
    throw new Error('Second argument to join is not an array');
  }

  return a.join(sep);
}

function sign(x) {
  return ((x > 0) - (x < 0)) || +x;
}

var ONE_THIRD = 1/3;
function cbrt(x) {
  return x < 0 ? -Math.pow(-x, ONE_THIRD) : Math.pow(x, ONE_THIRD);
}

function expm1(x) {
  return Math.exp(x) - 1;
}

function log1p(x) {
  return Math.log(1 + x);
}

function log2(x) {
  return Math.log(x) / Math.LN2;
}

function Parser(options) {
  this.options = options || {};
  this.unaryOps = {
    sin: Math.sin,
    cos: Math.cos,
    tan: Math.tan,
    asin: Math.asin,
    acos: Math.acos,
    atan: Math.atan,
    sinh: Math.sinh || sinh,
    cosh: Math.cosh || cosh,
    tanh: Math.tanh || tanh,
    asinh: Math.asinh || asinh,
    acosh: Math.acosh || acosh,
    atanh: Math.atanh || atanh,
    sqrt: Math.sqrt,
    cbrt: Math.cbrt || cbrt,
    log: Math.log,
    log2: Math.log2 || log2,
    ln: Math.log,
    lg: Math.log10 || log10,
    log10: Math.log10 || log10,
    expm1: Math.expm1 || expm1,
    log1p: Math.log1p || log1p,
    abs: Math.abs,
    ceil: Math.ceil,
    floor: Math.floor,
    round: Math.round,
    trunc: Math.trunc || trunc,
    '-': neg,
    '+': Number,
    exp: Math.exp,
    not: not,
    length: stringOrArrayLength,
    '!': factorial,
    sign: Math.sign || sign
  };

  this.binaryOps = {
    '+': add,
    '-': sub,
    '*': mul,
    '/': div,
    '%': mod,
    '^': Math.pow,
    '||': concat,
    '==': equal,
    '!=': notEqual,
    '>': greaterThan,
    '<': lessThan,
    '>=': greaterThanEqual,
    '<=': lessThanEqual,
    and: andOperator,
    or: orOperator,
    'in': inOperator,
    '=': setVar,
    '[': arrayIndex
  };

  this.ternaryOps = {
    '?': condition
  };

  this.functions = {
    random: random,
    fac: factorial,
    min: min,
    max: max,
    hypot: Math.hypot || hypot,
    pyt: Math.hypot || hypot, // backward compat
    pow: Math.pow,
    atan2: Math.atan2,
    'if': condition,
    gamma: gamma,
    roundTo: roundTo,
    map: arrayMap,
    fold: arrayFold,
    filter: arrayFilter,
    indexOf: stringOrArrayIndexOf,
    join: arrayJoin
  };

  this.consts = {
    E: Math.E,
    PI: Math.PI,
    'true': true,
    'false': false
  };
}

Parser.prototype.parse = function (expr) {
  var instr = [];
  var parserState = new ParserState(
    this,
    new TokenStream(this, expr),
    { allowMemberAccess: this.options.allowMemberAccess }
  );

  parserState.parseExpression(instr);
  parserState.expect(TEOF, 'EOF');

  return new Expression(instr, this);
};

Parser.prototype.evaluate = function (expr, variables) {
  return this.parse(expr).evaluate(variables);
};

var sharedParser = new Parser();

Parser.parse = function (expr) {
  return sharedParser.parse(expr);
};

Parser.evaluate = function (expr, variables) {
  return sharedParser.parse(expr).evaluate(variables);
};

var optionNameMap = {
  '+': 'add',
  '-': 'subtract',
  '*': 'multiply',
  '/': 'divide',
  '%': 'remainder',
  '^': 'power',
  '!': 'factorial',
  '<': 'comparison',
  '>': 'comparison',
  '<=': 'comparison',
  '>=': 'comparison',
  '==': 'comparison',
  '!=': 'comparison',
  '||': 'concatenate',
  'and': 'logical',
  'or': 'logical',
  'not': 'logical',
  '?': 'conditional',
  ':': 'conditional',
  '=': 'assignment',
  '[': 'array',
  '()=': 'fndef'
};

function getOptionName(op) {
  return optionNameMap.hasOwnProperty(op) ? optionNameMap[op] : op;
}

Parser.prototype.isOperatorEnabled = function (op) {
  var optionName = getOptionName(op);
  var operators = this.options.operators || {};

  return !(optionName in operators) || !!operators[optionName];
};

const parser$3 = new Parser();
const commandList = {
    a: {min: 1, validate: [isExpression, isExpression]},
    t: {validate: isExpression},
    r: {min: 1, validate: [isExpression, isExpression]},
    d: {validate: inList(['0','1'])},
    z: {validate: [isExpression, isExpression]},
    f: {validate: [isExpression, isExpression, isExpression, isExpression]}
};
const castArray = a => Array.isArray(a) ? a : [a];
function isExpression(str) {
    try {
        parser$3.parse(str);
    } catch (e) {
        throw 'Error : expression can not be parsed'
    }
    return true
}
function inList(items) {
    return function (str) {
        return items.indexOf(str) !== -1
    }
}
function textToCommands(text) {
    const drawingCommands = [];
    let error = false;
    try {
        const commands = text.split('\n');
        const loops = [];
        let drawingMode = true;
        for (const [index, command] of commands.entries()) {
            if (command !== '') {
                drawingMode = parseLine(command, index, loops, drawingCommands, drawingMode);
            }
        }
    } catch (e) {
        error = e;
    }
    return {commands: drawingCommands, error}
}
function getVariable(line) {
    const re = /^\s*(-*)\s*#(\w+)\s*=\s*(.+)\s*/g;
    const matches = [...line.matchAll(re)];
    if (matches.length === 0) return false
    const [, dash, verb, arg] = matches[0];
    if (verb.charAt(0) === 'i') throwError (index, 'variable can not start with the letter i');
    return { dash, verb: '#', args:[verb, arg] }
}
function getTokens(line, index) {
        const v = getVariable(line);
        if (v) return v
        const rCom = Object.keys(commandList).join('|');
        const re = new RegExp(`\\s*(-*)\\s*([${rCom}])\\s*(.+)`, 'g');
        const matches = [...line.matchAll(re)];
        if (matches.length === 0) throwError(index, 'unknown command');
        const [, dash, verb, arg] = matches[0];
        const args = arg.replace(/\s/g, '').split(',');
        validateArguments(verb, args);
        return { dash, verb, args }
}
function validateArguments(verb, args) {
    if (!commandList[verb]) throw('ERROR: invalid')
    const commandArgs = castArray(commandList[verb].validate);
    const min = commandList[verb].min;
    const diff = commandArgs.length - args.length;
    if ( diff < 0 ) throw `Error : to many arguments for command ${verb}`
    if (args.length < min) throw `Error : Not enough arguments for command ${verb}`
    for (const [index, cArg] of commandArgs.entries()) {
        if (!cArg(args[index])) throw `Error: invalid argument type`
        if (index === args.length - 1) break
    }
    return true
}
function parseLine(command, index, loops, drawingCommands, mode) {
    const { dash, verb, args } = getTokens(command, index);
    // validateArguments(verb, args)
    const arg = args;//[0]
    const dashNum = dash.length;
    const loopsNum = loops.length;
    if (verb === 'r') {
        parser1(index, verb, arg, loopsNum, dashNum, loops, drawingCommands, mode, true);
    } else {
        // No need to register 'd' mode command
        if (verb === 'd') {
            const newMode = arg[0] === '0' ? false : true;
            return newMode
        }
        parser1(index, verb, arg, loopsNum, dashNum, loops, drawingCommands, mode, false);
    }
    return mode
}
function throwError (lineIndex, message = '') {
    const m = message === '' ? '' : ':' + message;
    throw `Error at line ${lineIndex + 1} ${m}`
}
function parser1(index, verb, arg, loopsNum, dashNum, loops, drawingCommands, mode, isRepeat) {
    const newCommand = {verb, arg, children: [], mode};
    if (loopsNum === 0) {
        drawingCommands.push(newCommand);
        if (isRepeat) loops.push(newCommand.children);
    } else {
        const diff = loopsNum - dashNum;
        if (diff === 0) {
            const lastChildren = loops[loopsNum - 1];
            lastChildren.push(newCommand);
            if (isRepeat) loops.push(newCommand.children);
        } else if (diff > 0) {
            parser2(diff, newCommand, loops, drawingCommands, isRepeat);
        } else {
            throwError(index, 'mismatch on loops');
        }
    }   
}
function parser2(diff, newCommand, loops, drawingCommands, isRepeat) {
    for (let i = 0; i < diff; i++){
        loops.pop();
    }
    const lastChildren = loops.length !==0
        ? loops[loops.length - 1]
        : null;
    if (lastChildren === null ) {
        drawingCommands.push(newCommand);
        if (isRepeat) loops.push(newCommand.children);
    } else {
        lastChildren.push(newCommand);
    }
}

const model = { };
const parser$2 = new Parser();

function drawer ({layers, commands }) {
    const {width, height } = layers.getDimension();
    const all = layers.getAll();
    
    model.points = [{ x: 0, y: 0 }];
    model.angle = 0;
    model.width = width;
    model.height = height;
    model.x = width/2;
    model.y = height/2;
    model.level = 0;
    // drawTriangle(all[1].ctx,20, model.points[0], model.angle)
    draw(all, commands, model.width);
    return {
      clear () {
        drawer( {layers, commands: [] });
      }
    }
}
function drawLine(ctx, point1, point2, drawingMode, offset = {x:0, y:0}) {
    if (drawingMode){
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(point1.x + model.x+ offset.x, point1.y + model.y+ offset.y);
        ctx.lineTo(point2.x + model.x+ offset.x, point2.y + model.y+ offset.y);
        ctx.stroke();
    }  else {
        ctx.moveTo(point2.x + model.x, point2.y + model.y);
    }
}
function degToRad(deg) {
    return Math.PI*deg/180
}
function basicCommand(all, offset) {
  all[0].ctx.globalAlpha = 0.1;
  return function(command) {
    
    let variable = undefined;
    let args = command.arg.slice();
    if (command.verb === "#") {
      variable = args.shift();
      model[variable] = model[variable] || 0;
    }
    const values = args.map(
      v => parser$2.parse(v).evaluate(model)
    );
    switch (command.verb) {
      case 'a':
        if (values.length === 1) {
          avance (all, values[0], command.mode, offset); 
        } else {
          deplace (all, values, command.mode, offset);
        }
        break
      case 't':
        tourne (all, values[0]);
        break
      case 'z':
        model.x += values[0];
        model.y += values[1];
        break
      case '#':
        model[variable] = values[0];
        break
    }
  }
}
function repeat(ctx, command) {
  model.level ++;
  repete(command.arg, (offset) => {
      for (const [index, child] of command.children.entries()) {
          if (child.verb === 'r') {
              repeat(ctx, child);
          } else {
              basicCommand(ctx)(child, offset);
          }
      }
  });
  model.level --;
}
function repete(args, fn) {
  let [iMin, iMax, fullScreen] = args;
  let offset, increment;
  const diff = iMax-iMin;
  const ifFn = fullScreen != null;
  if (!ifFn) {
    increment = 1;
    offset = {x: 0, y:0};
  } else {
    increment = diff/model.width;
    offset = {x: -model.width/2, y:0};
  }
  if (iMax === undefined) {
    iMax = iMin;
    iMin = 0;
  }
  for (let i = iMin; i < iMax; i+=increment) {
    model[getIndexVars(model.level)] = i;
    fn(offset);
  }
}
function draw(all, commands, width) {
    for (const command of commands) {
      const {verb, arg} = command;
      if (verb === 'f') ; else if (command.verb === 'r') {
        repeat(all, command);
      } else {
        model.i = undefined;
        basicCommand(all)(command);
      }
    }
}

// 1 -> i, 2 -> ii, ...
function getIndexVars(level) {
  return Array(level).fill('').reduce((acc, v) => {acc+='i';return acc}, '')
}
function avance(all, pixelsNum, drawingMode, offset) {
  const lastPoint = model.points[model.points.length -1];
  const x = Math.cos(model.angle)*pixelsNum;
  const y = Math.sin(model.angle)*pixelsNum;
  const newPoint = {x: lastPoint.x + x, y: lastPoint.y + y};
  model.points.push(newPoint);
  drawLine(all[0].ctx, lastPoint, newPoint, drawingMode, offset);
}
function tourne(all, angle) {
  model.angle -= degToRad(angle);
  all[1];
  /*clear()
  drawTriangle(ctx ,20, {x:0, y:0}, model.angle)*/
}
function deplace(all, [x, y], drawingMode, offset) {
  const lastPoint = model.points[model.points.length-1];
  const newPoint = {x, y};
  model.points.push(newPoint);
  drawLine(all[0].ctx, lastPoint, newPoint, drawingMode, offset);
}

const iArray = (num) => Array(num).fill('').map((v,i)=> i);

const help = `
x!	factoriel de x
abs x	valeur absolue de x
acos x	arc cosinus de x (en radians)
acosh x	cosinus hyperbolique réciproque de x (en radians)
asin x	Arc sinus de x (en radians)
asinh x	sinus hyperbolique réciproque de x (en radians)
atan x	arc tangente de x (en radians)
atanh x	tangente hyperbolic réciproque (en radians)
cbrt x	racine cubique
cos x	cosinus de x (en radians)
cosh x	cosinus hyperbolic de x (en radians)
exp x	exponentielle de x (ou e^x)
ln x	logarithme népérien de x (ou log x)
log10 x	logarithme de x en base 1
log2 x	logarithme de x en base 2
not x	opérateur logiue NOT
sin x	sinus de x (en radians)
sinh x	sinus hyperbolique de x (x is in radians)
sqrt x	racine carré de x
tan x	tangente de x (en radians)
tanh x	tangente hyperbolique de x (en radians)
atan2(y, x)	Arc tangent de x/y. Angle entre (0, 0) and (x, y) en radians
`;

const helpFunctions = help
    .split('\n').map(v=>v.split('\t'))
    .filter (v => v.length === 2)
    .map (v => `<div class="bold small">${v[0]}</div><div class="small">${v[1]}</div>`)
    .join('');

const canvasStyle = `
    width: 100%;
    height: 100%;
    position: absolute;
    top: 0;
    left: 0;
`;
function canvasLayers(containerNode, layerNum ) {
    // https://stackoverflow.com/questions/30229536/how-to-make-a-html5-canvas-fit-dynamic-parent-flex-box-container
    const {width, height} = containerNode.getBoundingClientRect();
    const array = iArray(layerNum);
    const canvases = array.map(
        () => document.createElement('canvas')
    );
    for (const canvas of canvases) {
        canvas.width = width;
        canvas.height = height;
        canvas.setAttribute('style',canvasStyle);
        containerNode.prepend(canvas);
    }
    return {
        getContext(layerNum) {
            return canvases[layerNum].getContext('2d')
        },
        getAll() {
            return array.map(
                index => {
                    return {
                        ctx: this.getContext(index),
                        clear: () => this.clear(index)
                    }
                }
            )
        },
        getCanvas(layerNum) {
            return canvases[layerNum].getContext('2d')
        },
        getDimension() {
            return { width, height }
        },
        clear(layerNum) {
            this.getContext(layerNum).clearRect(0, 0, width, height);
        },
        clearAll() {
            for (const index of array) {
                this.clear(index);
            }
        },
        layerNum
    }
}

/**
 * ISC License
 *
 * Copyright (c) 2020, Andrea Giammarchi, @WebReflection
 *
 * Permission to use, copy, modify, and/or distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies.
 *
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
 * REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
 * AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
 * INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
 * LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE
 * OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
 * PERFORMANCE OF THIS SOFTWARE.
 */

/**
 * @param {Node} parentNode The container where children live
 * @param {Node[]} a The list of current/live children
 * @param {Node[]} b The list of future children
 * @param {(entry: Node, action: number) => Node} get
 * The callback invoked per each entry related DOM operation.
 * @param {Node} [before] The optional node used as anchor to insert before.
 * @returns {Node[]} The same list of future children.
 */
var udomdiff = (parentNode, a, b, get, before) => {
  const bLength = b.length;
  let aEnd = a.length;
  let bEnd = bLength;
  let aStart = 0;
  let bStart = 0;
  let map = null;
  while (aStart < aEnd || bStart < bEnd) {
    // append head, tail, or nodes in between: fast path
    if (aEnd === aStart) {
      // we could be in a situation where the rest of nodes that
      // need to be added are not at the end, and in such case
      // the node to `insertBefore`, if the index is more than 0
      // must be retrieved, otherwise it's gonna be the first item.
      const node = bEnd < bLength ?
        (bStart ?
          (get(b[bStart - 1], -0).nextSibling) :
          get(b[bEnd - bStart], 0)) :
        before;
      while (bStart < bEnd)
        parentNode.insertBefore(get(b[bStart++], 1), node);
    }
    // remove head or tail: fast path
    else if (bEnd === bStart) {
      while (aStart < aEnd) {
        // remove the node only if it's unknown or not live
        if (!map || !map.has(a[aStart]))
          parentNode.removeChild(get(a[aStart], -1));
        aStart++;
      }
    }
    // same node: fast path
    else if (a[aStart] === b[bStart]) {
      aStart++;
      bStart++;
    }
    // same tail: fast path
    else if (a[aEnd - 1] === b[bEnd - 1]) {
      aEnd--;
      bEnd--;
    }
    // The once here single last swap "fast path" has been removed in v1.1.0
    // https://github.com/WebReflection/udomdiff/blob/single-final-swap/esm/index.js#L69-L85
    // reverse swap: also fast path
    else if (
      a[aStart] === b[bEnd - 1] &&
      b[bStart] === a[aEnd - 1]
    ) {
      // this is a "shrink" operation that could happen in these cases:
      // [1, 2, 3, 4, 5]
      // [1, 4, 3, 2, 5]
      // or asymmetric too
      // [1, 2, 3, 4, 5]
      // [1, 2, 3, 5, 6, 4]
      const node = get(a[--aEnd], -1).nextSibling;
      parentNode.insertBefore(
        get(b[bStart++], 1),
        get(a[aStart++], -1).nextSibling
      );
      parentNode.insertBefore(get(b[--bEnd], 1), node);
      // mark the future index as identical (yeah, it's dirty, but cheap 👍)
      // The main reason to do this, is that when a[aEnd] will be reached,
      // the loop will likely be on the fast path, as identical to b[bEnd].
      // In the best case scenario, the next loop will skip the tail,
      // but in the worst one, this node will be considered as already
      // processed, bailing out pretty quickly from the map index check
      a[aEnd] = b[bEnd];
    }
    // map based fallback, "slow" path
    else {
      // the map requires an O(bEnd - bStart) operation once
      // to store all future nodes indexes for later purposes.
      // In the worst case scenario, this is a full O(N) cost,
      // and such scenario happens at least when all nodes are different,
      // but also if both first and last items of the lists are different
      if (!map) {
        map = new Map;
        let i = bStart;
        while (i < bEnd)
          map.set(b[i], i++);
      }
      // if it's a future node, hence it needs some handling
      if (map.has(a[aStart])) {
        // grab the index of such node, 'cause it might have been processed
        const index = map.get(a[aStart]);
        // if it's not already processed, look on demand for the next LCS
        if (bStart < index && index < bEnd) {
          let i = aStart;
          // counts the amount of nodes that are the same in the future
          let sequence = 1;
          while (++i < aEnd && i < bEnd && map.get(a[i]) === (index + sequence))
            sequence++;
          // effort decision here: if the sequence is longer than replaces
          // needed to reach such sequence, which would brings again this loop
          // to the fast path, prepend the difference before a sequence,
          // and move only the future list index forward, so that aStart
          // and bStart will be aligned again, hence on the fast path.
          // An example considering aStart and bStart are both 0:
          // a: [1, 2, 3, 4]
          // b: [7, 1, 2, 3, 6]
          // this would place 7 before 1 and, from that time on, 1, 2, and 3
          // will be processed at zero cost
          if (sequence > (index - bStart)) {
            const node = get(a[aStart], 0);
            while (bStart < index)
              parentNode.insertBefore(get(b[bStart++], 1), node);
          }
          // if the effort wasn't good enough, fallback to a replace,
          // moving both source and target indexes forward, hoping that some
          // similar node will be found later on, to go back to the fast path
          else {
            parentNode.replaceChild(
              get(b[bStart++], 1),
              get(a[aStart++], -1)
            );
          }
        }
        // otherwise move the source forward, 'cause there's nothing to do
        else
          aStart++;
      }
      // this node has no meaning in the future list, so it's more than safe
      // to remove it, and check the next live node out instead, meaning
      // that only the live list index should be forwarded
      else
        parentNode.removeChild(get(a[aStart++], -1));
    }
  }
  return b;
};

const { isArray } = Array;
const { getPrototypeOf, getOwnPropertyDescriptor } = Object;

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

const empty = [];

const newRange = () => document.createRange();

/**
 * Set the `key` `value` pair to the *Map* or *WeakMap* and returns the `value`
 * @template T
 * @param {Map | WeakMap} map
 * @param {any} key
 * @param {T} value
 * @returns {T}
 */
const set = (map, key, value) => {
  map.set(key, value);
  return value;
};

/**
 * Return a descriptor, if any, for the referenced *Element*
 * @param {Element} ref
 * @param {string} prop
 * @returns 
 */
const gPD = (ref, prop) => {
  let desc;
  do { desc = getOwnPropertyDescriptor(ref, prop); }
  while(!desc && (ref = getPrototypeOf(ref)));
  return desc;
};

const ELEMENT_NODE = 1;
const COMMENT_NODE = 8;
const DOCUMENT_FRAGMENT_NODE = 11;

/*! (c) Andrea Giammarchi - ISC */
const {setPrototypeOf} = Object;

/**
 * @param {Function} Class any base class to extend without passing through it via super() call.
 * @returns {Function} an extensible class for the passed one.
 * @example
 *  // creating this very same module utility
 *  import custom from 'custom-function/factory';
 *  const CustomFunction = custom(Function);
 *  class MyFunction extends CustomFunction {}
 *  const mf = new MyFunction(() => {});
 */
var custom = Class => {
  function Custom(target) {
    return setPrototypeOf(target, new.target.prototype);
  }
  Custom.prototype = Class.prototype;
  return Custom;
};

let range$1;
/**
 * @param {Node | Element} firstChild
 * @param {Node | Element} lastChild
 * @param {boolean} preserve
 * @returns
 */
var drop = (firstChild, lastChild, preserve) => {
  if (!range$1) range$1 = newRange();
  /* c8 ignore start */
  if (preserve)
    range$1.setStartAfter(firstChild);
  else
    range$1.setStartBefore(firstChild);
  /* c8 ignore stop */
  range$1.setEndAfter(lastChild);
  range$1.deleteContents();
  return firstChild;
};

/**
 * @param {PersistentFragment} fragment
 * @returns {Node | Element}
 */
const remove = ({firstChild, lastChild}, preserve) => drop(firstChild, lastChild, preserve);

let checkType = false;

/**
 * @param {Node} node
 * @param {1 | 0 | -0 | -1} operation
 * @returns {Node}
 */
const diffFragment = (node, operation) => (
  checkType && node.nodeType === DOCUMENT_FRAGMENT_NODE ?
    ((1 / operation) < 0 ?
      (operation ? remove(node, true) : node.lastChild) :
      (operation ? node.valueOf() : node.firstChild)) :
    node
);

const comment = value => document.createComment(value);

/** @extends {DocumentFragment} */
class PersistentFragment extends custom(DocumentFragment) {
  #firstChild = comment('<>');
  #lastChild = comment('</>');
  #nodes = empty;
  constructor(fragment) {
    super(fragment);
    this.replaceChildren(...[
      this.#firstChild,
      ...fragment.childNodes,
      this.#lastChild,
    ]);
    checkType = true;
  }
  get firstChild() { return this.#firstChild; }
  get lastChild() { return this.#lastChild; }
  get parentNode() { return this.#firstChild.parentNode; }
  remove() {
    remove(this, false);
  }
  replaceWith(node) {
    remove(this, true).replaceWith(node);
  }
  valueOf() {
    let { firstChild, lastChild, parentNode } = this;
    if (parentNode === this) {
      if (this.#nodes === empty)
        this.#nodes = [...this.childNodes];
    }
    else {
      /* c8 ignore start */
      // there are cases where a fragment might be just appended
      // out of the box without valueOf() invoke (first render).
      // When these are moved around and lose their parent and,
      // such parent is not the fragment itself, it's possible there
      // where changes or mutations in there to take care about.
      // This is a render-only specific issue but it's tested and
      // it's worth fixing to me to have more consistent fragments.
      if (parentNode) {
        this.#nodes = [firstChild];
        while (firstChild !== lastChild)
          this.#nodes.push((firstChild = firstChild.nextSibling));
      }
      /* c8 ignore stop */
      this.replaceChildren(...this.#nodes);
    }
    return this;
  }
}

const setAttribute = (element, name, value) =>
  element.setAttribute(name, value);

/**
 * @param {Element} element
 * @param {string} name
 * @returns {void}
 */
const removeAttribute = (element, name) =>
  element.removeAttribute(name);

/**
 * @template T
 * @param {Element} element
 * @param {T} value
 * @returns {T}
 */
const aria = (element, value) => {
  for (const key in value) {
    const $ = value[key];
    const name = key === 'role' ? key : `aria-${key}`;
    if ($ == null) removeAttribute(element, name);
    else setAttribute(element, name, $);
  }
  return value;
};

let listeners;

/**
 * @template T
 * @param {Element} element
 * @param {T} value
 * @param {string} name
 * @returns {T}
 */
const at = (element, value, name) => {
  name = name.slice(1);
  if (!listeners) listeners = new WeakMap;
  const known = listeners.get(element) || set(listeners, element, {});
  let current = known[name];
  if (current && current[0]) element.removeEventListener(name, ...current);
  current = isArray(value) ? value : [value, false];
  known[name] = current;
  if (current[0]) element.addEventListener(name, ...current);
  return value;
};

/**
 * @template T
 * @param {import("./literals.js").Detail} detail
 * @param {T} value
 * @returns {T}
 */
const hole = (detail, value) => {
  const { t: node, n: hole } = detail;
  let nullish = false;
  switch (typeof value) {
    case 'object':
      if (value !== null) {
        (hole || node).replaceWith((detail.n = value.valueOf()));
        break;
      }
    case 'undefined':
      nullish = true;
    default:
      node.data = nullish ? '' : value;
      if (hole) {
        detail.n = null;
        hole.replaceWith(node);
      }
      break;
  }
  return value;
};

/**
 * @template T
 * @param {Element} element
 * @param {T} value
 * @returns {T}
 */
const className = (element, value) => maybeDirect(
  element, value, value == null ? 'class' : 'className'
);

/**
 * @template T
 * @param {Element} element
 * @param {T} value
 * @returns {T}
 */
const data = (element, value) => {
  const { dataset } = element;
  for (const key in value) {
    if (value[key] == null) delete dataset[key];
    else dataset[key] = value[key];
  }
  return value;
};

/**
 * @template T
 * @param {Element | CSSStyleDeclaration} ref
 * @param {T} value
 * @param {string} name
 * @returns {T}
 */
const direct = (ref, value, name) => (ref[name] = value);

/**
 * @template T
 * @param {Element} element
 * @param {T} value
 * @param {string} name
 * @returns {T}
 */
const dot = (element, value, name) => direct(element, value, name.slice(1));

/**
 * @template T
 * @param {Element} element
 * @param {T} value
 * @param {string} name
 * @returns {T}
 */
const maybeDirect = (element, value, name) => (
  value == null ?
    (removeAttribute(element, name), value) :
    direct(element, value, name)
);

/**
 * @template T
 * @param {Element} element
 * @param {T} value
 * @returns {T}
 */
const ref = (element, value) => (
  (typeof value === 'function' ?
    value(element) : (value.current = element)),
  value
);

/**
 * @template T
 * @param {Element} element
 * @param {T} value
 * @param {string} name
 * @returns {T}
 */
const regular = (element, value, name) => (
  (value == null ?
    removeAttribute(element, name) :
    setAttribute(element, name, value)),
  value
);

/**
 * @template T
 * @param {Element} element
 * @param {T} value
 * @returns {T}
 */
const style = (element, value) => (
  value == null ?
    maybeDirect(element, value, 'style') :
    direct(element.style, value, 'cssText')
);

/**
 * @template T
 * @param {Element} element
 * @param {T} value
 * @param {string} name
 * @returns {T}
 */
const toggle = (element, value, name) => (
  element.toggleAttribute(name.slice(1), value),
  value
);

/**
 * @param {Node} node
 * @param {Node[]} value
 * @param {string} _
 * @param {Node[]} prev
 * @returns {Node[]}
 */
const array = (node, value, prev) => {
  // normal diff
  const { length } = value;
  node.data = `[${length}]`;
  if (length)
    return udomdiff(node.parentNode, prev, value, diffFragment, node);
  /* c8 ignore start */
  switch (prev.length) {
    case 1:
      prev[0].remove();
    case 0:
      break;
    default:
      drop(
        diffFragment(prev[0], 0),
        diffFragment(prev.at(-1), -0),
        false
      );
      break;
  }
  /* c8 ignore stop */
  return empty;
};

const attr = new Map([
  ['aria', aria],
  ['class', className],
  ['data', data],
  ['ref', ref],
  ['style', style],
]);

/**
 * @param {HTMLElement | SVGElement} element
 * @param {string} name
 * @param {boolean} svg
 * @returns
 */
const attribute = (element, name, svg) => {
  switch (name[0]) {
    case '.': return dot;
    case '?': return toggle;
    case '@': return at;
    default: return (
      svg || ('ownerSVGElement' in element) ?
        (name === 'ref' ? ref : regular) :
        (attr.get(name) || (
          name in element ?
            (name.startsWith('on') ?
              direct :
              (gPD(element, name)?.set ? maybeDirect : regular)
            ) :
            regular
          )
        )
    );
  }
};

/**
 * @template T
 * @param {Element} element
 * @param {T} value
 * @returns {T}
 */
const text = (element, value) => (
  (element.textContent = value == null ? '' : value),
  value
);

/** @typedef {import("./persistent-fragment.js").PersistentFragment} PersistentFragment */
/** @typedef {import("./rabbit.js").Hole} Hole */

/** @typedef {unknown} Value */
/** @typedef {Node | Element | PersistentFragment} Target */
/** @typedef {null | undefined | string | number | boolean | Node | Element | PersistentFragment} DOMValue */
/** @typedef {Hole | Node} ArrayValue */

const abc = (a, b, c) => ({ a, b, c });

const bc = (b, c) => ({ b, c });

/**
 * @typedef {Object} Detail
 * @property {any} v the current value of the interpolation / hole
 * @property {function} u the callback to update the value
 * @property {Node} t the target comment node or element
 * @property {string | null | Node} n the attribute name, if any, or `null`
 * @property {Cache | ArrayValue[] | null} c the cache value for this detail
 */

/**
 * @returns {Detail}
 */
const detail = (u, t, n, c) => ({ v: empty, u, t, n, c });

/**
 * @typedef {Object} Entry
 * @property {number[]} a the path to retrieve the node
 * @property {function} b the update function
 * @property {string | null} c the attribute name, if any, or `null`
 */

/**
 * @typedef {Object} Cache
 * @property {null | TemplateStringsArray} a the cached template
 * @property {null | Node | PersistentFragment} b the node returned when parsing the template
 * @property {Detail[]} c the list of updates to perform
 */

/**
 * @returns {Cache}
 */
const cache$1 = () => abc(null, null, empty);

/**
 * @param {DocumentFragment} content
 * @param {number[]} path
 * @returns {Element}
 */
const find = (content, path) => path.reduceRight(childNodesIndex, content);
const childNodesIndex = (node, i) => node.childNodes[i];

/** @param {(template: TemplateStringsArray, values: any[]) => import("./parser.js").Resolved} parse */
var create = parse => (
  /**
   * @param {TemplateStringsArray} template
   * @param {any[]} values
   * @returns {import("./literals.js").Cache}
   */
  (template, values) => {
    const { a: fragment, b: entries, c: direct } = parse(template, values);
    const root = document.importNode(fragment, true);
    /** @type {import("./literals.js").Detail[]} */
    let details = empty;
    if (entries !== empty) {
      details = [];
      for (let current, prev, i = 0; i < entries.length; i++) {
        const { a: path, b: update, c: name } = entries[i];
        const node = path === prev ? current : (current = find(root, (prev = path)));
        details[i] = detail(
          update,
          node,
          name,
          update === array ? [] : (update === hole ? cache$1() : null)
        );
      }
    }
    return bc(
      direct ? root.firstChild : new PersistentFragment(root),
      details,
    );
  }
);

const TEXT_ELEMENTS = /^(?:plaintext|script|style|textarea|title|xmp)$/i;
const VOID_ELEMENTS = /^(?:area|base|br|col|embed|hr|img|input|keygen|link|menuitem|meta|param|source|track|wbr)$/i;

/*! (c) Andrea Giammarchi - ISC */

const elements = /<([a-zA-Z0-9]+[a-zA-Z0-9:._-]*)([^>]*?)(\/?)>/g;
const attributes = /([^\s\\>"'=]+)\s*=\s*(['"]?)\x01/g;
const holes = /[\x01\x02]/g;

// \x01 Node.ELEMENT_NODE
// \x02 Node.ATTRIBUTE_NODE

/**
 * Given a template, find holes as both nodes and attributes and
 * return a string with holes as either comment nodes or named attributes.
 * @param {string[]} template a template literal tag array
 * @param {string} prefix prefix to use per each comment/attribute
 * @param {boolean} xml enforces self-closing tags
 * @returns {string} X/HTML with prefixed comments or attributes
 */
var parser$1 = (template, prefix, xml) => {
  let i = 0;
  return template
    .join('\x01')
    .trim()
    .replace(
      elements,
      (_, name, attrs, selfClosing) => `<${
          name
        }${
          attrs.replace(attributes, '\x02=$2$1').trimEnd()
        }${
          selfClosing ? (
            (xml || VOID_ELEMENTS.test(name)) ? ' /' : `></${name}`
          ) : ''
        }>`
    )
    .replace(
      holes,
      hole => hole === '\x01' ? `<!--${prefix + i++}-->` : (prefix + i++)
    )
  ;
};

let template = document.createElement('template'), svg, range;

/**
 * @param {string} text
 * @param {boolean} xml
 * @returns {DocumentFragment}
 */
var createContent = (text, xml) => {
  if (xml) {
    if (!svg) {
      svg = document.createElementNS(SVG_NAMESPACE, 'svg');
      range = newRange();
      range.selectNodeContents(svg);
    }
    return range.createContextualFragment(text);
  }
  template.innerHTML = text;
  const { content } = template;
  template = template.cloneNode(false);
  return content;
};

/** @typedef {import("./literals.js").Entry} Entry */

/**
 * @typedef {Object} Resolved
 * @param {DocumentFragment} f content retrieved from the template
 * @param {Entry[]} e entries per each hole in the template
 * @param {boolean} d direct node to handle
 */

/**
 * @param {Element} node
 * @returns {number[]}
 */
const createPath = node => {
  const path = [];
  let parentNode;
  while ((parentNode = node.parentNode)) {
    path.push(path.indexOf.call(parentNode.childNodes, node));
    node = parentNode;
  }
  return path;
};

const textNode = () => document.createTextNode('');

/**
 * @param {TemplateStringsArray} template
 * @param {boolean} xml
 * @returns {Resolved}
 */
const resolve = (template, values, xml) => {
  const content = createContent(parser$1(template, prefix, xml), xml);
  const { length } = template;
  let entries = empty;
  if (length > 1) {
    const replace = [];
    const tw = document.createTreeWalker(content, 1 | 128);
    let i = 0, search = `${prefix}${i++}`;
    entries = [];
    while (i < length) {
      const node = tw.nextNode();
      // these are holes or arrays
      if (node.nodeType === COMMENT_NODE) {
        if (node.data === search) {
          // ⚠️ once array, always array!
          const update = isArray(values[i - 1]) ? array : hole;
          if (update === hole) replace.push(node);
          entries.push(abc(createPath(node), update, null));
          search = `${prefix}${i++}`;
        }
      }
      else {
        let path;
        // these are attributes
        while (node.hasAttribute(search)) {
          if (!path) path = createPath(node);
          const name = node.getAttribute(search);
          entries.push(abc(path, attribute(node, name, xml), name));
          removeAttribute(node, search);
          search = `${prefix}${i++}`;
        }
        // these are special text-only nodes
        if (
          !xml &&
          TEXT_ELEMENTS.test(node.localName) &&
          node.textContent.trim() === `<!--${search}-->`
        ) {
          entries.push(abc(path || createPath(node), text, null));
          search = `${prefix}${i++}`;
        }
      }
    }
    // can't replace holes on the fly or the tree walker fails
    for (i = 0; i < replace.length; i++)
      replace[i].replaceWith(textNode());
  }

  // need to decide if there should be a persistent fragment
  const { childNodes } = content;
  let { length: len } = childNodes;

  // html`` or svg`` to signal an empty content
  // these nodes can be passed directly as never mutated
  if (len < 1) {
    len = 1;
    content.appendChild(textNode());
  }
  // html`${'b'}` or svg`${[]}` cases
  else if (
    len === 1 &&
    // ignore html`static` or svg`static` because
    // these nodes can be passed directly as never mutated
    length !== 1 &&
    childNodes[0].nodeType !== ELEMENT_NODE
  ) {
    // use a persistent fragment for these cases too
    len = 0;
  }

  return set(cache, template, abc(content, entries, len === 1));
};

/** @type {WeakMap<TemplateStringsArray, Resolved>} */
const cache = new WeakMap;
const prefix = 'isµ';

/**
 * @param {boolean} xml
 * @returns {(template: TemplateStringsArray, values: any[]) => Resolved}
 */
var parser = xml => (template, values) => cache.get(template) || resolve(template, values, xml);

const parseHTML = create(parser(false));
const parseSVG = create(parser(true));

/**
 * @param {import("./literals.js").Cache} info
 * @param {Hole} hole
 * @returns {Node}
 */
const unroll = (info, { s, t, v }) => {
  if (info.a !== t) {
    const { b, c } = (s ? parseSVG : parseHTML)(t, v);
    info.a = t;
    info.b = b;
    info.c = c;
  }
  for (let { c } = info, i = 0; i < c.length; i++) {
    const value = v[i];
    const detail = c[i];
    switch (detail.u) {
      case array:
        detail.v = array(
          detail.t,
          unrollValues(detail.c, value),
          detail.v
        );
        break;
      case hole:
        const current = value instanceof Hole ?
          unroll(detail.c || (detail.c = cache$1()), value) :
          (detail.c = null, value)
        ;
        if (current !== detail.v)
          detail.v = hole(detail, current);
        break;
      default:
        if (value !== detail.v)
          detail.v = detail.u(detail.t, value, detail.n, detail.v);
        break;
    }
  }
  return info.b;
};

/**
 * @param {Cache} cache
 * @param {any[]} values
 * @returns {number}
 */
const unrollValues = (stack, values) => {
  let i = 0, { length } = values;
  if (length < stack.length) stack.splice(length);
  for (; i < length; i++) {
    const value = values[i];
    if (value instanceof Hole)
      values[i] = unroll(stack[i] || (stack[i] = cache$1()), value);
    else stack[i] = null;
  }
  return values;
};

/**
 * Holds all details needed to render the content on a render.
 * @constructor
 * @param {boolean} svg The content type.
 * @param {TemplateStringsArray} template The template literals used to the define the content.
 * @param {any[]} values Zero, one, or more interpolated values to render.
 */
class Hole {
  constructor(svg, template, values) {
    this.s = svg;
    this.t = template;
    this.v = values;
  }
  toDOM(info = cache$1()) {
    return unroll(info, this);
  }
}

/** @typedef {import("../rabbit.js").Hole} Hole */

/** @type {WeakMap<Element | DocumentFragment, import("../literals.js").Cache>} */
const known = new WeakMap;

/**
 * Render with smart updates within a generic container.
 * @template T
 * @param {T} where the DOM node where to render content
 * @param {(() => Hole) | Hole} what the hole to render
 * @returns
 */
var render = (where, what) => {
  const info = known.get(where) || set(known, where, cache$1());
  const { b } = info;
  if (b !== (typeof what === 'function' ? what() : what).toDOM(info))
    where.replaceChildren(info.b.valueOf());
  return where;
};

/*! (c) Andrea Giammarchi - MIT */

/** @typedef {import("./literals.js").Value} Value */

const tag = svg => (template, ...values) => new Hole(svg, template, values);

/** @type {(template: TemplateStringsArray, ...values:Value[]) => Hole} A tag to render HTML content. */
const html = tag(false);

//render (document.body, html`tit`)

function listElement({id, text}, clicked) {
    return html`
        <button data-id=${id} onclick=${clicked}>${text}</button>
    `
}
function dialogHTML(data, clicked) {
    const style = data.length === 0 ? 'display:block' : 'display:none';
    const c = e => {
        return clicked(e.target.dataset.id)
    };
    return html`
        <h3 class="center">Sauvegardes</h3>
        <div class="container-ls">
            <pre style=${style}>Pas encore de sauvegarde</pre>
            ${data.map(v => listElement (v, c))}
        </div>
        <p>
            <form class="center padding" method="dialog">
                <button class="button">Fermer</button>
            </form>
        </p>
    `
}

let currentItem = getNewId();
function loadStorageEntry(time) {
    const item =  localStorage.getItem(time);
    if (!item) throw ('ERROR malformed local storage')
    const {code, time: rightTime} = JSON.parse(item);
    currentItem = rightTime;
    return code
}
function createNewStorageEntry(code) {
    if (!isEmpty(code)) {
        updatStorageEntry(code);
    }
    currentItem = getNewId();
}
function getNewId() {
    const unixTime  = (new Date).getTime();
    return unixTime
}
function isEmpty(string) {
    return string.replace(/\s/g, '') === ''
}
function updatStorageEntry(code, sample) {
    if (isEmpty(code) || code === sample) return false
    localStorage.setItem(currentItem, JSON.stringify({code, time:currentItem}));
    return true
}
function getAllEntries() {
    let res = [];
    for (const [key, value] of Object.entries(localStorage)) {
        const {code, time} = JSON.parse(value);
        const  text = formatDate(time);
        res.push( {id: time, text});
    }
    return res
}

function formatDate(time){    
    const date = new Date(time);
    var options = {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    };
    return new Intl.DateTimeFormat('fr-FR', options).format(date)
}

//
input.value = sample();
// unfinished function implementation
//input.value = 'fi,100*sin(5*i+10),0,1'
const layers = canvasLayers(cLayers, 2);
let onGoingdrawing = false;
t2.innerHTML = helpFunctions;

run();

function run() {
    let painter;
    updateDrawing(painter);
    input.addEventListener('keyup', () => {
        updatStorageEntry(input.value, sample());
        updateDrawing(painter);
    });
    btn_info.addEventListener('click', () => {
        dialog.showModal();
    });
    btn_list.addEventListener('click', () => {
        updateListView(painter);
        dialog_list.showModal();
    });
    btn_new.addEventListener('click', () => {
        createNewStorageEntry(input.value);
        input.value = '';
        layers.clearAll();
    });
}
function updateListView(painter) {
    render (
        document.getElementById(
            'dialog_list'),
            dialogHTML(getAllEntries(), v => {
                input.value = loadStorageEntry(v);
                updateDrawing(painter);
            }
    ));
}
function updateDrawing(painter) {
    if (onGoingdrawing) return
    onGoingdrawing = true;
    textError.innerText = '';
    layers.clearAll();
    try {
        const {commands, error} = textToCommands(input.value);
        painter = drawer({layers, commands});
        if (error) throw error
    } catch (e) {
        console.log(e);
        textError.innerText = e;
    } finally {
        onGoingdrawing = false;
    }
}
function sample() {
return `#L=1000
r20
-r36
--a20
--t10
-t18
d0
r100
-a228.6
-d1
-aL
-a-L
-d0
-a-228.6
-t3.6

t-90
a400
t90

a-35
d1
r36
-a69.9
-t10`
}

export { run };
