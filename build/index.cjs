"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: !0 });
}, __copyProps = (to, from, except, desc) => {
  if (from && typeof from == "object" || typeof from == "function")
    for (let key of __getOwnPropNames(from))
      !__hasOwnProp.call(to, key) && key !== except && __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: !0 }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  parse: () => parse,
  print: () => print,
  toValue: () => toValue
});
module.exports = __toCommonJS(index_exports);

// src/parse.ts
function parse(source) {
  if (typeof source != "string") throw TypeError("Source must be a string");
  let pos = 0, lineNumber = 1, columnNumber = 0, ch, done = !1, comments = [], docStart = { offset: 0, line: 1, column: 1 };
  next();
  let value = parseValue();
  if (skipWhitespace(), !done)
    throw new SyntaxError(errorSnippet());
  expectValue(value);
  let docEnd = here(), doc = {
    type: "Document",
    value,
    leadingComments: [],
    danglingComments: [],
    span: { start: docStart, end: docEnd }
  };
  return attachComments(doc, comments, source), attachBlankLines(doc.value, source), doc;
  function next() {
    pos < source.length ? (ch = source[pos], pos++, ch === `
` ? (lineNumber++, columnNumber = 0) : columnNumber++) : (ch = "", done = !0);
  }
  function here() {
    return done ? {
      offset: source.length,
      line: lineNumber,
      column: columnNumber + 1
    } : { offset: pos - 1, line: lineNumber, column: columnNumber };
  }
  function lookahead(n) {
    return source.substring(pos, pos + n);
  }
  function parseValue() {
    var _a, _b, _c, _d, _e, _f, _g;
    return skipWhitespace(), (_g = (_f = (_e = (_d = (_c = (_b = (_a = parseRawString()) != null ? _a : parseString()) != null ? _b : parseNumber()) != null ? _c : parseObject()) != null ? _d : parseArray()) != null ? _e : parseKeyword("true")) != null ? _f : parseKeyword("false")) != null ? _g : parseKeyword("null");
  }
  function parseString() {
    if (ch !== '"') return;
    let start = here(), str = "", escaped = !1;
    for (; ; )
      if (next(), escaped) {
        if (ch === "u") {
          if (next(), ch !== "{")
            throw new SyntaxError(
              errorSnippet(
                errorMap.u + " " + JSON.stringify(ch) + ' (expected "{")'
              )
            );
          let hex = "";
          for (; next(), ch !== "}"; ) {
            if (!isHexDigit(ch))
              throw new SyntaxError(
                errorSnippet(errorMap.u + " " + JSON.stringify(ch))
              );
            if (hex += ch, hex.length > 6)
              throw new SyntaxError(
                errorSnippet(errorMap.u + " (too many hex digits)")
              );
          }
          if (hex.length === 0)
            throw new SyntaxError(errorSnippet(errorMap.u));
          let codePoint = parseInt(hex, 16);
          if (codePoint > 1114111)
            throw new SyntaxError(errorSnippet(errorMap.u + " (out of range)"));
          str += String.fromCodePoint(codePoint);
        } else {
          let escapedChar = escapeMap[ch];
          if (!escapedChar)
            throw new SyntaxError(
              errorSnippet(errorMap.u + " " + JSON.stringify(ch))
            );
          str += escapedChar;
        }
        escaped = !1;
      } else if (ch === "\\")
        escaped = !0;
      else {
        if (ch === '"')
          break;
        if (ch === `
`)
          throw new SyntaxError(errorSnippet());
        if (ch < " " && ch !== "	" || ch === "\x7F")
          throw new SyntaxError(errorSnippet());
        str += ch;
      }
    next();
    let end = here(), raw = source.substring(start.offset, end.offset);
    return { type: "String", value: str, raw, span: { start, end } };
  }
  function parseRawString() {
    if (ch !== '"' || lookahead(2) !== '""') return;
    let start = here();
    next(), next(), next();
    let hasLeadingNewline = !1;
    ch === "\r" && lookahead(1) === `
` && next(), ch === `
` && (hasLeadingNewline = !0, next());
    let str = "";
    for (; !done; ) {
      if (ch === '"' && lookahead(2) === '""') {
        if (next(), next(), next(), str === "" && !hasLeadingNewline)
          throw new SyntaxError(errorSnippet("Raw strings cannot be empty"));
        let end = here(), raw = source.substring(start.offset, end.offset);
        return { type: "RawString", value: str, raw, span: { start, end } };
      }
      str += ch, next();
    }
    throw new SyntaxError(errorSnippet());
  }
  function parseNumber() {
    if (!isDigit(ch) && ch !== "-") return;
    let start = here(), numStr = "", float = !1;
    if (ch === "-" && (numStr += ch, next(), !isDigit(ch)))
      throw new SyntaxError(errorSnippet());
    if (ch === "0")
      numStr += ch, next();
    else
      for (; isDigit(ch); )
        numStr += ch, next();
    if (ch === ".") {
      if (float = !0, numStr += ch, next(), !isDigit(ch))
        throw new SyntaxError(errorSnippet());
      for (; isDigit(ch); )
        numStr += ch, next();
    }
    if (ch === "e" || ch === "E") {
      if (float = !0, numStr += ch, next(), (ch === "+" || ch === "-") && (numStr += ch, next()), !isDigit(ch))
        throw new SyntaxError(errorSnippet());
      for (; isDigit(ch); )
        numStr += ch, next();
    }
    let end = here(), span = { start, end };
    return float ? { type: "Float", value: parseFloat(numStr), raw: numStr, span } : {
      type: "Integer",
      value: toSafeNumber(numStr),
      raw: numStr,
      span
    };
  }
  function parseObject() {
    if (ch !== "{") return;
    let start = here();
    next(), skipWhitespace();
    let properties = [], seen = /* @__PURE__ */ new Set();
    if (ch === "}") {
      next();
      let end = here();
      return {
        type: "Object",
        properties,
        span: { start, end },
        danglingComments: []
      };
    }
    for (; ; ) {
      let keyStart = here(), key;
      if (ch === '"' ? key = parseString() : key = parseKey(), seen.has(key.value))
        throw pos = keyStart.offset + 1, new SyntaxError(
          errorSnippet(`Duplicate key ${JSON.stringify(key.value)}`)
        );
      if (seen.add(key.value), skipWhitespace(), ch !== ":")
        throw new SyntaxError(errorSnippet());
      next();
      let value2 = parseValue();
      expectValue(value2);
      let propSpan = { start: keyStart, end: value2.span.end };
      properties.push({
        key,
        value: value2,
        span: propSpan,
        leadingComments: [],
        trailingComment: null,
        emptyLineBefore: !1
      });
      let newlineAfterValue = skipWhitespace();
      if (ch === "}") {
        next();
        let end = here();
        return {
          type: "Object",
          properties,
          span: { start, end },
          danglingComments: []
        };
      } else if (ch === ",") {
        if (next(), skipWhitespace(), ch === "}") {
          next();
          let end = here();
          return {
            type: "Object",
            properties,
            span: { start, end },
            danglingComments: []
          };
        }
      } else {
        if (newlineAfterValue)
          continue;
        throw new SyntaxError(
          errorSnippet("Expected comma or newline between key-value pairs")
        );
      }
    }
  }
  function parseKey() {
    let start = here(), identifier = "";
    for (; isKeyChar(ch); )
      identifier += ch, next();
    if (identifier === "")
      throw new SyntaxError(errorSnippet());
    let end = here();
    return { type: "Identifier", value: identifier, span: { start, end } };
  }
  function parseArray() {
    if (ch !== "[") return;
    let start = here();
    next(), skipWhitespace();
    let elements = [];
    if (ch === "]") {
      next();
      let end = here();
      return {
        type: "Array",
        elements,
        span: { start, end },
        danglingComments: []
      };
    }
    for (; ; ) {
      let value2 = parseValue();
      expectValue(value2), elements.push({
        value: value2,
        leadingComments: [],
        trailingComment: null,
        emptyLineBefore: !1
      });
      let newLineAfterValue = skipWhitespace();
      if (ch === "]") {
        next();
        let end = here();
        return {
          type: "Array",
          elements,
          span: { start, end },
          danglingComments: []
        };
      } else if (ch === ",") {
        if (next(), skipWhitespace(), ch === "]") {
          next();
          let end = here();
          return {
            type: "Array",
            elements,
            span: { start, end },
            danglingComments: []
          };
        }
      } else {
        if (newLineAfterValue)
          continue;
        throw new SyntaxError(
          errorSnippet("Expected comma or newline between values")
        );
      }
    }
  }
  function parseKeyword(name) {
    if (ch !== name[0]) return;
    let start = here();
    for (let i = 1; i < name.length; i++)
      if (next(), ch !== name[i])
        throw new SyntaxError(errorSnippet());
    if (next(), isWhitespace(ch) || ch === "," || ch === "}" || ch === "]" || done) {
      let end = here(), span = { start, end };
      return name === "null" ? { type: "Null", value: null, span } : { type: "Boolean", value: name === "true", span };
    }
    throw new SyntaxError(errorSnippet());
  }
  function skipWhitespace() {
    let hasNewline = !1;
    for (; isWhitespace(ch); )
      hasNewline || (hasNewline = ch === `
`), next();
    let hasNewlineAfterComment = skipComment();
    return hasNewline || hasNewlineAfterComment;
  }
  function skipComment() {
    if (ch === "#") {
      let start = here(), text = "";
      for (next(); !done && ch !== `
`; )
        text += ch, next();
      let end = here();
      return comments.push({ type: "Comment", value: text, span: { start, end } }), skipWhitespace();
    }
    return !1;
  }
  function isWhitespace(ch2) {
    return ch2 === " " || ch2 === `
` || ch2 === "	" || ch2 === "\r";
  }
  function isHexDigit(ch2) {
    return ch2 >= "0" && ch2 <= "9" || ch2 >= "A" && ch2 <= "F";
  }
  function isDigit(ch2) {
    return ch2 >= "0" && ch2 <= "9";
  }
  function isKeyChar(ch2) {
    return ch2 >= "A" && ch2 <= "Z" || ch2 >= "a" && ch2 <= "z" || ch2 >= "0" && ch2 <= "9" || ch2 === "_" || ch2 === "-";
  }
  function toSafeNumber(str) {
    if (str == "-0") return -0;
    let num = Number(str);
    if (num >= Number.MIN_SAFE_INTEGER && num <= Number.MAX_SAFE_INTEGER)
      return num;
    let big = BigInt(str), I64_MIN = -(2n ** 63n), I64_MAX = 2n ** 63n - 1n;
    if (big < I64_MIN || big > I64_MAX)
      throw new SyntaxError(
        `Integer ${str} is outside the 64-bit signed integer range on line ${lineNumber}.`
      );
    return big;
  }
  function expectValue(value2) {
    if (value2 === void 0)
      throw new SyntaxError(errorSnippet());
  }
  function errorSnippet(message = `Unexpected character ${JSON.stringify(ch)}`) {
    ch || (message = "Unexpected end of input");
    let lines = source.substring(pos - 40, pos).split(`
`), lastLine = lines.at(-1) || "", postfix = source.substring(pos, pos + 40).split(`
`, 1).at(0) || "";
    lastLine === "" && (lastLine = lines.at(-2) || "", lastLine += " ", lineNumber--, postfix = "");
    let snippet = `    ${lastLine}${postfix}
`, pointer = `    ${".".repeat(Math.max(0, lastLine.length - 1))}^
`;
    return `${message} on line ${lineNumber}.

${snippet}${pointer}`;
  }
}
function hasNewlineBetween(source, from, to) {
  for (let i = from; i < to; i++)
    if (source[i] === `
`) return !0;
  return !1;
}
function hasBlankLine(source, from, to) {
  let afterNewline = !1;
  for (let i = from; i < to; i++)
    if (source[i] === `
`) {
      if (afterNewline) return !0;
      afterNewline = !0;
    } else source[i] !== " " && source[i] !== "	" && source[i] !== "\r" && (afterNewline = !1);
  return !1;
}
function attachBlankLines(node, source) {
  if (node.type === "Object") {
    let props = node.properties;
    for (let i = 0; i < props.length; i++) {
      let regionStart = i === 0 ? node.span.start.offset + 1 : props[i - 1].trailingComment ? props[i - 1].trailingComment.span.end.offset : props[i - 1].span.end.offset, regionEnd = props[i].leadingComments.length > 0 ? props[i].leadingComments[0].span.start.offset : props[i].key.span.start.offset;
      props[i].emptyLineBefore = hasBlankLine(source, regionStart, regionEnd), attachBlankLines(props[i].value, source);
    }
  } else if (node.type === "Array") {
    let elements = node.elements;
    for (let i = 0; i < elements.length; i++) {
      let regionStart = i === 0 ? node.span.start.offset + 1 : elements[i - 1].trailingComment ? elements[i - 1].trailingComment.span.end.offset : elements[i - 1].value.span.end.offset, regionEnd = elements[i].leadingComments.length > 0 ? elements[i].leadingComments[0].span.start.offset : elements[i].value.span.start.offset;
      elements[i].emptyLineBefore = hasBlankLine(source, regionStart, regionEnd), attachBlankLines(elements[i].value, source);
    }
  }
}
function attachComments(doc, comments, source) {
  let { value } = doc;
  if (comments.length === 0) return;
  let valueStart = value.span.start.offset, valueEnd = value.span.end.offset, inside = [];
  for (let c of comments)
    c.span.start.offset < valueStart ? doc.leadingComments.push(c) : c.span.start.offset >= valueEnd ? doc.danglingComments.push(c) : inside.push(c);
  inside.length > 0 && distributeComments(value, inside, source);
}
function distributeComments(node, comments, source) {
  node.type === "Object" ? distributeToObject(node, comments, source) : node.type === "Array" && distributeToArray(node, comments, source);
}
function distributeToObject(node, comments, source) {
  let props = node.properties;
  if (props.length === 0) {
    node.danglingComments = comments;
    return;
  }
  for (let c of comments) {
    let nested = !1;
    for (let prop of props)
      if (c.span.start.offset >= prop.value.span.start.offset && c.span.start.offset < prop.value.span.end.offset) {
        distributeComments(prop.value, [c], source), nested = !0;
        break;
      }
    if (nested) continue;
    let attached = !1;
    for (let prop of props)
      if (c.span.start.offset > prop.value.span.end.offset && !hasNewlineBetween(
        source,
        prop.value.span.start.offset,
        c.span.start.offset
      )) {
        prop.trailingComment = c, attached = !0;
        break;
      }
    if (!attached) {
      for (let prop of props)
        if (c.span.start.offset < prop.key.span.start.offset) {
          prop.leadingComments.push(c), attached = !0;
          break;
        }
      attached || node.danglingComments.push(c);
    }
  }
}
function distributeToArray(node, comments, source) {
  let elements = node.elements;
  if (elements.length === 0) {
    node.danglingComments = comments;
    return;
  }
  for (let c of comments) {
    let nested = !1;
    for (let el of elements)
      if (c.span.start.offset >= el.value.span.start.offset && c.span.start.offset < el.value.span.end.offset) {
        distributeComments(el.value, [c], source), nested = !0;
        break;
      }
    if (nested) continue;
    let attached = !1;
    for (let el of elements)
      if (c.span.start.offset > el.value.span.end.offset && !hasNewlineBetween(
        source,
        el.value.span.start.offset,
        c.span.start.offset
      )) {
        el.trailingComment = c, attached = !0;
        break;
      }
    if (!attached) {
      for (let el of elements)
        if (c.span.start.offset < el.value.span.start.offset) {
          el.leadingComments.push(c), attached = !0;
          break;
        }
      attached || node.danglingComments.push(c);
    }
  }
}
var escapeMap = {
  '"': '"',
  "\\": "\\",
  n: `
`,
  r: "\r",
  t: "	"
}, errorMap = {
  u: "Invalid escape sequence"
};

// src/print.ts
function print(node, options) {
  let colors = options == null ? void 0 : options.colors;
  if (node.type === "Document") {
    let out = "";
    for (let c of node.leadingComments)
      out += colorize(colors == null ? void 0 : colors.comment, "#" + c.value) + `
`;
    out += doPrint(node.value, 0, colors);
    for (let c of node.danglingComments)
      out += `
` + colorize(colors == null ? void 0 : colors.comment, "#" + c.value);
    return out;
  }
  return doPrint(node, 0, colors);
}
function colorize(fn, s) {
  return fn ? fn(s) : s;
}
function printComments(comments, indent, colors) {
  let out = "";
  for (let c of comments)
    out += indent + colorize(colors == null ? void 0 : colors.comment, "#" + c.value) + `
`;
  return out;
}
function doPrint(node, level, colors) {
  switch (node.type) {
    case "String":
      return colorize(colors == null ? void 0 : colors.string, quoteString(node.value));
    case "RawString":
      return colorize(colors == null ? void 0 : colors.string, node.raw);
    case "Integer":
    case "Float":
      return colorize(colors == null ? void 0 : colors.number, node.raw);
    case "Boolean":
      return colorize(colors == null ? void 0 : colors.boolean, `${node.value}`);
    case "Null":
      return colorize(colors == null ? void 0 : colors.null, "null");
    case "Array": {
      let len = node.elements.length, hasComments = node.danglingComments.length > 0;
      if (len === 0 && !hasComments)
        return colorize(colors == null ? void 0 : colors.bracket, "[") + colorize(colors == null ? void 0 : colors.bracket, "]");
      let childIndent = getIndent(level + 1), parentIndent = getIndent(level), out = colorize(colors == null ? void 0 : colors.bracket, "[") + `
`;
      for (let i = 0; i < len; i++) {
        let el = node.elements[i];
        i > 0 && (out += `
`, el.emptyLineBefore && (out += `
`)), out += printComments(el.leadingComments, childIndent, colors), out += childIndent + doPrint(el.value, level + 1, colors), el.trailingComment && (out += " " + colorize(colors == null ? void 0 : colors.comment, "#" + el.trailingComment.value));
      }
      return node.danglingComments.length > 0 && (out += `
`, out += printComments(node.danglingComments, childIndent, colors), out = out.replace(/\n$/, "")), out + `
` + parentIndent + colorize(colors == null ? void 0 : colors.bracket, "]");
    }
    case "Object": {
      let len = node.properties.length, hasComments = node.danglingComments.length > 0;
      if (len === 0 && !hasComments)
        return colorize(colors == null ? void 0 : colors.bracket, "{") + colorize(colors == null ? void 0 : colors.bracket, "}");
      let childIndent = getIndent(level + 1), parentIndent = getIndent(level), out = colorize(colors == null ? void 0 : colors.bracket, "{") + `
`;
      for (let i = 0; i < len; i++) {
        let prop = node.properties[i];
        i > 0 && (out += `
`, prop.emptyLineBefore && (out += `
`)), out += printComments(prop.leadingComments, childIndent, colors);
        let keyStr = prop.key.type === "Identifier" ? prop.key.value : quoteString(prop.key.value);
        out += childIndent + colorize(colors == null ? void 0 : colors.key, keyStr) + colorize(colors == null ? void 0 : colors.colon, ":") + " " + doPrint(prop.value, level + 1, colors), prop.trailingComment && (out += " " + colorize(colors == null ? void 0 : colors.comment, "#" + prop.trailingComment.value));
      }
      return node.danglingComments.length > 0 && (out += `
`, out += printComments(node.danglingComments, childIndent, colors), out = out.replace(/\n$/, "")), out + `
` + parentIndent + colorize(colors == null ? void 0 : colors.bracket, "}");
    }
  }
}
function quoteString(s) {
  let out = '"';
  for (let c of s) {
    let code = c.codePointAt(0);
    c === '"' ? out += '\\"' : c === "\\" ? out += "\\\\" : c === `
` ? out += "\\n" : c === "\r" ? out += "\\r" : c === "	" ? out += "\\t" : code < 32 || code === 127 ? out += `\\u{${code.toString(16).toUpperCase()}}` : out += c;
  }
  return out + '"';
}
function getIndent(level) {
  return " ".repeat(2 * level);
}

// src/index.ts
function toValue(node) {
  if (node.type === "Document") return toValue(node.value);
  switch (node.type) {
    case "String":
    case "RawString":
    case "Integer":
    case "Float":
    case "Boolean":
      return node.value;
    case "Null":
      return null;
    case "Array":
      return node.elements.map((el) => toValue(el.value));
    case "Object": {
      let obj = {};
      for (let prop of node.properties)
        obj[prop.key.value] = toValue(prop.value);
      return obj;
    }
  }
}
//# sourceMappingURL=index.cjs.map
