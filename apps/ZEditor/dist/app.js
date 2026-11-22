// Built by tools/build.mjs from this app's src/ folder. Do not edit; edit src/ and run `npm run build`.
(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));

  // node_modules/hyphen/hyphen.js
  var require_hyphen = __commonJS({
    "node_modules/hyphen/hyphen.js"(exports, module) {
      (function(root, factory) {
        if (typeof define === "function" && define.amd) {
          define([], factory);
        } else if (typeof module === "object" && module.exports) {
          module.exports = factory();
        } else {
          root.createHyphenator = factory();
        }
      })(exports, function() {
        function createTextReader(setup) {
          var char1 = "";
          var char2 = "";
          var i = 0;
          var verifier = setup();
          return function(text) {
            while (i < text.length) {
              char1 = text.charAt(i++);
              char2 = text.charAt(i);
              var verified = verifier(char1, char2);
              if (verified !== void 0) {
                return verified;
              }
            }
          };
        }
        var isNotLetter = RegExp.prototype.test.bind(
          /\s|(?![\'])[\!-\@\[-\`\{-\~\u2013-\u203C]/
        );
        function createHTMLVerifier() {
          var skip = false;
          return function(accumulate, chars) {
            if (skip) {
              if (chars[0] === ">") {
                accumulate();
                skip = false;
              }
            } else if (chars[0] === "<" && (!isNotLetter(chars[1]) || chars[1] === "/")) {
              skip = true;
            }
            return skip;
          };
        }
        function createHyphenCharVerifier(hyphenChar) {
          var skip = false;
          return function(accumulate, chars) {
            if (skip) {
              if (!isNotLetter(chars[0]) && isNotLetter(chars[1])) {
                accumulate();
                skip = false;
              }
            } else if (!isNotLetter(chars[0]) && chars[1] === hyphenChar) {
              skip = true;
            }
            return skip;
          };
        }
        function createHyphenationVerifier(verifiers, minWordLength) {
          return function() {
            var accum0 = "";
            var accum = "";
            function accumulate() {
              accum0 += accum;
              accum = "";
            }
            function resolveWith(value) {
              accum0 = "";
              accum = "";
              return value;
            }
            return function(char1, char2) {
              accum += char1;
              var skip = verifiers.reduce(function(skip2, verify) {
                return skip2 || verify(accumulate, [char1, char2]);
              }, false);
              if (!skip) {
                if (isNotLetter(char1) && !isNotLetter(char2)) {
                  accumulate();
                }
                if (!isNotLetter(char1) && isNotLetter(char2)) {
                  if (accum.length >= minWordLength) {
                    return resolveWith([accum0, accum]);
                  } else {
                    accumulate();
                  }
                }
              }
              if (char2 === "") {
                if (accum.length < minWordLength || skip) {
                  accumulate();
                }
                return resolveWith([accum0, accum]);
              }
            };
          };
        }
        function levelsToMarkers(levels) {
          var markers = [];
          for (var i = 0; i < levels.length; i++)
            if ((levels[i] & 1) === 1) markers.push(i);
          return markers;
        }
        function insertChar(text, hyphenChar, markers) {
          if (markers.length === 0) {
            return text;
          }
          var resultText = [text.slice(0, markers[0])];
          if (markers.length > 1)
            for (var i = 0, j = 1; j < markers.length; i++, j++) {
              resultText.push(text.slice(markers[i], markers[j]));
            }
          resultText.push(text.slice(markers[markers.length - 1]));
          return resultText.join(hyphenChar);
        }
        function markersFromExceptionsDefinition(exceptionsList) {
          return exceptionsList.reduce(function(markersDict, definition) {
            var i = 0, markers = [];
            while ((i = definition.indexOf("-", i + 1)) > -1) {
              markers.push(i);
            }
            markersDict[definition.toLocaleLowerCase().replace(/\-/g, "")] = markers;
            return markersDict;
          }, {});
        }
        function createCharIterator(str) {
          var i = 0;
          function nextChar() {
            return str[i++];
          }
          return nextChar;
        }
        function createStringSlicer(str) {
          var i = 0, slice = str;
          function next() {
            slice = str.slice(i++);
            if (slice.length < 3) {
              return;
            }
            return slice;
          }
          function isFirstCharacter() {
            return i === 2;
          }
          return [next, isFirstCharacter];
        }
        function hyphenateWord(text, loweredText, levelsTable, patternTrie) {
          var levels = new Array(text.length + 1), loweredText = ("." + loweredText + ".").split(""), wordSlice, letter, triePtr, trieNode, patternLevelsIndex, patternLevels, patternEntityIndex = -1, slicer, nextSlice, isFirstCharacter, nextLetter;
          for (var i = levels.length; i--; ) levels[i] = 0;
          slicer = createStringSlicer(loweredText);
          nextSlice = slicer[0];
          isFirstCharacter = slicer[1];
          while (wordSlice = nextSlice()) {
            patternEntityIndex++;
            if (isFirstCharacter()) {
              patternEntityIndex--;
            }
            triePtr = patternTrie;
            nextLetter = createCharIterator(wordSlice);
            while (letter = nextLetter()) {
              if ((trieNode = triePtr[letter]) === void 0) {
                break;
              }
              triePtr = {};
              patternLevelsIndex = -1;
              switch (Object.prototype.toString.call(trieNode)) {
                case "[object Array]":
                  triePtr = trieNode[0];
                  patternLevelsIndex = trieNode[1];
                  break;
                case "[object Object]":
                  triePtr = trieNode;
                  break;
                case "[object Number]":
                  patternLevelsIndex = trieNode;
                  break;
              }
              if (patternLevelsIndex < 0) {
                continue;
              }
              patternLevels = levelsTable[patternLevelsIndex];
              for (var k = 0; k < patternLevels.length; k++)
                levels[patternEntityIndex + k] = Math.max(
                  patternLevels[k],
                  levels[patternEntityIndex + k]
                );
            }
          }
          levels[0] = levels[1] = levels[levels.length - 1] = levels[levels.length - 2] = 0;
          return levelsToMarkers(levels);
        }
        function start(text, levelsTable, patterns, cache3, markersDict, hyphenChar, skipHTML, minWordLength, isAsync) {
          function done() {
            resolveNewText(newText);
          }
          var newText = "", fragments, readText = createTextReader(
            createHyphenationVerifier(
              (skipHTML ? [createHTMLVerifier()] : []).concat(
                createHyphenCharVerifier(hyphenChar)
              ),
              minWordLength
            )
          ), resolveNewText = function() {
          };
          function nextTick() {
            var loopStart = /* @__PURE__ */ new Date();
            while ((!isAsync || /* @__PURE__ */ new Date() - loopStart < 10) && (fragments = readText(text))) {
              if (fragments[1]) {
                var cacheKey = fragments[1].length ? "~" + fragments[1] : "";
                if (!Object.prototype.hasOwnProperty.call(cache3, cacheKey)) {
                  var loweredWord = fragments[1].toLocaleLowerCase();
                  if (!Object.prototype.hasOwnProperty.call(markersDict, loweredWord))
                    markersDict[loweredWord] = hyphenateWord(
                      fragments[1],
                      loweredWord,
                      levelsTable,
                      patterns
                    );
                  cache3[cacheKey] = insertChar(
                    fragments[1],
                    hyphenChar,
                    markersDict[loweredWord]
                  );
                }
                fragments[1] = cache3[cacheKey];
              }
              newText += fragments[0] + fragments[1];
            }
            if (!fragments) {
              done();
            } else {
              setTimeout(nextTick);
            }
          }
          if (isAsync) {
            setTimeout(nextTick);
            return new Promise(function(resolve) {
              resolveNewText = resolve;
            });
          } else {
            nextTick();
            return newText;
          }
        }
        var SETTING_DEFAULT_ASYNC = false;
        var SETTING_DEFAULT_EXCEPTIONS = [];
        var SETTING_DEFAULT_HTML = true;
        var SETTING_DEFAULT_HYPH_CHAR = "­";
        var SETTING_DEFAULT_MIN_WORD_LENGTH = 5;
        var SETTING_NAME_ASYNC = "async";
        var SETTING_NAME_EXCEPTIONS = "exceptions";
        var SETTING_NAME_HTML = "html";
        var SETTING_NAME_HYPH_CHAR = "hyphenChar";
        var SETTING_NAME_MIN_WORD_LENGTH = "minWordLength";
        var _global = typeof global === "object" ? global : typeof window === "object" ? window : typeof self === "object" ? self : false ? void 0 : {};
        function extend(target, source) {
          target = target || {};
          for (var key in source) {
            target[key] = source[key];
          }
          return target;
        }
        function validateArray(value) {
          return value instanceof Array;
        }
        function keyOrDefault(object, key, defaultValue, test) {
          if (key in object && (test ? test(object[key]) : true)) {
            return object[key];
          }
          return defaultValue;
        }
        function exceptionsFromMarkers(markers, hyphenChar) {
          var exceptions = {};
          for (var word in markers) {
            exceptions["~" + word] = insertChar(word, hyphenChar, markers[word]);
          }
          return exceptions;
        }
        function exceptionsFromDefinition(exceptionsList, hyphenChar) {
          return exceptionsList.reduce(function(exceptions, exception) {
            exceptions["~" + exception.replace(/\-/g, "")] = exception.replace(
              /\-/g,
              hyphenChar
            );
            return exceptions;
          }, {});
        }
        function createHyphenator(patternsDefinition, options) {
          options = options || {};
          var asyncMode = keyOrDefault(
            options,
            SETTING_NAME_ASYNC,
            SETTING_DEFAULT_ASYNC
          ), caches = {}, markersDict = {}, exceptions = {}, hyphenChar = keyOrDefault(
            options,
            SETTING_NAME_HYPH_CHAR,
            SETTING_DEFAULT_HYPH_CHAR
          ), levelsTable = patternsDefinition[0], patterns = patternsDefinition[1], minWordLength = keyOrDefault(
            options,
            SETTING_NAME_MIN_WORD_LENGTH,
            SETTING_DEFAULT_MIN_WORD_LENGTH
          ) >> 0, skipHTML = keyOrDefault(options, SETTING_NAME_HTML, SETTING_DEFAULT_HTML), userExceptions = keyOrDefault(
            options,
            SETTING_NAME_EXCEPTIONS,
            SETTING_DEFAULT_EXCEPTIONS,
            validateArray
          );
          var cacheKey = hyphenChar + minWordLength;
          exceptions[cacheKey] = {};
          if (patternsDefinition[2]) {
            exceptions[cacheKey] = exceptionsFromMarkers(
              patternsDefinition[2],
              hyphenChar
            );
            markersDict = patternsDefinition[2];
          }
          if (userExceptions && userExceptions.length) {
            exceptions[cacheKey] = extend(
              exceptions[cacheKey],
              exceptionsFromDefinition(userExceptions, hyphenChar)
            );
            markersDict = extend(
              markersDict,
              markersFromExceptionsDefinition(userExceptions)
            );
          }
          caches[cacheKey] = extend({}, exceptions[cacheKey]);
          if (asyncMode && !("Promise" in _global)) {
            throw new Error(
              "Failed to create hyphenator: Could not find global Promise object, needed for hyphenator to work in async mode"
            );
          }
          return function(text, options2) {
            options2 = options2 || {};
            var localHyphenChar = keyOrDefault(
              options2,
              SETTING_NAME_HYPH_CHAR,
              hyphenChar
            ), localMinWordLength = keyOrDefault(options2, SETTING_NAME_MIN_WORD_LENGTH, minWordLength) >> 0, localUserExceptions = keyOrDefault(
              options2,
              SETTING_NAME_EXCEPTIONS,
              SETTING_DEFAULT_EXCEPTIONS,
              validateArray
            ), cacheKey2 = localHyphenChar + localMinWordLength;
            if (!exceptions[cacheKey2] && patternsDefinition[2]) {
              exceptions[cacheKey2] = exceptionsFromMarkers(
                patternsDefinition[2],
                localHyphenChar
              );
              caches[cacheKey2] = extend(caches[cacheKey2], exceptions[cacheKey2]);
            }
            if (localUserExceptions && localUserExceptions.length) {
              exceptions[cacheKey2] = extend(
                exceptions[cacheKey2],
                exceptionsFromDefinition(localUserExceptions, localHyphenChar)
              );
              markersDict = extend(
                markersDict,
                markersFromExceptionsDefinition(localUserExceptions)
              );
              caches[cacheKey2] = extend(caches[cacheKey2], exceptions[cacheKey2]);
            }
            return start(
              text,
              levelsTable,
              patterns,
              caches[cacheKey2],
              markersDict,
              localHyphenChar,
              skipHTML,
              localMinWordLength,
              asyncMode
            );
          };
        }
        return createHyphenator;
      });
    }
  });

  // node_modules/hyphen/export-contract.js
  var require_export_contract = __commonJS({
    "node_modules/hyphen/export-contract.js"(exports, module) {
      var createHyphenator = require_hyphen();
      module.exports = function(patterns) {
        return {
          hyphenate: createHyphenator(patterns, { async: true }),
          hyphenateHTML: createHyphenator(patterns, { async: true, html: true }),
          hyphenateHTMLSync: createHyphenator(patterns, { html: true }),
          hyphenateSync: createHyphenator(patterns),
          patterns
        };
      };
    }
  });

  // node_modules/hyphen/patterns/en-us.js
  var require_en_us = __commonJS({
    "node_modules/hyphen/patterns/en-us.js"(exports, module) {
      (function(root, exports2) {
        if (typeof define === "function" && define.amd) {
          define([], function() {
            return exports2;
          });
        } else if (typeof module === "object" && module.exports) {
          module.exports = exports2;
        } else {
          root.hyphenationPatternsEnUs = exports2;
        }
      })(exports, [
        [
          [0, 0, 0, 4],
          [0, 0, 4],
          [0, 0, 1],
          [0, 0, 3],
          [0, 0, 5],
          [0, 0, 0, 5],
          [0, 0, 0, 0, 5],
          [0, 0, 0, 0, 0, 5],
          [0, 0, 0, 2],
          [0, 0, 2],
          [0, 0, 0, 0, 0, 0, 5],
          [0, 0, 0, 3],
          [0, 0, 0, 0, 3],
          [0, 0, 5, 0, 5],
          [0, 0, 0, 3, 4],
          [0, 0, 0, 1],
          [0, 0, 0, 5, 5],
          [0, 0, 0, 0, 4],
          [4],
          [0, 5],
          [0, 0, 5, 5],
          [0, 4],
          [4, 2],
          [0, 3],
          [0, 2],
          [2],
          [4, 0, 4],
          [3],
          [0, 4, 4],
          [0, 1],
          [0, 5, 0, 5],
          [5, 5],
          [5],
          [0, 4, 5],
          [0, 4, 1],
          [0, 0, 3, 3],
          [0, 0, 0, 0, 0, 4],
          [2, 2],
          [0, 0, 5, 0, 4],
          [5, 5, 0, 4],
          [0, 0, 4, 2],
          [1],
          [2, 1],
          [4, 1],
          [4, 0, 2],
          [4, 0, 5],
          [4, 0, 0, 4],
          [4, 3],
          [2, 3],
          [0, 0, 0, 0, 5, 4],
          [3, 0, 3],
          [3, 0, 0, 5],
          [0, 2, 2],
          [5, 0, 0, 4],
          [0, 0, 0, 0, 0, 3],
          [2, 5, 2],
          [4, 5],
          [2, 5],
          [2, 0, 0, 4],
          [0, 0, 0, 5, 0, 5],
          [0, 5, 4],
          [4, 0, 3],
          [4, 0, 1],
          [3, 0, 0, 2],
          [0, 0, 2, 5],
          [1, 4, 4],
          [4, 3, 2],
          [0, 0, 0, 5, 4],
          [3, 4],
          [1, 2],
          [2, 3, 4],
          [0, 0, 2, 2],
          [0, 1, 4],
          [0, 3, 0, 4],
          [0, 1, 2],
          [1, 4, 3],
          [5, 0, 3],
          [0, 4, 0, 3],
          [1, 0, 1],
          [0, 5, 2],
          [4, 1, 4],
          [2, 1, 2],
          [0, 1, 1],
          [0, 4, 3],
          [0, 0, 0, 0, 2],
          [0, 0, 4, 1],
          [0, 0, 2, 4],
          [0, 5, 0, 0, 5],
          [0, 3, 0, 0, 3],
          [0, 0, 1, 0, 2],
          [0, 4, 0, 4],
          [0, 4, 3, 0, 3],
          [0, 1, 0, 0, 4],
          [0, 0, 3, 4],
          [0, 2, 5],
          [0, 0, 4, 4],
          [0, 0, 4, 0, 4],
          [0, 0, 0, 2, 5],
          [0, 1, 0, 3],
          [0, 4, 2],
          [0, 2, 0, 5],
          [4, 1, 2],
          [1, 0, 4],
          [5, 4],
          [3, 4, 4],
          [4, 3, 3],
          [5, 0, 0, 5],
          [2, 5, 3],
          [0, 5, 5],
          [0, 4, 0, 2],
          [3, 0, 0, 4],
          [0, 0, 4, 3],
          [2, 0, 4],
          [5, 0, 5],
          [4, 5, 4],
          [0, 0, 0, 0, 0, 0, 4],
          [0, 0, 3, 0, 3],
          [0, 4, 0, 0, 4],
          [5, 5, 2],
          [2, 0, 1],
          [4, 0, 0, 5],
          [0, 2, 5, 5],
          [5, 2],
          [4, 4, 4],
          [1, 4],
          [4, 4],
          [0, 2, 0, 0, 4],
          [0, 3, 3],
          [0, 5, 0, 0, 4],
          [0, 0, 0, 4, 5],
          [0, 0, 0, 1, 3],
          [0, 0, 2, 1],
          [0, 4, 0, 5],
          [0, 0, 0, 4, 4],
          [0, 0, 5, 4],
          [5, 0, 0, 5, 5],
          [0, 0, 0, 3, 0, 3],
          [0, 0, 0, 0, 1],
          [3, 0, 4],
          [0, 2, 0, 4],
          [1, 1],
          [3, 0, 1],
          [2, 3, 2],
          [1, 2, 2],
          [0, 0, 3, 0, 5],
          [5, 0, 4],
          [0, 0, 0, 0, 4, 3],
          [0, 1, 0, 4],
          [0, 0, 0, 5, 2],
          [0, 0, 0, 0, 4, 5],
          [5, 0, 0, 0, 4],
          [0, 0, 2, 3],
          [0, 0, 0, 3, 3],
          [0, 0, 0, 3, 2],
          [0, 0, 2, 0, 2],
          [5, 0, 0, 3],
          [2, 0, 2],
          [0, 4, 0, 1],
          [0, 0, 0, 0, 5, 0, 5],
          [2, 1, 4],
          [1, 0, 2],
          [0, 3, 2],
          [0, 0, 0, 1, 6, 1],
          [0, 0, 4, 1, 0, 1],
          [0, 0, 5, 0, 1],
          [0, 0, 3, 0, 1],
          [0, 0, 3, 6],
          [0, 0, 5, 2],
          [0, 0, 0, 2, 3],
          [0, 0, 6, 1, 0, 1],
          [0, 0, 6],
          [0, 0, 4, 0, 1],
          [0, 0, 0, 5, 2, 1],
          [0, 0, 1, 4],
          [0, 0, 6, 3],
          [0, 0, 0, 1, 2],
          [0, 0, 0, 5, 0, 1],
          [0, 0, 0, 0, 0, 6],
          [0, 0, 0, 6, 0, 4],
          [0, 0, 0, 6, 0, 1],
          [0, 0, 5, 0, 0, 1],
          [0, 0, 5, 0, 0, 5],
          [0, 0, 1, 0, 3, 0, 5],
          [0, 0, 0, 0, 6],
          [0, 0, 3, 0, 1, 2],
          [0, 0, 3, 0, 0, 5],
          [0, 0, 0, 3, 0, 1, 1],
          [0, 0, 6, 1],
          [0, 1, 3],
          [0, 0, 0, 0, 2, 1],
          [0, 0, 0, 0, 2, 2],
          [0, 0, 0, 1, 0, 5],
          [0, 0, 2, 1, 1],
          [0, 0, 0, 6, 2],
          [0, 0, 0, 5, 1],
          [0, 0, 0, 1, 1, 2],
          [0, 0, 6, 0, 1, 3],
          [0, 0, 0, 0, 1, 1],
          [0, 2, 0, 0, 3, 0, 6],
          [1, 0, 2, 1],
          [0, 0, 5, 0, 0, 0, 1],
          [0, 0, 3, 0, 0, 3],
          [2, 1, 0, 2],
          [3, 0, 5],
          [0, 0, 0, 0, 1, 5],
          [0, 1, 0, 3, 0, 0, 0, 5],
          [0, 0, 0, 0, 3, 5],
          [0, 0, 1, 0, 1, 1],
          [0, 0, 0, 2, 1],
          [1, 6, 3, 3, 0, 0, 0, 1],
          [0, 2, 3, 4],
          [0, 3, 0, 0, 0, 6],
          [5, 0, 2, 0, 0, 0, 1],
          [0, 0, 0, 0, 0, 1],
          [0, 0, 0, 1, 6],
          [0, 0, 3, 1],
          [0, 2, 1],
          [2, 1, 4, 3, 1],
          [0, 0, 2, 3, 0, 5],
          [0, 3, 5, 0, 0, 1, 4],
          [0, 0, 0, 0, 0, 1, 2],
          [0, 0, 0, 0, 6, 3],
          [0, 0, 1, 0, 1],
          [1, 0, 6],
          [1, 0, 5],
          [0, 0, 4, 3, 5],
          [0, 0, 0, 6, 3],
          [0, 3, 0, 0, 0, 6, 1],
          [0, 0, 0, 4, 1],
          [1, 0, 0, 3, 0, 6],
          [0, 0, 3, 6, 0, 2],
          [0, 2, 3],
          [0, 5, 0, 3],
          [0, 0, 1, 0, 0, 1, 1],
          [1, 0, 0, 0, 3],
          [1, 0, 0, 5],
          [3, 0, 0, 1, 1],
          [0, 0, 0, 3, 1],
          [0, 0, 0, 1, 0, 0, 1],
          [0, 0, 0, 0, 0, 6, 1],
          [0, 0, 3, 0, 0, 0, 3],
          [3, 0, 3, 0, 5],
          [0, 0, 1, 2, 0, 1],
          [0, 3, 0, 1],
          [5, 0, 0, 0, 1, 0, 1],
          [5, 0, 0, 1, 0, 1],
          [0, 0, 0, 1, 5],
          [0, 0, 0, 4, 0, 1],
          [0, 0, 0, 0, 6, 5],
          [0, 0, 0, 0, 1, 6],
          [0, 0, 0, 0, 4, 0, 2],
          [0, 5, 0, 0, 0, 0, 2],
          [0, 0, 0, 2, 0, 5],
          [0, 3, 0, 2, 0, 1],
          [5, 0, 0, 3, 0, 1],
          [0, 0, 0, 1, 4],
          [5, 0, 0, 1],
          [0, 0, 0, 0, 0, 2],
          [0, 0, 0, 3, 0, 0, 1, 1],
          [0, 1, 0, 3, 4],
          [0, 3, 0, 0, 0, 0, 6],
          [0, 3, 0, 2, 1, 3],
          [0, 0, 4, 0, 0, 3, 0, 4],
          [0, 5, 0, 0, 0, 1],
          [0, 5, 0, 0, 3],
          [0, 0, 0, 3, 1, 1],
          [0, 6, 3, 4],
          [0, 0, 0, 6, 1],
          [0, 0, 0, 6],
          [0, 0, 0, 0, 0, 6, 0, 4],
          [0, 0, 0, 5, 0, 0, 1, 3],
          [0, 0, 2, 1, 3],
          [0, 0, 3, 0, 0, 0, 1],
          [1, 0, 0, 0, 0, 3],
          [0, 0, 0, 0, 3, 3],
          [3, 0, 0, 0, 2],
          [0, 0, 0, 0, 3, 6, 3, 2],
          [0, 0, 0, 3, 0, 0, 4],
          [0, 5, 0, 0, 0, 3],
          [0, 0, 0, 0, 0, 2, 1],
          [0, 0, 6, 3, 0, 3],
          [0, 0, 0, 0, 0, 0, 6],
          [0, 0, 0, 0, 5, 0, 0, 5],
          [3, 0, 4, 5, 1],
          [0, 3, 0, 0, 1],
          [0, 0, 2, 3, 1],
          [0, 0, 0, 5, 6],
          [0, 0, 0, 1, 1],
          [6],
          [0, 0, 1, 0, 0, 1],
          [0, 0, 5, 0, 0, 0, 0, 1],
          [0, 3, 0, 0, 5],
          [5, 0, 3, 0, 0, 5],
          [0, 0, 0, 0, 0, 1, 0, 0, 0, 1],
          [1, 0, 0, 2],
          [0, 0, 3, 0, 0, 1],
          [0, 0, 1, 0, 6, 5],
          [3, 0, 0, 0, 0, 1],
          [3, 2, 0, 1, 1],
          [3, 2],
          [0, 0, 0, 0, 0, 0, 3],
          [0, 2, 1, 3, 0, 0, 1],
          [0, 5, 0, 0, 0, 5, 3],
          [0, 2, 1, 0, 0, 5],
          [1, 0, 0, 0, 1],
          [0, 0, 0, 0, 0, 1, 1],
          [0, 0, 0, 1, 0, 4, 1],
          [0, 0, 2, 0, 0, 1, 6],
          [1, 0, 0, 0, 3, 2],
          [5, 0, 0, 1, 1],
          [0, 6, 0, 6],
          [5, 0, 0, 2],
          [3, 0, 0, 1],
          [0, 3, 0, 0, 2],
          [0, 0, 1, 5, 0, 0, 1],
          [0, 1, 0, 2],
          [0, 0, 0, 0, 3, 0, 0, 1],
          [0, 0, 0, 0, 0, 0, 0, 3, 3],
          [0, 0, 0, 0, 0, 0, 1],
          [3, 0, 0, 1, 0, 1],
          [3, 0, 0, 0, 1, 5],
          [0, 1, 0, 1, 0, 0, 3],
          [0, 0, 0, 0, 0, 1, 0, 1],
          [0, 1, 0, 0, 5, 0, 1],
          [0, 1, 0, 1],
          [0, 0, 1, 0, 0, 3, 3],
          [0, 0, 0, 0, 0, 3, 6, 2],
          [0, 0, 0, 0, 1, 4],
          [0, 0, 0, 5, 0, 0, 1],
          [0, 3, 1]
        ],
        {
          ".": {
            a: {
              c: { h: 0 },
              d: { d: { e: { r: 1 } } },
              f: { t: 2 },
              l: { t: 3 },
              m: { a: { t: 4 } },
              n: { c: 4, g: 0, i: { m: 5 }, t: [{ e: 3, i: { s: 6 } }, 0] },
              r: { s: 4, t: { i: { e: 1 }, y: 1 } },
              s: { c: 3, p: 2, s: 2, t: { e: { r: 7 } } },
              t: { o: { m: 6 } },
              u: { d: 2 },
              v: { i: 1 },
              w: { n: 0 }
            },
            b: {
              a: { g: 1, n: { a: 4 }, s: { e: 0 } },
              e: { r: [{ a: 4 }, 0], s: { m: 3, t: { o: 4 } } },
              r: { i: 8 },
              u: { t: { t: { i: 0 } } }
            },
            c: {
              a: {
                m: { p: { e: 0 } },
                n: { c: 5 },
                p: { a: { b: 6 } },
                r: { o: { l: 5 } },
                t: 1
              },
              e: { l: { a: 1 } },
              h: [{ i: { l: { l: { i: 7 } } } }, 1],
              i: [{ t: { r: 5 } }, 9],
              o: { e: 3, r: [{ n: { e: { r: 5 } } }, 1], n: { g: { r: 5 } } }
            },
            d: {
              e: {
                m: { o: { i: 1 } },
                o: 3,
                r: { a: 3, i: [{ v: { a: 4 } }, 3] },
                s: { c: 0 }
              },
              i: { c: { t: { i: { o: 10 } } } },
              o: { t: 1 },
              u: { c: 1, m: { b: 6 } },
              r: { i: { v: 67 } }
            },
            e: {
              a: { r: { t: { h: 7 } }, s: { i: 11 } },
              b: 1,
              e: { r: 0 },
              g: 9,
              l: { d: 4, e: { m: 3 } },
              n: { a: { m: 12 }, g: 3, s: 3 },
              q: { u: { i: { t: 13 } } },
              r: { r: { i: 1 } },
              s: 3,
              u: [{ l: { e: { r: 1 } } }, 3],
              y: { e: 5 },
              t: { h: { y: { l: 162 } } },
              v: [{ e: { r: { s: { i: { b: 158 } } } } }, 9]
            },
            f: { e: { s: 11 }, o: { r: { m: { e: { r: 5 } } } } },
            g: {
              a: [{ s: { o: { m: 163 } } }, 9],
              e: [{ n: { t: 14 }, o: { g: 4, m: { e: 1 }, t: 164 } }, 9],
              i: { a: 4, b: 1 },
              o: { r: 1 }
            },
            h: {
              a: { n: { d: { i: 6 }, k: 5 } },
              e: [
                {
                  r: { o: { i: 6, e: 3 } },
                  s: 11,
                  t: 11,
                  m: { o: 165 },
                  p: { a: 166 }
                },
                9
              ],
              i: { b: 3, e: { r: 3 } },
              o: { n: { e: { y: 5 }, o: 11 }, v: 5 }
            },
            i: {
              d: { l: 1, o: { l: 12 } },
              m: { m: 3, p: { i: { n: 4 } } },
              n: [{ c: { i: 3 }, e: 8, k: 9, s: 3, u: { t: 167 } }, 2],
              r: { r: 4 },
              s: { i: 1 }
            },
            j: { u: { r: 3 } },
            l: {
              a: { c: { y: 1 }, m: 1, t: { e: { r: 5 }, h: 6 } },
              e: [{ g: { e: 5 }, n: 0, p: 5, v: 15, i: { c: { e: { s: 170 } } } }, 9],
              i: { g: [{ a: 5 }, 1], n: 9, o: 3, t: 1 }
            },
            m: {
              a: { g: { a: 16 }, l: { o: 5 }, n: { a: 5 }, r: { t: { i: 5 } } },
              e: [
                {
                  r: { c: 11 },
                  t: { e: { r: 4 }, a: { l: { a: 0 } } },
                  g: { a: { l: 171 } }
                },
                9
              ],
              i: {
                s: [{ t: { i: 6 }, e: { r: { s: 173 } } }, 15],
                m: { i: { c: 172 } }
              },
              o: { n: { e: 11 }, r: { o: 3 } },
              u: { t: { a: [{ b: 6 }, 4] } }
            },
            n: {
              i: { c: 1 },
              e: { o: { f: 174 } },
              o: { e: { t: { h: 15 } }, n: { e: { m: 175 } } }
            },
            o: {
              d: [{ d: 5 }, 9],
              f: { t: { e: 4 } },
              r: { a: { t: { o: 4 } }, c: 3, d: 2, t: 3 },
              s: [{ t: { l: 1 } }, 3],
              t: { h: 11 },
              u: { t: 11 }
            },
            p: {
              e: { d: { a: { l: 5 } }, t: { e: 4, i: { t: 4 } } },
              i: { e: 1, o: { n: 5 }, t: 9 },
              r: { e: { m: 11, a: { m: 15 } } },
              o: { l: { y: { s: 137 } }, s: { t: { a: { m: 137 } } } }
            },
            r: {
              a: {
                c: 1,
                n: { t: 0 },
                t: { i: { o: { n: { a: 7 } } } },
                v: { e: { n: { o: 176 } } }
              },
              e: {
                e: [{ c: 173 }, 8],
                m: { i: { t: 4 } },
                s: [{ t: { a: { t: 4 } } }, 8]
              },
              i: { g: 1, t: { u: 5 } },
              o: { q: 1, s: { t: 5 }, w: { d: 5 } },
              u: { d: 1 }
            },
            s: {
              c: { i: { e: 11 } },
              e: {
                l: { f: 6, l: 6 },
                n: 9,
                r: { i: { e: 4 } },
                m: { i: [{ c: 0, d: 177, p: 36, r: 36, s: 178, v: 36 }, 6] }
              },
              h: 9,
              i: [{ n: { g: 17 } }, 9],
              t: [{ a: { b: { l: 5 } } }, 1],
              y: 9,
              p: { h: { i: { n: 179 } }, i: { n: { o: 137 } } }
            },
            t: {
              a: [{ p: { e: { s: { t: { r: 180 } } } } }, 1],
              e: [{ n: { a: { n: 5 } }, l: { e: { g: { r: 3 } } } }, 1],
              h: 9,
              i: [{ l: 0, m: { o: 16 }, n: { g: 17, k: 5 } }, 9],
              o: { n: { a: 0 }, p: [{ i: 5, o: { g: 170 } }, 1], u: { s: 5 }, q: 9 },
              r: { i: { b: { u: { t: 6 } } } }
            },
            u: {
              n: {
                a: [{ t: { t: 144 } }, 2],
                c: { e: 3 },
                d: { e: { r: 7 } },
                e: [{ r: { r: 181 } }, 2],
                k: 4,
                o: 4,
                u: 3
              },
              p: 3,
              r: { e: 11 },
              s: { a: 4 }
            },
            v: {
              e: { n: { d: { e: 0 } }, r: { a: 4 } },
              i: { c: { a: { r: 151 } } }
            },
            w: { i: { l: { i: 5 } }, e: { b: { l: 131 } } },
            y: { e: 1 },
            k: { i: { l: { n: { i: 168 } } }, o: { r: { t: { e: 169 } } } }
          },
          a: {
            b: {
              ".": 18,
              a: { l: 19, n: 19 },
              e: [{ r: { d: 4 } }, 8],
              i: { a: 5, t: { a: { b: 13 } } },
              l: { a: { t: 4 } },
              o: { l: { i: { z: 20, c: 19 } } },
              r: [{ o: { g: 4 } }, 18],
              u: { l: 3 }
            },
            c: {
              a: { r: [{ d: 4, o: 4 }, 21], b: { l: 24 } },
              e: { o: { u: 19 }, r: 2 },
              h: { e: { t: 19 } },
              i: [{ e: 23, n: 2, o: 23 }, 22],
              r: { o: { b: 4 } },
              t: { i: { f: 5 } },
              u: { l: 3, m: 1 }
            },
            d: [
              {
                d: { i: { n: 1 } },
                e: { r: { ".": 4 } },
                i: [{ a: 23, c: { a: 3 }, e: { r: 0 }, o: 23, t: 23, u: 19 }, 25],
                l: { e: 1 },
                o: { w: 3 },
                r: { a: { n: 4 } },
                s: { u: 1 },
                u: [{ c: 23, m: 4 }, 18]
              },
              24
            ],
            e: { r: [{ i: { e: 17 } }, 1] },
            f: [{ f: [{ i: { s: { h: 170 } } }, 0] }, 24],
            g: {
              a: { b: 21, n: 0 },
              e: { l: { l: 4 }, o: 0, u: 18 },
              i: 2,
              l: 26,
              n: 2,
              o: [{ g: 27, n: { i: 3 } }, 24],
              u: { e: { r: 19 }, l: 4 },
              y: 21
            },
            h: { a: 23, e: 23, l: 1, o: 23 },
            i: [
              {
                a: 19,
                c: { ".": 23 },
                l: { y: 4 },
                n: [{ i: { n: 5 }, o: 5 }, 28],
                t: { e: { n: 5 } }
              },
              9
            ],
            j: 29,
            k: { e: { n: 2 } },
            l: {
              a: { b: 4, d: 3, r: 21 },
              d: { i: 18 },
              e: [{ n: { d: 3, t: { i: 21 } }, o: 30 }, 25],
              i: [{ a: { ".": 1 }, e: 0 }, 2],
              l: { e: { v: 4 }, i: { c: 18 } },
              m: 18,
              o: { g: { ".": 19 } },
              y: { ".": 21, s: [{ t: 31 }, 18], t: 32, z: 27 }
            },
            m: {
              a: [
                { b: 4, g: 3, r: { a: 5 }, s: { c: 4 }, t: { i: { s: 21 }, o: 33 } },
                18
              ],
              e: { r: { a: 4 }, n: { t: { a: { b: 182 } } } },
              i: { c: 3, f: 4, l: { y: 4 }, n: [{ o: 0 }, 2] },
              o: [{ n: 19, r: { i: 6 } }, 24],
              p: { e: { n: 5 } }
            },
            n: [
              {
                a: {
                  g: { e: 3 },
                  l: { y: [{ s: 183 }, 27] },
                  r: [{ c: 3, i: 17 }, 23],
                  t: { i: 23 }
                },
                d: [{ e: { s: 17 }, i: { s: 3 }, l: 2, o: { w: 1 } }, 18],
                e: { e: 19, n: 23, s: { t: { ".": 4 } }, u: 23 },
                g: [{ i: { e: 5 }, l: 2 }, 25],
                i: {
                  c: 34,
                  e: { s: 23 },
                  f: 35,
                  m: { e: 1, i: 19 },
                  n: { e: 19 },
                  o: 3,
                  p: 23,
                  s: { h: 3 },
                  t: 3,
                  u: 23
                },
                k: { l: { i: 1 } },
                n: { i: { z: 32 } },
                o: [{ t: [{ h: 7 }, 4], a: { c: 148 } }, 0],
                s: {
                  a: 9,
                  c: { o: 1 },
                  n: 1,
                  p: [{ o: 11 }, 9],
                  t: 1,
                  u: { r: 1 },
                  g: { r: 5 },
                  v: 11
                },
                t: {
                  a: { l: 36 },
                  i: { e: 1, d: 137, n: 184, r: { e: 137 } },
                  o: 18,
                  r: 9,
                  w: 1
                },
                u: { a: 3, l: 3, r: 19 }
              },
              24
            ],
            o: 18,
            p: {
              a: { r: 17, t: 4 },
              e: { r: { o: 4 }, a: { b: { l: { e: 132 } } } },
              h: { e: { r: 23 }, i: 18 },
              i: { l: { l: { a: [{ r: 4 }, 21] } }, n: 3, t: { a: 3, u: 23 } },
              l: 24,
              o: { c: 6, l: { a: 4 }, r: { i: 6 }, s: { t: 12 } },
              s: { e: { s: 5 } },
              u: 23
            },
            q: { u: { e: 6 } },
            r: [
              {
                a: {
                  c: { t: 3 },
                  d: { e: 19, i: { s: 4 } },
                  l: 3,
                  m: { e: { t: { e: 19 } } },
                  n: { g: 17 },
                  p: 11,
                  t: [{ i: { o: 19, v: 4 } }, 1],
                  u: 19,
                  v: 38,
                  w: 17
                },
                b: { a: { l: 36 } },
                c: { h: { a: { n: 1 }, e: { t: 185 } } },
                d: { i: { n: { e: 4 } }, r: 1 },
                e: { a: { s: 4 }, e: 23, n: { t: 3 }, s: { s: 19 } },
                f: { i: 1, l: 1 },
                i: [
                  {
                    a: { l: 4, n: 3 },
                    e: { t: 23 },
                    m: 1,
                    n: { a: { t: 4 } },
                    o: 3,
                    z: 9
                  },
                  2
                ],
                m: { i: 9 },
                o: { d: 20, n: { i: 19 }, o: 23 },
                p: 9,
                q: 3,
                r: { e: 17, a: { n: { g: { e: 9 } } } },
                s: { a: 1, h: 9 }
              },
              37
            ],
            s: {
              ".": 18,
              a: { b: 1, n: { t: 3 } },
              h: { i: 17 },
              i: { a: { ".": 19 }, b: 23, c: 23, t: 39 },
              k: { i: 11 },
              l: 1,
              o: { c: 21 },
              p: { h: 4 },
              s: { h: 1 },
              t: { e: { n: 3 }, r: 2 },
              u: { r: { a: 6 } },
              y: { m: { p: { t: { o: { t: 4 } } } } }
            },
            t: {
              a: [{ b: { l: 3 }, c: 4, l: { o: 3 }, p: 4 }, 24],
              e: {
                c: [{ h: 4 }, 5],
                g: { o: 3 },
                n: { ".": 3 },
                r: { a: 3, n: [{ a: 19 }, 6] },
                s: { t: 3 },
                v: 4
              },
              h: [{ e: { m: 5, n: 19, r: { o: { s: 186 } } }, o: [{ m: 5 }, 1] }, 18],
              i: {
                ".": 18,
                a: 19,
                b: 20,
                c: 2,
                f: 3,
                o: { n: { a: { r: 7 } } },
                t: { u: 3 }
              },
              o: { g: 21, m: [{ i: { z: 4 } }, 24], p: 21, s: 21 },
              r: [{ o: { p: 4 } }, 29],
              s: { k: 1 },
              t: { a: { g: 1 }, e: [{ s: { ".": 170 } }, 4], h: 1 },
              u: [{ a: 4, e: 4, l: 3, r: { a: 3 } }, 24],
              y: 24
            },
            u: {
              b: 1,
              g: { h: [{ t: { l: 17 } }, 12], u: 3 },
              l: [{ i: { f: 13 } }, 40],
              n: { d: 5 },
              r: 3,
              s: { i: { b: 4 } },
              t: { e: { n: 5 }, h: 2 }
            },
            v: {
              a: [{ g: 3, n: 19 }, 24],
              e: { n: { o: 0 }, r: { a: 3, n: 4, y: 4 } },
              i: [{ e: { r: 0 }, g: 3, o: { u: 3 } }, 2],
              o: { c: 4, r: 29 }
            },
            w: { a: { y: 27 }, i: 3, l: { y: 1 }, s: 0 },
            x: { i: { c: 1, d: 1 } },
            y: { a: { l: 4 }, e: 0, s: 0 },
            z: { i: { e: { r: 0 } }, z: { i: 5 } }
          },
          b: {
            a: {
              ".": 32,
              d: { g: { e: { r: 5 } } },
              g: { e: 1 },
              l: { a: 15 },
              n: { d: { a: { g: 5 } }, e: 0, i: 11 },
              r: { b: { i: 7 }, i: { a: 17 }, o: { n: { i: { e: 187 } } } },
              s: { s: { i: 0 } },
              t: [{ h: { y: 2 } }, 41],
              z: 1,
              c: { k: { e: { r: { ".": 84 } } } }
            },
            b: [{ e: [{ r: 23 }, 24], i: { n: { a: 0 }, t: 0 } }, 42],
            d: 43,
            e: {
              ".": 18,
              a: { k: 17, t: 12 },
              d: [{ a: 3, e: 3, i: 3 }, 44],
              g: { i: 3, u: 4 },
              l: [{ i: 2, o: 3 }, 41],
              m: 45,
              n: { i: { g: 4 }, u: 4 },
              s: [{ p: 3, t: { r: 4 } }, 46],
              t: [{ i: { z: 5 }, r: 4, w: 3 }, 27],
              w: 3,
              y: { o: 4 },
              v: { i: { e: 9 } }
            },
            f: 25,
            h: 47,
            i: {
              b: 9,
              d: [{ i: { f: 167 } }, 1],
              e: [{ n: 4, r: 1 }, 27],
              f: 48,
              l: [{ i: { z: 3 }, l: { a: { b: 8 } } }, 41],
              n: { a: { r: 49 }, d: 0, e: { t: 4 } },
              o: { g: { r: 3 }, u: 4, m: 5, r: { b: 2, h: 15 } },
              t: [{ i: { o: 50, v: { e: 188 } }, r: 3, u: { a: 51 }, z: 19 }, 9]
            },
            j: 29,
            k: 1,
            l: [
              {
                a: { t: { h: 7 }, n: { d: 189 } },
                e: { ".": 21, n: 17, s: { p: 32 } },
                i: { s: 23, n: { d: 189 } },
                o: [{ n: { d: 190 } }, 21],
                u: { n: { t: 17 } }
              },
              52
            ],
            m: 43,
            n: [{ e: { g: 5 } }, 47],
            o: {
              d: [{ i: 11 }, 27],
              e: 1,
              l: { i: { c: 11 } },
              m: { b: { i: 0 } },
              n: { a: [{ t: 5 }, 0] },
              o: 27,
              r: { ".": 32, a: 43, d: 5, e: 32, i: 32, n: { o: 191 } },
              s: 53,
              t: { a: 19, h: 6, o: 1, u: { l: 192 } },
              u: { n: { d: 54 } }
            },
            p: 18,
            r: { i: { t: 18 }, o: { t: { h: 54 } }, u: { s: { q: 17 } } },
            s: [{ o: { r: 17 } }, 55],
            t: [{ l: 1, o: 21, r: 23 }, 25],
            u: {
              f: { f: { e: { r: 0 } } },
              g: { a: 1 },
              l: { i: 3 },
              m: { i: 17 },
              n: [{ t: { i: 17 } }, 1],
              r: { e: 3 },
              s: {
                i: { e: [{ r: 193, s: 193 }, 5] },
                s: { e: 17, i: { n: { g: 17 } } },
                t: 32
              },
              t: {
                a: 18,
                i: { o: 27 },
                o: 19,
                e: { d: { ".": 8 } },
                t: { e: { d: 0 } }
              }
            },
            v: 29,
            w: 56,
            y: { ".": 32, s: 0 }
          },
          c: {
            a: [
              {
                b: { i: { n: 11 }, l: 2 },
                c: { h: 17 },
                d: { e: { n: 4, m: 194 } },
                g: 46,
                h: 57,
                l: { a: { t: 3 }, l: { a: 0, i: { n: 6 } }, o: 18 },
                n: { d: 5, e: 0, i: { c: 0, s: 5, z: 11 }, t: { y: 0 }, y: 17 },
                p: { e: { r: 4 } },
                r: { o: { m: 5 } },
                s: { t: { e: { r: 6 }, i: { g: 5 } }, y: 18 },
                t: { h: 1, i: { v: 18 }, a: { s: 195 } },
                v: { a: { l: 5 } }
              },
              41
            ],
            c: [
              {
                h: { a: 6 },
                i: { a: 0 },
                o: { m: { p: { a: 10 } }, n: 17, u: { t: 12 } }
              },
              23
            ],
            e: {
              ".": 25,
              d: { ".": 18, e: { n: 18 } },
              i: 27,
              l: { ".": 32, l: 27 },
              n: [{ c: 27, e: 58, i: 18, t: 27 }, 41],
              p: 27,
              r: { a: { m: 4 } },
              s: { a: 18, s: { i: [{ b: 59 }, 27] }, t: 5 },
              t: [{ a: 60 }, 0],
              w: 0
            },
            h: [
              {
                ".": 18,
                a: { b: 61, n: { i: { c: 32, s: 20 } } },
                e: [
                  {
                    a: { p: 54 },
                    d: 18,
                    l: { o: 5 },
                    m: { i: 27 },
                    n: { e: 4 },
                    r: { ".": 3, s: 3 }
                  },
                  8
                ],
                i: {
                  n: [{ e: { ".": 32, s: { s: 4 } }, i: 32 }, 62],
                  o: 32,
                  t: 27,
                  z: 8,
                  e: { v: { o: 6 } }
                },
                o: 63,
                t: { i: 1 },
                s: { ".": 18, h: { u: 11 } }
              },
              25
            ],
            i: [
              {
                a: [{ b: 64, r: 5 }, 27],
                c: 4,
                e: { r: 18 },
                f: { i: { c: { ".": 32 } } },
                i: 18,
                l: { a: 1, i: 27 },
                m: 25,
                n: [
                  {
                    a: [{ t: 27 }, 21],
                    e: { m: 11 },
                    g: [{ ".": 19 }, 29],
                    o: 32,
                    q: 8
                  },
                  25
                ],
                o: { n: 17 },
                p: { e: 18, h: 3, i: { c: 18 } },
                s: { t: { a: 18, i: 18 } },
                t: [{ i: { z: 11 } }, 42],
                z: 32,
                g: { a: { r: 152 } }
              },
              41
            ],
            k: [{ i: 3 }, 2],
            l: [
              {
                a: { r: [{ a: { t: { i: { o: 19 } } }, e: 32 }, 18] },
                e: { m: 0, a: { r: 0 } },
                i: { c: 18, m: 17 },
                y: 0
              },
              65
            ],
            n: 19,
            o: [
              {
                a: { g: 4 },
                e: 8,
                g: [{ r: 1 }, 25],
                i: [{ n: { c: 3 } }, 0],
                l: { i: 5, o: [{ r: 11 }, 32] },
                m: { e: { r: 5 } },
                n: { a: 0, e: 21, g: 11, t: 5 },
                p: { a: 3, i: { c: 11 }, l: 1, h: { o: { n: 196 } } },
                r: { b: 18, o: { n: 12 } },
                s: { e: 0 },
                v: [{ e: 17 }, 15],
                w: { a: 5 },
                z: { e: 5, i: 4 },
                u: { s: { t: { i: 84 } } }
              },
              41
            ],
            q: 29,
            r: {
              a: { s: { t: 6 }, t: { ".": 32, i: { c: 32 } } },
              e: { a: { t: 11 }, d: 32, t: { a: 47 }, v: 0 },
              i: [{ f: 5, n: 21, s: 17, t: { i: [{ e: 11 }, 32] } }, 8],
              o: {
                p: { l: 0, o: 6 },
                s: { e: 17 },
                c: { o: { d: 197 } },
                e: { c: { o: 148 } }
              },
              u: { d: 0 }
            },
            s: 66,
            t: [
              {
                a: { b: 0, n: { g: 4, t: 19 } },
                e: [{ r: 23 }, 24],
                i: { c: { u: 21 }, m: { i: 12 } },
                u: { r: 0 },
                w: 21,
                r: { o: { m: { e: { c: 198 } } } }
              },
              42
            ],
            u: {
              d: 5,
              f: 21,
              i: [{ t: { y: 4 } }, 21],
              l: { i: 32, t: { i: { s: 0 }, u: 27 } },
              m: { a: 9, e: 23, i: 1 },
              n: 27,
              p: { i: 3, y: 4 },
              r: { a: { b: 67, n: { c: { e: 199 } } }, i: { a: 4 } },
              s: [{ s: { i: 17 } }, 41],
              t: [{ i: { e: 1, v: 56 }, r: 18 }, 68]
            },
            y: 41,
            z: { e: 0 }
          },
          d: {
            a: [
              {
                ".": 32,
                b: 70,
                c: { h: 17 },
                f: 18,
                g: 25,
                m: 71,
                n: { g: 11 },
                r: { d: 6, k: 6, y: 18 },
                t: [{ i: { v: 18 }, o: 18, a: { b: 137 } }, 27],
                v: [{ e: 5 }, 53],
                y: 32,
                l: { o: { n: { e: 48 } } }
              },
              69
            ],
            b: 29,
            c: 19,
            d: [{ a: { b: 20 }, i: { b: 94 } }, 72],
            e: {
              ".": 25,
              a: { f: 6, l: { s: { ".": 1 } } },
              b: { i: { t: 5 }, o: { n: 1 } },
              c: {
                a: { n: 36 },
                i: { l: 1 },
                o: { m: 4 },
                l: { a: { r: 200 }, i: { n: { a: 64 } } }
              },
              d: 42,
              e: { ".": 18 },
              i: { f: 4 },
              l: { i: { e: 17, q: 16 }, o: 4 },
              m: [
                {
                  ".": 32,
                  i: { c: [{ ".": 5 }, 27], l: 4 },
                  o: { n: { s: 1 }, r: 7, s: 9 }
                },
                21
              ],
              n: [{ a: { r: 1 }, o: 3, t: { i: { f: 7 } }, u: 3 }, 41],
              p: [{ a: 3, i: 17, u: 9 }, 2],
              q: 23,
              r: { h: 21, m: 32, n: { i: { z: 6 } }, s: 5 },
              s: [
                { ".": 24, c: 2, o: 64, t: { i: 11, r: 3 }, u: 1, i: { c: 11 } },
                8
              ],
              t: [{ o: 9, i: { c: 9 } }, 2],
              v: [{ i: { l: 11 } }, 2],
              y: 18,
              f: { i: { n: { i: { t: { i: 201 } } } } }
            },
            f: 43,
            g: { a: 21, e: { t: 73 }, i: 2, y: 24 },
            h: 74,
            i: {
              ".": 32,
              a: [{ b: 5 }, 75],
              c: { a: { m: 1, i: { d: 15 } }, e: 21, t: 27 },
              d: 27,
              e: { n: 76 },
              f: [{ f: { r: { a: 5 } } }, 29],
              g: { e: 3 },
              l: { a: { t: { o: 1 } } },
              n: [{ a: 41, e: { ".": 27 }, i: [{ z: 4 }, 32] }, 29],
              o: [{ g: 5 }, 41],
              p: { l: 1 },
              r: [{ e: [{ n: 9, r: 9 }, 2], t: { i: 6 } }, 8],
              s: [{ i: 32, t: 77 }, 15],
              t: { i: 24 },
              v: 78,
              m: { e: { t: { h: { y: 141 } } } }
            },
            j: 29,
            k: 79,
            l: {
              a: 56,
              e: { ".": 27, d: 27, s: { ".": 27, s: 18 }, a: { d: 42 } },
              o: 48,
              u: 56,
              y: 25,
              i: { e: 202 }
            },
            m: 29,
            n: 80,
            o: [
              {
                ".": 27,
                d: { e: 4 },
                e: 32,
                f: 57,
                g: 21,
                l: { a: 1, i: 17, o: { r: 4 } },
                m: { i: { z: 5 } },
                n: { a: { t: 3 }, i: 17 },
                o: { d: 11 },
                p: { p: 0 },
                r: 21,
                s: 27,
                u: { t: 56 },
                v: 1,
                x: 27,
                w: { o: { r: { d: 203 } } }
              },
              41
            ],
            p: 29,
            r: [
              {
                a: { g: { o: { n: 6 } }, i: 18 },
                e: [{ a: { r: 6 }, n: [{ a: { l: 204 } }, 32] }, 0],
                i: { b: 0, l: 17, f: { t: { a: 189 } }, p: { l: { e: { g: 205 } } } },
                o: { p: 0, w: 18, m: { e: { d: 206 } } },
                u: { p: { l: { i: 32 } } },
                y: 18
              },
              41
            ],
            s: [{ p: 1, w: 21, y: 21 }, 81],
            t: { h: 24, a: { b: 23 } },
            u: [
              {
                a: [{ l: { ".": 9 } }, 82],
                c: [{ a: 29, e: { r: 5 }, t: { ".": 18, s: 18 } }, 9],
                e: { l: 4 },
                g: 1,
                l: { e: 23 },
                m: { b: { e: 0 } },
                n: 1,
                p: [{ e: 1 }, 18],
                o: { p: { o: { l: 207 } } }
              },
              41
            ],
            v: 29,
            w: 29,
            y: [{ n: 32, s: { e: 1, p: 5 } }, 24]
          },
          e: {
            a: {
              b: 72,
              c: { t: 23 },
              d: [{ i: { e: 5 } }, 15],
              g: { e: [{ r: 4 }, 1] },
              l: [{ e: { r: 5 }, o: { u: 11 } }, 1],
              m: { e: { r: 11 } },
              n: { d: 19, i: { e: { s: 111 } } },
              r: {
                a: 11,
                c: 0,
                e: { s: 5 },
                i: { c: 0, l: 0 },
                k: 5,
                t: [{ e: 12 }, 8]
              },
              s: { p: 4, s: 23, t: 12 },
              t: [{ e: { n: 5 }, h: { i: 12 }, i: { f: 19 }, u: 83 }, 9],
              v: [{ e: { n: 11 }, i: 5, o: 5 }, 9]
            },
            b: [{ e: { l: { ".": 21, s: 21 }, n: 21 }, i: { t: 21 }, r: 23 }, 42],
            c: {
              a: { d: 21, n: { c: 6 } },
              c: { a: 6 },
              e: [{ s: { s: { a: 4 } } }, 29],
              i: [
                {
                  b: 21,
                  f: { i: { c: { a: { t: 4 } }, e: 4 }, y: 4 },
                  m: 3,
                  t: [{ e: 19 }, 0]
                },
                9
              ],
              l: { a: { m: 21 }, u: { s: 21 } },
              o: {
                l: 24,
                m: { m: 21, p: { e: 21 } },
                n: { c: 21 },
                r: [{ a: 3, o: 5 }, 24]
              },
              r: [{ e: { m: 21 } }, 29],
              t: { a: { n: 1 }, e: 1 },
              u: [{ l: [{ a: 3 }, 21] }, 29],
              h: { a: { s: 23 } }
            },
            d: {
              a: 37,
              d: 61,
              e: { r: 34, s: 0 },
              i: [{ a: 23, b: 3, c: { a: 3 }, m: 3, t: 2, z: 5 }, 18],
              o: [{ l: 21, n: 84 }, 18],
              r: { i: 21 },
              u: { l: [{ o: 4, i: { n: { g: 2 } } }, 21] },
              g: { l: 15 }
            },
            e: {
              c: 9,
              d: { i: 11 },
              f: 9,
              l: { i: 11, y: 1 },
              m: 9,
              n: { a: 1 },
              p: 85,
              s: [{ t: 17 }, 86],
              t: { y: 1 },
              x: 19
            },
            f: [
              {
                e: { r: { e: 83 } },
                f: 41,
                i: {
                  c: [{ i: 32 }, 21],
                  l: 17,
                  n: { e: 23, i: { t: { e: 20 } } },
                  t: 27
                },
                o: { r: { e: { s: 6 } } },
                u: { s: { e: { ".": 21 } } }
              },
              29
            ],
            g: {
              a: { l: 18 },
              e: { r: 17 },
              i: { b: 4, c: 1, n: { g: 4 }, t: 87 },
              n: 4,
              o: { ".": 21, s: 21 },
              u: { l: 2, r: 19 },
              y: 32
            },
            h: [{ e: { r: 17 } }, 72],
            i: [
              {
                c: 19,
                d: 4,
                g: [{ l: 4 }, 8],
                m: { b: 23 },
                n: { f: 23, g: 29, s: { t: 19 } },
                r: { d: 0 },
                t: { e: 11, h: 3, y: 19 }
              },
              9
            ],
            j: [{ u: { d: [{ i: 4 }, 21] } }, 29],
            k: { i: { n: 0 }, l: { a: 1 } },
            l: {
              a: [
                {
                  ".": 21,
                  c: 21,
                  n: { d: 17 },
                  t: { i: { v: 4 } },
                  w: 21,
                  x: { a: 36 }
                },
                29
              ],
              e: {
                a: 23,
                b: { r: { a: 4 } },
                c: 32,
                d: 21,
                g: { a: 3 },
                n: 19,
                r: 34,
                s: 29
              },
              f: 9,
              i: [
                {
                  b: { e: 23 },
                  c: { ".": 33, a: 3 },
                  e: { r: 23 },
                  g: { i: { b: 4 } },
                  m: 19,
                  n: { g: 83 },
                  o: 23,
                  s: [{ h: 4 }, 24],
                  v: 88,
                  t: { i: { s: 208 } }
                },
                9
              ],
              l: { a: [{ b: 1 }, 18], o: 17 },
              o: { c: 19, g: 4, p: { ".": 3 }, a: 29 },
              s: { h: 9 },
              t: { a: 1 },
              u: { d: 19, g: 4 }
            },
            m: {
              a: { c: 21, g: 21, n: [{ a: 4 }, 19] },
              b: 4,
              e: [{ l: 24, t: 21 }, 29],
              i: {
                c: { a: 3 },
                e: 0,
                g: { r: { a: 4 } },
                n: [{ e: 4, i: 35 }, 89],
                s: [{ h: 4, s: 19 }, 21],
                z: 3
              },
              n: { i: { z: 32 } },
              o: { g: 0, n: { i: { o: 7 } } },
              p: { i: 3 },
              u: { l: [{ a: 4 }, 21], n: 11 },
              y: 23
            },
            n: {
              a: { m: { o: 4 }, n: { t: 21 } },
              c: { h: { e: { r: 17 } } },
              d: { i: { c: 3, x: 2 } },
              e: {
                a: 19,
                e: 19,
                m: 3,
                r: { o: 4 },
                s: { i: 4, t: 4 },
                t: { r: 3 },
                w: 23
              },
              i: {
                c: { s: 4 },
                e: 19,
                l: 19,
                o: 23,
                s: { h: 3 },
                t: 3,
                u: 19,
                z: 32
              },
              n: 18,
              o: [{ g: 0, s: 21, v: 3 }, 18],
              s: { w: 1 },
              t: { a: { g: { e: 5 } }, h: { e: { s: 18 } } },
              u: { a: 3, f: 4 },
              y: { ".": 23 },
              z: 61
            },
            o: {
              f: 19,
              g: [{ r: { a: { p: 3 } } }, 9],
              i: 90,
              l: 23,
              p: { a: { r: 11 } },
              r: [{ e: 3, o: { l: 4 } }, 29],
              s: 0,
              t: [{ o: 1 }, 21],
              u: { t: 19 },
              w: 19
            },
            p: {
              a: [{ i: 23, n: { c: 4 } }, 24],
              e: { l: 19, n: { t: 23 }, t: { i: { t: { i: { o: 4 } } } } },
              h: { e: 17 },
              l: { i: 21 },
              o: 29,
              r: { e: { c: [{ a: 4 }, 21], d: 21, h: 3 }, o: [{ b: 21 }, 23] },
              s: { h: 1 },
              t: { i: { b: 13 } },
              u: { t: [{ a: 4 }, 21] },
              i: { n: { e: { p: { h: 209 } } } }
            },
            q: [{ u: { i: { l: 12, s: 91 } } }, 29],
            r: {
              a: [{ b: 0, n: { d: 18 }, r: 3, t: { i: { ".": 18 } } }, 2],
              b: [{ l: 1 }, 25],
              c: { h: [{ e: 1 }, 3] },
              e: {
                ".": 25,
                a: { l: 23 },
                c: { o: 5 },
                i: { n: 11 },
                l: { ".": 4 },
                m: { o: 3 },
                n: { a: 4, c: { e: 4 }, e: 18, t: 3 },
                q: 0,
                s: { s: 4, t: 3 },
                t: 17
              },
              h: 2,
              i: [
                {
                  a: [{ n: { ".": 210 } }, 92],
                  c: { k: 32 },
                  e: { n: 23, r: 0 },
                  n: { e: 3 },
                  o: 29,
                  t: 18,
                  u: 1,
                  v: [{ a: 21 }, 0]
                },
                2
              ],
              m: 93,
              n: { i: { s: 1, t: 18, z: 32 }, o: 3 },
              o: [{ b: 4, c: 19, r: 0, u: 2 }, 25],
              s: [{ e: { t: 3 } }, 2],
              t: { e: { r: 11 }, l: 18, w: 3 },
              u: [{ t: 0 }, 18],
              w: { a: { u: 32 } }
            },
            s: {
              a: [{ g: { e: { ".": 21, s: 21 } } }, 72],
              c: [{ a: [{ n: 4 }, 24], r: 23, u: 4 }, 9],
              e: [
                {
                  c: [{ r: 4 }, 24],
                  n: { c: 4 },
                  r: { t: { ".": 21, s: 21 }, v: { a: 21 } }
                },
                74
              ],
              h: [{ a: 23, e: { n: 5 } }, 18],
              i: [
                {
                  c: 24,
                  d: [{ e: { n: 4 } }, 24],
                  g: { n: { a: 4 } },
                  m: 94,
                  n: 95,
                  s: { t: { e: 17 } },
                  u: 0
                },
                29
              ],
              k: { i: { n: 19 } },
              m: { i: 1 },
              o: { l: [{ u: 3 }, 24], n: [{ a: 4 }, 24] },
              p: [
                {
                  e: { r: 3 },
                  i: { r: { a: 4 } },
                  r: { e: 1 },
                  a: { c: { i: 211 } }
                },
                29
              ],
              s: [{ i: { b: 96 } }, 25],
              t: {
                a: { n: 36 },
                i: { g: 3, m: 4 },
                o: [{ n: 23 }, 44],
                r: [{ o: 19, u: { c: 10 } }, 25]
              },
              u: { r: [{ r: 4 }, 24] },
              w: 1
            },
            t: {
              a: { b: 0 },
              e: { n: { d: 17 }, o: 23 },
              h: { o: { d: 54 }, y: { l: { e: { n: { e: 162 } } } } },
              i: {
                c: 2,
                d: { e: 19 },
                n: [{ o: 0 }, 17],
                r: 19,
                t: { i: { o: 19, v: 4 } }
              },
              n: 18,
              o: { n: { a: 4 } },
              r: { a: 23, e: 23, i: { c: 3, f: 4 }, o: { g: 3, s: 4 } },
              u: { a: 3 },
              y: { m: 4 },
              z: 4
            },
            u: [
              {
                n: 19,
                p: 23,
                r: { o: 3 },
                s: 0,
                t: { e: 17, i: { l: 6 }, r: 4 },
                c: { l: { i: { d: 212 } } }
              },
              18
            ],
            v: {
              a: { p: 97, s: [{ t: 4 }, 24] },
              e: {
                a: 19,
                l: { l: 3, o: 12 },
                n: { g: 19, i: 17 },
                r: [{ b: 19 }, 2]
              },
              i: [{ d: 3, l: 0, n: 21, v: 0 }, 29],
              o: { c: 19 },
              u: 19
            },
            w: {
              a: [{ g: 21 }, 29],
              e: { e: 19 },
              h: 23,
              i: { l: 6, n: { g: 3 }, t: 23 }
            },
            x: { p: 41 },
            y: { c: 32, e: { ".": 32 }, s: 0 }
          },
          f: {
            a: [
              {
                b: { l: 3, r: 11 },
                c: { e: 1 },
                g: 18,
                i: { n: 17 },
                l: { l: { e: 6 } },
                m: { a: 26, i: { s: 5 } },
                r: [{ t: { h: 5 } }, 32],
                t: { a: 3, h: { e: 3 }, o: 18 },
                u: { l: { t: 7 } }
              },
              41
            ],
            b: 56,
            d: 18,
            e: {
              ".": 18,
              a: { s: 17, t: { h: 54 } },
              b: [{ r: { u: { a: 15 } } }, 1],
              c: { a: 18, t: 32 },
              d: 25,
              l: { i: 3 },
              m: { o: 1 },
              n: { d: [{ e: 6 }, 8] },
              r: [{ r: 32, m: { i: { o: 213 } } }, 15],
              v: 0
            },
            f: [
              {
                e: { s: 21 },
                i: { e: 21, n: { ".": 19 }, s: 94 },
                l: { y: 21 },
                y: 24
              },
              43
            ],
            h: 18,
            i: [
              {
                a: 3,
                c: {
                  ".": 48,
                  a: { l: 47, n: 23, t: { e: 18 } },
                  e: { n: 23, r: 3 },
                  i: [{ a: 32, e: 32 }, 0],
                  s: 18,
                  u: 3,
                  h: 27
                },
                d: { e: { l: 4 } },
                g: { h: { t: 7 } },
                l: { i: 5, l: { i: { n: 6 } }, y: 18 },
                n: [{ a: 32, d: 97, e: 9, g: 98, n: 0 }, 25],
                s: { t: { i: 0 } },
                t: { t: { e: { d: { ".": 5 } } } }
              },
              41
            ],
            l: [
              {
                e: { s: { s: 19 } },
                i: { n: 17 },
                o: { r: { e: 11 }, w: { e: { r: { ".": 84 } } } },
                y: 100,
                a: { g: { e: { l: 214 } } },
                u: { o: { r: 27 } }
              },
              99
            ],
            m: 18,
            n: 18,
            o: [
              {
                n: [{ d: { e: 0 }, t: 0 }, 32],
                r: [{ a: { t: 4, y: 5 }, e: { t: 6 }, i: 0, t: { a: 6 } }, 9],
                s: 5
              },
              41
            ],
            p: 56,
            r: {
              a: { t: 0 },
              e: { a: 19, s: { c: 6 } },
              i: [{ l: 17 }, 8],
              o: { l: 6 }
            },
            s: 48,
            t: [{ o: 21, y: 24 }, 25],
            u: [
              {
                e: { l: 4 },
                g: 18,
                m: { i: { n: 1 } },
                n: { e: 4 },
                r: { i: 3 },
                s: { i: 17, s: 0 },
                t: { a: 18 }
              },
              27
            ],
            y: 41
          },
          g: {
            a: [
              {
                f: 0,
                l: { ".": 32, i: 27, o: 3 },
                m: [{ e: { t: 4 }, o: 19 }, 25],
                n: { i: { s: 5, z: [{ a: 6 }, 3] }, o: 18 },
                r: { n: 67 },
                s: { s: 17 },
                t: { h: 12, i: { v: 18 } },
                z: 18
              },
              41
            ],
            b: 23,
            d: 1,
            e: {
              ".": 25,
              d: 25,
              e: { z: 17 },
              l: { i: { n: 0, s: 4, z: 4 }, y: 18 },
              n: [
                { a: { t: 1 }, i: { z: 4 }, o: 18, y: 18, c: { y: { ".": 8 } } },
                41
              ],
              o: [{ m: 3, d: 215 }, 41],
              r: { y: 21 },
              s: { i: 32 },
              t: { h: 6, o: 18, y: 1, i: { c: { ".": 8 } } },
              v: 1
            },
            g: [{ e: [{ r: 23 }, 24], l: { u: 6 }, o: 0 }, 101],
            h: { i: { n: 3 }, o: { u: { t: 4 } }, t: { o: 1, w: { e: 15 } } },
            i: {
              ".": 32,
              a: [{ r: 5 }, 102],
              c: [{ i: { a: 32 }, o: 21 }, 29],
              e: { n: 6, s: { ".": 32 } },
              l: 0,
              m: { e: { n: 23 } },
              n: { ".": 68, g: { e: 5 }, s: 103 },
              o: 32,
              r: [{ l: 0 }, 27],
              s: { l: 23 },
              u: 1,
              v: 32,
              z: 27
            },
            l: [
              {
                a: [{ d: { i: 6 }, s: 32 }, 0],
                e: [{ a: { d: 29 } }, 41],
                i: { b: 0, g: 23, s: { h: 43 } },
                o: [{ r: 11, b: { i: { n: 106 } } }, 27]
              },
              9
            ],
            m: [{ y: 21 }, 29],
            n: {
              a: [{ ".": 21, c: 69 }, 1],
              e: { t: { t: 17, i: { s: { m: 137 } } } },
              i: [{ n: 24, o: 21 }, 29],
              o: [{ n: 21, m: { o: 5 }, r: { ".": 216, e: { s: { p: 24 } } } }, 29]
            },
            o: [
              {
                ".": 27,
                b: 5,
                e: 32,
                g: 104,
                i: { s: 3 },
                n: [{ a: 105, d: { o: 7 }, i: [{ z: { a: 217 } }, 3] }, 8],
                o: 32,
                r: { i: { z: 4 }, o: { u: 5 } },
                s: { ".": 32 },
                v: 15
              },
              41
            ],
            p: 23,
            r: [
              {
                a: {
                  d: { a: 18 },
                  i: 21,
                  n: 84,
                  p: {
                    h: { ".": 32, e: { r: [{ ".": 7 }, 19] }, i: { c: 32 }, y: 18 }
                  },
                  y: 18
                },
                e: { n: 0, s: { s: { ".": 18 } } },
                i: { t: 18, e: { v: 213 } },
                o: 21,
                u: { f: 17 }
              },
              41
            ],
            s: [{ t: { e: 19 } }, 9],
            t: { h: 11 },
            u: {
              a: [{ r: { d: 27 } }, 1],
              e: 25,
              i: { t: 106 },
              n: 27,
              s: 27,
              t: [{ a: { n: 29 } }, 26]
            },
            w: 23,
            y: [{ n: 107, r: { a: 4 } }, 41]
          },
          h: {
            a: {
              b: { l: 73 },
              c: { h: 17 },
              e: { m: 0, t: 0 },
              g: { u: 19 },
              l: { a: [{ m: 12 }, 3] },
              m: 1,
              n: {
                c: { i: 0, y: 0 },
                d: { ".": 32 },
                g: [{ e: { r: 6 }, o: 6 }, 0],
                i: { z: 108 },
                k: 0,
                t: { e: 0 }
              },
              p: { l: 11, t: 5, a: { r: { r: 218 } } },
              r: {
                a: { n: 3, s: 4 },
                d: [{ e: 12 }, 8],
                l: { e: 0 },
                p: { e: { n: 6 } },
                t: { e: { r: 5 } }
              },
              s: { s: 5 },
              u: { n: 17 },
              z: [{ a: 11 }, 32],
              i: { r: { s: 137 } },
              t: { c: { h: 213 } }
            },
            b: 29,
            e: {
              a: { d: 41, r: 27 },
              c: { a: { n: 1, t: 19 } },
              d: [{ o: 13 }, 21],
              l: { i: 93, l: { i: { s: 0 }, y: 0 }, o: 19 },
              m: { p: 0 },
              n: [{ a: [{ t: 5 }, 17] }, 9],
              o: { r: 5 },
              p: 5,
              r: {
                a: [{ p: 12 }, 21],
                b: { a: 0 },
                e: { a: 6 },
                n: 23,
                o: { u: 19 },
                y: 23
              },
              s: [{ p: 64 }, 29],
              t: [{ e: { d: 0 } }, 1],
              u: 0,
              x: { a: 168 }
            },
            f: 29,
            h: 29,
            i: {
              a: { n: 4 },
              c: { o: 1 },
              g: { h: 6 },
              l: 109,
              m: { e: { r: 36 } },
              n: { a: 21 },
              o: { n: { e: 17 } },
              p: [{ e: { l: { a: 219 } } }, 1],
              r: { l: 0, o: 3, p: 0, r: 0 },
              s: { e: { l: 11 }, s: 0 },
              t: { h: { e: { r: 6 } }, e: { s: { i: { d: 12 } } } },
              v: 9
            },
            k: 18,
            l: [{ a: { n: 17 }, o: [{ r: { i: 11 } }, 24] }, 80],
            m: [{ e: { t: 17 } }, 43],
            n: [{ a: { u: { z: 12 } } }, 42],
            o: {
              d: { i: { z: 19 }, s: 19 },
              g: [{ e: 17 }, 1],
              l: { a: { r: 5 }, e: 110 },
              m: { a: 1, e: 12 },
              n: { a: 0, y: 4 },
              o: { d: 27, n: 17 },
              r: { a: { t: 5 }, i: { s: 4, c: { ".": 187 } }, t: { e: 12 }, u: 4 },
              s: { e: [{ n: 4 }, 0], p: 15 },
              u: { s: [{ e: 54 }, 41] },
              v: { e: { l: 5 } }
            },
            p: 56,
            r: [{ e: { e: 6 }, o: { n: { i: { z: 5 } }, p: { o: 11 } } }, 26],
            s: [{ h: 21 }, 101],
            t: { a: { r: 21 }, e: { n: 2, s: 4, o: { u: 216 } }, y: 21 },
            u: {
              g: 1,
              m: { i: { n: 1 } },
              n: { k: { e: 5 }, t: 0 },
              s: { t: 14 },
              t: 1
            },
            w: [{ a: { r: { t: 21 } } }, 29],
            y: { p: { e: 3, h: 3, o: { t: { h: { a: 137 } } } }, s: 9 }
          },
          i: {
            a: [
              {
                l: 24,
                m: [{ e: { t: { e: 5 } } }, 0],
                n: [{ c: 18, i: 11, t: 46 }, 24],
                p: { e: 4 },
                s: { s: 17 },
                t: { i: { v: 21 }, r: { i: { c: 1 } }, u: 21 }
              },
              42
            ],
            b: {
              e: [{ r: { a: 3, t: 4 } }, 0],
              i: { a: 4, n: 3, t: { ".": 4, e: 4 } },
              l: [{ i: 3 }, 29],
              o: 19,
              r: [{ i: 94 }, 29],
              u: { n: 19 }
            },
            c: {
              a: { m: 18, p: 32, r: [{ ".": 21, a: 21 }, 18], s: 6, y: 21 },
              c: { u: 17 },
              e: { o: 18 },
              h: 18,
              i: [{ d: 19, n: { a: 4 }, p: [{ a: 3 }, 24] }, 25],
              l: { y: 21 },
              o: { c: 94 },
              r: [{ a: 32, y: 21 }, 43],
              t: { e: 1, u: [{ a: 111 }, 84] },
              u: { l: { a: 3 }, m: 1, o: 4, r: 23 }
            },
            d: [
              {
                a: { i: 21, n: { c: 4 } },
                d: 4,
                e: { a: { l: 11 }, s: 0 },
                i: [
                  { a: { n: 4, r: 0 }, e: 19, o: [{ u: 5, s: 1 }, 3], t: 2, u: 4 },
                  24
                ],
                l: { e: 23 },
                o: { m: 21, w: 3 },
                r: 21,
                u: [{ o: 4 }, 24]
              },
              25
            ],
            e: [
              {
                d: { e: 0 },
                g: { a: 113 },
                l: { d: 12 },
                n: { a: 67, e: 0, n: 19, t: { i: 23 } },
                r: { ".": 29 },
                s: { c: 23, t: 29 },
                t: 23
              },
              112
            ],
            f: {
              ".": 18,
              e: { r: { o: 4 } },
              f: { e: { n: 5 }, r: 1 },
              i: { c: { ".": 18 }, e: 23 },
              l: 23,
              t: 18,
              a: { c: { e: { t: 137 } } }
            },
            g: [
              {
                a: { b: 5 },
                e: { r: { a: 3 } },
                h: { t: { i: 12 } },
                i: [{ b: 23, l: 3, n: 3, t: 3 }, 18],
                l: 28,
                o: [{ r: 3, t: 4 }, 24],
                r: { e: 19 },
                u: { i: 5, r: 2 },
                n: { i: { t: [{ e: { r: 213 } }, 0] } }
              },
              25
            ],
            h: 23,
            i: 114,
            j: [{ k: 21 }, 23],
            k: 18,
            l: {
              a: [{ b: 93, d: { e: 21 }, m: 94, r: { a: 5 } }, 29],
              e: { g: 23, r: 2, v: 17 },
              f: 4,
              i: [{ a: 3, b: 9, o: 3, s: { t: 1 }, t: 25, z: 9 }, 2],
              l: { a: { b: 5 } },
              n: 18,
              o: { q: 3 },
              t: { y: 1 },
              u: { r: 4 },
              v: 3
            },
            m: {
              a: { g: [{ e: 3 }, 21], r: { y: 5 } },
              e: { n: { t: { a: { r: 10 } } }, t: 18 },
              i: [{ d: { a: 4 }, l: { e: 5 }, n: { i: 19 }, t: 18 }, 2],
              n: { i: 1 },
              o: { n: 23 },
              u: [{ l: { a: 3 } }, 24],
              p: { e: { d: { a: 201 } } }
            },
            n: {
              ".": 25,
              a: { u: 83, v: 18 },
              c: { e: { l: 36, r: 3 } },
              d: [{ l: { i: { n: { g: 4 } } } }, 18],
              e: [{ e: 23, r: { a: { r: 17 } }, s: { s: 19 } }, 25],
              g: {
                a: 18,
                e: [{ n: 4 }, 18],
                i: 18,
                l: { i: { n: { g: 4 } } },
                o: 18,
                u: 18
              },
              i: [
                {
                  ".": 19,
                  a: 21,
                  o: 3,
                  s: 2,
                  t: { e: { ".": 19, l: { y: { ".": 19 } } }, i: { o: 32 }, y: 3 }
                },
                25
              ],
              k: 18,
              l: 18,
              n: 25,
              o: [{ c: 90, s: 0, t: 21 }, 42],
              s: [{ e: 3, u: { r: { a: 7 } } }, 25],
              t: { ".": 25, h: 112 },
              u: [{ s: 19 }, 2],
              y: 18,
              f: { r: { a: { s: 220 } } }
            },
            o: [
              {
                ".": 18,
                g: { e: 17, r: 9 },
                l: 29,
                m: 1,
                n: { a: { t: 11 }, e: { r: { y: 0 } }, i: 11 },
                p: { h: 4 },
                r: { i: 11 },
                s: 21,
                t: { h: 4, i: 19, o: 1 },
                u: { r: 21 }
              },
              25
            ],
            p: [
              {
                e: 0,
                h: { r: { a: { s: 115 } } },
                i: [{ c: 1 }, 3],
                r: { e: 96 },
                u: { l: 3 }
              },
              25
            ],
            q: { u: { a: 23, e: { f: 4 }, i: { d: 3, t: 116 } } },
            r: [
              {
                a: [{ b: 0, c: 21 }, 29],
                d: { e: 5 },
                e: { d: { e: 0 }, f: 21, l: 117, s: 21 },
                g: { i: 4 },
                i: [{ d: { e: 5 }, s: 1, t: { u: 11 }, z: 118 }, 2],
                m: { i: { n: 1 } },
                o: { g: 0, n: { ".": 32 } },
                u: { l: 4 },
                r: { e: { v: { o: { c: 221 } } } }
              },
              18
            ],
            s: {
              ".": 25,
              a: { g: 4, r: 3, s: 6 },
              c: [{ h: 3 }, 119],
              e: [{ r: 3 }, 18],
              f: 27,
              h: { a: { n: 4 }, o: { n: 3, p: 5 } },
              i: { b: 3, d: 0, s: 19, t: { i: { v: 4 } } },
              k: 26,
              l: { a: { n: 36 } },
              m: { s: 18 },
              o: [{ m: { e: { r: 5 } } }, 24],
              p: [{ i: 9, y: 1 }, 2],
              s: [{ a: { l: 1 }, e: { n: 36, s: 1 } }, 62],
              t: { a: { ".": 1 }, e: 2, i: 2, l: { y: 0 }, r: { a: { l: 18 } } },
              u: [{ s: 4 }, 24]
            },
            t: {
              a: { ".": 18, b: { i: 0 }, g: 21, m: 120, n: 23, t: 23 },
              e: [{ r: { a: 3, i: 19 }, s: [{ i: { m: { a: 29 } } }, 1] }, 25],
              h: [{ i: { l: 148 } }, 25],
              i: [
                {
                  a: 18,
                  c: [{ a: 3, k: 31 }, 22],
                  g: 3,
                  l: { l: 4 },
                  m: 24,
                  o: 25,
                  s: [{ m: 21 }, 18],
                  n: { e: { r: { a: { r: 158 } } } }
                },
                29
              ],
              o: { m: 121, n: 18 },
              r: { a: { m: 21 }, y: 4 },
              t: 18,
              u: { a: { t: 3 }, d: 19, l: 3 },
              z: { ".": 18 }
            },
            u: 29,
            v: [
              {
                e: { l: { l: 3 }, n: { ".": 3 }, r: { ".": 83, s: { ".": 21 } } },
                i: { l: { ".": 4 }, o: 4, t: 2 },
                o: { r: { e: 19, o: 35 }, t: 83 }
              },
              25
            ],
            w: 56,
            x: { o: 1 },
            y: 18,
            z: { a: { r: 18 }, i: 0, o: { n: { t: 32 } } }
          },
          j: {
            a: [
              {
                c: { q: 0 },
                p: [{ a: { n: { e: { s: 220 } } } }, 1],
                n: { u: { a: 12 } }
              },
              32
            ],
            e: [
              {
                r: { s: 5, e: { m: 222 } },
                s: { t: { i: { e: 18 }, y: 18 } },
                w: 11
              },
              41
            ],
            o: { p: 1 },
            u: { d: { g: 32 } }
          },
          k: {
            a: { ".": 27, b: 23, g: 19, i: { s: 17 }, l: 0 },
            b: 29,
            e: {
              d: 24,
              e: 41,
              g: 1,
              l: { i: [{ n: { g: 223 } }, 4] },
              n: { d: 73 },
              r: 29,
              s: [{ t: { ".": 23 } }, 0],
              t: { y: 1 }
            },
            f: 23,
            h: 1,
            i: [
              {
                ".": 32,
                c: 122,
                l: { l: 21, o: 6 },
                m: 21,
                n: {
                  ".": 21,
                  d: { e: 0 },
                  e: { s: { s: 19 }, t: { i: { c: 224 } } },
                  g: 0
                },
                p: 1,
                s: [{ h: 19 }, 0]
              },
              29
            ],
            k: 1,
            l: [{ e: { y: 18 }, y: 18 }, 29],
            m: 29,
            n: { e: { s: 19 }, o: 69 },
            o: { r: 4, s: { h: 17 }, u: 23, v: { i: { a: { n: 41 } } } },
            r: { o: { n: 5 } },
            s: [{ c: 21, l: 1, y: 21, h: { a: 23 } }, 101],
            t: 19,
            w: 29
          },
          l: {
            a: {
              b: { i: { c: 11 }, o: 21 },
              c: { i: [{ e: 225 }, 17] },
              d: { e: 21, y: 3 },
              g: { n: 0 },
              m: { o: 11 },
              n: { d: [{ l: 0 }, 27], e: { t: 5 }, t: { e: 0 } },
              r: { g: 0, i: 11, c: { e: { n: 176 } } },
              s: { e: 0 },
              t: { a: { n: 4 }, e: { l: { i: 18 } }, i: { v: 18 } },
              v: [{ a: 95 }, 18],
              i: { n: { e: { s: { s: 226 } } } }
            },
            b: [{ i: { n: 17 } }, 42],
            c: [{ e: 0, i: 23, h: { a: { i: 23 }, i: { l: { d: 227 } } } }, 101],
            d: [
              {
                e: [{ r: { e: 1, i: 1 } }, 24],
                i: [{ s: 4 }, 0],
                r: [{ i: 21 }, 23]
              },
              25
            ],
            e: {
              a: [{ d: { e: { r: { ".": 183 } } }, s: { a: 228 } }, 9],
              b: { i: 1 },
              f: { t: 6 },
              g: { ".": 32, g: 32, e: { n: { d: { r: { e: 230 } } } } },
              m: { a: { t: [{ i: { c: 5 } }, 1] } },
              n: { ".": 18, c: 27, e: { ".": 32 }, t: 41, o: { i: { d: 78 } } },
              p: { h: 3, r: 1 },
              r: { a: { b: 6 }, e: 0, g: 27, i: 68, o: 21 },
              s: [{ c: { o: 4 }, q: 32, s: [{ ".": 32 }, 27] }, 8],
              v: { a: 23, e: { r: { ".": 0, a: 0, s: 0 } } },
              y: [{ e: 18 }, 27],
              c: { t: { a: { b: 229 } } }
            },
            f: [{ r: 19 }, 25],
            g: [{ a: [{ r: 12 }, 19], e: { s: 21 }, o: 11 }, 80],
            h: 48,
            i: {
              a: { g: 1, m: 9, r: { i: { z: 6 } }, s: 1, t: { o: 1 } },
              b: { i: 4 },
              c: { i: { o: 32 }, o: { r: 1 }, s: 18, t: { ".": 18 }, u: 21, y: 23 },
              d: { a: 23, e: { r: 5 }, i: 27 },
              f: { e: { r: 11 }, f: 21, l: 1 },
              g: { a: { t: { e: 32 } }, h: 27, r: { a: 1 } },
              k: 27,
              l: 123,
              m: { b: { l: 0 }, i: 11, o: 1, p: 90 },
              n: { a: 21, e: [{ a: 11 }, 124], i: 11, k: { e: { r: 6 } } },
              o: { g: 4 },
              q: 125,
              s: { p: 0 },
              t: [{ ".": 24, i: { c: { a: 32, s: 108 } }, h: { o: { g: 204 } } }, 29],
              v: { e: { r: 11 } },
              z: 29
            },
            j: 18,
            k: { a: [{ l: 23, t: 0 }, 11] },
            l: [
              {
                a: { w: 21 },
                e: [{ a: 19, c: 23, g: 23, l: 23, n: 73, t: 73 }, 24],
                i: [{ n: [{ a: 19 }, 126], s: { h: 231 } }, 9],
                o: [{ q: { u: { i: 10 } }, u: { t: 4 }, w: 19 }, 1],
                f: { l: 2 }
              },
              29
            ],
            m: [
              {
                e: { t: 19 },
                i: { n: { g: 3 } },
                o: { d: 21, n: [{ e: { l: { l: 232 } } }, 17] }
              },
              25
            ],
            n: 81,
            o: {
              ".": 27,
              b: { a: { l: 5 }, o: { t: { o: 233 } } },
              c: { i: 1 },
              f: 18,
              g: { i: { c: 27 }, o: 19, u: 27, e: { s: { ".": 9 } } },
              m: { e: { r: 11 } },
              n: { g: 32, i: [{ z: 127 }, 0] },
              o: { d: 6 },
              p: { e: { ".": 32 }, i: 11, m: 23 },
              r: { a: [{ t: { o: 1 } }, 17], i: { e: 4 }, o: { u: 5 } },
              s: {
                ".": 32,
                e: { t: 5 },
                o: { p: { h: { i: { z: 32 }, y: 32 } } },
                t: 0
              },
              t: { a: 1 },
              u: { n: { d: 6 }, t: 25 },
              v: 18,
              a: { d: { e: { d: { ".": 17 }, r: { ".": 183 } } } }
            },
            p: [
              {
                a: { b: 5 },
                h: { a: 23, i: 19 },
                i: { n: { g: 4 }, t: 23 },
                l: 21,
                r: 19
              },
              25
            ],
            r: 43,
            s: [{ c: 21, e: 24, i: { e: 21 } }, 81],
            t: [
              {
                a: { g: 4, n: { e: 7 } },
                e: [{ n: 17, r: { a: 36 }, a: 23 }, 29],
                h: { i: [{ l: { y: 148 } }, 11] },
                i: { e: { s: { ".": 19 } }, s: 17 },
                r: 29,
                u: [{ r: { a: 12 } }, 8]
              },
              18
            ],
            u: {
              a: 4,
              b: { r: 3 },
              c: { h: 17, i: 3 },
              e: { n: 3, p: 15 },
              f: 0,
              i: { d: 4 },
              m: {
                a: 1,
                i: 32,
                n: { ".": 19, i: { a: 32 } },
                b: { i: { a: { ".": 235 } } }
              },
              o: [{ r: 11 }, 3],
              p: 18,
              s: { s: 17, t: { e: 11 } },
              t: 41,
              n: { k: { e: { r: 234 } } }
            },
            v: { e: { n: 19, t: 128 } },
            w: 42,
            y: [
              {
                a: 18,
                b: 18,
                m: { e: 4 },
                n: { o: 3 },
                s: [{ e: 19, t: { y: { r: 4 } } }, 58],
                g: { a: { m: { i: 236 } } }
              },
              41
            ]
          },
          m: {
            a: [
              {
                b: 25,
                c: { a: 9, h: { i: { n: { e: 4 } } }, l: 1 },
                g: { i: { n: 5 }, n: 32 },
                h: 25,
                i: { d: 6 },
                l: {
                  d: 18,
                  i: { g: 3, n: 4 },
                  l: { i: 0 },
                  t: { y: 0 },
                  a: { p: 222 }
                },
                n: { i: { a: 32, s: 5, z: 11 }, ".": 24, u: { s: { c: 237 } } },
                p: [{ h: { r: { o: 244 } } }, 18],
                r: {
                  i: { n: { e: { ".": 4 } }, z: 4 },
                  l: { y: 0 },
                  v: 11,
                  g: { i: { n: 238 } }
                },
                s: { c: { e: 4 }, e: 0, t: 15 },
                t: { e: 32, h: 12, i: { s: 3, z: { a: 18 } } }
              },
              41
            ],
            b: [{ a: { t: 129 }, i: { l: 19, n: { g: 83 }, v: 0 } }, 43],
            c: 56,
            e: {
              ".": 18,
              d: [
                {
                  ".": 18,
                  i: { a: 32, e: 3, c: [{ i: { n: 152 } }, 84], o: { c: 239 } },
                  y: 108
                },
                25
              ],
              g: [{ r: { a: { n: 240 } } }, 9],
              l: { o: { n: 5 }, t: 0 },
              m: [{ o: 130 }, 9],
              n: [
                {
                  a: [{ c: 5 }, 0],
                  d: { e: 0 },
                  e: 18,
                  i: 0,
                  s: [{ u: 7 }, 17],
                  t: [{ e: 0 }, 27],
                  ".": 24
                },
                41
              ],
              o: { n: 4 },
              r: { s: { a: 19 } },
              s: [{ t: { i: 27 } }, 25],
              t: {
                a: [{ l: 11 }, 1],
                e: 2,
                h: { i: 4 },
                r: [{ i: { c: 32, e: 4 }, y: 3 }, 21]
              },
              v: 1
            },
            f: 43,
            h: 25,
            i: {
              ".": 32,
              a: 3,
              d: { a: [{ b: 241 }, 0], g: 0 },
              g: 0,
              l: {
                i: { a: 27, e: 108, t: { a: 27 } },
                l: [{ a: { g: 208 }, i: { l: { i: 59 } } }, 21]
              },
              n: {
                a: 0,
                d: 27,
                e: { e: 19 },
                g: { l: [{ i: 5, y: 19 }, 21] },
                t: 0,
                u: [{ t: { e: { r: 242, s: { t: 242 } } } }, 21],
                i: { s: { ".": 174 } }
              },
              o: { t: 17 },
              s: [{ e: { r: { ".": 0 } }, l: 5, t: { i: 0, r: { y: 19 } } }, 24],
              t: { h: 18 },
              z: 24
            },
            k: 18,
            l: 43,
            m: [{ a: { r: { y: 5 }, b: 243 } }, 29],
            n: [{ a: 1, i: { n: 21 }, o: 1 }, 43],
            o: [
              {
                c: { r: [{ a: { t: [{ i: { z: 32 } }, 245] } }, 18] },
                d: 131,
                g: { o: 1 },
                i: { s: [{ e: 5 }, 84] },
                k: 18,
                l: { e: { s: { t: 4 }, c: 246 } },
                m: { e: 3 },
                n: {
                  e: { t: 5, y: { l: 247 } },
                  g: { e: 5 },
                  i: { a: 12, s: { m: 0, t: 0 }, z: 3 },
                  o: { l: 36, c: { h: 12 }, e: { n: 171 }, s: 249 },
                  y: { ".": 3 }
                },
                r: [{ a: { ".": 18 }, o: { n: { i: { s: 248 } } } }, 9],
                s: [{ e: { y: 4 }, p: 3 }, 8],
                t: { h: [{ e: { t: 250 } }, 12] },
                u: { f: 19, s: [{ i: { n: 98 } }, 27] },
                v: 9,
                e: { l: { a: { s: 167 } } }
              },
              41
            ],
            p: [
              {
                a: { r: { a: [{ b: 5 }, 7], i: 6 } },
                e: { t: 23 },
                h: { a: { s: 36 } },
                i: [{ a: 0, e: { s: 4 }, n: 34, r: 19, s: 4 }, 24],
                o: { r: { i: 11 }, s: { i: { t: { e: 6 } } }, u: { s: 21 }, v: 6 },
                t: { r: 1 },
                y: 24
              },
              43
            ],
            r: 47,
            s: [{ h: [{ a: { c: { k: 251 } } }, 21], i: 19 }, 101],
            t: 18,
            u: [
              {
                l: { a: { r: 49 }, t: [{ i: [{ u: 252 }, 54] }, 32] },
                m: 27,
                n: 8,
                p: 18,
                u: 1,
                d: { r: { o: 9 } }
              },
              41
            ],
            w: 18
          },
          n: {
            a: [
              {
                b: [{ u: 21 }, 81],
                c: { ".": 18, a: 1, t: 19 },
                g: { e: { r: { ".": 5 } } },
                k: 0,
                l: { i: [{ a: 4 }, 1], t: 18 },
                m: { i: { t: 4 } },
                n: [{ c: { i: 36 }, i: { t: 0 }, k: 17 }, 24],
                r: { c: [{ h: { s: { ".": 73 } } }, 11], e: 18, i: 11, l: 0, m: 19 },
                s: [{ c: 0, t: { i: 5 } }, 21],
                t: [{ a: { l: 3 }, o: { m: { i: { z: 6 } } } }, 24],
                u: [{ s: { e: 11 }, t: 27 }, 24],
                v: { e: 0 }
              },
              41
            ],
            b: 80,
            c: {
              a: { r: 6 },
              e: { s: { ".": 21 } },
              h: { a: 23, e: { o: 19, s: { t: 253 } }, i: { l: 19, s: 23 } },
              i: { n: 2, t: 1 },
              o: { u: { r: { a: 7 } } },
              r: 29,
              u: 29
            },
            d: {
              a: { i: 21, n: 19 },
              e: [{ s: { t: { ".": 4 } } }, 29],
              i: { b: 0, f: 79, t: 29, z: 23, e: { c: { k: 29 } } },
              u: { c: 19, r: 0 },
              w: { e: 9 },
              t: { h: { r: 3 } }
            },
            e: {
              ".": 25,
              a: { r: 23 },
              b: [{ u: 11, a: { c: { k: 3 } } }, 9],
              c: [{ k: 32 }, 9],
              d: 25,
              g: { a: { t: [{ i: { v: 5 } }, 1] }, e: 32 },
              l: { a: 1, i: { z: 5 } },
              m: { i: 4, o: 1 },
              n: [{ e: 18 }, 41],
              o: 27,
              p: { o: 1 },
              q: 9,
              r: [{ a: { b: 6, r: 21 }, e: 24, i: 132, r: 0 }, 29],
              s: [{ ".": 25, p: 18, t: 25, w: 18, k: { i: 119 } }, 41],
              t: { i: { c: 27 } },
              v: [{ e: 19 }, 1],
              w: 1
            },
            f: [{ i: { n: { i: { t: { e: { s: 226 } } } } } }, 23],
            g: {
              a: { b: 21 },
              e: { l: 23, n: { e: [{ s: 5 }, 133] }, r: { e: 19, i: 23 } },
              h: { a: 4, o: 2 },
              i: { b: 23, n: 2, t: 19 },
              l: { a: 21 },
              o: { v: 17 },
              s: { h: 4, p: { r: 2 } },
              u: [{ m: 21 }, 29],
              y: 24
            },
            h: [{ a: [{ b: 12 }, 0], e: 0 }, 80],
            i: {
              a: [{ n: [{ ".": 114 }, 3], p: 1 }, 68],
              b: { a: 3, l: 1 },
              d: [{ i: 4 }, 1],
              e: { r: 1 },
              f: { i: [{ c: { a: { t: 4 } } }, 9] },
              g: { r: 19 },
              k: 0,
              m: [{ i: { z: 3 } }, 29],
              n: [{ e: { ".": 32 }, g: 0 }, 29],
              o: 1,
              s: { ".": 32, t: { a: 0 } },
              t: [{ h: 21, i: { o: 27 }, o: { r: 23 }, r: 3 }, 24]
            },
            j: 29,
            k: [
              { e: { r: { o: 19 }, t: 23 }, i: { n: 3 }, l: 29, r: { u: { p: 3 } } },
              44
            ],
            l: [{ e: { s: { s: 19 } } }, 43],
            m: [{ e: [{ t: 17 }, 0] }, 19],
            n: [{ e: 0, i: { a: { l: 11 }, v: 0 } }, 101],
            o: {
              b: { l: [{ e: 3 }, 0] },
              c: { l: 19, e: { r: { o: { s: 254 } } } },
              d: 66,
              e: 27,
              g: [{ e: 17 }, 18],
              i: { s: { i: 6 } },
              l: { i: 134, o: { g: { i: { s: 32 } } } },
              m: {
                i: { c: 27, z: 108, s: { t: 82 } },
                o: 1,
                y: 3,
                a: { l: 214 },
                e: { n: { o: 194 } }
              },
              n: [{ a: { g: 0 }, i: [{ z: 19, s: { o: 255 } }, 5], e: { q: 15 } }, 1],
              p: [{ o: { l: { i: 135, y: { ".": 256 } } } }, 18],
              r: { a: { b: 5, r: { y: 1 } } },
              s: { c: 18, e: 0, t: 5 },
              t: { a: 4 },
              u: [{ n: 27 }, 41],
              v: { e: { l: 136, m: { b: 2 } } },
              w: { l: 12 }
            },
            p: [{ i: 0, r: { e: { c: 17 } } }, 72],
            q: 29,
            r: [{ u: 0 }, 29],
            s: [
              {
                a: { b: 4, t: { i: 36 } },
                c: [{ e: { i: { v: 4 } } }, 1],
                e: [{ s: 83 }, 24],
                i: { d: 137, g: 17 },
                l: 24,
                m: [{ o: { o: 1 } }, 3],
                o: { c: 21 },
                p: { e: 1, i: 19 },
                t: { a: { b: { l: 6 } } }
              },
              81
            ],
            t: [
              {
                a: { b: 0 },
                e: { r: { s: 12 } },
                i: [{ b: 19, e: { r: 0 }, f: 8, n: { e: 23, g: 83 }, p: 0 }, 9],
                r: { o: { l: { l: { i: 7 } } }, e: { p: 137 } },
                s: 1,
                u: { m: { e: 11 } }
              },
              29
            ],
            u: {
              a: 2,
              d: 1,
              e: { n: 4 },
              f: { f: { e: 0 } },
              i: { n: 23, t: 50 },
              m: [{ e: 2, i: 19 }, 21],
              n: 138,
              o: 23,
              t: { r: 3 }
            },
            v: 74,
            w: 72,
            y: { m: 0, p: 0 },
            z: [{ a: 23 }, 18]
          },
          o: {
            a: [
              {
                d: 11,
                l: { e: { s: 108 } },
                r: { d: 12 },
                s: { e: 0, t: { e: 6 } },
                t: { i: 5 }
              },
              18
            ],
            b: {
              a: { b: 35, r: 19 },
              e: { l: 0 },
              i: [{ n: [{ g: 4 }, 24] }, 29],
              r: 23,
              u: { l: 3 },
              l: { i: { g: 189 } }
            },
            c: {
              e: 29,
              h: [{ e: { t: 23 }, a: { s: 23 } }, 0],
              i: { f: 12, l: 21 },
              l: { a: { m: 21 } },
              o: { d: 21 },
              r: { a: { c: 3, t: { i: { z: 4 } } }, e: 12, i: { t: 32 } },
              t: { o: { r: { a: 7 } } },
              u: { l: { a: 3 }, r: { e: 19 } }
            },
            d: {
              d: { e: { d: 4 } },
              i: { c: 3, o: 11, t: { i: { c: 137 } } },
              o: [{ r: 12 }, 139],
              u: { c: { t: { ".": 4, s: 4 } } },
              e: { l: { l: { i: 12 } } }
            },
            e: {
              l: 21,
              n: { g: 19 },
              r: [{ s: { t: 257 } }, 23],
              t: { a: 1 },
              v: 23
            },
            f: { i: [{ t: { e: 4, t: 17 } }, 24] },
            g: {
              a: { r: 121, t: { i: { v: 4 }, o: 21 } },
              e: [{ n: { e: 19 }, o: 19, r: 21 }, 29],
              i: { e: 23, s: 140, t: 3 },
              l: [{ y: 79 }, 21],
              n: { i: { z: 27 } },
              r: { o: 21 },
              u: { i: 5 },
              y: [{ n: 25 }, 41]
            },
            h: [{ a: { b: 6 } }, 74],
            i: [
              {
                c: { e: { s: 11 } },
                d: { e: { r: 3 } },
                f: { f: 17 },
                g: 0,
                l: { e: { t: 4 } },
                n: { g: 23, t: { e: { r: 6 } } },
                s: { m: 19, o: { n: 4 }, t: { e: { n: 6 } } },
                t: { e: { r: 3 } }
              },
              9
            ],
            j: 19,
            k: [{ e: { n: 23, s: { t: 15 } }, i: { e: 4 } }, 25],
            l: {
              a: [{ n: 21, s: { s: 36 } }, 29],
              d: [{ e: 15 }, 9],
              e: { r: 3, s: { c: 23, t: { e: { r: 88 } } }, t: 23 },
              f: { i: 1 },
              i: [
                {
                  a: 23,
                  c: { e: 23 },
                  d: { ".": 4 },
                  f: 73,
                  l: 19,
                  n: { g: 3 },
                  o: 19,
                  s: { ".": 19, h: 3 },
                  t: { e: 19, i: { o: 19 } },
                  v: 19,
                  g: { o: { p: { o: 258 } } }
                },
                9
              ],
              l: { i: { e: 17 } },
              o: { g: { i: { z: 4 } }, r: 0, n: { o: { m: 259 } } },
              p: { l: 4 },
              t: 9,
              u: { b: 3, m: { e: 3 }, n: 3, s: 19 },
              v: 9,
              y: 24
            },
            m: {
              a: { h: 4, l: 5, t: { i: { z: 4 } } },
              b: { e: 9, l: 1 },
              e: [
                {
                  n: { a: 3 },
                  r: { s: { e: 4 } },
                  t: [{ r: { y: 4 } }, 21],
                  c: { h: { a: 260 } }
                },
                24
              ],
              i: { a: 23, c: { ".": 3, a: 3 }, d: 19, n: [{ i: 19 }, 2] },
              m: { e: { n: { d: 32 } } },
              o: { g: { e: 0 }, n: 21 },
              p: { i: 3, r: { o: 7 } }
            },
            n: [
              {
                a: [{ c: 1, n: 23 }, 2],
                c: [{ i: { l: 27 } }, 2],
                d: [{ o: 4 }, 25],
                e: { n: 23, s: { t: 4 } },
                g: { u: 1 },
                i: { c: 2, o: 23, s: 2, u: 19 },
                k: { e: { y: 3 } },
                o: {
                  d: { i: 1 },
                  m: { y: 3, i: { c: 137 } },
                  r: { m: { a: 23 } },
                  t: { o: { n: 261 } },
                  u: 23
                },
                s: [{ p: { i: [{ r: { a: 10 } }, 36] }, u: 17 }, 3],
                t: { e: { n: 36 }, i: [{ f: 7 }, 93] },
                u: { m: 4 },
                v: { a: 6 }
              },
              24
            ],
            o: [
              { d: { e: 5, i: 5 }, k: 1, p: { i: 11 }, r: { d: 23 }, s: { t: 6 } },
              9
            ],
            p: {
              a: 24,
              e: { d: 5, r: [{ a: [{ g: 18 }, 27] }, 2] },
              h: [{ a: { n: 19 }, e: { r: 19 } }, 25],
              i: { n: { g: 3 }, t: 23, s: { m: { ".": 2 } } },
              o: { n: 19, s: { i: 21 } },
              r: 29,
              u: 2,
              y: 5
            },
            q: 29,
            r: {
              a: [{ ".": 19, g: 83, l: { i: { z: 4 } }, n: { g: { e: 4 } } }, 29],
              e: { a: [{ l: 19 }, 5], i: 3, s: { h: 5, t: { ".": 4 } }, w: 17 },
              g: { u: 1 },
              i: { a: 56, c: { a: 3 }, l: 19, n: 2, o: 29, t: { y: 3 }, u: 23 },
              m: { i: 9 },
              n: { e: 8 },
              o: { f: 19, u: { g: 3 } },
              p: { e: 4 },
              r: { h: 27 },
              s: { e: [{ n: 5 }, 1], t: 17 },
              t: {
                h: { i: 3, y: 3, o: { n: { i: { t: 262 } } }, r: { i: 137 } },
                y: 1,
                i: { v: { e: { l: { y: 4 } } } }
              },
              u: { m: 19 },
              y: 29
            },
            s: {
              a: { l: 3 },
              c: [{ e: 1, o: { p: [{ i: 18 }, 23] }, r: 19 }, 9],
              i: { e: 95, t: { i: { v: 4 }, o: 3, y: 3 }, u: 0 },
              l: 1,
              o: 24,
              p: { a: 1, o: 1, h: { e: { r: 83 } } },
              t: { a: [{ t: { i: 19 } }, 9], i: { l: 4, t: 4 } }
            },
            t: {
              a: { n: 21 },
              e: {
                l: { e: { g: 36 } },
                r: { ".": 3, s: 4 },
                s: [{ t: { e: { r: 263 }, o: { r: 264 } } }, 21]
              },
              h: [{ e: { s: { i: 5 }, o: { s: 265 } }, i: 14 }, 18],
              i: { c: { ".": 3, a: 4, e: 23 }, f: 23, s: 23 },
              o: { s: 5 }
            },
            u: [
              {
                b: { l: 3, a: { d: { o: 116 } } },
                c: { h: { i: 6 } },
                e: { t: 4 },
                l: 1,
                n: { c: { e: { r: 6 } }, d: 8 },
                v: 4
              },
              9
            ],
            v: {
              e: { n: 1, r: { n: { e: 17 }, s: 12, t: 1 } },
              i: { s: 23, t: { i: 36 }, a: { n: { ".": 266 } } },
              o: { l: 60 }
            },
            w: {
              d: { e: { r: 3 } },
              e: { l: 3, s: { t: 4 } },
              i: 2,
              n: { i: 5 },
              o: 21
            },
            y: { a: 2 },
            x: { i: { d: { i: { c: 267 } } } }
          },
          p: {
            a: [
              {
                c: { a: 1, e: 1, t: 0 },
                d: 21,
                g: { a: { n: 32, t: 23 } },
                i: [{ n: 17 }, 21],
                l: [{ m: { a: { t: 268 } } }, 21],
                n: { a: 0, e: { l: 11 }, t: { y: 0 }, y: 3 },
                p: [{ u: 1 }, 2],
                r: {
                  a: {
                    b: { l: 6 },
                    g: { e: 5, r: { a: 269 } },
                    l: { e: 228 },
                    m: [{ e: 12 }, 36]
                  },
                  d: { i: 5 },
                  e: [{ l: 5 }, 27],
                  i: [{ s: 0 }, 28]
                },
                t: {
                  e: [{ r: 4 }, 9],
                  h: { i: { c: 32 }, y: 4 },
                  r: { i: { c: 1 } }
                },
                v: 0,
                y: 27
              },
              41
            ],
            b: 43,
            d: 1,
            e: {
              ".": 18,
              a: [{ r: { l: 17 } }, 138],
              c: 9,
              d: [{ e: 27, i: [{ a: 36, c: 0 }, 27] }, 37],
              e: [{ d: 0, v: 208 }, 21],
              k: 0,
              l: { a: 1, i: { e: 17 } },
              n: { a: { n: 1 }, c: 21, t: { h: 0 } },
              o: { n: 4 },
              r: {
                a: { ".": 21, b: { l: 6 }, g: 21 },
                i: [{ s: { t: 6 } }, 21],
                m: { a: { l: 0 }, e: 7 },
                n: 21,
                o: 11,
                t: { i: 11 },
                u: 4,
                v: 15
              },
              t: [{ e: { n: 4 }, i: { z: 4 } }, 9]
            },
            f: 18,
            g: 18,
            h: {
              ".": 18,
              a: { r: { i: 6 } },
              e: { n: { o: 11 }, r: 1, s: { ".": 1 } },
              i: {
                c: 2,
                e: 32,
                n: { g: 4 },
                s: { t: { i: 32 } },
                z: 27,
                l: { a: { n: { t: 168 }, t: { e: { l: 270 } } } }
              },
              l: 9,
              o: { b: 27, n: { e: 27, i: 32 }, r: 0 },
              s: 18,
              t: 3,
              u: 32,
              y: 41
            },
            i: {
              a: [{ n: 17 }, 3],
              c: { i: { e: 1 }, y: 1, a: { d: 271 } },
              d: [{ a: 19, e: 3, i: 32 }, 21],
              e: { c: 27, n: 3 },
              g: { r: { a: { p: 1 } } },
              l: { o: 3 },
              n: [{ ".": 21, d: 17, o: 21 }, 9],
              o: [{ n: 17 }, 141],
              t: { h: [{ a: 4 }, 23], u: 9 }
            },
            k: 142,
            l: [
              {
                a: { n: 27, s: { t: 6 } },
                i: {
                  a: 11,
                  e: { r: 5 },
                  g: 18,
                  n: [{ a: { r: 5 } }, 0],
                  c: { a: { b: 208 } }
                },
                o: { i: 17 },
                u: { m: [{ b: 17 }, 0] }
              },
              143
            ],
            m: 43,
            n: 48,
            o: {
              c: 1,
              d: { ".": 32 },
              e: { m: 4, t: 144 },
              g: 145,
              i: { n: [{ t: 32, c: { a: 12 } }, 84] },
              l: {
                y: { t: 6, e: 137, p: { h: { o: { n: { o: 272 } } } } },
                e: { ".": 41 }
              },
              n: { i: 1 },
              p: 1,
              r: [{ y: 1 }, 124],
              s: [{ s: 15 }, 41],
              t: [{ a: 1 }, 21],
              u: { n: 32 }
            },
            p: [
              {
                a: { r: { a: 5 } },
                e: [{ d: 21, l: 19, n: 23, r: 23, t: 23 }, 24],
                o: { s: { i: { t: { e: 5 } } } }
              },
              43
            ],
            r: [
              {
                a: { y: { e: 17 } },
                e: {
                  c: { i: 32, o: 5 },
                  e: { m: 11 },
                  f: { a: { c: 6 } },
                  l: { a: 0 },
                  r: 11,
                  s: { e: 23, s: 27, p: { l: { i: 84 } } },
                  t: { e: { n: 5 } },
                  v: 11,
                  m: { a: { c: 273 } },
                  n: { e: { u: 15 } }
                },
                i: { e: 53, n: { t: 146 }, s: [{ o: 12 }, 0] },
                o: {
                  c: { a: 23, e: { s: { s: 8 } }, i: { t: { y: { ".": 274 } } } },
                  f: { i: { t: 6 } },
                  l: 11,
                  s: { e: 12 },
                  t: 15,
                  g: { e: 208 }
                }
              },
              9
            ],
            s: [
              {
                e: [{ u: { d: [{ o: { d: 276, f: 276 } }, 275] } }, 24],
                h: 1,
                i: { b: 21 }
              },
              81
            ],
            t: [
              {
                a: { b: 134 },
                e: 24,
                h: 24,
                i: { m: 11 },
                u: { r: 0 },
                w: 21,
                o: { m: { a: { t: 277 } } },
                r: { o: { l: 278 } }
              },
              42
            ],
            u: {
              b: [{ e: { s: { c: 181 } } }, 11],
              e: 0,
              f: 0,
              l: { c: 11 },
              m: 1,
              n: 9,
              r: { r: 0 },
              s: 32,
              t: [{ e: [{ r: 11 }, 32], r: 3, t: { e: { d: 0 }, i: { n: 0 } } }, 9]
            },
            w: 23
          },
          q: {
            u: [
              {
                a: {
                  v: 5,
                  i: { n: { t: { e: 279 } } },
                  s: { i: [{ r: 281, s: 281 }, 280] }
                },
                e: { ".": 25, r: 27, t: 27 },
                i: { n: { t: { e: { s: { s: 282 } } } }, v: { a: { r: 14 } } }
              },
              9
            ]
          },
          r: {
            a: {
              b: [{ i: 3, o: { l: { i: { c: 29 }, o: { i: 236 } } } }, 25],
              c: { h: { e: 17, u: 3 }, l: 19 },
              f: { f: { i: 5 }, t: 0 },
              i: 24,
              l: { o: 1 },
              m: {
                e: { t: [{ r: { i: { z: 283 } } }, 11], n: 24 },
                i: 24,
                o: { u: 3 }
              },
              n: { e: { o: 6 }, g: { e: 0 }, i: 21, o: 4, h: { a: { s: 167 } } },
              p: { e: { r: 11 }, h: { y: 27 } },
              r: { c: 5, e: [{ f: 5 }, 17], i: { l: 18 } },
              s: 24,
              t: { i: { o: { n: 115 } } },
              u: { t: 0 },
              v: { a: { i: 4 }, e: { l: 11 } },
              z: { i: { e: 4 } },
              d: { i: { g: 127, o: { g: 249 } } },
              o: { r: 2 }
            },
            b: [
              {
                a: { b: 21, g: 21 },
                i: [{ f: 0, n: [{ e: 19, g: { ".": 4, e: 284 } }, 24] }, 8],
                o: 1
              },
              29
            ],
            c: [
              {
                e: [{ n: 17 }, 24],
                h: { a: 23, e: { r: 0 } },
                i: { b: 90, t: 1 },
                u: { m: 12 }
              },
              29
            ],
            d: { a: { l: 21 }, i: [{ a: 0, e: { r: 0 }, n: [{ g: 3 }, 17] }, 9] },
            e: {
              ".": 25,
              a: { l: 2, n: 3, r: { r: 4 }, v: 32, w: 1 },
              b: { r: { a: { t: 19 } } },
              c: {
                o: { l: { l: 5 }, m: { p: { e: 5 } } },
                r: { e: 1 },
                i: { p: { r: 285 } },
                t: { a: { n: { g: 286 } } }
              },
              d: [{ e: 2, i: { s: 3, t: 5 } }, 37],
              f: { a: { c: 1 }, e: [{ r: { ".": 4 } }, 9], i: 3, y: 1 },
              g: { i: { s: 11 } },
              i: { t: 4 },
              l: { i: 2, u: 4 },
              n: { t: { a: 90, e: 0 } },
              o: 2,
              p: { i: { n: 4 }, o: { s: { i: 1 } }, u: 2 },
              r: [{ i: 21, o: 17, u: 4 }, 147],
              s: {
                ".": 21,
                p: { i: 1 },
                s: { i: { b: 6 } },
                t: [{ a: { l: 4 }, r: 3 }, 8]
              },
              t: { e: { r: 1 }, i: { z: 96 }, r: { i: [{ b: { u: 85 } }, 3] } },
              u: [{ t: { i: 4 } }, 8],
              v: [
                {
                  a: { l: 1 },
                  e: { l: 11, r: { ".": 30, s: 4, t: 4 } },
                  i: { l: 4 },
                  o: { l: { u: 5 } }
                },
                8
              ],
              w: { h: 1 }
            },
            f: [{ u: 0, y: 21 }, 29],
            g: [
              {
                e: { r: 3, t: 23 },
                i: { c: 23, n: [{ g: 3 }, 0], s: 19, t: 19 },
                l: 29,
                o: { n: 0 },
                u: 23
              },
              9
            ],
            h: [{ ".": 18, a: { l: 18 } }, 1],
            i: {
              a: [{ b: 0, g: 1, l: { ".": 23 } }, 3],
              b: [{ a: 11 }, 21],
              c: { a: { s: 5 }, e: 21, i: [{ d: 32, e: 1 }, 18], o: 21 },
              d: { e: { r: 5 } },
              e: { n: { c: 3, t: 3 }, r: 2, t: 4 },
              g: { a: { n: 5 }, i: 32 },
              l: { i: { z: 11 } },
              m: { a: { n: 32 }, i: 5, o: 27, p: { e: 0 } },
              n: { a: [{ ".": 32 }, 24], d: 0, e: 0, g: 0 },
              o: 2,
              p: { h: [{ e: 6 }, 32], l: [{ i: { c: 5 } }, 9] },
              q: 21,
              s: [{ ".": 21, c: 0, h: 23, p: 0 }, 24],
              t: {
                a: { b: 116 },
                e: { d: { ".": 19 }, r: { ".": 5, s: 5 } },
                i: { c: 11 },
                u: [{ r: 5 }, 9]
              },
              v: { e: { l: 5, t: 11 }, i: 11, o: { l: 287 } }
            },
            j: 23,
            k: {
              e: { t: 23 },
              l: { e: 1, i: { n: 1 } },
              ".": 288,
              h: { o: 2 },
              r: { a: { u: 29 } },
              s: { ".": 288 }
            },
            l: [
              {
                e: [{ d: 24, q: { u: 30 } }, 0],
                i: { g: 21, s: [{ h: 4 }, 21] },
                o: 73
              },
              29
            ],
            m: [
              {
                a: { c: 5 },
                e: [{ n: 23, r: { s: 4 } }, 24],
                i: { n: { g: [{ ".": 21 }, 3] }, o: 21, t: 23 },
                y: 21
              },
              29
            ],
            n: {
              a: { r: 21 },
              e: { l: 23, r: 21, t: 19, y: 23 },
              i: { c: 19, s: 92, t: 23, v: 23 },
              o: [{ u: 21 }, 0],
              u: 23
            },
            o: {
              b: { l: 11, o: { t: 289 } },
              c: [{ r: 3 }, 24],
              e: [{ l: { a: { s: 167 } }, p: { i: { d: { e: 290 } } } }, 1],
              f: { e: 2, i: { l: 4 } },
              k: [{ e: { r: 4 } }, 8],
              l: { e: { ".": 32 } },
              m: { e: { t: { e: 5 }, s: { h: 3 } }, i: 0, p: 0 },
              n: { a: { l: 0 }, e: 0, i: { s: 134 }, t: { a: 0 } },
              o: { m: 41, t: 32 },
              p: { e: { l: 3 }, i: { c: 11 } },
              r: { i: 11, o: 4 },
              s: { p: { e: { r: 5 } }, s: 0 },
              t: { h: { e: 1 }, y: 1, r: { o: { n: 2 } } },
              v: { a: 1, e: { l: 5 } },
              x: 5
            },
            p: [
              {
                e: { a: 21, n: { t: 19 }, r: { ".": 4 }, t: 23 },
                h: 95,
                i: { n: { g: 3 } },
                o: 23,
                a: { u: { l: { i: 291 } } }
              },
              29
            ],
            r: [
              {
                e: { c: 0, f: 0, o: 21, s: { t: 0 } },
                i: { o: 0, v: 0 },
                o: { n: 17, s: 17 },
                y: { s: 17 }
              },
              72
            ],
            s: [
              {
                a: [{ t: { i: 5 } }, 29],
                c: 1,
                e: [
                  {
                    c: [{ r: 0 }, 23],
                    r: { ".": 4, a: { d: { i: 238 } } },
                    s: 3,
                    v: 148
                  },
                  24
                ],
                h: [{ a: 19 }, 29],
                i: [{ b: 90 }, 29],
                o: { n: 12 },
                p: 29,
                w: 19
              },
              44
            ],
            t: {
              a: { c: { h: 36 }, g: 21 },
              e: { b: 23, n: { d: 17 }, o: 5 },
              i: [
                {
                  b: 4,
                  d: 0,
                  e: { r: 21 },
                  g: 23,
                  l: { i: 12, l: 17, y: 21 },
                  s: { t: 21 },
                  v: 21
                },
                29
              ],
              r: { i: 23, o: { p: { h: 115 } }, e: { u: 29 } },
              s: { h: 1 },
              h: { o: { u: 29 } }
            },
            u: {
              a: 3,
              e: { l: 93, n: 3 },
              g: { l: 1 },
              i: { n: 3 },
              m: { p: { l: 11 } },
              n: [{ k: 6, t: { y: 0 } }, 9],
              s: { c: 19 },
              t: { i: { n: 6 } }
            },
            v: {
              e: [
                {
                  l: { i: 17 },
                  n: 23,
                  r: { ".": 4 },
                  s: { t: 19 },
                  y: 23,
                  i: { l: 29 }
                },
                1
              ],
              i: { c: 23, v: 0 },
              o: 23
            },
            w: 29,
            y: { c: 1, n: { g: { e: 32 } }, t: 3 },
            z: { s: { c: 2 } }
          },
          s: {
            a: [
              {
                b: 42,
                c: { k: 32, r: { i: 11 }, t: 23 },
                i: 32,
                l: { a: { r: 36 }, m: 0, o: 4, t: 0, e: { s: { c: 54, w: 7 } } },
                n: { c: 27, d: { e: 0 } },
                p: [{ a: { r: { i: { l: 292 } } } }, 29],
                t: { a: 4, i: { o: 76 }, u: 11 },
                u: 0,
                v: { o: { r: 4 } },
                w: 32
              },
              9
            ],
            b: 56,
            c: {
              a: {
                n: { t: 149 },
                p: [{ e: { r: 267 } }, 0],
                v: 6,
                t: { o: { l: 208 } }
              },
              e: { d: 21, i: 18, s: 21 },
              h: [
                {
                  o: 21,
                  i: { t: { z: 21 } },
                  r: { o: { d: { i: { n: { g: 293 } } } } }
                },
                8
              ],
              i: { e: 68, n: { d: 150 }, u: { t: { t: 294 } } },
              l: { e: 6, i: 21 },
              o: { f: 17, p: { y: 18 }, u: { r: { a: 7 } } },
              u: 29,
              r: { a: { p: { e: { r: { ".": 36 } } } } },
              y: { t: { h: 247 } }
            },
            d: 56,
            e: {
              ".": 18,
              a: [{ s: 17, w: 5 }, 1],
              c: { o: 151, t: 27 },
              d: [{ e: 95, l: 19 }, 125],
              g: [{ r: 11 }, 9],
              i: 32,
              l: { e: 2, f: 32, v: 32 },
              m: {
                e: [{ s: { t: 295 } }, 18],
                o: { l: 1 },
                a: { p: { h: 287 } },
                i: { t: { i: { c: 296 } } }
              },
              n: {
                a: { t: 5 },
                c: 18,
                d: 0,
                e: { d: 19 },
                g: 5,
                i: { n: 19 },
                t: { d: 18, l: 18 }
              },
              p: { a: 152, t: { e: { m: { b: 11 } } } },
              r: { ".": 43, l: 21, o: 0, v: { o: 18 } },
              s: [{ h: 4, t: 5 }, 72],
              u: { m: 113 },
              v: [{ e: { n: 11 } }, 32],
              w: { i: 0 },
              x: 32
            },
            f: 47,
            g: 48,
            h: [
              {
                ".": 25,
                e: { r: 2, v: 32 },
                i: { n: 2, o: 3, p: 27, v: 6 },
                o: [
                  { l: { d: 4 }, n: 12, r: [{ t: 7 }, 17], e: { s: { t: 137 } } },
                  0
                ],
                w: 18
              },
              24
            ],
            i: {
              b: 2,
              c: { c: 19 },
              d: {
                e: { ".": 27, s: [{ t: 6, w: 6 }, 32], d: { ".": 8 } },
                i: [{ z: 4 }, 32]
              },
              g: { n: { a: 18 } },
              l: { e: 0, y: 18 },
              n: [{ a: 24, e: { ".": 32 }, g: 23 }, 42],
              o: [{ n: [{ a: 6 }, 32] }, 41],
              r: [{ a: 5, e: { s: { i: { d: 4 } } } }, 9],
              s: 41,
              t: { i: { o: 27 } },
              u: 32,
              v: 41,
              z: 32
            },
            k: [
              { e: [{ t: 23 }, 18], i: { n: { e: 4, g: 4 } }, y: { s: { c: 15 } } },
              9
            ],
            l: [
              {
                a: { t: 23 },
                e: 24,
                i: { t: { h: 7 } },
                o: { v: { a: { k: { i: { a: 297 } } } } }
              },
              74
            ],
            m: [
              {
                a: [{ l: { l: 54 }, n: 12 }, 23],
                e: { l: 17, n: 19 },
                i: { t: { h: 32 } },
                o: { l: { d: 49 } }
              },
              42
            ],
            n: 72,
            o: [
              {
                c: { e: 1 },
                f: { t: 12 },
                l: { a: { b: 1 }, d: 153, i: { c: 3 }, v: 32, u: { t: { e: 9 } } },
                m: 27,
                n: { ".": 68, a: 17, g: 0 },
                p: [{ h: { i: { c: 32, z: 19 }, y: 19 } }, 21],
                r: { c: 5, d: 5 },
                v: [{ i: 4 }, 18],
                g: { a: { m: { y: 298 } } }
              },
              41
            ],
            p: {
              a: [{ i: 32, n: 0, c: { e: 299, i: { n: 69 } } }, 25],
              e: { n: { d: 17 }, o: 57, r: 25, c: { i: { o: 11 } } },
              h: { e: [{ r: [{ o: 213 }, 27] }, 24], o: 6 },
              i: { l: 17, n: { g: 4 }, o: 18, c: { i: { l: 208 } } },
              l: { y: 21 },
              o: {
                n: 21,
                r: [{ t: { s: { c: 300, w: 300 } } }, 17],
                t: 18,
                k: { e: { s: { w: 10 } } }
              }
            },
            q: { u: { a: { l: { l: 36 } }, i: { t: { o: 88 } } } },
            r: 29,
            s: [
              {
                a: [{ s: 12, c: { h: { u: 301 } } }, 29],
                c: 94,
                e: { l: 23, n: { g: 19 }, s: { ".": 21 }, t: 19 },
                i: [
                  {
                    e: [{ r: 0 }, 21],
                    l: { y: 4 },
                    a: { n: { ".": 210 } },
                    g: { n: { a: { b: 302 } } }
                  },
                  29
                ],
                l: [{ i: 1 }, 21],
                n: 21,
                p: { e: { n: { d: 115 } } },
                t: 9,
                u: { r: { a: 6 } },
                w: 4,
                h: { a: { t: 3 } }
              },
              25
            ],
            t: {
              ".": 25,
              a: {
                g: 24,
                l: 24,
                m: { i: 17, p: 69 },
                n: { d: 32, t: { s: { h: { i: 303 } } } },
                p: 90,
                t: { ".": 32, i: 15 },
                r: { t: { l: { i: 12 } } }
              },
              e: { d: 21, r: { n: { i: 7 }, o: 19 }, w: [{ a: 6 }, 8] },
              h: { e: 23 },
              i: [
                {
                  ".": 21,
                  a: 19,
                  c: [{ k: 32 }, 29],
                  e: 21,
                  f: 23,
                  n: { g: 3 },
                  r: 32
                },
                9
              ],
              l: { e: 29 },
              o: {
                c: { k: 32 },
                m: { a: 12 },
                n: { e: 32 },
                p: 21,
                r: { e: 27, a: { b: 304 } }
              },
              r: [
                {
                  a: { d: 21, t: { u: 32, a: { g: 305 } }, y: 21 },
                  i: { d: 21, b: { u: { t: 7 } } },
                  y: 18
                },
                1
              ],
              w: 61,
              y: [{ l: { i: { s: 137 } } }, 24],
              b: 4,
              s: { c: { r: 4 } },
              u: { p: { i: { d: 306 } } }
            },
            u: [
              {
                a: { l: 2 },
                b: 111,
                g: 151,
                i: { s: 4, t: 12 },
                l: 21,
                m: [{ i: 11 }, 9],
                n: 9,
                r: 9,
                p: { e: { r: { e: 307 } } }
              },
              41
            ],
            v: 18,
            w: [{ o: 18, i: { m: { m: 177 } } }, 9],
            y: [
              {
                c: 18,
                l: 27,
                n: { o: 5, c: 41 },
                r: { i: { n: 4 } },
                t: { h: { i: 308 } }
              },
              21
            ]
          },
          t: {
            a: [
              {
                ".": 27,
                b: [
                  { l: { e: { s: 4 } }, o: { l: { i: { z: 32, s: { m: 309 } } } } },
                  25
                ],
                c: { i: 18 },
                d: { o: 4 },
                f: 46,
                i: { l: { o: 5 } },
                l: [
                  {
                    a: 4,
                    e: { n: 5 },
                    i: 11,
                    k: [{ a: 204 }, 18],
                    l: { i: { s: 0 } },
                    o: { g: 4 }
                  },
                  9
                ],
                m: { o: 4, i: { n: 82 } },
                n: { d: { e: 0 }, t: { a: 54 } },
                p: { e: { r: 4 }, l: 4, a: { t: { h: 310 } } },
                r: { a: 0, c: 18, e: 18, i: { z: 3 }, r: { h: 311 } },
                s: { e: 0, y: 4 },
                t: { i: { c: 18 }, u: { r: 1 } },
                u: { n: 17 },
                v: 0,
                w: 25,
                x: { i: { s: 0 } },
                g: { o: { n: { ".": 3 } } }
              },
              41
            ],
            b: 42,
            c: [{ h: [{ e: { t: 5 }, c: 15, i: { e: { r: 237 } } }, 21], r: 29 }, 18],
            d: 43,
            e: {
              ".": 18,
              a: { d: { i: 17 }, t: 18, c: { h: { e: { r: { ".": 36 } } } } },
              c: { e: 17, t: 32 },
              d: [{ i: 4 }, 42],
              e: 41,
              g: [{ e: { r: 4 }, i: 4 }, 0],
              l: { ".": 27, i: 17, s: 32, e: { g: 84, r: { o: 249 } } },
              m: { a: [{ t: 11 }, 154] },
              n: {
                a: { n: 27 },
                c: 27,
                d: 27,
                e: { s: 18 },
                t: [{ a: { g: 0 } }, 41]
              },
              o: 41,
              p: [{ e: 4 }, 1],
              r: {
                c: 11,
                d: 155,
                i: [{ e: { s: 5 }, s: 11, z: { a: 6 }, c: { ".": 8 } }, 41],
                n: { i: { t: 32 } },
                v: 5,
                g: { e: { i: 312 } }
              },
              s: { ".": 18, s: [{ ".": 23, e: { s: 313 } }, 18] },
              t: { h: { e: 6 } },
              u: 27,
              x: 27,
              y: 18
            },
            f: 42,
            g: 43,
            h: {
              ".": 25,
              a: { n: 17, l: { a: { m: 228 } } },
              e: [{ a: [{ s: 3, t: 5 }, 18], i: { s: 11 }, t: 27 }, 9],
              i: { c: { ".": 4, a: 4 }, l: 18, n: { k: 32 } },
              l: 18,
              o: {
                d: { e: 4, i: { c: 32 }, o: { n: 11 } },
                o: 18,
                r: { i: { t: 6, z: 5 } },
                g: { e: { n: { i: 314 } } },
                k: { e: { r: 175 } }
              },
              s: 25,
              y: { l: { a: { n: 228 } }, s: { c: 11 } }
            },
            i: {
              a: [{ b: 1, t: { o: 1 }, n: { ".": 70 } }, 41],
              b: 156,
              c: { k: 18, o: 21, u: 157 },
              d: { i: 32 },
              e: { n: 27 },
              f: [{ y: 4 }, 8],
              g: [{ u: 32 }, 25],
              l: { l: { i: { n: 6 } } },
              m: [{ p: 18, u: { l: 5 } }, 41],
              n: [{ a: 24, e: { ".": 27 }, i: 27, o: { m: 285 } }, 42],
              o: [{ c: 4, n: { e: { e: 6 } } }, 41],
              q: 32,
              s: { a: 3, e: 27, m: 0, o: 4, p: 0, t: { i: { c: { a: 32 } } } },
              t: { l: 3 },
              u: 1,
              v: [{ a: 0 }, 41],
              z: [{ a: 3, e: { n: 3 } }, 41]
            },
            l: [
              {
                a: [{ n: 17 }, 19],
                e: { ".": 27, d: 27, s: { ".": 27 }, t: { ".": 19 } },
                o: 19,
                i: { e: { r: 315 } }
              },
              25
            ],
            m: [{ e: 0 }, 43],
            n: 81,
            o: [
              {
                b: 3,
                c: { r: { a: { t: 4 } } },
                d: { o: 18 },
                f: 25,
                g: { r: 9 },
                i: { c: 4 },
                m: { a: 9, b: 0, y: 3 },
                n: { a: { l: { i: 0 }, t: 3 }, o: 18, y: 18 },
                r: { a: 9, i: { e: 3, z: 5 } },
                s: 8,
                u: { r: 32, t: 18 },
                w: { a: { r: 3 } },
                l: { o: { g: { y: 84 } } },
                t: { i: { c: 11 } }
              },
              41
            ],
            p: 43,
            r: {
              a: [
                {
                  b: 11,
                  c: { h: 5, i: [{ t: 17 }, 36], t: { e: 17 } },
                  s: 17,
                  v: { e: { n: 5, s: 158, r: { s: [{ a: { b: 317 } }, 15] } } },
                  i: { t: { o: { r: 316 } } }
                },
                41
              ],
              e: { f: 5, m: [{ i: 6 }, 0], a: { c: { h: { e: 318 } } } },
              i: {
                a: [{ l: { ".": 1 } }, 32],
                c: { e: { s: 5 }, i: { a: 32 }, s: 18 },
                m: 25,
                v: 0
              },
              o: {
                m: { i: 5 },
                n: { i: 6, y: 18 },
                p: {
                  h: { e: 5 },
                  i: { s: 175 },
                  o: { l: { e: { s: 320 }, i: { s: 320, t: 321 } } }
                },
                s: { p: 11 },
                v: 11,
                l: { e: { u: { m: 319 } } },
                f: { i: { c: { ".": 17 }, t: 11 } }
              },
              u: { i: 5, s: 17 }
            },
            s: [{ c: [{ h: { i: { e: 12 } } }, 21], h: 0, w: 21 }, 101],
            t: [
              { e: { s: 21 }, o: 19, u: 0, r: { i: { b: { u: { t: 322 } } } } },
              66
            ],
            u: [
              {
                a: [{ r: 3 }, 2],
                b: { i: 1 },
                d: 8,
                e: 18,
                f: 46,
                i: 76,
                m: 27,
                n: { i: { s: 1 } },
                p: { ".": 48 },
                r: { e: 27, i: [{ s: 11 }, 32], o: 5, y: 4, n: { a: { r: 12 } } },
                s: 27
              },
              41
            ],
            v: 18,
            w: [{ a: 43, i: { s: 17 }, o: 18, h: 29 }, 1],
            y: [{ a: 18, l: 25, p: { e: 12, h: 4, a: { l: 64 } } }, 41],
            z: [{ e: 1 }, 18]
          },
          u: {
            a: {
              b: 18,
              c: 0,
              n: { a: 4, i: 0 },
              r: { a: { n: { t: 5 } }, d: 8, i: 11, t: 11 },
              t: 29,
              v: 0,
              d: { r: { a: { t: { i: 3, u: 15 } } } }
            },
            b: {
              e: [{ l: 21, r: [{ o: 21 }, 23] }, 1],
              i: [{ n: { g: 33 } }, 72],
              l: { e: { ".": 23 } }
            },
            c: { a: 23, i: { b: 0, t: 1 }, l: { e: 12 }, r: 23, u: 23, y: 21 },
            d: {
              d: 4,
              e: { r: 3, s: { t: 4 }, v: 17 },
              i: { c: 29, e: { d: 3, s: 3 }, s: 4, t: 19 },
              o: { n: [{ y: 232 }, 21] },
              s: { i: 1 },
              u: 21
            },
            e: { n: { e: 21, s: 17, t: { e: 0 } }, r: { i: { l: 0 } }, a: { m: 15 } },
            f: { a: 27, l: 23 },
            g: { h: { e: { n: 11 } }, i: { n: 4 } },
            i: [
              {
                l: { i: { z: 5 } },
                n: [{ g: 29 }, 1],
                r: { m: 0 },
                t: { a: 17 },
                v: [{ e: { r: { ".": 0 } } }, 11]
              },
              156
            ],
            j: 19,
            k: 18,
            l: {
              a: [{ b: 5, t: { i: 19 } }, 29],
              c: { h: [{ e: 32 }, 17] },
              d: { e: { r: 3 } },
              e: [{ n: 29 }, 1],
              g: { i: 1 },
              i: [{ a: 19, n: { g: 3 }, s: { h: 4 } }, 9],
              l: { a: { r: 1 }, i: { b: 96, s: 1 } },
              m: 61,
              o: 72,
              s: [{ e: { s: 5 } }, 18],
              t: { i: 2, r: { a: 54 }, u: 18 },
              u: [{ l: 4 }, 23],
              v: 4
            },
            m: {
              a: { b: 4 },
              b: { i: 1, l: { y: 1 } },
              i: [{ n: { g: 83 } }, 29],
              o: { r: { o: 6 } },
              p: 9
            },
            n: {
              a: { t: 17 },
              e: [{ r: 1 }, 24],
              i: [{ m: 1, n: 24, s: { h: 4 }, v: 11 }, 29],
              s: [{ w: 1 }, 93],
              t: { a: { b: 11 }, e: { r: { ".": 1 }, s: 1 } },
              u: 0,
              y: 4,
              z: 4
            },
            o: { r: { s: 21 }, s: 19, u: 29 },
            p: {
              e: [{ r: { s: 6 } }, 29],
              i: { a: 19, n: { g: 3 } },
              l: 23,
              p: [{ o: { r: { t: 10 } } }, 3],
              t: { i: { b: 5 }, u: 17 }
            },
            r: {
              a: [{ ".": 18, g: 21, s: 21, l: { ".": 216 } }, 29],
              b: { e: 1 },
              c: 0,
              d: 2,
              e: { a: { t: 5 } },
              f: { e: { r: 1 }, r: 1 },
              i: {
                f: [{ i: { c: 0 } }, 23],
                n: 2,
                o: 23,
                t: 29,
                z: 3,
                a: { l: { ".": 0 } }
              },
              l: [{ i: { n: { g: { ".": 5 } } } }, 9],
              n: { o: 1 },
              o: { s: 17 },
              p: { e: 1, i: 1 },
              s: { e: { r: 5 } },
              t: { e: { s: 4 }, h: { e: 3 }, i: [{ e: 1 }, 17] },
              u: 23
            },
            s: [
              {
                a: { d: 19, n: 19, p: 1 },
                c: [{ i: 3 }, 8],
                e: { a: 5, r: { ".": 9 } },
                i: { a: 19, c: 23 },
                l: { i: { n: 1 } },
                p: 2,
                s: { l: 4 },
                t: { e: { r: { e: 4 } }, r: 2 },
                u: [{ r: 17 }, 24]
              },
              25
            ],
            t: {
              a: { b: 0, t: 23 },
              e: { ".": 18, l: 18, n: [{ i: 17 }, 18] },
              i: [
                {
                  l: { i: { z: 5 } },
                  n: { e: 23, g: 3 },
                  o: { n: { a: 7 } },
                  s: 21,
                  z: 31
                },
                101
              ],
              l: 34,
              o: { f: 4, g: 5, m: { a: { t: { i: { c: 5 } } } }, n: 19, u: 21 },
              s: 0
            },
            u: [{ m: 1 }, 23],
            v: 74,
            x: { u: 11 },
            z: { e: 1 }
          },
          v: {
            a: [
              {
                ".": 32,
                b: 159,
                c: { i: { l: 5 }, u: 11 },
                g: [{ e: 1, u: { e: { r: 170 } } }, 0],
                l: { i: { e: 4 }, o: 5, u: 15 },
                m: { o: 4 },
                n: { i: { z: 4 } },
                p: { i: 4 },
                r: { i: { e: { d: 5 } } },
                t: [{ i: { v: 29 } }, 27],
                u: { d: { e: { v: 54 } } }
              },
              41
            ],
            e: {
              ".": 18,
              d: 18,
              g: 11,
              l: { ".": 23, l: { i: 11 }, o: 1, y: 21 },
              n: { o: { m: 11 }, u: { e: 19 } },
              r: {
                d: 21,
                e: {
                  ".": 32,
                  l: [{ y: { ".": 41 } }, 21],
                  n: [{ c: 5 }, 23],
                  s: 21,
                  i: { g: 324 }
                },
                i: { e: 11 },
                m: { i: { n: 36 } },
                s: { e: 27 },
                t: { h: 11 }
              },
              s: [{ ".": 18, t: { e: 0, i: { t: { e: 15 } } } }, 99],
              t: { e: [{ r: 11 }, 1], y: 1 }
            },
            i: {
              a: { l: { i: 4 }, n: 32 },
              d: { e: { ".": 32, d: 32, n: 47, s: 32 }, i: 32 },
              f: 23,
              g: { n: 4 },
              k: 0,
              l: [{ i: { t: 32, z: 127 } }, 25],
              n: [{ a: 26, c: 24, d: 5, g: 18 }, 29],
              o: { l: 11, r: 73, u: 2 },
              p: 1,
              r: { o: 4 },
              s: { i: { t: 11 }, o: 3, u: 3 },
              t: { i: 18, r: 11, y: 18 },
              v: [{ i: { p: { a: { r: 325 } } } }, 27]
            },
            o: {
              ".": 32,
              i: [{ r: { d: { u: 323 } }, c: { e: { p: 213 } } }, 0],
              k: 27,
              l: { a: 1, e: 19, t: 32, v: 27 },
              m: { i: 5 },
              r: { a: { b: 5 }, i: 17, y: 1 },
              t: { a: 1, e: { e: 18 } }
            },
            v: 26,
            y: 21
          },
          w: {
            a: {
              b: { l: 19 },
              c: 25,
              g: { e: { r: 4 }, o: 5 },
              i: { t: 6 },
              l: { ".": 19 },
              m: 0,
              r: { t: 0 },
              s: { t: [{ e: { w: { a: 326 } } }, 0] },
              t: { e: 2 },
              v: { e: { r: 4, g: 327 } }
            },
            b: 29,
            e: {
              a: { r: { i: { e: 5 } }, t: { h: 54 } },
              d: { n: 0 },
              e: { t: 12, v: 5, k: { n: 137 } },
              l: { l: 0 },
              r: 29,
              s: { t: 12 },
              v: 23
            },
            h: { i: 0 },
            i: [
              {
                l: [{ l: { i: { n: 6 } } }, 8],
                n: { d: { e: 0 }, g: 0 },
                r: 0,
                s: { e: 27 },
                t: { h: 12 },
                z: 5,
                d: { e: { s: { p: 6 } } }
              },
              9
            ],
            k: 21,
            l: { e: { s: 1 }, i: { n: 3 } },
            n: { o: 21 },
            o: [{ m: 15, v: { e: { n: 4 } }, k: { e: { n: 85 } } }, 160],
            p: 19,
            r: {
              a: [{ p: { a: { r: { o: 12 } } } }, 0],
              i: [{ t: { a: 36, e: { r: { ".": 183 } } } }, 0]
            },
            s: { h: 23, l: 1, p: { e: 1 }, t: 60 },
            t: 18,
            y: 1,
            c: 23
          },
          x: {
            a: [{ c: { e: 5 }, g: { o: 21 }, m: 11, p: 21, s: 5 }, 29],
            c: 161,
            e: [{ c: { u: { t: { o: 1 } } }, d: 24, r: { i: 0, o: 4 } }, 29],
            h: [{ i: [{ l: 6 }, 8], u: 0 }, 29],
            i: [{ a: 4, c: 4, d: { i: 4 }, m: { e: 21, i: { z: 4 } } }, 23],
            o: [{ b: 21 }, 23],
            p: [{ a: { n: { d: 17 } }, e: { c: { t: { o: 10 } }, d: 11 } }, 23],
            t: [{ i: 23 }, 74],
            u: [{ a: 3 }, 29],
            x: 1,
            q: [{ u: { i: { s: 54 } } }, 29]
          },
          y: {
            a: { c: 19, r: 110, t: 19 },
            b: 29,
            c: [
              {
                e: [{ r: 4 }, 24],
                h: [{ e: [{ d: 264 }, 0] }, 23],
                o: { m: 17, t: 17 }
              },
              29
            ],
            d: 29,
            e: {
              e: 19,
              r: [{ f: 21 }, 29],
              s: [{ t: { e: { r: { y: 328 } } } }, 0],
              t: 1
            },
            g: { i: 19 },
            h: 47,
            i: 29,
            l: { a: 23, l: { a: { b: { l: 6 } } }, o: 23, u: 19 },
            m: { b: { o: { l: 7 } }, e: [{ t: { r: { y: 20 } } }, 0], p: { a: 12 } },
            n: { c: { h: { r: 3 } }, d: 4, g: 4, i: { c: 4 }, x: 32 },
            o: [{ d: 4, g: 33, m: 0, n: { e: { t: 4 }, s: 21 }, s: 21 }, 72],
            p: { e: { d: 21, r: 6 }, i: 3, o: [{ c: 21 }, 23], t: { a: 9 }, u: 19 },
            r: { a: { m: 5 }, i: { a: 4 }, o: 23, r: 1 },
            s: {
              c: 1,
              e: 161,
              i: { c: { a: 3 }, o: 3, s: 27 },
              o: 21,
              s: 0,
              t: [{ a: 3, r: { o: 29 } }, 2],
              u: { r: 17 }
            },
            t: { h: { i: { n: 23 } }, i: { c: 3 } },
            w: 29
          },
          z: {
            a: [{ b: 79, r: 8 }, 2],
            b: 18,
            e: [{ n: 1, p: 1, r: [{ o: 3 }, 29], t: 0 }, 25],
            i: [{ l: 21, s: 21, a: { n: { ".": 23 } } }, 42],
            l: 32,
            m: 18,
            o: [{ m: 1, o: { l: 4 }, p: { h: { r: 329 } } }, 41],
            t: { e: 0 },
            z: [{ y: 21, w: 231 }, 101]
          }
        },
        {
          associate: [2, 5],
          associates: [2, 5],
          declination: [3, 6, 9],
          obligatory: [5, 7],
          philanthropic: [4, 7],
          present: [],
          presents: [],
          project: [],
          projects: [],
          reciprocity: [4],
          recognizance: [2, 6, 9],
          reformation: [3, 6, 9],
          retribution: [3, 6, 9],
          table: [2]
        }
      ]);
    }
  });

  // node_modules/hyphen/en-us/index.js
  var require_en_us2 = __commonJS({
    "node_modules/hyphen/en-us/index.js"(exports, module) {
      module.exports = require_export_contract()(
        require_en_us()
      );
    }
  });

  // shared/js/imageFiles.js
  function isSvgFile(file) {
    return Boolean(file) && (file.type === "image/svg+xml" || /\.svgz?$/i.test(file.name || ""));
  }
  var UNIT_PX = { px: 1, pt: 96 / 72, pc: 16, in: 96, cm: 96 / 2.54, mm: 96 / 25.4 };
  function svgLength(value) {
    const m = /^\s*([\d.]+)\s*(px|pt|pc|in|cm|mm)?\s*$/i.exec(value || "");
    return m ? parseFloat(m[1]) * UNIT_PX[(m[2] || "px").toLowerCase()] : null;
  }
  function svgSize(svgEl) {
    const vb = (svgEl.getAttribute("viewBox") || "").trim().split(/[\s,]+/).map(Number);
    const hasViewBox = vb.length === 4 && vb.every(Number.isFinite) && vb[2] > 0 && vb[3] > 0;
    let width = svgLength(svgEl.getAttribute("width"));
    let height = svgLength(svgEl.getAttribute("height"));
    if (hasViewBox) {
      if (!width && !height) {
        width = vb[2];
        height = vb[3];
      } else if (!width) width = height * (vb[2] / vb[3]);
      else if (!height) height = width * (vb[3] / vb[2]);
    }
    return { width: width || 300, height: height || 150, viewBox: hasViewBox ? vb : null };
  }
  function svgFileToPng(file, maxSide = 2048) {
    return file.text().then((text) => new Promise((resolve, reject) => {
      const doc = new DOMParser().parseFromString(text, "image/svg+xml");
      const svg = doc.documentElement;
      if (!svg || svg.nodeName.toLowerCase() !== "svg" || doc.getElementsByTagName("parsererror").length) {
        reject(new Error("That SVG file couldn't be read."));
        return;
      }
      const size = svgSize(svg);
      const scale = maxSide / Math.max(size.width, size.height);
      const outW = Math.max(1, Math.round(size.width * scale));
      const outH = Math.max(1, Math.round(size.height * scale));
      if (!size.viewBox) svg.setAttribute("viewBox", `0 0 ${size.width} ${size.height}`);
      svg.setAttribute("width", String(outW));
      svg.setAttribute("height", String(outH));
      const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(new XMLSerializer().serializeToString(svg));
      const img = new Image();
      img.onerror = () => reject(new Error("That SVG file couldn't be drawn."));
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = outW;
        canvas.height = outH;
        canvas.getContext("2d").drawImage(img, 0, 0, outW, outH);
        resolve({ src: canvas.toDataURL("image/png"), width: size.width, height: size.height });
      };
      img.src = url;
    }));
  }

  // shared/js/dropImages.js
  var IMAGE_NAME = /\.(png|jpe?g|gif|webp|svg|svgz|bmp|avif|ico)$/i;
  var IMAGE_URL = /\.(png|jpe?g|gif|webp|svg|bmp|avif|ico)(\?[^#]*)?(#.*)?$/i;
  function isImageFile(file) {
    return Boolean(file) && ((file.type || "").startsWith("image/") || IMAGE_NAME.test(file.name || "") || isSvgFile(file));
  }
  function decodeEntities(s) {
    return s.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d))).replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
  }
  function attribute(tag, name) {
    const m = new RegExp("\\s" + name + `\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i").exec(tag);
    return m ? decodeEntities(m[1] ?? m[2] ?? m[3] ?? "") : "";
  }
  function getData(dt, type) {
    try {
      return dt.getData(type) || "";
    } catch (e) {
      return "";
    }
  }
  function usableUrl(url) {
    const u = String(url || "").trim();
    if (/^data:image\//i.test(u)) return u;
    if (u.startsWith("//")) return "https:" + u;
    return /^https?:\/\//i.test(u) ? u : null;
  }
  function readDrop(dt) {
    const files = Array.from(dt && dt.files || []).filter(isImageFile);
    if (files.length) return { files, url: null, alt: "" };
    if (!dt) return null;
    const html = getData(dt, "text/html");
    const tag = /<img\b[^>]*>/i.exec(html);
    if (tag) {
      const url = usableUrl(attribute(tag[0], "src"));
      if (url) return { files: [], url, alt: attribute(tag[0], "alt") };
    }
    const link = getData(dt, "text/uri-list").split(/\r?\n/).map((l) => l.trim()).find((l) => l && !l.startsWith("#"));
    const plain = getData(dt, "text/plain").trim();
    for (const candidate of [link, /^\S+$/.test(plain) ? plain : ""]) {
      const url = usableUrl(candidate);
      if (url && (/^data:/i.test(url) || IMAGE_URL.test(url))) return { files: [], url, alt: "" };
    }
    return null;
  }
  function nameFromUrl(url, type) {
    const ext = ((type || "").split("/")[1] || "png").replace("svg+xml", "svg").replace("jpeg", "jpg");
    if (!/^https?:/i.test(url)) return "dropped-picture." + ext;
    let last = "";
    try {
      last = decodeURIComponent(new URL(url).pathname.split("/").pop() || "");
    } catch (e) {
    }
    last = last.replace(/[\\/:*?"<>|]+/g, "_").trim();
    if (!last) return "dropped-picture." + ext;
    return IMAGE_NAME.test(last) ? last : last + "." + ext;
  }
  async function fetchImageFile(url) {
    try {
      const res = await fetch(url, { mode: "cors", credentials: "omit", referrerPolicy: "no-referrer" });
      if (!res.ok) return null;
      const blob = await res.blob();
      if (!(blob.type || "").startsWith("image/")) return null;
      return new File([blob], nameFromUrl(url, blob.type), { type: blob.type });
    } catch (e) {
      return null;
    }
  }
  var isEditable = (el) => el instanceof Element && Boolean(el.closest("input, textarea, select, [contenteditable=''], [contenteditable='true']"));
  function makeOverlay(text) {
    const overlay = document.createElement("div");
    overlay.setAttribute("aria-hidden", "true");
    Object.assign(overlay.style, {
      position: "fixed",
      top: "0",
      left: "0",
      right: "0",
      bottom: "0",
      zIndex: "2147483000",
      display: "none",
      alignItems: "center",
      justifyContent: "center",
      pointerEvents: "none",
      boxSizing: "border-box",
      background: "rgba(221, 83, 26, 0.12)",
      border: "3px dashed var(--ui-accent, #dd531a)"
    });
    const label = document.createElement("div");
    label.textContent = text;
    Object.assign(label.style, {
      padding: "14px 22px",
      borderRadius: "10px",
      background: "#201918",
      color: "var(--ui-fg, #e9e9ee)",
      border: "1px solid var(--ui-border, #3f3634)",
      boxShadow: "0 10px 24px rgba(0, 0, 0, 0.45)",
      font: "600 17px var(--ui-font, system-ui, sans-serif)"
    });
    overlay.appendChild(label);
    document.body.appendChild(overlay);
    return overlay;
  }
  function installImageDrop({ label, onDrop, onOther }) {
    let internal = false;
    let depth = 0;
    let overlay = null;
    const types = (e) => Array.from(e.dataTransfer && e.dataTransfer.types || []);
    const ours = (e) => {
      const t = types(e);
      if (t.includes("Files")) {
        internal = false;
        return true;
      }
      return !internal && (t.includes("text/uri-list") || t.includes("text/html") || t.includes("text/x-moz-url"));
    };
    const show = () => {
      if (!overlay) overlay = makeOverlay(label);
      overlay.style.display = "flex";
    };
    const hide = () => {
      depth = 0;
      if (overlay) overlay.style.display = "none";
    };
    const onDragStart = () => {
      internal = true;
    };
    const onDragEnd = () => {
      internal = false;
      hide();
    };
    const onDragEnter = (e) => {
      if (ours(e)) {
        depth++;
        show();
      }
    };
    const onDragLeave = (e) => {
      if (!ours(e)) return;
      depth = Math.max(0, depth - 1);
      const outside = e.clientX <= 0 || e.clientY <= 0 || e.clientX >= window.innerWidth || e.clientY >= window.innerHeight;
      if (depth === 0 || outside) hide();
    };
    const onDragOver = (e) => {
      if (!ours(e)) return;
      if (!isEditable(e.target) || types(e).includes("Files")) {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
      }
    };
    const onDropEvent = (e) => {
      const wasOurs = ours(e);
      hide();
      internal = false;
      if (!wasOurs) return;
      const found = readDrop(e.dataTransfer);
      if (!found) {
        const others = Array.from(e.dataTransfer && e.dataTransfer.files || []);
        if (others.length) {
          e.preventDefault();
          if (onOther) onOther(others);
        } else if (!isEditable(e.target)) e.preventDefault();
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      onDrop({ ...found, x: e.clientX, y: e.clientY, target: e.target });
    };
    const listeners2 = [["dragstart", onDragStart], ["dragend", onDragEnd], ["dragenter", onDragEnter], ["dragleave", onDragLeave], ["dragover", onDragOver], ["drop", onDropEvent]];
    for (const [type, fn] of listeners2) document.addEventListener(type, fn, true);
    return () => {
      for (const [type, fn] of listeners2) document.removeEventListener(type, fn, true);
      if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    };
  }

  // apps/ZEditor/src/model/pageNumbers.js
  var DEFAULT_PAGE_NUMBERS = { on: false, from: 1, to: 0, first: 1, position: "bottom-outside", format: "n", size: 10, color: "#1a1a1a", marginIn: 0.4 };
  var PAGE_NUMBER_POSITIONS = [
    { key: "bottom-outside", label: "Bottom, outer corner" },
    { key: "bottom-center", label: "Bottom, center" },
    { key: "bottom-left", label: "Bottom left" },
    { key: "bottom-right", label: "Bottom right" },
    { key: "top-outside", label: "Top, outer corner" },
    { key: "top-center", label: "Top, center" },
    { key: "top-left", label: "Top left" },
    { key: "top-right", label: "Top right" }
  ];
  var PAGE_NUMBER_FORMATS = [{ key: "n", label: "1" }, { key: "dash", label: "– 1 –" }, { key: "page", label: "Page 1" }];
  function pageNumberSpec(settings, pageIdx, pageCount) {
    if (!settings.on || pageIdx === null || pageIdx < 0) return null;
    const position = pageIdx + 1;
    const last = settings.to > 0 ? Math.min(settings.to, pageCount) : pageCount;
    if (position < settings.from || position > last) return null;
    const number = settings.first + (position - settings.from);
    const text = settings.format === "dash" ? `– ${number} –` : settings.format === "page" ? `Page ${number}` : String(number);
    let place = settings.position;
    if (place.endsWith("-outside")) place = place.replace("outside", position % 2 === 1 ? "right" : "left");
    const [vertical, horizontal] = place.split("-");
    return { text, vertical, horizontal, size: settings.size, color: settings.color, marginIn: settings.marginIn };
  }

  // apps/ZEditor/src/constants.js
  var THUMB_SCALE = 0.45;
  var THUMB_SHOWN_SCALE = 0.3;
  var MAIN_SCALE = 1.1;
  var DEFAULT_PAGE_SIZE = { width: 420, height: 594 };
  var NEW_DOCUMENT_PRESETS = [
    { key: "a3", label: "A3", width: 841.89, height: 1190.55 },
    { key: "a4", label: "A4", width: 595.28, height: 841.89 },
    { key: "a5", label: "A5", width: 419.53, height: 595.28 },
    { key: "a6", label: "A6", width: 297.64, height: 419.53 },
    { key: "letter", label: "US Letter", width: 612, height: 792 },
    { key: "half-letter", label: "Half Letter", width: 396, height: 612 },
    { key: "digest", label: "Digest", width: 396, height: 594 }
  ];
  var MAX_NEW_DOCUMENT_PAGES = 100;
  var ZOOM_PERCENT = { min: 25, max: 400, initial: 100 };
  var POINTS_PER_INCH = 72;
  var EXPORT_DPI = 200;
  var EXPORT_SCALE = EXPORT_DPI / 72;

  // apps/ZEditor/src/model/controls.js
  var OPACITY_CONTROL = { kind: "slider", prop: "opacity", label: "Opacity (%)", min: 0, max: 100, fallback: 100 };
  var BLEND_CONTROL = {
    kind: "select",
    prop: "blend",
    label: "Blend",
    fallback: "normal",
    options: [
      { key: "normal", label: "Normal" },
      { key: "multiply", label: "Multiply" },
      { key: "screen", label: "Screen" },
      { key: "overlay", label: "Overlay" },
      { key: "soft-light", label: "Soft Light" },
      { key: "darken", label: "Darken" },
      { key: "lighten", label: "Lighten" },
      { key: "difference", label: "Difference" }
    ]
  };
  var ANGLE_CONTROL = { kind: "slider", prop: "angle", label: "Rotation (°)", min: 0, max: 359, fallback: 0 };
  var angleOf = (ann) => ann.angle || 0;
  function controlValues(source, controls) {
    return Object.fromEntries(controls.map((c) => [c.prop, source[c.prop] != null ? source[c.prop] : c.fallback]));
  }
  function effectSettings(ann, effect) {
    return controlValues(ann, effect.controls);
  }
  function opacityOf(ann) {
    return controlValues(ann, [OPACITY_CONTROL]).opacity / 100;
  }
  function blendOf(ann) {
    return controlValues(ann, [BLEND_CONTROL]).blend;
  }

  // apps/ZEditor/src/model/noise.js
  function seededNoise(i, variation, j = 0) {
    const v = Math.sin((i + variation * 97) * 12.9898 + j * 78.233) * 43758.5453;
    return v - Math.floor(v);
  }
  function noiseStream(variation, stream = 0) {
    let n = 0;
    return () => seededNoise(stream * 1e5 + n++, variation);
  }

  // apps/ZEditor/src/model/outlines.js
  function pointsToOutline(points) {
    return "M" + points.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join("L") + "Z";
  }
  function rectOutline({ width, height }) {
    return `M0 0H${width}V${height}H0Z`;
  }
  var isEllipse = (ann) => ann.shape === "ellipse";
  function ellipseOutline({ width, height }) {
    const rx = width / 2, ry = height / 2;
    return `M0 ${ry}A${rx} ${ry} 0 1 1 ${width} ${ry}A${rx} ${ry} 0 1 1 0 ${ry}Z`;
  }

  // apps/ZEditor/src/model/edgeShapes.js
  var ROUNDED_EFFECT = {
    key: "rounded",
    label: "Rounded",
    outline: roundedOutline,
    controls: [
      { kind: "slider", prop: "roundedRadius", label: "Radius (%)", min: 0, max: 50, fallback: 12 }
    ]
  };
  var ELLIPSE_EFFECT = {
    key: "ellipseEdge",
    label: "Ellipse",
    outline: ellipseOutline,
    controls: []
  };
  var TORN_EDGE_EFFECT = {
    key: "tornEdge",
    label: "Torn Edge",
    outline: tornEdgeOutline,
    controls: [
      { kind: "slider", prop: "tornSize", label: "Tooth size (%)", min: 2, max: 40, fallback: 10 },
      { kind: "slider", prop: "tornDepth", label: "Depth (%)", min: 0, max: 30, fallback: 6 },
      { kind: "slider", prop: "tornVariation", label: "Variation", min: 0, max: 100, fallback: 0 }
    ]
  };
  var SCISSOR_CUT_EFFECT = {
    key: "scissorCut",
    label: "Scissor Cut",
    outline: scissorCutOutline,
    controls: [
      { kind: "slider", prop: "scissorCuts", label: "Cuts per side", min: 1, max: 12, fallback: 2 },
      { kind: "slider", prop: "scissorDepth", label: "Depth (%)", min: 0, max: 25, fallback: 8 },
      { kind: "slider", prop: "scissorVariation", label: "Variation", min: 0, max: 100, fallback: 0 }
    ]
  };
  function roundedOutline(ann) {
    const { width: w, height: h } = ann;
    const r = Math.min(w, h) * effectSettings(ann, ROUNDED_EFFECT).roundedRadius / 100;
    const corner = (x, y) => `A${r} ${r} 0 0 1 ${x} ${y}`;
    return `M${r} 0H${w - r}${corner(w, r)}V${h - r}${corner(w - r, h)}H${r}${corner(0, h - r)}V${r}${corner(r, 0)}Z`;
  }
  function scissorCutOutline(ann) {
    const { width: w, height: h } = ann;
    const { scissorCuts, scissorDepth, scissorVariation } = effectSettings(ann, SCISSOR_CUT_EFFECT);
    const jitter = Math.min(w, h) * scissorDepth / 100;
    const noise = noiseStream(scissorVariation);
    const onSide = [
      (t, inset) => [w * t, inset],
      (t, inset) => [w - inset, h * t],
      (t, inset) => [w * (1 - t), h - inset],
      (t, inset) => [inset, h * (1 - t)]
    ];
    const points = [];
    onSide.forEach((place) => {
      for (let cut = 0; cut < scissorCuts; cut++) {
        const t = cut === 0 ? 0 : (cut + (noise() - 0.5) * 0.6) / scissorCuts;
        points.push(place(t, noise() * jitter));
      }
    });
    return pointsToOutline(points);
  }
  function tornEdgeOutline(ann) {
    const { width, height } = ann;
    const shortSide = Math.min(width, height);
    const { tornSize, tornDepth, tornVariation } = effectSettings(ann, TORN_EDGE_EFFECT);
    const step = Math.max(0.5, shortSide * tornSize / 100);
    const jitter = shortSide * tornDepth / 100;
    const tuned = ann.tornSize != null || ann.tornDepth != null;
    const stepX = tuned ? width / Math.max(1, Math.round(width / step)) : step;
    const stepY = tuned ? height / Math.max(1, Math.round(height / step)) : step;
    const eps = 1e-6;
    const noise = (i2) => seededNoise(i2, tornVariation);
    const points = [];
    let i = 0;
    for (let x = 0; x <= width + eps; x += stepX) points.push([x, noise(i++) * jitter]);
    for (let y = stepY; y <= height + eps; y += stepY) points.push([width - noise(i++) * jitter, y]);
    for (let x = width - stepX; x >= -eps; x -= stepX) points.push([x, height - noise(i++) * jitter]);
    for (let y = height - stepY; y >= stepY - eps; y -= stepY) points.push([noise(i++) * jitter, y]);
    return pointsToOutline(points);
  }

  // apps/ZEditor/src/model/imageEffects.js
  var STROKE_EFFECT = {
    key: "stroke",
    label: "Stroke",
    controls: [
      { kind: "color", prop: "strokeColor", label: "Color", fallback: "#000000" },
      { kind: "slider", prop: "strokeThickness", label: "Thickness (px)", min: 1, max: 40, fallback: 4 }
    ]
  };
  var STROKE_MITER_LIMIT = 4;
  var SHADOW_EFFECT = {
    key: "shadow",
    label: "Shadow",
    controls: [
      { kind: "color", prop: "shadowColor", label: "Color", fallback: "#000000" },
      { kind: "slider", prop: "shadowThickness", label: "Thickness (px)", min: 0, max: 60, fallback: 6 },
      { kind: "slider", prop: "shadowDirection", label: "Direction (°)", min: 0, max: 360, fallback: 135 },
      { kind: "slider", prop: "shadowBlur", label: "Blur (px)", min: 0, max: 40, fallback: 0 }
    ],
    hint: "Direction: 0° is up, 90° right, 180° down, 270° left."
  };
  var TEXTURE_EFFECT = {
    key: "texture",
    label: "Texture",
    controls: [
      { kind: "color", prop: "textureColor", label: "Color", fallback: "#1a1a1a" },
      { kind: "slider", prop: "textureGrit", label: "Grit", min: 0, max: 100, fallback: 40 },
      { kind: "slider", prop: "textureDust", label: "Dust", min: 0, max: 100, fallback: 20 },
      { kind: "slider", prop: "textureScratches", label: "Scratches", min: 0, max: 100, fallback: 15 },
      { kind: "slider", prop: "textureVariation", label: "Variation", min: 0, max: 100, fallback: 0 }
    ]
  };
  var IMAGE_EFFECTS = [ROUNDED_EFFECT, ELLIPSE_EFFECT, TORN_EDGE_EFFECT, SCISSOR_CUT_EFFECT, STROKE_EFFECT, SHADOW_EFFECT, TEXTURE_EFFECT];
  function imageEdgeOutline(ann) {
    if (isEllipse(ann)) return ellipseOutline(ann);
    const edge = IMAGE_EFFECTS.find((effect) => effect.outline && ann[effect.key]);
    return edge ? edge.outline(ann) : null;
  }
  function imageShadowOffset(ann) {
    if (!ann.shadow) return null;
    const { shadowThickness, shadowDirection, shadowBlur, shadowColor } = effectSettings(ann, SHADOW_EFFECT);
    if (shadowThickness <= 0 && shadowBlur <= 0) return null;
    const radians = shadowDirection * Math.PI / 180;
    return {
      x: Math.sin(radians) * shadowThickness,
      y: -Math.cos(radians) * shadowThickness,
      blur: shadowBlur,
      color: shadowColor
    };
  }

  // apps/ZEditor/src/model/text/colorRuns.js
  var SPAN_KEYS = ["color", "fontFamily", "fontSize", "bold", "italic", "underline", "strike", "align"];
  var SPAN_LAYOUT_KEYS = ["fontFamily", "fontSize", "bold", "italic", "align"];
  var hasProps = (run2) => SPAN_KEYS.some((k) => run2[k] != null);
  var sameProps = (a, b) => SPAN_KEYS.every((k) => a[k] == null ? b[k] == null : a[k] === b[k]);
  function normalizeRuns(runs) {
    const sorted = (runs || []).filter((r) => r.end > r.start && hasProps(r)).sort((a, b) => a.start - b.start);
    const merged = [];
    for (const run2 of sorted) {
      const last = merged[merged.length - 1];
      if (last && last.end === run2.start && sameProps(last, run2)) last.end = run2.end;
      else merged.push({ ...run2 });
    }
    return merged;
  }
  function setRunProps(runs, start, end, patch) {
    if (!(end > start)) return normalizeRuns(runs);
    const apply = (run2) => {
      const out = { ...run2 };
      for (const [key, value] of Object.entries(patch)) {
        if (value == null) delete out[key];
        else out[key] = value;
      }
      return out;
    };
    const next = [];
    let pos = start;
    for (const run2 of [...runs || []].sort((a, b) => a.start - b.start)) {
      if (run2.end <= start || run2.start >= end) {
        next.push(run2);
        continue;
      }
      if (run2.start < start) next.push({ ...run2, end: start });
      if (run2.end > end) next.push({ ...run2, start: end });
      const s = Math.max(run2.start, start), e = Math.min(run2.end, end);
      if (s > pos) next.push(apply({ start: pos, end: s }));
      next.push(apply({ ...run2, start: s, end: e }));
      pos = e;
    }
    if (pos < end) next.push(apply({ start: pos, end }));
    return normalizeRuns(next);
  }
  function clearRunProps(runs, start, end) {
    return setRunProps(runs, start, end, Object.fromEntries(SPAN_KEYS.map((k) => [k, null])));
  }
  function runAt(runs, index) {
    for (const run2 of runs || []) if (index >= run2.start && index < run2.end) return run2;
    return null;
  }
  function hasLayoutSpans(runs) {
    return Boolean(runs && runs.some((r) => SPAN_LAYOUT_KEYS.some((k) => r[k] != null)));
  }
  function adjustRunsForEdit(runs, oldText, newText) {
    if (!runs || !runs.length) return runs;
    let start = 0;
    const maxStart = Math.min(oldText.length, newText.length);
    while (start < maxStart && oldText[start] === newText[start]) start++;
    let tail = 0;
    const maxTail = maxStart - start;
    while (tail < maxTail && oldText[oldText.length - 1 - tail] === newText[newText.length - 1 - tail]) tail++;
    const removedEnd = oldText.length - tail;
    const insertedLength = newText.length - start - tail;
    const delta = insertedLength - (removedEnd - start);
    const mapStart = (pos) => pos < start ? pos : pos >= removedEnd ? pos + delta : start + insertedLength;
    const mapEnd = (pos) => pos >= removedEnd ? pos + delta : pos <= start ? pos : start;
    return normalizeRuns(runs.map((run2) => ({ ...run2, start: mapStart(run2.start), end: mapEnd(run2.end) })));
  }
  function colorSegments(text, runs) {
    const segments = [];
    let position = 0;
    for (const run2 of runs || []) {
      if (run2.start > position) segments.push({ text: text.slice(position, run2.start), color: null, span: null });
      segments.push({ text: text.slice(run2.start, run2.end), color: run2.color || null, span: run2 });
      position = run2.end;
    }
    if (position < text.length) segments.push({ text: text.slice(position), color: null, span: null });
    return segments.filter((s) => s.text.length > 0);
  }
  function colorAtIndex(runs, index) {
    const run2 = runAt(runs, index);
    return run2 && run2.color ? run2.color : null;
  }

  // apps/ZEditor/src/model/text/textControls.js
  var AUTO_TEXT_MAX_WIDTH = 320;
  var TEXT_BORDER_PX = 1;
  var LINE_SPACING_CONTROL = { kind: "slider", prop: "lineSpacing", label: "Line spacing (%)", min: 80, max: 300, fallback: 130 };
  var LETTER_SPACING_CONTROL = { kind: "slider", prop: "letterSpacing", label: "Tracking (% of font size)", min: -10, max: 100, fallback: 0 };
  var LEADING_CONTROL = { kind: "slider", prop: "leadingPt", label: "Leading (pt, 0 = use line spacing %)", min: 0, max: 200, fallback: 0 };
  var KERNING_CONTROL = {
    kind: "select",
    prop: "kerning",
    label: "Kerning",
    fallback: "auto",
    options: [{ key: "auto", label: "Font kerning (default)" }, { key: "none", label: "Off" }]
  };
  var COMPOSER_CONTROL = {
    kind: "select",
    prop: "composer",
    label: "Line breaking",
    fallback: "auto",
    options: [{ key: "auto", label: "Automatic" }, { key: "single", label: "Single-line (fast)" }, { key: "paragraph", label: "Paragraph (even spacing)" }]
  };
  var JUSTIFY_LAST_CONTROL = {
    kind: "select",
    prop: "justifyLast",
    label: "Last line",
    fallback: "left",
    options: [{ key: "left", label: "Align left" }, { key: "center", label: "Align centre" }, { key: "right", label: "Align right" }, { key: "all", label: "Justify all lines" }]
  };
  var HYPHENATE_CONTROL = {
    kind: "select",
    prop: "hyphenate",
    label: "Hyphenation",
    fallback: "none",
    options: [{ key: "none", label: "Off" }, { key: "english", label: "On (English)" }]
  };
  var PARAGRAPH_CONTROLS = [
    { kind: "slider", prop: "indentFirst", label: "First-line indent (pt)", min: 0, max: 144, fallback: 0 },
    { kind: "slider", prop: "indentLeft", label: "Left indent (pt)", min: 0, max: 288, fallback: 0 },
    { kind: "slider", prop: "indentRight", label: "Right indent (pt)", min: 0, max: 288, fallback: 0 },
    { kind: "slider", prop: "spaceBefore", label: "Space before paragraph (pt)", min: 0, max: 144, fallback: 0 },
    { kind: "slider", prop: "spaceAfter", label: "Space after paragraph (pt)", min: 0, max: 144, fallback: 0 }
  ];
  var COLUMN_CONTROLS = [
    { kind: "slider", prop: "columns", label: "Columns", min: 1, max: 6, fallback: 1 },
    { kind: "slider", prop: "columnGap", label: "Column gap (pt)", min: 0, max: 72, fallback: 12 },
    { kind: "slider", prop: "frameHeight", label: "Frame height (pt, 0 = fit the text)", min: 0, max: 1e3, fallback: 0 },
    {
      kind: "select",
      prop: "columnRule",
      label: "Column rule",
      fallback: "none",
      showIf: (v) => v.columns > 1,
      options: [{ key: "none", label: "None" }, { key: "on", label: "Line between columns" }]
    },
    { kind: "slider", prop: "columnRuleWidth", label: "Rule weight (pt, x10)", min: 1, max: 40, fallback: 5, showIf: (v) => v.columns > 1 && v.columnRule === "on" }
  ];
  var STRIKE_CONTROL = {
    kind: "select",
    prop: "strike",
    label: "Strike-through",
    fallback: "none",
    options: [{ key: "none", label: "None" }, { key: "line", label: "Line" }, { key: "double", label: "Double" }, { key: "wavy", label: "Wavy" }]
  };
  var CASE_CONTROL = {
    kind: "select",
    prop: "textCase",
    label: "Letter case",
    fallback: "none",
    options: [{ key: "none", label: "As typed" }, { key: "upper", label: "UPPERCASE" }, { key: "lower", label: "lowercase" }, { key: "title", label: "Title Case" }, { key: "small", label: "Small caps" }]
  };
  var VERTICAL_CONTROL = {
    kind: "select",
    prop: "vertical",
    label: "Direction",
    fallback: "none",
    options: [{ key: "none", label: "Horizontal" }, { key: "stacked", label: "Stacked (top to bottom)" }]
  };
  var FIT_HEIGHT_CONTROL = { kind: "slider", prop: "fitHeight", label: "Shrink to fit height (px, 0 = off)", min: 0, max: 1e3, fallback: 0 };
  var TEXT_FILL_ALPHA_CONTROL = { kind: "slider", prop: "fillAlpha", label: "Fill opacity (%)", min: 0, max: 100, fallback: 100 };
  var TEXT_GRADIENT_EFFECT = {
    key: "textGradient",
    label: "Gradient",
    controls: [
      { kind: "color", prop: "gradientColor", label: "To color", fallback: "#ffe066" },
      { kind: "slider", prop: "gradientAlpha", label: "To opacity (%)", min: 0, max: 100, fallback: 100 },
      { kind: "slider", prop: "gradientAngle", label: "Angle (°)", min: 0, max: 360, fallback: 90 },
      { kind: "slider", prop: "gradientStart", label: "Start (%)", min: 0, max: 100, fallback: 0 },
      { kind: "slider", prop: "gradientEnd", label: "End (%)", min: 0, max: 100, fallback: 100 }
    ],
    hint: "Fades from the text color to this one, across the whole text box."
  };
  var TEXT_LABEL_EFFECT = {
    key: "labelBox",
    label: "Label",
    controls: [
      { kind: "color", prop: "labelColor", label: "Color", fallback: "#000000" },
      { kind: "slider", prop: "labelAlpha", label: "Opacity (%)", min: 0, max: 100, fallback: 100 },
      { kind: "slider", prop: "labelPadding", label: "Padding (px)", min: 0, max: 40, fallback: 6 },
      { kind: "slider", prop: "labelRadius", label: "Corner radius (px)", min: 0, max: 40, fallback: 0 }
    ],
    hint: "A filled box behind the text — a black bar, a highlighter strip, a tape label."
  };
  var RANSOM_EFFECT = {
    key: "ransom",
    label: "Ransom",
    controls: [
      { kind: "slider", prop: "ransomTilt", label: "Tilt (°)", min: 0, max: 45, fallback: 8 },
      { kind: "slider", prop: "ransomShift", label: "Up/down (%)", min: 0, max: 50, fallback: 10 },
      { kind: "slider", prop: "ransomSize", label: "Size variation (%)", min: 0, max: 60, fallback: 12 },
      {
        kind: "select",
        prop: "ransomTiles",
        label: "Letter tiles",
        fallback: "none",
        options: [{ key: "none", label: "None" }, { key: "paper", label: "Cut-out paper" }]
      },
      { kind: "slider", prop: "ransomVariation", label: "Variation", min: 0, max: 100, fallback: 0 }
    ],
    hint: "Each letter gets its own tilt, height and size, like letters cut from a magazine."
  };
  var DISTRESS_EFFECT = {
    key: "distress",
    label: "Distress",
    controls: [
      { kind: "slider", prop: "distressGrit", label: "Nicks", min: 0, max: 100, fallback: 40 },
      { kind: "slider", prop: "distressDust", label: "Specks", min: 0, max: 100, fallback: 25 },
      { kind: "slider", prop: "distressScratches", label: "Scratches", min: 0, max: 100, fallback: 20 },
      { kind: "slider", prop: "distressVariation", label: "Variation", min: 0, max: 100, fallback: 0 }
    ]
  };
  var CURVE_EFFECT = {
    key: "curve",
    label: "Curve",
    controls: [
      { kind: "slider", prop: "curveBend", label: "Bend (%)", min: -100, max: 100, fallback: 50 }
    ],
    hint: "Bends each line along an arc. Shown straight while you type."
  };
  var TEXT_EFFECTS = [STROKE_EFFECT, SHADOW_EFFECT, TEXT_GRADIENT_EFFECT, TEXT_LABEL_EFFECT, RANSOM_EFFECT, CURVE_EFFECT, DISTRESS_EFFECT];
  var RANSOM_PAPER_COLORS = ["#f4efe1", "#ffe066", "#ff8fa3", "#8ecae6", "#b7e4c7", "#ffffff"];
  var TEXT_PHOTO_CONTROLS = [
    { kind: "slider", prop: "fillScale", label: "Photo scale (%)", min: 20, max: 400, fallback: 100 },
    { kind: "slider", prop: "fillX", label: "Photo X (%)", min: -100, max: 100, fallback: 0 },
    { kind: "slider", prop: "fillY", label: "Photo Y (%)", min: -100, max: 100, fallback: 0 },
    { kind: "slider", prop: "fillPhotoAlpha", label: "Photo opacity (%)", min: 0, max: 100, fallback: 100 }
  ];
  var TEXT_PHOTO_PROPS = ["fillSrc", "fillNatW", "fillNatH", ...TEXT_PHOTO_CONTROLS.map((c) => c.prop)];
  var DEFAULT_FONT_OPTIONS = ["Inter", "Georgia", "Courier New", "Comic Sans MS", "Impact"];
  var TEXT_COLOR_SWATCHES = ["#1a1a1a", "#ffffff", "#dd531a", "#2563eb", "#16a34a", "#dc2626", "#eab308"];

  // apps/ZEditor/src/model/text/textLook.js
  function caseText(text, mode) {
    if (mode === "upper") return text.toUpperCase();
    if (mode === "lower") return text.toLowerCase();
    if (mode === "title") return text.replace(/(^|[^\p{L}\p{N}'’])(\p{L})/gu, (m, before, letter) => before + letter.toUpperCase());
    return text;
  }
  function stackText(text) {
    return Array.from(text).map((ch) => ch === "\n" ? "" : ch).join("\n");
  }
  var usesTypeset = (ann) => !(ann.ransom || ann.curve || ann.vertical === "stacked") && Boolean(ann.wrapObstacles && ann.wrapObstacles.length || ann.storyHeadId != null || ann.align === "justify" || ann.hyphenate === "english" || ann.columns > 1 || ann.frameHeight > 0 || ann.indentFirst || ann.indentLeft || ann.indentRight || ann.spaceBefore || ann.spaceAfter || ann.composer === "paragraph" || hasLayoutSpans(ann.colorRuns));
  var usesCanvasText = (ann) => Boolean(ann.ransom || ann.distress || ann.curve || ann.vertical === "stacked" || ann.fitHeight > 0 || ann.colorRuns && ann.colorRuns.length || usesTypeset(ann));
  var ptToPx = (pt) => (pt || 0) * MAIN_SCALE;
  var pxToPt = (px) => px / MAIN_SCALE;
  function textLook(ann) {
    const fontSize = ann.fontSize || 16;
    const spacing = controlValues(ann, [LETTER_SPACING_CONTROL]).letterSpacing;
    const color = ann.color || "#1a1a1a";
    const fillAlpha = controlValues(ann, [TEXT_FILL_ALPHA_CONTROL]).fillAlpha;
    const photo = ann.fillSrc ? { src: ann.fillSrc, natW: ann.fillNatW, natH: ann.fillNatH, ...controlValues(ann, TEXT_PHOTO_CONTROLS) } : null;
    const gradient = ann.textGradient ? effectSettings(ann, TEXT_GRADIENT_EFFECT) : null;
    const label = ann.labelBox ? effectSettings(ann, TEXT_LABEL_EFFECT) : null;
    return {
      photo,
      ransom: ann.ransom ? effectSettings(ann, RANSOM_EFFECT) : null,
      curve: ann.curve ? effectSettings(ann, CURVE_EFFECT) : null,
      distress: ann.distress ? effectSettings(ann, DISTRESS_EFFECT) : null,
      // Leading set in points wins over the percentage; either way this is the ratio of line height to font size.
      lineHeight: ann.leadingPt > 0 ? ptToPx(ann.leadingPt) / fontSize : controlValues(ann, [LINE_SPACING_CONTROL]).lineSpacing / 100,
      kerning: ann.kerning === "none" ? "none" : "auto",
      paragraph: {
        indentFirst: ptToPx(ann.indentFirst),
        indentLeft: ptToPx(ann.indentLeft),
        indentRight: ptToPx(ann.indentRight),
        spaceBefore: ptToPx(ann.spaceBefore),
        spaceAfter: ptToPx(ann.spaceAfter),
        lastLine: ann.justifyLast || "left",
        // Justified and hyphenated text defaults to the paragraph composer, as in InDesign.
        composer: ann.composer === "single" || ann.composer === "paragraph" ? ann.composer : ann.align === "justify" || ann.hyphenate === "english" ? "paragraph" : "single",
        hyphenate: ann.hyphenate === "english",
        columns: Math.max(1, Math.min(6, Math.round(ann.columns || 1))),
        columnGap: ptToPx(ann.columnGap != null ? ann.columnGap : 12),
        frameHeight: ptToPx(ann.frameHeight)
      },
      letterSpacingPx: fontSize * spacing / 100,
      strike: controlValues(ann, [STRIKE_CONTROL]).strike,
      textCase: controlValues(ann, [CASE_CONTROL]).textCase,
      stacked: controlValues(ann, [VERTICAL_CONTROL]).vertical === "stacked",
      color,
      fillAlpha,
      stroke: ann.stroke ? effectSettings(ann, STROKE_EFFECT) : null,
      shadow: imageShadowOffset(ann),
      gradient,
      label,
      // The box's inner padding grows by the label's padding so the bar sits around the text.
      padX: 4 + (label ? label.labelPadding : 0),
      padY: 2 + (label ? label.labelPadding : 0)
    };
  }
  function photoPlacement(photo, w, h) {
    const cover = Math.max(w / photo.natW, h / photo.natH) * photo.fillScale / 100;
    const photoW = photo.natW * cover, photoH = photo.natH * cover;
    return {
      width: photoW,
      height: photoH,
      left: (w - photoW) / 2 + photo.fillX / 100 * w,
      top: (h - photoH) / 2 + photo.fillY / 100 * h
    };
  }
  function textGradientView(ann, look) {
    return { fillType: "linear", fillColor: look.color, fillAlpha: look.fillAlpha, ...look.gradient };
  }

  // apps/ZEditor/src/model/text/textWrap.js
  var TEXT_WRAP_CONTROLS = [
    {
      kind: "select",
      prop: "textWrap",
      label: "Text wrap",
      fallback: "none",
      options: [{ key: "none", label: "None" }, { key: "box", label: "Around bounding box" }, { key: "shape", label: "Around object shape" }]
    },
    { kind: "slider", prop: "wrapOffset", label: "Wrap offset (pt)", min: 0, max: 72, fallback: 6 }
  ];
  var ELLIPSE_STEPS = 48;
  var MIN_SLOT_EMS = 1.5;
  var wrapsText = (ann) => (ann.type === "image" || ann.type === "rect") && !ann.hidden && (ann.textWrap === "box" || ann.textWrap === "shape");
  function boxPointOnPage(box, angle, bx, by) {
    if (!angle) return [box.x + bx, box.y + by];
    const cx = box.width / 2, cy = box.height / 2;
    const r = angle * Math.PI / 180, cos = Math.cos(r), sin = Math.sin(r);
    const dx = bx - cx, dy = by - cy;
    return [box.x + cx + dx * cos - dy * sin, box.y + cy + dx * sin + dy * cos];
  }
  function wrapPolygons(ann, rows) {
    const angle = ann.angle || 0;
    const box = { x: ann.x, y: ann.y, width: ann.width, height: ann.height };
    const onPage = (pts) => pts.map(([bx, by]) => boxPointOnPage(box, angle, bx, by));
    const rect = (x0, y0, x1, y1) => onPage([[x0, y0], [x1, y0], [x1, y1], [x0, y1]]);
    if (ann.textWrap === "shape") {
      if (ann.shape === "ellipse" || ann.ellipseEdge) {
        const pts = [];
        for (let i = 0; i < ELLIPSE_STEPS; i++) {
          const t = i / ELLIPSE_STEPS * Math.PI * 2;
          pts.push([box.width / 2 + Math.cos(t) * box.width / 2, box.height / 2 + Math.sin(t) * box.height / 2]);
        }
        return [onPage(pts)];
      }
      if (ann.type === "image" && rows) {
        const natW = ann.naturalWidth || ann.width, natH = ann.naturalHeight || ann.height;
        const sx = ann.cropX || 0, sy = ann.cropY || 0;
        const sw = ann.cropW || natW, sh = ann.cropH || natH;
        const kx = box.width / sw, ky = box.height / sh;
        const out = [];
        for (const r of rows) {
          const y0 = Math.max(r.y0, sy), y1 = Math.min(r.y1, sy + sh);
          const x0 = Math.max(r.x0, sx), x1 = Math.min(r.x1, sx + sw);
          if (y1 <= y0 || x1 <= x0) continue;
          out.push(rect((x0 - sx) * kx, (y0 - sy) * ky, (x1 - sx) * kx, (y1 - sy) * ky));
        }
        return out;
      }
    }
    return [rect(0, 0, box.width, box.height)];
  }
  function wrapObstaclesFor(frame, annotations, rowsFor) {
    if (frame.type !== "text" || !frame.width || frame.angle || frame.ransom || frame.curve || frame.vertical === "stacked") return null;
    const left = frame.x, right = frame.x + frame.width;
    const top = frame.y, bottom = frame.frameHeight > 0 ? frame.y + ptToPx(frame.frameHeight) : Infinity;
    const found = [];
    for (const a of annotations) {
      if (a.id === frame.id || !wrapsText(a)) continue;
      const offset = ptToPx(a.wrapOffset != null ? a.wrapOffset : 6);
      for (const poly of wrapPolygons(a, a.type === "image" && a.textWrap === "shape" ? rowsFor(a) : null)) {
        const xs = poly.map((p) => p[0]), ys = poly.map((p) => p[1]);
        if (Math.max(...xs) + offset <= left || Math.min(...xs) - offset >= right) continue;
        if (Math.max(...ys) + offset <= top || Math.min(...ys) - offset >= bottom) continue;
        found.push({ pts: poly.map(([x, y]) => [x - frame.x, y - frame.y]), offset });
      }
    }
    return found.length ? found : null;
  }
  function bandExtent(pts, y0, y1) {
    let lo = Infinity, hi = -Infinity;
    const take = (x) => {
      if (x < lo) lo = x;
      if (x > hi) hi = x;
    };
    for (let i = 0; i < pts.length; i++) {
      const [ax, ay] = pts[i];
      const [bx, by] = pts[(i + 1) % pts.length];
      if (ay >= y0 && ay <= y1) take(ax);
      for (const yl of [y0, y1]) {
        if ((ay - yl) * (by - yl) < 0) take(ax + (bx - ax) * (yl - ay) / (by - ay));
      }
    }
    return lo <= hi ? [lo, hi] : null;
  }
  function freeSlot(obstacles, left, right, y0, y1, minWidth, scale = 1) {
    const blocked = [];
    for (const ob of obstacles) {
      const off = ob.offset * scale;
      const ext = bandExtent(ob.pts.map(([x, y]) => [x * scale, y * scale]), y0 - off, y1 + off);
      if (ext) blocked.push([ext[0] - off, ext[1] + off]);
    }
    if (!blocked.length) return { x: 0, width: right - left };
    blocked.sort((a, b) => a[0] - b[0]);
    let best = null;
    let at = left;
    const consider = (from, to) => {
      const w = Math.min(to, right) - Math.max(from, left);
      if (w >= minWidth && (!best || w > best.width + 1e-6)) best = { x: Math.max(from, left) - left, width: w };
    };
    for (const [b0, b1] of blocked) {
      if (b0 > at) consider(at, b0);
      at = Math.max(at, b1);
    }
    consider(at, right);
    return best;
  }

  // apps/ZEditor/src/model/text/threads.js
  var FRAME_PROPS = [
    "id",
    "type",
    "x",
    "y",
    "width",
    "angle",
    "frameHeight",
    "columns",
    "columnGap",
    "verticalAlign",
    "columnRule",
    "columnRuleColor",
    "columnRuleWidth",
    "hidden",
    "locked",
    "name",
    "groupId",
    "groupName",
    "threadFrom"
  ];
  var FRAME_SET = new Set(FRAME_PROPS);
  function storyChains(annotations) {
    const texts = new Map(annotations.filter((a) => a.type === "text").map((a) => [a.id, a]));
    const nextOf = /* @__PURE__ */ new Map();
    for (const a of texts.values()) {
      if (a.threadFrom == null || !texts.has(a.threadFrom) || nextOf.has(a.threadFrom)) continue;
      nextOf.set(a.threadFrom, a);
    }
    const chains = [];
    for (const head of texts.values()) {
      if (!nextOf.has(head.id)) continue;
      if (head.threadFrom != null && texts.has(head.threadFrom) && nextOf.get(head.threadFrom) === head) continue;
      const chain = [head];
      const seen = /* @__PURE__ */ new Set([head.id]);
      for (let f = nextOf.get(head.id); f && !seen.has(f.id); f = nextOf.get(f.id)) {
        chain.push(f);
        seen.add(f.id);
      }
      chains.push(chain);
    }
    return chains;
  }
  function followerView(head, frame, offset) {
    const view = { ...head };
    for (const key of FRAME_PROPS) view[key] = frame[key];
    view.threadFrom = void 0;
    view.fitHeight = void 0;
    view.text = (head.text || "").slice(offset);
    if (head.colorRuns && head.colorRuns.length) {
      view.colorRuns = head.colorRuns.filter((r) => r.end > offset).map((r) => ({ ...r, start: Math.max(0, r.start - offset), end: r.end - offset }));
    }
    view.storyOffset = offset;
    view.storyContinues = offset > 0 && (head.text || "")[offset - 1] !== "\n";
    return view;
  }
  function routeFramePatch(head, offset, patch) {
    const framePatch = {}, headPatch = {};
    for (const [key, value] of Object.entries(patch)) {
      if (FRAME_SET.has(key)) framePatch[key] = value;
      else if (key !== "text" && key !== "colorRuns") headPatch[key] = value;
    }
    const story = head.text || "";
    if ("text" in patch) headPatch.text = story.slice(0, offset) + patch.text;
    if ("colorRuns" in patch) {
      const before = (head.colorRuns || []).filter((r) => r.start < offset).map((r) => ({ ...r, end: Math.min(r.end, offset) }));
      const after = (patch.colorRuns || []).map((r) => ({ ...r, start: r.start + offset, end: r.end + offset }));
      headPatch.colorRuns = normalizeRuns([...before, ...after]);
    }
    return { framePatch, headPatch };
  }
  function storyProps(ann) {
    const out = {};
    for (const [key, value] of Object.entries(ann)) if (!FRAME_SET.has(key)) out[key] = value;
    return out;
  }
  function removeWithThreads(annotations, ids) {
    const gone = new Set(ids);
    const replaced = /* @__PURE__ */ new Map();
    for (const chain of storyChains(annotations)) {
      if (!chain.some((a) => gone.has(a.id))) continue;
      const survivors = chain.filter((a) => !gone.has(a.id));
      survivors.forEach((frame, i) => {
        if (i === 0) {
          replaced.set(frame.id, frame === chain[0] ? frame : { ...frame, ...storyProps(chain[0]), threadFrom: void 0 });
        } else if (frame.threadFrom !== survivors[i - 1].id) {
          replaced.set(frame.id, { ...frame, threadFrom: survivors[i - 1].id });
        }
      });
    }
    return annotations.filter((a) => !gone.has(a.id)).map((a) => replaced.get(a.id) || a);
  }
  var RESOLVED_TEXT_PROPS = ["storyOffset", "storyContinues", "storyLength", "storyHeadId", "storyIndex", "storyPrevId", "storyNextId", "wrapObstacles"];
  function withoutResolvedProps(obj) {
    if (!RESOLVED_TEXT_PROPS.some((k) => k in obj)) return obj;
    const out = { ...obj };
    for (const k of RESOLVED_TEXT_PROPS) delete out[k];
    return out;
  }
  function standaloneCopy(view) {
    const copy = withoutResolvedProps({ ...view, threadFrom: void 0 });
    if (view.storyLength != null) {
      copy.text = (view.text || "").slice(0, view.storyLength);
      if (copy.colorRuns) copy.colorRuns = copy.colorRuns.filter((r) => r.start < view.storyLength).map((r) => ({ ...r, end: Math.min(r.end, view.storyLength) }));
    }
    return copy;
  }
  function isThreaded(annotations, id) {
    const ann = annotations.find((a) => a.id === id);
    if (!ann) return false;
    return ann.threadFrom != null || annotations.some((a) => a.type === "text" && a.threadFrom === id);
  }
  function threadLinks(views, sizeOf) {
    const byId = new Map(views.map((v) => [v.id, v]));
    const corner = (v, fx, fy) => {
      const { width, height } = sizeOf(v);
      const rad = (Number(v.angle) || 0) * Math.PI / 180;
      const dx = (fx - 0.5) * width, dy = (fy - 0.5) * height;
      return [v.x + width / 2 + dx * Math.cos(rad) - dy * Math.sin(rad), v.y + height / 2 + dx * Math.sin(rad) + dy * Math.cos(rad)];
    };
    const links = [];
    for (const v of views) {
      if (v.type !== "text" || v.storyNextId == null) continue;
      const next = byId.get(v.storyNextId);
      if (!next || v.hidden || next.hidden) continue;
      const [x1, y1] = corner(v, 1, 1);
      const [x2, y2] = corner(next, 0, 0);
      links.push({ id: v.id, nextId: next.id, headId: v.storyHeadId, x1, y1, x2, y2 });
    }
    return links;
  }

  // apps/ZEditor/src/render/composer.js
  var WRAP_CJK_RE = /[⺀-〿぀-ヿ㄀-ㄯ㐀-䶿一-鿿가-힯豈-﫿︰-﹏＀-￯\u{20000}-\u{3FFFF}]/u;
  var WRAP_NO_LINE_START = "，。、．：；！？）］｝】〕〉》」』”’…ー";
  function wrapAtoms(word) {
    const atoms = [];
    let run2 = "";
    for (const ch of Array.from(word)) {
      if (WRAP_CJK_RE.test(ch)) {
        if (run2) {
          atoms.push(run2);
          run2 = "";
        }
        if (atoms.length && WRAP_NO_LINE_START.includes(ch)) atoms[atoms.length - 1] += ch;
        else atoms.push(ch);
      } else {
        run2 += ch;
      }
    }
    if (run2) atoms.push(run2);
    return atoms;
  }
  var SPACE_STRETCH = 0.33;
  var SPACE_SHRINK = 0.2;
  var LINE_PENALTY = 10;
  var HYPHEN_PENALTY = 50;
  var FLAGGED_DEMERITS = 3e3;
  var FITNESS_DEMERITS = 3e3;
  var BREAK_ANYWHERE_PENALTY = 300;
  var INFINITY = 1e9;
  var RAGGED_STRETCH = 0.5;
  function tokenize(para, offset, measure, spaceWidth, hyphenWidth, opts, maxLineWidth) {
    const items = [];
    const push = (item) => items.push(item);
    const widthOf = (s, at) => measure(s, at);
    const pushBox = (text, start) => {
      const width = widthOf(text, start);
      if (width <= maxLineWidth || Array.from(text).length < 2) {
        push({ type: "box", width, start, end: start + text.length });
        return;
      }
      let at = start;
      const chars = Array.from(text);
      chars.forEach((ch, k) => {
        push({ type: "box", width: widthOf(ch, at), start: at, end: at + ch.length });
        at += ch.length;
        if (k < chars.length - 1) push({ type: "penalty", width: 0, penalty: BREAK_ANYWHERE_PENALTY, flagged: false });
      });
    };
    let i = 0;
    while (i < para.length) {
      if (para[i] === " ") {
        push({ type: "glue", width: spaceWidth, stretch: spaceWidth * SPACE_STRETCH, shrink: spaceWidth * SPACE_SHRINK, start: offset + i, end: offset + i + 1 });
        i += 1;
        continue;
      }
      let j = i;
      while (j < para.length && para[j] !== " ") j++;
      const word = para.slice(i, j);
      const atoms = wrapAtoms(word);
      let at = offset + i;
      atoms.forEach((atom, k) => {
        if (k > 0) push({ type: "penalty", width: 0, penalty: 0, flagged: false });
        let fragments = null;
        if (opts.hyphenate) {
          const lead = atom.match(/^[^\p{L}]*/u)[0], trail = atom.match(/[^\p{L}]*$/u)[0];
          const core = atom.slice(lead.length, atom.length - trail.length);
          const pieces = core && /^\p{L}+$/u.test(core) ? opts.hyphenate(core) : null;
          if (pieces && pieces.length > 1) {
            fragments = pieces.slice();
            fragments[0] = lead + fragments[0];
            fragments[fragments.length - 1] += trail;
          }
        }
        if (fragments && fragments.length > 1) {
          let fragAt = at;
          fragments.forEach((frag, f) => {
            pushBox(frag, fragAt);
            fragAt += frag.length;
            if (f < fragments.length - 1) push({ type: "penalty", width: hyphenWidth, penalty: HYPHEN_PENALTY, flagged: true });
          });
        } else {
          pushBox(atom, at);
        }
        at += atom.length;
      });
      i = j;
    }
    return items;
  }
  function isBreak(items, i) {
    const it = items[i];
    if (it.type === "glue") return i > 0 && items[i - 1].type === "box";
    return it.type === "penalty" && it.penalty < INFINITY;
  }
  function lineStartAfter(items, index) {
    let k = index + 1;
    while (k < items.length && items[k].type !== "box") k++;
    return k;
  }
  function greedyBreaks(items, lineWidth) {
    const EPS = 1e-6;
    const breaks = [];
    let line = 0;
    let width = 0;
    let lastFit = -1;
    let i = 0;
    const breakAt = (at) => {
      breaks.push(at);
      line++;
      width = 0;
      lastFit = -1;
      i = lineStartAfter(items, at);
    };
    while (i < items.length) {
      const it = items[i];
      const forced = it.type === "penalty" && it.penalty === -INFINITY;
      if (forced || isBreak(items, i)) {
        const total = width + (it.type === "penalty" ? it.width : 0);
        const fits = total <= lineWidth(line) + EPS;
        if (fits && !forced) lastFit = i;
        else if (!fits && lastFit >= 0) {
          breakAt(lastFit);
          continue;
        } else if (!fits && !forced) {
          breakAt(i);
          continue;
        }
        if (forced) break;
      }
      if (it.type !== "penalty") width += it.width;
      i++;
    }
    return breaks;
  }
  function optimalBreaks(items, lineWidth, justify, hasHyphens) {
    const n = items.length;
    const W = new Array(n + 1).fill(0), Y = new Array(n + 1).fill(0), Z = new Array(n + 1).fill(0);
    for (let i = 0; i < n; i++) {
      const it = items[i];
      W[i + 1] = W[i] + (it.type === "penalty" ? 0 : it.width);
      Y[i + 1] = Y[i] + (it.type === "glue" ? it.stretch : 0);
      Z[i + 1] = Z[i] + (it.type === "glue" ? it.shrink : 0);
    }
    for (const tolerance of [2, 5, 30]) {
      let active = [{ index: -1, line: 0, fit: 1, demerits: 0, prev: null, W: 0, Y: 0, Z: 0 }];
      let final = null;
      for (let i = 0; i < n && active.length; i++) {
        if (!isBreak(items, i)) continue;
        const it = items[i];
        const forced = it.type === "penalty" && it.penalty === -INFINITY;
        const best = /* @__PURE__ */ new Map();
        const alive = [];
        for (const a of active) {
          const L = lineWidth(a.line);
          const w = W[i] - a.W + (it.type === "penalty" ? it.width : 0);
          const y = Y[i] - a.Y, z = Z[i] - a.Z;
          const isLast = forced;
          let ratio;
          if (w < L) {
            const stretch = isLast ? INFINITY : justify ? y : y + L * RAGGED_STRETCH;
            ratio = stretch > 0 ? (L - w) / stretch : Infinity;
          } else if (w > L) {
            ratio = z > 0 ? (L - w) / z : -Infinity;
          } else {
            ratio = 0;
          }
          if (ratio >= -1 && !forced) alive.push(a);
          if (ratio < -1 || ratio > tolerance) continue;
          const absRatio = Math.abs(ratio);
          const badness = 100 * absRatio * absRatio * absRatio;
          let demerits;
          if (it.type === "penalty" && it.penalty >= 0) {
            const d = LINE_PENALTY + badness + it.penalty;
            demerits = d * d;
          } else if (it.type === "penalty" && it.penalty > -INFINITY) {
            const d = LINE_PENALTY + badness;
            demerits = d * d - it.penalty * it.penalty;
          } else {
            const d = LINE_PENALTY + badness;
            demerits = d * d;
          }
          if (hasHyphens && it.type === "penalty" && it.flagged && a.index >= 0 && items[a.index].type === "penalty" && items[a.index].flagged) demerits += FLAGGED_DEMERITS;
          const fit = ratio < -0.5 ? 0 : ratio <= 0.5 ? 1 : ratio <= 1 ? 2 : 3;
          if (Math.abs(fit - a.fit) > 1) demerits += FITNESS_DEMERITS;
          const total = demerits + a.demerits;
          const key = (a.line + 1) * 4 + fit;
          const cur = best.get(key);
          if (!cur || total < cur.demerits) {
            best.set(key, { index: i, line: a.line + 1, fit, demerits: total, prev: a, W: 0, Y: 0, Z: 0 });
          }
        }
        if (forced) {
          let min = null;
          for (const node of best.values()) if (!min || node.demerits < min.demerits) min = node;
          final = min;
          break;
        }
        for (const node of best.values()) {
          const s = lineStartAfter(items, i);
          node.W = W[s];
          node.Y = Y[s];
          node.Z = Z[s];
          alive.push(node);
        }
        active = alive;
      }
      if (final) {
        const breaks = [];
        for (let node = final; node && node.index >= 0; node = node.prev) breaks.push(node.index);
        return breaks.reverse();
      }
    }
    return null;
  }
  function composeText(text, measure, opts) {
    const spaceWidth = measure(" ");
    const hyphenWidth = opts.hyphenWidth != null ? opts.hyphenWidth : measure("-");
    const indentLeft = opts.indentLeft || 0, indentRight = opts.indentRight || 0, indentFirst = opts.indentFirst || 0;
    const lastLine = opts.lastLine || "left";
    const paragraphs = text.split("\n");
    const lines = [];
    let offset = 0;
    paragraphs.forEach((para, paraIndex) => {
      const opensPara = !(opts.continued && paraIndex === 0);
      const paraAlign = opts.alignAt && opts.alignAt(offset) || opts.align || "left";
      const justify = paraAlign === "justify";
      const startsAt = (first) => indentLeft + (first ? indentFirst : 0);
      const slot = opts.slotFor ? (lineIndex) => opts.slotFor(paraIndex, lineIndex) : null;
      const availAt = (lineIndex) => Math.max(1, (slot ? slot(lineIndex).width : opts.width) - startsAt(opensPara && lineIndex === 0) - indentRight);
      const maxLineWidth = Math.max(1, opts.width - Math.min(startsAt(true), startsAt(false)) - indentRight);
      let items = tokenize(para, offset, measure, spaceWidth, hyphenWidth, opts, maxLineWidth);
      const fillLast = !(justify && lastLine === "all");
      if (items.length) {
        if (fillLast) items.push({ type: "glue", width: 0, stretch: INFINITY, shrink: 0, start: offset + para.length, end: offset + para.length });
        items.push({ type: "penalty", width: 0, penalty: -INFINITY, flagged: false });
      }
      let breaks = [];
      if (items.length) {
        const wantOptimal = opts.composer === "paragraph";
        breaks = wantOptimal && optimalBreaks(items, availAt, justify, Boolean(opts.hyphenate)) || greedyBreaks(items, availAt);
        if (!breaks.length || breaks[breaks.length - 1] !== items.length - 1) breaks.push(items.length - 1);
      }
      if (!items.length) {
        lines.push({ start: offset, end: offset + para.length, visibleEnd: offset, para: paraIndex, first: opensPara, last: true, x: startsAt(opensPara) + (slot ? slot(0).x : 0), width: 0, natural: 0, pieces: [], hyphenated: false });
      }
      let from = 0;
      breaks.forEach((b, lineIndex) => {
        const isLast = b === items.length - 1;
        const lineItems = [];
        for (let k = from; k < b; k++) lineItems.push(items[k]);
        while (lineItems.length && lineItems[lineItems.length - 1].type !== "box") lineItems.pop();
        const hyphenated = !isLast && items[b].type === "penalty" && items[b].flagged;
        const pieces = [];
        let natural = 0;
        let glueCount = 0;
        let afterGlue = true;
        for (const it of lineItems) {
          if (it.type === "penalty") continue;
          if (it.type === "glue") {
            natural += it.width;
            glueCount++;
            afterGlue = true;
            continue;
          }
          natural += it.width;
          const prev = pieces[pieces.length - 1];
          if (prev && !afterGlue && prev.end === it.start) {
            prev.end = it.end;
            prev.width += it.width;
          } else pieces.push({ start: it.start, end: it.end, width: it.width, gapBefore: glueCount });
          afterGlue = false;
        }
        if (hyphenated) natural += hyphenWidth;
        const first = lineIndex === 0 && opensPara;
        const avail = availAt(lineIndex);
        let align = justify ? "left" : paraAlign;
        let stretch = 0;
        if (justify) {
          if (!isLast || lastLine === "all") {
            if (glueCount) stretch = (avail - natural) / glueCount;
          } else align = lastLine;
        }
        const lineWidth = justify && stretch !== 0 ? avail : natural;
        let x = 0;
        let gluesSeen = 0;
        const placed = pieces.map((p) => {
          const spaces = p.gapBefore - gluesSeen;
          x += spaces * (spaceWidth + stretch);
          gluesSeen = p.gapBefore;
          const text0 = text.slice(p.start, p.end);
          const out = { text: text0, x, width: p.width, start: p.start, end: p.end };
          x += p.width;
          return out;
        });
        if (hyphenated && placed.length) placed[placed.length - 1].text += "-", placed[placed.length - 1].width += hyphenWidth, placed[placed.length - 1].hyphen = true;
        const left = startsAt(first) + (slot ? slot(lineIndex).x : 0);
        let lineX = left;
        if (align === "center") lineX = left + (avail - lineWidth) / 2;
        else if (align === "right") lineX = left + avail - lineWidth;
        const nextStart = isLast ? offset + para.length : (() => {
          const s = lineStartAfter(items, b);
          return s < items.length ? items[s].start : offset + para.length;
        })();
        const lineStart = lineIndex === 0 ? offset : lines.length ? lines[lines.length - 1].end : offset;
        lines.push({
          start: lineStart,
          end: nextStart,
          visibleEnd: placed.length ? placed[placed.length - 1].end : lineStart,
          para: paraIndex,
          first,
          last: isLast,
          x: lineX,
          width: lineWidth,
          natural,
          pieces: placed,
          hyphenated
        });
        from = lineStartAfter(items, b);
      });
      if (opts.onParagraph) opts.onParagraph(paraIndex, Math.max(1, breaks.length));
      offset += para.length + 1;
    });
    return lines;
  }

  // apps/ZEditor/src/render/hyphenation.js
  var import_en_us = __toESM(require_en_us2());
  var SOFT_HYPHEN = "­";
  var MIN_WORD_LENGTH = 5;
  function englishHyphenator(word) {
    if (word.length < MIN_WORD_LENGTH) return null;
    if (word.length > 1 && word === word.toUpperCase()) return null;
    const pieces = (0, import_en_us.hyphenateSync)(word, { minWordLength: MIN_WORD_LENGTH }).split(SOFT_HYPHEN);
    return pieces.length > 1 ? pieces : null;
  }
  var hyphenator = englishHyphenator;
  function currentHyphenator() {
    return hyphenator;
  }

  // apps/ZEditor/src/render/textLayout.js
  function flowAroundObstacles(text, measure, composeOpts, { columns, columnWidth, columnGap, lineHeight, paraGap, padX, padY, wrap, scale, minSlot, H }) {
    const stride = columnWidth + columnGap;
    const step = Math.max(1, lineHeight / 4);
    const pos = [];
    let after = { col: 0, y: 0, started: false };
    const place = (p, k) => {
      const arr = pos[p] || (pos[p] = []);
      while (arr.length <= k) {
        let col, top;
        if (arr.length === 0) {
          col = after.col;
          top = after.y + (after.started && after.y > 0 ? paraGap : 0);
        } else {
          const prev = arr[arr.length - 1];
          col = prev.col;
          top = prev.top + lineHeight;
        }
        let slot = null;
        for (let guard = 0; guard < 4e3; guard++) {
          if (col >= columns) {
            top = H;
            break;
          }
          if (top > 0 && top + lineHeight > H + 0.01) {
            col++;
            top = 0;
            continue;
          }
          const left = padX + col * stride;
          slot = freeSlot(wrap, left, left + columnWidth, padY + top, padY + top + lineHeight, minSlot, scale);
          if (slot) break;
          top += step;
        }
        if (!slot) slot = { x: 0, width: columnWidth };
        arr.push({ col, top, x: slot.x, width: slot.width });
      }
      return arr[k];
    };
    const lines = composeText(text, measure, {
      ...composeOpts,
      slotFor: place,
      onParagraph: (p, n) => {
        const last = place(p, n - 1);
        after = { col: last.col, y: last.top + lineHeight, started: true };
      }
    });
    const seen = [];
    let overflow = false, bottom = 0;
    for (const l of lines) {
      const k = seen[l.para] = seen[l.para] == null ? 0 : seen[l.para] + 1;
      const at = pos[l.para][k];
      l.col = at.col;
      l.top = at.top;
      if (at.col >= columns) {
        l.hidden = true;
        overflow = true;
        l.x += (columns - 1) * stride;
        continue;
      }
      l.x += at.col * stride;
      bottom = Math.max(bottom, at.top + lineHeight);
    }
    const textHeight = Number.isFinite(H) ? H : Math.max(lineHeight, bottom);
    return { lines, overflow, bottom, textHeight };
  }
  function fitText(ann) {
    if (!ann.fitHeight || !ann.text) return ann;
    const base = { ...ann, fitHeight: void 0 };
    if (measureTextBox(base).height <= ann.fitHeight) return base;
    let lo = 4, hi = ann.fontSize || 16;
    for (let i = 0; i < 12 && hi - lo > 0.25; i++) {
      const mid = (lo + hi) / 2;
      if (measureTextBox({ ...base, fontSize: mid }).height <= ann.fitHeight) lo = mid;
      else hi = mid;
    }
    return { ...base, fontSize: Math.floor(lo * 4) / 4 };
  }
  function wrapTextLines(ctx, text, maxWidth, measure = (s) => ctx.measureText(s).width) {
    const lines = [];
    const cutToFit = (piece) => {
      let chunk = "";
      for (const ch of Array.from(piece)) {
        if (chunk && measure(chunk + ch) > maxWidth) {
          lines.push(chunk);
          chunk = ch;
        } else chunk += ch;
      }
      return chunk;
    };
    for (const para of (text || "").split("\n")) {
      if (para === "") {
        lines.push("");
        continue;
      }
      let current = "";
      para.split(" ").forEach((word, wordIndex) => {
        const atoms = word === "" ? [""] : wrapAtoms(word);
        atoms.forEach((atom, atomIndex) => {
          const joiner = atomIndex === 0 && wordIndex > 0 ? " " : "";
          const test = current + joiner + atom;
          if (current && measure(test) > maxWidth) {
            lines.push(current);
            current = measure(atom) > maxWidth ? cutToFit(atom) : atom;
          } else if (!current && measure(test) > maxWidth) {
            current = cutToFit(test);
          } else {
            current = test;
          }
        });
      });
      lines.push(current);
    }
    return lines;
  }
  function layoutText(ctx, ann, scaleFactor) {
    ann = fitText(ann);
    const look = textLook(ann);
    const cased = caseText(ann.text || "", look.textCase);
    const shownText = look.stacked ? stackText(cased) : cased;
    const fontSize = (ann.fontSize || 16) * scaleFactor;
    const weight = ann.bold ? "700" : "400";
    const styleStr = ann.italic ? "italic" : "normal";
    const family = ann.fontFamily || "sans-serif";
    const variant = look.textCase === "small" ? "small-caps " : "";
    ctx.font = `${styleStr} ${variant}${weight} ${fontSize}px '${family}', sans-serif`;
    if ("letterSpacing" in ctx) ctx.letterSpacing = `${look.letterSpacingPx * scaleFactor}px`;
    if ("fontKerning" in ctx) ctx.fontKerning = look.kerning;
    ctx.textBaseline = "alphabetic";
    ctx.font = `${styleStr} ${variant}${weight} ${ann.fontSize || 16}px '${family}', sans-serif`;
    const metrics = ctx.measureText("Hg");
    ctx.font = `${styleStr} ${variant}${weight} ${fontSize}px '${family}', sans-serif`;
    const ascent = (metrics.fontBoundingBoxAscent != null ? Math.round(metrics.fontBoundingBoxAscent) : (ann.fontSize || 16) * 0.8) * scaleFactor;
    const descent = (metrics.fontBoundingBoxDescent != null ? Math.round(metrics.fontBoundingBoxDescent) : (ann.fontSize || 16) * 0.2) * scaleFactor;
    const lineHeight = fontSize * look.lineHeight;
    const halfLeading = Math.floor(((ann.fontSize || 16) * look.lineHeight - (ascent + descent) / scaleFactor) / 2);
    const baselineOffset = halfLeading * scaleFactor + ascent;
    const x = ann.x * scaleFactor;
    const y = ann.y * scaleFactor;
    const padX = (look.padX + TEXT_BORDER_PX) * scaleFactor, padY = (look.padY + TEXT_BORDER_PX) * scaleFactor;
    const maxWidthCap = AUTO_TEXT_MAX_WIDTH * scaleFactor;
    const baseMeasure = look.ransom || look.curve ? (s) => Array.from(s).reduce((width, ch) => width + ctx.measureText(ch).width, 0) : (s) => ctx.measureText(s).width;
    const baseFont = ctx.font;
    const fontRuns = usesTypeset(ann) ? (ann.colorRuns || []).filter((r) => r.fontFamily != null || r.bold != null || r.italic != null || r.fontSize != null) : [];
    const sizeRuns = fontRuns.filter((r) => r.fontSize != null);
    const spanFont = (run2) => {
      const it = run2.italic != null ? run2.italic : ann.italic;
      const b = run2.bold != null ? run2.bold : ann.bold;
      const size = run2.fontSize != null ? run2.fontSize * scaleFactor : fontSize;
      return `${it ? "italic" : "normal"} ${variant}${b ? "700" : "400"} ${size}px '${run2.fontFamily || family}', sans-serif`;
    };
    const runAtIndex = (index) => fontRuns.find((r) => index >= r.start && index < r.end);
    const fontAt = (index) => {
      const run2 = runAtIndex(index);
      return run2 ? spanFont(run2) : null;
    };
    const measure = fontRuns.length ? (s, at) => {
      if (at == null || !s) return baseMeasure(s);
      let width = 0, pos = 0;
      while (pos < s.length) {
        const index = at + pos;
        const run2 = runAtIndex(index);
        let stop2 = s.length;
        for (const r of fontRuns) {
          if (r.start > index) stop2 = Math.min(stop2, r.start - at);
          if (run2 === r) stop2 = Math.min(stop2, r.end - at);
        }
        const piece = s.slice(pos, stop2);
        if (run2) {
          ctx.font = spanFont(run2);
          width += ctx.measureText(piece).width;
          ctx.font = baseFont;
        } else width += baseMeasure(piece);
        pos = stop2;
      }
      return width;
    } : baseMeasure;
    const typeset = usesTypeset(ann);
    const para = look.paragraph;
    const px = (v) => v * scaleFactor;
    let boxWidth;
    if (ann.width) {
      boxWidth = ann.width * scaleFactor;
    } else if (typeset && para.columns > 1) {
      boxWidth = maxWidthCap;
    } else {
      const indents = typeset ? px(para.indentLeft + Math.max(0, para.indentFirst) + para.indentRight) : 0;
      let at = 0;
      const naturalWidth = Math.max(10, ...shownText.split("\n").map((s) => {
        const w = measure(s, at) + indents;
        at += s.length + 1;
        return w;
      }));
      boxWidth = Math.min(naturalWidth + padX * 2, maxWidthCap);
    }
    const innerWidth = Math.max(4, boxWidth - padX * 2);
    const columns = typeset ? para.columns : 1;
    const columnGap = px(para.columnGap);
    const columnWidth = Math.max(4, (innerWidth - columnGap * (columns - 1)) / columns);
    let typesetLines = null;
    let lines;
    const lineStarts = [];
    let cursor = 0;
    const composeOpts = {
      width: columnWidth,
      align: ann.align || "left",
      alignAt: (ann.colorRuns || []).some((r) => r.align) ? (offset) => {
        const r = (ann.colorRuns || []).find((x2) => x2.align && offset >= x2.start && offset < x2.end);
        return r ? r.align : null;
      } : void 0,
      lastLine: para.lastLine,
      composer: para.composer,
      indentFirst: px(para.indentFirst),
      indentLeft: px(para.indentLeft),
      indentRight: px(para.indentRight),
      hyphenate: para.hyphenate ? currentHyphenator() || void 0 : void 0,
      continued: Boolean(ann.storyContinues)
      // a threaded frame that starts mid-paragraph
    };
    const wrap = typeset && ann.wrapObstacles && ann.wrapObstacles.length ? ann.wrapObstacles : null;
    const lineHeightPx = fontSize * look.lineHeight;
    const frameInnerPx = typeset && para.frameHeight > 0 ? Math.max(lineHeightPx, px(para.frameHeight) - padY * 2) : 0;
    let flowed = null;
    if (wrap) {
      const flowArgs = { columns, columnWidth, columnGap, lineHeight: lineHeightPx, paraGap: px(para.spaceBefore + para.spaceAfter), padX, padY, wrap, scale: scaleFactor, minSlot: fontSize * MIN_SLOT_EMS };
      if (frameInnerPx || columns === 1) {
        flowed = flowAroundObstacles(shownText, measure, composeOpts, { ...flowArgs, H: frameInnerPx || Infinity });
      } else {
        const single = flowAroundObstacles(shownText, measure, composeOpts, { ...flowArgs, columns: 1, H: Infinity });
        let lo = lineHeightPx, hi = Math.max(lineHeightPx, single.bottom);
        for (let k = 0; k < 12 && hi - lo > 0.5; k++) {
          const mid = (lo + hi) / 2;
          if (flowAroundObstacles(shownText, measure, composeOpts, { ...flowArgs, H: mid }).overflow) lo = mid;
          else hi = mid;
        }
        flowed = flowAroundObstacles(shownText, measure, composeOpts, { ...flowArgs, H: hi });
        flowed.textHeight = hi;
      }
      typesetLines = flowed.lines;
    } else if (typeset) {
      typesetLines = composeText(shownText, measure, composeOpts);
    }
    if (typeset) {
      lines = typesetLines.map((l) => shownText.slice(l.start, l.visibleEnd));
      typesetLines.forEach((l) => lineStarts.push(l.start));
    } else {
      lines = wrapTextLines(ctx, shownText, innerWidth, measure);
    }
    if (typeset) {
    } else if (look.stacked) {
      for (const ch of Array.from(ann.text || "")) {
        lineStarts.push(cursor);
        cursor += ch.length;
      }
    } else {
      for (const line of lines) {
        lineStarts.push(cursor);
        cursor += line.length;
        const next = shownText[cursor];
        if (next === "\n" || next === " ") cursor += 1;
      }
    }
    let textHeight = lines.length * lineHeight;
    let overflow = false;
    if (flowed) {
      textHeight = flowed.textHeight;
      overflow = flowed.overflow;
    } else if (typesetLines) {
      const paraGap = px(para.spaceBefore + para.spaceAfter);
      const gapBefore = typesetLines.map((l, i) => i > 0 && l.first ? paraGap : 0);
      const lh = typesetLines.map((l) => {
        let factor = 1;
        for (const r of sizeRuns) if (r.end > l.start && r.start < Math.max(l.visibleEnd, l.start + 1)) factor = Math.max(factor, r.fontSize / (ann.fontSize || 16));
        l.height = lineHeight * factor;
        l.baseShift = baselineOffset * (factor - 1);
        return l.height;
      });
      const seqTop = [];
      let y2 = 0;
      typesetLines.forEach((l, i) => {
        if (i > 0) y2 += lh[i - 1] + gapBefore[i];
        seqTop.push(y2);
      });
      const frameInner = para.frameHeight > 0 ? Math.max(lineHeight, px(para.frameHeight) - padY * 2) : 0;
      if (columns === 1 && !frameInner) {
        typesetLines.forEach((l, i) => {
          l.top = seqTop[i];
        });
        textHeight = typesetLines.length ? y2 + lh[lh.length - 1] : lineHeight;
      } else {
        const place = (H2) => {
          const colOf2 = [];
          const starts2 = [0];
          typesetLines.forEach((l, i) => {
            const colStart = starts2[starts2.length - 1];
            if (i > 0 && seqTop[i] + lh[i] - colStart > H2 + 0.01) starts2.push(seqTop[i] - gapBefore[i]);
            colOf2.push(starts2.length - 1);
          });
          return { colOf: colOf2, starts: starts2 };
        };
        let H = frameInner;
        if (!H) {
          let lo = lineHeight, hi = Math.max(lineHeight, y2 + (lh.length ? lh[lh.length - 1] : lineHeight));
          for (let k = 0; k < 24 && hi - lo > 0.5; k++) {
            const mid = (lo + hi) / 2;
            if (place(mid).starts.length <= columns) hi = mid;
            else lo = mid;
          }
          H = hi;
        }
        const { colOf, starts } = place(H);
        let tallest = 0;
        typesetLines.forEach((l, i) => {
          const c = colOf[i];
          l.col = c;
          if (c >= columns) {
            l.hidden = true;
            overflow = true;
            l.top = H;
            l.x += (columns - 1) * (columnWidth + columnGap);
            return;
          }
          l.top = seqTop[i] - starts[c];
          l.x += c * (columnWidth + columnGap);
          tallest = Math.max(tallest, l.top + lh[i]);
        });
        textHeight = frameInner ? frameInner : Math.max(lineHeight, tallest);
      }
    }
    if (typesetLines) {
      if (ann.storyLength != null) {
        typesetLines.forEach((l) => {
          if (!l.hidden && l.start >= ann.storyLength) {
            l.hidden = true;
            overflow = true;
          }
        });
      }
      const vAlign = ann.verticalAlign === "center" ? 0.5 : ann.verticalAlign === "bottom" ? 1 : 0;
      if (vAlign && frameInnerPx && !wrap) {
        const bottoms = /* @__PURE__ */ new Map();
        typesetLines.forEach((l) => {
          if (!l.hidden) bottoms.set(l.col || 0, Math.max(bottoms.get(l.col || 0) || 0, l.top + (l.height || lineHeight)));
        });
        typesetLines.forEach((l) => {
          if (!l.hidden) l.top += Math.max(0, textHeight - bottoms.get(l.col || 0)) * vAlign;
        });
      }
    }
    let curve = null;
    if (look.curve && look.curve.curveBend !== 0) {
      const widest = Math.max(1, ...lines.map(measure));
      const radius = widest / (Math.abs(look.curve.curveBend) / 100 * Math.PI);
      curve = { radius, sign: look.curve.curveBend > 0 ? 1 : -1, sag: radius * (1 - Math.cos(widest / 2 / radius)) };
    }
    const boxHeight = textHeight + padY * 2 + (curve ? curve.sag : 0);
    return { look, fontSize, lineHeight, baselineOffset, x, y, padX, padY, boxWidth, innerWidth, lines, lineStarts, typesetLines, textHeight, boxHeight, measure, fontAt, ascent, descent, curve, overflow, columns, columnWidth, columnStride: columnWidth + columnGap };
  }
  function textCanvasMargin(ann, look) {
    const fontSize = ann.fontSize || 16;
    let margin = 2;
    if (look.stroke) margin += look.stroke.strokeThickness * 2;
    if (look.shadow) margin += Math.hypot(look.shadow.x, look.shadow.y) + look.shadow.blur * 2;
    if (look.ransom) margin += fontSize * (look.ransom.ransomShift / 100 + 0.35 + look.ransom.ransomSize / 100);
    if (look.curve) margin += fontSize * 0.6;
    return Math.ceil(margin);
  }
  function measureTextBox(ann) {
    const ctx = document.createElement("canvas").getContext("2d");
    const { boxWidth, boxHeight, innerWidth, textHeight, overflow } = layoutText(ctx, ann, 1);
    return { width: boxWidth, height: boxHeight, contentWidth: innerWidth, contentHeight: textHeight, overflow };
  }
  function layoutTextBox(ann) {
    const ctx = document.createElement("canvas").getContext("2d");
    return layoutText(ctx, ann, 1);
  }

  // apps/ZEditor/src/render/wrapShapes.js
  var ROWS = 96;
  var ALPHA_CUTOFF = 24;
  var cache = /* @__PURE__ */ new Map();
  var listeners = /* @__PURE__ */ new Set();
  var version = 0;
  var wrapShapesVersion = () => version;
  function onWrapShapesChange(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }
  function opaqueRows(data, w, h, bandH, k) {
    const rows = [];
    for (let b0 = 0; b0 < h; b0 += bandH) {
      let x0 = Infinity, x1 = -Infinity;
      const b1 = Math.min(h, b0 + bandH);
      for (let y = b0; y < b1; y++) {
        for (let x = 0; x < w; x++) {
          if (data[(y * w + x) * 4 + 3] >= ALPHA_CUTOFF) {
            if (x < x0) x0 = x;
            if (x + 1 > x1) x1 = x + 1;
          }
        }
      }
      if (x1 > x0) rows.push({ y0: b0 * k, y1: b1 * k, x0: x0 * k, x1: x1 * k });
    }
    return rows;
  }
  function load(src) {
    const job = new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const natW = img.naturalWidth, natH = img.naturalHeight;
        const k = Math.max(1, Math.max(natW, natH) / 400);
        const w = Math.max(1, Math.round(natW / k)), h = Math.max(1, Math.round(natH / k));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, w, h);
        const data = ctx.getImageData(0, 0, w, h).data;
        resolve(opaqueRows(data, w, h, Math.max(1, Math.ceil(h / ROWS)), natW / w));
      };
      img.onerror = () => resolve(null);
      img.src = src;
    }).then((rows) => {
      cache.set(src, rows);
      version++;
      listeners.forEach((fn) => fn());
      return rows;
    });
    cache.set(src, job);
    if (cache.size > 64) cache.delete(cache.keys().next().value);
    return job;
  }
  function wrapRowsFor(ann) {
    if (!ann.src) return null;
    const hit = cache.get(ann.src);
    if (hit === void 0) {
      load(ann.src);
      return null;
    }
    return hit instanceof Promise ? null : hit;
  }
  async function prepareWrapShapes(pages) {
    const jobs = [];
    for (const page of pages) {
      for (const a of page.annotations || []) {
        if (a.type !== "image" || a.textWrap !== "shape" || !a.src) continue;
        const hit = cache.get(a.src);
        jobs.push(hit === void 0 ? load(a.src) : hit);
      }
    }
    await Promise.all(jobs);
  }

  // apps/ZEditor/src/render/pageText.js
  var cache2 = /* @__PURE__ */ new WeakMap();
  var canThread = (head) => !(head.ransom || head.curve || head.vertical === "stacked");
  function withWrap(ann, annotations) {
    if (ann.type !== "text") return ann;
    const obstacles = wrapObstaclesFor(ann, annotations, wrapRowsFor);
    if (!obstacles && !ann.wrapObstacles) return ann;
    return { ...ann, wrapObstacles: obstacles || void 0 };
  }
  function fittedLength(view) {
    const layout = layoutTextBox(view);
    const firstHidden = (layout.typesetLines || []).find((l) => l.hidden);
    return firstHidden ? firstHidden.start : (view.text || "").length;
  }
  function resolvePageText(annotations) {
    if (!annotations || !annotations.length) return annotations || [];
    const version2 = wrapShapesVersion();
    const hit = cache2.get(annotations);
    if (hit && hit.version === version2) return hit.result;
    const replaced = /* @__PURE__ */ new Map();
    for (const chain of storyChains(annotations)) {
      const head = chain[0];
      if (!canThread(head)) continue;
      const story = head.text || "";
      let offset = 0;
      const views = [];
      chain.forEach((frame, i) => {
        const base = i === 0 ? { ...head, storyLength: void 0 } : followerView(head, frame, Math.min(offset, story.length));
        let view = withWrap({ ...base, storyHeadId: head.id, storyIndex: i, storyPrevId: i > 0 ? chain[i - 1].id : void 0, storyNextId: chain[i + 1] ? chain[i + 1].id : void 0 }, annotations);
        if (i < chain.length - 1) {
          const fits = fittedLength(view);
          if (fits < (view.text || "").length) view = { ...view, storyLength: fits };
          offset = (view.storyOffset || 0) + fits;
        }
        views.push(view);
      });
      views.forEach((v) => replaced.set(v.id, v));
    }
    let changed = replaced.size > 0;
    const result = annotations.map((a) => {
      if (replaced.has(a.id)) return replaced.get(a.id);
      const w = withWrap(a, annotations);
      if (w !== a) changed = true;
      return w;
    });
    const out = changed ? result : annotations;
    cache2.set(annotations, { version: version2, result: out });
    return out;
  }

  // apps/ZEditor/src/model/annotations.js
  function withGroupMates(annotations, ids) {
    const groups = new Set(annotations.filter((a) => ids.includes(a.id) && a.groupId).map((a) => a.groupId));
    if (groups.size === 0) return ids;
    const mates = annotations.filter((a) => groups.has(a.groupId) && !a.hidden && !a.locked).map((a) => a.id);
    return [.../* @__PURE__ */ new Set([...ids, ...mates])];
  }
  function groupColor(groupId) {
    let hash = 0;
    for (const ch of String(groupId)) hash = (hash * 31 + ch.charCodeAt(0)) % 360;
    return `hsl(${hash * 47 % 360} 70% 60%)`;
  }
  function translatedAnnotation(ann, dx, dy) {
    return ann.type === "stroke" ? { ...ann, points: ann.points.map(([px, py]) => [px + dx, py + dy]) } : { ...ann, x: ann.x + dx, y: ann.y + dy };
  }
  function legacyLayerOrder(annotations) {
    const rank = { image: 0, stroke: 1, text: 2 };
    return annotations.slice().sort((a, b) => rank[a.type] - rank[b.type]);
  }
  function orderAfterMove(count, fromIndices, insertBefore) {
    const moving = new Set(fromIndices);
    const allIndices = Array.from({ length: count }, (_, i) => i);
    const block = allIndices.filter((i) => moving.has(i));
    const rest = allIndices.filter((i) => !moving.has(i));
    const insertAt = rest.filter((i) => i < insertBefore).length;
    const newOrder = [...rest.slice(0, insertAt), ...block, ...rest.slice(insertAt)];
    return newOrder.every((oldIdx, newIdx) => oldIdx === newIdx) ? null : newOrder;
  }
  function bboxOf(ann) {
    if (ann.type === "text") {
      return { x: ann.x, y: ann.y, width: ann.width || 160, height: ann.height || 26 };
    }
    const xs = ann.points.map((p) => p[0]);
    const ys = ann.points.map((p) => p[1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    return { x: minX, y: minY, width: Math.max(1, maxX - minX), height: Math.max(1, maxY - minY) };
  }

  // apps/ZEditor/src/model/clipping.js
  var isClipped = (a) => Boolean(a) && Boolean(a.clipToBelow);
  function clipBaseIndex(items, index) {
    for (let i = index - 1; i >= 0; i--) {
      if (!isClipped(items[i])) return i;
    }
    return -1;
  }
  function canClipAt(items, index) {
    return Boolean(items[index]) && clipBaseIndex(items, index) >= 0;
  }
  function clipTargets(items, ids) {
    const rows = items.map((a, i) => ids.includes(a.id) ? i : -1).filter((i) => i >= 0);
    const candidates = rows.length > 1 ? rows.slice(1) : rows;
    return candidates.filter((i) => !isClipped(items[i]) && canClipAt(items, i)).map((i) => items[i].id);
  }

  // apps/ZEditor/src/model/pageFilters.js
  var PAGE_FILTER_OPTIONS = [
    { key: "none", label: "None" },
    { key: "grayscale", label: "Grayscale" },
    { key: "duotone", label: "Duotone" },
    { key: "halftone", label: "Halftone" },
    { key: "threshold", label: "Threshold" }
  ];
  var IMAGE_FILTER_OPTIONS = [
    { key: "match", label: "Match Page" },
    ...PAGE_FILTER_OPTIONS,
    { key: "xerox", label: "Xerox" }
    // per-image only
  ];
  var INK_COLOR_CONTROL = { kind: "color", prop: "inkColor", label: "Ink color", fallback: "#000000" };
  var PAPER_COLOR_CONTROL = { kind: "color", prop: "paperColor", label: "Paper color", fallback: "#ffffff" };
  var THRESHOLD_FILTER_CONTROLS = [
    { kind: "slider", prop: "level", label: "Cutoff", min: 0, max: 255, fallback: 128 },
    INK_COLOR_CONTROL,
    PAPER_COLOR_CONTROL
  ];
  var XEROX_FILTER_CONTROLS = [
    { kind: "slider", prop: "contrast", label: "Contrast", min: 0, max: 100, fallback: 75 },
    { kind: "slider", prop: "exposure", label: "Exposure", min: 0, max: 100, fallback: 50 },
    { kind: "slider", prop: "speckle", label: "Toner speckle", min: 0, max: 100, fallback: 35 },
    { kind: "slider", prop: "streaks", label: "Streaks", min: 0, max: 100, fallback: 25 },
    { kind: "slider", prop: "edgeWear", label: "Edge wear", min: 0, max: 100, fallback: 30 },
    { kind: "slider", prop: "xeroxVariation", label: "Variation", min: 0, max: 100, fallback: 0 },
    INK_COLOR_CONTROL,
    PAPER_COLOR_CONTROL
  ];
  var DEFAULT_DUOTONE_DARK = "#1a1a1a";
  var DEFAULT_DUOTONE_LIGHT = "#ffe066";
  var MIN_HALFTONE_CELL_SIZE = 1;
  var HALFTONE_FILTER_CONTROLS = [
    {
      kind: "select",
      prop: "colorMode",
      label: "Color",
      fallback: "mono",
      options: [{ key: "mono", label: "Monochrome" }, { key: "cmyk", label: "Full color (CMYK)" }]
    },
    {
      kind: "select",
      prop: "screen",
      label: "Screen",
      fallback: "dotsLines",
      options: [{ key: "dotsLines", label: "Dots / Lines" }, { key: "dither", label: "1-Bit Dither" }]
    },
    { kind: "slider", prop: "lineBlend", label: "Dots ↔ Lines (%)", min: 0, max: 100, fallback: 0, showIf: (v) => v.screen !== "dither" },
    { kind: "slider", prop: "cellSize", label: "Size (px)", min: MIN_HALFTONE_CELL_SIZE, max: 16, fallback: 6 },
    { kind: "slider", prop: "angle", label: "Angle (°)", min: 0, max: 180, fallback: 0 },
    { kind: "color", prop: "color", label: "Ink color", fallback: "#1a1a1a", showIf: (v) => v.colorMode !== "cmyk" }
  ];
  var FILTER_CONTROLS = {
    threshold: THRESHOLD_FILTER_CONTROLS,
    halftone: HALFTONE_FILTER_CONTROLS,
    xerox: XEROX_FILTER_CONTROLS
  };
  var DEFAULT_PAGE_FILTER = { type: "none" };
  function effectiveImageFilter(ann, pageFilter) {
    const f = ann.filter;
    if (!f || f.type === "match") return pageFilter || { type: "none" };
    if (f.type === "none") return { type: "none" };
    return f;
  }

  // apps/ZEditor/src/model/rect.js
  var isGradientFill = (v) => v.fillType !== "solid";
  var RECT_CONTROLS = [
    {
      kind: "select",
      prop: "fillType",
      label: "Fill",
      fallback: "solid",
      options: [{ key: "solid", label: "Solid" }, { key: "linear", label: "Linear gradient" }, { key: "radial", label: "Radial gradient" }]
    },
    { kind: "color", prop: "fillColor", label: "Fill color", fallback: "#1a1a1a" },
    { kind: "slider", prop: "fillAlpha", label: "Fill opacity (%)", min: 0, max: 100, fallback: 100 },
    { kind: "color", prop: "gradientColor", label: "Gradient color", fallback: "#ffe066", showIf: isGradientFill },
    { kind: "slider", prop: "gradientAlpha", label: "Gradient opacity (%)", min: 0, max: 100, fallback: 100, showIf: isGradientFill },
    { kind: "slider", prop: "gradientAngle", label: "Angle (°)", min: 0, max: 360, fallback: 90, showIf: (v) => v.fillType === "linear" },
    { kind: "slider", prop: "gradientStart", label: "Start (%)", min: 0, max: 100, fallback: 0, showIf: isGradientFill },
    { kind: "slider", prop: "gradientEnd", label: "End (%)", min: 0, max: 100, fallback: 100, showIf: isGradientFill },
    OPACITY_CONTROL,
    BLEND_CONTROL
  ];
  var RECT_FILL_PROPS = RECT_CONTROLS.map((c) => c.prop).filter((p) => p !== OPACITY_CONTROL.prop && p !== BLEND_CONTROL.prop);
  var RECT_FILL_CONTROLS = RECT_CONTROLS.filter((c) => RECT_FILL_PROPS.includes(c.prop));
  var MIN_RECT_SIZE = 2;
  var DEFAULT_RECT_SIZE = { width: 160, height: 110 };

  // apps/ZEditor/src/model/text/textStyles.js
  var TEXT_STYLE_BASICS = ["fontFamily", "fontSize", "bold", "italic", "underline", "color", "align"];
  var TEXT_STYLE_PARAGRAPH = ["leadingPt", "kerning", "composer", "hyphenate", "justifyLast", "indentFirst", "indentLeft", "indentRight", "spaceBefore", "spaceAfter"];
  var TEXT_STYLE_PROPS = [
    ...TEXT_STYLE_BASICS,
    "lineSpacing",
    "letterSpacing",
    "strike",
    "textCase",
    "vertical",
    "fillAlpha",
    ...TEXT_STYLE_PARAGRAPH,
    ...TEXT_EFFECTS.flatMap((effect) => [effect.key, ...effect.controls.map((c) => c.prop)])
  ];
  var BUILT_IN_TEXT_STYLES = [
    { name: "H1", builtIn: true, props: { fontSize: 24.2, bold: true, lineSpacing: 110 } },
    // 22 pt
    { name: "H2", builtIn: true, props: { fontSize: 17.6, bold: true, lineSpacing: 115 } },
    // 16 pt
    { name: "H3", builtIn: true, props: { fontSize: 14.3, bold: true, lineSpacing: 125 } },
    // 13 pt
    { name: "P", builtIn: true, props: { fontSize: 12.1, lineSpacing: 140 } },
    // 11 pt
    { name: "Quote", builtIn: true, props: { fontSize: 12.1, italic: true, lineSpacing: 140, indentLeft: 12, indentRight: 12 } },
    // 11 pt, indented 12 pt each side
    { name: "Remark", builtIn: true, props: { fontSize: 9.9, italic: true, lineSpacing: 130 } }
    // 9 pt
  ];
  function captureTextStyle(ann) {
    const props = {};
    TEXT_STYLE_PROPS.forEach((prop) => {
      if (ann[prop] !== void 0) props[prop] = ann[prop];
    });
    return props;
  }
  var TEXT_STYLE_KEEP_IF_MISSING = ["fontFamily", "fontSize", "color"];
  var TEXT_STYLE_RESETS = { bold: false, italic: false, underline: false, align: "left" };
  function textStylePatch(style) {
    const patch = {};
    TEXT_STYLE_PROPS.forEach((prop) => {
      if (style.props[prop] !== void 0) patch[prop] = style.props[prop];
      else if (prop in TEXT_STYLE_RESETS) patch[prop] = TEXT_STYLE_RESETS[prop];
      else if (!TEXT_STYLE_KEEP_IF_MISSING.includes(prop)) patch[prop] = void 0;
    });
    return patch;
  }
  var TEXT_STYLES_STORAGE_KEY = "zeditor.textStyles";
  function readStoredTextStyles() {
    try {
      const saved = JSON.parse(localStorage.getItem(TEXT_STYLES_STORAGE_KEY) || "[]");
      return Array.isArray(saved) ? saved.filter((s) => s && s.name && s.props) : [];
    } catch (err) {
      return [];
    }
  }
  function resolvedStyleProps(styles, name) {
    const chain = [];
    const seen = /* @__PURE__ */ new Set();
    for (let current = styles.find((s) => s.name === name); current && !seen.has(current.name); current = current.basedOn ? styles.find((s) => s.name === current.basedOn) : null) {
      seen.add(current.name);
      chain.unshift(current);
    }
    const merged = Object.assign({}, ...chain.map((s) => s.props));
    for (const key of Object.keys(merged)) if (merged[key] === null) delete merged[key];
    return merged;
  }
  function styleDiff(base, captured) {
    const diff = {};
    for (const key of Object.keys(captured)) {
      if (JSON.stringify(captured[key]) !== JSON.stringify(base[key])) diff[key] = captured[key];
    }
    for (const key of Object.keys(base)) if (!(key in captured)) diff[key] = null;
    return diff;
  }
  function withStyleOverrides(ann, patch) {
    if (!ann || !ann.styleName || "styleName" in patch || "styleOverrides" in patch) return patch;
    const changed = Object.keys(patch).filter((key) => TEXT_STYLE_PROPS.includes(key));
    if (!changed.length) return patch;
    const current = ann.styleOverrides || [];
    const merged = Array.from(/* @__PURE__ */ new Set([...current, ...changed]));
    return merged.length === current.length ? patch : { ...patch, styleOverrides: merged };
  }
  function relinkPatch(ann, styles) {
    if (!ann || ann.type !== "text" || !ann.styleName || !styles.some((s) => s.name === ann.styleName)) return null;
    const full = textStylePatch({ props: resolvedStyleProps(styles, ann.styleName) });
    const keep = new Set(ann.styleOverrides || []);
    const patch = {};
    for (const key of Object.keys(full)) if (!keep.has(key)) patch[key] = full[key];
    return patch;
  }

  // apps/ZEditor/src/model/photoAdjust.js
  var adjustSlider = (prop, label, fallback = 0, min = -100, max = 100) => ({ kind: "slider", prop, label, min, max, fallback });
  var PHOTO_ADJUST_SECTIONS = [
    {
      id: "light",
      title: "Light",
      controls: [
        adjustSlider("adjExposure", "Exposure"),
        adjustSlider("adjBrightness", "Brightness"),
        adjustSlider("adjContrast", "Contrast"),
        adjustSlider("adjHighlights", "Highlights"),
        adjustSlider("adjShadows", "Shadows")
      ]
    },
    {
      id: "color",
      title: "Color",
      controls: [
        adjustSlider("adjSaturation", "Saturation"),
        adjustSlider("adjTemperature", "White balance: cool ↔ warm"),
        adjustSlider("adjTint", "Tint: green ↔ magenta")
      ]
    },
    {
      id: "levels",
      title: "Levels",
      controls: [
        adjustSlider("adjBlack", "Black point", 0, 0, 254),
        adjustSlider("adjWhite", "White point", 255, 1, 255),
        adjustSlider("adjGamma", "Midtones (%)", 100, 10, 300)
      ]
    }
  ];
  var PHOTO_ADJUST_CONTROLS = PHOTO_ADJUST_SECTIONS.flatMap((s) => s.controls);
  var isAdjusted = (ann, control) => ann[control.prop] != null && ann[control.prop] !== control.fallback;
  var hasPhotoAdjust = (ann) => PHOTO_ADJUST_CONTROLS.some((c) => isAdjusted(ann, c));

  // apps/ZEditor/src/model/trace/traceSettings.js
  var TRACE_PRESETS = [
    { key: "bw", label: "Black & White", settings: { mode: "bw", threshold: 128, detail: 50, corners: 50, noise: 8, ignoreWhite: "drop" } },
    { key: "lineart", label: "Line Art", settings: { mode: "bw", threshold: 160, detail: 75, corners: 40, noise: 4, ignoreWhite: "drop" } },
    { key: "silhouette", label: "Silhouette", settings: { mode: "bw", threshold: 235, detail: 30, corners: 50, noise: 25, ignoreWhite: "drop" } },
    { key: "outline", label: "Outline", settings: { mode: "bw", threshold: 128, detail: 60, corners: 50, noise: 8, ignoreWhite: "drop", fills: "off", strokes: "on", strokeWidth: 2 } },
    { key: "gray", label: "Shades of Grey", settings: { mode: "gray", colors: 4, detail: 50, corners: 50, noise: 10, ignoreWhite: "keep" } },
    { key: "color3", label: "3 Colours", settings: { mode: "color", colors: 3, detail: 45, corners: 50, noise: 16, ignoreWhite: "keep" } },
    { key: "color6", label: "6 Colours", settings: { mode: "color", colors: 6, detail: 55, corners: 50, noise: 12, ignoreWhite: "keep" } },
    { key: "color16", label: "16 Colours", settings: { mode: "color", colors: 16, detail: 65, corners: 50, noise: 8, ignoreWhite: "keep" } }
  ];
  var DEFAULT_TRACE_PRESET = "bw";
  var COMMON = { method: "overlap", fills: "on", strokes: "off", strokeWidth: 2, view: "result" };
  var TRACE_MAX_SIDE = 900;
  var isBw = (v) => v.mode === "bw";
  var TRACE_VIEW_OPTIONS = [
    { key: "result", label: "Tracing result" },
    { key: "outlines", label: "Outlines" },
    { key: "outlinesSource", label: "Outlines with source image" },
    { key: "source", label: "Source image" }
  ];
  var TRACE_MAIN_CONTROLS = [
    {
      kind: "select",
      prop: "mode",
      label: "Mode",
      fallback: "bw",
      options: [{ key: "bw", label: "Black & white" }, { key: "gray", label: "Shades of grey" }, { key: "color", label: "Colour" }]
    },
    { kind: "slider", prop: "threshold", label: "Threshold", min: 0, max: 255, fallback: 128, showIf: isBw, hint: "Higher turns more of the picture black (pale areas too); lower keeps only the darkest parts." },
    { kind: "slider", prop: "colors", label: "Colours", min: 2, max: 16, fallback: 6, showIf: (v) => !isBw(v), hint: "How many colours (or greys) the picture is reduced to. Fewer = flatter, poster-like." }
  ];
  var TRACE_ADVANCED_CONTROLS = [
    { kind: "slider", prop: "detail", label: "Paths", min: 0, max: 100, fallback: 50, hint: "Low = loose, smooth, blobby outlines. High = outlines hug the pixels closely." },
    { kind: "slider", prop: "corners", label: "Corners", min: 0, max: 100, fallback: 50, hint: "Low = bends become round curves. High = bends become sharp, cut-paper corners." },
    { kind: "slider", prop: "noise", label: "Noise", min: 0, max: 100, fallback: 8, hint: "Drops specks and dust smaller than this. Raise it to clean up grainy photos." },
    {
      kind: "select",
      prop: "ignoreWhite",
      label: "White areas",
      fallback: "keep",
      options: [{ key: "keep", label: "Keep as shapes" }, { key: "drop", label: "Leave see-through" }],
      hint: "See-through lets the paper (or what's below) show where the picture was white."
    }
  ];
  var TRACE_DRAW_PROPS = ["fills", "strokes", "strokeWidth", "view"];
  function presetSettings(key) {
    const preset = TRACE_PRESETS.find((p) => p.key === key) || TRACE_PRESETS[0];
    return { preset: preset.key, colors: 6, threshold: 128, ...COMMON, ...preset.settings };
  }
  var TRACE_SHAPE_PROPS = ["mode", "threshold", "colors", "detail", "corners", "noise", "ignoreWhite", "method"];
  var TRACE_ADVANCED_PROPS = ["detail", "corners", "noise", "ignoreWhite", "method"];
  function matchesPreset(settings) {
    const s = normalizeTraceSettings(settings);
    const p = presetSettings(s.preset);
    return TRACE_SHAPE_PROPS.every((k) => k === "threshold" && s.mode !== "bw" || k === "colors" && s.mode === "bw" || s[k] === p[k]);
  }
  function normalizeTraceSettings(s = {}) {
    const base = presetSettings(s.preset || DEFAULT_TRACE_PRESET);
    const v = { ...base, ...s };
    const clamp3 = (x, lo, hi, fb) => Number.isFinite(Number(x)) ? Math.min(hi, Math.max(lo, Math.round(Number(x)))) : fb;
    return {
      preset: v.preset,
      mode: ["bw", "gray", "color"].includes(v.mode) ? v.mode : "bw",
      threshold: clamp3(v.threshold, 0, 255, 128),
      colors: clamp3(v.colors, 2, 16, 6),
      detail: clamp3(v.detail, 0, 100, 50),
      corners: clamp3(v.corners, 0, 100, 50),
      noise: clamp3(v.noise, 0, 100, 8),
      ignoreWhite: v.ignoreWhite === "drop" ? "drop" : "keep",
      method: v.method === "abut" ? "abut" : "overlap",
      fills: v.fills === "off" ? "off" : "on",
      strokes: v.strokes === "on" ? "on" : "off",
      strokeWidth: clamp3(v.strokeWidth, 1, 20, 2),
      view: TRACE_VIEW_OPTIONS.some((o) => o.key === v.view) ? v.view : "result"
    };
  }
  function tracerParams(settings, size = TRACE_MAX_SIDE) {
    const s = normalizeTraceSettings(settings);
    const tight = 0.35, loose = Math.max(1.5, size / 50);
    const speck = s.noise / 100 * (Math.max(size, 200) / 20);
    return {
      tolerance: loose * Math.pow(tight / loose, s.detail / 100),
      cornerAngle: 150 - s.corners / 100 * 120,
      minArea: speck * speck
    };
  }

  // apps/ZEditor/src/model/trace/traceLayer.js
  var TRACE_LAYER_PROPS = ["trace", "traceSource", "traceW", "traceH", "paths", "recolor"];
  var isLiveTrace = (ann) => ann.type === "trace" && Boolean(ann.traceSource);
  function traceColorOf(ann, color) {
    const changed = ann.recolor && ann.recolor[color];
    return changed || color;
  }
  function traceDrawList(ann) {
    const s = normalizeTraceSettings(ann.trace);
    const list = [];
    for (const p of ann.paths || []) {
      const color = traceColorOf(ann, p.color);
      if (color === "none") continue;
      const fill = s.fills === "on" ? color : null;
      const stroke = s.strokes === "on" ? color : null;
      if (fill || stroke) list.push({ d: p.d, fill, stroke, strokeWidth: s.strokeWidth });
    }
    return list;
  }
  function newTraceLayer(id, image, traceSource, settings, result) {
    return {
      id,
      type: "trace",
      x: image.x,
      y: image.y,
      width: image.width,
      height: image.height,
      angle: image.angle,
      trace: normalizeTraceSettings(settings),
      traceSource,
      ...result
    };
  }
  function patchedTraceSettings(current, patch, presetSettings2) {
    const now = normalizeTraceSettings(current);
    if (patch.preset && patch.preset !== now.preset) return normalizeTraceSettings({ ...presetSettings2(patch.preset), view: now.view });
    return normalizeTraceSettings({ ...now, ...patch });
  }
  function expandedTracePatch(ann) {
    const paths = (ann.paths || []).map((p) => ({ ...p, color: traceColorOf(ann, p.color) })).filter((p) => p.color !== "none");
    return { paths, recolor: void 0, traceSource: void 0, trace: { ...normalizeTraceSettings(ann.trace), view: "result" } };
  }
  function traceContentBounds(ann) {
    const list = traceDrawList(ann);
    if (!list.length || !ann.traceW || !ann.traceH) return null;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const item of list) {
      const nums = item.d.match(/-?\d+(?:\.\d+)?/g) || [];
      for (let i = 0; i + 1 < nums.length; i += 2) {
        const px = Number(nums[i]), py = Number(nums[i + 1]);
        if (px < x0) x0 = px;
        if (px > x1) x1 = px;
        if (py < y0) y0 = py;
        if (py > y1) y1 = py;
      }
      const pad = item.stroke ? item.strokeWidth / 2 : 0;
      x0 -= pad;
      y0 -= pad;
      x1 += pad;
      y1 += pad;
    }
    if (!(x1 > x0 && y1 > y0)) return null;
    const sx = ann.width / ann.traceW, sy = ann.height / ann.traceH;
    const cx = ann.width / 2, cy = ann.height / 2;
    const rad = (ann.angle || 0) * Math.PI / 180, cos = Math.cos(rad), sin = Math.sin(rad);
    const xs = [], ys = [];
    for (const [px, py] of [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]) {
      const lx = px * sx - cx, ly = py * sy - cy;
      xs.push(ann.x + cx + lx * cos - ly * sin);
      ys.push(ann.y + cy + lx * sin + ly * cos);
    }
    return { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
  }

  // apps/ZEditor/src/render/boxEffects.js
  function drawTextureMarks(ctx, ann) {
    const { width: w, height: h } = ann;
    const shortSide = Math.min(w, h);
    const longSide = Math.max(w, h);
    const { textureColor, textureGrit, textureDust, textureScratches, textureVariation } = effectSettings(ann, TEXTURE_EFFECT);
    const atLeast = (minimum, size) => Math.max(minimum, size);
    const paintMarks = (stream, count, alpha, paint, addMark) => {
      const noise = noiseStream(textureVariation, stream);
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      for (let i = 0; i < Math.round(count); i++) addMark(noise);
      paint();
    };
    const fill = () => ctx.fill();
    const stroke = () => ctx.stroke();
    ctx.save();
    ctx.fillStyle = textureColor;
    ctx.strokeStyle = textureColor;
    ctx.lineCap = "round";
    paintMarks(1, textureGrit * 60, 0.85, fill, (noise) => {
      const size = atLeast(0.5, shortSide * (2e-3 + noise() * 6e-3));
      ctx.rect(noise() * w, noise() * h, size, size);
    });
    paintMarks(2, textureDust * 1.5, 0.75, fill, (noise) => {
      const radius = atLeast(0.4, shortSide * (2e-3 + noise() ** 2 * 0.012));
      const x = noise() * w, y = noise() * h;
      ctx.moveTo(x + radius, y);
      ctx.arc(x, y, radius, 0, Math.PI * 2);
    });
    ctx.lineWidth = atLeast(0.4, shortSide * 2e-3);
    paintMarks(3, textureDust * 0.8, 0.75, stroke, (noise) => {
      const x = noise() * w, y = noise() * h;
      const heading = noise() * Math.PI * 2;
      const length = shortSide * (0.02 + noise() * 0.08);
      const bend = (noise() - 0.5) * 1.6;
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(
        x + Math.cos(heading + bend) * length * 0.6,
        y + Math.sin(heading + bend) * length * 0.6,
        x + Math.cos(heading) * length,
        y + Math.sin(heading) * length
      );
    });
    ctx.lineWidth = atLeast(0.4, shortSide * 15e-4);
    paintMarks(4, textureScratches * 0.3, 0.6, stroke, (noise) => {
      const x = noise() * w, y = noise() * h;
      const heading = -Math.PI / 2 + (noise() - 0.5) * 0.7;
      const length = longSide * (0.15 + noise() * 0.6);
      const bend = (noise() - 0.5) * 0.08;
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(
        x + Math.cos(heading + bend) * length * 0.5,
        y + Math.sin(heading + bend) * length * 0.5,
        x + Math.cos(heading) * length,
        y + Math.sin(heading) * length
      );
    });
    ctx.restore();
  }
  function rotateAboutCenter(ctx, ann, centerX, centerY) {
    const angle = angleOf(ann);
    if (!angle) return;
    ctx.translate(centerX, centerY);
    ctx.rotate(angle * Math.PI / 180);
    ctx.translate(-centerX, -centerY);
  }
  function drawBoxWithEffects(ctx, ann, scaleFactor, paintContent) {
    const x = ann.x * scaleFactor, y = ann.y * scaleFactor;
    const w = ann.width * scaleFactor, h = ann.height * scaleFactor;
    ctx.save();
    rotateAboutCenter(ctx, ann, x + w / 2, y + h / 2);
    const shadow = imageShadowOffset(ann);
    if (shadow) {
      ctx.shadowColor = shadow.color;
      ctx.shadowOffsetX = shadow.x * scaleFactor;
      ctx.shadowOffsetY = shadow.y * scaleFactor;
      ctx.shadowBlur = shadow.blur * scaleFactor;
    }
    const outline = imageEdgeOutline(ann);
    const stroke = ann.stroke ? effectSettings(ann, STROKE_EFFECT) : null;
    if (outline || stroke || ann.texture) {
      const pad = stroke ? Math.ceil(stroke.strokeThickness * STROKE_MITER_LIMIT / 2 * scaleFactor) + 2 : 0;
      const cut = document.createElement("canvas");
      cut.width = Math.max(1, Math.ceil(w)) + pad * 2;
      cut.height = Math.max(1, Math.ceil(h)) + pad * 2;
      const cctx = cut.getContext("2d");
      cctx.translate(pad, pad);
      cctx.scale(scaleFactor, scaleFactor);
      cctx.save();
      if (outline) cctx.clip(new Path2D(outline));
      paintContent(cctx);
      if (ann.texture) drawTextureMarks(cctx, ann);
      cctx.restore();
      if (stroke) {
        cctx.strokeStyle = stroke.strokeColor;
        cctx.lineWidth = stroke.strokeThickness;
        cctx.lineJoin = "miter";
        cctx.miterLimit = STROKE_MITER_LIMIT;
        cctx.stroke(new Path2D(outline || rectOutline(ann)));
      }
      ctx.drawImage(cut, x - pad, y - pad);
    } else {
      ctx.translate(x, y);
      ctx.scale(scaleFactor, scaleFactor);
      paintContent(ctx);
    }
    ctx.restore();
  }
  async function drawWithOpacity(ctx, opacity, draw, blend) {
    const mixes = blend && blend !== "normal";
    if (opacity >= 1 && !mixes) {
      await draw(ctx);
      return;
    }
    const layer = document.createElement("canvas");
    layer.width = ctx.canvas.width;
    layer.height = ctx.canvas.height;
    await draw(layer.getContext("2d"));
    ctx.save();
    ctx.globalAlpha = opacity;
    if (mixes) ctx.globalCompositeOperation = blend;
    ctx.drawImage(layer, 0, 0);
    ctx.restore();
  }

  // apps/ZEditor/src/model/color.js
  function rgbaCss(hex2, alphaPercent) {
    const { r, g, b } = hexToRgb(hex2);
    return `rgba(${r},${g},${b},${alphaPercent / 100})`;
  }
  function hexToRgb(hex2) {
    const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex2 || "");
    return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : { r: 0, g: 0, b: 0 };
  }

  // apps/ZEditor/src/render/filters/luma.js
  function lumaOverWhite(data, index) {
    const alpha = data[index + 3] / 255;
    const luma = data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114;
    return luma * alpha + 255 * (1 - alpha);
  }
  var LUMINANCE_MATRIX_VALUES = "0.299 0.587 0.114 0 0 0.299 0.587 0.114 0 0 0.299 0.587 0.114 0 0 0 0 0 1 0";

  // apps/ZEditor/src/render/filters/colorRemap.js
  function applyColorRemap(ctx, canvas, filter) {
    const { width, height } = canvas;
    if (width === 0 || height === 0) return;
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    if (filter.type === "grayscale") {
      for (let i = 0; i < data.length; i += 4) {
        const lum = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        data[i] = data[i + 1] = data[i + 2] = lum;
      }
    } else if (filter.type === "duotone") {
      const dark = hexToRgb(filter.darkColor || DEFAULT_DUOTONE_DARK);
      const light = hexToRgb(filter.lightColor || DEFAULT_DUOTONE_LIGHT);
      for (let i = 0; i < data.length; i += 4) {
        const lum = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) / 255;
        data[i] = dark.r + (light.r - dark.r) * lum;
        data[i + 1] = dark.g + (light.g - dark.g) * lum;
        data[i + 2] = dark.b + (light.b - dark.b) * lum;
      }
    } else if (filter.type === "threshold") {
      const { level, inkColor, paperColor } = controlValues(filter, THRESHOLD_FILTER_CONTROLS);
      const ink = hexToRgb(inkColor);
      const paper = hexToRgb(paperColor);
      for (let i = 0; i < data.length; i += 4) {
        const lum = lumaOverWhite(data, i);
        const c = lum >= level ? paper : ink;
        data[i] = c.r;
        data[i + 1] = c.g;
        data[i + 2] = c.b;
      }
    }
    ctx.putImageData(imageData, 0, 0);
  }

  // apps/ZEditor/src/render/filters/halftone.js
  var BAYER_8X8 = [
    [0, 32, 8, 40, 2, 34, 10, 42],
    [48, 16, 56, 24, 50, 18, 58, 26],
    [12, 44, 4, 36, 14, 46, 6, 38],
    [60, 28, 52, 20, 62, 30, 54, 22],
    [3, 35, 11, 43, 1, 33, 9, 41],
    [51, 19, 59, 27, 49, 17, 57, 25],
    [15, 47, 7, 39, 13, 45, 5, 37],
    [63, 31, 55, 23, 61, 29, 53, 21]
  ];
  var CMYK_PLATES = [
    { ink: "#00ffff", angleOffset: 15, channel: 0 },
    { ink: "#ff00ff", angleOffset: 75, channel: 1 },
    { ink: "#ffff00", angleOffset: 0, channel: 2 },
    { ink: "#000000", angleOffset: 45, channel: 3 }
  ];
  function cmykCoverage(r, g, b, channel) {
    const k = 1 - Math.max(r, g, b);
    if (channel === 3) return k;
    if (k >= 1) return 0;
    return (1 - [r, g, b][channel] - k) / (1 - k);
  }
  function drawHalftoneScreen(ctx, sourceImageData, width, height, cellSize, filter) {
    const { colorMode, angle, color } = controlValues(filter, HALFTONE_FILTER_CONTROLS);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    if (colorMode !== "cmyk") {
      drawHalftonePlate(ctx, sourceImageData, width, height, cellSize, filter, angle, color, -1);
      return;
    }
    ctx.save();
    ctx.globalCompositeOperation = "multiply";
    for (const plate of CMYK_PLATES) {
      drawHalftonePlate(ctx, sourceImageData, width, height, cellSize, filter, (angle + plate.angleOffset) % 180, plate.ink, plate.channel);
    }
    ctx.restore();
  }
  function drawHalftonePlate(ctx, sourceImageData, width, height, cellSize, filter, angle, color, channel) {
    const data = sourceImageData.data;
    const { screen, lineBlend } = controlValues(filter, HALFTONE_FILTER_CONTROLS);
    const isDither = screen === "dither";
    const toLine = lineBlend / 100;
    const maxRadius = cellSize * 0.62;
    const rotated = angle !== 0;
    const radians = angle * Math.PI / 180;
    const cos = Math.cos(radians), sin = Math.sin(radians);
    const corners = [[0, 0], [width, 0], [0, height], [width, height]];
    const us = corners.map(([x, y]) => x * cos + y * sin);
    const vs = corners.map(([x, y]) => y * cos - x * sin);
    const maxU = Math.max(...us), maxV = Math.max(...vs);
    ctx.save();
    ctx.fillStyle = color;
    ctx.rotate(radians);
    ctx.beginPath();
    const isPureDots = !isDither && toLine === 0;
    const batchSize = isPureDots ? 1 : 4096;
    let batched = 0;
    const markAdded = () => {
      if (++batched < batchSize) return;
      ctx.fill();
      ctx.beginPath();
      batched = 0;
    };
    for (let gridV = Math.floor(Math.min(...vs) / cellSize); gridV * cellSize < maxV; gridV++) {
      for (let gridU = Math.floor(Math.min(...us) / cellSize); gridU * cellSize < maxU; gridU++) {
        const centerU = (gridU + 0.5) * cellSize;
        const centerV = (gridV + 0.5) * cellSize;
        const cx = centerU * cos - centerV * sin - cellSize / 2;
        const cy = centerU * sin + centerV * cos - cellSize / 2;
        const x0 = Math.max(0, Math.floor(cx));
        const y0 = Math.max(0, Math.floor(cy));
        const x1 = Math.min(width, Math.max(x0 + 1, Math.floor(cx + cellSize)));
        const y1 = Math.min(height, Math.max(y0 + 1, Math.floor(cy + cellSize)));
        let sum = 0, sumR = 0, sumG = 0, sumB = 0, count = 0;
        for (let y = y0; y < y1; y++) {
          const rowStart = y * width * 4;
          for (let x = x0; x < x1; x++) {
            const idx = rowStart + x * 4;
            if (channel < 0) {
              sum += lumaOverWhite(data, idx);
            } else {
              const alpha = data[idx + 3] / 255;
              const paper = 255 * (1 - alpha);
              sumR += data[idx] * alpha + paper;
              sumG += data[idx + 1] * alpha + paper;
              sumB += data[idx + 2] * alpha + paper;
            }
            count++;
          }
        }
        if (!count) continue;
        const avgLum = channel < 0 ? sum / count / 255 : 1 - cmykCoverage(sumR / count / 255, sumG / count / 255, sumB / count / 255, channel);
        if (isDither) {
          if (avgLum < (BAYER_8X8[gridV & 7][gridU & 7] + 0.5) / 64) {
            ctx.rect(centerU - cellSize / 2, centerV - cellSize / 2, cellSize, cellSize);
            markAdded();
          }
          continue;
        }
        const radius = (1 - avgLum) * maxRadius;
        const halfLength = radius + (cellSize / 2 + 0.25 - radius) * toLine;
        const halfHeight = radius + ((1 - avgLum) * cellSize / 2 - radius) * toLine;
        if (halfHeight > 0.4) {
          const u = rotated ? centerU : cx + Math.min(cellSize, width - cx) / 2;
          const v = rotated ? centerV : cy + Math.min(cellSize, height - cy) / 2;
          if (isPureDots) ctx.arc(u, v, radius, 0, Math.PI * 2);
          else ctx.roundRect(u - halfLength, v - halfHeight, halfLength * 2, halfHeight * 2, Math.min(halfLength, halfHeight) * (1 - toLine));
          markAdded();
        }
      }
    }
    ctx.fill();
    ctx.restore();
  }

  // apps/ZEditor/src/render/filters/xerox.js
  function applyXerox(ctx, canvas, filter, scaleFactor) {
    const { width, height } = canvas;
    const { contrast, exposure, speckle, streaks, edgeWear, xeroxVariation, inkColor, paperColor } = controlValues(filter, XEROX_FILTER_CONTROLS);
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const ink = hexToRgb(inkColor);
    const paper = hexToRgb(paperColor);
    const gain = 1 + contrast / 100 * 15;
    const cutoff = 1 - exposure / 100;
    const speckleAmount = speckle / 100;
    const wearAmount = edgeWear / 100;
    const imageW = width / scaleFactor;
    const imageH = height / scaleFactor;
    const wearZone = Math.min(imageW, imageH) * 0.1;
    const darkShare = 0.2 * streaks / 100;
    const paleShare = darkShare / 2;
    const streakShift = new Float32Array(width);
    for (let x = 0; x < width; x++) {
      const h = seededNoise(Math.floor(x / scaleFactor / 2.5), xeroxVariation);
      if (h > 1 - darkShare) streakShift[x] = -(0.5 + 0.5 * (h - (1 - darkShare)) / darkShare);
      else if (h < paleShare) streakShift[x] = 0.5 + 0.5 * (paleShare - h) / paleShare;
    }
    for (let y = 0; y < height; y++) {
      const imageY = y / scaleFactor;
      const cellY = Math.floor(imageY);
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const imageX = x / scaleFactor;
        const cellX = Math.floor(imageX);
        const lum = lumaOverWhite(data, i) / 255;
        let tone = Math.min(1, Math.max(0, (lum - cutoff) * gain + 0.5));
        tone += (seededNoise(cellX, xeroxVariation, cellY) - 0.5) * speckleAmount;
        tone += streakShift[x];
        if (seededNoise(cellX + 7919, xeroxVariation, cellY + 104729) < speckleAmount * 0.03) {
          tone = tone > 0.5 ? 0 : 1;
        }
        const edgeDistance = Math.min(imageX, imageY, imageW - imageX, imageH - imageY);
        if (edgeDistance < wearZone) {
          const worn = wearAmount * (1 - edgeDistance / wearZone) ** 2;
          if (seededNoise(cellX + 15485, xeroxVariation, cellY + 32452) < worn) tone = 1;
        }
        tone = Math.min(1, Math.max(0, tone));
        data[i] = ink.r + (paper.r - ink.r) * tone;
        data[i + 1] = ink.g + (paper.g - ink.g) * tone;
        data[i + 2] = ink.b + (paper.b - ink.b) * tone;
      }
    }
    ctx.putImageData(imageData, 0, 0);
  }

  // apps/ZEditor/src/render/filters/applyFilter.js
  function applyPageFilter(ctx, canvas, filter, scaleFactor) {
    if (!filter || filter.type === "none" || canvas.width === 0 || canvas.height === 0) return;
    if (filter.type === "grayscale" || filter.type === "duotone" || filter.type === "threshold") {
      applyColorRemap(ctx, canvas, filter);
    } else if (filter.type === "halftone") {
      const { width, height } = canvas;
      const imageData = ctx.getImageData(0, 0, width, height);
      const { cellSize } = controlValues(filter, HALFTONE_FILTER_CONTROLS);
      const sourceAlpha = new Uint8ClampedArray(width * height);
      let hasTransparency = false;
      for (let p = 0; p < sourceAlpha.length; p++) {
        sourceAlpha[p] = imageData.data[p * 4 + 3];
        if (sourceAlpha[p] < 255) hasTransparency = true;
      }
      drawHalftoneScreen(ctx, imageData, width, height, Math.max(MIN_HALFTONE_CELL_SIZE, cellSize * scaleFactor), filter);
      if (hasTransparency) {
        const result = ctx.getImageData(0, 0, width, height);
        for (let p = 0; p < sourceAlpha.length; p++) result.data[p * 4 + 3] = sourceAlpha[p];
        ctx.putImageData(result, 0, 0);
      }
    } else if (filter.type === "xerox") {
      applyXerox(ctx, canvas, filter, scaleFactor);
    }
  }

  // apps/ZEditor/src/render/photoAdjust.js
  function applyPhotoAdjust(ctx, canvas, ann) {
    const { width, height } = canvas;
    if (width === 0 || height === 0) return;
    const v = controlValues(ann, PHOTO_ADJUST_CONTROLS);
    const black = v.adjBlack;
    const white = Math.max(black + 1, v.adjWhite);
    const invGamma = 1 / (v.adjGamma / 100);
    const gain = Math.pow(2, v.adjExposure / 50);
    const offset = v.adjBrightness * 1.2;
    const c = v.adjContrast * 1.2;
    const contrast = 259 * (c + 255) / (255 * (259 - c));
    const lut = new Uint8ClampedArray(256);
    for (let i = 0; i < 256; i++) {
      const level = Math.pow(Math.min(1, Math.max(0, (i - black) / (white - black))), invGamma) * 255;
      lut[i] = (level * gain + offset - 128) * contrast + 128;
    }
    const shadows = v.adjShadows * 0.9, highlights = v.adjHighlights * 0.9;
    const toneMapped = shadows !== 0 || highlights !== 0;
    const warm = v.adjTemperature / 100, tint = v.adjTint / 100;
    const balanced = warm !== 0 || tint !== 0;
    const saturation = 1 + v.adjSaturation / 100;
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] === 0) continue;
      let r = lut[data[i]], g = lut[data[i + 1]], b = lut[data[i + 2]];
      if (toneMapped) {
        const l = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
        const shift = shadows * (1 - l) * (1 - l) + highlights * l * l;
        r += shift;
        g += shift;
        b += shift;
      }
      if (balanced) {
        r *= 1 + warm * 0.3 + tint * 0.1;
        g *= 1 - tint * 0.3;
        b *= 1 - warm * 0.3 + tint * 0.1;
      }
      if (saturation !== 1) {
        const l = r * 0.299 + g * 0.587 + b * 0.114;
        r = l + (r - l) * saturation;
        g = l + (g - l) * saturation;
        b = l + (b - l) * saturation;
      }
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
    }
    ctx.putImageData(imageData, 0, 0);
  }

  // apps/ZEditor/src/render/drawImage.js
  function loadImageElement(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Couldn't load a placed image for export."));
      img.src = src;
    });
  }
  async function drawImageOnCanvas(ctx, ann, scaleFactor, pageFilter) {
    const img = await loadImageElement(ann.src);
    const x = ann.x * scaleFactor, y = ann.y * scaleFactor;
    const w = ann.width * scaleFactor, h = ann.height * scaleFactor;
    let sx = ann.cropX || 0, sy = ann.cropY || 0;
    let sw = ann.cropW || img.naturalWidth || w, sh = ann.cropH || img.naturalHeight || h;
    let source = img;
    const imgFilter = effectiveImageFilter(ann, pageFilter);
    const filterType = imgFilter.type;
    const adjusted = hasPhotoAdjust(ann);
    if (filterType && filterType !== "none" || adjusted) {
      const off = document.createElement("canvas");
      off.width = Math.max(1, Math.round(w));
      off.height = Math.max(1, Math.round(h));
      const octx = off.getContext("2d");
      octx.drawImage(img, sx, sy, sw, sh, 0, 0, off.width, off.height);
      if (adjusted) applyPhotoAdjust(octx, off, ann);
      applyPageFilter(octx, off, imgFilter, scaleFactor);
      source = off;
      sx = 0;
      sy = 0;
      sw = off.width;
      sh = off.height;
    }
    drawBoxWithEffects(ctx, ann, scaleFactor, (target) => {
      target.drawImage(source, sx, sy, sw, sh, 0, 0, ann.width, ann.height);
    });
  }

  // apps/ZEditor/src/model/strokes.js
  var PEN_COLOR_SWATCHES = ["#1a1a1a", "#dd531a", "#dc2626", "#2563eb"];
  var HIGHLIGHTER_COLOR_SWATCHES = ["#ffe066", "#ffb84d", "#7ec8ff", "#ff9ecf", "#7dffb3"];
  var PEN_DEFAULTS = { color: "#1a1a1a", width: 2.5 };
  var HIGHLIGHTER_DEFAULTS = { color: "#ffe066", width: 14 };
  function smoothPathD(points) {
    if (points.length < 2) return "";
    if (points.length === 2) {
      return `M ${points[0][0]},${points[0][1]} L ${points[1][0]},${points[1][1]}`;
    }
    let d = `M ${points[0][0]},${points[0][1]}`;
    for (let i = 1; i < points.length - 1; i++) {
      const [x0, y0] = points[i];
      const [x1, y1] = points[i + 1];
      const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
      d += ` Q ${x0},${y0} ${mx},${my}`;
    }
    const last = points[points.length - 1];
    d += ` L ${last[0]},${last[1]}`;
    return d;
  }
  function distToSegment(p, a, b) {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const lenSq = dx * dx + dy * dy;
    let t = lenSq === 0 ? 0 : ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const cx = a[0] + t * dx, cy = a[1] + t * dy;
    return Math.hypot(p[0] - cx, p[1] - cy);
  }
  function strokeHitTest(point, ann) {
    const threshold = (ann.strokeWidth || 8) / 2 + 6;
    for (let i = 0; i < ann.points.length - 1; i++) {
      if (distToSegment(point, ann.points[i], ann.points[i + 1]) <= threshold) return true;
    }
    return false;
  }
  function taperedPathD(points, baseWidth, taper) {
    if (points.length < 2) return "";
    const dists = [0];
    for (let i = 1; i < points.length; i++) {
      dists.push(dists[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]));
    }
    const total = dists[dists.length - 1] || 1;
    const tf = Math.min(0.45, Math.max(0, taper));
    function widthAt(t) {
      if (tf <= 0) return baseWidth;
      let factor;
      if (t < tf) factor = t / tf;
      else if (t > 1 - tf) factor = (1 - t) / tf;
      else factor = 1;
      return Math.max(baseWidth * 0.12, baseWidth * factor);
    }
    const left = [], right = [];
    for (let i = 0; i < points.length; i++) {
      const t = dists[i] / total;
      const w = widthAt(t) / 2;
      const prev = points[Math.max(0, i - 1)];
      const next = points[Math.min(points.length - 1, i + 1)];
      let dx = next[0] - prev[0], dy = next[1] - prev[1];
      const len = Math.hypot(dx, dy) || 1;
      dx /= len;
      dy /= len;
      const nx = -dy, ny = dx;
      left.push([points[i][0] + nx * w, points[i][1] + ny * w]);
      right.push([points[i][0] - nx * w, points[i][1] - ny * w]);
    }
    let d = `M ${left[0][0]},${left[0][1]}`;
    for (let i = 1; i < left.length; i++) d += ` L ${left[i][0]},${left[i][1]}`;
    for (let i = right.length - 1; i >= 0; i--) d += ` L ${right[i][0]},${right[i][1]}`;
    d += " Z";
    return d;
  }

  // apps/ZEditor/src/render/gradients.js
  function rectGradientStops(ann) {
    const v = controlValues(ann, RECT_CONTROLS);
    const c1 = hexToRgb(v.fillColor), c2 = hexToRgb(v.gradientColor);
    const a1 = v.fillAlpha / 100, a2 = v.gradientAlpha / 100;
    const start = v.gradientStart, end = Math.max(v.gradientStart, v.gradientEnd);
    const steps = a1 === a2 ? 1 : 16;
    const stops = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const a = a1 + (a2 - a1) * t;
      const channel = (p, q) => {
        const premultiplied = p * a1 + (q * a2 - p * a1) * t;
        return Math.round(a > 0 ? premultiplied / a : p + (q - p) * t);
      };
      stops.push({
        percent: start + (end - start) * t,
        color: `rgba(${channel(c1.r, c2.r)},${channel(c1.g, c2.g)},${channel(c1.b, c2.b)},${+a.toFixed(4)})`
      });
    }
    return stops;
  }
  function rectFillCss(ann) {
    const v = controlValues(ann, RECT_CONTROLS);
    if (v.fillType === "solid") {
      const { r, g, b } = hexToRgb(v.fillColor);
      return `rgba(${r},${g},${b},${v.fillAlpha / 100})`;
    }
    const stops = rectGradientStops(ann).map((s) => `${s.color} ${s.percent}%`).join(", ");
    return v.fillType === "linear" ? `linear-gradient(${v.gradientAngle}deg, ${stops})` : `radial-gradient(ellipse farthest-corner at 50% 50%, ${stops})`;
  }
  function makeLinearGradient(ctx, angleDegrees, stops, x, y, w, h) {
    const radians = angleDegrees * Math.PI / 180;
    const dx = Math.sin(radians), dy = -Math.cos(radians);
    const half = (Math.abs(w * dx) + Math.abs(h * dy)) / 2;
    const centerX = x + w / 2, centerY = y + h / 2;
    const gradient = ctx.createLinearGradient(centerX - dx * half, centerY - dy * half, centerX + dx * half, centerY + dy * half);
    stops.forEach((s) => gradient.addColorStop(s.percent / 100, s.color));
    return gradient;
  }
  function paintRectFill(ctx, ann) {
    const v = controlValues(ann, RECT_CONTROLS);
    const w = ann.width, h = ann.height;
    if (v.fillType === "solid") {
      const { r, g, b } = hexToRgb(v.fillColor);
      ctx.fillStyle = `rgba(${r},${g},${b},${v.fillAlpha / 100})`;
      ctx.fillRect(0, 0, w, h);
      return;
    }
    const stops = rectGradientStops(ann);
    if (v.fillType === "linear") {
      ctx.fillStyle = makeLinearGradient(ctx, v.gradientAngle, stops, 0, 0, w, h);
      ctx.fillRect(0, 0, w, h);
    } else {
      const reach = Math.SQRT2;
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.scale(w / 2 * reach, h / 2 * reach);
      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
      stops.forEach((s) => gradient.addColorStop(s.percent / 100, s.color));
      ctx.fillStyle = gradient;
      ctx.fillRect(-1 / reach, -1 / reach, 2 / reach, 2 / reach);
      ctx.restore();
    }
  }

  // apps/ZEditor/src/render/drawShapes.js
  function drawStrokeOnCanvas(ctx, ann, scaleFactor) {
    const isHi = ann.tool === "highlighter";
    const color = ann.color || (isHi ? HIGHLIGHTER_DEFAULTS.color : PEN_DEFAULTS.color);
    const width = (ann.strokeWidth || (isHi ? HIGHLIGHTER_DEFAULTS.width : PEN_DEFAULTS.width)) * scaleFactor;
    const taper = ann.taper || 0;
    const pts = ann.points.map((p) => [p[0] * scaleFactor, p[1] * scaleFactor]);
    ctx.save();
    ctx.globalAlpha = isHi ? 0.45 : 1;
    if (taper > 0) {
      ctx.fillStyle = color;
      ctx.fill(new Path2D(taperedPathD(pts, width, taper)));
    } else {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke(new Path2D(smoothPathD(pts)));
    }
    ctx.restore();
  }
  function drawRectOnCanvas(ctx, ann, scaleFactor) {
    drawBoxWithEffects(ctx, ann, scaleFactor, (target) => paintRectFill(target, ann));
  }

  // apps/ZEditor/src/render/textRuns.js
  function columnRules(layout, ann) {
    if (ann.columnRule !== "on" || !layout.typesetLines || !(layout.columns > 1)) return [];
    const scale = layout.fontSize / (ann.fontSize || 16);
    const width = Math.max(0.25, ptToPx((ann.columnRuleWidth != null ? ann.columnRuleWidth : 5) / 10)) * scale;
    const gap = layout.columnStride - layout.columnWidth;
    const y0 = layout.y + layout.padY, y1 = y0 + layout.textHeight;
    const rules = [];
    for (let i = 0; i < layout.columns - 1; i++) {
      rules.push({ x: layout.x + layout.padX + i * layout.columnStride + layout.columnWidth + gap / 2, y0, y1, width, color: ann.columnRuleColor || "#1a1a1a" });
    }
    return rules;
  }
  function spanDecorations(span) {
    const out = {};
    if (span && span.underline != null) out.underline = span.underline;
    if (span && span.strike != null) out.strike = span.strike;
    return out;
  }
  function layoutPlainRuns(layout, ann) {
    const { look, x, y, padX, padY, boxWidth, lines, lineStarts, typesetLines, baselineOffset, lineHeight, measure } = layout;
    const runs = [];
    const lineExtents = [];
    if (typesetLines) {
      typesetLines.forEach((tl) => {
        if (tl.hidden) return;
        const baselineY = y + padY + tl.top + baselineOffset + (tl.baseShift || 0);
        const lineX = x + padX + tl.x;
        const segments = [];
        tl.pieces.forEach((p, k) => {
          const raw = p.hyphen ? p.text.slice(0, -1) : p.text;
          const own = (ann.colorRuns || []).filter((r) => r.end > p.start && r.start < p.end).map((r) => ({ ...r, start: Math.max(r.start, p.start) - p.start, end: Math.min(r.end, p.end) - p.start }));
          const pieceSegments = colorSegments(raw, own);
          let offset = 0;
          const reachX = k + 1 < tl.pieces.length ? lineX + tl.pieces[k + 1].x : lineX + p.x + p.width;
          pieceSegments.forEach((seg, si) => {
            const last = si === pieceSegments.length - 1;
            const segX = lineX + p.x + (offset ? measure(raw.slice(0, offset), p.start) : 0);
            const font = layout.fontAt ? layout.fontAt(p.start + offset) : null;
            offset += seg.text.length;
            const segEnd = last ? reachX : lineX + p.x + measure(raw.slice(0, offset), p.start);
            runs.push({ text: last && p.hyphen ? seg.text + "-" : seg.text, x: segX, baselineY, color: seg.color, font });
            segments.push({ x0: segX, x1: segEnd, color: seg.color, ...spanDecorations(seg.span) });
          });
        });
        lineExtents.push({ line: tl.pieces.length ? "x" : "", lineX, lineWidth: tl.width, baselineY, segments });
      });
      return { runs, lineExtents };
    }
    lines.forEach((line, i) => {
      const lineWidth = measure(line);
      let lineX = x + padX;
      if (ann.align === "center" || look.stacked) lineX = x + (boxWidth - lineWidth) / 2;
      else if (ann.align === "right") lineX = x + boxWidth - padX - lineWidth;
      const baselineY = y + padY + i * lineHeight + baselineOffset;
      const lineStart = lineStarts[i];
      const lineRuns = (ann.colorRuns || []).filter((r) => r.end > lineStart && r.start < lineStart + line.length).map((r) => ({ ...r, start: Math.max(r.start, lineStart) - lineStart, end: Math.min(r.end, lineStart + line.length) - lineStart }));
      const segments = [];
      let offset = 0;
      for (const seg of colorSegments(line, lineRuns)) {
        const segX = lineX + (offset ? measure(line.slice(0, offset)) : 0);
        offset += seg.text.length;
        const segEnd = lineX + measure(line.slice(0, offset));
        runs.push({ text: seg.text, x: segX, baselineY, color: seg.color });
        segments.push({ x0: segX, x1: segEnd, color: seg.color, ...spanDecorations(seg.span) });
      }
      lineExtents.push({ line, lineX, lineWidth, baselineY, segments });
    });
    return { runs, lineExtents };
  }

  // apps/ZEditor/src/render/drawText.js
  function drawTextDecorationLine(ctx, style, x0, x1, y, fontSize, color) {
    const thickness = Math.max(1, fontSize * 0.06);
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = thickness;
    ctx.beginPath();
    if (style === "double") {
      ctx.moveTo(x0, y);
      ctx.lineTo(x1, y);
      ctx.moveTo(x0, y + thickness * 1.8);
      ctx.lineTo(x1, y + thickness * 1.8);
    } else if (style === "wavy") {
      const amplitude = Math.max(1, fontSize * 0.07), wavelength = Math.max(4, fontSize * 0.4);
      const centre = y + fontSize * 0.09;
      for (let x = x0; x <= x1; x += 1) {
        const wave = centre + amplitude * Math.sin((x - x0) / wavelength * Math.PI * 2);
        if (x === x0) ctx.moveTo(x, wave);
        else ctx.lineTo(x, wave);
      }
    } else {
      ctx.moveTo(x0, y);
      ctx.lineTo(x1, y);
    }
    ctx.stroke();
    ctx.restore();
  }
  async function drawTextOnCanvas(ctx, ann, scaleFactor) {
    const photoImg = ann.fillSrc ? await loadImageElement(ann.fillSrc) : null;
    ctx.save();
    const layout = layoutText(ctx, ann, scaleFactor);
    const { look, fontSize, lineHeight, baselineOffset, x, y, padX, padY, boxWidth, innerWidth, lines, lineStarts, textHeight, boxHeight, measure, ascent, descent, curve } = layout;
    rotateAboutCenter(ctx, ann, x + boxWidth / 2, y + boxHeight / 2);
    if (look.label) {
      ctx.fillStyle = rgbaCss(look.label.labelColor, look.label.labelAlpha);
      ctx.beginPath();
      ctx.roundRect(x, y, boxWidth, boxHeight, look.label.labelRadius * scaleFactor);
      ctx.fill();
    }
    for (const rule of columnRules(layout, ann)) {
      ctx.fillStyle = rule.color;
      ctx.fillRect(rule.x - rule.width / 2, rule.y0, rule.width, rule.y1 - rule.y0);
    }
    const fill = look.gradient ? makeLinearGradient(ctx, look.gradient.gradientAngle, rectGradientStops(textGradientView(ann, look)), x + padX, y + padY, innerWidth, textHeight) : rgbaCss(look.color, look.fillAlpha);
    const decoStyle = look.strike === "double" || look.strike === "wavy" ? look.strike : "solid";
    const setFont = (c) => {
      c.font = ctx.font;
      c.textBaseline = "alphabetic";
      if ("letterSpacing" in c) c.letterSpacing = ctx.letterSpacing;
      if ("fontKerning" in c) c.fontKerning = ctx.fontKerning;
    };
    let runs = [];
    let lineExtents = [];
    let letterIndex = 0;
    if (!look.ransom && !curve) {
      ({ runs, lineExtents } = layoutPlainRuns(layout, ann));
    } else {
      lines.forEach((line, i) => {
        const lineWidth = measure(line);
        let lineX = x + padX;
        if (ann.align === "center" || look.stacked) lineX = x + (boxWidth - lineWidth) / 2;
        else if (ann.align === "right") lineX = x + boxWidth - padX - lineWidth;
        const lineTop = y + padY + (curve && curve.sign < 0 ? curve.sag : 0) + i * lineHeight;
        const baselineY = lineTop + baselineOffset;
        const lineStart = lineStarts[i];
        lineExtents.push({ line, lineX, lineWidth, baselineY, segments: [{ x0: lineX, x1: lineX + lineWidth, color: null }] });
        let cursor = lineX;
        let charIndex = 0;
        for (const ch of Array.from(line)) {
          const advance = ctx.measureText(ch).width;
          const k = letterIndex++;
          const run2 = { text: ch, x: cursor, baselineY, color: colorAtIndex(ann.colorRuns, lineStart + charIndex) };
          charIndex += ch.length;
          if (ch !== " ") {
            run2.cx = cursor + advance / 2;
            run2.cy = lineTop + lineHeight / 2;
            run2.advance = advance;
            run2.tilt = 0;
            run2.dx = 0;
            run2.dy = 0;
            run2.scale = 1;
            if (look.ransom) {
              const seed = look.ransom.ransomVariation;
              run2.tilt = (seededNoise(k * 4, seed) - 0.5) * 2 * look.ransom.ransomTilt * Math.PI / 180;
              run2.dy = (seededNoise(k * 4 + 1, seed) - 0.5) * 2 * fontSize * look.ransom.ransomShift / 100;
              run2.scale = 1 + (seededNoise(k * 4 + 2, seed) - 0.5) * 2 * look.ransom.ransomSize / 100;
              if (look.ransom.ransomTiles === "paper") {
                run2.tile = RANSOM_PAPER_COLORS[Math.floor(seededNoise(k * 4 + 3, seed) * RANSOM_PAPER_COLORS.length)];
              }
            }
            if (curve) {
              const phi = (run2.cx - (lineX + lineWidth / 2)) / curve.radius;
              run2.tilt += curve.sign * phi;
              run2.dx += curve.radius * Math.sin(phi) - phi * curve.radius;
              run2.dy += curve.sign * curve.radius * (1 - Math.cos(phi));
            }
          }
          runs.push(run2);
          cursor += advance;
        }
      });
    }
    const withRun = (c, run2, draw) => {
      c.save();
      if (run2.font) c.font = run2.font;
      if (run2.tilt !== void 0) {
        c.translate(run2.cx + run2.dx, run2.cy + run2.dy);
        c.rotate(run2.tilt);
        c.scale(run2.scale, run2.scale);
        c.translate(-run2.cx, -run2.cy);
      }
      draw(run2);
      c.restore();
    };
    const fillsThroughLayer = Boolean(photoImg || look.gradient && (look.ransom || curve));
    const tilePad = fontSize * 0.06;
    const paintText = (c) => {
      setFont(c);
      runs.forEach((run2) => {
        if (!run2.tile) return;
        withRun(c, run2, () => {
          c.fillStyle = run2.tile;
          c.fillRect(run2.x - tilePad, run2.baselineY - ascent - tilePad, run2.advance + tilePad * 2, ascent + descent + tilePad * 2);
        });
      });
      if (look.stroke) {
        runs.forEach((run2) => withRun(c, run2, () => {
          c.strokeStyle = look.stroke.strokeColor;
          c.lineWidth = look.stroke.strokeThickness * scaleFactor;
          c.lineJoin = "miter";
          c.miterLimit = 4;
          c.strokeText(run2.text, run2.x, run2.baselineY);
        }));
      }
      const paintOwnColors = () => runs.forEach((run2) => {
        if (!run2.color) return;
        withRun(c, run2, () => {
          c.fillStyle = rgbaCss(run2.color, look.fillAlpha);
          c.fillText(run2.text, run2.x, run2.baselineY);
        });
      });
      if (!fillsThroughLayer) {
        runs.forEach((run2) => withRun(c, run2, () => {
          c.fillStyle = run2.color ? rgbaCss(run2.color, look.fillAlpha) : fill;
          c.fillText(run2.text, run2.x, run2.baselineY);
        }));
      } else {
        const letters = document.createElement("canvas");
        letters.width = c.canvas.width;
        letters.height = c.canvas.height;
        const lctx = letters.getContext("2d");
        lctx.setTransform(c.getTransform());
        setFont(lctx);
        lctx.fillStyle = "#000";
        runs.forEach((run2) => {
          if (!run2.color) withRun(lctx, run2, () => lctx.fillText(run2.text, run2.x, run2.baselineY));
        });
        lctx.globalCompositeOperation = "source-in";
        if (photoImg) {
          const place = photoPlacement(look.photo, innerWidth / scaleFactor, textHeight / scaleFactor);
          lctx.globalAlpha = look.photo.fillPhotoAlpha / 100;
          lctx.drawImage(photoImg, x + padX + place.left * scaleFactor, y + padY + place.top * scaleFactor, place.width * scaleFactor, place.height * scaleFactor);
          if (look.photo.fillPhotoAlpha < 100) {
            lctx.globalAlpha = 1;
            lctx.globalCompositeOperation = "destination-over";
            lctx.fillStyle = look.gradient ? makeLinearGradient(lctx, look.gradient.gradientAngle, rectGradientStops(textGradientView(ann, look)), x + padX, y + padY, innerWidth, textHeight) : rgbaCss(look.color, look.fillAlpha);
            runs.forEach((run2) => {
              if (!run2.color) withRun(lctx, run2, () => lctx.fillText(run2.text, run2.x, run2.baselineY));
            });
          }
        } else {
          lctx.fillStyle = makeLinearGradient(lctx, look.gradient.gradientAngle, rectGradientStops(textGradientView(ann, look)), x + padX, y + padY, innerWidth, textHeight);
          lctx.fillRect(x - fontSize * 2, y - fontSize * 2, boxWidth + fontSize * 4, boxHeight + fontSize * 4);
        }
        c.save();
        c.setTransform(1, 0, 0, 1, 0, 0);
        c.drawImage(letters, 0, 0);
        c.restore();
        paintOwnColors();
      }
      lineExtents.forEach(({ line, baselineY, segments }) => {
        if (!line || curve) return;
        segments.forEach(({ x0, x1, color, underline, strike }) => {
          const decoColor = color || look.color;
          const underlined = underline != null ? underline : ann.underline;
          const struck = strike != null ? strike : look.strike !== "none";
          if (underlined) drawTextDecorationLine(c, decoStyle, x0, x1, baselineY + fontSize * 0.12, fontSize, decoColor);
          if (struck) drawTextDecorationLine(c, decoStyle, x0, x1, baselineY - fontSize * 0.3, fontSize, decoColor);
        });
      });
    };
    if (look.shadow || look.distress) {
      const layer = document.createElement("canvas");
      layer.width = ctx.canvas.width;
      layer.height = ctx.canvas.height;
      const layerCtx = layer.getContext("2d");
      layerCtx.setTransform(ctx.getTransform());
      paintText(layerCtx);
      if (look.distress) {
        layerCtx.save();
        layerCtx.globalCompositeOperation = "destination-out";
        drawDistressMarks(layerCtx, x, y, boxWidth, boxHeight, fontSize, look.distress);
        layerCtx.restore();
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (look.shadow) {
        ctx.shadowColor = look.shadow.color;
        ctx.shadowOffsetX = look.shadow.x * scaleFactor;
        ctx.shadowOffsetY = look.shadow.y * scaleFactor;
        ctx.shadowBlur = look.shadow.blur * scaleFactor;
      }
      ctx.drawImage(layer, 0, 0);
    } else {
      paintText(ctx);
    }
    ctx.restore();
  }
  function drawDistressMarks(ctx, x, y, w, h, fontSize, settings) {
    const { distressGrit, distressDust, distressScratches, distressVariation } = settings;
    const area = w * h / (fontSize * fontSize);
    ctx.save();
    ctx.fillStyle = "#000";
    ctx.strokeStyle = "#000";
    ctx.lineCap = "round";
    const marks = (stream, count, alpha, paint, addMark) => {
      const noise = noiseStream(distressVariation, stream);
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      for (let i = 0; i < Math.round(count); i++) addMark(noise);
      paint();
    };
    marks(11, distressGrit * 0.9 * area, 0.95, () => ctx.fill(), (noise) => {
      const size = fontSize * (0.015 + noise() * 0.05);
      ctx.rect(x + noise() * w, y + noise() * h, size, size * (0.5 + noise()));
    });
    marks(12, distressDust * 0.35 * area, 0.8, () => ctx.fill(), (noise) => {
      const radius = fontSize * (0.01 + noise() ** 2 * 0.06);
      const cx = x + noise() * w, cy = y + noise() * h;
      ctx.moveTo(cx + radius, cy);
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    });
    ctx.lineWidth = Math.max(0.5, fontSize * 0.022);
    marks(13, distressScratches * 0.12 * area, 0.9, () => ctx.stroke(), (noise) => {
      const startX = x + noise() * w, startY = y + noise() * h;
      const heading = (noise() - 0.5) * Math.PI;
      const length = fontSize * (0.3 + noise() * 0.9);
      ctx.moveTo(startX, startY);
      ctx.lineTo(startX + Math.cos(heading) * length, startY + Math.sin(heading) * length);
    });
    ctx.restore();
  }

  // apps/ZEditor/src/render/drawTrace.js
  function drawTraceOnCanvas(ctx, ann, scaleFactor) {
    drawBoxWithEffects(ctx, ann, scaleFactor, (target) => {
      if (!ann.traceW || !ann.traceH) return;
      target.save();
      target.scale(ann.width / ann.traceW, ann.height / ann.traceH);
      target.lineJoin = "round";
      target.lineCap = "round";
      for (const item of traceDrawList(ann)) {
        const path = new Path2D(item.d);
        if (item.fill) {
          target.fillStyle = item.fill;
          target.fill(path);
        }
        if (item.stroke) {
          target.strokeStyle = item.stroke;
          target.lineWidth = item.strokeWidth;
          target.stroke(path);
        }
      }
      target.restore();
    });
  }

  // apps/ZEditor/src/render/bake.js
  async function flattenedImagePatch(ann, pageFilter) {
    const filter = effectiveImageFilter(ann, pageFilter);
    const exportScale = EXPORT_SCALE / MAIN_SCALE;
    const hasLook = filter.type !== "none" || IMAGE_EFFECTS.some((effect) => ann[effect.key]);
    const sourceScale = (ann.cropW || ann.naturalWidth || ann.width) / ann.width;
    const scale = hasLook ? exportScale : Math.min(exportScale, sourceScale);
    const baked = await bakeBoxToImage(ann, scale, (ctx, box) => drawImageOnCanvas(ctx, box, scale, pageFilter));
    if (!baked) return null;
    const clearedEffects = Object.fromEntries(IMAGE_EFFECTS.flatMap((effect) => [
      [effect.key, void 0],
      ...effect.controls.map((c) => [c.prop, void 0])
    ]));
    return {
      ...clearedEffects,
      ...Object.fromEntries(PHOTO_ADJUST_CONTROLS.map((c) => [c.prop, void 0])),
      // baked in now
      ...baked,
      cropX: void 0,
      cropY: void 0,
      cropW: void 0,
      cropH: void 0,
      // Any filter is baked in now; an unfiltered image can keep following the page.
      filter: filter.type === "none" ? ann.filter : { type: "none" }
    };
  }
  function cropResetPatch(ann) {
    const cleared = { cropX: void 0, cropY: void 0, cropW: void 0, cropH: void 0 };
    if (ann.cropW == null || !ann.naturalWidth || !ann.naturalHeight) return cleared;
    const cropX = ann.cropX || 0, cropY = ann.cropY || 0;
    const sx = ann.width / ann.cropW, sy = ann.height / (ann.cropH || ann.naturalHeight);
    const width = ann.naturalWidth * sx, height = ann.naturalHeight * sy;
    const lx = -cropX * sx + width / 2 - ann.width / 2;
    const ly = -cropY * sy + height / 2 - ann.height / 2;
    const rad = angleOf(ann) * Math.PI / 180;
    const cx = ann.x + ann.width / 2 + lx * Math.cos(rad) - ly * Math.sin(rad);
    const cy = ann.y + ann.height / 2 + lx * Math.sin(rad) + ly * Math.cos(rad);
    return { ...cleared, x: cx - width / 2, y: cy - height / 2, width, height };
  }
  async function rasterizedRectPatch(ann) {
    const scale = EXPORT_SCALE / MAIN_SCALE;
    const baked = await bakeBoxToImage(ann, scale, (ctx, box) => drawRectOnCanvas(ctx, box, scale));
    if (!baked) return null;
    const cleared = Object.fromEntries([
      "shape",
      ...RECT_FILL_PROPS,
      ...IMAGE_EFFECTS.flatMap((effect) => [effect.key, ...effect.controls.map((c) => c.prop)])
    ].map((prop) => [prop, void 0]));
    return { ...cleared, ...baked, type: "image", filter: { type: "none" } };
  }
  async function rasterizedTracePatch(ann) {
    const scale = EXPORT_SCALE / MAIN_SCALE;
    const baked = await bakeBoxToImage(ann, scale, (ctx, box) => drawTraceOnCanvas(ctx, box, scale));
    if (!baked) return null;
    const cleared = Object.fromEntries([
      ...TRACE_LAYER_PROPS,
      ...IMAGE_EFFECTS.flatMap((effect) => [effect.key, ...effect.controls.map((c) => c.prop)])
    ].map((prop) => [prop, void 0]));
    return { ...cleared, ...baked, type: "image", filter: { type: "none" } };
  }
  async function rasterizedTextPatch(ann) {
    if (!ann.text) return null;
    const scale = EXPORT_SCALE / MAIN_SCALE;
    const size = measureTextBox(ann);
    const box = { ...ann, width: size.width + 1, height: size.height };
    const baked = await bakeBoxToImage(box, scale, (ctx, boxAtOrigin) => drawTextOnCanvas(ctx, boxAtOrigin, scale));
    if (!baked) return null;
    const textProps = ["text", "fontFamily", "fontSize", "bold", "italic", "underline", "color", "align", "lineSpacing", "letterSpacing", "strike", "textCase", "vertical", "fitHeight", "fillAlpha", "colorRuns", ...TEXT_PHOTO_PROPS];
    const effectProps = TEXT_EFFECTS.flatMap((effect) => [effect.key, ...effect.controls.map((c) => c.prop)]);
    const cleared = Object.fromEntries([...textProps, ...effectProps].map((prop) => [prop, void 0]));
    return { ...cleared, ...baked, type: "image", filter: { type: "none" } };
  }
  async function bakeBoxToImage(ann, scale, draw) {
    const shadow = imageShadowOffset(ann);
    const strokeReach = ann.stroke ? effectSettings(ann, STROKE_EFFECT).strokeThickness * STROKE_MITER_LIMIT / 2 : 0;
    const shadowReach = shadow ? Math.hypot(shadow.x, shadow.y) + shadow.blur * 2 : 0;
    const marginPx = Math.ceil((strokeReach + shadowReach + 1) * scale);
    const widthPx = Math.max(1, Math.round(ann.width * scale));
    const heightPx = Math.max(1, Math.round(ann.height * scale));
    const radians = angleOf(ann) * Math.PI / 180;
    const turnedWidth = Math.ceil(Math.abs(widthPx * Math.cos(radians)) + Math.abs(heightPx * Math.sin(radians)));
    const turnedHeight = Math.ceil(Math.abs(widthPx * Math.sin(radians)) + Math.abs(heightPx * Math.cos(radians)));
    const boxLeft = marginPx + (turnedWidth - widthPx) / 2;
    const boxTop = marginPx + (turnedHeight - heightPx) / 2;
    const canvas = document.createElement("canvas");
    canvas.width = turnedWidth + marginPx * 2;
    canvas.height = turnedHeight + marginPx * 2;
    const ctx = canvas.getContext("2d");
    await draw(ctx, { ...ann, x: boxLeft / scale, y: boxTop / scale, width: widthPx / scale, height: heightPx / scale });
    const trimmed = trimmedImageFromCanvas(canvas);
    if (!trimmed) return null;
    const { src, left, top, width: trimmedW, height: trimmedH } = trimmed;
    return {
      src,
      x: ann.x + (left - boxLeft) / scale,
      y: ann.y + (top - boxTop) / scale,
      angle: void 0,
      // the rotation is part of the pixels now
      width: trimmedW / scale,
      height: trimmedH / scale,
      naturalWidth: trimmedW,
      naturalHeight: trimmedH
    };
  }
  function trimmedImageFromCanvas(canvas) {
    const { data } = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height);
    const alphaAt = (x, y) => data[(y * canvas.width + x) * 4 + 3];
    let left = canvas.width, top = canvas.height, right = -1, bottom = -1;
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        if (alphaAt(x, y) === 0) continue;
        left = Math.min(left, x);
        right = Math.max(right, x);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
    }
    if (right < 0) return null;
    let opaque = true;
    for (let y = top; y <= bottom && opaque; y++) {
      for (let x = left; x <= right && opaque; x++) opaque = alphaAt(x, y) === 255;
    }
    const width = right - left + 1, height = bottom - top + 1;
    const trimmed = document.createElement("canvas");
    trimmed.width = width;
    trimmed.height = height;
    trimmed.getContext("2d").drawImage(canvas, -left, -top);
    const png = trimmed.toDataURL("image/png");
    const jpeg = opaque ? trimmed.toDataURL("image/jpeg", 0.92) : null;
    const src = jpeg && jpeg.length < png.length ? jpeg : png;
    return { src, left, top, width, height };
  }

  // apps/ZEditor/src/model/geometry.js
  function rotatePoint(x, y, degrees) {
    const radians = degrees * Math.PI / 180;
    const cos = Math.cos(radians), sin = Math.sin(radians);
    return [x * cos - y * sin, x * sin + y * cos];
  }
  function dragBox(start, point, square, fromCenter) {
    let dx = point.x - start.x, dy = point.y - start.y;
    if (square) {
      const side = Math.max(Math.abs(dx), Math.abs(dy));
      dx = (dx < 0 ? -1 : 1) * side;
      dy = (dy < 0 ? -1 : 1) * side;
    }
    const x0 = fromCenter ? start.x - dx : start.x, y0 = fromCenter ? start.y - dy : start.y;
    const x1 = start.x + dx, y1 = start.y + dy;
    return { x: Math.min(x0, x1), y: Math.min(y0, y1), width: Math.abs(x1 - x0), height: Math.abs(y1 - y0) };
  }
  var MIN_RESIZE_SIZE = 20;
  function resizedBox(box, handle, dx, dy, keepAspect, minSize = MIN_RESIZE_SIZE, angle = 0) {
    const signX = handle.includes("e") ? 1 : handle.includes("w") ? -1 : 0;
    const signY = handle.includes("s") ? 1 : handle.includes("n") ? -1 : 0;
    let width = box.width + signX * dx;
    let height = box.height + signY * dy;
    if (keepAspect) {
      const scaleX = width / box.width, scaleY = height / box.height;
      const minScale = minSize / Math.min(box.width, box.height);
      const scale = Math.max(minScale, signX && signY ? Math.max(scaleX, scaleY) : signX ? scaleX : scaleY);
      width = box.width * scale;
      height = box.height * scale;
    } else {
      width = Math.max(minSize, width);
      height = Math.max(minSize, height);
    }
    const anchorX = signX > 0 ? 0 : signX < 0 ? 1 : 0.5;
    const anchorY = signY > 0 ? 0 : signY < 0 ? 1 : 0.5;
    const [oldOffsetX, oldOffsetY] = rotatePoint((anchorX - 0.5) * box.width, (anchorY - 0.5) * box.height, angle);
    const [newOffsetX, newOffsetY] = rotatePoint((anchorX - 0.5) * width, (anchorY - 0.5) * height, angle);
    const centerX = box.x + box.width / 2 + oldOffsetX - newOffsetX;
    const centerY = box.y + box.height / 2 + oldOffsetY - newOffsetY;
    return { x: centerX - width / 2, y: centerY - height / 2, width, height };
  }

  // apps/ZEditor/src/render/itemGeometry.js
  function annotationBounds(ann) {
    if (ann.type === "stroke") {
      const box = bboxOf(ann);
      const pad = (ann.strokeWidth || (ann.tool === "highlighter" ? HIGHLIGHTER_DEFAULTS.width : PEN_DEFAULTS.width)) / 2;
      return { x: box.x - pad, y: box.y - pad, width: box.width + pad * 2, height: box.height + pad * 2 };
    }
    const size = ann.type === "text" ? measureTextBox(ann) : ann;
    const centerX = ann.x + size.width / 2, centerY = ann.y + size.height / 2;
    const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => {
      const [rx, ry] = rotatePoint(sx * size.width / 2, sy * size.height / 2, angleOf(ann));
      return [centerX + rx, centerY + ry];
    });
    const xs = corners.map((c) => c[0]), ys = corners.map((c) => c[1]);
    return { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
  }
  function hitsItem(ann, point) {
    if (ann.type === "stroke") return strokeHitTest([point.x, point.y], ann);
    const size = ann.type === "text" ? measureTextBox(ann) : ann;
    const [lx, ly] = rotatePoint(point.x - (ann.x + size.width / 2), point.y - (ann.y + size.height / 2), -angleOf(ann));
    return Math.abs(lx) <= size.width / 2 && Math.abs(ly) <= size.height / 2;
  }
  function rotatedAnnotation(ann, degrees, cx, cy) {
    if (ann.type === "stroke") {
      return { ...ann, points: ann.points.map(([px, py]) => {
        const [rx2, ry2] = rotatePoint(px - cx, py - cy, degrees);
        return [cx + rx2, cy + ry2];
      }) };
    }
    const size = ann.type === "text" ? measureTextBox(ann) : ann;
    const [rx, ry] = rotatePoint(ann.x + size.width / 2 - cx, ann.y + size.height / 2 - cy, degrees);
    return { ...ann, x: cx + rx - size.width / 2, y: cy + ry - size.height / 2, angle: ((angleOf(ann) + degrees) % 360 + 360) % 360 };
  }

  // apps/ZEditor/src/render/drawAnnotation.js
  async function drawAnnotationOnCanvas(ctx, ann, scaleFactor, pageFilter) {
    if (ann.type === "stroke") await drawWithOpacity(ctx, opacityOf(ann), (target) => drawStrokeOnCanvas(target, ann, scaleFactor), blendOf(ann));
    else if (ann.type === "text") await drawWithOpacity(ctx, opacityOf(ann), (target) => drawTextOnCanvas(target, ann, scaleFactor), blendOf(ann));
    else if (ann.type === "rect") await drawWithOpacity(ctx, opacityOf(ann), (target) => drawRectOnCanvas(target, ann, scaleFactor), blendOf(ann));
    else if (ann.type === "trace") await drawWithOpacity(ctx, opacityOf(ann), (target) => drawTraceOnCanvas(target, ann, scaleFactor), blendOf(ann));
    else await drawWithOpacity(ctx, opacityOf(ann), (target) => drawImageOnCanvas(target, ann, scaleFactor, pageFilter), blendOf(ann));
  }

  // apps/ZEditor/src/render/clipMask.js
  var NOT_SHAPE_PROPS = [STROKE_EFFECT, SHADOW_EFFECT, TEXTURE_EFFECT, TEXT_LABEL_EFFECT].flatMap((effect) => [effect.key, ...effect.controls.map((c) => c.prop)]);
  function maskShapeOf(base) {
    const shape = { ...base, opacity: void 0, blend: void 0, hidden: void 0, filter: { type: "none" } };
    for (const prop of NOT_SHAPE_PROPS) shape[prop] = void 0;
    return shape;
  }
  function newCanvas(width, height) {
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width));
    canvas.height = Math.max(1, Math.round(height));
    return canvas;
  }
  async function clipMaskCanvas(base, width, height, scaleFactor, pageFilter) {
    const canvas = newCanvas(width, height);
    await drawAnnotationOnCanvas(canvas.getContext("2d"), maskShapeOf(base), scaleFactor, pageFilter);
    return canvas;
  }
  async function drawClippedItem(ctx, item, base, scaleFactor, pageFilter) {
    const { width, height } = ctx.canvas;
    const layer = newCanvas(width, height);
    const layerCtx = layer.getContext("2d");
    await drawAnnotationOnCanvas(layerCtx, { ...item, blend: void 0 }, scaleFactor, pageFilter);
    layerCtx.globalCompositeOperation = "destination-in";
    layerCtx.drawImage(await clipMaskCanvas(base, width, height, scaleFactor, pageFilter), 0, 0);
    ctx.save();
    const blend = blendOf(item);
    if (blend !== "normal") ctx.globalCompositeOperation = blend;
    ctx.drawImage(layer, 0, 0);
    ctx.restore();
  }
  async function drawPageItem(ctx, items, index, scaleFactor, pageFilter) {
    const item = items[index];
    if (item.hidden) return;
    if (isClipped(item)) {
      const baseIndex = clipBaseIndex(items, index);
      if (baseIndex >= 0) {
        if (!items[baseIndex].hidden) await drawClippedItem(ctx, item, items[baseIndex], scaleFactor, pageFilter);
        return;
      }
    }
    await drawAnnotationOnCanvas(ctx, item, scaleFactor, pageFilter);
  }

  // apps/ZEditor/src/render/pageRender.js
  function docFor(pdfDocsRef, page) {
    const entry = pdfDocsRef.current[page.docId];
    return entry ? entry.doc : null;
  }
  async function getPageDisplaySize(page, pdfDocsRef, scale) {
    if (page.isBlank) {
      const swapped = page.rotation % 180 !== 0;
      return {
        width: Math.round((swapped ? page.height : page.width) * scale),
        height: Math.round((swapped ? page.width : page.height) * scale)
      };
    }
    const pdfPage = await docFor(pdfDocsRef, page).getPage(page.pageNumber);
    const viewport = pdfPage.getViewport({ scale, rotation: page.rotation });
    return { width: viewport.width, height: viewport.height };
  }
  function drawPageNumber(ctx, spec, width, height, pxPerPt) {
    const margin = spec.marginIn * 72 * pxPerPt;
    ctx.save();
    ctx.font = `${spec.size * pxPerPt}px 'Inter', sans-serif`;
    ctx.fillStyle = spec.color;
    ctx.textBaseline = spec.vertical === "top" ? "top" : "bottom";
    ctx.textAlign = spec.horizontal === "left" ? "left" : spec.horizontal === "right" ? "right" : "center";
    const x = spec.horizontal === "left" ? margin : spec.horizontal === "right" ? width - margin : width / 2;
    ctx.fillText(spec.text, x, spec.vertical === "top" ? margin : height - margin);
    ctx.restore();
  }
  async function renderPageToCanvas(page, pdfDocsRef, exportScale, pageFilter, numberSpec, transparent = false) {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    let w, h;
    if (page.isBlank) {
      const swapped = page.rotation % 180 !== 0;
      w = Math.round((swapped ? page.height : page.width) * exportScale);
      h = Math.round((swapped ? page.width : page.height) * exportScale);
      canvas.width = w;
      canvas.height = h;
      if (!transparent) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, w, h);
      }
    } else {
      const pdfPage = await docFor(pdfDocsRef, page).getPage(page.pageNumber);
      const viewport = pdfPage.getViewport({ scale: exportScale, rotation: page.rotation });
      w = viewport.width;
      h = viewport.height;
      canvas.width = w;
      canvas.height = h;
      await pdfPage.render(transparent ? { canvasContext: ctx, viewport, background: "rgba(0,0,0,0)" } : { canvasContext: ctx, viewport }).promise;
    }
    const scaleFactor = exportScale / MAIN_SCALE;
    await paintPageContent(ctx, canvas, page, scaleFactor, pageFilter, transparent && page.isBlank);
    if (numberSpec) drawPageNumber(ctx, numberSpec, w, h, exportScale);
    return canvas;
  }
  async function paintPageContent(ctx, canvas, page, scaleFactor, pageFilter, skipFilter) {
    if (!skipFilter) applyPageFilter(ctx, canvas, pageFilter, scaleFactor);
    const items = resolvePageText(page.annotations || []);
    for (let i = 0; i < items.length; i++) await drawPageItem(ctx, items, i, scaleFactor, pageFilter);
  }
  async function renderPageThumbWithItems(page, baseImage) {
    const canvas = document.createElement("canvas");
    canvas.width = baseImage.naturalWidth;
    canvas.height = baseImage.naturalHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(baseImage, 0, 0);
    await paintPageContent(ctx, canvas, page, THUMB_SCALE / MAIN_SCALE, page.filter || DEFAULT_PAGE_FILTER, false);
    return canvas;
  }
  function makeBlankThumb(width, height, rotation, scale) {
    const s = scale || THUMB_SCALE;
    const swapped = rotation % 180 !== 0;
    const w = Math.max(1, Math.round((swapped ? height : width) * s));
    const h = Math.max(1, Math.round((swapped ? width : height) * s));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    return canvas.toDataURL();
  }
  async function renderPdfThumb(doc, pageNumber, rotation) {
    const pdfPage = await doc.getPage(pageNumber);
    const viewport = pdfPage.getViewport({ scale: THUMB_SCALE, rotation });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d");
    await pdfPage.render({ canvasContext: ctx, viewport }).promise;
    return canvas.toDataURL();
  }

  // apps/ZEditor/src/io/images.js
  function readPhotoFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Couldn't read that photo."));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error("That file isn't an image the browser can open."));
        img.onload = () => {
          const shrink = Math.min(1, 2e3 / Math.max(img.naturalWidth, img.naturalHeight));
          const width = Math.max(1, Math.round(img.naturalWidth * shrink));
          const height = Math.max(1, Math.round(img.naturalHeight * shrink));
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          canvas.getContext("2d").drawImage(img, 0, 0, width, height);
          resolve({ src: canvas.toDataURL(file.type === "image/png" ? "image/png" : "image/jpeg", 0.92), width, height });
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  // apps/ZEditor/src/state/textFrameActions.js
  var FRAME_GAP = 12;
  function makeTextFrameActions({ pages, selectedIdx, pdfDocsRef, nextAnnIdRef, updateAnnotationsFor, setSelectedAnnId, setSelectedAnnIds }) {
    async function linkNextFrame(view) {
      const pageIdx = selectedIdx;
      if (pageIdx === null) return;
      const page = pages[pageIdx];
      const src = (page.annotations || []).find((a) => a.id === view.id);
      if (!src || src.type !== "text" || view.ransom || view.curve || view.vertical === "stacked") return;
      if ((page.annotations || []).some((a) => a.type === "text" && a.threadFrom === src.id)) return;
      const size = measureTextBox(view);
      const width = src.width || Math.round(size.width);
      const frameHeight = src.frameHeight > 0 ? src.frameHeight : Math.max(12, Math.round(pxToPt(size.height)));
      const heightPx = ptToPx(frameHeight);
      const display2 = await getPageDisplaySize(page, pdfDocsRef, MAIN_SCALE);
      let x = src.x + width + FRAME_GAP, y = src.y;
      if (x + width > display2.width) {
        x = src.x;
        y = src.y + heightPx + FRAME_GAP;
      }
      x = Math.max(0, Math.min(x, display2.width - width));
      y = Math.max(0, Math.min(y, display2.height - heightPx));
      const id = nextAnnIdRef.current++;
      updateAnnotationsFor(pageIdx, (anns) => [
        ...anns.map((a) => a.id === src.id ? { ...a, width, frameHeight } : a),
        { id, type: "text", text: "", x, y, width, frameHeight, columns: src.columns, columnGap: src.columnGap, threadFrom: src.id }
      ]);
      setSelectedAnnId(id);
      setSelectedAnnIds([]);
    }
    function unlinkNextFrame(view) {
      if (selectedIdx === null) return;
      updateAnnotationsFor(selectedIdx, (anns) => {
        const next = anns.find((a) => a.type === "text" && a.threadFrom === view.id);
        if (!next) return anns;
        const head = anns.find((a) => a.id === (view.storyHeadId != null ? view.storyHeadId : view.id)) || view;
        return anns.map((a) => a.id === next.id ? { ...a, ...storyProps(head), text: "", colorRuns: void 0, styleOverrides: head.styleOverrides, threadFrom: void 0 } : a);
      });
    }
    return { linkNextFrame, unlinkNextFrame };
  }

  // apps/ZEditor/src/state/useAnnotationEdits.js
  function patchedAnnotations(anns, id, patch, merge) {
    const clean = withoutResolvedProps(patch);
    const view = resolvePageText(anns).find((a) => a.id === id);
    if (!view || view.storyHeadId == null || view.storyIndex === 0) return anns.map((a) => a.id === id ? merge(a, clean) : a);
    const head = anns.find((a) => a.id === view.storyHeadId);
    const { framePatch, headPatch } = routeFramePatch(head, view.storyOffset || 0, clean);
    return anns.map((a) => {
      if (a.id === id && Object.keys(framePatch).length) return { ...a, ...framePatch };
      if (a.id === head.id && Object.keys(headPatch).length) return merge(a, headPatch);
      return a;
    });
  }
  var { useEffect, useRef } = React;
  function useAnnotationEdits({ doc, history, selection, toolDefaults }) {
    const { pages, setPages, selectedIdx, selectedPageIndices, nextAnnIdRef, pdfDocsRef, pageFilter } = doc;
    const { recordUndoCheckpoint } = history;
    const {
      tool,
      selectTool,
      editingAnnId,
      setEditingAnnId,
      selectedAnnId,
      setSelectedAnnId,
      selectedAnnIds,
      setSelectedAnnIds,
      selectedAnnotationIds,
      currentAnnotations,
      handleSelectAnnotation
    } = selection;
    const imageInputRef = useRef(null);
    function updateAnnotationsFor(pageIdx, updater, coalesceKey) {
      recordUndoCheckpoint(coalesceKey);
      setPages((prev) => prev.map((p, i) => i === pageIdx ? { ...p, annotations: updater(p.annotations || []) } : p));
    }
    function updatePageFilter(patch) {
      if (selectedIdx === null) return;
      const targets = /* @__PURE__ */ new Set([selectedIdx, ...selectedPageIndices]);
      recordUndoCheckpoint("pagefilter:" + [...targets].sort((a, b) => a - b).join(","));
      setPages((prev) => prev.map((p, i) => targets.has(i) ? { ...p, filter: { ...p.filter || DEFAULT_PAGE_FILTER, ...patch } } : p));
    }
    function handleRotateAnnotations(originals, degrees, cx, cy) {
      if (selectedIdx === null) return;
      const turned = new Map(originals.map((a) => [a.id, rotatedAnnotation(a, degrees, cx, cy)]));
      updateAnnotationsFor(selectedIdx, (anns) => anns.map((a) => turned.get(a.id) || a), "rotate:" + [...turned.keys()].join());
    }
    function handleMoveAnnotations(originals, dx, dy) {
      if (selectedIdx === null) return;
      const moved = new Map(originals.map((a) => [a.id, translatedAnnotation(a, dx, dy)]));
      updateAnnotationsFor(selectedIdx, (anns) => anns.map((a) => moved.get(a.id) || a), "move:" + [...moved.keys()].join());
    }
    function finishTextEdit() {
      if (editingAnnId === null) return;
      setEditingAnnId(null);
      selection.setTool("select");
    }
    const lastSelectionRef = useRef({ pageIdx: null, ids: [] });
    useEffect(() => {
      const now = [selectedAnnId, ...selectedAnnIds, editingAnnId].filter((id) => id != null);
      const prev = lastSelectionRef.current;
      lastSelectionRef.current = { pageIdx: selectedIdx, ids: now };
      if (prev.pageIdx == null || !pages[prev.pageIdx]) return;
      const anns = pages[prev.pageIdx].annotations || [];
      const samePage = prev.pageIdx === selectedIdx;
      const empty = prev.ids.filter((id) => {
        if (samePage && now.includes(id)) return false;
        const a = anns.find((x) => x.id === id);
        return a && a.type === "text" && !(a.text || "").trim() && !isThreaded(anns, id);
      });
      if (!empty.length) return;
      updateAnnotationsFor(prev.pageIdx, (list) => list.filter((a) => !empty.includes(a.id)), "ann:" + empty.join());
    }, [selectedAnnId, selectedAnnIds, editingAnnId, selectedIdx]);
    function handleGroupSelection() {
      const ids = selectedAnnotationIds();
      if (selectedIdx === null || ids.length < 2) return;
      const used = new Set(pages.flatMap((p) => (p.annotations || []).map((a) => a.groupId).filter(Boolean)));
      let groupId = "g" + nextAnnIdRef.current++;
      while (used.has(groupId)) groupId = "g" + nextAnnIdRef.current++;
      updateAnnotationsFor(selectedIdx, (anns) => {
        const members = anns.filter((a) => ids.includes(a.id)).map((a) => ({ ...a, groupId }));
        const topIndex = Math.max(...anns.map((a, i) => ids.includes(a.id) ? i : -1));
        const rest = anns.filter((a) => !ids.includes(a.id));
        rest.splice(topIndex + 1 - members.length, 0, ...members);
        return rest;
      });
    }
    function handleUngroupSelection() {
      const ids = selectedAnnotationIds();
      if (selectedIdx === null) return;
      const groups = new Set(currentAnnotations().filter((a) => ids.includes(a.id) && a.groupId).map((a) => a.groupId));
      if (groups.size === 0) return;
      updateAnnotationsFor(selectedIdx, (anns) => anns.map((a) => groups.has(a.groupId) ? { ...a, groupId: void 0, groupName: void 0 } : a));
    }
    function handleSetClip(ids, on) {
      if (selectedIdx === null) return;
      const items = currentAnnotations();
      const targets = new Set(on ? clipTargets(items, ids) : ids.filter((id) => (items.find((a) => a.id === id) || {}).clipToBelow));
      if (targets.size === 0) return;
      updateAnnotationsFor(selectedIdx, (anns) => anns.map((a) => targets.has(a.id) ? { ...a, clipToBelow: on ? true : void 0 } : a));
    }
    function handleToggleClip(id) {
      const item = currentAnnotations().find((a) => a.id === id);
      if (item) handleSetClip([id], !item.clipToBelow);
    }
    function handleClipSelection() {
      const ids = selectedAnnotationIds();
      handleSetClip(ids, clipTargets(currentAnnotations(), ids).length > 0);
    }
    function handleRenameGroup(groupId, name) {
      if (selectedIdx === null) return;
      updateAnnotationsFor(selectedIdx, (anns) => anns.map((a) => a.groupId === groupId ? { ...a, groupName: name || void 0 } : a));
    }
    function handleSetGroupFlag(groupId, flag, on) {
      if (selectedIdx === null) return;
      const members = currentAnnotations().filter((a) => a.groupId === groupId).map((a) => a.id);
      updateAnnotationsFor(selectedIdx, (anns) => anns.map((a) => a.groupId === groupId ? { ...a, [flag]: on || void 0 } : a));
      if (on && [selectedAnnId, ...selectedAnnIds].some((id) => members.includes(id))) {
        setSelectedAnnId(null);
        setSelectedAnnIds([]);
      }
    }
    function handleAddText(x, y, width) {
      if (selectedIdx === null) return;
      const id = nextAnnIdRef.current++;
      updateAnnotationsFor(selectedIdx, (anns) => [...anns, {
        id,
        type: "text",
        x,
        y,
        text: "",
        width,
        fontFamily: toolDefaults.textFontFamily,
        fontSize: toolDefaults.textFontSize,
        bold: toolDefaults.textBold,
        italic: toolDefaults.textItalic,
        underline: toolDefaults.textUnderline,
        color: toolDefaults.textColor,
        align: toolDefaults.textAlign
      }], "ann:" + id);
      setSelectedAnnId(id);
      setSelectedAnnIds([]);
      setEditingAnnId(id);
    }
    function handleAddRect(box) {
      if (selectedIdx === null) return;
      const id = nextAnnIdRef.current++;
      updateAnnotationsFor(selectedIdx, (anns) => [...anns, {
        id,
        type: "rect",
        shape: tool === "ellipse" ? "ellipse" : void 0,
        x: box.x,
        y: box.y,
        width: Math.max(MIN_RECT_SIZE, box.width),
        height: Math.max(MIN_RECT_SIZE, box.height),
        ...toolDefaults.rectDefaults
      }]);
      selectTool("select");
      setSelectedAnnId(id);
    }
    function handleAddStroke(stroke) {
      if (selectedIdx === null) return;
      const id = nextAnnIdRef.current++;
      updateAnnotationsFor(selectedIdx, (anns) => [...anns, {
        id,
        type: "stroke",
        tool: stroke.tool,
        points: stroke.points,
        color: stroke.color,
        strokeWidth: stroke.strokeWidth,
        taper: stroke.taper || 0
      }]);
    }
    function handleToggleLayerFlag(ann, flag) {
      const on = !ann[flag];
      handleUpdateAnnotation(ann.id, { [flag]: on });
      if (on && (ann.id === selectedAnnId || selectedAnnIds.includes(ann.id))) handleSelectAnnotation(ann.id, true, true);
    }
    function handleReorderLayers(draggedIds, insertBeforeRow) {
      const topFirst = (pages[selectedIdx].annotations || []).slice().reverse();
      const ids = withGroupMates(topFirst, draggedIds);
      const fromRows = topFirst.flatMap((a, row) => ids.includes(a.id) ? [row] : []);
      const newOrder = orderAfterMove(topFirst.length, fromRows, insertBeforeRow);
      if (newOrder) updateAnnotationsFor(selectedIdx, () => newOrder.map((row) => topFirst[row]).reverse());
    }
    function handleImageToolClick() {
      if (selectedIdx === null) return;
      imageInputRef.current && imageInputRef.current.click();
    }
    function addImageAnnotationFromFile(file, pageIdx, opts = {}) {
      if (!file || pageIdx === null) return;
      const pageAtChooseTime = pages[pageIdx];
      if (isSvgFile(file)) {
        svgFileToPng(file).then((png) => placeImage(png.src, png.width, png.height)).catch((err) => window.alert(err.message || "That SVG file couldn't be opened."));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => placeImage(reader.result, null, null);
      reader.readAsDataURL(file);
      function placeImage(src, shownW, shownH) {
        const img = new Image();
        img.onload = async () => {
          const MAX_W = 260;
          const baseW = shownW || img.naturalWidth;
          const baseH = shownH || img.naturalHeight;
          const scale = baseW > MAX_W ? MAX_W / baseW : 1;
          const width = baseW * scale;
          const height = baseH * scale;
          const display2 = await getPageDisplaySize(pageAtChooseTime, pdfDocsRef, MAIN_SCALE);
          const c = opts.center;
          const x = c ? Math.min(Math.max(0, c.x - width / 2), Math.max(0, display2.width - width)) : Math.max(0, (display2.width - width) / 2);
          const y = c ? Math.min(Math.max(0, c.y - height / 2), Math.max(0, display2.height - height)) : Math.max(0, (display2.height - height) / 2);
          const id = nextAnnIdRef.current++;
          updateAnnotationsFor(pageIdx, (anns) => [...anns, {
            id,
            type: "image",
            x,
            y,
            width,
            height,
            naturalWidth: img.naturalWidth,
            naturalHeight: img.naturalHeight,
            src
          }]);
          selectTool("select");
          setSelectedAnnId(id);
        };
        img.src = src;
      }
    }
    function handleImageFileChosen(e) {
      const file = e.target.files && e.target.files[0];
      e.target.value = "";
      addImageAnnotationFromFile(file, selectedIdx);
    }
    function handleUpdateAnnotation(id, patch) {
      if (selectedIdx === null) return;
      updateAnnotationsFor(selectedIdx, (anns) => patchedAnnotations(anns, id, patch, (a, p) => ({ ...a, ...withStyleOverrides(a, p) })), "ann:" + id);
    }
    function handleSetLayerLook(ids, patch) {
      if (selectedIdx === null || ids.length === 0) return;
      const merge = (a, p) => ({ ...a, ...withStyleOverrides(a, p) });
      const key = "look:" + Object.keys(patch).join() + ":" + ids.join();
      updateAnnotationsFor(selectedIdx, (anns) => ids.reduce((list, id) => patchedAnnotations(list, id, patch, merge), anns), key);
    }
    const patchBox = (id, patch) => updateAnnotationsFor(selectedIdx, (anns) => patchedAnnotations(anns, id, patch, (a, p) => ({ ...a, ...p })));
    function handleApplyTextStyle(ann, style) {
      if (selectedIdx === null) return;
      const builtIn = Boolean(style.builtIn);
      const props = builtIn ? style.props : resolvedStyleProps(toolDefaults.textStyles, style.name);
      patchBox(ann.id, { ...textStylePatch({ props }), styleName: builtIn ? void 0 : style.name, styleOverrides: void 0 });
    }
    function handleRedefineTextStyle(name, source) {
      const styles = toolDefaults.textStyles;
      const style = styles.find((s) => s.name === name);
      if (!style) return;
      const captured = captureTextStyle(source);
      const props = style.basedOn ? styleDiff(resolvedStyleProps(styles, style.basedOn), captured) : captured;
      const next = styles.map((s) => s.name === name ? { ...s, props } : s);
      toolDefaults.setTextStyles(next);
      recordUndoCheckpoint();
      setPages((prev) => prev.map((p) => ({
        ...p,
        annotations: (p.annotations || []).map((a) => {
          if (a.id === source.id) return { ...a, styleName: name, styleOverrides: void 0 };
          const patch = relinkPatch(a, next);
          return patch ? { ...a, ...patch } : a;
        })
      })));
    }
    function handleResetStyleOverrides(ann) {
      if (selectedIdx === null) return;
      const patch = relinkPatch({ ...ann, styleOverrides: void 0 }, toolDefaults.textStyles);
      if (patch) patchBox(ann.id, { ...patch, styleOverrides: void 0 });
    }
    function handleUnlinkTextStyle(ann) {
      if (selectedIdx === null) return;
      patchBox(ann.id, { styleName: void 0, styleOverrides: void 0 });
    }
    async function handleFlattenImage(ann) {
      const pageIdx = selectedIdx;
      const patch = await flattenedImagePatch(ann, pageFilter);
      if (!patch) return;
      updateAnnotationsFor(pageIdx, (anns) => anns.map((a) => a.id === ann.id ? { ...a, ...patch } : a));
    }
    async function handleRasterizeText(ann) {
      const pageIdx = selectedIdx;
      const patch = await rasterizedTextPatch(ann);
      if (!patch) return;
      updateAnnotationsFor(pageIdx, (anns) => anns.map((a) => a.id === ann.id ? { ...a, ...patch } : a));
    }
    async function handleRasterizeRect(ann) {
      const pageIdx = selectedIdx;
      const patch = await rasterizedRectPatch(ann);
      if (!patch) return;
      updateAnnotationsFor(pageIdx, (anns) => anns.map((a) => a.id === ann.id ? { ...a, ...patch } : a));
    }
    function handleDeleteAnnotation() {
      if (selectedIdx === null || selectedAnnId === null) return;
      const idsToDelete = [selectedAnnId, ...selectedAnnIds];
      updateAnnotationsFor(selectedIdx, (anns) => removeWithThreads(anns, idsToDelete));
      setSelectedAnnId(null);
      setSelectedAnnIds([]);
    }
    function handleEraseStroke(id) {
      if (selectedIdx === null) return;
      updateAnnotationsFor(selectedIdx, (anns) => anns.filter((a) => a.id !== id), "eraser");
      setSelectedAnnId((cur) => cur === id ? null : cur);
    }
    function handleEraseImagePixels(id, src, pageIdx) {
      const idx = pageIdx === void 0 ? selectedIdx : pageIdx;
      if (idx === null) return;
      updateAnnotationsFor(idx, (anns) => anns.map((a) => a.id === id ? { ...a, src } : a));
    }
    const frameActions = makeTextFrameActions({ pages, selectedIdx, pdfDocsRef, nextAnnIdRef, updateAnnotationsFor, setSelectedAnnId, setSelectedAnnIds });
    return {
      frameActions,
      updateAnnotationsFor,
      updatePageFilter,
      handleRotateAnnotations,
      handleMoveAnnotations,
      finishTextEdit,
      handleGroupSelection,
      handleUngroupSelection,
      handleSetClip,
      handleToggleClip,
      handleClipSelection,
      handleAddText,
      handleAddRect,
      handleAddStroke,
      handleToggleLayerFlag,
      handleReorderLayers,
      handleRenameGroup,
      handleSetGroupFlag,
      imageInputRef,
      handleImageToolClick,
      addImageAnnotationFromFile,
      handleImageFileChosen,
      handleUpdateAnnotation,
      handleSetLayerLook,
      handleFlattenImage,
      handleRasterizeText,
      handleRasterizeRect,
      handleDeleteAnnotation,
      handleEraseStroke,
      handleEraseImagePixels,
      styleActions: { apply: handleApplyTextStyle, redefine: handleRedefineTextStyle, resetOverrides: handleResetStyleOverrides, unlink: handleUnlinkTextStyle }
    };
  }

  // apps/ZEditor/src/state/useDialogs.js
  var { useState } = React;
  function useDialogs({ pages, openProjectPicker }) {
    const [newDocOpen, setNewDocOpen] = useState(false);
    const [newDocFromProject, setNewDocFromProject] = useState(false);
    const [shortcutsOpen, setShortcutsOpen] = useState(false);
    const [confirmAction, setConfirmAction] = useState(null);
    const [confirmStep, setConfirmStep] = useState(1);
    function openNewDocDialog(fromProject) {
      setNewDocFromProject(fromProject);
      setNewDocOpen(true);
    }
    function handleNewProjectClick() {
      setConfirmAction("newProject");
      setConfirmStep(1);
    }
    function handleLoadProjectClick() {
      if (pages.length > 0) {
        setConfirmAction("loadProject");
        setConfirmStep(1);
      } else {
        openProjectPicker();
      }
    }
    function handleConfirmProceed() {
      setConfirmStep(2);
    }
    function handleConfirmCancel() {
      setConfirmAction(null);
      setConfirmStep(1);
    }
    function handleConfirmYes() {
      const action = confirmAction;
      setConfirmAction(null);
      setConfirmStep(1);
      if (action === "newProject") openNewDocDialog(true);
      else if (action === "loadProject") openProjectPicker();
    }
    return {
      newDocOpen,
      setNewDocOpen,
      newDocFromProject,
      openNewDocDialog,
      shortcutsOpen,
      setShortcutsOpen,
      confirmAction,
      confirmStep,
      handleNewProjectClick,
      handleLoadProjectClick,
      handleConfirmProceed,
      handleConfirmCancel,
      handleConfirmYes
    };
  }

  // apps/ZEditor/src/model/documentTitle.js
  function titleStamp(date = /* @__PURE__ */ new Date()) {
    const two = (n) => String(n).padStart(2, "0");
    return two(date.getFullYear() % 100) + two(date.getMonth() + 1) + two(date.getDate()) + two(date.getHours()) + two(date.getMinutes());
  }
  function stripExtension(name) {
    return String(name || "").replace(/\.[^./\\]+$/, "");
  }
  function titleToFileName(title, extension) {
    const safe = String(title || "").replace(/[<>:"/\\|?*\u0000-\u001f]+/g, " ").replace(/\s+/g, " ").replace(/[. ]+$/, "").trim();
    return (safe || "zine") + extension;
  }
  function pageImageFileName(title, pageIndex, pageCount, extension) {
    const digits = String(pageCount).length;
    const suffix = pageCount > 1 ? `-page-${String(pageIndex + 1).padStart(digits, "0")}` : "";
    return titleToFileName(title, suffix + extension);
  }

  // apps/ZEditor/src/io/pdfImport.js
  async function importPdfFile(file, ids) {
    const bytes = await file.arrayBuffer();
    const doc = await pdfjsLib.getDocument({ data: bytes.slice(0) }).promise;
    const docId = ids.docId();
    const pages = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const dataUrl = await renderPdfThumb(doc, i, 0);
      pages.push({ key: ids.pageKey(), docId, pageNumber: i, rotation: 0, dataUrl, isBlank: false, annotations: [] });
    }
    const p1 = await doc.getPage(1);
    const vp1 = p1.getViewport({ scale: 1, rotation: 0 });
    return { docId, entry: { doc, bytes }, pages, firstPageSize: { width: vp1.width, height: vp1.height } };
  }

  // apps/ZEditor/src/state/useDocumentFiles.js
  var { useState: useState2, useRef: useRef2 } = React;
  function useDocumentFiles({ doc, history, status, project, selection, dialogs }) {
    const { pages, setPages, selectedIdx, setSelectedIdx, setSelectedPageIndices, pdfDocsRef, nextKeyRef, pageSizeRef, ids } = doc;
    const { setLoading, setErrorMsg } = status;
    const fileInputRef = useRef2(null);
    const insertPdfInputRef = useRef2(null);
    const [pendingInsertFile, setPendingInsertFile] = useState2(null);
    const [insertAfterPage, setInsertAfterPage] = useState2(0);
    async function handleFile(file) {
      setErrorMsg(null);
      setLoading(true);
      try {
        const imported = await importPdfFile(file, ids);
        pdfDocsRef.current = { [imported.docId]: imported.entry };
        if (!pageSizeRef.current) pageSizeRef.current = imported.firstPageSize;
        setPages(imported.pages);
        setSelectedIdx(imported.pages.length > 0 ? 0 : null);
        setSelectedPageIndices([]);
        history.clearHistory();
        project.startNewDocument(stripExtension(file.name) + " - " + titleStamp());
      } catch (err) {
        setErrorMsg("Couldn't load that PDF — " + (err && err.message ? err.message : "unknown error"));
      } finally {
        setLoading(false);
      }
    }
    function handleLoadClick() {
      fileInputRef.current && fileInputRef.current.click();
    }
    function handleFileInputChange(e) {
      const file = e.target.files && e.target.files[0];
      e.target.value = "";
      if (file) handleFile(file);
    }
    function handleCreateBlankDocument({ width, height, pageCount }) {
      dialogs.setNewDocOpen(false);
      setErrorMsg(null);
      pdfDocsRef.current = {};
      pageSizeRef.current = { width, height };
      const thumb = makeBlankThumb(width, height, 0);
      const newPages = Array.from({ length: pageCount }, () => ({
        key: nextKeyRef.current++,
        isBlank: true,
        rotation: 0,
        width,
        height,
        dataUrl: thumb,
        annotations: []
      }));
      setPages(newPages);
      setSelectedIdx(0);
      setSelectedPageIndices([]);
      selection.setSelectedAnnId(null);
      selection.setSelectedAnnIds([]);
      history.clearHistory();
      project.startNewDocument("New Zine - " + titleStamp());
    }
    function handleNewDocumentOpenPdf() {
      dialogs.setNewDocOpen(false);
      handleLoadClick();
    }
    function handleInsertPdfClick() {
      insertPdfInputRef.current && insertPdfInputRef.current.click();
    }
    function handleInsertPdfInputChange(e) {
      const file = e.target.files && e.target.files[0];
      e.target.value = "";
      if (!file) return;
      setInsertAfterPage(selectedIdx !== null ? selectedIdx + 1 : pages.length);
      setPendingInsertFile(file);
    }
    async function handleConfirmInsertPdf() {
      const file = pendingInsertFile;
      const atIndex = Math.max(0, Math.min(pages.length, insertAfterPage));
      setPendingInsertFile(null);
      if (!file) return;
      setErrorMsg(null);
      setLoading(true);
      try {
        const imported = await importPdfFile(file, ids);
        pdfDocsRef.current[imported.docId] = imported.entry;
        if (!pageSizeRef.current) pageSizeRef.current = imported.firstPageSize;
        history.recordUndoCheckpoint();
        setPages((prev) => {
          const next = prev.slice();
          next.splice(atIndex, 0, ...imported.pages);
          return next;
        });
        setSelectedIdx(atIndex);
        setSelectedPageIndices([]);
      } catch (err) {
        setErrorMsg("Couldn't insert that PDF — " + (err && err.message ? err.message : "unknown error"));
      } finally {
        setLoading(false);
      }
    }
    return {
      fileInputRef,
      insertPdfInputRef,
      handleFile,
      handleLoadClick,
      handleFileInputChange,
      handleCreateBlankDocument,
      handleNewDocumentOpenPdf,
      handleInsertPdfClick,
      handleInsertPdfInputChange,
      pendingInsertFile,
      setPendingInsertFile,
      insertAfterPage,
      setInsertAfterPage,
      handleConfirmInsertPdf
    };
  }

  // apps/ZEditor/src/state/useDocumentState.js
  var { useState: useState3, useRef: useRef3, useMemo } = React;
  function useDocumentState() {
    const [pages, setPages] = useState3([]);
    const [selectedIdx, setSelectedIdx] = useState3(null);
    const [selectedPageIndices, setSelectedPageIndices] = useState3([]);
    const selectedPage = selectedIdx !== null ? pages[selectedIdx] : null;
    const pageFilter = useMemo(() => selectedPage && selectedPage.filter || DEFAULT_PAGE_FILTER, [selectedPage]);
    const pdfDocsRef = useRef3({});
    const nextKeyRef = useRef3(1);
    const nextAnnIdRef = useRef3(1);
    const nextDocIdRef = useRef3(1);
    const pageSizeRef = useRef3(null);
    const ids = {
      pageKey: () => nextKeyRef.current++,
      docId: () => "doc" + nextDocIdRef.current++,
      annId: () => nextAnnIdRef.current++
    };
    return {
      pages,
      setPages,
      selectedIdx,
      setSelectedIdx,
      selectedPageIndices,
      setSelectedPageIndices,
      selectedPage,
      pageFilter,
      pdfDocsRef,
      nextKeyRef,
      nextAnnIdRef,
      nextDocIdRef,
      pageSizeRef,
      ids
    };
  }

  // shared/js/download.js
  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1e3);
  }

  // apps/ZEditor/src/io/fileSave.js
  function canvasToArrayBuffer(canvas) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(async (blob) => {
        if (!blob) {
          reject(new Error("Couldn't encode a page image."));
          return;
        }
        resolve(await blob.arrayBuffer());
      }, "image/png");
    });
  }
  async function saveFile(data, filename, mimeType, description, extensions, downloadType) {
    if (typeof window.showSaveFilePicker === "function") {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: filename,
          types: [{ description, accept: { [mimeType]: extensions } }]
        });
        await writeFileHandle(handle, data);
        return handle;
      } catch (err) {
        if (err && err.name === "AbortError") return "cancelled";
      }
    }
    const blob = new Blob([data], { type: downloadType || mimeType });
    downloadBlob(blob, filename);
    return null;
  }
  async function writeFileHandle(handle, data) {
    if (handle.queryPermission && await handle.queryPermission({ mode: "readwrite" }) !== "granted") {
      if (await handle.requestPermission({ mode: "readwrite" }) !== "granted") {
        throw Object.assign(new Error("Permission to edit the file was refused"), { name: "NotAllowedError" });
      }
    }
    const writable = await handle.createWritable();
    await writable.write(data);
    await writable.close();
  }
  async function savePdfBytes(bytes, filename) {
    return saveFile(bytes, filename, "application/pdf", "PDF file", [".pdf"]);
  }

  // apps/ZEditor/src/io/imageExport.js
  var IMAGE_FORMATS = {
    jpg: { mime: "image/jpeg", ext: ".jpg", description: "JPEG image", transparent: false, quality: 0.95 },
    png: { mime: "image/png", ext: ".png", description: "PNG image (transparent background)", transparent: true }
  };
  async function renderPageImageBlob(pages, pageIdx, pdfDocsRef, pageNumbers, format) {
    const fmt = IMAGE_FORMATS[format];
    const page = pages[pageIdx];
    await prepareWrapShapes([page]);
    const canvas = await renderPageToCanvas(
      page,
      pdfDocsRef,
      EXPORT_SCALE,
      page.filter || DEFAULT_PAGE_FILTER,
      pageNumberSpec(pageNumbers, pageIdx, pages.length),
      fmt.transparent
    );
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Couldn't encode the page image.")), fmt.mime, fmt.quality);
    });
  }

  // apps/ZEditor/src/io/base64.js
  function arrayBufferToBase64(buf) {
    const bytes = new Uint8Array(buf);
    const chunkSize = 32768;
    let binary = "";
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
  }
  function base64ToArrayBuffer(b64) {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
  }

  // apps/ZEditor/src/io/customFonts.js
  var customFontStore = [];
  async function registerCustomFont(family, bytes) {
    const face = new FontFace(family, bytes.slice(0));
    await face.load();
    document.fonts.add(face);
  }
  async function addCustomFontFile(file, takenNames) {
    if (!/\.(ttf|otf|woff2?)$/i.test(file.name)) throw new Error("Choose a .ttf, .otf, .woff or .woff2 font file.");
    const bytes = await file.arrayBuffer();
    const base = file.name.replace(/\.[^.]+$/, "").replace(/_+/g, " ").replace(/['"\\]/g, "").trim() || "Custom font";
    let family = base, n = 2;
    while (takenNames.includes(family)) family = `${base} ${n++}`;
    try {
      await registerCustomFont(family, bytes);
    } catch (err) {
      throw new Error("That file isn't a font the browser can read.");
    }
    customFontStore.push({ family, data: arrayBufferToBase64(bytes) });
    return family;
  }

  // apps/ZEditor/src/io/fontFiles.js
  function parseStyle(style) {
    const words = (style || "regular").toLowerCase().replace(/[-_]/g, " ").split(/\s+/).filter(Boolean);
    const italic = words.some((w) => w === "italic" || w === "oblique");
    const rest = words.filter((w) => w !== "italic" && w !== "oblique");
    const weight = rest.length === 0 || rest.length === 1 && ["regular", "normal", "roman", "book"].includes(rest[0]) ? "regular" : rest.join(" ");
    return { italic, weight };
  }
  function createFontResolver() {
    let localFontsPromise = null;
    const bytesCache = /* @__PURE__ */ new Map();
    function localFonts() {
      if (!localFontsPromise) {
        localFontsPromise = (async () => {
          try {
            if (!("queryLocalFonts" in window) || !navigator.permissions || !navigator.permissions.query) return [];
            const state = await navigator.permissions.query({ name: "local-fonts" });
            return state.state === "granted" ? await window.queryLocalFonts() : [];
          } catch (err) {
            return [];
          }
        })();
      }
      return localFontsPromise;
    }
    async function find(family, bold, italic) {
      if (!family) return null;
      const key = `${family}|${bold ? "b" : ""}${italic ? "i" : ""}`;
      if (bytesCache.has(key)) return bytesCache.get(key);
      let found = null;
      const uploaded = customFontStore.find((f) => f.family === family);
      if (uploaded && !bold && !italic) {
        found = { key, bytes: base64ToArrayBuffer(uploaded.data) };
      } else if (!uploaded) {
        const wantWeight = bold ? "bold" : "regular";
        const faces = (await localFonts()).filter((f) => f.family.toLowerCase() === family.toLowerCase());
        const face = faces.find((f) => {
          const s = parseStyle(f.style);
          return s.italic === Boolean(italic) && s.weight === wantWeight;
        });
        if (face) {
          try {
            found = { key, bytes: await (await face.blob()).arrayBuffer() };
          } catch (err) {
            found = null;
          }
        }
      }
      bytesCache.set(key, found);
      return found;
    }
    return { find };
  }

  // apps/ZEditor/src/io/vectorText.js
  var COMPLEX_SCRIPT = /[֐-ࣿऀ-෿฀-໿က-႟ក-៿]/;
  function blockerFor(ann) {
    const look = textLook(ann);
    if (!ann.text || !ann.text.trim()) return "empty";
    if (look.stroke || look.shadow || look.gradient || look.photo || look.ransom || look.curve || look.distress || look.stacked) return "effect";
    if (look.strike === "double" || look.strike === "wavy") return "decoration";
    if (look.textCase === "small") return "small caps";
    if (look.label && look.label.labelRadius > 0) return "rounded label";
    if (blendOf(ann) !== "normal") return "blend";
    if (opacityOf(ann) < 1) return "opacity";
    if (COMPLEX_SCRIPT.test(ann.text)) return "script";
    if ((ann.colorRuns || []).some((r) => r.fontFamily != null || r.fontSize != null || r.bold != null || r.italic != null)) return "mixed fonts";
    return null;
  }
  function coveredRect(ann) {
    let x, y, w, h;
    if (ann.type === "stroke") {
      const b = bboxOf(ann);
      const pad = (ann.width || 10) / 2 + 2;
      x = b.x - pad;
      y = b.y - pad;
      w = b.width + pad * 2;
      h = b.height + pad * 2;
    } else if (ann.type === "text") {
      const m = measureTextBox(ann);
      x = ann.x;
      y = ann.y;
      w = m.width;
      h = m.height;
    } else {
      x = ann.x;
      y = ann.y;
      w = ann.width || 0;
      h = ann.height || 0;
    }
    const angle = angleOf(ann) * Math.PI / 180;
    if (!angle) return { x0: x, y0: y, x1: x + w, y1: y + h };
    const cx = x + w / 2, cy = y + h / 2;
    const cos = Math.abs(Math.cos(angle)), sin = Math.abs(Math.sin(angle));
    const hw = (w * cos + h * sin) / 2, hh = (w * sin + h * cos) / 2;
    return { x0: cx - hw, y0: cy - hh, x1: cx + hw, y1: cy + hh };
  }
  var overlaps = (a, b) => a.x0 < b.x1 + 1 && a.x1 > b.x0 - 1 && a.y0 < b.y1 + 1 && a.y1 > b.y0 - 1;
  var REASON_TEXT = {
    effect: "an effect (stroke, shadow, gradient, photo fill, ransom, curve, distress or stacked letters)",
    decoration: "a double or wavy line",
    "mixed fonts": "custom text in another font, size, bold or italic",
    "small caps": "small caps",
    "rounded label": "a rounded label",
    blend: "a blend mode",
    opacity: "a layer opacity below 100%",
    script: "text that needs complex-script shaping",
    font: "a font whose file isn't available",
    glyphs: "characters their font doesn't have",
    covered: "another item sitting on top of them",
    unavailable: "a font that couldn't be embedded"
  };
  function createVectorTextExporter(outDoc) {
    const fk = typeof window !== "undefined" ? window.fontkit : null;
    if (fk) outDoc.registerFontkit(fk);
    const resolver = createFontResolver();
    const faces = /* @__PURE__ */ new Map();
    const counts = { vector: 0, picture: 0, reasons: {} };
    let currentFaces = /* @__PURE__ */ new Map();
    async function faceFor(ann) {
      if (!fk) return { reason: "unavailable" };
      const file = await resolver.find(ann.fontFamily, ann.bold, ann.italic);
      if (!file) return { reason: "font" };
      if (!faces.has(file.key)) {
        let face2 = null;
        try {
          const fkFont = fk.create(new Uint8Array(file.bytes));
          if (fkFont && !fkFont.fonts) face2 = { fkFont, pdfFont: await outDoc.embedFont(file.bytes, { subset: true }) };
        } catch (err) {
          face2 = null;
        }
        faces.set(file.key, face2);
      }
      const face = faces.get(file.key);
      return face ? { face } : { reason: "unavailable" };
    }
    async function plan(annotations) {
      const vectorIds = /* @__PURE__ */ new Set();
      const visible = annotations.filter((a) => !a.hidden);
      const candidates = /* @__PURE__ */ new Map();
      for (const ann of visible) {
        if (ann.type !== "text") continue;
        const blocked = blockerFor(ann);
        if (blocked === "empty") continue;
        if (blocked) {
          note(blocked);
          continue;
        }
        const { face, reason } = await faceFor(ann);
        if (!face) {
          note(reason);
          continue;
        }
        const shown = caseText(ann.text, textLook(ann).textCase);
        const missing = Array.from(shown).some((ch) => ch.trim() && !face.fkFont.hasGlyphForCodePoint(ch.codePointAt(0)));
        if (missing) {
          note("glyphs");
          continue;
        }
        candidates.set(ann.id, { ann, face });
      }
      const pictureAbove = [];
      for (let i = visible.length - 1; i >= 0; i--) {
        const ann = visible[i];
        const cand = candidates.get(ann.id);
        const mine = coveredRect(ann);
        if (cand && !pictureAbove.some((r) => overlaps(mine, r))) {
          vectorIds.add(ann.id);
          counts.vector++;
          continue;
        }
        if (cand) note("covered");
        pictureAbove.push(mine);
      }
      currentFaces = candidates;
      return vectorIds;
    }
    function note(reason) {
      counts.picture++;
      counts.reasons[reason] = (counts.reasons[reason] || 0) + 1;
    }
    async function draw(outPage, ann, pageHeightPts) {
      const PDF = window.PDFLib;
      const { face } = currentFaces.get(ann.id);
      const ctx = document.createElement("canvas").getContext("2d");
      const scaleFactor = EXPORT_SCALE / MAIN_SCALE;
      const layout = layoutText(ctx, ann, scaleFactor);
      const { runs, lineExtents } = layoutPlainRuns(layout, ann);
      const { look, fontSize, measure, x, y, boxWidth, boxHeight } = layout;
      const toPt = 1 / EXPORT_SCALE;
      const pdfY = (canvasY) => pageHeightPts - canvasY * toPt;
      const sizePt = fontSize * toPt;
      const colorOf = (hex2) => {
        const c = hexToRgb(hex2 || look.color);
        return PDF.rgb(c.r / 255, c.g / 255, c.b / 255);
      };
      const opacity = look.fillAlpha / 100;
      const angle = angleOf(ann);
      if (angle) {
        const cx = (x + boxWidth / 2) * toPt, cy = pdfY(y + boxHeight / 2);
        outPage.pushOperators(PDF.pushGraphicsState(), PDF.translate(cx, cy), PDF.rotateDegrees(-angle), PDF.translate(-cx, -cy));
      }
      if (look.label) {
        const c = hexToRgb(look.label.labelColor);
        outPage.drawRectangle({
          x: x * toPt,
          y: pdfY(y + boxHeight),
          width: boxWidth * toPt,
          height: boxHeight * toPt,
          color: PDF.rgb(c.r / 255, c.g / 255, c.b / 255),
          opacity: look.label.labelAlpha / 100
        });
      }
      for (const rule of columnRules(layout, ann)) {
        outPage.drawLine({ start: { x: rule.x * toPt, y: pdfY(rule.y0) }, end: { x: rule.x * toPt, y: pdfY(rule.y1) }, thickness: rule.width * toPt, color: colorOf(rule.color) });
      }
      outPage.setFont(face.pdfFont);
      const tolerance = fontSize * 0.03;
      for (const run2 of runs) {
        const color = colorOf(run2.color);
        const text = run2.text;
        let i = 0;
        while (i < text.length) {
          if (text[i] === " ") {
            i++;
            continue;
          }
          let j = i;
          while (j < text.length && text[j] !== " ") j++;
          const word = text.slice(i, j);
          const wordX = run2.x + (i ? measure(text.slice(0, i)) : 0);
          const pdfWidth = face.pdfFont.widthOfTextAtSize(word, sizePt) / toPt;
          if (Math.abs(pdfWidth - measure(word)) <= tolerance) {
            outPage.drawText(word, { x: wordX * toPt, y: pdfY(run2.baselineY), size: sizePt, color, opacity });
          } else {
            let offset = 0;
            for (const ch of Array.from(word)) {
              outPage.drawText(ch, { x: (wordX + (offset ? measure(word.slice(0, offset)) : 0)) * toPt, y: pdfY(run2.baselineY), size: sizePt, color, opacity });
              offset += ch.length;
            }
          }
          i = j;
        }
      }
      const thickness = Math.max(1, fontSize * 0.06) * toPt;
      for (const { line, baselineY, segments } of lineExtents) {
        if (!line) continue;
        for (const { x0, x1, color, underline, strike } of segments) {
          const lineColor = colorOf(color);
          const rule = (dy) => outPage.drawLine({ start: { x: x0 * toPt, y: pdfY(baselineY + dy) }, end: { x: x1 * toPt, y: pdfY(baselineY + dy) }, thickness, color: lineColor, opacity });
          if (underline != null ? underline : ann.underline) rule(fontSize * 0.12);
          if (strike != null ? strike : look.strike === "line") rule(-fontSize * 0.3);
        }
      }
      if (angle) outPage.pushOperators(PDF.popGraphicsState());
    }
    function describe() {
      const { vector, picture, reasons } = counts;
      if (!vector && !picture) return null;
      const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "es"}`;
      const parts = [];
      if (vector) parts.push(`${plural(vector, "text box")} exported as real text`);
      if (picture) {
        const why = Object.entries(reasons).map(([reason, n]) => `${n} because of ${REASON_TEXT[reason] || reason}`);
        parts.push(`${plural(picture, "text box")} stayed as a picture (${why.join("; ")})`);
      }
      let message = parts.join(". ") + ".";
      if (reasons.font) message += " To keep those as text, upload their font (font menu → Upload Font File) or allow “Load Local System Fonts”.";
      return message;
    }
    return { plan, draw, describe, counts };
  }

  // apps/ZEditor/src/io/pdfExport.js
  async function buildExportPdfBytes(pages, pdfDocsRef, pageNumbers, onReport) {
    const outDoc = await PDFLib.PDFDocument.create();
    const vectorText = createVectorTextExporter(outDoc);
    await prepareWrapShapes(pages);
    const overflowPages = [];
    for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
      const page = { ...pages[pageIdx], annotations: resolvePageText(pages[pageIdx].annotations || []) };
      const annotations = page.annotations;
      if (annotations.some((a) => a.type === "text" && !a.hidden && a.storyNextId == null && measureTextBox(a).overflow)) overflowPages.push(pageIdx + 1);
      const vectorIds = await vectorText.plan(annotations);
      const picturePage = vectorIds.size ? { ...page, annotations: annotations.filter((a) => !vectorIds.has(a.id)) } : page;
      const canvas = await renderPageToCanvas(picturePage, pdfDocsRef, EXPORT_SCALE, page.filter || DEFAULT_PAGE_FILTER, pageNumberSpec(pageNumbers, pageIdx, pages.length));
      const pngBytes = await canvasToArrayBuffer(canvas);
      const pngImage = await outDoc.embedPng(pngBytes);
      const pageWidthPts = canvas.width / EXPORT_SCALE;
      const pageHeightPts = canvas.height / EXPORT_SCALE;
      const outPage = outDoc.addPage([pageWidthPts, pageHeightPts]);
      outPage.drawImage(pngImage, { x: 0, y: 0, width: pageWidthPts, height: pageHeightPts });
      for (const ann of annotations) {
        if (vectorIds.has(ann.id)) await vectorText.draw(outPage, ann, pageHeightPts);
      }
    }
    if (onReport) {
      const overflow = overflowPages.length ? `Overset text: a text frame on page ${overflowPages.join(", ")} has more text than fits (the rest is not in the PDF).` : "";
      onReport([vectorText.describe(), overflow].filter(Boolean).join(" "));
    }
    return outDoc.save();
  }

  // apps/ZEditor/src/io/svgExport.js
  var num = (v) => String(Math.round(v * 100) / 100);
  var escapeXml = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  function svgColor(css) {
    const m = /^rgba?\(([^)]+)\)$/.exec(css || "");
    if (!m) return { color: css || "#000000", opacity: 1 };
    const [r, g, b, a = 1] = m[1].split(",").map(Number);
    return { color: `rgb(${r},${g},${b})`, opacity: a };
  }
  function wrapItem(ann, inner, box) {
    const attrs = [];
    const angle = angleOf(ann);
    if (angle && box) attrs.push(`transform="rotate(${num(angle)} ${num(box.x + box.width / 2)} ${num(box.y + box.height / 2)})"`);
    if (opacityOf(ann) < 1) attrs.push(`opacity="${num(opacityOf(ann))}"`);
    if (blendOf(ann) !== "normal") attrs.push(`style="mix-blend-mode:${blendOf(ann)}"`);
    return attrs.length ? `<g ${attrs.join(" ")}>${inner}</g>` : inner;
  }
  function traceSvg(ann) {
    if (!ann.traceW || !ann.traceH) return "";
    const paths = traceDrawList(ann).map((p) => {
      const fill = p.fill ? `fill="${p.fill}"` : `fill="none"`;
      const stroke = p.stroke ? ` stroke="${p.stroke}" stroke-width="${num(p.strokeWidth)}" stroke-linejoin="round" stroke-linecap="round"` : "";
      return `<path d="${p.d}" ${fill}${stroke}/>`;
    }).join("");
    const sx = ann.width / ann.traceW, sy = ann.height / ann.traceH;
    return `<g transform="translate(${num(ann.x)} ${num(ann.y)}) scale(${+sx.toFixed(6)} ${+sy.toFixed(6)})">${paths}</g>`;
  }
  function rectSvg(ann, defs, nextId) {
    const v = controlValues(ann, RECT_CONTROLS);
    const w = ann.width, h = ann.height;
    let fill;
    if (v.fillType === "solid") {
      const { r, g, b } = hexToRgb(v.fillColor);
      fill = `fill="rgb(${r},${g},${b})"${v.fillAlpha < 100 ? ` fill-opacity="${num(v.fillAlpha / 100)}"` : ""}`;
    } else {
      const id = nextId("grad");
      const stops = rectGradientStops(ann).map((s) => {
        const c = svgColor(s.color);
        return `<stop offset="${num(s.percent)}%" stop-color="${c.color}"${c.opacity < 1 ? ` stop-opacity="${num(c.opacity)}"` : ""}/>`;
      }).join("");
      if (v.fillType === "linear") {
        const rad = v.gradientAngle * Math.PI / 180, dx = Math.sin(rad), dy = -Math.cos(rad);
        const half = (Math.abs(w * dx) + Math.abs(h * dy)) / 2;
        defs.push(`<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${num(w / 2 - dx * half)}" y1="${num(h / 2 - dy * half)}" x2="${num(w / 2 + dx * half)}" y2="${num(h / 2 + dy * half)}">${stops}</linearGradient>`);
      } else {
        defs.push(`<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="1" gradientTransform="translate(${num(w / 2)} ${num(h / 2)}) scale(${num(w / 2 * Math.SQRT2)} ${num(h / 2 * Math.SQRT2)})">${stops}</radialGradient>`);
      }
      fill = `fill="url(#${id})"`;
    }
    const outline = imageEdgeOutline(ann);
    const shape = outline ? `<path d="${outline}" ${fill}/>` : `<rect width="${num(w)}" height="${num(h)}" ${fill}/>`;
    let stroke = "";
    if (ann.stroke) {
      const s = effectSettings(ann, STROKE_EFFECT);
      stroke = `<path d="${outline || rectOutline(ann)}" fill="none" stroke="${s.strokeColor}" stroke-width="${num(s.strokeThickness)}" stroke-miterlimit="4"/>`;
    }
    return `<g transform="translate(${num(ann.x)} ${num(ann.y)})">${shape}${stroke}</g>`;
  }
  function strokeSvg(ann) {
    const isHi = ann.tool === "highlighter";
    const color = ann.color || (isHi ? HIGHLIGHTER_DEFAULTS.color : PEN_DEFAULTS.color);
    const width = ann.strokeWidth || (isHi ? HIGHLIGHTER_DEFAULTS.width : PEN_DEFAULTS.width);
    const alpha = isHi ? ` opacity="0.45"` : "";
    if (ann.taper > 0) return `<path d="${taperedPathD(ann.points, width, ann.taper)}" fill="${color}"${alpha}/>`;
    return `<path d="${smoothPathD(ann.points)}" fill="none" stroke="${color}" stroke-width="${num(width)}" stroke-linecap="round" stroke-linejoin="round"${alpha}/>`;
  }
  function plainTextLook(ann) {
    const look = textLook(ann);
    return !(look.stroke || look.shadow || look.gradient || look.photo || look.ransom || look.curve || look.distress || look.stacked);
  }
  function textSvg(ann, fonts) {
    const ctx = document.createElement("canvas").getContext("2d");
    const layout = layoutText(ctx, ann, 1);
    const { runs, lineExtents } = layoutPlainRuns(layout, ann);
    const { look, fontSize, x, y, boxWidth, boxHeight } = layout;
    const family = ann.fontFamily || "sans-serif";
    fonts.add(family);
    let out = "";
    if (look.label) {
      const c = hexToRgb(look.label.labelColor);
      out += `<rect x="${num(x)}" y="${num(y)}" width="${num(boxWidth)}" height="${num(boxHeight)}" rx="${num(look.label.labelRadius || 0)}" fill="rgb(${c.r},${c.g},${c.b})"${look.label.labelAlpha < 100 ? ` fill-opacity="${num(look.label.labelAlpha / 100)}"` : ""}/>`;
    }
    for (const rule of columnRules(layout, ann)) {
      out += `<line x1="${num(rule.x)}" y1="${num(rule.y0)}" x2="${num(rule.x)}" y2="${num(rule.y1)}" stroke="${rule.color}" stroke-width="${num(rule.width)}"/>`;
    }
    const base = `font-family="${escapeXml(family)}, sans-serif" font-size="${num(fontSize)}"${ann.bold ? ` font-weight="bold"` : ""}${ann.italic ? ` font-style="italic"` : ""}` + (look.letterSpacingPx ? ` letter-spacing="${num(look.letterSpacingPx)}"` : "") + (look.fillAlpha < 100 ? ` fill-opacity="${num(look.fillAlpha / 100)}"` : "");
    const tspans = runs.filter((r) => r.text.trim()).map((r) => {
      const font = r.font ? ` style="font:${escapeXml(r.font)}"` : "";
      return `<tspan x="${num(r.x)}" y="${num(r.baselineY)}" fill="${r.color || look.color}"${font}>${escapeXml(r.text)}</tspan>`;
    }).join("");
    out += `<text ${base} xml:space="preserve">${tspans}</text>`;
    for (const ext of lineExtents) {
      for (const seg of ext.segments) {
        const lines = [];
        const underlined = seg.underline != null ? seg.underline : ann.underline;
        const struck = seg.strike != null ? seg.strike : look.strike !== "none";
        if (underlined) lines.push(ext.baselineY + fontSize * 0.12);
        if (struck) lines.push(ext.baselineY - fontSize * 0.3);
        for (const ly of lines) out += `<line x1="${num(seg.x0)}" y1="${num(ly)}" x2="${num(seg.x1)}" y2="${num(ly)}" stroke="${seg.color || look.color}" stroke-width="${num(Math.max(1, fontSize / 15))}"/>`;
      }
    }
    return { svg: out, box: { x, y, width: boxWidth, height: boxHeight } };
  }
  function imageTag(patch) {
    return `<image href="${patch.src}" x="${num(patch.x)}" y="${num(patch.y)}" width="${num(patch.width)}" height="${num(patch.height)}" preserveAspectRatio="none"/>`;
  }
  async function layersToSvg(items, pageFilter) {
    if (!items.length) return null;
    const defs = [];
    let counter = 0;
    const nextId = (prefix) => `${prefix}${++counter}`;
    const fonts = /* @__PURE__ */ new Set();
    let pictures = 0, clipped = 0;
    const parts = [];
    for (const ann of items) {
      if (isClipped(ann)) clipped++;
      const box = { x: ann.x, y: ann.y, width: ann.width, height: ann.height };
      const hasLookOnly = Boolean(imageShadowOffset(ann) || ann.texture);
      if (ann.type === "trace" && !hasLookOnly) parts.push(wrapItem(ann, traceSvg(ann), box));
      else if (ann.type === "rect" && !hasLookOnly) parts.push(wrapItem(ann, rectSvg(ann, defs, nextId), box));
      else if (ann.type === "stroke") parts.push(wrapItem(ann, strokeSvg(ann), null));
      else if (ann.type === "text" && plainTextLook(ann)) {
        if (!ann.text || !ann.text.trim()) continue;
        const t = textSvg(ann, fonts);
        parts.push(wrapItem(ann, t.svg, t.box));
      } else {
        const patch = ann.type === "image" ? await flattenedImagePatch(ann, pageFilter) : ann.type === "text" ? await rasterizedTextPatch(ann) : ann.type === "rect" ? await rasterizedRectPatch(ann) : null;
        if (!patch) continue;
        pictures++;
        parts.push(wrapItem({ ...ann, angle: void 0 }, imageTag(patch), null));
      }
    }
    if (!parts.length) return null;
    const boundsOf = (ann) => ann.type === "trace" && traceContentBounds(ann) || annotationBounds(ann);
    const bounds = items.map(boundsOf).reduce((u, b) => ({
      x0: Math.min(u.x0, b.x),
      y0: Math.min(u.y0, b.y),
      x1: Math.max(u.x1, b.x + b.width),
      y1: Math.max(u.y1, b.y + b.height)
    }), { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity });
    const pad = 1;
    const vb = { x: bounds.x0 - pad, y: bounds.y0 - pad, w: bounds.x1 - bounds.x0 + pad * 2, h: bounds.y1 - bounds.y0 + pad * 2 };
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${num(vb.w / MAIN_SCALE)}pt" height="${num(vb.h / MAIN_SCALE)}pt" viewBox="${num(vb.x)} ${num(vb.y)} ${num(vb.w)} ${num(vb.h)}">
` + (defs.length ? `<defs>${defs.join("")}</defs>
` : "") + parts.join("\n") + "\n</svg>\n";
    return { svg, pictures, clipped, fonts: [...fonts] };
  }

  // apps/ZEditor/src/model/layerNames.js
  function layerName(ann) {
    if (ann.name) return ann.name;
    if (ann.type === "text") return ann.text.trim().split("\n")[0] || "Text";
    if (ann.type === "stroke") return ann.tool === "highlighter" ? "Highlight" : "Drawing";
    if (ann.type === "trace") return "Vectorized";
    if (ann.type === "rect") return isEllipse(ann) ? "Ellipse" : "Rectangle";
    return "Image";
  }

  // shared/js/zineArrangerHandoff.js
  var ARRANGER_READY_MESSAGE = "zinearranger-ready";
  var HANDOFF_PDF_MESSAGE = "zeditor-handoff-pdf";
  async function sendPdfToZineArranger(buildBytes, filename) {
    const win = window.open("../ZineArranger/index.html", "_blank");
    if (!win) throw new Error("The browser blocked the new tab — allow popups for this page and try again.");
    const readyPromise = new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        window.removeEventListener("message", onMessage);
        reject(new Error("ZineArranger didn't respond — it may still be loading, or didn't open as a new tab."));
      }, 15e3);
      function onMessage(event) {
        if (event.source !== win || !event.data || event.data.type !== ARRANGER_READY_MESSAGE) return;
        clearTimeout(timeoutId);
        window.removeEventListener("message", onMessage);
        resolve();
      }
      window.addEventListener("message", onMessage);
    });
    const pdfBytes = await buildBytes();
    const buffer = pdfBytes.buffer.slice(pdfBytes.byteOffset, pdfBytes.byteOffset + pdfBytes.byteLength);
    await readyPromise;
    win.postMessage({ type: HANDOFF_PDF_MESSAGE, buffer, filename }, "*", [buffer]);
  }

  // apps/ZEditor/src/state/useExport.js
  var { useState: useState4 } = React;
  function useExport({ doc, status, view, project, selection }) {
    const { pages, pdfDocsRef } = doc;
    const { setErrorMsg, setNotice } = status;
    const [exporting, setExporting] = useState4(false);
    const [sendingToArranger, setSendingToArranger] = useState4(false);
    const buildBytes = () => buildExportPdfBytes(pages, pdfDocsRef, view.pageNumbers, setNotice);
    async function handleExportPdf() {
      if (pages.length === 0 || exporting) return;
      setErrorMsg(null);
      setNotice(null);
      setExporting(true);
      try {
        const pdfBytes = await buildBytes();
        await savePdfBytes(pdfBytes, titleToFileName(project.docTitle, ".pdf"));
      } catch (err) {
        setErrorMsg("Couldn't export PDF — " + (err && err.message ? err.message : "unknown error"));
      } finally {
        setExporting(false);
      }
    }
    async function handleExportImage(format) {
      const idx = doc.selectedIdx;
      if (idx === null || !pages[idx] || exporting) return;
      const fmt = IMAGE_FORMATS[format];
      setErrorMsg(null);
      setNotice(null);
      setExporting(true);
      try {
        const blob = await renderPageImageBlob(pages, idx, pdfDocsRef, view.pageNumbers, format);
        await saveFile(blob, pageImageFileName(project.docTitle, idx, pages.length, fmt.ext), fmt.mime, fmt.description, [fmt.ext]);
      } catch (err) {
        setErrorMsg(`Couldn't export ${fmt.ext.slice(1).toUpperCase()} — ` + (err && err.message ? err.message : "unknown error"));
      } finally {
        setExporting(false);
      }
    }
    async function handleExportAllImages(format) {
      if (pages.length === 0 || exporting) return;
      const fmt = IMAGE_FORMATS[format];
      const label = fmt.ext.slice(1).toUpperCase();
      setErrorMsg(null);
      setNotice(null);
      setExporting(true);
      try {
        let folder = null;
        if (typeof window.showDirectoryPicker === "function") {
          try {
            folder = await window.showDirectoryPicker({ mode: "readwrite" });
          } catch (err) {
            if (err && err.name === "AbortError") return;
          }
        }
        for (let i = 0; i < pages.length; i++) {
          setNotice(`Exporting ${label}: page ${i + 1} of ${pages.length}…`);
          const blob = await renderPageImageBlob(pages, i, pdfDocsRef, view.pageNumbers, format);
          const name = pageImageFileName(project.docTitle, i, pages.length, fmt.ext);
          if (folder) await writeFileHandle(await folder.getFileHandle(name, { create: true }), blob);
          else {
            downloadBlob(blob, name);
            await new Promise((r) => setTimeout(r, 300));
          }
        }
        setNotice(`Exported ${pages.length} page${pages.length === 1 ? "" : "s"} as ${label}${folder ? ` to "${folder.name}"` : ""}.`);
      } catch (err) {
        setNotice(null);
        setErrorMsg(`Couldn't export ${label} — ` + (err && err.message ? err.message : "unknown error"));
      } finally {
        setExporting(false);
      }
    }
    function svgLayersFor(ids) {
      const page = pages[doc.selectedIdx];
      if (!page) return [];
      const wanted = new Set(ids || selection.selectedAnnotationIds());
      return resolvePageText(page.annotations || []).filter((a) => wanted.has(a.id) && !a.hidden);
    }
    async function handleExportSvg(ids) {
      const items = svgLayersFor(ids);
      if (!items.length || exporting) return;
      setErrorMsg(null);
      setNotice(null);
      setExporting(true);
      try {
        const result = await layersToSvg(items, doc.pageFilter);
        if (!result) {
          setNotice("Nothing visible to save as SVG.");
          return;
        }
        const name = items.length === 1 ? layerName(items[0]) : project.docTitle;
        const saved = await saveFile(result.svg, titleToFileName(name, ".svg"), "image/svg+xml", "SVG image", [".svg"]);
        if (saved === "cancelled") return;
        const notes = [];
        if (result.pictures) notes.push(`${result.pictures} layer${result.pictures === 1 ? " went" : "s went"} in as a picture (photos, and text or shapes with effects SVG can't hold)`);
        if (result.fonts.length) notes.push(`text uses ${result.fonts.join(", ")}: it looks right where ${result.fonts.length === 1 ? "that font is" : "those fonts are"} installed`);
        if (result.clipped) notes.push("clipping masks aren't applied (clipped layers go in whole)");
        setNotice(notes.length ? "Saved SVG. Note: " + notes.join("; ") + "." : `Saved SVG (${items.length} layer${items.length === 1 ? "" : "s"}, all vector).`);
      } catch (err) {
        setErrorMsg("Couldn't save SVG — " + (err && err.message ? err.message : "unknown error"));
      } finally {
        setExporting(false);
      }
    }
    async function handleSendToZineArranger() {
      if (pages.length === 0 || exporting || sendingToArranger) return;
      setErrorMsg(null);
      setSendingToArranger(true);
      try {
        await sendPdfToZineArranger(buildBytes, titleToFileName(project.docTitle, ".pdf"));
      } catch (err) {
        setErrorMsg("Couldn't send to ZineArranger — " + (err && err.message ? err.message : "unknown error"));
      } finally {
        setSendingToArranger(false);
      }
    }
    return {
      exporting,
      sendingToArranger,
      handleExportPdf,
      handleExportImage,
      handleExportAllImages,
      handleSendToZineArranger,
      handleExportSvg,
      canExportSvg: () => svgLayersFor().length > 0
    };
  }

  // apps/ZEditor/src/model/history.js
  var UNDO_COALESCE_MS = 700;
  var MAX_UNDO_HISTORY = 50;

  // apps/ZEditor/src/state/useHistory.js
  var { useState: useState5, useRef: useRef4 } = React;
  function stripDataUrls(pagesArr) {
    return pagesArr.map(({ dataUrl, ...rest }) => rest);
  }
  function useHistory({ pages, setPages, selectedIdx, setSelectedIdx, selectedPageIndices, setSelectedPageIndices, pdfDocsRef }) {
    const [undoStack, setUndoStack] = useState5([]);
    const [redoStack, setRedoStack] = useState5([]);
    const lastCommitRef = useRef4({ time: 0, key: null });
    function recordUndoCheckpoint(coalesceKey) {
      const now = Date.now();
      if (coalesceKey && lastCommitRef.current.key === coalesceKey && now - lastCommitRef.current.time < UNDO_COALESCE_MS) {
        lastCommitRef.current.time = now;
        return;
      }
      lastCommitRef.current = { time: now, key: coalesceKey || null };
      setUndoStack((stack) => {
        const next = [...stack, { pages: stripDataUrls(pages), selectedIdx, selectedPageIndices }];
        return next.length > MAX_UNDO_HISTORY ? next.slice(next.length - MAX_UNDO_HISTORY) : next;
      });
      setRedoStack([]);
    }
    function clearHistory() {
      setUndoStack([]);
      setRedoStack([]);
    }
    async function restoreSnapshot(snapshot) {
      const currentByKey = new Map(pages.map((p) => [p.key, p]));
      const withThumbs = await Promise.all(snapshot.pages.map(async (p) => {
        const existing = currentByKey.get(p.key);
        const reusable = existing && existing.dataUrl && existing.rotation === p.rotation && existing.isBlank === p.isBlank && existing.pageNumber === p.pageNumber && existing.docId === p.docId && existing.width === p.width && existing.height === p.height;
        if (reusable) return { ...p, dataUrl: existing.dataUrl };
        const dataUrl = p.isBlank ? makeBlankThumb(p.width, p.height, p.rotation) : await renderPdfThumb(docFor(pdfDocsRef, p), p.pageNumber, p.rotation);
        return { ...p, dataUrl };
      }));
      setPages(withThumbs);
      setSelectedIdx(snapshot.selectedIdx);
      setSelectedPageIndices(snapshot.selectedPageIndices);
    }
    function handleUndo() {
      if (undoStack.length === 0) return;
      const entry = undoStack[undoStack.length - 1];
      setUndoStack((stack) => stack.slice(0, -1));
      setRedoStack((stack) => [...stack, { pages: stripDataUrls(pages), selectedIdx, selectedPageIndices }]);
      lastCommitRef.current = { time: 0, key: null };
      restoreSnapshot(entry);
    }
    function handleRedo() {
      if (redoStack.length === 0) return;
      const entry = redoStack[redoStack.length - 1];
      setRedoStack((stack) => stack.slice(0, -1));
      setUndoStack((stack) => [...stack, { pages: stripDataUrls(pages), selectedIdx, selectedPageIndices }]);
      lastCommitRef.current = { time: 0, key: null };
      restoreSnapshot(entry);
    }
    return { undoStack, redoStack, recordUndoCheckpoint, clearHistory, handleUndo, handleRedo };
  }

  // apps/ZEditor/src/state/useKeyboardShortcuts.js
  var { useRef: useRef5, useEffect: useEffect2 } = React;
  function useKeyboardShortcuts(app) {
    const appRef = useRef5(app);
    appRef.current = app;
    const clipboardRef = useRef5(null);
    useEffect2(() => {
      function handleKeyDown(e) {
        const { doc, history, selection, edits, pageOps, project, marquee, modalOpen } = appRef.current;
        const { pages, selectedIdx, selectedPageIndices, setSelectedIdx, setSelectedPageIndices, nextAnnIdRef } = doc;
        const { selectedAnnId, selectedAnnIds, setSelectedAnnId, selectTool } = selection;
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
          e.preventDefault();
          if (!modalOpen) project.handleSaveProject({ saveAs: e.shiftKey });
          return;
        }
        const tag = e.target && e.target.tagName || "";
        if (tag === "INPUT" || tag === "TEXTAREA" || e.target && e.target.isContentEditable) return;
        if (modalOpen) return;
        const key = e.key.toLowerCase();
        const mod = e.ctrlKey || e.metaKey;
        if (mod) {
          if (key === "z" && !e.shiftKey) {
            e.preventDefault();
            history.handleUndo();
            return;
          }
          if (key === "z" && e.shiftKey || key === "y") {
            e.preventDefault();
            history.handleRedo();
            return;
          }
          if (key === "r") {
            e.preventDefault();
            if (selectedIdx !== null) pageOps.handleRotate(selectedIdx);
            return;
          }
          if (key === "j") {
            e.preventDefault();
            marquee.makeLayer(e.shiftKey ? "cut" : "copy");
            return;
          }
          if (key === "g" && e.altKey) {
            e.preventDefault();
            if (selectedAnnId !== null) edits.handleClipSelection();
            return;
          }
          if (key === "g") {
            e.preventDefault();
            if (e.shiftKey) edits.handleUngroupSelection();
            else edits.handleGroupSelection();
            return;
          }
          if (key === "c") {
            if (selectedIdx !== null && selectedAnnId !== null) {
              const view = resolvePageText(pages[selectedIdx].annotations || []).find((a) => a.id === selectedAnnId);
              const ann = view && view.type === "text" ? standaloneCopy(view) : view;
              if (ann) {
                e.preventDefault();
                clipboardRef.current = JSON.parse(JSON.stringify(ann));
              }
            }
            return;
          }
          if (key === "v") {
            if (clipboardRef.current && selectedIdx !== null) {
              e.preventDefault();
              const clip = clipboardRef.current;
              const id = nextAnnIdRef.current++;
              const newAnn = { ...translatedAnnotation(clip, 20, 20), id, groupId: void 0 };
              edits.updateAnnotationsFor(selectedIdx, (anns) => [...anns, newAnn]);
              setSelectedAnnId(id);
            }
            return;
          }
          return;
        }
        if (key === "delete") {
          e.preventDefault();
          if (selection.tool === "marquee") return;
          if (selectedAnnId !== null) edits.handleDeleteAnnotation();
          else if (selectedIdx !== null) {
            if (selectedPageIndices.length > 0) pageOps.handleDeleteSelectedPages();
            else pageOps.handleDelete(selectedIdx);
          }
          return;
        }
        const nudge = { arrowleft: [-1, 0], arrowright: [1, 0], arrowup: [0, -1], arrowdown: [0, 1] }[key];
        if (nudge && selectedAnnId !== null) {
          e.preventDefault();
          const step = e.shiftKey ? 10 : 1;
          const ids = [selectedAnnId, ...selectedAnnIds];
          edits.handleMoveAnnotations((pages[selectedIdx].annotations || []).filter((a) => ids.includes(a.id)), nudge[0] * step, nudge[1] * step);
          return;
        }
        if (key === "v") {
          selectTool("select");
          return;
        }
        if (key === "t") {
          selectTool("text");
          return;
        }
        if (key === "i") {
          edits.handleImageToolClick();
          return;
        }
        if (key === "r") {
          selectTool("rect");
          return;
        }
        if (key === "e") {
          selectTool("ellipse");
          return;
        }
        if (key === "h") {
          selectTool("highlighter");
          return;
        }
        if (key === "m") {
          selectTool("marquee");
          return;
        }
        if (key === "u") {
          selectTool("measure");
          return;
        }
        if (key === "c") {
          const img = selectedIdx === null || selectedAnnIds.length > 0 ? null : (pages[selectedIdx].annotations || []).find((a) => a.id === selectedAnnId && a.type === "image");
          if (img && (selection.croppingAnnId === img.id || !angleOf(img))) selection.handleToggleCrop(img.id);
          return;
        }
        if (key === "d") {
          selectTool("pen");
          return;
        }
        if (key === "arrowup") {
          e.preventDefault();
          setSelectedPageIndices([]);
          setSelectedIdx((cur) => cur === null ? cur : Math.max(0, cur - 1));
          return;
        }
        if (key === "arrowdown") {
          e.preventDefault();
          setSelectedPageIndices([]);
          setSelectedIdx((cur) => cur === null ? cur : Math.min(pages.length - 1, cur + 1));
          return;
        }
      }
      function handlePaste(e) {
        const { doc, edits, modalOpen } = appRef.current;
        const tag = e.target && e.target.tagName || "";
        if (tag === "INPUT" || tag === "TEXTAREA" || e.target && e.target.isContentEditable) return;
        if (modalOpen || doc.selectedIdx === null) return;
        const items = e.clipboardData && e.clipboardData.items;
        if (!items) return;
        const imageItem = Array.from(items).find((item) => item.type && item.type.startsWith("image/"));
        if (!imageItem) return;
        e.preventDefault();
        edits.addImageAnnotationFromFile(imageItem.getAsFile(), doc.selectedIdx);
      }
      window.addEventListener("keydown", handleKeyDown);
      window.addEventListener("paste", handlePaste);
      return () => {
        window.removeEventListener("keydown", handleKeyDown);
        window.removeEventListener("paste", handlePaste);
      };
    }, []);
  }

  // apps/ZEditor/src/model/trace/contours.js
  var DX = [1, 0, -1, 0];
  var DY = [0, 1, 0, -1];
  var BIT = [1, 2, 4, 8];
  function traceMaskLoops(mask, width, height) {
    const gw = width + 1;
    const out = new Uint8Array(gw * (height + 1));
    const inside = (x, y) => x >= 0 && y >= 0 && x < width && y < height && mask[y * width + x] !== 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (!mask[y * width + x]) continue;
        if (!inside(x, y - 1)) out[y * gw + x] |= 1;
        if (!inside(x + 1, y)) out[y * gw + x + 1] |= 2;
        if (!inside(x, y + 1)) out[(y + 1) * gw + x + 1] |= 4;
        if (!inside(x - 1, y)) out[(y + 1) * gw + x] |= 8;
      }
    }
    const all = out.slice();
    const nextDir = (here, dir) => {
      const right = (dir + 1) % 4, left = (dir + 3) % 4;
      return here & BIT[right] ? right : here & BIT[dir] ? dir : here & BIT[left] ? left : -1;
    };
    const loops = [];
    for (let start = 0; start < out.length; start++) {
      while (out[start]) {
        const sx = start % gw, sy = (start - sx) / gw;
        const startDir = out[start] & 1 ? 0 : out[start] & 2 ? 1 : out[start] & 4 ? 2 : 3;
        let x = sx, y = sy, dir = startDir;
        const points = [];
        let prevDir = -1;
        for (let guard = 0; guard < all.length * 4; guard++) {
          out[y * gw + x] &= ~BIT[dir];
          if (dir !== prevDir) points.push(x, y);
          prevDir = dir;
          x += DX[dir];
          y += DY[dir];
          dir = nextDir(all[y * gw + x], dir);
          if (dir < 0 || x === sx && y === sy && dir === startDir) break;
        }
        if (prevDir === startDir) points.splice(0, 2);
        if (points.length >= 6) loops.push(points);
      }
    }
    return loops;
  }
  function loopArea(points) {
    let sum = 0;
    const n = points.length;
    for (let i = 0; i < n; i += 2) {
      const j = (i + 2) % n;
      sum += points[i] * points[j + 1] - points[j] * points[i + 1];
    }
    return sum / 2;
  }

  // apps/ZEditor/src/model/trace/curves.js
  function edgeMidpoints(corners) {
    const pts = [];
    const n = corners.length;
    for (let i = 0; i < n; i += 2) {
      const x0 = corners[i], y0 = corners[i + 1];
      const x1 = corners[(i + 2) % n], y1 = corners[(i + 3) % n];
      const len = Math.abs(x1 - x0) + Math.abs(y1 - y0);
      const sx = Math.sign(x1 - x0), sy = Math.sign(y1 - y0);
      for (let t = 0; t < len; t++) pts.push([x0 + sx * (t + 0.5), y0 + sy * (t + 0.5)]);
    }
    return pts;
  }
  function segmentDistance(p, a, b) {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const len2 = dx * dx + dy * dy;
    const t = len2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2)) : 0;
    return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
  }
  function simplifyOpen(pts, tolerance) {
    const keep = new Uint8Array(pts.length);
    keep[0] = keep[pts.length - 1] = 1;
    const stack = [[0, pts.length - 1]];
    while (stack.length) {
      const [a, b] = stack.pop();
      let worst = -1, worstD = tolerance;
      for (let i = a + 1; i < b; i++) {
        const d = segmentDistance(pts[i], pts[a], pts[b]);
        if (d > worstD) {
          worstD = d;
          worst = i;
        }
      }
      if (worst >= 0) {
        keep[worst] = 1;
        stack.push([a, worst], [worst, b]);
      }
    }
    return pts.filter((_, i) => keep[i]);
  }
  function simplifyClosed(pts, tolerance) {
    if (pts.length <= 4) return pts.slice();
    let far = 0, farD = -1;
    for (let i = 1; i < pts.length; i++) {
      const d = Math.hypot(pts[i][0] - pts[0][0], pts[i][1] - pts[0][1]);
      if (d > farD) {
        farD = d;
        far = i;
      }
    }
    const first = simplifyOpen(pts.slice(0, far + 1), tolerance);
    const second = simplifyOpen([...pts.slice(far), pts[0]], tolerance);
    const out = [...first, ...second.slice(1, -1)];
    return out.length >= 3 ? out : pts.slice();
  }
  function turnAngle(a, b, c) {
    const ux = b[0] - a[0], uy = b[1] - a[1], vx = c[0] - b[0], vy = c[1] - b[1];
    const lu = Math.hypot(ux, uy), lv = Math.hypot(vx, vy);
    if (!lu || !lv) return 0;
    const cos = Math.max(-1, Math.min(1, (ux * vx + uy * vy) / (lu * lv)));
    return Math.acos(cos) * 180 / Math.PI;
  }
  var num2 = (v) => String(Math.round(v * 10) / 10);
  function smoothPathD2(poly, cornerAngle, tolerance = 1) {
    const n = poly.length;
    if (n < 3) return "";
    const at = (p, q, len) => {
      const l = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1;
      return [p[0] + (q[0] - p[0]) * len / l, p[1] + (q[1] - p[1]) * len / l];
    };
    const joins = poly.map((p, i) => {
      const prev = poly[(i + n - 1) % n], next = poly[(i + 1) % n];
      const bend = turnAngle(prev, p, next);
      if (bend > cornerAngle || bend === 0) return { corner: true, a: p, b: p };
      const reach = 2 * tolerance / Math.tan(bend * Math.PI / 180 / 4);
      const arm = (q) => Math.min(Math.hypot(q[0] - p[0], q[1] - p[1]) / 2, reach);
      return { corner: false, a: at(p, prev, arm(prev)), b: at(p, next, arm(next)) };
    });
    const xy = (q) => num2(q[0]) + " " + num2(q[1]);
    let d = "M" + xy(joins[n - 1].b);
    for (let i = 0; i < n; i++) {
      const j = joins[i];
      d += "L" + xy(j.a);
      if (!j.corner) d += "Q" + xy(poly[i]) + " " + xy(j.b);
    }
    return d + "Z";
  }

  // apps/ZEditor/src/model/trace/quantize.js
  function quantizePixels(pixels, settings) {
    const { width, height, data } = pixels;
    const count = width * height;
    const labels = new Int16Array(count).fill(-1);
    const opaque = (i) => data[i * 4 + 3] >= 128;
    const lum = (i) => 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
    let palette;
    if (settings.mode === "bw") {
      palette = [[0, 0, 0], [255, 255, 255]];
      for (let i = 0; i < count; i++) if (opaque(i)) labels[i] = lum(i) < settings.threshold ? 0 : 1;
    } else {
      const gray = settings.mode === "gray";
      const colorOf = gray ? (i) => {
        const l = lum(i);
        return [l, l, l];
      } : (i) => [data[i * 4], data[i * 4 + 1], data[i * 4 + 2]];
      const centers = kMeans(samplePixels(count, opaque, colorOf), settings.colors);
      palette = centers.map((c) => c.map((x) => Math.round(x)));
      for (let i = 0; i < count; i++) if (opaque(i)) labels[i] = nearest(palette, colorOf(i));
    }
    if (settings.ignoreWhite === "drop") {
      const white = palette.map(([r, g, b]) => r > 225 && g > 225 && b > 225);
      for (let i = 0; i < count; i++) if (labels[i] >= 0 && white[labels[i]]) labels[i] = -1;
    }
    return sortedByUse(labels, palette);
  }
  function samplePixels(count, opaque, colorOf) {
    const step = Math.max(1, Math.floor(count / 2e4));
    const samples = [];
    for (let i = 0; i < count; i += step) if (opaque(i)) samples.push(colorOf(i));
    return samples;
  }
  var dist2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
  function nearest(centers, c) {
    let best = 0, bestD = Infinity;
    for (let k = 0; k < centers.length; k++) {
      const d = dist2(centers[k], c);
      if (d < bestD) {
        bestD = d;
        best = k;
      }
    }
    return best;
  }
  function kMeans(samples, k) {
    if (!samples.length) return [[0, 0, 0]];
    const byLum = samples.slice().sort((a, b) => a[0] + a[1] + a[2] - (b[0] + b[1] + b[2]));
    const n = Math.min(k, samples.length);
    let centers = Array.from({ length: n }, (_, j) => byLum[Math.floor((j + 0.5) / n * byLum.length)].slice());
    for (let iter = 0; iter < 12; iter++) {
      const sums = centers.map(() => [0, 0, 0, 0]);
      let far = null, farD = -1;
      for (const s of samples) {
        const k2 = nearest(centers, s);
        const d = dist2(centers[k2], s);
        if (d > farD) {
          farD = d;
          far = s;
        }
        const sum = sums[k2];
        sum[0] += s[0];
        sum[1] += s[1];
        sum[2] += s[2];
        sum[3]++;
      }
      let moved = 0;
      centers = centers.map((c, j) => {
        const [r, g, b, m] = sums[j];
        const next = m ? [r / m, g / m, b / m] : far.slice();
        moved = Math.max(moved, dist2(c, next));
        return next;
      });
      if (moved < 0.25) break;
    }
    return centers;
  }
  function sortedByUse(labels, palette) {
    const keyOf = (c) => c.join(",");
    const merged = /* @__PURE__ */ new Map();
    const remap = palette.map((c, i) => {
      const key = keyOf(c);
      if (!merged.has(key)) merged.set(key, i);
      return merged.get(key);
    });
    const uses = new Array(palette.length).fill(0);
    for (let i = 0; i < labels.length; i++) if (labels[i] >= 0) uses[remap[labels[i]]]++;
    const order = palette.map((_, i) => i).filter((i) => uses[i] > 0).sort((a, b) => uses[b] - uses[a] || a - b);
    const rank = new Int16Array(palette.length).fill(-1);
    order.forEach((i, r) => {
      rank[i] = r;
    });
    const out = new Int16Array(labels.length);
    for (let i = 0; i < labels.length; i++) out[i] = labels[i] >= 0 ? rank[remap[labels[i]]] : -1;
    return { labels: out, palette: order.map((i) => palette[i]) };
  }

  // apps/ZEditor/src/model/trace/traceImage.js
  var hex = (c) => "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("");
  function traceImage(pixels, settings) {
    const s = normalizeTraceSettings(settings);
    const { width, height } = pixels;
    const { tolerance, cornerAngle, minArea } = tracerParams(s, Math.max(width, height));
    const { labels, palette } = quantizePixels(pixels, s);
    const mask = new Uint8Array(width * height);
    const paths = [];
    for (let rank = 0; rank < palette.length; rank++) {
      for (let i = 0; i < mask.length; i++) mask[i] = s.method === "abut" ? labels[i] === rank : labels[i] >= rank;
      let d = "";
      for (const loop of traceMaskLoops(mask, width, height)) {
        if (Math.abs(loopArea(loop)) < Math.max(1, minArea)) continue;
        d += smoothPathD2(simplifyClosed(edgeMidpoints(loop), tolerance), cornerAngle, tolerance);
      }
      if (d) paths.push({ color: hex(palette[rank]), d });
    }
    return { width, height, paths };
  }

  // apps/ZEditor/src/render/traceSource.js
  async function traceSourceFromImage(ann, pageFilter) {
    const natural = Math.max(ann.cropW || ann.naturalWidth || ann.width, ann.cropH || ann.naturalHeight || ann.height);
    const long = Math.min(TRACE_MAX_SIDE, natural);
    const scale = long / Math.max(ann.width, ann.height);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(ann.width * scale));
    canvas.height = Math.max(1, Math.round(ann.height * scale));
    const plain = {
      ...ann,
      x: 0,
      y: 0,
      angle: void 0,
      opacity: void 0,
      blend: void 0,
      ...Object.fromEntries(IMAGE_EFFECTS.map((effect) => [effect.key, void 0]))
    };
    await drawImageOnCanvas(canvas.getContext("2d"), plain, scale, pageFilter);
    return canvas.toDataURL("image/png");
  }
  var pixelCache = /* @__PURE__ */ new Map();
  async function pixelsOf(src) {
    if (pixelCache.has(src)) return pixelCache.get(src);
    const img = await loadImageElement(src);
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
    pixelCache.set(src, pixels);
    if (pixelCache.size > 3) pixelCache.delete(pixelCache.keys().next().value);
    return pixels;
  }
  async function runTrace(src, settings) {
    const result = traceImage(await pixelsOf(src), settings);
    return { traceW: result.width, traceH: result.height, paths: result.paths };
  }

  // apps/ZEditor/src/state/useImageTrace.js
  var { useState: useState6, useRef: useRef6 } = React;
  var RETRACE_DELAY_MS = 120;
  function useImageTrace({ doc, selection, edits }) {
    const [busyId, setBusyId] = useState6(null);
    const [error, setError] = useState6(null);
    const timerRef = useRef6(null);
    const tokenRef = useRef6(0);
    async function trace(image, preset) {
      const pageIdx = doc.selectedIdx;
      if (pageIdx === null || !image) return;
      const id = doc.nextAnnIdRef.current++;
      setBusyId(image.id);
      setError(null);
      try {
        const settings = presetSettings(preset);
        const source = await traceSourceFromImage(image, doc.pageFilter);
        const result = await runTrace(source, settings);
        const layer = newTraceLayer(id, image, source, settings, result);
        edits.updateAnnotationsFor(pageIdx, (anns) => anns.flatMap((a) => a.id === image.id ? [{ ...a, hidden: true }, { ...layer, groupId: a.groupId }] : [a]));
        selection.setSelectedAnnIds([]);
        selection.setSelectedAnnId(id);
      } catch (err) {
        setError("Couldn't vectorize this image: " + (err && err.message ? err.message : err));
      } finally {
        setBusyId(null);
      }
    }
    function change(ann, patch) {
      const settings = patchedTraceSettings(ann.trace, patch, presetSettings);
      edits.handleUpdateAnnotation(ann.id, { trace: settings });
      const needsTrace = ann.traceSource && Object.keys(patch).some((k) => !TRACE_DRAW_PROPS.includes(k));
      if (!needsTrace) return;
      const token = ++tokenRef.current;
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(async () => {
        setBusyId(ann.id);
        try {
          const result = await runTrace(ann.traceSource, settings);
          if (token === tokenRef.current) edits.handleUpdateAnnotation(ann.id, result);
        } catch (err) {
          setError("Couldn't vectorize this image: " + (err && err.message ? err.message : err));
        } finally {
          if (token === tokenRef.current) setBusyId(null);
        }
      }, RETRACE_DELAY_MS);
    }
    function recolor(ann, color, value) {
      if (color == null) {
        edits.handleUpdateAnnotation(ann.id, { recolor: void 0 });
        return;
      }
      const next = { ...ann.recolor || {} };
      if (value == null) delete next[color];
      else next[color] = value;
      edits.handleUpdateAnnotation(ann.id, { recolor: Object.keys(next).length ? next : void 0 });
    }
    function expand(ann) {
      const pageIdx = doc.selectedIdx;
      if (pageIdx === null) return;
      tokenRef.current++;
      clearTimeout(timerRef.current);
      edits.updateAnnotationsFor(pageIdx, (anns) => anns.map((a) => a.id === ann.id ? { ...a, ...expandedTracePatch(a) } : a));
    }
    async function rasterize(ann) {
      const pageIdx = doc.selectedIdx;
      tokenRef.current++;
      clearTimeout(timerRef.current);
      const patch = await rasterizedTracePatch(ann);
      if (patch && pageIdx !== null) edits.updateAnnotationsFor(pageIdx, (anns) => anns.map((a) => a.id === ann.id ? { ...a, ...patch } : a));
    }
    return { busyId, error, trace, change, recolor, expand, rasterize };
  }

  // apps/ZEditor/src/render/magicErase.js
  var COLOR_SCALE = 1.5;
  function magicMatchKey(s) {
    if (s.clickMode === "refine") return "refine";
    return [s.tolerance, s.colorTolerance, s.smoothing, s.contiguous, s.diagonal, s.softness].join("|");
  }
  function magicMatch(imageData, x, y, settings) {
    const { data, width, height } = imageData;
    if (settings.clickMode === "refine") {
      const cov2 = new Float32Array(width * height);
      let any = false;
      for (let i = 0; i < cov2.length; i++) if (data[i * 4 + 3] === 0) {
        cov2[i] = 1;
        any = true;
      }
      return any ? cov2 : null;
    }
    const px = Math.floor(x), py = Math.floor(y);
    if (px < 0 || py < 0 || px >= width || py >= height) return null;
    const start = py * width + px;
    if (data[start * 4 + 3] === 0) return null;
    const cov = matchCoverage(data, width, height, start, settings);
    for (let i = 0; i < width * height; i++) if (data[i * 4 + 3] === 0) cov[i] = 1;
    return cov;
  }
  function magicFinish(imageData, cov, x, y, settings) {
    const { data, width, height } = imageData;
    const start = settings.clickMode === "refine" ? -1 : Math.floor(y) * width + Math.floor(x);
    const N = width * height;
    const clearIslands = !settings.contiguous && settings.clickMode !== "refine";
    if (settings.specks > 0) removeSpecks(cov, width, height, settings.specks, clearIslands, start);
    if (settings.edgeShift) shiftEdge(cov, width, height, settings.edgeShift);
    if (settings.feather > 0) featherEdge(cov, width, height, settings.feather);
    if (settings.defringe > 0) defringeEdge(data, cov, width, height, settings.defringe / 100);
    const strength = Math.min(1, Math.max(0, settings.opacity / 100));
    let changed = 0;
    for (let i = 0; i < N; i++) {
      const c = cov[i];
      if (c <= 0) continue;
      const o = i * 4 + 3, a = data[o];
      const next = Math.round(a * (1 - Math.min(1, c) * strength));
      if (next !== a) {
        data[o] = next;
        changed++;
      }
    }
    return changed;
  }
  function matchCoverage(data, width, height, start, settings) {
    const { tolerance, colorTolerance, smoothing, contiguous, diagonal, softness } = settings;
    const radius = Math.max(0, Math.round(smoothing));
    const colorLimit = colorTolerance * COLOR_SCALE;
    const fade = Math.max(0, softness) / 100;
    const reach = 1 + fade;
    const N = width * height;
    const mean = [0, 0, 0];
    const smooth = (i) => {
      const cx = i % width, cy = (i - cx) / width;
      const x0 = Math.max(0, cx - radius), x1 = Math.min(width - 1, cx + radius);
      const y0 = Math.max(0, cy - radius), y1 = Math.min(height - 1, cy + radius);
      let r = 0, g = 0, b = 0, w = 0;
      for (let yy = y0; yy <= y1; yy++) {
        for (let xx = x0; xx <= x1; xx++) {
          const o = (yy * width + xx) * 4, a = data[o + 3];
          if (a === 0) continue;
          r += data[o] * a;
          g += data[o + 1] * a;
          b += data[o + 2] * a;
          w += a;
        }
      }
      mean[0] = r / w;
      mean[1] = g / w;
      mean[2] = b / w;
    };
    smooth(start);
    const r0 = mean[0], g0 = mean[1], b0 = mean[2];
    const ratio = (diff, limit) => limit > 0 ? diff / limit : diff > 0 ? Infinity : 0;
    const score = (i) => {
      if (data[i * 4 + 3] === 0) return 0;
      smooth(i);
      const dr = mean[0] - r0, dg = mean[1] - g0, db = mean[2] - b0;
      const dLuma = (dr + dg + db) / 3;
      const dChroma = Math.hypot(dr - dLuma, dg - dLuma, db - dLuma);
      const d = Math.max(ratio(Math.abs(dLuma), tolerance), ratio(dChroma, colorLimit));
      if (d <= 1) return 1;
      if (d >= reach) return 0;
      return (reach - d) / fade;
    };
    const cov = new Float32Array(N);
    if (!contiguous) {
      for (let i = 0; i < N; i++) cov[i] = score(i);
      return cov;
    }
    const seen = new Uint8Array(N);
    const stack = [start];
    seen[start] = 1;
    const push = (j) => {
      if (!seen[j]) {
        seen[j] = 1;
        stack.push(j);
      }
    };
    while (stack.length) {
      const i = stack.pop();
      const s = score(i);
      if (s <= 0) continue;
      cov[i] = s;
      const cx = i % width, cy = (i - cx) / width;
      const left = cx > 0, right = cx < width - 1, up = cy > 0, down = cy < height - 1;
      if (left) push(i - 1);
      if (right) push(i + 1);
      if (up) push(i - width);
      if (down) push(i + width);
      if (diagonal) {
        if (left && up) push(i - width - 1);
        if (right && up) push(i - width + 1);
        if (left && down) push(i + width - 1);
        if (right && down) push(i + width + 1);
      }
    }
    return cov;
  }
  function removeSpecks(cov, width, height, maxSize, clearIslands, protect) {
    const N = width * height;
    const seen = new Uint8Array(N);
    const stack = [], members = [];
    for (let s = 0; s < N; s++) {
      if (seen[s]) continue;
      const erasedPatch = cov[s] >= 0.5;
      seen[s] = 1;
      stack.push(s);
      members.length = 0;
      let size = 0, hasProtect = false;
      while (stack.length) {
        const i = stack.pop();
        size++;
        if (size <= maxSize) members.push(i);
        if (i === protect) hasProtect = true;
        const cx = i % width, cy = (i - cx) / width;
        const visit = (j) => {
          if (!seen[j] && cov[j] >= 0.5 === erasedPatch) {
            seen[j] = 1;
            stack.push(j);
          }
        };
        if (cx > 0) visit(i - 1);
        if (cx < width - 1) visit(i + 1);
        if (cy > 0) visit(i - width);
        if (cy < height - 1) visit(i + width);
      }
      if (size > maxSize) continue;
      if (!erasedPatch) for (const i of members) cov[i] = 1;
      else if (clearIslands && !hasProtect) for (const i of members) cov[i] = 0;
    }
  }
  function shiftEdge(cov, width, height, shift) {
    const grow = shift > 0;
    const steps = Math.abs(shift);
    let src = cov, dst = new Float32Array(cov.length);
    for (let k = 0; k < steps; k++) {
      const diag = k % 2 === 1;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const i = y * width + x;
          let v = src[i];
          const take = (j) => {
            const n = src[j];
            if (grow ? n > v : n < v) v = n;
          };
          if (x > 0) take(i - 1);
          if (x < width - 1) take(i + 1);
          if (y > 0) take(i - width);
          if (y < height - 1) take(i + width);
          if (diag) {
            if (x > 0 && y > 0) take(i - width - 1);
            if (x < width - 1 && y > 0) take(i - width + 1);
            if (x > 0 && y < height - 1) take(i + width - 1);
            if (x < width - 1 && y < height - 1) take(i + width + 1);
          }
          dst[i] = v;
        }
      }
      [src, dst] = [dst, src];
    }
    if (src !== cov) cov.set(src);
  }
  function featherEdge(cov, width, height, feather) {
    const radius = Math.max(1, Math.round(feather / 2));
    const tmp = new Float32Array(cov.length);
    for (let pass = 0; pass < 2; pass++) {
      boxBlurRows(cov, tmp, width, height, radius);
      boxBlurColumns(tmp, cov, width, height, radius);
    }
  }
  function boxBlurRows(src, dst, width, height, r) {
    const n = 2 * r + 1;
    for (let y = 0; y < height; y++) {
      const row = y * width;
      let sum = 0;
      for (let k = -r; k <= r; k++) sum += src[row + Math.min(width - 1, Math.max(0, k))];
      for (let x = 0; x < width; x++) {
        dst[row + x] = sum / n;
        sum += src[row + Math.min(width - 1, x + r + 1)] - src[row + Math.max(0, x - r)];
      }
    }
  }
  function boxBlurColumns(src, dst, width, height, r) {
    const n = 2 * r + 1;
    for (let x = 0; x < width; x++) {
      let sum = 0;
      for (let k = -r; k <= r; k++) sum += src[Math.min(height - 1, Math.max(0, k)) * width + x];
      for (let y = 0; y < height; y++) {
        dst[y * width + x] = sum / n;
        sum += src[Math.min(height - 1, y + r + 1) * width + x] - src[Math.max(0, y - r) * width + x];
      }
    }
  }
  function defringeEdge(data, cov, width, height, strength) {
    const R = 3;
    for (let i = 0; i < cov.length; i++) {
      const c = cov[i];
      if (c <= 0.02 || c >= 0.98 || data[i * 4 + 3] === 0) continue;
      const cx = i % width, cy = (i - cx) / width;
      const x0 = Math.max(0, cx - R), x1 = Math.min(width - 1, cx + R);
      const y0 = Math.max(0, cy - R), y1 = Math.min(height - 1, cy + R);
      let r = 0, g = 0, b = 0, n = 0;
      for (let yy = y0; yy <= y1; yy++) {
        for (let xx = x0; xx <= x1; xx++) {
          const j = yy * width + xx;
          if (cov[j] > 0.02 || data[j * 4 + 3] === 0) continue;
          r += data[j * 4];
          g += data[j * 4 + 1];
          b += data[j * 4 + 2];
          n++;
        }
      }
      if (n === 0) continue;
      const k = strength * Math.sqrt(c), o = i * 4;
      data[o] += (r / n - data[o]) * k;
      data[o + 1] += (g / n - data[o + 1]) * k;
      data[o + 2] += (b / n - data[o + 2]) * k;
    }
  }

  // apps/ZEditor/src/state/useMagicErase.js
  var { useState: useState7, useRef: useRef7, useEffect: useEffect3 } = React;
  var RECOMPUTE_DELAY_MS = 60;
  var NO_EDGE_REFINING = { feather: 0, edgeShift: 0, specks: 0, defringe: 0 };
  function useMagicErase({ doc, selection, edits, toolDefaults }) {
    const [active, setActive] = useState7(false);
    const [preview, setPreview] = useState7(null);
    const [notice, setNotice] = useState7(null);
    const noticeTimerRef = useRef7(null);
    const sessionRef = useRef7(null);
    const loadTokenRef = useRef7(0);
    const settings = toolDefaults.magicEraser;
    const latest = useRef7(null);
    latest.current = { settings, edits, doc };
    function compute(s) {
      const st = { ...latest.current.settings, clickMode: s.mode };
      if (s.mode === "match") Object.assign(st, NO_EDGE_REFINING);
      const key = magicMatchKey(st);
      const base = { data: s.base, width: s.width, height: s.height };
      if (!s.cache || s.cache.key !== key) {
        s.cache = { key, cov: magicMatch(base, s.seed ? s.seed.x : null, s.seed ? s.seed.y : null, st) };
      }
      const work = { data: new Uint8ClampedArray(s.base), width: s.width, height: s.height };
      s.changed = s.cache.cov ? magicFinish(work, s.cache.cov.slice(), s.seed ? s.seed.x : null, s.seed ? s.seed.y : null, st) : 0;
      s.result = work;
      s.computedFor = latest.current.settings;
      s.ctx.putImageData(new ImageData(work.data, s.width, s.height), 0, 0);
    }
    function paint(s) {
      const version2 = ++s.version;
      s.canvas.toBlob((blob) => {
        if (!blob || sessionRef.current !== s || version2 !== s.version) return;
        const url = URL.createObjectURL(blob);
        if (s.url) URL.revokeObjectURL(s.url);
        s.url = url;
        setPreview({ annId: s.annId, src: url });
      }, "image/png");
    }
    function schedule(s) {
      if (s.timer) clearTimeout(s.timer);
      s.timer = setTimeout(() => {
        s.timer = null;
        if (sessionRef.current !== s) return;
        compute(s);
        paint(s);
      }, RECOMPUTE_DELAY_MS);
    }
    function endSession(s) {
      if (s.timer) clearTimeout(s.timer);
      if (s.url) URL.revokeObjectURL(s.url);
      if (sessionRef.current === s) sessionRef.current = null;
      setPreview(null);
      setActive(false);
    }
    function settle(s) {
      if (s.timer) {
        clearTimeout(s.timer);
        s.timer = null;
      }
      if (s.computedFor !== latest.current.settings) compute(s);
    }
    function commit() {
      const s = sessionRef.current;
      if (!s) return false;
      settle(s);
      if (s.changed > 0) latest.current.edits.handleEraseImagePixels(s.annId, s.canvas.toDataURL("image/png"), s.pageIdx);
      endSession(s);
      return true;
    }
    function cancel() {
      const s = sessionRef.current;
      if (!s) return false;
      endSession(s);
      return true;
    }
    async function start(ann, hit, quiet) {
      const token = ++loadTokenRef.current;
      const mode = latest.current.settings.clickMode;
      const pageIdx = latest.current.doc.selectedIdx;
      const prev = sessionRef.current;
      let base = null, width = 0, height = 0;
      if (prev && prev.annId === ann.id) {
        settle(prev);
        base = new Uint8ClampedArray(prev.result.data);
        width = prev.width;
        height = prev.height;
      }
      if (prev) commit();
      if (!base) {
        const source = await loadImageElement(ann.src);
        if (token !== loadTokenRef.current) return false;
        const canvas2 = document.createElement("canvas");
        canvas2.width = width = ann.naturalWidth;
        canvas2.height = height = ann.naturalHeight;
        const ctx = canvas2.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(source, 0, 0, width, height);
        base = ctx.getImageData(0, 0, width, height).data;
      }
      let seed = null;
      if (mode === "match") {
        seed = { x: Math.min(width - 1, Math.max(0, hit.x)), y: Math.min(height - 1, Math.max(0, hit.y)) };
        if (base[(Math.floor(seed.y) * width + Math.floor(seed.x)) * 4 + 3] === 0) return false;
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const s = {
        annId: ann.id,
        pageIdx,
        mode,
        seed,
        base,
        width,
        height,
        canvas,
        ctx: canvas.getContext("2d"),
        cache: null,
        result: null,
        computedFor: null,
        changed: 0,
        timer: null,
        url: null,
        version: 0
      };
      sessionRef.current = s;
      setActive(true);
      compute(s);
      if (mode === "refine" && !s.cache.cov) {
        endSession(s);
        if (!quiet) showNotice("That image has no transparent areas to refine. Erase a background first.");
        return false;
      }
      setNotice(null);
      paint(s);
      return true;
    }
    async function startRefine() {
      if (latest.current.settings.clickMode !== "refine") return;
      const page = latest.current.doc.selectedPage;
      const images = (page && page.annotations || []).filter((a) => a.type === "image" && !a.hidden && !a.locked).reverse();
      if (images.length === 0) {
        showNotice("There's no image on this page to refine.");
        return;
      }
      for (const ann of images) {
        if (await start(ann, null, true)) return;
      }
      showNotice("No image on this page has transparent areas to refine. Erase a background first.");
    }
    function showNotice(text) {
      setNotice(text);
      clearTimeout(noticeTimerRef.current);
      noticeTimerRef.current = setTimeout(() => setNotice(null), 6e3);
    }
    useEffect3(() => {
      const s = sessionRef.current;
      if (!s) return;
      if (selection.tool !== "eraser" || toolDefaults.eraserMode !== "magic" || doc.selectedIdx !== s.pageIdx || settings.clickMode !== s.mode) {
        commit();
        return;
      }
      schedule(s);
    }, [selection.tool, toolDefaults.eraserMode, doc.selectedIdx, settings]);
    useEffect3(() => {
      function handleKeyDown(e) {
        if (!sessionRef.current) return;
        const target = e.target || {};
        if (e.key === "Escape") {
          e.preventDefault();
          cancel();
        } else if (e.key === "Enter" && target.tagName !== "BUTTON" && target.type !== "number") {
          e.preventDefault();
          commit();
        }
      }
      function handlePointerDown(e) {
        if (!sessionRef.current) return;
        const t = e.target;
        if (t && t.closest && t.closest(".ze-format-panel, .preview-pane")) return;
        commit();
      }
      window.addEventListener("keydown", handleKeyDown);
      window.addEventListener("pointerdown", handlePointerDown, true);
      return () => {
        window.removeEventListener("keydown", handleKeyDown);
        window.removeEventListener("pointerdown", handlePointerDown, true);
      };
    }, []);
    return { active, preview, notice, start, startRefine, commit, cancel };
  }

  // apps/ZEditor/src/model/marquee.js
  var MARQUEE_DEFAULTS = {
    action: "copy",
    shape: "rect",
    source: "visible",
    includePaper: false,
    cutLeaves: "transparent",
    fillColor: "#ffffff"
  };
  var MARQUEE_MIN_SIZE = 4;
  var MIN_POLYGON_POINTS = 3;
  var POLYGON_CLOSE_PX = 10;
  var POLYGON_REPEAT_PX = 4;
  function rectMarquee(box, angle = 0) {
    return { kind: "rect", x: box.x, y: box.y, width: box.width, height: box.height, angle };
  }
  function regionPolygon(m) {
    if (m.kind === "polygon") return m.points.map(([x, y]) => [x, y]);
    const cx = m.x + m.width / 2, cy = m.y + m.height / 2;
    return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => {
      const [dx, dy] = rotatePoint(sx * m.width / 2, sy * m.height / 2, m.angle || 0);
      return [cx + dx, cy + dy];
    });
  }
  function pointsBounds(points) {
    const xs = points.map((p) => p[0]), ys = points.map((p) => p[1]);
    const x = Math.min(...xs), y = Math.min(...ys);
    return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
  }
  function isUsableMarquee(m) {
    if (!m) return false;
    if (m.kind === "polygon") return Boolean(m.closed) && m.points.length >= MIN_POLYGON_POINTS;
    return m.width >= MARQUEE_MIN_SIZE && m.height >= MARQUEE_MIN_SIZE;
  }
  function translatedMarquee(m, dx, dy) {
    if (m.kind === "polygon") return { ...m, points: m.points.map(([x, y]) => [x + dx, y + dy]) };
    return { ...m, x: m.x + dx, y: m.y + dy };
  }
  function rotatedMarquee(m, degrees, cx, cy) {
    if (m.kind === "polygon") {
      return { ...m, points: m.points.map(([x, y]) => {
        const [dx2, dy2] = rotatePoint(x - cx, y - cy, degrees);
        return [cx + dx2, cy + dy2];
      }) };
    }
    const [dx, dy] = rotatePoint(m.x + m.width / 2 - cx, m.y + m.height / 2 - cy, degrees);
    return { ...m, x: cx + dx - m.width / 2, y: cy + dy - m.height / 2, angle: (((m.angle || 0) + degrees) % 360 + 360) % 360 };
  }
  function startPolygon(point) {
    return { kind: "polygon", points: [[point.x, point.y]], closed: false };
  }
  function polygonWithPoint(m, point) {
    return { ...m, points: [...m.points, [point.x, point.y]] };
  }
  function polygonPressAction(m, point, pxPerUnit) {
    const near = ([x, y], px) => Math.hypot(point.x - x, point.y - y) * pxPerUnit <= px;
    const enough = m.points.length >= MIN_POLYGON_POINTS;
    if (enough && (near(m.points[0], POLYGON_CLOSE_PX) || near(m.points[m.points.length - 1], POLYGON_REPEAT_PX))) return "close";
    if (near(m.points[m.points.length - 1], POLYGON_REPEAT_PX)) return "ignore";
    return "add";
  }
  function marqueeCenter(m) {
    if (m.kind === "polygon") {
      const b = pointsBounds(m.points);
      return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
    }
    return { x: m.x + m.width / 2, y: m.y + m.height / 2 };
  }
  function applyMarqueeResult(annotations, result, newId, coverId) {
    const hasSource = result.sourceId !== null && result.sourceId !== void 0;
    const list = annotations.map((a) => hasSource && result.sourcePatch && a.id === result.sourceId ? { ...a, ...result.sourcePatch } : a);
    const at = hasSource ? list.findIndex((a) => a.id === result.sourceId) + 1 || list.length : list.length;
    const added = [];
    if (result.cover) added.push({ ...result.cover, id: coverId });
    added.push({ ...result.layer, id: newId });
    list.splice(at, 0, ...added);
    return list;
  }

  // apps/ZEditor/src/render/softErase.js
  function imagePixelAt(ann, px, py) {
    const cx = ann.x + ann.width / 2, cy = ann.y + ann.height / 2;
    const [lx, ly] = rotatePoint(px - cx, py - cy, -angleOf(ann));
    const u = lx + ann.width / 2, v = ly + ann.height / 2;
    const cropX = ann.cropX || 0, cropY = ann.cropY || 0;
    const cropW = ann.cropW || ann.naturalWidth, cropH = ann.cropH || ann.naturalHeight;
    return {
      inside: u >= 0 && v >= 0 && u <= ann.width && v <= ann.height,
      x: cropX + u * cropW / ann.width,
      y: cropY + v * cropH / ann.height,
      // Natural px per page px, so the brush keeps its on-page size.
      scaleX: cropW / ann.width,
      scaleY: cropH / ann.height
    };
  }
  function stampSoftErase(ctx, x, y, radiusX, radiusY, softness, alpha) {
    const inner = Math.min(0.99, Math.max(0, 1 - softness / 100));
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    ctx.translate(x, y);
    ctx.scale(radiusX, radiusY);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    g.addColorStop(0, `rgba(0,0,0,${alpha})`);
    g.addColorStop(inner, `rgba(0,0,0,${alpha})`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // apps/ZEditor/src/render/marqueeLayer.js
  var LAYER_NAMES = { copy: "Layer via Copy", cut: "Layer via Cut" };
  var COVER_NAME = "Cut fill";
  async function buildMarqueeLayer({ page, pdfDocsRef, pageFilter, marquee, settings, mode, targetId }) {
    const annotations = page.annotations || [];
    const fromLayer = settings.source === "layer";
    const target = fromLayer ? annotations.find((a) => a.id === targetId) : null;
    if (fromLayer && (!target || target.hidden)) return { notice: "Select a visible layer first (Move tool or Layers panel, then M), or choose All visible." };
    if (target && target.locked) return { notice: "That layer is locked." };
    if (mode === "cut" && target && target.type === "stroke") return { notice: "A pen or highlighter stroke can't be cut in part. Use Layer via Copy." };
    if (mode === "cut" && target && target.type === "text" && isThreaded(annotations, target.id)) return { notice: "Text in a linked chain can't be cut in part. Use Layer via Copy." };
    const picture = fromLayer ? await drawLayerAlone(page, pdfDocsRef, pageFilter, target) : await renderPageToCanvas(page, pdfDocsRef, EXPORT_SCALE, pageFilter, null, !settings.includePaper);
    const scale = EXPORT_SCALE / MAIN_SCALE;
    const layer = layerFromRegion(picture, marquee, scale, LAYER_NAMES[mode]);
    if (!layer) return { notice: "Nothing is visible inside the marquee." };
    const result = { layer, cover: null, sourceId: target ? target.id : null, sourcePatch: null, notice: null };
    if (mode !== "cut") return result;
    if (fromLayer) {
      let base = target;
      let rasterized = null;
      if (target.type !== "image") {
        const view = resolvePageText(annotations).find((a) => a.id === target.id);
        rasterized = target.type === "text" ? await rasterizedTextPatch(view) : target.type === "trace" ? await rasterizedTracePatch(target) : await rasterizedRectPatch(target);
        if (!rasterized) return { notice: "Nothing is visible on that layer to cut." };
        base = { ...target, ...rasterized };
      }
      result.sourcePatch = { ...rasterized || {}, src: await cutFromImage(base, regionPolygon(marquee), settings) };
      if (rasterized) result.notice = "The layer was turned into an image so part of it could be cut.";
    } else {
      result.cover = await coverForRegion(marquee, settings.fillColor, scale);
    }
    return result;
  }
  async function drawLayerAlone(page, pdfDocsRef, pageFilter, target) {
    const size = await getPageDisplaySize(page, pdfDocsRef, EXPORT_SCALE);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(size.width);
    canvas.height = Math.round(size.height);
    const items = resolvePageText(page.annotations || []);
    const index = items.findIndex((a) => a.id === target.id);
    if (index >= 0) await drawPageItem(canvas.getContext("2d"), items, index, EXPORT_SCALE / MAIN_SCALE, pageFilter);
    return canvas;
  }
  function layerFromRegion(picture, marquee, scale, name) {
    const isRect = marquee.kind === "rect";
    const angle = isRect ? marquee.angle || 0 : 0;
    const polygon = regionPolygon(marquee);
    const frame = isRect ? { x: marquee.x, y: marquee.y, width: marquee.width, height: marquee.height } : pointsBounds(polygon);
    const width = Math.max(1, Math.round(frame.width * scale));
    const height = Math.max(1, Math.round(frame.height * scale));
    let centerX = frame.x + frame.width / 2, centerY = frame.y + frame.height / 2;
    const out = document.createElement("canvas");
    out.width = width;
    out.height = height;
    const ctx = out.getContext("2d");
    if (angle === 0) {
      const shiftX = Math.round(centerX * scale - width / 2), shiftY = Math.round(centerY * scale - height / 2);
      ctx.translate(-shiftX, -shiftY);
      centerX = (shiftX + width / 2) / scale;
      centerY = (shiftY + height / 2) / scale;
    } else {
      ctx.translate(width / 2, height / 2);
      ctx.rotate(-angle * Math.PI / 180);
      ctx.translate(-centerX * scale, -centerY * scale);
    }
    if (!isRect) {
      ctx.beginPath();
      polygon.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x * scale, y * scale) : ctx.lineTo(x * scale, y * scale));
      ctx.closePath();
      ctx.clip();
    }
    ctx.drawImage(picture, 0, 0);
    const trimmed = trimmedImageFromCanvas(out);
    if (!trimmed) return null;
    const [offsetX, offsetY] = rotatePoint((trimmed.left + trimmed.width / 2 - width / 2) / scale, (trimmed.top + trimmed.height / 2 - height / 2) / scale, angle);
    const itemWidth = trimmed.width / scale, itemHeight = trimmed.height / scale;
    return {
      type: "image",
      name,
      src: trimmed.src,
      x: centerX + offsetX - itemWidth / 2,
      y: centerY + offsetY - itemHeight / 2,
      width: itemWidth,
      height: itemHeight,
      angle: angle || void 0,
      naturalWidth: trimmed.width,
      naturalHeight: trimmed.height,
      filter: { type: "none" }
      // the page's filter is already in these pixels
    };
  }
  async function cutFromImage(image, polygon, settings) {
    const source = await loadImageElement(image.src);
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth || source.naturalWidth;
    canvas.height = image.naturalHeight || source.naturalHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    polygon.forEach(([px, py], i) => {
      const at = imagePixelAt(image, px, py);
      if (i === 0) ctx.moveTo(at.x, at.y);
      else ctx.lineTo(at.x, at.y);
    });
    ctx.closePath();
    if (settings.cutLeaves === "fill") {
      ctx.fillStyle = settings.fillColor;
    } else {
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "#000";
    }
    ctx.fill();
    return canvas.toDataURL("image/png");
  }
  async function coverForRegion(marquee, color, scale) {
    if (marquee.kind === "rect") {
      return {
        type: "rect",
        name: COVER_NAME,
        x: marquee.x,
        y: marquee.y,
        width: marquee.width,
        height: marquee.height,
        angle: marquee.angle || void 0,
        fillType: "solid",
        fillColor: color
      };
    }
    const polygon = regionPolygon(marquee);
    const bounds = pointsBounds(polygon);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bounds.width * scale));
    canvas.height = Math.max(1, Math.round(bounds.height * scale));
    const ctx = canvas.getContext("2d");
    ctx.beginPath();
    polygon.forEach(([x, y], i) => {
      const px = (x - bounds.x) * scale, py = (y - bounds.y) * scale;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    return {
      type: "image",
      name: COVER_NAME,
      src: canvas.toDataURL("image/png"),
      x: bounds.x,
      y: bounds.y,
      width: canvas.width / scale,
      height: canvas.height / scale,
      naturalWidth: canvas.width,
      naturalHeight: canvas.height,
      filter: { type: "none" }
    };
  }

  // apps/ZEditor/src/state/useMarquee.js
  var { useState: useState8, useRef: useRef8, useEffect: useEffect4 } = React;
  function useMarquee({ doc, selection, edits, toolDefaults, status }) {
    const [region, setRegion] = useState8(null);
    const [busy, setBusy] = useState8(false);
    const busyRef = useRef8(false);
    const latest = useRef8(null);
    latest.current = { doc, selection, edits, status, region, settings: toolDefaults.marquee };
    useEffect4(() => {
      setRegion(null);
    }, [doc.selectedIdx, toolDefaults.marquee.shape]);
    const polygonOpen = selection.tool === "marquee" && Boolean(region) && region.kind === "polygon" && !region.closed;
    async function makeLayer(mode) {
      const { doc: d, selection: sel, edits: ed, status: st, region: m, settings } = latest.current;
      if (busyRef.current || !d.selectedPage) return;
      if (!isUsableMarquee(m)) {
        st.setNotice("Draw a marquee on the page first (Marquee tool, M).");
        return;
      }
      const page = d.selectedPage, pageIdx = d.selectedIdx;
      busyRef.current = true;
      setBusy(true);
      st.setNotice(null);
      try {
        const result = await buildMarqueeLayer({
          page,
          pdfDocsRef: d.pdfDocsRef,
          pageFilter: d.pageFilter,
          marquee: m,
          settings,
          mode: mode || settings.action,
          targetId: sel.selectedAnnId
        });
        if (result.notice) st.setNotice(result.notice);
        if (!result.layer) return;
        const now = latest.current.doc.selectedPage;
        if (!now || now.key !== page.key) return;
        const newId = d.nextAnnIdRef.current++;
        const coverId = result.cover ? d.nextAnnIdRef.current++ : null;
        ed.updateAnnotationsFor(pageIdx, (anns) => applyMarqueeResult(anns, result, newId, coverId));
        sel.selectTool("select");
        sel.setSelectedAnnId(newId);
        sel.setSelectedAnnIds([]);
      } catch (err) {
        st.setErrorMsg("Couldn't make the layer: " + (err && err.message ? err.message : err));
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    }
    useEffect4(() => {
      function handleKeyDown(e) {
        const { selection: sel, region: m } = latest.current;
        if (sel.tool !== "marquee" || !m) return;
        const t = e.target || {};
        if (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "BUTTON" || t.isContentEditable) return;
        if (e.key === "Escape") {
          setRegion(null);
          return;
        }
        if (m.kind !== "polygon" || m.closed) return;
        if (e.key === "Enter") {
          e.preventDefault();
          if (m.points.length >= MIN_POLYGON_POINTS) setRegion({ ...m, closed: true });
        } else if (e.key === "Backspace") {
          e.preventDefault();
          setRegion(m.points.length > 1 ? { ...m, points: m.points.slice(0, -1) } : null);
        }
      }
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);
    return { region, setRegion, makeLayer, busy, polygonOpen };
  }

  // apps/ZEditor/src/state/useOnionGhost.js
  var { useState: useState9, useEffect: useEffect5 } = React;
  function useOnionGhost({ onionSkinOn, pages, selectedIdx, pdfDocsRef }) {
    const [onionGhostSrc, setOnionGhostSrc] = useState9(null);
    useEffect5(() => {
      if (!onionSkinOn || selectedIdx === null || selectedIdx === 0) {
        setOnionGhostSrc(null);
        return;
      }
      const prevPage = pages[selectedIdx - 1];
      if (!prevPage) {
        setOnionGhostSrc(null);
        return;
      }
      let cancelled = false;
      (async () => {
        try {
          const canvas = await renderPageToCanvas(prevPage, pdfDocsRef, MAIN_SCALE, prevPage.filter || DEFAULT_PAGE_FILTER);
          if (!cancelled) setOnionGhostSrc(canvas.toDataURL());
        } catch (err) {
          if (!cancelled) setOnionGhostSrc(null);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [onionSkinOn, selectedIdx]);
    return onionGhostSrc;
  }

  // apps/ZEditor/src/state/usePageOps.js
  function usePageOps({ doc, history, selection }) {
    const { pages, setPages, selectedIdx, setSelectedIdx, selectedPageIndices, setSelectedPageIndices, pdfDocsRef, nextKeyRef, pageSizeRef } = doc;
    const { recordUndoCheckpoint } = history;
    const { pagesActedOn } = selection;
    async function handleRotate(idx) {
      const updatesByKey = /* @__PURE__ */ new Map();
      for (const i of pagesActedOn(idx)) {
        const target = pages[i];
        const rotation = (target.rotation + 90) % 360;
        const dataUrl = target.isBlank ? makeBlankThumb(target.width, target.height, rotation) : await renderPdfThumb(docFor(pdfDocsRef, target), target.pageNumber, rotation);
        updatesByKey.set(target.key, { rotation, dataUrl });
      }
      recordUndoCheckpoint();
      setPages((prev) => prev.map((p) => updatesByKey.has(p.key) ? { ...p, ...updatesByKey.get(p.key) } : p));
    }
    function handleInsertBlank(atIndex) {
      const size = pageSizeRef.current || DEFAULT_PAGE_SIZE;
      const newPage = {
        key: nextKeyRef.current++,
        isBlank: true,
        rotation: 0,
        width: size.width,
        height: size.height,
        dataUrl: makeBlankThumb(size.width, size.height, 0),
        annotations: []
      };
      recordUndoCheckpoint();
      setPages((prev) => {
        const next = prev.slice();
        next.splice(atIndex, 0, newPage);
        return next;
      });
      setSelectedIdx(atIndex);
      setSelectedPageIndices([]);
    }
    function handleDelete(idx) {
      recordUndoCheckpoint();
      setPages((prev) => {
        const next = prev.filter((_, i) => i !== idx);
        return next;
      });
      setSelectedIdx((prevSel) => {
        if (prevSel === null) return null;
        if (idx === prevSel) return null;
        if (idx < prevSel) return prevSel - 1;
        return prevSel;
      });
    }
    function handleDeleteSelectedPages() {
      if (selectedIdx === null) return;
      const idxToDelete = /* @__PURE__ */ new Set([selectedIdx, ...selectedPageIndices]);
      recordUndoCheckpoint();
      setPages((prev) => prev.filter((_, i) => !idxToDelete.has(i)));
      setSelectedIdx(null);
      setSelectedPageIndices([]);
    }
    function handleDeleteThumbnail(idx) {
      if (selectedPageIndices.length > 0 && (idx === selectedIdx || selectedPageIndices.includes(idx))) {
        handleDeleteSelectedPages();
      } else {
        handleDelete(idx);
      }
    }
    function handleReorder(fromIndices, insertBefore) {
      const newOrder = orderAfterMove(pages.length, fromIndices, insertBefore);
      if (!newOrder) return;
      const newIdxOf = new Array(newOrder.length);
      newOrder.forEach((oldIdx, newIdx) => {
        newIdxOf[oldIdx] = newIdx;
      });
      recordUndoCheckpoint();
      setPages((prev) => newOrder.map((oldIdx) => prev[oldIdx]));
      setSelectedIdx((prevSel) => prevSel === null ? null : newIdxOf[prevSel]);
      setSelectedPageIndices((prevSel) => prevSel.map((oldIdx) => newIdxOf[oldIdx]));
    }
    return { handleRotate, handleInsertBlank, handleDelete, handleDeleteSelectedPages, handleDeleteThumbnail, handleReorder };
  }

  // apps/ZEditor/src/io/projectFile.js
  function serializeProject({ title, pdfDocs, pages, textStyles, settings }) {
    const docs = {};
    for (const docId of Object.keys(pdfDocs)) {
      docs[docId] = arrayBufferToBase64(pdfDocs[docId].bytes);
    }
    const usedFamilies = /* @__PURE__ */ new Set();
    pages.forEach((p) => (p.annotations || []).forEach((a) => {
      if (a.type === "text" && a.fontFamily) usedFamilies.add(a.fontFamily);
    }));
    const fonts = customFontStore.filter((f) => usedFamilies.has(f.family));
    const project = {
      version: 2,
      // 2: the annotation list is the stacking order
      title,
      docs,
      fonts,
      textStyles,
      pages: pages.map(({ dataUrl, ...rest }) => rest),
      settings
    };
    return JSON.stringify(project);
  }
  async function readProjectFile(file, nextPageKey) {
    const text = await file.text();
    const project = JSON.parse(text);
    if (!project || !Array.isArray(project.pages)) throw new Error("That doesn't look like a ZEditor project file.");
    const docs = {};
    for (const docId of Object.keys(project.docs || {})) {
      const bytes = base64ToArrayBuffer(project.docs[docId]);
      const doc = await pdfjsLib.getDocument({ data: bytes.slice(0) }).promise;
      docs[docId] = { doc, bytes };
    }
    const loadedFamilies = [];
    for (const font of project.fonts || []) {
      if (customFontStore.some((f) => f.family === font.family && f.data === font.data)) {
        loadedFamilies.push(font.family);
        continue;
      }
      try {
        await registerCustomFont(font.family, base64ToArrayBuffer(font.data));
        customFontStore.push({ family: font.family, data: font.data });
        loadedFamilies.push(font.family);
      } catch (err) {
      }
    }
    const textStyles = Array.isArray(project.textStyles) ? project.textStyles.filter((s) => s && s.name && s.props) : [];
    const pages = await Promise.all(project.pages.map(async (p) => {
      const dataUrl = p.isBlank ? makeBlankThumb(p.width, p.height, p.rotation) : await renderPdfThumb(docs[p.docId].doc, p.pageNumber, p.rotation);
      const annotations = project.version >= 2 ? p.annotations : legacyLayerOrder(p.annotations || []);
      return { ...p, annotations, key: nextPageKey(), dataUrl };
    }));
    let maxDocNum = 0;
    Object.keys(docs).forEach((id) => {
      const m = /^doc(\d+)$/.exec(id);
      if (m) maxDocNum = Math.max(maxDocNum, Number(m[1]));
    });
    let maxAnnId = 0;
    pages.forEach((p) => (p.annotations || []).forEach((a) => {
      maxAnnId = Math.max(maxAnnId, a.id || 0);
      const g = /^g(\d+)$/.exec(a.groupId || "");
      if (g) maxAnnId = Math.max(maxAnnId, Number(g[1]));
    }));
    let pageSize = null;
    const firstReal = pages.find((p) => !p.isBlank);
    if (firstReal) {
      const p1 = await docs[firstReal.docId].doc.getPage(firstReal.pageNumber);
      const vp1 = p1.getViewport({ scale: 1, rotation: 0 });
      pageSize = { width: vp1.width, height: vp1.height };
    } else if (pages.length > 0) {
      pageSize = { width: pages[0].width, height: pages[0].height };
    }
    return {
      docs,
      pages,
      loadedFamilies,
      textStyles,
      maxDocNum,
      maxAnnId,
      pageSize,
      // Projects saved before titles existed take their file's name (see the caller).
      title: typeof project.title === "string" && project.title ? project.title : null,
      settings: project.settings || {}
    };
  }

  // apps/ZEditor/src/io/reloadSnapshot.js
  var DB_NAME = "zeditor-reload";
  var STORE = "snapshot";
  var KEY = "pending";
  var MAX_AGE_MS = 10 * 60 * 1e3;
  function openDb() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  function run(mode, action) {
    return openDb().then((db) => new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const req = action(tx.objectStore(STORE));
      tx.oncomplete = () => {
        db.close();
        resolve(req && req.result);
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
      tx.onabort = () => {
        db.close();
        reject(tx.error);
      };
    }));
  }
  function saveReloadSnapshot(snapshot) {
    return run("readwrite", (store) => store.put({ ...snapshot, savedAt: Date.now() }, KEY));
  }
  async function takeReloadSnapshot() {
    try {
      const snapshot = await run("readonly", (store) => store.get(KEY));
      if (!snapshot) return null;
      await run("readwrite", (store) => store.delete(KEY));
      return Date.now() - snapshot.savedAt <= MAX_AGE_MS ? snapshot : null;
    } catch (err) {
      return null;
    }
  }

  // shared/js/leaveWarning.js
  var hasWork = () => false;
  var bypassOnce = false;
  var installed = false;
  function warnBeforeLeaving(check) {
    hasWork = check;
    if (installed) return;
    installed = true;
    window.addEventListener("beforeunload", (e) => {
      if (bypassOnce || !hasWork()) return;
      e.preventDefault();
      e.returnValue = "";
    });
  }
  function allowNextUnload() {
    bypassOnce = true;
  }

  // apps/ZEditor/src/state/useProject.js
  var { useEffect: useEffect6, useState: useState10, useRef: useRef9 } = React;
  function useProject({ doc, history, status, view, toolDefaults }) {
    const { pages, setPages, selectedIdx, setSelectedIdx, setSelectedPageIndices, pdfDocsRef, nextKeyRef, nextAnnIdRef, nextDocIdRef, pageSizeRef } = doc;
    const { setLoading, setErrorMsg } = status;
    const projectInputRef = useRef9(null);
    const [savingProject, setSavingProject] = useState10(false);
    const [projectFile, setProjectFile] = useState10(null);
    const [docTitle, setDocTitle] = useState10("");
    const [justSaved, setJustSaved] = useState10(false);
    const justSavedTimerRef = useRef9(null);
    function flashSaved() {
      setJustSaved(true);
      clearTimeout(justSavedTimerRef.current);
      justSavedTimerRef.current = setTimeout(() => setJustSaved(false), 1800);
    }
    function startNewDocument(title) {
      setProjectFile(null);
      setDocTitle(title);
    }
    async function handleSaveProject({ saveAs = false } = {}) {
      if (pages.length === 0 || savingProject) return;
      setErrorMsg(null);
      setSavingProject(true);
      try {
        const json = serializeProject({
          title: docTitle,
          pdfDocs: pdfDocsRef.current,
          pages,
          textStyles: toolDefaults.textStyles,
          settings: view.settingsForSave()
        });
        if (!saveAs && projectFile) {
          try {
            await writeFileHandle(projectFile.handle, json);
            flashSaved();
            return;
          } catch (err) {
          }
        }
        const handle = await saveFile(json, titleToFileName(docTitle, ".znow"), "application/json", "ZEditor project file", [".znow"], "application/octet-stream");
        if (handle !== "cancelled") flashSaved();
        if (handle && handle !== "cancelled") setProjectFile({ handle, name: handle.name });
      } catch (err) {
        setErrorMsg("Couldn't save the project — " + (err && err.message ? err.message : "unknown error"));
      } finally {
        setSavingProject(false);
      }
    }
    async function openProjectPicker() {
      if (typeof window.showOpenFilePicker === "function") {
        try {
          const [handle] = await window.showOpenFilePicker({
            types: [{ description: "ZEditor project file", accept: { "application/json": [".znow", ".json"] } }]
            // .json: older Android saves (App.jsx)
          });
          handleLoadProjectFile(await handle.getFile(), handle);
          return;
        } catch (err) {
          if (err && err.name === "AbortError") return;
        }
      }
      projectInputRef.current && projectInputRef.current.click();
    }
    function handleProjectInputChange(e) {
      const file = e.target.files && e.target.files[0];
      e.target.value = "";
      if (file) handleLoadProjectFile(file);
    }
    const [reloading, setReloading] = useState10(false);
    const [startupChecked, setStartupChecked] = useState10(false);
    async function reloadKeepingWork() {
      if (reloading) return;
      setReloading(true);
      try {
        if (pages.length > 0) {
          const json = serializeProject({
            title: docTitle,
            pdfDocs: pdfDocsRef.current,
            pages,
            textStyles: toolDefaults.textStyles,
            settings: view.settingsForSave()
          });
          await saveReloadSnapshot({ json, selectedIdx, title: docTitle, fileHandle: projectFile ? projectFile.handle : null });
        }
        allowNextUnload();
        window.location.reload();
      } catch (err) {
        setReloading(false);
        setErrorMsg("Couldn't keep the work for the reload, so the page wasn't reloaded — " + (err && err.message ? err.message : "unknown error"));
      }
    }
    const hasPagesRef = useRef9(false);
    hasPagesRef.current = pages.length > 0;
    useEffect6(() => {
      warnBeforeLeaving(() => hasPagesRef.current);
    }, []);
    useEffect6(() => {
      let cancelled = false;
      takeReloadSnapshot().then(async (snapshot) => {
        if (cancelled) return;
        if (snapshot) {
          const file = { name: (snapshot.title || "Untitled") + ".znow", text: async () => snapshot.json };
          await handleLoadProjectFile(file, snapshot.fileHandle || null, snapshot.selectedIdx);
        }
        setStartupChecked(true);
      });
      return () => {
        cancelled = true;
      };
    }, []);
    async function handleLoadProjectFile(file, handle = null, pageIdx = 0) {
      setErrorMsg(null);
      setLoading(true);
      try {
        const loaded = await readProjectFile(file, () => nextKeyRef.current++);
        pdfDocsRef.current = loaded.docs;
        toolDefaults.mergeTextStyles(loaded.textStyles);
        toolDefaults.addFontFamilies(loaded.loadedFamilies);
        nextDocIdRef.current = loaded.maxDocNum + 1;
        nextAnnIdRef.current = loaded.maxAnnId + 1;
        if (!pageSizeRef.current && loaded.pageSize) pageSizeRef.current = loaded.pageSize;
        setPages(loaded.pages);
        setSelectedIdx(loaded.pages.length > 0 ? Math.min(Math.max(0, pageIdx || 0), loaded.pages.length - 1) : null);
        setSelectedPageIndices([]);
        history.clearHistory();
        setProjectFile(handle ? { handle, name: handle.name } : null);
        setDocTitle(loaded.title || stripExtension(file.name));
        view.applySavedSettings(loaded.settings);
      } catch (err) {
        setErrorMsg("Couldn't load that project — " + (err && err.message ? err.message : "unknown error"));
      } finally {
        setLoading(false);
      }
    }
    return {
      docTitle,
      setDocTitle,
      projectFile,
      justSaved,
      savingProject,
      projectInputRef,
      reloading,
      reloadKeepingWork,
      startupChecked,
      startNewDocument,
      handleSaveProject,
      openProjectPicker,
      handleProjectInputChange,
      handleLoadProjectFile
    };
  }

  // apps/ZEditor/src/state/useSelection.js
  var { useState: useState11, useEffect: useEffect7, useRef: useRef10 } = React;
  function useSelection({ pages, selectedIdx, setSelectedIdx, selectedPageIndices, setSelectedPageIndices }) {
    const [tool, setTool] = useState11("select");
    const [selectedAnnId, setSelectedAnnId] = useState11(null);
    const [selectedAnnIds, setSelectedAnnIds] = useState11([]);
    const [editingAnnId, setEditingAnnId] = useState11(null);
    const [croppingAnnId, setCroppingAnnId] = useState11(null);
    const panelPickRef = useRef10(null);
    function selectTool(t) {
      setTool(t);
      setEditingAnnId(null);
      if (t === "select" || t === "marquee") return;
      setSelectedAnnId(null);
      setSelectedAnnIds([]);
    }
    const currentAnnotations = () => selectedIdx === null ? [] : pages[selectedIdx].annotations || [];
    function handleSelectAnnotations(ids, additive) {
      panelPickRef.current = null;
      const existing = additive && selectedAnnId !== null ? [selectedAnnId, ...selectedAnnIds] : [];
      const all = [.../* @__PURE__ */ new Set([...existing, ...withGroupMates(currentAnnotations(), ids)])];
      setSelectedAnnId(all.length > 0 ? all[0] : null);
      setSelectedAnnIds(all.slice(1));
    }
    function handleSelectAnnotation(id, shiftKey, single) {
      panelPickRef.current = null;
      if (id === null) {
        setSelectedAnnId(null);
        setSelectedAnnIds([]);
        return;
      }
      const members = single ? [id] : withGroupMates(currentAnnotations(), [id]);
      if (!shiftKey) {
        setSelectedAnnId(id);
        setSelectedAnnIds(members.filter((m) => m !== id));
        return;
      }
      const currentAll = selectedAnnId !== null ? [selectedAnnId, ...selectedAnnIds] : [...selectedAnnIds];
      if (currentAll.includes(id)) {
        const next = currentAll.filter((x) => !members.includes(x));
        setSelectedAnnId(next.length > 0 ? next[0] : null);
        setSelectedAnnIds(next.slice(1));
      } else {
        setSelectedAnnIds([.../* @__PURE__ */ new Set([...currentAll, ...members.filter((m) => m !== id)])]);
        setSelectedAnnId(id);
      }
    }
    function handleSelectLayer(id, shiftKey, single) {
      selectTool("select");
      handleSelectAnnotation(id, shiftKey, single);
      panelPickRef.current = id;
    }
    function selectedAnnotationIds() {
      return [selectedAnnId, ...selectedAnnIds].filter((id) => id !== null);
    }
    function handleSelectPage(idx, shiftKey) {
      if (!shiftKey || idx === null) {
        setSelectedIdx(idx);
        setSelectedPageIndices([]);
        return;
      }
      const currentAll = selectedIdx !== null ? [selectedIdx, ...selectedPageIndices] : [...selectedPageIndices];
      if (currentAll.includes(idx)) {
        const next = currentAll.filter((x) => x !== idx);
        setSelectedIdx(next.length > 0 ? next[0] : null);
        setSelectedPageIndices(next.slice(1));
      } else {
        setSelectedPageIndices(currentAll);
        setSelectedIdx(idx);
      }
    }
    function handleSelectAllPages() {
      if (pages.length === 0) return;
      const primary = selectedIdx !== null ? selectedIdx : 0;
      setSelectedIdx(primary);
      setSelectedPageIndices(pages.map((_, i) => i).filter((i) => i !== primary));
    }
    function pagesActedOn(idx) {
      const inMultiSelection = selectedPageIndices.length > 0 && (idx === selectedIdx || selectedPageIndices.includes(idx));
      return inMultiSelection ? [selectedIdx, ...selectedPageIndices] : [idx];
    }
    function handleToggleCrop(id) {
      setCroppingAnnId((cur) => cur === id ? null : id);
    }
    useEffect7(() => {
      setSelectedAnnId(null);
    }, [selectedIdx]);
    useEffect7(() => {
      if (croppingAnnId !== null && croppingAnnId !== selectedAnnId) setCroppingAnnId(null);
    }, [selectedAnnId]);
    return {
      tool,
      setTool,
      selectTool,
      panelPickId: panelPickRef.current,
      selectedAnnId,
      setSelectedAnnId,
      selectedAnnIds,
      setSelectedAnnIds,
      selectedAnnotationIds,
      currentAnnotations,
      editingAnnId,
      setEditingAnnId,
      croppingAnnId,
      handleToggleCrop,
      handleSelectAnnotations,
      handleSelectAnnotation,
      handleSelectLayer,
      handleSelectPage,
      handleSelectAllPages,
      pagesActedOn
    };
  }

  // apps/ZEditor/src/state/useStatus.js
  var { useState: useState12 } = React;
  function useStatus() {
    const [loading, setLoading] = useState12(false);
    const [errorMsg, setErrorMsg] = useState12(null);
    const [notice, setNotice] = useState12(null);
    return { loading, setLoading, errorMsg, setErrorMsg, notice, setNotice };
  }

  // apps/ZEditor/src/model/magicEraser.js
  var MAGIC_ERASER_DEFAULTS = {
    clickMode: "match",
    tolerance: 32,
    colorTolerance: 13,
    smoothing: 2,
    contiguous: true,
    diagonal: false,
    softness: 20,
    feather: 1,
    edgeShift: 0,
    specks: 0,
    defringe: 50,
    opacity: 100
  };
  var MAGIC_TOLERANCE_MAX = 255;
  var MAGIC_SMOOTHING_MAX = 6;
  var MAGIC_FEATHER_MAX = 12;
  var MAGIC_SHIFT_MAX = 8;
  var MAGIC_SPECKS_MAX = 500;

  // apps/ZEditor/src/model/softEraser.js
  var SOFT_ERASER_DEFAULTS = { size: 40, softness: 60, strength: 100 };
  var SOFT_ERASER_DABS_PER_RADIUS = 4;

  // apps/ZEditor/src/state/useToolDefaults.js
  var { useState: useState13, useEffect: useEffect8 } = React;
  function useToolDefaults() {
    const [fontOptions, setFontOptions] = useState13(DEFAULT_FONT_OPTIONS);
    const [textStyles, setTextStyles] = useState13(readStoredTextStyles);
    useEffect8(() => {
      try {
        localStorage.setItem(TEXT_STYLES_STORAGE_KEY, JSON.stringify(textStyles));
      } catch (err) {
      }
    }, [textStyles]);
    function handleSaveTextStyle(name, ann, basedOn) {
      setTextStyles((prev) => {
        const captured = captureTextStyle(ann);
        const base = basedOn && basedOn !== name && prev.some((s) => s.name === basedOn) ? basedOn : null;
        const style = base ? { name, basedOn: base, props: styleDiff(resolvedStyleProps(prev, base), captured) } : { name, props: captured };
        return [...prev.filter((s) => s.name !== name), style];
      });
    }
    function handleDeleteTextStyle(name) {
      setTextStyles((prev) => prev.filter((s) => s.name !== name).map((s) => s.basedOn === name ? { name: s.name, props: resolvedStyleProps(prev, s.name) } : s));
    }
    function mergeTextStyles(incoming) {
      if (!incoming.length) return;
      setTextStyles((prev) => [...prev.filter((s) => !incoming.some((i) => i.name === s.name)), ...incoming]);
    }
    function addFontFamilies(families) {
      if (!families.length) return;
      setFontOptions((prev) => Array.from(/* @__PURE__ */ new Set([...prev, ...families])).sort((a, b) => a.localeCompare(b)));
    }
    const [penColor, setPenColor] = useState13(PEN_DEFAULTS.color);
    const [penWidth, setPenWidth] = useState13(PEN_DEFAULTS.width);
    const [penTaper, setPenTaper] = useState13(0);
    const [eraserMode, setEraserMode] = useState13("soft");
    const [softEraser, setSoftEraser] = useState13(SOFT_ERASER_DEFAULTS);
    const [magicEraser, setMagicEraser] = useState13(MAGIC_ERASER_DEFAULTS);
    const [marquee, setMarquee] = useState13(MARQUEE_DEFAULTS);
    const [highlighterColor, setHighlighterColor] = useState13(HIGHLIGHTER_DEFAULTS.color);
    const [highlighterWidth, setHighlighterWidth] = useState13(HIGHLIGHTER_DEFAULTS.width);
    const [highlighterTaper, setHighlighterTaper] = useState13(0);
    const [textFontFamily, setTextFontFamily] = useState13(DEFAULT_FONT_OPTIONS[0]);
    const [textFontSize, setTextFontSize] = useState13(13.2);
    const [textBold, setTextBold] = useState13(false);
    const [textItalic, setTextItalic] = useState13(false);
    const [textUnderline, setTextUnderline] = useState13(false);
    const [textColor, setTextColor] = useState13("#1a1a1a");
    const [textAlign, setTextAlign] = useState13("left");
    const [rectDefaults, setRectDefaults] = useState13(() => controlValues({}, RECT_CONTROLS));
    return {
      fontOptions,
      setFontOptions,
      addFontFamilies,
      textStyles,
      setTextStyles,
      handleSaveTextStyle,
      handleDeleteTextStyle,
      mergeTextStyles,
      penColor,
      setPenColor,
      penWidth,
      setPenWidth,
      penTaper,
      setPenTaper,
      eraserMode,
      setEraserMode,
      softEraser,
      setSoftEraser,
      magicEraser,
      setMagicEraser,
      marquee,
      setMarquee,
      highlighterColor,
      setHighlighterColor,
      highlighterWidth,
      setHighlighterWidth,
      highlighterTaper,
      setHighlighterTaper,
      textFontFamily,
      setTextFontFamily,
      textFontSize,
      setTextFontSize,
      textBold,
      setTextBold,
      textItalic,
      setTextItalic,
      textUnderline,
      setTextUnderline,
      textColor,
      setTextColor,
      textAlign,
      setTextAlign,
      rectDefaults,
      setRectDefaults
    };
  }

  // apps/ZEditor/src/model/guides.js
  var mmText = (inches) => String(Math.round(inches * 254) / 10);
  var sized = (key, name, widthIn, heightIn) => ({ key, label: `${name} (${mmText(widthIn)}mm × ${mmText(heightIn)}mm)`, widthIn, heightIn });
  var GUIDE_FORMAT_PRESETS = [
    { key: "match", label: "Match Page Size" },
    sized("half-letter", "Half Letter", 5.5, 8.5),
    sized("digest", "Digest", 5.5, 8.25),
    sized("a5", "A5", 148 / 25.4, 210 / 25.4),
    sized("a6", "A6", 105 / 25.4, 148 / 25.4),
    sized("quarter-letter", "Quarter Letter", 4.25, 5.5),
    sized("letter", "US Letter", 8.5, 11),
    sized("a4", "A4", 210 / 25.4, 297 / 25.4)
  ];
  var DEFAULT_GUIDE_MARGIN_IN = 0.25;
  var DEFAULT_GUIDE_BLEED_IN = 0.125;

  // apps/ZEditor/src/model/rulers.js
  var RULER_UNITS = [
    { key: "mm", label: "Millimetres (mm)", perPt: 25.4 / 72 },
    { key: "cm", label: "Centimetres (cm)", perPt: 2.54 / 72 },
    { key: "in", label: "Inches (in)", perPt: 1 / 72 },
    { key: "pt", label: "Points (pt)", perPt: 1 }
  ];
  var DEFAULT_RULER_UNIT = "mm";
  var unitInfo = (key) => RULER_UNITS.find((u) => u.key === key) || RULER_UNITS[0];
  var ptToUnit = (pt, unit) => pt * unitInfo(unit).perPt;
  var unitToPt = (value, unit) => value / unitInfo(unit).perPt;
  function formatInUnit(pt, unit) {
    const v = ptToUnit(pt, unit);
    const digits = unit === "pt" || unit === "mm" ? 1 : 2;
    return `${Number(v.toFixed(digits))} ${unit}`;
  }
  function guideGap(guides, axis, pos) {
    let from = null, to = null;
    for (const g of guides) {
      if (g.axis !== axis) continue;
      if (g.pos <= pos && (from == null || g.pos > from)) from = g.pos;
      if (g.pos > pos && (to == null || g.pos < to)) to = g.pos;
    }
    return from == null || to == null ? null : { from, to, length: to - from };
  }
  function measureBetween(a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const deg = Math.round(Math.atan2(-dy, dx) * 180 / Math.PI * 10) / 10;
    return { dx, dy, length: Math.hypot(dx, dy), angle: (deg + 360) % 360 };
  }
  function constrainTo45(from, to) {
    const dx = to.x - from.x, dy = to.y - from.y;
    const step = Math.PI / 4, len = Math.hypot(dx, dy);
    const a = Math.round(Math.atan2(dy, dx) / step) * step;
    return { x: from.x + Math.cos(a) * len, y: from.y + Math.sin(a) * len };
  }
  function snapToUnit(pt, unit) {
    const step = unit === "in" ? 1 / 8 : unit === "cm" ? 0.1 : 1;
    return unitToPt(Math.round(ptToUnit(pt, unit) / step) * step, unit);
  }
  function dragGain(speedPxPerMs) {
    const FAST = 0.5, SLOW_GAIN = 0.1;
    return Math.max(SLOW_GAIN, Math.min(1, speedPxPerMs / FAST));
  }
  function rulerTicks(fromPt, toPt, pxPerPt, unit, minLabelPx = 48) {
    const perPt = unitInfo(unit).perPt;
    const pxPerUnit = pxPerPt / perPt;
    const steps = [];
    for (let e = -3; e <= 5; e++) for (const m of [1, 2, 5]) steps.push(m * 10 ** e);
    const major = steps.find((s) => s * pxPerUnit >= minLabelPx) || steps[steps.length - 1];
    const firstDigit = Math.round(major / 10 ** Math.floor(Math.log10(major) + 1e-9));
    const splits = (firstDigit === 2 ? [2, 4, 8] : firstDigit === 5 ? [5, 10] : [2, 10]).filter((n) => major / n * pxPerUnit >= 4);
    const minorCount = splits.length ? splits[splits.length - 1] : 1;
    const minor = major / minorCount;
    const ticks = [];
    const start = Math.floor(fromPt * perPt / minor), end = Math.ceil(toPt * perPt / minor);
    if (end - start > 5e3) return ticks;
    for (let k = start; k <= end; k++) {
      const value = k * minor;
      const onMajor = Math.abs(value / major - Math.round(value / major)) < 1e-6;
      const onMid = !onMajor && minorCount % 2 === 0 && Math.abs(value / major * 2 - Math.round(value / major * 2)) < 1e-6;
      ticks.push({ pt: value / perPt, value: Number(value.toFixed(6)), size: onMajor ? "major" : onMid ? "mid" : "minor" });
    }
    return ticks;
  }
  function snapToGuides(box, guides, threshold) {
    const nearest2 = (edges, lines) => {
      let best = 0, bestDist = threshold;
      for (const edge of edges) for (const line of lines) {
        const d = Math.abs(line - edge);
        if (d <= bestDist) {
          bestDist = d;
          best = line - edge;
        }
      }
      return best;
    };
    return {
      dx: nearest2([box.x0, (box.x0 + box.x1) / 2, box.x1], guides.x || []),
      dy: nearest2([box.y0, (box.y0 + box.y1) / 2, box.y1], guides.y || [])
    };
  }

  // apps/ZEditor/src/state/useViewSettings.js
  var { useState: useState14 } = React;
  function useViewSettings() {
    const [guidesOn, setGuidesOn] = useState14(false);
    const [centerGuideOn, setCenterGuideOn] = useState14(false);
    const [guideFormat, setGuideFormat] = useState14("match");
    const [guideMarginIn, setGuideMarginIn] = useState14(DEFAULT_GUIDE_MARGIN_IN);
    const [guideBleedIn, setGuideBleedIn] = useState14(DEFAULT_GUIDE_BLEED_IN);
    const [pageNumbers, setPageNumbers] = useState14(DEFAULT_PAGE_NUMBERS);
    const [onionSkinOn, setOnionSkinOn] = useState14(false);
    const [onionSkinOpacity, setOnionSkinOpacity] = useState14(0.3);
    const [layersOpen, setLayersOpen] = useState14(true);
    const [rulersOn, setRulersOn] = useState14(true);
    const [rulerUnit, setRulerUnit] = useState14(DEFAULT_RULER_UNIT);
    const [rulerGuides, setRulerGuides] = useState14([]);
    const [snapToGuidesOn, setSnapToGuidesOn] = useState14(true);
    const [layersPosition, setLayersPosition] = useState14(null);
    const [layersSize, setLayersSize] = useState14(null);
    function settingsForSave() {
      return {
        guidesOn,
        guideFormat,
        guideMarginIn,
        guideBleedIn,
        centerGuideOn,
        onionSkinOn,
        onionSkinOpacity,
        pageNumbers,
        rulersOn,
        rulerUnit,
        rulerGuides,
        snapToGuidesOn
      };
    }
    function applySavedSettings(s) {
      if (s.guidesOn !== void 0) setGuidesOn(s.guidesOn);
      if (s.centerGuideOn !== void 0) setCenterGuideOn(s.centerGuideOn);
      if (s.guideFormat !== void 0) setGuideFormat(s.guideFormat);
      if (s.guideMarginIn !== void 0) setGuideMarginIn(s.guideMarginIn);
      if (s.guideBleedIn !== void 0) setGuideBleedIn(s.guideBleedIn);
      if (s.onionSkinOn !== void 0) setOnionSkinOn(s.onionSkinOn);
      if (s.onionSkinOpacity !== void 0) setOnionSkinOpacity(s.onionSkinOpacity);
      setPageNumbers({ ...DEFAULT_PAGE_NUMBERS, ...s.pageNumbers || {} });
      if (s.rulersOn !== void 0) setRulersOn(s.rulersOn);
      if (s.rulerUnit !== void 0) setRulerUnit(s.rulerUnit);
      if (s.snapToGuidesOn !== void 0) setSnapToGuidesOn(s.snapToGuidesOn);
      setRulerGuides(Array.isArray(s.rulerGuides) ? s.rulerGuides.filter((g) => g && (g.axis === "x" || g.axis === "y") && Number.isFinite(g.pos)) : []);
    }
    return {
      guidesOn,
      setGuidesOn,
      centerGuideOn,
      setCenterGuideOn,
      guideFormat,
      setGuideFormat,
      guideMarginIn,
      setGuideMarginIn,
      guideBleedIn,
      setGuideBleedIn,
      pageNumbers,
      setPageNumbers,
      onionSkinOn,
      setOnionSkinOn,
      onionSkinOpacity,
      setOnionSkinOpacity,
      layersOpen,
      setLayersOpen,
      layersPosition,
      setLayersPosition,
      layersSize,
      setLayersSize,
      rulersOn,
      setRulersOn,
      rulerUnit,
      setRulerUnit,
      rulerGuides,
      setRulerGuides,
      snapToGuidesOn,
      setSnapToGuidesOn,
      settingsForSave,
      applySavedSettings
    };
  }

  // shared/js/pinchGate.js
  var PINCH_THRESHOLD = 0.3;
  function createPinchGate(threshold = PINCH_THRESHOLD) {
    let base = null;
    return function gate(rawScale) {
      if (base === null) {
        if (!(rawScale > 0) || Math.abs(Math.log(rawScale)) < Math.log(1 + threshold)) return 1;
        base = rawScale;
      }
      return rawScale / base;
    };
  }

  // apps/ZEditor/src/state/useZoom.js
  var { useState: useState15, useRef: useRef11, useLayoutEffect, useEffect: useEffect9 } = React;
  var PINCH_EVENT = "ze-pinch";
  var TOP_GAP = 40;
  function centerArtboard(board) {
    const pane = board && board.closest(".preview-pane");
    if (!pane) return;
    const w = board.offsetWidth, h = board.offsetHeight;
    pane.scrollLeft = board.offsetLeft + w / 2 - pane.clientWidth / 2;
    pane.scrollTop = h + 2 * TOP_GAP <= pane.clientHeight ? board.offsetTop + h / 2 - pane.clientHeight / 2 : board.offsetTop - TOP_GAP;
  }
  function useZoom() {
    const [zoomPercent, setZoomPercent] = useState15(ZOOM_PERCENT.initial);
    const previewPaneRef = useRef11(null);
    const zoomAnchorRef = useRef11(null);
    const zoomRef = useRef11(zoomPercent);
    zoomRef.current = zoomPercent;
    function artboardElement() {
      return previewPaneRef.current && previewPaneRef.current.querySelector(".ze-artboard-zoom");
    }
    function pagePointAt(fx, fy) {
      const pane = previewPaneRef.current, board = artboardElement();
      return { x: (pane.scrollLeft + fx - board.offsetLeft) / zoomRef.current, y: (pane.scrollTop + fy - board.offsetTop) / zoomRef.current };
    }
    function scrollPointTo(point, fx, fy, percent) {
      const pane = previewPaneRef.current, board = artboardElement();
      pane.scrollLeft = point.x * percent + board.offsetLeft - fx;
      pane.scrollTop = point.y * percent + board.offsetTop - fy;
    }
    function handleZoomChange(percent) {
      const pane = previewPaneRef.current;
      if (artboardElement()) {
        const fx = pane.clientWidth / 2, fy = pane.clientHeight / 2;
        zoomAnchorRef.current = { ...pagePointAt(fx, fy), fx, fy };
      }
      setZoomPercent(percent);
    }
    useLayoutEffect(() => {
      const anchor = zoomAnchorRef.current;
      if (!anchor || !artboardElement()) return;
      zoomAnchorRef.current = null;
      scrollPointTo(anchor, anchor.fx, anchor.fy, zoomPercent);
    }, [zoomPercent]);
    useEffect9(() => {
      let pinch = null;
      function onPinch(e) {
        const pane = previewPaneRef.current;
        const { phase, scale, x, y } = e.detail || {};
        if (!pane || !artboardElement()) return;
        const r = pane.getBoundingClientRect();
        const fx = x - r.left, fy = y - r.top;
        if (phase === "start") {
          pinch = { point: pagePointAt(fx, fy), startPercent: zoomRef.current, gate: createPinchGate() };
          return;
        }
        if (!pinch) return;
        if (phase === "end") {
          pinch = null;
          return;
        }
        const percent = Math.round(Math.min(ZOOM_PERCENT.max, Math.max(ZOOM_PERCENT.min, pinch.startPercent * pinch.gate(scale))));
        if (percent === zoomRef.current) {
          scrollPointTo(pinch.point, fx, fy, percent);
        } else {
          zoomAnchorRef.current = { ...pinch.point, fx, fy };
          setZoomPercent(percent);
        }
      }
      window.addEventListener(PINCH_EVENT, onPinch);
      return () => window.removeEventListener(PINCH_EVENT, onPinch);
    }, []);
    return { zoomPercent, previewPaneRef, handleZoomChange };
  }

  // apps/ZEditor/src/ui/pointer.js
  function dragDeltaFrom(startEvent, zoom, angle = 0) {
    const { clientX: startX, clientY: startY } = startEvent;
    return (ev) => {
      const [dx, dy] = rotatePoint((ev.clientX - startX) / zoom, (ev.clientY - startY) / zoom, -angle);
      return { dx, dy };
    };
  }
  var DRAG_THRESHOLD = 4;
  function trackPointerDrag(onMove, onUp) {
    const move = (ev) => onMove(ev);
    const up = (ev) => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      if (onUp) onUp(ev);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  }
  function textOffsetAtPoint(x, y, element, textLength) {
    let node = null, offset = 0;
    if (document.caretPositionFromPoint) {
      const position = document.caretPositionFromPoint(x, y);
      if (position) {
        node = position.offsetNode;
        offset = position.offset;
      }
    } else if (document.caretRangeFromPoint) {
      const range = document.caretRangeFromPoint(x, y);
      if (range) {
        node = range.startContainer;
        offset = range.startOffset;
      }
    }
    return node && node.nodeType === Node.TEXT_NODE && element.contains(node) ? offset : textLength;
  }

  // apps/ZEditor/src/model/crop.js
  var MIN_CROP_SIZE = 20;
  var clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
  function resizedCrop(crop, natW, natH, handle, dx, dy, keepRatio, min = MIN_CROP_SIZE) {
    const sx = handle.includes("e") ? 1 : handle.includes("w") ? -1 : 0;
    const sy = handle.includes("s") ? 1 : handle.includes("n") ? -1 : 0;
    const { x, y, w, h } = crop;
    if (!keepRatio) {
      let left = x, right = x + w, top = y, bottom = y + h;
      if (sx > 0) right = clamp(right + dx, left + min, natW);
      else if (sx < 0) left = clamp(left + dx, 0, right - min);
      if (sy > 0) bottom = clamp(bottom + dy, top + min, natH);
      else if (sy < 0) top = clamp(top + dy, 0, bottom - min);
      return { x: left, y: top, w: right - left, h: bottom - top };
    }
    const wantW = w + sx * dx, wantH = h + sy * dy;
    let scale = sx && sy ? Math.max(wantW / w, wantH / h) : sx ? wantW / w : wantH / h;
    const cx = x + w / 2, cy = y + h / 2;
    const roomW = sx > 0 ? natW - x : sx < 0 ? x + w : 2 * Math.min(cx, natW - cx);
    const roomH = sy > 0 ? natH - y : sy < 0 ? y + h : 2 * Math.min(cy, natH - cy);
    scale = Math.max(Math.min(scale, roomW / w, roomH / h), min / Math.min(w, h));
    const nw = w * scale, nh = h * scale;
    return {
      x: sx > 0 ? x : sx < 0 ? x + w - nw : cx - nw / 2,
      y: sy > 0 ? y : sy < 0 ? y + h - nh : cy - nh / 2,
      w: nw,
      h: nh
    };
  }

  // apps/ZEditor/src/ui/canvas/BoxEffectOverlays.jsx
  var { useRef: useRef12, useEffect: useEffect10 } = React;
  function BoxEffectOverlays({ ann, edgeOutline }) {
    const textureCanvasRef = useRef12(null);
    const textureKey = ann.texture ? JSON.stringify(effectSettings(ann, TEXTURE_EFFECT)) : null;
    const stroke = ann.stroke ? effectSettings(ann, STROKE_EFFECT) : null;
    useEffect10(() => {
      const canvas = textureCanvasRef.current;
      if (!textureKey || !canvas) return;
      canvas.width = Math.max(1, Math.ceil(ann.width));
      canvas.height = Math.max(1, Math.ceil(ann.height));
      drawTextureMarks(canvas.getContext("2d"), ann);
    }, [textureKey, ann.width, ann.height]);
    return /* @__PURE__ */ React.createElement(React.Fragment, null, ann.texture && /* @__PURE__ */ React.createElement("canvas", { ref: textureCanvasRef, className: "ze-ann-image-texture", style: { clipPath: edgeOutline ? `path("${edgeOutline}")` : void 0 } }), stroke && /* @__PURE__ */ React.createElement("svg", { className: "ze-ann-image-stroke", width: ann.width, height: ann.height, "aria-hidden": "true" }, /* @__PURE__ */ React.createElement(
      "path",
      {
        d: edgeOutline || rectOutline(ann),
        fill: "none",
        stroke: stroke.strokeColor,
        strokeWidth: stroke.strokeThickness,
        strokeLinejoin: "miter",
        strokeMiterlimit: STROKE_MITER_LIMIT
      }
    )));
  }

  // apps/ZEditor/src/ui/canvas/boxStyles.js
  var rotationCss = (ann) => angleOf(ann) ? `rotate(${angleOf(ann)}deg)` : void 0;
  function boxGroupStyle(ann) {
    const shadow = imageShadowOffset(ann);
    const opacity = opacityOf(ann);
    const blend = blendOf(ann);
    const [shadowX, shadowY] = shadow ? rotatePoint(shadow.x, shadow.y, -angleOf(ann)) : [0, 0];
    return {
      filter: shadow ? `drop-shadow(${shadowX}px ${shadowY}px ${shadow.blur}px ${shadow.color})` : void 0,
      opacity: opacity < 1 ? opacity : void 0,
      // A rotated box is its own stacking context, which would trap this
      // blend inside it; see boxOuterStyle, which carries it instead.
      mixBlendMode: blend !== "normal" && !angleOf(ann) ? blend : void 0
    };
  }
  function boxOuterStyle(ann) {
    const blend = blendOf(ann);
    return {
      left: ann.x,
      top: ann.y,
      width: ann.width,
      height: ann.height,
      transform: rotationCss(ann),
      mixBlendMode: angleOf(ann) && blend !== "normal" ? blend : void 0
    };
  }

  // apps/ZEditor/src/ui/canvas/ResizeHandles.jsx
  var ALL_RESIZE_HANDLES = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
  var TEXT_RESIZE_HANDLES = ["nw", "ne", "e", "se", "sw", "w"];
  function ResizeHandles({ handles, onStart, onRotate }) {
    return /* @__PURE__ */ React.createElement(React.Fragment, null, handles.map((handle) => /* @__PURE__ */ React.createElement(
      "div",
      {
        key: handle,
        className: "ze-resize-handle ze-resize-handle-" + handle,
        onMouseDown: (e) => {
          e.preventDefault();
          e.stopPropagation();
          onStart(handle, e);
        }
      }
    )), onRotate && /* @__PURE__ */ React.createElement("div", { className: "ze-rotate-handle", title: "Rotate (hold Shift to snap to 15°)", onMouseDown: (e) => startRotateDrag(e, onRotate) }));
  }
  function startRotateDrag(e, onRotate) {
    e.preventDefault();
    e.stopPropagation();
    const box = e.currentTarget.parentElement.getBoundingClientRect();
    const centerX = box.left + box.width / 2, centerY = box.top + box.height / 2;
    trackPointerDrag((ev) => {
      let degrees = Math.atan2(ev.clientY - centerY, ev.clientX - centerX) * 180 / Math.PI + 90;
      degrees = ev.shiftKey ? Math.round(degrees / 15) * 15 : Math.round(degrees);
      onRotate((degrees % 360 + 360) % 360);
    });
  }

  // apps/ZEditor/src/ui/canvas/AnnotationImage.jsx
  var { useRef: useRef13, useEffect: useEffect11 } = React;
  function AnnotationImage({ ann, tool, isSelected, showHandles, isCropping, isEraseTarget, onPress, onUpdate, onToggleCrop, pageFilter, zoom }) {
    const halftoneCanvasRef = useRef13(null);
    const naturalW = ann.naturalWidth, naturalH = ann.naturalHeight;
    const cropX = ann.cropX || 0, cropY = ann.cropY || 0;
    const cropW = ann.cropW || naturalW, cropH = ann.cropH || naturalH;
    const displayScaleX = ann.width / cropW, displayScaleY = ann.height / cropH;
    function startResize(handle, e) {
      const orig = { x: ann.x, y: ann.y, width: ann.width, height: ann.height };
      const dragDelta = dragDeltaFrom(e, zoom, angleOf(ann));
      trackPointerDrag((ev) => {
        const { dx, dy } = dragDelta(ev);
        onUpdate(ann.id, resizedBox(orig, handle, dx, dy, !ev.shiftKey, MIN_RESIZE_SIZE, angleOf(ann)));
      });
    }
    function startCropPan(e) {
      e.preventDefault();
      e.stopPropagation();
      const dragDelta = dragDeltaFrom(e, zoom);
      const origCropX = cropX, origCropY = cropY;
      trackPointerDrag((ev) => {
        const { dx, dy } = dragDelta(ev);
        const dxNat = dx / displayScaleX;
        const dyNat = dy / displayScaleY;
        const newCropX = Math.min(Math.max(0, origCropX - dxNat), Math.max(0, naturalW - cropW));
        const newCropY = Math.min(Math.max(0, origCropY - dyNat), Math.max(0, naturalH - cropH));
        onUpdate(ann.id, { cropX: newCropX, cropY: newCropY });
      });
    }
    function startCropResize(handle, e) {
      e.preventDefault();
      e.stopPropagation();
      const imageOriginX = ann.x - cropX * displayScaleX;
      const imageOriginY = ann.y - cropY * displayScaleY;
      const dragDelta = dragDeltaFrom(e, zoom);
      const orig = { x: cropX, y: cropY, w: cropW, h: cropH };
      trackPointerDrag((ev) => {
        const { dx, dy } = dragDelta(ev);
        const c = resizedCrop(orig, naturalW, naturalH, handle, dx / displayScaleX, dy / displayScaleY, ev.shiftKey);
        onUpdate(ann.id, {
          cropX: c.x,
          cropY: c.y,
          cropW: c.w,
          cropH: c.h,
          x: imageOriginX + c.x * displayScaleX,
          y: imageOriginY + c.y * displayScaleY,
          width: c.w * displayScaleX,
          height: c.h * displayScaleY
        });
      });
    }
    const imgFilter = effectiveImageFilter(ann, pageFilter);
    const filterType = imgFilter.type;
    const adjusted = hasPhotoAdjust(ann);
    const usesFilterCanvas = Boolean(FILTER_CONTROLS[filterType]) || adjusted;
    const filterCanvasKey = usesFilterCanvas ? JSON.stringify([imgFilter, adjusted ? controlValues(ann, PHOTO_ADJUST_CONTROLS) : null]) : null;
    useEffect11(() => {
      if (!usesFilterCanvas || isCropping) return;
      let cancelled = false;
      (async () => {
        const img = await loadImageElement(ann.src);
        if (cancelled) return;
        const canvas = halftoneCanvasRef.current;
        if (!canvas) return;
        const w = Math.max(1, Math.round(ann.width));
        const h = Math.max(1, Math.round(ann.height));
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, w, h);
        if (adjusted) applyPhotoAdjust(ctx, canvas, ann);
        applyPageFilter(ctx, canvas, imgFilter, 1);
      })();
      return () => {
        cancelled = true;
      };
    }, [filterCanvasKey, isCropping, ann.src, ann.width, ann.height, cropX, cropY, cropW, cropH]);
    if (isCropping) {
      const imageOriginX = ann.x - cropX * displayScaleX;
      const imageOriginY = ann.y - cropY * displayScaleY;
      const fullW = naturalW * displayScaleX, fullH = naturalH * displayScaleY;
      const winX = cropX * displayScaleX, winY = cropY * displayScaleY, winW = cropW * displayScaleX, winH = cropH * displayScaleY;
      return /* @__PURE__ */ React.createElement("div", { className: "ze-ann-image ze-ann-image--cropping", style: { left: imageOriginX, top: imageOriginY, width: fullW, height: fullH } }, /* @__PURE__ */ React.createElement("img", { src: ann.src, alt: "", draggable: "false", className: "ze-crop-full-img" }), /* @__PURE__ */ React.createElement("div", { className: "ze-crop-window", style: { left: winX, top: winY, width: winW, height: winH }, onMouseDown: startCropPan }, /* @__PURE__ */ React.createElement("div", { className: "ze-crop-window-clip" }, /* @__PURE__ */ React.createElement("img", { src: ann.src, alt: "", draggable: "false", style: { position: "absolute", left: -winX, top: -winY, width: fullW, height: fullH } })), ALL_RESIZE_HANDLES.map((handle) => /* @__PURE__ */ React.createElement("div", { key: handle, className: "ze-crop-handle ze-crop-handle-" + handle, onMouseDown: (e) => startCropResize(handle, e) }))));
    }
    const hasOwnDuotone = ann.filter && ann.filter.type === "duotone";
    const duotoneFilterId = hasOwnDuotone ? "ze-filter-duotone-img-" + ann.id : "ze-filter-duotone";
    const cssFilter = usesFilterCanvas ? void 0 : (
      // the canvas already has the filter applied
      filterType === "grayscale" ? "url(#ze-filter-grayscale)" : filterType === "duotone" ? `url(#${duotoneFilterId})` : void 0
    );
    const frameStyle = {};
    const edgeOutline = imageEdgeOutline(ann);
    if (edgeOutline) frameStyle.clipPath = `path("${edgeOutline}")`;
    if (cssFilter) frameStyle.filter = cssFilter;
    const ownDuotoneDarkRgb = hasOwnDuotone ? hexToRgb(imgFilter.darkColor || DEFAULT_DUOTONE_DARK) : null;
    const ownDuotoneLightRgb = hasOwnDuotone ? hexToRgb(imgFilter.lightColor || DEFAULT_DUOTONE_LIGHT) : null;
    return /* @__PURE__ */ React.createElement(
      "div",
      {
        "data-ann-id": ann.id,
        className: "ze-ann-image" + (isSelected ? " is-selected" : "") + (isEraseTarget ? " is-erase-target" : "") + (ann.locked ? " is-locked" : ""),
        style: boxOuterStyle(ann),
        onMouseDown: (e) => {
          if (tool === "select") onPress(e, ann);
        }
      },
      /* @__PURE__ */ React.createElement("div", { className: "ze-ann-image-shadow", style: boxGroupStyle(ann) }, usesFilterCanvas ? /* @__PURE__ */ React.createElement("canvas", { ref: halftoneCanvasRef, style: frameStyle }) : /* @__PURE__ */ React.createElement("div", { className: "ze-ann-image-frame", style: frameStyle }, /* @__PURE__ */ React.createElement(
        "img",
        {
          src: ann.src,
          alt: "",
          draggable: "false",
          style: { position: "absolute", left: -cropX * displayScaleX, top: -cropY * displayScaleY, width: naturalW * displayScaleX, height: naturalH * displayScaleY }
        }
      )), /* @__PURE__ */ React.createElement(BoxEffectOverlays, { ann, edgeOutline })),
      showHandles && /* @__PURE__ */ React.createElement(ResizeHandles, { handles: ALL_RESIZE_HANDLES, onStart: startResize, onRotate: (angle) => onUpdate(ann.id, { angle }) }),
      hasOwnDuotone && /* @__PURE__ */ React.createElement("svg", { width: "0", height: "0", style: { position: "absolute" }, "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("defs", null, /* @__PURE__ */ React.createElement("filter", { id: duotoneFilterId, colorInterpolationFilters: "sRGB" }, /* @__PURE__ */ React.createElement("feColorMatrix", { type: "matrix", values: LUMINANCE_MATRIX_VALUES }), /* @__PURE__ */ React.createElement("feComponentTransfer", null, /* @__PURE__ */ React.createElement("feFuncR", { type: "linear", slope: (ownDuotoneLightRgb.r - ownDuotoneDarkRgb.r) / 255, intercept: ownDuotoneDarkRgb.r / 255 }), /* @__PURE__ */ React.createElement("feFuncG", { type: "linear", slope: (ownDuotoneLightRgb.g - ownDuotoneDarkRgb.g) / 255, intercept: ownDuotoneDarkRgb.g / 255 }), /* @__PURE__ */ React.createElement("feFuncB", { type: "linear", slope: (ownDuotoneLightRgb.b - ownDuotoneDarkRgb.b) / 255, intercept: ownDuotoneDarkRgb.b / 255 })))))
    );
  }

  // apps/ZEditor/src/ui/canvas/AnnotationRect.jsx
  function AnnotationRect({ ann, tool, isSelected, showHandles, onPress, onUpdate, zoom }) {
    function startResize(handle, e) {
      const orig = { x: ann.x, y: ann.y, width: ann.width, height: ann.height };
      const dragDelta = dragDeltaFrom(e, zoom, angleOf(ann));
      trackPointerDrag((ev) => {
        const { dx, dy } = dragDelta(ev);
        onUpdate(ann.id, resizedBox(orig, handle, dx, dy, ev.shiftKey, MIN_RECT_SIZE, angleOf(ann)));
      });
    }
    const edgeOutline = imageEdgeOutline(ann);
    return /* @__PURE__ */ React.createElement(
      "div",
      {
        "data-ann-id": ann.id,
        className: "ze-ann-image" + (isSelected ? " is-selected" : "") + (ann.locked ? " is-locked" : ""),
        style: boxOuterStyle(ann),
        onMouseDown: (e) => {
          if (tool === "select") onPress(e, ann);
        }
      },
      /* @__PURE__ */ React.createElement("div", { className: "ze-ann-image-shadow", style: boxGroupStyle(ann) }, /* @__PURE__ */ React.createElement("div", { className: "ze-ann-rect-fill", style: { background: rectFillCss(ann), clipPath: edgeOutline ? `path("${edgeOutline}")` : void 0 } }), /* @__PURE__ */ React.createElement(BoxEffectOverlays, { ann, edgeOutline })),
      showHandles && /* @__PURE__ */ React.createElement(ResizeHandles, { handles: ALL_RESIZE_HANDLES, onStart: startResize, onRotate: (angle) => onUpdate(ann.id, { angle }) })
    );
  }

  // apps/ZEditor/src/render/textCaret.js
  function lineIndexAt(layout, index) {
    const lines = layout.typesetLines;
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (index >= l.start && (index < l.end || l.last && index <= l.end)) return l.hidden ? lastVisibleLine(lines) : i;
    }
    return lastVisibleLine(lines);
  }
  function lastVisibleLine(lines) {
    for (let i = lines.length - 1; i >= 0; i--) if (!lines[i].hidden) return i;
    return 0;
  }
  function xOnLine(layout, tl, index) {
    const lineX = layout.padX + tl.x;
    const pieces = tl.pieces;
    if (!pieces.length) return lineX;
    if (index <= pieces[0].start) return lineX + pieces[0].x;
    for (let k = 0; k < pieces.length; k++) {
      const p = pieces[k];
      if (index >= p.start && index <= p.end) {
        const raw = p.hyphen ? p.text.slice(0, -1) : p.text;
        return lineX + p.x + layout.measure(raw.slice(0, index - p.start), p.start);
      }
      const next = pieces[k + 1];
      if (next && index > p.end && index < next.start) {
        const from = lineX + p.x + p.width, to = lineX + next.x;
        return from + (to - from) * ((index - p.end) / (next.start - p.end));
      }
    }
    const last = pieces[pieces.length - 1];
    return lineX + last.x + last.width;
  }
  function caretRect(layout, index) {
    const line = lineIndexAt(layout, index);
    const tl = layout.typesetLines[line];
    return { x: xOnLine(layout, tl, index), y: layout.padY + tl.top, height: tl.height || layout.lineHeight, line };
  }
  function indexAtX(layout, lineIndex, x) {
    const tl = layout.typesetLines[lineIndex];
    const pieces = tl.pieces;
    const lineEnd = tl.last ? tl.end : tl.visibleEnd;
    if (!pieces.length) return tl.start;
    const lineX = layout.padX + tl.x;
    const first = pieces[0];
    if (x <= lineX + first.x) return first.start;
    for (let k = 0; k < pieces.length; k++) {
      const p = pieces[k];
      const left = lineX + p.x, right = left + p.width;
      if (x >= left && x <= right) {
        const raw = p.hyphen ? p.text.slice(0, -1) : p.text;
        let best = p.start, bestDist = Infinity;
        for (let n = 0; n <= raw.length; n++) {
          const dist = Math.abs(left + layout.measure(raw.slice(0, n), p.start) - x);
          if (dist < bestDist) {
            bestDist = dist;
            best = p.start + n;
          }
        }
        return Math.min(best, p.end);
      }
      const next = pieces[k + 1];
      if (next && x > right && x < lineX + next.x) {
        const f = (x - right) / (lineX + next.x - right);
        return Math.round(p.end + f * (next.start - p.end));
      }
    }
    return lineEnd;
  }
  function indexAtPoint(layout, x, y) {
    const lines = layout.typesetLines;
    const columns = layout.columns || 1;
    const column = columns > 1 && layout.columnStride > 0 ? Math.max(0, Math.min(columns - 1, Math.floor((x - layout.padX) / layout.columnStride))) : null;
    let best = -1, bestDist = Infinity;
    const consider = (onlyColumn) => lines.forEach((tl, i) => {
      if (tl.hidden) return;
      if (onlyColumn !== null && (tl.col || 0) !== onlyColumn) return;
      const top = layout.padY + tl.top, bottom = top + (tl.height || layout.lineHeight);
      const dist = y < top ? top - y : y > bottom ? y - bottom : 0;
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    });
    consider(column);
    if (best < 0) consider(null);
    return indexAtX(layout, Math.max(0, best), x);
  }
  function moveVertical(layout, index, direction, goalX, textLength) {
    const line = lineIndexAt(layout, index);
    const target = line + direction;
    if (target < 0) return 0;
    if (target >= layout.typesetLines.length) return textLength;
    return indexAtX(layout, target, goalX);
  }
  function lineStartAt(layout, index) {
    return layout.typesetLines[lineIndexAt(layout, index)].start;
  }
  function lineEndAt(layout, index) {
    const tl = layout.typesetLines[lineIndexAt(layout, index)];
    return tl.last ? tl.end : tl.visibleEnd;
  }
  function selectionRects(layout, start, end) {
    const rects = [];
    if (end <= start) return rects;
    layout.typesetLines.forEach((tl) => {
      if (tl.hidden) return;
      const lineEnd = tl.last ? tl.end : tl.end;
      if (end <= tl.start || start >= lineEnd + (tl.last ? 1 : 0)) return;
      const a = Math.max(start, tl.start);
      const b = Math.min(end, tl.last ? tl.end : tl.visibleEnd);
      let x0 = xOnLine(layout, tl, a);
      let x1 = xOnLine(layout, tl, Math.max(a, b));
      const runsOn = end > (tl.last ? tl.end : tl.visibleEnd);
      if (runsOn) x1 += layout.fontSize * 0.35;
      if (x1 - x0 < 1 && !runsOn) return;
      rects.push({ x: x0, y: layout.padY + tl.top, width: Math.max(1, x1 - x0), height: tl.height || layout.lineHeight });
    });
    return rects;
  }
  function wordRangeAt(text, index) {
    const isWord = (ch) => /[\p{L}\p{N}\p{M}'’_-]/u.test(ch);
    let s = Math.min(index, text.length), e = s;
    while (s > 0 && isWord(text[s - 1])) s--;
    while (e < text.length && isWord(text[e])) e++;
    if (s === e && index < text.length) e = index + 1;
    return [s, e];
  }
  function paragraphRangeAt(text, index) {
    const s = text.lastIndexOf("\n", index - 1) + 1;
    let e = text.indexOf("\n", index);
    if (e < 0) e = text.length;
    return [s, e];
  }

  // apps/ZEditor/src/ui/textSelection.js
  var textSelectionStore = { annId: null, start: 0, end: 0 };

  // apps/ZEditor/src/ui/canvas/AnnotationText.jsx
  var { useRef: useRef14, useState: useState16, useMemo: useMemo2, useEffect: useEffect12, useLayoutEffect: useLayoutEffect2 } = React;
  function spanCss(seg) {
    const span = seg.span || {};
    if (!seg.color && span.underline == null && span.strike == null) return void 0;
    const lines = [span.underline && "underline", span.strike && "line-through"].filter(Boolean);
    return { color: seg.color || void 0, textDecorationLine: span.underline != null || span.strike != null ? lines.join(" ") || "none" : void 0 };
  }
  function AnnotationText({ ann, tool, isSelected, isEditing, showHandles, zoom, onPress, onStartEdit, onFinishEdit, onUpdate, onLinkNext }) {
    const boxRef = useRef14(null);
    const inputRef = useRef14(null);
    const pendingCaretRef = useRef14(null);
    const liveCanvasRef = useRef14(null);
    const dragRef = useRef14(null);
    const goalXRef = useRef14(null);
    const [sel, setSel] = useState16({ start: 0, end: 0, dir: "forward" });
    useLayoutEffect2(() => {
      if (!isEditing || !inputRef.current) return;
      const caret = pendingCaretRef.current != null ? pendingCaretRef.current : ann.text.length;
      pendingCaretRef.current = null;
      inputRef.current.focus();
      inputRef.current.setSelectionRange(caret, caret);
    }, [isEditing]);
    function startEditingAt(x, y) {
      pendingCaretRef.current = textOffsetAtPoint(x, y, boxRef.current, ann.text.length);
      onStartEdit(ann.id);
    }
    function handleMouseDown(e) {
      if (isEditing) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      if (tool !== "select" && tool !== "text") return;
      const { clientX, clientY } = e;
      onPress(e, ann, () => {
        if (tool === "text") startEditingAt(clientX, clientY);
      });
    }
    function startResize(handle, e) {
      const orig = { x: ann.x, y: ann.y, width: boxRef.current.offsetWidth, height: boxRef.current.offsetHeight };
      const origFontSize = ann.fontSize || 16;
      const hasSetWidth = Boolean(ann.width);
      const angle = angleOf(ann);
      const dragDelta = dragDeltaFrom(e, zoom, angle);
      trackPointerDrag((ev) => {
        const { dx, dy } = dragDelta(ev);
        if (handle === "s" || handle === "n") {
          const box2 = resizedBox(orig, handle, dx, dy, false, MIN_RESIZE_SIZE, angle);
          onUpdate(ann.id, { x: box2.x, y: box2.y, frameHeight: Math.max(1, Math.round(pxToPt(box2.height))) });
          return;
        }
        if (handle === "e" || handle === "w") {
          const box2 = resizedBox(orig, handle, dx, dy, false, MIN_RESIZE_SIZE, angle);
          onUpdate(ann.id, { x: box2.x, y: box2.y, width: box2.width });
          return;
        }
        const box = resizedBox(orig, handle, dx, dy, true, MIN_RESIZE_SIZE, angle);
        const scaled = { x: box.x, y: box.y, fontSize: Math.max(6, Math.round(origFontSize * box.width / orig.width)) };
        onUpdate(ann.id, hasSetWidth ? { ...scaled, width: box.width } : scaled);
      });
    }
    const look = textLook(ann);
    const hasLetterColors = Boolean(ann.colorRuns && ann.colorRuns.length);
    function rememberSelection(input) {
      textSelectionStore.annId = ann.id;
      textSelectionStore.start = input.selectionStart;
      textSelectionStore.end = input.selectionEnd;
    }
    const typesetEditing = isEditing && usesTypeset(ann);
    const storyFrame = ann.storyHeadId != null;
    const canvasMode = usesCanvasText(ann) && (!isEditing || typesetEditing) && (Boolean(ann.text) || typesetEditing || storyFrame);
    const liveBox = canvasMode ? measureTextBox(ann) : null;
    const canvasMargin = canvasMode ? textCanvasMargin(ann, look) : 0;
    const liveDrawKey = canvasMode ? JSON.stringify({ ...ann, x: 0, y: 0, angle: 0, id: 0, locked: void 0, hidden: void 0, name: void 0, blend: void 0, opacity: void 0 }) : "";
    const typesetLayout = useMemo2(() => typesetEditing ? layoutTextBox(ann) : null, [typesetEditing ? liveDrawKey : ""]);
    function syncSel(input) {
      setSel({ start: input.selectionStart, end: input.selectionEnd, dir: input.selectionDirection || "forward" });
      rememberSelection(input);
    }
    function setRange(input, anchor, focus) {
      input.setSelectionRange(Math.min(anchor, focus), Math.max(anchor, focus), focus < anchor ? "backward" : "forward");
      syncSel(input);
    }
    const pointOf = (e) => ({ x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY });
    function handleSurfaceDown(e) {
      if (e.button !== 0 || !typesetLayout || !inputRef.current) return;
      e.preventDefault();
      e.stopPropagation();
      const input = inputRef.current;
      e.currentTarget.setPointerCapture(e.pointerId);
      const { x, y } = pointOf(e);
      const index = indexAtPoint(typesetLayout, x, y);
      input.focus();
      const backward = input.selectionDirection === "backward";
      const anchor = e.shiftKey ? backward ? input.selectionEnd : input.selectionStart : index;
      dragRef.current = { anchor };
      goalXRef.current = null;
      setRange(input, anchor, index);
    }
    function handleSurfaceMove(e) {
      if (!dragRef.current || !typesetLayout || !inputRef.current) return;
      const { x, y } = pointOf(e);
      setRange(inputRef.current, dragRef.current.anchor, indexAtPoint(typesetLayout, x, y));
    }
    function handleSurfaceUp(e) {
      dragRef.current = null;
      if (e.currentTarget.hasPointerCapture && e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    }
    function handleSurfaceDoubleClick(e) {
      if (!typesetLayout || !inputRef.current) return;
      e.stopPropagation();
      const { x, y } = pointOf(e);
      const [s, end] = wordRangeAt(ann.text, indexAtPoint(typesetLayout, x, y));
      setRange(inputRef.current, s, end);
    }
    function handleSurfaceClick(e) {
      if (e.detail < 3 || !typesetLayout || !inputRef.current) return;
      const { x, y } = pointOf(e);
      const [s, end] = paragraphRangeAt(ann.text, indexAtPoint(typesetLayout, x, y));
      setRange(inputRef.current, s, end);
    }
    function handleTypesetKey(e) {
      if (!typesetEditing || !typesetLayout || e.nativeEvent.isComposing || e.ctrlKey || e.metaKey || e.altKey) return;
      const input = e.target;
      const backward = input.selectionDirection === "backward";
      const anchor = backward ? input.selectionEnd : input.selectionStart;
      const focus = backward ? input.selectionStart : input.selectionEnd;
      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault();
        const goal = goalXRef.current != null ? goalXRef.current : caretRect(typesetLayout, focus).x;
        goalXRef.current = goal;
        const target = moveVertical(typesetLayout, focus, e.key === "ArrowUp" ? -1 : 1, goal, ann.text.length);
        setRange(input, e.shiftKey ? anchor : target, target);
        return;
      }
      if (e.key === "Home" || e.key === "End") {
        e.preventDefault();
        goalXRef.current = null;
        const target = e.key === "Home" ? lineStartAt(typesetLayout, focus) : lineEndAt(typesetLayout, focus);
        setRange(input, e.shiftKey ? anchor : target, target);
        return;
      }
      goalXRef.current = null;
    }
    useEffect12(() => {
      if (!canvasMode) return void 0;
      let cancelled = false;
      (async () => {
        const scale = Math.min(4, Math.max(1, zoom * (window.devicePixelRatio || 1)));
        const offscreen = document.createElement("canvas");
        offscreen.width = Math.ceil((liveBox.width + canvasMargin * 2) * scale);
        offscreen.height = Math.ceil((liveBox.height + canvasMargin * 2) * scale);
        const shadowDirection = controlValues(ann, SHADOW_EFFECT.controls).shadowDirection - angleOf(ann);
        await drawTextOnCanvas(offscreen.getContext("2d"), { ...ann, x: canvasMargin, y: canvasMargin, angle: 0, shadowDirection }, scale);
        const canvas = liveCanvasRef.current;
        if (cancelled || !canvas) return;
        canvas.width = offscreen.width;
        canvas.height = offscreen.height;
        canvas.getContext("2d").drawImage(offscreen, 0, 0);
      })();
      return () => {
        cancelled = true;
      };
    }, [liveDrawKey, zoom, canvasMode, typesetEditing]);
    const decorations = [ann.underline && "underline", look.strike !== "none" && "line-through"].filter(Boolean);
    const style = {
      left: ann.x,
      top: ann.y,
      fontFamily: ann.fontFamily ? `'${ann.fontFamily}', sans-serif` : void 0,
      fontSize: (ann.fontSize || 16) + "px",
      fontWeight: ann.bold ? 700 : 400,
      fontStyle: ann.italic ? "italic" : "normal",
      lineHeight: look.lineHeight,
      letterSpacing: look.letterSpacingPx ? look.letterSpacingPx + "px" : void 0,
      textTransform: { upper: "uppercase", lower: "lowercase", title: "capitalize" }[look.textCase],
      fontVariantCaps: look.textCase === "small" ? "small-caps" : void 0,
      textDecorationLine: decorations.length ? decorations.join(" ") : "none",
      textDecorationStyle: look.strike === "double" || look.strike === "wavy" ? look.strike : "solid",
      textDecorationColor: look.color,
      color: ann.color,
      textAlign: ann.align || "left",
      padding: `${look.padY}px ${look.padX}px`,
      mixBlendMode: blendOf(ann) !== "normal" ? blendOf(ann) : void 0,
      opacity: opacityOf(ann) < 1 ? opacityOf(ann) : void 0,
      // the whole box, like Export's layer (drawAnnotation.js)
      transform: rotationCss(ann)
    };
    if (look.label && !canvasMode) {
      style.background = rgbaCss(look.label.labelColor, look.label.labelAlpha);
      style.borderRadius = look.label.labelRadius;
    }
    if (ann.width) style.width = ann.width;
    else style.maxWidth = AUTO_TEXT_MAX_WIDTH;
    if (canvasMode) {
      style.width = liveBox.width;
      style.height = liveBox.height;
      style.maxWidth = void 0;
      style.color = "transparent";
    }
    const gradientStyle = look.gradient ? {
      backgroundImage: rectFillCss(textGradientView(ann, look)),
      WebkitBackgroundClip: "text",
      backgroundClip: "text",
      WebkitTextFillColor: "transparent"
    } : null;
    const fillStyle = {};
    if (look.photo) {
      const area = measureTextBox(ann);
      const place = photoPlacement(look.photo, area.contentWidth, area.contentHeight);
      Object.assign(fillStyle, {
        backgroundImage: `url("${look.photo.src}")`,
        backgroundSize: `${place.width}px ${place.height}px`,
        backgroundPosition: `${place.left}px ${place.top}px`,
        backgroundRepeat: "no-repeat",
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        WebkitTextFillColor: "transparent",
        // Fades only the photo letters: when faded, this block is always the
        // copy laid over the text-colour copy (see `layered`).
        opacity: look.photo.fillPhotoAlpha < 100 ? look.photo.fillPhotoAlpha / 100 : void 0
      });
    } else if (gradientStyle) {
      Object.assign(fillStyle, gradientStyle);
    } else if (look.fillAlpha < 100) {
      fillStyle.color = rgbaCss(look.color, look.fillAlpha);
    }
    const outlineStyle = {};
    if (look.stroke) {
      outlineStyle.WebkitTextStroke = `${look.stroke.strokeThickness}px ${look.stroke.strokeColor}`;
      outlineStyle.paintOrder = "stroke fill";
    }
    if (look.shadow) {
      const [shadowX, shadowY] = rotatePoint(look.shadow.x, look.shadow.y, -angleOf(ann));
      outlineStyle.textShadow = `${shadowX}px ${shadowY}px ${look.shadow.blur}px ${rgbaCss(look.shadow.color, look.fillAlpha)}`;
    }
    const fadedPhoto = Boolean(look.photo && look.photo.fillPhotoAlpha < 100);
    const baseFillStyle = fadedPhoto ? gradientStyle || { color: rgbaCss(look.color, look.fillAlpha) } : null;
    const layered = Boolean((look.gradient || look.photo) && (look.stroke || look.shadow || fadedPhoto) && ann.text);
    const bodyStyle = layered ? { display: "block", position: "relative" } : { display: "block", ...fillStyle, ...outlineStyle };
    return /* @__PURE__ */ React.createElement(
      "div",
      {
        ref: boxRef,
        "data-ann-id": ann.id,
        className: "ze-ann-text" + (isSelected ? " is-selected" : "") + (isEditing ? " is-editing" : "") + (ann.locked ? " is-locked" : "") + (storyFrame ? " is-story-frame" : ""),
        style,
        onMouseDown: handleMouseDown,
        onDoubleClick: (e) => {
          e.stopPropagation();
          if (tool === "select" && !isEditing) startEditingAt(e.clientX, e.clientY);
        }
      },
      typesetEditing && typesetLayout ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
        "canvas",
        {
          ref: liveCanvasRef,
          className: "ze-ann-text-canvas",
          style: { left: -(canvasMargin + TEXT_BORDER_PX), top: -(canvasMargin + TEXT_BORDER_PX), width: liveBox.width + canvasMargin * 2, height: liveBox.height + canvasMargin * 2 }
        }
      ), /* @__PURE__ */ React.createElement(
        "div",
        {
          className: "ze-typeset-surface",
          style: { left: -TEXT_BORDER_PX, top: -TEXT_BORDER_PX, width: liveBox.width, height: liveBox.height },
          onPointerDown: handleSurfaceDown,
          onPointerMove: handleSurfaceMove,
          onPointerUp: handleSurfaceUp,
          onPointerCancel: handleSurfaceUp,
          onMouseDown: (e) => {
            e.preventDefault();
            e.stopPropagation();
          },
          onDoubleClick: handleSurfaceDoubleClick,
          onClick: handleSurfaceClick
        },
        selectionRects(typesetLayout, sel.start, sel.end).map((r, i) => /* @__PURE__ */ React.createElement("div", { key: i, className: "ze-typeset-selection", style: { left: r.x, top: r.y, width: r.width, height: r.height } })),
        sel.start === sel.end && (() => {
          const c = caretRect(typesetLayout, sel.end);
          return /* @__PURE__ */ React.createElement("div", { key: sel.end + ":" + ann.text.length, className: "ze-typeset-caret", style: { left: c.x, top: c.y, height: c.height, background: ann.color || "#1a1a1a" } });
        })()
      ), /* @__PURE__ */ React.createElement(
        "textarea",
        {
          ref: inputRef,
          className: "ze-ann-text-input ze-typeset-input",
          value: ann.text,
          spellCheck: "false",
          onChange: (e) => {
            const text = e.target.value;
            const patch = { text };
            if (hasLetterColors) patch.colorRuns = adjustRunsForEdit(ann.colorRuns, ann.text, text);
            goalXRef.current = null;
            syncSel(e.target);
            onUpdate(ann.id, patch);
          },
          onSelect: (e) => syncSel(e.target),
          onFocus: (e) => syncSel(e.target),
          onBlur: (e) => {
            rememberSelection(e.target);
            onFinishEdit();
          },
          onMouseDown: (e) => e.stopPropagation(),
          onKeyDown: (e) => {
            if (e.key === "Escape") {
              e.stopPropagation();
              onFinishEdit();
              return;
            }
            handleTypesetKey(e);
          }
        }
      )) : isEditing ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("span", { className: "ze-ann-text-mirror" + (hasLetterColors ? " is-visible" : "") }, hasLetterColors ? colorSegments(ann.text + "​", ann.colorRuns).map((seg, i) => /* @__PURE__ */ React.createElement("span", { key: i, style: spanCss(seg) }, seg.text)) : ann.text + "​"), /* @__PURE__ */ React.createElement(
        "textarea",
        {
          ref: inputRef,
          className: "ze-ann-text-input",
          style: hasLetterColors ? { color: "transparent", caretColor: ann.color } : void 0,
          value: ann.text,
          spellCheck: "false",
          onChange: (e) => {
            const text = e.target.value;
            const patch = { text };
            if (hasLetterColors) patch.colorRuns = adjustRunsForEdit(ann.colorRuns, ann.text, text);
            rememberSelection(e.target);
            onUpdate(ann.id, patch);
          },
          onSelect: (e) => rememberSelection(e.target),
          onBlur: (e) => {
            rememberSelection(e.target);
            onFinishEdit();
          },
          onMouseDown: (e) => e.stopPropagation(),
          onKeyDown: (e) => {
            if (e.key === "Escape") {
              e.stopPropagation();
              onFinishEdit();
            }
          }
        }
      )) : canvasMode ? /* @__PURE__ */ React.createElement(
        "canvas",
        {
          ref: liveCanvasRef,
          className: "ze-ann-text-canvas",
          style: { left: -(canvasMargin + TEXT_BORDER_PX), top: -(canvasMargin + TEXT_BORDER_PX), width: liveBox.width + canvasMargin * 2, height: liveBox.height + canvasMargin * 2 }
        }
      ) : /* @__PURE__ */ React.createElement("span", { style: bodyStyle }, layered && /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true", style: { display: "block", position: "absolute", left: 0, top: 0, width: "100%", color: "transparent", ...outlineStyle } }, ann.text), layered && baseFillStyle && /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true", style: { display: "block", position: "absolute", left: 0, top: 0, width: "100%", ...baseFillStyle } }, ann.text), layered ? /* @__PURE__ */ React.createElement("span", { style: { display: "block", position: "relative", ...fillStyle } }, ann.text) : ann.text ? ann.text : /* @__PURE__ */ React.createElement("span", { className: "ze-ann-text-placeholder" }, "Text")),
      (() => {
        const overflow = canvasMode && liveBox && liveBox.overflow;
        const canLink = onLinkNext && !ann.ransom && !ann.curve && ann.vertical !== "stacked";
        const isFrame = usesTypeset(ann) && (ann.frameHeight > 0 || storyFrame);
        const linkNext = (e) => {
          e.preventDefault();
          e.stopPropagation();
          onLinkNext(ann);
        };
        const stop2 = (e) => {
          e.preventDefault();
          e.stopPropagation();
        };
        if (ann.storyNextId != null) {
          return isSelected ? /* @__PURE__ */ React.createElement("span", { className: "ze-text-port ze-text-port-out is-linked", title: "The text continues in the next frame" }, "▸") : null;
        }
        if (overflow) {
          return canLink ? /* @__PURE__ */ React.createElement("span", { className: "ze-text-port ze-text-port-out is-overflow", title: "This text doesn't fit. Click to continue it in a new frame (or make the frame taller, add columns, or shorten the text).", onMouseDown: stop2, onClick: linkNext }, "+") : /* @__PURE__ */ React.createElement("span", { className: "ze-text-overflow", title: "This text doesn't fit: the rest is hidden. Make the frame taller, add columns, or shorten the text." }, "+");
        }
        if (isSelected && isFrame && canLink && !isEditing) {
          return /* @__PURE__ */ React.createElement("span", { className: "ze-text-port ze-text-port-out", title: "Link to a new frame the text can continue into", onMouseDown: stop2, onClick: linkNext }, "+");
        }
        return null;
      })(),
      storyFrame && ann.storyPrevId != null && isSelected && /* @__PURE__ */ React.createElement("span", { className: "ze-text-port ze-text-port-in is-linked", title: "Continued from the previous frame" }, "▸"),
      isEditing && !ann.locked && // While typing, the box's edges move it (the text inside keeps the caret and selection).
      ["n", "e", "s", "w"].map((side) => /* @__PURE__ */ React.createElement("div", { key: side, className: "ze-text-move-edge ze-text-move-edge-" + side, title: "Drag to move", onMouseDown: (e) => onPress(e, ann) })),
      showHandles && /* @__PURE__ */ React.createElement(ResizeHandles, { handles: !ann.ransom && !ann.curve && ann.vertical !== "stacked" ? [...TEXT_RESIZE_HANDLES, "n", "s"] : TEXT_RESIZE_HANDLES, onStart: startResize, onRotate: (angle) => onUpdate(ann.id, { angle }) })
    );
  }

  // apps/ZEditor/src/ui/canvas/TraceSvg.jsx
  var OUTLINE_COLOR = "#2b7fff";
  function TraceSvg({ ann, view }) {
    const shown = view || normalizeTraceSettings(ann.trace).view;
    const box = { width: "100%", height: "100%", display: "block" };
    if (!ann.traceW || !ann.traceH) return null;
    const outlines = shown === "outlines" || shown === "outlinesSource";
    const showSource = (shown === "source" || shown === "outlinesSource") && ann.traceSource;
    return /* @__PURE__ */ React.createElement(React.Fragment, null, showSource && /* @__PURE__ */ React.createElement("img", { src: ann.traceSource, alt: "", draggable: "false", style: { ...box, position: "absolute", inset: 0, opacity: shown === "outlinesSource" ? 0.45 : 1 } }), shown !== "source" && /* @__PURE__ */ React.createElement("svg", { viewBox: `0 0 ${ann.traceW} ${ann.traceH}`, preserveAspectRatio: "none", style: { ...box, position: "absolute", inset: 0, overflow: "visible" }, "aria-hidden": "true" }, outlines ? (ann.paths || []).map((p, i) => /* @__PURE__ */ React.createElement("path", { key: i, d: p.d, fill: "none", stroke: OUTLINE_COLOR, strokeWidth: "1", vectorEffect: "non-scaling-stroke" })) : traceDrawList(ann).map((item, i) => /* @__PURE__ */ React.createElement(
      "path",
      {
        key: i,
        d: item.d,
        fill: item.fill || "none",
        stroke: item.stroke || void 0,
        strokeWidth: item.stroke ? item.strokeWidth : void 0,
        strokeLinejoin: "round",
        strokeLinecap: "round"
      }
    ))));
  }

  // apps/ZEditor/src/ui/canvas/AnnotationTrace.jsx
  function AnnotationTrace({ ann, tool, isSelected, showHandles, onPress, onUpdate, zoom }) {
    function startResize(handle, e) {
      const orig = { x: ann.x, y: ann.y, width: ann.width, height: ann.height };
      const dragDelta = dragDeltaFrom(e, zoom, angleOf(ann));
      trackPointerDrag((ev) => {
        const { dx, dy } = dragDelta(ev);
        onUpdate(ann.id, resizedBox(orig, handle, dx, dy, !ev.shiftKey, MIN_RESIZE_SIZE, angleOf(ann)));
      });
    }
    return /* @__PURE__ */ React.createElement(
      "div",
      {
        "data-ann-id": ann.id,
        className: "ze-ann-image ze-ann-trace" + (isSelected ? " is-selected" : "") + (ann.locked ? " is-locked" : ""),
        style: boxOuterStyle(ann),
        onMouseDown: (e) => {
          if (tool === "select") onPress(e, ann);
        }
      },
      /* @__PURE__ */ React.createElement("div", { className: "ze-ann-image-shadow", style: { ...boxGroupStyle(ann), position: "absolute", inset: 0 } }, /* @__PURE__ */ React.createElement(TraceSvg, { ann })),
      showHandles && /* @__PURE__ */ React.createElement(ResizeHandles, { handles: ALL_RESIZE_HANDLES, onStart: startResize, onRotate: (angle) => onUpdate(ann.id, { angle }) })
    );
  }

  // apps/ZEditor/src/ui/canvas/StrokeShape.jsx
  function StrokeShape({ ann, tool, isSelected, onPress }) {
    const isHi = ann.tool === "highlighter";
    const color = ann.color || (isHi ? HIGHLIGHTER_DEFAULTS.color : PEN_DEFAULTS.color);
    const width = ann.strokeWidth || (isHi ? HIGHLIGHTER_DEFAULTS.width : PEN_DEFAULTS.width);
    const taper = ann.taper || 0;
    const box = bboxOf(ann);
    const handleMouseDown = (e) => {
      if (tool === "select") onPress(e, ann);
    };
    const pickable = tool === "select" && !ann.locked;
    const selectCursor = { cursor: pickable ? "move" : "default" };
    return /* @__PURE__ */ React.createElement(React.Fragment, null, taper > 0 ? /* @__PURE__ */ React.createElement(
      "path",
      {
        "data-ann-id": ann.id,
        d: taperedPathD(ann.points, width, taper),
        fill: color,
        fillOpacity: isHi ? 0.45 : 1,
        stroke: "none",
        style: { pointerEvents: pickable ? "fill" : "none", ...selectCursor },
        onMouseDown: handleMouseDown
      }
    ) : /* @__PURE__ */ React.createElement(
      "path",
      {
        "data-ann-id": ann.id,
        d: smoothPathD(ann.points),
        fill: "none",
        stroke: color,
        strokeWidth: width,
        strokeOpacity: isHi ? 0.45 : 1,
        strokeLinecap: "round",
        strokeLinejoin: "round",
        style: { pointerEvents: pickable ? "stroke" : "none", ...selectCursor },
        onMouseDown: handleMouseDown
      }
    ), isSelected && /* @__PURE__ */ React.createElement(
      "rect",
      {
        x: box.x - 6,
        y: box.y - 6,
        width: box.width + 12,
        height: box.height + 12,
        fill: "none",
        stroke: "#dd531a",
        strokeDasharray: "4 3",
        strokeWidth: "1.5",
        pointerEvents: "none"
      }
    ));
  }

  // apps/ZEditor/src/ui/canvas/AnnotationItem.jsx
  function AnnotationItem({
    ann: a,
    tool,
    zoom,
    pageSize,
    pageFilter,
    isSelected,
    showHandles,
    isEditing,
    isCropping,
    isEraseTarget,
    onPress,
    onUpdate,
    onToggleCrop,
    onStartTextEdit,
    onFinishTextEdit,
    onLinkNextFrame
  }) {
    if (a.type === "image") {
      return /* @__PURE__ */ React.createElement(
        AnnotationImage,
        {
          ann: a,
          tool,
          isSelected,
          showHandles,
          isCropping,
          isEraseTarget,
          onPress,
          onUpdate,
          onToggleCrop,
          pageFilter,
          zoom
        }
      );
    }
    if (a.type === "rect") {
      return /* @__PURE__ */ React.createElement(
        AnnotationRect,
        {
          ann: a,
          tool,
          isSelected,
          showHandles,
          onPress,
          onUpdate,
          zoom
        }
      );
    }
    if (a.type === "trace") {
      return /* @__PURE__ */ React.createElement(AnnotationTrace, { ann: a, tool, isSelected, showHandles, onPress, onUpdate, zoom });
    }
    if (a.type === "text") {
      return /* @__PURE__ */ React.createElement(
        AnnotationText,
        {
          ann: a,
          tool,
          isSelected,
          isEditing,
          showHandles,
          onPress,
          onStartEdit: onStartTextEdit,
          onFinishEdit: onFinishTextEdit,
          onUpdate,
          onLinkNext: onLinkNextFrame,
          zoom
        }
      );
    }
    const strokeStyle = {
      mixBlendMode: blendOf(a) !== "normal" ? blendOf(a) : void 0,
      opacity: opacityOf(a) < 1 ? opacityOf(a) : void 0
    };
    return /* @__PURE__ */ React.createElement("svg", { className: "ze-stroke-svg", width: pageSize.width, height: pageSize.height, style: strokeStyle }, /* @__PURE__ */ React.createElement(StrokeShape, { ann: a, tool, isSelected, onPress }));
  }

  // apps/ZEditor/src/ui/canvas/ClipWrap.jsx
  var { useState: useState17, useEffect: useEffect13, useRef: useRef15 } = React;
  var MASK_MAX_SCALE = 2;
  var MASK_MAX_PIXELS = 16e6;
  function shapeSignature(base, pageSize) {
    const summary = { ...base };
    for (const key of ["src", "fillSrc"]) {
      if (typeof summary[key] === "string") summary[key] = summary[key].length + ":" + summary[key].slice(-48);
    }
    return JSON.stringify(summary) + "@" + pageSize.width + "x" + pageSize.height;
  }
  function ClipWrap({ base, pageSize, pageFilter, blend, children }) {
    const [maskUrl, setMaskUrl] = useState17(null);
    const urlRef = useRef15(null);
    const signature = shapeSignature(base, pageSize);
    useEffect13(() => {
      let cancelled = false;
      const scale = Math.min(MASK_MAX_SCALE, Math.sqrt(MASK_MAX_PIXELS / Math.max(1, pageSize.width * pageSize.height)));
      clipMaskCanvas(base, pageSize.width * scale, pageSize.height * scale, scale, pageFilter).then((canvas) => {
        if (cancelled) return;
        canvas.toBlob((blob) => {
          if (!blob) return;
          const url = URL.createObjectURL(blob);
          if (cancelled) {
            URL.revokeObjectURL(url);
            return;
          }
          const old = urlRef.current;
          urlRef.current = url;
          setMaskUrl(url);
          if (old) setTimeout(() => URL.revokeObjectURL(old), 1e3);
        }, "image/png");
      }).catch(() => {
      });
      return () => {
        cancelled = true;
      };
    }, [signature]);
    useEffect13(() => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    }, []);
    const mask = maskUrl ? `url(${maskUrl})` : void 0;
    return /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "ze-clip-wrap",
        style: {
          width: pageSize.width,
          height: pageSize.height,
          WebkitMaskImage: mask,
          maskImage: mask,
          mixBlendMode: blend && blend !== "normal" ? blend : void 0,
          visibility: maskUrl ? void 0 : "hidden"
          // until the mask is ready, so the image never flashes unclipped
        }
      },
      children
    );
  }

  // apps/ZEditor/src/ui/canvas/MeasureOverlay.jsx
  function MeasureOverlay({ measure, pageSize, zoom, unit, onHandleDown }) {
    const { a, b } = measure;
    const pt = measureBetween({ x: a.x / MAIN_SCALE, y: a.y / MAIN_SCALE }, { x: b.x / MAIN_SCALE, y: b.y / MAIN_SCALE });
    const back = `scale(${1 / zoom})`;
    const handle = (which, p) => /* @__PURE__ */ React.createElement(
      "div",
      {
        key: which,
        className: "ze-measure-handle" + (measure.pending ? " is-waiting" : ""),
        style: { left: p.x, top: p.y, transform: `translate(-50%, -50%) ${back}` },
        onMouseDown: measure.pending ? void 0 : (e) => onHandleDown(e, which)
      }
    );
    return /* @__PURE__ */ React.createElement(React.Fragment, null, !measure.pending && /* @__PURE__ */ React.createElement("svg", { className: "ze-measure-svg", width: pageSize.width, height: pageSize.height, "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("line", { x1: a.x, y1: a.y, x2: b.x, y2: b.y, className: "ze-measure-halo", vectorEffect: "non-scaling-stroke" }), /* @__PURE__ */ React.createElement("line", { x1: a.x, y1: a.y, x2: b.x, y2: b.y, className: "ze-measure-line", vectorEffect: "non-scaling-stroke" })), handle("a", a), !measure.pending && handle("b", b), !measure.pending && pt.length > 0 && // Beside the far end, flipped to its other side near the page's right or bottom edge so it stays in view.
    /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "ze-measure-readout",
        style: {
          left: b.x,
          top: b.y,
          transform: `${back} translate(${b.x > pageSize.width * 0.6 ? "calc(-100% - 12px)" : "12px"}, ${b.y > pageSize.height * 0.9 ? "calc(-100% - 12px)" : "12px"})`
        }
      },
      /* @__PURE__ */ React.createElement("strong", null, formatInUnit(pt.length, unit)),
      /* @__PURE__ */ React.createElement("span", null, "Δx ", formatInUnit(Math.abs(pt.dx), unit), " · Δy ", formatInUnit(Math.abs(pt.dy), unit), " · ", pt.angle, "°")
    ));
  }

  // apps/ZEditor/src/ui/canvas/ThreadLinks.jsx
  var frameSize = (v) => measureTextBox(v);
  var stop = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };
  function ThreadLinks({ views, pageSize, selectedIds, zoom, onUnlink }) {
    const links = threadLinks(views, frameSize);
    if (!links.length) return null;
    const selected = new Set(selectedIds.filter((id) => id != null));
    const activeHeads = new Set(views.filter((v) => selected.has(v.id) && v.storyHeadId != null).map((v) => v.storyHeadId));
    const k = 1 / (zoom || 1);
    return /* @__PURE__ */ React.createElement("svg", { className: "ze-thread-links", width: pageSize.width, height: pageSize.height }, links.map((l) => {
      const active = activeHeads.has(l.headId);
      const mx = (l.x1 + l.x2) / 2, my = (l.y1 + l.y2) / 2;
      const unlink = (e) => {
        stop(e);
        const view = views.find((v) => v.id === l.id);
        if (view && onUnlink) onUnlink(view);
      };
      return /* @__PURE__ */ React.createElement("g", { key: l.id, className: "ze-thread-link" + (active ? " is-active" : "") }, /* @__PURE__ */ React.createElement("line", { className: "ze-thread-link-hit", x1: l.x1, y1: l.y1, x2: l.x2, y2: l.y2, strokeWidth: 10 * k, onMouseDown: stop }), /* @__PURE__ */ React.createElement("line", { className: "ze-thread-link-line", x1: l.x1, y1: l.y1, x2: l.x2, y2: l.y2 }), /* @__PURE__ */ React.createElement("circle", { className: "ze-thread-link-end", cx: l.x1, cy: l.y1, r: 2.5 * k }), /* @__PURE__ */ React.createElement("circle", { className: "ze-thread-link-end", cx: l.x2, cy: l.y2, r: 2.5 * k }), onUnlink && /* @__PURE__ */ React.createElement("g", { className: "ze-thread-unlink", transform: `translate(${mx} ${my}) scale(${k})`, onMouseDown: stop, onClick: unlink, role: "button", "aria-label": "Unlink these text boxes" }, /* @__PURE__ */ React.createElement("title", null, "Unlink: the text stops flowing into the next box"), /* @__PURE__ */ React.createElement("circle", { r: "10" }), /* @__PURE__ */ React.createElement("text", { textAnchor: "middle", dominantBaseline: "central" }, "✂")));
    }));
  }

  // apps/ZEditor/src/ui/canvas/GuidesOverlay.jsx
  function GuidesOverlay({ width, height, format, marginIn, bleedIn }) {
    const preset = GUIDE_FORMAT_PRESETS.find((p) => p.key === format) || GUIDE_FORMAT_PRESETS[0];
    const toPx = (inches) => inches * POINTS_PER_INCH * MAIN_SCALE;
    const trimW = preset.widthIn ? Math.min(width, toPx(preset.widthIn)) : width;
    const trimH = preset.heightIn ? Math.min(height, toPx(preset.heightIn)) : height;
    const trimX = (width - trimW) / 2;
    const trimY = (height - trimH) / 2;
    const showTrim = preset.key !== "match";
    const marginPx = toPx(marginIn || 0);
    const marginW = trimW - marginPx * 2, marginH = trimH - marginPx * 2;
    const showMargin = marginPx > 0 && marginW > 0 && marginH > 0;
    const bleedPx = toPx(bleedIn || 0);
    const showBleed = bleedPx > 0;
    return /* @__PURE__ */ React.createElement("svg", { className: "ze-guides-overlay", width, height, "aria-hidden": "true" }, showBleed && /* @__PURE__ */ React.createElement(
      "rect",
      {
        x: trimX - bleedPx,
        y: trimY - bleedPx,
        width: trimW + bleedPx * 2,
        height: trimH + bleedPx * 2,
        fill: "none",
        stroke: "#dd531a",
        strokeDasharray: "2 4",
        strokeWidth: "1",
        opacity: "0.6"
      }
    ), showTrim && /* @__PURE__ */ React.createElement("rect", { x: trimX, y: trimY, width: trimW, height: trimH, fill: "none", stroke: "#ffffff", strokeDasharray: "5 3", strokeWidth: "1.25", opacity: "0.85" }), showMargin && /* @__PURE__ */ React.createElement(
      "rect",
      {
        x: trimX + marginPx,
        y: trimY + marginPx,
        width: marginW,
        height: marginH,
        fill: "none",
        stroke: "#dd531a",
        strokeDasharray: "4 3",
        strokeWidth: "1.25"
      }
    ));
  }

  // apps/ZEditor/src/ui/canvas/CanvasOverlays.jsx
  function LiveStroke({ drawing, pageSize }) {
    return /* @__PURE__ */ React.createElement("svg", { className: "ze-stroke-svg", width: pageSize.width, height: pageSize.height }, drawing && (drawing.taper > 0 ? /* @__PURE__ */ React.createElement(
      "path",
      {
        d: taperedPathD(drawing.points, drawing.width, drawing.taper),
        fill: drawing.color,
        fillOpacity: drawing.tool === "highlighter" ? 0.45 : 1,
        stroke: "none"
      }
    ) : /* @__PURE__ */ React.createElement(
      "path",
      {
        d: smoothPathD(drawing.points),
        fill: "none",
        stroke: drawing.color,
        strokeWidth: drawing.width,
        strokeOpacity: drawing.tool === "highlighter" ? 0.45 : 1,
        strokeLinecap: "round",
        strokeLinejoin: "round"
      }
    )));
  }
  function BrushCursor({ pos, softEraser }) {
    return /* @__PURE__ */ React.createElement("div", { className: "ze-brush-cursor", style: { left: pos.x, top: pos.y, width: softEraser.size, height: softEraser.size } }, softEraser.softness > 0 && softEraser.softness < 100 && /* @__PURE__ */ React.createElement("div", { className: "ze-brush-cursor-core", style: { width: `${100 - softEraser.softness}%`, height: `${100 - softEraser.softness}%` } }));
  }
  function PageOverlays({ pageSize, numberSpec, guidesOn, guideFormat, guideMarginIn, guideBleedIn, centerGuideOn }) {
    if (pageSize.width <= 0) return null;
    return /* @__PURE__ */ React.createElement(React.Fragment, null, numberSpec && /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "ze-page-number",
        style: {
          fontSize: numberSpec.size * MAIN_SCALE,
          color: numberSpec.color,
          [numberSpec.vertical]: numberSpec.marginIn * 72 * MAIN_SCALE,
          ...numberSpec.horizontal === "center" ? { left: 0, right: 0, textAlign: "center" } : { [numberSpec.horizontal]: numberSpec.marginIn * 72 * MAIN_SCALE }
        }
      },
      numberSpec.text
    ), guidesOn && /* @__PURE__ */ React.createElement(
      GuidesOverlay,
      {
        width: pageSize.width,
        height: pageSize.height,
        format: guideFormat,
        marginIn: guideMarginIn,
        bleedIn: guideBleedIn
      }
    ), centerGuideOn && // The page's vertical middle — where a two-page spread folds.
    /* @__PURE__ */ React.createElement("svg", { className: "ze-guides-overlay", width: pageSize.width, height: pageSize.height, "aria-hidden": "true" }, /* @__PURE__ */ React.createElement(
      "line",
      {
        x1: pageSize.width / 2,
        y1: 0,
        x2: pageSize.width / 2,
        y2: pageSize.height,
        stroke: "#1d9bf0",
        strokeDasharray: "6 4",
        strokeWidth: "1.25"
      }
    )));
  }

  // apps/ZEditor/src/ui/canvas/SelectionTurn.jsx
  function selectionTurnFor({ tool, annotations, selectedAnnId, selectedAnnIds, editingAnnId }) {
    const selectedItems = tool === "select" ? annotations.filter((a) => (a.id === selectedAnnId || selectedAnnIds.includes(a.id)) && !a.hidden && !a.locked) : [];
    const needsSelectionKnob = selectedItems.length > 1 || selectedItems.length === 1 && selectedItems[0].type === "stroke";
    if (!needsSelectionKnob || editingAnnId) return null;
    const bounds = selectedItems.map(annotationBounds);
    const x0 = Math.min(...bounds.map((b) => b.x)), y0 = Math.min(...bounds.map((b) => b.y));
    const x1 = Math.max(...bounds.map((b) => b.x + b.width)), y1 = Math.max(...bounds.map((b) => b.y + b.height));
    return { items: selectedItems, box: { x: x0, y: y0, width: x1 - x0, height: y1 - y0 }, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
  }
  function SelectionTurnKnob({ turn, zoom, toPagePoint, onRotateAnnotations }) {
    function startSelectionTurn(e) {
      e.preventDefault();
      e.stopPropagation();
      const { items, cx, cy } = turn;
      const pointerAngle = (ev) => {
        const p = toPagePoint(ev);
        return Math.atan2(p.y - cy, p.x - cx) * 180 / Math.PI;
      };
      const startAngle = pointerAngle(e);
      trackPointerDrag((ev) => {
        let delta = pointerAngle(ev) - startAngle;
        delta = ev.shiftKey ? Math.round(delta / 15) * 15 : delta;
        onRotateAnnotations(items, delta, cx, cy);
      });
    }
    return /* @__PURE__ */ React.createElement(React.Fragment, null, turn.items.length > 1 && /* @__PURE__ */ React.createElement("div", { className: "ze-group-outline", style: { left: turn.box.x, top: turn.box.y, width: turn.box.width, height: turn.box.height } }), /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "ze-rotate-handle",
        title: "Rotate the selection (hold Shift to snap to 15°)",
        style: { left: turn.cx, top: turn.box.y - 22 / zoom },
        onMouseDown: startSelectionTurn
      }
    ));
  }

  // apps/ZEditor/src/ui/canvas/magicEraseGesture.js
  function magicEraseAt(e, { annotations, toPagePoint, onMagicClick }) {
    e.preventDefault();
    const p = toPagePoint(e);
    for (let i = annotations.length - 1; i >= 0; i--) {
      const a = annotations[i];
      if (a.type !== "image" || a.hidden || a.locked) continue;
      const hit = imagePixelAt(a, p.x, p.y);
      if (hit.inside) {
        onMagicClick(a, hit);
        return;
      }
    }
  }

  // apps/ZEditor/src/ui/canvas/MarqueeOverlay.jsx
  function MarqueeOverlay({ region, zoom, pageSize, hover, toPagePoint, onChange }) {
    if (!region) return null;
    if (region.kind === "polygon") return /* @__PURE__ */ React.createElement(PolygonMarquee, { region, zoom, pageSize, hover, toPagePoint, onChange });
    return /* @__PURE__ */ React.createElement(RectMarquee, { region, zoom, onChange });
  }
  function RectMarquee({ region, zoom, onChange }) {
    const angle = region.angle || 0;
    function startMove(e) {
      e.preventDefault();
      e.stopPropagation();
      const original = region;
      const dragDelta = dragDeltaFrom(e, zoom);
      trackPointerDrag((ev) => {
        const { dx, dy } = dragDelta(ev);
        onChange(translatedMarquee(original, dx, dy));
      });
    }
    function startResize(handle, e) {
      const original = region;
      const dragDelta = dragDeltaFrom(e, zoom, angle);
      trackPointerDrag((ev) => {
        const { dx, dy } = dragDelta(ev);
        onChange({ ...original, ...resizedBox(original, handle, dx, dy, ev.shiftKey, MARQUEE_MIN_SIZE, angle) });
      });
    }
    return /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "ze-marquee",
        style: { left: region.x, top: region.y, width: region.width, height: region.height, transform: angle ? `rotate(${angle}deg)` : void 0 },
        onMouseDown: startMove
      },
      /* @__PURE__ */ React.createElement(ResizeHandles, { handles: ALL_RESIZE_HANDLES, onStart: startResize, onRotate: (degrees) => onChange({ ...region, angle: degrees }) })
    );
  }
  function PolygonMarquee({ region, zoom, pageSize, hover, toPagePoint, onChange }) {
    const { points, closed } = region;
    const line = 1 / zoom;
    let follow = null;
    if (!closed && hover && points.length) {
      const last = points[points.length - 1];
      follow = hover.shift ? constrainTo45({ x: last[0], y: last[1] }, hover) : hover;
    }
    const corners = points.map(([x, y]) => x + "," + y).join(" ");
    function startMove(e) {
      e.preventDefault();
      e.stopPropagation();
      const original = region;
      const dragDelta = dragDeltaFrom(e, zoom);
      trackPointerDrag((ev) => {
        const { dx, dy } = dragDelta(ev);
        onChange(translatedMarquee(original, dx, dy));
      });
    }
    function pressCorner(index, e) {
      e.preventDefault();
      e.stopPropagation();
      if (!closed) {
        if (index === 0 && points.length >= MIN_POLYGON_POINTS) onChange({ ...region, closed: true });
        return;
      }
      const original = region;
      const dragDelta = dragDeltaFrom(e, zoom);
      trackPointerDrag((ev) => {
        const { dx, dy } = dragDelta(ev);
        onChange({ ...original, points: original.points.map(([x, y], i) => i === index ? [x + dx, y + dy] : [x, y]) });
      });
    }
    function startTurn(e) {
      e.preventDefault();
      e.stopPropagation();
      const original = region;
      const { x: cx, y: cy } = marqueeCenter(original);
      const pointerAngle = (ev) => {
        const p = toPagePoint(ev);
        return Math.atan2(p.y - cy, p.x - cx) * 180 / Math.PI;
      };
      const startAngle = pointerAngle(e);
      trackPointerDrag((ev) => {
        let delta = pointerAngle(ev) - startAngle;
        delta = ev.shiftKey ? Math.round(delta / 15) * 15 : delta;
        onChange(rotatedMarquee(original, delta, cx, cy));
      });
    }
    const bounds = closed ? pointsBounds(points) : null;
    const dashes = { strokeDasharray: `${4 * line} ${4 * line}`, strokeWidth: line, fill: "none", strokeLinejoin: "round" };
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("svg", { className: "ze-marquee-svg", width: pageSize.width, height: pageSize.height, "aria-hidden": "true" }, closed ? /* @__PURE__ */ React.createElement("polygon", { points: corners, stroke: "rgba(255,255,255,0.85)", strokeWidth: line * 3, fill: "none" }) : /* @__PURE__ */ React.createElement("polyline", { points: corners, stroke: "rgba(255,255,255,0.85)", strokeWidth: line * 3, fill: "none" }), closed ? /* @__PURE__ */ React.createElement("polygon", { className: "ze-marquee-poly", points: corners, stroke: "#000", ...dashes, fill: "transparent", onMouseDown: startMove }) : /* @__PURE__ */ React.createElement("polyline", { points: corners, stroke: "#000", ...dashes }), follow && /* @__PURE__ */ React.createElement("line", { x1: points[points.length - 1][0], y1: points[points.length - 1][1], x2: follow.x, y2: follow.y, stroke: "#000", ...dashes })), points.map(([x, y], i) => /* @__PURE__ */ React.createElement(
      "div",
      {
        key: i,
        className: "ze-resize-handle ze-marquee-corner" + (!closed && i === 0 ? " is-first" : ""),
        style: { left: x, top: y },
        title: !closed && i === 0 && points.length >= MIN_POLYGON_POINTS ? "Close the shape" : void 0,
        onMouseDown: (e) => pressCorner(i, e)
      }
    )), closed && /* @__PURE__ */ React.createElement("div", { className: "ze-rotate-handle", title: "Rotate (hold Shift to snap to 15°)", style: { left: bounds.x + bounds.width / 2, top: bounds.y - 22 / zoom }, onMouseDown: startTurn }));
  }

  // apps/ZEditor/src/ui/canvas/marqueeGesture.js
  function startMarqueeDraw(e, { toPagePoint, zoom, onChange }) {
    e.preventDefault();
    const start = toPagePoint(e);
    let drawn = false;
    trackPointerDrag((ev) => {
      const p = toPagePoint(ev);
      if (!drawn && Math.hypot(p.x - start.x, p.y - start.y) * zoom <= DRAG_THRESHOLD) return;
      drawn = true;
      onChange(rectMarquee(dragBox(start, p, ev.shiftKey, ev.altKey)));
    }, () => {
      if (!drawn) onChange(null);
      else onChange((m) => isUsableMarquee(m) ? m : null);
    });
  }
  function pressPolygon(e, { toPagePoint, zoom, region, onChange }) {
    e.preventDefault();
    const raw = toPagePoint(e);
    const open = region && region.kind === "polygon" && !region.closed ? region : null;
    if (!open) {
      onChange(startPolygon(raw));
      return;
    }
    const action = polygonPressAction(open, raw, zoom);
    if (action === "close") {
      onChange({ ...open, closed: true });
      return;
    }
    if (action === "ignore") return;
    const last = open.points[open.points.length - 1];
    onChange(polygonWithPoint(open, e.shiftKey ? constrainTo45({ x: last[0], y: last[1] }, raw) : raw));
  }

  // apps/ZEditor/src/ui/canvas/softEraseGesture.js
  function topImageAt(annotations, p) {
    for (let i = annotations.length - 1; i >= 0; i--) {
      const a = annotations[i];
      if (a.type === "image" && !a.hidden && !a.locked && imagePixelAt(a, p.x, p.y).inside) return a;
    }
    return null;
  }
  function startSoftEraseGesture(e, { annotations, softEraser, layerEl, toPagePoint, onEraseImagePixels, onlyId = null }) {
    e.preventDefault();
    const { size, softness, strength } = softEraser;
    const dabAlpha = 1 - Math.pow(1 - strength / 100, 1 / SOFT_ERASER_DABS_PER_RADIUS);
    const session = { ann: null, canvas: null, ctx: null, img: null, last: null, pending: [], touched: false, done: false };
    function pickImage(p) {
      if (onlyId === null) return topImageAt(annotations, p);
      const a = annotations.find((x) => x.id === onlyId);
      return a && a.type === "image" && !a.hidden && !a.locked && imagePixelAt(a, p.x, p.y).inside ? a : null;
    }
    function dab(p) {
      const hit = imagePixelAt(session.ann, p.x, p.y);
      stampSoftErase(session.ctx, hit.x, hit.y, size / 2 * hit.scaleX, size / 2 * hit.scaleY, softness, dabAlpha);
      session.touched = true;
    }
    function eraseTo(p) {
      if (!session.last) {
        dab(p);
        session.last = p;
        return;
      }
      const step = Math.max(0.5, size / 2 / SOFT_ERASER_DABS_PER_RADIUS);
      const from = session.last;
      const dist = Math.hypot(p.x - from.x, p.y - from.y);
      if (dist < step) return;
      const n = Math.floor(dist / step);
      for (let k = 1; k <= n; k++) {
        const t2 = k * step / dist;
        dab({ x: from.x + (p.x - from.x) * t2, y: from.y + (p.y - from.y) * t2 });
      }
      const t = n * step / dist;
      session.last = { x: from.x + (p.x - from.x) * t, y: from.y + (p.y - from.y) * t };
    }
    async function begin(ann) {
      const source = await loadImageElement(ann.src);
      const canvas = document.createElement("canvas");
      canvas.width = ann.naturalWidth;
      canvas.height = ann.naturalHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
      session.canvas = canvas;
      session.ctx = ctx;
      const img = layerEl && layerEl.querySelector(`[data-ann-id="${ann.id}"] .ze-ann-image-frame > img`);
      if (img) {
        canvas.style.cssText = img.style.cssText;
        canvas.style.pointerEvents = "none";
        img.parentNode.insertBefore(canvas, img.nextSibling);
        img.style.visibility = "hidden";
        session.img = img;
      }
      session.pending.forEach(eraseTo);
      session.pending = [];
      if (session.done) finish();
    }
    function handlePoint(p) {
      if (!session.ann) {
        const ann = pickImage(p);
        if (!ann) return;
        session.ann = ann;
        session.pending.push(p);
        begin(ann).catch(() => {
          session.ann = null;
        });
        return;
      }
      if (!session.ctx) {
        session.pending.push(p);
        return;
      }
      eraseTo(p);
    }
    function finish() {
      const { canvas, img, ann } = session;
      if (!canvas) return;
      if (session.touched) onEraseImagePixels(ann.id, canvas.toDataURL("image/png"));
      if (!img) return;
      let cleaned = false;
      const cleanup = () => {
        if (cleaned) return;
        cleaned = true;
        canvas.remove();
        img.style.visibility = "";
      };
      if (!session.touched) {
        cleanup();
        return;
      }
      img.addEventListener("load", cleanup, { once: true });
      setTimeout(cleanup, 1500);
    }
    handlePoint(toPagePoint(e));
    trackPointerDrag((ev) => handlePoint(toPagePoint(ev)), () => {
      session.done = true;
      if (session.ctx) finish();
    });
  }

  // apps/ZEditor/src/ui/canvas/usePageBackground.js
  var { useState: useState18, useRef: useRef16, useEffect: useEffect14 } = React;
  function usePageBackground(page, pdfDocsRef, pageFilter) {
    const canvasRef = useRef16(null);
    const [canvasSize, setCanvasSize] = useState18({ width: 0, height: 0 });
    useEffect14(() => {
      if (!page) return;
      let cancelled = false;
      (async () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        let w, h;
        if (page.isBlank) {
          const swapped = page.rotation % 180 !== 0;
          w = Math.round((swapped ? page.height : page.width) * MAIN_SCALE);
          h = Math.round((swapped ? page.width : page.height) * MAIN_SCALE);
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, w, h);
        } else {
          const doc = docFor(pdfDocsRef, page);
          if (!doc) return;
          const pdfPage = await doc.getPage(page.pageNumber);
          const viewport = pdfPage.getViewport({ scale: MAIN_SCALE, rotation: page.rotation });
          if (cancelled) return;
          w = viewport.width;
          h = viewport.height;
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          await pdfPage.render({ canvasContext: ctx, viewport }).promise;
        }
        if (cancelled) return;
        applyPageFilter(canvas.getContext("2d"), canvas, pageFilter, 1);
        setCanvasSize({ width: w, height: h });
      })();
      return () => {
        cancelled = true;
      };
    }, [page && page.key, page && page.rotation, pageFilter]);
    return { canvasRef, canvasSize };
  }

  // apps/ZEditor/src/ui/canvas/ComposeCanvas.jsx
  var SNAP_PX = 6;
  var { useState: useState19, useRef: useRef17, useEffect: useEffect15, useLayoutEffect: useLayoutEffect3 } = React;
  function ComposeCanvas({
    pdfDocsRef,
    page,
    guidesOn,
    guideFormat,
    guideMarginIn,
    guideBleedIn,
    centerGuideOn,
    tool,
    pageFilter,
    onionGhostSrc,
    onionSkinOpacity,
    pageNumberSpec: numberSpec,
    penColor,
    penWidth,
    penTaper,
    highlighterColor,
    highlighterWidth,
    highlighterTaper,
    annotations,
    selectedAnnId,
    selectedAnnIds,
    editingAnnId,
    croppingAnnId,
    priorityAnnId,
    onSelectAnnotation,
    onSelectAnnotations,
    onMoveAnnotations,
    onRotateAnnotations,
    onAddText,
    onAddRect,
    onAddStroke,
    onUpdateAnnotation,
    onEraseStroke,
    onToggleCrop,
    onStartTextEdit,
    onFinishTextEdit,
    onLinkNextFrame,
    onUnlinkNextFrame,
    snapGuides,
    eraserMode,
    softEraser,
    onEraseImagePixels,
    magicPreview,
    onMagicClick,
    marquee,
    marqueeShape,
    onMarqueeChange,
    zoom,
    rulerUnit
  }) {
    const { canvasRef, canvasSize } = usePageBackground(page, pdfDocsRef, pageFilter);
    const layerRef = useRef17(null);
    const artboardRef = useRef17(null);
    useLayoutEffect3(() => {
      centerArtboard(artboardRef.current);
    }, [page && page.key, canvasSize.width, canvasSize.height]);
    const [, setWrapTick] = useState19(0);
    useEffect15(() => onWrapShapesChange(() => setWrapTick((t) => t + 1)), []);
    const [dragRect, setDragRect] = useState19(null);
    const drawingRef = useRef17(null);
    const [brushPos, setBrushPos] = useState19(null);
    const [polygonHover, setPolygonHover] = useState19(null);
    const drawingPolygon = tool === "marquee" && Boolean(marquee) && marquee.kind === "polygon" && !marquee.closed;
    const softErasing = tool === "eraser" && eraserMode === "soft";
    const magicErasing = tool === "eraser" && eraserMode === "magic";
    const [, setDrawTick] = useState19(0);
    const [measure, setMeasure] = useState19(null);
    const measureGesture = useRef17(null);
    const measuring = tool === "measure";
    const pageKey = page && page.key;
    useEffect15(() => setMeasure(null), [measuring, pageKey]);
    const [eraseTargetId, setEraseTargetId] = useState19(null);
    useEffect15(() => setEraseTargetId(null), [softErasing, pageKey]);
    const eraseTarget = eraseTargetId !== null && annotations.some((a) => a.id === eraseTargetId && a.type === "image" && !a.hidden && !a.locked) ? eraseTargetId : null;
    function overlayPoint(e) {
      const rect = canvasRef.current.getBoundingClientRect();
      return { x: (e.clientX - rect.left) / zoom, y: (e.clientY - rect.top) / zoom };
    }
    function guideLinesPx() {
      return snapGuides && snapGuides.length ? {
        x: snapGuides.filter((g) => g.axis === "x").map((g) => g.pos * MAIN_SCALE),
        y: snapGuides.filter((g) => g.axis === "y").map((g) => g.pos * MAIN_SCALE)
      } : null;
    }
    function measurePoint(ev, from) {
      let p = overlayPoint(ev);
      const lines = guideLinesPx();
      if (lines && !ev.altKey) {
        const snap2 = snapToGuides({ x0: p.x, y0: p.y, x1: p.x, y1: p.y }, lines, SNAP_PX / zoom);
        p = { x: p.x + snap2.dx, y: p.y + snap2.dy };
      }
      return ev.shiftKey && from ? constrainTo45(from, p) : p;
    }
    function startMeasure(e) {
      e.preventDefault();
      measureGesture.current = null;
      if (measure && measure.pending) {
        setMeasure({ ...measure, b: measurePoint(e, measure.a), pending: false });
        return;
      }
      if (measure) {
        setMeasure(null);
        return;
      }
      const a = measurePoint(e, null);
      const gesture = measureGesture.current = {};
      let moved = false;
      setMeasure({ a, b: a, pending: false });
      trackPointerDrag((ev) => {
        if (measureGesture.current !== gesture) return;
        if (!moved && Math.hypot(ev.clientX - e.clientX, ev.clientY - e.clientY) <= DRAG_THRESHOLD) return;
        moved = true;
        setMeasure({ a, b: measurePoint(ev, a), pending: false });
      }, () => {
        if (!moved && measureGesture.current === gesture) setMeasure({ a, b: a, pending: true });
      });
    }
    function dragMeasureEnd(e, which) {
      e.preventDefault();
      e.stopPropagation();
      const other = which === "a" ? "b" : "a";
      trackPointerDrag((ev) => {
        setMeasure((m) => m ? { ...m, pending: false, [which]: measurePoint(ev, m[other]) } : m);
      });
    }
    function handleOverlayMouseDown(e) {
      if (!page) return;
      if (measuring) {
        startMeasure(e);
        return;
      }
      if (tool === "marquee") {
        if (marqueeShape === "polygon") pressPolygon(e, { toPagePoint: overlayPoint, zoom, region: marquee, onChange: onMarqueeChange });
        else startMarqueeDraw(e, { toPagePoint: overlayPoint, zoom, onChange: onMarqueeChange });
        return;
      }
      if (tool === "pen" || tool === "highlighter") {
        startDrawing(e);
        return;
      }
      if (softErasing && e.shiftKey) {
        e.preventDefault();
        const hit = topImageAt(annotations, overlayPoint(e));
        setEraseTargetId(hit && hit.id !== eraseTarget ? hit.id : null);
        return;
      }
      if (softErasing) {
        startSoftEraseGesture(e, { annotations, softEraser, layerEl: layerRef.current, toPagePoint: overlayPoint, onEraseImagePixels, onlyId: eraseTarget });
        return;
      }
      if (magicErasing) {
        magicEraseAt(e, { annotations, toPagePoint: overlayPoint, onMagicClick });
        return;
      }
      if (tool === "eraser") {
        startStrokeErase(e);
        return;
      }
      e.preventDefault();
      if (editingAnnId !== null) {
        onFinishTextEdit();
        onSelectAnnotation(null);
        return;
      }
      const additive = e.shiftKey;
      if (!additive) onSelectAnnotation(null);
      const start = overlayPoint(e);
      const shape = tool === "rect" || tool === "ellipse";
      let rect = null, lastPoint = null;
      const layout = (shift) => {
        if (!lastPoint) return;
        rect = dragBox(start, lastPoint, shape && shift, false);
        setDragRect(rect);
      };
      const onKey = (ev) => {
        if (ev.key === "Shift") layout(ev.shiftKey);
      };
      if (shape) {
        window.addEventListener("keydown", onKey);
        window.addEventListener("keyup", onKey);
      }
      trackPointerDrag((ev) => {
        const p = overlayPoint(ev);
        if (!rect && Math.hypot(p.x - start.x, p.y - start.y) * zoom <= DRAG_THRESHOLD) return;
        lastPoint = p;
        layout(ev.shiftKey);
      }, () => {
        window.removeEventListener("keydown", onKey);
        window.removeEventListener("keyup", onKey);
        setDragRect(null);
        if (tool === "text") {
          if (rect) onAddText(rect.x, rect.y, Math.max(40, rect.width));
          else onAddText(start.x, start.y);
        } else if (tool === "rect" || tool === "ellipse") {
          onAddRect(rect || {
            ...DEFAULT_RECT_SIZE,
            x: start.x - DEFAULT_RECT_SIZE.width / 2,
            y: start.y - DEFAULT_RECT_SIZE.height / 2
          });
        } else if (rect) {
          onSelectAnnotations(annotationIdsTouching(rect), additive);
        }
      });
    }
    function startDrawing(e) {
      const start = overlayPoint(e);
      const color = tool === "highlighter" ? highlighterColor : penColor;
      const width = tool === "highlighter" ? highlighterWidth : penWidth;
      const taper = tool === "highlighter" ? highlighterTaper : penTaper;
      drawingRef.current = { tool, color, width, taper, points: [[start.x, start.y]] };
      setDrawTick((t) => t + 1);
      trackPointerDrag((ev) => {
        const p = overlayPoint(ev);
        drawingRef.current.points.push([p.x, p.y]);
        setDrawTick((t) => t + 1);
      }, () => {
        if (drawingRef.current && drawingRef.current.points.length > 1) {
          onAddStroke({
            tool: drawingRef.current.tool,
            points: drawingRef.current.points,
            color: drawingRef.current.color,
            strokeWidth: drawingRef.current.width,
            taper: drawingRef.current.taper
          });
        }
        drawingRef.current = null;
        setDrawTick((t) => t + 1);
      });
    }
    function startStrokeErase(e) {
      const erasedIds = /* @__PURE__ */ new Set();
      const tryErase = (pt) => {
        annotations.forEach((a) => {
          if (a.type === "stroke" && !a.hidden && !a.locked && !erasedIds.has(a.id) && strokeHitTest(pt, a)) {
            erasedIds.add(a.id);
            onEraseStroke(a.id);
          }
        });
      };
      tryErase([overlayPoint(e).x, overlayPoint(e).y]);
      trackPointerDrag((ev) => {
        const p = overlayPoint(ev);
        tryErase([p.x, p.y]);
      });
    }
    function annotationIdsTouching(rect) {
      const page2 = canvasRef.current.getBoundingClientRect();
      const left = page2.left + rect.x * zoom, top = page2.top + rect.y * zoom;
      const right = left + rect.width * zoom, bottom = top + rect.height * zoom;
      return [...layerRef.current.querySelectorAll("[data-ann-id]")].filter((el) => {
        const box = el.getBoundingClientRect();
        return box.left < right && box.right > left && box.top < bottom && box.bottom > top;
      }).map((el) => Number(el.dataset.annId)).filter((id) => !annotations.find((a) => a.id === id).locked);
    }
    function itemsBox(ids) {
      const layer = layerRef.current.getBoundingClientRect();
      let box = null;
      for (const id of ids) {
        const el = layerRef.current.querySelector(`[data-ann-id="${id}"]`);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        const b = { x0: (r.left - layer.left) / zoom, y0: (r.top - layer.top) / zoom, x1: (r.right - layer.left) / zoom, y1: (r.bottom - layer.top) / zoom };
        box = box ? { x0: Math.min(box.x0, b.x0), y0: Math.min(box.y0, b.y0), x1: Math.max(box.x1, b.x1), y1: Math.max(box.y1, b.y1) } : b;
      }
      return box;
    }
    function pressAnnotation(e, ann, onPlainClick) {
      e.preventDefault();
      e.stopPropagation();
      if (priorityAnnId !== null && ann.id !== priorityAnnId && !e.ctrlKey && !e.metaKey) {
        const chosen = annotations.find((a) => a.id === priorityAnnId);
        if (chosen && !chosen.hidden && !chosen.locked && hitsItem(chosen, overlayPoint(e))) {
          ann = chosen;
          onPlainClick = void 0;
        }
      }
      if (editingAnnId !== null && editingAnnId !== ann.id) onFinishTextEdit();
      const current = [selectedAnnId, ...selectedAnnIds].filter((id) => id !== null);
      const wasSelected = current.includes(ann.id);
      const single = e.altKey && !e.shiftKey && Boolean(ann.groupId);
      if (single) onSelectAnnotation(ann.id, false, true);
      else if (!wasSelected) onSelectAnnotation(ann.id, e.shiftKey);
      const shiftDeselect = e.shiftKey && wasSelected && !single;
      const mates = withGroupMates(annotations, [ann.id]);
      const movingIds = single ? [ann.id] : wasSelected ? current : e.shiftKey ? [...current, ...mates] : mates;
      const originals = annotations.filter((a) => movingIds.includes(a.id));
      const dragDelta = dragDeltaFrom(e, zoom);
      const guideLines = guideLinesPx();
      const startBox = guideLines ? itemsBox(movingIds) : null;
      let moved = false;
      trackPointerDrag((ev) => {
        let { dx, dy } = dragDelta(ev);
        if (!moved && Math.hypot(dx, dy) * zoom > DRAG_THRESHOLD) moved = true;
        if (moved && startBox && !ev.altKey) {
          const snap2 = snapToGuides({ x0: startBox.x0 + dx, y0: startBox.y0 + dy, x1: startBox.x1 + dx, y1: startBox.y1 + dy }, guideLines, SNAP_PX / zoom);
          dx += snap2.dx;
          dy += snap2.dy;
        }
        if (moved) onMoveAnnotations(originals, dx, dy);
      }, () => {
        if (moved) return;
        if (shiftDeselect) {
          onSelectAnnotation(ann.id, true);
          return;
        }
        if (wasSelected && !e.shiftKey && !single && current.length > 1) onSelectAnnotation(ann.id, false);
        if (onPlainClick) onPlainClick();
      });
    }
    if (!page) {
      return /* @__PURE__ */ React.createElement("div", { className: "preview-empty" }, "No pages yet — load a PDF or start a new document to get started.");
    }
    const pageViews = resolvePageText(magicPreview ? annotations.map((a) => a.id === magicPreview.annId ? { ...a, src: magicPreview.src } : a) : annotations);
    const showHandlesFor = (a) => (tool === "select" || a.id === editingAnnId) && a.id === selectedAnnId && selectedAnnIds.length === 0;
    const selectionTurn = selectionTurnFor({ tool, annotations, selectedAnnId, selectedAnnIds, editingAnnId });
    const cursorClass = tool === "text" ? "ze-tool-text" : tool === "pen" || tool === "highlighter" || tool === "rect" || tool === "ellipse" || tool === "marquee" || measuring ? "ze-tool-draw" : softErasing || magicErasing ? "ze-tool-soft-erase" : (
      // both work on image pixels: crosshair over everything
      tool === "eraser" ? "ze-tool-erase" : ""
    );
    return /* @__PURE__ */ React.createElement("div", { className: "ze-artboard-zoom", ref: artboardRef, style: { width: canvasSize.width * zoom, height: canvasSize.height * zoom } }, /* @__PURE__ */ React.createElement("div", { className: "ze-page ze-page--rendered", style: { transform: zoom === 1 ? void 0 : `scale(${zoom})`, "--ze-zoom": zoom } }, /* @__PURE__ */ React.createElement("canvas", { ref: canvasRef }), onionGhostSrc && /* @__PURE__ */ React.createElement("img", { className: "ze-onion-ghost", src: onionGhostSrc, alt: "", style: { opacity: onionSkinOpacity } }), /* @__PURE__ */ React.createElement(
      "div",
      {
        ref: layerRef,
        className: "ze-annotation-layer " + cursorClass,
        style: { width: canvasSize.width, height: canvasSize.height },
        onMouseDown: handleOverlayMouseDown,
        onMouseMove: softErasing ? (e) => setBrushPos(overlayPoint(e)) : drawingPolygon ? (e) => setPolygonHover({ ...overlayPoint(e), shift: e.shiftKey }) : void 0,
        onMouseLeave: softErasing ? () => setBrushPos(null) : drawingPolygon ? () => setPolygonHover(null) : void 0
      },
      pageViews.map((a, index) => {
        if (a.hidden) return null;
        const itemProps = {
          tool,
          zoom,
          pageSize: canvasSize,
          pageFilter,
          isSelected: a.id === selectedAnnId || selectedAnnIds.includes(a.id),
          showHandles: showHandlesFor(a),
          isEditing: a.id === editingAnnId,
          isCropping: a.id === croppingAnnId,
          isEraseTarget: a.id === eraseTarget,
          onPress: pressAnnotation,
          onUpdate: onUpdateAnnotation,
          onToggleCrop,
          onStartTextEdit,
          onFinishTextEdit,
          onLinkNextFrame
        };
        const drawnPlain = a.id === croppingAnnId || a.id === editingAnnId;
        const baseIndex = isClipped(a) && !drawnPlain ? clipBaseIndex(pageViews, index) : -1;
        if (baseIndex < 0) return /* @__PURE__ */ React.createElement(AnnotationItem, { key: a.id, ann: a, ...itemProps });
        if (pageViews[baseIndex].hidden) return null;
        return /* @__PURE__ */ React.createElement(React.Fragment, { key: a.id }, /* @__PURE__ */ React.createElement(ClipWrap, { base: pageViews[baseIndex], pageSize: canvasSize, pageFilter, blend: blendOf(a) }, /* @__PURE__ */ React.createElement(AnnotationItem, { ann: { ...a, blend: void 0 }, ...itemProps, showHandles: false, isSelected: false, isEditing: false, isCropping: false, isEraseTarget: false })), /* @__PURE__ */ React.createElement("div", { className: "ze-clip-ghost" }, /* @__PURE__ */ React.createElement(AnnotationItem, { ann: a, ...itemProps })));
      }),
      /* @__PURE__ */ React.createElement(ThreadLinks, { views: pageViews, pageSize: canvasSize, selectedIds: [selectedAnnId, ...selectedAnnIds], zoom, onUnlink: onUnlinkNextFrame }),
      /* @__PURE__ */ React.createElement(LiveStroke, { drawing: drawingRef.current, pageSize: canvasSize }),
      selectionTurn && /* @__PURE__ */ React.createElement(SelectionTurnKnob, { turn: selectionTurn, zoom, toPagePoint: overlayPoint, onRotateAnnotations }),
      measuring && measure && /* @__PURE__ */ React.createElement(MeasureOverlay, { measure, pageSize: canvasSize, zoom, unit: rulerUnit, onHandleDown: dragMeasureEnd }),
      softErasing && brushPos && /* @__PURE__ */ React.createElement(BrushCursor, { pos: brushPos, softEraser }),
      tool === "marquee" && marquee && /* @__PURE__ */ React.createElement(MarqueeOverlay, { region: marquee, zoom, pageSize: canvasSize, hover: polygonHover, toPagePoint: overlayPoint, onChange: onMarqueeChange }),
      dragRect && /* @__PURE__ */ React.createElement("div", { className: "ze-drag-rect", style: { left: dragRect.x, top: dragRect.y, width: dragRect.width, height: dragRect.height, borderRadius: tool === "ellipse" ? "50%" : void 0 } })
    ), /* @__PURE__ */ React.createElement(
      PageOverlays,
      {
        pageSize: canvasSize,
        numberSpec,
        guidesOn,
        guideFormat,
        guideMarginIn,
        guideBleedIn,
        centerGuideOn
      }
    )));
  }

  // apps/ZEditor/src/ui/canvas/Rulers.jsx
  var { useEffect: useEffect16, useLayoutEffect: useLayoutEffect4, useRef: useRef18, useState: useState20 } = React;
  var RULER_SIZE = 18;
  function drawRuler(canvas, horizontal, length, origin, pxPerPt, unit, marks) {
    const dpr = window.devicePixelRatio || 1;
    const w = horizontal ? length : RULER_SIZE, h = horizontal ? RULER_SIZE : length;
    canvas.width = Math.max(1, Math.round(w * dpr));
    canvas.height = Math.max(1, Math.round(h * dpr));
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const css = getComputedStyle(canvas);
    ctx.fillStyle = css.getPropertyValue("--ruler-bg").trim() || "#2a2522";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = css.getPropertyValue("--ruler-page").trim() || "#3a3330";
    if (marks.pageLen > 0) {
      if (horizontal) ctx.fillRect(origin, 0, marks.pageLen * pxPerPt, h);
      else ctx.fillRect(0, origin, w, marks.pageLen * pxPerPt);
    }
    if (marks.span) {
      ctx.fillStyle = css.getPropertyValue("--ruler-cursor").trim() || "#f97316";
      ctx.globalAlpha = 0.25;
      const s0 = origin + marks.span.from * pxPerPt, sLen = (marks.span.to - marks.span.from) * pxPerPt;
      if (horizontal) ctx.fillRect(s0, 0, sLen, h);
      else ctx.fillRect(0, s0, w, sLen);
      ctx.globalAlpha = 1;
    }
    const fg = css.getPropertyValue("--ruler-fg").trim() || "#a99f97";
    ctx.strokeStyle = fg;
    ctx.fillStyle = fg;
    ctx.lineWidth = 1;
    ctx.font = "9px system-ui, sans-serif";
    ctx.textBaseline = "top";
    const fromPt = -origin / pxPerPt, toPt = (length - origin) / pxPerPt;
    ctx.beginPath();
    for (const t of rulerTicks(fromPt, toPt, pxPerPt, unit)) {
      const at = Math.round(origin + t.pt * pxPerPt) + 0.5;
      const tick = t.size === "major" ? RULER_SIZE : t.size === "mid" ? 7 : 4;
      if (horizontal) {
        ctx.moveTo(at, RULER_SIZE);
        ctx.lineTo(at, RULER_SIZE - tick);
      } else {
        ctx.moveTo(RULER_SIZE, at);
        ctx.lineTo(RULER_SIZE - tick, at);
      }
      if (t.size === "major") {
        const label = String(t.value);
        if (horizontal) ctx.fillText(label, at + 2, 1);
        else {
          ctx.save();
          ctx.translate(1, at + 2);
          ctx.rotate(Math.PI / 2);
          ctx.translate(0, -RULER_SIZE + 2);
          ctx.fillText(label, 0, 0);
          ctx.restore();
        }
      }
    }
    ctx.stroke();
    if (marks.cursor != null) {
      ctx.strokeStyle = css.getPropertyValue("--ruler-cursor").trim() || "#f97316";
      ctx.beginPath();
      const at = Math.round(marks.cursor) + 0.5;
      if (horizontal) {
        ctx.moveTo(at, 0);
        ctx.lineTo(at, RULER_SIZE);
      } else {
        ctx.moveTo(0, at);
        ctx.lineTo(RULER_SIZE, at);
      }
      ctx.stroke();
    }
  }
  function Rulers({ paneRef, zoom, unit, guides, setGuides, pageKey }) {
    const topRef = useRef18(null);
    const leftRef = useRef18(null);
    const [geom, setGeom] = useState20(null);
    const [cursor, setCursor] = useState20(null);
    const [drag, setDrag] = useState20(null);
    const readoutSpot = (x, y) => {
      if (document.documentElement.getAttribute("data-ze-input") !== "touch") return { left: x + 12, top: y + 12 };
      const pane = paneRef.current;
      const w = pane ? pane.clientWidth : Infinity;
      const left = x + 40 > w - 90 ? x - 130 : x + 40;
      return { left: Math.max(4, left), top: Math.max(4, y - 72) };
    };
    const [hover, setHover] = useState20(null);
    const pxPerPt = MAIN_SCALE * zoom;
    const gap = hover && geom && !drag ? guideGap(guides, hover.axis, (hover.at - geom[hover.axis === "x" ? "left" : "top"]) / pxPerPt) : null;
    const hoverOn = (axis) => (e) => {
      const r = e.currentTarget.getBoundingClientRect();
      setHover({ axis, at: axis === "x" ? e.clientX - r.left : e.clientY - r.top });
    };
    useLayoutEffect4(() => {
      const pane = paneRef.current;
      if (!pane) return void 0;
      let frame = 0;
      const measureNow = () => {
        const art2 = pane.querySelector(".ze-artboard-zoom");
        const p = pane.getBoundingClientRect();
        if (!art2) {
          setGeom(null);
          return;
        }
        const a = art2.getBoundingClientRect();
        const k = MAIN_SCALE * zoom;
        setGeom({ left: a.left - p.left, top: a.top - p.top, width: pane.clientWidth, height: pane.clientHeight, pageW: a.width / k, pageH: a.height / k });
      };
      const measure = () => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(measureNow);
      };
      measureNow();
      pane.addEventListener("scroll", measure, { passive: true });
      window.addEventListener("resize", measure);
      const ro = new ResizeObserver(measure);
      ro.observe(pane);
      const art = pane.querySelector(".ze-artboard-zoom");
      if (art) ro.observe(art);
      const onMove = (e) => {
        const p = pane.getBoundingClientRect();
        setCursor({ x: e.clientX - p.left, y: e.clientY - p.top });
      };
      const onLeave = () => setCursor(null);
      pane.addEventListener("mousemove", onMove);
      pane.addEventListener("mouseleave", onLeave);
      return () => {
        cancelAnimationFrame(frame);
        pane.removeEventListener("scroll", measure);
        window.removeEventListener("resize", measure);
        pane.removeEventListener("mousemove", onMove);
        pane.removeEventListener("mouseleave", onLeave);
        ro.disconnect();
      };
    }, [paneRef, zoom, pageKey]);
    useEffect16(() => {
      if (!geom || !topRef.current || !leftRef.current) return;
      const dragAt = drag ? geom[drag.axis === "x" ? "left" : "top"] + drag.pos * pxPerPt : null;
      drawRuler(topRef.current, true, geom.width, geom.left, pxPerPt, unit, {
        pageLen: geom.pageW,
        cursor: drag && drag.axis === "x" ? dragAt : cursor ? cursor.x : null,
        span: gap && hover.axis === "x" ? gap : null
      });
      drawRuler(leftRef.current, false, geom.height, geom.top, pxPerPt, unit, {
        pageLen: geom.pageH,
        cursor: drag && drag.axis === "y" ? dragAt : cursor ? cursor.y : null,
        span: gap && hover.axis === "y" ? gap : null
      });
    }, [geom, pxPerPt, unit, cursor, drag, gap && gap.from, gap && gap.to]);
    function startDrag(e, guide) {
      e.preventDefault();
      e.stopPropagation();
      const pane = paneRef.current;
      const coord = (ev) => guide.axis === "x" ? ev.clientX : ev.clientY;
      const cursorPos = (ev) => {
        const art = pane.querySelector(".ze-artboard-zoom");
        if (!art) return 0;
        const a = art.getBoundingClientRect();
        return (coord(ev) - (guide.axis === "x" ? a.left : a.top)) / pxPerPt;
      };
      let raw = guide.isNew ? cursorPos(e) : guide.pos;
      let last = { c: coord(e), t: e.timeStamp };
      let speed = 0;
      const follow = (ev) => {
        const c = coord(ev), dt = Math.max(1, ev.timeStamp - last.t);
        speed = speed * 0.3 + Math.abs(c - last.c) / dt * 0.7;
        raw += (c - last.c) * dragGain(speed) / pxPerPt;
        last = { c, t: ev.timeStamp };
      };
      const posAt = (ev) => ev.shiftKey ? snapToUnit(raw, unit) : Math.round(raw * 100) / 100;
      const outside = (ev) => {
        const p = pane.getBoundingClientRect();
        return guide.axis === "x" ? ev.clientX < p.left || ev.clientX > p.right : ev.clientY < p.top || ev.clientY > p.bottom;
      };
      const update = (ev) => {
        if (ev !== e) follow(ev);
        const p = pane.getBoundingClientRect();
        setDrag({ ...guide, pos: posAt(ev), removing: outside(ev), x: ev.clientX - p.left, y: ev.clientY - p.top });
      };
      update(e);
      trackPointerDrag(update, (ev) => {
        setDrag(null);
        const pos = posAt(ev);
        if (outside(ev)) {
          if (!guide.isNew) setGuides((gs) => gs.filter((g) => g.id !== guide.id));
          return;
        }
        if (guide.isNew) setGuides((gs) => [...gs, { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), axis: guide.axis, pos }]);
        else setGuides((gs) => gs.map((g) => g.id === guide.id ? { ...g, pos } : g));
      });
    }
    const shown = guides.filter((g) => !drag || g.id !== drag.id);
    const lineStyle = (axis, pos) => axis === "x" ? { left: geom.left + pos * pxPerPt } : { top: geom.top + pos * pxPerPt };
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "ze-ruler-corner", title: "Rulers count from the page's top-left corner. Drag from a ruler to add a guide." }), /* @__PURE__ */ React.createElement(
      "canvas",
      {
        ref: topRef,
        className: "ze-ruler ze-ruler-top",
        onMouseDown: (e) => startDrag(e, { axis: "y", isNew: true, pos: 0 }),
        onMouseMove: hoverOn("x"),
        onMouseLeave: () => setHover(null)
      }
    ), /* @__PURE__ */ React.createElement(
      "canvas",
      {
        ref: leftRef,
        className: "ze-ruler ze-ruler-left",
        onMouseDown: (e) => startDrag(e, { axis: "x", isNew: true, pos: 0 }),
        onMouseMove: hoverOn("y"),
        onMouseLeave: () => setHover(null)
      }
    ), geom && /* @__PURE__ */ React.createElement("div", { className: "ze-ruler-guides" }, shown.map((g) => /* @__PURE__ */ React.createElement(
      "div",
      {
        key: g.id,
        className: "ze-ruler-guide ze-ruler-guide-" + g.axis,
        style: lineStyle(g.axis, g.pos),
        title: `${formatInUnit(g.pos, unit)} · drag to move, drag onto the ruler to remove`,
        onMouseDown: (e) => startDrag(e, g)
      }
    )), gap && /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "ze-ruler-readout",
        style: hover.axis === "x" ? { left: hover.at + 12, top: 4 } : { left: 4, top: hover.at + 12 }
      },
      formatInUnit(gap.length, unit)
    ), drag && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "ze-ruler-guide ze-ruler-guide-" + drag.axis + " is-dragging" + (drag.removing ? " is-removing" : ""), style: lineStyle(drag.axis, drag.pos) }), /* @__PURE__ */ React.createElement("div", { className: "ze-ruler-readout", style: readoutSpot(drag.x, drag.y) }, drag.removing ? "Remove guide" : formatInUnit(drag.pos, unit)))));
  }

  // apps/ZEditor/src/ui/canvas/LiveFilterDefs.jsx
  function LiveFilterDefs({ pageFilter }) {
    const dark = hexToRgb(pageFilter.darkColor || DEFAULT_DUOTONE_DARK);
    const light = hexToRgb(pageFilter.lightColor || DEFAULT_DUOTONE_LIGHT);
    return /* @__PURE__ */ React.createElement("svg", { width: "0", height: "0", style: { position: "absolute" }, "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("defs", null, /* @__PURE__ */ React.createElement("filter", { id: "ze-filter-grayscale", colorInterpolationFilters: "sRGB" }, /* @__PURE__ */ React.createElement("feColorMatrix", { type: "matrix", values: LUMINANCE_MATRIX_VALUES })), /* @__PURE__ */ React.createElement("filter", { id: "ze-filter-duotone", colorInterpolationFilters: "sRGB" }, /* @__PURE__ */ React.createElement("feColorMatrix", { type: "matrix", values: LUMINANCE_MATRIX_VALUES }), /* @__PURE__ */ React.createElement("feComponentTransfer", null, /* @__PURE__ */ React.createElement("feFuncR", { type: "linear", slope: (light.r - dark.r) / 255, intercept: dark.r / 255 }), /* @__PURE__ */ React.createElement("feFuncG", { type: "linear", slope: (light.g - dark.g) / 255, intercept: dark.g / 255 }), /* @__PURE__ */ React.createElement("feFuncB", { type: "linear", slope: (light.b - dark.b) / 255, intercept: dark.b / 255 })))));
  }

  // apps/ZEditor/src/ui/dialogs/ConfirmDialog.jsx
  function ConfirmDialog({ step, onProceed, onYes, onCancel }) {
    if (!step) return null;
    return /* @__PURE__ */ React.createElement("div", { className: "ze-modal-backdrop", onMouseDown: onCancel }, /* @__PURE__ */ React.createElement("div", { className: "ze-modal", onMouseDown: (e) => e.stopPropagation() }, /* @__PURE__ */ React.createElement("div", { className: "ze-modal-head" }, step === 1 ? "This will erase your unsaved edits" : "Confirm"), /* @__PURE__ */ React.createElement("div", { className: "ze-modal-body" }, /* @__PURE__ */ React.createElement("p", { className: "ze-format-hint", style: { margin: 0 } }, step === 1 ? "This will ERASE all your current unsaved edits." : "Are you sure to proceed?")), /* @__PURE__ */ React.createElement("div", { className: "ze-modal-actions" }, /* @__PURE__ */ React.createElement("button", { type: "button", onClick: onCancel }, "Back"), step === 1 ? /* @__PURE__ */ React.createElement("button", { type: "button", className: "btn-solid", onClick: onProceed }, "Proceed") : /* @__PURE__ */ React.createElement("button", { type: "button", className: "btn-solid", onClick: onYes }, "Yes"))));
  }

  // shared/js/NumberBox.jsx
  function NumberBox({ steppers = true, wrapClassName, ...inputProps }) {
    const input = /* @__PURE__ */ React.createElement("input", { type: "number", ...inputProps });
    if (!steppers) return input;
    const disabled = Boolean(inputProps.disabled);
    return /* @__PURE__ */ React.createElement("span", { className: "zn-num" + (wrapClassName ? " " + wrapClassName : "") }, input, /* @__PURE__ */ React.createElement("button", { type: "button", className: "zn-num-btn", "data-zn-step": "-1", tabIndex: -1, "aria-label": "Decrease", title: "Decrease", disabled }, "−"), /* @__PURE__ */ React.createElement("button", { type: "button", className: "zn-num-btn", "data-zn-step": "1", tabIndex: -1, "aria-label": "Increase", title: "Increase", disabled }, "+"));
  }

  // apps/ZEditor/src/ui/dialogs/InsertPdfDialog.jsx
  function InsertPdfDialog({ file, pageCount, afterPage, onChangeAfterPage, onConfirm, onCancel }) {
    if (!file) return null;
    return /* @__PURE__ */ React.createElement("div", { className: "ze-modal-backdrop", onMouseDown: onCancel }, /* @__PURE__ */ React.createElement("div", { className: "ze-modal", onMouseDown: (e) => e.stopPropagation() }, /* @__PURE__ */ React.createElement("div", { className: "ze-modal-head" }, "Insert PDF"), /* @__PURE__ */ React.createElement("div", { className: "ze-modal-body" }, /* @__PURE__ */ React.createElement("p", { className: "ze-format-hint", style: { margin: "0 0 14px" } }, "Inserting ", /* @__PURE__ */ React.createElement("strong", null, file.name), " into this document."), /* @__PURE__ */ React.createElement("label", { className: "ze-format-field" }, /* @__PURE__ */ React.createElement("span", { className: "ze-format-label" }, "Insert after page (0 for the very beginning)"), /* @__PURE__ */ React.createElement(
      NumberBox,
      {
        className: "ze-format-number",
        min: "0",
        max: pageCount,
        autoFocus: true,
        value: afterPage,
        onChange: (e) => onChangeAfterPage(Math.max(0, Math.min(pageCount, Number(e.target.value) || 0)))
      }
    )), /* @__PURE__ */ React.createElement("span", { className: "ze-format-hint" }, "This document currently has ", pageCount, " page", pageCount === 1 ? "" : "s", ".")), /* @__PURE__ */ React.createElement("div", { className: "ze-modal-actions" }, /* @__PURE__ */ React.createElement("button", { type: "button", onClick: onCancel }, "Cancel"), /* @__PURE__ */ React.createElement("button", { type: "button", className: "btn-solid", onClick: onConfirm }, "Insert"))));
  }

  // apps/ZEditor/src/ui/dialogs/NewDocumentDialog.jsx
  var { useState: useState21 } = React;
  var MM_PER_INCH = 25.4;
  var ptToMm = (pts) => pts / POINTS_PER_INCH * MM_PER_INCH;
  var mmToPt = (mm) => mm / MM_PER_INCH * POINTS_PER_INCH;
  var formatMm = (pts) => String(Math.round(ptToMm(pts) * 10) / 10);
  var presetLabel = (p) => `${p.label} (${formatMm(p.width)}mm × ${formatMm(p.height)}mm)`;
  var CUSTOM_MIN_MM = 20;
  var CUSTOM_MAX_MM = 1200;
  var clampMm = (text, fallback) => {
    const v = Number(text);
    return Number.isFinite(v) && v > 0 ? Math.max(CUSTOM_MIN_MM, Math.min(CUSTOM_MAX_MM, v)) : fallback;
  };
  function NewDocumentDialog({ open, onCreate, onOpenPdf, onCancel }) {
    const [presetKey, setPresetKey] = useState21("a5");
    const [orientation, setOrientation] = useState21("portrait");
    const [pageCountText, setPageCountText] = useState21("1");
    const [customWText, setCustomWText] = useState21("148");
    const [customHText, setCustomHText] = useState21("210");
    if (!open) return null;
    const custom = presetKey === "custom";
    const customW = clampMm(customWText, 148), customH = clampMm(customHText, 210);
    const preset = custom ? { width: mmToPt(customW), height: mmToPt(customH) } : NEW_DOCUMENT_PRESETS.find((p) => p.key === presetKey) || NEW_DOCUMENT_PRESETS[0];
    const landscape = orientation === "landscape";
    const width = landscape ? preset.height : preset.width;
    const height = landscape ? preset.width : preset.height;
    const pageCount = Math.max(1, Math.min(MAX_NEW_DOCUMENT_PAGES, parseInt(pageCountText, 10) || 1));
    const inches = (pts) => +(pts / POINTS_PER_INCH).toFixed(2);
    return /* @__PURE__ */ React.createElement("div", { className: "ze-modal-backdrop", onMouseDown: onCancel }, /* @__PURE__ */ React.createElement("div", { className: "ze-modal", onMouseDown: (e) => e.stopPropagation() }, /* @__PURE__ */ React.createElement("div", { className: "ze-modal-head" }, "New document"), /* @__PURE__ */ React.createElement("div", { className: "ze-modal-body" }, /* @__PURE__ */ React.createElement("div", { className: "ze-format-field" }, /* @__PURE__ */ React.createElement("span", { className: "ze-format-label" }, "Paper size"), /* @__PURE__ */ React.createElement("select", { className: "ze-format-select", value: presetKey, onChange: (e) => setPresetKey(e.target.value) }, NEW_DOCUMENT_PRESETS.map((p) => /* @__PURE__ */ React.createElement("option", { key: p.key, value: p.key }, presetLabel(p))), /* @__PURE__ */ React.createElement("option", { value: "custom" }, "Custom size (mm)…"))), custom && /* @__PURE__ */ React.createElement("div", { className: "ze-format-field" }, /* @__PURE__ */ React.createElement("span", { className: "ze-format-label" }, "Custom size (mm)"), /* @__PURE__ */ React.createElement("div", { className: "ze-format-inline" }, /* @__PURE__ */ React.createElement(
      NumberBox,
      {
        className: "ze-format-number",
        min: CUSTOM_MIN_MM,
        max: CUSTOM_MAX_MM,
        step: "0.5",
        "aria-label": "Width (mm)",
        title: "Width (mm)",
        value: customWText,
        onChange: (e) => setCustomWText(e.target.value),
        onBlur: () => setCustomWText(String(customW))
      }
    ), /* @__PURE__ */ React.createElement("span", { className: "ze-format-hint", style: { margin: 0 } }, "×"), /* @__PURE__ */ React.createElement(
      NumberBox,
      {
        className: "ze-format-number",
        min: CUSTOM_MIN_MM,
        max: CUSTOM_MAX_MM,
        step: "0.5",
        "aria-label": "Height (mm)",
        title: "Height (mm)",
        value: customHText,
        onChange: (e) => setCustomHText(e.target.value),
        onBlur: () => setCustomHText(String(customH))
      }
    ), /* @__PURE__ */ React.createElement("span", { className: "ze-format-hint", style: { margin: 0 } }, "mm"))), /* @__PURE__ */ React.createElement("div", { className: "ze-format-field" }, /* @__PURE__ */ React.createElement("span", { className: "ze-format-label" }, "Orientation"), /* @__PURE__ */ React.createElement("div", { className: "ze-format-row" }, /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-format-toggle ze-format-toggle-wide" + (!landscape ? " active" : ""), onClick: () => setOrientation("portrait") }, "Portrait"), /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-format-toggle ze-format-toggle-wide" + (landscape ? " active" : ""), onClick: () => setOrientation("landscape") }, "Landscape"))), /* @__PURE__ */ React.createElement("label", { className: "ze-format-field" }, /* @__PURE__ */ React.createElement("span", { className: "ze-format-label" }, "Pages"), /* @__PURE__ */ React.createElement(
      NumberBox,
      {
        className: "ze-format-number",
        min: "1",
        max: MAX_NEW_DOCUMENT_PAGES,
        value: pageCountText,
        onChange: (e) => setPageCountText(e.target.value),
        onBlur: () => setPageCountText(String(pageCount))
      }
    )), /* @__PURE__ */ React.createElement("span", { className: "ze-format-hint" }, formatMm(width), " × ", formatMm(height), " mm (", inches(width), " × ", inches(height), " in).", custom ? ` Sizes from ${CUSTOM_MIN_MM} to ${CUSTOM_MAX_MM} mm.` : "", " You can add or remove pages later.")), /* @__PURE__ */ React.createElement("div", { className: "ze-modal-actions" }, onOpenPdf && /* @__PURE__ */ React.createElement("button", { type: "button", onClick: onOpenPdf }, "Open a PDF instead"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: onCancel }, "Cancel"), /* @__PURE__ */ React.createElement("button", { type: "button", className: "btn-solid", onClick: () => onCreate({ width, height, pageCount }) }, "Create"))));
  }

  // apps/ZEditor/src/ui/dialogs/shortcuts.js
  var KEYBOARD_SHORTCUTS = [
    {
      group: "Tools",
      rows: [
        ["V", "Move tool"],
        ["T", "Text tool"],
        ["I", "Add an image"],
        ["R", "Rectangle tool"],
        ["E", "Ellipse tool"],
        ["D", "Draw tool"],
        ["H", "Highlighter tool"],
        ["C", "Turn crop on / off for the selected image"],
        ["M", "Marquee tool: drag a box on the page (Shift: square, Alt: from the centre), then Make layer"],
        ["U", "Measure tool: click point a, click point b, click again to clear (Shift: 45° steps, Alt: skip guides)"]
      ]
    },
    {
      group: "Editing",
      rows: [
        ["Ctrl + Z", "Undo"],
        ["Ctrl + Shift + Z, or Ctrl + Y", "Redo"],
        ["Ctrl + C", "Copy the selected item"],
        ["Ctrl + V", "Paste a copied item, or an image from the clipboard"],
        ["Ctrl + S", "Save the project (asks where, the first time)"],
        ["Ctrl + Shift + S", "Save the project to a new file"],
        ["Delete", "Delete the selected item, or the selected page(s) if no item is selected"],
        ["Ctrl + J", "Marquee: Layer via Copy (the box becomes a new image layer)"],
        ["Ctrl + Shift + J", "Marquee: Layer via Cut (the box is taken out of the original)"],
        ["Esc", "Marquee: drop the box"],
        ["Double-click text", "Edit it (Move tool)"],
        ["Esc", "Finish editing and keep the text selected"],
        ["Enter / Esc", "Magic eraser preview: apply it / cancel it (Ctrl + Z also cancels)"]
      ]
    },
    {
      group: "Pages and selection",
      rows: [
        ["↑ / ↓", "Previous / next page, when no item is selected"],
        ["Arrow keys", "Nudge the selected items 1 px"],
        ["Shift + arrow keys", "Nudge the selected items 10 px"],
        ["Ctrl + R", "Rotate the selected page"],
        ["Ctrl + G", "Group the selected items (select several first)"],
        ["Ctrl + Shift + G", "Ungroup"],
        ["Ctrl + Alt + G", "Clipping mask on/off: the selected layer shows only where the layer directly below it has pixels (also in the Layers panel menu)"],
        ["Alt + click", "Pick one item out of a group"],
        ["Ctrl + click", "Pick the top layer under the pointer, even when a layer picked in the Layers panel lies under it"],
        ["Shift + click", "Add to or remove from the selection (pages and items)"],
        ["Drag on empty page", "Select the items it touches (Move tool)"],
        ["Shift + drag a handle", "Stretch an image freely, or keep a rectangle's proportions"],
        ["Shift + drag a crop handle", "Keep the crop window's proportions"]
      ]
    }
  ];

  // apps/ZEditor/src/ui/dialogs/ShortcutsDialog.jsx
  var { useEffect: useEffect17 } = React;
  function ShortcutsDialog({ open, onClose }) {
    useEffect17(() => {
      if (!open) return;
      const closeOnEscape = (e) => {
        if (e.key === "Escape") onClose();
      };
      window.addEventListener("keydown", closeOnEscape);
      return () => window.removeEventListener("keydown", closeOnEscape);
    }, [open]);
    if (!open) return null;
    return /* @__PURE__ */ React.createElement("div", { className: "ze-modal-backdrop", onMouseDown: onClose }, /* @__PURE__ */ React.createElement("div", { className: "ze-modal ze-modal--shortcuts", role: "dialog", "aria-label": "Keyboard shortcuts", onMouseDown: (e) => e.stopPropagation() }, /* @__PURE__ */ React.createElement("div", { className: "ze-modal-head ze-modal-head--with-close" }, "Keyboard Shortcuts", /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-tool-icon-btn ze-tool-icon-btn--round", title: "Close (Esc)", "aria-label": "Close", onClick: onClose }, /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 24 24", width: "14", height: "14", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("path", { d: "M6 6l12 12M18 6L6 18" })))), /* @__PURE__ */ React.createElement("div", { className: "ze-shortcuts-scroll" }, /* @__PURE__ */ React.createElement("table", { className: "ze-shortcuts-table" }, KEYBOARD_SHORTCUTS.map(({ group, rows }) => /* @__PURE__ */ React.createElement("tbody", { key: group }, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", { colSpan: "2" }, group)), rows.map(([keys, action]) => /* @__PURE__ */ React.createElement("tr", { key: keys }, /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("kbd", null, keys)), /* @__PURE__ */ React.createElement("td", null, action)))))), /* @__PURE__ */ React.createElement("span", { className: "ze-format-hint" }, "On a Mac, use Cmd instead of Ctrl. Shortcuts pause while you're typing in a text box or field."))));
  }

  // apps/ZEditor/src/ui/dialogs/WelcomeDialog.jsx
  var { useEffect: useEffect18, useState: useState22 } = React;
  var OPEN_KINDS = [
    { key: "project", label: "ZineNow project (.znow)", hint: "Keep editing a zine you saved." },
    { key: "pdf", label: "PDF file", hint: "Its pages become the zine's pages." }
  ];
  function WelcomeDialog({ open, onNewDocument, onOpenProject, onOpenPdf, onClose }) {
    const [kind, setKind] = useState22("project");
    useEffect18(() => {
      if (!open) return void 0;
      const onKey = (e) => {
        if (e.key === "Escape") onClose();
      };
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }, [open]);
    if (!open) return null;
    const chosen = OPEN_KINDS.find((k) => k.key === kind);
    return /* @__PURE__ */ React.createElement("div", { className: "ze-modal-backdrop" }, /* @__PURE__ */ React.createElement("div", { className: "ze-modal ze-modal--welcome", role: "dialog", "aria-labelledby": "ze-welcome-title" }, /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-welcome-close", "aria-label": "Close", title: "Close (Esc)", onClick: onClose }, "×"), /* @__PURE__ */ React.createElement("div", { className: "ze-welcome-title", id: "ze-welcome-title" }, "Let's make a Zine!"), /* @__PURE__ */ React.createElement("p", { className: "ze-welcome-lead" }, "Start something new, or open what you have."), /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-welcome-option", onClick: onNewDocument }, /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 24 24", width: "22", height: "22", fill: "none", stroke: "currentColor", strokeWidth: "1.7", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("path", { d: "M6 3h8l4 4v14H6z" }), /* @__PURE__ */ React.createElement("path", { d: "M14 3v4h4" }), /* @__PURE__ */ React.createElement("path", { d: "M12 11v6M9 14h6" })), /* @__PURE__ */ React.createElement("span", { className: "ze-welcome-option-text" }, /* @__PURE__ */ React.createElement("strong", null, "New document"), /* @__PURE__ */ React.createElement("span", null, "Blank pages in A5, A4, Digest… or your own size."))), /* @__PURE__ */ React.createElement("div", { className: "ze-welcome-option ze-welcome-open" }, /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 24 24", width: "22", height: "22", fill: "none", stroke: "currentColor", strokeWidth: "1.7", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("path", { d: "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v1" }), /* @__PURE__ */ React.createElement("path", { d: "M3 7v11a2 2 0 0 0 2 2h13l3-9H7l-3 9" })), /* @__PURE__ */ React.createElement("span", { className: "ze-welcome-option-text" }, /* @__PURE__ */ React.createElement("strong", null, "Open existing"), /* @__PURE__ */ React.createElement("span", null, chosen.hint), /* @__PURE__ */ React.createElement("span", { className: "ze-welcome-open-row" }, /* @__PURE__ */ React.createElement("select", { className: "ze-format-select", "aria-label": "What to open", value: kind, onChange: (e) => setKind(e.target.value) }, OPEN_KINDS.map((k) => /* @__PURE__ */ React.createElement("option", { key: k.key, value: k.key }, k.label))), /* @__PURE__ */ React.createElement("button", { type: "button", className: "btn-solid", onClick: kind === "pdf" ? onOpenPdf : onOpenProject }, "Open…"))))));
  }

  // apps/ZEditor/src/ui/controls/inputs.jsx
  var { useState: useState23 } = React;
  function useDraftInputProps(value, commitText) {
    const [draft, setDraft] = useState23(null);
    return {
      value: draft != null ? draft : value,
      onChange: (e) => {
        setDraft(e.target.value);
        commitText(e.target.value);
      },
      onBlur: () => setDraft(null)
    };
  }
  function SliderNumberInput({ min, max, value, onChange }) {
    const numberProps = useDraftInputProps(value, (text) => {
      const n = Number(text);
      if (text.trim() !== "" && Number.isFinite(n)) onChange(Math.min(max, Math.max(min, Math.round(n))));
    });
    return /* @__PURE__ */ React.createElement("div", { className: "ze-format-slider-row" }, /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "range",
        className: "ze-format-slider",
        min,
        max,
        step: "1",
        value,
        onChange: (e) => onChange(Number(e.target.value))
      }
    ), /* @__PURE__ */ React.createElement(NumberBox, { className: "ze-format-number", min, max, step: "1", ...numberProps }));
  }
  function CustomColorInput({ value, onChange }) {
    return /* @__PURE__ */ React.createElement("label", { className: "ze-custom-color", title: "Custom color — pick any color" }, /* @__PURE__ */ React.createElement("input", { type: "color", value, onChange: (e) => onChange(e.target.value), "aria-label": "Custom color" }), /* @__PURE__ */ React.createElement("span", { className: "ze-custom-color-face", style: { backgroundColor: value } }), /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("path", { d: "m2 22 1-1h3l9-9" }), /* @__PURE__ */ React.createElement("path", { d: "M3 21v-3l9-9" }), /* @__PURE__ */ React.createElement("path", { d: "m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3l.4.4Z" })));
  }
  function HexColorInput({ value, onChange }) {
    const hexProps = useDraftInputProps(value, (text) => {
      const hex2 = "#" + text.trim().replace(/^#/, "");
      if (/^#[0-9a-f]{6}$/i.test(hex2)) onChange(hex2.toLowerCase());
    });
    return /* @__PURE__ */ React.createElement("div", { className: "ze-format-slider-row" }, /* @__PURE__ */ React.createElement("input", { type: "color", className: "ze-format-color-input", value, onChange: (e) => onChange(e.target.value) }), /* @__PURE__ */ React.createElement("input", { type: "text", className: "ze-format-number", spellCheck: "false", maxLength: "7", "aria-label": "Hex color", ...hexProps }));
  }
  function SelectInput({ options, value, onChange }) {
    return /* @__PURE__ */ React.createElement("select", { className: "ze-format-select", value, onChange: (e) => onChange(e.target.value) }, options.map((o) => /* @__PURE__ */ React.createElement("option", { key: o.key, value: o.key }, o.label)));
  }
  var EFFECT_CONTROL_INPUTS = { slider: SliderNumberInput, color: HexColorInput, select: SelectInput };

  // apps/ZEditor/src/ui/controls/ControlList.jsx
  function ControlList({ controls, source, onPatch }) {
    const values = controlValues(source, controls);
    return controls.filter((c) => !c.showIf || c.showIf(values)).map(({ kind, prop, label, min, max, options, hint }) => {
      const ControlInput = EFFECT_CONTROL_INPUTS[kind];
      return /* @__PURE__ */ React.createElement("div", { className: "ze-format-field", key: prop }, /* @__PURE__ */ React.createElement("span", { className: "ze-format-label" }, label), /* @__PURE__ */ React.createElement(ControlInput, { min, max, options, value: values[prop], onChange: (v) => onPatch({ [prop]: v }) }), hint && /* @__PURE__ */ React.createElement("span", { className: "ze-format-hint" }, hint));
    });
  }

  // apps/ZEditor/src/ui/controls/PanelSection.jsx
  var { useState: useState24, useRef: useRef19, useEffect: useEffect19 } = React;
  var sectionOpenMemory = {};
  var ESSENTIAL_SECTIONS = /* @__PURE__ */ new Set([
    "text.basic",
    "text.styles",
    "text.letters",
    // text box
    "image.filters",
    "image.filter",
    // image: Photo Adjustments, Style
    "rect.fill",
    "rect.transform",
    "rect.wrap",
    "ellipse.wrap"
    // rectangle / ellipse (and their tool)
  ]);
  function PanelSection({ id, title, checked, onToggle, disabled, defaultOpen = false, group, hint, summary, onReset, essential, children }) {
    const isEssential = essential != null ? essential : ESSENTIAL_SECTIONS.has(id);
    const hasToggle = typeof onToggle === "function";
    const expandable = children != null && children !== false;
    const [open, setOpenState] = useState24(() => id in sectionOpenMemory ? sectionOpenMemory[id] : defaultOpen);
    const setOpen = (value) => {
      sectionOpenMemory[id] = value;
      setOpenState(value);
    };
    const wasChecked = useRef19(checked);
    useEffect19(() => {
      if (checked && !wasChecked.current && expandable) setOpen(true);
      wasChecked.current = checked;
    }, [checked]);
    const isOff = hasToggle && !checked;
    const isOpen = expandable && open && !isOff;
    function clickTitle() {
      if (isOff) {
        if (!disabled) onToggle(true);
      } else if (expandable) setOpen(!open);
      else if (hasToggle && !disabled) onToggle(false);
    }
    return /* @__PURE__ */ React.createElement("section", { className: "ze-sec" + (isOpen ? " is-open" : "") + (isOff ? " is-off" : "") }, /* @__PURE__ */ React.createElement("div", { className: "ze-sec-head" }, hasToggle && /* @__PURE__ */ React.createElement("input", { type: "checkbox", className: "ze-sec-check", checked: Boolean(checked), disabled, "aria-label": title, onChange: (e) => onToggle(e.target.checked) }), /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-sec-title", "aria-expanded": expandable ? isOpen : void 0, onClick: clickTitle }, isEssential && /* @__PURE__ */ React.createElement("svg", { className: "ze-sec-star", viewBox: "0 0 24 24", width: "11", height: "11", "aria-label": "Essential", role: "img" }, /* @__PURE__ */ React.createElement("title", null, "Essential: start here"), /* @__PURE__ */ React.createElement("path", { d: "M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.4l-5.8 3.1 1.1-6.5L2.6 9.4l6.5-.9z" })), /* @__PURE__ */ React.createElement("span", { className: "ze-sec-name" }, title), expandable && /* @__PURE__ */ React.createElement("svg", { className: "ze-sec-caret" + (isOff ? " is-hidden" : ""), viewBox: "0 0 20 20", width: "12", height: "12", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("path", { d: "M5.5 7.5l4.5 4.5 4.5-4.5" })), hint && /* @__PURE__ */ React.createElement("span", { className: "ze-sec-help", title: hint }, "?"), summary && !isOpen && /* @__PURE__ */ React.createElement("span", { className: "ze-sec-summary" }, summary)), onReset && isOpen && /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-sec-reset", title: "Reset to defaults", "aria-label": "Reset " + title, onClick: onReset }, /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 24 24", width: "14", height: "14", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("path", { d: "M3 12a9 9 0 1 0 3-6.7" }), /* @__PURE__ */ React.createElement("path", { d: "M3 4v5h5" })))), isOpen && /* @__PURE__ */ React.createElement("div", { className: "ze-sec-body" + (group ? " is-group" : "") }, children));
  }
  var resetPatch = (controls) => Object.fromEntries(controls.map((c) => [c.prop, void 0]));

  // apps/ZEditor/src/ui/panels/EffectControls.jsx
  function EffectControls({ ann, onPatch, effects = IMAGE_EFFECTS, before, beforeLabel, essential }) {
    const toggleEffect = (effect, on) => {
      const otherEdgesOff = effect.outline && on ? Object.fromEntries(effects.filter((e) => e.outline).map((e) => [e.key, false])) : {};
      onPatch({ ...otherEdgesOff, [effect.key]: on });
    };
    const available = effects.filter((effect) => !(effect.outline && isEllipse(ann)) && !(effect === ELLIPSE_EFFECT && ann.type === "rect"));
    const active = [...beforeLabel ? [beforeLabel] : [], ...available.filter((effect) => ann[effect.key]).map((effect) => effect.label)];
    return /* @__PURE__ */ React.createElement(PanelSection, { id: "effects", title: "Effect", essential: Boolean(essential), group: true, summary: active.length > 0 ? active.join(", ") : void 0 }, before, available.map((effect) => {
      const hint = [effect.outline && "Only one edge shape can be on at a time.", effect.hint].filter(Boolean).join(" ");
      return /* @__PURE__ */ React.createElement(
        PanelSection,
        {
          key: effect.key,
          id: "fx." + effect.key,
          title: effect.label,
          checked: Boolean(ann[effect.key]),
          onToggle: (on) => toggleEffect(effect, on),
          hint: hint || void 0,
          onReset: effect.controls.length > 0 ? () => onPatch(resetPatch(effect.controls)) : void 0
        },
        effect.controls.length > 0 && /* @__PURE__ */ React.createElement(ControlList, { controls: effect.controls, source: ann, onPatch })
      );
    }));
  }

  // apps/ZEditor/src/ui/panels/TextWrapSection.jsx
  function TextWrapSection({ ann, patch }) {
    const controls = TEXT_WRAP_CONTROLS.filter((c) => c.prop !== "wrapOffset" || ann.textWrap && ann.textWrap !== "none");
    return /* @__PURE__ */ React.createElement(
      PanelSection,
      {
        id: ann.type + ".wrap",
        title: "Text wrap",
        onReset: () => patch(resetPatch(TEXT_WRAP_CONTROLS)),
        hint: "Text frames this overlaps set their lines around it. Object shape follows an image's visible (non-transparent) pixels, or an ellipse's outline. Works on text boxes with a set width that aren't rotated."
      },
      /* @__PURE__ */ React.createElement(ControlList, { controls, source: ann, onPatch: (p) => patch(p.textWrap === "none" ? { textWrap: void 0 } : p) })
    );
  }

  // apps/ZEditor/src/ui/panels/format/FormatPanelShell.jsx
  function FormatPanelShell({ title, sections = true, children }) {
    return /* @__PURE__ */ React.createElement("aside", { className: "ze-format-panel" }, /* @__PURE__ */ React.createElement("div", { className: "ze-format-panel-head" }, title), /* @__PURE__ */ React.createElement("div", { className: "ze-format-panel-body" + (sections ? " ze-sections" : "") }, children));
  }
  function SizeReadout({ ann }) {
    return /* @__PURE__ */ React.createElement("div", { className: "ze-format-field" }, /* @__PURE__ */ React.createElement("span", { className: "ze-format-label" }, "Size"), /* @__PURE__ */ React.createElement("span", { className: "ze-format-hint", style: { display: "block", marginTop: 0 } }, Math.round(ann.width), " × ", Math.round(ann.height), " px"));
  }

  // apps/ZEditor/src/ui/panels/format/ImageFormat.jsx
  var { useState: useState25 } = React;
  function ImageFormat({ ann, onUpdate, croppingAnnId, onToggleCrop, onFlattenImage, imageTrace }) {
    const patch = (p) => onUpdate(ann.id, p);
    const isCroppingThis = croppingAnnId === ann.id;
    const hasCrop = ann.cropW != null && (ann.cropX || ann.cropY || ann.cropW !== ann.naturalWidth || ann.cropH !== ann.naturalHeight);
    const cropReset = cropResetPatch(ann);
    const filterType = ann.filter && ann.filter.type || "match";
    const filterOption = IMAGE_FILTER_OPTIONS.find((o) => o.key === filterType);
    const adjustedCount = PHOTO_ADJUST_CONTROLS.filter((c) => isAdjusted(ann, c)).length;
    const filtersSummary = [adjustedCount > 0 && adjustedCount + " adjusted", filterType !== "match" && filterOption && filterOption.label].filter(Boolean).join(" · ") || void 0;
    return /* @__PURE__ */ React.createElement(FormatPanelShell, { title: "Format — Image" }, /* @__PURE__ */ React.createElement(
      PanelSection,
      {
        id: "image.crop",
        title: "Crop",
        checked: isCroppingThis || Boolean(hasCrop),
        disabled: Boolean(angleOf(ann)) && !isCroppingThis && !hasCrop,
        hint: "While cropping: drag inside the window to reposition the photo, drag a handle to resize the crop (hold Shift to keep its proportions). Set the rotation to 0° to crop.",
        onToggle: (on) => {
          if (on) {
            if (!isCroppingThis) onToggleCrop(ann.id);
            return;
          }
          if (isCroppingThis) onToggleCrop(ann.id);
          patch(cropReset);
        },
        onReset: hasCrop ? () => patch(cropReset) : void 0
      },
      /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-format-toggle ze-format-toggle-wide" + (isCroppingThis ? " active" : ""), onClick: () => onToggleCrop(ann.id) }, isCroppingThis ? "Done Cropping" : "Edit Crop")
    ), /* @__PURE__ */ React.createElement(PanelSection, { id: "image.basic", title: "Basic", defaultOpen: true, hint: "Drag the image to move it. Drag a handle to resize; hold Shift to stretch it freely. Opacity and blend are in the Layers panel.", onReset: () => patch(resetPatch([ANGLE_CONTROL])) }, /* @__PURE__ */ React.createElement(SizeReadout, { ann }), /* @__PURE__ */ React.createElement(ControlList, { controls: [ANGLE_CONTROL], source: ann, onPatch: patch })), /* @__PURE__ */ React.createElement(TextWrapSection, { ann, patch }), /* @__PURE__ */ React.createElement(
      PanelSection,
      {
        id: "image.filters",
        title: "Photo Adjustments",
        group: true,
        summary: filtersSummary,
        hint: "Adjust the photo's light, color and levels. Adjustments are applied before the Style filter, so a filter works on the adjusted photo."
      },
      PHOTO_ADJUST_SECTIONS.map((group) => {
        const changed = group.controls.filter((c) => isAdjusted(ann, c)).length;
        return /* @__PURE__ */ React.createElement(
          PanelSection,
          {
            key: group.id,
            id: "image.adjust." + group.id,
            title: group.title,
            summary: changed > 0 ? changed + " changed" : void 0,
            onReset: () => patch(resetPatch(group.controls))
          },
          /* @__PURE__ */ React.createElement(ControlList, { controls: group.controls, source: ann, onPatch: patch })
        );
      })
    ), /* @__PURE__ */ React.createElement(ImageStyleSection, { ann, filterType, filterOption, patch }), /* @__PURE__ */ React.createElement(EffectControls, { ann, onPatch: patch }), /* @__PURE__ */ React.createElement(ImageTraceSection, { ann, imageTrace, disabled: isCroppingThis }), /* @__PURE__ */ React.createElement(
      PanelSection,
      {
        id: "image.flatten",
        title: "Flatten",
        summary: Math.round(ann.src.length * 0.75 / 1024) + " KB",
        hint: "Bakes the crop, filter and effects into one image, so you can stack new effects on top. Undo brings them back."
      },
      /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-format-toggle ze-format-toggle-wide", disabled: isCroppingThis, onClick: () => onFlattenImage(ann) }, "Flatten Image")
    ));
  }
  function ImageTraceSection({ ann, imageTrace, disabled }) {
    const [preset, setPreset] = useState25(DEFAULT_TRACE_PRESET);
    const busy = imageTrace.busyId === ann.id;
    return /* @__PURE__ */ React.createElement(
      PanelSection,
      {
        id: "image.trace",
        title: "Vectorize",
        hint: "Turns the image into vector shapes, like Illustrator's Image Trace: a new Vectorized layer goes above it and the image is hidden (show it again in the Layers panel). That layer's panel has all the settings, and changes there update it live. It follows the crop, adjustments and filter. Save it on its own with Save as SVG."
      },
      /* @__PURE__ */ React.createElement("div", { className: "ze-format-field" }, /* @__PURE__ */ React.createElement("span", { className: "ze-format-label" }, "Preset"), /* @__PURE__ */ React.createElement(SelectInput, { options: TRACE_PRESETS.map((p) => ({ key: p.key, label: p.label })), value: preset, onChange: setPreset })),
      /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-format-toggle ze-format-toggle-wide", disabled: disabled || busy, onClick: () => imageTrace.trace(ann, preset) }, busy ? "Vectorizing…" : "Vectorize"),
      imageTrace.error && /* @__PURE__ */ React.createElement("span", { className: "ze-format-hint ze-trace-error" }, imageTrace.error)
    );
  }
  function ImageStyleSection({ ann, filterType, filterOption, patch }) {
    return /* @__PURE__ */ React.createElement(
      PanelSection,
      {
        id: "image.filter",
        title: "Style",
        summary: filterOption ? filterOption.label : void 0,
        hint: 'Overrides the page filter for just this image. "Match Page" follows whatever the page filter is set to.'
      },
      /* @__PURE__ */ React.createElement("div", { className: "ze-format-field" }, /* @__PURE__ */ React.createElement(SelectInput, { options: IMAGE_FILTER_OPTIONS, value: filterType, onChange: (type) => patch({ filter: { ...ann.filter, type } }) })),
      ann.filter && ann.filter.type === "duotone" && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "ze-format-field" }, /* @__PURE__ */ React.createElement("span", { className: "ze-format-label" }, "Dark tone"), /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "color",
          className: "ze-format-color-input",
          value: ann.filter.darkColor || DEFAULT_DUOTONE_DARK,
          onChange: (e) => patch({ filter: { ...ann.filter, darkColor: e.target.value } })
        }
      )), /* @__PURE__ */ React.createElement("div", { className: "ze-format-field" }, /* @__PURE__ */ React.createElement("span", { className: "ze-format-label" }, "Light tone"), /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "color",
          className: "ze-format-color-input",
          value: ann.filter.lightColor || DEFAULT_DUOTONE_LIGHT,
          onChange: (e) => patch({ filter: { ...ann.filter, lightColor: e.target.value } })
        }
      ))),
      ann.filter && FILTER_CONTROLS[ann.filter.type] && /* @__PURE__ */ React.createElement(
        ControlList,
        {
          controls: FILTER_CONTROLS[ann.filter.type],
          source: ann.filter,
          onPatch: (p) => patch({ filter: { ...ann.filter, ...p } })
        }
      )
    );
  }

  // apps/ZEditor/src/ui/panels/format/ShapeFormat.jsx
  var TRANSFORM_CONTROLS = [ANGLE_CONTROL];
  function ShapeFormat({ ann, onUpdate, onRasterizeRect }) {
    const patch = (p) => onUpdate(ann.id, p);
    return /* @__PURE__ */ React.createElement(FormatPanelShell, { title: isEllipse(ann) ? "Format — Ellipse" : "Format — Rectangle" }, /* @__PURE__ */ React.createElement(PanelSection, { id: "rect.fill", title: "Fill", defaultOpen: true, onReset: () => patch(resetPatch(RECT_FILL_CONTROLS)) }, /* @__PURE__ */ React.createElement(ControlList, { controls: RECT_FILL_CONTROLS, source: ann, onPatch: patch })), /* @__PURE__ */ React.createElement(
      PanelSection,
      {
        id: "rect.transform",
        title: "Transform",
        defaultOpen: true,
        hint: isEllipse(ann) ? "Drag a handle to resize; hold Shift to keep its proportions (a circle stays a circle). Use Stroke for an outline. Opacity and blend are in the Layers panel." : "Drag a handle to resize; hold Shift to keep its proportions. Use Rounded for corner radius and Stroke for a border. Opacity and blend are in the Layers panel.",
        onReset: () => patch(resetPatch(TRANSFORM_CONTROLS))
      },
      /* @__PURE__ */ React.createElement(SizeReadout, { ann }),
      /* @__PURE__ */ React.createElement(ControlList, { controls: TRANSFORM_CONTROLS, source: ann, onPatch: patch })
    ), /* @__PURE__ */ React.createElement(EffectControls, { ann, onPatch: patch }), /* @__PURE__ */ React.createElement(TextWrapSection, { ann, patch }), /* @__PURE__ */ React.createElement(PanelSection, { id: "rect.rasterize", title: "Rasterize", hint: "Turns this shape into an image of what it looks like now — gradient, edge shape, stroke and shadow included — so image filters and effects can be applied to it. Undo brings the shape back." }, /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-format-toggle ze-format-toggle-wide", onClick: () => onRasterizeRect(ann) }, "Rasterize to Image")));
  }

  // apps/ZEditor/src/ui/controls/StrokeFormatFields.jsx
  function StrokeFormatFields({ swatches, color, width, minWidth, maxWidth, taper, onColor, onWidth, onTaper }) {
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "ze-format-field" }, /* @__PURE__ */ React.createElement("span", { className: "ze-format-label" }, "Thickness (", Math.round(width), "px)"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "range",
        className: "ze-format-slider",
        min: minWidth,
        max: maxWidth,
        step: "0.5",
        value: width,
        onChange: (e) => onWidth(Number(e.target.value))
      }
    )), /* @__PURE__ */ React.createElement("div", { className: "ze-format-field" }, /* @__PURE__ */ React.createElement("span", { className: "ze-format-label" }, "Taper (", Math.round((taper || 0) * 100 / 0.45), "%)"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "range",
        className: "ze-format-slider",
        min: "0",
        max: "0.45",
        step: "0.01",
        value: taper || 0,
        onChange: (e) => onTaper(Number(e.target.value))
      }
    ), /* @__PURE__ */ React.createElement("span", { className: "ze-format-hint" }, "Thins each end toward a point. 0% keeps a constant, rounded-off width.")), /* @__PURE__ */ React.createElement("div", { className: "ze-format-field" }, /* @__PURE__ */ React.createElement("span", { className: "ze-format-label" }, "Color"), /* @__PURE__ */ React.createElement("div", { className: "ze-format-row ze-format-swatches" }, swatches.map((c) => /* @__PURE__ */ React.createElement(
      "button",
      {
        key: c,
        type: "button",
        className: "ze-format-swatch" + (color === c ? " active" : ""),
        style: { backgroundColor: c },
        title: c,
        onClick: () => onColor(c)
      }
    )), /* @__PURE__ */ React.createElement(CustomColorInput, { value: /^#[0-9a-fA-F]{6}$/.test(color) ? color : "#000000", onChange: onColor }))));
  }

  // apps/ZEditor/src/ui/panels/format/StrokeFormat.jsx
  function StrokeFormat({ ann, onUpdate }) {
    const isHi = ann.tool === "highlighter";
    const patch = (p) => onUpdate(ann.id, p);
    return /* @__PURE__ */ React.createElement(FormatPanelShell, { title: "Format — " + (isHi ? "Highlighter" : "Draw") + " stroke" }, /* @__PURE__ */ React.createElement(PanelSection, { id: "stroke.basic", title: "Stroke", defaultOpen: true, hint: "Drag the round knob above the stroke to rotate it. Opacity and blend are in the Layers panel." }, /* @__PURE__ */ React.createElement(
      StrokeFormatFields,
      {
        swatches: isHi ? HIGHLIGHTER_COLOR_SWATCHES : PEN_COLOR_SWATCHES,
        color: ann.color || (isHi ? HIGHLIGHTER_DEFAULTS.color : PEN_DEFAULTS.color),
        width: ann.strokeWidth || (isHi ? HIGHLIGHTER_DEFAULTS.width : PEN_DEFAULTS.width),
        minWidth: isHi ? 6 : 1,
        maxWidth: isHi ? 40 : 20,
        taper: ann.taper || 0,
        onColor: (c) => patch({ color: c }),
        onWidth: (w) => patch({ strokeWidth: w }),
        onTaper: (t) => patch({ taper: t })
      }
    )));
  }

  // apps/ZEditor/src/model/text/textSize.js
  var MIN_PT = 4;
  var MAX_PT = 200;
  var clampPt = (pt) => Math.min(MAX_PT, Math.max(MIN_PT, pt));
  var round1 = (n) => Math.round(n * 10) / 10;
  var pxFor = (pt) => Math.round(ptToPx(pt) * 1e3) / 1e3;
  function sizeStepPatch(ann, deltaPt) {
    const patch = {};
    const own = pxToPt(ann.fontSize || 16);
    const ownNext = clampPt(round1(own + deltaPt));
    if (ownNext !== round1(own)) patch.fontSize = pxFor(ownNext);
    const runs = ann.colorRuns;
    if (runs && runs.some((r) => r.fontSize != null)) {
      let changed = false;
      const next = runs.map((r) => {
        if (r.fontSize == null) return r;
        const pt = pxToPt(r.fontSize);
        const to = clampPt(round1(pt + deltaPt));
        if (to === round1(pt)) return r;
        changed = true;
        return { ...r, fontSize: pxFor(to) };
      });
      if (changed) patch.colorRuns = next;
    }
    return Object.keys(patch).length ? patch : null;
  }

  // apps/ZEditor/src/ui/controls/FontCombobox.jsx
  var { useState: useState26, useRef: useRef20, useEffect: useEffect20, useMemo: useMemo3 } = React;
  function FontCombobox({ fontOptions, setFontOptions, value, onChange }) {
    const [query, setQuery] = useState26(value || "");
    const [typed, setTyped] = useState26(false);
    const [open, setOpen] = useState26(false);
    const [highlight, setHighlight] = useState26(-1);
    const previewFromRef = useRef20(null);
    const listRef = useRef20(null);
    const [status, setStatus] = useState26(null);
    const [loadingFonts, setLoadingFonts] = useState26(false);
    const containerRef = useRef20(null);
    const uploadInputRef = useRef20(null);
    useEffect20(() => {
      if (previewFromRef.current === null) {
        setQuery(value || "");
        setTyped(false);
      }
    }, [value]);
    useEffect20(() => {
      function handleClickOutside(e) {
        if (containerRef.current && !containerRef.current.contains(e.target)) {
          cancelPreview();
        }
      }
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [value]);
    const filtered = useMemo3(() => {
      const q = typed ? query.trim().toLowerCase() : "";
      if (!q) return fontOptions;
      return fontOptions.filter((f) => f.toLowerCase().includes(q));
    }, [fontOptions, query, typed]);
    useEffect20(() => {
      if (!open || highlight < 0 || !listRef.current) return;
      const item = listRef.current.children[highlight];
      if (item) item.scrollIntoView({ block: "nearest" });
    }, [open, highlight]);
    function openList() {
      if (!open) setHighlight(filtered.indexOf(value));
      setOpen(true);
    }
    function selectFont(font) {
      previewFromRef.current = null;
      onChange(font);
      setQuery(font);
      setTyped(false);
      setOpen(false);
    }
    function cancelPreview() {
      const original = previewFromRef.current;
      previewFromRef.current = null;
      if (original !== null && original !== value) onChange(original);
      setQuery(original !== null ? original : value || "");
      setTyped(false);
      setOpen(false);
    }
    function handleKeyDown(e) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        if (!filtered.length) return;
        const start = open ? highlight : filtered.indexOf(value);
        const step = e.key === "ArrowDown" ? 1 : -1;
        const next = start < 0 ? step > 0 ? 0 : filtered.length - 1 : Math.min(filtered.length - 1, Math.max(0, start + step));
        setOpen(true);
        setHighlight(next);
        if (previewFromRef.current === null) previewFromRef.current = value || "";
        if (!typed) setQuery(filtered[next]);
        onChange(filtered[next]);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (open && highlight >= 0 && filtered[highlight]) selectFont(filtered[highlight]);
        else if (open && filtered.length === 1) selectFont(filtered[0]);
      } else if (e.key === "Escape") {
        if (open) {
          e.preventDefault();
          e.stopPropagation();
          cancelPreview();
        }
      }
    }
    async function handleUploadFont(e) {
      const file = e.target.files && e.target.files[0];
      e.target.value = "";
      if (!file) return;
      setStatus(null);
      try {
        const family = await addCustomFontFile(file, fontOptions);
        setFontOptions((prev) => Array.from(/* @__PURE__ */ new Set([...prev, family])).sort((a, b) => a.localeCompare(b)));
        selectFont(family);
        setStatus({ type: "success", message: `Added "${family}". It will be saved inside the project.` });
      } catch (err) {
        setStatus({ type: "error", message: err.message });
      }
    }
    async function handleLoadLocalFonts() {
      setStatus(null);
      if (!("queryLocalFonts" in window)) {
        setStatus({ type: "error", message: "Local Font Access isn't supported in this browser — try Chrome or Edge." });
        return;
      }
      setLoadingFonts(true);
      try {
        const availableFonts = await window.queryLocalFonts();
        const families = Array.from(new Set(availableFonts.map((f) => f.family))).sort((a, b) => a.localeCompare(b));
        setFontOptions((prev) => Array.from(/* @__PURE__ */ new Set([...prev, ...families])).sort((a, b) => a.localeCompare(b)));
        setStatus({ type: "success", message: `Loaded ${families.length} local fonts.` });
      } catch (err) {
        const denied = err && (err.name === "NotAllowedError" || /permission/i.test(err.message || ""));
        setStatus({ type: "error", message: denied ? "Permission to read local fonts was denied." : "Couldn't load local fonts." });
      } finally {
        setLoadingFonts(false);
      }
    }
    return /* @__PURE__ */ React.createElement("div", { className: "ze-fontbox", ref: containerRef }, /* @__PURE__ */ React.createElement("div", { className: "ze-fontbox-input-wrap" }, /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        className: "ze-format-select ze-fontbox-input",
        value: query,
        onChange: (e) => {
          setQuery(e.target.value);
          setTyped(true);
          setHighlight(-1);
          setOpen(true);
        },
        onFocus: (e) => {
          e.target.select();
          openList();
        },
        onKeyDown: handleKeyDown,
        placeholder: "Search fonts…"
      }
    ), /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-fontbox-caret", onClick: () => open ? cancelPreview() : openList(), "aria-label": "Toggle font list" }, /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 20 20", width: "12", height: "12", fill: "none", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round", strokeLinejoin: "round" }, /* @__PURE__ */ React.createElement("path", { d: "M5.5 7.5l4.5 4.5 4.5-4.5" })))), open && /* @__PURE__ */ React.createElement("div", { className: "ze-fontbox-list", ref: listRef }, filtered.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "ze-fontbox-empty" }, 'No fonts match "', query, '"') : filtered.map((font, i) => /* @__PURE__ */ React.createElement(
      "button",
      {
        key: font,
        type: "button",
        className: "ze-fontbox-item" + (font === value ? " active" : "") + (i === highlight ? " is-highlighted" : ""),
        onMouseEnter: () => setHighlight(i),
        style: { fontFamily: `'${font}', sans-serif` },
        onClick: () => selectFont(font)
      },
      font
    ))), /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-fontbox-load", onClick: handleLoadLocalFonts, disabled: loadingFonts }, loadingFonts ? "Loading…" : "+ Load Local System Fonts"), /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-fontbox-load", onClick: () => uploadInputRef.current && uploadInputRef.current.click(), title: "Add a font file. It is saved inside the project, so it still works on another PC." }, "+ Upload Font File…"), /* @__PURE__ */ React.createElement("input", { ref: uploadInputRef, type: "file", accept: ".ttf,.otf,.woff,.woff2", style: { display: "none" }, onChange: handleUploadFont }), status && /* @__PURE__ */ React.createElement("span", { className: "ze-format-hint" + (status.type === "error" ? " is-error" : "") }, status.message));
  }

  // apps/ZEditor/src/ui/panels/TextBasicSection.jsx
  var VERTICAL_ALIGNS = [
    { key: "top", label: "Align top", path: "M4 4h16M12 8v12M8 12l4-4 4 4" },
    { key: "center", label: "Align middle", path: "M4 12h16M12 3v5M9.5 5.5 12 8l2.5-2.5M12 21v-5M9.5 18.5 12 16l2.5 2.5" },
    { key: "bottom", label: "Align bottom", path: "M4 20h16M12 4v12M8 12l4 4 4-4" }
  ];
  function TextBasicSection({ fontOptions, setFontOptions, fontFamily, fontSize, bold, italic, underline, align, verticalAlign, frameHeight, color, fillAlphaSource, onFillAlpha, onChange, onStepSize }) {
    const stepSize = (deltaPt) => {
      if (onStepSize) {
        onStepSize(deltaPt);
        return;
      }
      const patch = sizeStepPatch({ fontSize }, deltaPt);
      if (patch) onChange(patch);
    };
    return /* @__PURE__ */ React.createElement(PanelSection, { id: "text.basic", title: "Text/Character", defaultOpen: true }, /* @__PURE__ */ React.createElement("div", { className: "ze-format-field" }, /* @__PURE__ */ React.createElement("span", { className: "ze-format-label" }, "Font"), /* @__PURE__ */ React.createElement(FontCombobox, { fontOptions, setFontOptions, value: fontFamily, onChange: (v) => onChange({ fontFamily: v }) })), /* @__PURE__ */ React.createElement("div", { className: "ze-format-field" }, /* @__PURE__ */ React.createElement("span", { className: "ze-format-label" }, "Size & style"), /* @__PURE__ */ React.createElement("div", { className: "ze-format-inline ze-format-inline-wrap" }, /* @__PURE__ */ React.createElement(
      NumberBox,
      {
        className: "ze-format-number",
        min: "4",
        max: "200",
        step: "0.5",
        "aria-label": "Font size (pt)",
        title: "Font size (pt)",
        value: Math.round(pxToPt(fontSize) * 10) / 10,
        onChange: (e) => {
          const pt = Number(e.target.value);
          if (pt > 0) onChange({ fontSize: Math.round(ptToPx(pt) * 1e3) / 1e3 });
        }
      }
    ), /* @__PURE__ */ React.createElement("span", { className: "ze-format-hint", style: { margin: 0 } }, "pt"), /* @__PURE__ */ React.createElement("span", { className: "ze-format-group" }, /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-format-toggle ze-format-sizestep", "aria-label": "Smaller text", title: "Smaller: takes 1 pt off the whole text box", onClick: () => stepSize(-1) }, "T−"), /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-format-toggle ze-format-sizestep", "aria-label": "Bigger text", title: "Bigger: adds 1 pt to the whole text box", onClick: () => stepSize(1) }, "T+")), /* @__PURE__ */ React.createElement("span", { className: "ze-format-group" }, /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-format-toggle" + (bold ? " active" : ""), title: "Bold", onClick: () => onChange({ bold: !bold }) }, /* @__PURE__ */ React.createElement("strong", null, "B")), /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-format-toggle" + (italic ? " active" : ""), title: "Italic", onClick: () => onChange({ italic: !italic }) }, /* @__PURE__ */ React.createElement("em", null, "I")), /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-format-toggle" + (underline ? " active" : ""), title: "Underline", onClick: () => onChange({ underline: !underline }) }, /* @__PURE__ */ React.createElement("span", { style: { textDecoration: "underline" } }, "U"))))), /* @__PURE__ */ React.createElement("div", { className: "ze-format-field" }, /* @__PURE__ */ React.createElement("span", { className: "ze-format-label", title: "Resize the box (drag its corner while editing) to see centering/right-align take effect." }, "Horizontal Align"), /* @__PURE__ */ React.createElement("div", { className: "ze-format-row" }, /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-format-toggle" + (align === "left" ? " active" : ""), title: "Align left", onClick: () => onChange({ align: "left" }) }, /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 24 24", width: "14", height: "14", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round" }, /* @__PURE__ */ React.createElement("path", { d: "M4 6h16M4 12h10M4 18h13" }))), /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-format-toggle" + (align === "center" ? " active" : ""), title: "Align center", onClick: () => onChange({ align: "center" }) }, /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 24 24", width: "14", height: "14", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round" }, /* @__PURE__ */ React.createElement("path", { d: "M4 6h16M7 12h10M5.5 18h13" }))), /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-format-toggle" + (align === "right" ? " active" : ""), title: "Align right", onClick: () => onChange({ align: "right" }) }, /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 24 24", width: "14", height: "14", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round" }, /* @__PURE__ */ React.createElement("path", { d: "M4 6h16M10 12h10M7 18h13" }))), /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-format-toggle" + (align === "justify" ? " active" : ""), title: "Justify (the last line stays left; more options in Paragraph)", onClick: () => onChange({ align: "justify" }) }, /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 24 24", width: "14", height: "14", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round" }, /* @__PURE__ */ React.createElement("path", { d: "M4 6h16M4 12h16M4 18h16" }))))), verticalAlign !== void 0 && /* @__PURE__ */ React.createElement("div", { className: "ze-format-field" }, /* @__PURE__ */ React.createElement("span", { className: "ze-format-label", title: "Where the text sits in a box with a fixed height" }, "Vertical Align"), /* @__PURE__ */ React.createElement("div", { className: "ze-format-row" }, VERTICAL_ALIGNS.map((v) => /* @__PURE__ */ React.createElement(
      "button",
      {
        key: v.key,
        type: "button",
        className: "ze-format-toggle" + ((verticalAlign || "top") === v.key ? " active" : ""),
        disabled: !(frameHeight > 0),
        title: frameHeight > 0 ? v.label : "Give the box a fixed height first (drag its top or bottom handle, or set Frame height under Columns & frame)",
        onClick: () => onChange({ verticalAlign: v.key === "top" ? void 0 : v.key })
      },
      /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 24 24", width: "14", height: "14", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round" }, /* @__PURE__ */ React.createElement("path", { d: v.path }))
    )))), /* @__PURE__ */ React.createElement("div", { className: "ze-format-field" }, /* @__PURE__ */ React.createElement("span", { className: "ze-format-label" }, "Color"), /* @__PURE__ */ React.createElement("div", { className: "ze-format-row ze-format-swatches" }, TEXT_COLOR_SWATCHES.map((c) => /* @__PURE__ */ React.createElement("button", { key: c, type: "button", className: "ze-format-swatch" + (color === c ? " active" : ""), style: { backgroundColor: c }, title: c, onClick: () => onChange({ color: c }) })), /* @__PURE__ */ React.createElement(CustomColorInput, { value: /^#[0-9a-fA-F]{6}$/.test(color) ? color : "#1a1a1a", onChange: (c) => onChange({ color: c }) }))), fillAlphaSource && /* @__PURE__ */ React.createElement(ControlList, { controls: [TEXT_FILL_ALPHA_CONTROL], source: fillAlphaSource, onPatch: onFillAlpha }));
  }

  // apps/ZEditor/src/ui/panels/TextPhotoFill.jsx
  var { useState: useState27, useRef: useRef21 } = React;
  function TextPhotoFill({ ann, patch }) {
    const inputRef = useRef21(null);
    const [error, setError] = useState27(null);
    const hasPhoto = Boolean(ann.fillSrc);
    async function handleChosen(e) {
      const file = e.target.files && e.target.files[0];
      e.target.value = "";
      if (!file) return;
      try {
        setError(null);
        const { src, width, height } = await readPhotoFile(file);
        patch({ fillSrc: src, fillNatW: width, fillNatH: height });
      } catch (err) {
        setError(err.message);
      }
    }
    const choose = () => inputRef.current && inputRef.current.click();
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
      PanelSection,
      {
        id: "text.photo",
        title: "Photo fill",
        checked: hasPhoto,
        hint: "Shows a photo through the letters. Lower its opacity to let the text color or gradient show through.",
        onToggle: (on) => on ? choose() : patch(Object.fromEntries(TEXT_PHOTO_PROPS.map((prop) => [prop, void 0]))),
        onReset: () => patch(resetPatch(TEXT_PHOTO_CONTROLS))
      },
      /* @__PURE__ */ React.createElement("div", { className: "ze-format-field" }, /* @__PURE__ */ React.createElement("div", { className: "ze-format-row" }, /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-format-toggle ze-format-toggle-wide", onClick: choose }, "Change photo…"))),
      /* @__PURE__ */ React.createElement(ControlList, { controls: TEXT_PHOTO_CONTROLS, source: ann, onPatch: patch })
    ), /* @__PURE__ */ React.createElement("input", { ref: inputRef, type: "file", accept: "image/*", style: { display: "none" }, onChange: handleChosen }), error && /* @__PURE__ */ React.createElement("span", { className: "ze-format-hint is-error", style: { padding: "8px 16px", margin: 0 } }, error));
  }

  // apps/ZEditor/src/model/text/placeholderText.js
  var PLACEHOLDER_KINDS = [
    { key: "latin", label: "Lorem ipsum" },
    { key: "chinese", label: "中文假文" }
  ];
  var MAX_PLACEHOLDER_PARAGRAPHS = 50;
  var LATIN_OPENING = "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.";
  var LATIN_WORDS = "lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure in reprehenderit voluptate velit esse cillum fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt culpa qui officia deserunt mollit anim id est laborum curabitur pretium tincidunt lacus nunc viverra imperdiet fusce placerat mauris integer vitae justo eget magna fermentum iaculis porta nibh venenatis cras semper auctor neque donec ultrices tortor pellentesque habitant morbi tristique senectus netus".split(" ");
  var CHINESE_CHARS = Array.from(
    "的一是在不了有和人这中大为上个国我以要他时来用们生到作地于出就分对成会可主发年动同工也能下过子说产种面而方后多定行学法所民得经十三之进着等部度家电力里如水化高自二理起小物现实加量都两体制机当使点从业本去把性好应开它合还因由其些然前外天政四日那社义事平形相全表间样与关各重新线内数正心反你明看原又么利比或但质气第向道命此变条只没结解问意建月公无系军很情者最立代想已通并提直题党程展五果料象员革位入常文总次品式活设及管特件长求老头基资边流路级少图山统接知较将组见计别她手角期根论运农指几九区强放决西被干做必战先回则任取据处府"
  );
  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = a + 1831565813 >>> 0;
      let t = a;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  var between = (rand, lo, hi) => lo + Math.floor(rand() * (hi - lo + 1));
  function latinParagraph(rand, first) {
    const sentences = first ? [LATIN_OPENING] : [];
    const count = between(rand, 4, 6) - sentences.length;
    for (let s = 0; s < count; s++) {
      const words = [];
      const len = between(rand, 6, 14);
      for (let w = 0; w < len; w++) {
        words.push(LATIN_WORDS[Math.floor(rand() * LATIN_WORDS.length)]);
        if (w > 2 && w < len - 2 && rand() < 0.12) words[words.length - 1] += ",";
      }
      const sentence = words.join(" ");
      sentences.push(sentence[0].toUpperCase() + sentence.slice(1) + ".");
    }
    return sentences.join(" ");
  }
  function chineseParagraph(rand) {
    let out = "";
    const sentences = between(rand, 3, 5);
    for (let s = 0; s < sentences; s++) {
      const clauses = between(rand, 1, 3);
      for (let c = 0; c < clauses; c++) {
        const len = between(rand, 5, 12);
        for (let i = 0; i < len; i++) out += CHINESE_CHARS[Math.floor(rand() * CHINESE_CHARS.length)];
        out += c < clauses - 1 ? "，" : rand() < 0.15 ? "？" : "。";
      }
    }
    return out;
  }
  function placeholderText(kind, count) {
    const n = Math.max(1, Math.min(MAX_PLACEHOLDER_PARAGRAPHS, Math.round(Number(count)) || 1));
    const rand = rng(kind === "chinese" ? 23070 : 4323);
    const paragraphs = [];
    for (let i = 0; i < n; i++) paragraphs.push(kind === "chinese" ? chineseParagraph(rand) : latinParagraph(rand, i === 0));
    return paragraphs.join("\n");
  }

  // apps/ZEditor/src/ui/panels/TextPlaceholder.jsx
  var { useState: useState28 } = React;
  function TextPlaceholder({ ann, patch }) {
    const [kind, setKind] = useState28("latin");
    const [count, setCount] = useState28(3);
    const text = ann.text || "";
    const replace = () => patch({ text: placeholderText(kind, count), colorRuns: void 0 });
    const append = () => patch({ text: (text && !text.endsWith("\n") ? text + "\n" : text) + placeholderText(kind, count) });
    return /* @__PURE__ */ React.createElement(
      PanelSection,
      {
        id: "text.placeholder",
        title: "Placeholder text",
        hint: "Fills the box with dummy text, to try a layout before the real words are ready. Each paragraph is a new line. In linked frames, the text flows on into the next frame."
      },
      /* @__PURE__ */ React.createElement("div", { className: "ze-format-field" }, /* @__PURE__ */ React.createElement("span", { className: "ze-format-label" }, "Text"), /* @__PURE__ */ React.createElement("div", { className: "ze-format-inline" }, /* @__PURE__ */ React.createElement("select", { className: "ze-format-select", "aria-label": "Placeholder language", value: kind, onChange: (e) => setKind(e.target.value) }, PLACEHOLDER_KINDS.map((k) => /* @__PURE__ */ React.createElement("option", { key: k.key, value: k.key }, k.label))), /* @__PURE__ */ React.createElement(
        NumberBox,
        {
          className: "ze-format-number",
          min: "1",
          max: MAX_PLACEHOLDER_PARAGRAPHS,
          step: "1",
          "aria-label": "Paragraphs",
          title: "Number of paragraphs",
          value: count,
          onChange: (e) => setCount(e.target.value),
          onBlur: () => setCount(Math.max(1, Math.min(MAX_PLACEHOLDER_PARAGRAPHS, Math.round(Number(count)) || 1)))
        }
      ), /* @__PURE__ */ React.createElement("span", { className: "ze-format-hint", style: { margin: 0 } }, "¶"))),
      /* @__PURE__ */ React.createElement("div", { className: "ze-format-row" }, /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-format-toggle ze-format-toggle-wide", onClick: replace, title: "Replace this box's text with the placeholder" }, "Replace text"), /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-format-toggle ze-format-toggle-wide", onClick: append, title: "Add the placeholder after this box's text" }, "Append"))
    );
  }

  // apps/ZEditor/src/ui/panels/TextSpans.jsx
  var { useState: useState29 } = React;
  var ALIGNS = [
    { key: "left", label: "Align left", path: "M4 6h16M4 12h10M4 18h13" },
    { key: "center", label: "Align center", path: "M4 6h16M7 12h10M5.5 18h13" },
    { key: "right", label: "Align right", path: "M4 6h16M10 12h10M7 18h13" },
    { key: "justify", label: "Justify", path: "M4 6h16M4 12h16M4 18h16" }
  ];
  function TextSpans({ ann, patch, fontOptions, setFontOptions }) {
    const [message, setMessage] = useState29(null);
    const keepFocus = (e) => e.preventDefault();
    const text = ann.text || "";
    const runs = ann.colorRuns;
    function selection(allowCaret) {
      const { annId, start } = textSelectionStore;
      const end = Math.min(textSelectionStore.end, text.length);
      if (annId !== ann.id || end < start || !allowCaret && end === start) {
        setMessage(allowCaret ? "Double-click the text and put the caret in a paragraph first." : "Double-click the text and select some letters first.");
        return null;
      }
      setMessage(null);
      return { start, end };
    }
    const setProps = (props) => {
      const sel = selection(false);
      if (sel) patch({ colorRuns: setRunProps(runs, sel.start, sel.end, props) });
    };
    const current = (key) => {
      const { annId, start } = textSelectionStore;
      const run2 = annId === ann.id ? runAt(runs, start) : null;
      return run2 && run2[key] != null ? run2[key] : ann[key];
    };
    const toggle = (key) => setProps({ [key]: !current(key) });
    const strikeNow = () => {
      const { annId, start } = textSelectionStore;
      const run2 = annId === ann.id ? runAt(runs, start) : null;
      return run2 && run2.strike != null ? run2.strike : Boolean(ann.strike && ann.strike !== "none");
    };
    function setAlign(align) {
      const sel = selection(true);
      if (!sel) return;
      const from = text.lastIndexOf("\n", sel.start - 1) + 1;
      let to = text.indexOf("\n", sel.end);
      if (to < 0) to = text.length;
      patch({ colorRuns: setRunProps(runs, from, Math.max(to, from + 1), { align }) });
    }
    const [sizeDraft, setSizeDraft] = useState29(null);
    function applySize() {
      if (sizeDraft == null) return;
      const pt = Number(sizeDraft);
      setSizeDraft(null);
      if (pt > 0) setProps({ fontSize: Math.round(ptToPx(pt) * 1e3) / 1e3 });
    }
    const count = (runs || []).reduce((total, run2) => total + run2.end - run2.start, 0);
    return /* @__PURE__ */ React.createElement("div", { className: "ze-format-field" }, /* @__PURE__ */ React.createElement("div", { className: "ze-format-field" }, /* @__PURE__ */ React.createElement("span", { className: "ze-format-label" }, "Font"), /* @__PURE__ */ React.createElement(FontCombobox, { fontOptions, setFontOptions, value: current("fontFamily"), onChange: (v) => setProps({ fontFamily: v }) })), /* @__PURE__ */ React.createElement("div", { className: "ze-format-field" }, /* @__PURE__ */ React.createElement("span", { className: "ze-format-label" }, "Size"), /* @__PURE__ */ React.createElement("div", { className: "ze-format-inline" }, /* @__PURE__ */ React.createElement(
      NumberBox,
      {
        className: "ze-format-number",
        min: "4",
        max: "200",
        step: "0.5",
        "aria-label": "Size of the selected letters (pt)",
        title: "Size of the selected letters (pt). Press Enter or leave the box to apply.",
        value: sizeDraft != null ? sizeDraft : Math.round(pxToPt(current("fontSize") || 16) * 10) / 10,
        onChange: (e) => setSizeDraft(e.target.value),
        onKeyDown: (e) => {
          if (e.key === "Enter") applySize();
        },
        onBlur: applySize
      }
    ), /* @__PURE__ */ React.createElement("span", { className: "ze-format-hint", style: { margin: 0 } }, "pt"))), /* @__PURE__ */ React.createElement("div", { className: "ze-format-field", onMouseDown: keepFocus }, /* @__PURE__ */ React.createElement("span", { className: "ze-format-label" }, "Style"), /* @__PURE__ */ React.createElement("div", { className: "ze-format-row" }, /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-format-toggle", title: "Bold the selected letters", onClick: () => toggle("bold") }, /* @__PURE__ */ React.createElement("strong", null, "B")), /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-format-toggle", title: "Italicize the selected letters", onClick: () => toggle("italic") }, /* @__PURE__ */ React.createElement("em", null, "I")), /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-format-toggle", title: "Underline the selected letters", onClick: () => toggle("underline") }, /* @__PURE__ */ React.createElement("span", { style: { textDecoration: "underline" } }, "U")), /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-format-toggle", title: "Strike through the selected letters", onClick: () => setProps({ strike: !strikeNow() }) }, /* @__PURE__ */ React.createElement("span", { style: { textDecoration: "line-through" } }, "S")))), /* @__PURE__ */ React.createElement("div", { className: "ze-format-field", onMouseDown: keepFocus }, /* @__PURE__ */ React.createElement("span", { className: "ze-format-label", title: "Applies to the whole paragraphs the selection or caret is in" }, "Paragraph align"), /* @__PURE__ */ React.createElement("div", { className: "ze-format-row" }, ALIGNS.map((a) => /* @__PURE__ */ React.createElement("button", { key: a.key, type: "button", className: "ze-format-toggle", title: a.label + " (the selected paragraphs)", onClick: () => setAlign(a.key) }, /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 24 24", width: "14", height: "14", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round" }, /* @__PURE__ */ React.createElement("path", { d: a.path })))))), /* @__PURE__ */ React.createElement("div", { className: "ze-format-field" }, /* @__PURE__ */ React.createElement("span", { className: "ze-format-label" }, "Color"), /* @__PURE__ */ React.createElement("div", { className: "ze-format-row ze-format-swatches", onMouseDown: keepFocus }, TEXT_COLOR_SWATCHES.map((c) => /* @__PURE__ */ React.createElement("button", { key: c, type: "button", className: "ze-format-swatch", style: { backgroundColor: c }, title: "Color the selected letters " + c, onClick: () => setProps({ color: c }) })), /* @__PURE__ */ React.createElement(CustomColorInput, { value: "#dd531a", onChange: (c) => setProps({ color: c }) }))), /* @__PURE__ */ React.createElement("div", { className: "ze-format-row", onMouseDown: keepFocus }, /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-format-toggle ze-format-toggle-wide", title: "The selected letters go back to the box's own settings", onClick: () => {
      const sel = selection(false);
      if (sel) patch({ colorRuns: clearRunProps(runs, sel.start, sel.end) });
    } }, "Reset selected"), /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-format-toggle ze-format-toggle-wide", disabled: !count, onClick: () => {
      setMessage(null);
      patch({ colorRuns: void 0 });
    } }, "Reset all")), /* @__PURE__ */ React.createElement("span", { className: "ze-format-hint" }, message || (count ? count + " letter" + (count === 1 ? "" : "s") + " customized. Select letters while editing, then change them here." : "Double-click the text, select some letters, then change them here. The rest of the box keeps its own settings.")));
  }

  // apps/ZEditor/src/ui/panels/TextStyles.jsx
  var { useState: useState30 } = React;
  function TextStyles({ ann, patch, textStyles, onSaveStyle, onDeleteStyle, styleActions }) {
    const [name, setName] = useState30("");
    const [basedOn, setBasedOn] = useState30("");
    const [message, setMessage] = useState30(null);
    const linkedName = ann.styleName || null;
    const linkedStyle = linkedName ? textStyles.find((s) => s.name === linkedName) : null;
    const overrideCount = (ann.styleOverrides || []).length;
    function save() {
      const clean = name.trim();
      if (!clean) {
        setMessage("Type a name for the style first.");
        return;
      }
      if (BUILT_IN_TEXT_STYLES.some((s) => s.name.toLowerCase() === clean.toLowerCase())) {
        setMessage("That name is used by a built-in style.");
        return;
      }
      onSaveStyle(clean, ann, basedOn || void 0);
      patch({ styleName: clean, styleOverrides: void 0 });
      setName("");
      setMessage(`Saved "${clean}" and linked this text to it.`);
    }
    const apply = (style) => {
      setMessage(null);
      styleActions.apply(ann, style);
    };
    return /* @__PURE__ */ React.createElement("div", { className: "ze-format-field" }, /* @__PURE__ */ React.createElement("div", { className: "ze-style-chips" }, BUILT_IN_TEXT_STYLES.map((style) => /* @__PURE__ */ React.createElement("button", { key: style.name, type: "button", className: "ze-format-toggle", title: `Give this text the ${style.name} look (a plain copy, not linked)`, onClick: () => apply(style) }, style.name)), textStyles.map((style) => /* @__PURE__ */ React.createElement("span", { key: style.name, className: "ze-style-chip" }, /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-format-toggle" + (style.name === linkedName ? " active" : ""), title: `Give this text the "${style.name}" look and link it to the style${style.basedOn ? ` (based on "${style.basedOn}")` : ""}`, onClick: () => apply(style) }, style.name), /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-style-chip-delete", title: `Delete "${style.name}"`, "aria-label": `Delete style ${style.name}`, onClick: () => onDeleteStyle(style.name) }, "×")))), linkedName && /* @__PURE__ */ React.createElement("div", { className: "ze-style-linked" }, /* @__PURE__ */ React.createElement("span", { className: "ze-format-hint", style: { margin: "8px 0 6px" } }, linkedStyle ? /* @__PURE__ */ React.createElement(React.Fragment, null, "Linked to “", linkedName, "”", overrideCount ? ` · ${overrideCount} local change${overrideCount === 1 ? "" : "s"}` : " · matches the style") : /* @__PURE__ */ React.createElement(React.Fragment, null, "Linked to “", linkedName, "”, which no longer exists.")), /* @__PURE__ */ React.createElement("div", { className: "ze-format-row" }, linkedStyle && /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-format-toggle ze-format-toggle-wide", title: `Make this text's look the new definition of "${linkedName}", restyling every text box that uses it`, onClick: () => {
      styleActions.redefine(linkedName, ann);
      setMessage(`Updated "${linkedName}" and every text using it.`);
    } }, "Update style"), linkedStyle && /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-format-toggle ze-format-toggle-wide", disabled: !overrideCount, title: "Undo this text's own changes so it matches the style again", onClick: () => {
      styleActions.resetOverrides(ann);
      setMessage(null);
    } }, "Reset"), /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-format-toggle ze-format-toggle-wide", title: "Keep the look but stop following the style", onClick: () => {
      styleActions.unlink(ann);
      setMessage(null);
    } }, "Unlink"))), /* @__PURE__ */ React.createElement("div", { className: "ze-format-row ze-style-row", style: { marginTop: 10 } }, /* @__PURE__ */ React.createElement("input", { type: "text", className: "ze-format-number ze-style-name", placeholder: "Name this look…", maxLength: "30", value: name, onChange: (e) => setName(e.target.value), onKeyDown: (e) => {
      if (e.key === "Enter") save();
    } }), /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-format-toggle ze-style-save", onClick: save }, "Save")), textStyles.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "ze-format-row", style: { marginTop: 6 } }, /* @__PURE__ */ React.createElement("select", { className: "ze-format-select", "aria-label": "Based on", value: basedOn, onChange: (e) => setBasedOn(e.target.value) }, /* @__PURE__ */ React.createElement("option", { value: "" }, "Not based on another style"), textStyles.map((s) => /* @__PURE__ */ React.createElement("option", { key: s.name, value: s.name }, "Based on: ", s.name)))), /* @__PURE__ */ React.createElement("span", { className: "ze-format-hint" }, message || "Saves the font, size, colour, spacing, paragraph settings, case and effects (not the words) with the project. Texts using a style follow it when you Update it."));
  }

  // apps/ZEditor/src/ui/panels/format/TextFormat.jsx
  var SPACING_CONTROLS = [LINE_SPACING_CONTROL, LEADING_CONTROL, LETTER_SPACING_CONTROL, KERNING_CONTROL, CASE_CONTROL, VERTICAL_CONTROL, FIT_HEIGHT_CONTROL, STRIKE_CONTROL];
  var ALL_PARAGRAPH_CONTROLS = [COMPOSER_CONTROL, HYPHENATE_CONTROL, JUSTIFY_LAST_CONTROL, ...PARAGRAPH_CONTROLS];
  function TextFormat({ ann, onUpdate, onRasterizeText, toolDefaults, styleActions }) {
    const patch = (p) => onUpdate(ann.id, p);
    const { fontOptions, setFontOptions, textStyles, handleSaveTextStyle, handleDeleteTextStyle } = toolDefaults;
    return /* @__PURE__ */ React.createElement(FormatPanelShell, { title: "Format — Text" }, /* @__PURE__ */ React.createElement(TextPlaceholder, { ann, patch }), /* @__PURE__ */ React.createElement(
      TextBasicSection,
      {
        fontOptions,
        setFontOptions,
        fontFamily: ann.fontFamily,
        fontSize: ann.fontSize || 16,
        bold: ann.bold,
        italic: ann.italic,
        underline: ann.underline,
        align: ann.align,
        verticalAlign: ann.verticalAlign || null,
        frameHeight: ann.frameHeight,
        color: ann.color,
        fillAlphaSource: ann,
        onFillAlpha: patch,
        onChange: patch,
        onStepSize: (deltaPt) => {
          const stepped = sizeStepPatch(ann, deltaPt);
          if (stepped) patch(stepped);
        }
      }
    ), /* @__PURE__ */ React.createElement(
      PanelSection,
      {
        id: "text.paragraph",
        title: "Paragraph",
        onReset: () => patch(resetPatch(ALL_PARAGRAPH_CONTROLS)),
        hint: "Justification, indents and paragraph spacing are set by one layout that the editor and Export share (paragraphs are split at each new line). Not used with Ransom, Curve or Stacked text."
      },
      /* @__PURE__ */ React.createElement(
        ControlList,
        {
          controls: [COMPOSER_CONTROL, HYPHENATE_CONTROL, ...ann.align === "justify" ? [JUSTIFY_LAST_CONTROL] : [], ...PARAGRAPH_CONTROLS],
          source: ann,
          onPatch: (p) => patch(p.composer === "auto" ? { composer: void 0 } : p)
        }
      )
    ), /* @__PURE__ */ React.createElement(
      PanelSection,
      {
        id: "text.frame",
        title: "Columns & frame",
        onReset: () => patch({ ...resetPatch(COLUMN_CONTROLS), verticalAlign: void 0 }),
        hint: "Several columns balance the text. Give the frame a height and the text fills the columns in order; if it doesn't all fit, the rest is hidden and a red + shows in the corner (click it to continue the text in a new linked box). Set the box's width first (drag its side handle)."
      },
      /* @__PURE__ */ React.createElement(ControlList, { controls: COLUMN_CONTROLS, source: ann, onPatch: (p) => patch(p.columnRule === "none" ? { columnRule: void 0 } : p) })
    ), /* @__PURE__ */ React.createElement(PanelSection, { id: "text.styles", title: "Presets" }, /* @__PURE__ */ React.createElement(TextStyles, { ann, patch, textStyles, onSaveStyle: handleSaveTextStyle, onDeleteStyle: handleDeleteTextStyle, styleActions })), /* @__PURE__ */ React.createElement(PanelSection, { id: "text.spacing", title: "Spacing & layout", onReset: () => patch(resetPatch(SPACING_CONTROLS)) }, /* @__PURE__ */ React.createElement(ControlList, { controls: SPACING_CONTROLS, source: ann, onPatch: patch })), /* @__PURE__ */ React.createElement(
      PanelSection,
      {
        id: "text.letters",
        title: "Custom Text Style (span)",
        hint: "Changes only the letters you select (font, size, bold, italic, underline, strike-through, color), or the alignment of the paragraphs they're in. Custom fonts, sizes, bold, italic or alignment set the box with the paragraph layout, as Justify does."
      },
      /* @__PURE__ */ React.createElement(TextSpans, { ann, patch, fontOptions, setFontOptions })
    ), /* @__PURE__ */ React.createElement(EffectControls, { ann, onPatch: patch, effects: TEXT_EFFECTS, before: /* @__PURE__ */ React.createElement(TextPhotoFill, { ann, patch }), beforeLabel: ann.fillSrc ? "Photo fill" : void 0 }), /* @__PURE__ */ React.createElement(PanelSection, { id: "text.transform", title: "Rotation", hint: "Opacity and blend are in the Layers panel.", onReset: () => patch(resetPatch([ANGLE_CONTROL])) }, /* @__PURE__ */ React.createElement(ControlList, { controls: [ANGLE_CONTROL], source: ann, onPatch: patch })), /* @__PURE__ */ React.createElement(PanelSection, { id: "text.rasterize", title: "Rasterize", hint: "Turns this text into an image of what it looks like now, so you can apply Halftone, Xerox or Threshold to it. The words can't be edited afterwards; Undo brings the text back." }, /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-format-toggle ze-format-toggle-wide", disabled: !ann.text || ann.storyHeadId != null, title: ann.storyHeadId != null ? "Unlink the threaded frames first" : void 0, onClick: () => onRasterizeText(ann) }, "Rasterize to Image")));
  }

  // apps/ZEditor/src/ui/panels/format/TraceFormat.jsx
  var PRESET_ICONS = {
    bw: /* @__PURE__ */ React.createElement("g", null, /* @__PURE__ */ React.createElement("rect", { x: "3", y: "3", width: "18", height: "18", rx: "2", fill: "#fff", stroke: "currentColor" }), /* @__PURE__ */ React.createElement("path", { d: "M3 21 21 3v16a2 2 0 0 1-2 2Z", fill: "currentColor" })),
    lineart: /* @__PURE__ */ React.createElement("path", { d: "M4 18c3-8 6-12 9-6s4 4 7-6", fill: "none", stroke: "currentColor", strokeWidth: "2.4", strokeLinecap: "round" }),
    silhouette: /* @__PURE__ */ React.createElement("path", { d: "M12 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8Zm-7 18c0-5 3-8 7-8s7 3 7 8Z", fill: "currentColor" }),
    outline: /* @__PURE__ */ React.createElement("path", { d: "M12 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8Zm-7 18c0-5 3-8 7-8s7 3 7 8Z", fill: "none", stroke: "currentColor", strokeWidth: "1.6" }),
    gray: /* @__PURE__ */ React.createElement("g", null, /* @__PURE__ */ React.createElement("rect", { x: "3", y: "4", width: "6", height: "16", fill: "#222" }), /* @__PURE__ */ React.createElement("rect", { x: "9", y: "4", width: "6", height: "16", fill: "#777" }), /* @__PURE__ */ React.createElement("rect", { x: "15", y: "4", width: "6", height: "16", fill: "#ccc" })),
    color3: /* @__PURE__ */ React.createElement("g", null, /* @__PURE__ */ React.createElement("rect", { x: "3", y: "4", width: "6", height: "16", fill: "#d33" }), /* @__PURE__ */ React.createElement("rect", { x: "9", y: "4", width: "6", height: "16", fill: "#3a4" }), /* @__PURE__ */ React.createElement("rect", { x: "15", y: "4", width: "6", height: "16", fill: "#36d" })),
    color6: /* @__PURE__ */ React.createElement("g", null, ["#d33", "#e93", "#ed3", "#3a4", "#36d", "#93c"].map((c, i) => /* @__PURE__ */ React.createElement("rect", { key: c, x: 3 + i % 3 * 6, y: i < 3 ? 4 : 12, width: "6", height: "8", fill: c }))),
    color16: /* @__PURE__ */ React.createElement("g", null, Array.from({ length: 16 }, (_, i) => /* @__PURE__ */ React.createElement("rect", { key: i, x: 3 + i % 4 * 4.5, y: 3 + Math.floor(i / 4) * 4.5, width: "4.5", height: "4.5", fill: `hsl(${i * 22} 70% ${40 + i % 3 * 12}%)` })))
  };
  var METHODS = [
    { key: "abut", label: "Abutting", hint: "Each shape is exactly its own colour's area. Thin gaps can show where colours meet.", icon: /* @__PURE__ */ React.createElement("g", null, /* @__PURE__ */ React.createElement("path", { d: "M4 4h8v16H4Z", fill: "currentColor" }), /* @__PURE__ */ React.createElement("path", { d: "M12 4h8v16h-8Z", fill: "none", stroke: "currentColor", strokeWidth: "1.6" })) },
    { key: "overlap", label: "Overlapping", hint: "Each shape also runs under the colours above it, so no gaps show between colours.", icon: /* @__PURE__ */ React.createElement("g", null, /* @__PURE__ */ React.createElement("path", { d: "M4 4h12v16H4Z", fill: "currentColor", opacity: "0.55" }), /* @__PURE__ */ React.createElement("path", { d: "M10 4h10v16H10Z", fill: "none", stroke: "currentColor", strokeWidth: "1.6" })) }
  ];
  function TraceFormat({ ann, imageTrace, onUpdate, onRasterize, onExportSvg }) {
    const s = normalizeTraceSettings(ann.trace);
    const live = isLiveTrace(ann);
    const change = (patch) => imageTrace.change(ann, patch);
    const busy = imageTrace.busyId === ann.id;
    const custom = !matchesPreset(s);
    const presetLabel2 = (TRACE_PRESETS.find((p) => p.key === s.preset) || TRACE_PRESETS[0]).label;
    const presetOptions = [...custom ? [{ key: "custom", label: "Custom (from " + presetLabel2 + ")" }] : [], ...TRACE_PRESETS.map((p) => ({ key: p.key, label: p.label }))];
    const pickPreset = (key) => {
      if (key !== "custom") change(key === s.preset ? Object.fromEntries(Object.entries(presetSettings(key)).filter(([k]) => k !== "view")) : { preset: key });
    };
    const advancedOf = (src) => Object.fromEntries(TRACE_ADVANCED_PROPS.map((k) => [k, src[k]]));
    const advancedChanged = TRACE_ADVANCED_PROPS.some((k) => s[k] !== presetSettings(s.preset)[k]);
    const pathCount = (ann.paths || []).length;
    return /* @__PURE__ */ React.createElement(FormatPanelShell, { title: "Format — Vectorize" }, /* @__PURE__ */ React.createElement("div", { className: "ze-trace-head" }, live ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "ze-trace-presets", role: "group", "aria-label": "Presets" }, TRACE_PRESETS.map((p) => /* @__PURE__ */ React.createElement("button", { key: p.key, type: "button", className: "ze-trace-preset" + (s.preset === p.key && !custom ? " active" : ""), title: p.label, "aria-label": p.label, onClick: () => pickPreset(p.key) }, /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 24 24", width: "20", height: "20", "aria-hidden": "true" }, PRESET_ICONS[p.key])))), /* @__PURE__ */ React.createElement("div", { className: "ze-format-field" }, /* @__PURE__ */ React.createElement("span", { className: "ze-format-label" }, "Preset"), /* @__PURE__ */ React.createElement(SelectInput, { options: presetOptions, value: custom ? "custom" : s.preset, onChange: pickPreset }))) : /* @__PURE__ */ React.createElement("span", { className: "ze-format-hint" }, "Expanded: these shapes no longer follow the trace settings. Undo brings them back."), /* @__PURE__ */ React.createElement("div", { className: "ze-format-field" }, /* @__PURE__ */ React.createElement("span", { className: "ze-format-label" }, "View"), /* @__PURE__ */ React.createElement(SelectInput, { options: live ? TRACE_VIEW_OPTIONS : TRACE_VIEW_OPTIONS.filter((o) => !o.key.toLowerCase().includes("source")), value: s.view, onChange: (view) => change({ view }) })), live && /* @__PURE__ */ React.createElement(ControlList, { controls: TRACE_MAIN_CONTROLS, source: s, onPatch: change }), /* @__PURE__ */ React.createElement("span", { className: "ze-trace-status", "aria-live": "polite" }, busy ? "Vectorizing…" : `${pathCount} ${pathCount === 1 ? "colour" : "colours"} · ${Math.max(1, Math.round((ann.paths || []).reduce((n, p) => n + p.d.length, 0) / 1024))} KB of paths`), imageTrace.error && /* @__PURE__ */ React.createElement("span", { className: "ze-format-hint ze-trace-error" }, imageTrace.error)), live && /* @__PURE__ */ React.createElement(
      PanelSection,
      {
        id: "trace.advanced",
        title: "Advanced",
        hint: "Paths: how closely outlines follow the pixels (higher = more detail, less smoothing). Corners: how readily a bend becomes a sharp corner. Noise: specks smaller than this are left out.",
        summary: advancedChanged ? "changed" : void 0,
        onReset: advancedChanged ? () => change(advancedOf(presetSettings(s.preset))) : void 0
      },
      /* @__PURE__ */ React.createElement(ControlList, { controls: TRACE_ADVANCED_CONTROLS, source: s, onPatch: change }),
      /* @__PURE__ */ React.createElement("div", { className: "ze-format-field" }, /* @__PURE__ */ React.createElement("span", { className: "ze-format-label" }, "Method"), /* @__PURE__ */ React.createElement("div", { className: "ze-trace-methods", role: "radiogroup", "aria-label": "Method" }, METHODS.map((m) => /* @__PURE__ */ React.createElement("button", { key: m.key, type: "button", role: "radio", "aria-checked": s.method === m.key, className: "ze-trace-preset" + (s.method === m.key ? " active" : ""), title: m.label + ": " + m.hint, onClick: () => change({ method: m.key }) }, /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 24 24", width: "20", height: "20", "aria-hidden": "true" }, m.icon))), /* @__PURE__ */ React.createElement("span", { className: "ze-format-hint" }, METHODS.find((m) => m.key === s.method).label)))
    ), /* @__PURE__ */ React.createElement(PanelSection, { id: "trace.create", title: "Create", defaultOpen: true, summary: [s.fills === "on" && "Fills", s.strokes === "on" && "Strokes"].filter(Boolean).join(" + ") || "Nothing" }, /* @__PURE__ */ React.createElement("label", { className: "ze-format-check" }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: s.fills === "on", onChange: (e) => change({ fills: e.target.checked ? "on" : "off" }) }), /* @__PURE__ */ React.createElement("span", null, "Fills")), /* @__PURE__ */ React.createElement("label", { className: "ze-format-check" }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: s.strokes === "on", onChange: (e) => change({ strokes: e.target.checked ? "on" : "off" }) }), /* @__PURE__ */ React.createElement("span", null, "Strokes")), s.strokes === "on" && /* @__PURE__ */ React.createElement("div", { className: "ze-format-field" }, /* @__PURE__ */ React.createElement("span", { className: "ze-format-label" }, "Stroke width (px)"), /* @__PURE__ */ React.createElement(SliderNumberInput, { min: 1, max: 20, value: s.strokeWidth, onChange: (strokeWidth) => change({ strokeWidth }) }))), /* @__PURE__ */ React.createElement(TraceColors, { ann, imageTrace }), /* @__PURE__ */ React.createElement(
      PanelSection,
      {
        id: "trace.svg",
        title: "Save as SVG",
        defaultOpen: true,
        hint: "Saves just this layer as an SVG file: editable vector shapes in the colours above, cropped to the shapes, on a see-through background. Nothing else on the page goes in. Opens in Illustrator, Inkscape, Affinity, Figma, Canva, Cricut and laser-cutter software. To save several layers together, select them and use Export → Export selection as SVG."
      },
      /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-format-toggle ze-format-toggle-wide", disabled: busy, onClick: () => onExportSvg([ann.id]) }, "Save as SVG…")
    ), /* @__PURE__ */ React.createElement(PanelSection, { id: "trace.transform", title: "Transform", hint: "Drag a corner to resize (it keeps its proportions; hold Shift to stretch). Opacity and blend are in the Layers panel.", onReset: () => onUpdate(ann.id, resetPatch([ANGLE_CONTROL])) }, /* @__PURE__ */ React.createElement(SizeReadout, { ann }), /* @__PURE__ */ React.createElement(ControlList, { controls: [ANGLE_CONTROL], source: ann, onPatch: (p) => onUpdate(ann.id, p) })), live && /* @__PURE__ */ React.createElement(PanelSection, { id: "trace.expand", title: "Expand", hint: "Fixes the shapes as they are now and drops the copy of the source picture the layer keeps for re-tracing, so the project file gets smaller. The settings above go away; Undo brings them back." }, /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-format-toggle ze-format-toggle-wide", disabled: busy, onClick: () => imageTrace.expand(ann) }, "Expand")), /* @__PURE__ */ React.createElement(PanelSection, { id: "trace.rasterize", title: "Rasterize", hint: "Turns the traced shapes into an ordinary image, so image filters and effects can be used on it. Undo brings the trace back." }, /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-format-toggle ze-format-toggle-wide", disabled: busy, onClick: () => onRasterize(ann) }, "Rasterize to Image")));
  }
  function TraceColors({ ann, imageTrace }) {
    const paths = (ann.paths || []).slice().reverse();
    const changed = Object.keys(ann.recolor || {}).length;
    return /* @__PURE__ */ React.createElement(
      PanelSection,
      {
        id: "trace.colors",
        title: "Colours",
        defaultOpen: true,
        summary: changed ? changed + " changed" : void 0,
        hint: "The traced colours, top first. Pick a new colour, or hide one. Changes are kept when you change the trace settings, as long as the trace finds that colour again.",
        onReset: changed ? () => imageTrace.recolor(ann, null, null) : void 0
      },
      /* @__PURE__ */ React.createElement("div", { className: "ze-trace-colors" }, paths.map((p) => {
        const now = traceColorOf(ann, p.color);
        const hidden = now === "none";
        return /* @__PURE__ */ React.createElement("div", { key: p.color, className: "ze-trace-color" + (hidden ? " is-hidden" : "") }, /* @__PURE__ */ React.createElement("input", { type: "color", className: "ze-format-color-input", value: hidden ? p.color : now, disabled: hidden, "aria-label": "Colour " + p.color, onChange: (e) => imageTrace.recolor(ann, p.color, e.target.value) }), /* @__PURE__ */ React.createElement("span", { className: "ze-trace-hex" }, hidden ? "hidden" : now), /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-trace-mini", title: hidden ? "Show this colour" : "Hide this colour", onClick: () => imageTrace.recolor(ann, p.color, hidden ? null : "none") }, hidden ? "Show" : "Hide"), !hidden && now !== p.color && /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-trace-mini", title: "Back to the traced colour " + p.color, onClick: () => imageTrace.recolor(ann, p.color, null) }, "Reset"));
      }))
    );
  }

  // apps/ZEditor/src/ui/panels/format/ToolPanels.jsx
  function ShapeToolPanel({ tool, toolDefaults }) {
    const { rectDefaults, setRectDefaults } = toolDefaults;
    const onChangeRectDefaults = (patch) => setRectDefaults((d) => ({ ...d, ...patch }));
    const shapeName = tool === "ellipse" ? "ellipse" : "rectangle";
    return /* @__PURE__ */ React.createElement(FormatPanelShell, { title: tool === "ellipse" ? "Ellipse" : "Rectangle" }, /* @__PURE__ */ React.createElement("span", { className: "ze-sec-intro" }, "Drag on the page to draw, or click for a default size. These settings apply to the next ", shapeName, " (rectangles and ellipses share them)."), /* @__PURE__ */ React.createElement(PanelSection, { id: "rect.fill", title: "Fill", defaultOpen: true, onReset: () => onChangeRectDefaults(resetPatch(RECT_FILL_CONTROLS)) }, /* @__PURE__ */ React.createElement(ControlList, { controls: RECT_FILL_CONTROLS, source: rectDefaults, onPatch: onChangeRectDefaults })), /* @__PURE__ */ React.createElement(PanelSection, { id: "rect.look", title: "Opacity & blend", onReset: () => onChangeRectDefaults(resetPatch([OPACITY_CONTROL, BLEND_CONTROL])) }, /* @__PURE__ */ React.createElement(ControlList, { controls: [OPACITY_CONTROL, BLEND_CONTROL], source: rectDefaults, onPatch: onChangeRectDefaults })));
  }
  function MarqueeToolPanel({ toolDefaults, marquee, targetLayer }) {
    const { marquee: settings, setMarquee } = toolDefaults;
    const change = (patch) => setMarquee((cur) => ({ ...cur, ...patch }));
    const fromLayer = settings.source === "layer";
    const fills = settings.cutLeaves === "fill" || !fromLayer;
    const needsLayer = fromLayer && !targetLayer;
    const radio = (name, value, label, current, onPick, hint, disabled) => /* @__PURE__ */ React.createElement("label", { className: "ze-format-radio", key: value }, /* @__PURE__ */ React.createElement("input", { type: "radio", name, checked: current === value, disabled, onChange: () => onPick(value) }), /* @__PURE__ */ React.createElement("span", null, label), hint && /* @__PURE__ */ React.createElement("span", { className: "ze-format-hint" }, hint));
    const layerName2 = targetLayer ? targetLayer.name || (targetLayer.type === "text" ? "Text" : targetLayer.type === "rect" ? "Shape" : targetLayer.type === "stroke" ? "Drawing" : targetLayer.type === "trace" ? "Vectorized" : "Image") : null;
    const ready = Boolean(marquee && isUsableMarquee(marquee.region));
    const polygon = settings.shape === "polygon";
    return /* @__PURE__ */ React.createElement(FormatPanelShell, { title: "Marquee" }, /* @__PURE__ */ React.createElement("span", { className: "ze-sec-intro" }, polygon ? "Click on the page to place the corners of a shape (Shift: 45° lines), then click the first corner, double-click or press Enter to close it. Then move it, drag its corners or turn it." : "Drag on the page to draw a box, then move, resize or turn it.", " Make layer turns what is inside it into a new image layer, so you can give just that part a filter or effect."), /* @__PURE__ */ React.createElement(PanelSection, { id: "marquee.shape", title: "Shape", defaultOpen: true }, /* @__PURE__ */ React.createElement("select", { className: "ze-format-select", "aria-label": "Marquee shape", value: polygon ? "polygon" : "rect", onChange: (e) => change({ shape: e.target.value }) }, /* @__PURE__ */ React.createElement("option", { value: "rect" }, "Rectangle"), /* @__PURE__ */ React.createElement("option", { value: "polygon" }, "Polygon")), marquee && marquee.polygonOpen && /* @__PURE__ */ React.createElement("div", { className: "ze-format-row" }, /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-format-toggle ze-format-toggle-wide", disabled: marquee.region.points.length < 3, title: "Enter", onClick: () => marquee.setRegion({ ...marquee.region, closed: true }) }, "Close shape"), /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-format-toggle ze-format-toggle-wide", title: "Backspace", onClick: () => marquee.setRegion(marquee.region.points.length > 1 ? { ...marquee.region, points: marquee.region.points.slice(0, -1) } : null) }, "Undo point"))), /* @__PURE__ */ React.createElement(PanelSection, { id: "marquee.make", title: "Make layer", defaultOpen: true }, /* @__PURE__ */ React.createElement("div", { className: "ze-format-radio-group", role: "radiogroup", "aria-label": "Make layer" }, radio("marquee-action", "copy", "Layer via Copy", settings.action, (v) => change({ action: v }), "The original stays as it is."), radio("marquee-action", "cut", "Layer via Cut", settings.action, (v) => change({ action: v }), "The box is taken out of the original.")), /* @__PURE__ */ React.createElement("div", { className: "ze-format-row" }, /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-format-toggle ze-format-toggle-wide active", disabled: !ready || needsLayer || Boolean(marquee && marquee.busy), onClick: () => marquee.makeLayer() }, "Make layer")), /* @__PURE__ */ React.createElement("span", { className: "ze-format-hint" }, !ready ? marquee && marquee.polygonOpen ? "Close the shape first." : polygon ? "Place the corners of a shape on the page first." : "Draw a box on the page first." : needsLayer ? "Select a layer first (Move tool or Layers panel, then M), or choose All visible." : "Ctrl+J: Layer via Copy. Ctrl+Shift+J: Layer via Cut.")), /* @__PURE__ */ React.createElement(PanelSection, { id: "marquee.from", title: "Take it from", defaultOpen: true }, /* @__PURE__ */ React.createElement("div", { className: "ze-format-radio-group", role: "radiogroup", "aria-label": "Take it from" }, radio("marquee-source", "visible", "All visible", settings.source, (v) => change({ source: v }), "Everything you can see on the page, as one picture. The new layer goes on top."), radio("marquee-source", "layer", "Selected layer", settings.source, (v) => change({ source: v }), "Only that layer. The new layer goes just above it.")), fromLayer && /* @__PURE__ */ React.createElement("span", { className: "ze-format-hint" }, layerName2 ? "Layer: " + layerName2 : "No layer selected. Select one (Move tool or Layers panel), then press M."), !fromLayer && /* @__PURE__ */ React.createElement("label", { className: "ze-format-check" }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: settings.includePaper, onChange: (e) => change({ includePaper: e.target.checked }) }), /* @__PURE__ */ React.createElement("span", null, "Include the paper"), /* @__PURE__ */ React.createElement("span", { className: "ze-format-hint" }, "Off: where only paper shows, the new layer is see-through. On: it carries the paper's white."))), /* @__PURE__ */ React.createElement(PanelSection, { id: "marquee.cut", title: "When cutting", defaultOpen: true }, /* @__PURE__ */ React.createElement("div", { className: "ze-format-radio-group", role: "radiogroup", "aria-label": "A cut leaves" }, radio("marquee-leaves", "transparent", "Leave it transparent", fills ? "fill" : "transparent", (v) => change({ cutLeaves: v }), fromLayer ? void 0 : "Needs one selected layer to cut from.", !fromLayer), radio("marquee-leaves", "fill", "Fill it with a colour", fills ? "fill" : "transparent", (v) => change({ cutLeaves: v }))), /* @__PURE__ */ React.createElement("div", { className: "ze-format-row" }, /* @__PURE__ */ React.createElement("span", { className: "ze-format-label" }, "Fill colour"), /* @__PURE__ */ React.createElement(CustomColorInput, { value: /^#[0-9a-fA-F]{6}$/.test(settings.fillColor) ? settings.fillColor : "#ffffff", onChange: (color) => change({ fillColor: color }) })), /* @__PURE__ */ React.createElement("span", { className: "ze-format-hint" }, "A text box or shape is turned into an image first, so part of it can be cut. A pen stroke can only be copied.")));
  }
  function TextToolPanel({ toolDefaults: t }) {
    const setters = {
      fontFamily: t.setTextFontFamily,
      fontSize: t.setTextFontSize,
      bold: t.setTextBold,
      italic: t.setTextItalic,
      underline: t.setTextUnderline,
      color: t.setTextColor,
      align: t.setTextAlign
    };
    const changeDefaults = (p) => Object.keys(p).forEach((prop) => setters[prop](p[prop]));
    return /* @__PURE__ */ React.createElement(FormatPanelShell, { title: "Text" }, /* @__PURE__ */ React.createElement("span", { className: "ze-sec-intro" }, "Sets the font, size, style, alignment and color for the next text box you add."), /* @__PURE__ */ React.createElement(
      TextBasicSection,
      {
        fontOptions: t.fontOptions,
        setFontOptions: t.setFontOptions,
        fontFamily: t.textFontFamily,
        fontSize: t.textFontSize,
        bold: t.textBold,
        italic: t.textItalic,
        underline: t.textUnderline,
        align: t.textAlign,
        color: t.textColor,
        onChange: changeDefaults
      }
    ));
  }
  function StrokeToolPanel({ tool, toolDefaults: t }) {
    const isHi = tool === "highlighter";
    return /* @__PURE__ */ React.createElement(FormatPanelShell, { title: isHi ? "Highlighter" : "Draw" }, /* @__PURE__ */ React.createElement("span", { className: "ze-sec-intro" }, "Sets the color and thickness for the next stroke you draw."), /* @__PURE__ */ React.createElement(PanelSection, { id: "stroke.basic", title: "Stroke", defaultOpen: true }, /* @__PURE__ */ React.createElement(
      StrokeFormatFields,
      {
        swatches: isHi ? HIGHLIGHTER_COLOR_SWATCHES : PEN_COLOR_SWATCHES,
        color: isHi ? t.highlighterColor : t.penColor,
        width: isHi ? t.highlighterWidth : t.penWidth,
        minWidth: isHi ? 6 : 1,
        maxWidth: isHi ? 40 : 20,
        taper: isHi ? t.highlighterTaper : t.penTaper,
        onColor: isHi ? t.setHighlighterColor : t.setPenColor,
        onWidth: isHi ? t.setHighlighterWidth : t.setPenWidth,
        onTaper: isHi ? t.setHighlighterTaper : t.setPenTaper
      }
    )));
  }
  function EraserToolPanel({ toolDefaults, magicErase }) {
    const { eraserMode, setEraserMode, softEraser, setSoftEraser, magicEraser, setMagicEraser } = toolDefaults;
    const refine = magicEraser.clickMode === "refine";
    const onChangeMagic = (patch) => setMagicEraser((cur) => ({ ...cur, ...patch }));
    const onChangeSoftEraser = (patch) => setSoftEraser((cur) => ({ ...cur, ...patch }));
    const magicSlider = (prop, label, min, max, hint) => /* @__PURE__ */ React.createElement("div", { className: "ze-format-field" }, /* @__PURE__ */ React.createElement("span", { className: "ze-format-label" }, label), /* @__PURE__ */ React.createElement(SliderNumberInput, { min, max, value: magicEraser[prop], onChange: (v) => onChangeMagic({ [prop]: v }) }), hint && /* @__PURE__ */ React.createElement("span", { className: "ze-format-hint" }, hint));
    const slider = (prop, label, min, max, unit) => /* @__PURE__ */ React.createElement("div", { className: "ze-format-field" }, /* @__PURE__ */ React.createElement("span", { className: "ze-format-label" }, label, " (", softEraser[prop], unit, ")"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "range",
        className: "ze-format-slider",
        min,
        max,
        step: "1",
        value: softEraser[prop],
        onChange: (e) => onChangeSoftEraser({ [prop]: Number(e.target.value) })
      }
    ));
    return /* @__PURE__ */ React.createElement(FormatPanelShell, { title: "Eraser" }, eraserMode === "magic" && magicErase && magicErase.active && /* @__PURE__ */ React.createElement("div", { className: "ze-magic-bar" }, /* @__PURE__ */ React.createElement("span", { className: "ze-format-label" }, "Preview: change any setting until it looks right"), /* @__PURE__ */ React.createElement("div", { className: "ze-format-row" }, /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-format-toggle ze-format-toggle-wide active", title: "Apply (Enter)", onClick: magicErase.commit }, "Apply"), /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-format-toggle ze-format-toggle-wide", title: "Cancel (Esc)", onClick: magicErase.cancel }, "Cancel")), /* @__PURE__ */ React.createElement("span", { className: "ze-format-hint" }, "Enter applies, Esc cancels. Clicking another spot on the image applies this one and starts the next.")), /* @__PURE__ */ React.createElement(PanelSection, { id: "eraser.mode", title: "Mode", defaultOpen: true }, /* @__PURE__ */ React.createElement("div", { className: "ze-format-row" }, /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-format-toggle ze-format-toggle-wide" + (eraserMode === "stroke" ? " active" : ""), onClick: () => setEraserMode("stroke") }, "Strokes"), /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-format-toggle ze-format-toggle-wide" + (eraserMode === "soft" ? " active" : ""), onClick: () => setEraserMode("soft") }, "Soft (images)"), /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-format-toggle ze-format-toggle-wide" + (eraserMode === "magic" ? " active" : ""), onClick: () => setEraserMode("magic") }, "Magic")), eraserMode === "stroke" && /* @__PURE__ */ React.createElement("span", { className: "ze-format-hint" }, "Removes any pen or highlighter stroke you drag across.")), eraserMode === "magic" && /* @__PURE__ */ React.createElement(PanelSection, { id: "eraser.magic", title: "Magic eraser", defaultOpen: true, hint: "Click an image to open a preview, then change any setting until it looks right. Nothing is changed until you Apply (the button, or Enter), and Apply is one Ctrl+Z step. It reads the image's original pixels (before filters). To use it on text or a shape, Rasterize to Image first." }, /* @__PURE__ */ React.createElement("div", { className: "ze-format-field" }, /* @__PURE__ */ React.createElement("span", { className: "ze-format-label" }, "Click does"), /* @__PURE__ */ React.createElement("div", { className: "ze-seg-tabs", role: "tablist" }, /* @__PURE__ */ React.createElement("button", { type: "button", role: "tab", "aria-selected": !refine, className: "ze-seg-tab" + (!refine ? " active" : ""), onClick: () => onChangeMagic({ clickMode: "match" }) }, "Erase a colour"), /* @__PURE__ */ React.createElement("button", { type: "button", role: "tab", "aria-selected": refine, className: "ze-seg-tab" + (refine ? " active" : ""), onClick: () => onChangeMagic({ clickMode: "refine" }) }, "Refine edge")), /* @__PURE__ */ React.createElement("span", { className: "ze-format-hint" }, refine ? "Finds every edge between transparent and coloured pixels by itself and refines them all at once. It needs an image that already has transparent areas (for example after erasing a background, or an imported cut-out). Press Refine edges, or click anywhere on an image (not on its edge) to pick that one." : "Erases the colour you click, and every colour close enough to it."), refine && magicErase && /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-format-toggle ze-format-toggle-wide active", style: { marginTop: 8 }, onClick: magicErase.startRefine }, "Refine edges"), refine && magicErase && magicErase.notice && /* @__PURE__ */ React.createElement("span", { className: "ze-format-hint is-error" }, magicErase.notice)), !refine && magicSlider(
      "tolerance",
      `Brightness tolerance (0 = same brightness, ${MAGIC_TOLERANCE_MAX} = any)`,
      0,
      MAGIC_TOLERANCE_MAX,
      "Raise it to catch shadows and lighter or darker patches of the same surface."
    ), !refine && magicSlider(
      "colorTolerance",
      `Colour tolerance (0 = same colour, ${MAGIC_TOLERANCE_MAX} = any)`,
      0,
      MAGIC_TOLERANCE_MAX,
      "Raise it if the background has colour variation; lower it if the erase spills onto a similar-brightness subject."
    ), !refine && magicSlider(
      "smoothing",
      `Smoothing (${magicEraser.smoothing}px, 0 = off)`,
      0,
      MAGIC_SMOOTHING_MAX,
      "Averages nearby pixels before comparing, so grainy backgrounds (carpet, paper, noise) erase cleanly. Turn it down for thin lines or fine detail."
    ), !refine && /* @__PURE__ */ React.createElement("div", { className: "ze-format-field" }, /* @__PURE__ */ React.createElement("span", { className: "ze-format-label" }, "Erase"), /* @__PURE__ */ React.createElement("div", { className: "ze-format-row" }, /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-format-toggle ze-format-toggle-wide" + (magicEraser.contiguous ? " active" : ""), onClick: () => onChangeMagic({ contiguous: true }) }, "Connected only"), /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-format-toggle ze-format-toggle-wide" + (!magicEraser.contiguous ? " active" : ""), onClick: () => onChangeMagic({ contiguous: false }) }, "Whole image")), /* @__PURE__ */ React.createElement("span", { className: "ze-format-hint" }, magicEraser.contiguous ? "Only matching pixels touching the one you click (like Photoshop's Contiguous)." : "Every matching pixel in the image, connected or not.")), !refine && magicEraser.contiguous && /* @__PURE__ */ React.createElement("div", { className: "ze-format-field" }, /* @__PURE__ */ React.createElement("span", { className: "ze-format-label" }, "Connect through corners"), /* @__PURE__ */ React.createElement("div", { className: "ze-format-row" }, /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-format-toggle ze-format-toggle-wide" + (!magicEraser.diagonal ? " active" : ""), onClick: () => onChangeMagic({ diagonal: false }) }, "Edges only"), /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-format-toggle ze-format-toggle-wide" + (magicEraser.diagonal ? " active" : ""), onClick: () => onChangeMagic({ diagonal: true }) }, "Corners too")), /* @__PURE__ */ React.createElement("span", { className: "ze-format-hint" }, '"Corners too" spreads through 1px diagonal gaps, which can leak past thin outlines.')), !refine && magicSlider(
      "softness",
      `Edge softness (${magicEraser.softness}%)`,
      0,
      100,
      "Pixels just past the tolerance are erased partly instead of all-or-nothing, so the edge fades where the colour is borderline. 0 = hard cut-off."
    ), !refine && magicSlider(
      "opacity",
      `Opacity (${magicEraser.opacity}%)`,
      1,
      100,
      "How completely matching pixels are erased. Below 100 fades the background instead of removing it."
    ), !refine && /* @__PURE__ */ React.createElement("span", { className: "ze-format-hint", style: { marginTop: 0, marginBottom: 16 } }, "To clean up the edge afterwards (feather, shift, specks, defringe), apply this erase and switch to the Refine edge tab."), refine && magicSlider(
      "feather",
      `Feather (${magicEraser.feather}px)`,
      0,
      MAGIC_FEATHER_MAX,
      "Blurs the edge so it fades instead of cutting off. The fade reaches about this many pixels either side."
    ), refine && magicSlider(
      "edgeShift",
      `Edge shift (${magicEraser.edgeShift > 0 ? "+" : ""}${magicEraser.edgeShift}px)`,
      -MAGIC_SHIFT_MAX,
      MAGIC_SHIFT_MAX,
      "Moves the edge. Positive trims the image inward (removes a halo of old background); negative keeps more, but can't bring back pixels that are already transparent."
    ), refine && magicSlider(
      "specks",
      `Remove specks (${magicEraser.specks ? magicEraser.specks + "px" : "off"})`,
      0,
      MAGIC_SPECKS_MAX,
      "Removes stray bits of image up to this many pixels that are left floating in the transparent area. 0 = off."
    ), refine && magicSlider(
      "defringe",
      `Defringe (${magicEraser.defringe}%)`,
      0,
      100,
      "Pulls the colour of half-erased edge pixels toward the colour next to them, removing the leftover tint of the old background."
    ), /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-format-toggle ze-format-toggle-wide", onClick: () => setMagicEraser(MAGIC_ERASER_DEFAULTS) }, "Reset to defaults")), eraserMode === "soft" && /* @__PURE__ */ React.createElement(PanelSection, { id: "eraser.brush", title: "Brush", defaultOpen: true, hint: "Drag over an image to fade it to transparent with a feathered edge. Each swipe is its own Ctrl+Z step. Shift+click an image to aim the brush at that image only (Shift+click it again, or anywhere else, to let go). To erase text or a shape, use its Rasterize to Image button first." }, slider("size", "Size", 4, 300, "px"), slider("softness", "Softness", 0, 100, "%"), slider("strength", "Strength", 5, 100, "%")));
  }

  // apps/ZEditor/src/ui/panels/FormatPanel.jsx
  function FormatPanel({
    tool,
    selectedAnn,
    onUpdate,
    croppingAnnId,
    onToggleCrop,
    onFlattenImage,
    onRasterizeRect,
    onRasterizeText,
    toolDefaults,
    magicErase,
    marquee,
    targetLayer,
    styleActions,
    imageTrace,
    onExportSvg
  }) {
    const ann = selectedAnn;
    if (tool === "marquee") return /* @__PURE__ */ React.createElement(MarqueeToolPanel, { toolDefaults, marquee, targetLayer });
    if (ann && ann.type === "text") return /* @__PURE__ */ React.createElement(TextFormat, { key: ann.id, ann, onUpdate, onRasterizeText, toolDefaults, styleActions });
    if (ann && ann.type === "stroke") return /* @__PURE__ */ React.createElement(StrokeFormat, { key: ann.id, ann, onUpdate });
    if (ann && ann.type === "image") return /* @__PURE__ */ React.createElement(ImageFormat, { key: ann.id, ann, onUpdate, croppingAnnId, onToggleCrop, onFlattenImage, imageTrace });
    if (ann && ann.type === "trace") return /* @__PURE__ */ React.createElement(TraceFormat, { key: ann.id, ann, imageTrace, onUpdate, onRasterize: imageTrace.rasterize, onExportSvg });
    if (ann && ann.type === "rect") return /* @__PURE__ */ React.createElement(ShapeFormat, { key: ann.id, ann, onUpdate, onRasterizeRect });
    if (tool === "rect" || tool === "ellipse") return /* @__PURE__ */ React.createElement(ShapeToolPanel, { tool, toolDefaults });
    if (tool === "text") return /* @__PURE__ */ React.createElement(TextToolPanel, { toolDefaults });
    if (tool === "pen" || tool === "highlighter") return /* @__PURE__ */ React.createElement(StrokeToolPanel, { tool, toolDefaults });
    if (tool === "eraser") return /* @__PURE__ */ React.createElement(EraserToolPanel, { toolDefaults, magicErase });
    if (tool === "measure") {
      return /* @__PURE__ */ React.createElement(FormatPanelShell, { title: "Measure", sections: false }, /* @__PURE__ */ React.createElement("div", { className: "ze-format-empty" }, "Click one point, then another, to see the distance between them in the ruler's unit. A third click clears it. Dragging from one point to the other works too. Once the line is shown, drag either end to adjust. Hold Shift for 45° steps; ends land on ruler guides unless you hold Alt."));
    }
    return /* @__PURE__ */ React.createElement(FormatPanelShell, { title: "Format", sections: false }, /* @__PURE__ */ React.createElement("div", { className: "ze-format-empty" }, "Select a text box, image, rectangle, vectorized image or stroke to edit it, or pick a tool to set defaults for the next one you add."));
  }

  // apps/ZEditor/src/ui/topbar/TopMenu.jsx
  var { useState: useState31, useRef: useRef22, useEffect: useEffect21, useLayoutEffect: useLayoutEffect5 } = React;
  function TopMenu({ label, solid, children }) {
    const [open, setOpen] = useState31(false);
    const containerRef = useRef22(null);
    useEffect21(() => {
      if (!open) return;
      function handleClickOutside(e) {
        if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
      }
      function handleEscape(e) {
        if (e.key === "Escape") setOpen(false);
      }
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("keydown", handleEscape);
      };
    }, [open]);
    const menuRef = useRef22(null);
    useLayoutEffect5(() => {
      const menu = menuRef.current;
      if (!open || !menu) return;
      const fit = () => {
        menu.style.transform = "";
        const { left, width } = menu.getBoundingClientRect();
        const zoom = menu.offsetWidth ? width / menu.offsetWidth : 1;
        if (left < 8) menu.style.transform = `translateX(${(8 - left) / zoom}px)`;
      };
      fit();
      const observer = new ResizeObserver(fit);
      observer.observe(menu);
      window.addEventListener("resize", fit);
      return () => {
        observer.disconnect();
        window.removeEventListener("resize", fit);
      };
    }, [open]);
    return /* @__PURE__ */ React.createElement("div", { className: "ze-topbar-control", ref: containerRef }, /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        className: "ze-menu-trigger" + (solid ? " btn-solid" : "") + (open ? " open" : ""),
        "aria-haspopup": "menu",
        "aria-expanded": open,
        onClick: () => setOpen((o) => !o)
      },
      label,
      /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 20 20", width: "12", height: "12", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("path", { d: "M5.5 7.5l4.5 4.5 4.5-4.5" }))
    ), open && /* @__PURE__ */ React.createElement("div", { className: "ze-menu", role: "menu", ref: menuRef }, children({ close: () => setOpen(false) })));
  }
  function MenuItem({ label, detail, shortcut, hint, disabled, onClick, close }) {
    return /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        role: "menuitem",
        className: "ze-menu-item",
        disabled,
        title: hint,
        onClick: () => {
          close();
          onClick();
        }
      },
      /* @__PURE__ */ React.createElement("span", { className: "ze-menu-item-text" }, /* @__PURE__ */ React.createElement("span", null, label), detail && /* @__PURE__ */ React.createElement("span", { className: "ze-menu-item-detail" }, detail)),
      shortcut && /* @__PURE__ */ React.createElement("span", { className: "ze-menu-item-shortcut" }, shortcut)
    );
  }

  // apps/ZEditor/src/ui/touchInput.js
  var DRAG_SURFACES = ".ze-page, .ze-ruler, .ze-ruler-guide, .ze-layers-head";
  var NATIVE_TARGETS = "input, textarea, select, button, [contenteditable], .ze-typeset-surface";
  var SCROLL_AREA = ".ze-ruler-frame";
  var OVER_RULERS = ".ze-layers-panel, .ze-bottom-left";
  var FINGER_HOLD_MS = 120;
  var RULER_SLOP_PX = 12;
  var DOUBLE_TAP_MS = 350;
  var DOUBLE_TAP_PX = 24;
  var TAP_SLOP_PX = 10;
  var heldKeys = { shift: false, alt: false };
  function setTouchModifier(name, on) {
    heldKeys[name] = Boolean(on);
  }
  function withTouchModifier(name, e) {
    const real = Boolean(e && e[name + "Key"]);
    return real || heldKeys[name] && document.documentElement.getAttribute("data-ze-input") === "touch";
  }
  function mouseEventFrom(type, e, extra) {
    return new MouseEvent(type, {
      bubbles: type !== "mouseleave",
      cancelable: true,
      view: window,
      clientX: e.clientX,
      clientY: e.clientY,
      screenX: e.screenX,
      screenY: e.screenY,
      button: 0,
      buttons: type === "mouseup" || type === "dblclick" ? 0 : 1,
      detail: type === "dblclick" ? 2 : 1,
      shiftKey: Boolean(e.shiftKey) || heldKeys.shift,
      altKey: Boolean(e.altKey) || heldKeys.alt,
      ctrlKey: e.ctrlKey,
      metaKey: e.metaKey,
      ...extra
    });
  }
  function send(el, type, e, extra) {
    const target = el && el.isConnected ? el : document;
    target.dispatchEvent(mouseEventFrom(type, e, extra));
  }
  function rulerNear(x, y) {
    for (const ruler of document.querySelectorAll(".ze-ruler")) {
      const r = ruler.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      const top = ruler.classList.contains("ze-ruler-top");
      const inside = top ? x >= r.left && x <= r.right && y >= r.top && y <= r.bottom + RULER_SLOP_PX : y >= r.top && y <= r.bottom && x >= r.left && x <= r.right + RULER_SLOP_PX;
      if (inside) return ruler;
    }
    return null;
  }
  function installTouchInput() {
    if (typeof window === "undefined" || !window.PointerEvent) return () => {
    };
    const root = document.documentElement;
    const fingers = /* @__PURE__ */ new Map();
    let pending = null;
    let active = null;
    let pan = null;
    let lastTap = null;
    let lastTouchTime = 0;
    const markInput = (e) => {
      const kind = e.pointerType === "mouse" ? "mouse" : "touch";
      if (root.dataset.zeInput !== kind) root.dataset.zeInput = kind;
    };
    const midpoint = () => {
      const [a, b] = [...fingers.values()];
      return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    };
    const spread = () => {
      const [a, b] = [...fingers.values()];
      return Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));
    };
    const pinchEvent = (phase, scale, at) => window.dispatchEvent(new CustomEvent(PINCH_EVENT, { detail: { phase, scale, x: at.x, y: at.y } }));
    function begin(press) {
      active = { id: press.id, target: press.target, x: press.down.clientX, y: press.down.clientY, moved: false };
      send(press.target, "mousedown", press.down);
      for (const move of press.moves) forwardMove(move);
    }
    function flushPending() {
      if (!pending) return;
      const press = pending;
      clearTimeout(press.timer);
      pending = null;
      begin(press);
    }
    function forwardMove(e) {
      if (Math.hypot(e.clientX - active.x, e.clientY - active.y) > TAP_SLOP_PX) active.moved = true;
      send(active.target, "mousemove", e);
    }
    function onPointerDown(e) {
      markInput(e);
      if (e.pointerType === "mouse") return;
      lastTouchTime = Date.now();
      const isFinger = e.pointerType === "touch";
      let target = e.target instanceof Element ? e.target : null;
      if (!target) return;
      if (isFinger && target.closest(SCROLL_AREA) && !target.closest(OVER_RULERS)) {
        const ruler = rulerNear(e.clientX, e.clientY);
        if (ruler) target = ruler;
      }
      if (target.closest(NATIVE_TARGETS)) return;
      const inScrollArea = Boolean(target.closest(SCROLL_AREA));
      const surface = Boolean(target.closest(DRAG_SURFACES));
      if (isFinger && inScrollArea) {
        fingers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (fingers.size === 2 && active && !active.moved && fingers.has(active.id)) {
          const first = active;
          active = null;
          send(first.target, "mouseup", { clientX: first.x, clientY: first.y, screenX: e.screenX, screenY: e.screenY, shiftKey: e.shiftKey, altKey: e.altKey, ctrlKey: e.ctrlKey, metaKey: e.metaKey });
          lastTap = null;
        }
        if (fingers.size === 2 && !active) {
          if (pending) {
            clearTimeout(pending.timer);
            pending = null;
          }
          pan = { startSpread: spread(), frame: 0 };
          pinchEvent("start", 1, midpoint());
          e.preventDefault();
          return;
        }
        if (fingers.size > 1 || pan) {
          e.preventDefault();
          return;
        }
      }
      if (active || pending || !surface) return;
      e.preventDefault();
      const press = { id: e.pointerId, target, down: e, moves: [] };
      if (isFinger && inScrollArea) {
        pending = press;
        press.timer = setTimeout(flushPending, FINGER_HOLD_MS);
      } else {
        begin(press);
      }
    }
    function onPointerMove(e) {
      if (e.pointerType === "mouse") {
        if (root.dataset.zeInput === "touch" && e.buttons === 0) markInput(e);
        return;
      }
      if (fingers.has(e.pointerId)) fingers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pan) {
        if (fingers.size < 2 || pan.frame) return;
        pan.frame = setTimeout(() => {
          if (!pan) return;
          pan.frame = 0;
          if (fingers.size < 2) return;
          pan.last = { scale: spread() / pan.startSpread, at: midpoint() };
          pinchEvent("move", pan.last.scale, pan.last.at);
        }, 16);
        return;
      }
      if (pending && e.pointerId === pending.id) {
        pending.moves.push(e);
        if (Math.hypot(e.clientX - pending.down.clientX, e.clientY - pending.down.clientY) > TAP_SLOP_PX) flushPending();
        return;
      }
      if (active && e.pointerId === active.id) forwardMove(e);
    }
    function onPointerEnd(e) {
      fingers.delete(e.pointerId);
      if (pan) {
        if (fingers.size < 2) {
          if (pan.frame) {
            clearTimeout(pan.frame);
            const last = [...fingers.values()].concat({ x: e.clientX, y: e.clientY });
            if (last.length === 2) {
              const s = Math.max(1, Math.hypot(last[0].x - last[1].x, last[0].y - last[1].y));
              pinchEvent("move", s / pan.startSpread, { x: (last[0].x + last[1].x) / 2, y: (last[0].y + last[1].y) / 2 });
            }
          }
          pan = null;
          pinchEvent("end", 1, { x: e.clientX, y: e.clientY });
        }
        return;
      }
      if (pending && e.pointerId === pending.id) {
        if (e.type === "pointercancel") {
          clearTimeout(pending.timer);
          pending = null;
          return;
        }
        flushPending();
      }
      if (!active || e.pointerId !== active.id) return;
      const { target, moved } = active;
      active = null;
      send(target, "mouseup", e);
      send(target, "mouseout", e, { relatedTarget: null });
      const pane = target.isConnected && target.closest(".preview-pane");
      if (pane) pane.dispatchEvent(mouseEventFrom("mouseleave", e));
      if (e.type === "pointercancel" || moved) {
        lastTap = null;
        return;
      }
      const now = Date.now();
      if (lastTap && now - lastTap.time < DOUBLE_TAP_MS && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < DOUBLE_TAP_PX) {
        lastTap = null;
        setTimeout(() => send(target, "dblclick", e), 0);
      } else {
        lastTap = { time: now, x: e.clientX, y: e.clientY };
      }
    }
    function onDblClick(e) {
      if (e.isTrusted && Date.now() - lastTouchTime < 1e3) e.stopPropagation();
    }
    function onContextMenu(e) {
      if (Date.now() - lastTouchTime < 1e3 && e.target instanceof Element && e.target.closest(SCROLL_AREA + ", " + DRAG_SURFACES)) e.preventDefault();
    }
    window.addEventListener("pointerdown", onPointerDown, { capture: true, passive: false });
    window.addEventListener("pointermove", onPointerMove, true);
    window.addEventListener("pointerup", onPointerEnd, true);
    window.addEventListener("pointercancel", onPointerEnd, true);
    window.addEventListener("dblclick", onDblClick, true);
    window.addEventListener("contextmenu", onContextMenu, true);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("pointermove", onPointerMove, true);
      window.removeEventListener("pointerup", onPointerEnd, true);
      window.removeEventListener("pointercancel", onPointerEnd, true);
      window.removeEventListener("dblclick", onDblClick, true);
      window.removeEventListener("contextmenu", onContextMenu, true);
    };
  }

  // apps/ZEditor/src/ui/panels/LayersPanel.jsx
  var { useState: useState32, useRef: useRef23, useEffect: useEffect22 } = React;
  function LayerThumb({ ann }) {
    if (ann.type === "image") return /* @__PURE__ */ React.createElement("span", { className: "ze-layer-thumb" }, /* @__PURE__ */ React.createElement("img", { src: ann.src, alt: "", draggable: "false" }));
    if (ann.type === "rect") return /* @__PURE__ */ React.createElement("span", { className: "ze-layer-thumb" }, /* @__PURE__ */ React.createElement("span", { className: "ze-layer-thumb-fill", style: { background: rectFillCss(ann), borderRadius: isEllipse(ann) ? "50%" : void 0 } }));
    if (ann.type === "text") return /* @__PURE__ */ React.createElement("span", { className: "ze-layer-thumb ze-layer-thumb-text" }, "T");
    if (ann.type === "trace") return /* @__PURE__ */ React.createElement("span", { className: "ze-layer-thumb ze-layer-thumb-trace" }, /* @__PURE__ */ React.createElement(TraceSvg, { ann, view: "result" }));
    const isHi = ann.tool === "highlighter";
    return /* @__PURE__ */ React.createElement("span", { className: "ze-layer-thumb" }, /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 24 24", width: "18", height: "18", fill: "none", stroke: ann.color || (isHi ? HIGHLIGHTER_DEFAULTS.color : PEN_DEFAULTS.color), strokeWidth: "3", strokeLinecap: "round", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("path", { d: "M3 16c4-9 6-9 8-4s4 5 10-5" })));
  }
  var ClipIcon = () => /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 24 24", width: "13", height: "13", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("path", { d: "M5 4v8a3 3 0 0 0 3 3h11" }), /* @__PURE__ */ React.createElement("path", { d: "M15 11l4 4-4 4" }));
  var LockIcon = ({ locked }) => /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 24 24", width: "13", height: "13", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("rect", { x: "5", y: "11", width: "14", height: "10", rx: "2" }), /* @__PURE__ */ React.createElement("path", { d: locked ? "M8 11V7a4 4 0 0 1 8 0v4" : "M8 11V7a4 4 0 0 1 7.5-2" }));
  var EyeIcon = ({ hidden }) => /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 24 24", width: "13", height: "13", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("path", { d: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" }), hidden ? /* @__PURE__ */ React.createElement("path", { d: "M4 4l16 16" }) : /* @__PURE__ */ React.createElement("circle", { cx: "12", cy: "12", r: "3" }));
  function layerBlocks(topFirst) {
    const blocks = [];
    topFirst.forEach((ann, row) => {
      const last = blocks[blocks.length - 1];
      if (ann.groupId && last && last.groupId === ann.groupId) last.items.push({ ann, row });
      else blocks.push({ groupId: ann.groupId || null, items: [{ ann, row }] });
    });
    return blocks;
  }
  var collapsedGroups = /* @__PURE__ */ new Set();
  function RenameInput({ current, onDone }) {
    return /* @__PURE__ */ React.createElement(
      "input",
      {
        className: "ze-layer-name-input",
        defaultValue: current,
        autoFocus: true,
        spellCheck: "false",
        onFocus: (e) => e.target.select(),
        onClick: (e) => e.stopPropagation(),
        onBlur: (e) => onDone(e.target.value),
        onKeyDown: (e) => {
          if (e.key === "Escape") e.target.value = current;
          if (e.key === "Enter" || e.key === "Escape") e.target.blur();
        }
      }
    );
  }
  var MIN_WIDTH = 200;
  var MIN_HEIGHT = 170;
  var RESIZE_EDGES = [
    { key: "w", left: true },
    { key: "e", right: true },
    { key: "s", bottom: true },
    { key: "sw", left: true, bottom: true },
    { key: "se", right: true, bottom: true }
  ];
  var clamp2 = (v, lo, hi) => Math.max(lo, Math.min(v, hi));
  var MoreIcon = () => /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 24 24", width: "13", height: "13", fill: "currentColor", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("circle", { cx: "12", cy: "5", r: "1.9" }), /* @__PURE__ */ React.createElement("circle", { cx: "12", cy: "12", r: "1.9" }), /* @__PURE__ */ React.createElement("circle", { cx: "12", cy: "19", r: "1.9" }));
  var GroupIcon = () => /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 24 24", width: "15", height: "15", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("rect", { x: "2.5", y: "2.5", width: "19", height: "19", rx: "2", strokeDasharray: "3 3" }), /* @__PURE__ */ React.createElement("rect", { x: "6.5", y: "6.5", width: "7", height: "7", rx: "1" }), /* @__PURE__ */ React.createElement("rect", { x: "10.5", y: "10.5", width: "7", height: "7", rx: "1" }));
  var UngroupIcon = () => /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 24 24", width: "15", height: "15", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("rect", { x: "2.5", y: "2.5", width: "8", height: "8", rx: "1" }), /* @__PURE__ */ React.createElement("rect", { x: "13.5", y: "13.5", width: "8", height: "8", rx: "1" }), /* @__PURE__ */ React.createElement("path", { d: "M14 4h6v6M4 14v6h6", strokeDasharray: "2 2.5" }));
  function LayerLook({ annotations, selectedIds, onSetLook, onGroup, onUngroup, canUngroup }) {
    const views = resolvePageText(annotations);
    const selected = views.filter((a) => selectedIds.includes(a.id));
    const first = selected.find((a) => a.id === selectedIds[0]) || selected[0];
    const opacity = first ? controlValues(first, [OPACITY_CONTROL]).opacity : OPACITY_CONTROL.fallback;
    const blends = new Set(selected.map(blendOf));
    const blend = blends.size > 1 ? "" : first ? blendOf(first) : BLEND_CONTROL.fallback;
    const blendOptions = blend === "" ? [{ key: "", label: "Mixed" }, ...BLEND_CONTROL.options] : BLEND_CONTROL.options;
    return /* @__PURE__ */ React.createElement("fieldset", { className: "ze-layers-look", disabled: selected.length === 0, title: selected.length === 0 ? "Select a layer to change its opacity and blend" : void 0 }, /* @__PURE__ */ React.createElement("div", { className: "ze-layers-look-row" }, /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-layer-icon-btn ze-layers-group-btn", title: "Group (Ctrl+G): select two or more layers", "aria-label": "Group the selected layers", disabled: selectedIds.length < 2, onClick: onGroup }, /* @__PURE__ */ React.createElement(GroupIcon, null)), /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-layer-icon-btn ze-layers-group-btn", title: "Ungroup (Ctrl+Shift+G)", "aria-label": "Ungroup the selected layers", disabled: !canUngroup, onClick: onUngroup }, /* @__PURE__ */ React.createElement(UngroupIcon, null)), /* @__PURE__ */ React.createElement("span", { className: "ze-layers-look-sep", "aria-hidden": "true" }), /* @__PURE__ */ React.createElement("span", { className: "ze-format-label" }, "Blend"), /* @__PURE__ */ React.createElement(SelectInput, { options: blendOptions, value: blend, onChange: (v) => {
      if (v) onSetLook({ blend: v });
    } })), /* @__PURE__ */ React.createElement("div", { className: "ze-layers-look-row" }, /* @__PURE__ */ React.createElement("span", { className: "ze-format-label" }, "Opacity"), /* @__PURE__ */ React.createElement(SliderNumberInput, { min: OPACITY_CONTROL.min, max: OPACITY_CONTROL.max, value: opacity, onChange: (v) => onSetLook({ opacity: v }) })));
  }
  function LayersPanel({ position, onMove, size, onResize, onSetLook, onMinimize, annotations, selectedIds, onSelect, onGroup, onUngroup, onDelete, onToggleFlag, onRename, onReorder, onRenameGroup, onSetGroupFlag, onToggleClip, onClip, onRelease }) {
    const [renamingId, setRenamingId] = useState32(null);
    const [menuOpen, setMenuOpen] = useState32(false);
    const menuRef = useRef23(null);
    const [dropInfo, setDropInfo] = useState32(null);
    const [, setCollapseTick] = useState32(0);
    const dragIdRef = useRef23(null);
    const listRef = useRef23(null);
    const panelRef = useRef23(null);
    const headRef = useRef23(null);
    const topFirst = annotations.slice().reverse();
    const canUngroup = annotations.some((a) => a.groupId && selectedIds.includes(a.id));
    const canClip = clipTargets(annotations, selectedIds).length > 0;
    const canRelease = annotations.some((a) => selectedIds.includes(a.id) && a.clipToBelow);
    const [rowMenu, setRowMenu] = useState32(null);
    const rowMenuRef = useRef23(null);
    useEffect22(() => {
      if (!menuOpen && !rowMenu) return;
      const close = () => {
        setMenuOpen(false);
        setRowMenu(null);
      };
      const outside = (e) => {
        if (menuOpen && menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
        if (rowMenu && rowMenuRef.current && !rowMenuRef.current.contains(e.target) && !e.target.closest(".ze-layer-more-btn")) setRowMenu(null);
      };
      const escape = (e) => {
        if (e.key === "Escape") close();
      };
      const list = listRef.current;
      document.addEventListener("mousedown", outside);
      document.addEventListener("keydown", escape);
      if (rowMenu && list) list.addEventListener("scroll", close);
      return () => {
        document.removeEventListener("mousedown", outside);
        document.removeEventListener("keydown", escape);
        if (list) list.removeEventListener("scroll", close);
      };
    }, [menuOpen, rowMenu]);
    function toggleRowMenu(e, id) {
      e.stopPropagation();
      if (rowMenu && rowMenu.id === id) {
        setRowMenu(null);
        return;
      }
      const box = e.currentTarget.getBoundingClientRect();
      const MENU_W = 200, MENU_H = 84;
      const x = Math.max(4, Math.min(box.right - MENU_W, window.innerWidth - MENU_W - 4));
      const y = box.bottom + 4 + MENU_H > window.innerHeight ? box.top - 4 - MENU_H : box.bottom + 4;
      setMenuOpen(false);
      setRowMenu({ id, x, y });
    }
    const rowMenuAnn = rowMenu ? annotations.find((a) => a.id === rowMenu.id) : null;
    const rowMenuIndex = rowMenuAnn ? annotations.indexOf(rowMenuAnn) : -1;
    function toggleCollapsed(groupId) {
      if (collapsedGroups.has(groupId)) collapsedGroups.delete(groupId);
      else collapsedGroups.add(groupId);
      setCollapseTick((n) => n + 1);
    }
    function inView(x, y) {
      return {
        x: Math.max(0, Math.min(x, window.innerWidth - panelRef.current.offsetWidth)),
        y: Math.max(0, Math.min(y, window.innerHeight - headRef.current.offsetHeight))
      };
    }
    useEffect22(() => {
      if (!position) return;
      const keepInView = () => {
        const next = inView(position.x, position.y);
        if (next.x !== position.x || next.y !== position.y) onMove(next);
      };
      keepInView();
      window.addEventListener("resize", keepInView);
      return () => window.removeEventListener("resize", keepInView);
    }, [position]);
    function startPanelDrag(e) {
      e.preventDefault();
      const start = panelRef.current.getBoundingClientRect();
      const { clientX, clientY } = e;
      trackPointerDrag((ev) => onMove(inView(start.left + ev.clientX - clientX, start.top + ev.clientY - clientY)));
    }
    function startResize(e, edge) {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      const start = panelRef.current.getBoundingClientRect();
      const { clientX, clientY, pointerId } = e;
      const handle = e.currentTarget;
      handle.setPointerCapture(pointerId);
      const move = (ev) => {
        const dx = ev.clientX - clientX, dy = ev.clientY - clientY;
        let left = start.left, width = start.width, height = start.height;
        if (edge.right) width = clamp2(start.width + dx, MIN_WIDTH, window.innerWidth - start.left);
        if (edge.left) {
          width = clamp2(start.width - dx, MIN_WIDTH, start.right);
          left = start.right - width;
        }
        if (edge.bottom) height = clamp2(start.height + dy, MIN_HEIGHT, window.innerHeight - start.top);
        onResize({ width: Math.round(width), height: Math.round(height) });
        onMove({ x: Math.round(left), y: Math.round(start.top) });
      };
      const up = () => {
        handle.removeEventListener("pointermove", move);
        handle.removeEventListener("pointerup", up);
        handle.removeEventListener("pointercancel", up);
      };
      handle.addEventListener("pointermove", move);
      handle.addEventListener("pointerup", up);
      handle.addEventListener("pointercancel", up);
    }
    useEffect22(() => {
      const row = listRef.current && listRef.current.querySelector(".ze-layer-row.is-selected");
      if (row) row.scrollIntoView({ block: "nearest" });
    }, [selectedIds[0]]);
    function finishRename(ann, text) {
      setRenamingId(null);
      const name = text.trim();
      if (name && name !== layerName(ann)) onRename(ann.id, name);
    }
    function dragHandlersFor(key, dragId, rowBefore, rowAfter) {
      return {
        onDragStart: (e) => {
          dragIdRef.current = dragId;
          e.dataTransfer.setData("text/plain", "");
        },
        onDragOver: (e) => {
          e.preventDefault();
          const box = e.currentTarget.getBoundingClientRect();
          const before = e.clientY < box.top + box.height / 2;
          setDropInfo({ key, before, row: before ? rowBefore : rowAfter });
        },
        onDragEnd: () => {
          dragIdRef.current = null;
          setDropInfo(null);
        },
        onDrop: (e) => {
          e.preventDefault();
          const from = dragIdRef.current;
          const info = dropInfo;
          dragIdRef.current = null;
          setDropInfo(null);
          if (from === null || !info) return;
          onReorder(selectedIds.includes(from) ? selectedIds : [from], info.row);
        }
      };
    }
    const dropLine = (key, before) => dropInfo && dropInfo.key === key && dropInfo.before === before ? /* @__PURE__ */ React.createElement("div", { className: "ze-drop-line" }) : null;
    function layerRow(ann, row, inGroup) {
      const isRenaming = renamingId === ann.id;
      return /* @__PURE__ */ React.createElement(React.Fragment, { key: ann.id }, dropLine(ann.id, true), /* @__PURE__ */ React.createElement(
        "div",
        {
          className: "ze-layer-row" + (selectedIds.includes(ann.id) ? " is-selected" : "") + (ann.hidden ? " is-hidden" : "") + (ann.clipToBelow ? " is-clipped" : "") + (inGroup ? " is-grouped is-in-group" : ""),
          style: inGroup ? { "--ze-group-color": groupColor(ann.groupId) } : void 0,
          title: inGroup ? "In a group — Alt + click selects just this layer" : void 0,
          "data-layer-id": ann.id,
          draggable: !isRenaming,
          onClick: (e) => {
            if (!ann.hidden && !ann.locked) onSelect(ann.id, withTouchModifier("shift", e), withTouchModifier("alt", e));
          },
          onDoubleClick: () => setRenamingId(ann.id),
          ...dragHandlersFor(ann.id, ann.id, row, row + 1)
        },
        /* @__PURE__ */ React.createElement(LayerThumb, { ann }),
        isRenaming ? /* @__PURE__ */ React.createElement(RenameInput, { current: layerName(ann), onDone: (text) => finishRename(ann, text) }) : /* @__PURE__ */ React.createElement("span", { className: "ze-layer-name", title: "Double-click to rename" }, layerName(ann)),
        ann.clipToBelow && /* @__PURE__ */ React.createElement(
          "button",
          {
            type: "button",
            className: "ze-layer-icon-btn active",
            title: "Clipped to the layer below. Click to release it.",
            "aria-label": "Release the clipping mask",
            onClick: (e) => {
              e.stopPropagation();
              onToggleClip(ann.id);
            },
            onDoubleClick: (e) => e.stopPropagation()
          },
          /* @__PURE__ */ React.createElement(ClipIcon, null)
        ),
        /* @__PURE__ */ React.createElement(
          "button",
          {
            type: "button",
            className: "ze-layer-icon-btn" + (ann.locked ? " active" : ""),
            title: ann.locked ? "Unlock layer" : "Lock layer",
            "aria-pressed": Boolean(ann.locked),
            onClick: (e) => {
              e.stopPropagation();
              onToggleFlag(ann, "locked");
            },
            onDoubleClick: (e) => e.stopPropagation()
          },
          /* @__PURE__ */ React.createElement(LockIcon, { locked: ann.locked })
        ),
        /* @__PURE__ */ React.createElement(
          "button",
          {
            type: "button",
            className: "ze-layer-icon-btn" + (ann.hidden ? " active" : ""),
            title: ann.hidden ? "Show layer" : "Hide layer",
            "aria-pressed": Boolean(ann.hidden),
            onClick: (e) => {
              e.stopPropagation();
              onToggleFlag(ann, "hidden");
            },
            onDoubleClick: (e) => e.stopPropagation()
          },
          /* @__PURE__ */ React.createElement(EyeIcon, { hidden: ann.hidden })
        ),
        /* @__PURE__ */ React.createElement(
          "button",
          {
            type: "button",
            className: "ze-layer-icon-btn ze-layer-more-btn" + (rowMenu && rowMenu.id === ann.id ? " is-open" : ""),
            title: "Layer actions",
            "aria-label": "Actions for " + layerName(ann),
            "aria-haspopup": "menu",
            "aria-expanded": Boolean(rowMenu && rowMenu.id === ann.id),
            onClick: (e) => toggleRowMenu(e, ann.id),
            onDoubleClick: (e) => e.stopPropagation()
          },
          /* @__PURE__ */ React.createElement(MoreIcon, null)
        )
      ), dropLine(ann.id, false));
    }
    function groupBlock(block, number) {
      const { groupId, items } = block;
      const first = items[0].ann;
      const name = first.groupName || "Group " + number;
      const collapsed = collapsedGroups.has(groupId);
      const allLocked = items.every((i) => i.ann.locked), allHidden = items.every((i) => i.ann.hidden);
      const allSelected = items.every((i) => selectedIds.includes(i.ann.id));
      const key = "g:" + groupId + ":" + first.id;
      const firstRow = items[0].row, lastRow = items[items.length - 1].row;
      const isRenaming = renamingId === "g:" + groupId;
      return /* @__PURE__ */ React.createElement(React.Fragment, { key }, dropLine(key, true), /* @__PURE__ */ React.createElement(
        "div",
        {
          className: "ze-layer-row ze-layer-group-row is-grouped" + (allSelected ? " is-selected" : "") + (allHidden ? " is-hidden" : ""),
          style: { "--ze-group-color": groupColor(groupId) },
          title: "Group: click to select it, double-click to rename",
          draggable: !isRenaming,
          onClick: (e) => {
            const pick = items.find((i) => !i.ann.hidden && !i.ann.locked);
            if (pick) onSelect(pick.ann.id, withTouchModifier("shift", e), false);
          },
          onDoubleClick: () => setRenamingId("g:" + groupId),
          ...dragHandlersFor(key, first.id, firstRow, collapsed ? lastRow + 1 : firstRow)
        },
        /* @__PURE__ */ React.createElement(
          "button",
          {
            type: "button",
            className: "ze-layer-caret",
            "aria-expanded": !collapsed,
            title: collapsed ? "Show the group's layers" : "Fold the group away",
            onClick: (e) => {
              e.stopPropagation();
              toggleCollapsed(groupId);
            },
            onDoubleClick: (e) => e.stopPropagation()
          },
          /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 20 20", width: "12", height: "12", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", style: { transform: collapsed ? "rotate(-90deg)" : void 0 } }, /* @__PURE__ */ React.createElement("path", { d: "M5.5 7.5l4.5 4.5 4.5-4.5" }))
        ),
        /* @__PURE__ */ React.createElement("span", { className: "ze-layer-thumb ze-layer-thumb-group", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 24 24", width: "16", height: "16", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinejoin: "round" }, /* @__PURE__ */ React.createElement("path", { d: "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" }))),
        isRenaming ? /* @__PURE__ */ React.createElement(RenameInput, { current: name, onDone: (text) => {
          setRenamingId(null);
          const n = text.trim();
          if (n && n !== name) onRenameGroup(groupId, n);
        } }) : /* @__PURE__ */ React.createElement("span", { className: "ze-layer-name", title: "Double-click to rename" }, name, " ", /* @__PURE__ */ React.createElement("span", { className: "ze-layer-count" }, items.length)),
        /* @__PURE__ */ React.createElement(
          "button",
          {
            type: "button",
            className: "ze-layer-icon-btn" + (allLocked ? " active" : ""),
            title: allLocked ? "Unlock the group" : "Lock the group",
            "aria-pressed": allLocked,
            onClick: (e) => {
              e.stopPropagation();
              onSetGroupFlag(groupId, "locked", !allLocked);
            },
            onDoubleClick: (e) => e.stopPropagation()
          },
          /* @__PURE__ */ React.createElement(LockIcon, { locked: allLocked })
        ),
        /* @__PURE__ */ React.createElement(
          "button",
          {
            type: "button",
            className: "ze-layer-icon-btn" + (allHidden ? " active" : ""),
            title: allHidden ? "Show the group" : "Hide the group",
            "aria-pressed": allHidden,
            onClick: (e) => {
              e.stopPropagation();
              onSetGroupFlag(groupId, "hidden", !allHidden);
            },
            onDoubleClick: (e) => e.stopPropagation()
          },
          /* @__PURE__ */ React.createElement(EyeIcon, { hidden: allHidden })
        )
      ), collapsed ? dropLine(key, false) : items.map((i) => layerRow(i.ann, i.row, true)));
    }
    const groupNumbers = /* @__PURE__ */ new Map();
    return /* @__PURE__ */ React.createElement(
      "section",
      {
        className: "ze-layers-panel" + (size ? " is-sized" : ""),
        ref: panelRef,
        style: {
          ...position ? { left: position.x, top: position.y, right: "auto" } : null,
          ...size ? { width: size.width, height: Math.min(size.height, window.innerHeight - (position ? position.y : 0)) } : null
        }
      },
      /* @__PURE__ */ React.createElement("div", { className: "ze-format-panel-head ze-layers-head", ref: headRef, onMouseDown: startPanelDrag }, /* @__PURE__ */ React.createElement("span", null, "Layers", annotations.length > 0 ? " (" + annotations.length + ")" : ""), /* @__PURE__ */ React.createElement("span", { className: "ze-layers-head-actions", onMouseDown: (e) => e.stopPropagation() }, /* @__PURE__ */ React.createElement("span", { className: "ze-layers-menu-wrap", ref: menuRef }, /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          className: "ze-guides-settings-btn" + (menuOpen ? " is-open" : ""),
          title: "Group, ungroup and clipping mask",
          "aria-label": "More layer actions",
          "aria-haspopup": "menu",
          "aria-expanded": menuOpen,
          onClick: () => {
            setRowMenu(null);
            setMenuOpen((open) => !open);
          }
        },
        /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 24 24", width: "14", height: "14", fill: "currentColor", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("circle", { cx: "12", cy: "5", r: "1.9" }), /* @__PURE__ */ React.createElement("circle", { cx: "12", cy: "12", r: "1.9" }), /* @__PURE__ */ React.createElement("circle", { cx: "12", cy: "19", r: "1.9" }))
      ), menuOpen && /* @__PURE__ */ React.createElement("div", { className: "ze-menu ze-layers-menu", role: "menu" }, /* @__PURE__ */ React.createElement(MenuItem, { label: "Group", shortcut: "Ctrl+G", hint: "Group the selected layers (select two or more)", disabled: selectedIds.length < 2, onClick: onGroup, close: () => setMenuOpen(false) }), /* @__PURE__ */ React.createElement(MenuItem, { label: "Ungroup", shortcut: "Ctrl+Shift+G", disabled: !canUngroup, onClick: onUngroup, close: () => setMenuOpen(false) }), /* @__PURE__ */ React.createElement(MenuItem, { label: "Clip to below (multiple)", shortcut: "Ctrl+Alt+G", hint: "Clips the selected layers in one go: the bottom-most selected layer stays as the base and the others show only where it has pixels. With one layer selected, clips it to the layer below.", disabled: !canClip, onClick: onClip, close: () => setMenuOpen(false) }), /* @__PURE__ */ React.createElement(MenuItem, { label: "Release clipping mask", disabled: !canRelease, onClick: onRelease, close: () => setMenuOpen(false) }))), /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-guides-settings-btn", title: "Delete the selected layers (Delete)", "aria-label": "Delete selected layers", disabled: selectedIds.length === 0, onClick: onDelete }, /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 24 24", width: "14", height: "14", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("path", { d: "M4 7h16" }), /* @__PURE__ */ React.createElement("path", { d: "M9 7V4h6v3" }), /* @__PURE__ */ React.createElement("path", { d: "M6 7l1 13h10l1-13" }), /* @__PURE__ */ React.createElement("path", { d: "M10 11v6" }), /* @__PURE__ */ React.createElement("path", { d: "M14 11v6" }))), /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-guides-settings-btn", title: "Minimize layers", "aria-label": "Minimize layers", onClick: onMinimize }, /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 20 20", width: "12", height: "12", fill: "none", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("path", { d: "M5 10h10" }))))),
      /* @__PURE__ */ React.createElement(LayerLook, { annotations, selectedIds, onSetLook, onGroup, onUngroup, canUngroup }),
      /* @__PURE__ */ React.createElement("div", { className: "ze-layers-list", ref: listRef }, layerBlocks(topFirst).map((block) => {
        if (!block.groupId) return layerRow(block.items[0].ann, block.items[0].row, false);
        if (!groupNumbers.has(block.groupId)) groupNumbers.set(block.groupId, groupNumbers.size + 1);
        return groupBlock(block, groupNumbers.get(block.groupId));
      }), /* @__PURE__ */ React.createElement("div", { className: "ze-layer-row ze-layer-row--page" }, /* @__PURE__ */ React.createElement("span", { className: "ze-layer-thumb" }, /* @__PURE__ */ React.createElement("span", { className: "ze-layer-thumb-fill", style: { backgroundColor: "#ffffff" } })), /* @__PURE__ */ React.createElement("span", { className: "ze-layer-name" }, "Page"))),
      rowMenuAnn && // Fixed to the screen, so the panel's edge and the list's scrolling can't cut it off.
      /* @__PURE__ */ React.createElement("div", { className: "ze-menu ze-layer-row-menu", role: "menu", ref: rowMenuRef, style: { left: rowMenu.x, top: rowMenu.y } }, /* @__PURE__ */ React.createElement(
        MenuItem,
        {
          label: "Clip to layer below",
          hint: "Shows this layer only where the layer below it has pixels",
          disabled: rowMenuAnn.clipToBelow || !canClipAt(annotations, rowMenuIndex),
          onClick: () => onToggleClip(rowMenuAnn.id),
          close: () => setRowMenu(null)
        }
      ), /* @__PURE__ */ React.createElement(
        MenuItem,
        {
          label: "Release clipping mask",
          disabled: !rowMenuAnn.clipToBelow,
          onClick: () => onToggleClip(rowMenuAnn.id),
          close: () => setRowMenu(null)
        }
      )),
      RESIZE_EDGES.map((edge) => /* @__PURE__ */ React.createElement("div", { key: edge.key, className: "ze-layers-resize ze-layers-resize--" + edge.key, "aria-hidden": "true", onPointerDown: (e) => startResize(e, edge) }))
    );
  }

  // apps/ZEditor/src/ui/PanelResizer.jsx
  var { useLayoutEffect: useLayoutEffect6, useRef: useRef24 } = React;
  var MIN_CANVAS = 360;
  var KEY_STEP = 16;
  function PanelResizer({ bodyRef, side, cssVar, otherVar, storageKey, min, max, label }) {
    const widthRef = useRef24(null);
    const cssPx = (name) => parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name)) || 0;
    const clamp3 = (px) => {
      const body = bodyRef.current;
      const room = (body ? body.getBoundingClientRect().width : window.innerWidth) - (otherVar ? cssPx(otherVar) : 0) - MIN_CANVAS;
      return Math.round(Math.min(Math.max(min, Math.min(max, room)), Math.max(min, px)));
    };
    const apply = (px, save) => {
      const root = document.documentElement;
      if (px == null) {
        widthRef.current = null;
        root.style.removeProperty(cssVar);
        try {
          localStorage.removeItem(storageKey);
        } catch (e) {
        }
      } else {
        widthRef.current = clamp3(px);
        root.style.setProperty(cssVar, widthRef.current + "px");
        if (save) {
          try {
            localStorage.setItem(storageKey, String(widthRef.current));
          } catch (e) {
          }
        }
      }
    };
    useLayoutEffect6(() => {
      let saved = null;
      try {
        saved = parseInt(localStorage.getItem(storageKey), 10);
      } catch (e) {
      }
      if (saved > 0) apply(saved, false);
      const onResize = () => {
        if (widthRef.current != null && clamp3(widthRef.current) !== widthRef.current) apply(widthRef.current, false);
      };
      window.addEventListener("resize", onResize);
      return () => window.removeEventListener("resize", onResize);
    }, []);
    const onPointerDown = (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      e.currentTarget.classList.add("is-dragging");
      document.body.style.userSelect = "none";
    };
    const onPointerMove = (e) => {
      if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
      const box = bodyRef.current.getBoundingClientRect();
      apply(side === "left" ? e.clientX - box.left : box.right - e.clientX, false);
    };
    const endDrag = (e) => {
      if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
      e.currentTarget.releasePointerCapture(e.pointerId);
      e.currentTarget.classList.remove("is-dragging");
      document.body.style.userSelect = "";
      if (widthRef.current != null) {
        try {
          localStorage.setItem(storageKey, String(widthRef.current));
        } catch (err) {
        }
      }
    };
    const onKeyDown = (e) => {
      const grow = side === "left" ? "ArrowRight" : "ArrowLeft", shrink = side === "left" ? "ArrowLeft" : "ArrowRight";
      if (e.key === grow) {
        e.preventDefault();
        apply(cssPx(cssVar) + KEY_STEP, true);
      } else if (e.key === shrink) {
        e.preventDefault();
        apply(cssPx(cssVar) - KEY_STEP, true);
      } else if (e.key === "Home") {
        e.preventDefault();
        apply(null);
      }
    };
    return /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "ze-panel-resizer ze-panel-resizer-" + side,
        role: "separator",
        "aria-orientation": "vertical",
        "aria-label": label,
        tabIndex: 0,
        onPointerDown,
        onPointerMove,
        onPointerUp: endDrag,
        onPointerCancel: endDrag,
        onDoubleClick: () => apply(null),
        onKeyDown
      }
    );
  }

  // apps/ZEditor/src/state/useLiveThumbs.js
  var { useState: useState33, useEffect: useEffect23, useRef: useRef25 } = React;
  var SELECTED_GAP_MS = 150;
  var OTHER_GAP_MS = 25;
  var SLOW_FACTOR = 4;
  var filterOn = (f) => Boolean(f && f.type && f.type !== "none");
  var needsLive = (p) => p.annotations && p.annotations.length > 0 || filterOn(p.filter);
  var revokeLater = (url) => setTimeout(() => URL.revokeObjectURL(url), 1500);
  function useLiveThumbs(pages, selectedKey) {
    const [urls, setUrls] = useState33({});
    const urlsRef = useRef25({});
    const madeFrom = useRef25(/* @__PURE__ */ new Map());
    const baseCache = useRef25(null);
    const latest = useRef25({ pages, selectedKey });
    const timer = useRef25(0);
    const running = useRef25(false);
    const lastEnd = useRef25(0);
    const lastMs = useRef25(0);
    const alive = useRef25(true);
    const [on, setOn] = useState33(() => !document.documentElement.classList.contains("ze-static-thumbs"));
    const onRef = useRef25(on);
    onRef.current = on;
    latest.current = { pages, selectedKey };
    useEffect23(() => {
      const listener = (e) => setOn(!(e.detail && e.detail.staticThumbs));
      window.addEventListener("zn-display-prefs", listener);
      return () => window.removeEventListener("zn-display-prefs", listener);
    }, []);
    const isStale = (p) => {
      const m = madeFrom.current.get(p.key);
      return !m || m.annotations !== p.annotations || m.filter !== p.filter || m.base !== p.dataUrl;
    };
    function nextStale() {
      if (!onRef.current) return null;
      const { pages: ps, selectedKey: sel } = latest.current;
      let first = null;
      for (const p of ps) {
        if (!needsLive(p) || !isStale(p)) continue;
        if (p.key === sel) return p;
        if (!first) first = p;
      }
      return first;
    }
    async function drawBlob(p) {
      let cached = baseCache.current;
      if (!cached || cached.key !== p.key || cached.src !== p.dataUrl) {
        const image = new Image();
        image.src = p.dataUrl;
        await image.decode();
        cached = { key: p.key, src: p.dataUrl, image };
        if (p.key === latest.current.selectedKey) baseCache.current = cached;
      }
      const canvas = await renderPageThumbWithItems(p, cached.image);
      return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    }
    function schedule() {
      if (running.current || timer.current || !alive.current) return;
      const p = nextStale();
      if (!p) return;
      const edited = p.key === latest.current.selectedKey;
      const gap = edited ? Math.max(SELECTED_GAP_MS, lastMs.current * SLOW_FACTOR) : Math.max(OTHER_GAP_MS, lastMs.current);
      timer.current = setTimeout(run2, Math.max(0, lastEnd.current + gap - performance.now()));
    }
    async function run2() {
      timer.current = 0;
      const p = nextStale();
      if (!p || !alive.current) return;
      running.current = true;
      const from = { annotations: p.annotations, filter: p.filter, base: p.dataUrl };
      const started = performance.now();
      let blob = null;
      try {
        blob = await drawBlob(p);
      } catch (err) {
      }
      lastMs.current = performance.now() - started;
      lastEnd.current = performance.now();
      running.current = false;
      if (!alive.current || !onRef.current) return;
      madeFrom.current.set(p.key, from);
      if (blob && latest.current.pages.some((q) => q.key === p.key)) {
        const old = urlsRef.current[p.key];
        urlsRef.current = { ...urlsRef.current, [p.key]: URL.createObjectURL(blob) };
        setUrls(urlsRef.current);
        if (old) revokeLater(old);
      }
      schedule();
    }
    useEffect23(() => {
      const wanted = new Set(on ? pages.filter(needsLive).map((p) => p.key) : []);
      let next = null;
      for (const k of Object.keys(urlsRef.current)) {
        if (wanted.has(Number(k))) continue;
        next = next || { ...urlsRef.current };
        revokeLater(next[k]);
        delete next[k];
      }
      for (const k of [...madeFrom.current.keys()]) if (!wanted.has(k)) madeFrom.current.delete(k);
      if (next) {
        urlsRef.current = next;
        setUrls(next);
      }
      schedule();
    }, [pages, selectedKey, on]);
    useEffect23(() => {
      alive.current = true;
      return () => {
        alive.current = false;
        clearTimeout(timer.current);
        for (const url of Object.values(urlsRef.current)) URL.revokeObjectURL(url);
      };
    }, []);
    return on ? urls : NO_THUMBS;
  }
  var NO_THUMBS = {};

  // apps/ZEditor/src/ui/sidebar/PageGap.jsx
  function PageGap({ onInsert }) {
    return /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "ze-page-gap",
        role: "button",
        tabIndex: 0,
        title: "Add blank page",
        onClick: onInsert,
        onKeyDown: (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onInsert();
          }
        }
      },
      /* @__PURE__ */ React.createElement("div", { className: "ze-page-gap-line" }),
      /* @__PURE__ */ React.createElement("span", { className: "ze-page-gap-btn", "aria-hidden": "true" }, "+")
    );
  }

  // apps/ZEditor/src/ui/sidebar/Thumbnail.jsx
  function Thumbnail({ p, src, idx, isSelected, onSelect, onRotate, onDelete, dragHandlers }) {
    return /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "ze-thumb" + (isSelected ? " is-selected" : ""),
        draggable: "true",
        onClick: (e) => onSelect(idx, withTouchModifier("shift", e)),
        ...dragHandlers
      },
      /* @__PURE__ */ React.createElement("div", { className: "ze-thumb-img-wrap" }, /* @__PURE__ */ React.createElement("img", { srcSet: src + " " + THUMB_SCALE / THUMB_SHOWN_SCALE + "x", draggable: "false", alt: p.isBlank ? "Blank page" : "Page " + p.pageNumber })),
      /* @__PURE__ */ React.createElement("div", { className: "ze-thumb-footer" }, /* @__PURE__ */ React.createElement("span", { className: "ze-thumb-num" }, idx + 1), /* @__PURE__ */ React.createElement("div", { className: "ze-thumb-actions" }, /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          className: "log-btn",
          title: "Rotate",
          onClick: (e) => {
            e.stopPropagation();
            onRotate(idx);
          }
        },
        "⟳"
      ), /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          className: "log-btn",
          title: "Delete",
          onClick: (e) => {
            e.stopPropagation();
            onDelete(idx);
          }
        },
        /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 24 24", width: "12", height: "12", fill: "none", stroke: "currentColor", strokeWidth: "1.9", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("path", { d: "M4 7h16" }), /* @__PURE__ */ React.createElement("path", { d: "M9 7V4h6v3" }), /* @__PURE__ */ React.createElement("path", { d: "M6 7l1 13h10l1-13" }), /* @__PURE__ */ React.createElement("path", { d: "M10 11v6" }), /* @__PURE__ */ React.createElement("path", { d: "M14 11v6" }))
      )))
    );
  }

  // apps/ZEditor/src/ui/sidebar/Sidebar.jsx
  var { useState: useState34, useRef: useRef26, useEffect: useEffect24 } = React;
  var EDGE_SCROLL_ZONE = 44;
  var EDGE_SCROLL_SPEED = 4;
  function Sidebar({ pages, selectedIdx, selectedPageIndices, onSelect, onSelectAll, onRotate, onDelete, onReorder, onLoadClick, onNewDocClick, onInsertPdfClick, onInsertBlank, loading }) {
    const liveThumbs = useLiveThumbs(pages, pages[selectedIdx] ? pages[selectedIdx].key : null);
    const dragIndexRef = useRef26(null);
    const bodyRef = useRef26(null);
    const scrollDirRef = useRef26(0);
    const rafRef = useRef26(null);
    const [dragOverInfo, setDragOverInfo] = useState34(null);
    function startAutoScroll() {
      if (rafRef.current) return;
      const step = () => {
        const el = bodyRef.current;
        if (el && scrollDirRef.current !== 0) {
          el.scrollTop += scrollDirRef.current * EDGE_SCROLL_SPEED;
        }
        rafRef.current = requestAnimationFrame(step);
      };
      rafRef.current = requestAnimationFrame(step);
    }
    function stopAutoScroll() {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      scrollDirRef.current = 0;
    }
    useEffect24(() => stopAutoScroll, []);
    function handleContainerDragOver(e) {
      const el = bodyRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const distFromTop = e.clientY - rect.top;
      const distFromBottom = rect.bottom - e.clientY;
      if (distFromTop < EDGE_SCROLL_ZONE) {
        scrollDirRef.current = -1;
      } else if (distFromBottom < EDGE_SCROLL_ZONE) {
        scrollDirRef.current = 1;
      } else {
        scrollDirRef.current = 0;
      }
    }
    function dragHandlersFor(idx) {
      return {
        onDragStart: () => {
          dragIndexRef.current = idx;
          startAutoScroll();
        },
        onDragOver: (e) => {
          e.preventDefault();
          const rect = e.currentTarget.getBoundingClientRect();
          const before = e.clientY < rect.top + rect.height / 2;
          setDragOverInfo({ idx, before });
        },
        onDragLeave: () => setDragOverInfo((cur) => cur && cur.idx === idx ? null : cur),
        onDragEnd: () => {
          dragIndexRef.current = null;
          setDragOverInfo(null);
          stopAutoScroll();
        },
        onDrop: (e) => {
          e.preventDefault();
          const from = dragIndexRef.current;
          const info = dragOverInfo;
          setDragOverInfo(null);
          dragIndexRef.current = null;
          stopAutoScroll();
          if (from === null || !info || from === idx) return;
          const selection = selectedIdx !== null ? [selectedIdx, ...selectedPageIndices] : selectedPageIndices;
          onReorder(selection.includes(from) ? selection : [from], idx + (info.before ? 0 : 1));
        }
      };
    }
    return /* @__PURE__ */ React.createElement("aside", { className: "ze-sidebar" }, /* @__PURE__ */ React.createElement("div", { className: "ze-sidebar-head" }, /* @__PURE__ */ React.createElement("span", null, "Pages", pages.length > 0 ? " (" + pages.length + ")" : ""), /* @__PURE__ */ React.createElement("div", { className: "ze-sidebar-head-actions" }, pages.length === 0 && /* @__PURE__ */ React.createElement("button", { type: "button", onClick: onLoadClick, disabled: loading }, loading ? "Loading…" : "Load PDF"), pages.length === 0 && /* @__PURE__ */ React.createElement("button", { type: "button", onClick: onNewDocClick, disabled: loading, title: "Start a blank document with a paper size you choose" }, "New Document"), /* @__PURE__ */ React.createElement("button", { type: "button", className: "log-btn", onClick: onInsertPdfClick, disabled: loading || pages.length === 0, title: "Insert another PDF's pages into this document" }, "Insert PDF"), /* @__PURE__ */ React.createElement("button", { type: "button", className: "log-btn", onClick: onSelectAll, disabled: loading || pages.length === 0, title: "Select every page" }, "Select All"))), /* @__PURE__ */ React.createElement("div", { className: "ze-sidebar-body", ref: bodyRef, onDragOver: handleContainerDragOver }, pages.length === 0 && !loading ? /* @__PURE__ */ React.createElement("div", { className: "ze-sidebar-empty" }, 'No pages yet. Click "Load PDF" to bring in a file, or "New Document" to start a blank layout.') : /* @__PURE__ */ React.createElement("div", { className: "ze-thumb-list" }, /* @__PURE__ */ React.createElement(PageGap, { onInsert: () => onInsertBlank(0) }), pages.map((p, idx) => /* @__PURE__ */ React.createElement(React.Fragment, { key: p.key }, dragOverInfo && dragOverInfo.idx === idx && dragOverInfo.before && /* @__PURE__ */ React.createElement("div", { className: "ze-drop-line" }), /* @__PURE__ */ React.createElement("div", { className: "ze-thumb-slot" }, /* @__PURE__ */ React.createElement(
      Thumbnail,
      {
        p,
        src: liveThumbs[p.key] || p.dataUrl,
        idx,
        isSelected: idx === selectedIdx || selectedPageIndices.includes(idx),
        onSelect,
        onRotate,
        onDelete,
        dragHandlers: dragHandlersFor(idx)
      }
    )), dragOverInfo && dragOverInfo.idx === idx && !dragOverInfo.before && /* @__PURE__ */ React.createElement("div", { className: "ze-drop-line" }), /* @__PURE__ */ React.createElement(PageGap, { onInsert: () => onInsertBlank(idx + 1) }))))));
  }

  // apps/ZEditor/src/ui/toolbar/ToolBar.jsx
  function ToolBar({ selection, edits, view, zoom, dialogs }) {
    const { tool, selectTool, selectedAnnId } = selection;
    const { layersOpen, setLayersOpen, centerGuideOn, setCenterGuideOn } = view;
    return /* @__PURE__ */ React.createElement("div", { className: "ze-tool-bar" }, /* @__PURE__ */ React.createElement("div", { className: "ze-tool-bar-group" }, /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-tool-icon-btn" + (tool === "select" ? " active" : ""), title: "Move (V)", onClick: () => selectTool("select") }, /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 24 24", width: "16", height: "16", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("path", { d: "M4 3l6.5 16 2-6.5L19 10.5z", fill: "currentColor" }))), /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-tool-icon-btn" + (tool === "text" ? " active" : ""), title: "Text (T)", onClick: () => selectTool("text") }, /* @__PURE__ */ React.createElement("span", { className: "ze-tool-icon-text" }, "T")), /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-tool-icon-btn", title: "Insert Image (I)", onClick: edits.handleImageToolClick }, /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 24 24", width: "16", height: "16", fill: "none", stroke: "currentColor", strokeWidth: "1.7", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("rect", { x: "3", y: "4", width: "18", height: "16", rx: "2" }), /* @__PURE__ */ React.createElement("circle", { cx: "8.5", cy: "9.5", r: "1.5", fill: "currentColor", stroke: "none" }), /* @__PURE__ */ React.createElement("path", { d: "M21 16l-5.5-5.5a1.5 1.5 0 0 0-2.1 0L5 19" }))), /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-tool-icon-btn" + (tool === "rect" ? " active" : ""), title: "Rectangle (R)", onClick: () => selectTool("rect") }, /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 24 24", width: "16", height: "16", fill: "none", stroke: "currentColor", strokeWidth: "1.7", strokeLinejoin: "round", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("rect", { x: "3.5", y: "6", width: "17", height: "12" }))), /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-tool-icon-btn" + (tool === "ellipse" ? " active" : ""), title: "Ellipse (E)", onClick: () => selectTool("ellipse") }, /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 24 24", width: "16", height: "16", fill: "none", stroke: "currentColor", strokeWidth: "1.7", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("ellipse", { cx: "12", cy: "12", rx: "8.5", ry: "6" }))), /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-tool-icon-btn" + (tool === "pen" ? " active" : ""), title: "Draw (D)", onClick: () => selectTool("pen") }, /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 24 24", width: "16", height: "16", fill: "none", stroke: "currentColor", strokeWidth: "1.7", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("path", { d: "M4 20l1-4L16 5l3 3L8 19z" }), /* @__PURE__ */ React.createElement("path", { d: "M14 7l3 3" }))), /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-tool-icon-btn" + (tool === "highlighter" ? " active" : ""), title: "Highlight (H)", onClick: () => selectTool("highlighter") }, /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 24 24", width: "16", height: "16", fill: "none", stroke: "currentColor", strokeWidth: "1.7", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("path", { d: "M6 20l1-3.5 8-8 3.5 3.5-8 8z" }), /* @__PURE__ */ React.createElement("path", { d: "M14 9l3.5 3.5" }), /* @__PURE__ */ React.createElement("path", { d: "M3 21h5" }))), /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-tool-icon-btn" + (tool === "eraser" ? " active" : ""), title: "Eraser", onClick: () => selectTool("eraser") }, /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 24 24", width: "16", height: "16", fill: "none", stroke: "currentColor", strokeWidth: "1.7", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("path", { d: "M17 3l4 4-9.5 9.5H7L3 12z" }), /* @__PURE__ */ React.createElement("path", { d: "M7 21h13" }), /* @__PURE__ */ React.createElement("path", { d: "M9.5 5.5l6 6" }))), /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-tool-icon-btn" + (tool === "marquee" ? " active" : ""), title: "Marquee (M): draw a box, then Make layer (Ctrl+J copy, Ctrl+Shift+J cut)", onClick: () => selectTool("marquee") }, /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 24 24", width: "16", height: "16", fill: "none", stroke: "currentColor", strokeWidth: "1.7", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("rect", { x: "4", y: "5.5", width: "16", height: "13", strokeDasharray: "2.6 2.6" }))), /* @__PURE__ */ React.createElement("span", { className: "ze-tool-bar-divider", role: "separator", "aria-orientation": "vertical" }), /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-tool-icon-btn" + (tool === "measure" ? " active" : ""), title: "Measure (U): click two points; a third click clears", onClick: () => selectTool("measure") }, /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 24 24", width: "16", height: "16", fill: "none", stroke: "currentColor", strokeWidth: "1.7", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("rect", { x: "2.5", y: "8", width: "19", height: "8", rx: "1", transform: "rotate(-30 12 12)" }), /* @__PURE__ */ React.createElement("path", { d: "M8.2 11.4l1.3 2.2M11.2 9.7l1.3 2.2M14.2 8l1.3 2.2" }))), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        className: "ze-tool-icon-btn" + (layersOpen ? " active" : ""),
        "aria-pressed": layersOpen,
        "aria-label": "Layers panel",
        title: layersOpen ? "Minimize the Layers panel" : "Show the Layers panel",
        onClick: () => setLayersOpen((open) => !open)
      },
      /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 24 24", width: "16", height: "16", fill: "none", stroke: "currentColor", strokeWidth: "1.7", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("path", { d: "M12 3l9 5-9 5-9-5z" }), /* @__PURE__ */ React.createElement("path", { d: "M3 12.5l9 5 9-5" }), /* @__PURE__ */ React.createElement("path", { d: "M3 17l9 5 9-5" }))
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        className: "ze-tool-icon-btn" + (centerGuideOn ? " active" : ""),
        "aria-pressed": centerGuideOn,
        "aria-label": "Center guide",
        title: centerGuideOn ? "Hide the center guide" : "Show a guide down the middle of the page (for covers and two-page spreads)",
        onClick: () => setCenterGuideOn((on) => !on)
      },
      /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 24 24", width: "16", height: "16", fill: "none", stroke: "currentColor", strokeWidth: "1.7", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("rect", { x: "3", y: "5", width: "18", height: "14", rx: "1" }), /* @__PURE__ */ React.createElement("path", { d: "M12 3v18", strokeDasharray: "2.5 2.5" }))
    )), /* @__PURE__ */ React.createElement("div", { className: "ze-zoom-control" }, /* @__PURE__ */ React.createElement("span", { className: "ze-format-label" }, "Zoom (%)"), /* @__PURE__ */ React.createElement(SliderNumberInput, { min: ZOOM_PERCENT.min, max: ZOOM_PERCENT.max, value: zoom.zoomPercent, onChange: zoom.handleZoomChange })), /* @__PURE__ */ React.createElement("div", { className: "ze-tool-bar-group" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        className: "ze-tool-icon-btn",
        title: "Delete selected (Delete)",
        disabled: selectedAnnId === null,
        onClick: edits.handleDeleteAnnotation
      },
      /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 24 24", width: "16", height: "16", fill: "none", stroke: "currentColor", strokeWidth: "1.7", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("path", { d: "M4 7h16" }), /* @__PURE__ */ React.createElement("path", { d: "M9 7V4h6v3" }), /* @__PURE__ */ React.createElement("path", { d: "M6 7l1 13h10l1-13" }), /* @__PURE__ */ React.createElement("path", { d: "M10 11v6" }), /* @__PURE__ */ React.createElement("path", { d: "M14 11v6" }))
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        className: "ze-tool-icon-btn ze-tool-icon-btn--round",
        title: "Keyboard shortcuts",
        "aria-label": "Keyboard shortcuts",
        onClick: () => dialogs.setShortcutsOpen(true)
      },
      /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 24 24", width: "16", height: "16", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("path", { d: "M12 11v7" }), /* @__PURE__ */ React.createElement("path", { d: "M12 6.5v.01" }))
    )));
  }

  // apps/ZEditor/src/ui/TouchBar.jsx
  var { useState: useState35, useEffect: useEffect25 } = React;
  function pressKey(key, mods) {
    window.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...mods }));
  }
  var Icon = ({ children }) => /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 24 24", width: "18", height: "18", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" }, children);
  function TouchBar({ selectedAnn, isEditing, isCropping, onEditText, marqueePolygonOpen }) {
    const [shift, setShift] = useState35(false);
    const [alt, setAlt] = useState35(false);
    useEffect25(() => {
      setTouchModifier("shift", shift);
    }, [shift]);
    useEffect25(() => {
      setTouchModifier("alt", alt);
    }, [alt]);
    useEffect25(() => () => {
      setTouchModifier("shift", false);
      setTouchModifier("alt", false);
    }, []);
    const hasSelection = Boolean(selectedAnn) && !isEditing;
    const keep = (e) => e.preventDefault();
    return /* @__PURE__ */ React.createElement("div", { className: "ze-touch-bar", role: "toolbar", "aria-label": "Touch controls" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        className: "ze-touch-btn ze-touch-key" + (shift ? " is-on" : ""),
        "aria-pressed": shift,
        onMouseDown: keep,
        title: "Shift, held until tapped again: add to the selection, keep proportions, snap turns to 15°, draw at 45°",
        onClick: () => setShift((v) => !v)
      },
      "Shift"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        className: "ze-touch-btn ze-touch-key" + (alt ? " is-on" : ""),
        "aria-pressed": alt,
        onMouseDown: keep,
        title: "Alt, held until tapped again: move without snapping to guides, pick one item out of a group",
        onClick: () => setAlt((v) => !v)
      },
      "Alt"
    ), marqueePolygonOpen && /* @__PURE__ */ React.createElement("span", { className: "ze-touch-sep", "aria-hidden": "true" }), marqueePolygonOpen && /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-touch-btn ze-touch-key", title: "Close the polygon (Enter)", "aria-label": "Close the polygon", onMouseDown: keep, onClick: () => pressKey("Enter") }, "Close"), marqueePolygonOpen && /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-touch-btn ze-touch-key", title: "Take the last point back (Backspace)", "aria-label": "Undo the last point", onMouseDown: keep, onClick: () => pressKey("Backspace") }, "Undo point"), hasSelection && /* @__PURE__ */ React.createElement("span", { className: "ze-touch-sep", "aria-hidden": "true" }), hasSelection && selectedAnn && selectedAnn.type === "text" && /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-touch-btn", title: "Edit text", "aria-label": "Edit text", onMouseDown: keep, onClick: () => onEditText(selectedAnn.id) }, /* @__PURE__ */ React.createElement(Icon, null, /* @__PURE__ */ React.createElement("path", { d: "M4 20h4L19 9l-4-4L4 16v4Z" }), /* @__PURE__ */ React.createElement("path", { d: "M13.5 6.5l4 4" }))), hasSelection && selectedAnn && selectedAnn.type === "image" && /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        className: "ze-touch-btn" + (isCropping ? " is-on" : ""),
        "aria-pressed": isCropping,
        onMouseDown: keep,
        title: isCropping ? "Done cropping" : "Crop (the image's rotation must be 0°)",
        "aria-label": "Crop",
        onClick: () => pressKey("c")
      },
      /* @__PURE__ */ React.createElement(Icon, null, /* @__PURE__ */ React.createElement("path", { d: "M6 2v14a2 2 0 0 0 2 2h14" }), /* @__PURE__ */ React.createElement("path", { d: "M2 6h14a2 2 0 0 1 2 2v14" }))
    ), hasSelection && selectedAnn && /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        className: "ze-touch-btn" + (selectedAnn.clipToBelow ? " is-on" : ""),
        "aria-pressed": Boolean(selectedAnn.clipToBelow),
        onMouseDown: keep,
        title: "Clipping mask: show this layer only inside the layer below it",
        "aria-label": "Clipping mask",
        onClick: () => pressKey("g", { ctrlKey: true, altKey: true })
      },
      /* @__PURE__ */ React.createElement(Icon, null, /* @__PURE__ */ React.createElement("path", { d: "M5 4v8a3 3 0 0 0 3 3h11" }), /* @__PURE__ */ React.createElement("path", { d: "M15 11l4 4-4 4" }))
    ), hasSelection && selectedAnn && /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        className: "ze-touch-btn",
        title: "Duplicate",
        "aria-label": "Duplicate",
        onMouseDown: keep,
        onClick: () => {
          pressKey("c", { ctrlKey: true });
          pressKey("v", { ctrlKey: true });
        }
      },
      /* @__PURE__ */ React.createElement(Icon, null, /* @__PURE__ */ React.createElement("rect", { x: "8", y: "8", width: "12", height: "12", rx: "2" }), /* @__PURE__ */ React.createElement("path", { d: "M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" }))
    ), hasSelection && /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-touch-btn ze-touch-danger", title: "Delete", "aria-label": "Delete", onMouseDown: keep, onClick: () => pressKey("Delete") }, /* @__PURE__ */ React.createElement(Icon, null, /* @__PURE__ */ React.createElement("path", { d: "M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" }))));
  }

  // apps/ZEditor/src/ui/settings/FilterSettings.jsx
  function FilterSettings({
    filterType,
    onFilterTypeChange,
    duotoneDark,
    duotoneLight,
    onDuotoneDarkChange,
    onDuotoneLightChange,
    filter,
    onFilterPatch
  }) {
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "ze-format-field" }, /* @__PURE__ */ React.createElement("span", { className: "ze-format-label" }, "Filter"), /* @__PURE__ */ React.createElement("select", { className: "ze-format-select", value: filterType, onChange: (e) => onFilterTypeChange(e.target.value) }, PAGE_FILTER_OPTIONS.map((o) => /* @__PURE__ */ React.createElement("option", { key: o.key, value: o.key }, o.label)))), filterType === "duotone" && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "ze-format-field" }, /* @__PURE__ */ React.createElement("span", { className: "ze-format-label" }, "Dark tone"), /* @__PURE__ */ React.createElement("input", { type: "color", className: "ze-format-color-input", value: duotoneDark, onChange: (e) => onDuotoneDarkChange(e.target.value) })), /* @__PURE__ */ React.createElement("div", { className: "ze-format-field" }, /* @__PURE__ */ React.createElement("span", { className: "ze-format-label" }, "Light tone"), /* @__PURE__ */ React.createElement("input", { type: "color", className: "ze-format-color-input", value: duotoneLight, onChange: (e) => onDuotoneLightChange(e.target.value) }))), FILTER_CONTROLS[filterType] && /* @__PURE__ */ React.createElement(ControlList, { controls: FILTER_CONTROLS[filterType], source: filter, onPatch: onFilterPatch }), /* @__PURE__ */ React.createElement("span", { className: "ze-format-hint" }, "Applies to the selected pages' backgrounds and any placed images (other pages keep their own setting). Pen and text stay crisp on top. Baked into Export PDF too."));
  }

  // apps/ZEditor/src/ui/settings/GuidesSettings.jsx
  function GuidesSettings({ format, onFormatChange, marginIn, onMarginChange, bleedIn, onBleedChange }) {
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "ze-format-field" }, /* @__PURE__ */ React.createElement("span", { className: "ze-format-label" }, "Format"), /* @__PURE__ */ React.createElement("select", { className: "ze-format-select", value: format, onChange: (e) => onFormatChange(e.target.value) }, GUIDE_FORMAT_PRESETS.map((p) => /* @__PURE__ */ React.createElement("option", { key: p.key, value: p.key }, p.label)))), /* @__PURE__ */ React.createElement("label", { className: "ze-format-field" }, /* @__PURE__ */ React.createElement("span", { className: "ze-format-label" }, "Margin (in)"), /* @__PURE__ */ React.createElement(
      NumberBox,
      {
        className: "ze-format-number",
        min: "0",
        max: "3",
        step: "0.0625",
        value: marginIn,
        onChange: (e) => onMarginChange(Math.max(0, Number(e.target.value) || 0))
      }
    )), /* @__PURE__ */ React.createElement("label", { className: "ze-format-field" }, /* @__PURE__ */ React.createElement("span", { className: "ze-format-label" }, "Bleed (in)"), /* @__PURE__ */ React.createElement(
      NumberBox,
      {
        className: "ze-format-number",
        min: "0",
        max: "1",
        step: "0.0625",
        value: bleedIn,
        onChange: (e) => onBleedChange(Math.max(0, Number(e.target.value) || 0))
      }
    )), /* @__PURE__ */ React.createElement("span", { className: "ze-format-hint" }, 'Trim is centered on the page; margin sits inside it, bleed extends outside. Pick "Match Page Size" if the page is already trimmed to its final size.'));
  }

  // apps/ZEditor/src/ui/settings/OnionSkinSettings.jsx
  function OnionSkinSettings({ opacity, onOpacityChange }) {
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "ze-format-field" }, /* @__PURE__ */ React.createElement("span", { className: "ze-format-label" }, "Opacity (", Math.round(opacity * 100), "%)"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "range",
        className: "ze-format-slider",
        min: "0.05",
        max: "0.8",
        step: "0.05",
        value: opacity,
        onChange: (e) => onOpacityChange(Number(e.target.value))
      }
    )), /* @__PURE__ */ React.createElement("span", { className: "ze-format-hint" }, "Shows the previous page faintly on top, for aligning content across a spread. Switch pages and back to refresh it after editing that page."));
  }

  // apps/ZEditor/src/ui/settings/PageNumbersSettings.jsx
  function PageNumbersSettings({ settings, pageCount, onChange }) {
    const whole = (value, fallback, min = 0) => Math.max(min, Math.round(Number(value)) || fallback);
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("label", { className: "ze-format-field" }, /* @__PURE__ */ React.createElement("span", { className: "ze-format-label" }, "Start numbering on page"), /* @__PURE__ */ React.createElement(NumberBox, { className: "ze-format-number", min: "1", max: Math.max(1, pageCount), value: settings.from, onChange: (e) => onChange({ from: whole(e.target.value, 1, 1) }) })), /* @__PURE__ */ React.createElement("label", { className: "ze-format-field" }, /* @__PURE__ */ React.createElement("span", { className: "ze-format-label" }, "Stop after page (empty = last)"), /* @__PURE__ */ React.createElement(NumberBox, { className: "ze-format-number", min: "1", max: Math.max(1, pageCount), placeholder: "last", "data-allow-empty": true, value: settings.to || "", onChange: (e) => onChange({ to: e.target.value === "" ? 0 : whole(e.target.value, 0, 1) }) })), /* @__PURE__ */ React.createElement("label", { className: "ze-format-field" }, /* @__PURE__ */ React.createElement("span", { className: "ze-format-label" }, "First page shows number"), /* @__PURE__ */ React.createElement(NumberBox, { className: "ze-format-number", step: "1", value: settings.first, onChange: (e) => onChange({ first: Math.round(Number(e.target.value)) || 0 }) })), /* @__PURE__ */ React.createElement("div", { className: "ze-format-field" }, /* @__PURE__ */ React.createElement("span", { className: "ze-format-label" }, "Position"), /* @__PURE__ */ React.createElement(SelectInput, { options: PAGE_NUMBER_POSITIONS, value: settings.position, onChange: (position) => onChange({ position }) })), /* @__PURE__ */ React.createElement("div", { className: "ze-format-field" }, /* @__PURE__ */ React.createElement("span", { className: "ze-format-label" }, "Style"), /* @__PURE__ */ React.createElement(SelectInput, { options: PAGE_NUMBER_FORMATS, value: settings.format, onChange: (format) => onChange({ format }) })), /* @__PURE__ */ React.createElement("label", { className: "ze-format-field" }, /* @__PURE__ */ React.createElement("span", { className: "ze-format-label" }, "Size (pt)"), /* @__PURE__ */ React.createElement(NumberBox, { className: "ze-format-number", min: "4", max: "48", value: settings.size, onChange: (e) => onChange({ size: Math.min(48, whole(e.target.value, 10, 4)) }) })), /* @__PURE__ */ React.createElement("label", { className: "ze-format-field" }, /* @__PURE__ */ React.createElement("span", { className: "ze-format-label" }, "Distance from edge (in)"), /* @__PURE__ */ React.createElement(NumberBox, { className: "ze-format-number", min: "0", max: "3", step: "0.05", value: settings.marginIn, onChange: (e) => onChange({ marginIn: Math.max(0, Number(e.target.value) || 0) }) })), /* @__PURE__ */ React.createElement("div", { className: "ze-format-field" }, /* @__PURE__ */ React.createElement("span", { className: "ze-format-label" }, "Color"), /* @__PURE__ */ React.createElement("input", { type: "color", className: "ze-format-color-input", value: settings.color, onChange: (e) => onChange({ color: e.target.value }) })), /* @__PURE__ */ React.createElement("span", { className: "ze-format-hint" }, 'Pages are counted by their place in the document. "Outer corner" puts odd pages on the right and even pages on the left, like a printed booklet. Drawn on top of everything in Export PDF and Send to ZineArranger.'));
  }

  // apps/ZEditor/src/ui/settings/RulersSettings.jsx
  function RulersSettings({ unit, onUnitChange, guides, onClearGuides, snap: snap2, onSnapChange }) {
    const sorted = [...guides].sort((a, b) => a.axis === b.axis ? a.pos - b.pos : a.axis === "x" ? -1 : 1);
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "ze-format-field" }, /* @__PURE__ */ React.createElement("span", { className: "ze-format-label" }, "Units"), /* @__PURE__ */ React.createElement("select", { className: "ze-format-select", value: unit, onChange: (e) => onUnitChange(e.target.value) }, RULER_UNITS.map((u) => /* @__PURE__ */ React.createElement("option", { key: u.key, value: u.key }, u.label)))), /* @__PURE__ */ React.createElement("label", { className: "ze-format-field", style: { flexDirection: "row", alignItems: "center", gap: 8 } }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: snap2, onChange: (e) => onSnapChange(e.target.checked) }), /* @__PURE__ */ React.createElement("span", null, "Snap items to guides when moving them")), /* @__PURE__ */ React.createElement("div", { className: "ze-format-field" }, /* @__PURE__ */ React.createElement("span", { className: "ze-format-label" }, "Guides (", guides.length, ")"), sorted.length > 0 && /* @__PURE__ */ React.createElement("span", { className: "ze-format-hint", style: { margin: "0 0 6px" } }, sorted.map((g) => (g.axis === "x" ? "| " : "— ") + formatInUnit(g.pos, unit)).join(" · ")), /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-format-toggle ze-format-toggle-wide", disabled: !guides.length, onClick: onClearGuides }, "Clear all guides")), /* @__PURE__ */ React.createElement("span", { className: "ze-format-hint" }, "Drag from the top ruler for a horizontal guide, or from the left ruler for a vertical one. Drag a guide to move it, or back onto its ruler to remove it. Hold Shift to land on whole units. Guides show on every page, are saved with the project, and never print."));
  }

  // apps/ZEditor/src/ui/topbar/PageMenu.jsx
  var { useState: useState36 } = React;
  function PageMenuBody({ rows }) {
    const [customizing, setCustomizing] = useState36(null);
    const active = rows.find((r) => r.key === customizing);
    if (active) {
      return /* @__PURE__ */ React.createElement("div", { className: "ze-menu-settings" }, /* @__PURE__ */ React.createElement("div", { className: "ze-menu-settings-head" }, /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-menu-back", title: "Back", onClick: () => setCustomizing(null) }, /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 20 20", width: "12", height: "12", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("path", { d: "M12.5 5.5L8 10l4.5 4.5" }))), /* @__PURE__ */ React.createElement("span", null, active.label)), active.settings);
    }
    return rows.map((row) => /* @__PURE__ */ React.createElement("div", { key: row.key, className: "ze-menu-toggle-row" + (row.disabled ? " disabled" : "") }, /* @__PURE__ */ React.createElement("div", { className: "ze-menu-toggle-text" }, /* @__PURE__ */ React.createElement("span", { className: "ze-menu-toggle-label" }, row.label), row.detail && /* @__PURE__ */ React.createElement("span", { className: "ze-menu-toggle-detail" }, row.detail)), /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-menu-customize", disabled: row.disabled, onClick: () => setCustomizing(row.key) }, "Customize…"), /* @__PURE__ */ React.createElement("label", { className: "toggle-switch", title: (row.checked ? "Turn off " : "Turn on ") + row.label }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: row.checked, disabled: row.disabled, onChange: (e) => row.onToggle(e.target.checked) }), /* @__PURE__ */ React.createElement("span", { className: "toggle-slider" }))));
  }

  // apps/ZEditor/src/ui/topbar/Topbar.jsx
  function Topbar({ doc, history, view, edits, project, dialogs, exporter, status }) {
    const { pages, selectedPage, pageFilter } = doc;
    const { updatePageFilter } = edits;
    const { docTitle, setDocTitle, projectFile, savingProject, justSaved } = project;
    const { exporting, sendingToArranger } = exporter;
    return /* @__PURE__ */ React.createElement("header", { className: "topbar" }, /* @__PURE__ */ React.createElement("div", { className: "topbar-brand" }, /* @__PURE__ */ React.createElement("div", { className: "topbar-logo" }, "ZE"), /* @__PURE__ */ React.createElement("div", { className: "topbar-brand-text" }, /* @__PURE__ */ React.createElement("div", { className: "topbar-title" }, "ZEditor"), /* @__PURE__ */ React.createElement("div", { className: "topbar-subtitle", title: "Build number: changes whenever the app is updated" }, "Compose zine pages · build ", "26d51c0"))), /* @__PURE__ */ React.createElement("div", { className: "topbar-actions" }, /* @__PURE__ */ React.createElement("div", { className: "ze-tool-bar-group" }, /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-tool-icon-btn", title: "Undo (Ctrl+Z)", disabled: history.undoStack.length === 0, onClick: history.handleUndo }, /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 24 24", width: "16", height: "16", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("path", { d: "M9 7L4 12l5 5" }), /* @__PURE__ */ React.createElement("path", { d: "M4 12h11a5 5 0 0 1 0 10h-1" }))), /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-tool-icon-btn", title: "Redo (Ctrl+Shift+Z)", disabled: history.redoStack.length === 0, onClick: history.handleRedo }, /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 24 24", width: "16", height: "16", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("path", { d: "M15 7l5 5-5 5" }), /* @__PURE__ */ React.createElement("path", { d: "M20 12H9a5 5 0 0 0 0 10h1" }))), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        className: "ze-tool-icon-btn",
        disabled: project.reloading,
        title: "Reload the app (picks up code changes) and keep your work: pages, items, title and the file it saves to come back. Undo history starts fresh.",
        onClick: project.reloadKeepingWork
      },
      /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 24 24", width: "16", height: "16", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("path", { d: "M20 11a8 8 0 1 0-2.3 5.7" }), /* @__PURE__ */ React.createElement("path", { d: "M20 4v7h-7" }))
    )), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        className: "ze-title-input",
        "aria-label": "Zine title",
        placeholder: "Untitled zine",
        title: "Zine title — names the saved project and exported PDF",
        disabled: pages.length === 0,
        value: docTitle,
        onChange: (e) => setDocTitle(e.target.value),
        onKeyDown: (e) => {
          if (e.key === "Enter" || e.key === "Escape") e.currentTarget.blur();
        },
        onBlur: () => setDocTitle((t) => t.trim())
      }
    ), /* @__PURE__ */ React.createElement(TopMenu, { label: "Page" }, () => /* @__PURE__ */ React.createElement(
      PageMenuBody,
      {
        rows: [
          {
            key: "filter",
            label: "Filter",
            // Per page, so it needs a page to act on. Turning it off
            // remembers the filter it was on, and turning it back on
            // restores that (its settings stay on the page throughout).
            disabled: !selectedPage,
            detail: pageFilter.type !== "none" ? (PAGE_FILTER_OPTIONS.find((o) => o.key === pageFilter.type) || PAGE_FILTER_OPTIONS[0]).label : null,
            checked: pageFilter.type !== "none",
            onToggle: (on) => updatePageFilter(on ? { type: pageFilter.lastType && pageFilter.lastType !== "none" ? pageFilter.lastType : "grayscale" } : { type: "none", lastType: pageFilter.type }),
            settings: /* @__PURE__ */ React.createElement(
              FilterSettings,
              {
                filterType: pageFilter.type,
                onFilterTypeChange: (type) => updatePageFilter({ type }),
                duotoneDark: pageFilter.darkColor || DEFAULT_DUOTONE_DARK,
                duotoneLight: pageFilter.lightColor || DEFAULT_DUOTONE_LIGHT,
                onDuotoneDarkChange: (darkColor) => updatePageFilter({ darkColor }),
                onDuotoneLightChange: (lightColor) => updatePageFilter({ lightColor }),
                filter: pageFilter,
                onFilterPatch: updatePageFilter
              }
            )
          },
          {
            key: "onion",
            label: "Onion Skin",
            checked: view.onionSkinOn,
            onToggle: view.setOnionSkinOn,
            settings: /* @__PURE__ */ React.createElement(OnionSkinSettings, { opacity: view.onionSkinOpacity, onOpacityChange: view.setOnionSkinOpacity })
          },
          {
            key: "pageNumbers",
            label: "Page Numbers",
            checked: view.pageNumbers.on,
            onToggle: (on) => view.setPageNumbers((current) => ({ ...current, on })),
            settings: /* @__PURE__ */ React.createElement(
              PageNumbersSettings,
              {
                settings: view.pageNumbers,
                pageCount: pages.length,
                onChange: (patch) => view.setPageNumbers((current) => ({ ...current, ...patch }))
              }
            )
          },
          {
            key: "rulers",
            label: "Rulers & Guides",
            detail: view.rulerGuides.length ? String(view.rulerGuides.length) : null,
            checked: view.rulersOn,
            onToggle: view.setRulersOn,
            settings: /* @__PURE__ */ React.createElement(
              RulersSettings,
              {
                unit: view.rulerUnit,
                onUnitChange: view.setRulerUnit,
                guides: view.rulerGuides,
                onClearGuides: () => view.setRulerGuides([]),
                snap: view.snapToGuidesOn,
                onSnapChange: view.setSnapToGuidesOn
              }
            )
          },
          {
            key: "guides",
            label: "Guides",
            checked: view.guidesOn,
            onToggle: view.setGuidesOn,
            settings: /* @__PURE__ */ React.createElement(
              GuidesSettings,
              {
                format: view.guideFormat,
                onFormatChange: view.setGuideFormat,
                marginIn: view.guideMarginIn,
                onMarginChange: view.setGuideMarginIn,
                bleedIn: view.guideBleedIn,
                onBleedChange: view.setGuideBleedIn
              }
            )
          }
        ]
      }
    )), /* @__PURE__ */ React.createElement(TopMenu, { label: savingProject ? "Saving…" : justSaved ? "Saved ✓" : "Project" }, ({ close }) => /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
      MenuItem,
      {
        close,
        label: "New Project",
        disabled: pages.length === 0,
        onClick: dialogs.handleNewProjectClick,
        hint: "Start over by loading a different PDF — erases the current unsaved project"
      }
    ), /* @__PURE__ */ React.createElement(
      MenuItem,
      {
        close,
        label: "Save",
        shortcut: "Ctrl+S",
        detail: projectFile ? projectFile.name : null,
        disabled: pages.length === 0 || savingProject,
        onClick: () => project.handleSaveProject(),
        hint: projectFile ? "Saves over " + projectFile.name : "Saves an editable project file — pages, text, images, and settings — to reopen and keep editing later"
      }
    ), /* @__PURE__ */ React.createElement(
      MenuItem,
      {
        close,
        label: "Save As…",
        shortcut: "Ctrl+Shift+S",
        disabled: pages.length === 0 || savingProject,
        onClick: () => project.handleSaveProject({ saveAs: true }),
        hint: "Saves this project to a new file, and keeps saving there"
      }
    ), /* @__PURE__ */ React.createElement(
      MenuItem,
      {
        close,
        label: "Load Project",
        disabled: status.loading,
        onClick: dialogs.handleLoadProjectClick,
        hint: "Reopen a saved ZEditor project file"
      }
    ))), /* @__PURE__ */ React.createElement(TopMenu, { label: exporting ? "Exporting…" : sendingToArranger ? "Sending…" : "Export", solid: true }, ({ close }) => /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
      MenuItem,
      {
        close,
        label: "Export PDF",
        disabled: pages.length === 0 || exporting,
        onClick: exporter.handleExportPdf
      }
    ), /* @__PURE__ */ React.createElement(
      MenuItem,
      {
        close,
        label: "Export page as PNG (transparent)",
        disabled: doc.selectedIdx === null || exporting,
        onClick: () => exporter.handleExportImage("png"),
        hint: "The page you're on, as a picture with a see-through background"
      }
    ), /* @__PURE__ */ React.createElement(
      MenuItem,
      {
        close,
        label: "Export page as JPG",
        disabled: doc.selectedIdx === null || exporting,
        onClick: () => exporter.handleExportImage("jpg"),
        hint: "The page you're on, as a picture on white"
      }
    ), /* @__PURE__ */ React.createElement(
      MenuItem,
      {
        close,
        label: "Export selection as SVG",
        disabled: exporting || !exporter.canExportSvg(),
        onClick: () => exporter.handleExportSvg(),
        hint: "Only the selected layers, cropped to them, on a see-through background. Vectorized images, shapes and pen strokes stay editable vectors"
      }
    ), /* @__PURE__ */ React.createElement(
      MenuItem,
      {
        close,
        label: "Send to ZineArranger",
        disabled: pages.length === 0 || exporting || sendingToArranger,
        onClick: exporter.handleSendToZineArranger,
        hint: "Exports the current zine and opens it directly in ZineArranger — no manual save/reopen step"
      }
    )))));
  }

  // shared/js/displaySettings.js
  var EVENT = "zn-display-prefs";
  var clampTo = (v, s) => Number.isFinite(v) ? Math.min(s.max, Math.max(s.min, v)) : s.initial;
  var snap = (v, s) => clampTo(Math.round(v / s.step) * s.step, s);
  var tidy = (v) => Math.round(v * 1e3) / 1e3;
  function installDisplaySettings(options) {
    const { storageKey, sliders = [], groups = [], title = "Display" } = options;
    const checks = groups.flatMap((g) => g.checks || []);
    const choices = groups.flatMap((g) => g.choices || []);
    const optionValues = (ch, o) => Object.fromEntries(ch.flags.map((f) => [f.key, o.values[f.key] === true]));
    const optionIndex = (ch, p) => ch.options.findIndex((o) => ch.flags.every((f) => p[f.key] === (o.values[f.key] === true)));
    const initialOption = (ch) => ch.options[ch.initial || 0];
    const defaults = {};
    for (const s of sliders) defaults[s.key] = s.initial;
    for (const c of checks) defaults[c.key] = false;
    for (const ch of choices) Object.assign(defaults, optionValues(ch, initialOption(ch)));
    function load2() {
      let saved = {};
      try {
        saved = JSON.parse(localStorage.getItem(storageKey)) || {};
      } catch (e) {
      }
      const prefs2 = {};
      for (const s of sliders) prefs2[s.key] = clampTo(Number(saved[s.key]), s);
      for (const c of checks) prefs2[c.key] = saved[c.key] === true;
      for (const ch of choices) {
        for (const f of ch.flags) prefs2[f.key] = saved[f.key] === true;
        if (optionIndex(ch, prefs2) < 0) Object.assign(prefs2, optionValues(ch, initialOption(ch)));
      }
      return prefs2;
    }
    function apply() {
      const root = document.documentElement;
      for (const s of sliders) root.style.setProperty(s.cssVar, s.cssValue ? s.cssValue(prefs[s.key]) : String(prefs[s.key]));
      for (const c of checks) if (c.htmlClass) root.classList.toggle(c.htmlClass, prefs[c.key]);
      for (const ch of choices) for (const f of ch.flags) if (f.htmlClass) root.classList.toggle(f.htmlClass, prefs[f.key]);
      window.dispatchEvent(new CustomEvent(EVENT, { detail: { ...prefs } }));
    }
    function set(changes) {
      prefs = { ...prefs, ...changes };
      try {
        localStorage.setItem(storageKey, JSON.stringify(prefs));
      } catch (e) {
      }
      apply();
      refresh();
    }
    let prefs = load2();
    apply();
    const el = (tag, cls, attrs = {}) => {
      const n = document.createElement(tag);
      if (cls) n.className = cls;
      for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
      return n;
    };
    const floating = options.mount === void 0 || options.mount === null;
    const wrap = el("div", "zn-display" + (floating ? " zn-display-floating" : ""));
    const panel = el("div", "zn-display-panel", { role: "dialog", "aria-label": title + " settings" });
    panel.hidden = true;
    const head = el("div", "zn-display-title");
    head.textContent = title;
    panel.appendChild(head);
    const sliderViews = sliders.map((s) => {
      const row = el("div", "zn-display-row");
      const label = el("div", "zn-display-label");
      const name = el("span");
      name.textContent = s.label;
      const value = el("span", "zn-display-value");
      label.append(name, value);
      const control = el("div", "zn-display-control");
      const minus = el("button", "zn-display-step", { type: "button", "aria-label": "Smaller " + s.label.toLowerCase() });
      minus.textContent = "−";
      const range = el("input", "", { type: "range", min: s.min, max: s.max, step: s.step, "aria-label": s.label });
      const plus = el("button", "zn-display-step", { type: "button", "aria-label": "Larger " + s.label.toLowerCase() });
      plus.textContent = "+";
      control.append(minus, range, plus);
      row.append(label, control);
      panel.appendChild(row);
      minus.addEventListener("click", () => set({ [s.key]: tidy(snap(prefs[s.key] - s.step, s)) }));
      plus.addEventListener("click", () => set({ [s.key]: tidy(snap(prefs[s.key] + s.step, s)) }));
      range.addEventListener("input", () => set({ [s.key]: tidy(snap(Number(range.value), s)) }));
      return { s, value, minus, range, plus };
    });
    const checkViews = [];
    const choiceViews = [];
    for (const g of groups) {
      if (g.title) {
        const sub = el("div", "zn-display-subtitle");
        sub.textContent = g.title;
        panel.appendChild(sub);
      }
      const list = el("div", "zn-display-checks");
      for (const c of g.checks || []) {
        const label = el("label", "zn-display-check");
        const box = el("input", "", { type: "checkbox" });
        const text = el("span");
        text.textContent = c.label;
        label.append(box, text);
        list.appendChild(label);
        box.addEventListener("change", () => set({ [c.key]: c.showMeans ? !box.checked : box.checked }));
        checkViews.push({ c, label, box });
      }
      for (const ch of g.choices || []) {
        const label = el("label", "zn-display-choice");
        if (ch.hint) label.title = ch.hint;
        const text = el("span");
        text.textContent = ch.label;
        const select = el("select", "", { "aria-label": ch.label });
        ch.options.forEach((o, i) => {
          const opt = el("option", "", { value: String(i) });
          opt.textContent = o.label;
          select.appendChild(opt);
        });
        label.append(text, select);
        list.appendChild(label);
        select.addEventListener("change", () => set(optionValues(ch, ch.options[Number(select.value)])));
        choiceViews.push({ ch, select });
      }
      panel.appendChild(list);
    }
    const foot = el("div", "zn-display-foot");
    const note = el("span", "zn-display-note");
    note.textContent = "Saved in this browser";
    const reset = el("button", "zn-display-reset", { type: "button" });
    reset.textContent = "Reset";
    reset.addEventListener("click", () => set(defaults));
    foot.append(note, reset);
    panel.appendChild(foot);
    const gear = el("button", "zn-display-gear", {
      type: "button",
      title: title + " settings",
      "aria-label": title + " settings",
      "aria-expanded": "false"
    });
    gear.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>';
    wrap.append(panel, gear);
    if (floating) document.body.appendChild(wrap);
    else if (options.mount) options.mount.appendChild(wrap);
    function refresh() {
      for (const v of sliderViews) {
        const n = prefs[v.s.key];
        v.value.textContent = n + (v.s.unit || "");
        v.range.value = String(n);
        v.minus.disabled = n <= v.s.min;
        v.plus.disabled = n >= v.s.max;
      }
      for (const v of checkViews) {
        const on = prefs[v.c.key];
        v.box.checked = v.c.showMeans ? !on : on;
        v.label.title = v.c.hint || "";
      }
      for (const v of choiceViews) v.select.value = String(Math.max(0, optionIndex(v.ch, prefs)));
      reset.disabled = Object.keys(defaults).every((k) => prefs[k] === defaults[k]);
    }
    refresh();
    function setOpen(open) {
      panel.hidden = !open;
      gear.classList.toggle("open", open);
      gear.setAttribute("aria-expanded", String(open));
    }
    gear.addEventListener("click", () => setOpen(panel.hidden));
    document.addEventListener("pointerdown", (e) => {
      if (!panel.hidden && !wrap.contains(e.target)) setOpen(false);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !panel.hidden) setOpen(false);
    });
    wrap.addEventListener("pointerdown", (e) => e.stopPropagation());
    wrap.addEventListener("mousedown", (e) => e.stopPropagation());
    return { get prefs() {
      return { ...prefs };
    }, set, element: wrap };
  }

  // apps/ZEditor/src/ui/displaySettings.js
  var display = null;
  function installZeditorDisplaySettings() {
    display = installDisplaySettings({
      storageKey: "zeditor.displayPrefs",
      mount: false,
      // App.jsx places it next to the touch bar once that's rendered
      sliders: [
        { key: "uiScale", label: "Interface size", min: 75, max: 175, step: 5, initial: 100, unit: "%", cssVar: "--zn-ui-zoom", cssValue: (v) => String(v / 100) },
        { key: "thumbSize", label: "Thumbnail size", min: 30, max: 100, step: 5, initial: 100, unit: "%", cssVar: "--ze-thumb-zoom", cssValue: (v) => String(v / 100) }
      ],
      groups: [
        { title: "Pages panel", checks: [
          { key: "staticThumbs", label: "Live page thumbnails", showMeans: true, htmlClass: "ze-static-thumbs", hint: "The page thumbnails show your items and filters as you edit. Untick if the app feels slow: they go back to the plain pages." }
        ] },
        { title: "Show", checks: [
          { key: "hideTopbar", label: "Top bar", showMeans: true, htmlClass: "ze-hide-topbar", hint: "The title and the Page, Project and Export menus" }
        ], choices: [
          {
            label: "Side panels",
            hint: "Pages panel: the page thumbnails. Format panel: the selected item's or tool's settings.",
            initial: 2,
            flags: [{ key: "hidePages", htmlClass: "ze-hide-pages" }, { key: "hideFormat", htmlClass: "ze-hide-format" }],
            options: [
              { label: "Pages panel (left) only", values: { hideFormat: true } },
              { label: "Format panel (right) only", values: { hidePages: true } },
              { label: "Show both", values: {} }
            ]
          }
        ] }
      ]
    });
    return display;
  }
  function attachDisplayGear(slot) {
    if (slot && display && display.element.parentNode !== slot) slot.appendChild(display.element);
  }

  // apps/ZEditor/src/ui/App.jsx
  function App() {
    const status = useStatus();
    const [welcomeDismissed, setWelcomeDismissed] = React.useState(false);
    const bodyRef = React.useRef(null);
    const doc = useDocumentState();
    const history = useHistory(doc);
    const view = useViewSettings();
    const toolDefaults = useToolDefaults();
    const selection = useSelection(doc);
    const edits = useAnnotationEdits({ doc, history, selection, toolDefaults });
    const magic = useMagicErase({ doc, selection, edits, toolDefaults });
    const imageTrace = useImageTrace({ doc, selection, edits });
    const marquee = useMarquee({ doc, selection, edits, toolDefaults, status });
    const uiHistory = { ...history, handleUndo: () => {
      if (!magic.cancel()) history.handleUndo();
    }, handleRedo: () => {
      if (!magic.cancel()) history.handleRedo();
    } };
    const pageOps = usePageOps({ doc, history, selection });
    const project = useProject({ doc, history, status, view, toolDefaults });
    const dialogs = useDialogs({ pages: doc.pages, openProjectPicker: project.openProjectPicker });
    const files = useDocumentFiles({ doc, history, status, project, selection, dialogs });
    const exporter = useExport({ doc, status, view, project, selection });
    const zoom = useZoom();
    const onionGhostSrc = useOnionGhost({ onionSkinOn: view.onionSkinOn, pages: doc.pages, selectedIdx: doc.selectedIdx, pdfDocsRef: doc.pdfDocsRef });
    const dropCtx = React.useRef(null);
    dropCtx.current = { selectedIdx: doc.selectedIdx, addImage: edits.addImageAnnotationFromFile, status };
    React.useEffect(() => installImageDrop({
      label: "Drop a picture to add it to the page",
      onDrop: async ({ files: files2, url, x, y }) => {
        const { selectedIdx: selectedIdx2, addImage, status: st } = dropCtx.current;
        if (selectedIdx2 === null) {
          st.setErrorMsg("Open a PDF or start a new document first, then drop the picture on a page.");
          return;
        }
        st.setErrorMsg(null);
        let list = files2;
        if (!list.length) {
          const file = await fetchImageFile(url);
          if (!file) {
            st.setErrorMsg("That website doesn't let other pages copy its pictures. Save the picture to your computer (right-click › Save image as…), then drop the file here.");
            return;
          }
          list = [file];
        }
        const pageEl = document.querySelector(".ze-page");
        const box = pageEl && pageEl.getBoundingClientRect();
        const onPage = box && x >= box.left && x <= box.right && y >= box.top && y <= box.bottom && pageEl.offsetWidth > 0;
        const scale = onPage ? box.width / pageEl.offsetWidth : 1;
        list.slice(0, 12).forEach((file, i) => addImage(file, selectedIdx2, onPage ? { center: { x: (x - box.left) / scale + i * 20, y: (y - box.top) / scale + i * 20 } } : void 0));
      },
      onOther: () => dropCtx.current.status.setErrorMsg("That isn't a picture. Drop a .png, .jpg, .gif, .webp or .svg file.")
    }), []);
    const modalOpen = Boolean(files.pendingInsertFile || dialogs.confirmAction || dialogs.shortcutsOpen || dialogs.newDocOpen);
    useKeyboardShortcuts({ doc, history: uiHistory, selection, edits, pageOps, project, marquee, modalOpen });
    const { pages, selectedIdx, selectedPageIndices, selectedPage, pageFilter } = doc;
    const { tool, selectedAnnId, selectedAnnIds, editingAnnId, croppingAnnId } = selection;
    const t = toolDefaults;
    return /* @__PURE__ */ React.createElement("div", { className: "ze-shell" }, /* @__PURE__ */ React.createElement(Topbar, { doc, history: uiHistory, view, edits, project, dialogs, exporter, status }), status.errorMsg && /* @__PURE__ */ React.createElement("div", { className: "ze-error-bar" }, status.errorMsg), status.notice && /* @__PURE__ */ React.createElement("div", { className: "ze-notice-bar" }, /* @__PURE__ */ React.createElement("span", null, status.notice), /* @__PURE__ */ React.createElement("button", { type: "button", className: "ze-notice-close", "aria-label": "Dismiss", onClick: () => status.setNotice(null) }, "×")), /* @__PURE__ */ React.createElement("div", { className: "ze-body", ref: bodyRef }, /* @__PURE__ */ React.createElement(
      PanelResizer,
      {
        bodyRef,
        side: "left",
        cssVar: "--ze-sidebar-width",
        otherVar: "--ze-format-panel-width",
        storageKey: "zeditor.sidebarWidth",
        min: 170,
        max: 480,
        label: "Resize the Pages panel"
      }
    ), selectedPage && /* @__PURE__ */ React.createElement(
      PanelResizer,
      {
        bodyRef,
        side: "right",
        cssVar: "--ze-format-panel-width",
        otherVar: "--ze-sidebar-width",
        storageKey: "zeditor.formatPanelWidth",
        min: 220,
        max: 520,
        label: "Resize the Format panel"
      }
    ), /* @__PURE__ */ React.createElement(
      Sidebar,
      {
        pages,
        selectedIdx,
        selectedPageIndices,
        onSelect: selection.handleSelectPage,
        onSelectAll: selection.handleSelectAllPages,
        onRotate: pageOps.handleRotate,
        onDelete: pageOps.handleDeleteThumbnail,
        onReorder: pageOps.handleReorder,
        onLoadClick: files.handleLoadClick,
        onNewDocClick: () => dialogs.openNewDocDialog(false),
        onInsertPdfClick: files.handleInsertPdfClick,
        onInsertBlank: pageOps.handleInsertBlank,
        loading: status.loading
      }
    ), /* @__PURE__ */ React.createElement("div", { className: "ze-compose-area" }, selectedPage && /* @__PURE__ */ React.createElement(ToolBar, { selection, edits, view, zoom, dialogs }), /* @__PURE__ */ React.createElement("div", { className: "ze-ruler-frame" + (selectedPage && view.rulersOn ? " has-rulers" : "") }, selectedPage && view.rulersOn && /* @__PURE__ */ React.createElement(
      Rulers,
      {
        paneRef: zoom.previewPaneRef,
        zoom: zoom.zoomPercent / 100,
        unit: view.rulerUnit,
        guides: view.rulerGuides,
        setGuides: view.setRulerGuides,
        pageKey: selectedPage.key
      }
    ), /* @__PURE__ */ React.createElement("div", { className: "preview-pane", ref: zoom.previewPaneRef }, /* @__PURE__ */ React.createElement("div", { className: "preview-canvas-wrapper" }, /* @__PURE__ */ React.createElement(
      ComposeCanvas,
      {
        zoom: zoom.zoomPercent / 100,
        rulerUnit: view.rulerUnit,
        pdfDocsRef: doc.pdfDocsRef,
        page: selectedPage,
        guidesOn: view.guidesOn,
        centerGuideOn: view.centerGuideOn,
        guideFormat: view.guideFormat,
        guideMarginIn: view.guideMarginIn,
        guideBleedIn: view.guideBleedIn,
        pageFilter,
        onionGhostSrc: view.onionSkinOn ? onionGhostSrc : null,
        onionSkinOpacity: view.onionSkinOpacity,
        pageNumberSpec: pageNumberSpec(view.pageNumbers, selectedIdx, pages.length),
        tool,
        penColor: t.penColor,
        penWidth: t.penWidth,
        penTaper: t.penTaper,
        highlighterColor: t.highlighterColor,
        highlighterWidth: t.highlighterWidth,
        highlighterTaper: t.highlighterTaper,
        annotations: selectedPage ? selectedPage.annotations || [] : [],
        selectedAnnId,
        selectedAnnIds,
        editingAnnId,
        onStartTextEdit: selection.setEditingAnnId,
        onFinishTextEdit: edits.finishTextEdit,
        onLinkNextFrame: edits.frameActions.linkNextFrame,
        onUnlinkNextFrame: edits.frameActions.unlinkNextFrame,
        onSelectAnnotations: selection.handleSelectAnnotations,
        onMoveAnnotations: edits.handleMoveAnnotations,
        onRotateAnnotations: edits.handleRotateAnnotations,
        croppingAnnId,
        priorityAnnId: selection.panelPickId !== null && selection.panelPickId === selectedAnnId ? selectedAnnId : null,
        onSelectAnnotation: selection.handleSelectAnnotation,
        onAddText: edits.handleAddText,
        onAddRect: edits.handleAddRect,
        onAddStroke: edits.handleAddStroke,
        onUpdateAnnotation: edits.handleUpdateAnnotation,
        onEraseStroke: edits.handleEraseStroke,
        onToggleCrop: selection.handleToggleCrop,
        eraserMode: t.eraserMode,
        softEraser: t.softEraser,
        onEraseImagePixels: edits.handleEraseImagePixels,
        magicPreview: magic.preview,
        onMagicClick: magic.start,
        marquee: marquee.region,
        marqueeShape: t.marquee.shape,
        onMarqueeChange: marquee.setRegion,
        snapGuides: view.rulersOn && view.snapToGuidesOn ? view.rulerGuides : null
      }
    ))), /* @__PURE__ */ React.createElement("div", { className: "ze-bottom-left" }, /* @__PURE__ */ React.createElement("div", { className: "ze-display-slot", ref: attachDisplayGear }), selectedPage && /* @__PURE__ */ React.createElement(
      TouchBar,
      {
        selectedAnn: tool === "marquee" ? null : (selectedPage.annotations || []).find((a) => a.id === selectedAnnId) || null,
        marqueePolygonOpen: marquee.polygonOpen,
        isEditing: editingAnnId !== null,
        isCropping: croppingAnnId !== null && croppingAnnId === selectedAnnId,
        onEditText: selection.setEditingAnnId
      }
    )))), selectedPage && /* @__PURE__ */ React.createElement(
      FormatPanel,
      {
        key: selectedAnnId,
        tool,
        selectedAnn: resolvePageText(selectedPage.annotations || []).find((a) => a.id === selectedAnnId) || null,
        onUpdate: edits.handleUpdateAnnotation,
        croppingAnnId,
        onToggleCrop: selection.handleToggleCrop,
        onFlattenImage: edits.handleFlattenImage,
        onRasterizeRect: edits.handleRasterizeRect,
        onRasterizeText: edits.handleRasterizeText,
        toolDefaults,
        styleActions: edits.styleActions,
        imageTrace,
        onExportSvg: exporter.handleExportSvg,
        magicErase: magic,
        marquee,
        targetLayer: (selectedPage.annotations || []).find((a) => a.id === selectedAnnId) || null
      }
    )), selectedPage && view.layersOpen && /* @__PURE__ */ React.createElement(
      LayersPanel,
      {
        position: view.layersPosition,
        onMove: view.setLayersPosition,
        size: view.layersSize,
        onResize: view.setLayersSize,
        onSetLook: (patch) => edits.handleSetLayerLook(selection.selectedAnnotationIds(), patch),
        onMinimize: () => view.setLayersOpen(false),
        annotations: selectedPage.annotations || [],
        selectedIds: selection.selectedAnnotationIds(),
        onSelect: selection.handleSelectLayer,
        onGroup: edits.handleGroupSelection,
        onUngroup: edits.handleUngroupSelection,
        onDelete: edits.handleDeleteAnnotation,
        onRenameGroup: edits.handleRenameGroup,
        onSetGroupFlag: edits.handleSetGroupFlag,
        onToggleFlag: edits.handleToggleLayerFlag,
        onToggleClip: edits.handleToggleClip,
        onClip: () => edits.handleSetClip(selection.selectedAnnotationIds(), true),
        onRelease: () => edits.handleSetClip(selection.selectedAnnotationIds(), false),
        onRename: (id, name) => edits.handleUpdateAnnotation(id, { name }),
        onReorder: edits.handleReorderLayers
      }
    ), /* @__PURE__ */ React.createElement("input", { ref: files.fileInputRef, type: "file", accept: "application/pdf", style: { display: "none" }, onChange: files.handleFileInputChange }), /* @__PURE__ */ React.createElement("input", { ref: edits.imageInputRef, type: "file", accept: "image/*,.svg,image/svg+xml", style: { display: "none" }, onChange: edits.handleImageFileChosen }), /* @__PURE__ */ React.createElement("input", { ref: files.insertPdfInputRef, type: "file", accept: "application/pdf", style: { display: "none" }, onChange: files.handleInsertPdfInputChange }), /* @__PURE__ */ React.createElement("input", { ref: project.projectInputRef, type: "file", accept: ".znow,.json,application/json,application/octet-stream", style: { display: "none" }, onChange: project.handleProjectInputChange }), /* @__PURE__ */ React.createElement(
      InsertPdfDialog,
      {
        file: files.pendingInsertFile,
        pageCount: pages.length,
        afterPage: files.insertAfterPage,
        onChangeAfterPage: files.setInsertAfterPage,
        onConfirm: files.handleConfirmInsertPdf,
        onCancel: () => files.setPendingInsertFile(null)
      }
    ), /* @__PURE__ */ React.createElement(
      NewDocumentDialog,
      {
        open: dialogs.newDocOpen,
        onCreate: files.handleCreateBlankDocument,
        onOpenPdf: dialogs.newDocFromProject ? files.handleNewDocumentOpenPdf : void 0,
        onCancel: () => dialogs.setNewDocOpen(false)
      }
    ), /* @__PURE__ */ React.createElement(
      WelcomeDialog,
      {
        open: project.startupChecked && pages.length === 0 && !welcomeDismissed && !dialogs.newDocOpen && !status.loading,
        onNewDocument: () => dialogs.openNewDocDialog(false),
        onOpenProject: dialogs.handleLoadProjectClick,
        onOpenPdf: files.handleLoadClick,
        onClose: () => setWelcomeDismissed(true)
      }
    ), /* @__PURE__ */ React.createElement(ShortcutsDialog, { open: dialogs.shortcutsOpen, onClose: () => dialogs.setShortcutsOpen(false) }), /* @__PURE__ */ React.createElement(
      ConfirmDialog,
      {
        step: dialogs.confirmAction ? dialogs.confirmStep : 0,
        onProceed: dialogs.handleConfirmProceed,
        onYes: dialogs.handleConfirmYes,
        onCancel: dialogs.handleConfirmCancel
      }
    ), /* @__PURE__ */ React.createElement(LiveFilterDefs, { pageFilter }));
  }

  // shared/js/numberFields.js
  var HOLD_MS = 450;
  var REPEAT_MS = 80;
  var isNumberBox = (el) => el instanceof HTMLInputElement && el.type === "number";
  var allowsEmpty = (el) => el.hasAttribute("data-allow-empty");
  var writeValue = (el, text) => Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, text);
  var held = /* @__PURE__ */ new WeakMap();
  function holdEmpty(el) {
    if (held.has(el)) return;
    const own = Object.getOwnPropertyDescriptor(el, "value");
    held.set(el, own || null);
    if (!own || !own.get || !own.configurable) return;
    Object.defineProperty(el, "value", {
      configurable: true,
      enumerable: own.enumerable,
      get() {
        return own.get.call(this);
      },
      set() {
      }
    });
  }
  function releaseEmpty(el) {
    if (!held.has(el)) return;
    const own = held.get(el);
    held.delete(el);
    if (own) Object.defineProperty(el, "value", own);
    else delete el.value;
  }
  function installNumberFields() {
    const lastGood = /* @__PURE__ */ new WeakMap();
    document.addEventListener("focusin", (e) => {
      if (isNumberBox(e.target) && e.target.value !== "") lastGood.set(e.target, e.target.value);
    }, true);
    document.addEventListener("input", (e) => {
      const el = e.target;
      if (!isNumberBox(el)) return;
      if (el.value !== "") {
        releaseEmpty(el);
        lastGood.set(el, el.value);
        return;
      }
      if (allowsEmpty(el) || document.activeElement !== el) return;
      holdEmpty(el);
      e.stopImmediatePropagation();
    }, true);
    const restoreIfEmpty = (el) => {
      if (el.value !== "" || allowsEmpty(el) || !lastGood.has(el)) {
        releaseEmpty(el);
        return false;
      }
      releaseEmpty(el);
      writeValue(el, lastGood.get(el));
      return true;
    };
    document.addEventListener("change", (e) => {
      if (isNumberBox(e.target) && restoreIfEmpty(e.target)) e.stopImmediatePropagation();
    }, true);
    document.addEventListener("focusout", (e) => {
      if (isNumberBox(e.target)) restoreIfEmpty(e.target);
    }, true);
    function stepBy(el, dir) {
      const before = el.value;
      try {
        if (dir > 0) el.stepUp();
        else el.stepDown();
      } catch (err) {
        return false;
      }
      if (el.value === before) return false;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }
    let holdTimer = 0;
    let repeatTimer = 0;
    const stop2 = () => {
      clearTimeout(holdTimer);
      clearInterval(repeatTimer);
      holdTimer = repeatTimer = 0;
    };
    const buttonOf = (e) => e.target instanceof Element ? e.target.closest(".zn-num-btn") : null;
    const boxOf = (button) => button.parentElement ? button.parentElement.querySelector('input[type="number"]') : null;
    document.addEventListener("pointerdown", (e) => {
      const button = buttonOf(e);
      if (!button || button.disabled || e.pointerType === "mouse" && e.button !== 0) return;
      const el = boxOf(button);
      if (!el || el.disabled || el.readOnly) return;
      e.preventDefault();
      const dir = Number(button.dataset.znStep) || 0;
      stop2();
      stepBy(el, dir);
      holdTimer = setTimeout(() => {
        repeatTimer = setInterval(() => {
          if (!stepBy(el, dir)) stop2();
        }, REPEAT_MS);
      }, HOLD_MS);
      const release = () => {
        stop2();
        if (document.activeElement !== el) el.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
      };
      window.addEventListener("pointerup", release, { once: true });
      window.addEventListener("pointercancel", release, { once: true });
    }, true);
    for (const type of ["mousedown", "mouseup", "click"]) {
      document.addEventListener(type, (e) => {
        if (buttonOf(e)) {
          e.preventDefault();
          e.stopPropagation();
        }
      }, true);
    }
  }

  // apps/ZEditor/src/main.jsx
  installTouchInput();
  installNumberFields();
  installZeditorDisplaySettings();
  ReactDOM.createRoot(document.getElementById("root")).render(/* @__PURE__ */ React.createElement(App, null));
})();
