var commonjsGlobal = typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

function unwrapExports (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x.default : x;
}

function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

function URLjsImpl() {

  var relative = Object.create(null);
  relative['ftp'] = 21;
  relative['file'] = 0;
  relative['gopher'] = 70;
  relative['http'] = 80;
  relative['https'] = 443;
  relative['ws'] = 80;
  relative['wss'] = 443;

  var relativePathDotMapping = Object.create(null);
  relativePathDotMapping['%2e'] = '.';
  relativePathDotMapping['.%2e'] = '..';
  relativePathDotMapping['%2e.'] = '..';
  relativePathDotMapping['%2e%2e'] = '..';

  function isRelativeScheme(scheme) {
    return relative[scheme] !== undefined;
  }

  function invalid() {
    clear.call(this);
    this._isInvalid = true;
  }

  function IDNAToASCII(h) {
    if ('' == h) {
      invalid.call(this);
    }
    // XXX
    return h.toLowerCase()
  }

  function percentEscape(c) {
    var unicode = c.charCodeAt(0);
    if (unicode > 0x20 &&
       unicode < 0x7F &&
       // " # < > ? `
       [0x22, 0x23, 0x3C, 0x3E, 0x3F, 0x60].indexOf(unicode) == -1
      ) {
      return c;
    }
    return encodeURIComponent(c);
  }

  function percentEscapeQuery(c) {
    // XXX This actually needs to encode c using encoding and then
    // convert the bytes one-by-one.

    var unicode = c.charCodeAt(0);
    if (unicode > 0x20 &&
       unicode < 0x7F &&
       // " # < > ` (do not escape '?')
       [0x22, 0x23, 0x3C, 0x3E, 0x60].indexOf(unicode) == -1
      ) {
      return c;
    }
    return encodeURIComponent(c);
  }

  var EOF = undefined,
      ALPHA = /[a-zA-Z]/,
      ALPHANUMERIC = /[a-zA-Z0-9\+\-\.]/;

  function parse(input, stateOverride, base) {

    var state = stateOverride || 'scheme start',
        cursor = 0,
        buffer = '',
        seenAt = false,
        seenBracket = false;

    loop: while ((input[cursor - 1] != EOF || cursor == 0) && !this._isInvalid) {
      var c = input[cursor];
      switch (state) {
        case 'scheme start':
          if (c && ALPHA.test(c)) {
            buffer += c.toLowerCase(); // ASCII-safe
            state = 'scheme';
          } else if (!stateOverride) {
            buffer = '';
            state = 'no scheme';
            continue;
          } else {
            break loop;
          }
          break;

        case 'scheme':
          if (c && ALPHANUMERIC.test(c)) {
            buffer += c.toLowerCase(); // ASCII-safe
          } else if (':' == c) {
            this._scheme = buffer;
            buffer = '';
            if (stateOverride) {
              break loop;
            }
            if (isRelativeScheme(this._scheme)) {
              this._isRelative = true;
            }
            if ('file' == this._scheme) {
              state = 'relative';
            } else if (this._isRelative && base && base._scheme == this._scheme) {
              state = 'relative or authority';
            } else if (this._isRelative) {
              state = 'authority first slash';
            } else {
              state = 'scheme data';
            }
          } else if (!stateOverride) {
            buffer = '';
            cursor = 0;
            state = 'no scheme';
            continue;
          } else if (EOF == c) {
            break loop;
          } else {
            break loop;
          }
          break;

        case 'scheme data':
          if ('?' == c) {
            this._query = '?';
            state = 'query';
          } else if ('#' == c) {
            this._fragment = '#';
            state = 'fragment';
          } else {
            // XXX error handling
            if (EOF != c && '\t' != c && '\n' != c && '\r' != c) {
              this._schemeData += percentEscape(c);
            }
          }
          break;

        case 'no scheme':
          if (!base || !(isRelativeScheme(base._scheme))) {
            invalid.call(this);
          } else {
            state = 'relative';
            continue;
          }
          break;

        case 'relative or authority':
          if ('/' == c && '/' == input[cursor+1]) {
            state = 'authority ignore slashes';
          } else {
            state = 'relative';
            continue
          }
          break;

        case 'relative':
          this._isRelative = true;
          if ('file' != this._scheme)
            this._scheme = base._scheme;
          if (EOF == c) {
            this._host = base._host;
            this._port = base._port;
            this._path = base._path.slice();
            this._query = base._query;
            this._username = base._username;
            this._password = base._password;
            break loop;
          } else if ('/' == c || '\\' == c) {
            state = 'relative slash';
          } else if ('?' == c) {
            this._host = base._host;
            this._port = base._port;
            this._path = base._path.slice();
            this._query = '?';
            this._username = base._username;
            this._password = base._password;
            state = 'query';
          } else if ('#' == c) {
            this._host = base._host;
            this._port = base._port;
            this._path = base._path.slice();
            this._query = base._query;
            this._fragment = '#';
            this._username = base._username;
            this._password = base._password;
            state = 'fragment';
          } else {
            var nextC = input[cursor+1];
            var nextNextC = input[cursor+2];
            if (
              'file' != this._scheme || !ALPHA.test(c) ||
              (nextC != ':' && nextC != '|') ||
              (EOF != nextNextC && '/' != nextNextC && '\\' != nextNextC && '?' != nextNextC && '#' != nextNextC)) {
              this._host = base._host;
              this._port = base._port;
              this._username = base._username;
              this._password = base._password;
              this._path = base._path.slice();
              this._path.pop();
            }
            state = 'relative path';
            continue;
          }
          break;

        case 'relative slash':
          if ('/' == c || '\\' == c) {
            if ('file' == this._scheme) {
              state = 'file host';
            } else {
              state = 'authority ignore slashes';
            }
          } else {
            if ('file' != this._scheme) {
              this._host = base._host;
              this._port = base._port;
              this._username = base._username;
              this._password = base._password;
            }
            state = 'relative path';
            continue;
          }
          break;

        case 'authority first slash':
          if ('/' == c) {
            state = 'authority second slash';
          } else {
            state = 'authority ignore slashes';
            continue;
          }
          break;

        case 'authority second slash':
          state = 'authority ignore slashes';
          if ('/' != c) {
            continue;
          }
          break;

        case 'authority ignore slashes':
          if ('/' != c && '\\' != c) {
            state = 'authority';
            continue;
          }
          break;

        case 'authority':
          if ('@' == c) {
            if (seenAt) {
              buffer += '%40';
            }
            seenAt = true;
            for (var i = 0; i < buffer.length; i++) {
              var cp = buffer[i];
              if ('\t' == cp || '\n' == cp || '\r' == cp) {
                continue;
              }
              // XXX check URL code points
              if (':' == cp && null === this._password) {
                this._password = '';
                continue;
              }
              var tempC = percentEscape(cp);
              (null !== this._password) ? this._password += tempC : this._username += tempC;
            }
            buffer = '';
          } else if (EOF == c || '/' == c || '\\' == c || '?' == c || '#' == c) {
            cursor -= buffer.length;
            buffer = '';
            state = 'host';
            continue;
          } else {
            buffer += c;
          }
          break;

        case 'file host':
          if (EOF == c || '/' == c || '\\' == c || '?' == c || '#' == c) {
            if (buffer.length == 2 && ALPHA.test(buffer[0]) && (buffer[1] == ':' || buffer[1] == '|')) {
              state = 'relative path';
            } else if (buffer.length == 0) {
              state = 'relative path start';
            } else {
              this._host = IDNAToASCII.call(this, buffer);
              buffer = '';
              state = 'relative path start';
            }
            continue;
          } else if ('\t' == c || '\n' == c || '\r' == c) ; else {
            buffer += c;
          }
          break;

        case 'host':
        case 'hostname':
          if (':' == c && !seenBracket) {
            // XXX host parsing
            this._host = IDNAToASCII.call(this, buffer);
            buffer = '';
            state = 'port';
            if ('hostname' == stateOverride) {
              break loop;
            }
          } else if (EOF == c || '/' == c || '\\' == c || '?' == c || '#' == c) {
            this._host = IDNAToASCII.call(this, buffer);
            buffer = '';
            state = 'relative path start';
            if (stateOverride) {
              break loop;
            }
            continue;
          } else if ('\t' != c && '\n' != c && '\r' != c) {
            if ('[' == c) {
              seenBracket = true;
            } else if (']' == c) {
              seenBracket = false;
            }
            buffer += c;
          }
          break;

        case 'port':
          if (/[0-9]/.test(c)) {
            buffer += c;
          } else if (EOF == c || '/' == c || '\\' == c || '?' == c || '#' == c || stateOverride) {
            if ('' != buffer) {
              var temp = parseInt(buffer, 10);
              if (temp != relative[this._scheme]) {
                this._port = temp + '';
              }
              buffer = '';
            }
            if (stateOverride) {
              break loop;
            }
            state = 'relative path start';
            continue;
          } else if ('\t' == c || '\n' == c || '\r' == c) ; else {
            invalid.call(this);
          }
          break;

        case 'relative path start':
          state = 'relative path';
          if ('/' != c && '\\' != c) {
            continue;
          }
          break;

        case 'relative path':
          if (EOF == c || '/' == c || '\\' == c || (!stateOverride && ('?' == c || '#' == c))) {
            var tmp;
            if (tmp = relativePathDotMapping[buffer.toLowerCase()]) {
              buffer = tmp;
            }
            if ('..' == buffer) {
              this._path.pop();
              if ('/' != c && '\\' != c) {
                this._path.push('');
              }
            } else if ('.' == buffer && '/' != c && '\\' != c) {
              this._path.push('');
            } else if ('.' != buffer) {
              if ('file' == this._scheme && this._path.length == 0 && buffer.length == 2 && ALPHA.test(buffer[0]) && buffer[1] == '|') {
                buffer = buffer[0] + ':';
              }
              this._path.push(buffer);
            }
            buffer = '';
            if ('?' == c) {
              this._query = '?';
              state = 'query';
            } else if ('#' == c) {
              this._fragment = '#';
              state = 'fragment';
            }
          } else if ('\t' != c && '\n' != c && '\r' != c) {
            buffer += percentEscape(c);
          }
          break;

        case 'query':
          if (!stateOverride && '#' == c) {
            this._fragment = '#';
            state = 'fragment';
          } else if (EOF != c && '\t' != c && '\n' != c && '\r' != c) {
            this._query += percentEscapeQuery(c);
          }
          break;

        case 'fragment':
          if (EOF != c && '\t' != c && '\n' != c && '\r' != c) {
            this._fragment += c;
          }
          break;
      }

      cursor++;
    }
  }

  function clear() {
    this._scheme = '';
    this._schemeData = '';
    this._username = '';
    this._password = null;
    this._host = '';
    this._port = '';
    this._path = [];
    this._query = '';
    this._fragment = '';
    this._isInvalid = false;
    this._isRelative = false;
  }

  // Does not process domain names or IP addresses.
  // Does not handle encoding for the query parameter.
  function jURL(url, base /* , encoding */) {
    if (base !== undefined && !(base instanceof jURL))
      base = new jURL(String(base));

    url = String(url);

    this._url = url;
    clear.call(this);

    var input = url.replace(/^[ \t\r\n\f]+|[ \t\r\n\f]+$/g, '');
    // encoding = encoding || 'utf-8'

    parse.call(this, input, null, base);
  }

  jURL.prototype = {
    toString: function() {
      return this.href;
    },
    get href() {
      if (this._isInvalid)
        return this._url;

      var authority = '';
      if ('' != this._username || null != this._password) {
        authority = this._username +
            (null != this._password ? ':' + this._password : '') + '@';
      }

      return this.protocol +
          (this._isRelative ? '//' + authority + this.host : '') +
          this.pathname + this._query + this._fragment;
    },
    set href(href) {
      clear.call(this);
      parse.call(this, href);
    },

    get protocol() {
      return this._scheme + ':';
    },
    set protocol(protocol) {
      if (this._isInvalid)
        return;
      parse.call(this, protocol + ':', 'scheme start');
    },

    get host() {
      return this._isInvalid ? '' : this._port ?
          this._host + ':' + this._port : this._host;
    },
    set host(host) {
      if (this._isInvalid || !this._isRelative)
        return;
      parse.call(this, host, 'host');
    },

    get hostname() {
      return this._host;
    },
    set hostname(hostname) {
      if (this._isInvalid || !this._isRelative)
        return;
      parse.call(this, hostname, 'hostname');
    },

    get port() {
      return this._port;
    },
    set port(port) {
      if (this._isInvalid || !this._isRelative)
        return;
      parse.call(this, port, 'port');
    },

    get pathname() {
      return this._isInvalid ? '' : this._isRelative ?
          '/' + this._path.join('/') : this._schemeData;
    },
    set pathname(pathname) {
      if (this._isInvalid || !this._isRelative)
        return;
      this._path = [];
      parse.call(this, pathname, 'relative path start');
    },

    get search() {
      return this._isInvalid || !this._query || '?' == this._query ?
          '' : this._query;
    },
    set search(search) {
      if (this._isInvalid || !this._isRelative)
        return;
      this._query = '?';
      if ('?' == search[0])
        search = search.slice(1);
      parse.call(this, search, 'query');
    },

    get hash() {
      return this._isInvalid || !this._fragment || '#' == this._fragment ?
          '' : this._fragment;
    },
    set hash(hash) {
      if (this._isInvalid)
        return;
      this._fragment = '#';
      if ('#' == hash[0])
        hash = hash.slice(1);
      parse.call(this, hash, 'fragment');
    },

    get origin() {
      var host;
      if (this._isInvalid || !this._scheme) {
        return '';
      }
      // javascript: Gecko returns String(""), WebKit/Blink String("null")
      // Gecko throws error for "data://"
      // data: Gecko returns "", Blink returns "data://", WebKit returns "null"
      // Gecko returns String("") for file: mailto:
      // WebKit/Blink returns String("SCHEME://") for file: mailto:
      switch (this._scheme) {
        case 'data':
        case 'file':
        case 'javascript':
        case 'mailto':
          return 'null';
      }
      host = this.host;
      if (!host) {
        return '';
      }
      return this._scheme + '://' + host;
    }
  };

  // Copy over the static methods
  var OriginalURL = self.URL;
  if (OriginalURL) {
    jURL.createObjectURL = function(blob) {
      // IE extension allows a second optional options argument.
      // http://msdn.microsoft.com/en-us/library/ie/hh772302(v=vs.85).aspx
      return OriginalURL.createObjectURL.apply(OriginalURL, arguments);
    };
    jURL.revokeObjectURL = function(url) {
      OriginalURL.revokeObjectURL(url);
    };
  }

  return jURL;
}

const URL = URLjsImpl();

/**
 * Helper to feature detect a working native URL implementation
 * @return {bool}
 */
function hasNativeURL() {
  var hasWorkingUrl = false;

  try {
    var u = new self.URL('b', 'http://a');
    u.pathname = 'c%20d';
    hasWorkingUrl = u.href === 'http://a/c%20d';
  } catch(e) {}

  return hasWorkingUrl;
}

const URL$1 = hasNativeURL() ? self.URL : URL;

var module$1 = /*#__PURE__*/Object.freeze({
	URL: URL$1
});

var PropertyDefinition = /** @class */ (function () {
    function PropertyDefinition() {
        this.array = false;
        this.set = false;
        this.readonly = false;
        this.writeonly = false;
    }
    return PropertyDefinition;
}());

var ObjectDefinition = /** @class */ (function () {
    function ObjectDefinition() {
        this.ctr = function () { };
        this.beforeDeserialized = function () { };
        this.onDeserialized = function () { };
        this.properties = new Map();
    }
    ObjectDefinition.prototype.getProperty = function (key) {
        var property = this.properties.get(key);
        if (!property) {
            property = new PropertyDefinition();
            this.properties.set(key, property);
        }
        return property;
    };
    return ObjectDefinition;
}());
var objectDefinitions = new Map();
function getDefinition(target) {
    var definition = objectDefinitions.get(target);
    if (!definition) {
        definition = new ObjectDefinition();
        objectDefinitions.set(target, definition);
    }
    return definition;
}
function getInheritanceChain(type) {
    if (!type) {
        return [];
    }
    var parent = Object.getPrototypeOf(type);
    return [type.constructor].concat(getInheritanceChain(parent));
}
function getChildClassDefinitions(parentType) {
    var childDefs = [];
    objectDefinitions.forEach(function (def, type) {
        var superClass = Object.getPrototypeOf(type.prototype).constructor;
        if (superClass === parentType) {
            childDefs.push([type, def]);
        }
    });
    return childDefs;
}
function getTypedInheritanceChain(type, object) {
    var parentDef = objectDefinitions.get(type);
    var childDefs = [];
    if (object && parentDef && parentDef.discriminatorProperty) {
        childDefs = childDefs.concat(getChildClassDefinitions(type));
    }
    var actualType;
    while (childDefs.length !== 0 && !actualType) {
        var _a = childDefs.shift(), t = _a[0], def = _a[1]; // We are checking the length in the loop so an assertion here is fine.
        if (def.hasOwnProperty("discriminatorValue")) {
            if (object && parentDef && def.discriminatorValue === object[parentDef.discriminatorProperty]) {
                if (def.hasOwnProperty("discriminatorProperty")) {
                    return getTypedInheritanceChain(t, object);
                }
                actualType = t;
            }
        }
        else {
            childDefs = childDefs.concat(getChildClassDefinitions(t));
        }
    }
    if (!actualType) {
        actualType = type;
    }
    var inheritanceChain = new Set(getInheritanceChain(Object.create(actualType.prototype)));
    return Array.from(inheritanceChain).filter(function (t) { return objectDefinitions.has(t); });
}

// tslint:disable:ext-variable-name only-arrow-functions
function JsonObject() {
    return function (constructor) {
        getDefinition(constructor);
    };
}

/*! *****************************************************************************
Copyright (C) Microsoft. All rights reserved.
Licensed under the Apache License, Version 2.0 (the "License"); you may not use
this file except in compliance with the License. You may obtain a copy of the
License at http://www.apache.org/licenses/LICENSE-2.0

THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
MERCHANTABLITY OR NON-INFRINGEMENT.

See the Apache Version 2.0 License for specific language governing permissions
and limitations under the License.
***************************************************************************** */
var Reflect$1;
(function (Reflect) {
    // Metadata Proposal
    // https://rbuckton.github.io/reflect-metadata/
    (function (factory) {
        var root = typeof commonjsGlobal === "object" ? commonjsGlobal :
            typeof self === "object" ? self :
                typeof this === "object" ? this :
                    Function("return this;")();
        var exporter = makeExporter(Reflect);
        if (typeof root.Reflect === "undefined") {
            root.Reflect = Reflect;
        }
        else {
            exporter = makeExporter(root.Reflect, exporter);
        }
        factory(exporter);
        function makeExporter(target, previous) {
            return function (key, value) {
                if (typeof target[key] !== "function") {
                    Object.defineProperty(target, key, { configurable: true, writable: true, value: value });
                }
                if (previous)
                    previous(key, value);
            };
        }
    })(function (exporter) {
        var hasOwn = Object.prototype.hasOwnProperty;
        // feature test for Symbol support
        var supportsSymbol = typeof Symbol === "function";
        var toPrimitiveSymbol = supportsSymbol && typeof Symbol.toPrimitive !== "undefined" ? Symbol.toPrimitive : "@@toPrimitive";
        var iteratorSymbol = supportsSymbol && typeof Symbol.iterator !== "undefined" ? Symbol.iterator : "@@iterator";
        var supportsCreate = typeof Object.create === "function"; // feature test for Object.create support
        var supportsProto = { __proto__: [] } instanceof Array; // feature test for __proto__ support
        var downLevel = !supportsCreate && !supportsProto;
        var HashMap = {
            // create an object in dictionary mode (a.k.a. "slow" mode in v8)
            create: supportsCreate
                ? function () { return MakeDictionary(Object.create(null)); }
                : supportsProto
                    ? function () { return MakeDictionary({ __proto__: null }); }
                    : function () { return MakeDictionary({}); },
            has: downLevel
                ? function (map, key) { return hasOwn.call(map, key); }
                : function (map, key) { return key in map; },
            get: downLevel
                ? function (map, key) { return hasOwn.call(map, key) ? map[key] : undefined; }
                : function (map, key) { return map[key]; },
        };
        // Load global or shim versions of Map, Set, and WeakMap
        var functionPrototype = Object.getPrototypeOf(Function);
        var usePolyfill = typeof process === "object" && process.env && process.env["REFLECT_METADATA_USE_MAP_POLYFILL"] === "true";
        var _Map = !usePolyfill && typeof Map === "function" && typeof Map.prototype.entries === "function" ? Map : CreateMapPolyfill();
        var _Set = !usePolyfill && typeof Set === "function" && typeof Set.prototype.entries === "function" ? Set : CreateSetPolyfill();
        var _WeakMap = !usePolyfill && typeof WeakMap === "function" ? WeakMap : CreateWeakMapPolyfill();
        // [[Metadata]] internal slot
        // https://rbuckton.github.io/reflect-metadata/#ordinary-object-internal-methods-and-internal-slots
        var Metadata = new _WeakMap();
        /**
         * Applies a set of decorators to a property of a target object.
         * @param decorators An array of decorators.
         * @param target The target object.
         * @param propertyKey (Optional) The property key to decorate.
         * @param attributes (Optional) The property descriptor for the target key.
         * @remarks Decorators are applied in reverse order.
         * @example
         *
         *     class Example {
         *         // property declarations are not part of ES6, though they are valid in TypeScript:
         *         // static staticProperty;
         *         // property;
         *
         *         constructor(p) { }
         *         static staticMethod(p) { }
         *         method(p) { }
         *     }
         *
         *     // constructor
         *     Example = Reflect.decorate(decoratorsArray, Example);
         *
         *     // property (on constructor)
         *     Reflect.decorate(decoratorsArray, Example, "staticProperty");
         *
         *     // property (on prototype)
         *     Reflect.decorate(decoratorsArray, Example.prototype, "property");
         *
         *     // method (on constructor)
         *     Object.defineProperty(Example, "staticMethod",
         *         Reflect.decorate(decoratorsArray, Example, "staticMethod",
         *             Object.getOwnPropertyDescriptor(Example, "staticMethod")));
         *
         *     // method (on prototype)
         *     Object.defineProperty(Example.prototype, "method",
         *         Reflect.decorate(decoratorsArray, Example.prototype, "method",
         *             Object.getOwnPropertyDescriptor(Example.prototype, "method")));
         *
         */
        function decorate(decorators, target, propertyKey, attributes) {
            if (!IsUndefined(propertyKey)) {
                if (!IsArray(decorators))
                    throw new TypeError();
                if (!IsObject(target))
                    throw new TypeError();
                if (!IsObject(attributes) && !IsUndefined(attributes) && !IsNull(attributes))
                    throw new TypeError();
                if (IsNull(attributes))
                    attributes = undefined;
                propertyKey = ToPropertyKey(propertyKey);
                return DecorateProperty(decorators, target, propertyKey, attributes);
            }
            else {
                if (!IsArray(decorators))
                    throw new TypeError();
                if (!IsConstructor(target))
                    throw new TypeError();
                return DecorateConstructor(decorators, target);
            }
        }
        exporter("decorate", decorate);
        // 4.1.2 Reflect.metadata(metadataKey, metadataValue)
        // https://rbuckton.github.io/reflect-metadata/#reflect.metadata
        /**
         * A default metadata decorator factory that can be used on a class, class member, or parameter.
         * @param metadataKey The key for the metadata entry.
         * @param metadataValue The value for the metadata entry.
         * @returns A decorator function.
         * @remarks
         * If `metadataKey` is already defined for the target and target key, the
         * metadataValue for that key will be overwritten.
         * @example
         *
         *     // constructor
         *     @Reflect.metadata(key, value)
         *     class Example {
         *     }
         *
         *     // property (on constructor, TypeScript only)
         *     class Example {
         *         @Reflect.metadata(key, value)
         *         static staticProperty;
         *     }
         *
         *     // property (on prototype, TypeScript only)
         *     class Example {
         *         @Reflect.metadata(key, value)
         *         property;
         *     }
         *
         *     // method (on constructor)
         *     class Example {
         *         @Reflect.metadata(key, value)
         *         static staticMethod() { }
         *     }
         *
         *     // method (on prototype)
         *     class Example {
         *         @Reflect.metadata(key, value)
         *         method() { }
         *     }
         *
         */
        function metadata(metadataKey, metadataValue) {
            function decorator(target, propertyKey) {
                if (!IsObject(target))
                    throw new TypeError();
                if (!IsUndefined(propertyKey) && !IsPropertyKey(propertyKey))
                    throw new TypeError();
                OrdinaryDefineOwnMetadata(metadataKey, metadataValue, target, propertyKey);
            }
            return decorator;
        }
        exporter("metadata", metadata);
        /**
         * Define a unique metadata entry on the target.
         * @param metadataKey A key used to store and retrieve metadata.
         * @param metadataValue A value that contains attached metadata.
         * @param target The target object on which to define metadata.
         * @param propertyKey (Optional) The property key for the target.
         * @example
         *
         *     class Example {
         *         // property declarations are not part of ES6, though they are valid in TypeScript:
         *         // static staticProperty;
         *         // property;
         *
         *         constructor(p) { }
         *         static staticMethod(p) { }
         *         method(p) { }
         *     }
         *
         *     // constructor
         *     Reflect.defineMetadata("custom:annotation", options, Example);
         *
         *     // property (on constructor)
         *     Reflect.defineMetadata("custom:annotation", options, Example, "staticProperty");
         *
         *     // property (on prototype)
         *     Reflect.defineMetadata("custom:annotation", options, Example.prototype, "property");
         *
         *     // method (on constructor)
         *     Reflect.defineMetadata("custom:annotation", options, Example, "staticMethod");
         *
         *     // method (on prototype)
         *     Reflect.defineMetadata("custom:annotation", options, Example.prototype, "method");
         *
         *     // decorator factory as metadata-producing annotation.
         *     function MyAnnotation(options): Decorator {
         *         return (target, key?) => Reflect.defineMetadata("custom:annotation", options, target, key);
         *     }
         *
         */
        function defineMetadata(metadataKey, metadataValue, target, propertyKey) {
            if (!IsObject(target))
                throw new TypeError();
            if (!IsUndefined(propertyKey))
                propertyKey = ToPropertyKey(propertyKey);
            return OrdinaryDefineOwnMetadata(metadataKey, metadataValue, target, propertyKey);
        }
        exporter("defineMetadata", defineMetadata);
        /**
         * Gets a value indicating whether the target object or its prototype chain has the provided metadata key defined.
         * @param metadataKey A key used to store and retrieve metadata.
         * @param target The target object on which the metadata is defined.
         * @param propertyKey (Optional) The property key for the target.
         * @returns `true` if the metadata key was defined on the target object or its prototype chain; otherwise, `false`.
         * @example
         *
         *     class Example {
         *         // property declarations are not part of ES6, though they are valid in TypeScript:
         *         // static staticProperty;
         *         // property;
         *
         *         constructor(p) { }
         *         static staticMethod(p) { }
         *         method(p) { }
         *     }
         *
         *     // constructor
         *     result = Reflect.hasMetadata("custom:annotation", Example);
         *
         *     // property (on constructor)
         *     result = Reflect.hasMetadata("custom:annotation", Example, "staticProperty");
         *
         *     // property (on prototype)
         *     result = Reflect.hasMetadata("custom:annotation", Example.prototype, "property");
         *
         *     // method (on constructor)
         *     result = Reflect.hasMetadata("custom:annotation", Example, "staticMethod");
         *
         *     // method (on prototype)
         *     result = Reflect.hasMetadata("custom:annotation", Example.prototype, "method");
         *
         */
        function hasMetadata(metadataKey, target, propertyKey) {
            if (!IsObject(target))
                throw new TypeError();
            if (!IsUndefined(propertyKey))
                propertyKey = ToPropertyKey(propertyKey);
            return OrdinaryHasMetadata(metadataKey, target, propertyKey);
        }
        exporter("hasMetadata", hasMetadata);
        /**
         * Gets a value indicating whether the target object has the provided metadata key defined.
         * @param metadataKey A key used to store and retrieve metadata.
         * @param target The target object on which the metadata is defined.
         * @param propertyKey (Optional) The property key for the target.
         * @returns `true` if the metadata key was defined on the target object; otherwise, `false`.
         * @example
         *
         *     class Example {
         *         // property declarations are not part of ES6, though they are valid in TypeScript:
         *         // static staticProperty;
         *         // property;
         *
         *         constructor(p) { }
         *         static staticMethod(p) { }
         *         method(p) { }
         *     }
         *
         *     // constructor
         *     result = Reflect.hasOwnMetadata("custom:annotation", Example);
         *
         *     // property (on constructor)
         *     result = Reflect.hasOwnMetadata("custom:annotation", Example, "staticProperty");
         *
         *     // property (on prototype)
         *     result = Reflect.hasOwnMetadata("custom:annotation", Example.prototype, "property");
         *
         *     // method (on constructor)
         *     result = Reflect.hasOwnMetadata("custom:annotation", Example, "staticMethod");
         *
         *     // method (on prototype)
         *     result = Reflect.hasOwnMetadata("custom:annotation", Example.prototype, "method");
         *
         */
        function hasOwnMetadata(metadataKey, target, propertyKey) {
            if (!IsObject(target))
                throw new TypeError();
            if (!IsUndefined(propertyKey))
                propertyKey = ToPropertyKey(propertyKey);
            return OrdinaryHasOwnMetadata(metadataKey, target, propertyKey);
        }
        exporter("hasOwnMetadata", hasOwnMetadata);
        /**
         * Gets the metadata value for the provided metadata key on the target object or its prototype chain.
         * @param metadataKey A key used to store and retrieve metadata.
         * @param target The target object on which the metadata is defined.
         * @param propertyKey (Optional) The property key for the target.
         * @returns The metadata value for the metadata key if found; otherwise, `undefined`.
         * @example
         *
         *     class Example {
         *         // property declarations are not part of ES6, though they are valid in TypeScript:
         *         // static staticProperty;
         *         // property;
         *
         *         constructor(p) { }
         *         static staticMethod(p) { }
         *         method(p) { }
         *     }
         *
         *     // constructor
         *     result = Reflect.getMetadata("custom:annotation", Example);
         *
         *     // property (on constructor)
         *     result = Reflect.getMetadata("custom:annotation", Example, "staticProperty");
         *
         *     // property (on prototype)
         *     result = Reflect.getMetadata("custom:annotation", Example.prototype, "property");
         *
         *     // method (on constructor)
         *     result = Reflect.getMetadata("custom:annotation", Example, "staticMethod");
         *
         *     // method (on prototype)
         *     result = Reflect.getMetadata("custom:annotation", Example.prototype, "method");
         *
         */
        function getMetadata(metadataKey, target, propertyKey) {
            if (!IsObject(target))
                throw new TypeError();
            if (!IsUndefined(propertyKey))
                propertyKey = ToPropertyKey(propertyKey);
            return OrdinaryGetMetadata(metadataKey, target, propertyKey);
        }
        exporter("getMetadata", getMetadata);
        /**
         * Gets the metadata value for the provided metadata key on the target object.
         * @param metadataKey A key used to store and retrieve metadata.
         * @param target The target object on which the metadata is defined.
         * @param propertyKey (Optional) The property key for the target.
         * @returns The metadata value for the metadata key if found; otherwise, `undefined`.
         * @example
         *
         *     class Example {
         *         // property declarations are not part of ES6, though they are valid in TypeScript:
         *         // static staticProperty;
         *         // property;
         *
         *         constructor(p) { }
         *         static staticMethod(p) { }
         *         method(p) { }
         *     }
         *
         *     // constructor
         *     result = Reflect.getOwnMetadata("custom:annotation", Example);
         *
         *     // property (on constructor)
         *     result = Reflect.getOwnMetadata("custom:annotation", Example, "staticProperty");
         *
         *     // property (on prototype)
         *     result = Reflect.getOwnMetadata("custom:annotation", Example.prototype, "property");
         *
         *     // method (on constructor)
         *     result = Reflect.getOwnMetadata("custom:annotation", Example, "staticMethod");
         *
         *     // method (on prototype)
         *     result = Reflect.getOwnMetadata("custom:annotation", Example.prototype, "method");
         *
         */
        function getOwnMetadata(metadataKey, target, propertyKey) {
            if (!IsObject(target))
                throw new TypeError();
            if (!IsUndefined(propertyKey))
                propertyKey = ToPropertyKey(propertyKey);
            return OrdinaryGetOwnMetadata(metadataKey, target, propertyKey);
        }
        exporter("getOwnMetadata", getOwnMetadata);
        /**
         * Gets the metadata keys defined on the target object or its prototype chain.
         * @param target The target object on which the metadata is defined.
         * @param propertyKey (Optional) The property key for the target.
         * @returns An array of unique metadata keys.
         * @example
         *
         *     class Example {
         *         // property declarations are not part of ES6, though they are valid in TypeScript:
         *         // static staticProperty;
         *         // property;
         *
         *         constructor(p) { }
         *         static staticMethod(p) { }
         *         method(p) { }
         *     }
         *
         *     // constructor
         *     result = Reflect.getMetadataKeys(Example);
         *
         *     // property (on constructor)
         *     result = Reflect.getMetadataKeys(Example, "staticProperty");
         *
         *     // property (on prototype)
         *     result = Reflect.getMetadataKeys(Example.prototype, "property");
         *
         *     // method (on constructor)
         *     result = Reflect.getMetadataKeys(Example, "staticMethod");
         *
         *     // method (on prototype)
         *     result = Reflect.getMetadataKeys(Example.prototype, "method");
         *
         */
        function getMetadataKeys(target, propertyKey) {
            if (!IsObject(target))
                throw new TypeError();
            if (!IsUndefined(propertyKey))
                propertyKey = ToPropertyKey(propertyKey);
            return OrdinaryMetadataKeys(target, propertyKey);
        }
        exporter("getMetadataKeys", getMetadataKeys);
        /**
         * Gets the unique metadata keys defined on the target object.
         * @param target The target object on which the metadata is defined.
         * @param propertyKey (Optional) The property key for the target.
         * @returns An array of unique metadata keys.
         * @example
         *
         *     class Example {
         *         // property declarations are not part of ES6, though they are valid in TypeScript:
         *         // static staticProperty;
         *         // property;
         *
         *         constructor(p) { }
         *         static staticMethod(p) { }
         *         method(p) { }
         *     }
         *
         *     // constructor
         *     result = Reflect.getOwnMetadataKeys(Example);
         *
         *     // property (on constructor)
         *     result = Reflect.getOwnMetadataKeys(Example, "staticProperty");
         *
         *     // property (on prototype)
         *     result = Reflect.getOwnMetadataKeys(Example.prototype, "property");
         *
         *     // method (on constructor)
         *     result = Reflect.getOwnMetadataKeys(Example, "staticMethod");
         *
         *     // method (on prototype)
         *     result = Reflect.getOwnMetadataKeys(Example.prototype, "method");
         *
         */
        function getOwnMetadataKeys(target, propertyKey) {
            if (!IsObject(target))
                throw new TypeError();
            if (!IsUndefined(propertyKey))
                propertyKey = ToPropertyKey(propertyKey);
            return OrdinaryOwnMetadataKeys(target, propertyKey);
        }
        exporter("getOwnMetadataKeys", getOwnMetadataKeys);
        /**
         * Deletes the metadata entry from the target object with the provided key.
         * @param metadataKey A key used to store and retrieve metadata.
         * @param target The target object on which the metadata is defined.
         * @param propertyKey (Optional) The property key for the target.
         * @returns `true` if the metadata entry was found and deleted; otherwise, false.
         * @example
         *
         *     class Example {
         *         // property declarations are not part of ES6, though they are valid in TypeScript:
         *         // static staticProperty;
         *         // property;
         *
         *         constructor(p) { }
         *         static staticMethod(p) { }
         *         method(p) { }
         *     }
         *
         *     // constructor
         *     result = Reflect.deleteMetadata("custom:annotation", Example);
         *
         *     // property (on constructor)
         *     result = Reflect.deleteMetadata("custom:annotation", Example, "staticProperty");
         *
         *     // property (on prototype)
         *     result = Reflect.deleteMetadata("custom:annotation", Example.prototype, "property");
         *
         *     // method (on constructor)
         *     result = Reflect.deleteMetadata("custom:annotation", Example, "staticMethod");
         *
         *     // method (on prototype)
         *     result = Reflect.deleteMetadata("custom:annotation", Example.prototype, "method");
         *
         */
        function deleteMetadata(metadataKey, target, propertyKey) {
            if (!IsObject(target))
                throw new TypeError();
            if (!IsUndefined(propertyKey))
                propertyKey = ToPropertyKey(propertyKey);
            var metadataMap = GetOrCreateMetadataMap(target, propertyKey, /*Create*/ false);
            if (IsUndefined(metadataMap))
                return false;
            if (!metadataMap.delete(metadataKey))
                return false;
            if (metadataMap.size > 0)
                return true;
            var targetMetadata = Metadata.get(target);
            targetMetadata.delete(propertyKey);
            if (targetMetadata.size > 0)
                return true;
            Metadata.delete(target);
            return true;
        }
        exporter("deleteMetadata", deleteMetadata);
        function DecorateConstructor(decorators, target) {
            for (var i = decorators.length - 1; i >= 0; --i) {
                var decorator = decorators[i];
                var decorated = decorator(target);
                if (!IsUndefined(decorated) && !IsNull(decorated)) {
                    if (!IsConstructor(decorated))
                        throw new TypeError();
                    target = decorated;
                }
            }
            return target;
        }
        function DecorateProperty(decorators, target, propertyKey, descriptor) {
            for (var i = decorators.length - 1; i >= 0; --i) {
                var decorator = decorators[i];
                var decorated = decorator(target, propertyKey, descriptor);
                if (!IsUndefined(decorated) && !IsNull(decorated)) {
                    if (!IsObject(decorated))
                        throw new TypeError();
                    descriptor = decorated;
                }
            }
            return descriptor;
        }
        function GetOrCreateMetadataMap(O, P, Create) {
            var targetMetadata = Metadata.get(O);
            if (IsUndefined(targetMetadata)) {
                if (!Create)
                    return undefined;
                targetMetadata = new _Map();
                Metadata.set(O, targetMetadata);
            }
            var metadataMap = targetMetadata.get(P);
            if (IsUndefined(metadataMap)) {
                if (!Create)
                    return undefined;
                metadataMap = new _Map();
                targetMetadata.set(P, metadataMap);
            }
            return metadataMap;
        }
        // 3.1.1.1 OrdinaryHasMetadata(MetadataKey, O, P)
        // https://rbuckton.github.io/reflect-metadata/#ordinaryhasmetadata
        function OrdinaryHasMetadata(MetadataKey, O, P) {
            var hasOwn = OrdinaryHasOwnMetadata(MetadataKey, O, P);
            if (hasOwn)
                return true;
            var parent = OrdinaryGetPrototypeOf(O);
            if (!IsNull(parent))
                return OrdinaryHasMetadata(MetadataKey, parent, P);
            return false;
        }
        // 3.1.2.1 OrdinaryHasOwnMetadata(MetadataKey, O, P)
        // https://rbuckton.github.io/reflect-metadata/#ordinaryhasownmetadata
        function OrdinaryHasOwnMetadata(MetadataKey, O, P) {
            var metadataMap = GetOrCreateMetadataMap(O, P, /*Create*/ false);
            if (IsUndefined(metadataMap))
                return false;
            return ToBoolean(metadataMap.has(MetadataKey));
        }
        // 3.1.3.1 OrdinaryGetMetadata(MetadataKey, O, P)
        // https://rbuckton.github.io/reflect-metadata/#ordinarygetmetadata
        function OrdinaryGetMetadata(MetadataKey, O, P) {
            var hasOwn = OrdinaryHasOwnMetadata(MetadataKey, O, P);
            if (hasOwn)
                return OrdinaryGetOwnMetadata(MetadataKey, O, P);
            var parent = OrdinaryGetPrototypeOf(O);
            if (!IsNull(parent))
                return OrdinaryGetMetadata(MetadataKey, parent, P);
            return undefined;
        }
        // 3.1.4.1 OrdinaryGetOwnMetadata(MetadataKey, O, P)
        // https://rbuckton.github.io/reflect-metadata/#ordinarygetownmetadata
        function OrdinaryGetOwnMetadata(MetadataKey, O, P) {
            var metadataMap = GetOrCreateMetadataMap(O, P, /*Create*/ false);
            if (IsUndefined(metadataMap))
                return undefined;
            return metadataMap.get(MetadataKey);
        }
        // 3.1.5.1 OrdinaryDefineOwnMetadata(MetadataKey, MetadataValue, O, P)
        // https://rbuckton.github.io/reflect-metadata/#ordinarydefineownmetadata
        function OrdinaryDefineOwnMetadata(MetadataKey, MetadataValue, O, P) {
            var metadataMap = GetOrCreateMetadataMap(O, P, /*Create*/ true);
            metadataMap.set(MetadataKey, MetadataValue);
        }
        // 3.1.6.1 OrdinaryMetadataKeys(O, P)
        // https://rbuckton.github.io/reflect-metadata/#ordinarymetadatakeys
        function OrdinaryMetadataKeys(O, P) {
            var ownKeys = OrdinaryOwnMetadataKeys(O, P);
            var parent = OrdinaryGetPrototypeOf(O);
            if (parent === null)
                return ownKeys;
            var parentKeys = OrdinaryMetadataKeys(parent, P);
            if (parentKeys.length <= 0)
                return ownKeys;
            if (ownKeys.length <= 0)
                return parentKeys;
            var set = new _Set();
            var keys = [];
            for (var _i = 0, ownKeys_1 = ownKeys; _i < ownKeys_1.length; _i++) {
                var key = ownKeys_1[_i];
                var hasKey = set.has(key);
                if (!hasKey) {
                    set.add(key);
                    keys.push(key);
                }
            }
            for (var _a = 0, parentKeys_1 = parentKeys; _a < parentKeys_1.length; _a++) {
                var key = parentKeys_1[_a];
                var hasKey = set.has(key);
                if (!hasKey) {
                    set.add(key);
                    keys.push(key);
                }
            }
            return keys;
        }
        // 3.1.7.1 OrdinaryOwnMetadataKeys(O, P)
        // https://rbuckton.github.io/reflect-metadata/#ordinaryownmetadatakeys
        function OrdinaryOwnMetadataKeys(O, P) {
            var keys = [];
            var metadataMap = GetOrCreateMetadataMap(O, P, /*Create*/ false);
            if (IsUndefined(metadataMap))
                return keys;
            var keysObj = metadataMap.keys();
            var iterator = GetIterator(keysObj);
            var k = 0;
            while (true) {
                var next = IteratorStep(iterator);
                if (!next) {
                    keys.length = k;
                    return keys;
                }
                var nextValue = IteratorValue(next);
                try {
                    keys[k] = nextValue;
                }
                catch (e) {
                    try {
                        IteratorClose(iterator);
                    }
                    finally {
                        throw e;
                    }
                }
                k++;
            }
        }
        // 6 ECMAScript Data Typ0es and Values
        // https://tc39.github.io/ecma262/#sec-ecmascript-data-types-and-values
        function Type(x) {
            if (x === null)
                return 1 /* Null */;
            switch (typeof x) {
                case "undefined": return 0 /* Undefined */;
                case "boolean": return 2 /* Boolean */;
                case "string": return 3 /* String */;
                case "symbol": return 4 /* Symbol */;
                case "number": return 5 /* Number */;
                case "object": return x === null ? 1 /* Null */ : 6 /* Object */;
                default: return 6 /* Object */;
            }
        }
        // 6.1.1 The Undefined Type
        // https://tc39.github.io/ecma262/#sec-ecmascript-language-types-undefined-type
        function IsUndefined(x) {
            return x === undefined;
        }
        // 6.1.2 The Null Type
        // https://tc39.github.io/ecma262/#sec-ecmascript-language-types-null-type
        function IsNull(x) {
            return x === null;
        }
        // 6.1.5 The Symbol Type
        // https://tc39.github.io/ecma262/#sec-ecmascript-language-types-symbol-type
        function IsSymbol(x) {
            return typeof x === "symbol";
        }
        // 6.1.7 The Object Type
        // https://tc39.github.io/ecma262/#sec-object-type
        function IsObject(x) {
            return typeof x === "object" ? x !== null : typeof x === "function";
        }
        // 7.1 Type Conversion
        // https://tc39.github.io/ecma262/#sec-type-conversion
        // 7.1.1 ToPrimitive(input [, PreferredType])
        // https://tc39.github.io/ecma262/#sec-toprimitive
        function ToPrimitive(input, PreferredType) {
            switch (Type(input)) {
                case 0 /* Undefined */: return input;
                case 1 /* Null */: return input;
                case 2 /* Boolean */: return input;
                case 3 /* String */: return input;
                case 4 /* Symbol */: return input;
                case 5 /* Number */: return input;
            }
            var hint = PreferredType === 3 /* String */ ? "string" : PreferredType === 5 /* Number */ ? "number" : "default";
            var exoticToPrim = GetMethod(input, toPrimitiveSymbol);
            if (exoticToPrim !== undefined) {
                var result = exoticToPrim.call(input, hint);
                if (IsObject(result))
                    throw new TypeError();
                return result;
            }
            return OrdinaryToPrimitive(input, hint === "default" ? "number" : hint);
        }
        // 7.1.1.1 OrdinaryToPrimitive(O, hint)
        // https://tc39.github.io/ecma262/#sec-ordinarytoprimitive
        function OrdinaryToPrimitive(O, hint) {
            if (hint === "string") {
                var toString_1 = O.toString;
                if (IsCallable(toString_1)) {
                    var result = toString_1.call(O);
                    if (!IsObject(result))
                        return result;
                }
                var valueOf = O.valueOf;
                if (IsCallable(valueOf)) {
                    var result = valueOf.call(O);
                    if (!IsObject(result))
                        return result;
                }
            }
            else {
                var valueOf = O.valueOf;
                if (IsCallable(valueOf)) {
                    var result = valueOf.call(O);
                    if (!IsObject(result))
                        return result;
                }
                var toString_2 = O.toString;
                if (IsCallable(toString_2)) {
                    var result = toString_2.call(O);
                    if (!IsObject(result))
                        return result;
                }
            }
            throw new TypeError();
        }
        // 7.1.2 ToBoolean(argument)
        // https://tc39.github.io/ecma262/2016/#sec-toboolean
        function ToBoolean(argument) {
            return !!argument;
        }
        // 7.1.12 ToString(argument)
        // https://tc39.github.io/ecma262/#sec-tostring
        function ToString(argument) {
            return "" + argument;
        }
        // 7.1.14 ToPropertyKey(argument)
        // https://tc39.github.io/ecma262/#sec-topropertykey
        function ToPropertyKey(argument) {
            var key = ToPrimitive(argument, 3 /* String */);
            if (IsSymbol(key))
                return key;
            return ToString(key);
        }
        // 7.2 Testing and Comparison Operations
        // https://tc39.github.io/ecma262/#sec-testing-and-comparison-operations
        // 7.2.2 IsArray(argument)
        // https://tc39.github.io/ecma262/#sec-isarray
        function IsArray(argument) {
            return Array.isArray
                ? Array.isArray(argument)
                : argument instanceof Object
                    ? argument instanceof Array
                    : Object.prototype.toString.call(argument) === "[object Array]";
        }
        // 7.2.3 IsCallable(argument)
        // https://tc39.github.io/ecma262/#sec-iscallable
        function IsCallable(argument) {
            // NOTE: This is an approximation as we cannot check for [[Call]] internal method.
            return typeof argument === "function";
        }
        // 7.2.4 IsConstructor(argument)
        // https://tc39.github.io/ecma262/#sec-isconstructor
        function IsConstructor(argument) {
            // NOTE: This is an approximation as we cannot check for [[Construct]] internal method.
            return typeof argument === "function";
        }
        // 7.2.7 IsPropertyKey(argument)
        // https://tc39.github.io/ecma262/#sec-ispropertykey
        function IsPropertyKey(argument) {
            switch (Type(argument)) {
                case 3 /* String */: return true;
                case 4 /* Symbol */: return true;
                default: return false;
            }
        }
        // 7.3 Operations on Objects
        // https://tc39.github.io/ecma262/#sec-operations-on-objects
        // 7.3.9 GetMethod(V, P)
        // https://tc39.github.io/ecma262/#sec-getmethod
        function GetMethod(V, P) {
            var func = V[P];
            if (func === undefined || func === null)
                return undefined;
            if (!IsCallable(func))
                throw new TypeError();
            return func;
        }
        // 7.4 Operations on Iterator Objects
        // https://tc39.github.io/ecma262/#sec-operations-on-iterator-objects
        function GetIterator(obj) {
            var method = GetMethod(obj, iteratorSymbol);
            if (!IsCallable(method))
                throw new TypeError(); // from Call
            var iterator = method.call(obj);
            if (!IsObject(iterator))
                throw new TypeError();
            return iterator;
        }
        // 7.4.4 IteratorValue(iterResult)
        // https://tc39.github.io/ecma262/2016/#sec-iteratorvalue
        function IteratorValue(iterResult) {
            return iterResult.value;
        }
        // 7.4.5 IteratorStep(iterator)
        // https://tc39.github.io/ecma262/#sec-iteratorstep
        function IteratorStep(iterator) {
            var result = iterator.next();
            return result.done ? false : result;
        }
        // 7.4.6 IteratorClose(iterator, completion)
        // https://tc39.github.io/ecma262/#sec-iteratorclose
        function IteratorClose(iterator) {
            var f = iterator["return"];
            if (f)
                f.call(iterator);
        }
        // 9.1 Ordinary Object Internal Methods and Internal Slots
        // https://tc39.github.io/ecma262/#sec-ordinary-object-internal-methods-and-internal-slots
        // 9.1.1.1 OrdinaryGetPrototypeOf(O)
        // https://tc39.github.io/ecma262/#sec-ordinarygetprototypeof
        function OrdinaryGetPrototypeOf(O) {
            var proto = Object.getPrototypeOf(O);
            if (typeof O !== "function" || O === functionPrototype)
                return proto;
            // TypeScript doesn't set __proto__ in ES5, as it's non-standard.
            // Try to determine the superclass constructor. Compatible implementations
            // must either set __proto__ on a subclass constructor to the superclass constructor,
            // or ensure each class has a valid `constructor` property on its prototype that
            // points back to the constructor.
            // If this is not the same as Function.[[Prototype]], then this is definately inherited.
            // This is the case when in ES6 or when using __proto__ in a compatible browser.
            if (proto !== functionPrototype)
                return proto;
            // If the super prototype is Object.prototype, null, or undefined, then we cannot determine the heritage.
            var prototype = O.prototype;
            var prototypeProto = prototype && Object.getPrototypeOf(prototype);
            if (prototypeProto == null || prototypeProto === Object.prototype)
                return proto;
            // If the constructor was not a function, then we cannot determine the heritage.
            var constructor = prototypeProto.constructor;
            if (typeof constructor !== "function")
                return proto;
            // If we have some kind of self-reference, then we cannot determine the heritage.
            if (constructor === O)
                return proto;
            // we have a pretty good guess at the heritage.
            return constructor;
        }
        // naive Map shim
        function CreateMapPolyfill() {
            var cacheSentinel = {};
            var arraySentinel = [];
            var MapIterator = /** @class */ (function () {
                function MapIterator(keys, values, selector) {
                    this._index = 0;
                    this._keys = keys;
                    this._values = values;
                    this._selector = selector;
                }
                MapIterator.prototype["@@iterator"] = function () { return this; };
                MapIterator.prototype[iteratorSymbol] = function () { return this; };
                MapIterator.prototype.next = function () {
                    var index = this._index;
                    if (index >= 0 && index < this._keys.length) {
                        var result = this._selector(this._keys[index], this._values[index]);
                        if (index + 1 >= this._keys.length) {
                            this._index = -1;
                            this._keys = arraySentinel;
                            this._values = arraySentinel;
                        }
                        else {
                            this._index++;
                        }
                        return { value: result, done: false };
                    }
                    return { value: undefined, done: true };
                };
                MapIterator.prototype.throw = function (error) {
                    if (this._index >= 0) {
                        this._index = -1;
                        this._keys = arraySentinel;
                        this._values = arraySentinel;
                    }
                    throw error;
                };
                MapIterator.prototype.return = function (value) {
                    if (this._index >= 0) {
                        this._index = -1;
                        this._keys = arraySentinel;
                        this._values = arraySentinel;
                    }
                    return { value: value, done: true };
                };
                return MapIterator;
            }());
            return /** @class */ (function () {
                function Map() {
                    this._keys = [];
                    this._values = [];
                    this._cacheKey = cacheSentinel;
                    this._cacheIndex = -2;
                }
                Object.defineProperty(Map.prototype, "size", {
                    get: function () { return this._keys.length; },
                    enumerable: true,
                    configurable: true
                });
                Map.prototype.has = function (key) { return this._find(key, /*insert*/ false) >= 0; };
                Map.prototype.get = function (key) {
                    var index = this._find(key, /*insert*/ false);
                    return index >= 0 ? this._values[index] : undefined;
                };
                Map.prototype.set = function (key, value) {
                    var index = this._find(key, /*insert*/ true);
                    this._values[index] = value;
                    return this;
                };
                Map.prototype.delete = function (key) {
                    var index = this._find(key, /*insert*/ false);
                    if (index >= 0) {
                        var size = this._keys.length;
                        for (var i = index + 1; i < size; i++) {
                            this._keys[i - 1] = this._keys[i];
                            this._values[i - 1] = this._values[i];
                        }
                        this._keys.length--;
                        this._values.length--;
                        if (key === this._cacheKey) {
                            this._cacheKey = cacheSentinel;
                            this._cacheIndex = -2;
                        }
                        return true;
                    }
                    return false;
                };
                Map.prototype.clear = function () {
                    this._keys.length = 0;
                    this._values.length = 0;
                    this._cacheKey = cacheSentinel;
                    this._cacheIndex = -2;
                };
                Map.prototype.keys = function () { return new MapIterator(this._keys, this._values, getKey); };
                Map.prototype.values = function () { return new MapIterator(this._keys, this._values, getValue); };
                Map.prototype.entries = function () { return new MapIterator(this._keys, this._values, getEntry); };
                Map.prototype["@@iterator"] = function () { return this.entries(); };
                Map.prototype[iteratorSymbol] = function () { return this.entries(); };
                Map.prototype._find = function (key, insert) {
                    if (this._cacheKey !== key) {
                        this._cacheIndex = this._keys.indexOf(this._cacheKey = key);
                    }
                    if (this._cacheIndex < 0 && insert) {
                        this._cacheIndex = this._keys.length;
                        this._keys.push(key);
                        this._values.push(undefined);
                    }
                    return this._cacheIndex;
                };
                return Map;
            }());
            function getKey(key, _) {
                return key;
            }
            function getValue(_, value) {
                return value;
            }
            function getEntry(key, value) {
                return [key, value];
            }
        }
        // naive Set shim
        function CreateSetPolyfill() {
            return /** @class */ (function () {
                function Set() {
                    this._map = new _Map();
                }
                Object.defineProperty(Set.prototype, "size", {
                    get: function () { return this._map.size; },
                    enumerable: true,
                    configurable: true
                });
                Set.prototype.has = function (value) { return this._map.has(value); };
                Set.prototype.add = function (value) { return this._map.set(value, value), this; };
                Set.prototype.delete = function (value) { return this._map.delete(value); };
                Set.prototype.clear = function () { this._map.clear(); };
                Set.prototype.keys = function () { return this._map.keys(); };
                Set.prototype.values = function () { return this._map.values(); };
                Set.prototype.entries = function () { return this._map.entries(); };
                Set.prototype["@@iterator"] = function () { return this.keys(); };
                Set.prototype[iteratorSymbol] = function () { return this.keys(); };
                return Set;
            }());
        }
        // naive WeakMap shim
        function CreateWeakMapPolyfill() {
            var UUID_SIZE = 16;
            var keys = HashMap.create();
            var rootKey = CreateUniqueKey();
            return /** @class */ (function () {
                function WeakMap() {
                    this._key = CreateUniqueKey();
                }
                WeakMap.prototype.has = function (target) {
                    var table = GetOrCreateWeakMapTable(target, /*create*/ false);
                    return table !== undefined ? HashMap.has(table, this._key) : false;
                };
                WeakMap.prototype.get = function (target) {
                    var table = GetOrCreateWeakMapTable(target, /*create*/ false);
                    return table !== undefined ? HashMap.get(table, this._key) : undefined;
                };
                WeakMap.prototype.set = function (target, value) {
                    var table = GetOrCreateWeakMapTable(target, /*create*/ true);
                    table[this._key] = value;
                    return this;
                };
                WeakMap.prototype.delete = function (target) {
                    var table = GetOrCreateWeakMapTable(target, /*create*/ false);
                    return table !== undefined ? delete table[this._key] : false;
                };
                WeakMap.prototype.clear = function () {
                    // NOTE: not a real clear, just makes the previous data unreachable
                    this._key = CreateUniqueKey();
                };
                return WeakMap;
            }());
            function CreateUniqueKey() {
                var key;
                do
                    key = "@@WeakMap@@" + CreateUUID();
                while (HashMap.has(keys, key));
                keys[key] = true;
                return key;
            }
            function GetOrCreateWeakMapTable(target, create) {
                if (!hasOwn.call(target, rootKey)) {
                    if (!create)
                        return undefined;
                    Object.defineProperty(target, rootKey, { value: HashMap.create() });
                }
                return target[rootKey];
            }
            function FillRandomBytes(buffer, size) {
                for (var i = 0; i < size; ++i)
                    buffer[i] = Math.random() * 0xff | 0;
                return buffer;
            }
            function GenRandomBytes(size) {
                if (typeof Uint8Array === "function") {
                    if (typeof crypto !== "undefined")
                        return crypto.getRandomValues(new Uint8Array(size));
                    if (typeof msCrypto !== "undefined")
                        return msCrypto.getRandomValues(new Uint8Array(size));
                    return FillRandomBytes(new Uint8Array(size), size);
                }
                return FillRandomBytes(new Array(size), size);
            }
            function CreateUUID() {
                var data = GenRandomBytes(UUID_SIZE);
                // mark as random - RFC 4122 § 4.4
                data[6] = data[6] & 0x4f | 0x40;
                data[8] = data[8] & 0xbf | 0x80;
                var result = "";
                for (var offset = 0; offset < UUID_SIZE; ++offset) {
                    var byte = data[offset];
                    if (offset === 4 || offset === 6 || offset === 8)
                        result += "-";
                    if (byte < 16)
                        result += "0";
                    result += byte.toString(16).toLowerCase();
                }
                return result;
            }
        }
        // uses a heuristic used by v8 and chakra to force an object into dictionary mode.
        function MakeDictionary(obj) {
            obj.__ = undefined;
            delete obj.__;
            return obj;
        }
    });
})(Reflect$1 || (Reflect$1 = {}));

// tslint:disable:ext-variable-name only-arrow-functions
function JsonProperty(propertyName) {
    return function (target, key) {
        var type = Reflect.getMetadata("design:type", target, key.toString());
        var property = getDefinition(target.constructor).getProperty(key.toString());
        property.serializedName = propertyName || key.toString();
        property.array = type === Array;
        property.set = type === Set;
        if (!property.array && !property.set && !property.type) {
            property.type = type;
        }
    };
}

// tslint:disable:ext-variable-name only-arrow-functions
function JsonElementType(type) {
    return function (target, key) {
        var property = getDefinition(target.constructor).getProperty(key.toString());
        property.type = type;
    };
}

// tslint:disable:ext-variable-name only-arrow-functions
function JsonConverter(converter) {
    return function (target, key) {
        var property = getDefinition(target.constructor).getProperty(key.toString());
        if (typeof converter === "function") {
            property.converter = new converter();
        }
        else {
            property.converter = converter;
        }
    };
}

// tslint:disable:ext-variable-name only-arrow-functions
function OnDeserialized() {
    return function (target, key) {
        var definition = getDefinition(target.constructor);
        definition.onDeserialized = target[key.toString()];
    };
}

var DateConverter = /** @class */ (function () {
    function DateConverter() {
    }
    DateConverter.prototype.serialize = function (property) {
        return property.toString();
    };
    DateConverter.prototype.deserialize = function (value) {
        return new Date(value);
    };
    DateConverter.prototype.collapseArrayWithSingleItem = function () {
        return false;
    };
    return DateConverter;
}());

var BufferConverter = /** @class */ (function () {
    function BufferConverter(encoding) {
        if (encoding === void 0) { encoding = "json"; }
        this._encoding = encoding;
    }
    BufferConverter.prototype.serialize = function (property) {
        if (this._encoding === "json") {
            return property.toJSON();
        }
        return property.toString(this._encoding);
    };
    BufferConverter.prototype.deserialize = function (value) {
        if (this._encoding === "json") {
            return Buffer.from(value.data);
        }
        return Buffer.from(value, this._encoding);
    };
    BufferConverter.prototype.collapseArrayWithSingleItem = function () {
        return false;
    };
    return BufferConverter;
}());

var propertyConverters = new Map();
// Only import Buffer code if running in NodeJS
if (typeof window === "undefined") {
    propertyConverters.set(Buffer, new BufferConverter());
}
propertyConverters.set(Date, new DateConverter());

function serialize(value, type) {
    if (value.constructor === Array) {
        return value.map(function (o) { return serializeRootObject(o, type); });
    }
    return serializeRootObject(value, type);
}
function serializeRootObject(object, type) {
    if (type === void 0) { type = Object.getPrototypeOf(object).constructor; }
    var inheritanceChain = getTypedInheritanceChain(type);
    if (inheritanceChain.length === 0) {
        return object;
    }
    var definitions = inheritanceChain
        .map(function (t) { return objectDefinitions.get(t); })
        .filter(function (t) { return !!t; }); // Typescript doesn't yet support the undefined filter
    var output = {};
    definitions.forEach(function (d) {
        d.properties.forEach(function (p, key) {
            if (!p.type) {
                throw new Error("Cannot serialize property '" + key + "' without type!");
            }
            var value = object[key];
            if (value == undefined || p.writeonly) {
                return;
            }
            if (p.set) {
                output[p.serializedName] = serializeArray(Array.from(value || []), p);
                return;
            }
            if (p.array) {
                output[p.serializedName] = serializeArray(value, p);
                return;
            }
            output[p.serializedName] = serializeObject(value, p);
        });
    });
    return output;
}
function serializeArray(array, definition) {
    var arr = array.map(function (v) { return serializeObject(v, definition); });
    if (arr.length === 1) {
        var converter = definition.converter || propertyConverters.get(definition.type);
        if (converter && converter.collapseArrayWithSingleItem()) {
            return arr[0];
        }
    }
    return arr;
}
function serializeObject(object, definition) {
    var primitive = definition.type === String || definition.type === Boolean || definition.type === Number;
    var value = object;
    var converter = definition.converter || propertyConverters.get(definition.type);
    if (converter) {
        return converter.serialize(value);
    }
    if (!primitive) {
        var objDefinition = objectDefinitions.get(definition.type);
        if (objDefinition) {
            if (value instanceof definition.type) {
                return serialize(value);
            }
            return serialize(value, definition.type);
        }
    }
    return value;
}

function deserialize(object, type, options) {
    if (options === void 0) { options = { runConstructor: false }; }
    if (object && object.constructor === Array) {
        return object.map(function (o) { return deserializeRootObject(o, type, options); });
    }
    return deserializeRootObject(object, type, options);
}
function deserializeRootObject(object, objectType, options) {
    if (objectType === void 0) { objectType = Object; }
    if (!objectDefinitions.has(objectType)) {
        return object;
    }
    var values = object;
    var _a = getTypedInheritanceChain(objectType, values), type = _a[0], superTypes = _a.slice(1);
    var output = Object.create(type.prototype);
    var definitions = superTypes.reverse().concat([type]).map(function (t) { return objectDefinitions.get(t); }).filter(function (t) { return !!t; });
    definitions.forEach(function (d) {
        if (options.runConstructor) {
            d.ctr.call(output);
        }
        d.beforeDeserialized.call(output);
        d.properties.forEach(function (p, key) {
            if (!p.type) {
                throw new Error("Cannot deserialize property '" + key + "' without type!");
            }
            var value = values[p.serializedName];
            if (value == undefined || p.readonly) {
                return;
            }
            if (p.array || p.set) {
                output[key] = deserializeArray(value, p, options);
                if (p.set) {
                    output[key] = new Set(output[key]);
                }
                return;
            }
            output[key] = deserializeObject(value, p, options);
        });
        d.onDeserialized.call(output);
    });
    return output;
}
function deserializeArray(array, definition, options) {
    var converter = definition.converter || propertyConverters.get(definition.type);
    var arr = (array instanceof Array) ?
        array :
        (converter && converter.collapseArrayWithSingleItem() ?
            [array] :
            array);
    return arr.map(function (v) { return deserializeObject(v, definition, options); });
}
function deserializeObject(object, definition, options) {
    var primitive = definition.type === String || definition.type === Boolean || definition.type === Number;
    var value = object;
    var converter = definition.converter || propertyConverters.get(definition.type);
    if (converter) {
        return converter.deserialize(value);
    }
    if (!primitive) {
        var objDefinition = objectDefinitions.get(definition.type);
        if (objDefinition) {
            return deserialize(value, definition.type);
        }
    }
    return value;
}

var TaJson = /** @class */ (function () {
    function TaJson() {
    }
    TaJson.deserialize = function (object, type, options) {
        return deserialize(object, type, options);
    };
    TaJson.parse = function (json, type, options) {
        return this.deserialize(JSON.parse(json), type, options);
    };
    TaJson.serialize = function (value) {
        return serialize(value);
    };
    TaJson.stringify = function (object) {
        return JSON.stringify(this.serialize(object));
    };
    return TaJson;
}());

class JsonStringConverter {
    serialize(property) {
        return property;
    }
    deserialize(value) {
        return value;
    }
    // not ignored here for istanbul, because it should be used if 'true'
    collapseArrayWithSingleItem() {
        return true;
    }
}

class JsonDateConverter {
    serialize(property) {
        return property ? property.toISOString() : null;
    }
    deserialize(value) {
        const date = new Date(value);
        return isNaN(date.getTime()) ? undefined : date;
    }
    /* istanbul ignore next */
    collapseArrayWithSingleItem() {
        return false;
    }
}

class JsonNumberConverter {
    serialize(property) {
        return typeof property === 'string' ? Number(property) : property;
    }
    deserialize(value) {
        return Number(value);
    }
    /* istanbul ignore next */
    collapseArrayWithSingleItem() {
        return false;
    }
}

class JsonThingConverter {
    constructor(typeFn) {
        this.type = typeFn;
    }
    serialize(property) {
        return TaJson.serialize(property);
    }
    deserialize(value) {
        if (typeof value === 'string') {
            const c = new this.type();
            c.name = value;
            return c;
        }
        else {
            return TaJson.deserialize(value, this.type);
        }
    }
    collapseArrayWithSingleItem() {
        /* istanbul ignore next */
        return true;
    }
}

var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (undefined && undefined.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
let Thing = class Thing {
    _OnDeserialized() {
        // tslint:disable-line
        /* istanbul ignore next */
        if (!this.name) {
            console.log('Required [Thing.Name] is not set!');
        }
    }
};
__decorate([
    JsonProperty('name'),
    __metadata("design:type", Object)
], Thing.prototype, "name", void 0);
__decorate([
    JsonProperty('identifier'),
    __metadata("design:type", String)
], Thing.prototype, "identifier", void 0);
__decorate([
    JsonProperty('sortAs'),
    __metadata("design:type", String)
], Thing.prototype, "sortAs", void 0);
__decorate([
    OnDeserialized(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], Thing.prototype, "_OnDeserialized", null);
Thing = __decorate([
    JsonObject()
], Thing);

var __decorate$1 = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata$1 = (undefined && undefined.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
let Collection = class Collection extends Thing {
};
__decorate$1([
    JsonProperty('position'),
    __metadata$1("design:type", Number)
], Collection.prototype, "position", void 0);
Collection = __decorate$1([
    JsonObject()
], Collection);
propertyConverters.set(Collection, new JsonThingConverter(Collection));

var __decorate$2 = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata$2 = (undefined && undefined.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
let BelongsTo = class BelongsTo {
};
__decorate$2([
    JsonProperty('series'),
    JsonElementType(Collection),
    __metadata$2("design:type", Array)
], BelongsTo.prototype, "series", void 0);
__decorate$2([
    JsonProperty('collection'),
    JsonElementType(Collection),
    __metadata$2("design:type", Array)
], BelongsTo.prototype, "collection", void 0);
BelongsTo = __decorate$2([
    JsonObject()
], BelongsTo);

var __decorate$3 = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata$3 = (undefined && undefined.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
let Contributor = class Contributor extends Thing {
};
__decorate$3([
    JsonConverter(JsonStringConverter),
    JsonProperty('role'),
    JsonElementType(String),
    __metadata$3("design:type", Array)
], Contributor.prototype, "role", void 0);
Contributor = __decorate$3([
    JsonObject()
], Contributor);
propertyConverters.set(Contributor, new JsonThingConverter(Contributor));

var __decorate$4 = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata$4 = (undefined && undefined.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
let Subject = class Subject extends Thing {
};
__decorate$4([
    JsonProperty('scheme'),
    __metadata$4("design:type", String)
], Subject.prototype, "scheme", void 0);
__decorate$4([
    JsonProperty('code'),
    __metadata$4("design:type", String)
], Subject.prototype, "code", void 0);
Subject = __decorate$4([
    JsonObject()
], Subject);

var __decorate$5 = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata$5 = (undefined && undefined.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
// import { Encrypted } from '@r2-lcp-js/models/metadata-encrypted';
let Properties = class Properties {
};
__decorate$5([
    JsonProperty('orientation'),
    __metadata$5("design:type", String)
], Properties.prototype, "orientation", void 0);
__decorate$5([
    JsonProperty('page'),
    __metadata$5("design:type", String)
], Properties.prototype, "page", void 0);
__decorate$5([
    JsonConverter(JsonStringConverter),
    JsonProperty('contains'),
    JsonElementType(String),
    __metadata$5("design:type", Array)
], Properties.prototype, "contains", void 0);
__decorate$5([
    JsonProperty('encrypted'),
    __metadata$5("design:type", Object)
], Properties.prototype, "encrypted", void 0);
__decorate$5([
    JsonProperty('layout'),
    __metadata$5("design:type", String)
], Properties.prototype, "layout", void 0);
__decorate$5([
    JsonProperty('media-overlay'),
    __metadata$5("design:type", String)
], Properties.prototype, "mediaOverlay", void 0);
__decorate$5([
    JsonProperty('overflow'),
    __metadata$5("design:type", String)
], Properties.prototype, "overflow", void 0);
__decorate$5([
    JsonProperty('spread'),
    __metadata$5("design:type", String)
], Properties.prototype, "spread", void 0);
Properties = __decorate$5([
    JsonObject()
], Properties);

var __decorate$6 = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata$6 = (undefined && undefined.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
let MediaOverlay = class MediaOverlay {
};
__decorate$6([
    JsonProperty('active-class'),
    __metadata$6("design:type", String)
], MediaOverlay.prototype, "activeClass", void 0);
__decorate$6([
    JsonProperty('playback-active-class'),
    __metadata$6("design:type", String)
], MediaOverlay.prototype, "playbackActiveClass", void 0);
MediaOverlay = __decorate$6([
    JsonObject()
], MediaOverlay);

var __decorate$7 = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata$7 = (undefined && undefined.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
let Metadata = class Metadata {
    _OnDeserialized() {
        /* istanbul ignore next */
        if (!this.title) {
            console.log('Required [Metadata.Title] is not set!');
        }
    }
};
__decorate$7([
    JsonProperty('@type'),
    __metadata$7("design:type", String)
], Metadata.prototype, "type", void 0);
__decorate$7([
    JsonProperty('identifier'),
    __metadata$7("design:type", String)
], Metadata.prototype, "identifier", void 0);
__decorate$7([
    JsonProperty('title'),
    __metadata$7("design:type", Object)
], Metadata.prototype, "title", void 0);
__decorate$7([
    JsonProperty('subtitle'),
    __metadata$7("design:type", Object)
], Metadata.prototype, "subtitle", void 0);
__decorate$7([
    JsonProperty('modified'),
    __metadata$7("design:type", Date)
], Metadata.prototype, "modified", void 0);
__decorate$7([
    JsonProperty('published'),
    __metadata$7("design:type", Date)
], Metadata.prototype, "published", void 0);
__decorate$7([
    JsonConverter(JsonStringConverter),
    JsonProperty('language'),
    JsonElementType(String),
    __metadata$7("design:type", Array)
], Metadata.prototype, "language", void 0);
__decorate$7([
    JsonProperty('sortAs'),
    __metadata$7("design:type", String)
], Metadata.prototype, "sortAs", void 0);
__decorate$7([
    JsonProperty('author'),
    JsonElementType(Contributor),
    __metadata$7("design:type", Array)
], Metadata.prototype, "author", void 0);
__decorate$7([
    JsonProperty('translator'),
    JsonElementType(Contributor),
    __metadata$7("design:type", Array)
], Metadata.prototype, "translator", void 0);
__decorate$7([
    JsonProperty('editor'),
    JsonElementType(Contributor),
    __metadata$7("design:type", Array)
], Metadata.prototype, "editor", void 0);
__decorate$7([
    JsonProperty('artist'),
    JsonElementType(Contributor),
    __metadata$7("design:type", Array)
], Metadata.prototype, "artist", void 0);
__decorate$7([
    JsonProperty('illustrator'),
    JsonElementType(Contributor),
    __metadata$7("design:type", Array)
], Metadata.prototype, "illustrator", void 0);
__decorate$7([
    JsonProperty('letterer'),
    JsonElementType(Contributor),
    __metadata$7("design:type", Array)
], Metadata.prototype, "letterer", void 0);
__decorate$7([
    JsonProperty('penciler'),
    JsonElementType(Contributor),
    __metadata$7("design:type", Array)
], Metadata.prototype, "penciler", void 0);
__decorate$7([
    JsonProperty('colorist'),
    JsonElementType(Contributor),
    __metadata$7("design:type", Array)
], Metadata.prototype, "colorist", void 0);
__decorate$7([
    JsonProperty('inker'),
    JsonElementType(Contributor),
    __metadata$7("design:type", Array)
], Metadata.prototype, "inker", void 0);
__decorate$7([
    JsonProperty('narrator'),
    JsonElementType(Contributor),
    __metadata$7("design:type", Array)
], Metadata.prototype, "narrator", void 0);
__decorate$7([
    JsonProperty('contributor'),
    JsonElementType(Contributor),
    __metadata$7("design:type", Array)
], Metadata.prototype, "contributor", void 0);
__decorate$7([
    JsonProperty('publisher'),
    JsonElementType(Contributor),
    __metadata$7("design:type", Array)
], Metadata.prototype, "publisher", void 0);
__decorate$7([
    JsonProperty('imprint'),
    JsonElementType(Contributor),
    __metadata$7("design:type", Array)
], Metadata.prototype, "imprint", void 0);
__decorate$7([
    JsonProperty('readingProgression'),
    __metadata$7("design:type", String)
], Metadata.prototype, "readingProgression", void 0);
__decorate$7([
    JsonProperty('description'),
    __metadata$7("design:type", String)
], Metadata.prototype, "description", void 0);
__decorate$7([
    JsonProperty('duration'),
    __metadata$7("design:type", Number)
], Metadata.prototype, "duration", void 0);
__decorate$7([
    JsonProperty('numberOfPages'),
    __metadata$7("design:type", Number)
], Metadata.prototype, "numberOfPages", void 0);
__decorate$7([
    JsonProperty('belongsTo'),
    __metadata$7("design:type", BelongsTo)
], Metadata.prototype, "belongsTo", void 0);
__decorate$7([
    JsonProperty('subject'),
    JsonElementType(Subject),
    __metadata$7("design:type", Array)
], Metadata.prototype, "subject", void 0);
__decorate$7([
    JsonProperty('rendition'),
    __metadata$7("design:type", Properties)
], Metadata.prototype, "rendition", void 0);
__decorate$7([
    JsonProperty('source'),
    __metadata$7("design:type", String)
], Metadata.prototype, "source", void 0);
__decorate$7([
    JsonConverter(JsonStringConverter),
    JsonProperty('epub-type'),
    JsonElementType(String),
    __metadata$7("design:type", Array)
], Metadata.prototype, "epubType", void 0);
__decorate$7([
    JsonProperty('rights'),
    __metadata$7("design:type", String)
], Metadata.prototype, "rights", void 0);
__decorate$7([
    JsonProperty('media-overlay'),
    __metadata$7("design:type", MediaOverlay)
], Metadata.prototype, "mediaOverlay", void 0);
__decorate$7([
    OnDeserialized(),
    __metadata$7("design:type", Function),
    __metadata$7("design:paramtypes", []),
    __metadata$7("design:returntype", void 0)
], Metadata.prototype, "_OnDeserialized", null);
Metadata = __decorate$7([
    JsonObject()
], Metadata);

var __decorate$8 = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata$8 = (undefined && undefined.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var Link_1;
/**
 * https://readium.org/webpub-manifest/#the-link-object
 */
let Link = Link_1 = class Link {
    _OnDeserialized() {
        /* istanbul ignore next */
        if (!this.href) {
            console.log('Required [Link.Href] is not set!');
        }
    }
};
__decorate$8([
    JsonProperty('children'),
    JsonElementType(Link_1),
    __metadata$8("design:type", Array)
], Link.prototype, "children", void 0);
__decorate$8([
    JsonProperty('href'),
    __metadata$8("design:type", String)
], Link.prototype, "href", void 0);
__decorate$8([
    JsonProperty('type'),
    __metadata$8("design:type", String)
], Link.prototype, "type", void 0);
__decorate$8([
    JsonProperty('title'),
    __metadata$8("design:type", String)
], Link.prototype, "title", void 0);
__decorate$8([
    JsonProperty('rel'),
    JsonConverter(JsonStringConverter),
    JsonElementType(String),
    __metadata$8("design:type", Set)
], Link.prototype, "rel", void 0);
__decorate$8([
    JsonProperty('height'),
    __metadata$8("design:type", Number)
], Link.prototype, "height", void 0);
__decorate$8([
    JsonProperty('width'),
    __metadata$8("design:type", Number)
], Link.prototype, "width", void 0);
__decorate$8([
    JsonProperty('properties'),
    __metadata$8("design:type", Properties)
], Link.prototype, "properties", void 0);
__decorate$8([
    JsonProperty('duration'),
    __metadata$8("design:type", Number)
], Link.prototype, "duration", void 0);
__decorate$8([
    JsonProperty('bitrate'),
    __metadata$8("design:type", Number)
], Link.prototype, "bitrate", void 0);
__decorate$8([
    JsonProperty('templated'),
    __metadata$8("design:type", Boolean)
], Link.prototype, "templated", void 0);
__decorate$8([
    OnDeserialized(),
    __metadata$8("design:type", Function),
    __metadata$8("design:paramtypes", []),
    __metadata$8("design:returntype", void 0)
], Link.prototype, "_OnDeserialized", null);
Link = Link_1 = __decorate$8([
    JsonObject()
], Link);

var __decorate$9 = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata$9 = (undefined && undefined.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var Publication_1;
propertyConverters.set(Date, new JsonDateConverter());
propertyConverters.set(Number, new JsonNumberConverter());
let Publication = Publication_1 = class Publication {
    static parse(json) {
        return TaJson.parse(json, Publication_1);
    }
    stringify() {
        return TaJson.stringify(this);
    }
    static deserialize(object) {
        return TaJson.deserialize(object, Publication_1);
    }
    serialize() {
        return TaJson.serialize(this);
    }
    _OnDeserialized() {
        /* istanbul ignore next */
        if (!this.metadata) {
            console.log('Required [Publication.Metadata] is not set!');
        }
        /* istanbul ignore next */
        if (!this.links) {
            console.log('Required [Publication.Links] is not set!');
        }
        /* istanbul ignore next */
        if (!this.readingOrder) {
            console.log('Required [Publication.ReadingOrder] is not set!');
        }
    }
};
__decorate$9([
    JsonConverter(JsonStringConverter),
    JsonProperty('@context'),
    JsonElementType(String),
    __metadata$9("design:type", Array)
], Publication.prototype, "context", void 0);
__decorate$9([
    JsonProperty('metadata'),
    __metadata$9("design:type", Metadata)
], Publication.prototype, "metadata", void 0);
__decorate$9([
    JsonProperty('links'),
    JsonElementType(Link),
    __metadata$9("design:type", Array)
], Publication.prototype, "links", void 0);
__decorate$9([
    JsonProperty('readingOrder'),
    JsonElementType(Link),
    __metadata$9("design:type", Array)
], Publication.prototype, "readingOrder", void 0);
__decorate$9([
    JsonProperty('resources'),
    JsonElementType(Link),
    __metadata$9("design:type", Array)
], Publication.prototype, "resources", void 0);
__decorate$9([
    JsonProperty('toc'),
    JsonElementType(Link),
    __metadata$9("design:type", Array)
], Publication.prototype, "toc", void 0);
__decorate$9([
    JsonProperty('page-list'),
    JsonElementType(Link),
    __metadata$9("design:type", Array)
], Publication.prototype, "pageList", void 0);
__decorate$9([
    JsonProperty('landmarks'),
    JsonElementType(Link),
    __metadata$9("design:type", Array)
], Publication.prototype, "landmarks", void 0);
__decorate$9([
    JsonProperty('loi'),
    JsonElementType(Link),
    __metadata$9("design:type", Array)
], Publication.prototype, "loi", void 0);
__decorate$9([
    JsonProperty('loa'),
    JsonElementType(Link),
    __metadata$9("design:type", Array)
], Publication.prototype, "loa", void 0);
__decorate$9([
    JsonProperty('lov'),
    JsonElementType(Link),
    __metadata$9("design:type", Array)
], Publication.prototype, "lov", void 0);
__decorate$9([
    JsonProperty('lot'),
    JsonElementType(Link),
    __metadata$9("design:type", Array)
], Publication.prototype, "lot", void 0);
__decorate$9([
    OnDeserialized(),
    __metadata$9("design:type", Function),
    __metadata$9("design:paramtypes", []),
    __metadata$9("design:returntype", void 0)
], Publication.prototype, "_OnDeserialized", null);
Publication = Publication_1 = __decorate$9([
    JsonObject()
], Publication);

var publication = /*#__PURE__*/Object.freeze({
	get Publication () { return Publication; }
});

var publication$1 = createCommonjsModule(function (module, exports) {
var __extends = (commonjsGlobal && commonjsGlobal.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __awaiter = (commonjsGlobal && commonjsGlobal.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (commonjsGlobal && commonjsGlobal.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;


var Publication = /** @class */ (function (_super) {
    __extends(Publication, _super);
    function Publication(sourceURI) {
        var _this = _super.call(this) || this;
        _this.sourceURI = sourceURI;
        return _this;
    }
    Object.defineProperty(Publication.prototype, "spine", {
        // Alias for now, refactor later.
        get: function () {
            return this.readingOrder;
        },
        enumerable: true,
        configurable: true
    });
    Publication.fromModel = function (publication$$1, sourceURI) {
        return Object.assign(new Publication(sourceURI), publication$$1);
    };
    Publication.fromJSON = function (webPubManifestJSON, sourceURI) {
        return Publication.fromModel(publication.Publication.parse(webPubManifestJSON), sourceURI);
    };
    Publication.fromURL = function (publicationURL) {
        return __awaiter(this, void 0, void 0, function () {
            var webPubManifestJSON;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!publicationURL.endsWith('.json')) return [3 /*break*/, 3];
                        return [4 /*yield*/, fetch(publicationURL)];
                    case 1: return [4 /*yield*/, (_a.sent()).text()];
                    case 2:
                        webPubManifestJSON = _a.sent();
                        return [2 /*return*/, Publication.fromJSON(webPubManifestJSON, publicationURL)];
                    case 3: throw new Error('NO EPUB PARSING');
                }
            });
        });
    };
    Publication.prototype.searchLinkByRel = function (rel) {
        if (this.resources) {
            var ll = this.resources.find(function (link) {
                return link.rel && link.rel.has(rel);
            });
            if (ll) {
                return ll;
            }
        }
        if (this.readingOrder) {
            var ll = this.readingOrder.find(function (link) {
                return link.rel && link.rel.has(rel);
            });
            if (ll) {
                return ll;
            }
        }
        if (this.links) {
            var ll = this.links.find(function (link) {
                return link.rel && link.rel.has(rel);
            });
            if (ll) {
                return ll;
            }
        }
        return undefined;
    };
    // Still not happy with this..
    Publication.prototype.getBaseURI = function () {
        var href;
        if (this.sourceURI) {
            href = new module$1.URL('./', this.sourceURI).toString();
        }
        else {
            var selfLink = this.searchLinkByRel('self');
            if (!selfLink) {
                throw new Error('No self link in publication');
            }
            href = selfLink.href;
        }
        return new module$1.URL('./', href).toString();
    };
    Publication.prototype.getHrefRelativeToManifest = function (href) {
        var baseUri = this.getBaseURI();
        if (!baseUri)
            return '';
        var relativeHref = href;
        if (href.includes(baseUri)) {
            relativeHref = href.split(baseUri)[1];
        }
        return relativeHref || '';
    };
    Publication.prototype.findSpineItemIndexByHref = function (href) {
        return this.readingOrder.findIndex(function (item) {
            return item.href === href;
        });
    };
    Publication.prototype.isInternalHref = function (href) {
        var baseUri = this.getBaseURI();
        if (!baseUri) {
            console.warn('Could not get baseUri');
            return false;
        }
        return href.includes(baseUri);
    };
    return Publication;
}(publication.Publication));
exports.Publication = Publication;
});

unwrapExports(publication$1);
var publication_2 = publication$1.Publication;

var location_1 = createCommonjsModule(function (module, exports) {
exports.__esModule = true;
var Location = /** @class */ (function () {
    function Location(cfi, href, isPrecise) {
        if (isPrecise === void 0) { isPrecise = true; }
        this.cfi = cfi;
        this.href = href;
        this.isPrecise = isPrecise;
    }
    Location.prototype.getLocation = function () {
        return this.cfi;
    };
    Location.prototype.getHref = function () {
        return this.href;
    };
    Location.prototype.getLocationPrecision = function () {
        return this.isPrecise;
    };
    return Location;
}());
exports.Location = Location;
});

unwrapExports(location_1);
var location_2 = location_1.Location;

var types = createCommonjsModule(function (module, exports) {
exports.__esModule = true;
var ZoomOptions;
(function (ZoomOptions) {
    ZoomOptions[ZoomOptions["FitByWidth"] = 0] = "FitByWidth";
    ZoomOptions[ZoomOptions["FitByHeight"] = 1] = "FitByHeight";
    ZoomOptions[ZoomOptions["FitByPage"] = 2] = "FitByPage";
})(ZoomOptions = exports.ZoomOptions || (exports.ZoomOptions = {}));
var CancellationToken = /** @class */ (function () {
    function CancellationToken() {
        this.isCancelled = false;
    }
    return CancellationToken;
}());
exports.CancellationToken = CancellationToken;
var SettingName;
(function (SettingName) {
    SettingName["ColumnGap"] = "column-gap";
    SettingName["MaxColumnWidth"] = "column-max";
    SettingName["MinColumnWidth"] = "column-min";
    SettingName["SpreadMode"] = "spread-mode";
    SettingName["FontFamily"] = "font-family";
    SettingName["FontSize"] = "font-size";
    SettingName["ReadingMode"] = "reading-mode";
    SettingName["TextColor"] = "text-color";
    SettingName["BackgroundColor"] = "background-color";
    SettingName["TextAlign"] = "text-align";
    SettingName["FontOverride"] = "font-override";
})(SettingName = exports.SettingName || (exports.SettingName = {}));
var SETTING_NAME_MAP = new Map([
    [SettingName.BackgroundColor, SettingName.BackgroundColor],
    [SettingName.ColumnGap, SettingName.ColumnGap],
    [SettingName.MaxColumnWidth, SettingName.MaxColumnWidth],
    [SettingName.MinColumnWidth, SettingName.MinColumnWidth],
    [SettingName.FontFamily, SettingName.FontFamily],
    [SettingName.FontSize, SettingName.FontSize],
    [SettingName.ReadingMode, SettingName.ReadingMode],
    [SettingName.SpreadMode, SettingName.SpreadMode],
    [SettingName.TextAlign, SettingName.TextAlign],
    [SettingName.TextColor, SettingName.TextColor],
]);
function stringToSettingName(val) {
    return SETTING_NAME_MAP.get(val);
}
exports.stringToSettingName = stringToSettingName;
});

unwrapExports(types);
var types_1 = types.ZoomOptions;
var types_2 = types.CancellationToken;
var types_3 = types.SettingName;
var types_4 = types.stringToSettingName;

var requestManager = createCommonjsModule(function (module, exports) {
var __awaiter = (commonjsGlobal && commonjsGlobal.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (commonjsGlobal && commonjsGlobal.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;

var NavigationRequestManager = /** @class */ (function () {
    function NavigationRequestManager() {
        this.cancelToken = null;
    }
    NavigationRequestManager.prototype.startRequest = function () {
        if (this.cancelToken) {
            this.cancelToken.isCancelled = true;
        }
        this.cancelToken = new types.CancellationToken();
        return this.cancelToken;
    };
    NavigationRequestManager.prototype.endRequest = function (cancelToken) {
        if (cancelToken === this.cancelToken) {
            this.cancelToken = null;
        }
    };
    // tslint:disable-next-line:max-line-length
    NavigationRequestManager.prototype.executeNavigationAction = function (navAction) {
        return __awaiter(this, void 0, void 0, function () {
            var t;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        t = this.startRequest();
                        return [4 /*yield*/, navAction(t)];
                    case 1:
                        _a.sent();
                        this.endRequest(t);
                        return [2 /*return*/];
                }
            });
        });
    };
    return NavigationRequestManager;
}());
exports.NavigationRequestManager = NavigationRequestManager;
});

unwrapExports(requestManager);
var requestManager_1 = requestManager.NavigationRequestManager;

var navigator = createCommonjsModule(function (module, exports) {
var __awaiter = (commonjsGlobal && commonjsGlobal.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (commonjsGlobal && commonjsGlobal.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;


var Navigator = /** @class */ (function () {
    function Navigator(rendition, requestManager$$1) {
        this.rendition = rendition;
        this.pub = rendition.getPublication();
        this.requestManager = requestManager$$1 ? requestManager$$1 : new requestManager.NavigationRequestManager();
    }
    Navigator.prototype.nextScreen = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.requestManager.executeNavigationAction(function (token) { return __awaiter(_this, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, this.rendition.viewport.nextScreen(token)];
                                    case 1:
                                        _a.sent();
                                        return [2 /*return*/];
                                }
                            });
                        }); })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    Navigator.prototype.previousScreen = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.requestManager.executeNavigationAction(function (token) { return __awaiter(_this, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, this.rendition.viewport.prevScreen(token)];
                                    case 1:
                                        _a.sent();
                                        return [2 /*return*/];
                                }
                            });
                        }); })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    Navigator.prototype.nextSpineItem = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.requestManager.executeNavigationAction(function (token) { return __awaiter(_this, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, this.rendition.viewport.nextSpineItem(token)];
                                    case 1:
                                        _a.sent();
                                        return [2 /*return*/];
                                }
                            });
                        }); })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    Navigator.prototype.previousSpineItem = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.requestManager.executeNavigationAction(function (token) { return __awaiter(_this, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, this.rendition.viewport.prevSpineItem(token)];
                                    case 1:
                                        _a.sent();
                                        return [2 /*return*/];
                                }
                            });
                        }); })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    Navigator.prototype.ensureLoaded = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.rendition.viewport.ensureLoaded()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    Navigator.prototype.getCurrentLocationAsync = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getScreenBeginAsync()];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    Navigator.prototype.getCurrentLocation = function () {
        return this.getScreenBegin();
    };
    Navigator.prototype.gotoBegin = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.requestManager.executeNavigationAction(function (token) { return __awaiter(_this, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, this.rendition.viewport.renderAtSpineItem(0, token)];
                                    case 1:
                                        _a.sent();
                                        return [2 /*return*/];
                                }
                            });
                        }); })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    Navigator.prototype.gotoLocation = function (loc) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.requestManager.executeNavigationAction(function (token) { return __awaiter(_this, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, this.rendition.viewport.renderAtLocation(loc, token)];
                                    case 1:
                                        _a.sent();
                                        return [2 /*return*/];
                                }
                            });
                        }); })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    Navigator.prototype.gotoAnchorLocation = function (href, eleId) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.requestManager.executeNavigationAction(function (token) { return __awaiter(_this, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, this.rendition.viewport.renderAtAnchorLocation(href, eleId, token)];
                                    case 1:
                                        _a.sent();
                                        return [2 /*return*/];
                                }
                            });
                        }); })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    Navigator.prototype.getScreenBeginAsync = function () {
        return __awaiter(this, void 0, void 0, function () {
            var pos;
            return __generator(this, function (_a) {
                pos = this.rendition.viewport.getStartPosition();
                if (!pos) {
                    return [2 /*return*/, pos];
                }
                return [2 /*return*/, this.locationFromPaginationAsync(pos, false)];
            });
        });
    };
    Navigator.prototype.getScreenBegin = function () {
        var pos = this.rendition.viewport.getStartPosition();
        if (!pos) {
            return pos;
        }
        return this.locationFromPagination(pos, false);
    };
    Navigator.prototype.getScreenEndAsync = function () {
        return __awaiter(this, void 0, void 0, function () {
            var pos;
            return __generator(this, function (_a) {
                pos = this.rendition.viewport.getEndPosition();
                if (!pos) {
                    return [2 /*return*/, pos];
                }
                return [2 /*return*/, this.locationFromPaginationAsync(pos, true)];
            });
        });
    };
    Navigator.prototype.getScreenEnd = function () {
        var pos = this.rendition.viewport.getEndPosition();
        if (!pos) {
            return pos;
        }
        return this.locationFromPagination(pos, true);
    };
    Navigator.prototype.isFirstScreen = function () {
        var pos = this.rendition.viewport.getStartPosition();
        if (!pos) {
            return false;
        }
        return pos.spineItemIndex === 0 && pos.pageIndex === 0;
    };
    Navigator.prototype.isLastScreen = function () {
        var pos = this.rendition.viewport.getEndPosition();
        if (!pos) {
            return false;
        }
        return pos.spineItemIndex + 1 >= this.pub.spine.length &&
            pos.pageIndex + 1 >= pos.spineItemPageCount;
    };
    Navigator.prototype.isFirstScreenSpine = function () {
        var pos = this.rendition.viewport.getStartPosition();
        if (!pos) {
            return false;
        }
        return pos.pageIndex === 0;
    };
    Navigator.prototype.isFinalScreenSpine = function () {
        var pos = this.rendition.viewport.getEndPosition();
        if (!pos) {
            return false;
        }
        return pos.pageIndex + 1 === pos.spineItemPageCount;
    };
    Navigator.prototype.getScreenCountSpine = function () {
        var pos = this.rendition.viewport.getStartPosition();
        if (!pos) {
            return -1;
        }
        return pos.spineItemPageCount;
    };
    // public async gotoScreenSpine(screenIndex: number): Promise<void> {
    //   return Promise.resolve();
    // }
    // public getCurrentScreenIndexSpine(): number {
    //   return -1;
    // }
    // tslint:disable-next-line:max-line-length
    Navigator.prototype.locationFromPaginationAsync = function (pos, backward) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, pos.view.ensureContentLoaded()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, new location_1.Location(pos.view.getCfi(pos.offsetInView, 0, backward), this.pub.spine[pos.spineItemIndex].href)];
                }
            });
        });
    };
    Navigator.prototype.locationFromPagination = function (pos, backward) {
        return new location_1.Location(pos.view.getCfi(pos.offsetInView, 0, backward), this.pub.spine[pos.spineItemIndex].href);
    };
    return Navigator;
}());
exports.Navigator = Navigator;
});

unwrapExports(navigator);
var navigator_1 = navigator.Navigator;

/*! *****************************************************************************
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the Apache License, Version 2.0 (the "License"); you may not use
this file except in compliance with the License. You may obtain a copy of the
License at http://www.apache.org/licenses/LICENSE-2.0

THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
MERCHANTABLITY OR NON-INFRINGEMENT.

See the Apache Version 2.0 License for specific language governing permissions
and limitations under the License.
***************************************************************************** */
/* global Reflect, Promise */

var extendStatics = Object.setPrototypeOf ||
    ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
    function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };

function __extends(d, b) {
    extendStatics(d, b);
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
}

function __awaiter(thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
}

function __generator(thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = y[op[0] & 2 ? "return" : op[0] ? "throw" : "next"]) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [0, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
}

var PROTOCOL_NAME = 'r2-glue-js';
var PROTOCOL_VERSION = '1.0.0';
var MessageType;
(function (MessageType) {
    MessageType["Invoke"] = "invoke";
    MessageType["Return"] = "return";
    MessageType["Callback"] = "callback";
})(MessageType || (MessageType = {}));
var messageCount = 0;
var Message = /** @class */ (function () {
    function Message(namespace, type, key, value, correlationId) {
        this.namespace = namespace;
        this.type = type;
        this.key = key;
        this.value = value;
        this.correlationId = correlationId || "" + messageCount; // uuid();
        messageCount += 1;
        this.protocol = PROTOCOL_NAME;
        this.version = PROTOCOL_VERSION;
    }
    Message.validate = function (message) {
        return !!message.protocol && message.protocol === PROTOCOL_NAME;
    };
    return Message;
}());

var Receiver = /** @class */ (function () {
    function Receiver(namespace) {
        var _this = this;
        this.destroy = this.destroy.bind(this);
        this.handler = function (event) {
            var request = event.data;
            if (!Message.validate(request) || request.namespace !== namespace) {
                return;
            }
            _this.processMessage(request, function (type, name, parameters) {
                if (!event.source) {
                    return;
                }
                var sourceWindow = event.source;
                sourceWindow.postMessage(new Message(namespace, type, name, parameters, request.correlationId), event.origin);
            });
        };
        window.addEventListener('message', this.handler);
    }
    Receiver.prototype.destroy = function () {
        window.removeEventListener('message', this.handler);
    };
    return Receiver;
}());

var Dispatcher = /** @class */ (function (_super) {
    __extends(Dispatcher, _super);
    function Dispatcher(namespace, handlerType) {
        var _this = _super.call(this, namespace) || this;
        _this._handler = new handlerType();
        return _this;
    }
    Dispatcher.prototype.processMessage = function (message, sendMessage) {
        this._handleRequest(message, sendMessage);
    };
    Dispatcher.prototype._handleRequest = function (message, sendResponse) {
        this._handler.declarations[message.key]
            .apply(this._handler, [
            function () {
                var callbackArgs = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    callbackArgs[_i] = arguments[_i];
                }
                sendResponse(MessageType.Callback, message.key, callbackArgs);
            }
        ].concat(message.value))
            .then(function (returnValue) { return sendResponse(MessageType.Return, message.key, returnValue); });
    };
    return Dispatcher;
}(Receiver));

var Client = /** @class */ (function (_super) {
    __extends(Client, _super);
    function Client(namespace, targetWindow) {
        var _this = _super.call(this, namespace) || this;
        _this.typeName = 'Client';
        _this._namespace = namespace;
        _this._targetWindow = targetWindow;
        _this._messageCorrelations = {};
        return _this;
    }
    Client.prototype.sendMessage = function (key, parameters, callback) {
        var message = new Message(this._namespace, MessageType.Invoke, key, parameters);
        var correlations = this._getCorrelations(message.correlationId);
        if (callback) {
            correlations.invokeCallback = callback;
        }
        this._targetWindow.postMessage(message, this._targetWindow.location.origin);
        return new Promise(function (resolve) {
            correlations.invokeReturn = resolve;
        });
    };
    Client.prototype.processMessage = function (message) {
        if (!message.correlationId) {
            return;
        }
        var correlations = this._getCorrelations(message.correlationId);
        if (message.type === MessageType.Return && correlations.invokeReturn) {
            correlations.invokeReturn(message.value);
        }
        if (message.type === MessageType.Callback && correlations.invokeCallback) {
            correlations.invokeCallback(message.value);
        }
    };
    Client.prototype._getCorrelations = function (id) {
        if (!this._messageCorrelations[id]) {
            this._messageCorrelations[id] = {};
        }
        return this._messageCorrelations[id];
    };
    return Client;
}(Receiver));

var EventHandlingMessage;
(function (EventHandlingMessage) {
    EventHandlingMessage["AddEventListener"] = "ADD_EVENT_LISTENER";
    EventHandlingMessage["RemoveEventListener"] = "REMOVE_EVENT_LISTENER";
})(EventHandlingMessage || (EventHandlingMessage = {}));

var EventHandling = /** @class */ (function (_super) {
    __extends(EventHandling, _super);
    function EventHandling(targetWindow) {
        var _this = _super.call(this, 'event-handling', targetWindow) || this;
        _this.typeName = 'EventHandling';
        return _this;
    }
    EventHandling.prototype.addEventListener = function (target, eventType, properties, listener, options) {
        if (options === void 0) { options = {}; }
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.sendMessage(EventHandlingMessage.AddEventListener, [target, eventType, properties, options], function (event) {
                        listener(event);
                    })];
            });
        });
    };
    EventHandling.prototype.removeEventListener = function (listenerID) {
        this.sendMessage(EventHandlingMessage.RemoveEventListener, [listenerID]);
    };
    return EventHandling;
}(Client));

var KeyHandlingMessage;
(function (KeyHandlingMessage) {
    KeyHandlingMessage["AddKeyEventListener"] = "ADD_KEY_EVENT_LISTENER";
    KeyHandlingMessage["RemoveKeyEventListener"] = "REMOVE_KEY_EVENT_LISTENER";
})(KeyHandlingMessage || (KeyHandlingMessage = {}));

var KeyHandling = /** @class */ (function (_super) {
    __extends(KeyHandling, _super);
    function KeyHandling(targetWindow) {
        var _this = _super.call(this, 'key-handling', targetWindow) || this;
        _this.typeName = 'KeyHandling';
        return _this;
    }
    KeyHandling.prototype.addKeyEventListener = function (target, eventType, keyCode, listener, options) {
        if (options === void 0) { options = {}; }
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.sendMessage(KeyHandlingMessage.AddKeyEventListener, [target, eventType, keyCode, options], function (event) {
                        listener(event);
                    })];
            });
        });
    };
    KeyHandling.prototype.removeKeyEventListener = function (listenerID) {
        this.sendMessage(KeyHandlingMessage.RemoveKeyEventListener, [listenerID]);
    };
    return KeyHandling;
}(Client));

var LinkHandling = /** @class */ (function (_super) {
    __extends(LinkHandling, _super);
    function LinkHandling(targetWindow) {
        var _this = _super.call(this, 'link-handling', targetWindow) || this;
        _this.typeName = 'LinkHandling';
        return _this;
    }
    LinkHandling.prototype.addEventListener = function (target, eventType, properties, listener, options) {
        if (options === void 0) { options = {}; }
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.sendMessage(EventHandlingMessage.AddEventListener, [target, eventType, properties, options], function (event) {
                        listener(event);
                    })];
            });
        });
    };
    LinkHandling.prototype.removeEventListener = function (listenerID) {
        this.sendMessage(EventHandlingMessage.RemoveEventListener, [listenerID]);
    };
    return LinkHandling;
}(Client));

var SelectionHandling = /** @class */ (function (_super) {
    __extends(SelectionHandling, _super);
    function SelectionHandling(targetWindow) {
        var _this = _super.call(this, 'selection-handling', targetWindow) || this;
        _this.typeName = 'SelectionHandling';
        return _this;
    }
    SelectionHandling.prototype.addEventListener = function (target, listener, options) {
        if (options === void 0) { options = {}; }
        return __awaiter(this, void 0, void 0, function () {
            var eventType, properties;
            var _this = this;
            return __generator(this, function (_a) {
                eventType = 'mouseup';
                properties = [];
                return [2 /*return*/, this.sendMessage(EventHandlingMessage.AddEventListener, [target, eventType, properties, options], function (event) {
                        event[1] = _this;
                        listener(event);
                    })];
            });
        });
    };
    SelectionHandling.prototype.removeEventListener = function (listenerID) {
        this.sendMessage(EventHandlingMessage.RemoveEventListener, [listenerID]);
    };
    return SelectionHandling;
}(Client));

var EventHandlingMessage$1;
(function (EventHandlingMessage) {
    EventHandlingMessage["CreateHighlight"] = "CREATE_HIGHLIGHT";
})(EventHandlingMessage$1 || (EventHandlingMessage$1 = {}));

var Highlighting = /** @class */ (function (_super) {
    __extends(Highlighting, _super);
    function Highlighting(targetWindow) {
        var _this = _super.call(this, 'highlighting', targetWindow) || this;
        _this.typeName = 'Highlighting';
        return _this;
    }
    Highlighting.prototype.createHighlight = function (rangeData, options) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.sendMessage(EventHandlingMessage$1.CreateHighlight, [rangeData, options])];
            });
        });
    };
    return Highlighting;
}(Client));

var ReadiumGlue_esm = /*#__PURE__*/Object.freeze({
	EventHandling: EventHandling,
	KeyHandling: KeyHandling,
	LinkHandling: LinkHandling,
	SelectionHandling: SelectionHandling,
	Highlighting: Highlighting
});

var glueManager = createCommonjsModule(function (module, exports) {
var __awaiter = (commonjsGlobal && commonjsGlobal.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (commonjsGlobal && commonjsGlobal.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;

var GlueManager = /** @class */ (function () {
    function GlueManager(context, iframeLoader) {
        this.handlers = [];
        this.frameIDToGlueMap = {};
        this.frameID = 0;
        this.iframeLoader = iframeLoader;
        this.initializeGlueModules = this.initializeGlueModules.bind(this);
        this.destroyHandler = this.destroyHandler.bind(this);
        this.handleLink = this.handleLink.bind(this);
        this.handleSelection = this.handleSelection.bind(this);
        this.iframeLoader.addIFrameLoadedListener(this.initializeGlueModules);
        this.navigator = context.navigator;
        var rendition = context.rendition;
        this.publication = rendition.getPublication();
    }
    GlueManager.prototype.initializeGlueModules = function (iframe) {
        var _this = this;
        var win = iframe.contentWindow;
        if (!win) {
            console.error('Content window not found');
            return;
        }
        this.frameID += 1;
        this.addGlueHandler(win, new ReadiumGlue_esm.Highlighting(win));
        this.addGlueHandler(win, new ReadiumGlue_esm.LinkHandling(win), function (glue) {
            glue.addEventListener('body', 'click', [], _this.handleLink);
        });
        this.addGlueHandler(win, new ReadiumGlue_esm.SelectionHandling(win), function (glue) {
            glue.addEventListener('body', _this.handleSelection);
        });
    };
    GlueManager.prototype.addGlueHandler = function (win, glue, glueMethod) {
        var _this = this;
        if (!glue) {
            console.warn('GlueModule was not created');
            return;
        }
        this.handlers.push(glue);
        this.addToHandlersMap(this.frameIDToGlueMap, this.frameID, glue);
        if (glueMethod) {
            glueMethod(glue);
        }
        win.addEventListener('unload', function () {
            _this.destroyHandler(glue);
        });
        return glue;
    };
    GlueManager.prototype.addToHandlersMap = function (map, id, handler) {
        if (map[id] === undefined) {
            map[id] = [];
        }
        var handlers = map[id];
        handlers.push(handler);
    };
    GlueManager.prototype.destroyHandler = function (handler) {
        if (!handler) {
            return;
        }
        handler.destroy();
        var index = this.handlers.indexOf(handler);
        this.handlers.splice(index, 1);
    };
    // TODO: See if there's a solution that avoids the use of 'any'
    // Also on line 113.
    // tslint:disable-next-line:no-any
    GlueManager.prototype.handleLink = function (opts) {
        return __awaiter(this, void 0, void 0, function () {
            var opt;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        opt = opts[0];
                        return [4 /*yield*/, this.handleLinkHref(opt.href)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    GlueManager.prototype.handleLinkHref = function (href) {
        return __awaiter(this, void 0, void 0, function () {
            var relativeHref, splitHref, eleId;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.publication.isInternalHref(href)) return [3 /*break*/, 2];
                        relativeHref = this.publication.getHrefRelativeToManifest(href);
                        splitHref = relativeHref.split('#');
                        eleId = '';
                        if (splitHref.length > 1) {
                            relativeHref = splitHref[0];
                            eleId = splitHref[1];
                        }
                        return [4 /*yield*/, this.navigator.gotoAnchorLocation(relativeHref, eleId)];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        window.open(href);
                        _a.label = 3;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // tslint:disable-next-line:no-any
    GlueManager.prototype.handleSelection = function (opts) {
        return __awaiter(this, void 0, void 0, function () {
            var opt, rangeData, glue, frameID, highlighting;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        opt = opts[0];
                        rangeData = opt.rangeData;
                        glue = opts[1];
                        frameID = this.getFrameID(glue);
                        highlighting = this.getGlueModule('Highlighting', frameID);
                        if (!highlighting) return [3 /*break*/, 2];
                        return [4 /*yield*/, highlighting.createHighlight(rangeData)];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2: return [2 /*return*/];
                }
            });
        });
    };
    GlueManager.prototype.getGlueModule = function (moduleType, frameID) {
        var glueModules = this.frameIDToGlueMap[frameID];
        var glue;
        var foundGlue;
        for (var _i = 0, glueModules_1 = glueModules; _i < glueModules_1.length; _i++) {
            glue = glueModules_1[_i];
            if (glue.typeName && glue.typeName === moduleType) {
                foundGlue = glue;
            }
        }
        return foundGlue;
    };
    GlueManager.prototype.getFrameID = function (glue) {
        var keys = Object.keys(this.frameIDToGlueMap);
        var frameID = -1;
        for (var _i = 0, keys_1 = keys; _i < keys_1.length; _i++) {
            var key = keys_1[_i];
            var id = Number.parseInt(key, 10);
            var glueModules = this.frameIDToGlueMap[id];
            var glueIndex = glueModules.indexOf(glue);
            if (glueIndex >= 0) {
                frameID = id;
                break;
            }
        }
        return frameID;
    };
    return GlueManager;
}());
exports.GlueManager = GlueManager;
});

unwrapExports(glueManager);
var glueManager_1 = glueManager.GlueManager;

var renditionContext = createCommonjsModule(function (module, exports) {
exports.__esModule = true;



var RenditionContext = /** @class */ (function () {
    function RenditionContext(rendition, iframeLoader) {
        this.rendition = rendition;
        this.iframeLoader = iframeLoader;
        this.requestManager = new requestManager.NavigationRequestManager();
        this.navigator = new navigator.Navigator(this.rendition, this.requestManager);
        this.glueManager = new glueManager.GlueManager(this, iframeLoader);
    }
    return RenditionContext;
}());
exports.RenditionContext = RenditionContext;
});

unwrapExports(renditionContext);
var renditionContext_1 = renditionContext.RenditionContext;

var view = createCommonjsModule(function (module, exports) {
exports.__esModule = true;
var View = /** @class */ (function () {
    function View() {
    }
    return View;
}());
exports.View = View;
});

unwrapExports(view);
var view_1 = view.View;

var spineItemView = createCommonjsModule(function (module, exports) {
var __extends = (commonjsGlobal && commonjsGlobal.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __awaiter = (commonjsGlobal && commonjsGlobal.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (commonjsGlobal && commonjsGlobal.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;


var ContentLoadingStatus;
(function (ContentLoadingStatus) {
    ContentLoadingStatus[ContentLoadingStatus["NotLoaded"] = 0] = "NotLoaded";
    ContentLoadingStatus[ContentLoadingStatus["Loading"] = 1] = "Loading";
    ContentLoadingStatus[ContentLoadingStatus["Loaded"] = 2] = "Loaded";
})(ContentLoadingStatus = exports.ContentLoadingStatus || (exports.ContentLoadingStatus = {}));
/* tslint:disable:no-any */
var SpineItemView = /** @class */ (function (_super) {
    __extends(SpineItemView, _super);
    function SpineItemView(spine, isVertical, isFixedLayout, cvFactory) {
        var _this = _super.call(this) || this;
        _this.spineItemPageCount = 0;
        _this.isInUse = true;
        _this.contentStatus = ContentLoadingStatus.NotLoaded;
        _this.isVertical = true;
        _this.isFixedLayout = false;
        _this.scaleOption = types.ZoomOptions.FitByPage;
        _this.scale = 1;
        _this.contentHeight = 0;
        _this.spine = spine;
        _this.isVertical = isVertical;
        _this.isFixedLayout = isFixedLayout;
        _this.cvFactory = cvFactory;
        return _this;
    }
    SpineItemView.prototype.getContentView = function () {
        return this.contentView;
    };
    SpineItemView.prototype.getOffsetFromCfi = function (cfi) {
        if (cfi === '') {
            return 0;
        }
        return this.contentView.getOffsetFromCfi(cfi);
    };
    SpineItemView.prototype.getPageIndexOffsetFromCfi = function (cfi) {
        if (cfi === '') {
            return 0;
        }
        return this.contentView.getPageIndexOffsetFromCfi(cfi);
    };
    SpineItemView.prototype.getOffsetFromElementId = function (elementId) {
        if (elementId === '') {
            return 0;
        }
        return this.contentView.getOffsetFromElementId(elementId);
    };
    SpineItemView.prototype.getPageIndexOffsetFromElementId = function (elementId) {
        if (elementId === '') {
            return 0;
        }
        return this.contentView.getPageIndexOffsetFromElementId(elementId);
    };
    SpineItemView.prototype.loadSpineItem = function (spineItem, viewSettings, token) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.contentView = this.cvFactory.createContentView(this.isFixedLayout, this.isVertical);
                        this.contentView.attachToHost(this.host);
                        this.contentView.onSelfResize(function (spIndex) {
                            _this.onViewChanged();
                        });
                        this.contentStatus = ContentLoadingStatus.Loading;
                        return [4 /*yield*/, this.contentView.loadSpineItem(spineItem, this.spine.indexOf(spineItem), viewSettings, token)];
                    case 1:
                        _a.sent();
                        this.contentStatus = ContentLoadingStatus.Loaded;
                        this.onViewChanged();
                        return [2 /*return*/];
                }
            });
        });
    };
    SpineItemView.prototype.unloadSpineItem = function () {
        this.contentView.unloadSpineItem();
        while (this.host.firstChild) {
            this.host.removeChild(this.host.firstChild);
        }
        this.isInUse = false;
    };
    SpineItemView.prototype.isSpineItemInUse = function () {
        return this.isInUse;
    };
    SpineItemView.prototype.fixedLayout = function () {
        return this.isFixedLayout;
    };
    SpineItemView.prototype.ensureContentLoaded = function (token) {
        if (this.contentStatus === ContentLoadingStatus.Loaded) {
            return Promise.resolve();
        }
        if (this.contentStatus === ContentLoadingStatus.Loading) {
            return this.contentView.spineItemLoadedPromise(token);
        }
        return Promise.reject('Not loaded');
    };
    SpineItemView.prototype.isContentLoaded = function () {
        return this.contentStatus === ContentLoadingStatus.Loaded;
    };
    SpineItemView.prototype.resize = function (pageWidth, pageHeight) {
        if (this.isFixedLayout) {
            this.resizeFixedLayoutPage(this.scaleOption, pageWidth, pageHeight);
        }
        else {
            this.contentView.onResize();
            this.onViewChanged();
        }
    };
    SpineItemView.prototype.getScale = function () {
        return this.scale;
    };
    SpineItemView.prototype.setZoomOption = function (option) {
        this.scaleOption = option;
    };
    SpineItemView.prototype.resizeFixedLayoutPage = function (option, pageWidth, pageHeight) {
        this.scaleOption = option;
        var hScale = pageWidth / this.contentView.metaWidth();
        var vScale = pageHeight / this.contentView.metaHeight();
        if (this.scaleOption === types.ZoomOptions.FitByPage) {
            this.scale = this.isVertical ? hScale : Math.min(hScale, vScale);
        }
        else if (this.scaleOption === types.ZoomOptions.FitByWidth) {
            this.scale = hScale;
        }
        else if (this.scaleOption === types.ZoomOptions.FitByHeight) {
            this.scale = vScale;
        }
        this.updateScale();
    };
    SpineItemView.prototype.setViewSettings = function (viewSetting) {
        this.contentView.setViewSettings(viewSetting);
        this.onViewChanged();
    };
    SpineItemView.prototype.render = function () {
        this.contentView.render();
    };
    SpineItemView.prototype.attachToHost = function (host) {
        this.host = host;
    };
    SpineItemView.prototype.getTotalPageCount = function () {
        return this.spineItemPageCount;
    };
    SpineItemView.prototype.setTotalPageCount = function (count) {
        this.spineItemPageCount = count;
    };
    SpineItemView.prototype.getTotalSize = function (pageWidth) {
        if (this.isVertical) {
            if (this.isFixedLayout) {
                return this.contentView.metaHeight() * this.scale;
            }
            return this.contentHeight;
        }
        if (this.isFixedLayout) {
            return this.contentView.metaWidth() * this.scale;
        }
        return this.contentView.spineItemPageCount() * pageWidth;
    };
    SpineItemView.prototype.getPageSize = function (pageWidth) {
        if (this.isVertical) {
            if (this.isFixedLayout) {
                return this.contentView.metaHeight() * this.scale;
            }
            return this.contentHeight;
        }
        if (this.isFixedLayout) {
            return this.contentView.metaWidth() * this.scale;
        }
        return pageWidth;
    };
    SpineItemView.prototype.getCfi = function (offsetMain, offset2nd, backward) {
        if (this.contentStatus !== ContentLoadingStatus.Loaded) {
            return '';
        }
        return this.contentView.getCfi(offsetMain, offset2nd, backward);
    };
    // public getVisibleElements(selector: string, includeSpineItems: boolean): any {
    //   return this.contentViewImpl.getVisibleElements(selector, includeSpineItems);
    // }
    // public getElements(selector: string): any {
    //   return this.contentViewImpl.getElements(this.spineItem.Href, selector);
    // }
    // public getElementById(id: string): any {
    //   return this.contentViewImpl.getElementById(this.spineItem.Href, id);
    // }
    // public isElementVisible($ele: any, offsetMain: number, offset2nd: number): boolean {
    //   const navLogic = this.contentViewImpl.getNavigator();
    //   const visOffset = this.isVertical ? { top: -offsetMain, left: offset2nd } :
    //                                       { top: offset2nd, left: -offsetMain };
    //   return navLogic.isElementVisible($ele, visOffset);
    // }
    SpineItemView.prototype.getCfiFromElementId = function (elementId) {
        return this.contentView.getCfiFromElementId(elementId);
    };
    SpineItemView.prototype.onSelfResize = function (callback) {
        this.contentView.onSelfResize(callback);
    };
    SpineItemView.prototype.show = function () {
        this.host.style.opacity = '1.0';
    };
    SpineItemView.prototype.hide = function () {
        this.host.style.opacity = '0.0';
    };
    // private handleDocumentContentLoaded(): void {
    //   this.contentViewImpl.on(Readium.Events.CONTENT_DOCUMENT_LOADED,
    //                           ($iframe: any, spineItem: any) => {
    //                             this.$iframe = $iframe;
    //                             this.rjsSpineItem = spineItem;
    //                           });
    // }
    // private contentSizeChangedHandler(iframe: any, spineItem: any, handler: any,
    //                                   resolve: () => void): void {
    //   if (this.rsjSpine.items[this.spineItemIndex] !== spineItem) {
    //     return;
    //   }
    //   this.contentViewImpl.resizeIFrameToContent();
    //   this.contentHeight = this.contentViewImpl.getCalculatedPageHeight();
    //   this.contentViewImpl.removeListener(
    //     OnePageView.Events.CONTENT_SIZE_CHANGED,
    //     handler,
    //   );
    //   resolve();
    // }
    // private contentSizeChangedPromise(): Promise<void> {
    //   return new Promise<void>((resolve: () => void) => {
    //     // tslint:disable-next-line:no-any
    //     const handler = (iframe: any, spineItem: any) => {
    //       this.contentSizeChangedHandler(iframe, spineItem, handler, resolve);
    //     };
    //     this.contentViewImpl.on(
    //       OnePageView.Events.CONTENT_SIZE_CHANGED,
    //       handler,
    //     );
    //   });
    // }
    SpineItemView.prototype.onViewChanged = function () {
        this.spineItemPageCount = this.contentView.spineItemPageCount();
        if (this.isVertical) {
            this.contentHeight = this.contentView.calculatedHeight();
            this.host.style.height = this.contentHeight + "px";
        }
    };
    SpineItemView.prototype.updateScale = function () {
        if (!this.isFixedLayout) {
            return;
        }
        this.contentView.scale(this.scale);
        this.host.style.width = this.contentView.metaWidth() * this.scale + "px";
    };
    return SpineItemView;
}(view.View));
exports.SpineItemView = SpineItemView;
});

unwrapExports(spineItemView);
var spineItemView_1 = spineItemView.ContentLoadingStatus;
var spineItemView_2 = spineItemView.SpineItemView;

var spineItemViewFactory = createCommonjsModule(function (module, exports) {
exports.__esModule = true;

var SpineItemViewFactory = /** @class */ (function () {
    // tslint:disable-next-line:no-any
    function SpineItemViewFactory(pub, isFixedLayout, cvFactory) {
        this.isFixedLayout = false;
        this.isVertical = false;
        this.publication = pub;
        this.isFixedLayout = isFixedLayout;
        this.contentViewFactory = cvFactory;
    }
    SpineItemViewFactory.prototype.setVerticalLayout = function (v) {
        this.isVertical = v;
    };
    SpineItemViewFactory.prototype.createSpineItemView = function (pageWidth, pageHeight) {
        var spineItemView$$1 = new spineItemView.SpineItemView(this.publication.spine, this.isVertical, this.isFixedLayout, this.contentViewFactory);
        var spineItemViewContainer = document.createElement('div');
        spineItemViewContainer.style.position = 'absolute';
        spineItemViewContainer.style.width = pageWidth + "px";
        if (!this.isVertical) {
            spineItemViewContainer.style.height = pageHeight + "px";
        }
        spineItemView$$1.attachToHost(spineItemViewContainer);
        return [spineItemView$$1, spineItemViewContainer];
    };
    return SpineItemViewFactory;
}());
exports.SpineItemViewFactory = SpineItemViewFactory;
});

unwrapExports(spineItemViewFactory);
var spineItemViewFactory_1 = spineItemViewFactory.SpineItemViewFactory;

var layoutView = createCommonjsModule(function (module, exports) {
var __extends = (commonjsGlobal && commonjsGlobal.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __awaiter = (commonjsGlobal && commonjsGlobal.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (commonjsGlobal && commonjsGlobal.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;



var PaginationInfo = /** @class */ (function () {
    function PaginationInfo() {
    }
    return PaginationInfo;
}());
exports.PaginationInfo = PaginationInfo;
var LayoutView = /** @class */ (function (_super) {
    __extends(LayoutView, _super);
    function LayoutView(pub, vs, cvFactory) {
        var _this = _super.call(this) || this;
        _this.spineItemViewStatus = [];
        _this.spineItemViewSizes = [];
        _this.spineItemViewPageCounts = [];
        _this.isViewSettingChanged = false;
        _this.loadedContentRange = [0, 0];
        _this.paginatedRange = [0, 0];
        _this.pageWidth = 600;
        _this.pageHeight = 800;
        _this.isPageSizeChanged = false;
        _this.inViewUpdate = false;
        _this.isVertical = false;
        _this.hasUnknownSizeSpineItemLoading = false;
        _this.isFixedLayout = false;
        _this.zoomOption = types.ZoomOptions.FitByPage;
        _this.zoomScale = 1;
        _this.isRtl = false;
        _this.numOfPagesPerSpread = 0;
        _this.publication = pub;
        _this.vs = vs;
        _this.initSpineItemViews();
        if (_this.publication.metadata.rendition) {
            _this.isFixedLayout = _this.publication.metadata.rendition.layout === 'fixed';
        }
        if (_this.publication.metadata.readingProgression) {
            _this.isRtl = _this.publication.metadata.readingProgression === 'rtl';
        }
        _this.spineItemViewFactory = new spineItemViewFactory.SpineItemViewFactory(pub, _this.isFixedLayout, cvFactory);
        // tslint:disable-next-line:prefer-array-literal
        _this.spineItemViewSizes = new Array(pub.spine.length).fill(-1);
        // tslint:disable-next-line:prefer-array-literal
        _this.spineItemViewPageCounts = new Array(pub.spine.length).fill(-1);
        return _this;
    }
    LayoutView.prototype.reset = function () {
        this.clearLoadedContent();
        this.paginatedRange = [0, 0];
        this.spineItemViewSizes.fill(-1);
        this.spineItemViewPageCounts.fill(-1);
    };
    LayoutView.prototype.getSpineItemView = function (spineItemIndex) {
        for (var _i = 0, _a = this.spineItemViewStatus; _i < _a.length; _i++) {
            var siv = _a[_i];
            if (siv.spineItemIndex === spineItemIndex) {
                return siv.view;
            }
        }
        return undefined;
    };
    LayoutView.prototype.getSpineItemViewOffset = function (spineItemIndex) {
        for (var _i = 0, _a = this.spineItemViewStatus; _i < _a.length; _i++) {
            var siv = _a[_i];
            if (siv.spineItemIndex === spineItemIndex) {
                return siv.offset;
            }
        }
        return undefined;
    };
    // tslint:disable-next-line:no-any
    LayoutView.prototype.isSpineItemVisible = function (siIndex, viewOffset, viewportSize) {
        var viewStatus = this.spineItemViewStatus.find(function (status) {
            return status.spineItemIndex === siIndex;
        });
        if (!viewStatus) {
            return false;
        }
        if (viewStatus.offset + viewStatus.viewSize < viewOffset ||
            viewStatus.offset > viewOffset + viewportSize) {
            return false;
        }
        return true;
    };
    LayoutView.prototype.getOffsetInSpineItemView = function (siIndex, viewOffset) {
        var viewStatus = this.spineItemViewStatus.find(function (status) {
            return status.spineItemIndex === siIndex;
        });
        if (!viewStatus) {
            return undefined;
        }
        return viewOffset - viewStatus.offset;
    };
    LayoutView.prototype.findSpineItemIndexByHref = function (href) {
        return this.publication.findSpineItemIndexByHref(href);
    };
    LayoutView.prototype.isRightToLeft = function () {
        return this.isRtl;
    };
    LayoutView.prototype.setPageSize = function (width, height) {
        this.pageWidth = width;
        this.pageHeight = height;
        if (!this.isVertical) {
            this.layoutRoot.style.height = this.visualPageHeight() + "px";
        }
        else {
            this.layoutRoot.style.width = this.visualPageWidth() + "px";
        }
        this.isPageSizeChanged = true;
        if (!this.inViewUpdate) {
            this.rePaginate();
            this.isPageSizeChanged = false;
        }
    };
    LayoutView.prototype.setNumberOfPagesPerSpread = function (num) {
        this.numOfPagesPerSpread = num;
    };
    LayoutView.prototype.numberOfPagesPerSpread = function () {
        return this.numOfPagesPerSpread;
    };
    LayoutView.prototype.beginViewUpdate = function () {
        this.inViewUpdate = true;
    };
    LayoutView.prototype.endViewUpdate = function () {
        if (!this.inViewUpdate) {
            return;
        }
        this.rePaginate();
        this.inViewUpdate = false;
        this.isViewSettingChanged = false;
        this.isPageSizeChanged = false;
    };
    LayoutView.prototype.updateViewSettings = function () {
        // if (viewSetting.hasOwnProperty('syntheticSpread')) {
        //   delete viewSetting.syntheticSpread;
        // }
        this.isViewSettingChanged = true;
        if (!this.inViewUpdate) {
            this.rePaginate();
            this.isViewSettingChanged = false;
        }
    };
    LayoutView.prototype.setZoom = function (option, scale) {
        if (!this.isFixedLayout) {
            return;
        }
        if (this.zoomOption === option && this.zoomScale === scale) {
            return;
        }
        this.zoomOption = option;
        this.zoomScale = scale;
        this.isPageSizeChanged = true;
        this.rePaginate();
        this.isPageSizeChanged = false;
    };
    LayoutView.prototype.getZoomScale = function () {
        return this.zoomScale;
    };
    LayoutView.prototype.getZoomOption = function () {
        return this.zoomOption;
    };
    LayoutView.prototype.setVerticalLayout = function (v) {
        this.isVertical = v;
        this.spineItemViewFactory.setVerticalLayout(v);
    };
    LayoutView.prototype.isVerticalLayout = function () {
        return this.isVertical;
    };
    LayoutView.prototype.render = function () {
        return;
    };
    LayoutView.prototype.attachToHost = function (host) {
        this.host = host;
        this.host.appendChild(this.layoutRoot);
    };
    LayoutView.prototype.containerElement = function () {
        return this.layoutRoot;
    };
    LayoutView.prototype.hasMoreAfterEnd = function () {
        return this.nextIndexAfterEnd() < this.publication.spine.length;
    };
    LayoutView.prototype.hasMoreBeforeStart = function () {
        return this.nextIndexBeforeStart() >= 0;
    };
    LayoutView.prototype.getLoadedStartPostion = function () {
        return this.loadedContentRange[0];
    };
    LayoutView.prototype.getLoadedEndPosition = function () {
        return this.loadedContentRange[1];
    };
    LayoutView.prototype.isEmpty = function () {
        return this.loadedContentRange[0] === this.loadedContentRange[1];
    };
    LayoutView.prototype.loadedRangeLength = function () {
        return this.loadedContentRange[1] - this.loadedContentRange[0];
    };
    LayoutView.prototype.paginatedLength = function () {
        return this.paginatedRange[1] - this.paginatedRange[0];
    };
    LayoutView.prototype.getPaginationInfoAtOffset = function (offset) {
        var res = [];
        if (offset < this.getLoadedStartPostion() || offset > this.getLoadedEndPosition()) {
            return res;
        }
        for (var _i = 0, _a = this.spineItemViewStatus; _i < _a.length; _i++) {
            var siv = _a[_i];
            if (offset >= siv.offset &&
                offset <= siv.offset + siv.viewSize) {
                res.push({
                    spineItemIndex: siv.spineItemIndex,
                    spineItemPageCount: siv.view.getTotalPageCount(),
                    pageIndex: Math.floor((offset - siv.offset) / this.pageWidth),
                    view: siv.view,
                    offsetInView: offset - siv.offset
                });
            }
        }
        return res;
    };
    LayoutView.prototype.getOffsetFromLocation = function (loc) {
        return __awaiter(this, void 0, void 0, function () {
            var siv, inSpineItemOffset, pageIndexOffset;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getSpineItemViewStatusFromHref(loc.getHref())];
                    case 1:
                        siv = _a.sent();
                        if (!siv) {
                            return [2 /*return*/, undefined];
                        }
                        inSpineItemOffset = 0;
                        if (this.isVertical) {
                            inSpineItemOffset = siv.view.getOffsetFromCfi(loc.getLocation());
                        }
                        else {
                            pageIndexOffset = siv.view.getPageIndexOffsetFromCfi(loc.getLocation());
                            inSpineItemOffset = pageIndexOffset < 0 ? -1 : pageIndexOffset * this.pageWidth;
                        }
                        if (inSpineItemOffset < 0) {
                            return [2 /*return*/, undefined];
                        }
                        return [2 /*return*/, siv.offset + inSpineItemOffset];
                }
            });
        });
    };
    LayoutView.prototype.getOffsetFromAnchor = function (href, elementId) {
        return __awaiter(this, void 0, void 0, function () {
            var siv, inSpineItemOffset, pageIndexOffset;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getSpineItemViewStatusFromHref(href)];
                    case 1:
                        siv = _a.sent();
                        if (!siv) {
                            return [2 /*return*/, undefined];
                        }
                        inSpineItemOffset = 0;
                        if (this.isVertical) {
                            inSpineItemOffset = siv.view.getOffsetFromElementId(elementId);
                        }
                        else {
                            pageIndexOffset = siv.view.getPageIndexOffsetFromElementId(elementId);
                            inSpineItemOffset = pageIndexOffset < 0 ? -1 : pageIndexOffset * this.pageWidth;
                        }
                        if (inSpineItemOffset < 0) {
                            return [2 /*return*/, undefined];
                        }
                        return [2 /*return*/, siv.offset + inSpineItemOffset];
                }
            });
        });
    };
    LayoutView.prototype.getCfiFromAnchor = function (href, elementId) {
        var siv = this.getLoadedSpineItemViewStatusFromHref(href);
        if (!siv) {
            return undefined;
        }
        return siv.view.getCfiFromElementId(elementId);
    };
    LayoutView.prototype.ensureLoaded = function (token) {
        return __awaiter(this, void 0, void 0, function () {
            var _i, _a, siv;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _i = 0, _a = this.spineItemViewStatus;
                        _b.label = 1;
                    case 1:
                        if (!(_i < _a.length)) return [3 /*break*/, 4];
                        siv = _a[_i];
                        return [4 /*yield*/, siv.view.ensureContentLoaded(token)];
                    case 2:
                        _b.sent();
                        if (token && token.isCancelled) {
                            return [3 /*break*/, 4];
                        }
                        _b.label = 3;
                    case 3:
                        _i++;
                        return [3 /*break*/, 1];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    LayoutView.prototype.ensureConentLoadedAtRange = function (start, end, token) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!(end > this.getLoadedEndPosition() && this.hasMoreKnownSizeAfterEnd())) return [3 /*break*/, 2];
                        if (token && token.isCancelled) {
                            return [3 /*break*/, 2];
                        }
                        return [4 /*yield*/, this.loadNewSpineItemAtEnd(token)];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 0];
                    case 2:
                        if (!(start < this.getLoadedStartPostion() && this.hasMoreKnowSizeBeforeStart())) return [3 /*break*/, 4];
                        if (token && token.isCancelled) {
                            return [3 /*break*/, 4];
                        }
                        return [4 /*yield*/, this.loadNewSpineItemAtStart(token)];
                    case 3:
                        _a.sent();
                        return [3 /*break*/, 2];
                    case 4:
                        this.updatePaginatedRange();
                        _a.label = 5;
                    case 5:
                        if (!(end > this.getLoadedEndPosition() && this.hasMoreAfterEnd())) return [3 /*break*/, 7];
                        if (token && token.isCancelled) {
                            return [3 /*break*/, 7];
                        }
                        return [4 /*yield*/, this.loadNewSpineItemAtEnd(token)];
                    case 6:
                        _a.sent();
                        return [3 /*break*/, 5];
                    case 7:
                        if (!(start < this.getLoadedStartPostion() && this.hasMoreBeforeStart())) return [3 /*break*/, 9];
                        if (token && token.isCancelled) {
                            return [3 /*break*/, 9];
                        }
                        return [4 /*yield*/, this.loadNewSpineItemAtStart(token)];
                    case 8:
                        _a.sent();
                        return [3 /*break*/, 7];
                    case 9:
                        this.updatePaginatedRange();
                        return [2 /*return*/];
                }
            });
        });
    };
    LayoutView.prototype.ensureContentLoadedAtSpineItemRange = function (startIndex, endIndex, token) {
        return __awaiter(this, void 0, void 0, function () {
            var isEmpty, existingStartIndex, i, existingEndIndex, i;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (endIndex < 0 || startIndex >= this.publication.spine.length) {
                            return [2 /*return*/];
                        }
                        isEmpty = this.spineItemViewStatus.length === 0;
                        if (!isEmpty) {
                            if (this.startViewStatus().spineItemIndex > endIndex ||
                                this.endViewStatus().spineItemIndex < startIndex) {
                                this.clearLoadedContent();
                                isEmpty = true;
                            }
                        }
                        if (!isEmpty) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.loadNewSpineItemIndexAtEnd(startIndex, token)];
                    case 1:
                        _a.sent();
                        if (token && token.isCancelled) {
                            return [2 /*return*/];
                        }
                        _a.label = 2;
                    case 2:
                        existingStartIndex = this.startViewStatus().spineItemIndex;
                        i = existingStartIndex;
                        _a.label = 3;
                    case 3:
                        if (!(i > startIndex)) return [3 /*break*/, 6];
                        return [4 /*yield*/, this.loadNewSpineItemAtStart(token)];
                    case 4:
                        _a.sent();
                        if (token && token.isCancelled) {
                            return [2 /*return*/];
                        }
                        _a.label = 5;
                    case 5:
                        i = i - 1;
                        return [3 /*break*/, 3];
                    case 6:
                        existingEndIndex = this.endViewStatus().spineItemIndex;
                        i = existingEndIndex;
                        _a.label = 7;
                    case 7:
                        if (!(i < endIndex)) return [3 /*break*/, 10];
                        return [4 /*yield*/, this.loadNewSpineItemAtEnd(token)];
                    case 8:
                        _a.sent();
                        if (token && token.isCancelled) {
                            return [2 /*return*/];
                        }
                        _a.label = 9;
                    case 9:
                        i = i + 1;
                        return [3 /*break*/, 7];
                    case 10: return [2 /*return*/];
                }
            });
        });
    };
    LayoutView.prototype.adjustLoadedConentRangeToPositive = function () {
        if (this.spineItemViewStatus.length === 0) {
            return 0;
        }
        var adj = this.startViewStatus().offset;
        if (adj > 0) {
            return 0;
        }
        this.adjustRange(adj);
        return adj;
    };
    LayoutView.prototype.showOnlySpineItemRange = function (spineItemIndex) {
        var viewStatus;
        for (var _i = 0, _a = this.spineItemViewStatus; _i < _a.length; _i++) {
            var siv = _a[_i];
            if (siv.spineItemIndex === spineItemIndex) {
                viewStatus = siv;
            }
        }
        if (!viewStatus) {
            return;
        }
        var offset = viewStatus.offset;
        this.adjustRange(offset);
        var size = viewStatus.view.getTotalSize(0);
        this.layoutRoot.style.height = size + "px";
        this.layoutRoot.style.overflow = 'hidden';
    };
    LayoutView.prototype.visiblePages = function (start, end) {
        var pageRanges = [];
        for (var _i = 0, _a = this.spineItemViewStatus; _i < _a.length; _i++) {
            var vs = _a[_i];
            if (vs.offset + vs.viewSize < start) {
                continue;
            }
            if (vs.offset > end) {
                break;
            }
            var pageCount = vs.view.getTotalPageCount();
            var pageSize = vs.view.fixedLayout() ? this.spineItemViewSizes[vs.spineItemIndex] :
                vs.view.getPageSize(this.pageWidth);
            for (var i = 1; i <= pageCount; i = i + 1) {
                var pageStart = vs.offset + (i - 1) * pageSize;
                var pageEnd = pageStart + pageSize;
                if (pageStart >= start && pageStart <= end &&
                    pageEnd >= start && pageEnd <= end) {
                    pageRanges.push([pageStart, pageEnd]);
                }
            }
        }
        return pageRanges;
    };
    LayoutView.prototype.arrangeDoublepageSpreads = function (pos) {
        var startPageInfo = this.getPaginationInfoAtOffset(pos);
        if (startPageInfo.length === 0) {
            return undefined;
        }
        var spineItemIndex = startPageInfo[startPageInfo.length - 1].spineItemIndex;
        var firstPage = this.publication.readingOrder[spineItemIndex];
        var firstPageProp;
        if (firstPage.properties) {
            firstPageProp = firstPage.properties.page;
        }
        if (firstPageProp === 'center' || firstPageProp === 'right') {
            return firstPageProp;
        }
        if (spineItemIndex + 1 >= this.publication.readingOrder.length) {
            return firstPageProp;
        }
        var secondPage = this.publication.readingOrder[spineItemIndex + 1];
        var secondPageProp;
        if (secondPage.properties) {
            secondPageProp = secondPage.properties.page;
        }
        if (secondPageProp === 'right') {
            return undefined;
        }
        if (secondPageProp === 'left' || secondPageProp === 'center') {
            if (!firstPageProp) {
                if (spineItemIndex !== 0) {
                    return 'left';
                }
                return 'right';
            }
            return 'left';
        }
        return undefined;
    };
    LayoutView.prototype.removeOutOfRangeSpineItems = function (start, end) {
        var newStart = this.loadedContentRange[1];
        var newEnd = this.loadedContentRange[0];
        var hasAnyRemoved = false;
        for (var _i = 0, _a = this.spineItemViewStatus; _i < _a.length; _i++) {
            var vs = _a[_i];
            var viewEnd = vs.offset + vs.viewSize;
            if (viewEnd < start || vs.offset > end) {
                vs.view.unloadSpineItem();
                if (this.layoutRoot.contains(vs.viewContainer)) {
                    this.layoutRoot.removeChild(vs.viewContainer);
                }
                hasAnyRemoved = true;
            }
            else {
                if (vs.offset < newStart) {
                    newStart = vs.offset;
                }
                if (viewEnd > newEnd) {
                    newEnd = viewEnd;
                }
            }
        }
        if (hasAnyRemoved) {
            if (newStart >= newEnd) {
                this.loadedContentRange = [0, 0];
            }
            else {
                this.loadedContentRange = [newStart, newEnd];
            }
            this.spineItemViewStatus = this.spineItemViewStatus.filter(function (vs) {
                return vs.view.isSpineItemInUse();
            });
        }
    };
    LayoutView.prototype.clearLoadedContent = function () {
        var _this = this;
        this.spineItemViewStatus.forEach(function (v) {
            _this.layoutRoot.removeChild(v.viewContainer);
        });
        this.spineItemViewStatus = [];
        this.loadedContentRange = [0, 0];
    };
    LayoutView.prototype.visualPageWidth = function () {
        return this.pageWidth * this.zoomScale;
    };
    LayoutView.prototype.visualPageHeight = function () {
        return this.pageHeight * this.zoomScale;
    };
    LayoutView.prototype.initSpineItemViews = function () {
        this.layoutRoot = document.createElement('div');
        this.layoutRoot.setAttribute('id', 'layout-view-root');
        this.layoutRoot.style.transform = 'translateX(0px)';
        // this.layoutRoot.style.position = 'absolute';
    };
    LayoutView.prototype.startViewStatus = function () {
        return this.spineItemViewStatus[0];
    };
    LayoutView.prototype.endViewStatus = function () {
        return this.spineItemViewStatus[this.spineItemViewStatus.length - 1];
    };
    LayoutView.prototype.nextIndexAfterEnd = function () {
        var nextIndex = 0;
        if (this.spineItemViewStatus.length > 0) {
            nextIndex = this.endViewStatus().spineItemIndex + 1;
        }
        return nextIndex;
    };
    LayoutView.prototype.nextIndexBeforeStart = function () {
        var nextIndex = 0;
        if (this.spineItemViewStatus.length > 0) {
            nextIndex = this.startViewStatus().spineItemIndex - 1;
        }
        return nextIndex;
    };
    LayoutView.prototype.hasMoreKnownSizeAfterEnd = function () {
        var nextIndex = this.nextIndexAfterEnd();
        return nextIndex < this.spineItemViewSizes.length && this.spineItemViewSizes[nextIndex] > 0;
    };
    LayoutView.prototype.hasMoreKnowSizeBeforeStart = function () {
        var nextIndex = this.nextIndexBeforeStart();
        return nextIndex >= 0 && this.spineItemViewSizes[nextIndex] > 0;
    };
    LayoutView.prototype.rePaginate = function () {
        this.spineItemViewSizes.fill(-1);
        if (this.spineItemViewStatus.length === 0) {
            return;
        }
        var offset = this.startViewStatus().offset;
        this.loadedContentRange[0] = this.paginatedRange[0] = offset;
        for (var _i = 0, _a = this.spineItemViewStatus; _i < _a.length; _i++) {
            var vs = _a[_i];
            if (this.isViewSettingChanged) {
                vs.view.setViewSettings(this.vs);
            }
            if (this.isPageSizeChanged) {
                vs.viewContainer.style.width = this.visualPageWidth() + "px";
                if (!this.isVertical || this.isFixedLayout) {
                    vs.viewContainer.style.height = this.visualPageHeight() + "px";
                }
                vs.view.setZoomOption(this.zoomOption);
                vs.view.resize(this.visualPageWidth(), this.visualPageHeight());
            }
            vs.viewSize = vs.view.getTotalSize(this.pageWidth);
            vs.offset = offset;
            this.postionSpineItemView(vs);
            offset += vs.viewSize;
            this.spineItemViewSizes[vs.spineItemIndex] = vs.viewSize;
            this.spineItemViewPageCounts[vs.spineItemIndex] = vs.view.getTotalPageCount();
        }
        this.loadedContentRange[1] = this.paginatedRange[1] = offset;
        this.updatePaginatedRange();
    };
    LayoutView.prototype.updatePaginatedRange = function () {
        this.paginatedRange[0] = Math.min(this.paginatedRange[0], this.loadedContentRange[0]);
        this.paginatedRange[1] = Math.max(this.paginatedRange[1], this.loadedContentRange[1]);
        if (this.isVertical) {
            this.layoutRoot.style.height = this.paginatedLength() + "px";
        }
        else {
            this.layoutRoot.style.width = this.paginatedLength() + "px";
        }
    };
    LayoutView.prototype.loadNewSpineItemAtEnd = function (token) {
        return __awaiter(this, void 0, void 0, function () {
            var newSpineItemIndex;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this.spineItemViewStatus.length === 0) {
                            newSpineItemIndex = 0;
                        }
                        else {
                            newSpineItemIndex = this.endViewStatus().spineItemIndex + 1;
                        }
                        if (newSpineItemIndex >= this.publication.spine.length) {
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, this.loadNewSpineItemIndexAtEnd(newSpineItemIndex, token)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    LayoutView.prototype.loadNewSpineItemIndexAtEnd = function (index, token) {
        return __awaiter(this, void 0, void 0, function () {
            var newViewStatus;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.loadNewSpineItem(index, token)];
                    case 1:
                        newViewStatus = _a.sent();
                        if (!newViewStatus) {
                            return [2 /*return*/];
                        }
                        newViewStatus.offset = this.spineItemViewStatus.length === 0 ?
                            0 : this.spineItemViewStatus[0].offset;
                        this.spineItemViewStatus.forEach(function (vs) {
                            newViewStatus.offset += vs.viewSize;
                        });
                        this.addNewViewStatus(newViewStatus);
                        this.loadedContentRange[1] = newViewStatus.offset +
                            newViewStatus.viewSize;
                        this.postionSpineItemView(newViewStatus);
                        return [2 /*return*/];
                }
            });
        });
    };
    LayoutView.prototype.loadNewSpineItemAtStart = function (token) {
        return __awaiter(this, void 0, void 0, function () {
            var newSpineItemIndex;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this.spineItemViewStatus.length === 0) {
                            newSpineItemIndex = 0;
                        }
                        else {
                            newSpineItemIndex = this.startViewStatus().spineItemIndex - 1;
                        }
                        if (newSpineItemIndex < 0) {
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, this.loadNewSpineItemIndexAtStart(newSpineItemIndex, token)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    LayoutView.prototype.loadNewSpineItemIndexAtStart = function (index, token) {
        return __awaiter(this, void 0, void 0, function () {
            var newViewStatus;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.loadNewSpineItem(index, token)];
                    case 1:
                        newViewStatus = _a.sent();
                        if (!newViewStatus) {
                            return [2 /*return*/];
                        }
                        newViewStatus.offset = this.spineItemViewStatus.length === 0 ?
                            0 : this.spineItemViewStatus[0].offset;
                        newViewStatus.offset -= newViewStatus.viewSize;
                        this.addNewViewStatus(newViewStatus);
                        this.loadedContentRange[0] = newViewStatus.offset;
                        this.postionSpineItemView(newViewStatus);
                        return [2 /*return*/];
                }
            });
        });
    };
    LayoutView.prototype.loadNewSpineItem = function (index, token) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, spineItemView, spineItemViewContainer, viewLength;
            var _this = this;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (token && token.isCancelled) {
                            return [2 /*return*/, undefined];
                        }
                        _a = this.spineItemViewFactory.createSpineItemView(this.pageWidth, this.pageHeight), spineItemView = _a[0], spineItemViewContainer = _a[1];
                        spineItemView.hide();
                        spineItemViewContainer.setAttribute('id', "spine-item-view-" + index);
                        this.layoutRoot.appendChild(spineItemViewContainer);
                        if (!(this.spineItemViewSizes[index] > 0)) return [3 /*break*/, 1];
                        viewLength = this.spineItemViewSizes[index];
                        spineItemView.setTotalPageCount(this.spineItemViewPageCounts[index]);
                        spineItemView.loadSpineItem(this.publication.spine[index], this.vs, token).then(function () {
                            _this.onSpineItemLoaded(spineItemView);
                        });
                        return [3 /*break*/, 3];
                    case 1:
                        this.hasUnknownSizeSpineItemLoading = true;
                        return [4 /*yield*/, spineItemView.loadSpineItem(this.publication.spine[index], this.vs, token)];
                    case 2:
                        _b.sent();
                        this.hasUnknownSizeSpineItemLoading = false;
                        if (token && token.isCancelled) {
                            console.log("spine item " + index + " cancelled and removed");
                            this.layoutRoot.removeChild(spineItemViewContainer);
                        }
                        else {
                            this.onSpineItemLoaded(spineItemView);
                        }
                        spineItemView.onSelfResize(function () {
                            _this.rePaginate();
                        });
                        viewLength = spineItemView.getTotalSize(this.pageWidth);
                        this.spineItemViewSizes[index] = viewLength;
                        this.spineItemViewPageCounts[index] = spineItemView.getTotalPageCount();
                        _b.label = 3;
                    case 3:
                        if (token && token.isCancelled) {
                            return [2 /*return*/, undefined];
                        }
                        return [2 /*return*/, {
                                offset: 0,
                                viewContainer: spineItemViewContainer,
                                spineItemIndex: index,
                                view: spineItemView,
                                viewSize: viewLength
                            }];
                }
            });
        });
    };
    LayoutView.prototype.onSpineItemLoaded = function (siv) {
        if (siv.fixedLayout()) {
            siv.resizeFixedLayoutPage(this.zoomOption, this.visualPageWidth(), this.visualPageHeight());
        }
    };
    LayoutView.prototype.postionSpineItemView = function (viewStatus) {
        var transformString;
        if (this.isVertical) {
            transformString = "translateY(" + viewStatus.offset + "px)";
        }
        else {
            if (this.isRtl) {
                var offset = -viewStatus.offset - viewStatus.viewSize;
                transformString = "translateX(" + offset + "px)";
            }
            else {
                transformString = "translateX(" + viewStatus.offset + "px)";
            }
        }
        viewStatus.viewContainer.style.transform = transformString;
        viewStatus.view.show();
    };
    LayoutView.prototype.addNewViewStatus = function (vs) {
        this.spineItemViewStatus.push(vs);
        this.spineItemViewStatus.sort(function (a, b) {
            return a.offset - b.offset;
        });
    };
    LayoutView.prototype.getSpineItemViewStatusFromHref = function (href) {
        return __awaiter(this, void 0, void 0, function () {
            var retSiv, siIndex, _i, _a, siv;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        siIndex = this.findSpineItemIndexByHref(href);
                        _i = 0, _a = this.spineItemViewStatus;
                        _b.label = 1;
                    case 1:
                        if (!(_i < _a.length)) return [3 /*break*/, 4];
                        siv = _a[_i];
                        if (!(siIndex === siv.spineItemIndex)) return [3 /*break*/, 3];
                        return [4 /*yield*/, siv.view.ensureContentLoaded()];
                    case 2:
                        _b.sent();
                        retSiv = siv;
                        _b.label = 3;
                    case 3:
                        _i++;
                        return [3 /*break*/, 1];
                    case 4: return [2 /*return*/, retSiv];
                }
            });
        });
    };
    LayoutView.prototype.getLoadedSpineItemViewStatusFromHref = function (href) {
        var retSiv;
        var siIndex = this.findSpineItemIndexByHref(href);
        for (var _i = 0, _a = this.spineItemViewStatus; _i < _a.length; _i++) {
            var siv = _a[_i];
            if (siIndex === siv.spineItemIndex) {
                if (siv.view.isContentLoaded()) {
                    retSiv = siv;
                }
                else {
                    break;
                }
            }
        }
        return retSiv;
    };
    LayoutView.prototype.adjustRange = function (adj) {
        for (var _i = 0, _a = this.spineItemViewStatus; _i < _a.length; _i++) {
            var vs = _a[_i];
            vs.offset -= adj;
            this.postionSpineItemView(vs);
        }
        this.loadedContentRange[0] -= adj;
        this.loadedContentRange[1] -= adj;
        this.paginatedRange[0] -= adj;
        this.paginatedRange[1] -= adj;
    };
    return LayoutView;
}(view.View));
exports.LayoutView = LayoutView;
});

unwrapExports(layoutView);
var layoutView_1 = layoutView.PaginationInfo;
var layoutView_2 = layoutView.LayoutView;

var viewSettings = createCommonjsModule(function (module, exports) {
exports.__esModule = true;

function stringConverter(value) {
    return value;
}
function percentConverter(value) {
    return value + "%";
}
var READIUM_CSS_VAR_MAP = new Map([
    [types.SettingName.FontSize, { name: '--USER__fontSize', converter: percentConverter }],
    [types.SettingName.FontFamily, { name: '--USER__fontFamily', converter: stringConverter }],
    [types.SettingName.ReadingMode, { name: '--USER__appearance', converter: stringConverter }],
    [types.SettingName.TextColor, { name: '--USER__textColor', converter: stringConverter }],
    [types.SettingName.BackgroundColor, { name: '--USER__backgroundColor', converter: stringConverter }],
    [types.SettingName.FontOverride, { name: '--USER__fontOverride', converter: stringConverter }],
]);
var ViewSettings = /** @class */ (function () {
    function ViewSettings() {
        // tslint:disable-next-line:no-any
        this.settings = new Map();
    }
    ViewSettings.prototype.getAllSettings = function () {
        var ret = [];
        this.settings.forEach(function (value, name) {
            ret.push({ name: name, value: value });
        });
        return ret;
    };
    ViewSettings.prototype.updateSetting = function (newSettings) {
        for (var _i = 0, newSettings_1 = newSettings; _i < newSettings_1.length; _i++) {
            var s = newSettings_1[_i];
            this.settings.set(s.name, s.value);
        }
    };
    ViewSettings.prototype.updateView = function (view) {
        var _this = this;
        this.settings.forEach(function (val, name) {
            _this.setCss(view, name, val);
        });
    };
    ViewSettings.prototype.getSetting = function (name) {
        var val = this.settings.get(name);
        if (val === undefined) {
            return undefined;
        }
        return (val);
    };
    ViewSettings.prototype.getSettingWithDefaultValue = function (name, defaultVal) {
        var val = this.settings.get(name);
        if (val === undefined) {
            return defaultVal;
        }
        return (val);
    };
    // tslint:disable-next-line:no-any
    ViewSettings.prototype.setCss = function (view, varName, varVal) {
        var cssConverter = READIUM_CSS_VAR_MAP.get(varName);
        if (cssConverter) {
            view.style.setProperty(cssConverter.name, cssConverter.converter(varVal));
        }
    };
    return ViewSettings;
}());
exports.ViewSettings = ViewSettings;
});

unwrapExports(viewSettings);
var viewSettings_1 = viewSettings.ViewSettings;

var viewport = createCommonjsModule(function (module, exports) {
var __awaiter = (commonjsGlobal && commonjsGlobal.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (commonjsGlobal && commonjsGlobal.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;

var ScrollMode;
(function (ScrollMode) {
    ScrollMode[ScrollMode["None"] = 0] = "None";
    ScrollMode[ScrollMode["Publication"] = 1] = "Publication";
    ScrollMode[ScrollMode["SpineItem"] = 2] = "SpineItem";
})(ScrollMode = exports.ScrollMode || (exports.ScrollMode = {}));
var Viewport = /** @class */ (function () {
    function Viewport(root) {
        this.prefetchSize = 0;
        this.visibleViewportSize = 0;
        this.scrollMode = ScrollMode.None;
        this.scrollFromInternal = false;
        this.visiblePagesReadyCallbacks = [];
        this.locationChangedCallbacks = [];
        this.root = root;
        this.nextScreen = this.nextScreen.bind(this);
        this.prevScreen = this.prevScreen.bind(this);
        this.nextSpineItem = this.nextSpineItem.bind(this);
        this.prevSpineItem = this.prevSpineItem.bind(this);
        this.init();
        this.bindEvents();
    }
    Viewport.prototype.addLocationChangedListener = function (callback) {
        this.locationChangedCallbacks.push(callback);
    };
    Viewport.prototype.setView = function (v) {
        this.bookView = v;
        this.bookView.attachToHost(this.clipContatiner);
    };
    Viewport.prototype.reset = function () {
        this.startPos = undefined;
        this.endPos = undefined;
    };
    Viewport.prototype.setScrollMode = function (mode) {
        this.root.style.overflowX = 'hidden';
        this.root.style.overflowY = 'hidden';
        // tslint:disable-next-line:no-any
        this.root.style.webkitOverflowScrolling = 'auto';
        // disable scrolling with rtl books for now
        if (this.bookView && this.bookView.isRightToLeft() && !this.bookView.isVerticalLayout()) {
            return;
        }
        this.scrollMode = mode;
        if (this.scrollMode === ScrollMode.Publication || this.scrollMode === ScrollMode.SpineItem) {
            if (this.bookView.isVerticalLayout()) {
                this.root.style.overflowY = 'scroll';
            }
            else {
                this.root.style.overflowX = 'scroll';
            }
            // tslint:disable-next-line:no-any
            this.root.style.webkitOverflowScrolling = 'touch';
        }
    };
    Viewport.prototype.setViewportSize = function (size, size2nd) {
        this.viewportSize = size;
        this.viewportSize2nd = size2nd;
        this.visibleViewportSize = this.viewportSize;
        if (this.bookView) {
            if (this.bookView.isVerticalLayout()) {
                this.root.style.width = this.viewportSize2nd + "px";
                this.root.style.height = this.viewportSize + "px";
            }
            else {
                this.root.style.width = this.visibleViewportSize + "px";
                this.root.style.height = this.viewportSize2nd * this.bookView.getZoomScale() + "px";
            }
            this.clipContatiner.style.width = this.root.style.width;
            this.clipContatiner.style.height = this.root.style.height;
        }
    };
    Viewport.prototype.getViewportSize = function () {
        return this.viewportSize;
    };
    Viewport.prototype.getViewportSize2nd = function () {
        return this.viewportSize2nd;
    };
    Viewport.prototype.setPrefetchSize = function (size) {
        this.prefetchSize = size;
    };
    Viewport.prototype.getStartPosition = function () {
        return this.startPos;
    };
    Viewport.prototype.getEndPosition = function () {
        return this.endPos;
    };
    Viewport.prototype.renderAtOffset = function (pos, token) {
        return __awaiter(this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        this.scrollFromInternal = true;
                        // this.viewOffset = pos;
                        // this.render();
                        _a = this;
                        return [4 /*yield*/, this.ensureViewportFilledAtPosition(pos, token)];
                    case 1:
                        // this.viewOffset = pos;
                        // this.render();
                        _a.viewOffset = _b.sent();
                        this.adjustScrollPosition();
                        this.updatePositions();
                        this.scrollFromInternal = false;
                        // This call is important since the viewoffset and
                        // scroller position may out of sync if additonal
                        // spine item is loaded
                        this.render();
                        if (token && token.isCancelled) {
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, this.onPagesReady(token)];
                    case 2:
                        _b.sent();
                        if (token && token.isCancelled) {
                            return [2 /*return*/];
                        }
                        this.onLocationChanged();
                        return [4 /*yield*/, this.updatePrefetch(token)];
                    case 3:
                        _b.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    Viewport.prototype.renderAtSpineItem = function (spineItemIndex, token) {
        return __awaiter(this, void 0, void 0, function () {
            var pos, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, this.ensureContentLoadedAtSpineItemRange(spineItemIndex, spineItemIndex, token)];
                    case 1:
                        _b.sent();
                        if (token && token.isCancelled) {
                            return [2 /*return*/];
                        }
                        pos = this.bookView.getSpineItemViewOffset(spineItemIndex);
                        if (pos === undefined) {
                            return [2 /*return*/];
                        }
                        _a = this;
                        return [4 /*yield*/, this.ensureViewportFilledAtPosition(pos, token)];
                    case 2:
                        _a.viewOffset = _b.sent();
                        this.adjustScrollPosition();
                        this.render();
                        if (token && token.isCancelled) {
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, this.onPagesReady(token)];
                    case 3:
                        _b.sent();
                        if (token && token.isCancelled) {
                            return [2 /*return*/];
                        }
                        this.onLocationChanged();
                        return [4 /*yield*/, this.updatePrefetch(token)];
                    case 4:
                        _b.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    Viewport.prototype.renderAtLocation = function (loc, token) {
        return __awaiter(this, void 0, void 0, function () {
            var spineItemIndex, offset, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        spineItemIndex = this.bookView.findSpineItemIndexByHref(loc.getHref());
                        if (spineItemIndex < 0) {
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, this.ensureContentLoadedAtSpineItemRange(spineItemIndex, spineItemIndex, token)];
                    case 1:
                        _b.sent();
                        if (token && token.isCancelled) {
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, this.bookView.getOffsetFromLocation(loc)];
                    case 2:
                        offset = _b.sent();
                        if (offset === undefined) {
                            return [2 /*return*/];
                        }
                        _a = this;
                        return [4 /*yield*/, this.ensureViewportFilledAtPosition(offset, token)];
                    case 3:
                        _a.viewOffset = _b.sent();
                        this.adjustScrollPosition();
                        this.render();
                        if (token && token.isCancelled) {
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, this.onPagesReady(token)];
                    case 4:
                        _b.sent();
                        if (token && token.isCancelled) {
                            return [2 /*return*/];
                        }
                        this.onLocationChanged();
                        return [4 /*yield*/, this.updatePrefetch(token)];
                    case 5:
                        _b.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    Viewport.prototype.renderAtAnchorLocation = function (href, eleId, token) {
        return __awaiter(this, void 0, void 0, function () {
            var spineItemIndex, offset, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        spineItemIndex = this.bookView.findSpineItemIndexByHref(href);
                        if (spineItemIndex < 0) {
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, this.ensureContentLoadedAtSpineItemRange(spineItemIndex, spineItemIndex, token)];
                    case 1:
                        _b.sent();
                        if (token && token.isCancelled) {
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, this.bookView.getOffsetFromAnchor(href, eleId)];
                    case 2:
                        offset = _b.sent();
                        if (offset === undefined) {
                            return [2 /*return*/];
                        }
                        _a = this;
                        return [4 /*yield*/, this.ensureViewportFilledAtPosition(offset)];
                    case 3:
                        _a.viewOffset = _b.sent();
                        this.adjustScrollPosition();
                        this.render();
                        if (token && token.isCancelled) {
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, this.onPagesReady(token)];
                    case 4:
                        _b.sent();
                        if (token && token.isCancelled) {
                            return [2 /*return*/];
                        }
                        this.onLocationChanged();
                        return [4 /*yield*/, this.updatePrefetch(token)];
                    case 5:
                        _b.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    Viewport.prototype.nextScreen = function (token) {
        return __awaiter(this, void 0, void 0, function () {
            var newPos, loadedEndPos;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        newPos = this.viewOffset + this.visibleViewportSize;
                        loadedEndPos = this.bookView.getLoadedEndPosition();
                        if (newPos >= loadedEndPos && !this.bookView.hasMoreAfterEnd()) {
                            return [2 /*return*/];
                        }
                        if (!(newPos !== this.viewOffset &&
                            (newPos <= loadedEndPos || this.bookView.hasMoreAfterEnd()))) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.renderAtOffset(this.viewOffset + this.visibleViewportSize, token)];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2: return [2 /*return*/];
                }
            });
        });
    };
    Viewport.prototype.prevScreen = function (token) {
        return __awaiter(this, void 0, void 0, function () {
            var newPos, loadedStartPos;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        newPos = this.viewOffset - this.getScaledViewportSize();
                        loadedStartPos = this.bookView.getLoadedStartPostion();
                        // Ensure not to go beyond begining of the book
                        if (newPos < loadedStartPos && !this.bookView.hasMoreBeforeStart()) {
                            newPos = loadedStartPos;
                        }
                        if (!(newPos !== this.viewOffset &&
                            (newPos >= loadedStartPos || this.bookView.hasMoreBeforeStart()))) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.renderAtOffset(newPos, token)];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2: return [2 /*return*/];
                }
            });
        });
    };
    Viewport.prototype.nextSpineItem = function (token) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this.startPos === undefined) {
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, this.renderAtSpineItem(this.startPos.spineItemIndex + 1, token)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    Viewport.prototype.prevSpineItem = function (token) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this.startPos === undefined) {
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, this.renderAtSpineItem(this.startPos.spineItemIndex - 1, token)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    Viewport.prototype.ensureLoaded = function (token) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.bookView.ensureLoaded(token)];
                    case 1:
                        _a.sent();
                        this.updatePositions();
                        return [2 /*return*/];
                }
            });
        });
    };
    Viewport.prototype.visibleSpineItemIndexRange = function () {
        var indices = [];
        var startPageInfo = this.bookView.getPaginationInfoAtOffset(this.viewOffset);
        if (startPageInfo.length === 0) {
            return indices;
        }
        var pos = this.getEndOffset();
        var endPageInfo = this.bookView.getPaginationInfoAtOffset(pos);
        if (endPageInfo.length === 0) {
            return indices;
        }
        indices.push(startPageInfo[startPageInfo.length - 1].spineItemIndex);
        indices.push(endPageInfo[0].spineItemIndex);
        return indices;
    };
    Viewport.prototype.getSpineItemView = function (spineItemIndex) {
        return this.bookView.getSpineItemView(spineItemIndex);
    };
    Viewport.prototype.getOffsetInSpineItemView = function (siIndex) {
        return this.bookView.getOffsetInSpineItemView(siIndex, this.viewOffset);
    };
    Viewport.prototype.onVisiblePagesReady = function (callback) {
        this.visiblePagesReadyCallbacks.push(callback);
    };
    Viewport.prototype.getViewScale = function (siIndex) {
        var view = this.bookView.getSpineItemView(siIndex);
        if (!view) {
            return 1;
        }
        return view.getScale();
    };
    Viewport.prototype.beginViewUpdate = function () {
        this.bookView.beginViewUpdate();
    };
    Viewport.prototype.endViewUpdate = function () {
        this.bookView.endViewUpdate();
    };
    Viewport.prototype.onLocationChanged = function () {
        this.locationChangedCallbacks.forEach(function (eventCb) { return eventCb(); });
    };
    Viewport.prototype.init = function () {
        this.clipContatiner = document.createElement('div');
        this.clipContatiner.id = 'viewport-clipper';
        this.clipContatiner.style.position = 'absolute';
        this.clipContatiner.style.overflowX = 'hidden';
        this.clipContatiner.style.overflowY = 'hidden';
        this.root.appendChild(this.clipContatiner);
    };
    Viewport.prototype.bindEvents = function () {
        var _this = this;
        this.root.addEventListener('scroll', function (e) { return __awaiter(_this, void 0, void 0, function () {
            var start, end;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this.scrollMode === ScrollMode.None || this.scrollFromInternal) {
                            return [2 /*return*/];
                        }
                        this.viewOffset = this.scrollOffset();
                        if (!(this.scrollMode === ScrollMode.Publication)) return [3 /*break*/, 3];
                        start = this.viewOffset - this.prefetchSize;
                        end = this.viewOffset + this.viewportSize + this.prefetchSize;
                        if (!((end >= this.bookView.getLoadedEndPosition() && this.bookView.hasMoreAfterEnd()) ||
                            (start <= this.bookView.getLoadedStartPostion() && this.bookView.hasMoreBeforeStart()))) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.ensureConentLoadedAtRange(start, end)];
                    case 1:
                        _a.sent();
                        this.adjustScrollPosition();
                        return [4 /*yield*/, this.onPagesReady(this.scrollRequestToken)];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3:
                        this.render();
                        return [2 /*return*/];
                }
            });
        }); });
    };
    Viewport.prototype.ensureConentLoadedAtRange = function (start, end) {
        return __awaiter(this, void 0, void 0, function () {
            var t;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this.scrollRequestToken) {
                            this.scrollRequestToken.isCancelled = true;
                        }
                        this.scrollRequestToken = new types.CancellationToken();
                        t = this.scrollRequestToken;
                        return [4 /*yield*/, this.bookView.ensureConentLoadedAtRange(start, end, t)];
                    case 1:
                        _a.sent();
                        if (this.scrollRequestToken === t) {
                            this.scrollRequestToken = undefined;
                        }
                        if (!!t.isCancelled) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.bookView.removeOutOfRangeSpineItems(start, end)];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    Viewport.prototype.updatePrefetch = function (token) {
        return __awaiter(this, void 0, void 0, function () {
            var start, end;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        start = this.viewOffset - this.prefetchSize;
                        end = this.viewOffset + this.getScaledViewportSize() + this.prefetchSize;
                        this.bookView.removeOutOfRangeSpineItems(start, end);
                        return [4 /*yield*/, this.bookView.ensureConentLoadedAtRange(start, end, token)];
                    case 1:
                        _a.sent();
                        this.updatePositions();
                        if (this.scrollMode === ScrollMode.SpineItem) {
                            this.showOnlyCurrentSpineItemRange();
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    Viewport.prototype.updatePositions = function () {
        var startInfo = this.bookView.getPaginationInfoAtOffset(this.viewOffset);
        if (startInfo.length > 0) {
            this.startPos = startInfo[startInfo.length - 1];
        }
        else {
            this.startPos = undefined;
        }
        var endPos = this.getEndOffset();
        var endInfo = this.bookView.getPaginationInfoAtOffset(endPos);
        if (endInfo.length > 0) {
            this.endPos = endInfo[0];
        }
        else {
            this.endPos = undefined;
        }
    };
    Viewport.prototype.adjustScrollPosition = function () {
        if (this.scrollMode !== ScrollMode.Publication) {
            return;
        }
        this.scrollFromInternal = true;
        var adjustment = this.bookView.adjustLoadedConentRangeToPositive();
        this.scrollFromInternal = false;
        if (adjustment === 0) {
            return;
        }
        this.viewOffset -= adjustment;
    };
    Viewport.prototype.render = function () {
        var containerElement = this.bookView.containerElement();
        if (this.scrollMode === ScrollMode.None) {
            var transformString = void 0;
            if (this.bookView.isVerticalLayout()) {
                transformString = "translateY(" + -this.viewOffset + "px)";
            }
            else {
                if (this.bookView.isRightToLeft()) {
                    var offset = this.getEndOffset();
                    transformString = "translateX(" + offset + "px)";
                }
                else {
                    transformString = "translateX(" + -this.viewOffset + "px)";
                }
            }
            containerElement.style.transform = transformString;
        }
        else {
            containerElement.style.transform = 'translateX(0)';
            this.updateScrollFromViewOffset();
        }
        this.updatePositions();
    };
    Viewport.prototype.scrollOffset = function () {
        return this.bookView.isVerticalLayout() ? this.root.scrollTop : this.root.scrollLeft;
    };
    Viewport.prototype.updateScrollFromViewOffset = function () {
        if (this.bookView.isVerticalLayout()) {
            this.root.scrollTop = this.viewOffset;
        }
        else {
            this.root.scrollLeft = this.viewOffset;
        }
    };
    Viewport.prototype.ensureViewportFilledAtPosition = function (pos, token) {
        return __awaiter(this, void 0, void 0, function () {
            var start, end, newPos;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        start = pos - this.prefetchSize;
                        end = pos + this.getScaledViewportSize() + this.prefetchSize;
                        return [4 /*yield*/, this.bookView.ensureConentLoadedAtRange(start, end, token)];
                    case 1:
                        _a.sent();
                        if (token && token.isCancelled) {
                            return [2 /*return*/, pos];
                        }
                        newPos = pos;
                        if (this.scrollMode === ScrollMode.None) {
                            newPos = this.clipToVisibleRange(pos, pos + this.getScaledViewportSize());
                        }
                        this.updatePositions();
                        if (this.scrollMode === ScrollMode.SpineItem) {
                            this.showOnlyCurrentSpineItemRange();
                        }
                        return [2 /*return*/, newPos];
                }
            });
        });
    };
    Viewport.prototype.ensureContentLoadedAtSpineItemRange = function (startIndex, endIndex, token) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.reset();
                        return [4 /*yield*/, this.bookView.ensureContentLoadedAtSpineItemRange(startIndex, endIndex, token)];
                    case 1:
                        _a.sent();
                        if (token && token.isCancelled) {
                            return [2 /*return*/];
                        }
                        if (this.scrollMode === ScrollMode.SpineItem) {
                            this.bookView.showOnlySpineItemRange(startIndex);
                            this.viewOffset = 0;
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    Viewport.prototype.showOnlyCurrentSpineItemRange = function () {
        if (!this.startPos) {
            return;
        }
        this.bookView.showOnlySpineItemRange(this.startPos.spineItemIndex);
    };
    Viewport.prototype.clipToVisibleRange = function (start, end) {
        var _this = this;
        var _a;
        var numOfPagePerSpread = this.bookView.numberOfPagesPerSpread();
        if (numOfPagePerSpread < 1) {
            return start;
        }
        if (numOfPagePerSpread === 2) {
            var doublepageSpreadLayout = this.bookView.arrangeDoublepageSpreads(start);
            this.clipContatiner.style.right = '';
            if (doublepageSpreadLayout) {
                if (doublepageSpreadLayout === 'right') {
                    this.clipContatiner.style.right = '0';
                }
                numOfPagePerSpread = 1;
            }
        }
        var pageRanges = this.bookView.visiblePages(start, end);
        if (pageRanges.length < numOfPagePerSpread) {
            return start;
        }
        pageRanges.sort(function (page1, page2) {
            var page1Dist = Math.min(Math.abs(_this.viewOffset - page1[0]), Math.abs(_this.viewOffset - page1[1]));
            var page2Dist = Math.min(Math.abs(_this.viewOffset - page2[0]), Math.abs(_this.viewOffset - page2[1]));
            return page1Dist - page2Dist;
        });
        var spreadPages = pageRanges.slice(0, numOfPagePerSpread);
        var firstPage = spreadPages[0];
        var lastPage = spreadPages[spreadPages.length - 1];
        if (lastPage[0] < firstPage[0]) {
            _a = [lastPage, firstPage], firstPage = _a[0], lastPage = _a[1];
        }
        this.visibleViewportSize = lastPage[1] - firstPage[0];
        this.clipContatiner.style.width = this.visibleViewportSize + "px";
        this.clipContatiner.style.height = this.viewportSize2nd * this.bookView.getZoomScale() + "px";
        return firstPage[0];
    };
    Viewport.prototype.getScaledViewportSize = function () {
        return this.viewportSize * this.bookView.getZoomScale();
    };
    Viewport.prototype.getEndOffset = function () {
        return this.viewOffset + this.getScaledViewportSize();
    };
    Viewport.prototype.onPagesReady = function (token) {
        return __awaiter(this, void 0, void 0, function () {
            var pageInfo, contentView, _i, _a, callback;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: 
                    // Make sure all spine items are loaded so all CONTENT_DOCUMENT_LOADED
                    // have been emitted
                    return [4 /*yield*/, this.bookView.ensureLoaded(token)];
                    case 1:
                        // Make sure all spine items are loaded so all CONTENT_DOCUMENT_LOADED
                        // have been emitted
                        _b.sent();
                        if (token && token.isCancelled) {
                            return [2 /*return*/];
                        }
                        pageInfo = this.bookView.getPaginationInfoAtOffset(this.viewOffset);
                        if (pageInfo.length === 0) {
                            return [2 /*return*/];
                        }
                        contentView = pageInfo[0].view.getContentView();
                        for (_i = 0, _a = this.visiblePagesReadyCallbacks; _i < _a.length; _i++) {
                            callback = _a[_i];
                            callback(contentView);
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    return Viewport;
}());
exports.Viewport = Viewport;
});

unwrapExports(viewport);
var viewport_1 = viewport.ScrollMode;
var viewport_2 = viewport.Viewport;

var rendition = createCommonjsModule(function (module, exports) {
exports.__esModule = true;




var SpreadMode;
(function (SpreadMode) {
    SpreadMode[SpreadMode["Freeform"] = 0] = "Freeform";
    SpreadMode[SpreadMode["FitViewportAuto"] = 1] = "FitViewportAuto";
    SpreadMode[SpreadMode["FitViewportSingleSpread"] = 2] = "FitViewportSingleSpread";
    SpreadMode[SpreadMode["FitViewportDoubleSpread"] = 3] = "FitViewportDoubleSpread";
})(SpreadMode = exports.SpreadMode || (exports.SpreadMode = {}));
var Rendition = /** @class */ (function () {
    function Rendition(pub, viewport$$1, cvFactory) {
        this.spreadMode = SpreadMode.FitViewportAuto;
        this.numOfPagesPerSpread = 0;
        this.viewAsVertical = false;
        this.vs = new viewSettings.ViewSettings();
        this.pub = pub;
        this.viewport = new viewport.Viewport(viewport$$1);
        this.contentViewFactory = cvFactory;
        this.initDefaultViewSettings();
    }
    Rendition.prototype.reset = function () {
        if (this.bookView) {
            this.bookView.reset();
        }
        this.viewport.reset();
    };
    Rendition.prototype.setPageLayout = function (layoutSetting) {
        var spreadMode = layoutSetting.spreadMode;
        var viewportSize = this.viewport.getViewportSize();
        var pageWidth = this.viewAsVertical ? this.viewport.getViewportSize2nd() : viewportSize;
        var pageHeight = this.viewAsVertical ? viewportSize : this.viewport.getViewportSize2nd();
        var maxColWidth = this.vs.getSettingWithDefaultValue(types.SettingName.MaxColumnWidth, 700);
        var minColWidth = this.vs.getSettingWithDefaultValue(types.SettingName.MinColumnWidth, 400);
        var colGap = this.vs.getSettingWithDefaultValue(types.SettingName.ColumnGap, 0);
        var maxPageWidth = maxColWidth + colGap;
        var minPageWidth = minColWidth + colGap;
        var numOfPagesPerSpread = 1;
        if (spreadMode === SpreadMode.Freeform) {
            numOfPagesPerSpread = 0;
            if (layoutSetting.pageWidth && layoutSetting.pageHeight) {
                pageWidth = layoutSetting.pageWidth;
                pageHeight = layoutSetting.pageHeight;
            }
            else {
                console.warn('Missing page width or height for freeform layout');
            }
        }
        else if (spreadMode === SpreadMode.FitViewportAuto) {
            if (viewportSize > minPageWidth * 2) {
                if (this.viewAsVertical) {
                    pageHeight = viewportSize / 2;
                }
                else {
                    pageWidth = Math.min(viewportSize / 2, maxPageWidth);
                }
                numOfPagesPerSpread = 2;
            }
        }
        else if (spreadMode === SpreadMode.FitViewportDoubleSpread) {
            if (this.viewAsVertical) {
                pageHeight = viewportSize / 2;
            }
            else {
                pageWidth = Math.min(viewportSize / 2, maxPageWidth);
            }
            numOfPagesPerSpread = 2;
        }
        else if (spreadMode === SpreadMode.FitViewportSingleSpread) {
            pageWidth = Math.min(viewportSize, maxPageWidth);
        }
        this.spreadMode = spreadMode;
        this.numOfPagesPerSpread = numOfPagesPerSpread;
        if (this.bookView) {
            this.bookView.setNumberOfPagesPerSpread(numOfPagesPerSpread);
        }
        this.setPageSize(pageWidth, pageHeight);
    };
    Rendition.prototype.refreshPageLayout = function () {
        if (this.spreadMode === SpreadMode.Freeform) {
            return;
        }
        this.setPageLayout({ spreadMode: this.spreadMode });
    };
    Rendition.prototype.updateViewSettings = function (settings) {
        this.vs.updateSetting(settings);
        var spreadMode = null;
        for (var _i = 0, settings_1 = settings; _i < settings_1.length; _i++) {
            var s = settings_1[_i];
            if (s.name === types.SettingName.SpreadMode) {
                spreadMode = this.stringToSpreadMode(s.value);
                if (!spreadMode && spreadMode === this.spreadMode) {
                    spreadMode = null;
                }
            }
        }
        if (this.bookView) {
            this.bookView.beginViewUpdate();
        }
        if (spreadMode !== null) {
            this.setPageLayout({ spreadMode: spreadMode });
        }
        if (this.bookView) {
            this.bookView.updateViewSettings();
            this.bookView.endViewUpdate();
        }
    };
    Rendition.prototype.viewSettings = function () {
        return this.vs;
    };
    Rendition.prototype.setZoom = function (option, scale) {
        if (this.bookView) {
            this.bookView.setZoom(option, scale);
        }
    };
    Rendition.prototype.getZoomScale = function () {
        if (this.bookView) {
            return this.bookView.getZoomScale();
        }
        return 1;
    };
    Rendition.prototype.getZoomOption = function () {
        if (this.bookView) {
            return this.bookView.getZoomOption();
        }
        return types.ZoomOptions.FitByPage;
    };
    Rendition.prototype.setViewAsVertical = function (v) {
        this.viewAsVertical = v;
        if (this.bookView) {
            this.bookView.setVerticalLayout(v);
        }
    };
    Rendition.prototype.getPageWidth = function () {
        return this.pageWidth;
    };
    Rendition.prototype.getPublication = function () {
        return this.pub;
    };
    Rendition.prototype.getCfiFromAnchor = function (href, elementId) {
        if (!this.bookView) {
            return undefined;
        }
        return this.bookView.getCfiFromAnchor(href, elementId);
    };
    // // tslint:disable-next-line:no-any
    // public getReadiumPackageDocument(): any {
    //   return this.bookView.getRsjPackageDocument();
    // }
    // // tslint:disable-next-line:no-any
    // public getReadiumPackage(): any {
    //   return this.bookView.getRsjPackage();
    // }
    Rendition.prototype.render = function () {
        this.bookView = new layoutView.LayoutView(this.pub, this.vs, this.contentViewFactory);
        this.bookView.setVerticalLayout(this.viewAsVertical);
        this.bookView.setPageSize(this.pageWidth, this.pageHeight);
        this.bookView.setNumberOfPagesPerSpread(this.numOfPagesPerSpread);
        this.viewport.setView(this.bookView);
        return Promise.resolve();
    };
    Rendition.prototype.initDefaultViewSettings = function () {
        var columnGapSetting = { name: types.SettingName.ColumnGap, value: 20 };
        this.vs.updateSetting([columnGapSetting]);
    };
    Rendition.prototype.setPageSize = function (pageWidth, pageHeight) {
        this.pageWidth = pageWidth;
        this.pageHeight = pageHeight;
        if (this.bookView) {
            this.bookView.setPageSize(this.pageWidth, this.pageHeight);
        }
    };
    Rendition.prototype.stringToSpreadMode = function (val) {
        var mode = null;
        if (val === 'auto') {
            mode = SpreadMode.FitViewportAuto;
        }
        else if (val === 'single') {
            mode = SpreadMode.FitViewportSingleSpread;
        }
        else if (val === 'double') {
            mode = SpreadMode.FitViewportDoubleSpread;
        }
        return mode;
    };
    return Rendition;
}());
exports.Rendition = Rendition;
});

unwrapExports(rendition);
var rendition_1 = rendition.SpreadMode;
var rendition_2 = rendition.Rendition;

var rect = createCommonjsModule(function (module, exports) {
exports.__esModule = true;
var Rect = /** @class */ (function () {
    function Rect(left, top, right, bottom) {
        this.left = left;
        this.top = top;
        this.right = right;
        this.bottom = bottom;
    }
    Rect.fromDOMRect = function (r) {
        return new Rect(r.left, r.top, r.right, r.bottom);
    };
    Rect.prototype.width = function () {
        return this.right - this.left;
    };
    Rect.prototype.height = function () {
        return this.bottom - this.top;
    };
    Rect.prototype.intersect = function (r) {
        return this.overlapHorizontal(r) && this.overlapVertical(r);
    };
    Rect.prototype.overlapHorizontal = function (rect) {
        if (this.right <= rect.left || this.left >= rect.right) {
            return false;
        }
        return true;
    };
    Rect.prototype.overlapVertical = function (rect) {
        if (this.bottom <= rect.top || this.top >= rect.bottom) {
            return false;
        }
        return true;
    };
    Rect.prototype.horizontalOverlap = function (rect) {
        var maxLeft = Math.max(this.left, rect.left);
        var minRight = Math.min(this.right, rect.right);
        var length = minRight - maxLeft;
        return length < 0 ? 0 : length;
    };
    Rect.prototype.verticalOverlaop = function (rect) {
        var maxTop = Math.max(this.top, rect.top);
        var minBottom = Math.min(this.bottom, rect.bottom);
        var length = minBottom - maxTop;
        return length < 0 ? 0 : length;
    };
    return Rect;
}());
exports.Rect = Rect;
});

unwrapExports(rect);
var rect_1 = rect.Rect;

var elementChecker = createCommonjsModule(function (module, exports) {
exports.__esModule = true;

var ElementBlacklistedChecker = /** @class */ (function () {
    function ElementBlacklistedChecker(clsList, idList, eleList) {
        this.classBlacklist = clsList;
        this.idBlacklist = idList;
        this.elementBlacklist = eleList;
    }
    ElementBlacklistedChecker.prototype.getClassBlacklist = function () {
        return this.classBlacklist;
    };
    ElementBlacklistedChecker.prototype.getIdBlacklist = function () {
        return this.idBlacklist;
    };
    ElementBlacklistedChecker.prototype.getElementBlacklist = function () {
        return this.elementBlacklist;
    };
    ElementBlacklistedChecker.prototype.isElementBlacklisted = function (node) {
        var _this = this;
        if (!node || node.nodeType !== Node.ELEMENT_NODE) {
            return false;
        }
        var element = node;
        var clsAttr = element.getAttribute('class');
        var classList = clsAttr ? clsAttr.split(' ') : [];
        classList.forEach(function (cls) {
            if (_this.classBlacklist.indexOf(cls) >= 0) {
                return true;
            }
        });
        var id = element.id;
        if (id && id.length > 0 && this.idBlacklist.indexOf(id) >= 0) {
            return true;
        }
        var eleName = element.tagName.toLowerCase();
        if (this.elementBlacklist.indexOf(eleName) >= 0) {
            return true;
        }
        return false;
    };
    return ElementBlacklistedChecker;
}());
exports.ElementBlacklistedChecker = ElementBlacklistedChecker;
var NodeIterator = /** @class */ (function () {
    function NodeIterator(walker, isForward) {
        this.walker = walker;
        this.isForward = isForward;
        if (!this.isForward) {
            while (this.walker.lastChild()) { }
        }
    }
    NodeIterator.prototype.next = function () {
        return this.isForward ? this.walker.nextNode() : this.walker.previousNode();
    };
    return NodeIterator;
}());
var ElementVisibilityChecker = /** @class */ (function () {
    function ElementVisibilityChecker(doc, columnSize, viewport, eleChecker) {
        this.isRtl = false;
        this.columnSize = [0, 0];
        this.rootDoc = doc;
        this.columnSize = columnSize;
        this.viewport = viewport;
        this.elementChecker = eleChecker;
    }
    ElementVisibilityChecker.prototype.findFirstVisibleElement = function (fromEnd) {
        var _this = this;
        var bodyEle = this.rootDoc.body;
        var firstVisibleElement = null;
        var percentVisible = 0;
        var textNode = null;
        // tslint:disable-next-line:no-bitwise
        var mask = NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT;
        var filter = function (node) {
            if (node.nodeType === Node.ELEMENT_NODE) {
                if (_this.elementChecker && _this.elementChecker.isElementBlacklisted((node))) {
                    return NodeFilter.FILTER_REJECT;
                }
            }
            if (node.nodeType === Node.TEXT_NODE && !_this.isValidTextNode(node)) {
                return NodeFilter.FILTER_REJECT;
            }
            var visibilityResult = _this.checkVisibility((node), false);
            return visibilityResult ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        };
        var treeWalker = document.createTreeWalker(bodyEle, mask, { acceptNode: filter }, false);
        var nodeIter = new NodeIterator(treeWalker, !fromEnd);
        if (!fromEnd && nodeIter.next() === null) {
            return { textNode: textNode, percentVisible: percentVisible, element: firstVisibleElement };
        }
        do {
            var node = treeWalker.currentNode;
            if (node.nodeType === Node.TEXT_NODE) {
                firstVisibleElement = node.parentElement;
                textNode = node;
                percentVisible = 100;
                break;
            }
            var hasChildElements = false;
            var hasChildTextNodes = false;
            for (var i = node.childNodes.length - 1; i >= 0; i -= 1) {
                var childNode = node.childNodes[i];
                if (childNode.nodeType === Node.ELEMENT_NODE) {
                    hasChildElements = true;
                    break;
                }
                if (childNode.nodeType === Node.TEXT_NODE) {
                    hasChildTextNodes = true;
                }
            }
            // potentially stop tree traversal when first element hit with no child element nodes
            if (!hasChildElements && hasChildTextNodes) {
                for (var i = node.childNodes.length - 1; i >= 0; i -= 1) {
                    var childNode = node.childNodes[i];
                    if (childNode.nodeType === Node.TEXT_NODE && this.isValidTextNode(childNode)) {
                        var visibilityResult = this.checkVisibility(childNode, true);
                        if (visibilityResult) {
                            firstVisibleElement = (node);
                            textNode = childNode;
                            percentVisible = visibilityResult;
                            break;
                        }
                    }
                }
            }
            else if (!hasChildElements) {
                firstVisibleElement = (node);
                percentVisible = 100;
                textNode = null;
                break;
            }
        } while (nodeIter.next());
        return { textNode: textNode, percentVisible: percentVisible, element: firstVisibleElement };
    };
    ElementVisibilityChecker.prototype.getVisibleTextRange = function (textNode, toStart) {
        var ranges = this.splitRange(this.createRangeFromNode(textNode));
        var activeIndex = toStart ? 0 : 1;
        var otherIndex = toStart ? 1 : 0;
        while (ranges.length > 1) {
            var currRange = ranges[activeIndex];
            var fragments = this.getRangeRectangles(currRange);
            if (this.calcVisibility(fragments, false) > 0) {
                ranges = this.splitRange(ranges[activeIndex]);
            }
            else {
                ranges = this.splitRange(ranges[otherIndex]);
            }
        }
        var resultRange = ranges[0];
        if (resultRange) {
            resultRange.collapse(toStart);
        }
        return resultRange;
    };
    ElementVisibilityChecker.prototype.getElementStartOffset = function (ele) {
        var rects = this.getNodeRectangles(ele);
        if (rects.length === 0) {
            return null;
        }
        return [rects[0].left, rects[0].top];
    };
    ElementVisibilityChecker.prototype.getRangeStartOffset = function (range) {
        var rects = this.getRangeRectangles(range);
        if (rects.length === 0) {
            return null;
        }
        return [rects[0].left, rects[0].top];
    };
    ElementVisibilityChecker.prototype.findNearestElement = function (ele) {
        var _this = this;
        var siblingTextNodesAndSelf;
        if (!ele.parentNode) {
            siblingTextNodesAndSelf = [ele];
        }
        else {
            siblingTextNodesAndSelf = Array.from(ele.parentNode.childNodes).filter(function (n) {
                return n === ele || _this.isValidTextNode(n);
            });
        }
        var collapseToStart = false;
        var indexOfSelf = siblingTextNodesAndSelf.indexOf(ele);
        var nearestNode = siblingTextNodesAndSelf[indexOfSelf - 1];
        if (!nearestNode) {
            nearestNode = siblingTextNodesAndSelf[indexOfSelf + 1];
            collapseToStart = true;
        }
        if (!nearestNode && ele.nodeType === Node.ELEMENT_NODE) {
            var prevLeaves = this.getLeafNodeElements(ele.previousElementSibling);
            nearestNode = prevLeaves[prevLeaves.length - 1];
            if (!nearestNode) {
                collapseToStart = true;
                nearestNode = this.getLeafNodeElements(ele.nextElementSibling)[0];
            }
        }
        var chosenNode = null;
        // Prioritize text node use
        if (this.isValidTextNode(nearestNode) || this.isElementNode(nearestNode)) {
            chosenNode = nearestNode;
        }
        else if (this.isElementNode(ele)) {
            var element = ele;
            if (element.previousElementSibling) {
                chosenNode = element.previousElementSibling;
            }
            else if (element.nextElementSibling) {
                chosenNode = element.nextElementSibling;
            }
        }
        if (chosenNode) {
            chosenNode = ele.parentNode;
        }
        return [chosenNode, collapseToStart];
    };
    ElementVisibilityChecker.prototype.getLeafNodeElements = function (root) {
        var leafNodeElements = [];
        if (!root) {
            return leafNodeElements;
        }
        var nodeIterator = document.createNodeIterator(root, 
        // tslint:disable-next-line:no-bitwise
        NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, { acceptNode: function () { return NodeFilter.FILTER_ACCEPT; } });
        var node = nodeIterator.nextNode();
        var prevNode = null;
        while (node) {
            var isLeafNode = node.nodeType === Node.ELEMENT_NODE &&
                (node).childElementCount === 0 &&
                !this.isValidTextNodeContent(node.textContent);
            if (isLeafNode || this.isValidTextNode(node)) {
                var element = (node.nodeType === Node.TEXT_NODE) ? node.parentNode : node;
                if (!this.elementChecker ||
                    !this.elementChecker.isElementBlacklisted(element)) {
                    leafNodeElements.push(node);
                }
                node = nodeIterator.nextNode();
            }
            else {
                // If the previous node is the same as the last node, assume we've entered an infinite loop
                // and break out of it.
                if (prevNode === node) {
                    break;
                }
                prevNode = node;
            }
        }
        return leafNodeElements;
    };
    ElementVisibilityChecker.prototype.checkVisibility = function (ele, calcPercent) {
        var eleRects = this.getNodeRectangles(ele);
        if (eleRects.length === 0) {
            return null;
        }
        return this.calcVisibility(eleRects, calcPercent);
    };
    ElementVisibilityChecker.prototype.getNodeRectangles = function (node) {
        var clientRects;
        if (node.nodeType === Node.TEXT_NODE) {
            var range = this.createRange();
            range.selectNode(node);
            clientRects = (range.getClientRects());
        }
        else {
            var ele = (node);
            clientRects = (ele.getClientRects());
        }
        return this.normalizeDomRectangles(clientRects);
    };
    ElementVisibilityChecker.prototype.getRangeRectangles = function (range) {
        return this.normalizeDomRectangles(range.getClientRects());
    };
    ElementVisibilityChecker.prototype.normalizeDomRectangles = function (rectList) {
        var rects = [];
        // tslint:disable-next-line:prefer-for-of
        for (var i = 0; i < rectList.length; i += 1) {
            var r = rect.Rect.fromDOMRect(rectList[i]);
            // Handle rects returned by Webkit
            if (this.viewport && this.columnSize[0] > 0 &&
                (r.top < this.viewport.top || r.bottom > this.viewport.bottom)) {
                var columnWidth = this.columnSize[0];
                var columnHeight = this.columnSize[1];
                while (r.top < 0) {
                    r.top += columnHeight;
                    r.bottom += columnHeight;
                    r.left -= columnWidth;
                    r.right -= columnWidth;
                }
                var pageLeft = Math.floor(r.left / columnWidth) * columnWidth;
                var pageRight = Math.ceil(r.right / columnWidth) * columnWidth;
                var pageRect = new rect.Rect(pageLeft, 0, pageRight, columnHeight);
                while (pageRect.top < r.bottom) {
                    if (pageRect.overlapVertical(r)) {
                        var newTop = Math.max(r.top, pageRect.top) - pageRect.top + this.viewport.top;
                        // tslint:disable-next-line:max-line-length
                        var newBottom = Math.min(r.bottom, pageRect.bottom) - pageRect.top + this.viewport.top;
                        rects.push(new rect.Rect(pageRect.left, newTop, pageRect.right, newBottom));
                    }
                    pageRect.left = pageRect.right;
                    pageRect.right += columnWidth;
                    pageRect.top = pageRect.bottom;
                    pageRect.bottom += columnHeight;
                }
            }
            else {
                rects.push(r);
            }
        }
        return rects;
    };
    ElementVisibilityChecker.prototype.calcVisibility = function (rects, calcPercent) {
        if (!this.viewport) {
            return 0;
        }
        var visPercent = 0;
        for (var _i = 0, rects_1 = rects; _i < rects_1.length; _i++) {
            var r = rects_1[_i];
            if (r.intersect(this.viewport)) {
                if (!calcPercent) {
                    visPercent = 100;
                    break;
                }
                visPercent += (r.horizontalOverlap(this.viewport) / r.height()) * 100;
            }
        }
        return Math.ceil(visPercent);
    };
    ElementVisibilityChecker.prototype.createRange = function () {
        return this.rootDoc.createRange();
    };
    ElementVisibilityChecker.prototype.createRangeFromNode = function (textnode) {
        var documentRange = this.createRange();
        documentRange.selectNodeContents(textnode);
        return documentRange;
    };
    ElementVisibilityChecker.prototype.splitRange = function (range) {
        if (range.endOffset - range.startOffset === 1) {
            return [range];
        }
        var leftRangeLength = Math.round((range.endOffset - range.startOffset) / 2);
        var textNode = range.startContainer;
        var leftNodeRange = range.cloneRange();
        leftNodeRange.setStart(textNode, range.startOffset);
        leftNodeRange.setEnd(textNode, range.startOffset + leftRangeLength);
        var rightNodeRange = range.cloneRange();
        rightNodeRange.setStart(textNode, range.startOffset + leftRangeLength);
        rightNodeRange.setEnd(textNode, range.endOffset);
        return [leftNodeRange, rightNodeRange];
    };
    ElementVisibilityChecker.prototype.isValidTextNode = function (node) {
        if (node && node.nodeType === Node.TEXT_NODE) {
            return this.isValidTextNodeContent(node.nodeValue);
        }
        return false;
    };
    ElementVisibilityChecker.prototype.isValidTextNodeContent = function (text) {
        if (text === null) {
            return false;
        }
        return !!text.trim().length;
    };
    ElementVisibilityChecker.prototype.isElementNode = function (node) {
        if (!node) {
            return false;
        }
        return node.nodeType === Node.ELEMENT_NODE;
    };
    return ElementVisibilityChecker;
}());
exports.ElementVisibilityChecker = ElementVisibilityChecker;
});

unwrapExports(elementChecker);
var elementChecker_1 = elementChecker.ElementBlacklistedChecker;
var elementChecker_2 = elementChecker.ElementVisibilityChecker;

var domUtils = createCommonjsModule(function (module, exports) {
exports.__esModule = true;
function height(ele, win) {
    var winInUse = win ? win : window;
    var valStr = winInUse.getComputedStyle(ele).getPropertyValue('height');
    return parseFloat(valStr);
}
exports.height = height;
function setHeight(ele, val) {
    ele.style.height = val + "px";
}
exports.setHeight = setHeight;
function isIframeAlive(iframe) {
    var w;
    var d;
    try {
        w = iframe.contentWindow;
        d = iframe.contentDocument;
    }
    catch (ex) {
        console.error(ex);
        return false;
    }
    return w !== undefined && d !== undefined;
}
exports.isIframeAlive = isIframeAlive;
function triggerLayout(iframe) {
    var doc = iframe.contentDocument;
    if (!doc || !doc.head) {
        return;
    }
    var ss = null;
    try {
        ss = doc.styleSheets && doc.styleSheets.length ? (doc.styleSheets[0]) : null;
        if (!ss && doc.head) {
            var style = doc.createElement('style');
            doc.head.appendChild(style);
            style.appendChild(doc.createTextNode(''));
            ss = (style.sheet);
        }
        if (ss) {
            // tslint:disable-next-line:max-line-length
            var cssRule = 'body:first-child::before {content:\'READIUM\';color: red;font-weight: bold;}';
            if (ss && ss.cssRules) {
                ss.insertRule(cssRule, ss.cssRules.length);
            }
            else {
                ss.insertRule(cssRule, 0);
            }
        }
    }
    catch (ex) {
        console.error(ex);
    }
    try {
        // tslint:disable-next-line:no-http-string
        var el = doc.createElementNS('http://www.w3.org/1999/xhtml', 'style');
        el.appendChild(doc.createTextNode('*{}'));
        doc.body.appendChild(el);
        doc.body.removeChild(el);
        if (ss) {
            if (ss.cssRules) {
                ss.deleteRule(ss.cssRules.length - 1);
            }
            else {
                ss.deleteRule(0);
            }
        }
    }
    catch (ex) {
        console.error(ex);
    }
    if (doc.body) {
        var val = doc.body.offsetTop; // triggers layout
    }
}
exports.triggerLayout = triggerLayout;
});

unwrapExports(domUtils);
var domUtils_1 = domUtils.height;
var domUtils_2 = domUtils.setHeight;
var domUtils_3 = domUtils.isIframeAlive;
var domUtils_4 = domUtils.triggerLayout;

var commonjsGlobal$1 = typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

function createCommonjsModule$1(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

var jquery = createCommonjsModule$1(function (module) {
/*!
 * jQuery JavaScript Library v3.3.1
 * https://jquery.com/
 *
 * Includes Sizzle.js
 * https://sizzlejs.com/
 *
 * Copyright JS Foundation and other contributors
 * Released under the MIT license
 * https://jquery.org/license
 *
 * Date: 2018-01-20T17:24Z
 */
(function (global, factory) {

  {
    // For CommonJS and CommonJS-like environments where a proper `window`
    // is present, execute the factory and get jQuery.
    // For environments that do not have a `window` with a `document`
    // (such as Node.js), expose a factory as module.exports.
    // This accentuates the need for the creation of a real `window`.
    // e.g. var jQuery = require("jquery")(window);
    // See ticket #14549 for more info.
    module.exports = global.document ? factory(global, true) : function (w) {
      if (!w.document) {
        throw new Error("jQuery requires a window with a document");
      }

      return factory(w);
    };
  } // Pass this if window is not defined yet

})(typeof window !== "undefined" ? window : commonjsGlobal$1, function (window, noGlobal) {

  var arr = [];
  var document = window.document;
  var getProto = Object.getPrototypeOf;
  var slice = arr.slice;
  var concat = arr.concat;
  var push = arr.push;
  var indexOf = arr.indexOf;
  var class2type = {};
  var toString = class2type.toString;
  var hasOwn = class2type.hasOwnProperty;
  var fnToString = hasOwn.toString;
  var ObjectFunctionString = fnToString.call(Object);
  var support = {};

  var isFunction = function isFunction(obj) {
    // Support: Chrome <=57, Firefox <=52
    // In some browsers, typeof returns "function" for HTML <object> elements
    // (i.e., `typeof document.createElement( "object" ) === "function"`).
    // We don't want to classify *any* DOM node as a function.
    return typeof obj === "function" && typeof obj.nodeType !== "number";
  };

  var isWindow = function isWindow(obj) {
    return obj != null && obj === obj.window;
  };

  var preservedScriptAttributes = {
    type: true,
    src: true,
    noModule: true
  };

  function DOMEval(code, doc, node) {
    doc = doc || document;
    var i,
        script = doc.createElement("script");
    script.text = code;

    if (node) {
      for (i in preservedScriptAttributes) {
        if (node[i]) {
          script[i] = node[i];
        }
      }
    }

    doc.head.appendChild(script).parentNode.removeChild(script);
  }

  function toType(obj) {
    if (obj == null) {
      return obj + "";
    } // Support: Android <=2.3 only (functionish RegExp)


    return typeof obj === "object" || typeof obj === "function" ? class2type[toString.call(obj)] || "object" : typeof obj;
  }
  /* global Symbol */
  // Defining this global in .eslintrc.json would create a danger of using the global
  // unguarded in another place, it seems safer to define global only for this module


  var version = "3.3.1",
      // Define a local copy of jQuery
  jQuery = function (selector, context) {
    // The jQuery object is actually just the init constructor 'enhanced'
    // Need init if jQuery is called (just allow error to be thrown if not included)
    return new jQuery.fn.init(selector, context);
  },
      // Support: Android <=4.0 only
  // Make sure we trim BOM and NBSP
  rtrim = /^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g;

  jQuery.fn = jQuery.prototype = {
    // The current version of jQuery being used
    jquery: version,
    constructor: jQuery,
    // The default length of a jQuery object is 0
    length: 0,
    toArray: function () {
      return slice.call(this);
    },
    // Get the Nth element in the matched element set OR
    // Get the whole matched element set as a clean array
    get: function (num) {
      // Return all the elements in a clean array
      if (num == null) {
        return slice.call(this);
      } // Return just the one element from the set


      return num < 0 ? this[num + this.length] : this[num];
    },
    // Take an array of elements and push it onto the stack
    // (returning the new matched element set)
    pushStack: function (elems) {
      // Build a new jQuery matched element set
      var ret = jQuery.merge(this.constructor(), elems); // Add the old object onto the stack (as a reference)

      ret.prevObject = this; // Return the newly-formed element set

      return ret;
    },
    // Execute a callback for every element in the matched set.
    each: function (callback) {
      return jQuery.each(this, callback);
    },
    map: function (callback) {
      return this.pushStack(jQuery.map(this, function (elem, i) {
        return callback.call(elem, i, elem);
      }));
    },
    slice: function () {
      return this.pushStack(slice.apply(this, arguments));
    },
    first: function () {
      return this.eq(0);
    },
    last: function () {
      return this.eq(-1);
    },
    eq: function (i) {
      var len = this.length,
          j = +i + (i < 0 ? len : 0);
      return this.pushStack(j >= 0 && j < len ? [this[j]] : []);
    },
    end: function () {
      return this.prevObject || this.constructor();
    },
    // For internal use only.
    // Behaves like an Array's method, not like a jQuery method.
    push: push,
    sort: arr.sort,
    splice: arr.splice
  };

  jQuery.extend = jQuery.fn.extend = function () {
    var options,
        name,
        src,
        copy,
        copyIsArray,
        clone,
        target = arguments[0] || {},
        i = 1,
        length = arguments.length,
        deep = false; // Handle a deep copy situation

    if (typeof target === "boolean") {
      deep = target; // Skip the boolean and the target

      target = arguments[i] || {};
      i++;
    } // Handle case when target is a string or something (possible in deep copy)


    if (typeof target !== "object" && !isFunction(target)) {
      target = {};
    } // Extend jQuery itself if only one argument is passed


    if (i === length) {
      target = this;
      i--;
    }

    for (; i < length; i++) {
      // Only deal with non-null/undefined values
      if ((options = arguments[i]) != null) {
        // Extend the base object
        for (name in options) {
          src = target[name];
          copy = options[name]; // Prevent never-ending loop

          if (target === copy) {
            continue;
          } // Recurse if we're merging plain objects or arrays


          if (deep && copy && (jQuery.isPlainObject(copy) || (copyIsArray = Array.isArray(copy)))) {
            if (copyIsArray) {
              copyIsArray = false;
              clone = src && Array.isArray(src) ? src : [];
            } else {
              clone = src && jQuery.isPlainObject(src) ? src : {};
            } // Never move original objects, clone them


            target[name] = jQuery.extend(deep, clone, copy); // Don't bring in undefined values
          } else if (copy !== undefined) {
            target[name] = copy;
          }
        }
      }
    } // Return the modified object


    return target;
  };

  jQuery.extend({
    // Unique for each copy of jQuery on the page
    expando: "jQuery" + (version + Math.random()).replace(/\D/g, ""),
    // Assume jQuery is ready without the ready module
    isReady: true,
    error: function (msg) {
      throw new Error(msg);
    },
    noop: function () {},
    isPlainObject: function (obj) {
      var proto, Ctor; // Detect obvious negatives
      // Use toString instead of jQuery.type to catch host objects

      if (!obj || toString.call(obj) !== "[object Object]") {
        return false;
      }

      proto = getProto(obj); // Objects with no prototype (e.g., `Object.create( null )`) are plain

      if (!proto) {
        return true;
      } // Objects with prototype are plain iff they were constructed by a global Object function


      Ctor = hasOwn.call(proto, "constructor") && proto.constructor;
      return typeof Ctor === "function" && fnToString.call(Ctor) === ObjectFunctionString;
    },
    isEmptyObject: function (obj) {
      /* eslint-disable no-unused-vars */
      // See https://github.com/eslint/eslint/issues/6125
      var name;

      for (name in obj) {
        return false;
      }

      return true;
    },
    // Evaluates a script in a global context
    globalEval: function (code) {
      DOMEval(code);
    },
    each: function (obj, callback) {
      var length,
          i = 0;

      if (isArrayLike(obj)) {
        length = obj.length;

        for (; i < length; i++) {
          if (callback.call(obj[i], i, obj[i]) === false) {
            break;
          }
        }
      } else {
        for (i in obj) {
          if (callback.call(obj[i], i, obj[i]) === false) {
            break;
          }
        }
      }

      return obj;
    },
    // Support: Android <=4.0 only
    trim: function (text) {
      return text == null ? "" : (text + "").replace(rtrim, "");
    },
    // results is for internal usage only
    makeArray: function (arr, results) {
      var ret = results || [];

      if (arr != null) {
        if (isArrayLike(Object(arr))) {
          jQuery.merge(ret, typeof arr === "string" ? [arr] : arr);
        } else {
          push.call(ret, arr);
        }
      }

      return ret;
    },
    inArray: function (elem, arr, i) {
      return arr == null ? -1 : indexOf.call(arr, elem, i);
    },
    // Support: Android <=4.0 only, PhantomJS 1 only
    // push.apply(_, arraylike) throws on ancient WebKit
    merge: function (first, second) {
      var len = +second.length,
          j = 0,
          i = first.length;

      for (; j < len; j++) {
        first[i++] = second[j];
      }

      first.length = i;
      return first;
    },
    grep: function (elems, callback, invert) {
      var callbackInverse,
          matches = [],
          i = 0,
          length = elems.length,
          callbackExpect = !invert; // Go through the array, only saving the items
      // that pass the validator function

      for (; i < length; i++) {
        callbackInverse = !callback(elems[i], i);

        if (callbackInverse !== callbackExpect) {
          matches.push(elems[i]);
        }
      }

      return matches;
    },
    // arg is for internal usage only
    map: function (elems, callback, arg) {
      var length,
          value,
          i = 0,
          ret = []; // Go through the array, translating each of the items to their new values

      if (isArrayLike(elems)) {
        length = elems.length;

        for (; i < length; i++) {
          value = callback(elems[i], i, arg);

          if (value != null) {
            ret.push(value);
          }
        } // Go through every key on the object,

      } else {
        for (i in elems) {
          value = callback(elems[i], i, arg);

          if (value != null) {
            ret.push(value);
          }
        }
      } // Flatten any nested arrays


      return concat.apply([], ret);
    },
    // A global GUID counter for objects
    guid: 1,
    // jQuery.support is not used in Core but other projects attach their
    // properties to it so it needs to exist.
    support: support
  });

  if (typeof Symbol === "function") {
    jQuery.fn[Symbol.iterator] = arr[Symbol.iterator];
  } // Populate the class2type map


  jQuery.each("Boolean Number String Function Array Date RegExp Object Error Symbol".split(" "), function (i, name) {
    class2type["[object " + name + "]"] = name.toLowerCase();
  });

  function isArrayLike(obj) {
    // Support: real iOS 8.2 only (not reproducible in simulator)
    // `in` check used to prevent JIT error (gh-2145)
    // hasOwn isn't used here due to false negatives
    // regarding Nodelist length in IE
    var length = !!obj && "length" in obj && obj.length,
        type = toType(obj);

    if (isFunction(obj) || isWindow(obj)) {
      return false;
    }

    return type === "array" || length === 0 || typeof length === "number" && length > 0 && length - 1 in obj;
  }

  var Sizzle =
  /*!
   * Sizzle CSS Selector Engine v2.3.3
   * https://sizzlejs.com/
   *
   * Copyright jQuery Foundation and other contributors
   * Released under the MIT license
   * http://jquery.org/license
   *
   * Date: 2016-08-08
   */
  function (window) {
    var i,
        support,
        Expr,
        getText,
        isXML,
        tokenize,
        compile,
        select,
        outermostContext,
        sortInput,
        hasDuplicate,
        // Local document vars
    setDocument,
        document,
        docElem,
        documentIsHTML,
        rbuggyQSA,
        rbuggyMatches,
        matches,
        contains,
        // Instance-specific data
    expando = "sizzle" + 1 * new Date(),
        preferredDoc = window.document,
        dirruns = 0,
        done = 0,
        classCache = createCache(),
        tokenCache = createCache(),
        compilerCache = createCache(),
        sortOrder = function (a, b) {
      if (a === b) {
        hasDuplicate = true;
      }

      return 0;
    },
        // Instance methods
    hasOwn = {}.hasOwnProperty,
        arr = [],
        pop = arr.pop,
        push_native = arr.push,
        push = arr.push,
        slice = arr.slice,
        // Use a stripped-down indexOf as it's faster than native
    // https://jsperf.com/thor-indexof-vs-for/5
    indexOf = function (list, elem) {
      var i = 0,
          len = list.length;

      for (; i < len; i++) {
        if (list[i] === elem) {
          return i;
        }
      }

      return -1;
    },
        booleans = "checked|selected|async|autofocus|autoplay|controls|defer|disabled|hidden|ismap|loop|multiple|open|readonly|required|scoped",
        // Regular expressions
    // http://www.w3.org/TR/css3-selectors/#whitespace
    whitespace = "[\\x20\\t\\r\\n\\f]",
        // http://www.w3.org/TR/CSS21/syndata.html#value-def-identifier
    identifier = "(?:\\\\.|[\\w-]|[^\0-\\xa0])+",
        // Attribute selectors: http://www.w3.org/TR/selectors/#attribute-selectors
    attributes = "\\[" + whitespace + "*(" + identifier + ")(?:" + whitespace + // Operator (capture 2)
    "*([*^$|!~]?=)" + whitespace + // "Attribute values must be CSS identifiers [capture 5] or strings [capture 3 or capture 4]"
    "*(?:'((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\"|(" + identifier + "))|)" + whitespace + "*\\]",
        pseudos = ":(" + identifier + ")(?:\\((" + // To reduce the number of selectors needing tokenize in the preFilter, prefer arguments:
    // 1. quoted (capture 3; capture 4 or capture 5)
    "('((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\")|" + // 2. simple (capture 6)
    "((?:\\\\.|[^\\\\()[\\]]|" + attributes + ")*)|" + // 3. anything else (capture 2)
    ".*" + ")\\)|)",
        // Leading and non-escaped trailing whitespace, capturing some non-whitespace characters preceding the latter
    rwhitespace = new RegExp(whitespace + "+", "g"),
        rtrim = new RegExp("^" + whitespace + "+|((?:^|[^\\\\])(?:\\\\.)*)" + whitespace + "+$", "g"),
        rcomma = new RegExp("^" + whitespace + "*," + whitespace + "*"),
        rcombinators = new RegExp("^" + whitespace + "*([>+~]|" + whitespace + ")" + whitespace + "*"),
        rattributeQuotes = new RegExp("=" + whitespace + "*([^\\]'\"]*?)" + whitespace + "*\\]", "g"),
        rpseudo = new RegExp(pseudos),
        ridentifier = new RegExp("^" + identifier + "$"),
        matchExpr = {
      "ID": new RegExp("^#(" + identifier + ")"),
      "CLASS": new RegExp("^\\.(" + identifier + ")"),
      "TAG": new RegExp("^(" + identifier + "|[*])"),
      "ATTR": new RegExp("^" + attributes),
      "PSEUDO": new RegExp("^" + pseudos),
      "CHILD": new RegExp("^:(only|first|last|nth|nth-last)-(child|of-type)(?:\\(" + whitespace + "*(even|odd|(([+-]|)(\\d*)n|)" + whitespace + "*(?:([+-]|)" + whitespace + "*(\\d+)|))" + whitespace + "*\\)|)", "i"),
      "bool": new RegExp("^(?:" + booleans + ")$", "i"),
      // For use in libraries implementing .is()
      // We use this for POS matching in `select`
      "needsContext": new RegExp("^" + whitespace + "*[>+~]|:(even|odd|eq|gt|lt|nth|first|last)(?:\\(" + whitespace + "*((?:-\\d)?\\d*)" + whitespace + "*\\)|)(?=[^-]|$)", "i")
    },
        rinputs = /^(?:input|select|textarea|button)$/i,
        rheader = /^h\d$/i,
        rnative = /^[^{]+\{\s*\[native \w/,
        // Easily-parseable/retrievable ID or TAG or CLASS selectors
    rquickExpr = /^(?:#([\w-]+)|(\w+)|\.([\w-]+))$/,
        rsibling = /[+~]/,
        // CSS escapes
    // http://www.w3.org/TR/CSS21/syndata.html#escaped-characters
    runescape = new RegExp("\\\\([\\da-f]{1,6}" + whitespace + "?|(" + whitespace + ")|.)", "ig"),
        funescape = function (_, escaped, escapedWhitespace) {
      var high = "0x" + escaped - 0x10000; // NaN means non-codepoint
      // Support: Firefox<24
      // Workaround erroneous numeric interpretation of +"0x"

      return high !== high || escapedWhitespace ? escaped : high < 0 ? // BMP codepoint
      String.fromCharCode(high + 0x10000) : // Supplemental Plane codepoint (surrogate pair)
      String.fromCharCode(high >> 10 | 0xD800, high & 0x3FF | 0xDC00);
    },
        // CSS string/identifier serialization
    // https://drafts.csswg.org/cssom/#common-serializing-idioms
    rcssescape = /([\0-\x1f\x7f]|^-?\d)|^-$|[^\0-\x1f\x7f-\uFFFF\w-]/g,
        fcssescape = function (ch, asCodePoint) {
      if (asCodePoint) {
        // U+0000 NULL becomes U+FFFD REPLACEMENT CHARACTER
        if (ch === "\0") {
          return "\uFFFD";
        } // Control characters and (dependent upon position) numbers get escaped as code points


        return ch.slice(0, -1) + "\\" + ch.charCodeAt(ch.length - 1).toString(16) + " ";
      } // Other potentially-special ASCII characters get backslash-escaped


      return "\\" + ch;
    },
        // Used for iframes
    // See setDocument()
    // Removing the function wrapper causes a "Permission Denied"
    // error in IE
    unloadHandler = function () {
      setDocument();
    },
        disabledAncestor = addCombinator(function (elem) {
      return elem.disabled === true && ("form" in elem || "label" in elem);
    }, {
      dir: "parentNode",
      next: "legend"
    }); // Optimize for push.apply( _, NodeList )


    try {
      push.apply(arr = slice.call(preferredDoc.childNodes), preferredDoc.childNodes); // Support: Android<4.0
      // Detect silently failing push.apply

      arr[preferredDoc.childNodes.length].nodeType;
    } catch (e) {
      push = {
        apply: arr.length ? // Leverage slice if possible
        function (target, els) {
          push_native.apply(target, slice.call(els));
        } : // Support: IE<9
        // Otherwise append directly
        function (target, els) {
          var j = target.length,
              i = 0; // Can't trust NodeList.length

          while (target[j++] = els[i++]) {}

          target.length = j - 1;
        }
      };
    }

    function Sizzle(selector, context, results, seed) {
      var m,
          i,
          elem,
          nid,
          match,
          groups,
          newSelector,
          newContext = context && context.ownerDocument,
          // nodeType defaults to 9, since context defaults to document
      nodeType = context ? context.nodeType : 9;
      results = results || []; // Return early from calls with invalid selector or context

      if (typeof selector !== "string" || !selector || nodeType !== 1 && nodeType !== 9 && nodeType !== 11) {
        return results;
      } // Try to shortcut find operations (as opposed to filters) in HTML documents


      if (!seed) {
        if ((context ? context.ownerDocument || context : preferredDoc) !== document) {
          setDocument(context);
        }

        context = context || document;

        if (documentIsHTML) {
          // If the selector is sufficiently simple, try using a "get*By*" DOM method
          // (excepting DocumentFragment context, where the methods don't exist)
          if (nodeType !== 11 && (match = rquickExpr.exec(selector))) {
            // ID selector
            if (m = match[1]) {
              // Document context
              if (nodeType === 9) {
                if (elem = context.getElementById(m)) {
                  // Support: IE, Opera, Webkit
                  // TODO: identify versions
                  // getElementById can match elements by name instead of ID
                  if (elem.id === m) {
                    results.push(elem);
                    return results;
                  }
                } else {
                  return results;
                } // Element context

              } else {
                // Support: IE, Opera, Webkit
                // TODO: identify versions
                // getElementById can match elements by name instead of ID
                if (newContext && (elem = newContext.getElementById(m)) && contains(context, elem) && elem.id === m) {
                  results.push(elem);
                  return results;
                }
              } // Type selector

            } else if (match[2]) {
              push.apply(results, context.getElementsByTagName(selector));
              return results; // Class selector
            } else if ((m = match[3]) && support.getElementsByClassName && context.getElementsByClassName) {
              push.apply(results, context.getElementsByClassName(m));
              return results;
            }
          } // Take advantage of querySelectorAll


          if (support.qsa && !compilerCache[selector + " "] && (!rbuggyQSA || !rbuggyQSA.test(selector))) {
            if (nodeType !== 1) {
              newContext = context;
              newSelector = selector; // qSA looks outside Element context, which is not what we want
              // Thanks to Andrew Dupont for this workaround technique
              // Support: IE <=8
              // Exclude object elements
            } else if (context.nodeName.toLowerCase() !== "object") {
              // Capture the context ID, setting it first if necessary
              if (nid = context.getAttribute("id")) {
                nid = nid.replace(rcssescape, fcssescape);
              } else {
                context.setAttribute("id", nid = expando);
              } // Prefix every selector in the list


              groups = tokenize(selector);
              i = groups.length;

              while (i--) {
                groups[i] = "#" + nid + " " + toSelector(groups[i]);
              }

              newSelector = groups.join(","); // Expand context for sibling selectors

              newContext = rsibling.test(selector) && testContext(context.parentNode) || context;
            }

            if (newSelector) {
              try {
                push.apply(results, newContext.querySelectorAll(newSelector));
                return results;
              } catch (qsaError) {} finally {
                if (nid === expando) {
                  context.removeAttribute("id");
                }
              }
            }
          }
        }
      } // All others


      return select(selector.replace(rtrim, "$1"), context, results, seed);
    }
    /**
     * Create key-value caches of limited size
     * @returns {function(string, object)} Returns the Object data after storing it on itself with
     *	property name the (space-suffixed) string and (if the cache is larger than Expr.cacheLength)
     *	deleting the oldest entry
     */


    function createCache() {
      var keys = [];

      function cache(key, value) {
        // Use (key + " ") to avoid collision with native prototype properties (see Issue #157)
        if (keys.push(key + " ") > Expr.cacheLength) {
          // Only keep the most recent entries
          delete cache[keys.shift()];
        }

        return cache[key + " "] = value;
      }

      return cache;
    }
    /**
     * Mark a function for special use by Sizzle
     * @param {Function} fn The function to mark
     */


    function markFunction(fn) {
      fn[expando] = true;
      return fn;
    }
    /**
     * Support testing using an element
     * @param {Function} fn Passed the created element and returns a boolean result
     */


    function assert(fn) {
      var el = document.createElement("fieldset");

      try {
        return !!fn(el);
      } catch (e) {
        return false;
      } finally {
        // Remove from its parent by default
        if (el.parentNode) {
          el.parentNode.removeChild(el);
        } // release memory in IE


        el = null;
      }
    }
    /**
     * Adds the same handler for all of the specified attrs
     * @param {String} attrs Pipe-separated list of attributes
     * @param {Function} handler The method that will be applied
     */


    function addHandle(attrs, handler) {
      var arr = attrs.split("|"),
          i = arr.length;

      while (i--) {
        Expr.attrHandle[arr[i]] = handler;
      }
    }
    /**
     * Checks document order of two siblings
     * @param {Element} a
     * @param {Element} b
     * @returns {Number} Returns less than 0 if a precedes b, greater than 0 if a follows b
     */


    function siblingCheck(a, b) {
      var cur = b && a,
          diff = cur && a.nodeType === 1 && b.nodeType === 1 && a.sourceIndex - b.sourceIndex; // Use IE sourceIndex if available on both nodes

      if (diff) {
        return diff;
      } // Check if b follows a


      if (cur) {
        while (cur = cur.nextSibling) {
          if (cur === b) {
            return -1;
          }
        }
      }

      return a ? 1 : -1;
    }
    /**
     * Returns a function to use in pseudos for input types
     * @param {String} type
     */


    function createInputPseudo(type) {
      return function (elem) {
        var name = elem.nodeName.toLowerCase();
        return name === "input" && elem.type === type;
      };
    }
    /**
     * Returns a function to use in pseudos for buttons
     * @param {String} type
     */


    function createButtonPseudo(type) {
      return function (elem) {
        var name = elem.nodeName.toLowerCase();
        return (name === "input" || name === "button") && elem.type === type;
      };
    }
    /**
     * Returns a function to use in pseudos for :enabled/:disabled
     * @param {Boolean} disabled true for :disabled; false for :enabled
     */


    function createDisabledPseudo(disabled) {
      // Known :disabled false positives: fieldset[disabled] > legend:nth-of-type(n+2) :can-disable
      return function (elem) {
        // Only certain elements can match :enabled or :disabled
        // https://html.spec.whatwg.org/multipage/scripting.html#selector-enabled
        // https://html.spec.whatwg.org/multipage/scripting.html#selector-disabled
        if ("form" in elem) {
          // Check for inherited disabledness on relevant non-disabled elements:
          // * listed form-associated elements in a disabled fieldset
          //   https://html.spec.whatwg.org/multipage/forms.html#category-listed
          //   https://html.spec.whatwg.org/multipage/forms.html#concept-fe-disabled
          // * option elements in a disabled optgroup
          //   https://html.spec.whatwg.org/multipage/forms.html#concept-option-disabled
          // All such elements have a "form" property.
          if (elem.parentNode && elem.disabled === false) {
            // Option elements defer to a parent optgroup if present
            if ("label" in elem) {
              if ("label" in elem.parentNode) {
                return elem.parentNode.disabled === disabled;
              } else {
                return elem.disabled === disabled;
              }
            } // Support: IE 6 - 11
            // Use the isDisabled shortcut property to check for disabled fieldset ancestors


            return elem.isDisabled === disabled || // Where there is no isDisabled, check manually

            /* jshint -W018 */
            elem.isDisabled !== !disabled && disabledAncestor(elem) === disabled;
          }

          return elem.disabled === disabled; // Try to winnow out elements that can't be disabled before trusting the disabled property.
          // Some victims get caught in our net (label, legend, menu, track), but it shouldn't
          // even exist on them, let alone have a boolean value.
        } else if ("label" in elem) {
          return elem.disabled === disabled;
        } // Remaining elements are neither :enabled nor :disabled


        return false;
      };
    }
    /**
     * Returns a function to use in pseudos for positionals
     * @param {Function} fn
     */


    function createPositionalPseudo(fn) {
      return markFunction(function (argument) {
        argument = +argument;
        return markFunction(function (seed, matches) {
          var j,
              matchIndexes = fn([], seed.length, argument),
              i = matchIndexes.length; // Match elements found at the specified indexes

          while (i--) {
            if (seed[j = matchIndexes[i]]) {
              seed[j] = !(matches[j] = seed[j]);
            }
          }
        });
      });
    }
    /**
     * Checks a node for validity as a Sizzle context
     * @param {Element|Object=} context
     * @returns {Element|Object|Boolean} The input node if acceptable, otherwise a falsy value
     */


    function testContext(context) {
      return context && typeof context.getElementsByTagName !== "undefined" && context;
    } // Expose support vars for convenience


    support = Sizzle.support = {};
    /**
     * Detects XML nodes
     * @param {Element|Object} elem An element or a document
     * @returns {Boolean} True iff elem is a non-HTML XML node
     */

    isXML = Sizzle.isXML = function (elem) {
      // documentElement is verified for cases where it doesn't yet exist
      // (such as loading iframes in IE - #4833)
      var documentElement = elem && (elem.ownerDocument || elem).documentElement;
      return documentElement ? documentElement.nodeName !== "HTML" : false;
    };
    /**
     * Sets document-related variables once based on the current document
     * @param {Element|Object} [doc] An element or document object to use to set the document
     * @returns {Object} Returns the current document
     */


    setDocument = Sizzle.setDocument = function (node) {
      var hasCompare,
          subWindow,
          doc = node ? node.ownerDocument || node : preferredDoc; // Return early if doc is invalid or already selected

      if (doc === document || doc.nodeType !== 9 || !doc.documentElement) {
        return document;
      } // Update global variables


      document = doc;
      docElem = document.documentElement;
      documentIsHTML = !isXML(document); // Support: IE 9-11, Edge
      // Accessing iframe documents after unload throws "permission denied" errors (jQuery #13936)

      if (preferredDoc !== document && (subWindow = document.defaultView) && subWindow.top !== subWindow) {
        // Support: IE 11, Edge
        if (subWindow.addEventListener) {
          subWindow.addEventListener("unload", unloadHandler, false); // Support: IE 9 - 10 only
        } else if (subWindow.attachEvent) {
          subWindow.attachEvent("onunload", unloadHandler);
        }
      }
      /* Attributes
      ---------------------------------------------------------------------- */
      // Support: IE<8
      // Verify that getAttribute really returns attributes and not properties
      // (excepting IE8 booleans)


      support.attributes = assert(function (el) {
        el.className = "i";
        return !el.getAttribute("className");
      });
      /* getElement(s)By*
      ---------------------------------------------------------------------- */
      // Check if getElementsByTagName("*") returns only elements

      support.getElementsByTagName = assert(function (el) {
        el.appendChild(document.createComment(""));
        return !el.getElementsByTagName("*").length;
      }); // Support: IE<9

      support.getElementsByClassName = rnative.test(document.getElementsByClassName); // Support: IE<10
      // Check if getElementById returns elements by name
      // The broken getElementById methods don't pick up programmatically-set names,
      // so use a roundabout getElementsByName test

      support.getById = assert(function (el) {
        docElem.appendChild(el).id = expando;
        return !document.getElementsByName || !document.getElementsByName(expando).length;
      }); // ID filter and find

      if (support.getById) {
        Expr.filter["ID"] = function (id) {
          var attrId = id.replace(runescape, funescape);
          return function (elem) {
            return elem.getAttribute("id") === attrId;
          };
        };

        Expr.find["ID"] = function (id, context) {
          if (typeof context.getElementById !== "undefined" && documentIsHTML) {
            var elem = context.getElementById(id);
            return elem ? [elem] : [];
          }
        };
      } else {
        Expr.filter["ID"] = function (id) {
          var attrId = id.replace(runescape, funescape);
          return function (elem) {
            var node = typeof elem.getAttributeNode !== "undefined" && elem.getAttributeNode("id");
            return node && node.value === attrId;
          };
        }; // Support: IE 6 - 7 only
        // getElementById is not reliable as a find shortcut


        Expr.find["ID"] = function (id, context) {
          if (typeof context.getElementById !== "undefined" && documentIsHTML) {
            var node,
                i,
                elems,
                elem = context.getElementById(id);

            if (elem) {
              // Verify the id attribute
              node = elem.getAttributeNode("id");

              if (node && node.value === id) {
                return [elem];
              } // Fall back on getElementsByName


              elems = context.getElementsByName(id);
              i = 0;

              while (elem = elems[i++]) {
                node = elem.getAttributeNode("id");

                if (node && node.value === id) {
                  return [elem];
                }
              }
            }

            return [];
          }
        };
      } // Tag


      Expr.find["TAG"] = support.getElementsByTagName ? function (tag, context) {
        if (typeof context.getElementsByTagName !== "undefined") {
          return context.getElementsByTagName(tag); // DocumentFragment nodes don't have gEBTN
        } else if (support.qsa) {
          return context.querySelectorAll(tag);
        }
      } : function (tag, context) {
        var elem,
            tmp = [],
            i = 0,
            // By happy coincidence, a (broken) gEBTN appears on DocumentFragment nodes too
        results = context.getElementsByTagName(tag); // Filter out possible comments

        if (tag === "*") {
          while (elem = results[i++]) {
            if (elem.nodeType === 1) {
              tmp.push(elem);
            }
          }

          return tmp;
        }

        return results;
      }; // Class

      Expr.find["CLASS"] = support.getElementsByClassName && function (className, context) {
        if (typeof context.getElementsByClassName !== "undefined" && documentIsHTML) {
          return context.getElementsByClassName(className);
        }
      };
      /* QSA/matchesSelector
      ---------------------------------------------------------------------- */
      // QSA and matchesSelector support
      // matchesSelector(:active) reports false when true (IE9/Opera 11.5)


      rbuggyMatches = []; // qSa(:focus) reports false when true (Chrome 21)
      // We allow this because of a bug in IE8/9 that throws an error
      // whenever `document.activeElement` is accessed on an iframe
      // So, we allow :focus to pass through QSA all the time to avoid the IE error
      // See https://bugs.jquery.com/ticket/13378

      rbuggyQSA = [];

      if (support.qsa = rnative.test(document.querySelectorAll)) {
        // Build QSA regex
        // Regex strategy adopted from Diego Perini
        assert(function (el) {
          // Select is set to empty string on purpose
          // This is to test IE's treatment of not explicitly
          // setting a boolean content attribute,
          // since its presence should be enough
          // https://bugs.jquery.com/ticket/12359
          docElem.appendChild(el).innerHTML = "<a id='" + expando + "'></a>" + "<select id='" + expando + "-\r\\' msallowcapture=''>" + "<option selected=''></option></select>"; // Support: IE8, Opera 11-12.16
          // Nothing should be selected when empty strings follow ^= or $= or *=
          // The test attribute must be unknown in Opera but "safe" for WinRT
          // https://msdn.microsoft.com/en-us/library/ie/hh465388.aspx#attribute_section

          if (el.querySelectorAll("[msallowcapture^='']").length) {
            rbuggyQSA.push("[*^$]=" + whitespace + "*(?:''|\"\")");
          } // Support: IE8
          // Boolean attributes and "value" are not treated correctly


          if (!el.querySelectorAll("[selected]").length) {
            rbuggyQSA.push("\\[" + whitespace + "*(?:value|" + booleans + ")");
          } // Support: Chrome<29, Android<4.4, Safari<7.0+, iOS<7.0+, PhantomJS<1.9.8+


          if (!el.querySelectorAll("[id~=" + expando + "-]").length) {
            rbuggyQSA.push("~=");
          } // Webkit/Opera - :checked should return selected option elements
          // http://www.w3.org/TR/2011/REC-css3-selectors-20110929/#checked
          // IE8 throws error here and will not see later tests


          if (!el.querySelectorAll(":checked").length) {
            rbuggyQSA.push(":checked");
          } // Support: Safari 8+, iOS 8+
          // https://bugs.webkit.org/show_bug.cgi?id=136851
          // In-page `selector#id sibling-combinator selector` fails


          if (!el.querySelectorAll("a#" + expando + "+*").length) {
            rbuggyQSA.push(".#.+[+~]");
          }
        });
        assert(function (el) {
          el.innerHTML = "<a href='' disabled='disabled'></a>" + "<select disabled='disabled'><option/></select>"; // Support: Windows 8 Native Apps
          // The type and name attributes are restricted during .innerHTML assignment

          var input = document.createElement("input");
          input.setAttribute("type", "hidden");
          el.appendChild(input).setAttribute("name", "D"); // Support: IE8
          // Enforce case-sensitivity of name attribute

          if (el.querySelectorAll("[name=d]").length) {
            rbuggyQSA.push("name" + whitespace + "*[*^$|!~]?=");
          } // FF 3.5 - :enabled/:disabled and hidden elements (hidden elements are still enabled)
          // IE8 throws error here and will not see later tests


          if (el.querySelectorAll(":enabled").length !== 2) {
            rbuggyQSA.push(":enabled", ":disabled");
          } // Support: IE9-11+
          // IE's :disabled selector does not pick up the children of disabled fieldsets


          docElem.appendChild(el).disabled = true;

          if (el.querySelectorAll(":disabled").length !== 2) {
            rbuggyQSA.push(":enabled", ":disabled");
          } // Opera 10-11 does not throw on post-comma invalid pseudos


          el.querySelectorAll("*,:x");
          rbuggyQSA.push(",.*:");
        });
      }

      if (support.matchesSelector = rnative.test(matches = docElem.matches || docElem.webkitMatchesSelector || docElem.mozMatchesSelector || docElem.oMatchesSelector || docElem.msMatchesSelector)) {
        assert(function (el) {
          // Check to see if it's possible to do matchesSelector
          // on a disconnected node (IE 9)
          support.disconnectedMatch = matches.call(el, "*"); // This should fail with an exception
          // Gecko does not error, returns false instead

          matches.call(el, "[s!='']:x");
          rbuggyMatches.push("!=", pseudos);
        });
      }

      rbuggyQSA = rbuggyQSA.length && new RegExp(rbuggyQSA.join("|"));
      rbuggyMatches = rbuggyMatches.length && new RegExp(rbuggyMatches.join("|"));
      /* Contains
      ---------------------------------------------------------------------- */

      hasCompare = rnative.test(docElem.compareDocumentPosition); // Element contains another
      // Purposefully self-exclusive
      // As in, an element does not contain itself

      contains = hasCompare || rnative.test(docElem.contains) ? function (a, b) {
        var adown = a.nodeType === 9 ? a.documentElement : a,
            bup = b && b.parentNode;
        return a === bup || !!(bup && bup.nodeType === 1 && (adown.contains ? adown.contains(bup) : a.compareDocumentPosition && a.compareDocumentPosition(bup) & 16));
      } : function (a, b) {
        if (b) {
          while (b = b.parentNode) {
            if (b === a) {
              return true;
            }
          }
        }

        return false;
      };
      /* Sorting
      ---------------------------------------------------------------------- */
      // Document order sorting

      sortOrder = hasCompare ? function (a, b) {
        // Flag for duplicate removal
        if (a === b) {
          hasDuplicate = true;
          return 0;
        } // Sort on method existence if only one input has compareDocumentPosition


        var compare = !a.compareDocumentPosition - !b.compareDocumentPosition;

        if (compare) {
          return compare;
        } // Calculate position if both inputs belong to the same document


        compare = (a.ownerDocument || a) === (b.ownerDocument || b) ? a.compareDocumentPosition(b) : // Otherwise we know they are disconnected
        1; // Disconnected nodes

        if (compare & 1 || !support.sortDetached && b.compareDocumentPosition(a) === compare) {
          // Choose the first element that is related to our preferred document
          if (a === document || a.ownerDocument === preferredDoc && contains(preferredDoc, a)) {
            return -1;
          }

          if (b === document || b.ownerDocument === preferredDoc && contains(preferredDoc, b)) {
            return 1;
          } // Maintain original order


          return sortInput ? indexOf(sortInput, a) - indexOf(sortInput, b) : 0;
        }

        return compare & 4 ? -1 : 1;
      } : function (a, b) {
        // Exit early if the nodes are identical
        if (a === b) {
          hasDuplicate = true;
          return 0;
        }

        var cur,
            i = 0,
            aup = a.parentNode,
            bup = b.parentNode,
            ap = [a],
            bp = [b]; // Parentless nodes are either documents or disconnected

        if (!aup || !bup) {
          return a === document ? -1 : b === document ? 1 : aup ? -1 : bup ? 1 : sortInput ? indexOf(sortInput, a) - indexOf(sortInput, b) : 0; // If the nodes are siblings, we can do a quick check
        } else if (aup === bup) {
          return siblingCheck(a, b);
        } // Otherwise we need full lists of their ancestors for comparison


        cur = a;

        while (cur = cur.parentNode) {
          ap.unshift(cur);
        }

        cur = b;

        while (cur = cur.parentNode) {
          bp.unshift(cur);
        } // Walk down the tree looking for a discrepancy


        while (ap[i] === bp[i]) {
          i++;
        }

        return i ? // Do a sibling check if the nodes have a common ancestor
        siblingCheck(ap[i], bp[i]) : // Otherwise nodes in our document sort first
        ap[i] === preferredDoc ? -1 : bp[i] === preferredDoc ? 1 : 0;
      };
      return document;
    };

    Sizzle.matches = function (expr, elements) {
      return Sizzle(expr, null, null, elements);
    };

    Sizzle.matchesSelector = function (elem, expr) {
      // Set document vars if needed
      if ((elem.ownerDocument || elem) !== document) {
        setDocument(elem);
      } // Make sure that attribute selectors are quoted


      expr = expr.replace(rattributeQuotes, "='$1']");

      if (support.matchesSelector && documentIsHTML && !compilerCache[expr + " "] && (!rbuggyMatches || !rbuggyMatches.test(expr)) && (!rbuggyQSA || !rbuggyQSA.test(expr))) {
        try {
          var ret = matches.call(elem, expr); // IE 9's matchesSelector returns false on disconnected nodes

          if (ret || support.disconnectedMatch || // As well, disconnected nodes are said to be in a document
          // fragment in IE 9
          elem.document && elem.document.nodeType !== 11) {
            return ret;
          }
        } catch (e) {}
      }

      return Sizzle(expr, document, null, [elem]).length > 0;
    };

    Sizzle.contains = function (context, elem) {
      // Set document vars if needed
      if ((context.ownerDocument || context) !== document) {
        setDocument(context);
      }

      return contains(context, elem);
    };

    Sizzle.attr = function (elem, name) {
      // Set document vars if needed
      if ((elem.ownerDocument || elem) !== document) {
        setDocument(elem);
      }

      var fn = Expr.attrHandle[name.toLowerCase()],
          // Don't get fooled by Object.prototype properties (jQuery #13807)
      val = fn && hasOwn.call(Expr.attrHandle, name.toLowerCase()) ? fn(elem, name, !documentIsHTML) : undefined;
      return val !== undefined ? val : support.attributes || !documentIsHTML ? elem.getAttribute(name) : (val = elem.getAttributeNode(name)) && val.specified ? val.value : null;
    };

    Sizzle.escape = function (sel) {
      return (sel + "").replace(rcssescape, fcssescape);
    };

    Sizzle.error = function (msg) {
      throw new Error("Syntax error, unrecognized expression: " + msg);
    };
    /**
     * Document sorting and removing duplicates
     * @param {ArrayLike} results
     */


    Sizzle.uniqueSort = function (results) {
      var elem,
          duplicates = [],
          j = 0,
          i = 0; // Unless we *know* we can detect duplicates, assume their presence

      hasDuplicate = !support.detectDuplicates;
      sortInput = !support.sortStable && results.slice(0);
      results.sort(sortOrder);

      if (hasDuplicate) {
        while (elem = results[i++]) {
          if (elem === results[i]) {
            j = duplicates.push(i);
          }
        }

        while (j--) {
          results.splice(duplicates[j], 1);
        }
      } // Clear input after sorting to release objects
      // See https://github.com/jquery/sizzle/pull/225


      sortInput = null;
      return results;
    };
    /**
     * Utility function for retrieving the text value of an array of DOM nodes
     * @param {Array|Element} elem
     */


    getText = Sizzle.getText = function (elem) {
      var node,
          ret = "",
          i = 0,
          nodeType = elem.nodeType;

      if (!nodeType) {
        // If no nodeType, this is expected to be an array
        while (node = elem[i++]) {
          // Do not traverse comment nodes
          ret += getText(node);
        }
      } else if (nodeType === 1 || nodeType === 9 || nodeType === 11) {
        // Use textContent for elements
        // innerText usage removed for consistency of new lines (jQuery #11153)
        if (typeof elem.textContent === "string") {
          return elem.textContent;
        } else {
          // Traverse its children
          for (elem = elem.firstChild; elem; elem = elem.nextSibling) {
            ret += getText(elem);
          }
        }
      } else if (nodeType === 3 || nodeType === 4) {
        return elem.nodeValue;
      } // Do not include comment or processing instruction nodes


      return ret;
    };

    Expr = Sizzle.selectors = {
      // Can be adjusted by the user
      cacheLength: 50,
      createPseudo: markFunction,
      match: matchExpr,
      attrHandle: {},
      find: {},
      relative: {
        ">": {
          dir: "parentNode",
          first: true
        },
        " ": {
          dir: "parentNode"
        },
        "+": {
          dir: "previousSibling",
          first: true
        },
        "~": {
          dir: "previousSibling"
        }
      },
      preFilter: {
        "ATTR": function (match) {
          match[1] = match[1].replace(runescape, funescape); // Move the given value to match[3] whether quoted or unquoted

          match[3] = (match[3] || match[4] || match[5] || "").replace(runescape, funescape);

          if (match[2] === "~=") {
            match[3] = " " + match[3] + " ";
          }

          return match.slice(0, 4);
        },
        "CHILD": function (match) {
          /* matches from matchExpr["CHILD"]
          	1 type (only|nth|...)
          	2 what (child|of-type)
          	3 argument (even|odd|\d*|\d*n([+-]\d+)?|...)
          	4 xn-component of xn+y argument ([+-]?\d*n|)
          	5 sign of xn-component
          	6 x of xn-component
          	7 sign of y-component
          	8 y of y-component
          */
          match[1] = match[1].toLowerCase();

          if (match[1].slice(0, 3) === "nth") {
            // nth-* requires argument
            if (!match[3]) {
              Sizzle.error(match[0]);
            } // numeric x and y parameters for Expr.filter.CHILD
            // remember that false/true cast respectively to 0/1


            match[4] = +(match[4] ? match[5] + (match[6] || 1) : 2 * (match[3] === "even" || match[3] === "odd"));
            match[5] = +(match[7] + match[8] || match[3] === "odd"); // other types prohibit arguments
          } else if (match[3]) {
            Sizzle.error(match[0]);
          }

          return match;
        },
        "PSEUDO": function (match) {
          var excess,
              unquoted = !match[6] && match[2];

          if (matchExpr["CHILD"].test(match[0])) {
            return null;
          } // Accept quoted arguments as-is


          if (match[3]) {
            match[2] = match[4] || match[5] || ""; // Strip excess characters from unquoted arguments
          } else if (unquoted && rpseudo.test(unquoted) && ( // Get excess from tokenize (recursively)
          excess = tokenize(unquoted, true)) && ( // advance to the next closing parenthesis
          excess = unquoted.indexOf(")", unquoted.length - excess) - unquoted.length)) {
            // excess is a negative index
            match[0] = match[0].slice(0, excess);
            match[2] = unquoted.slice(0, excess);
          } // Return only captures needed by the pseudo filter method (type and argument)


          return match.slice(0, 3);
        }
      },
      filter: {
        "TAG": function (nodeNameSelector) {
          var nodeName = nodeNameSelector.replace(runescape, funescape).toLowerCase();
          return nodeNameSelector === "*" ? function () {
            return true;
          } : function (elem) {
            return elem.nodeName && elem.nodeName.toLowerCase() === nodeName;
          };
        },
        "CLASS": function (className) {
          var pattern = classCache[className + " "];
          return pattern || (pattern = new RegExp("(^|" + whitespace + ")" + className + "(" + whitespace + "|$)")) && classCache(className, function (elem) {
            return pattern.test(typeof elem.className === "string" && elem.className || typeof elem.getAttribute !== "undefined" && elem.getAttribute("class") || "");
          });
        },
        "ATTR": function (name, operator, check) {
          return function (elem) {
            var result = Sizzle.attr(elem, name);

            if (result == null) {
              return operator === "!=";
            }

            if (!operator) {
              return true;
            }

            result += "";
            return operator === "=" ? result === check : operator === "!=" ? result !== check : operator === "^=" ? check && result.indexOf(check) === 0 : operator === "*=" ? check && result.indexOf(check) > -1 : operator === "$=" ? check && result.slice(-check.length) === check : operator === "~=" ? (" " + result.replace(rwhitespace, " ") + " ").indexOf(check) > -1 : operator === "|=" ? result === check || result.slice(0, check.length + 1) === check + "-" : false;
          };
        },
        "CHILD": function (type, what, argument, first, last) {
          var simple = type.slice(0, 3) !== "nth",
              forward = type.slice(-4) !== "last",
              ofType = what === "of-type";
          return first === 1 && last === 0 ? // Shortcut for :nth-*(n)
          function (elem) {
            return !!elem.parentNode;
          } : function (elem, context, xml) {
            var cache,
                uniqueCache,
                outerCache,
                node,
                nodeIndex,
                start,
                dir = simple !== forward ? "nextSibling" : "previousSibling",
                parent = elem.parentNode,
                name = ofType && elem.nodeName.toLowerCase(),
                useCache = !xml && !ofType,
                diff = false;

            if (parent) {
              // :(first|last|only)-(child|of-type)
              if (simple) {
                while (dir) {
                  node = elem;

                  while (node = node[dir]) {
                    if (ofType ? node.nodeName.toLowerCase() === name : node.nodeType === 1) {
                      return false;
                    }
                  } // Reverse direction for :only-* (if we haven't yet done so)


                  start = dir = type === "only" && !start && "nextSibling";
                }

                return true;
              }

              start = [forward ? parent.firstChild : parent.lastChild]; // non-xml :nth-child(...) stores cache data on `parent`

              if (forward && useCache) {
                // Seek `elem` from a previously-cached index
                // ...in a gzip-friendly way
                node = parent;
                outerCache = node[expando] || (node[expando] = {}); // Support: IE <9 only
                // Defend against cloned attroperties (jQuery gh-1709)

                uniqueCache = outerCache[node.uniqueID] || (outerCache[node.uniqueID] = {});
                cache = uniqueCache[type] || [];
                nodeIndex = cache[0] === dirruns && cache[1];
                diff = nodeIndex && cache[2];
                node = nodeIndex && parent.childNodes[nodeIndex];

                while (node = ++nodeIndex && node && node[dir] || ( // Fallback to seeking `elem` from the start
                diff = nodeIndex = 0) || start.pop()) {
                  // When found, cache indexes on `parent` and break
                  if (node.nodeType === 1 && ++diff && node === elem) {
                    uniqueCache[type] = [dirruns, nodeIndex, diff];
                    break;
                  }
                }
              } else {
                // Use previously-cached element index if available
                if (useCache) {
                  // ...in a gzip-friendly way
                  node = elem;
                  outerCache = node[expando] || (node[expando] = {}); // Support: IE <9 only
                  // Defend against cloned attroperties (jQuery gh-1709)

                  uniqueCache = outerCache[node.uniqueID] || (outerCache[node.uniqueID] = {});
                  cache = uniqueCache[type] || [];
                  nodeIndex = cache[0] === dirruns && cache[1];
                  diff = nodeIndex;
                } // xml :nth-child(...)
                // or :nth-last-child(...) or :nth(-last)?-of-type(...)


                if (diff === false) {
                  // Use the same loop as above to seek `elem` from the start
                  while (node = ++nodeIndex && node && node[dir] || (diff = nodeIndex = 0) || start.pop()) {
                    if ((ofType ? node.nodeName.toLowerCase() === name : node.nodeType === 1) && ++diff) {
                      // Cache the index of each encountered element
                      if (useCache) {
                        outerCache = node[expando] || (node[expando] = {}); // Support: IE <9 only
                        // Defend against cloned attroperties (jQuery gh-1709)

                        uniqueCache = outerCache[node.uniqueID] || (outerCache[node.uniqueID] = {});
                        uniqueCache[type] = [dirruns, diff];
                      }

                      if (node === elem) {
                        break;
                      }
                    }
                  }
                }
              } // Incorporate the offset, then check against cycle size


              diff -= last;
              return diff === first || diff % first === 0 && diff / first >= 0;
            }
          };
        },
        "PSEUDO": function (pseudo, argument) {
          // pseudo-class names are case-insensitive
          // http://www.w3.org/TR/selectors/#pseudo-classes
          // Prioritize by case sensitivity in case custom pseudos are added with uppercase letters
          // Remember that setFilters inherits from pseudos
          var args,
              fn = Expr.pseudos[pseudo] || Expr.setFilters[pseudo.toLowerCase()] || Sizzle.error("unsupported pseudo: " + pseudo); // The user may use createPseudo to indicate that
          // arguments are needed to create the filter function
          // just as Sizzle does

          if (fn[expando]) {
            return fn(argument);
          } // But maintain support for old signatures


          if (fn.length > 1) {
            args = [pseudo, pseudo, "", argument];
            return Expr.setFilters.hasOwnProperty(pseudo.toLowerCase()) ? markFunction(function (seed, matches) {
              var idx,
                  matched = fn(seed, argument),
                  i = matched.length;

              while (i--) {
                idx = indexOf(seed, matched[i]);
                seed[idx] = !(matches[idx] = matched[i]);
              }
            }) : function (elem) {
              return fn(elem, 0, args);
            };
          }

          return fn;
        }
      },
      pseudos: {
        // Potentially complex pseudos
        "not": markFunction(function (selector) {
          // Trim the selector passed to compile
          // to avoid treating leading and trailing
          // spaces as combinators
          var input = [],
              results = [],
              matcher = compile(selector.replace(rtrim, "$1"));
          return matcher[expando] ? markFunction(function (seed, matches, context, xml) {
            var elem,
                unmatched = matcher(seed, null, xml, []),
                i = seed.length; // Match elements unmatched by `matcher`

            while (i--) {
              if (elem = unmatched[i]) {
                seed[i] = !(matches[i] = elem);
              }
            }
          }) : function (elem, context, xml) {
            input[0] = elem;
            matcher(input, null, xml, results); // Don't keep the element (issue #299)

            input[0] = null;
            return !results.pop();
          };
        }),
        "has": markFunction(function (selector) {
          return function (elem) {
            return Sizzle(selector, elem).length > 0;
          };
        }),
        "contains": markFunction(function (text) {
          text = text.replace(runescape, funescape);
          return function (elem) {
            return (elem.textContent || elem.innerText || getText(elem)).indexOf(text) > -1;
          };
        }),
        // "Whether an element is represented by a :lang() selector
        // is based solely on the element's language value
        // being equal to the identifier C,
        // or beginning with the identifier C immediately followed by "-".
        // The matching of C against the element's language value is performed case-insensitively.
        // The identifier C does not have to be a valid language name."
        // http://www.w3.org/TR/selectors/#lang-pseudo
        "lang": markFunction(function (lang) {
          // lang value must be a valid identifier
          if (!ridentifier.test(lang || "")) {
            Sizzle.error("unsupported lang: " + lang);
          }

          lang = lang.replace(runescape, funescape).toLowerCase();
          return function (elem) {
            var elemLang;

            do {
              if (elemLang = documentIsHTML ? elem.lang : elem.getAttribute("xml:lang") || elem.getAttribute("lang")) {
                elemLang = elemLang.toLowerCase();
                return elemLang === lang || elemLang.indexOf(lang + "-") === 0;
              }
            } while ((elem = elem.parentNode) && elem.nodeType === 1);

            return false;
          };
        }),
        // Miscellaneous
        "target": function (elem) {
          var hash = window.location && window.location.hash;
          return hash && hash.slice(1) === elem.id;
        },
        "root": function (elem) {
          return elem === docElem;
        },
        "focus": function (elem) {
          return elem === document.activeElement && (!document.hasFocus || document.hasFocus()) && !!(elem.type || elem.href || ~elem.tabIndex);
        },
        // Boolean properties
        "enabled": createDisabledPseudo(false),
        "disabled": createDisabledPseudo(true),
        "checked": function (elem) {
          // In CSS3, :checked should return both checked and selected elements
          // http://www.w3.org/TR/2011/REC-css3-selectors-20110929/#checked
          var nodeName = elem.nodeName.toLowerCase();
          return nodeName === "input" && !!elem.checked || nodeName === "option" && !!elem.selected;
        },
        "selected": function (elem) {
          // Accessing this property makes selected-by-default
          // options in Safari work properly
          if (elem.parentNode) {
            elem.parentNode.selectedIndex;
          }

          return elem.selected === true;
        },
        // Contents
        "empty": function (elem) {
          // http://www.w3.org/TR/selectors/#empty-pseudo
          // :empty is negated by element (1) or content nodes (text: 3; cdata: 4; entity ref: 5),
          //   but not by others (comment: 8; processing instruction: 7; etc.)
          // nodeType < 6 works because attributes (2) do not appear as children
          for (elem = elem.firstChild; elem; elem = elem.nextSibling) {
            if (elem.nodeType < 6) {
              return false;
            }
          }

          return true;
        },
        "parent": function (elem) {
          return !Expr.pseudos["empty"](elem);
        },
        // Element/input types
        "header": function (elem) {
          return rheader.test(elem.nodeName);
        },
        "input": function (elem) {
          return rinputs.test(elem.nodeName);
        },
        "button": function (elem) {
          var name = elem.nodeName.toLowerCase();
          return name === "input" && elem.type === "button" || name === "button";
        },
        "text": function (elem) {
          var attr;
          return elem.nodeName.toLowerCase() === "input" && elem.type === "text" && ( // Support: IE<8
          // New HTML5 attribute values (e.g., "search") appear with elem.type === "text"
          (attr = elem.getAttribute("type")) == null || attr.toLowerCase() === "text");
        },
        // Position-in-collection
        "first": createPositionalPseudo(function () {
          return [0];
        }),
        "last": createPositionalPseudo(function (matchIndexes, length) {
          return [length - 1];
        }),
        "eq": createPositionalPseudo(function (matchIndexes, length, argument) {
          return [argument < 0 ? argument + length : argument];
        }),
        "even": createPositionalPseudo(function (matchIndexes, length) {
          var i = 0;

          for (; i < length; i += 2) {
            matchIndexes.push(i);
          }

          return matchIndexes;
        }),
        "odd": createPositionalPseudo(function (matchIndexes, length) {
          var i = 1;

          for (; i < length; i += 2) {
            matchIndexes.push(i);
          }

          return matchIndexes;
        }),
        "lt": createPositionalPseudo(function (matchIndexes, length, argument) {
          var i = argument < 0 ? argument + length : argument;

          for (; --i >= 0;) {
            matchIndexes.push(i);
          }

          return matchIndexes;
        }),
        "gt": createPositionalPseudo(function (matchIndexes, length, argument) {
          var i = argument < 0 ? argument + length : argument;

          for (; ++i < length;) {
            matchIndexes.push(i);
          }

          return matchIndexes;
        })
      }
    };
    Expr.pseudos["nth"] = Expr.pseudos["eq"]; // Add button/input type pseudos

    for (i in {
      radio: true,
      checkbox: true,
      file: true,
      password: true,
      image: true
    }) {
      Expr.pseudos[i] = createInputPseudo(i);
    }

    for (i in {
      submit: true,
      reset: true
    }) {
      Expr.pseudos[i] = createButtonPseudo(i);
    } // Easy API for creating new setFilters


    function setFilters() {}

    setFilters.prototype = Expr.filters = Expr.pseudos;
    Expr.setFilters = new setFilters();

    tokenize = Sizzle.tokenize = function (selector, parseOnly) {
      var matched,
          match,
          tokens,
          type,
          soFar,
          groups,
          preFilters,
          cached = tokenCache[selector + " "];

      if (cached) {
        return parseOnly ? 0 : cached.slice(0);
      }

      soFar = selector;
      groups = [];
      preFilters = Expr.preFilter;

      while (soFar) {
        // Comma and first run
        if (!matched || (match = rcomma.exec(soFar))) {
          if (match) {
            // Don't consume trailing commas as valid
            soFar = soFar.slice(match[0].length) || soFar;
          }

          groups.push(tokens = []);
        }

        matched = false; // Combinators

        if (match = rcombinators.exec(soFar)) {
          matched = match.shift();
          tokens.push({
            value: matched,
            // Cast descendant combinators to space
            type: match[0].replace(rtrim, " ")
          });
          soFar = soFar.slice(matched.length);
        } // Filters


        for (type in Expr.filter) {
          if ((match = matchExpr[type].exec(soFar)) && (!preFilters[type] || (match = preFilters[type](match)))) {
            matched = match.shift();
            tokens.push({
              value: matched,
              type: type,
              matches: match
            });
            soFar = soFar.slice(matched.length);
          }
        }

        if (!matched) {
          break;
        }
      } // Return the length of the invalid excess
      // if we're just parsing
      // Otherwise, throw an error or return tokens


      return parseOnly ? soFar.length : soFar ? Sizzle.error(selector) : // Cache the tokens
      tokenCache(selector, groups).slice(0);
    };

    function toSelector(tokens) {
      var i = 0,
          len = tokens.length,
          selector = "";

      for (; i < len; i++) {
        selector += tokens[i].value;
      }

      return selector;
    }

    function addCombinator(matcher, combinator, base) {
      var dir = combinator.dir,
          skip = combinator.next,
          key = skip || dir,
          checkNonElements = base && key === "parentNode",
          doneName = done++;
      return combinator.first ? // Check against closest ancestor/preceding element
      function (elem, context, xml) {
        while (elem = elem[dir]) {
          if (elem.nodeType === 1 || checkNonElements) {
            return matcher(elem, context, xml);
          }
        }

        return false;
      } : // Check against all ancestor/preceding elements
      function (elem, context, xml) {
        var oldCache,
            uniqueCache,
            outerCache,
            newCache = [dirruns, doneName]; // We can't set arbitrary data on XML nodes, so they don't benefit from combinator caching

        if (xml) {
          while (elem = elem[dir]) {
            if (elem.nodeType === 1 || checkNonElements) {
              if (matcher(elem, context, xml)) {
                return true;
              }
            }
          }
        } else {
          while (elem = elem[dir]) {
            if (elem.nodeType === 1 || checkNonElements) {
              outerCache = elem[expando] || (elem[expando] = {}); // Support: IE <9 only
              // Defend against cloned attroperties (jQuery gh-1709)

              uniqueCache = outerCache[elem.uniqueID] || (outerCache[elem.uniqueID] = {});

              if (skip && skip === elem.nodeName.toLowerCase()) {
                elem = elem[dir] || elem;
              } else if ((oldCache = uniqueCache[key]) && oldCache[0] === dirruns && oldCache[1] === doneName) {
                // Assign to newCache so results back-propagate to previous elements
                return newCache[2] = oldCache[2];
              } else {
                // Reuse newcache so results back-propagate to previous elements
                uniqueCache[key] = newCache; // A match means we're done; a fail means we have to keep checking

                if (newCache[2] = matcher(elem, context, xml)) {
                  return true;
                }
              }
            }
          }
        }

        return false;
      };
    }

    function elementMatcher(matchers) {
      return matchers.length > 1 ? function (elem, context, xml) {
        var i = matchers.length;

        while (i--) {
          if (!matchers[i](elem, context, xml)) {
            return false;
          }
        }

        return true;
      } : matchers[0];
    }

    function multipleContexts(selector, contexts, results) {
      var i = 0,
          len = contexts.length;

      for (; i < len; i++) {
        Sizzle(selector, contexts[i], results);
      }

      return results;
    }

    function condense(unmatched, map, filter, context, xml) {
      var elem,
          newUnmatched = [],
          i = 0,
          len = unmatched.length,
          mapped = map != null;

      for (; i < len; i++) {
        if (elem = unmatched[i]) {
          if (!filter || filter(elem, context, xml)) {
            newUnmatched.push(elem);

            if (mapped) {
              map.push(i);
            }
          }
        }
      }

      return newUnmatched;
    }

    function setMatcher(preFilter, selector, matcher, postFilter, postFinder, postSelector) {
      if (postFilter && !postFilter[expando]) {
        postFilter = setMatcher(postFilter);
      }

      if (postFinder && !postFinder[expando]) {
        postFinder = setMatcher(postFinder, postSelector);
      }

      return markFunction(function (seed, results, context, xml) {
        var temp,
            i,
            elem,
            preMap = [],
            postMap = [],
            preexisting = results.length,
            // Get initial elements from seed or context
        elems = seed || multipleContexts(selector || "*", context.nodeType ? [context] : context, []),
            // Prefilter to get matcher input, preserving a map for seed-results synchronization
        matcherIn = preFilter && (seed || !selector) ? condense(elems, preMap, preFilter, context, xml) : elems,
            matcherOut = matcher ? // If we have a postFinder, or filtered seed, or non-seed postFilter or preexisting results,
        postFinder || (seed ? preFilter : preexisting || postFilter) ? // ...intermediate processing is necessary
        [] : // ...otherwise use results directly
        results : matcherIn; // Find primary matches

        if (matcher) {
          matcher(matcherIn, matcherOut, context, xml);
        } // Apply postFilter


        if (postFilter) {
          temp = condense(matcherOut, postMap);
          postFilter(temp, [], context, xml); // Un-match failing elements by moving them back to matcherIn

          i = temp.length;

          while (i--) {
            if (elem = temp[i]) {
              matcherOut[postMap[i]] = !(matcherIn[postMap[i]] = elem);
            }
          }
        }

        if (seed) {
          if (postFinder || preFilter) {
            if (postFinder) {
              // Get the final matcherOut by condensing this intermediate into postFinder contexts
              temp = [];
              i = matcherOut.length;

              while (i--) {
                if (elem = matcherOut[i]) {
                  // Restore matcherIn since elem is not yet a final match
                  temp.push(matcherIn[i] = elem);
                }
              }

              postFinder(null, matcherOut = [], temp, xml);
            } // Move matched elements from seed to results to keep them synchronized


            i = matcherOut.length;

            while (i--) {
              if ((elem = matcherOut[i]) && (temp = postFinder ? indexOf(seed, elem) : preMap[i]) > -1) {
                seed[temp] = !(results[temp] = elem);
              }
            }
          } // Add elements to results, through postFinder if defined

        } else {
          matcherOut = condense(matcherOut === results ? matcherOut.splice(preexisting, matcherOut.length) : matcherOut);

          if (postFinder) {
            postFinder(null, results, matcherOut, xml);
          } else {
            push.apply(results, matcherOut);
          }
        }
      });
    }

    function matcherFromTokens(tokens) {
      var checkContext,
          matcher,
          j,
          len = tokens.length,
          leadingRelative = Expr.relative[tokens[0].type],
          implicitRelative = leadingRelative || Expr.relative[" "],
          i = leadingRelative ? 1 : 0,
          // The foundational matcher ensures that elements are reachable from top-level context(s)
      matchContext = addCombinator(function (elem) {
        return elem === checkContext;
      }, implicitRelative, true),
          matchAnyContext = addCombinator(function (elem) {
        return indexOf(checkContext, elem) > -1;
      }, implicitRelative, true),
          matchers = [function (elem, context, xml) {
        var ret = !leadingRelative && (xml || context !== outermostContext) || ((checkContext = context).nodeType ? matchContext(elem, context, xml) : matchAnyContext(elem, context, xml)); // Avoid hanging onto element (issue #299)

        checkContext = null;
        return ret;
      }];

      for (; i < len; i++) {
        if (matcher = Expr.relative[tokens[i].type]) {
          matchers = [addCombinator(elementMatcher(matchers), matcher)];
        } else {
          matcher = Expr.filter[tokens[i].type].apply(null, tokens[i].matches); // Return special upon seeing a positional matcher

          if (matcher[expando]) {
            // Find the next relative operator (if any) for proper handling
            j = ++i;

            for (; j < len; j++) {
              if (Expr.relative[tokens[j].type]) {
                break;
              }
            }

            return setMatcher(i > 1 && elementMatcher(matchers), i > 1 && toSelector( // If the preceding token was a descendant combinator, insert an implicit any-element `*`
            tokens.slice(0, i - 1).concat({
              value: tokens[i - 2].type === " " ? "*" : ""
            })).replace(rtrim, "$1"), matcher, i < j && matcherFromTokens(tokens.slice(i, j)), j < len && matcherFromTokens(tokens = tokens.slice(j)), j < len && toSelector(tokens));
          }

          matchers.push(matcher);
        }
      }

      return elementMatcher(matchers);
    }

    function matcherFromGroupMatchers(elementMatchers, setMatchers) {
      var bySet = setMatchers.length > 0,
          byElement = elementMatchers.length > 0,
          superMatcher = function (seed, context, xml, results, outermost) {
        var elem,
            j,
            matcher,
            matchedCount = 0,
            i = "0",
            unmatched = seed && [],
            setMatched = [],
            contextBackup = outermostContext,
            // We must always have either seed elements or outermost context
        elems = seed || byElement && Expr.find["TAG"]("*", outermost),
            // Use integer dirruns iff this is the outermost matcher
        dirrunsUnique = dirruns += contextBackup == null ? 1 : Math.random() || 0.1,
            len = elems.length;

        if (outermost) {
          outermostContext = context === document || context || outermost;
        } // Add elements passing elementMatchers directly to results
        // Support: IE<9, Safari
        // Tolerate NodeList properties (IE: "length"; Safari: <number>) matching elements by id


        for (; i !== len && (elem = elems[i]) != null; i++) {
          if (byElement && elem) {
            j = 0;

            if (!context && elem.ownerDocument !== document) {
              setDocument(elem);
              xml = !documentIsHTML;
            }

            while (matcher = elementMatchers[j++]) {
              if (matcher(elem, context || document, xml)) {
                results.push(elem);
                break;
              }
            }

            if (outermost) {
              dirruns = dirrunsUnique;
            }
          } // Track unmatched elements for set filters


          if (bySet) {
            // They will have gone through all possible matchers
            if (elem = !matcher && elem) {
              matchedCount--;
            } // Lengthen the array for every element, matched or not


            if (seed) {
              unmatched.push(elem);
            }
          }
        } // `i` is now the count of elements visited above, and adding it to `matchedCount`
        // makes the latter nonnegative.


        matchedCount += i; // Apply set filters to unmatched elements
        // NOTE: This can be skipped if there are no unmatched elements (i.e., `matchedCount`
        // equals `i`), unless we didn't visit _any_ elements in the above loop because we have
        // no element matchers and no seed.
        // Incrementing an initially-string "0" `i` allows `i` to remain a string only in that
        // case, which will result in a "00" `matchedCount` that differs from `i` but is also
        // numerically zero.

        if (bySet && i !== matchedCount) {
          j = 0;

          while (matcher = setMatchers[j++]) {
            matcher(unmatched, setMatched, context, xml);
          }

          if (seed) {
            // Reintegrate element matches to eliminate the need for sorting
            if (matchedCount > 0) {
              while (i--) {
                if (!(unmatched[i] || setMatched[i])) {
                  setMatched[i] = pop.call(results);
                }
              }
            } // Discard index placeholder values to get only actual matches


            setMatched = condense(setMatched);
          } // Add matches to results


          push.apply(results, setMatched); // Seedless set matches succeeding multiple successful matchers stipulate sorting

          if (outermost && !seed && setMatched.length > 0 && matchedCount + setMatchers.length > 1) {
            Sizzle.uniqueSort(results);
          }
        } // Override manipulation of globals by nested matchers


        if (outermost) {
          dirruns = dirrunsUnique;
          outermostContext = contextBackup;
        }

        return unmatched;
      };

      return bySet ? markFunction(superMatcher) : superMatcher;
    }

    compile = Sizzle.compile = function (selector, match
    /* Internal Use Only */
    ) {
      var i,
          setMatchers = [],
          elementMatchers = [],
          cached = compilerCache[selector + " "];

      if (!cached) {
        // Generate a function of recursive functions that can be used to check each element
        if (!match) {
          match = tokenize(selector);
        }

        i = match.length;

        while (i--) {
          cached = matcherFromTokens(match[i]);

          if (cached[expando]) {
            setMatchers.push(cached);
          } else {
            elementMatchers.push(cached);
          }
        } // Cache the compiled function


        cached = compilerCache(selector, matcherFromGroupMatchers(elementMatchers, setMatchers)); // Save selector and tokenization

        cached.selector = selector;
      }

      return cached;
    };
    /**
     * A low-level selection function that works with Sizzle's compiled
     *  selector functions
     * @param {String|Function} selector A selector or a pre-compiled
     *  selector function built with Sizzle.compile
     * @param {Element} context
     * @param {Array} [results]
     * @param {Array} [seed] A set of elements to match against
     */


    select = Sizzle.select = function (selector, context, results, seed) {
      var i,
          tokens,
          token,
          type,
          find,
          compiled = typeof selector === "function" && selector,
          match = !seed && tokenize(selector = compiled.selector || selector);
      results = results || []; // Try to minimize operations if there is only one selector in the list and no seed
      // (the latter of which guarantees us context)

      if (match.length === 1) {
        // Reduce context if the leading compound selector is an ID
        tokens = match[0] = match[0].slice(0);

        if (tokens.length > 2 && (token = tokens[0]).type === "ID" && context.nodeType === 9 && documentIsHTML && Expr.relative[tokens[1].type]) {
          context = (Expr.find["ID"](token.matches[0].replace(runescape, funescape), context) || [])[0];

          if (!context) {
            return results; // Precompiled matchers will still verify ancestry, so step up a level
          } else if (compiled) {
            context = context.parentNode;
          }

          selector = selector.slice(tokens.shift().value.length);
        } // Fetch a seed set for right-to-left matching


        i = matchExpr["needsContext"].test(selector) ? 0 : tokens.length;

        while (i--) {
          token = tokens[i]; // Abort if we hit a combinator

          if (Expr.relative[type = token.type]) {
            break;
          }

          if (find = Expr.find[type]) {
            // Search, expanding context for leading sibling combinators
            if (seed = find(token.matches[0].replace(runescape, funescape), rsibling.test(tokens[0].type) && testContext(context.parentNode) || context)) {
              // If seed is empty or no tokens remain, we can return early
              tokens.splice(i, 1);
              selector = seed.length && toSelector(tokens);

              if (!selector) {
                push.apply(results, seed);
                return results;
              }

              break;
            }
          }
        }
      } // Compile and execute a filtering function if one is not provided
      // Provide `match` to avoid retokenization if we modified the selector above


      (compiled || compile(selector, match))(seed, context, !documentIsHTML, results, !context || rsibling.test(selector) && testContext(context.parentNode) || context);
      return results;
    }; // One-time assignments
    // Sort stability


    support.sortStable = expando.split("").sort(sortOrder).join("") === expando; // Support: Chrome 14-35+
    // Always assume duplicates if they aren't passed to the comparison function

    support.detectDuplicates = !!hasDuplicate; // Initialize against the default document

    setDocument(); // Support: Webkit<537.32 - Safari 6.0.3/Chrome 25 (fixed in Chrome 27)
    // Detached nodes confoundingly follow *each other*

    support.sortDetached = assert(function (el) {
      // Should return 1, but returns 4 (following)
      return el.compareDocumentPosition(document.createElement("fieldset")) & 1;
    }); // Support: IE<8
    // Prevent attribute/property "interpolation"
    // https://msdn.microsoft.com/en-us/library/ms536429%28VS.85%29.aspx

    if (!assert(function (el) {
      el.innerHTML = "<a href='#'></a>";
      return el.firstChild.getAttribute("href") === "#";
    })) {
      addHandle("type|href|height|width", function (elem, name, isXML) {
        if (!isXML) {
          return elem.getAttribute(name, name.toLowerCase() === "type" ? 1 : 2);
        }
      });
    } // Support: IE<9
    // Use defaultValue in place of getAttribute("value")


    if (!support.attributes || !assert(function (el) {
      el.innerHTML = "<input/>";
      el.firstChild.setAttribute("value", "");
      return el.firstChild.getAttribute("value") === "";
    })) {
      addHandle("value", function (elem, name, isXML) {
        if (!isXML && elem.nodeName.toLowerCase() === "input") {
          return elem.defaultValue;
        }
      });
    } // Support: IE<9
    // Use getAttributeNode to fetch booleans when getAttribute lies


    if (!assert(function (el) {
      return el.getAttribute("disabled") == null;
    })) {
      addHandle(booleans, function (elem, name, isXML) {
        var val;

        if (!isXML) {
          return elem[name] === true ? name.toLowerCase() : (val = elem.getAttributeNode(name)) && val.specified ? val.value : null;
        }
      });
    }

    return Sizzle;
  }(window);

  jQuery.find = Sizzle;
  jQuery.expr = Sizzle.selectors; // Deprecated

  jQuery.expr[":"] = jQuery.expr.pseudos;
  jQuery.uniqueSort = jQuery.unique = Sizzle.uniqueSort;
  jQuery.text = Sizzle.getText;
  jQuery.isXMLDoc = Sizzle.isXML;
  jQuery.contains = Sizzle.contains;
  jQuery.escapeSelector = Sizzle.escape;

  var dir = function (elem, dir, until) {
    var matched = [],
        truncate = until !== undefined;

    while ((elem = elem[dir]) && elem.nodeType !== 9) {
      if (elem.nodeType === 1) {
        if (truncate && jQuery(elem).is(until)) {
          break;
        }

        matched.push(elem);
      }
    }

    return matched;
  };

  var siblings = function (n, elem) {
    var matched = [];

    for (; n; n = n.nextSibling) {
      if (n.nodeType === 1 && n !== elem) {
        matched.push(n);
      }
    }

    return matched;
  };

  var rneedsContext = jQuery.expr.match.needsContext;

  function nodeName(elem, name) {
    return elem.nodeName && elem.nodeName.toLowerCase() === name.toLowerCase();
  }
  var rsingleTag = /^<([a-z][^\/\0>:\x20\t\r\n\f]*)[\x20\t\r\n\f]*\/?>(?:<\/\1>|)$/i; // Implement the identical functionality for filter and not

  function winnow(elements, qualifier, not) {
    if (isFunction(qualifier)) {
      return jQuery.grep(elements, function (elem, i) {
        return !!qualifier.call(elem, i, elem) !== not;
      });
    } // Single element


    if (qualifier.nodeType) {
      return jQuery.grep(elements, function (elem) {
        return elem === qualifier !== not;
      });
    } // Arraylike of elements (jQuery, arguments, Array)


    if (typeof qualifier !== "string") {
      return jQuery.grep(elements, function (elem) {
        return indexOf.call(qualifier, elem) > -1 !== not;
      });
    } // Filtered directly for both simple and complex selectors


    return jQuery.filter(qualifier, elements, not);
  }

  jQuery.filter = function (expr, elems, not) {
    var elem = elems[0];

    if (not) {
      expr = ":not(" + expr + ")";
    }

    if (elems.length === 1 && elem.nodeType === 1) {
      return jQuery.find.matchesSelector(elem, expr) ? [elem] : [];
    }

    return jQuery.find.matches(expr, jQuery.grep(elems, function (elem) {
      return elem.nodeType === 1;
    }));
  };

  jQuery.fn.extend({
    find: function (selector) {
      var i,
          ret,
          len = this.length,
          self = this;

      if (typeof selector !== "string") {
        return this.pushStack(jQuery(selector).filter(function () {
          for (i = 0; i < len; i++) {
            if (jQuery.contains(self[i], this)) {
              return true;
            }
          }
        }));
      }

      ret = this.pushStack([]);

      for (i = 0; i < len; i++) {
        jQuery.find(selector, self[i], ret);
      }

      return len > 1 ? jQuery.uniqueSort(ret) : ret;
    },
    filter: function (selector) {
      return this.pushStack(winnow(this, selector || [], false));
    },
    not: function (selector) {
      return this.pushStack(winnow(this, selector || [], true));
    },
    is: function (selector) {
      return !!winnow(this, // If this is a positional/relative selector, check membership in the returned set
      // so $("p:first").is("p:last") won't return true for a doc with two "p".
      typeof selector === "string" && rneedsContext.test(selector) ? jQuery(selector) : selector || [], false).length;
    }
  }); // Initialize a jQuery object
  // A central reference to the root jQuery(document)

  var rootjQuery,
      // A simple way to check for HTML strings
  // Prioritize #id over <tag> to avoid XSS via location.hash (#9521)
  // Strict HTML recognition (#11290: must start with <)
  // Shortcut simple #id case for speed
  rquickExpr = /^(?:\s*(<[\w\W]+>)[^>]*|#([\w-]+))$/,
      init = jQuery.fn.init = function (selector, context, root) {
    var match, elem; // HANDLE: $(""), $(null), $(undefined), $(false)

    if (!selector) {
      return this;
    } // Method init() accepts an alternate rootjQuery
    // so migrate can support jQuery.sub (gh-2101)


    root = root || rootjQuery; // Handle HTML strings

    if (typeof selector === "string") {
      if (selector[0] === "<" && selector[selector.length - 1] === ">" && selector.length >= 3) {
        // Assume that strings that start and end with <> are HTML and skip the regex check
        match = [null, selector, null];
      } else {
        match = rquickExpr.exec(selector);
      } // Match html or make sure no context is specified for #id


      if (match && (match[1] || !context)) {
        // HANDLE: $(html) -> $(array)
        if (match[1]) {
          context = context instanceof jQuery ? context[0] : context; // Option to run scripts is true for back-compat
          // Intentionally let the error be thrown if parseHTML is not present

          jQuery.merge(this, jQuery.parseHTML(match[1], context && context.nodeType ? context.ownerDocument || context : document, true)); // HANDLE: $(html, props)

          if (rsingleTag.test(match[1]) && jQuery.isPlainObject(context)) {
            for (match in context) {
              // Properties of context are called as methods if possible
              if (isFunction(this[match])) {
                this[match](context[match]); // ...and otherwise set as attributes
              } else {
                this.attr(match, context[match]);
              }
            }
          }

          return this; // HANDLE: $(#id)
        } else {
          elem = document.getElementById(match[2]);

          if (elem) {
            // Inject the element directly into the jQuery object
            this[0] = elem;
            this.length = 1;
          }

          return this;
        } // HANDLE: $(expr, $(...))

      } else if (!context || context.jquery) {
        return (context || root).find(selector); // HANDLE: $(expr, context)
        // (which is just equivalent to: $(context).find(expr)
      } else {
        return this.constructor(context).find(selector);
      } // HANDLE: $(DOMElement)

    } else if (selector.nodeType) {
      this[0] = selector;
      this.length = 1;
      return this; // HANDLE: $(function)
      // Shortcut for document ready
    } else if (isFunction(selector)) {
      return root.ready !== undefined ? root.ready(selector) : // Execute immediately if ready is not present
      selector(jQuery);
    }

    return jQuery.makeArray(selector, this);
  }; // Give the init function the jQuery prototype for later instantiation


  init.prototype = jQuery.fn; // Initialize central reference

  rootjQuery = jQuery(document);
  var rparentsprev = /^(?:parents|prev(?:Until|All))/,
      // Methods guaranteed to produce a unique set when starting from a unique set
  guaranteedUnique = {
    children: true,
    contents: true,
    next: true,
    prev: true
  };
  jQuery.fn.extend({
    has: function (target) {
      var targets = jQuery(target, this),
          l = targets.length;
      return this.filter(function () {
        var i = 0;

        for (; i < l; i++) {
          if (jQuery.contains(this, targets[i])) {
            return true;
          }
        }
      });
    },
    closest: function (selectors, context) {
      var cur,
          i = 0,
          l = this.length,
          matched = [],
          targets = typeof selectors !== "string" && jQuery(selectors); // Positional selectors never match, since there's no _selection_ context

      if (!rneedsContext.test(selectors)) {
        for (; i < l; i++) {
          for (cur = this[i]; cur && cur !== context; cur = cur.parentNode) {
            // Always skip document fragments
            if (cur.nodeType < 11 && (targets ? targets.index(cur) > -1 : // Don't pass non-elements to Sizzle
            cur.nodeType === 1 && jQuery.find.matchesSelector(cur, selectors))) {
              matched.push(cur);
              break;
            }
          }
        }
      }

      return this.pushStack(matched.length > 1 ? jQuery.uniqueSort(matched) : matched);
    },
    // Determine the position of an element within the set
    index: function (elem) {
      // No argument, return index in parent
      if (!elem) {
        return this[0] && this[0].parentNode ? this.first().prevAll().length : -1;
      } // Index in selector


      if (typeof elem === "string") {
        return indexOf.call(jQuery(elem), this[0]);
      } // Locate the position of the desired element


      return indexOf.call(this, // If it receives a jQuery object, the first element is used
      elem.jquery ? elem[0] : elem);
    },
    add: function (selector, context) {
      return this.pushStack(jQuery.uniqueSort(jQuery.merge(this.get(), jQuery(selector, context))));
    },
    addBack: function (selector) {
      return this.add(selector == null ? this.prevObject : this.prevObject.filter(selector));
    }
  });

  function sibling(cur, dir) {
    while ((cur = cur[dir]) && cur.nodeType !== 1) {}

    return cur;
  }

  jQuery.each({
    parent: function (elem) {
      var parent = elem.parentNode;
      return parent && parent.nodeType !== 11 ? parent : null;
    },
    parents: function (elem) {
      return dir(elem, "parentNode");
    },
    parentsUntil: function (elem, i, until) {
      return dir(elem, "parentNode", until);
    },
    next: function (elem) {
      return sibling(elem, "nextSibling");
    },
    prev: function (elem) {
      return sibling(elem, "previousSibling");
    },
    nextAll: function (elem) {
      return dir(elem, "nextSibling");
    },
    prevAll: function (elem) {
      return dir(elem, "previousSibling");
    },
    nextUntil: function (elem, i, until) {
      return dir(elem, "nextSibling", until);
    },
    prevUntil: function (elem, i, until) {
      return dir(elem, "previousSibling", until);
    },
    siblings: function (elem) {
      return siblings((elem.parentNode || {}).firstChild, elem);
    },
    children: function (elem) {
      return siblings(elem.firstChild);
    },
    contents: function (elem) {
      if (nodeName(elem, "iframe")) {
        return elem.contentDocument;
      } // Support: IE 9 - 11 only, iOS 7 only, Android Browser <=4.3 only
      // Treat the template element as a regular one in browsers that
      // don't support it.


      if (nodeName(elem, "template")) {
        elem = elem.content || elem;
      }

      return jQuery.merge([], elem.childNodes);
    }
  }, function (name, fn) {
    jQuery.fn[name] = function (until, selector) {
      var matched = jQuery.map(this, fn, until);

      if (name.slice(-5) !== "Until") {
        selector = until;
      }

      if (selector && typeof selector === "string") {
        matched = jQuery.filter(selector, matched);
      }

      if (this.length > 1) {
        // Remove duplicates
        if (!guaranteedUnique[name]) {
          jQuery.uniqueSort(matched);
        } // Reverse order for parents* and prev-derivatives


        if (rparentsprev.test(name)) {
          matched.reverse();
        }
      }

      return this.pushStack(matched);
    };
  });
  var rnothtmlwhite = /[^\x20\t\r\n\f]+/g; // Convert String-formatted options into Object-formatted ones

  function createOptions(options) {
    var object = {};
    jQuery.each(options.match(rnothtmlwhite) || [], function (_, flag) {
      object[flag] = true;
    });
    return object;
  }
  /*
   * Create a callback list using the following parameters:
   *
   *	options: an optional list of space-separated options that will change how
   *			the callback list behaves or a more traditional option object
   *
   * By default a callback list will act like an event callback list and can be
   * "fired" multiple times.
   *
   * Possible options:
   *
   *	once:			will ensure the callback list can only be fired once (like a Deferred)
   *
   *	memory:			will keep track of previous values and will call any callback added
   *					after the list has been fired right away with the latest "memorized"
   *					values (like a Deferred)
   *
   *	unique:			will ensure a callback can only be added once (no duplicate in the list)
   *
   *	stopOnFalse:	interrupt callings when a callback returns false
   *
   */


  jQuery.Callbacks = function (options) {
    // Convert options from String-formatted to Object-formatted if needed
    // (we check in cache first)
    options = typeof options === "string" ? createOptions(options) : jQuery.extend({}, options);

    var // Flag to know if list is currently firing
    firing,
        // Last fire value for non-forgettable lists
    memory,
        // Flag to know if list was already fired
    fired,
        // Flag to prevent firing
    locked,
        // Actual callback list
    list = [],
        // Queue of execution data for repeatable lists
    queue = [],
        // Index of currently firing callback (modified by add/remove as needed)
    firingIndex = -1,
        // Fire callbacks
    fire = function () {
      // Enforce single-firing
      locked = locked || options.once; // Execute callbacks for all pending executions,
      // respecting firingIndex overrides and runtime changes

      fired = firing = true;

      for (; queue.length; firingIndex = -1) {
        memory = queue.shift();

        while (++firingIndex < list.length) {
          // Run callback and check for early termination
          if (list[firingIndex].apply(memory[0], memory[1]) === false && options.stopOnFalse) {
            // Jump to end and forget the data so .add doesn't re-fire
            firingIndex = list.length;
            memory = false;
          }
        }
      } // Forget the data if we're done with it


      if (!options.memory) {
        memory = false;
      }

      firing = false; // Clean up if we're done firing for good

      if (locked) {
        // Keep an empty list if we have data for future add calls
        if (memory) {
          list = []; // Otherwise, this object is spent
        } else {
          list = "";
        }
      }
    },
        // Actual Callbacks object
    self = {
      // Add a callback or a collection of callbacks to the list
      add: function () {
        if (list) {
          // If we have memory from a past run, we should fire after adding
          if (memory && !firing) {
            firingIndex = list.length - 1;
            queue.push(memory);
          }

          (function add(args) {
            jQuery.each(args, function (_, arg) {
              if (isFunction(arg)) {
                if (!options.unique || !self.has(arg)) {
                  list.push(arg);
                }
              } else if (arg && arg.length && toType(arg) !== "string") {
                // Inspect recursively
                add(arg);
              }
            });
          })(arguments);

          if (memory && !firing) {
            fire();
          }
        }

        return this;
      },
      // Remove a callback from the list
      remove: function () {
        jQuery.each(arguments, function (_, arg) {
          var index;

          while ((index = jQuery.inArray(arg, list, index)) > -1) {
            list.splice(index, 1); // Handle firing indexes

            if (index <= firingIndex) {
              firingIndex--;
            }
          }
        });
        return this;
      },
      // Check if a given callback is in the list.
      // If no argument is given, return whether or not list has callbacks attached.
      has: function (fn) {
        return fn ? jQuery.inArray(fn, list) > -1 : list.length > 0;
      },
      // Remove all callbacks from the list
      empty: function () {
        if (list) {
          list = [];
        }

        return this;
      },
      // Disable .fire and .add
      // Abort any current/pending executions
      // Clear all callbacks and values
      disable: function () {
        locked = queue = [];
        list = memory = "";
        return this;
      },
      disabled: function () {
        return !list;
      },
      // Disable .fire
      // Also disable .add unless we have memory (since it would have no effect)
      // Abort any pending executions
      lock: function () {
        locked = queue = [];

        if (!memory && !firing) {
          list = memory = "";
        }

        return this;
      },
      locked: function () {
        return !!locked;
      },
      // Call all callbacks with the given context and arguments
      fireWith: function (context, args) {
        if (!locked) {
          args = args || [];
          args = [context, args.slice ? args.slice() : args];
          queue.push(args);

          if (!firing) {
            fire();
          }
        }

        return this;
      },
      // Call all the callbacks with the given arguments
      fire: function () {
        self.fireWith(this, arguments);
        return this;
      },
      // To know if the callbacks have already been called at least once
      fired: function () {
        return !!fired;
      }
    };

    return self;
  };

  function Identity(v) {
    return v;
  }

  function Thrower(ex) {
    throw ex;
  }

  function adoptValue(value, resolve, reject, noValue) {
    var method;

    try {
      // Check for promise aspect first to privilege synchronous behavior
      if (value && isFunction(method = value.promise)) {
        method.call(value).done(resolve).fail(reject); // Other thenables
      } else if (value && isFunction(method = value.then)) {
        method.call(value, resolve, reject); // Other non-thenables
      } else {
        // Control `resolve` arguments by letting Array#slice cast boolean `noValue` to integer:
        // * false: [ value ].slice( 0 ) => resolve( value )
        // * true: [ value ].slice( 1 ) => resolve()
        resolve.apply(undefined, [value].slice(noValue));
      } // For Promises/A+, convert exceptions into rejections
      // Since jQuery.when doesn't unwrap thenables, we can skip the extra checks appearing in
      // Deferred#then to conditionally suppress rejection.

    } catch (value) {
      // Support: Android 4.0 only
      // Strict mode functions invoked without .call/.apply get global-object context
      reject.apply(undefined, [value]);
    }
  }

  jQuery.extend({
    Deferred: function (func) {
      var tuples = [// action, add listener, callbacks,
      // ... .then handlers, argument index, [final state]
      ["notify", "progress", jQuery.Callbacks("memory"), jQuery.Callbacks("memory"), 2], ["resolve", "done", jQuery.Callbacks("once memory"), jQuery.Callbacks("once memory"), 0, "resolved"], ["reject", "fail", jQuery.Callbacks("once memory"), jQuery.Callbacks("once memory"), 1, "rejected"]],
          state = "pending",
          promise = {
        state: function () {
          return state;
        },
        always: function () {
          deferred.done(arguments).fail(arguments);
          return this;
        },
        "catch": function (fn) {
          return promise.then(null, fn);
        },
        // Keep pipe for back-compat
        pipe: function ()
        /* fnDone, fnFail, fnProgress */
        {
          var fns = arguments;
          return jQuery.Deferred(function (newDefer) {
            jQuery.each(tuples, function (i, tuple) {
              // Map tuples (progress, done, fail) to arguments (done, fail, progress)
              var fn = isFunction(fns[tuple[4]]) && fns[tuple[4]]; // deferred.progress(function() { bind to newDefer or newDefer.notify })
              // deferred.done(function() { bind to newDefer or newDefer.resolve })
              // deferred.fail(function() { bind to newDefer or newDefer.reject })

              deferred[tuple[1]](function () {
                var returned = fn && fn.apply(this, arguments);

                if (returned && isFunction(returned.promise)) {
                  returned.promise().progress(newDefer.notify).done(newDefer.resolve).fail(newDefer.reject);
                } else {
                  newDefer[tuple[0] + "With"](this, fn ? [returned] : arguments);
                }
              });
            });
            fns = null;
          }).promise();
        },
        then: function (onFulfilled, onRejected, onProgress) {
          var maxDepth = 0;

          function resolve(depth, deferred, handler, special) {
            return function () {
              var that = this,
                  args = arguments,
                  mightThrow = function () {
                var returned, then; // Support: Promises/A+ section 2.3.3.3.3
                // https://promisesaplus.com/#point-59
                // Ignore double-resolution attempts

                if (depth < maxDepth) {
                  return;
                }

                returned = handler.apply(that, args); // Support: Promises/A+ section 2.3.1
                // https://promisesaplus.com/#point-48

                if (returned === deferred.promise()) {
                  throw new TypeError("Thenable self-resolution");
                } // Support: Promises/A+ sections 2.3.3.1, 3.5
                // https://promisesaplus.com/#point-54
                // https://promisesaplus.com/#point-75
                // Retrieve `then` only once


                then = returned && ( // Support: Promises/A+ section 2.3.4
                // https://promisesaplus.com/#point-64
                // Only check objects and functions for thenability
                typeof returned === "object" || typeof returned === "function") && returned.then; // Handle a returned thenable

                if (isFunction(then)) {
                  // Special processors (notify) just wait for resolution
                  if (special) {
                    then.call(returned, resolve(maxDepth, deferred, Identity, special), resolve(maxDepth, deferred, Thrower, special)); // Normal processors (resolve) also hook into progress
                  } else {
                    // ...and disregard older resolution values
                    maxDepth++;
                    then.call(returned, resolve(maxDepth, deferred, Identity, special), resolve(maxDepth, deferred, Thrower, special), resolve(maxDepth, deferred, Identity, deferred.notifyWith));
                  } // Handle all other returned values

                } else {
                  // Only substitute handlers pass on context
                  // and multiple values (non-spec behavior)
                  if (handler !== Identity) {
                    that = undefined;
                    args = [returned];
                  } // Process the value(s)
                  // Default process is resolve


                  (special || deferred.resolveWith)(that, args);
                }
              },
                  // Only normal processors (resolve) catch and reject exceptions
              process = special ? mightThrow : function () {
                try {
                  mightThrow();
                } catch (e) {
                  if (jQuery.Deferred.exceptionHook) {
                    jQuery.Deferred.exceptionHook(e, process.stackTrace);
                  } // Support: Promises/A+ section 2.3.3.3.4.1
                  // https://promisesaplus.com/#point-61
                  // Ignore post-resolution exceptions


                  if (depth + 1 >= maxDepth) {
                    // Only substitute handlers pass on context
                    // and multiple values (non-spec behavior)
                    if (handler !== Thrower) {
                      that = undefined;
                      args = [e];
                    }

                    deferred.rejectWith(that, args);
                  }
                }
              }; // Support: Promises/A+ section 2.3.3.3.1
              // https://promisesaplus.com/#point-57
              // Re-resolve promises immediately to dodge false rejection from
              // subsequent errors


              if (depth) {
                process();
              } else {
                // Call an optional hook to record the stack, in case of exception
                // since it's otherwise lost when execution goes async
                if (jQuery.Deferred.getStackHook) {
                  process.stackTrace = jQuery.Deferred.getStackHook();
                }

                window.setTimeout(process);
              }
            };
          }

          return jQuery.Deferred(function (newDefer) {
            // progress_handlers.add( ... )
            tuples[0][3].add(resolve(0, newDefer, isFunction(onProgress) ? onProgress : Identity, newDefer.notifyWith)); // fulfilled_handlers.add( ... )

            tuples[1][3].add(resolve(0, newDefer, isFunction(onFulfilled) ? onFulfilled : Identity)); // rejected_handlers.add( ... )

            tuples[2][3].add(resolve(0, newDefer, isFunction(onRejected) ? onRejected : Thrower));
          }).promise();
        },
        // Get a promise for this deferred
        // If obj is provided, the promise aspect is added to the object
        promise: function (obj) {
          return obj != null ? jQuery.extend(obj, promise) : promise;
        }
      },
          deferred = {}; // Add list-specific methods

      jQuery.each(tuples, function (i, tuple) {
        var list = tuple[2],
            stateString = tuple[5]; // promise.progress = list.add
        // promise.done = list.add
        // promise.fail = list.add

        promise[tuple[1]] = list.add; // Handle state

        if (stateString) {
          list.add(function () {
            // state = "resolved" (i.e., fulfilled)
            // state = "rejected"
            state = stateString;
          }, // rejected_callbacks.disable
          // fulfilled_callbacks.disable
          tuples[3 - i][2].disable, // rejected_handlers.disable
          // fulfilled_handlers.disable
          tuples[3 - i][3].disable, // progress_callbacks.lock
          tuples[0][2].lock, // progress_handlers.lock
          tuples[0][3].lock);
        } // progress_handlers.fire
        // fulfilled_handlers.fire
        // rejected_handlers.fire


        list.add(tuple[3].fire); // deferred.notify = function() { deferred.notifyWith(...) }
        // deferred.resolve = function() { deferred.resolveWith(...) }
        // deferred.reject = function() { deferred.rejectWith(...) }

        deferred[tuple[0]] = function () {
          deferred[tuple[0] + "With"](this === deferred ? undefined : this, arguments);
          return this;
        }; // deferred.notifyWith = list.fireWith
        // deferred.resolveWith = list.fireWith
        // deferred.rejectWith = list.fireWith


        deferred[tuple[0] + "With"] = list.fireWith;
      }); // Make the deferred a promise

      promise.promise(deferred); // Call given func if any

      if (func) {
        func.call(deferred, deferred);
      } // All done!


      return deferred;
    },
    // Deferred helper
    when: function (singleValue) {
      var // count of uncompleted subordinates
      remaining = arguments.length,
          // count of unprocessed arguments
      i = remaining,
          // subordinate fulfillment data
      resolveContexts = Array(i),
          resolveValues = slice.call(arguments),
          // the master Deferred
      master = jQuery.Deferred(),
          // subordinate callback factory
      updateFunc = function (i) {
        return function (value) {
          resolveContexts[i] = this;
          resolveValues[i] = arguments.length > 1 ? slice.call(arguments) : value;

          if (! --remaining) {
            master.resolveWith(resolveContexts, resolveValues);
          }
        };
      }; // Single- and empty arguments are adopted like Promise.resolve


      if (remaining <= 1) {
        adoptValue(singleValue, master.done(updateFunc(i)).resolve, master.reject, !remaining); // Use .then() to unwrap secondary thenables (cf. gh-3000)

        if (master.state() === "pending" || isFunction(resolveValues[i] && resolveValues[i].then)) {
          return master.then();
        }
      } // Multiple arguments are aggregated like Promise.all array elements


      while (i--) {
        adoptValue(resolveValues[i], updateFunc(i), master.reject);
      }

      return master.promise();
    }
  }); // These usually indicate a programmer mistake during development,
  // warn about them ASAP rather than swallowing them by default.

  var rerrorNames = /^(Eval|Internal|Range|Reference|Syntax|Type|URI)Error$/;

  jQuery.Deferred.exceptionHook = function (error, stack) {
    // Support: IE 8 - 9 only
    // Console exists when dev tools are open, which can happen at any time
    if (window.console && window.console.warn && error && rerrorNames.test(error.name)) {
      window.console.warn("jQuery.Deferred exception: " + error.message, error.stack, stack);
    }
  };

  jQuery.readyException = function (error) {
    window.setTimeout(function () {
      throw error;
    });
  }; // The deferred used on DOM ready


  var readyList = jQuery.Deferred();

  jQuery.fn.ready = function (fn) {
    readyList.then(fn) // Wrap jQuery.readyException in a function so that the lookup
    // happens at the time of error handling instead of callback
    // registration.
    .catch(function (error) {
      jQuery.readyException(error);
    });
    return this;
  };

  jQuery.extend({
    // Is the DOM ready to be used? Set to true once it occurs.
    isReady: false,
    // A counter to track how many items to wait for before
    // the ready event fires. See #6781
    readyWait: 1,
    // Handle when the DOM is ready
    ready: function (wait) {
      // Abort if there are pending holds or we're already ready
      if (wait === true ? --jQuery.readyWait : jQuery.isReady) {
        return;
      } // Remember that the DOM is ready


      jQuery.isReady = true; // If a normal DOM Ready event fired, decrement, and wait if need be

      if (wait !== true && --jQuery.readyWait > 0) {
        return;
      } // If there are functions bound, to execute


      readyList.resolveWith(document, [jQuery]);
    }
  });
  jQuery.ready.then = readyList.then; // The ready event handler and self cleanup method

  function completed() {
    document.removeEventListener("DOMContentLoaded", completed);
    window.removeEventListener("load", completed);
    jQuery.ready();
  } // Catch cases where $(document).ready() is called
  // after the browser event has already occurred.
  // Support: IE <=9 - 10 only
  // Older IE sometimes signals "interactive" too soon


  if (document.readyState === "complete" || document.readyState !== "loading" && !document.documentElement.doScroll) {
    // Handle it asynchronously to allow scripts the opportunity to delay ready
    window.setTimeout(jQuery.ready);
  } else {
    // Use the handy event callback
    document.addEventListener("DOMContentLoaded", completed); // A fallback to window.onload, that will always work

    window.addEventListener("load", completed);
  } // Multifunctional method to get and set values of a collection
  // The value/s can optionally be executed if it's a function


  var access = function (elems, fn, key, value, chainable, emptyGet, raw) {
    var i = 0,
        len = elems.length,
        bulk = key == null; // Sets many values

    if (toType(key) === "object") {
      chainable = true;

      for (i in key) {
        access(elems, fn, i, key[i], true, emptyGet, raw);
      } // Sets one value

    } else if (value !== undefined) {
      chainable = true;

      if (!isFunction(value)) {
        raw = true;
      }

      if (bulk) {
        // Bulk operations run against the entire set
        if (raw) {
          fn.call(elems, value);
          fn = null; // ...except when executing function values
        } else {
          bulk = fn;

          fn = function (elem, key, value) {
            return bulk.call(jQuery(elem), value);
          };
        }
      }

      if (fn) {
        for (; i < len; i++) {
          fn(elems[i], key, raw ? value : value.call(elems[i], i, fn(elems[i], key)));
        }
      }
    }

    if (chainable) {
      return elems;
    } // Gets


    if (bulk) {
      return fn.call(elems);
    }

    return len ? fn(elems[0], key) : emptyGet;
  }; // Matches dashed string for camelizing


  var rmsPrefix = /^-ms-/,
      rdashAlpha = /-([a-z])/g; // Used by camelCase as callback to replace()

  function fcamelCase(all, letter) {
    return letter.toUpperCase();
  } // Convert dashed to camelCase; used by the css and data modules
  // Support: IE <=9 - 11, Edge 12 - 15
  // Microsoft forgot to hump their vendor prefix (#9572)


  function camelCase(string) {
    return string.replace(rmsPrefix, "ms-").replace(rdashAlpha, fcamelCase);
  }

  var acceptData = function (owner) {
    // Accepts only:
    //  - Node
    //    - Node.ELEMENT_NODE
    //    - Node.DOCUMENT_NODE
    //  - Object
    //    - Any
    return owner.nodeType === 1 || owner.nodeType === 9 || !+owner.nodeType;
  };

  function Data() {
    this.expando = jQuery.expando + Data.uid++;
  }

  Data.uid = 1;
  Data.prototype = {
    cache: function (owner) {
      // Check if the owner object already has a cache
      var value = owner[this.expando]; // If not, create one

      if (!value) {
        value = {}; // We can accept data for non-element nodes in modern browsers,
        // but we should not, see #8335.
        // Always return an empty object.

        if (acceptData(owner)) {
          // If it is a node unlikely to be stringify-ed or looped over
          // use plain assignment
          if (owner.nodeType) {
            owner[this.expando] = value; // Otherwise secure it in a non-enumerable property
            // configurable must be true to allow the property to be
            // deleted when data is removed
          } else {
            Object.defineProperty(owner, this.expando, {
              value: value,
              configurable: true
            });
          }
        }
      }

      return value;
    },
    set: function (owner, data, value) {
      var prop,
          cache = this.cache(owner); // Handle: [ owner, key, value ] args
      // Always use camelCase key (gh-2257)

      if (typeof data === "string") {
        cache[camelCase(data)] = value; // Handle: [ owner, { properties } ] args
      } else {
        // Copy the properties one-by-one to the cache object
        for (prop in data) {
          cache[camelCase(prop)] = data[prop];
        }
      }

      return cache;
    },
    get: function (owner, key) {
      return key === undefined ? this.cache(owner) : // Always use camelCase key (gh-2257)
      owner[this.expando] && owner[this.expando][camelCase(key)];
    },
    access: function (owner, key, value) {
      // In cases where either:
      //
      //   1. No key was specified
      //   2. A string key was specified, but no value provided
      //
      // Take the "read" path and allow the get method to determine
      // which value to return, respectively either:
      //
      //   1. The entire cache object
      //   2. The data stored at the key
      //
      if (key === undefined || key && typeof key === "string" && value === undefined) {
        return this.get(owner, key);
      } // When the key is not a string, or both a key and value
      // are specified, set or extend (existing objects) with either:
      //
      //   1. An object of properties
      //   2. A key and value
      //


      this.set(owner, key, value); // Since the "set" path can have two possible entry points
      // return the expected data based on which path was taken[*]

      return value !== undefined ? value : key;
    },
    remove: function (owner, key) {
      var i,
          cache = owner[this.expando];

      if (cache === undefined) {
        return;
      }

      if (key !== undefined) {
        // Support array or space separated string of keys
        if (Array.isArray(key)) {
          // If key is an array of keys...
          // We always set camelCase keys, so remove that.
          key = key.map(camelCase);
        } else {
          key = camelCase(key); // If a key with the spaces exists, use it.
          // Otherwise, create an array by matching non-whitespace

          key = key in cache ? [key] : key.match(rnothtmlwhite) || [];
        }

        i = key.length;

        while (i--) {
          delete cache[key[i]];
        }
      } // Remove the expando if there's no more data


      if (key === undefined || jQuery.isEmptyObject(cache)) {
        // Support: Chrome <=35 - 45
        // Webkit & Blink performance suffers when deleting properties
        // from DOM nodes, so set to undefined instead
        // https://bugs.chromium.org/p/chromium/issues/detail?id=378607 (bug restricted)
        if (owner.nodeType) {
          owner[this.expando] = undefined;
        } else {
          delete owner[this.expando];
        }
      }
    },
    hasData: function (owner) {
      var cache = owner[this.expando];
      return cache !== undefined && !jQuery.isEmptyObject(cache);
    }
  };
  var dataPriv = new Data();
  var dataUser = new Data(); //	Implementation Summary
  //
  //	1. Enforce API surface and semantic compatibility with 1.9.x branch
  //	2. Improve the module's maintainability by reducing the storage
  //		paths to a single mechanism.
  //	3. Use the same single mechanism to support "private" and "user" data.
  //	4. _Never_ expose "private" data to user code (TODO: Drop _data, _removeData)
  //	5. Avoid exposing implementation details on user objects (eg. expando properties)
  //	6. Provide a clear path for implementation upgrade to WeakMap in 2014

  var rbrace = /^(?:\{[\w\W]*\}|\[[\w\W]*\])$/,
      rmultiDash = /[A-Z]/g;

  function getData(data) {
    if (data === "true") {
      return true;
    }

    if (data === "false") {
      return false;
    }

    if (data === "null") {
      return null;
    } // Only convert to a number if it doesn't change the string


    if (data === +data + "") {
      return +data;
    }

    if (rbrace.test(data)) {
      return JSON.parse(data);
    }

    return data;
  }

  function dataAttr(elem, key, data) {
    var name; // If nothing was found internally, try to fetch any
    // data from the HTML5 data-* attribute

    if (data === undefined && elem.nodeType === 1) {
      name = "data-" + key.replace(rmultiDash, "-$&").toLowerCase();
      data = elem.getAttribute(name);

      if (typeof data === "string") {
        try {
          data = getData(data);
        } catch (e) {} // Make sure we set the data so it isn't changed later


        dataUser.set(elem, key, data);
      } else {
        data = undefined;
      }
    }

    return data;
  }

  jQuery.extend({
    hasData: function (elem) {
      return dataUser.hasData(elem) || dataPriv.hasData(elem);
    },
    data: function (elem, name, data) {
      return dataUser.access(elem, name, data);
    },
    removeData: function (elem, name) {
      dataUser.remove(elem, name);
    },
    // TODO: Now that all calls to _data and _removeData have been replaced
    // with direct calls to dataPriv methods, these can be deprecated.
    _data: function (elem, name, data) {
      return dataPriv.access(elem, name, data);
    },
    _removeData: function (elem, name) {
      dataPriv.remove(elem, name);
    }
  });
  jQuery.fn.extend({
    data: function (key, value) {
      var i,
          name,
          data,
          elem = this[0],
          attrs = elem && elem.attributes; // Gets all values

      if (key === undefined) {
        if (this.length) {
          data = dataUser.get(elem);

          if (elem.nodeType === 1 && !dataPriv.get(elem, "hasDataAttrs")) {
            i = attrs.length;

            while (i--) {
              // Support: IE 11 only
              // The attrs elements can be null (#14894)
              if (attrs[i]) {
                name = attrs[i].name;

                if (name.indexOf("data-") === 0) {
                  name = camelCase(name.slice(5));
                  dataAttr(elem, name, data[name]);
                }
              }
            }

            dataPriv.set(elem, "hasDataAttrs", true);
          }
        }

        return data;
      } // Sets multiple values


      if (typeof key === "object") {
        return this.each(function () {
          dataUser.set(this, key);
        });
      }

      return access(this, function (value) {
        var data; // The calling jQuery object (element matches) is not empty
        // (and therefore has an element appears at this[ 0 ]) and the
        // `value` parameter was not undefined. An empty jQuery object
        // will result in `undefined` for elem = this[ 0 ] which will
        // throw an exception if an attempt to read a data cache is made.

        if (elem && value === undefined) {
          // Attempt to get data from the cache
          // The key will always be camelCased in Data
          data = dataUser.get(elem, key);

          if (data !== undefined) {
            return data;
          } // Attempt to "discover" the data in
          // HTML5 custom data-* attrs


          data = dataAttr(elem, key);

          if (data !== undefined) {
            return data;
          } // We tried really hard, but the data doesn't exist.


          return;
        } // Set the data...


        this.each(function () {
          // We always store the camelCased key
          dataUser.set(this, key, value);
        });
      }, null, value, arguments.length > 1, null, true);
    },
    removeData: function (key) {
      return this.each(function () {
        dataUser.remove(this, key);
      });
    }
  });
  jQuery.extend({
    queue: function (elem, type, data) {
      var queue;

      if (elem) {
        type = (type || "fx") + "queue";
        queue = dataPriv.get(elem, type); // Speed up dequeue by getting out quickly if this is just a lookup

        if (data) {
          if (!queue || Array.isArray(data)) {
            queue = dataPriv.access(elem, type, jQuery.makeArray(data));
          } else {
            queue.push(data);
          }
        }

        return queue || [];
      }
    },
    dequeue: function (elem, type) {
      type = type || "fx";

      var queue = jQuery.queue(elem, type),
          startLength = queue.length,
          fn = queue.shift(),
          hooks = jQuery._queueHooks(elem, type),
          next = function () {
        jQuery.dequeue(elem, type);
      }; // If the fx queue is dequeued, always remove the progress sentinel


      if (fn === "inprogress") {
        fn = queue.shift();
        startLength--;
      }

      if (fn) {
        // Add a progress sentinel to prevent the fx queue from being
        // automatically dequeued
        if (type === "fx") {
          queue.unshift("inprogress");
        } // Clear up the last queue stop function


        delete hooks.stop;
        fn.call(elem, next, hooks);
      }

      if (!startLength && hooks) {
        hooks.empty.fire();
      }
    },
    // Not public - generate a queueHooks object, or return the current one
    _queueHooks: function (elem, type) {
      var key = type + "queueHooks";
      return dataPriv.get(elem, key) || dataPriv.access(elem, key, {
        empty: jQuery.Callbacks("once memory").add(function () {
          dataPriv.remove(elem, [type + "queue", key]);
        })
      });
    }
  });
  jQuery.fn.extend({
    queue: function (type, data) {
      var setter = 2;

      if (typeof type !== "string") {
        data = type;
        type = "fx";
        setter--;
      }

      if (arguments.length < setter) {
        return jQuery.queue(this[0], type);
      }

      return data === undefined ? this : this.each(function () {
        var queue = jQuery.queue(this, type, data); // Ensure a hooks for this queue

        jQuery._queueHooks(this, type);

        if (type === "fx" && queue[0] !== "inprogress") {
          jQuery.dequeue(this, type);
        }
      });
    },
    dequeue: function (type) {
      return this.each(function () {
        jQuery.dequeue(this, type);
      });
    },
    clearQueue: function (type) {
      return this.queue(type || "fx", []);
    },
    // Get a promise resolved when queues of a certain type
    // are emptied (fx is the type by default)
    promise: function (type, obj) {
      var tmp,
          count = 1,
          defer = jQuery.Deferred(),
          elements = this,
          i = this.length,
          resolve = function () {
        if (! --count) {
          defer.resolveWith(elements, [elements]);
        }
      };

      if (typeof type !== "string") {
        obj = type;
        type = undefined;
      }

      type = type || "fx";

      while (i--) {
        tmp = dataPriv.get(elements[i], type + "queueHooks");

        if (tmp && tmp.empty) {
          count++;
          tmp.empty.add(resolve);
        }
      }

      resolve();
      return defer.promise(obj);
    }
  });
  var pnum = /[+-]?(?:\d*\.|)\d+(?:[eE][+-]?\d+|)/.source;
  var rcssNum = new RegExp("^(?:([+-])=|)(" + pnum + ")([a-z%]*)$", "i");
  var cssExpand = ["Top", "Right", "Bottom", "Left"];

  var isHiddenWithinTree = function (elem, el) {
    // isHiddenWithinTree might be called from jQuery#filter function;
    // in that case, element will be second argument
    elem = el || elem; // Inline style trumps all

    return elem.style.display === "none" || elem.style.display === "" && // Otherwise, check computed style
    // Support: Firefox <=43 - 45
    // Disconnected elements can have computed display: none, so first confirm that elem is
    // in the document.
    jQuery.contains(elem.ownerDocument, elem) && jQuery.css(elem, "display") === "none";
  };

  var swap = function (elem, options, callback, args) {
    var ret,
        name,
        old = {}; // Remember the old values, and insert the new ones

    for (name in options) {
      old[name] = elem.style[name];
      elem.style[name] = options[name];
    }

    ret = callback.apply(elem, args || []); // Revert the old values

    for (name in options) {
      elem.style[name] = old[name];
    }

    return ret;
  };

  function adjustCSS(elem, prop, valueParts, tween) {
    var adjusted,
        scale,
        maxIterations = 20,
        currentValue = tween ? function () {
      return tween.cur();
    } : function () {
      return jQuery.css(elem, prop, "");
    },
        initial = currentValue(),
        unit = valueParts && valueParts[3] || (jQuery.cssNumber[prop] ? "" : "px"),
        // Starting value computation is required for potential unit mismatches
    initialInUnit = (jQuery.cssNumber[prop] || unit !== "px" && +initial) && rcssNum.exec(jQuery.css(elem, prop));

    if (initialInUnit && initialInUnit[3] !== unit) {
      // Support: Firefox <=54
      // Halve the iteration target value to prevent interference from CSS upper bounds (gh-2144)
      initial = initial / 2; // Trust units reported by jQuery.css

      unit = unit || initialInUnit[3]; // Iteratively approximate from a nonzero starting point

      initialInUnit = +initial || 1;

      while (maxIterations--) {
        // Evaluate and update our best guess (doubling guesses that zero out).
        // Finish if the scale equals or crosses 1 (making the old*new product non-positive).
        jQuery.style(elem, prop, initialInUnit + unit);

        if ((1 - scale) * (1 - (scale = currentValue() / initial || 0.5)) <= 0) {
          maxIterations = 0;
        }

        initialInUnit = initialInUnit / scale;
      }

      initialInUnit = initialInUnit * 2;
      jQuery.style(elem, prop, initialInUnit + unit); // Make sure we update the tween properties later on

      valueParts = valueParts || [];
    }

    if (valueParts) {
      initialInUnit = +initialInUnit || +initial || 0; // Apply relative offset (+=/-=) if specified

      adjusted = valueParts[1] ? initialInUnit + (valueParts[1] + 1) * valueParts[2] : +valueParts[2];

      if (tween) {
        tween.unit = unit;
        tween.start = initialInUnit;
        tween.end = adjusted;
      }
    }

    return adjusted;
  }

  var defaultDisplayMap = {};

  function getDefaultDisplay(elem) {
    var temp,
        doc = elem.ownerDocument,
        nodeName = elem.nodeName,
        display = defaultDisplayMap[nodeName];

    if (display) {
      return display;
    }

    temp = doc.body.appendChild(doc.createElement(nodeName));
    display = jQuery.css(temp, "display");
    temp.parentNode.removeChild(temp);

    if (display === "none") {
      display = "block";
    }

    defaultDisplayMap[nodeName] = display;
    return display;
  }

  function showHide(elements, show) {
    var display,
        elem,
        values = [],
        index = 0,
        length = elements.length; // Determine new display value for elements that need to change

    for (; index < length; index++) {
      elem = elements[index];

      if (!elem.style) {
        continue;
      }

      display = elem.style.display;

      if (show) {
        // Since we force visibility upon cascade-hidden elements, an immediate (and slow)
        // check is required in this first loop unless we have a nonempty display value (either
        // inline or about-to-be-restored)
        if (display === "none") {
          values[index] = dataPriv.get(elem, "display") || null;

          if (!values[index]) {
            elem.style.display = "";
          }
        }

        if (elem.style.display === "" && isHiddenWithinTree(elem)) {
          values[index] = getDefaultDisplay(elem);
        }
      } else {
        if (display !== "none") {
          values[index] = "none"; // Remember what we're overwriting

          dataPriv.set(elem, "display", display);
        }
      }
    } // Set the display of the elements in a second loop to avoid constant reflow


    for (index = 0; index < length; index++) {
      if (values[index] != null) {
        elements[index].style.display = values[index];
      }
    }

    return elements;
  }

  jQuery.fn.extend({
    show: function () {
      return showHide(this, true);
    },
    hide: function () {
      return showHide(this);
    },
    toggle: function (state) {
      if (typeof state === "boolean") {
        return state ? this.show() : this.hide();
      }

      return this.each(function () {
        if (isHiddenWithinTree(this)) {
          jQuery(this).show();
        } else {
          jQuery(this).hide();
        }
      });
    }
  });
  var rcheckableType = /^(?:checkbox|radio)$/i;
  var rtagName = /<([a-z][^\/\0>\x20\t\r\n\f]+)/i;
  var rscriptType = /^$|^module$|\/(?:java|ecma)script/i; // We have to close these tags to support XHTML (#13200)

  var wrapMap = {
    // Support: IE <=9 only
    option: [1, "<select multiple='multiple'>", "</select>"],
    // XHTML parsers do not magically insert elements in the
    // same way that tag soup parsers do. So we cannot shorten
    // this by omitting <tbody> or other required elements.
    thead: [1, "<table>", "</table>"],
    col: [2, "<table><colgroup>", "</colgroup></table>"],
    tr: [2, "<table><tbody>", "</tbody></table>"],
    td: [3, "<table><tbody><tr>", "</tr></tbody></table>"],
    _default: [0, "", ""]
  }; // Support: IE <=9 only

  wrapMap.optgroup = wrapMap.option;
  wrapMap.tbody = wrapMap.tfoot = wrapMap.colgroup = wrapMap.caption = wrapMap.thead;
  wrapMap.th = wrapMap.td;

  function getAll(context, tag) {
    // Support: IE <=9 - 11 only
    // Use typeof to avoid zero-argument method invocation on host objects (#15151)
    var ret;

    if (typeof context.getElementsByTagName !== "undefined") {
      ret = context.getElementsByTagName(tag || "*");
    } else if (typeof context.querySelectorAll !== "undefined") {
      ret = context.querySelectorAll(tag || "*");
    } else {
      ret = [];
    }

    if (tag === undefined || tag && nodeName(context, tag)) {
      return jQuery.merge([context], ret);
    }

    return ret;
  } // Mark scripts as having already been evaluated


  function setGlobalEval(elems, refElements) {
    var i = 0,
        l = elems.length;

    for (; i < l; i++) {
      dataPriv.set(elems[i], "globalEval", !refElements || dataPriv.get(refElements[i], "globalEval"));
    }
  }

  var rhtml = /<|&#?\w+;/;

  function buildFragment(elems, context, scripts, selection, ignored) {
    var elem,
        tmp,
        tag,
        wrap,
        contains,
        j,
        fragment = context.createDocumentFragment(),
        nodes = [],
        i = 0,
        l = elems.length;

    for (; i < l; i++) {
      elem = elems[i];

      if (elem || elem === 0) {
        // Add nodes directly
        if (toType(elem) === "object") {
          // Support: Android <=4.0 only, PhantomJS 1 only
          // push.apply(_, arraylike) throws on ancient WebKit
          jQuery.merge(nodes, elem.nodeType ? [elem] : elem); // Convert non-html into a text node
        } else if (!rhtml.test(elem)) {
          nodes.push(context.createTextNode(elem)); // Convert html into DOM nodes
        } else {
          tmp = tmp || fragment.appendChild(context.createElement("div")); // Deserialize a standard representation

          tag = (rtagName.exec(elem) || ["", ""])[1].toLowerCase();
          wrap = wrapMap[tag] || wrapMap._default;
          tmp.innerHTML = wrap[1] + jQuery.htmlPrefilter(elem) + wrap[2]; // Descend through wrappers to the right content

          j = wrap[0];

          while (j--) {
            tmp = tmp.lastChild;
          } // Support: Android <=4.0 only, PhantomJS 1 only
          // push.apply(_, arraylike) throws on ancient WebKit


          jQuery.merge(nodes, tmp.childNodes); // Remember the top-level container

          tmp = fragment.firstChild; // Ensure the created nodes are orphaned (#12392)

          tmp.textContent = "";
        }
      }
    } // Remove wrapper from fragment


    fragment.textContent = "";
    i = 0;

    while (elem = nodes[i++]) {
      // Skip elements already in the context collection (trac-4087)
      if (selection && jQuery.inArray(elem, selection) > -1) {
        if (ignored) {
          ignored.push(elem);
        }

        continue;
      }

      contains = jQuery.contains(elem.ownerDocument, elem); // Append to fragment

      tmp = getAll(fragment.appendChild(elem), "script"); // Preserve script evaluation history

      if (contains) {
        setGlobalEval(tmp);
      } // Capture executables


      if (scripts) {
        j = 0;

        while (elem = tmp[j++]) {
          if (rscriptType.test(elem.type || "")) {
            scripts.push(elem);
          }
        }
      }
    }

    return fragment;
  }

  (function () {
    var fragment = document.createDocumentFragment(),
        div = fragment.appendChild(document.createElement("div")),
        input = document.createElement("input"); // Support: Android 4.0 - 4.3 only
    // Check state lost if the name is set (#11217)
    // Support: Windows Web Apps (WWA)
    // `name` and `type` must use .setAttribute for WWA (#14901)

    input.setAttribute("type", "radio");
    input.setAttribute("checked", "checked");
    input.setAttribute("name", "t");
    div.appendChild(input); // Support: Android <=4.1 only
    // Older WebKit doesn't clone checked state correctly in fragments

    support.checkClone = div.cloneNode(true).cloneNode(true).lastChild.checked; // Support: IE <=11 only
    // Make sure textarea (and checkbox) defaultValue is properly cloned

    div.innerHTML = "<textarea>x</textarea>";
    support.noCloneChecked = !!div.cloneNode(true).lastChild.defaultValue;
  })();

  var documentElement = document.documentElement;
  var rkeyEvent = /^key/,
      rmouseEvent = /^(?:mouse|pointer|contextmenu|drag|drop)|click/,
      rtypenamespace = /^([^.]*)(?:\.(.+)|)/;

  function returnTrue() {
    return true;
  }

  function returnFalse() {
    return false;
  } // Support: IE <=9 only
  // See #13393 for more info


  function safeActiveElement() {
    try {
      return document.activeElement;
    } catch (err) {}
  }

  function on(elem, types, selector, data, fn, one) {
    var origFn, type; // Types can be a map of types/handlers

    if (typeof types === "object") {
      // ( types-Object, selector, data )
      if (typeof selector !== "string") {
        // ( types-Object, data )
        data = data || selector;
        selector = undefined;
      }

      for (type in types) {
        on(elem, type, selector, data, types[type], one);
      }

      return elem;
    }

    if (data == null && fn == null) {
      // ( types, fn )
      fn = selector;
      data = selector = undefined;
    } else if (fn == null) {
      if (typeof selector === "string") {
        // ( types, selector, fn )
        fn = data;
        data = undefined;
      } else {
        // ( types, data, fn )
        fn = data;
        data = selector;
        selector = undefined;
      }
    }

    if (fn === false) {
      fn = returnFalse;
    } else if (!fn) {
      return elem;
    }

    if (one === 1) {
      origFn = fn;

      fn = function (event) {
        // Can use an empty set, since event contains the info
        jQuery().off(event);
        return origFn.apply(this, arguments);
      }; // Use same guid so caller can remove using origFn


      fn.guid = origFn.guid || (origFn.guid = jQuery.guid++);
    }

    return elem.each(function () {
      jQuery.event.add(this, types, fn, data, selector);
    });
  }
  /*
   * Helper functions for managing events -- not part of the public interface.
   * Props to Dean Edwards' addEvent library for many of the ideas.
   */


  jQuery.event = {
    global: {},
    add: function (elem, types, handler, data, selector) {
      var handleObjIn,
          eventHandle,
          tmp,
          events,
          t,
          handleObj,
          special,
          handlers,
          type,
          namespaces,
          origType,
          elemData = dataPriv.get(elem); // Don't attach events to noData or text/comment nodes (but allow plain objects)

      if (!elemData) {
        return;
      } // Caller can pass in an object of custom data in lieu of the handler


      if (handler.handler) {
        handleObjIn = handler;
        handler = handleObjIn.handler;
        selector = handleObjIn.selector;
      } // Ensure that invalid selectors throw exceptions at attach time
      // Evaluate against documentElement in case elem is a non-element node (e.g., document)


      if (selector) {
        jQuery.find.matchesSelector(documentElement, selector);
      } // Make sure that the handler has a unique ID, used to find/remove it later


      if (!handler.guid) {
        handler.guid = jQuery.guid++;
      } // Init the element's event structure and main handler, if this is the first


      if (!(events = elemData.events)) {
        events = elemData.events = {};
      }

      if (!(eventHandle = elemData.handle)) {
        eventHandle = elemData.handle = function (e) {
          // Discard the second event of a jQuery.event.trigger() and
          // when an event is called after a page has unloaded
          return typeof jQuery !== "undefined" && jQuery.event.triggered !== e.type ? jQuery.event.dispatch.apply(elem, arguments) : undefined;
        };
      } // Handle multiple events separated by a space


      types = (types || "").match(rnothtmlwhite) || [""];
      t = types.length;

      while (t--) {
        tmp = rtypenamespace.exec(types[t]) || [];
        type = origType = tmp[1];
        namespaces = (tmp[2] || "").split(".").sort(); // There *must* be a type, no attaching namespace-only handlers

        if (!type) {
          continue;
        } // If event changes its type, use the special event handlers for the changed type


        special = jQuery.event.special[type] || {}; // If selector defined, determine special event api type, otherwise given type

        type = (selector ? special.delegateType : special.bindType) || type; // Update special based on newly reset type

        special = jQuery.event.special[type] || {}; // handleObj is passed to all event handlers

        handleObj = jQuery.extend({
          type: type,
          origType: origType,
          data: data,
          handler: handler,
          guid: handler.guid,
          selector: selector,
          needsContext: selector && jQuery.expr.match.needsContext.test(selector),
          namespace: namespaces.join(".")
        }, handleObjIn); // Init the event handler queue if we're the first

        if (!(handlers = events[type])) {
          handlers = events[type] = [];
          handlers.delegateCount = 0; // Only use addEventListener if the special events handler returns false

          if (!special.setup || special.setup.call(elem, data, namespaces, eventHandle) === false) {
            if (elem.addEventListener) {
              elem.addEventListener(type, eventHandle);
            }
          }
        }

        if (special.add) {
          special.add.call(elem, handleObj);

          if (!handleObj.handler.guid) {
            handleObj.handler.guid = handler.guid;
          }
        } // Add to the element's handler list, delegates in front


        if (selector) {
          handlers.splice(handlers.delegateCount++, 0, handleObj);
        } else {
          handlers.push(handleObj);
        } // Keep track of which events have ever been used, for event optimization


        jQuery.event.global[type] = true;
      }
    },
    // Detach an event or set of events from an element
    remove: function (elem, types, handler, selector, mappedTypes) {
      var j,
          origCount,
          tmp,
          events,
          t,
          handleObj,
          special,
          handlers,
          type,
          namespaces,
          origType,
          elemData = dataPriv.hasData(elem) && dataPriv.get(elem);

      if (!elemData || !(events = elemData.events)) {
        return;
      } // Once for each type.namespace in types; type may be omitted


      types = (types || "").match(rnothtmlwhite) || [""];
      t = types.length;

      while (t--) {
        tmp = rtypenamespace.exec(types[t]) || [];
        type = origType = tmp[1];
        namespaces = (tmp[2] || "").split(".").sort(); // Unbind all events (on this namespace, if provided) for the element

        if (!type) {
          for (type in events) {
            jQuery.event.remove(elem, type + types[t], handler, selector, true);
          }

          continue;
        }

        special = jQuery.event.special[type] || {};
        type = (selector ? special.delegateType : special.bindType) || type;
        handlers = events[type] || [];
        tmp = tmp[2] && new RegExp("(^|\\.)" + namespaces.join("\\.(?:.*\\.|)") + "(\\.|$)"); // Remove matching events

        origCount = j = handlers.length;

        while (j--) {
          handleObj = handlers[j];

          if ((mappedTypes || origType === handleObj.origType) && (!handler || handler.guid === handleObj.guid) && (!tmp || tmp.test(handleObj.namespace)) && (!selector || selector === handleObj.selector || selector === "**" && handleObj.selector)) {
            handlers.splice(j, 1);

            if (handleObj.selector) {
              handlers.delegateCount--;
            }

            if (special.remove) {
              special.remove.call(elem, handleObj);
            }
          }
        } // Remove generic event handler if we removed something and no more handlers exist
        // (avoids potential for endless recursion during removal of special event handlers)


        if (origCount && !handlers.length) {
          if (!special.teardown || special.teardown.call(elem, namespaces, elemData.handle) === false) {
            jQuery.removeEvent(elem, type, elemData.handle);
          }

          delete events[type];
        }
      } // Remove data and the expando if it's no longer used


      if (jQuery.isEmptyObject(events)) {
        dataPriv.remove(elem, "handle events");
      }
    },
    dispatch: function (nativeEvent) {
      // Make a writable jQuery.Event from the native event object
      var event = jQuery.event.fix(nativeEvent);
      var i,
          j,
          ret,
          matched,
          handleObj,
          handlerQueue,
          args = new Array(arguments.length),
          handlers = (dataPriv.get(this, "events") || {})[event.type] || [],
          special = jQuery.event.special[event.type] || {}; // Use the fix-ed jQuery.Event rather than the (read-only) native event

      args[0] = event;

      for (i = 1; i < arguments.length; i++) {
        args[i] = arguments[i];
      }

      event.delegateTarget = this; // Call the preDispatch hook for the mapped type, and let it bail if desired

      if (special.preDispatch && special.preDispatch.call(this, event) === false) {
        return;
      } // Determine handlers


      handlerQueue = jQuery.event.handlers.call(this, event, handlers); // Run delegates first; they may want to stop propagation beneath us

      i = 0;

      while ((matched = handlerQueue[i++]) && !event.isPropagationStopped()) {
        event.currentTarget = matched.elem;
        j = 0;

        while ((handleObj = matched.handlers[j++]) && !event.isImmediatePropagationStopped()) {
          // Triggered event must either 1) have no namespace, or 2) have namespace(s)
          // a subset or equal to those in the bound event (both can have no namespace).
          if (!event.rnamespace || event.rnamespace.test(handleObj.namespace)) {
            event.handleObj = handleObj;
            event.data = handleObj.data;
            ret = ((jQuery.event.special[handleObj.origType] || {}).handle || handleObj.handler).apply(matched.elem, args);

            if (ret !== undefined) {
              if ((event.result = ret) === false) {
                event.preventDefault();
                event.stopPropagation();
              }
            }
          }
        }
      } // Call the postDispatch hook for the mapped type


      if (special.postDispatch) {
        special.postDispatch.call(this, event);
      }

      return event.result;
    },
    handlers: function (event, handlers) {
      var i,
          handleObj,
          sel,
          matchedHandlers,
          matchedSelectors,
          handlerQueue = [],
          delegateCount = handlers.delegateCount,
          cur = event.target; // Find delegate handlers

      if (delegateCount && // Support: IE <=9
      // Black-hole SVG <use> instance trees (trac-13180)
      cur.nodeType && // Support: Firefox <=42
      // Suppress spec-violating clicks indicating a non-primary pointer button (trac-3861)
      // https://www.w3.org/TR/DOM-Level-3-Events/#event-type-click
      // Support: IE 11 only
      // ...but not arrow key "clicks" of radio inputs, which can have `button` -1 (gh-2343)
      !(event.type === "click" && event.button >= 1)) {
        for (; cur !== this; cur = cur.parentNode || this) {
          // Don't check non-elements (#13208)
          // Don't process clicks on disabled elements (#6911, #8165, #11382, #11764)
          if (cur.nodeType === 1 && !(event.type === "click" && cur.disabled === true)) {
            matchedHandlers = [];
            matchedSelectors = {};

            for (i = 0; i < delegateCount; i++) {
              handleObj = handlers[i]; // Don't conflict with Object.prototype properties (#13203)

              sel = handleObj.selector + " ";

              if (matchedSelectors[sel] === undefined) {
                matchedSelectors[sel] = handleObj.needsContext ? jQuery(sel, this).index(cur) > -1 : jQuery.find(sel, this, null, [cur]).length;
              }

              if (matchedSelectors[sel]) {
                matchedHandlers.push(handleObj);
              }
            }

            if (matchedHandlers.length) {
              handlerQueue.push({
                elem: cur,
                handlers: matchedHandlers
              });
            }
          }
        }
      } // Add the remaining (directly-bound) handlers


      cur = this;

      if (delegateCount < handlers.length) {
        handlerQueue.push({
          elem: cur,
          handlers: handlers.slice(delegateCount)
        });
      }

      return handlerQueue;
    },
    addProp: function (name, hook) {
      Object.defineProperty(jQuery.Event.prototype, name, {
        enumerable: true,
        configurable: true,
        get: isFunction(hook) ? function () {
          if (this.originalEvent) {
            return hook(this.originalEvent);
          }
        } : function () {
          if (this.originalEvent) {
            return this.originalEvent[name];
          }
        },
        set: function (value) {
          Object.defineProperty(this, name, {
            enumerable: true,
            configurable: true,
            writable: true,
            value: value
          });
        }
      });
    },
    fix: function (originalEvent) {
      return originalEvent[jQuery.expando] ? originalEvent : new jQuery.Event(originalEvent);
    },
    special: {
      load: {
        // Prevent triggered image.load events from bubbling to window.load
        noBubble: true
      },
      focus: {
        // Fire native event if possible so blur/focus sequence is correct
        trigger: function () {
          if (this !== safeActiveElement() && this.focus) {
            this.focus();
            return false;
          }
        },
        delegateType: "focusin"
      },
      blur: {
        trigger: function () {
          if (this === safeActiveElement() && this.blur) {
            this.blur();
            return false;
          }
        },
        delegateType: "focusout"
      },
      click: {
        // For checkbox, fire native event so checked state will be right
        trigger: function () {
          if (this.type === "checkbox" && this.click && nodeName(this, "input")) {
            this.click();
            return false;
          }
        },
        // For cross-browser consistency, don't fire native .click() on links
        _default: function (event) {
          return nodeName(event.target, "a");
        }
      },
      beforeunload: {
        postDispatch: function (event) {
          // Support: Firefox 20+
          // Firefox doesn't alert if the returnValue field is not set.
          if (event.result !== undefined && event.originalEvent) {
            event.originalEvent.returnValue = event.result;
          }
        }
      }
    }
  };

  jQuery.removeEvent = function (elem, type, handle) {
    // This "if" is needed for plain objects
    if (elem.removeEventListener) {
      elem.removeEventListener(type, handle);
    }
  };

  jQuery.Event = function (src, props) {
    // Allow instantiation without the 'new' keyword
    if (!(this instanceof jQuery.Event)) {
      return new jQuery.Event(src, props);
    } // Event object


    if (src && src.type) {
      this.originalEvent = src;
      this.type = src.type; // Events bubbling up the document may have been marked as prevented
      // by a handler lower down the tree; reflect the correct value.

      this.isDefaultPrevented = src.defaultPrevented || src.defaultPrevented === undefined && // Support: Android <=2.3 only
      src.returnValue === false ? returnTrue : returnFalse; // Create target properties
      // Support: Safari <=6 - 7 only
      // Target should not be a text node (#504, #13143)

      this.target = src.target && src.target.nodeType === 3 ? src.target.parentNode : src.target;
      this.currentTarget = src.currentTarget;
      this.relatedTarget = src.relatedTarget; // Event type
    } else {
      this.type = src;
    } // Put explicitly provided properties onto the event object


    if (props) {
      jQuery.extend(this, props);
    } // Create a timestamp if incoming event doesn't have one


    this.timeStamp = src && src.timeStamp || Date.now(); // Mark it as fixed

    this[jQuery.expando] = true;
  }; // jQuery.Event is based on DOM3 Events as specified by the ECMAScript Language Binding
  // https://www.w3.org/TR/2003/WD-DOM-Level-3-Events-20030331/ecma-script-binding.html


  jQuery.Event.prototype = {
    constructor: jQuery.Event,
    isDefaultPrevented: returnFalse,
    isPropagationStopped: returnFalse,
    isImmediatePropagationStopped: returnFalse,
    isSimulated: false,
    preventDefault: function () {
      var e = this.originalEvent;
      this.isDefaultPrevented = returnTrue;

      if (e && !this.isSimulated) {
        e.preventDefault();
      }
    },
    stopPropagation: function () {
      var e = this.originalEvent;
      this.isPropagationStopped = returnTrue;

      if (e && !this.isSimulated) {
        e.stopPropagation();
      }
    },
    stopImmediatePropagation: function () {
      var e = this.originalEvent;
      this.isImmediatePropagationStopped = returnTrue;

      if (e && !this.isSimulated) {
        e.stopImmediatePropagation();
      }

      this.stopPropagation();
    }
  }; // Includes all common event props including KeyEvent and MouseEvent specific props

  jQuery.each({
    altKey: true,
    bubbles: true,
    cancelable: true,
    changedTouches: true,
    ctrlKey: true,
    detail: true,
    eventPhase: true,
    metaKey: true,
    pageX: true,
    pageY: true,
    shiftKey: true,
    view: true,
    "char": true,
    charCode: true,
    key: true,
    keyCode: true,
    button: true,
    buttons: true,
    clientX: true,
    clientY: true,
    offsetX: true,
    offsetY: true,
    pointerId: true,
    pointerType: true,
    screenX: true,
    screenY: true,
    targetTouches: true,
    toElement: true,
    touches: true,
    which: function (event) {
      var button = event.button; // Add which for key events

      if (event.which == null && rkeyEvent.test(event.type)) {
        return event.charCode != null ? event.charCode : event.keyCode;
      } // Add which for click: 1 === left; 2 === middle; 3 === right


      if (!event.which && button !== undefined && rmouseEvent.test(event.type)) {
        if (button & 1) {
          return 1;
        }

        if (button & 2) {
          return 3;
        }

        if (button & 4) {
          return 2;
        }

        return 0;
      }

      return event.which;
    }
  }, jQuery.event.addProp); // Create mouseenter/leave events using mouseover/out and event-time checks
  // so that event delegation works in jQuery.
  // Do the same for pointerenter/pointerleave and pointerover/pointerout
  //
  // Support: Safari 7 only
  // Safari sends mouseenter too often; see:
  // https://bugs.chromium.org/p/chromium/issues/detail?id=470258
  // for the description of the bug (it existed in older Chrome versions as well).

  jQuery.each({
    mouseenter: "mouseover",
    mouseleave: "mouseout",
    pointerenter: "pointerover",
    pointerleave: "pointerout"
  }, function (orig, fix) {
    jQuery.event.special[orig] = {
      delegateType: fix,
      bindType: fix,
      handle: function (event) {
        var ret,
            target = this,
            related = event.relatedTarget,
            handleObj = event.handleObj; // For mouseenter/leave call the handler if related is outside the target.
        // NB: No relatedTarget if the mouse left/entered the browser window

        if (!related || related !== target && !jQuery.contains(target, related)) {
          event.type = handleObj.origType;
          ret = handleObj.handler.apply(this, arguments);
          event.type = fix;
        }

        return ret;
      }
    };
  });
  jQuery.fn.extend({
    on: function (types, selector, data, fn) {
      return on(this, types, selector, data, fn);
    },
    one: function (types, selector, data, fn) {
      return on(this, types, selector, data, fn, 1);
    },
    off: function (types, selector, fn) {
      var handleObj, type;

      if (types && types.preventDefault && types.handleObj) {
        // ( event )  dispatched jQuery.Event
        handleObj = types.handleObj;
        jQuery(types.delegateTarget).off(handleObj.namespace ? handleObj.origType + "." + handleObj.namespace : handleObj.origType, handleObj.selector, handleObj.handler);
        return this;
      }

      if (typeof types === "object") {
        // ( types-object [, selector] )
        for (type in types) {
          this.off(type, selector, types[type]);
        }

        return this;
      }

      if (selector === false || typeof selector === "function") {
        // ( types [, fn] )
        fn = selector;
        selector = undefined;
      }

      if (fn === false) {
        fn = returnFalse;
      }

      return this.each(function () {
        jQuery.event.remove(this, types, fn, selector);
      });
    }
  });
  var
  /* eslint-disable max-len */
  // See https://github.com/eslint/eslint/issues/3229
  rxhtmlTag = /<(?!area|br|col|embed|hr|img|input|link|meta|param)(([a-z][^\/\0>\x20\t\r\n\f]*)[^>]*)\/>/gi,

  /* eslint-enable */
  // Support: IE <=10 - 11, Edge 12 - 13 only
  // In IE/Edge using regex groups here causes severe slowdowns.
  // See https://connect.microsoft.com/IE/feedback/details/1736512/
  rnoInnerhtml = /<script|<style|<link/i,
      // checked="checked" or checked
  rchecked = /checked\s*(?:[^=]|=\s*.checked.)/i,
      rcleanScript = /^\s*<!(?:\[CDATA\[|--)|(?:\]\]|--)>\s*$/g; // Prefer a tbody over its parent table for containing new rows

  function manipulationTarget(elem, content) {
    if (nodeName(elem, "table") && nodeName(content.nodeType !== 11 ? content : content.firstChild, "tr")) {
      return jQuery(elem).children("tbody")[0] || elem;
    }

    return elem;
  } // Replace/restore the type attribute of script elements for safe DOM manipulation


  function disableScript(elem) {
    elem.type = (elem.getAttribute("type") !== null) + "/" + elem.type;
    return elem;
  }

  function restoreScript(elem) {
    if ((elem.type || "").slice(0, 5) === "true/") {
      elem.type = elem.type.slice(5);
    } else {
      elem.removeAttribute("type");
    }

    return elem;
  }

  function cloneCopyEvent(src, dest) {
    var i, l, type, pdataOld, pdataCur, udataOld, udataCur, events;

    if (dest.nodeType !== 1) {
      return;
    } // 1. Copy private data: events, handlers, etc.


    if (dataPriv.hasData(src)) {
      pdataOld = dataPriv.access(src);
      pdataCur = dataPriv.set(dest, pdataOld);
      events = pdataOld.events;

      if (events) {
        delete pdataCur.handle;
        pdataCur.events = {};

        for (type in events) {
          for (i = 0, l = events[type].length; i < l; i++) {
            jQuery.event.add(dest, type, events[type][i]);
          }
        }
      }
    } // 2. Copy user data


    if (dataUser.hasData(src)) {
      udataOld = dataUser.access(src);
      udataCur = jQuery.extend({}, udataOld);
      dataUser.set(dest, udataCur);
    }
  } // Fix IE bugs, see support tests


  function fixInput(src, dest) {
    var nodeName = dest.nodeName.toLowerCase(); // Fails to persist the checked state of a cloned checkbox or radio button.

    if (nodeName === "input" && rcheckableType.test(src.type)) {
      dest.checked = src.checked; // Fails to return the selected option to the default selected state when cloning options
    } else if (nodeName === "input" || nodeName === "textarea") {
      dest.defaultValue = src.defaultValue;
    }
  }

  function domManip(collection, args, callback, ignored) {
    // Flatten any nested arrays
    args = concat.apply([], args);
    var fragment,
        first,
        scripts,
        hasScripts,
        node,
        doc,
        i = 0,
        l = collection.length,
        iNoClone = l - 1,
        value = args[0],
        valueIsFunction = isFunction(value); // We can't cloneNode fragments that contain checked, in WebKit

    if (valueIsFunction || l > 1 && typeof value === "string" && !support.checkClone && rchecked.test(value)) {
      return collection.each(function (index) {
        var self = collection.eq(index);

        if (valueIsFunction) {
          args[0] = value.call(this, index, self.html());
        }

        domManip(self, args, callback, ignored);
      });
    }

    if (l) {
      fragment = buildFragment(args, collection[0].ownerDocument, false, collection, ignored);
      first = fragment.firstChild;

      if (fragment.childNodes.length === 1) {
        fragment = first;
      } // Require either new content or an interest in ignored elements to invoke the callback


      if (first || ignored) {
        scripts = jQuery.map(getAll(fragment, "script"), disableScript);
        hasScripts = scripts.length; // Use the original fragment for the last item
        // instead of the first because it can end up
        // being emptied incorrectly in certain situations (#8070).

        for (; i < l; i++) {
          node = fragment;

          if (i !== iNoClone) {
            node = jQuery.clone(node, true, true); // Keep references to cloned scripts for later restoration

            if (hasScripts) {
              // Support: Android <=4.0 only, PhantomJS 1 only
              // push.apply(_, arraylike) throws on ancient WebKit
              jQuery.merge(scripts, getAll(node, "script"));
            }
          }

          callback.call(collection[i], node, i);
        }

        if (hasScripts) {
          doc = scripts[scripts.length - 1].ownerDocument; // Reenable scripts

          jQuery.map(scripts, restoreScript); // Evaluate executable scripts on first document insertion

          for (i = 0; i < hasScripts; i++) {
            node = scripts[i];

            if (rscriptType.test(node.type || "") && !dataPriv.access(node, "globalEval") && jQuery.contains(doc, node)) {
              if (node.src && (node.type || "").toLowerCase() !== "module") {
                // Optional AJAX dependency, but won't run scripts if not present
                if (jQuery._evalUrl) {
                  jQuery._evalUrl(node.src);
                }
              } else {
                DOMEval(node.textContent.replace(rcleanScript, ""), doc, node);
              }
            }
          }
        }
      }
    }

    return collection;
  }

  function remove(elem, selector, keepData) {
    var node,
        nodes = selector ? jQuery.filter(selector, elem) : elem,
        i = 0;

    for (; (node = nodes[i]) != null; i++) {
      if (!keepData && node.nodeType === 1) {
        jQuery.cleanData(getAll(node));
      }

      if (node.parentNode) {
        if (keepData && jQuery.contains(node.ownerDocument, node)) {
          setGlobalEval(getAll(node, "script"));
        }

        node.parentNode.removeChild(node);
      }
    }

    return elem;
  }

  jQuery.extend({
    htmlPrefilter: function (html) {
      return html.replace(rxhtmlTag, "<$1></$2>");
    },
    clone: function (elem, dataAndEvents, deepDataAndEvents) {
      var i,
          l,
          srcElements,
          destElements,
          clone = elem.cloneNode(true),
          inPage = jQuery.contains(elem.ownerDocument, elem); // Fix IE cloning issues

      if (!support.noCloneChecked && (elem.nodeType === 1 || elem.nodeType === 11) && !jQuery.isXMLDoc(elem)) {
        // We eschew Sizzle here for performance reasons: https://jsperf.com/getall-vs-sizzle/2
        destElements = getAll(clone);
        srcElements = getAll(elem);

        for (i = 0, l = srcElements.length; i < l; i++) {
          fixInput(srcElements[i], destElements[i]);
        }
      } // Copy the events from the original to the clone


      if (dataAndEvents) {
        if (deepDataAndEvents) {
          srcElements = srcElements || getAll(elem);
          destElements = destElements || getAll(clone);

          for (i = 0, l = srcElements.length; i < l; i++) {
            cloneCopyEvent(srcElements[i], destElements[i]);
          }
        } else {
          cloneCopyEvent(elem, clone);
        }
      } // Preserve script evaluation history


      destElements = getAll(clone, "script");

      if (destElements.length > 0) {
        setGlobalEval(destElements, !inPage && getAll(elem, "script"));
      } // Return the cloned set


      return clone;
    },
    cleanData: function (elems) {
      var data,
          elem,
          type,
          special = jQuery.event.special,
          i = 0;

      for (; (elem = elems[i]) !== undefined; i++) {
        if (acceptData(elem)) {
          if (data = elem[dataPriv.expando]) {
            if (data.events) {
              for (type in data.events) {
                if (special[type]) {
                  jQuery.event.remove(elem, type); // This is a shortcut to avoid jQuery.event.remove's overhead
                } else {
                  jQuery.removeEvent(elem, type, data.handle);
                }
              }
            } // Support: Chrome <=35 - 45+
            // Assign undefined instead of using delete, see Data#remove


            elem[dataPriv.expando] = undefined;
          }

          if (elem[dataUser.expando]) {
            // Support: Chrome <=35 - 45+
            // Assign undefined instead of using delete, see Data#remove
            elem[dataUser.expando] = undefined;
          }
        }
      }
    }
  });
  jQuery.fn.extend({
    detach: function (selector) {
      return remove(this, selector, true);
    },
    remove: function (selector) {
      return remove(this, selector);
    },
    text: function (value) {
      return access(this, function (value) {
        return value === undefined ? jQuery.text(this) : this.empty().each(function () {
          if (this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9) {
            this.textContent = value;
          }
        });
      }, null, value, arguments.length);
    },
    append: function () {
      return domManip(this, arguments, function (elem) {
        if (this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9) {
          var target = manipulationTarget(this, elem);
          target.appendChild(elem);
        }
      });
    },
    prepend: function () {
      return domManip(this, arguments, function (elem) {
        if (this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9) {
          var target = manipulationTarget(this, elem);
          target.insertBefore(elem, target.firstChild);
        }
      });
    },
    before: function () {
      return domManip(this, arguments, function (elem) {
        if (this.parentNode) {
          this.parentNode.insertBefore(elem, this);
        }
      });
    },
    after: function () {
      return domManip(this, arguments, function (elem) {
        if (this.parentNode) {
          this.parentNode.insertBefore(elem, this.nextSibling);
        }
      });
    },
    empty: function () {
      var elem,
          i = 0;

      for (; (elem = this[i]) != null; i++) {
        if (elem.nodeType === 1) {
          // Prevent memory leaks
          jQuery.cleanData(getAll(elem, false)); // Remove any remaining nodes

          elem.textContent = "";
        }
      }

      return this;
    },
    clone: function (dataAndEvents, deepDataAndEvents) {
      dataAndEvents = dataAndEvents == null ? false : dataAndEvents;
      deepDataAndEvents = deepDataAndEvents == null ? dataAndEvents : deepDataAndEvents;
      return this.map(function () {
        return jQuery.clone(this, dataAndEvents, deepDataAndEvents);
      });
    },
    html: function (value) {
      return access(this, function (value) {
        var elem = this[0] || {},
            i = 0,
            l = this.length;

        if (value === undefined && elem.nodeType === 1) {
          return elem.innerHTML;
        } // See if we can take a shortcut and just use innerHTML


        if (typeof value === "string" && !rnoInnerhtml.test(value) && !wrapMap[(rtagName.exec(value) || ["", ""])[1].toLowerCase()]) {
          value = jQuery.htmlPrefilter(value);

          try {
            for (; i < l; i++) {
              elem = this[i] || {}; // Remove element nodes and prevent memory leaks

              if (elem.nodeType === 1) {
                jQuery.cleanData(getAll(elem, false));
                elem.innerHTML = value;
              }
            }

            elem = 0; // If using innerHTML throws an exception, use the fallback method
          } catch (e) {}
        }

        if (elem) {
          this.empty().append(value);
        }
      }, null, value, arguments.length);
    },
    replaceWith: function () {
      var ignored = []; // Make the changes, replacing each non-ignored context element with the new content

      return domManip(this, arguments, function (elem) {
        var parent = this.parentNode;

        if (jQuery.inArray(this, ignored) < 0) {
          jQuery.cleanData(getAll(this));

          if (parent) {
            parent.replaceChild(elem, this);
          }
        } // Force callback invocation

      }, ignored);
    }
  });
  jQuery.each({
    appendTo: "append",
    prependTo: "prepend",
    insertBefore: "before",
    insertAfter: "after",
    replaceAll: "replaceWith"
  }, function (name, original) {
    jQuery.fn[name] = function (selector) {
      var elems,
          ret = [],
          insert = jQuery(selector),
          last = insert.length - 1,
          i = 0;

      for (; i <= last; i++) {
        elems = i === last ? this : this.clone(true);
        jQuery(insert[i])[original](elems); // Support: Android <=4.0 only, PhantomJS 1 only
        // .get() because push.apply(_, arraylike) throws on ancient WebKit

        push.apply(ret, elems.get());
      }

      return this.pushStack(ret);
    };
  });
  var rnumnonpx = new RegExp("^(" + pnum + ")(?!px)[a-z%]+$", "i");

  var getStyles = function (elem) {
    // Support: IE <=11 only, Firefox <=30 (#15098, #14150)
    // IE throws on elements created in popups
    // FF meanwhile throws on frame elements through "defaultView.getComputedStyle"
    var view = elem.ownerDocument.defaultView;

    if (!view || !view.opener) {
      view = window;
    }

    return view.getComputedStyle(elem);
  };

  var rboxStyle = new RegExp(cssExpand.join("|"), "i");

  (function () {
    // Executing both pixelPosition & boxSizingReliable tests require only one layout
    // so they're executed at the same time to save the second computation.
    function computeStyleTests() {
      // This is a singleton, we need to execute it only once
      if (!div) {
        return;
      }

      container.style.cssText = "position:absolute;left:-11111px;width:60px;" + "margin-top:1px;padding:0;border:0";
      div.style.cssText = "position:relative;display:block;box-sizing:border-box;overflow:scroll;" + "margin:auto;border:1px;padding:1px;" + "width:60%;top:1%";
      documentElement.appendChild(container).appendChild(div);
      var divStyle = window.getComputedStyle(div);
      pixelPositionVal = divStyle.top !== "1%"; // Support: Android 4.0 - 4.3 only, Firefox <=3 - 44

      reliableMarginLeftVal = roundPixelMeasures(divStyle.marginLeft) === 12; // Support: Android 4.0 - 4.3 only, Safari <=9.1 - 10.1, iOS <=7.0 - 9.3
      // Some styles come back with percentage values, even though they shouldn't

      div.style.right = "60%";
      pixelBoxStylesVal = roundPixelMeasures(divStyle.right) === 36; // Support: IE 9 - 11 only
      // Detect misreporting of content dimensions for box-sizing:border-box elements

      boxSizingReliableVal = roundPixelMeasures(divStyle.width) === 36; // Support: IE 9 only
      // Detect overflow:scroll screwiness (gh-3699)

      div.style.position = "absolute";
      scrollboxSizeVal = div.offsetWidth === 36 || "absolute";
      documentElement.removeChild(container); // Nullify the div so it wouldn't be stored in the memory and
      // it will also be a sign that checks already performed

      div = null;
    }

    function roundPixelMeasures(measure) {
      return Math.round(parseFloat(measure));
    }

    var pixelPositionVal,
        boxSizingReliableVal,
        scrollboxSizeVal,
        pixelBoxStylesVal,
        reliableMarginLeftVal,
        container = document.createElement("div"),
        div = document.createElement("div"); // Finish early in limited (non-browser) environments

    if (!div.style) {
      return;
    } // Support: IE <=9 - 11 only
    // Style of cloned element affects source element cloned (#8908)


    div.style.backgroundClip = "content-box";
    div.cloneNode(true).style.backgroundClip = "";
    support.clearCloneStyle = div.style.backgroundClip === "content-box";
    jQuery.extend(support, {
      boxSizingReliable: function () {
        computeStyleTests();
        return boxSizingReliableVal;
      },
      pixelBoxStyles: function () {
        computeStyleTests();
        return pixelBoxStylesVal;
      },
      pixelPosition: function () {
        computeStyleTests();
        return pixelPositionVal;
      },
      reliableMarginLeft: function () {
        computeStyleTests();
        return reliableMarginLeftVal;
      },
      scrollboxSize: function () {
        computeStyleTests();
        return scrollboxSizeVal;
      }
    });
  })();

  function curCSS(elem, name, computed) {
    var width,
        minWidth,
        maxWidth,
        ret,
        // Support: Firefox 51+
    // Retrieving style before computed somehow
    // fixes an issue with getting wrong values
    // on detached elements
    style = elem.style;
    computed = computed || getStyles(elem); // getPropertyValue is needed for:
    //   .css('filter') (IE 9 only, #12537)
    //   .css('--customProperty) (#3144)

    if (computed) {
      ret = computed.getPropertyValue(name) || computed[name];

      if (ret === "" && !jQuery.contains(elem.ownerDocument, elem)) {
        ret = jQuery.style(elem, name);
      } // A tribute to the "awesome hack by Dean Edwards"
      // Android Browser returns percentage for some values,
      // but width seems to be reliably pixels.
      // This is against the CSSOM draft spec:
      // https://drafts.csswg.org/cssom/#resolved-values


      if (!support.pixelBoxStyles() && rnumnonpx.test(ret) && rboxStyle.test(name)) {
        // Remember the original values
        width = style.width;
        minWidth = style.minWidth;
        maxWidth = style.maxWidth; // Put in the new values to get a computed value out

        style.minWidth = style.maxWidth = style.width = ret;
        ret = computed.width; // Revert the changed values

        style.width = width;
        style.minWidth = minWidth;
        style.maxWidth = maxWidth;
      }
    }

    return ret !== undefined ? // Support: IE <=9 - 11 only
    // IE returns zIndex value as an integer.
    ret + "" : ret;
  }

  function addGetHookIf(conditionFn, hookFn) {
    // Define the hook, we'll check on the first run if it's really needed.
    return {
      get: function () {
        if (conditionFn()) {
          // Hook not needed (or it's not possible to use it due
          // to missing dependency), remove it.
          delete this.get;
          return;
        } // Hook needed; redefine it so that the support test is not executed again.


        return (this.get = hookFn).apply(this, arguments);
      }
    };
  }

  var // Swappable if display is none or starts with table
  // except "table", "table-cell", or "table-caption"
  // See here for display values: https://developer.mozilla.org/en-US/docs/CSS/display
  rdisplayswap = /^(none|table(?!-c[ea]).+)/,
      rcustomProp = /^--/,
      cssShow = {
    position: "absolute",
    visibility: "hidden",
    display: "block"
  },
      cssNormalTransform = {
    letterSpacing: "0",
    fontWeight: "400"
  },
      cssPrefixes = ["Webkit", "Moz", "ms"],
      emptyStyle = document.createElement("div").style; // Return a css property mapped to a potentially vendor prefixed property

  function vendorPropName(name) {
    // Shortcut for names that are not vendor prefixed
    if (name in emptyStyle) {
      return name;
    } // Check for vendor prefixed names


    var capName = name[0].toUpperCase() + name.slice(1),
        i = cssPrefixes.length;

    while (i--) {
      name = cssPrefixes[i] + capName;

      if (name in emptyStyle) {
        return name;
      }
    }
  } // Return a property mapped along what jQuery.cssProps suggests or to
  // a vendor prefixed property.


  function finalPropName(name) {
    var ret = jQuery.cssProps[name];

    if (!ret) {
      ret = jQuery.cssProps[name] = vendorPropName(name) || name;
    }

    return ret;
  }

  function setPositiveNumber(elem, value, subtract) {
    // Any relative (+/-) values have already been
    // normalized at this point
    var matches = rcssNum.exec(value);
    return matches ? // Guard against undefined "subtract", e.g., when used as in cssHooks
    Math.max(0, matches[2] - (subtract || 0)) + (matches[3] || "px") : value;
  }

  function boxModelAdjustment(elem, dimension, box, isBorderBox, styles, computedVal) {
    var i = dimension === "width" ? 1 : 0,
        extra = 0,
        delta = 0; // Adjustment may not be necessary

    if (box === (isBorderBox ? "border" : "content")) {
      return 0;
    }

    for (; i < 4; i += 2) {
      // Both box models exclude margin
      if (box === "margin") {
        delta += jQuery.css(elem, box + cssExpand[i], true, styles);
      } // If we get here with a content-box, we're seeking "padding" or "border" or "margin"


      if (!isBorderBox) {
        // Add padding
        delta += jQuery.css(elem, "padding" + cssExpand[i], true, styles); // For "border" or "margin", add border

        if (box !== "padding") {
          delta += jQuery.css(elem, "border" + cssExpand[i] + "Width", true, styles); // But still keep track of it otherwise
        } else {
          extra += jQuery.css(elem, "border" + cssExpand[i] + "Width", true, styles);
        } // If we get here with a border-box (content + padding + border), we're seeking "content" or
        // "padding" or "margin"

      } else {
        // For "content", subtract padding
        if (box === "content") {
          delta -= jQuery.css(elem, "padding" + cssExpand[i], true, styles);
        } // For "content" or "padding", subtract border


        if (box !== "margin") {
          delta -= jQuery.css(elem, "border" + cssExpand[i] + "Width", true, styles);
        }
      }
    } // Account for positive content-box scroll gutter when requested by providing computedVal


    if (!isBorderBox && computedVal >= 0) {
      // offsetWidth/offsetHeight is a rounded sum of content, padding, scroll gutter, and border
      // Assuming integer scroll gutter, subtract the rest and round down
      delta += Math.max(0, Math.ceil(elem["offset" + dimension[0].toUpperCase() + dimension.slice(1)] - computedVal - delta - extra - 0.5));
    }

    return delta;
  }

  function getWidthOrHeight(elem, dimension, extra) {
    // Start with computed style
    var styles = getStyles(elem),
        val = curCSS(elem, dimension, styles),
        isBorderBox = jQuery.css(elem, "boxSizing", false, styles) === "border-box",
        valueIsBorderBox = isBorderBox; // Support: Firefox <=54
    // Return a confounding non-pixel value or feign ignorance, as appropriate.

    if (rnumnonpx.test(val)) {
      if (!extra) {
        return val;
      }

      val = "auto";
    } // Check for style in case a browser which returns unreliable values
    // for getComputedStyle silently falls back to the reliable elem.style


    valueIsBorderBox = valueIsBorderBox && (support.boxSizingReliable() || val === elem.style[dimension]); // Fall back to offsetWidth/offsetHeight when value is "auto"
    // This happens for inline elements with no explicit setting (gh-3571)
    // Support: Android <=4.1 - 4.3 only
    // Also use offsetWidth/offsetHeight for misreported inline dimensions (gh-3602)

    if (val === "auto" || !parseFloat(val) && jQuery.css(elem, "display", false, styles) === "inline") {
      val = elem["offset" + dimension[0].toUpperCase() + dimension.slice(1)]; // offsetWidth/offsetHeight provide border-box values

      valueIsBorderBox = true;
    } // Normalize "" and auto


    val = parseFloat(val) || 0; // Adjust for the element's box model

    return val + boxModelAdjustment(elem, dimension, extra || (isBorderBox ? "border" : "content"), valueIsBorderBox, styles, // Provide the current computed size to request scroll gutter calculation (gh-3589)
    val) + "px";
  }

  jQuery.extend({
    // Add in style property hooks for overriding the default
    // behavior of getting and setting a style property
    cssHooks: {
      opacity: {
        get: function (elem, computed) {
          if (computed) {
            // We should always get a number back from opacity
            var ret = curCSS(elem, "opacity");
            return ret === "" ? "1" : ret;
          }
        }
      }
    },
    // Don't automatically add "px" to these possibly-unitless properties
    cssNumber: {
      "animationIterationCount": true,
      "columnCount": true,
      "fillOpacity": true,
      "flexGrow": true,
      "flexShrink": true,
      "fontWeight": true,
      "lineHeight": true,
      "opacity": true,
      "order": true,
      "orphans": true,
      "widows": true,
      "zIndex": true,
      "zoom": true
    },
    // Add in properties whose names you wish to fix before
    // setting or getting the value
    cssProps: {},
    // Get and set the style property on a DOM Node
    style: function (elem, name, value, extra) {
      // Don't set styles on text and comment nodes
      if (!elem || elem.nodeType === 3 || elem.nodeType === 8 || !elem.style) {
        return;
      } // Make sure that we're working with the right name


      var ret,
          type,
          hooks,
          origName = camelCase(name),
          isCustomProp = rcustomProp.test(name),
          style = elem.style; // Make sure that we're working with the right name. We don't
      // want to query the value if it is a CSS custom property
      // since they are user-defined.

      if (!isCustomProp) {
        name = finalPropName(origName);
      } // Gets hook for the prefixed version, then unprefixed version


      hooks = jQuery.cssHooks[name] || jQuery.cssHooks[origName]; // Check if we're setting a value

      if (value !== undefined) {
        type = typeof value; // Convert "+=" or "-=" to relative numbers (#7345)

        if (type === "string" && (ret = rcssNum.exec(value)) && ret[1]) {
          value = adjustCSS(elem, name, ret); // Fixes bug #9237

          type = "number";
        } // Make sure that null and NaN values aren't set (#7116)


        if (value == null || value !== value) {
          return;
        } // If a number was passed in, add the unit (except for certain CSS properties)


        if (type === "number") {
          value += ret && ret[3] || (jQuery.cssNumber[origName] ? "" : "px");
        } // background-* props affect original clone's values


        if (!support.clearCloneStyle && value === "" && name.indexOf("background") === 0) {
          style[name] = "inherit";
        } // If a hook was provided, use that value, otherwise just set the specified value


        if (!hooks || !("set" in hooks) || (value = hooks.set(elem, value, extra)) !== undefined) {
          if (isCustomProp) {
            style.setProperty(name, value);
          } else {
            style[name] = value;
          }
        }
      } else {
        // If a hook was provided get the non-computed value from there
        if (hooks && "get" in hooks && (ret = hooks.get(elem, false, extra)) !== undefined) {
          return ret;
        } // Otherwise just get the value from the style object


        return style[name];
      }
    },
    css: function (elem, name, extra, styles) {
      var val,
          num,
          hooks,
          origName = camelCase(name),
          isCustomProp = rcustomProp.test(name); // Make sure that we're working with the right name. We don't
      // want to modify the value if it is a CSS custom property
      // since they are user-defined.

      if (!isCustomProp) {
        name = finalPropName(origName);
      } // Try prefixed name followed by the unprefixed name


      hooks = jQuery.cssHooks[name] || jQuery.cssHooks[origName]; // If a hook was provided get the computed value from there

      if (hooks && "get" in hooks) {
        val = hooks.get(elem, true, extra);
      } // Otherwise, if a way to get the computed value exists, use that


      if (val === undefined) {
        val = curCSS(elem, name, styles);
      } // Convert "normal" to computed value


      if (val === "normal" && name in cssNormalTransform) {
        val = cssNormalTransform[name];
      } // Make numeric if forced or a qualifier was provided and val looks numeric


      if (extra === "" || extra) {
        num = parseFloat(val);
        return extra === true || isFinite(num) ? num || 0 : val;
      }

      return val;
    }
  });
  jQuery.each(["height", "width"], function (i, dimension) {
    jQuery.cssHooks[dimension] = {
      get: function (elem, computed, extra) {
        if (computed) {
          // Certain elements can have dimension info if we invisibly show them
          // but it must have a current display style that would benefit
          return rdisplayswap.test(jQuery.css(elem, "display")) && ( // Support: Safari 8+
          // Table columns in Safari have non-zero offsetWidth & zero
          // getBoundingClientRect().width unless display is changed.
          // Support: IE <=11 only
          // Running getBoundingClientRect on a disconnected node
          // in IE throws an error.
          !elem.getClientRects().length || !elem.getBoundingClientRect().width) ? swap(elem, cssShow, function () {
            return getWidthOrHeight(elem, dimension, extra);
          }) : getWidthOrHeight(elem, dimension, extra);
        }
      },
      set: function (elem, value, extra) {
        var matches,
            styles = getStyles(elem),
            isBorderBox = jQuery.css(elem, "boxSizing", false, styles) === "border-box",
            subtract = extra && boxModelAdjustment(elem, dimension, extra, isBorderBox, styles); // Account for unreliable border-box dimensions by comparing offset* to computed and
        // faking a content-box to get border and padding (gh-3699)

        if (isBorderBox && support.scrollboxSize() === styles.position) {
          subtract -= Math.ceil(elem["offset" + dimension[0].toUpperCase() + dimension.slice(1)] - parseFloat(styles[dimension]) - boxModelAdjustment(elem, dimension, "border", false, styles) - 0.5);
        } // Convert to pixels if value adjustment is needed


        if (subtract && (matches = rcssNum.exec(value)) && (matches[3] || "px") !== "px") {
          elem.style[dimension] = value;
          value = jQuery.css(elem, dimension);
        }

        return setPositiveNumber(elem, value, subtract);
      }
    };
  });
  jQuery.cssHooks.marginLeft = addGetHookIf(support.reliableMarginLeft, function (elem, computed) {
    if (computed) {
      return (parseFloat(curCSS(elem, "marginLeft")) || elem.getBoundingClientRect().left - swap(elem, {
        marginLeft: 0
      }, function () {
        return elem.getBoundingClientRect().left;
      })) + "px";
    }
  }); // These hooks are used by animate to expand properties

  jQuery.each({
    margin: "",
    padding: "",
    border: "Width"
  }, function (prefix, suffix) {
    jQuery.cssHooks[prefix + suffix] = {
      expand: function (value) {
        var i = 0,
            expanded = {},
            // Assumes a single number if not a string
        parts = typeof value === "string" ? value.split(" ") : [value];

        for (; i < 4; i++) {
          expanded[prefix + cssExpand[i] + suffix] = parts[i] || parts[i - 2] || parts[0];
        }

        return expanded;
      }
    };

    if (prefix !== "margin") {
      jQuery.cssHooks[prefix + suffix].set = setPositiveNumber;
    }
  });
  jQuery.fn.extend({
    css: function (name, value) {
      return access(this, function (elem, name, value) {
        var styles,
            len,
            map = {},
            i = 0;

        if (Array.isArray(name)) {
          styles = getStyles(elem);
          len = name.length;

          for (; i < len; i++) {
            map[name[i]] = jQuery.css(elem, name[i], false, styles);
          }

          return map;
        }

        return value !== undefined ? jQuery.style(elem, name, value) : jQuery.css(elem, name);
      }, name, value, arguments.length > 1);
    }
  });

  function Tween(elem, options, prop, end, easing) {
    return new Tween.prototype.init(elem, options, prop, end, easing);
  }

  jQuery.Tween = Tween;
  Tween.prototype = {
    constructor: Tween,
    init: function (elem, options, prop, end, easing, unit) {
      this.elem = elem;
      this.prop = prop;
      this.easing = easing || jQuery.easing._default;
      this.options = options;
      this.start = this.now = this.cur();
      this.end = end;
      this.unit = unit || (jQuery.cssNumber[prop] ? "" : "px");
    },
    cur: function () {
      var hooks = Tween.propHooks[this.prop];
      return hooks && hooks.get ? hooks.get(this) : Tween.propHooks._default.get(this);
    },
    run: function (percent) {
      var eased,
          hooks = Tween.propHooks[this.prop];

      if (this.options.duration) {
        this.pos = eased = jQuery.easing[this.easing](percent, this.options.duration * percent, 0, 1, this.options.duration);
      } else {
        this.pos = eased = percent;
      }

      this.now = (this.end - this.start) * eased + this.start;

      if (this.options.step) {
        this.options.step.call(this.elem, this.now, this);
      }

      if (hooks && hooks.set) {
        hooks.set(this);
      } else {
        Tween.propHooks._default.set(this);
      }

      return this;
    }
  };
  Tween.prototype.init.prototype = Tween.prototype;
  Tween.propHooks = {
    _default: {
      get: function (tween) {
        var result; // Use a property on the element directly when it is not a DOM element,
        // or when there is no matching style property that exists.

        if (tween.elem.nodeType !== 1 || tween.elem[tween.prop] != null && tween.elem.style[tween.prop] == null) {
          return tween.elem[tween.prop];
        } // Passing an empty string as a 3rd parameter to .css will automatically
        // attempt a parseFloat and fallback to a string if the parse fails.
        // Simple values such as "10px" are parsed to Float;
        // complex values such as "rotate(1rad)" are returned as-is.


        result = jQuery.css(tween.elem, tween.prop, ""); // Empty strings, null, undefined and "auto" are converted to 0.

        return !result || result === "auto" ? 0 : result;
      },
      set: function (tween) {
        // Use step hook for back compat.
        // Use cssHook if its there.
        // Use .style if available and use plain properties where available.
        if (jQuery.fx.step[tween.prop]) {
          jQuery.fx.step[tween.prop](tween);
        } else if (tween.elem.nodeType === 1 && (tween.elem.style[jQuery.cssProps[tween.prop]] != null || jQuery.cssHooks[tween.prop])) {
          jQuery.style(tween.elem, tween.prop, tween.now + tween.unit);
        } else {
          tween.elem[tween.prop] = tween.now;
        }
      }
    }
  }; // Support: IE <=9 only
  // Panic based approach to setting things on disconnected nodes

  Tween.propHooks.scrollTop = Tween.propHooks.scrollLeft = {
    set: function (tween) {
      if (tween.elem.nodeType && tween.elem.parentNode) {
        tween.elem[tween.prop] = tween.now;
      }
    }
  };
  jQuery.easing = {
    linear: function (p) {
      return p;
    },
    swing: function (p) {
      return 0.5 - Math.cos(p * Math.PI) / 2;
    },
    _default: "swing"
  };
  jQuery.fx = Tween.prototype.init; // Back compat <1.8 extension point

  jQuery.fx.step = {};
  var fxNow,
      inProgress,
      rfxtypes = /^(?:toggle|show|hide)$/,
      rrun = /queueHooks$/;

  function schedule() {
    if (inProgress) {
      if (document.hidden === false && window.requestAnimationFrame) {
        window.requestAnimationFrame(schedule);
      } else {
        window.setTimeout(schedule, jQuery.fx.interval);
      }

      jQuery.fx.tick();
    }
  } // Animations created synchronously will run synchronously


  function createFxNow() {
    window.setTimeout(function () {
      fxNow = undefined;
    });
    return fxNow = Date.now();
  } // Generate parameters to create a standard animation


  function genFx(type, includeWidth) {
    var which,
        i = 0,
        attrs = {
      height: type
    }; // If we include width, step value is 1 to do all cssExpand values,
    // otherwise step value is 2 to skip over Left and Right

    includeWidth = includeWidth ? 1 : 0;

    for (; i < 4; i += 2 - includeWidth) {
      which = cssExpand[i];
      attrs["margin" + which] = attrs["padding" + which] = type;
    }

    if (includeWidth) {
      attrs.opacity = attrs.width = type;
    }

    return attrs;
  }

  function createTween(value, prop, animation) {
    var tween,
        collection = (Animation.tweeners[prop] || []).concat(Animation.tweeners["*"]),
        index = 0,
        length = collection.length;

    for (; index < length; index++) {
      if (tween = collection[index].call(animation, prop, value)) {
        // We're done with this property
        return tween;
      }
    }
  }

  function defaultPrefilter(elem, props, opts) {
    var prop,
        value,
        toggle,
        hooks,
        oldfire,
        propTween,
        restoreDisplay,
        display,
        isBox = "width" in props || "height" in props,
        anim = this,
        orig = {},
        style = elem.style,
        hidden = elem.nodeType && isHiddenWithinTree(elem),
        dataShow = dataPriv.get(elem, "fxshow"); // Queue-skipping animations hijack the fx hooks

    if (!opts.queue) {
      hooks = jQuery._queueHooks(elem, "fx");

      if (hooks.unqueued == null) {
        hooks.unqueued = 0;
        oldfire = hooks.empty.fire;

        hooks.empty.fire = function () {
          if (!hooks.unqueued) {
            oldfire();
          }
        };
      }

      hooks.unqueued++;
      anim.always(function () {
        // Ensure the complete handler is called before this completes
        anim.always(function () {
          hooks.unqueued--;

          if (!jQuery.queue(elem, "fx").length) {
            hooks.empty.fire();
          }
        });
      });
    } // Detect show/hide animations


    for (prop in props) {
      value = props[prop];

      if (rfxtypes.test(value)) {
        delete props[prop];
        toggle = toggle || value === "toggle";

        if (value === (hidden ? "hide" : "show")) {
          // Pretend to be hidden if this is a "show" and
          // there is still data from a stopped show/hide
          if (value === "show" && dataShow && dataShow[prop] !== undefined) {
            hidden = true; // Ignore all other no-op show/hide data
          } else {
            continue;
          }
        }

        orig[prop] = dataShow && dataShow[prop] || jQuery.style(elem, prop);
      }
    } // Bail out if this is a no-op like .hide().hide()


    propTween = !jQuery.isEmptyObject(props);

    if (!propTween && jQuery.isEmptyObject(orig)) {
      return;
    } // Restrict "overflow" and "display" styles during box animations


    if (isBox && elem.nodeType === 1) {
      // Support: IE <=9 - 11, Edge 12 - 15
      // Record all 3 overflow attributes because IE does not infer the shorthand
      // from identically-valued overflowX and overflowY and Edge just mirrors
      // the overflowX value there.
      opts.overflow = [style.overflow, style.overflowX, style.overflowY]; // Identify a display type, preferring old show/hide data over the CSS cascade

      restoreDisplay = dataShow && dataShow.display;

      if (restoreDisplay == null) {
        restoreDisplay = dataPriv.get(elem, "display");
      }

      display = jQuery.css(elem, "display");

      if (display === "none") {
        if (restoreDisplay) {
          display = restoreDisplay;
        } else {
          // Get nonempty value(s) by temporarily forcing visibility
          showHide([elem], true);
          restoreDisplay = elem.style.display || restoreDisplay;
          display = jQuery.css(elem, "display");
          showHide([elem]);
        }
      } // Animate inline elements as inline-block


      if (display === "inline" || display === "inline-block" && restoreDisplay != null) {
        if (jQuery.css(elem, "float") === "none") {
          // Restore the original display value at the end of pure show/hide animations
          if (!propTween) {
            anim.done(function () {
              style.display = restoreDisplay;
            });

            if (restoreDisplay == null) {
              display = style.display;
              restoreDisplay = display === "none" ? "" : display;
            }
          }

          style.display = "inline-block";
        }
      }
    }

    if (opts.overflow) {
      style.overflow = "hidden";
      anim.always(function () {
        style.overflow = opts.overflow[0];
        style.overflowX = opts.overflow[1];
        style.overflowY = opts.overflow[2];
      });
    } // Implement show/hide animations


    propTween = false;

    for (prop in orig) {
      // General show/hide setup for this element animation
      if (!propTween) {
        if (dataShow) {
          if ("hidden" in dataShow) {
            hidden = dataShow.hidden;
          }
        } else {
          dataShow = dataPriv.access(elem, "fxshow", {
            display: restoreDisplay
          });
        } // Store hidden/visible for toggle so `.stop().toggle()` "reverses"


        if (toggle) {
          dataShow.hidden = !hidden;
        } // Show elements before animating them


        if (hidden) {
          showHide([elem], true);
        }
        /* eslint-disable no-loop-func */


        anim.done(function () {
          /* eslint-enable no-loop-func */
          // The final step of a "hide" animation is actually hiding the element
          if (!hidden) {
            showHide([elem]);
          }

          dataPriv.remove(elem, "fxshow");

          for (prop in orig) {
            jQuery.style(elem, prop, orig[prop]);
          }
        });
      } // Per-property setup


      propTween = createTween(hidden ? dataShow[prop] : 0, prop, anim);

      if (!(prop in dataShow)) {
        dataShow[prop] = propTween.start;

        if (hidden) {
          propTween.end = propTween.start;
          propTween.start = 0;
        }
      }
    }
  }

  function propFilter(props, specialEasing) {
    var index, name, easing, value, hooks; // camelCase, specialEasing and expand cssHook pass

    for (index in props) {
      name = camelCase(index);
      easing = specialEasing[name];
      value = props[index];

      if (Array.isArray(value)) {
        easing = value[1];
        value = props[index] = value[0];
      }

      if (index !== name) {
        props[name] = value;
        delete props[index];
      }

      hooks = jQuery.cssHooks[name];

      if (hooks && "expand" in hooks) {
        value = hooks.expand(value);
        delete props[name]; // Not quite $.extend, this won't overwrite existing keys.
        // Reusing 'index' because we have the correct "name"

        for (index in value) {
          if (!(index in props)) {
            props[index] = value[index];
            specialEasing[index] = easing;
          }
        }
      } else {
        specialEasing[name] = easing;
      }
    }
  }

  function Animation(elem, properties, options) {
    var result,
        stopped,
        index = 0,
        length = Animation.prefilters.length,
        deferred = jQuery.Deferred().always(function () {
      // Don't match elem in the :animated selector
      delete tick.elem;
    }),
        tick = function () {
      if (stopped) {
        return false;
      }

      var currentTime = fxNow || createFxNow(),
          remaining = Math.max(0, animation.startTime + animation.duration - currentTime),
          // Support: Android 2.3 only
      // Archaic crash bug won't allow us to use `1 - ( 0.5 || 0 )` (#12497)
      temp = remaining / animation.duration || 0,
          percent = 1 - temp,
          index = 0,
          length = animation.tweens.length;

      for (; index < length; index++) {
        animation.tweens[index].run(percent);
      }

      deferred.notifyWith(elem, [animation, percent, remaining]); // If there's more to do, yield

      if (percent < 1 && length) {
        return remaining;
      } // If this was an empty animation, synthesize a final progress notification


      if (!length) {
        deferred.notifyWith(elem, [animation, 1, 0]);
      } // Resolve the animation and report its conclusion


      deferred.resolveWith(elem, [animation]);
      return false;
    },
        animation = deferred.promise({
      elem: elem,
      props: jQuery.extend({}, properties),
      opts: jQuery.extend(true, {
        specialEasing: {},
        easing: jQuery.easing._default
      }, options),
      originalProperties: properties,
      originalOptions: options,
      startTime: fxNow || createFxNow(),
      duration: options.duration,
      tweens: [],
      createTween: function (prop, end) {
        var tween = jQuery.Tween(elem, animation.opts, prop, end, animation.opts.specialEasing[prop] || animation.opts.easing);
        animation.tweens.push(tween);
        return tween;
      },
      stop: function (gotoEnd) {
        var index = 0,
            // If we are going to the end, we want to run all the tweens
        // otherwise we skip this part
        length = gotoEnd ? animation.tweens.length : 0;

        if (stopped) {
          return this;
        }

        stopped = true;

        for (; index < length; index++) {
          animation.tweens[index].run(1);
        } // Resolve when we played the last frame; otherwise, reject


        if (gotoEnd) {
          deferred.notifyWith(elem, [animation, 1, 0]);
          deferred.resolveWith(elem, [animation, gotoEnd]);
        } else {
          deferred.rejectWith(elem, [animation, gotoEnd]);
        }

        return this;
      }
    }),
        props = animation.props;

    propFilter(props, animation.opts.specialEasing);

    for (; index < length; index++) {
      result = Animation.prefilters[index].call(animation, elem, props, animation.opts);

      if (result) {
        if (isFunction(result.stop)) {
          jQuery._queueHooks(animation.elem, animation.opts.queue).stop = result.stop.bind(result);
        }

        return result;
      }
    }

    jQuery.map(props, createTween, animation);

    if (isFunction(animation.opts.start)) {
      animation.opts.start.call(elem, animation);
    } // Attach callbacks from options


    animation.progress(animation.opts.progress).done(animation.opts.done, animation.opts.complete).fail(animation.opts.fail).always(animation.opts.always);
    jQuery.fx.timer(jQuery.extend(tick, {
      elem: elem,
      anim: animation,
      queue: animation.opts.queue
    }));
    return animation;
  }

  jQuery.Animation = jQuery.extend(Animation, {
    tweeners: {
      "*": [function (prop, value) {
        var tween = this.createTween(prop, value);
        adjustCSS(tween.elem, prop, rcssNum.exec(value), tween);
        return tween;
      }]
    },
    tweener: function (props, callback) {
      if (isFunction(props)) {
        callback = props;
        props = ["*"];
      } else {
        props = props.match(rnothtmlwhite);
      }

      var prop,
          index = 0,
          length = props.length;

      for (; index < length; index++) {
        prop = props[index];
        Animation.tweeners[prop] = Animation.tweeners[prop] || [];
        Animation.tweeners[prop].unshift(callback);
      }
    },
    prefilters: [defaultPrefilter],
    prefilter: function (callback, prepend) {
      if (prepend) {
        Animation.prefilters.unshift(callback);
      } else {
        Animation.prefilters.push(callback);
      }
    }
  });

  jQuery.speed = function (speed, easing, fn) {
    var opt = speed && typeof speed === "object" ? jQuery.extend({}, speed) : {
      complete: fn || !fn && easing || isFunction(speed) && speed,
      duration: speed,
      easing: fn && easing || easing && !isFunction(easing) && easing
    }; // Go to the end state if fx are off

    if (jQuery.fx.off) {
      opt.duration = 0;
    } else {
      if (typeof opt.duration !== "number") {
        if (opt.duration in jQuery.fx.speeds) {
          opt.duration = jQuery.fx.speeds[opt.duration];
        } else {
          opt.duration = jQuery.fx.speeds._default;
        }
      }
    } // Normalize opt.queue - true/undefined/null -> "fx"


    if (opt.queue == null || opt.queue === true) {
      opt.queue = "fx";
    } // Queueing


    opt.old = opt.complete;

    opt.complete = function () {
      if (isFunction(opt.old)) {
        opt.old.call(this);
      }

      if (opt.queue) {
        jQuery.dequeue(this, opt.queue);
      }
    };

    return opt;
  };

  jQuery.fn.extend({
    fadeTo: function (speed, to, easing, callback) {
      // Show any hidden elements after setting opacity to 0
      return this.filter(isHiddenWithinTree).css("opacity", 0).show() // Animate to the value specified
      .end().animate({
        opacity: to
      }, speed, easing, callback);
    },
    animate: function (prop, speed, easing, callback) {
      var empty = jQuery.isEmptyObject(prop),
          optall = jQuery.speed(speed, easing, callback),
          doAnimation = function () {
        // Operate on a copy of prop so per-property easing won't be lost
        var anim = Animation(this, jQuery.extend({}, prop), optall); // Empty animations, or finishing resolves immediately

        if (empty || dataPriv.get(this, "finish")) {
          anim.stop(true);
        }
      };

      doAnimation.finish = doAnimation;
      return empty || optall.queue === false ? this.each(doAnimation) : this.queue(optall.queue, doAnimation);
    },
    stop: function (type, clearQueue, gotoEnd) {
      var stopQueue = function (hooks) {
        var stop = hooks.stop;
        delete hooks.stop;
        stop(gotoEnd);
      };

      if (typeof type !== "string") {
        gotoEnd = clearQueue;
        clearQueue = type;
        type = undefined;
      }

      if (clearQueue && type !== false) {
        this.queue(type || "fx", []);
      }

      return this.each(function () {
        var dequeue = true,
            index = type != null && type + "queueHooks",
            timers = jQuery.timers,
            data = dataPriv.get(this);

        if (index) {
          if (data[index] && data[index].stop) {
            stopQueue(data[index]);
          }
        } else {
          for (index in data) {
            if (data[index] && data[index].stop && rrun.test(index)) {
              stopQueue(data[index]);
            }
          }
        }

        for (index = timers.length; index--;) {
          if (timers[index].elem === this && (type == null || timers[index].queue === type)) {
            timers[index].anim.stop(gotoEnd);
            dequeue = false;
            timers.splice(index, 1);
          }
        } // Start the next in the queue if the last step wasn't forced.
        // Timers currently will call their complete callbacks, which
        // will dequeue but only if they were gotoEnd.


        if (dequeue || !gotoEnd) {
          jQuery.dequeue(this, type);
        }
      });
    },
    finish: function (type) {
      if (type !== false) {
        type = type || "fx";
      }

      return this.each(function () {
        var index,
            data = dataPriv.get(this),
            queue = data[type + "queue"],
            hooks = data[type + "queueHooks"],
            timers = jQuery.timers,
            length = queue ? queue.length : 0; // Enable finishing flag on private data

        data.finish = true; // Empty the queue first

        jQuery.queue(this, type, []);

        if (hooks && hooks.stop) {
          hooks.stop.call(this, true);
        } // Look for any active animations, and finish them


        for (index = timers.length; index--;) {
          if (timers[index].elem === this && timers[index].queue === type) {
            timers[index].anim.stop(true);
            timers.splice(index, 1);
          }
        } // Look for any animations in the old queue and finish them


        for (index = 0; index < length; index++) {
          if (queue[index] && queue[index].finish) {
            queue[index].finish.call(this);
          }
        } // Turn off finishing flag


        delete data.finish;
      });
    }
  });
  jQuery.each(["toggle", "show", "hide"], function (i, name) {
    var cssFn = jQuery.fn[name];

    jQuery.fn[name] = function (speed, easing, callback) {
      return speed == null || typeof speed === "boolean" ? cssFn.apply(this, arguments) : this.animate(genFx(name, true), speed, easing, callback);
    };
  }); // Generate shortcuts for custom animations

  jQuery.each({
    slideDown: genFx("show"),
    slideUp: genFx("hide"),
    slideToggle: genFx("toggle"),
    fadeIn: {
      opacity: "show"
    },
    fadeOut: {
      opacity: "hide"
    },
    fadeToggle: {
      opacity: "toggle"
    }
  }, function (name, props) {
    jQuery.fn[name] = function (speed, easing, callback) {
      return this.animate(props, speed, easing, callback);
    };
  });
  jQuery.timers = [];

  jQuery.fx.tick = function () {
    var timer,
        i = 0,
        timers = jQuery.timers;
    fxNow = Date.now();

    for (; i < timers.length; i++) {
      timer = timers[i]; // Run the timer and safely remove it when done (allowing for external removal)

      if (!timer() && timers[i] === timer) {
        timers.splice(i--, 1);
      }
    }

    if (!timers.length) {
      jQuery.fx.stop();
    }

    fxNow = undefined;
  };

  jQuery.fx.timer = function (timer) {
    jQuery.timers.push(timer);
    jQuery.fx.start();
  };

  jQuery.fx.interval = 13;

  jQuery.fx.start = function () {
    if (inProgress) {
      return;
    }

    inProgress = true;
    schedule();
  };

  jQuery.fx.stop = function () {
    inProgress = null;
  };

  jQuery.fx.speeds = {
    slow: 600,
    fast: 200,
    // Default speed
    _default: 400
  }; // Based off of the plugin by Clint Helfers, with permission.
  // https://web.archive.org/web/20100324014747/http://blindsignals.com/index.php/2009/07/jquery-delay/

  jQuery.fn.delay = function (time, type) {
    time = jQuery.fx ? jQuery.fx.speeds[time] || time : time;
    type = type || "fx";
    return this.queue(type, function (next, hooks) {
      var timeout = window.setTimeout(next, time);

      hooks.stop = function () {
        window.clearTimeout(timeout);
      };
    });
  };

  (function () {
    var input = document.createElement("input"),
        select = document.createElement("select"),
        opt = select.appendChild(document.createElement("option"));
    input.type = "checkbox"; // Support: Android <=4.3 only
    // Default value for a checkbox should be "on"

    support.checkOn = input.value !== ""; // Support: IE <=11 only
    // Must access selectedIndex to make default options select

    support.optSelected = opt.selected; // Support: IE <=11 only
    // An input loses its value after becoming a radio

    input = document.createElement("input");
    input.value = "t";
    input.type = "radio";
    support.radioValue = input.value === "t";
  })();

  var boolHook,
      attrHandle = jQuery.expr.attrHandle;
  jQuery.fn.extend({
    attr: function (name, value) {
      return access(this, jQuery.attr, name, value, arguments.length > 1);
    },
    removeAttr: function (name) {
      return this.each(function () {
        jQuery.removeAttr(this, name);
      });
    }
  });
  jQuery.extend({
    attr: function (elem, name, value) {
      var ret,
          hooks,
          nType = elem.nodeType; // Don't get/set attributes on text, comment and attribute nodes

      if (nType === 3 || nType === 8 || nType === 2) {
        return;
      } // Fallback to prop when attributes are not supported


      if (typeof elem.getAttribute === "undefined") {
        return jQuery.prop(elem, name, value);
      } // Attribute hooks are determined by the lowercase version
      // Grab necessary hook if one is defined


      if (nType !== 1 || !jQuery.isXMLDoc(elem)) {
        hooks = jQuery.attrHooks[name.toLowerCase()] || (jQuery.expr.match.bool.test(name) ? boolHook : undefined);
      }

      if (value !== undefined) {
        if (value === null) {
          jQuery.removeAttr(elem, name);
          return;
        }

        if (hooks && "set" in hooks && (ret = hooks.set(elem, value, name)) !== undefined) {
          return ret;
        }

        elem.setAttribute(name, value + "");
        return value;
      }

      if (hooks && "get" in hooks && (ret = hooks.get(elem, name)) !== null) {
        return ret;
      }

      ret = jQuery.find.attr(elem, name); // Non-existent attributes return null, we normalize to undefined

      return ret == null ? undefined : ret;
    },
    attrHooks: {
      type: {
        set: function (elem, value) {
          if (!support.radioValue && value === "radio" && nodeName(elem, "input")) {
            var val = elem.value;
            elem.setAttribute("type", value);

            if (val) {
              elem.value = val;
            }

            return value;
          }
        }
      }
    },
    removeAttr: function (elem, value) {
      var name,
          i = 0,
          // Attribute names can contain non-HTML whitespace characters
      // https://html.spec.whatwg.org/multipage/syntax.html#attributes-2
      attrNames = value && value.match(rnothtmlwhite);

      if (attrNames && elem.nodeType === 1) {
        while (name = attrNames[i++]) {
          elem.removeAttribute(name);
        }
      }
    }
  }); // Hooks for boolean attributes

  boolHook = {
    set: function (elem, value, name) {
      if (value === false) {
        // Remove boolean attributes when set to false
        jQuery.removeAttr(elem, name);
      } else {
        elem.setAttribute(name, name);
      }

      return name;
    }
  };
  jQuery.each(jQuery.expr.match.bool.source.match(/\w+/g), function (i, name) {
    var getter = attrHandle[name] || jQuery.find.attr;

    attrHandle[name] = function (elem, name, isXML) {
      var ret,
          handle,
          lowercaseName = name.toLowerCase();

      if (!isXML) {
        // Avoid an infinite loop by temporarily removing this function from the getter
        handle = attrHandle[lowercaseName];
        attrHandle[lowercaseName] = ret;
        ret = getter(elem, name, isXML) != null ? lowercaseName : null;
        attrHandle[lowercaseName] = handle;
      }

      return ret;
    };
  });
  var rfocusable = /^(?:input|select|textarea|button)$/i,
      rclickable = /^(?:a|area)$/i;
  jQuery.fn.extend({
    prop: function (name, value) {
      return access(this, jQuery.prop, name, value, arguments.length > 1);
    },
    removeProp: function (name) {
      return this.each(function () {
        delete this[jQuery.propFix[name] || name];
      });
    }
  });
  jQuery.extend({
    prop: function (elem, name, value) {
      var ret,
          hooks,
          nType = elem.nodeType; // Don't get/set properties on text, comment and attribute nodes

      if (nType === 3 || nType === 8 || nType === 2) {
        return;
      }

      if (nType !== 1 || !jQuery.isXMLDoc(elem)) {
        // Fix name and attach hooks
        name = jQuery.propFix[name] || name;
        hooks = jQuery.propHooks[name];
      }

      if (value !== undefined) {
        if (hooks && "set" in hooks && (ret = hooks.set(elem, value, name)) !== undefined) {
          return ret;
        }

        return elem[name] = value;
      }

      if (hooks && "get" in hooks && (ret = hooks.get(elem, name)) !== null) {
        return ret;
      }

      return elem[name];
    },
    propHooks: {
      tabIndex: {
        get: function (elem) {
          // Support: IE <=9 - 11 only
          // elem.tabIndex doesn't always return the
          // correct value when it hasn't been explicitly set
          // https://web.archive.org/web/20141116233347/http://fluidproject.org/blog/2008/01/09/getting-setting-and-removing-tabindex-values-with-javascript/
          // Use proper attribute retrieval(#12072)
          var tabindex = jQuery.find.attr(elem, "tabindex");

          if (tabindex) {
            return parseInt(tabindex, 10);
          }

          if (rfocusable.test(elem.nodeName) || rclickable.test(elem.nodeName) && elem.href) {
            return 0;
          }

          return -1;
        }
      }
    },
    propFix: {
      "for": "htmlFor",
      "class": "className"
    }
  }); // Support: IE <=11 only
  // Accessing the selectedIndex property
  // forces the browser to respect setting selected
  // on the option
  // The getter ensures a default option is selected
  // when in an optgroup
  // eslint rule "no-unused-expressions" is disabled for this code
  // since it considers such accessions noop

  if (!support.optSelected) {
    jQuery.propHooks.selected = {
      get: function (elem) {
        /* eslint no-unused-expressions: "off" */
        var parent = elem.parentNode;

        if (parent && parent.parentNode) {
          parent.parentNode.selectedIndex;
        }

        return null;
      },
      set: function (elem) {
        /* eslint no-unused-expressions: "off" */
        var parent = elem.parentNode;

        if (parent) {
          parent.selectedIndex;

          if (parent.parentNode) {
            parent.parentNode.selectedIndex;
          }
        }
      }
    };
  }

  jQuery.each(["tabIndex", "readOnly", "maxLength", "cellSpacing", "cellPadding", "rowSpan", "colSpan", "useMap", "frameBorder", "contentEditable"], function () {
    jQuery.propFix[this.toLowerCase()] = this;
  }); // Strip and collapse whitespace according to HTML spec
  // https://infra.spec.whatwg.org/#strip-and-collapse-ascii-whitespace

  function stripAndCollapse(value) {
    var tokens = value.match(rnothtmlwhite) || [];
    return tokens.join(" ");
  }

  function getClass(elem) {
    return elem.getAttribute && elem.getAttribute("class") || "";
  }

  function classesToArray(value) {
    if (Array.isArray(value)) {
      return value;
    }

    if (typeof value === "string") {
      return value.match(rnothtmlwhite) || [];
    }

    return [];
  }

  jQuery.fn.extend({
    addClass: function (value) {
      var classes,
          elem,
          cur,
          curValue,
          clazz,
          j,
          finalValue,
          i = 0;

      if (isFunction(value)) {
        return this.each(function (j) {
          jQuery(this).addClass(value.call(this, j, getClass(this)));
        });
      }

      classes = classesToArray(value);

      if (classes.length) {
        while (elem = this[i++]) {
          curValue = getClass(elem);
          cur = elem.nodeType === 1 && " " + stripAndCollapse(curValue) + " ";

          if (cur) {
            j = 0;

            while (clazz = classes[j++]) {
              if (cur.indexOf(" " + clazz + " ") < 0) {
                cur += clazz + " ";
              }
            } // Only assign if different to avoid unneeded rendering.


            finalValue = stripAndCollapse(cur);

            if (curValue !== finalValue) {
              elem.setAttribute("class", finalValue);
            }
          }
        }
      }

      return this;
    },
    removeClass: function (value) {
      var classes,
          elem,
          cur,
          curValue,
          clazz,
          j,
          finalValue,
          i = 0;

      if (isFunction(value)) {
        return this.each(function (j) {
          jQuery(this).removeClass(value.call(this, j, getClass(this)));
        });
      }

      if (!arguments.length) {
        return this.attr("class", "");
      }

      classes = classesToArray(value);

      if (classes.length) {
        while (elem = this[i++]) {
          curValue = getClass(elem); // This expression is here for better compressibility (see addClass)

          cur = elem.nodeType === 1 && " " + stripAndCollapse(curValue) + " ";

          if (cur) {
            j = 0;

            while (clazz = classes[j++]) {
              // Remove *all* instances
              while (cur.indexOf(" " + clazz + " ") > -1) {
                cur = cur.replace(" " + clazz + " ", " ");
              }
            } // Only assign if different to avoid unneeded rendering.


            finalValue = stripAndCollapse(cur);

            if (curValue !== finalValue) {
              elem.setAttribute("class", finalValue);
            }
          }
        }
      }

      return this;
    },
    toggleClass: function (value, stateVal) {
      var type = typeof value,
          isValidValue = type === "string" || Array.isArray(value);

      if (typeof stateVal === "boolean" && isValidValue) {
        return stateVal ? this.addClass(value) : this.removeClass(value);
      }

      if (isFunction(value)) {
        return this.each(function (i) {
          jQuery(this).toggleClass(value.call(this, i, getClass(this), stateVal), stateVal);
        });
      }

      return this.each(function () {
        var className, i, self, classNames;

        if (isValidValue) {
          // Toggle individual class names
          i = 0;
          self = jQuery(this);
          classNames = classesToArray(value);

          while (className = classNames[i++]) {
            // Check each className given, space separated list
            if (self.hasClass(className)) {
              self.removeClass(className);
            } else {
              self.addClass(className);
            }
          } // Toggle whole class name

        } else if (value === undefined || type === "boolean") {
          className = getClass(this);

          if (className) {
            // Store className if set
            dataPriv.set(this, "__className__", className);
          } // If the element has a class name or if we're passed `false`,
          // then remove the whole classname (if there was one, the above saved it).
          // Otherwise bring back whatever was previously saved (if anything),
          // falling back to the empty string if nothing was stored.


          if (this.setAttribute) {
            this.setAttribute("class", className || value === false ? "" : dataPriv.get(this, "__className__") || "");
          }
        }
      });
    },
    hasClass: function (selector) {
      var className,
          elem,
          i = 0;
      className = " " + selector + " ";

      while (elem = this[i++]) {
        if (elem.nodeType === 1 && (" " + stripAndCollapse(getClass(elem)) + " ").indexOf(className) > -1) {
          return true;
        }
      }

      return false;
    }
  });
  var rreturn = /\r/g;
  jQuery.fn.extend({
    val: function (value) {
      var hooks,
          ret,
          valueIsFunction,
          elem = this[0];

      if (!arguments.length) {
        if (elem) {
          hooks = jQuery.valHooks[elem.type] || jQuery.valHooks[elem.nodeName.toLowerCase()];

          if (hooks && "get" in hooks && (ret = hooks.get(elem, "value")) !== undefined) {
            return ret;
          }

          ret = elem.value; // Handle most common string cases

          if (typeof ret === "string") {
            return ret.replace(rreturn, "");
          } // Handle cases where value is null/undef or number


          return ret == null ? "" : ret;
        }

        return;
      }

      valueIsFunction = isFunction(value);
      return this.each(function (i) {
        var val;

        if (this.nodeType !== 1) {
          return;
        }

        if (valueIsFunction) {
          val = value.call(this, i, jQuery(this).val());
        } else {
          val = value;
        } // Treat null/undefined as ""; convert numbers to string


        if (val == null) {
          val = "";
        } else if (typeof val === "number") {
          val += "";
        } else if (Array.isArray(val)) {
          val = jQuery.map(val, function (value) {
            return value == null ? "" : value + "";
          });
        }

        hooks = jQuery.valHooks[this.type] || jQuery.valHooks[this.nodeName.toLowerCase()]; // If set returns undefined, fall back to normal setting

        if (!hooks || !("set" in hooks) || hooks.set(this, val, "value") === undefined) {
          this.value = val;
        }
      });
    }
  });
  jQuery.extend({
    valHooks: {
      option: {
        get: function (elem) {
          var val = jQuery.find.attr(elem, "value");
          return val != null ? val : // Support: IE <=10 - 11 only
          // option.text throws exceptions (#14686, #14858)
          // Strip and collapse whitespace
          // https://html.spec.whatwg.org/#strip-and-collapse-whitespace
          stripAndCollapse(jQuery.text(elem));
        }
      },
      select: {
        get: function (elem) {
          var value,
              option,
              i,
              options = elem.options,
              index = elem.selectedIndex,
              one = elem.type === "select-one",
              values = one ? null : [],
              max = one ? index + 1 : options.length;

          if (index < 0) {
            i = max;
          } else {
            i = one ? index : 0;
          } // Loop through all the selected options


          for (; i < max; i++) {
            option = options[i]; // Support: IE <=9 only
            // IE8-9 doesn't update selected after form reset (#2551)

            if ((option.selected || i === index) && // Don't return options that are disabled or in a disabled optgroup
            !option.disabled && (!option.parentNode.disabled || !nodeName(option.parentNode, "optgroup"))) {
              // Get the specific value for the option
              value = jQuery(option).val(); // We don't need an array for one selects

              if (one) {
                return value;
              } // Multi-Selects return an array


              values.push(value);
            }
          }

          return values;
        },
        set: function (elem, value) {
          var optionSet,
              option,
              options = elem.options,
              values = jQuery.makeArray(value),
              i = options.length;

          while (i--) {
            option = options[i];
            /* eslint-disable no-cond-assign */

            if (option.selected = jQuery.inArray(jQuery.valHooks.option.get(option), values) > -1) {
              optionSet = true;
            }
            /* eslint-enable no-cond-assign */

          } // Force browsers to behave consistently when non-matching value is set


          if (!optionSet) {
            elem.selectedIndex = -1;
          }

          return values;
        }
      }
    }
  }); // Radios and checkboxes getter/setter

  jQuery.each(["radio", "checkbox"], function () {
    jQuery.valHooks[this] = {
      set: function (elem, value) {
        if (Array.isArray(value)) {
          return elem.checked = jQuery.inArray(jQuery(elem).val(), value) > -1;
        }
      }
    };

    if (!support.checkOn) {
      jQuery.valHooks[this].get = function (elem) {
        return elem.getAttribute("value") === null ? "on" : elem.value;
      };
    }
  }); // Return jQuery for attributes-only inclusion

  support.focusin = "onfocusin" in window;

  var rfocusMorph = /^(?:focusinfocus|focusoutblur)$/,
      stopPropagationCallback = function (e) {
    e.stopPropagation();
  };

  jQuery.extend(jQuery.event, {
    trigger: function (event, data, elem, onlyHandlers) {
      var i,
          cur,
          tmp,
          bubbleType,
          ontype,
          handle,
          special,
          lastElement,
          eventPath = [elem || document],
          type = hasOwn.call(event, "type") ? event.type : event,
          namespaces = hasOwn.call(event, "namespace") ? event.namespace.split(".") : [];
      cur = lastElement = tmp = elem = elem || document; // Don't do events on text and comment nodes

      if (elem.nodeType === 3 || elem.nodeType === 8) {
        return;
      } // focus/blur morphs to focusin/out; ensure we're not firing them right now


      if (rfocusMorph.test(type + jQuery.event.triggered)) {
        return;
      }

      if (type.indexOf(".") > -1) {
        // Namespaced trigger; create a regexp to match event type in handle()
        namespaces = type.split(".");
        type = namespaces.shift();
        namespaces.sort();
      }

      ontype = type.indexOf(":") < 0 && "on" + type; // Caller can pass in a jQuery.Event object, Object, or just an event type string

      event = event[jQuery.expando] ? event : new jQuery.Event(type, typeof event === "object" && event); // Trigger bitmask: & 1 for native handlers; & 2 for jQuery (always true)

      event.isTrigger = onlyHandlers ? 2 : 3;
      event.namespace = namespaces.join(".");
      event.rnamespace = event.namespace ? new RegExp("(^|\\.)" + namespaces.join("\\.(?:.*\\.|)") + "(\\.|$)") : null; // Clean up the event in case it is being reused

      event.result = undefined;

      if (!event.target) {
        event.target = elem;
      } // Clone any incoming data and prepend the event, creating the handler arg list


      data = data == null ? [event] : jQuery.makeArray(data, [event]); // Allow special events to draw outside the lines

      special = jQuery.event.special[type] || {};

      if (!onlyHandlers && special.trigger && special.trigger.apply(elem, data) === false) {
        return;
      } // Determine event propagation path in advance, per W3C events spec (#9951)
      // Bubble up to document, then to window; watch for a global ownerDocument var (#9724)


      if (!onlyHandlers && !special.noBubble && !isWindow(elem)) {
        bubbleType = special.delegateType || type;

        if (!rfocusMorph.test(bubbleType + type)) {
          cur = cur.parentNode;
        }

        for (; cur; cur = cur.parentNode) {
          eventPath.push(cur);
          tmp = cur;
        } // Only add window if we got to document (e.g., not plain obj or detached DOM)


        if (tmp === (elem.ownerDocument || document)) {
          eventPath.push(tmp.defaultView || tmp.parentWindow || window);
        }
      } // Fire handlers on the event path


      i = 0;

      while ((cur = eventPath[i++]) && !event.isPropagationStopped()) {
        lastElement = cur;
        event.type = i > 1 ? bubbleType : special.bindType || type; // jQuery handler

        handle = (dataPriv.get(cur, "events") || {})[event.type] && dataPriv.get(cur, "handle");

        if (handle) {
          handle.apply(cur, data);
        } // Native handler


        handle = ontype && cur[ontype];

        if (handle && handle.apply && acceptData(cur)) {
          event.result = handle.apply(cur, data);

          if (event.result === false) {
            event.preventDefault();
          }
        }
      }

      event.type = type; // If nobody prevented the default action, do it now

      if (!onlyHandlers && !event.isDefaultPrevented()) {
        if ((!special._default || special._default.apply(eventPath.pop(), data) === false) && acceptData(elem)) {
          // Call a native DOM method on the target with the same name as the event.
          // Don't do default actions on window, that's where global variables be (#6170)
          if (ontype && isFunction(elem[type]) && !isWindow(elem)) {
            // Don't re-trigger an onFOO event when we call its FOO() method
            tmp = elem[ontype];

            if (tmp) {
              elem[ontype] = null;
            } // Prevent re-triggering of the same event, since we already bubbled it above


            jQuery.event.triggered = type;

            if (event.isPropagationStopped()) {
              lastElement.addEventListener(type, stopPropagationCallback);
            }

            elem[type]();

            if (event.isPropagationStopped()) {
              lastElement.removeEventListener(type, stopPropagationCallback);
            }

            jQuery.event.triggered = undefined;

            if (tmp) {
              elem[ontype] = tmp;
            }
          }
        }
      }

      return event.result;
    },
    // Piggyback on a donor event to simulate a different one
    // Used only for `focus(in | out)` events
    simulate: function (type, elem, event) {
      var e = jQuery.extend(new jQuery.Event(), event, {
        type: type,
        isSimulated: true
      });
      jQuery.event.trigger(e, null, elem);
    }
  });
  jQuery.fn.extend({
    trigger: function (type, data) {
      return this.each(function () {
        jQuery.event.trigger(type, data, this);
      });
    },
    triggerHandler: function (type, data) {
      var elem = this[0];

      if (elem) {
        return jQuery.event.trigger(type, data, elem, true);
      }
    }
  }); // Support: Firefox <=44
  // Firefox doesn't have focus(in | out) events
  // Related ticket - https://bugzilla.mozilla.org/show_bug.cgi?id=687787
  //
  // Support: Chrome <=48 - 49, Safari <=9.0 - 9.1
  // focus(in | out) events fire after focus & blur events,
  // which is spec violation - http://www.w3.org/TR/DOM-Level-3-Events/#events-focusevent-event-order
  // Related ticket - https://bugs.chromium.org/p/chromium/issues/detail?id=449857

  if (!support.focusin) {
    jQuery.each({
      focus: "focusin",
      blur: "focusout"
    }, function (orig, fix) {
      // Attach a single capturing handler on the document while someone wants focusin/focusout
      var handler = function (event) {
        jQuery.event.simulate(fix, event.target, jQuery.event.fix(event));
      };

      jQuery.event.special[fix] = {
        setup: function () {
          var doc = this.ownerDocument || this,
              attaches = dataPriv.access(doc, fix);

          if (!attaches) {
            doc.addEventListener(orig, handler, true);
          }

          dataPriv.access(doc, fix, (attaches || 0) + 1);
        },
        teardown: function () {
          var doc = this.ownerDocument || this,
              attaches = dataPriv.access(doc, fix) - 1;

          if (!attaches) {
            doc.removeEventListener(orig, handler, true);
            dataPriv.remove(doc, fix);
          } else {
            dataPriv.access(doc, fix, attaches);
          }
        }
      };
    });
  }

  var location = window.location;
  var nonce = Date.now();
  var rquery = /\?/; // Cross-browser xml parsing

  jQuery.parseXML = function (data) {
    var xml;

    if (!data || typeof data !== "string") {
      return null;
    } // Support: IE 9 - 11 only
    // IE throws on parseFromString with invalid input.


    try {
      xml = new window.DOMParser().parseFromString(data, "text/xml");
    } catch (e) {
      xml = undefined;
    }

    if (!xml || xml.getElementsByTagName("parsererror").length) {
      jQuery.error("Invalid XML: " + data);
    }

    return xml;
  };

  var rbracket = /\[\]$/,
      rCRLF = /\r?\n/g,
      rsubmitterTypes = /^(?:submit|button|image|reset|file)$/i,
      rsubmittable = /^(?:input|select|textarea|keygen)/i;

  function buildParams(prefix, obj, traditional, add) {
    var name;

    if (Array.isArray(obj)) {
      // Serialize array item.
      jQuery.each(obj, function (i, v) {
        if (traditional || rbracket.test(prefix)) {
          // Treat each array item as a scalar.
          add(prefix, v);
        } else {
          // Item is non-scalar (array or object), encode its numeric index.
          buildParams(prefix + "[" + (typeof v === "object" && v != null ? i : "") + "]", v, traditional, add);
        }
      });
    } else if (!traditional && toType(obj) === "object") {
      // Serialize object item.
      for (name in obj) {
        buildParams(prefix + "[" + name + "]", obj[name], traditional, add);
      }
    } else {
      // Serialize scalar item.
      add(prefix, obj);
    }
  } // Serialize an array of form elements or a set of
  // key/values into a query string


  jQuery.param = function (a, traditional) {
    var prefix,
        s = [],
        add = function (key, valueOrFunction) {
      // If value is a function, invoke it and use its return value
      var value = isFunction(valueOrFunction) ? valueOrFunction() : valueOrFunction;
      s[s.length] = encodeURIComponent(key) + "=" + encodeURIComponent(value == null ? "" : value);
    }; // If an array was passed in, assume that it is an array of form elements.


    if (Array.isArray(a) || a.jquery && !jQuery.isPlainObject(a)) {
      // Serialize the form elements
      jQuery.each(a, function () {
        add(this.name, this.value);
      });
    } else {
      // If traditional, encode the "old" way (the way 1.3.2 or older
      // did it), otherwise encode params recursively.
      for (prefix in a) {
        buildParams(prefix, a[prefix], traditional, add);
      }
    } // Return the resulting serialization


    return s.join("&");
  };

  jQuery.fn.extend({
    serialize: function () {
      return jQuery.param(this.serializeArray());
    },
    serializeArray: function () {
      return this.map(function () {
        // Can add propHook for "elements" to filter or add form elements
        var elements = jQuery.prop(this, "elements");
        return elements ? jQuery.makeArray(elements) : this;
      }).filter(function () {
        var type = this.type; // Use .is( ":disabled" ) so that fieldset[disabled] works

        return this.name && !jQuery(this).is(":disabled") && rsubmittable.test(this.nodeName) && !rsubmitterTypes.test(type) && (this.checked || !rcheckableType.test(type));
      }).map(function (i, elem) {
        var val = jQuery(this).val();

        if (val == null) {
          return null;
        }

        if (Array.isArray(val)) {
          return jQuery.map(val, function (val) {
            return {
              name: elem.name,
              value: val.replace(rCRLF, "\r\n")
            };
          });
        }

        return {
          name: elem.name,
          value: val.replace(rCRLF, "\r\n")
        };
      }).get();
    }
  });
  var r20 = /%20/g,
      rhash = /#.*$/,
      rantiCache = /([?&])_=[^&]*/,
      rheaders = /^(.*?):[ \t]*([^\r\n]*)$/mg,
      // #7653, #8125, #8152: local protocol detection
  rlocalProtocol = /^(?:about|app|app-storage|.+-extension|file|res|widget):$/,
      rnoContent = /^(?:GET|HEAD)$/,
      rprotocol = /^\/\//,

  /* Prefilters
   * 1) They are useful to introduce custom dataTypes (see ajax/jsonp.js for an example)
   * 2) These are called:
   *    - BEFORE asking for a transport
   *    - AFTER param serialization (s.data is a string if s.processData is true)
   * 3) key is the dataType
   * 4) the catchall symbol "*" can be used
   * 5) execution will start with transport dataType and THEN continue down to "*" if needed
   */
  prefilters = {},

  /* Transports bindings
   * 1) key is the dataType
   * 2) the catchall symbol "*" can be used
   * 3) selection will start with transport dataType and THEN go to "*" if needed
   */
  transports = {},
      // Avoid comment-prolog char sequence (#10098); must appease lint and evade compression
  allTypes = "*/".concat("*"),
      // Anchor tag for parsing the document origin
  originAnchor = document.createElement("a");
  originAnchor.href = location.href; // Base "constructor" for jQuery.ajaxPrefilter and jQuery.ajaxTransport

  function addToPrefiltersOrTransports(structure) {
    // dataTypeExpression is optional and defaults to "*"
    return function (dataTypeExpression, func) {
      if (typeof dataTypeExpression !== "string") {
        func = dataTypeExpression;
        dataTypeExpression = "*";
      }

      var dataType,
          i = 0,
          dataTypes = dataTypeExpression.toLowerCase().match(rnothtmlwhite) || [];

      if (isFunction(func)) {
        // For each dataType in the dataTypeExpression
        while (dataType = dataTypes[i++]) {
          // Prepend if requested
          if (dataType[0] === "+") {
            dataType = dataType.slice(1) || "*";
            (structure[dataType] = structure[dataType] || []).unshift(func); // Otherwise append
          } else {
            (structure[dataType] = structure[dataType] || []).push(func);
          }
        }
      }
    };
  } // Base inspection function for prefilters and transports


  function inspectPrefiltersOrTransports(structure, options, originalOptions, jqXHR) {
    var inspected = {},
        seekingTransport = structure === transports;

    function inspect(dataType) {
      var selected;
      inspected[dataType] = true;
      jQuery.each(structure[dataType] || [], function (_, prefilterOrFactory) {
        var dataTypeOrTransport = prefilterOrFactory(options, originalOptions, jqXHR);

        if (typeof dataTypeOrTransport === "string" && !seekingTransport && !inspected[dataTypeOrTransport]) {
          options.dataTypes.unshift(dataTypeOrTransport);
          inspect(dataTypeOrTransport);
          return false;
        } else if (seekingTransport) {
          return !(selected = dataTypeOrTransport);
        }
      });
      return selected;
    }

    return inspect(options.dataTypes[0]) || !inspected["*"] && inspect("*");
  } // A special extend for ajax options
  // that takes "flat" options (not to be deep extended)
  // Fixes #9887


  function ajaxExtend(target, src) {
    var key,
        deep,
        flatOptions = jQuery.ajaxSettings.flatOptions || {};

    for (key in src) {
      if (src[key] !== undefined) {
        (flatOptions[key] ? target : deep || (deep = {}))[key] = src[key];
      }
    }

    if (deep) {
      jQuery.extend(true, target, deep);
    }

    return target;
  }
  /* Handles responses to an ajax request:
   * - finds the right dataType (mediates between content-type and expected dataType)
   * - returns the corresponding response
   */


  function ajaxHandleResponses(s, jqXHR, responses) {
    var ct,
        type,
        finalDataType,
        firstDataType,
        contents = s.contents,
        dataTypes = s.dataTypes; // Remove auto dataType and get content-type in the process

    while (dataTypes[0] === "*") {
      dataTypes.shift();

      if (ct === undefined) {
        ct = s.mimeType || jqXHR.getResponseHeader("Content-Type");
      }
    } // Check if we're dealing with a known content-type


    if (ct) {
      for (type in contents) {
        if (contents[type] && contents[type].test(ct)) {
          dataTypes.unshift(type);
          break;
        }
      }
    } // Check to see if we have a response for the expected dataType


    if (dataTypes[0] in responses) {
      finalDataType = dataTypes[0];
    } else {
      // Try convertible dataTypes
      for (type in responses) {
        if (!dataTypes[0] || s.converters[type + " " + dataTypes[0]]) {
          finalDataType = type;
          break;
        }

        if (!firstDataType) {
          firstDataType = type;
        }
      } // Or just use first one


      finalDataType = finalDataType || firstDataType;
    } // If we found a dataType
    // We add the dataType to the list if needed
    // and return the corresponding response


    if (finalDataType) {
      if (finalDataType !== dataTypes[0]) {
        dataTypes.unshift(finalDataType);
      }

      return responses[finalDataType];
    }
  }
  /* Chain conversions given the request and the original response
   * Also sets the responseXXX fields on the jqXHR instance
   */


  function ajaxConvert(s, response, jqXHR, isSuccess) {
    var conv2,
        current,
        conv,
        tmp,
        prev,
        converters = {},
        // Work with a copy of dataTypes in case we need to modify it for conversion
    dataTypes = s.dataTypes.slice(); // Create converters map with lowercased keys

    if (dataTypes[1]) {
      for (conv in s.converters) {
        converters[conv.toLowerCase()] = s.converters[conv];
      }
    }

    current = dataTypes.shift(); // Convert to each sequential dataType

    while (current) {
      if (s.responseFields[current]) {
        jqXHR[s.responseFields[current]] = response;
      } // Apply the dataFilter if provided


      if (!prev && isSuccess && s.dataFilter) {
        response = s.dataFilter(response, s.dataType);
      }

      prev = current;
      current = dataTypes.shift();

      if (current) {
        // There's only work to do if current dataType is non-auto
        if (current === "*") {
          current = prev; // Convert response if prev dataType is non-auto and differs from current
        } else if (prev !== "*" && prev !== current) {
          // Seek a direct converter
          conv = converters[prev + " " + current] || converters["* " + current]; // If none found, seek a pair

          if (!conv) {
            for (conv2 in converters) {
              // If conv2 outputs current
              tmp = conv2.split(" ");

              if (tmp[1] === current) {
                // If prev can be converted to accepted input
                conv = converters[prev + " " + tmp[0]] || converters["* " + tmp[0]];

                if (conv) {
                  // Condense equivalence converters
                  if (conv === true) {
                    conv = converters[conv2]; // Otherwise, insert the intermediate dataType
                  } else if (converters[conv2] !== true) {
                    current = tmp[0];
                    dataTypes.unshift(tmp[1]);
                  }

                  break;
                }
              }
            }
          } // Apply converter (if not an equivalence)


          if (conv !== true) {
            // Unless errors are allowed to bubble, catch and return them
            if (conv && s.throws) {
              response = conv(response);
            } else {
              try {
                response = conv(response);
              } catch (e) {
                return {
                  state: "parsererror",
                  error: conv ? e : "No conversion from " + prev + " to " + current
                };
              }
            }
          }
        }
      }
    }

    return {
      state: "success",
      data: response
    };
  }

  jQuery.extend({
    // Counter for holding the number of active queries
    active: 0,
    // Last-Modified header cache for next request
    lastModified: {},
    etag: {},
    ajaxSettings: {
      url: location.href,
      type: "GET",
      isLocal: rlocalProtocol.test(location.protocol),
      global: true,
      processData: true,
      async: true,
      contentType: "application/x-www-form-urlencoded; charset=UTF-8",

      /*
      timeout: 0,
      data: null,
      dataType: null,
      username: null,
      password: null,
      cache: null,
      throws: false,
      traditional: false,
      headers: {},
      */
      accepts: {
        "*": allTypes,
        text: "text/plain",
        html: "text/html",
        xml: "application/xml, text/xml",
        json: "application/json, text/javascript"
      },
      contents: {
        xml: /\bxml\b/,
        html: /\bhtml/,
        json: /\bjson\b/
      },
      responseFields: {
        xml: "responseXML",
        text: "responseText",
        json: "responseJSON"
      },
      // Data converters
      // Keys separate source (or catchall "*") and destination types with a single space
      converters: {
        // Convert anything to text
        "* text": String,
        // Text to html (true = no transformation)
        "text html": true,
        // Evaluate text as a json expression
        "text json": JSON.parse,
        // Parse text as xml
        "text xml": jQuery.parseXML
      },
      // For options that shouldn't be deep extended:
      // you can add your own custom options here if
      // and when you create one that shouldn't be
      // deep extended (see ajaxExtend)
      flatOptions: {
        url: true,
        context: true
      }
    },
    // Creates a full fledged settings object into target
    // with both ajaxSettings and settings fields.
    // If target is omitted, writes into ajaxSettings.
    ajaxSetup: function (target, settings) {
      return settings ? // Building a settings object
      ajaxExtend(ajaxExtend(target, jQuery.ajaxSettings), settings) : // Extending ajaxSettings
      ajaxExtend(jQuery.ajaxSettings, target);
    },
    ajaxPrefilter: addToPrefiltersOrTransports(prefilters),
    ajaxTransport: addToPrefiltersOrTransports(transports),
    // Main method
    ajax: function (url, options) {
      // If url is an object, simulate pre-1.5 signature
      if (typeof url === "object") {
        options = url;
        url = undefined;
      } // Force options to be an object


      options = options || {};
      var transport,
          // URL without anti-cache param
      cacheURL,
          // Response headers
      responseHeadersString,
          responseHeaders,
          // timeout handle
      timeoutTimer,
          // Url cleanup var
      urlAnchor,
          // Request state (becomes false upon send and true upon completion)
      completed,
          // To know if global events are to be dispatched
      fireGlobals,
          // Loop variable
      i,
          // uncached part of the url
      uncached,
          // Create the final options object
      s = jQuery.ajaxSetup({}, options),
          // Callbacks context
      callbackContext = s.context || s,
          // Context for global events is callbackContext if it is a DOM node or jQuery collection
      globalEventContext = s.context && (callbackContext.nodeType || callbackContext.jquery) ? jQuery(callbackContext) : jQuery.event,
          // Deferreds
      deferred = jQuery.Deferred(),
          completeDeferred = jQuery.Callbacks("once memory"),
          // Status-dependent callbacks
      statusCode = s.statusCode || {},
          // Headers (they are sent all at once)
      requestHeaders = {},
          requestHeadersNames = {},
          // Default abort message
      strAbort = "canceled",
          // Fake xhr
      jqXHR = {
        readyState: 0,
        // Builds headers hashtable if needed
        getResponseHeader: function (key) {
          var match;

          if (completed) {
            if (!responseHeaders) {
              responseHeaders = {};

              while (match = rheaders.exec(responseHeadersString)) {
                responseHeaders[match[1].toLowerCase()] = match[2];
              }
            }

            match = responseHeaders[key.toLowerCase()];
          }

          return match == null ? null : match;
        },
        // Raw string
        getAllResponseHeaders: function () {
          return completed ? responseHeadersString : null;
        },
        // Caches the header
        setRequestHeader: function (name, value) {
          if (completed == null) {
            name = requestHeadersNames[name.toLowerCase()] = requestHeadersNames[name.toLowerCase()] || name;
            requestHeaders[name] = value;
          }

          return this;
        },
        // Overrides response content-type header
        overrideMimeType: function (type) {
          if (completed == null) {
            s.mimeType = type;
          }

          return this;
        },
        // Status-dependent callbacks
        statusCode: function (map) {
          var code;

          if (map) {
            if (completed) {
              // Execute the appropriate callbacks
              jqXHR.always(map[jqXHR.status]);
            } else {
              // Lazy-add the new callbacks in a way that preserves old ones
              for (code in map) {
                statusCode[code] = [statusCode[code], map[code]];
              }
            }
          }

          return this;
        },
        // Cancel the request
        abort: function (statusText) {
          var finalText = statusText || strAbort;

          if (transport) {
            transport.abort(finalText);
          }

          done(0, finalText);
          return this;
        }
      }; // Attach deferreds

      deferred.promise(jqXHR); // Add protocol if not provided (prefilters might expect it)
      // Handle falsy url in the settings object (#10093: consistency with old signature)
      // We also use the url parameter if available

      s.url = ((url || s.url || location.href) + "").replace(rprotocol, location.protocol + "//"); // Alias method option to type as per ticket #12004

      s.type = options.method || options.type || s.method || s.type; // Extract dataTypes list

      s.dataTypes = (s.dataType || "*").toLowerCase().match(rnothtmlwhite) || [""]; // A cross-domain request is in order when the origin doesn't match the current origin.

      if (s.crossDomain == null) {
        urlAnchor = document.createElement("a"); // Support: IE <=8 - 11, Edge 12 - 15
        // IE throws exception on accessing the href property if url is malformed,
        // e.g. http://example.com:80x/

        try {
          urlAnchor.href = s.url; // Support: IE <=8 - 11 only
          // Anchor's host property isn't correctly set when s.url is relative

          urlAnchor.href = urlAnchor.href;
          s.crossDomain = originAnchor.protocol + "//" + originAnchor.host !== urlAnchor.protocol + "//" + urlAnchor.host;
        } catch (e) {
          // If there is an error parsing the URL, assume it is crossDomain,
          // it can be rejected by the transport if it is invalid
          s.crossDomain = true;
        }
      } // Convert data if not already a string


      if (s.data && s.processData && typeof s.data !== "string") {
        s.data = jQuery.param(s.data, s.traditional);
      } // Apply prefilters


      inspectPrefiltersOrTransports(prefilters, s, options, jqXHR); // If request was aborted inside a prefilter, stop there

      if (completed) {
        return jqXHR;
      } // We can fire global events as of now if asked to
      // Don't fire events if jQuery.event is undefined in an AMD-usage scenario (#15118)


      fireGlobals = jQuery.event && s.global; // Watch for a new set of requests

      if (fireGlobals && jQuery.active++ === 0) {
        jQuery.event.trigger("ajaxStart");
      } // Uppercase the type


      s.type = s.type.toUpperCase(); // Determine if request has content

      s.hasContent = !rnoContent.test(s.type); // Save the URL in case we're toying with the If-Modified-Since
      // and/or If-None-Match header later on
      // Remove hash to simplify url manipulation

      cacheURL = s.url.replace(rhash, ""); // More options handling for requests with no content

      if (!s.hasContent) {
        // Remember the hash so we can put it back
        uncached = s.url.slice(cacheURL.length); // If data is available and should be processed, append data to url

        if (s.data && (s.processData || typeof s.data === "string")) {
          cacheURL += (rquery.test(cacheURL) ? "&" : "?") + s.data; // #9682: remove data so that it's not used in an eventual retry

          delete s.data;
        } // Add or update anti-cache param if needed


        if (s.cache === false) {
          cacheURL = cacheURL.replace(rantiCache, "$1");
          uncached = (rquery.test(cacheURL) ? "&" : "?") + "_=" + nonce++ + uncached;
        } // Put hash and anti-cache on the URL that will be requested (gh-1732)


        s.url = cacheURL + uncached; // Change '%20' to '+' if this is encoded form body content (gh-2658)
      } else if (s.data && s.processData && (s.contentType || "").indexOf("application/x-www-form-urlencoded") === 0) {
        s.data = s.data.replace(r20, "+");
      } // Set the If-Modified-Since and/or If-None-Match header, if in ifModified mode.


      if (s.ifModified) {
        if (jQuery.lastModified[cacheURL]) {
          jqXHR.setRequestHeader("If-Modified-Since", jQuery.lastModified[cacheURL]);
        }

        if (jQuery.etag[cacheURL]) {
          jqXHR.setRequestHeader("If-None-Match", jQuery.etag[cacheURL]);
        }
      } // Set the correct header, if data is being sent


      if (s.data && s.hasContent && s.contentType !== false || options.contentType) {
        jqXHR.setRequestHeader("Content-Type", s.contentType);
      } // Set the Accepts header for the server, depending on the dataType


      jqXHR.setRequestHeader("Accept", s.dataTypes[0] && s.accepts[s.dataTypes[0]] ? s.accepts[s.dataTypes[0]] + (s.dataTypes[0] !== "*" ? ", " + allTypes + "; q=0.01" : "") : s.accepts["*"]); // Check for headers option

      for (i in s.headers) {
        jqXHR.setRequestHeader(i, s.headers[i]);
      } // Allow custom headers/mimetypes and early abort


      if (s.beforeSend && (s.beforeSend.call(callbackContext, jqXHR, s) === false || completed)) {
        // Abort if not done already and return
        return jqXHR.abort();
      } // Aborting is no longer a cancellation


      strAbort = "abort"; // Install callbacks on deferreds

      completeDeferred.add(s.complete);
      jqXHR.done(s.success);
      jqXHR.fail(s.error); // Get transport

      transport = inspectPrefiltersOrTransports(transports, s, options, jqXHR); // If no transport, we auto-abort

      if (!transport) {
        done(-1, "No Transport");
      } else {
        jqXHR.readyState = 1; // Send global event

        if (fireGlobals) {
          globalEventContext.trigger("ajaxSend", [jqXHR, s]);
        } // If request was aborted inside ajaxSend, stop there


        if (completed) {
          return jqXHR;
        } // Timeout


        if (s.async && s.timeout > 0) {
          timeoutTimer = window.setTimeout(function () {
            jqXHR.abort("timeout");
          }, s.timeout);
        }

        try {
          completed = false;
          transport.send(requestHeaders, done);
        } catch (e) {
          // Rethrow post-completion exceptions
          if (completed) {
            throw e;
          } // Propagate others as results


          done(-1, e);
        }
      } // Callback for when everything is done


      function done(status, nativeStatusText, responses, headers) {
        var isSuccess,
            success,
            error,
            response,
            modified,
            statusText = nativeStatusText; // Ignore repeat invocations

        if (completed) {
          return;
        }

        completed = true; // Clear timeout if it exists

        if (timeoutTimer) {
          window.clearTimeout(timeoutTimer);
        } // Dereference transport for early garbage collection
        // (no matter how long the jqXHR object will be used)


        transport = undefined; // Cache response headers

        responseHeadersString = headers || ""; // Set readyState

        jqXHR.readyState = status > 0 ? 4 : 0; // Determine if successful

        isSuccess = status >= 200 && status < 300 || status === 304; // Get response data

        if (responses) {
          response = ajaxHandleResponses(s, jqXHR, responses);
        } // Convert no matter what (that way responseXXX fields are always set)


        response = ajaxConvert(s, response, jqXHR, isSuccess); // If successful, handle type chaining

        if (isSuccess) {
          // Set the If-Modified-Since and/or If-None-Match header, if in ifModified mode.
          if (s.ifModified) {
            modified = jqXHR.getResponseHeader("Last-Modified");

            if (modified) {
              jQuery.lastModified[cacheURL] = modified;
            }

            modified = jqXHR.getResponseHeader("etag");

            if (modified) {
              jQuery.etag[cacheURL] = modified;
            }
          } // if no content


          if (status === 204 || s.type === "HEAD") {
            statusText = "nocontent"; // if not modified
          } else if (status === 304) {
            statusText = "notmodified"; // If we have data, let's convert it
          } else {
            statusText = response.state;
            success = response.data;
            error = response.error;
            isSuccess = !error;
          }
        } else {
          // Extract error from statusText and normalize for non-aborts
          error = statusText;

          if (status || !statusText) {
            statusText = "error";

            if (status < 0) {
              status = 0;
            }
          }
        } // Set data for the fake xhr object


        jqXHR.status = status;
        jqXHR.statusText = (nativeStatusText || statusText) + ""; // Success/Error

        if (isSuccess) {
          deferred.resolveWith(callbackContext, [success, statusText, jqXHR]);
        } else {
          deferred.rejectWith(callbackContext, [jqXHR, statusText, error]);
        } // Status-dependent callbacks


        jqXHR.statusCode(statusCode);
        statusCode = undefined;

        if (fireGlobals) {
          globalEventContext.trigger(isSuccess ? "ajaxSuccess" : "ajaxError", [jqXHR, s, isSuccess ? success : error]);
        } // Complete


        completeDeferred.fireWith(callbackContext, [jqXHR, statusText]);

        if (fireGlobals) {
          globalEventContext.trigger("ajaxComplete", [jqXHR, s]); // Handle the global AJAX counter

          if (! --jQuery.active) {
            jQuery.event.trigger("ajaxStop");
          }
        }
      }

      return jqXHR;
    },
    getJSON: function (url, data, callback) {
      return jQuery.get(url, data, callback, "json");
    },
    getScript: function (url, callback) {
      return jQuery.get(url, undefined, callback, "script");
    }
  });
  jQuery.each(["get", "post"], function (i, method) {
    jQuery[method] = function (url, data, callback, type) {
      // Shift arguments if data argument was omitted
      if (isFunction(data)) {
        type = type || callback;
        callback = data;
        data = undefined;
      } // The url can be an options object (which then must have .url)


      return jQuery.ajax(jQuery.extend({
        url: url,
        type: method,
        dataType: type,
        data: data,
        success: callback
      }, jQuery.isPlainObject(url) && url));
    };
  });

  jQuery._evalUrl = function (url) {
    return jQuery.ajax({
      url: url,
      // Make this explicit, since user can override this through ajaxSetup (#11264)
      type: "GET",
      dataType: "script",
      cache: true,
      async: false,
      global: false,
      "throws": true
    });
  };

  jQuery.fn.extend({
    wrapAll: function (html) {
      var wrap;

      if (this[0]) {
        if (isFunction(html)) {
          html = html.call(this[0]);
        } // The elements to wrap the target around


        wrap = jQuery(html, this[0].ownerDocument).eq(0).clone(true);

        if (this[0].parentNode) {
          wrap.insertBefore(this[0]);
        }

        wrap.map(function () {
          var elem = this;

          while (elem.firstElementChild) {
            elem = elem.firstElementChild;
          }

          return elem;
        }).append(this);
      }

      return this;
    },
    wrapInner: function (html) {
      if (isFunction(html)) {
        return this.each(function (i) {
          jQuery(this).wrapInner(html.call(this, i));
        });
      }

      return this.each(function () {
        var self = jQuery(this),
            contents = self.contents();

        if (contents.length) {
          contents.wrapAll(html);
        } else {
          self.append(html);
        }
      });
    },
    wrap: function (html) {
      var htmlIsFunction = isFunction(html);
      return this.each(function (i) {
        jQuery(this).wrapAll(htmlIsFunction ? html.call(this, i) : html);
      });
    },
    unwrap: function (selector) {
      this.parent(selector).not("body").each(function () {
        jQuery(this).replaceWith(this.childNodes);
      });
      return this;
    }
  });

  jQuery.expr.pseudos.hidden = function (elem) {
    return !jQuery.expr.pseudos.visible(elem);
  };

  jQuery.expr.pseudos.visible = function (elem) {
    return !!(elem.offsetWidth || elem.offsetHeight || elem.getClientRects().length);
  };

  jQuery.ajaxSettings.xhr = function () {
    try {
      return new window.XMLHttpRequest();
    } catch (e) {}
  };

  var xhrSuccessStatus = {
    // File protocol always yields status code 0, assume 200
    0: 200,
    // Support: IE <=9 only
    // #1450: sometimes IE returns 1223 when it should be 204
    1223: 204
  },
      xhrSupported = jQuery.ajaxSettings.xhr();
  support.cors = !!xhrSupported && "withCredentials" in xhrSupported;
  support.ajax = xhrSupported = !!xhrSupported;
  jQuery.ajaxTransport(function (options) {
    var callback, errorCallback; // Cross domain only allowed if supported through XMLHttpRequest

    if (support.cors || xhrSupported && !options.crossDomain) {
      return {
        send: function (headers, complete) {
          var i,
              xhr = options.xhr();
          xhr.open(options.type, options.url, options.async, options.username, options.password); // Apply custom fields if provided

          if (options.xhrFields) {
            for (i in options.xhrFields) {
              xhr[i] = options.xhrFields[i];
            }
          } // Override mime type if needed


          if (options.mimeType && xhr.overrideMimeType) {
            xhr.overrideMimeType(options.mimeType);
          } // X-Requested-With header
          // For cross-domain requests, seeing as conditions for a preflight are
          // akin to a jigsaw puzzle, we simply never set it to be sure.
          // (it can always be set on a per-request basis or even using ajaxSetup)
          // For same-domain requests, won't change header if already provided.


          if (!options.crossDomain && !headers["X-Requested-With"]) {
            headers["X-Requested-With"] = "XMLHttpRequest";
          } // Set headers


          for (i in headers) {
            xhr.setRequestHeader(i, headers[i]);
          } // Callback


          callback = function (type) {
            return function () {
              if (callback) {
                callback = errorCallback = xhr.onload = xhr.onerror = xhr.onabort = xhr.ontimeout = xhr.onreadystatechange = null;

                if (type === "abort") {
                  xhr.abort();
                } else if (type === "error") {
                  // Support: IE <=9 only
                  // On a manual native abort, IE9 throws
                  // errors on any property access that is not readyState
                  if (typeof xhr.status !== "number") {
                    complete(0, "error");
                  } else {
                    complete( // File: protocol always yields status 0; see #8605, #14207
                    xhr.status, xhr.statusText);
                  }
                } else {
                  complete(xhrSuccessStatus[xhr.status] || xhr.status, xhr.statusText, // Support: IE <=9 only
                  // IE9 has no XHR2 but throws on binary (trac-11426)
                  // For XHR2 non-text, let the caller handle it (gh-2498)
                  (xhr.responseType || "text") !== "text" || typeof xhr.responseText !== "string" ? {
                    binary: xhr.response
                  } : {
                    text: xhr.responseText
                  }, xhr.getAllResponseHeaders());
                }
              }
            };
          }; // Listen to events


          xhr.onload = callback();
          errorCallback = xhr.onerror = xhr.ontimeout = callback("error"); // Support: IE 9 only
          // Use onreadystatechange to replace onabort
          // to handle uncaught aborts

          if (xhr.onabort !== undefined) {
            xhr.onabort = errorCallback;
          } else {
            xhr.onreadystatechange = function () {
              // Check readyState before timeout as it changes
              if (xhr.readyState === 4) {
                // Allow onerror to be called first,
                // but that will not handle a native abort
                // Also, save errorCallback to a variable
                // as xhr.onerror cannot be accessed
                window.setTimeout(function () {
                  if (callback) {
                    errorCallback();
                  }
                });
              }
            };
          } // Create the abort callback


          callback = callback("abort");

          try {
            // Do send the request (this may raise an exception)
            xhr.send(options.hasContent && options.data || null);
          } catch (e) {
            // #14683: Only rethrow if this hasn't been notified as an error yet
            if (callback) {
              throw e;
            }
          }
        },
        abort: function () {
          if (callback) {
            callback();
          }
        }
      };
    }
  }); // Prevent auto-execution of scripts when no explicit dataType was provided (See gh-2432)

  jQuery.ajaxPrefilter(function (s) {
    if (s.crossDomain) {
      s.contents.script = false;
    }
  }); // Install script dataType

  jQuery.ajaxSetup({
    accepts: {
      script: "text/javascript, application/javascript, " + "application/ecmascript, application/x-ecmascript"
    },
    contents: {
      script: /\b(?:java|ecma)script\b/
    },
    converters: {
      "text script": function (text) {
        jQuery.globalEval(text);
        return text;
      }
    }
  }); // Handle cache's special case and crossDomain

  jQuery.ajaxPrefilter("script", function (s) {
    if (s.cache === undefined) {
      s.cache = false;
    }

    if (s.crossDomain) {
      s.type = "GET";
    }
  }); // Bind script tag hack transport

  jQuery.ajaxTransport("script", function (s) {
    // This transport only deals with cross domain requests
    if (s.crossDomain) {
      var script, callback;
      return {
        send: function (_, complete) {
          script = jQuery("<script>").prop({
            charset: s.scriptCharset,
            src: s.url
          }).on("load error", callback = function (evt) {
            script.remove();
            callback = null;

            if (evt) {
              complete(evt.type === "error" ? 404 : 200, evt.type);
            }
          }); // Use native DOM manipulation to avoid our domManip AJAX trickery

          document.head.appendChild(script[0]);
        },
        abort: function () {
          if (callback) {
            callback();
          }
        }
      };
    }
  });
  var oldCallbacks = [],
      rjsonp = /(=)\?(?=&|$)|\?\?/; // Default jsonp settings

  jQuery.ajaxSetup({
    jsonp: "callback",
    jsonpCallback: function () {
      var callback = oldCallbacks.pop() || jQuery.expando + "_" + nonce++;
      this[callback] = true;
      return callback;
    }
  }); // Detect, normalize options and install callbacks for jsonp requests

  jQuery.ajaxPrefilter("json jsonp", function (s, originalSettings, jqXHR) {
    var callbackName,
        overwritten,
        responseContainer,
        jsonProp = s.jsonp !== false && (rjsonp.test(s.url) ? "url" : typeof s.data === "string" && (s.contentType || "").indexOf("application/x-www-form-urlencoded") === 0 && rjsonp.test(s.data) && "data"); // Handle iff the expected data type is "jsonp" or we have a parameter to set

    if (jsonProp || s.dataTypes[0] === "jsonp") {
      // Get callback name, remembering preexisting value associated with it
      callbackName = s.jsonpCallback = isFunction(s.jsonpCallback) ? s.jsonpCallback() : s.jsonpCallback; // Insert callback into url or form data

      if (jsonProp) {
        s[jsonProp] = s[jsonProp].replace(rjsonp, "$1" + callbackName);
      } else if (s.jsonp !== false) {
        s.url += (rquery.test(s.url) ? "&" : "?") + s.jsonp + "=" + callbackName;
      } // Use data converter to retrieve json after script execution


      s.converters["script json"] = function () {
        if (!responseContainer) {
          jQuery.error(callbackName + " was not called");
        }

        return responseContainer[0];
      }; // Force json dataType


      s.dataTypes[0] = "json"; // Install callback

      overwritten = window[callbackName];

      window[callbackName] = function () {
        responseContainer = arguments;
      }; // Clean-up function (fires after converters)


      jqXHR.always(function () {
        // If previous value didn't exist - remove it
        if (overwritten === undefined) {
          jQuery(window).removeProp(callbackName); // Otherwise restore preexisting value
        } else {
          window[callbackName] = overwritten;
        } // Save back as free


        if (s[callbackName]) {
          // Make sure that re-using the options doesn't screw things around
          s.jsonpCallback = originalSettings.jsonpCallback; // Save the callback name for future use

          oldCallbacks.push(callbackName);
        } // Call if it was a function and we have a response


        if (responseContainer && isFunction(overwritten)) {
          overwritten(responseContainer[0]);
        }

        responseContainer = overwritten = undefined;
      }); // Delegate to script

      return "script";
    }
  }); // Support: Safari 8 only
  // In Safari 8 documents created via document.implementation.createHTMLDocument
  // collapse sibling forms: the second one becomes a child of the first one.
  // Because of that, this security measure has to be disabled in Safari 8.
  // https://bugs.webkit.org/show_bug.cgi?id=137337

  support.createHTMLDocument = function () {
    var body = document.implementation.createHTMLDocument("").body;
    body.innerHTML = "<form></form><form></form>";
    return body.childNodes.length === 2;
  }(); // Argument "data" should be string of html
  // context (optional): If specified, the fragment will be created in this context,
  // defaults to document
  // keepScripts (optional): If true, will include scripts passed in the html string


  jQuery.parseHTML = function (data, context, keepScripts) {
    if (typeof data !== "string") {
      return [];
    }

    if (typeof context === "boolean") {
      keepScripts = context;
      context = false;
    }

    var base, parsed, scripts;

    if (!context) {
      // Stop scripts or inline event handlers from being executed immediately
      // by using document.implementation
      if (support.createHTMLDocument) {
        context = document.implementation.createHTMLDocument(""); // Set the base href for the created document
        // so any parsed elements with URLs
        // are based on the document's URL (gh-2965)

        base = context.createElement("base");
        base.href = document.location.href;
        context.head.appendChild(base);
      } else {
        context = document;
      }
    }

    parsed = rsingleTag.exec(data);
    scripts = !keepScripts && []; // Single tag

    if (parsed) {
      return [context.createElement(parsed[1])];
    }

    parsed = buildFragment([data], context, scripts);

    if (scripts && scripts.length) {
      jQuery(scripts).remove();
    }

    return jQuery.merge([], parsed.childNodes);
  };
  /**
   * Load a url into a page
   */


  jQuery.fn.load = function (url, params, callback) {
    var selector,
        type,
        response,
        self = this,
        off = url.indexOf(" ");

    if (off > -1) {
      selector = stripAndCollapse(url.slice(off));
      url = url.slice(0, off);
    } // If it's a function


    if (isFunction(params)) {
      // We assume that it's the callback
      callback = params;
      params = undefined; // Otherwise, build a param string
    } else if (params && typeof params === "object") {
      type = "POST";
    } // If we have elements to modify, make the request


    if (self.length > 0) {
      jQuery.ajax({
        url: url,
        // If "type" variable is undefined, then "GET" method will be used.
        // Make value of this field explicit since
        // user can override it through ajaxSetup method
        type: type || "GET",
        dataType: "html",
        data: params
      }).done(function (responseText) {
        // Save response for use in complete callback
        response = arguments;
        self.html(selector ? // If a selector was specified, locate the right elements in a dummy div
        // Exclude scripts to avoid IE 'Permission Denied' errors
        jQuery("<div>").append(jQuery.parseHTML(responseText)).find(selector) : // Otherwise use the full result
        responseText); // If the request succeeds, this function gets "data", "status", "jqXHR"
        // but they are ignored because response was set above.
        // If it fails, this function gets "jqXHR", "status", "error"
      }).always(callback && function (jqXHR, status) {
        self.each(function () {
          callback.apply(this, response || [jqXHR.responseText, status, jqXHR]);
        });
      });
    }

    return this;
  }; // Attach a bunch of functions for handling common AJAX events


  jQuery.each(["ajaxStart", "ajaxStop", "ajaxComplete", "ajaxError", "ajaxSuccess", "ajaxSend"], function (i, type) {
    jQuery.fn[type] = function (fn) {
      return this.on(type, fn);
    };
  });

  jQuery.expr.pseudos.animated = function (elem) {
    return jQuery.grep(jQuery.timers, function (fn) {
      return elem === fn.elem;
    }).length;
  };

  jQuery.offset = {
    setOffset: function (elem, options, i) {
      var curPosition,
          curLeft,
          curCSSTop,
          curTop,
          curOffset,
          curCSSLeft,
          calculatePosition,
          position = jQuery.css(elem, "position"),
          curElem = jQuery(elem),
          props = {}; // Set position first, in-case top/left are set even on static elem

      if (position === "static") {
        elem.style.position = "relative";
      }

      curOffset = curElem.offset();
      curCSSTop = jQuery.css(elem, "top");
      curCSSLeft = jQuery.css(elem, "left");
      calculatePosition = (position === "absolute" || position === "fixed") && (curCSSTop + curCSSLeft).indexOf("auto") > -1; // Need to be able to calculate position if either
      // top or left is auto and position is either absolute or fixed

      if (calculatePosition) {
        curPosition = curElem.position();
        curTop = curPosition.top;
        curLeft = curPosition.left;
      } else {
        curTop = parseFloat(curCSSTop) || 0;
        curLeft = parseFloat(curCSSLeft) || 0;
      }

      if (isFunction(options)) {
        // Use jQuery.extend here to allow modification of coordinates argument (gh-1848)
        options = options.call(elem, i, jQuery.extend({}, curOffset));
      }

      if (options.top != null) {
        props.top = options.top - curOffset.top + curTop;
      }

      if (options.left != null) {
        props.left = options.left - curOffset.left + curLeft;
      }

      if ("using" in options) {
        options.using.call(elem, props);
      } else {
        curElem.css(props);
      }
    }
  };
  jQuery.fn.extend({
    // offset() relates an element's border box to the document origin
    offset: function (options) {
      // Preserve chaining for setter
      if (arguments.length) {
        return options === undefined ? this : this.each(function (i) {
          jQuery.offset.setOffset(this, options, i);
        });
      }

      var rect,
          win,
          elem = this[0];

      if (!elem) {
        return;
      } // Return zeros for disconnected and hidden (display: none) elements (gh-2310)
      // Support: IE <=11 only
      // Running getBoundingClientRect on a
      // disconnected node in IE throws an error


      if (!elem.getClientRects().length) {
        return {
          top: 0,
          left: 0
        };
      } // Get document-relative position by adding viewport scroll to viewport-relative gBCR


      rect = elem.getBoundingClientRect();
      win = elem.ownerDocument.defaultView;
      return {
        top: rect.top + win.pageYOffset,
        left: rect.left + win.pageXOffset
      };
    },
    // position() relates an element's margin box to its offset parent's padding box
    // This corresponds to the behavior of CSS absolute positioning
    position: function () {
      if (!this[0]) {
        return;
      }

      var offsetParent,
          offset,
          doc,
          elem = this[0],
          parentOffset = {
        top: 0,
        left: 0
      }; // position:fixed elements are offset from the viewport, which itself always has zero offset

      if (jQuery.css(elem, "position") === "fixed") {
        // Assume position:fixed implies availability of getBoundingClientRect
        offset = elem.getBoundingClientRect();
      } else {
        offset = this.offset(); // Account for the *real* offset parent, which can be the document or its root element
        // when a statically positioned element is identified

        doc = elem.ownerDocument;
        offsetParent = elem.offsetParent || doc.documentElement;

        while (offsetParent && (offsetParent === doc.body || offsetParent === doc.documentElement) && jQuery.css(offsetParent, "position") === "static") {
          offsetParent = offsetParent.parentNode;
        }

        if (offsetParent && offsetParent !== elem && offsetParent.nodeType === 1) {
          // Incorporate borders into its offset, since they are outside its content origin
          parentOffset = jQuery(offsetParent).offset();
          parentOffset.top += jQuery.css(offsetParent, "borderTopWidth", true);
          parentOffset.left += jQuery.css(offsetParent, "borderLeftWidth", true);
        }
      } // Subtract parent offsets and element margins


      return {
        top: offset.top - parentOffset.top - jQuery.css(elem, "marginTop", true),
        left: offset.left - parentOffset.left - jQuery.css(elem, "marginLeft", true)
      };
    },
    // This method will return documentElement in the following cases:
    // 1) For the element inside the iframe without offsetParent, this method will return
    //    documentElement of the parent window
    // 2) For the hidden or detached element
    // 3) For body or html element, i.e. in case of the html node - it will return itself
    //
    // but those exceptions were never presented as a real life use-cases
    // and might be considered as more preferable results.
    //
    // This logic, however, is not guaranteed and can change at any point in the future
    offsetParent: function () {
      return this.map(function () {
        var offsetParent = this.offsetParent;

        while (offsetParent && jQuery.css(offsetParent, "position") === "static") {
          offsetParent = offsetParent.offsetParent;
        }

        return offsetParent || documentElement;
      });
    }
  }); // Create scrollLeft and scrollTop methods

  jQuery.each({
    scrollLeft: "pageXOffset",
    scrollTop: "pageYOffset"
  }, function (method, prop) {
    var top = "pageYOffset" === prop;

    jQuery.fn[method] = function (val) {
      return access(this, function (elem, method, val) {
        // Coalesce documents and windows
        var win;

        if (isWindow(elem)) {
          win = elem;
        } else if (elem.nodeType === 9) {
          win = elem.defaultView;
        }

        if (val === undefined) {
          return win ? win[prop] : elem[method];
        }

        if (win) {
          win.scrollTo(!top ? val : win.pageXOffset, top ? val : win.pageYOffset);
        } else {
          elem[method] = val;
        }
      }, method, val, arguments.length);
    };
  }); // Support: Safari <=7 - 9.1, Chrome <=37 - 49
  // Add the top/left cssHooks using jQuery.fn.position
  // Webkit bug: https://bugs.webkit.org/show_bug.cgi?id=29084
  // Blink bug: https://bugs.chromium.org/p/chromium/issues/detail?id=589347
  // getComputedStyle returns percent when specified for top/left/bottom/right;
  // rather than make the css module depend on the offset module, just check for it here

  jQuery.each(["top", "left"], function (i, prop) {
    jQuery.cssHooks[prop] = addGetHookIf(support.pixelPosition, function (elem, computed) {
      if (computed) {
        computed = curCSS(elem, prop); // If curCSS returns percentage, fallback to offset

        return rnumnonpx.test(computed) ? jQuery(elem).position()[prop] + "px" : computed;
      }
    });
  }); // Create innerHeight, innerWidth, height, width, outerHeight and outerWidth methods

  jQuery.each({
    Height: "height",
    Width: "width"
  }, function (name, type) {
    jQuery.each({
      padding: "inner" + name,
      content: type,
      "": "outer" + name
    }, function (defaultExtra, funcName) {
      // Margin is only for outerHeight, outerWidth
      jQuery.fn[funcName] = function (margin, value) {
        var chainable = arguments.length && (defaultExtra || typeof margin !== "boolean"),
            extra = defaultExtra || (margin === true || value === true ? "margin" : "border");
        return access(this, function (elem, type, value) {
          var doc;

          if (isWindow(elem)) {
            // $( window ).outerWidth/Height return w/h including scrollbars (gh-1729)
            return funcName.indexOf("outer") === 0 ? elem["inner" + name] : elem.document.documentElement["client" + name];
          } // Get document width or height


          if (elem.nodeType === 9) {
            doc = elem.documentElement; // Either scroll[Width/Height] or offset[Width/Height] or client[Width/Height],
            // whichever is greatest

            return Math.max(elem.body["scroll" + name], doc["scroll" + name], elem.body["offset" + name], doc["offset" + name], doc["client" + name]);
          }

          return value === undefined ? // Get width or height on the element, requesting but not forcing parseFloat
          jQuery.css(elem, type, extra) : // Set width or height on the element
          jQuery.style(elem, type, value, extra);
        }, type, chainable ? margin : undefined, chainable);
      };
    });
  });
  jQuery.each(("blur focus focusin focusout resize scroll click dblclick " + "mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave " + "change select submit keydown keypress keyup contextmenu").split(" "), function (i, name) {
    // Handle event binding
    jQuery.fn[name] = function (data, fn) {
      return arguments.length > 0 ? this.on(name, null, data, fn) : this.trigger(name);
    };
  });
  jQuery.fn.extend({
    hover: function (fnOver, fnOut) {
      return this.mouseenter(fnOver).mouseleave(fnOut || fnOver);
    }
  });
  jQuery.fn.extend({
    bind: function (types, data, fn) {
      return this.on(types, null, data, fn);
    },
    unbind: function (types, fn) {
      return this.off(types, null, fn);
    },
    delegate: function (selector, types, data, fn) {
      return this.on(types, selector, data, fn);
    },
    undelegate: function (selector, types, fn) {
      // ( namespace ) or ( selector, types [, fn] )
      return arguments.length === 1 ? this.off(selector, "**") : this.off(types, selector || "**", fn);
    }
  }); // Bind a function to a context, optionally partially applying any
  // arguments.
  // jQuery.proxy is deprecated to promote standards (specifically Function#bind)
  // However, it is not slated for removal any time soon

  jQuery.proxy = function (fn, context) {
    var tmp, args, proxy;

    if (typeof context === "string") {
      tmp = fn[context];
      context = fn;
      fn = tmp;
    } // Quick check to determine if target is callable, in the spec
    // this throws a TypeError, but we will just return undefined.


    if (!isFunction(fn)) {
      return undefined;
    } // Simulated bind


    args = slice.call(arguments, 2);

    proxy = function () {
      return fn.apply(context || this, args.concat(slice.call(arguments)));
    }; // Set the guid of unique handler to the same of original handler, so it can be removed


    proxy.guid = fn.guid = fn.guid || jQuery.guid++;
    return proxy;
  };

  jQuery.holdReady = function (hold) {
    if (hold) {
      jQuery.readyWait++;
    } else {
      jQuery.ready(true);
    }
  };

  jQuery.isArray = Array.isArray;
  jQuery.parseJSON = JSON.parse;
  jQuery.nodeName = nodeName;
  jQuery.isFunction = isFunction;
  jQuery.isWindow = isWindow;
  jQuery.camelCase = camelCase;
  jQuery.type = toType;
  jQuery.now = Date.now;

  jQuery.isNumeric = function (obj) {
    // As of jQuery 3.0, isNumeric is limited to
    // strings and numbers (primitives or objects)
    // that can be coerced to finite numbers (gh-2662)
    var type = jQuery.type(obj);
    return (type === "number" || type === "string") && // parseFloat NaNs numeric-cast false positives ("")
    // ...but misinterprets leading-number strings, particularly hex literals ("0x...")
    // subtraction forces infinities to NaN
    !isNaN(obj - parseFloat(obj));
  }; // Register as a named AMD module, since jQuery can be concatenated with other

  var // Map over jQuery in case of overwrite
  _jQuery = window.jQuery,
      // Map over the $ in case of overwrite
  _$ = window.$;

  jQuery.noConflict = function (deep) {
    if (window.$ === jQuery) {
      window.$ = _$;
    }

    if (deep && window.jQuery === jQuery) {
      window.jQuery = _jQuery;
    }

    return jQuery;
  }; // Expose jQuery and $ identifiers, even in AMD
  // (#7102#comment:10, https://github.com/jquery/jquery/pull/557)
  // and CommonJS for browser emulators (#13566)


  if (!noGlobal) {
    window.jQuery = window.$ = jQuery;
  }

  return jQuery;
});
});

function _typeof(obj) {
  if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") {
    _typeof = function (obj) {
      return typeof obj;
    };
  } else {
    _typeof = function (obj) {
      return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
    };
  }

  return _typeof(obj);
}

function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

function _inherits(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function");
  }

  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      writable: true,
      configurable: true
    }
  });
  if (superClass) _setPrototypeOf(subClass, superClass);
}

function _getPrototypeOf(o) {
  _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) {
    return o.__proto__ || Object.getPrototypeOf(o);
  };
  return _getPrototypeOf(o);
}

function _setPrototypeOf(o, p) {
  _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) {
    o.__proto__ = p;
    return o;
  };

  return _setPrototypeOf(o, p);
}

function isNativeReflectConstruct() {
  if (typeof Reflect === "undefined" || !Reflect.construct) return false;
  if (Reflect.construct.sham) return false;
  if (typeof Proxy === "function") return true;

  try {
    Date.prototype.toString.call(Reflect.construct(Date, [], function () {}));
    return true;
  } catch (e) {
    return false;
  }
}

function _construct(Parent, args, Class) {
  if (isNativeReflectConstruct()) {
    _construct = Reflect.construct;
  } else {
    _construct = function _construct(Parent, args, Class) {
      var a = [null];
      a.push.apply(a, args);
      var Constructor = Function.bind.apply(Parent, a);
      var instance = new Constructor();
      if (Class) _setPrototypeOf(instance, Class.prototype);
      return instance;
    };
  }

  return _construct.apply(null, arguments);
}

function _isNativeFunction(fn) {
  return Function.toString.call(fn).indexOf("[native code]") !== -1;
}

function _wrapNativeSuper(Class) {
  var _cache = typeof Map === "function" ? new Map() : undefined;

  _wrapNativeSuper = function _wrapNativeSuper(Class) {
    if (Class === null || !_isNativeFunction(Class)) return Class;

    if (typeof Class !== "function") {
      throw new TypeError("Super expression must either be null or a function");
    }

    if (typeof _cache !== "undefined") {
      if (_cache.has(Class)) return _cache.get(Class);

      _cache.set(Class, Wrapper);
    }

    function Wrapper() {
      return _construct(Class, arguments, _getPrototypeOf(this).constructor);
    }

    Wrapper.prototype = Object.create(Class.prototype, {
      constructor: {
        value: Wrapper,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
    return _setPrototypeOf(Wrapper, Class);
  };

  return _wrapNativeSuper(Class);
}

function _assertThisInitialized(self) {
  if (self === void 0) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }

  return self;
}

function _possibleConstructorReturn(self, call) {
  if (call && (typeof call === "object" || typeof call === "function")) {
    return call;
  }

  return _assertThisInitialized(self);
}

function _slicedToArray(arr, i) {
  return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest();
}

function _toConsumableArray(arr) {
  return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread();
}

function _arrayWithoutHoles(arr) {
  if (Array.isArray(arr)) {
    for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) arr2[i] = arr[i];

    return arr2;
  }
}

function _arrayWithHoles(arr) {
  if (Array.isArray(arr)) return arr;
}

function _iterableToArray(iter) {
  if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter);
}

function _iterableToArrayLimit(arr, i) {
  var _arr = [];
  var _n = true;
  var _d = false;
  var _e = undefined;

  try {
    for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
      _arr.push(_s.value);

      if (i && _arr.length === i) break;
    }
  } catch (err) {
    _d = true;
    _e = err;
  } finally {
    try {
      if (!_n && _i["return"] != null) _i["return"]();
    } finally {
      if (_d) throw _e;
    }
  }

  return _arr;
}

function _nonIterableSpread() {
  throw new TypeError("Invalid attempt to spread non-iterable instance");
}

function _nonIterableRest() {
  throw new TypeError("Invalid attempt to destructure non-iterable instance");
}

//  Copyright (c) 2014 Readium Foundation and/or its licensees. All rights reserved.
//
//  Redistribution and use in source and binary forms, with or without modification,
//  are permitted provided that the following conditions are met:
//  1. Redistributions of source code must retain the above copyright notice, this
//  list of conditions and the following disclaimer.
//  2. Redistributions in binary form must reproduce the above copyright notice,
//  this list of conditions and the following disclaimer in the documentation and/or
//  other materials provided with the distribution.
//  3. Neither the name of the organization nor the names of its contributors may be
//  used to endorse or promote products derived from this software without specific
//  prior written permission.
// Description: This is a set of runtime errors that the CFI interpreter can throw.
// Rationale: These error types extend the basic javascript error object so error things like
//  the stack trace are included with the runtime errors.
// REFACTORING CANDIDATE: This type of error may not be required in the long run.
//   The parser should catch any syntax errors,
//   provided it is error-free, and as such, the AST should never really have any node type errors,
//   which are essentially errors
//   in the structure of the AST. This error should probably be refactored out when the grammar and
//   interpreter are more stable.
var NodeTypeError =
/*#__PURE__*/
function (_Error) {
  _inherits(NodeTypeError, _Error);

  function NodeTypeError(node, message) {
    var _this;

    _classCallCheck(this, NodeTypeError);

    _this = _possibleConstructorReturn(this, _getPrototypeOf(NodeTypeError).call(this, message));
    _this.node = node;
    return _this;
  }

  return NodeTypeError;
}(_wrapNativeSuper(Error)); // REFACTORING CANDIDATE: Might make sense to include some more specifics about
//   the out-of-rangeyness.

var OutOfRangeError =
/*#__PURE__*/
function (_Error2) {
  _inherits(OutOfRangeError, _Error2);

  function OutOfRangeError(targetIndex, maxIndex, message) {
    var _this2;

    _classCallCheck(this, OutOfRangeError);

    _this2 = _possibleConstructorReturn(this, _getPrototypeOf(OutOfRangeError).call(this, message));
    _this2.targetIndex = targetIndex;
    _this2.maxIndex = maxIndex;
    return _this2;
  }

  return OutOfRangeError;
}(_wrapNativeSuper(Error)); // REFACTORING CANDIDATE: This is a bit too general to be useful.
//   When I have a better understanding of the type of errors that can occur with
//   the various terminus conditions, it'll make more sense to revisit this.

var TerminusError =
/*#__PURE__*/
function (_Error3) {
  _inherits(TerminusError, _Error3);

  function TerminusError(terminusType, terminusCondition, message) {
    var _this3;

    _classCallCheck(this, TerminusError);

    _this3 = _possibleConstructorReturn(this, _getPrototypeOf(TerminusError).call(this, message));
    _this3.terminusType = terminusType;
    _this3.terminusCondition = terminusCondition;
    return _this3;
  }

  return TerminusError;
}(_wrapNativeSuper(Error));
var CFIAssertionError =
/*#__PURE__*/
function (_Error4) {
  _inherits(CFIAssertionError, _Error4);

  function CFIAssertionError(expectedAssertion, targetElementAssertion, message) {
    var _this4;

    _classCallCheck(this, CFIAssertionError);

    _this4 = _possibleConstructorReturn(this, _getPrototypeOf(CFIAssertionError).call(this, message));
    _this4.expectedAssertion = expectedAssertion;
    _this4.targetElementAssertion = targetElementAssertion;
    return _this4;
  }

  return CFIAssertionError;
}(_wrapNativeSuper(Error));

/**
 * A specialized version of `_.map` for arrays without support for iteratee
 * shorthands.
 *
 * @private
 * @param {Array} [array] The array to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @returns {Array} Returns the new mapped array.
 */
function arrayMap(array, iteratee) {
  var index = -1,
      length = array == null ? 0 : array.length,
      result = Array(length);

  while (++index < length) {
    result[index] = iteratee(array[index], index, array);
  }

  return result;
}

/** Detect free variable `global` from Node.js. */
var freeGlobal = typeof global == 'object' && global && global.Object === Object && global;

/** Detect free variable `self`. */

var freeSelf = typeof self == 'object' && self && self.Object === Object && self;
/** Used as a reference to the global object. */

var root = freeGlobal || freeSelf || Function('return this')();

/** Built-in value references. */

var Symbol$1 = root.Symbol;

/** Used for built-in method references. */

var objectProto = Object.prototype;
/** Used to check objects for own properties. */

var hasOwnProperty = objectProto.hasOwnProperty;
/**
 * Used to resolve the
 * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
 * of values.
 */

var nativeObjectToString = objectProto.toString;
/** Built-in value references. */

var symToStringTag = Symbol$1 ? Symbol$1.toStringTag : undefined;
/**
 * A specialized version of `baseGetTag` which ignores `Symbol.toStringTag` values.
 *
 * @private
 * @param {*} value The value to query.
 * @returns {string} Returns the raw `toStringTag`.
 */

function getRawTag(value) {
  var isOwn = hasOwnProperty.call(value, symToStringTag),
      tag = value[symToStringTag];

  try {
    value[symToStringTag] = undefined;
  } catch (e) {}

  var result = nativeObjectToString.call(value);

  {
    if (isOwn) {
      value[symToStringTag] = tag;
    } else {
      delete value[symToStringTag];
    }
  }

  return result;
}

/** Used for built-in method references. */
var objectProto$1 = Object.prototype;
/**
 * Used to resolve the
 * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
 * of values.
 */

var nativeObjectToString$1 = objectProto$1.toString;
/**
 * Converts `value` to a string using `Object.prototype.toString`.
 *
 * @private
 * @param {*} value The value to convert.
 * @returns {string} Returns the converted string.
 */

function objectToString(value) {
  return nativeObjectToString$1.call(value);
}

/** `Object#toString` result references. */

var nullTag = '[object Null]',
    undefinedTag = '[object Undefined]';
/** Built-in value references. */

var symToStringTag$1 = Symbol$1 ? Symbol$1.toStringTag : undefined;
/**
 * The base implementation of `getTag` without fallbacks for buggy environments.
 *
 * @private
 * @param {*} value The value to query.
 * @returns {string} Returns the `toStringTag`.
 */

function baseGetTag(value) {
  if (value == null) {
    return value === undefined ? undefinedTag : nullTag;
  }

  return symToStringTag$1 && symToStringTag$1 in Object(value) ? getRawTag(value) : objectToString(value);
}

/**
 * Checks if `value` is the
 * [language type](http://www.ecma-international.org/ecma-262/7.0/#sec-ecmascript-language-types)
 * of `Object`. (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(_.noop);
 * // => true
 *
 * _.isObject(null);
 * // => false
 */
function isObject(value) {
  var type = typeof value;
  return value != null && (type == 'object' || type == 'function');
}

/** `Object#toString` result references. */

var asyncTag = '[object AsyncFunction]',
    funcTag = '[object Function]',
    genTag = '[object GeneratorFunction]',
    proxyTag = '[object Proxy]';
/**
 * Checks if `value` is classified as a `Function` object.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a function, else `false`.
 * @example
 *
 * _.isFunction(_);
 * // => true
 *
 * _.isFunction(/abc/);
 * // => false
 */

function isFunction(value) {
  if (!isObject(value)) {
    return false;
  } // The use of `Object#toString` avoids issues with the `typeof` operator
  // in Safari 9 which returns 'object' for typed arrays and other constructors.


  var tag = baseGetTag(value);
  return tag == funcTag || tag == genTag || tag == asyncTag || tag == proxyTag;
}

/** Used to detect overreaching core-js shims. */

var coreJsData = root['__core-js_shared__'];

/** Used to detect methods masquerading as native. */

var maskSrcKey = function () {
  var uid = /[^.]+$/.exec(coreJsData && coreJsData.keys && coreJsData.keys.IE_PROTO || '');
  return uid ? 'Symbol(src)_1.' + uid : '';
}();
/**
 * Checks if `func` has its source masked.
 *
 * @private
 * @param {Function} func The function to check.
 * @returns {boolean} Returns `true` if `func` is masked, else `false`.
 */


function isMasked(func) {
  return !!maskSrcKey && maskSrcKey in func;
}

/** Used for built-in method references. */
var funcProto = Function.prototype;
/** Used to resolve the decompiled source of functions. */

var funcToString = funcProto.toString;
/**
 * Converts `func` to its source code.
 *
 * @private
 * @param {Function} func The function to convert.
 * @returns {string} Returns the source code.
 */

function toSource(func) {
  if (func != null) {
    try {
      return funcToString.call(func);
    } catch (e) {}

    try {
      return func + '';
    } catch (e) {}
  }

  return '';
}

/**
 * Used to match `RegExp`
 * [syntax characters](http://ecma-international.org/ecma-262/7.0/#sec-patterns).
 */

var reRegExpChar = /[\\^$.*+?()[\]{}|]/g;
/** Used to detect host constructors (Safari). */

var reIsHostCtor = /^\[object .+?Constructor\]$/;
/** Used for built-in method references. */

var funcProto$1 = Function.prototype,
    objectProto$2 = Object.prototype;
/** Used to resolve the decompiled source of functions. */

var funcToString$1 = funcProto$1.toString;
/** Used to check objects for own properties. */

var hasOwnProperty$1 = objectProto$2.hasOwnProperty;
/** Used to detect if a method is native. */

var reIsNative = RegExp('^' + funcToString$1.call(hasOwnProperty$1).replace(reRegExpChar, '\\$&').replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, '$1.*?') + '$');
/**
 * The base implementation of `_.isNative` without bad shim checks.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a native function,
 *  else `false`.
 */

function baseIsNative(value) {
  if (!isObject(value) || isMasked(value)) {
    return false;
  }

  var pattern = isFunction(value) ? reIsNative : reIsHostCtor;
  return pattern.test(toSource(value));
}

/**
 * Gets the value at `key` of `object`.
 *
 * @private
 * @param {Object} [object] The object to query.
 * @param {string} key The key of the property to get.
 * @returns {*} Returns the property value.
 */
function getValue(object, key) {
  return object == null ? undefined : object[key];
}

/**
 * Gets the native function at `key` of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @param {string} key The key of the method to get.
 * @returns {*} Returns the function if it's native, else `undefined`.
 */

function getNative(object, key) {
  var value = getValue(object, key);
  return baseIsNative(value) ? value : undefined;
}

/* Built-in method references that are verified to be native. */

var nativeCreate = getNative(Object, 'create');

/**
 * Removes all key-value entries from the hash.
 *
 * @private
 * @name clear
 * @memberOf Hash
 */

function hashClear() {
  this.__data__ = nativeCreate ? nativeCreate(null) : {};
  this.size = 0;
}

/**
 * Removes `key` and its value from the hash.
 *
 * @private
 * @name delete
 * @memberOf Hash
 * @param {Object} hash The hash to modify.
 * @param {string} key The key of the value to remove.
 * @returns {boolean} Returns `true` if the entry was removed, else `false`.
 */
function hashDelete(key) {
  var result = this.has(key) && delete this.__data__[key];
  this.size -= result ? 1 : 0;
  return result;
}

/** Used to stand-in for `undefined` hash values. */

var HASH_UNDEFINED = '__lodash_hash_undefined__';
/** Used for built-in method references. */

var objectProto$3 = Object.prototype;
/** Used to check objects for own properties. */

var hasOwnProperty$2 = objectProto$3.hasOwnProperty;
/**
 * Gets the hash value for `key`.
 *
 * @private
 * @name get
 * @memberOf Hash
 * @param {string} key The key of the value to get.
 * @returns {*} Returns the entry value.
 */

function hashGet(key) {
  var data = this.__data__;

  if (nativeCreate) {
    var result = data[key];
    return result === HASH_UNDEFINED ? undefined : result;
  }

  return hasOwnProperty$2.call(data, key) ? data[key] : undefined;
}

/** Used for built-in method references. */

var objectProto$4 = Object.prototype;
/** Used to check objects for own properties. */

var hasOwnProperty$3 = objectProto$4.hasOwnProperty;
/**
 * Checks if a hash value for `key` exists.
 *
 * @private
 * @name has
 * @memberOf Hash
 * @param {string} key The key of the entry to check.
 * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
 */

function hashHas(key) {
  var data = this.__data__;
  return nativeCreate ? data[key] !== undefined : hasOwnProperty$3.call(data, key);
}

/** Used to stand-in for `undefined` hash values. */

var HASH_UNDEFINED$1 = '__lodash_hash_undefined__';
/**
 * Sets the hash `key` to `value`.
 *
 * @private
 * @name set
 * @memberOf Hash
 * @param {string} key The key of the value to set.
 * @param {*} value The value to set.
 * @returns {Object} Returns the hash instance.
 */

function hashSet(key, value) {
  var data = this.__data__;
  this.size += this.has(key) ? 0 : 1;
  data[key] = nativeCreate && value === undefined ? HASH_UNDEFINED$1 : value;
  return this;
}

/**
 * Creates a hash object.
 *
 * @private
 * @constructor
 * @param {Array} [entries] The key-value pairs to cache.
 */

function Hash(entries) {
  var index = -1,
      length = entries == null ? 0 : entries.length;
  this.clear();

  while (++index < length) {
    var entry = entries[index];
    this.set(entry[0], entry[1]);
  }
} // Add methods to `Hash`.


Hash.prototype.clear = hashClear;
Hash.prototype['delete'] = hashDelete;
Hash.prototype.get = hashGet;
Hash.prototype.has = hashHas;
Hash.prototype.set = hashSet;

/**
 * Removes all key-value entries from the list cache.
 *
 * @private
 * @name clear
 * @memberOf ListCache
 */
function listCacheClear() {
  this.__data__ = [];
  this.size = 0;
}

/**
 * Performs a
 * [`SameValueZero`](http://ecma-international.org/ecma-262/7.0/#sec-samevaluezero)
 * comparison between two values to determine if they are equivalent.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to compare.
 * @param {*} other The other value to compare.
 * @returns {boolean} Returns `true` if the values are equivalent, else `false`.
 * @example
 *
 * var object = { 'a': 1 };
 * var other = { 'a': 1 };
 *
 * _.eq(object, object);
 * // => true
 *
 * _.eq(object, other);
 * // => false
 *
 * _.eq('a', 'a');
 * // => true
 *
 * _.eq('a', Object('a'));
 * // => false
 *
 * _.eq(NaN, NaN);
 * // => true
 */
function eq(value, other) {
  return value === other || value !== value && other !== other;
}

/**
 * Gets the index at which the `key` is found in `array` of key-value pairs.
 *
 * @private
 * @param {Array} array The array to inspect.
 * @param {*} key The key to search for.
 * @returns {number} Returns the index of the matched value, else `-1`.
 */

function assocIndexOf(array, key) {
  var length = array.length;

  while (length--) {
    if (eq(array[length][0], key)) {
      return length;
    }
  }

  return -1;
}

/** Used for built-in method references. */

var arrayProto = Array.prototype;
/** Built-in value references. */

var splice = arrayProto.splice;
/**
 * Removes `key` and its value from the list cache.
 *
 * @private
 * @name delete
 * @memberOf ListCache
 * @param {string} key The key of the value to remove.
 * @returns {boolean} Returns `true` if the entry was removed, else `false`.
 */

function listCacheDelete(key) {
  var data = this.__data__,
      index = assocIndexOf(data, key);

  if (index < 0) {
    return false;
  }

  var lastIndex = data.length - 1;

  if (index == lastIndex) {
    data.pop();
  } else {
    splice.call(data, index, 1);
  }

  --this.size;
  return true;
}

/**
 * Gets the list cache value for `key`.
 *
 * @private
 * @name get
 * @memberOf ListCache
 * @param {string} key The key of the value to get.
 * @returns {*} Returns the entry value.
 */

function listCacheGet(key) {
  var data = this.__data__,
      index = assocIndexOf(data, key);
  return index < 0 ? undefined : data[index][1];
}

/**
 * Checks if a list cache value for `key` exists.
 *
 * @private
 * @name has
 * @memberOf ListCache
 * @param {string} key The key of the entry to check.
 * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
 */

function listCacheHas(key) {
  return assocIndexOf(this.__data__, key) > -1;
}

/**
 * Sets the list cache `key` to `value`.
 *
 * @private
 * @name set
 * @memberOf ListCache
 * @param {string} key The key of the value to set.
 * @param {*} value The value to set.
 * @returns {Object} Returns the list cache instance.
 */

function listCacheSet(key, value) {
  var data = this.__data__,
      index = assocIndexOf(data, key);

  if (index < 0) {
    ++this.size;
    data.push([key, value]);
  } else {
    data[index][1] = value;
  }

  return this;
}

/**
 * Creates an list cache object.
 *
 * @private
 * @constructor
 * @param {Array} [entries] The key-value pairs to cache.
 */

function ListCache(entries) {
  var index = -1,
      length = entries == null ? 0 : entries.length;
  this.clear();

  while (++index < length) {
    var entry = entries[index];
    this.set(entry[0], entry[1]);
  }
} // Add methods to `ListCache`.


ListCache.prototype.clear = listCacheClear;
ListCache.prototype['delete'] = listCacheDelete;
ListCache.prototype.get = listCacheGet;
ListCache.prototype.has = listCacheHas;
ListCache.prototype.set = listCacheSet;

/* Built-in method references that are verified to be native. */

var Map$1 = getNative(root, 'Map');

/**
 * Removes all key-value entries from the map.
 *
 * @private
 * @name clear
 * @memberOf MapCache
 */

function mapCacheClear() {
  this.size = 0;
  this.__data__ = {
    'hash': new Hash(),
    'map': new (Map$1 || ListCache)(),
    'string': new Hash()
  };
}

/**
 * Checks if `value` is suitable for use as unique object key.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is suitable, else `false`.
 */
function isKeyable(value) {
  var type = typeof value;
  return type == 'string' || type == 'number' || type == 'symbol' || type == 'boolean' ? value !== '__proto__' : value === null;
}

/**
 * Gets the data for `map`.
 *
 * @private
 * @param {Object} map The map to query.
 * @param {string} key The reference key.
 * @returns {*} Returns the map data.
 */

function getMapData(map, key) {
  var data = map.__data__;
  return isKeyable(key) ? data[typeof key == 'string' ? 'string' : 'hash'] : data.map;
}

/**
 * Removes `key` and its value from the map.
 *
 * @private
 * @name delete
 * @memberOf MapCache
 * @param {string} key The key of the value to remove.
 * @returns {boolean} Returns `true` if the entry was removed, else `false`.
 */

function mapCacheDelete(key) {
  var result = getMapData(this, key)['delete'](key);
  this.size -= result ? 1 : 0;
  return result;
}

/**
 * Gets the map value for `key`.
 *
 * @private
 * @name get
 * @memberOf MapCache
 * @param {string} key The key of the value to get.
 * @returns {*} Returns the entry value.
 */

function mapCacheGet(key) {
  return getMapData(this, key).get(key);
}

/**
 * Checks if a map value for `key` exists.
 *
 * @private
 * @name has
 * @memberOf MapCache
 * @param {string} key The key of the entry to check.
 * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
 */

function mapCacheHas(key) {
  return getMapData(this, key).has(key);
}

/**
 * Sets the map `key` to `value`.
 *
 * @private
 * @name set
 * @memberOf MapCache
 * @param {string} key The key of the value to set.
 * @param {*} value The value to set.
 * @returns {Object} Returns the map cache instance.
 */

function mapCacheSet(key, value) {
  var data = getMapData(this, key),
      size = data.size;
  data.set(key, value);
  this.size += data.size == size ? 0 : 1;
  return this;
}

/**
 * Creates a map cache object to store key-value pairs.
 *
 * @private
 * @constructor
 * @param {Array} [entries] The key-value pairs to cache.
 */

function MapCache(entries) {
  var index = -1,
      length = entries == null ? 0 : entries.length;
  this.clear();

  while (++index < length) {
    var entry = entries[index];
    this.set(entry[0], entry[1]);
  }
} // Add methods to `MapCache`.


MapCache.prototype.clear = mapCacheClear;
MapCache.prototype['delete'] = mapCacheDelete;
MapCache.prototype.get = mapCacheGet;
MapCache.prototype.has = mapCacheHas;
MapCache.prototype.set = mapCacheSet;

/** Used to stand-in for `undefined` hash values. */
var HASH_UNDEFINED$2 = '__lodash_hash_undefined__';
/**
 * Adds `value` to the array cache.
 *
 * @private
 * @name add
 * @memberOf SetCache
 * @alias push
 * @param {*} value The value to cache.
 * @returns {Object} Returns the cache instance.
 */

function setCacheAdd(value) {
  this.__data__.set(value, HASH_UNDEFINED$2);

  return this;
}

/**
 * Checks if `value` is in the array cache.
 *
 * @private
 * @name has
 * @memberOf SetCache
 * @param {*} value The value to search for.
 * @returns {number} Returns `true` if `value` is found, else `false`.
 */
function setCacheHas(value) {
  return this.__data__.has(value);
}

/**
 *
 * Creates an array cache object to store unique values.
 *
 * @private
 * @constructor
 * @param {Array} [values] The values to cache.
 */

function SetCache(values) {
  var index = -1,
      length = values == null ? 0 : values.length;
  this.__data__ = new MapCache();

  while (++index < length) {
    this.add(values[index]);
  }
} // Add methods to `SetCache`.


SetCache.prototype.add = SetCache.prototype.push = setCacheAdd;
SetCache.prototype.has = setCacheHas;

/**
 * The base implementation of `_.findIndex` and `_.findLastIndex` without
 * support for iteratee shorthands.
 *
 * @private
 * @param {Array} array The array to inspect.
 * @param {Function} predicate The function invoked per iteration.
 * @param {number} fromIndex The index to search from.
 * @param {boolean} [fromRight] Specify iterating from right to left.
 * @returns {number} Returns the index of the matched value, else `-1`.
 */
function baseFindIndex(array, predicate, fromIndex, fromRight) {
  var length = array.length,
      index = fromIndex + (fromRight ? 1 : -1);

  while (fromRight ? index-- : ++index < length) {
    if (predicate(array[index], index, array)) {
      return index;
    }
  }

  return -1;
}

/**
 * The base implementation of `_.isNaN` without support for number objects.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is `NaN`, else `false`.
 */
function baseIsNaN(value) {
  return value !== value;
}

/**
 * A specialized version of `_.indexOf` which performs strict equality
 * comparisons of values, i.e. `===`.
 *
 * @private
 * @param {Array} array The array to inspect.
 * @param {*} value The value to search for.
 * @param {number} fromIndex The index to search from.
 * @returns {number} Returns the index of the matched value, else `-1`.
 */
function strictIndexOf(array, value, fromIndex) {
  var index = fromIndex - 1,
      length = array.length;

  while (++index < length) {
    if (array[index] === value) {
      return index;
    }
  }

  return -1;
}

/**
 * The base implementation of `_.indexOf` without `fromIndex` bounds checks.
 *
 * @private
 * @param {Array} array The array to inspect.
 * @param {*} value The value to search for.
 * @param {number} fromIndex The index to search from.
 * @returns {number} Returns the index of the matched value, else `-1`.
 */

function baseIndexOf(array, value, fromIndex) {
  return value === value ? strictIndexOf(array, value, fromIndex) : baseFindIndex(array, baseIsNaN, fromIndex);
}

/**
 * A specialized version of `_.includes` for arrays without support for
 * specifying an index to search from.
 *
 * @private
 * @param {Array} [array] The array to inspect.
 * @param {*} target The value to search for.
 * @returns {boolean} Returns `true` if `target` is found, else `false`.
 */

function arrayIncludes(array, value) {
  var length = array == null ? 0 : array.length;
  return !!length && baseIndexOf(array, value, 0) > -1;
}

/**
 * This function is like `arrayIncludes` except that it accepts a comparator.
 *
 * @private
 * @param {Array} [array] The array to inspect.
 * @param {*} target The value to search for.
 * @param {Function} comparator The comparator invoked per element.
 * @returns {boolean} Returns `true` if `target` is found, else `false`.
 */
function arrayIncludesWith(array, value, comparator) {
  var index = -1,
      length = array == null ? 0 : array.length;

  while (++index < length) {
    if (comparator(value, array[index])) {
      return true;
    }
  }

  return false;
}

/**
 * The base implementation of `_.unary` without support for storing metadata.
 *
 * @private
 * @param {Function} func The function to cap arguments for.
 * @returns {Function} Returns the new capped function.
 */
function baseUnary(func) {
  return function (value) {
    return func(value);
  };
}

/**
 * Checks if a `cache` value for `key` exists.
 *
 * @private
 * @param {Object} cache The cache to query.
 * @param {string} key The key of the entry to check.
 * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
 */
function cacheHas(cache, key) {
  return cache.has(key);
}

/* Built-in method references for those with the same name as other `lodash` methods. */

var nativeMin = Math.min;
/**
 * The base implementation of methods like `_.intersection`, without support
 * for iteratee shorthands, that accepts an array of arrays to inspect.
 *
 * @private
 * @param {Array} arrays The arrays to inspect.
 * @param {Function} [iteratee] The iteratee invoked per element.
 * @param {Function} [comparator] The comparator invoked per element.
 * @returns {Array} Returns the new array of shared values.
 */

function baseIntersection(arrays, iteratee, comparator) {
  var includes = comparator ? arrayIncludesWith : arrayIncludes,
      length = arrays[0].length,
      othLength = arrays.length,
      othIndex = othLength,
      caches = Array(othLength),
      maxLength = Infinity,
      result = [];

  while (othIndex--) {
    var array = arrays[othIndex];

    if (othIndex && iteratee) {
      array = arrayMap(array, baseUnary(iteratee));
    }

    maxLength = nativeMin(array.length, maxLength);
    caches[othIndex] = !comparator && (iteratee || length >= 120 && array.length >= 120) ? new SetCache(othIndex && array) : undefined;
  }

  array = arrays[0];
  var index = -1,
      seen = caches[0];

  outer: while (++index < length && result.length < maxLength) {
    var value = array[index],
        computed = iteratee ? iteratee(value) : value;
    value = comparator || value !== 0 ? value : 0;

    if (!(seen ? cacheHas(seen, computed) : includes(result, computed, comparator))) {
      othIndex = othLength;

      while (--othIndex) {
        var cache = caches[othIndex];

        if (!(cache ? cacheHas(cache, computed) : includes(arrays[othIndex], computed, comparator))) {
          continue outer;
        }
      }

      if (seen) {
        seen.push(computed);
      }

      result.push(value);
    }
  }

  return result;
}

/**
 * This method returns the first argument it receives.
 *
 * @static
 * @since 0.1.0
 * @memberOf _
 * @category Util
 * @param {*} value Any value.
 * @returns {*} Returns `value`.
 * @example
 *
 * var object = { 'a': 1 };
 *
 * console.log(_.identity(object) === object);
 * // => true
 */
function identity(value) {
  return value;
}

/**
 * A faster alternative to `Function#apply`, this function invokes `func`
 * with the `this` binding of `thisArg` and the arguments of `args`.
 *
 * @private
 * @param {Function} func The function to invoke.
 * @param {*} thisArg The `this` binding of `func`.
 * @param {Array} args The arguments to invoke `func` with.
 * @returns {*} Returns the result of `func`.
 */
function apply(func, thisArg, args) {
  switch (args.length) {
    case 0:
      return func.call(thisArg);

    case 1:
      return func.call(thisArg, args[0]);

    case 2:
      return func.call(thisArg, args[0], args[1]);

    case 3:
      return func.call(thisArg, args[0], args[1], args[2]);
  }

  return func.apply(thisArg, args);
}

/* Built-in method references for those with the same name as other `lodash` methods. */

var nativeMax = Math.max;
/**
 * A specialized version of `baseRest` which transforms the rest array.
 *
 * @private
 * @param {Function} func The function to apply a rest parameter to.
 * @param {number} [start=func.length-1] The start position of the rest parameter.
 * @param {Function} transform The rest array transform.
 * @returns {Function} Returns the new function.
 */

function overRest(func, start, transform) {
  start = nativeMax(start === undefined ? func.length - 1 : start, 0);
  return function () {
    var args = arguments,
        index = -1,
        length = nativeMax(args.length - start, 0),
        array = Array(length);

    while (++index < length) {
      array[index] = args[start + index];
    }

    index = -1;
    var otherArgs = Array(start + 1);

    while (++index < start) {
      otherArgs[index] = args[index];
    }

    otherArgs[start] = transform(array);
    return apply(func, this, otherArgs);
  };
}

/**
 * Creates a function that returns `value`.
 *
 * @static
 * @memberOf _
 * @since 2.4.0
 * @category Util
 * @param {*} value The value to return from the new function.
 * @returns {Function} Returns the new constant function.
 * @example
 *
 * var objects = _.times(2, _.constant({ 'a': 1 }));
 *
 * console.log(objects);
 * // => [{ 'a': 1 }, { 'a': 1 }]
 *
 * console.log(objects[0] === objects[1]);
 * // => true
 */
function constant(value) {
  return function () {
    return value;
  };
}

var defineProperty = function () {
  try {
    var func = getNative(Object, 'defineProperty');
    func({}, '', {});
    return func;
  } catch (e) {}
}();

/**
 * The base implementation of `setToString` without support for hot loop shorting.
 *
 * @private
 * @param {Function} func The function to modify.
 * @param {Function} string The `toString` result.
 * @returns {Function} Returns `func`.
 */

var baseSetToString = !defineProperty ? identity : function (func, string) {
  return defineProperty(func, 'toString', {
    'configurable': true,
    'enumerable': false,
    'value': constant(string),
    'writable': true
  });
};

/** Used to detect hot functions by number of calls within a span of milliseconds. */
var HOT_COUNT = 800,
    HOT_SPAN = 16;
/* Built-in method references for those with the same name as other `lodash` methods. */

var nativeNow = Date.now;
/**
 * Creates a function that'll short out and invoke `identity` instead
 * of `func` when it's called `HOT_COUNT` or more times in `HOT_SPAN`
 * milliseconds.
 *
 * @private
 * @param {Function} func The function to restrict.
 * @returns {Function} Returns the new shortable function.
 */

function shortOut(func) {
  var count = 0,
      lastCalled = 0;
  return function () {
    var stamp = nativeNow(),
        remaining = HOT_SPAN - (stamp - lastCalled);
    lastCalled = stamp;

    if (remaining > 0) {
      if (++count >= HOT_COUNT) {
        return arguments[0];
      }
    } else {
      count = 0;
    }

    return func.apply(undefined, arguments);
  };
}

/**
 * Sets the `toString` method of `func` to return `string`.
 *
 * @private
 * @param {Function} func The function to modify.
 * @param {Function} string The `toString` result.
 * @returns {Function} Returns `func`.
 */

var setToString = shortOut(baseSetToString);

/**
 * The base implementation of `_.rest` which doesn't validate or coerce arguments.
 *
 * @private
 * @param {Function} func The function to apply a rest parameter to.
 * @param {number} [start=func.length-1] The start position of the rest parameter.
 * @returns {Function} Returns the new function.
 */

function baseRest(func, start) {
  return setToString(overRest(func, start, identity), func + '');
}

/** Used as references for various `Number` constants. */
var MAX_SAFE_INTEGER = 9007199254740991;
/**
 * Checks if `value` is a valid array-like length.
 *
 * **Note:** This method is loosely based on
 * [`ToLength`](http://ecma-international.org/ecma-262/7.0/#sec-tolength).
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a valid length, else `false`.
 * @example
 *
 * _.isLength(3);
 * // => true
 *
 * _.isLength(Number.MIN_VALUE);
 * // => false
 *
 * _.isLength(Infinity);
 * // => false
 *
 * _.isLength('3');
 * // => false
 */

function isLength(value) {
  return typeof value == 'number' && value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
}

/**
 * Checks if `value` is array-like. A value is considered array-like if it's
 * not a function and has a `value.length` that's an integer greater than or
 * equal to `0` and less than or equal to `Number.MAX_SAFE_INTEGER`.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is array-like, else `false`.
 * @example
 *
 * _.isArrayLike([1, 2, 3]);
 * // => true
 *
 * _.isArrayLike(document.body.children);
 * // => true
 *
 * _.isArrayLike('abc');
 * // => true
 *
 * _.isArrayLike(_.noop);
 * // => false
 */

function isArrayLike(value) {
  return value != null && isLength(value.length) && !isFunction(value);
}

/**
 * Checks if `value` is object-like. A value is object-like if it's not `null`
 * and has a `typeof` result of "object".
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
 * @example
 *
 * _.isObjectLike({});
 * // => true
 *
 * _.isObjectLike([1, 2, 3]);
 * // => true
 *
 * _.isObjectLike(_.noop);
 * // => false
 *
 * _.isObjectLike(null);
 * // => false
 */
function isObjectLike(value) {
  return value != null && typeof value == 'object';
}

/**
 * This method is like `_.isArrayLike` except that it also checks if `value`
 * is an object.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an array-like object,
 *  else `false`.
 * @example
 *
 * _.isArrayLikeObject([1, 2, 3]);
 * // => true
 *
 * _.isArrayLikeObject(document.body.children);
 * // => true
 *
 * _.isArrayLikeObject('abc');
 * // => false
 *
 * _.isArrayLikeObject(_.noop);
 * // => false
 */

function isArrayLikeObject(value) {
  return isObjectLike(value) && isArrayLike(value);
}

/**
 * Casts `value` to an empty array if it's not an array like object.
 *
 * @private
 * @param {*} value The value to inspect.
 * @returns {Array|Object} Returns the cast array-like object.
 */

function castArrayLikeObject(value) {
  return isArrayLikeObject(value) ? value : [];
}

/**
 * Creates an array of unique values that are included in all given arrays
 * using [`SameValueZero`](http://ecma-international.org/ecma-262/7.0/#sec-samevaluezero)
 * for equality comparisons. The order and references of result values are
 * determined by the first array.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Array
 * @param {...Array} [arrays] The arrays to inspect.
 * @returns {Array} Returns the new array of intersecting values.
 * @example
 *
 * _.intersection([2, 1], [2, 3]);
 * // => [2]
 */

var intersection = baseRest(function (arrays) {
  var mapped = arrayMap(arrays, castArrayLikeObject);
  return mapped.length && mapped[0] === arrays[0] ? baseIntersection(mapped) : [];
});

function matchesLocalNameOrElement(element, otherNameOrElement) {
  if (typeof otherNameOrElement === 'string') {
    return (element.localName || element.nodeName) === otherNameOrElement;
  }

  return element === otherNameOrElement;
}

function getClassNameArray(element) {
  var className = element.className;

  if (typeof className === 'string') {
    return className.split(/\s/);
  }

  if (_typeof(className) === 'object' && 'baseVal' in className) {
    return className.baseVal.split(/\s/);
  }

  return [];
}

function isElementBlacklisted(element, classBlacklist, elementBlacklist, idBlacklist) {
  if (classBlacklist && classBlacklist.length) {
    var classList = getClassNameArray(element);

    if (classList.length === 1 && classBlacklist.includes(classList[0])) {
      return false;
    }

    if (classList.length && intersection(classBlacklist, classList).length) {
      return false;
    }
  }

  if (elementBlacklist && elementBlacklist.length) {
    if (element.tagName) {
      var isElementInBlacklist = elementBlacklist.find(function (blacklistedTag) {
        return matchesLocalNameOrElement(element, blacklistedTag.toLowerCase());
      });

      if (isElementInBlacklist) {
        return false;
      }
    }
  }

  if (idBlacklist && idBlacklist.length) {
    var id = element.id;

    if (id && id.length && idBlacklist.includes(id)) {
      return false;
    }
  }

  return true;
}

function applyBlacklist(elements, classBlacklist, elementBlacklist, idBlacklist) {
  return _toConsumableArray(elements).filter(function (element) {
    return isElementBlacklisted(element, classBlacklist, elementBlacklist, idBlacklist);
  });
}
function retrieveItemRefHref(itemRefElement, packageDocument) {
  var idref = itemRefElement.getAttribute('idref');

  if (idref) {
    var node = packageDocument.querySelector("[id=".concat(idref, "]"));

    if (node) {
      return node.getAttribute('href');
    }
  }

  return undefined;
}

//  Copyright (c) 2014 Readium Foundation and/or its licensees. All rights reserved.
//   EPUB CFI domain specific language (DSL).
//   Lexing and parsing a CFI produces a set of executable instructions for
//   processing a CFI (represented in the AST).
//   This object contains a set of functions that implement each of the
//   executable instructions in the AST.
// ------------------------------------------------------------------------------------ //
//  "PUBLIC" METHODS (THE API) are exported using the `export` keyword                  //
// ------------------------------------------------------------------------------------ //

function indexOutOfRange(targetIndex, numChildElements) {
  return targetIndex > numChildElements - 1;
} // Description: Step reference for xml element node. Expected that CFIStepValue is an even integer


function elementNodeStep(CFIStepValue, $currNode, classBlacklist, elementBlacklist, idBlacklist) {
  var jqueryTargetNodeIndex = CFIStepValue / 2 - 1;
  var $blacklistExcluded = jquery(applyBlacklist($currNode.children().toArray(), classBlacklist, elementBlacklist, idBlacklist));
  var numElements = $blacklistExcluded.length;

  if (indexOutOfRange(jqueryTargetNodeIndex, numElements)) {
    throw new OutOfRangeError(jqueryTargetNodeIndex, numElements - 1, '');
  }

  return jquery($blacklistExcluded[jqueryTargetNodeIndex]);
} // Rationale: In order to inject an element into a specific position, access to the parent object
//   is required. This is obtained with the jquery parent() method. An alternative would be to
//   pass in the parent with a filtered list containing only children that
//   are part of the target text node.


function injectCFIMarkerIntoText($textNodeList, textOffset, elementToInject) {
  var $textNodeListToMutate = $textNodeList;
  var ownerDocument = $textNodeList[0].ownerDocument;
  var currTextPosition = 0; // The iteration counter may be incorrect here (should be $textNodeList.length - 1 ??)

  for (var nodeNum = 0; nodeNum <= $textNodeList.length; nodeNum += 1) {
    if ($textNodeList[nodeNum].nodeType === Node.TEXT_NODE) {
      var $injectedNode = void 0;
      var currNodeMaxIndex = $textNodeList[nodeNum].nodeValue.length + currTextPosition;
      var nodeOffset = textOffset - currTextPosition;

      if (currNodeMaxIndex > textOffset) {
        // This node is going to be split and the components re-inserted
        var originalText = $textNodeList[nodeNum].nodeValue; // Before part

        $textNodeListToMutate[nodeNum].nodeValue = originalText.slice(0, nodeOffset); // Injected element

        $injectedNode = jquery(elementToInject).insertAfter($textNodeList.eq(nodeNum)); // After part

        var newText = originalText.slice(nodeOffset, originalText.length);
        var newTextNode = ownerDocument.createTextNode(newText);
        jquery(newTextNode).insertAfter($injectedNode);
        return $injectedNode;
      }

      if (currNodeMaxIndex === textOffset) {
        $injectedNode = jquery(elementToInject).insertAfter($textNodeList.eq(nodeNum));
        return $injectedNode;
      }

      currTextPosition = currNodeMaxIndex;
    } else if ($textNodeList[nodeNum].nodeType === Node.COMMENT_NODE) {
      currTextPosition = $textNodeList[nodeNum].nodeValue.length + 7 + currTextPosition;
    } else if ($textNodeList[nodeNum].nodeType === Node.PROCESSING_INSTRUCTION_NODE) {
      currTextPosition = $textNodeList[nodeNum].nodeValue.length + $textNodeList[nodeNum].target.length + 5;
    }
  }

  throw new TerminusError('Text', "Text offset:".concat(textOffset), 'The offset exceeded the length of the text');
} // Description: This method finds a target text node and then injects an element into the
//   appropriate node
// Rationale: The possibility that cfi marker elements have been injected into a
//   text node at some point previous to this method being called
//   (and thus splitting the original text node into two separate text nodes) necessitates that
//   the set of nodes that compromised the original target text node are inferred and returned.
// Notes: Passed a current node. This node should have a set of elements under it.
//   This will include at least one text node,
//   element nodes (maybe), or possibly a mix.
// REFACTORING CANDIDATE: This method is pretty long (and confusing).
//   Worth investigating to see if it can be refactored into something clearer.

function inferTargetTextNode(CFIStepValue, $currNode, classBlacklist, elementBlacklist, idBlacklist) {
  var currLogicalTextNodeIndex;
  var prevNodeWasTextNode; // Remove any cfi marker elements from the set of elements.
  // Rationale: A filtering function is used, as simply using a class selector with
  //   jquery appears to result in behaviour where text nodes are also filtered out,
  //   along with the class element being filtered.

  var $elementsWithoutMarkers = jquery(applyBlacklist($currNode.contents().toArray(), classBlacklist, elementBlacklist, idBlacklist)); // Convert CFIStepValue to logical index; assumes odd integer for the step value

  var targetLogicalTextNodeIndex = (parseInt(CFIStepValue, 10) + 1) / 2 - 1; // Set text node position counter

  currLogicalTextNodeIndex = 0;
  prevNodeWasTextNode = false;
  var $targetTextNodeList = $elementsWithoutMarkers.filter(function filter() {
    if (currLogicalTextNodeIndex === targetLogicalTextNodeIndex) {
      // If it's a text node
      if (this.nodeType === Node.TEXT_NODE || this.nodeType === Node.COMMENT_NODE || this.nodeType === Node.PROCESSING_INSTRUCTION_NODE) {
        prevNodeWasTextNode = true;
        return true;
      }

      if (prevNodeWasTextNode && this.nodeType !== Node.TEXT_NODE) {
        // Rationale: The logical text node position is only incremented once a group of text nodes
        //   (a single logical text node) has been passed by the loop.
        currLogicalTextNodeIndex += 1;
        prevNodeWasTextNode = false;
        return false;
      }

      return false;
    } // Don't return any elements


    if (this.nodeType === Node.TEXT_NODE || this.nodeType === Node.COMMENT_NODE || this.nodeType === Node.PROCESSING_INSTRUCTION_NODE) {
      prevNodeWasTextNode = true;
    } else if (!prevNodeWasTextNode && this.nodeType === Node.ELEMENT_NODE) {
      currLogicalTextNodeIndex += 1;
      prevNodeWasTextNode = true;
    } else if (prevNodeWasTextNode && this.nodeType !== Node.TEXT_NODE && this !== $elementsWithoutMarkers.lastChild) {
      currLogicalTextNodeIndex += 1;
      prevNodeWasTextNode = false;
    }

    return false;
  }); // The filtering above should have counted the number of "logical" text nodes; this can be used to
  // detect out of range errors

  if ($targetTextNodeList.length === 0) {
    throw new OutOfRangeError(targetLogicalTextNodeIndex, currLogicalTextNodeIndex, 'Index out of range');
  } // return the text node list


  return $targetTextNodeList;
} // Description: Follows a step
// Rationale: The use of children() is important here
//   as this jQuery method returns a tree of xml nodes, EXCLUDING
//   CDATA and text nodes. When we index into the set of child elements,
//   we are assuming that text nodes have been
//   excluded.


function followIndexStep(CFIStepValue, $currNode, classBlacklist, elementBlacklist, idBlacklist) {
  // Find the jquery index for the current node
  var $targetNode;

  if (CFIStepValue % 2 === 0) {
    $targetNode = elementNodeStep(CFIStepValue, $currNode, classBlacklist, elementBlacklist, idBlacklist);
  } else {
    $targetNode = inferTargetTextNode(CFIStepValue, $currNode, classBlacklist, elementBlacklist, idBlacklist);
  }

  return $targetNode;
} // Rationale: Compatibility.
//   link contained on a attribute of the target element.
//   The attribute that contains the link differs depending on the target.
// Note: Iframe indirection will (should) fail if the iframe is not from the same domain as
//   it's containing script due to the cross origin security policy

function followIndirectionStep(CFIStepValue, $currNode, classBlacklist, elementBlacklist, idBlacklist) {
  var $contentDocument;
  var $blacklistExcluded;
  var $startElement;
  var $targetNode; // TODO: This check must be expanded to all the different types of indirection step
  // Only expects iframes, at the moment

  if ($currNode === undefined || !matchesLocalNameOrElement($currNode[0], 'iframe')) {
    throw new NodeTypeError($currNode, 'expected an iframe element');
  } // Check node type; only iframe indirection is handled, at the moment


  if (matchesLocalNameOrElement($currNode[0], 'iframe')) {
    // Get content
    $contentDocument = $currNode.contents(); // Go to the first XHTML element, which will be the first child of the top-level document object

    $blacklistExcluded = jquery(applyBlacklist($contentDocument.children().toArray(), classBlacklist, elementBlacklist, idBlacklist));
    $startElement = jquery($blacklistExcluded[0]); // Follow an index step

    $targetNode = followIndexStep(CFIStepValue, $startElement, classBlacklist, elementBlacklist, idBlacklist);
    return $targetNode;
  } // TODO: Other types of indirection
  // TODO: $targetNode.is("embed")) : src
  // TODO: ($targetNode.is("object")) : data
  // TODO: ($targetNode.is("image") || $targetNode.is("xlink:href")) : xlink:href


  return undefined;
} // Description: Injects an element at the specified text node
// Arguments: a cfi text termination string, a jquery object to the current node
// REFACTORING CANDIDATE: Rename this to indicate that it injects into a text terminus

function textTermination($currNode, textOffset, elementToInject) {
  // Get the first node, this should be a text node
  if ($currNode === undefined) {
    throw new NodeTypeError($currNode, 'expected a terminating node, or node list');
  } else if ($currNode.length === 0) {
    throw new TerminusError('Text', "Text offset:".concat(textOffset), 'no nodes found for termination condition');
  }

  return injectCFIMarkerIntoText($currNode, textOffset, elementToInject);
} // Description: Checks that the id assertion for the node target matches that on
//   the found node.

function targetIdMatchesIdAssertion($foundNode, idAssertion) {
  return $foundNode.attr('id') === idAssertion;
} // Rationale: Compatibility.

var instructions = /*#__PURE__*/Object.freeze({
	injectCFIMarkerIntoText: injectCFIMarkerIntoText,
	followIndexStep: followIndexStep,
	getNextNode: followIndexStep,
	followIndirectionStep: followIndirectionStep,
	textTermination: textTermination,
	targetIdMatchesIdAssertion: targetIdMatchesIdAssertion,
	applyBlacklist: applyBlacklist
});

/*
 * Generated by PEG.js 0.10.0.
 *
 * http://pegjs.org/
 */

function peg$subclass(child, parent) {
  function ctor() {
    this.constructor = child;
  }

  ctor.prototype = parent.prototype;
  child.prototype = new ctor();
}

function peg$SyntaxError(message, expected, found, location) {
  this.message = message;
  this.expected = expected;
  this.found = found;
  this.location = location;
  this.name = "SyntaxError";

  if (typeof Error.captureStackTrace === "function") {
    Error.captureStackTrace(this, peg$SyntaxError);
  }
}

peg$subclass(peg$SyntaxError, Error);

peg$SyntaxError.buildMessage = function (expected, found) {
  var DESCRIBE_EXPECTATION_FNS = {
    literal: function (expectation) {
      return "\"" + literalEscape(expectation.text) + "\"";
    },
    "class": function (expectation) {
      var escapedParts = "",
          i;

      for (i = 0; i < expectation.parts.length; i++) {
        escapedParts += expectation.parts[i] instanceof Array ? classEscape(expectation.parts[i][0]) + "-" + classEscape(expectation.parts[i][1]) : classEscape(expectation.parts[i]);
      }

      return "[" + (expectation.inverted ? "^" : "") + escapedParts + "]";
    },
    any: function (expectation) {
      return "any character";
    },
    end: function (expectation) {
      return "end of input";
    },
    other: function (expectation) {
      return expectation.description;
    }
  };

  function hex(ch) {
    return ch.charCodeAt(0).toString(16).toUpperCase();
  }

  function literalEscape(s) {
    return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\0/g, '\\0').replace(/\t/g, '\\t').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/[\x00-\x0F]/g, function (ch) {
      return '\\x0' + hex(ch);
    }).replace(/[\x10-\x1F\x7F-\x9F]/g, function (ch) {
      return '\\x' + hex(ch);
    });
  }

  function classEscape(s) {
    return s.replace(/\\/g, '\\\\').replace(/\]/g, '\\]').replace(/\^/g, '\\^').replace(/-/g, '\\-').replace(/\0/g, '\\0').replace(/\t/g, '\\t').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/[\x00-\x0F]/g, function (ch) {
      return '\\x0' + hex(ch);
    }).replace(/[\x10-\x1F\x7F-\x9F]/g, function (ch) {
      return '\\x' + hex(ch);
    });
  }

  function describeExpectation(expectation) {
    return DESCRIBE_EXPECTATION_FNS[expectation.type](expectation);
  }

  function describeExpected(expected) {
    var descriptions = new Array(expected.length),
        i,
        j;

    for (i = 0; i < expected.length; i++) {
      descriptions[i] = describeExpectation(expected[i]);
    }

    descriptions.sort();

    if (descriptions.length > 0) {
      for (i = 1, j = 1; i < descriptions.length; i++) {
        if (descriptions[i - 1] !== descriptions[i]) {
          descriptions[j] = descriptions[i];
          j++;
        }
      }

      descriptions.length = j;
    }

    switch (descriptions.length) {
      case 1:
        return descriptions[0];

      case 2:
        return descriptions[0] + " or " + descriptions[1];

      default:
        return descriptions.slice(0, -1).join(", ") + ", or " + descriptions[descriptions.length - 1];
    }
  }

  function describeFound(found) {
    return found ? "\"" + literalEscape(found) + "\"" : "end of input";
  }

  return "Expected " + describeExpected(expected) + " but " + describeFound(found) + " found.";
};

function peg$parse(input, options) {
  options = options !== void 0 ? options : {};

  var peg$FAILED = {},
      peg$startRuleFunctions = {
    fragment: peg$parsefragment
  },
      peg$startRuleFunction = peg$parsefragment,
      peg$c0 = "epubcfi(",
      peg$c1 = peg$literalExpectation("epubcfi(", false),
      peg$c2 = ")",
      peg$c3 = peg$literalExpectation(")", false),
      peg$c4 = function (fragmentVal) {
    return {
      type: "CFIAST",
      cfiString: fragmentVal
    };
  },
      peg$c5 = ",",
      peg$c6 = peg$literalExpectation(",", false),
      peg$c7 = function (stepVal, localPathVal, rangeLocalPath1Val, rangeLocalPath2Val) {
    return {
      type: "range",
      path: stepVal,
      localPath: localPathVal ? localPathVal : "",
      range1: rangeLocalPath1Val,
      range2: rangeLocalPath2Val
    };
  },
      peg$c8 = function (stepVal, localPathVal) {
    return {
      type: "path",
      path: stepVal,
      localPath: localPathVal ? localPathVal : {
        steps: [],
        termStep: ""
      }
    };
  },
      peg$c9 = function (localPathStepVal, termStepVal) {
    return {
      steps: localPathStepVal,
      termStep: termStepVal ? termStepVal : ""
    };
  },
      peg$c10 = "/",
      peg$c11 = peg$literalExpectation("/", false),
      peg$c12 = "[",
      peg$c13 = peg$literalExpectation("[", false),
      peg$c14 = "]",
      peg$c15 = peg$literalExpectation("]", false),
      peg$c16 = function (stepLengthVal, assertVal) {
    return {
      type: "indexStep",
      stepLength: stepLengthVal,
      idAssertion: assertVal ? assertVal[1] : undefined
    };
  },
      peg$c17 = "!/",
      peg$c18 = peg$literalExpectation("!/", false),
      peg$c19 = function (stepLengthVal, assertVal) {
    return {
      type: "indirectionStep",
      stepLength: stepLengthVal,
      idAssertion: assertVal ? assertVal[1] : undefined
    };
  },
      peg$c20 = ":",
      peg$c21 = peg$literalExpectation(":", false),
      peg$c22 = function (textOffsetValue, textLocAssertVal) {
    return {
      type: "textTerminus",
      offsetValue: textOffsetValue,
      textAssertion: textLocAssertVal ? textLocAssertVal[1] : undefined
    };
  },
      peg$c23 = function (idVal) {
    return idVal;
  },
      peg$c24 = function (csvVal, paramVal) {
    return {
      type: "textLocationAssertion",
      csv: csvVal ? csvVal : "",
      parameter: paramVal ? paramVal : ""
    };
  },
      peg$c25 = ";",
      peg$c26 = peg$literalExpectation(";", false),
      peg$c27 = "=",
      peg$c28 = peg$literalExpectation("=", false),
      peg$c29 = function (paramLHSVal, paramRHSVal) {
    return {
      type: "parameter",
      LHSValue: paramLHSVal ? paramLHSVal : "",
      RHSValue: paramRHSVal ? paramRHSVal : ""
    };
  },
      peg$c30 = function (preAssertionVal, postAssertionVal) {
    return {
      type: "csv",
      preAssertion: preAssertionVal ? preAssertionVal : "",
      postAssertion: postAssertionVal ? postAssertionVal : ""
    };
  },
      peg$c31 = function (stringVal) {
    return stringVal.join('');
  },
      peg$c32 = function (escSpecCharVal) {
    return escSpecCharVal[1];
  },
      peg$c33 = /^[1-9]/,
      peg$c34 = peg$classExpectation([["1", "9"]], false, false),
      peg$c35 = /^[0-9]/,
      peg$c36 = peg$classExpectation([["0", "9"]], false, false),
      peg$c37 = ".",
      peg$c38 = peg$literalExpectation(".", false),
      peg$c40 = "0",
      peg$c41 = peg$literalExpectation("0", false),
      peg$c42 = function (integerVal) {
    if (integerVal === "0") {
      return "0";
    } else {
      return integerVal[0].concat(integerVal[1].join(''));
    }
  },
      peg$c43 = " ",
      peg$c44 = peg$literalExpectation(" ", false),
      peg$c45 = function () {
    return " ";
  },
      peg$c46 = "^",
      peg$c47 = peg$literalExpectation("^", false),
      peg$c48 = function () {
    return "^";
  },
      peg$c52 = function (bracketVal) {
    return bracketVal;
  },
      peg$c53 = "(",
      peg$c54 = peg$literalExpectation("(", false),
      peg$c55 = function (paraVal) {
    return paraVal;
  },
      peg$c56 = function () {
    return ",";
  },
      peg$c57 = function () {
    return ";";
  },
      peg$c58 = function () {
    return "=";
  },
      peg$c59 = /^[a-z]/,
      peg$c60 = peg$classExpectation([["a", "z"]], false, false),
      peg$c61 = /^[A-Z]/,
      peg$c62 = peg$classExpectation([["A", "Z"]], false, false),
      peg$c63 = "-",
      peg$c64 = peg$literalExpectation("-", false),
      peg$c65 = "_",
      peg$c66 = peg$literalExpectation("_", false),
      peg$c67 = "%",
      peg$c68 = peg$literalExpectation("%", false),
      peg$c69 = function (charVal) {
    return charVal;
  },
      peg$currPos = 0,
      peg$posDetailsCache = [{
    line: 1,
    column: 1
  }],
      peg$maxFailPos = 0,
      peg$maxFailExpected = [],
      peg$result;

  if ("startRule" in options) {
    if (!(options.startRule in peg$startRuleFunctions)) {
      throw new Error("Can't start parsing from rule \"" + options.startRule + "\".");
    }

    peg$startRuleFunction = peg$startRuleFunctions[options.startRule];
  }

  function peg$literalExpectation(text, ignoreCase) {
    return {
      type: "literal",
      text: text,
      ignoreCase: ignoreCase
    };
  }

  function peg$classExpectation(parts, inverted, ignoreCase) {
    return {
      type: "class",
      parts: parts,
      inverted: inverted,
      ignoreCase: ignoreCase
    };
  }

  function peg$endExpectation() {
    return {
      type: "end"
    };
  }

  function peg$computePosDetails(pos) {
    var details = peg$posDetailsCache[pos],
        p;

    if (details) {
      return details;
    } else {
      p = pos - 1;

      while (!peg$posDetailsCache[p]) {
        p--;
      }

      details = peg$posDetailsCache[p];
      details = {
        line: details.line,
        column: details.column
      };

      while (p < pos) {
        if (input.charCodeAt(p) === 10) {
          details.line++;
          details.column = 1;
        } else {
          details.column++;
        }

        p++;
      }

      peg$posDetailsCache[pos] = details;
      return details;
    }
  }

  function peg$computeLocation(startPos, endPos) {
    var startPosDetails = peg$computePosDetails(startPos),
        endPosDetails = peg$computePosDetails(endPos);
    return {
      start: {
        offset: startPos,
        line: startPosDetails.line,
        column: startPosDetails.column
      },
      end: {
        offset: endPos,
        line: endPosDetails.line,
        column: endPosDetails.column
      }
    };
  }

  function peg$fail(expected) {
    if (peg$currPos < peg$maxFailPos) {
      return;
    }

    if (peg$currPos > peg$maxFailPos) {
      peg$maxFailPos = peg$currPos;
      peg$maxFailExpected = [];
    }

    peg$maxFailExpected.push(expected);
  }

  function peg$buildStructuredError(expected, found, location) {
    return new peg$SyntaxError(peg$SyntaxError.buildMessage(expected, found), expected, found, location);
  }

  function peg$parsefragment() {
    var s0, s1, s2, s3;
    s0 = peg$currPos;

    if (input.substr(peg$currPos, 8) === peg$c0) {
      s1 = peg$c0;
      peg$currPos += 8;
    } else {
      s1 = peg$FAILED;

      {
        peg$fail(peg$c1);
      }
    }

    if (s1 !== peg$FAILED) {
      s2 = peg$parserange();

      if (s2 === peg$FAILED) {
        s2 = peg$parsepath();
      }

      if (s2 !== peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 41) {
          s3 = peg$c2;
          peg$currPos++;
        } else {
          s3 = peg$FAILED;

          {
            peg$fail(peg$c3);
          }
        }

        if (s3 !== peg$FAILED) {
          s1 = peg$c4(s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parserange() {
    var s0, s1, s2, s3, s4, s5, s6;
    s0 = peg$currPos;
    s1 = peg$parseindexStep();

    if (s1 !== peg$FAILED) {
      s2 = peg$parselocal_path();

      if (s2 === peg$FAILED) {
        s2 = null;
      }

      if (s2 !== peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 44) {
          s3 = peg$c5;
          peg$currPos++;
        } else {
          s3 = peg$FAILED;

          {
            peg$fail(peg$c6);
          }
        }

        if (s3 !== peg$FAILED) {
          s4 = peg$parselocal_path();

          if (s4 !== peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 44) {
              s5 = peg$c5;
              peg$currPos++;
            } else {
              s5 = peg$FAILED;

              {
                peg$fail(peg$c6);
              }
            }

            if (s5 !== peg$FAILED) {
              s6 = peg$parselocal_path();

              if (s6 !== peg$FAILED) {
                s1 = peg$c7(s1, s2, s4, s6);
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parsepath() {
    var s0, s1, s2;
    s0 = peg$currPos;
    s1 = peg$parseindexStep();

    if (s1 !== peg$FAILED) {
      s2 = peg$parselocal_path();

      if (s2 === peg$FAILED) {
        s2 = null;
      }

      if (s2 !== peg$FAILED) {
        s1 = peg$c8(s1, s2);
        s0 = s1;
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parselocal_path() {
    var s0, s1, s2;
    s0 = peg$currPos;
    s1 = [];
    s2 = peg$parseindexStep();

    if (s2 === peg$FAILED) {
      s2 = peg$parseindirectionStep();
    }

    if (s2 !== peg$FAILED) {
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        s2 = peg$parseindexStep();

        if (s2 === peg$FAILED) {
          s2 = peg$parseindirectionStep();
        }
      }
    } else {
      s1 = peg$FAILED;
    }

    if (s1 !== peg$FAILED) {
      s2 = peg$parseterminus();

      if (s2 === peg$FAILED) {
        s2 = null;
      }

      if (s2 !== peg$FAILED) {
        s1 = peg$c9(s1, s2);
        s0 = s1;
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parseindexStep() {
    var s0, s1, s2, s3, s4, s5, s6;
    s0 = peg$currPos;

    if (input.charCodeAt(peg$currPos) === 47) {
      s1 = peg$c10;
      peg$currPos++;
    } else {
      s1 = peg$FAILED;

      {
        peg$fail(peg$c11);
      }
    }

    if (s1 !== peg$FAILED) {
      s2 = peg$parseinteger();

      if (s2 !== peg$FAILED) {
        s3 = peg$currPos;

        if (input.charCodeAt(peg$currPos) === 91) {
          s4 = peg$c12;
          peg$currPos++;
        } else {
          s4 = peg$FAILED;

          {
            peg$fail(peg$c13);
          }
        }

        if (s4 !== peg$FAILED) {
          s5 = peg$parseidAssertion();

          if (s5 !== peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 93) {
              s6 = peg$c14;
              peg$currPos++;
            } else {
              s6 = peg$FAILED;

              {
                peg$fail(peg$c15);
              }
            }

            if (s6 !== peg$FAILED) {
              s4 = [s4, s5, s6];
              s3 = s4;
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }

        if (s3 === peg$FAILED) {
          s3 = null;
        }

        if (s3 !== peg$FAILED) {
          s1 = peg$c16(s2, s3);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parseindirectionStep() {
    var s0, s1, s2, s3, s4, s5, s6;
    s0 = peg$currPos;

    if (input.substr(peg$currPos, 2) === peg$c17) {
      s1 = peg$c17;
      peg$currPos += 2;
    } else {
      s1 = peg$FAILED;

      {
        peg$fail(peg$c18);
      }
    }

    if (s1 !== peg$FAILED) {
      s2 = peg$parseinteger();

      if (s2 !== peg$FAILED) {
        s3 = peg$currPos;

        if (input.charCodeAt(peg$currPos) === 91) {
          s4 = peg$c12;
          peg$currPos++;
        } else {
          s4 = peg$FAILED;

          {
            peg$fail(peg$c13);
          }
        }

        if (s4 !== peg$FAILED) {
          s5 = peg$parseidAssertion();

          if (s5 !== peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 93) {
              s6 = peg$c14;
              peg$currPos++;
            } else {
              s6 = peg$FAILED;

              {
                peg$fail(peg$c15);
              }
            }

            if (s6 !== peg$FAILED) {
              s4 = [s4, s5, s6];
              s3 = s4;
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }

        if (s3 === peg$FAILED) {
          s3 = null;
        }

        if (s3 !== peg$FAILED) {
          s1 = peg$c19(s2, s3);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parseterminus() {
    var s0, s1, s2, s3, s4, s5, s6;
    s0 = peg$currPos;

    if (input.charCodeAt(peg$currPos) === 58) {
      s1 = peg$c20;
      peg$currPos++;
    } else {
      s1 = peg$FAILED;

      {
        peg$fail(peg$c21);
      }
    }

    if (s1 !== peg$FAILED) {
      s2 = peg$parseinteger();

      if (s2 !== peg$FAILED) {
        s3 = peg$currPos;

        if (input.charCodeAt(peg$currPos) === 91) {
          s4 = peg$c12;
          peg$currPos++;
        } else {
          s4 = peg$FAILED;

          {
            peg$fail(peg$c13);
          }
        }

        if (s4 !== peg$FAILED) {
          s5 = peg$parsetextLocationAssertion();

          if (s5 !== peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 93) {
              s6 = peg$c14;
              peg$currPos++;
            } else {
              s6 = peg$FAILED;

              {
                peg$fail(peg$c15);
              }
            }

            if (s6 !== peg$FAILED) {
              s4 = [s4, s5, s6];
              s3 = s4;
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }

        if (s3 === peg$FAILED) {
          s3 = null;
        }

        if (s3 !== peg$FAILED) {
          s1 = peg$c22(s2, s3);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parseidAssertion() {
    var s0, s1;
    s0 = peg$currPos;
    s1 = peg$parsevalue();

    if (s1 !== peg$FAILED) {
      s1 = peg$c23(s1);
    }

    s0 = s1;
    return s0;
  }

  function peg$parsetextLocationAssertion() {
    var s0, s1, s2;
    s0 = peg$currPos;
    s1 = peg$parsecsv();

    if (s1 === peg$FAILED) {
      s1 = null;
    }

    if (s1 !== peg$FAILED) {
      s2 = peg$parseparameter();

      if (s2 === peg$FAILED) {
        s2 = null;
      }

      if (s2 !== peg$FAILED) {
        s1 = peg$c24(s1, s2);
        s0 = s1;
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parseparameter() {
    var s0, s1, s2, s3, s4;
    s0 = peg$currPos;

    if (input.charCodeAt(peg$currPos) === 59) {
      s1 = peg$c25;
      peg$currPos++;
    } else {
      s1 = peg$FAILED;

      {
        peg$fail(peg$c26);
      }
    }

    if (s1 !== peg$FAILED) {
      s2 = peg$parsevalueNoSpace();

      if (s2 !== peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 61) {
          s3 = peg$c27;
          peg$currPos++;
        } else {
          s3 = peg$FAILED;

          {
            peg$fail(peg$c28);
          }
        }

        if (s3 !== peg$FAILED) {
          s4 = peg$parsevalueNoSpace();

          if (s4 !== peg$FAILED) {
            s1 = peg$c29(s2, s4);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parsecsv() {
    var s0, s1, s2, s3;
    s0 = peg$currPos;
    s1 = peg$parsevalue();

    if (s1 === peg$FAILED) {
      s1 = null;
    }

    if (s1 !== peg$FAILED) {
      if (input.charCodeAt(peg$currPos) === 44) {
        s2 = peg$c5;
        peg$currPos++;
      } else {
        s2 = peg$FAILED;

        {
          peg$fail(peg$c6);
        }
      }

      if (s2 !== peg$FAILED) {
        s3 = peg$parsevalue();

        if (s3 === peg$FAILED) {
          s3 = null;
        }

        if (s3 !== peg$FAILED) {
          s1 = peg$c30(s1, s3);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parsevalueNoSpace() {
    var s0, s1, s2;
    s0 = peg$currPos;
    s1 = [];
    s2 = peg$parseescapedSpecialChars();

    if (s2 === peg$FAILED) {
      s2 = peg$parsecharacter();
    }

    if (s2 !== peg$FAILED) {
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        s2 = peg$parseescapedSpecialChars();

        if (s2 === peg$FAILED) {
          s2 = peg$parsecharacter();
        }
      }
    } else {
      s1 = peg$FAILED;
    }

    if (s1 !== peg$FAILED) {
      s1 = peg$c31(s1);
    }

    s0 = s1;
    return s0;
  }

  function peg$parsevalue() {
    var s0, s1, s2;
    s0 = peg$currPos;
    s1 = [];
    s2 = peg$parseescapedSpecialChars();

    if (s2 === peg$FAILED) {
      s2 = peg$parsecharacter();

      if (s2 === peg$FAILED) {
        s2 = peg$parsespace();
      }
    }

    if (s2 !== peg$FAILED) {
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        s2 = peg$parseescapedSpecialChars();

        if (s2 === peg$FAILED) {
          s2 = peg$parsecharacter();

          if (s2 === peg$FAILED) {
            s2 = peg$parsespace();
          }
        }
      }
    } else {
      s1 = peg$FAILED;
    }

    if (s1 !== peg$FAILED) {
      s1 = peg$c31(s1);
    }

    s0 = s1;
    return s0;
  }

  function peg$parseescapedSpecialChars() {
    var s0, s1, s2, s3;
    s0 = peg$currPos;
    s1 = peg$currPos;
    s2 = peg$parsecircumflex();

    if (s2 !== peg$FAILED) {
      s3 = peg$parsecircumflex();

      if (s3 !== peg$FAILED) {
        s2 = [s2, s3];
        s1 = s2;
      } else {
        peg$currPos = s1;
        s1 = peg$FAILED;
      }
    } else {
      peg$currPos = s1;
      s1 = peg$FAILED;
    }

    if (s1 === peg$FAILED) {
      s1 = peg$currPos;
      s2 = peg$parsecircumflex();

      if (s2 !== peg$FAILED) {
        s3 = peg$parsesquareBracket();

        if (s3 !== peg$FAILED) {
          s2 = [s2, s3];
          s1 = s2;
        } else {
          peg$currPos = s1;
          s1 = peg$FAILED;
        }
      } else {
        peg$currPos = s1;
        s1 = peg$FAILED;
      }

      if (s1 === peg$FAILED) {
        s1 = peg$currPos;
        s2 = peg$parsecircumflex();

        if (s2 !== peg$FAILED) {
          s3 = peg$parseparentheses();

          if (s3 !== peg$FAILED) {
            s2 = [s2, s3];
            s1 = s2;
          } else {
            peg$currPos = s1;
            s1 = peg$FAILED;
          }
        } else {
          peg$currPos = s1;
          s1 = peg$FAILED;
        }

        if (s1 === peg$FAILED) {
          s1 = peg$currPos;
          s2 = peg$parsecircumflex();

          if (s2 !== peg$FAILED) {
            s3 = peg$parsecomma();

            if (s3 !== peg$FAILED) {
              s2 = [s2, s3];
              s1 = s2;
            } else {
              peg$currPos = s1;
              s1 = peg$FAILED;
            }
          } else {
            peg$currPos = s1;
            s1 = peg$FAILED;
          }

          if (s1 === peg$FAILED) {
            s1 = peg$currPos;
            s2 = peg$parsecircumflex();

            if (s2 !== peg$FAILED) {
              s3 = peg$parsesemicolon();

              if (s3 !== peg$FAILED) {
                s2 = [s2, s3];
                s1 = s2;
              } else {
                peg$currPos = s1;
                s1 = peg$FAILED;
              }
            } else {
              peg$currPos = s1;
              s1 = peg$FAILED;
            }

            if (s1 === peg$FAILED) {
              s1 = peg$currPos;
              s2 = peg$parsecircumflex();

              if (s2 !== peg$FAILED) {
                s3 = peg$parseequal();

                if (s3 !== peg$FAILED) {
                  s2 = [s2, s3];
                  s1 = s2;
                } else {
                  peg$currPos = s1;
                  s1 = peg$FAILED;
                }
              } else {
                peg$currPos = s1;
                s1 = peg$FAILED;
              }
            }
          }
        }
      }
    }

    if (s1 !== peg$FAILED) {
      s1 = peg$c32(s1);
    }

    s0 = s1;
    return s0;
  }

  function peg$parseinteger() {
    var s0, s1, s2, s3, s4;
    s0 = peg$currPos;

    if (input.charCodeAt(peg$currPos) === 48) {
      s1 = peg$c40;
      peg$currPos++;
    } else {
      s1 = peg$FAILED;

      {
        peg$fail(peg$c41);
      }
    }

    if (s1 === peg$FAILED) {
      s1 = peg$currPos;

      if (peg$c33.test(input.charAt(peg$currPos))) {
        s2 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s2 = peg$FAILED;

        {
          peg$fail(peg$c34);
        }
      }

      if (s2 !== peg$FAILED) {
        s3 = [];

        if (peg$c35.test(input.charAt(peg$currPos))) {
          s4 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s4 = peg$FAILED;

          {
            peg$fail(peg$c36);
          }
        }

        while (s4 !== peg$FAILED) {
          s3.push(s4);

          if (peg$c35.test(input.charAt(peg$currPos))) {
            s4 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s4 = peg$FAILED;

            {
              peg$fail(peg$c36);
            }
          }
        }

        if (s3 !== peg$FAILED) {
          s2 = [s2, s3];
          s1 = s2;
        } else {
          peg$currPos = s1;
          s1 = peg$FAILED;
        }
      } else {
        peg$currPos = s1;
        s1 = peg$FAILED;
      }
    }

    if (s1 !== peg$FAILED) {
      s1 = peg$c42(s1);
    }

    s0 = s1;
    return s0;
  }

  function peg$parsespace() {
    var s0, s1;
    s0 = peg$currPos;

    if (input.charCodeAt(peg$currPos) === 32) {
      s1 = peg$c43;
      peg$currPos++;
    } else {
      s1 = peg$FAILED;

      {
        peg$fail(peg$c44);
      }
    }

    if (s1 !== peg$FAILED) {
      s1 = peg$c45();
    }

    s0 = s1;
    return s0;
  }

  function peg$parsecircumflex() {
    var s0, s1;
    s0 = peg$currPos;

    if (input.charCodeAt(peg$currPos) === 94) {
      s1 = peg$c46;
      peg$currPos++;
    } else {
      s1 = peg$FAILED;

      {
        peg$fail(peg$c47);
      }
    }

    if (s1 !== peg$FAILED) {
      s1 = peg$c48();
    }

    s0 = s1;
    return s0;
  }

  function peg$parsesquareBracket() {
    var s0, s1;
    s0 = peg$currPos;

    if (input.charCodeAt(peg$currPos) === 91) {
      s1 = peg$c12;
      peg$currPos++;
    } else {
      s1 = peg$FAILED;

      {
        peg$fail(peg$c13);
      }
    }

    if (s1 === peg$FAILED) {
      if (input.charCodeAt(peg$currPos) === 93) {
        s1 = peg$c14;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;

        {
          peg$fail(peg$c15);
        }
      }
    }

    if (s1 !== peg$FAILED) {
      s1 = peg$c52(s1);
    }

    s0 = s1;
    return s0;
  }

  function peg$parseparentheses() {
    var s0, s1;
    s0 = peg$currPos;

    if (input.charCodeAt(peg$currPos) === 40) {
      s1 = peg$c53;
      peg$currPos++;
    } else {
      s1 = peg$FAILED;

      {
        peg$fail(peg$c54);
      }
    }

    if (s1 === peg$FAILED) {
      if (input.charCodeAt(peg$currPos) === 41) {
        s1 = peg$c2;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;

        {
          peg$fail(peg$c3);
        }
      }
    }

    if (s1 !== peg$FAILED) {
      s1 = peg$c55(s1);
    }

    s0 = s1;
    return s0;
  }

  function peg$parsecomma() {
    var s0, s1;
    s0 = peg$currPos;

    if (input.charCodeAt(peg$currPos) === 44) {
      s1 = peg$c5;
      peg$currPos++;
    } else {
      s1 = peg$FAILED;

      {
        peg$fail(peg$c6);
      }
    }

    if (s1 !== peg$FAILED) {
      s1 = peg$c56();
    }

    s0 = s1;
    return s0;
  }

  function peg$parsesemicolon() {
    var s0, s1;
    s0 = peg$currPos;

    if (input.charCodeAt(peg$currPos) === 59) {
      s1 = peg$c25;
      peg$currPos++;
    } else {
      s1 = peg$FAILED;

      {
        peg$fail(peg$c26);
      }
    }

    if (s1 !== peg$FAILED) {
      s1 = peg$c57();
    }

    s0 = s1;
    return s0;
  }

  function peg$parseequal() {
    var s0, s1;
    s0 = peg$currPos;

    if (input.charCodeAt(peg$currPos) === 61) {
      s1 = peg$c27;
      peg$currPos++;
    } else {
      s1 = peg$FAILED;

      {
        peg$fail(peg$c28);
      }
    }

    if (s1 !== peg$FAILED) {
      s1 = peg$c58();
    }

    s0 = s1;
    return s0;
  }

  function peg$parsecharacter() {
    var s0, s1;
    s0 = peg$currPos;

    if (peg$c59.test(input.charAt(peg$currPos))) {
      s1 = input.charAt(peg$currPos);
      peg$currPos++;
    } else {
      s1 = peg$FAILED;

      {
        peg$fail(peg$c60);
      }
    }

    if (s1 === peg$FAILED) {
      if (peg$c61.test(input.charAt(peg$currPos))) {
        s1 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s1 = peg$FAILED;

        {
          peg$fail(peg$c62);
        }
      }

      if (s1 === peg$FAILED) {
        if (peg$c35.test(input.charAt(peg$currPos))) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;

          {
            peg$fail(peg$c36);
          }
        }

        if (s1 === peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 45) {
            s1 = peg$c63;
            peg$currPos++;
          } else {
            s1 = peg$FAILED;

            {
              peg$fail(peg$c64);
            }
          }

          if (s1 === peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 95) {
              s1 = peg$c65;
              peg$currPos++;
            } else {
              s1 = peg$FAILED;

              {
                peg$fail(peg$c66);
              }
            }

            if (s1 === peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 46) {
                s1 = peg$c37;
                peg$currPos++;
              } else {
                s1 = peg$FAILED;

                {
                  peg$fail(peg$c38);
                }
              }

              if (s1 === peg$FAILED) {
                if (input.charCodeAt(peg$currPos) === 37) {
                  s1 = peg$c67;
                  peg$currPos++;
                } else {
                  s1 = peg$FAILED;

                  {
                    peg$fail(peg$c68);
                  }
                }
              }
            }
          }
        }
      }
    }

    if (s1 !== peg$FAILED) {
      s1 = peg$c69(s1);
    }

    s0 = s1;
    return s0;
  }

  peg$result = peg$startRuleFunction();

  if (peg$result !== peg$FAILED && peg$currPos === input.length) {
    return peg$result;
  } else {
    if (peg$result !== peg$FAILED && peg$currPos < input.length) {
      peg$fail(peg$endExpectation());
    }

    throw peg$buildStructuredError(peg$maxFailExpected, peg$maxFailPos < input.length ? input.charAt(peg$maxFailPos) : null, peg$maxFailPos < input.length ? peg$computeLocation(peg$maxFailPos, peg$maxFailPos + 1) : peg$computeLocation(peg$maxFailPos, peg$maxFailPos));
  }
}

var parser = {
  SyntaxError: peg$SyntaxError,
  parse: peg$parse
};

//  Copyright (c) 2014 Readium Foundation and/or its licensees. All rights reserved.
var SyntaxError = parser.SyntaxError,
    parse = parser.parse;

var parser$1 = /*#__PURE__*/Object.freeze({
	SyntaxError: SyntaxError,
	parse: parse
});

//   The result of executing the interpreter
//   is to inject an element, or set of elements, into an EPUB content document
//   (which is just an XHTML document). These element(s) will
//   represent the position or area in the EPUB referenced by a CFI.
// Rationale: The AST is a clean and readable expression of the step-terminus structure of a CFI.
//   Although building an interpreter adds to the
//   CFI infrastructure, it provides a number of benefits.
//   First, it emphasizes a clear separation of concerns between lexing/parsing a
//   CFI, which involves some complexity related to escaped and special characters,
//   and the execution of the underlying set of steps
//   represented by the CFI. Second, it will be easier to extend the interpreter to account for
//   new/altered CFI steps (say for references
//   to vector objects or multiple CFIs) than if lexing, parsing and
//   interpretation were all handled in a single step. Finally, Readium's objective is
//   to demonstrate implementation of the EPUB 3.0 spec. An implementation with a
//   strong separation of concerns that conforms to
//   well-understood patterns for DSL processing should be easier to communicate,
//   analyze and understand.
// REFACTORING CANDIDATE: node type errors shouldn't really be possible if the CFI syntax is correct
//   and the parser is error free.
//   Might want to make the script die in those instances,
//   once the grammar and interpreter are more stable.
// REFACTORING CANDIDATE: The use of the 'nodeType' property is confusing as this is a
//   DOM node property and the two are unrelated.
//   Whoops. There shouldn't be any interference, however, I think this should be changed.
// ------------------------------------------------------------------------------------ //
//  "PUBLIC" METHODS (THE API) are exported using the `export` keyword                  //
// ------------------------------------------------------------------------------------ //

function getFirstIndirectionStepNum(CFIAST) {
  // Find the first indirection step in the local path; follow it like a regular step,
  //   as the step in the content document it references is already loaded
  //   and has been passed to this method
  for (var stepNum = 0; stepNum <= CFIAST.cfiString.localPath.steps.length - 1; stepNum += 1) {
    var nextStepNode = CFIAST.cfiString.localPath.steps[stepNum];

    if (nextStepNode.type === 'indirectionStep') {
      return stepNum;
    }
  }

  return undefined;
}

function splitRangeCFIAST(CFIAST, firstRange) {
  var outCFIAST = jquery.extend(true, {}, CFIAST);
  var targetRange = firstRange ? CFIAST.cfiString.range1 : CFIAST.cfiString.range2;
  delete outCFIAST.cfiString.range1;
  delete outCFIAST.cfiString.range2;
  outCFIAST.cfiString.type = 'path';
  outCFIAST.cfiString.localPath.steps = outCFIAST.cfiString.localPath.steps.concat(targetRange.steps);
  outCFIAST.cfiString.localPath.termStep = targetRange.termStep;
  return outCFIAST;
}

function decomposeCFI(CFI) {
  var decodedCFI = decodeURI(CFI);
  var CFIAST = parse(decodedCFI);

  if (!CFIAST || CFIAST.type !== 'CFIAST') {
    throw new NodeTypeError(CFIAST, 'expected CFI AST root node');
  }

  var decomposedASTs = [];

  if (CFIAST.cfiString.type === 'range') {
    decomposedASTs.push(splitRangeCFIAST(CFIAST, true));
    decomposedASTs.push(splitRangeCFIAST(CFIAST, false));
  } else {
    decomposedASTs.push(CFIAST);
  }

  return decomposedASTs;
}

function concatStepsFromCFIAST(CFIAST) {
  return CFIAST.cfiString.localPath.steps.map(function (o) {
    return parseInt(o.stepLength, 10);
  });
}

function compareCFIASTs(CFIAST1, CFIAST2) {
  var result = null;
  var index = 0;
  var steps1 = concatStepsFromCFIAST(CFIAST1);
  var steps2 = concatStepsFromCFIAST(CFIAST2);
  var term1 = CFIAST1.cfiString.localPath.termStep;
  var term2 = CFIAST2.cfiString.localPath.termStep;

  for (;;) {
    var L = steps1[index];
    var R = steps2[index];

    if (!L || !R) {
      if (result === 0 && (term1.offsetValue || term2.offsetValue)) {
        var tL = parseInt(term1.offsetValue, 10) || 0;
        var tR = parseInt(term2.offsetValue, 10) || 0;

        if (tL > tR) {
          result = 1;
        } else if (tL < tR) {
          result = -1;
        } else {
          result = 0;
        }
      }

      break;
    }

    if (L > R) {
      result = 1;
      break;
    } else if (L < R) {
      result = -1;
      break;
    } else {
      result = 0;
    }

    index += 1;
  }

  return result;
}

function interpretIndexStepNode(indexStepNode, $currElement, classBlacklist, elementBlacklist, idBlacklist) {
  // Check node type; throw error if wrong type
  if (indexStepNode === undefined || indexStepNode.type !== 'indexStep') {
    throw new NodeTypeError(indexStepNode, 'expected index step node');
  } // Index step


  var $stepTarget = followIndexStep(indexStepNode.stepLength, $currElement, classBlacklist, elementBlacklist, idBlacklist); // Check the id assertion, if it exists

  if (indexStepNode.idAssertion) {
    if (!targetIdMatchesIdAssertion($stepTarget, indexStepNode.idAssertion)) {
      throw new CFIAssertionError(indexStepNode.idAssertion, $stepTarget.attr('id'), 'Id assertion failed');
    }
  }

  return $stepTarget;
}
function interpretIndirectionStepNode(indirectionStepNode, $currElement, classBlacklist, elementBlacklist, idBlacklist) {
  // Check node type; throw error if wrong type
  if (indirectionStepNode === undefined || indirectionStepNode.type !== 'indirectionStep') {
    throw new NodeTypeError(indirectionStepNode, 'expected indirection step node');
  } // Indirection step


  var $stepTarget = followIndirectionStep(indirectionStepNode.stepLength, $currElement, classBlacklist, elementBlacklist, idBlacklist); // Check the id assertion, if it exists

  if (indirectionStepNode.idAssertion) {
    if (!targetIdMatchesIdAssertion($stepTarget, indirectionStepNode.idAssertion)) {
      throw new CFIAssertionError(indirectionStepNode.idAssertion, $stepTarget.attr('id'), 'Id assertion failed');
    }
  }

  return $stepTarget;
}

function searchLocalPathForHref($currElement, packageDocument, localPathNode, classBlacklist, elementBlacklist, idBlacklist) {
  // Interpret the first local_path node, which is a set of steps and and a terminus condition
  var nextStepNode;
  var $foundElement;

  for (var stepNum = 0; stepNum <= localPathNode.steps.length - 1; stepNum += 1) {
    nextStepNode = localPathNode.steps[stepNum];

    if (nextStepNode.type === 'indexStep') {
      $foundElement = interpretIndexStepNode(nextStepNode, $currElement, classBlacklist, elementBlacklist, idBlacklist);
    } else if (nextStepNode.type === 'indirectionStep') {
      $foundElement = interpretIndirectionStepNode(nextStepNode, $currElement, classBlacklist, elementBlacklist, idBlacklist);
    }

    var _$foundElement = $foundElement,
        _$foundElement2 = _slicedToArray(_$foundElement, 1),
        foundElement = _$foundElement2[0]; // Found the content document href referenced by the spine item


    if (matchesLocalNameOrElement(foundElement, 'itemref')) {
      return retrieveItemRefHref(foundElement, packageDocument);
    }
  }

  return undefined;
} // REFACTORING CANDIDATE: cfiString node and start step num could be merged into one argument,
//   by simply passing the starting step...
//   probably a good idea, this would make the meaning of this method clearer.


function interpretLocalPath(localPathNode, startStepNum, $currElement, classBlacklist, elementBlacklist, idBlacklist) {
  var nextStepNode;

  for (var stepNum = startStepNum; stepNum <= localPathNode.steps.length - 1; stepNum += 1) {
    nextStepNode = localPathNode.steps[stepNum];

    if (nextStepNode.type === 'indexStep') {
      // TODO: parameter reassignment side-effect is critical for the usage of this function
      // eslint-disable-next-line no-param-reassign
      $currElement = interpretIndexStepNode(nextStepNode, $currElement, classBlacklist, elementBlacklist, idBlacklist);
    } else if (nextStepNode.type === 'indirectionStep') {
      // TODO: parameter reassignment side-effect is critical for the usage of this function
      // eslint-disable-next-line no-param-reassign
      $currElement = interpretIndirectionStepNode(nextStepNode, $currElement, classBlacklist, elementBlacklist, idBlacklist);
    }
  }

  return $currElement;
} // REFACTORING CANDIDATE: The logic here assumes that a user will always want to use this terminus
//   to inject content into the found node. This will not always be the case,
//   and different types of interpretation are probably desired.


function interpretTextTerminusNode(terminusNode, $currElement, elementToInject) {
  if (terminusNode === undefined || terminusNode.type !== 'textTerminus') {
    throw new NodeTypeError(terminusNode, 'expected text terminus node');
  }

  return textTermination($currElement, terminusNode.offsetValue, elementToInject);
} // Description: Find the content document referenced by the spine item.
//   This should be the spine item referenced by the first indirection step in the CFI.
// Rationale: This method is a part of the API so that the
//   reading system can "interact" the content document
//   pointed to by a CFI. If this is not a separate step, the processing of the CFI must be
//   tightly coupled with the reading system, as it stands now.

function getContentDocHref(CFI, packageDocument, classBlacklist, elementBlacklist, idBlacklist) {
  var decodedCFI = decodeURI(CFI);
  var CFIAST = parse(decodedCFI);

  if (!CFIAST || CFIAST.type !== 'CFIAST') {
    throw new NodeTypeError(CFIAST, 'expected CFI AST root node');
  } // Interpet the path node (the package document step)


  var $packageElement = jquery(packageDocument.getElementsByTagNameNS('*', 'package'));
  var $currElement = interpretIndexStepNode(CFIAST.cfiString.path, $packageElement, classBlacklist, elementBlacklist, idBlacklist);
  var foundHref = searchLocalPathForHref($currElement, packageDocument, CFIAST.cfiString.localPath, classBlacklist, elementBlacklist, idBlacklist);

  if (foundHref) {
    return foundHref;
  }

  return undefined;
} // Description: Compare two given CFIs
//  Either CFI can be expressed in range form.
//  Assuming the CFIs reference the same content document (partial CFIs)
//  Because of this the output is an array with two integers.
//  If both integers are the same then you can simplify the results into a single integer.
//  The integer indicates that:
//      -1 | CFI location point A is located before CFI location point B
//       0 | CFI location point A is the same as CFI location point B
//       1 | CFI location point A is located after CFI location point B
//  If both integers are different then the first integer is
//      a comparison between the start location of CFI range A and the start location of CFI range B
//  The second integer is
//      a comparison between the end location of CFI range A and the end location of CFI range B.

function compareCFIs(cfiA, cfiB) {
  var decomposedCFI1 = decomposeCFI(cfiA);
  var decomposedCFI2 = decomposeCFI(cfiB);

  if (decomposedCFI1.length > 1 && decomposedCFI2.length > 1) {
    return [compareCFIASTs(decomposedCFI1[0], decomposedCFI2[0]), compareCFIASTs(decomposedCFI1[1], decomposedCFI2[1])];
  }

  if (decomposedCFI1.length > 1 && decomposedCFI2.length === 1) {
    return [compareCFIASTs(decomposedCFI1[0], decomposedCFI2[0]), compareCFIASTs(decomposedCFI1[1], decomposedCFI2[0])];
  }

  if (decomposedCFI1.length === 1 && decomposedCFI2.length > 1) {
    return [compareCFIASTs(decomposedCFI1[0], decomposedCFI2[0]), compareCFIASTs(decomposedCFI1[0], decomposedCFI2[1])];
  }

  var result = compareCFIASTs(decomposedCFI1[0], decomposedCFI2[0]);
  return [result, result];
} // Description: Inject an arbitrary html element into a position
//   in a content document referenced by a CFI

function injectElement(CFI, contentDocument, elementToInject, classBlacklist, elementBlacklist, idBlacklist) {
  var decodedCFI = decodeURI(CFI);
  var CFIAST = parse(decodedCFI);
  var $currElement; // Rationale: Since the correct content document for this CFI is already being passed,
  //   we can skip to the beginning of the indirection step that referenced the content document.
  // Note: This assumes that indirection steps and index steps conform to an interface:
  //   an object with stepLength, idAssertion

  var indirectionStepNum = getFirstIndirectionStepNum(CFIAST);
  var indirectionNode = CFIAST.cfiString.localPath.steps[indirectionStepNum];
  indirectionNode.type = 'indexStep'; // Interpret the rest of the steps

  $currElement = interpretLocalPath(CFIAST.cfiString.localPath, indirectionStepNum, jquery(contentDocument.documentElement, contentDocument), classBlacklist, elementBlacklist, idBlacklist); // TODO: detect what kind of terminus; for now, text node termini are the only kind implemented

  $currElement = interpretTextTerminusNode(CFIAST.cfiString.localPath.termStep, $currElement, elementToInject); // Return the element that was injected into

  return $currElement;
} // Description: Inject an arbitrary html element into a position in
//   a content document referenced by a CFI

function injectRangeElements(rangeCFI, contentDocument, startElementToInject, endElementToInject, classBlacklist, elementBlacklist, idBlacklist) {
  var decodedCFI = decodeURI(rangeCFI);
  var CFIAST = parse(decodedCFI);
  var $range1TargetElement;
  var $range2TargetElement; // Rationale: Since the correct content document for this CFI is already being passed,
  //   we can skip to the beginning
  //   of the indirection step that referenced the content document.
  // Note: This assumes that indirection steps and index steps conform to an interface:
  //   an object with stepLength, idAssertion

  var indirectionStepNum = getFirstIndirectionStepNum(CFIAST);
  var indirectionNode = CFIAST.cfiString.localPath.steps[indirectionStepNum];
  indirectionNode.type = 'indexStep'; // Interpret the rest of the steps in the first local path

  var $currElement = interpretLocalPath(CFIAST.cfiString.localPath, indirectionStepNum, jquery(contentDocument.documentElement, contentDocument), classBlacklist, elementBlacklist, idBlacklist); // Interpret the first range local_path

  $range1TargetElement = interpretLocalPath(CFIAST.cfiString.range1, 0, $currElement, classBlacklist, elementBlacklist, idBlacklist);
  $range1TargetElement = interpretTextTerminusNode(CFIAST.cfiString.range1.termStep, $range1TargetElement, startElementToInject); // Interpret the second range local_path

  $range2TargetElement = interpretLocalPath(CFIAST.cfiString.range2, 0, $currElement, classBlacklist, elementBlacklist, idBlacklist);
  $range2TargetElement = interpretTextTerminusNode(CFIAST.cfiString.range2.termStep, $range2TargetElement, endElementToInject); // Return the element that was injected into

  return {
    startElement: $range1TargetElement[0],
    endElement: $range2TargetElement[0]
  };
} // Description: This method will return the element or node (say, a text node)
//   that is the final target of the the CFI.

function getTargetElement(CFI, contentDocument, classBlacklist, elementBlacklist, idBlacklist) {
  var decodedCFI = decodeURI(CFI);
  var CFIAST = parse(decodedCFI); // Rationale: Since the correct content document for this CFI is already being passed,
  //   we can skip to the beginning of the indirection step that referenced the content document.
  // Note: This assumes that indirection steps and index steps conform to an interface:
  //   an object with stepLength, idAssertion

  var indirectionStepNum = getFirstIndirectionStepNum(CFIAST);
  var indirectionNode = CFIAST.cfiString.localPath.steps[indirectionStepNum];
  indirectionNode.type = 'indexStep'; // Interpret the rest of the steps and eturn the element at the end of the CFI

  return interpretLocalPath(CFIAST.cfiString.localPath, indirectionStepNum, jquery(contentDocument.documentElement, contentDocument), classBlacklist, elementBlacklist, idBlacklist);
} // Description: This method will return the start and end elements (along with their char offsets)
//   hat are the final targets of the range CFI.

function getRangeTargetElements(rangeCFI, contentDocument, classBlacklist, elementBlacklist, idBlacklist) {
  var decodedCFI = decodeURI(rangeCFI);
  var CFIAST = parse(decodedCFI); // Rationale: Since the correct content document for this CFI is already being passed,
  //   we can skip to the beginning of the indirection step that referenced the content document.
  // Note: This assumes that indirection steps and index steps conform to an interface:
  //   an object with stepLength, idAssertion

  var indirectionStepNum = getFirstIndirectionStepNum(CFIAST);
  var indirectionNode = CFIAST.cfiString.localPath.steps[indirectionStepNum];
  indirectionNode.type = 'indexStep'; // Interpret the rest of the steps

  var $currElement = interpretLocalPath(CFIAST.cfiString.localPath, indirectionStepNum, jquery(contentDocument.documentElement, contentDocument), classBlacklist, elementBlacklist, idBlacklist); // Interpret first range local_path

  var $range1TargetElement = interpretLocalPath(CFIAST.cfiString.range1, 0, $currElement, classBlacklist, elementBlacklist, idBlacklist); // Interpret second range local_path

  var $range2TargetElement = interpretLocalPath(CFIAST.cfiString.range2, 0, $currElement, classBlacklist, elementBlacklist, idBlacklist); // Get the start and end character offsets

  var startOffset = parseInt(CFIAST.cfiString.range1.termStep.offsetValue, 10) || undefined;
  var endOffset = parseInt(CFIAST.cfiString.range2.termStep.offsetValue, 10) || undefined; // Return the element (and char offsets) at the end of the CFI

  return {
    startElement: $range1TargetElement[0],
    startOffset: startOffset,
    endElement: $range2TargetElement[0],
    endOffset: endOffset
  };
} // Description: This method allows a "partial" CFI to be used to reference
//   a target in a content document, without a package document CFI component.
// Arguments: {
//     contentDocumentCFI:
//        This is a partial CFI that represents a path in a content document only.
//        This partial must be syntactically valid, even though it references a path starting at
//        the top of a content document (which is a CFI that has no defined meaning in the spec.)
//     contentDocument:
//        A DOM representation of the content document to which the partial CFI refers.
// }
// Rationale: This method exists to meet the requirements of the Readium-SDK
//   and should be used with care

function getTargetElementWithPartialCFI(contentDocumentCFI, contentDocument, classBlacklist, elementBlacklist, idBlacklist) {
  var decodedCFI = decodeURI(contentDocumentCFI);
  var CFIAST = parse(decodedCFI); // Interpret the path node

  var $currElement = interpretIndexStepNode(CFIAST.cfiString.path, jquery(contentDocument.documentElement, contentDocument), classBlacklist, elementBlacklist, idBlacklist); // Interpret the rest of the steps

  $currElement = interpretLocalPath(CFIAST.cfiString.localPath, 0, $currElement, classBlacklist, elementBlacklist, idBlacklist); // Return the element at the end of the CFI

  return $currElement;
} // Description: This method allows a "partial" CFI to be used, with a content document,
//   to return the text node and offset referenced by the partial CFI.
// Arguments: {
//     contentDocumentCFI:
//        This is a partial CFI that represents a path in a content document only.
//        This partial must be syntactically valid, even though it references a path starting at
//        the top of a content document (which is a CFI that has no defined meaning in the spec.)
//     contentDocument:
//        A DOM representation of the content document to which the partial CFI refers.
// }

function getTextTerminusInfoWithPartialCFI(contentDocumentCFI, contentDocument, classBlacklist, elementBlacklist, idBlacklist) {
  var decodedCFI = decodeURI(contentDocumentCFI);
  var CFIAST = parse(decodedCFI); // Interpret the path node

  var $currElement = interpretIndexStepNode(CFIAST.cfiString.path, jquery(contentDocument.documentElement, contentDocument), classBlacklist, elementBlacklist, idBlacklist); // Interpret the rest of the steps

  $currElement = interpretLocalPath(CFIAST.cfiString.localPath, 0, $currElement, classBlacklist, elementBlacklist, idBlacklist); // Return the element at the end of the CFI

  var textOffset = parseInt(CFIAST.cfiString.localPath.termStep.offsetValue, 10);
  return {
    textNode: $currElement[0],
    textOffset: textOffset
  };
} // Description: This method will return the element or node (say, a text node)
//   that is the final target of the the CFI, along with the text terminus offset.

function getTextTerminusInfo(CFI, contentDocument, classBlacklist, elementBlacklist, idBlacklist) {
  var decodedCFI = decodeURI(CFI);
  var CFIAST = parse(decodedCFI); // Rationale: Since the correct content document for this CFI is already being passed,
  //   we can skip to the beginning of the indirection step that referenced the content document.
  // Note: This assumes that indirection steps and index steps conform to an interface:
  //   an object with stepLength, idAssertion

  var indirectionStepNum = getFirstIndirectionStepNum(CFIAST);
  var indirectionNode = CFIAST.cfiString.localPath.steps[indirectionStepNum];
  indirectionNode.type = 'indexStep'; // Interpret the rest of the steps

  var $currElement = interpretLocalPath(CFIAST.cfiString.localPath, indirectionStepNum, jquery(contentDocument.documentElement, contentDocument), classBlacklist, elementBlacklist, idBlacklist); // Return the element at the end of the CFI

  var textOffset = parseInt(CFIAST.cfiString.localPath.termStep.offsetValue, 10);
  return {
    textNode: $currElement[0],
    textOffset: textOffset
  };
} // Description: This function will determine if the input "partial" CFI is expressed as a range

function isRangeCfi(CFI) {
  var decodedCFI = CFI ? decodeURI(CFI) : undefined;
  var CFIAST = parse(decodedCFI);

  if (!CFIAST || CFIAST.type !== 'CFIAST') {
    throw new NodeTypeError(CFIAST, 'expected CFI AST root node');
  }

  return CFIAST.cfiString.type === 'range';
} // Description: This function will determine if the input "partial" CFI has a text terminus step

function hasTextTerminus(CFI) {
  var decodedCFI = CFI ? decodeURI(CFI) : undefined;
  var CFIAST = parse(decodedCFI);

  if (!CFIAST || CFIAST.type !== 'CFIAST') {
    throw new NodeTypeError(CFIAST, 'expected CFI AST root node');
  }

  return !!CFIAST.cfiString.localPath.termStep;
}

var interpreter = /*#__PURE__*/Object.freeze({
	interpretIndexStepNode: interpretIndexStepNode,
	interpretIndirectionStepNode: interpretIndirectionStepNode,
	interpretTextTerminusNode: interpretTextTerminusNode,
	getContentDocHref: getContentDocHref,
	compareCFIs: compareCFIs,
	injectElement: injectElement,
	injectRangeElements: injectRangeElements,
	getTargetElement: getTargetElement,
	getRangeTargetElements: getRangeTargetElements,
	getTargetElementWithPartialCFI: getTargetElementWithPartialCFI,
	getTextTerminusInfoWithPartialCFI: getTextTerminusInfoWithPartialCFI,
	getTextTerminusInfo: getTextTerminusInfo,
	isRangeCfi: isRangeCfi,
	hasTextTerminus: hasTextTerminus
});

//  "PUBLIC" METHODS (THE API) are exported using the `export` keyword                  //
// ------------------------------------------------------------------------------------ //

function validateStartTextNode(startTextNode, characterOffset) {
  // Check that the text node to start from IS a text node
  if (!startTextNode) {
    throw new NodeTypeError(startTextNode, 'Cannot generate a character offset from a starting point that is not a text node');
  } else if (startTextNode.nodeType !== 3) {
    throw new NodeTypeError(startTextNode, 'Cannot generate a character offset from a starting point that is not a text node');
  } // Check that the character offset is within a valid range for the text node supplied


  if (characterOffset < 0) {
    throw new OutOfRangeError(characterOffset, 0, 'Character offset cannot be less than 0');
  } else if (characterOffset > startTextNode.nodeValue.length) {
    throw new OutOfRangeError(characterOffset, startTextNode.nodeValue.length - 1, 'character offset cannot be greater than the length of the text node');
  }
}

function validateTargetElement(startElement) {
  if (!startElement) {
    throw new NodeTypeError(startElement, 'CFI target element is undefined');
  }
}

function validateStartElement(startElement) {
  validateTargetElement(startElement);

  if (!(startElement.nodeType && startElement.nodeType === 1)) {
    throw new NodeTypeError(startElement, 'CFI target element is not an HTML element');
  }
}

function validateContentDocumentName(contentDocumentName) {
  // Check that the idref for the content document has been provided
  if (!contentDocumentName) {
    throw new Error('The idref for the content document, as found in the spine, must be supplied');
  }
}

function findSpineItemNode(packageDocument, idref) {
  return _toConsumableArray(packageDocument.getElementsByTagNameNS('*', 'itemref')).find(function (element) {
    return element.getAttribute('idref') === idref;
  });
}

function validatePackageDocument(packageDocument, contentDocumentName) {
  // Check that the package document is non-empty and contains
  // an itemref element for the supplied idref
  if (!packageDocument) {
    throw new Error('A package document must be supplied to generate a CFI');
  }

  var spineItemNode = findSpineItemNode(packageDocument, contentDocumentName);

  if (!spineItemNode) {
    throw new Error('The idref of the content document could not be found in the spine');
  }
}

function validNodeTypesFilter(node) {
  return node.nodeType === Node.TEXT_NODE || node.nodeType === Node.ELEMENT_NODE;
}

function normalizeDomRange(domRange) {
  var startContainer = domRange.startContainer,
      endContainer = domRange.endContainer,
      commonAncestorContainer = domRange.commonAncestorContainer;

  if (commonAncestorContainer.nodeType !== Node.ELEMENT_NODE) {
    // No need for normalization on ranges where the ancestor is not an element
    return;
  }

  if (startContainer.nodeType !== Node.TEXT_NODE && endContainer.nodeType !== Node.TEXT_NODE) {
    // and one of the start/end nodes must be a text node
    return;
  }

  if (startContainer === commonAncestorContainer) {
    var _filter = _toConsumableArray(startContainer.childNodes).filter(validNodeTypesFilter),
        _filter2 = _slicedToArray(_filter, 1),
        firstChildNode = _filter2[0];

    if (firstChildNode) {
      domRange.setStart(firstChildNode, 0);
    }
  }

  if (endContainer === commonAncestorContainer) {
    var _filter$slice = _toConsumableArray(endContainer.childNodes).filter(validNodeTypesFilter).slice(-1),
        _filter$slice2 = _slicedToArray(_filter$slice, 1),
        lastChildNode = _filter$slice2[0];

    if (lastChildNode) {
      if (lastChildNode.length) {
        domRange.setEnd(lastChildNode, lastChildNode.length);
      } else if (lastChildNode.hasChildNodes()) {
        domRange.setEnd(lastChildNode, lastChildNode.childNodes.length);
      } else {
        domRange.setEnd(lastChildNode, 1);
      }
    }
  }
} // Description: Creates a CFI terminating step to a text node, with a character offset
// REFACTORING CANDIDATE: Some of the parts of this method
//   could be refactored into their own methods


function createCFITextNodeStep($startTextNode, characterOffset, classBlacklist, elementBlacklist, idBlacklist) {
  var indexOfTextNode = -1; // Find text node position in the set of child elements, ignoring any blacklisted elements

  var $parentNode = $startTextNode.parent();
  var $contentsExcludingMarkers = jquery(applyBlacklist($parentNode.contents().toArray(), classBlacklist, elementBlacklist, idBlacklist)); // Find the text node index in the parent list,
  // inferring nodes that were originally a single text node

  var prevNodeWasTextNode;
  var indexOfFirstInSequence;
  var textNodeOnlyIndex = 0;
  var characterOffsetSinceUnsplit = 0;
  var finalCharacterOffsetInSequence = 0;
  jquery.each($contentsExcludingMarkers, function each() {
    // If this is a text node, check if it matches and return the current index
    if (this.nodeType === Node.TEXT_NODE || !prevNodeWasTextNode) {
      if (this.nodeType === Node.TEXT_NODE) {
        if (this === $startTextNode[0]) {
          // Set index as the first in the adjacent sequence of text nodes,
          // or as the index of the current node if this
          //   node is a standard one sandwiched between two element nodes.
          if (prevNodeWasTextNode) {
            indexOfTextNode = indexOfFirstInSequence;
            finalCharacterOffsetInSequence = characterOffsetSinceUnsplit;
          } else {
            indexOfTextNode = textNodeOnlyIndex;
          } // Break out of .each loop


          return false;
        } // Save this index as the first in sequence of adjacent text nodes,
        // if it is not already set by this point


        prevNodeWasTextNode = true;
        characterOffsetSinceUnsplit += this.length;

        if (indexOfFirstInSequence === undefined) {
          indexOfFirstInSequence = textNodeOnlyIndex;
          textNodeOnlyIndex += 1;
        }
      } else if (this.nodeType === Node.ELEMENT_NODE) {
        textNodeOnlyIndex += 1;
      } else if (this.nodeType === Node.COMMENT_NODE) {
        prevNodeWasTextNode = true; // 7 is the size of the html comment tag <!--[comment]-->

        characterOffsetSinceUnsplit = characterOffsetSinceUnsplit + this.length + 7;

        if (indexOfFirstInSequence === undefined) {
          indexOfFirstInSequence = textNodeOnlyIndex;
        }
      } else if (this.nodeType === Node.PROCESSING_INSTRUCTION_NODE) {
        prevNodeWasTextNode = true; // 5 is the size of the instruction processing tag including the required space between
        // the target and the data <?[target] [data]?>

        characterOffsetSinceUnsplit = characterOffsetSinceUnsplit + this.data.length + this.target.length + 5;

        if (indexOfFirstInSequence === undefined) {
          indexOfFirstInSequence = textNodeOnlyIndex;
        }
      }
    } else if (this.nodeType === Node.ELEMENT_NODE) {
      // This node is not a text node
      prevNodeWasTextNode = false;
      indexOfFirstInSequence = undefined;
      characterOffsetSinceUnsplit = 0;
    } else if (this.nodeType === Node.COMMENT_NODE) {
      // <!--[comment]-->
      characterOffsetSinceUnsplit = characterOffsetSinceUnsplit + this.length + 7;
    } else if (this.nodeType === Node.PROCESSING_INSTRUCTION_NODE) {
      // <?[target] [data]?>
      characterOffsetSinceUnsplit = characterOffsetSinceUnsplit + this.data.length + this.target.length + 5;
    }

    return true;
  }); // Convert the text node index to a CFI odd-integer representation

  var CFIIndex = indexOfTextNode * 2 + 1; // TODO: text assertions are not in the grammar yet, I think, or they're just causing problems.
  // This has been temporarily removed.
  // Add pre- and post- text assertions
  // preAssertionStartIndex = (characterOffset - 3 >= 0) ? characterOffset - 3 : 0;
  // preAssertion = $startTextNode[0].nodeValue.substring(preAssertionStartIndex, characterOffset);
  // textLength = $startTextNode[0].nodeValue.length;
  // postAssertionEndIndex = (characterOffset + 3 <= textLength) ? characterOffset + 3 : textLength;
  // postAssertion = $startTextNode[0].nodeValue.substring(characterOffset, postAssertionEndIndex);
  // Gotta infer the correct character offset, as well
  // Return the constructed CFI text node step

  return "/".concat(CFIIndex, ":").concat(finalCharacterOffsetInSequence + characterOffset); // + "[" + preAssertion + "," + postAssertion + "]";
}
function createCFIElementSteps($currNode, topLevelElement, classBlacklist, elementBlacklist, idBlacklist) {
  var currNodePosition = -1;
  var elementStep; // Find position of current node in parent list

  var $blacklistExcluded = jquery(applyBlacklist($currNode.parent().children().toArray(), classBlacklist, elementBlacklist, idBlacklist));
  jquery.each($blacklistExcluded, function each(index) {
    if (this === $currNode[0]) {
      currNodePosition = index; // Break loop

      return false;
    }

    return true;
  }); // Convert position to the CFI even-integer representation

  var CFIPosition = (currNodePosition + 1) * 2; // Create CFI step with id assertion, if the element has an id

  if ($currNode.attr('id')) {
    elementStep = "/".concat(CFIPosition, "[").concat($currNode.attr('id'), "]");
  } else {
    elementStep = "/".concat(CFIPosition);
  } // If a parent is an html element return the (last) step for
  //   this content document, otherwise, continue.
  //   Also need to check if the current node is the top-level element.
  //   This can occur if the start node is also the top level element.


  var $parentNode = $currNode.parent();

  if (typeof topLevelElement === 'string' && matchesLocalNameOrElement($parentNode[0], topLevelElement) || matchesLocalNameOrElement($currNode[0], topLevelElement)) {
    return elementStep;
  }

  if ($parentNode[0] === topLevelElement || $currNode[0] === topLevelElement) {
    return elementStep;
  }

  return createCFIElementSteps($parentNode, topLevelElement, classBlacklist, elementBlacklist, idBlacklist) + elementStep;
}
function generateDocumentRangeComponent(domRange, classBlacklist, elementBlacklist, idBlacklist) {
  normalizeDomRange(domRange);
  var startContainer = domRange.startContainer,
      endContainer = domRange.endContainer,
      startOffset = domRange.startOffset,
      endOffset = domRange.endOffset,
      commonAncestorContainer = domRange.commonAncestorContainer;
  var ownerDocument = startContainer.ownerDocument;
  var range1CFI;
  var range1OffsetStep;
  var range2CFI;
  var range2OffsetStep;
  var commonCFIComponent;

  if (startContainer.nodeType === Node.TEXT_NODE && endContainer.nodeType === Node.TEXT_NODE) {
    // Parent element is the same
    if (jquery(startContainer).parent()[0] === jquery(endContainer).parent()[0]) {
      range1OffsetStep = createCFITextNodeStep(jquery(startContainer), startOffset, classBlacklist, elementBlacklist, idBlacklist);
      range2OffsetStep = createCFITextNodeStep(jquery(endContainer), endOffset, classBlacklist, elementBlacklist, idBlacklist);
      commonCFIComponent = createCFIElementSteps(jquery(startContainer).parent(), ownerDocument.documentElement, classBlacklist, elementBlacklist, idBlacklist);
      return "".concat(commonCFIComponent, ",").concat(range1OffsetStep, ",").concat(range2OffsetStep);
    }
  }

  if (startContainer.nodeType === Node.ELEMENT_NODE && endContainer.nodeType === Node.ELEMENT_NODE && startContainer === endContainer && commonAncestorContainer === startContainer) {
    var startElement = commonAncestorContainer.childNodes[startOffset];
    var endElement;

    if (endOffset === commonAncestorContainer.childNodes.length) {
      endElement = commonAncestorContainer.childNodes[endOffset - 1];
    } else {
      endElement = commonAncestorContainer.childNodes[endOffset].previousSibling;
    } // Generate shared component


    commonCFIComponent = createCFIElementSteps(jquery(commonAncestorContainer), ownerDocument.documentElement, classBlacklist, elementBlacklist, idBlacklist);
    range1CFI = createCFIElementSteps(jquery(startElement), commonAncestorContainer, classBlacklist, elementBlacklist, idBlacklist);

    if (startElement === endElement) {
      return commonCFIComponent + range1CFI;
    }

    range2CFI = createCFIElementSteps(jquery(endElement), commonAncestorContainer, classBlacklist, elementBlacklist, idBlacklist); // Return the result

    return "".concat(commonCFIComponent, ",").concat(range1CFI, ",").concat(range2CFI);
  }

  if (startContainer.nodeType === Node.ELEMENT_NODE) {
    validateStartElement(startContainer);
    range1CFI = createCFIElementSteps(jquery(startContainer), commonAncestorContainer, classBlacklist, elementBlacklist, idBlacklist);
  } else {
    validateStartTextNode(startContainer); // Generate terminating offset and range 1

    range1OffsetStep = createCFITextNodeStep(jquery(startContainer), startOffset, classBlacklist, elementBlacklist, idBlacklist);

    if (jquery(startContainer).parent()[0] === commonAncestorContainer) {
      range1CFI = range1OffsetStep;
    } else {
      range1CFI = createCFIElementSteps(jquery(startContainer).parent(), commonAncestorContainer, classBlacklist, elementBlacklist, idBlacklist) + range1OffsetStep;
    }
  }

  if (endContainer.nodeType === Node.ELEMENT_NODE) {
    validateStartElement(endContainer);
    range2CFI = createCFIElementSteps(jquery(endContainer), commonAncestorContainer, classBlacklist, elementBlacklist, idBlacklist);
  } else {
    validateStartTextNode(endContainer); // Generate terminating offset and range 2

    range2OffsetStep = createCFITextNodeStep(jquery(endContainer), endOffset, classBlacklist, elementBlacklist, idBlacklist);

    if (jquery(endContainer).parent()[0] === commonAncestorContainer) {
      range2CFI = range2OffsetStep;
    } else {
      range2CFI = createCFIElementSteps(jquery(endContainer).parent(), commonAncestorContainer, classBlacklist, elementBlacklist, idBlacklist) + range2OffsetStep;
    }
  } // Generate shared component


  commonCFIComponent = createCFIElementSteps(jquery(commonAncestorContainer), ownerDocument.documentElement, classBlacklist, elementBlacklist, idBlacklist); // Return the result

  return "".concat(commonCFIComponent, ",").concat(range1CFI, ",").concat(range2CFI);
}
function generateRangeComponent(rangeStartElement, startOffset, rangeEndElement, endOffset, classBlacklist, elementBlacklist, idBlacklist) {
  var ownerDocument = rangeStartElement.ownerDocument; // Create a document range from inputs

  var docRange = ownerDocument.createRange();
  docRange.setStart(rangeStartElement, startOffset);
  docRange.setEnd(rangeEndElement, endOffset);
  return generateDocumentRangeComponent(docRange, classBlacklist, elementBlacklist, idBlacklist);
}
function generateCharOffsetRangeComponent(rangeStartElement, startOffset, rangeEndElement, endOffset, classBlacklist, elementBlacklist, idBlacklist) {
  var ownerDocument = rangeStartElement.ownerDocument;
  validateStartTextNode(rangeStartElement);
  validateStartTextNode(rangeEndElement); // Create a document range to find the common ancestor

  var docRange = ownerDocument.createRange();
  docRange.setStart(rangeStartElement, startOffset);
  docRange.setEnd(rangeEndElement, endOffset);
  return generateDocumentRangeComponent(docRange, classBlacklist, elementBlacklist, idBlacklist);
}
function generateElementRangeComponent(rangeStartElement, rangeEndElement, classBlacklist, elementBlacklist, idBlacklist) {
  var ownerDocument = rangeStartElement.ownerDocument; // Create a document range from inputs

  var docRange = ownerDocument.createRange();
  docRange.setStartBefore(rangeStartElement);
  docRange.setEndAfter(rangeEndElement);
  return generateDocumentRangeComponent(docRange, classBlacklist, elementBlacklist, idBlacklist);
} // Description: Generates a character offset CFI
// Arguments: The text node that contains the offset referenced by the cfi,
//   the offset value, the name of the content document that contains
//   the text node, the package document for this EPUB.

function generateCharacterOffsetCFIComponent(startTextNode, characterOffset, classBlacklist, elementBlacklist, idBlacklist) {
  validateStartTextNode(startTextNode, characterOffset); // Create the text node step

  var textNodeStep = createCFITextNodeStep(jquery(startTextNode), characterOffset, classBlacklist, elementBlacklist, idBlacklist); // Call the recursive method to create all the steps up to the head element
  // of the content document
  // (typically the "html" element, or the "svg" element)

  return createCFIElementSteps(jquery(startTextNode).parent(), startTextNode.ownerDocument.documentElement, classBlacklist, elementBlacklist, idBlacklist) + textNodeStep;
}
function generateElementCFIComponent(startElement, classBlacklist, elementBlacklist, idBlacklist) {
  validateStartElement(startElement); // Call the recursive method to create all the steps up to the head element
  // of the content document
  // (typically the "html" element, or the "svg" element)

  return createCFIElementSteps(jquery(startElement), startElement.ownerDocument.documentElement, classBlacklist, elementBlacklist, idBlacklist);
}
function generatePackageDocumentCFIComponent(contentDocumentName, packageDocument, classBlacklist, elementBlacklist, idBlacklist) {
  validateContentDocumentName(contentDocumentName);
  validatePackageDocument(packageDocument, contentDocumentName); // Get the start node (itemref element) that references the content document

  var $itemRefStartNode = jquery(findSpineItemNode(packageDocument, contentDocumentName)); // Create the steps up to the top element of the package document (the "package" element)

  var packageDocCFIComponent = createCFIElementSteps($itemRefStartNode, 'package', classBlacklist, elementBlacklist, idBlacklist); // Append an !;
  // this assumes that a CFI content document CFI component will be appended at some point

  return "".concat(packageDocCFIComponent, "!");
}
function generatePackageDocumentCFIComponentWithSpineIndex(spineIndex, packageDocument, classBlacklist, elementBlacklist, idBlacklist) {
  // Get the start node (itemref element) that references the content document
  var spineItemNode = packageDocument.getElementsByTagNameNS('*', 'spine');
  var $itemRefStartNode = jquery(jquery(spineItemNode).children()[spineIndex]); // Create the steps up to the top element of the package document (the "package" element)

  var packageDocCFIComponent = createCFIElementSteps($itemRefStartNode, 'package', classBlacklist, elementBlacklist, idBlacklist); // Append an !;
  // this assumes that a CFI content document CFI component will be appended at some point

  return "".concat(packageDocCFIComponent, "!");
}
function generateCompleteCFI(packageDocumentCFIComponent, contentDocumentCFIComponent) {
  return "epubcfi(".concat(packageDocumentCFIComponent).concat(contentDocumentCFIComponent, ")");
}

var generator = /*#__PURE__*/Object.freeze({
	validateStartElement: validateStartElement,
	createCFITextNodeStep: createCFITextNodeStep,
	createCFIElementSteps: createCFIElementSteps,
	generateDocumentRangeComponent: generateDocumentRangeComponent,
	generateRangeComponent: generateRangeComponent,
	generateCharOffsetRangeComponent: generateCharOffsetRangeComponent,
	generateElementRangeComponent: generateElementRangeComponent,
	generateCharacterOffsetCFIComponent: generateCharacterOffsetCFIComponent,
	generateElementCFIComponent: generateElementCFIComponent,
	generatePackageDocumentCFIComponent: generatePackageDocumentCFIComponent,
	generatePackageDocumentCFIComponentWithSpineIndex: generatePackageDocumentCFIComponentWithSpineIndex,
	generateCompleteCFI: generateCompleteCFI
});

var readiumCfi_esm = /*#__PURE__*/Object.freeze({
	Instructions: instructions,
	Interpreter: interpreter,
	Generator: generator,
	Parser: parser$1
});

var cfiNavigationLogic = createCommonjsModule(function (module, exports) {
exports.__esModule = true;


var CfiNavigationLogic = /** @class */ (function () {
    function CfiNavigationLogic(doc, eleChecker) {
        this.columnSize = [0, 0];
        this.rootDocument = doc;
        this.elementChecker = eleChecker;
    }
    CfiNavigationLogic.prototype.setColumnSize = function (width, height) {
        this.columnSize = [width, height];
    };
    CfiNavigationLogic.prototype.getCfiFromElementId = function (elementId) {
        var element = this.getElementById(elementId);
        if (!element) {
            return null;
        }
        return this.getCfiFromElement(element);
    };
    CfiNavigationLogic.prototype.getCfiFromElement = function (element) {
        var cfi = readiumCfi_esm.Generator.generateElementCFIComponent(element, this.elementChecker.getClassBlacklist(), this.elementChecker.getElementBlacklist(), this.elementChecker.getIdBlacklist());
        if (cfi[0] === '!') {
            cfi = cfi.substring(1);
        }
        return cfi;
    };
    CfiNavigationLogic.prototype.getFirstVisibleCfi = function (viewport, fromEnd) {
        var visChecker = new elementChecker.ElementVisibilityChecker(this.rootDocument, this.columnSize, viewport, this.elementChecker);
        var visibleEleInfo = visChecker.findFirstVisibleElement(fromEnd);
        return this.findVisibleLeafNodeCfi(visibleEleInfo, viewport);
    };
    CfiNavigationLogic.prototype.getOffsetByCfi = function (cfi) {
        if (this.isRangeCfi(cfi)) {
            var range = this.getNodeRangeInfoFromCfi(cfi);
            if (range) {
                return this.getOffsetFromRange(range);
            }
            return null;
        }
        var ele = this.getElementByCfi(cfi);
        if (ele) {
            return this.getOffsetFromElement(ele);
        }
        return null;
    };
    CfiNavigationLogic.prototype.getElementByCfi = function (cfi) {
        return this.getElementByPartialCfi(cfi);
    };
    CfiNavigationLogic.prototype.getOffsetFromElement = function (ele) {
        var offset = this.getOffsetByRectangles(ele);
        if (offset === null) {
            var visChecker = new elementChecker.ElementVisibilityChecker(this.rootDocument, this.columnSize);
            var _a = visChecker.findNearestElement(ele), nearEle = _a[0], _ = _a[1];
            if (nearEle) {
                offset = this.getOffsetByRectangles(nearEle);
            }
        }
        return offset;
    };
    CfiNavigationLogic.prototype.getOffsetFromElementId = function (eleId) {
        var element = this.getElementById(eleId);
        if (!element) {
            return null;
        }
        return this.getOffsetFromElement(element);
    };
    CfiNavigationLogic.prototype.getOffsetFromRange = function (range) {
        var visCheck = new elementChecker.ElementVisibilityChecker(this.rootDocument, this.columnSize);
        return visCheck.getRangeStartOffset(range);
    };
    CfiNavigationLogic.prototype.isRangeCfi = function (partialCfi) {
        var cfi = this.wrapCfi(partialCfi);
        return readiumCfi_esm.Interpreter.isRangeCfi(cfi) || readiumCfi_esm.Interpreter.hasTextTerminus(cfi);
    };
    CfiNavigationLogic.prototype.getElementById = function (eleId) {
        return this.rootDocument.getElementById(eleId);
    };
    CfiNavigationLogic.prototype.findVisibleLeafNodeCfi = function (visNode, viewport) {
        var element = visNode.element;
        var textNode = visNode.textNode;
        // if a valid text node is found, try to generate a CFI with range offsets
        if (textNode && this.isValidTextNode(textNode)) {
            var visChecker = new elementChecker.ElementVisibilityChecker(this.rootDocument, this.columnSize, viewport, this.elementChecker);
            var visibleRange = visChecker.getVisibleTextRange(textNode, true);
            return this.generateCfiFromRange(visibleRange);
        }
        if (element) {
            return this.getCfiFromElement(element);
        }
        return null;
    };
    CfiNavigationLogic.prototype.isValidTextNode = function (node) {
        if (node.nodeType === Node.TEXT_NODE) {
            return this.isValidTextNodeContent(node.nodeValue);
        }
        return false;
    };
    CfiNavigationLogic.prototype.isValidTextNodeContent = function (text) {
        if (text === null) {
            return false;
        }
        return !!text.trim().length;
    };
    CfiNavigationLogic.prototype.generateCfiFromRange = function (range) {
        if (range.collapsed && range.startContainer.nodeType === Node.TEXT_NODE) {
            return readiumCfi_esm.Generator.generateCharacterOffsetCFIComponent(range.startContainer, range.startOffset, ['cfi-marker'], [], ['MathJax_Message', 'MathJax_SVG_Hidden']);
        }
        if (range.collapsed) {
            return this.getCfiFromElement((range.startContainer));
        }
        return readiumCfi_esm.Generator.generateRangeComponent(range.startContainer, range.startOffset, range.endContainer, range.endOffset, this.elementChecker.getClassBlacklist(), this.elementChecker.getElementBlacklist(), this.elementChecker.getIdBlacklist());
    };
    CfiNavigationLogic.prototype.getOffsetByRectangles = function (ele) {
        var visChecker = new elementChecker.ElementVisibilityChecker(this.rootDocument, this.columnSize);
        return visChecker.getElementStartOffset(ele);
    };
    CfiNavigationLogic.prototype.getElementByPartialCfi = function (cfi) {
        var wrappedCfi = this.wrapCfi(cfi);
        // tslint:disable-next-line:no-any
        var $element;
        try {
            //noinspection JSUnresolvedVariable
            $element = readiumCfi_esm.Interpreter.getTargetElement(wrappedCfi, this.rootDocument, this.elementChecker.getClassBlacklist(), this.elementChecker.getElementBlacklist(), this.elementChecker.getIdBlacklist());
        }
        catch (ex) {
            // EPUBcfi.Interpreter can throw a SyntaxError
        }
        if (!$element || $element.length === 0) {
            console.log("Can't find element for CFI: " + cfi);
            return null;
        }
        return $element[0];
    };
    CfiNavigationLogic.prototype.getNodeRangeInfoFromCfi = function (cfi) {
        var wrappedCfi = this.wrapCfi(cfi);
        // tslint:disable-next-line:no-any
        var nodeResult;
        if (readiumCfi_esm.Interpreter.isRangeCfi(wrappedCfi)) {
            try {
                //noinspection JSUnresolvedVariable
                nodeResult = readiumCfi_esm.Interpreter.getRangeTargetElements(wrappedCfi, this.rootDocument, this.elementChecker.getClassBlacklist(), this.elementChecker.getElementBlacklist(), this.elementChecker.getIdBlacklist());
            }
            catch (ex) {
                // EPUBcfi.Interpreter can throw a SyntaxError
            }
            if (!nodeResult) {
                console.log("Can't find nodes for range CFI: " + cfi);
                return null;
            }
            return this.createRange(nodeResult.startElement, nodeResult.startOffset, nodeResult.endElement, nodeResult.endOffset);
        }
        if (readiumCfi_esm.Interpreter.hasTextTerminus(wrappedCfi)) {
            // tslint:disable-next-line:no-any
            var textTerminusResult = void 0;
            try {
                textTerminusResult = readiumCfi_esm.Interpreter.getTextTerminusInfo(wrappedCfi, this.rootDocument, this.elementChecker.getClassBlacklist(), this.elementChecker.getElementBlacklist(), this.elementChecker.getIdBlacklist());
            }
            catch (ex) {
                // EPUBcfi.Interpreter can throw a SyntaxError
            }
            if (!textTerminusResult) {
                console.log("Can't find node for text term CFI: " + cfi);
                return null;
            }
            var container = textTerminusResult.textNode;
            var start = textTerminusResult.textOffset;
            // LD(2018.10.02): it seems like Chrome(v69) has a bug that collapsed
            // range with witespace char won't report proper getClientRects().
            // so a no-collapsed range is created instead
            var end = textTerminusResult.textOffset + 1;
            return this.createRange(container, start, container, end);
        }
        return null;
    };
    CfiNavigationLogic.prototype.wrapCfi = function (partialCfi) {
        return "epubcfi(/99!" + partialCfi + ")";
    };
    CfiNavigationLogic.prototype.createRange = function (startNode, startOffset, endNode, endOffset) {
        var range = this.rootDocument.createRange();
        range.setStart(startNode, startOffset ? startOffset : 0);
        if (endNode.nodeType === Node.ELEMENT_NODE) {
            range.setEnd(endNode, endOffset ? endOffset : endNode.childNodes.length);
        }
        else if (endNode.nodeType === Node.TEXT_NODE) {
            range.setEnd(endNode, endOffset ? endOffset : 0);
        }
        return range;
    };
    return CfiNavigationLogic;
}());
exports.CfiNavigationLogic = CfiNavigationLogic;
});

unwrapExports(cfiNavigationLogic);
var cfiNavigationLogic_1 = cfiNavigationLogic.CfiNavigationLogic;

var r2ContentView = createCommonjsModule(function (module, exports) {
exports.__esModule = true;

var R2ContentView = /** @class */ (function () {
    function R2ContentView(loader, eleChecker) {
        this.iframeLoadedCallbacks = [];
        this.spineItemPgCount = 1;
        this.ePubHtml = null;
        this.ePubBody = null;
        this.useReadiumCss = true;
        this.useReadiumCssOverride = false;
        this.iframeLoader = loader;
        this.elementChecker = eleChecker;
    }
    R2ContentView.prototype.render = function () {
        throw new Error('Method not implemented.');
    };
    R2ContentView.prototype.loadSpineItem = function (spineItem, spineItemIndex, viewSettings, token) {
        var _this = this;
        this.spineItem = spineItem;
        this.spineItemIndex = spineItemIndex;
        this.vs = viewSettings;
        this.render();
        this.hideIframe();
        var onIframeContentLoaded = function (success) {
            _this.onIframeLoaded(success);
        };
        var loaderConfig = {
            useReadiumCss: this.useReadiumCss,
            useReadiumCssOverride: this.useReadiumCssOverride
        };
        this.iframeLoader.loadIframe(this.iframe, spineItem.href, onIframeContentLoaded, loaderConfig, spineItem.type);
        return this.iframeLoadedPromise();
    };
    R2ContentView.prototype.spineItemLoadedPromise = function (token) {
        return this.iframeLoadedPromise();
    };
    R2ContentView.prototype.unloadSpineItem = function () {
        this.host.removeChild(this.iframeContainer);
    };
    R2ContentView.prototype.attachToHost = function (host) {
        this.host = host;
    };
    R2ContentView.prototype.setViewSettings = function (viewSetting) {
        if (!this.ePubHtml) {
            return;
        }
        viewSetting.updateView(this.ePubHtml);
    };
    R2ContentView.prototype.scale = function (scale) {
        throw new Error('Method not implemented.');
    };
    R2ContentView.prototype.element = function () {
        return this.iframeContainer;
    };
    R2ContentView.prototype.metaWidth = function () {
        throw new Error('Method not implemented.');
    };
    R2ContentView.prototype.metaHeight = function () {
        throw new Error('Method not implemented.');
    };
    R2ContentView.prototype.calculatedHeight = function () {
        return 0;
    };
    R2ContentView.prototype.spineItemPageCount = function () {
        return this.spineItemPgCount;
    };
    R2ContentView.prototype.getOffsetFromCfi = function (cfi) {
        throw new Error('Method not implemented.');
    };
    R2ContentView.prototype.getOffsetFromElementId = function (cfi) {
        throw new Error('Method not implemented.');
    };
    R2ContentView.prototype.getPageIndexOffsetFromCfi = function (cfi) {
        throw new Error('Method not implemented.');
    };
    R2ContentView.prototype.getPageIndexOffsetFromElementId = function (elementId) {
        throw new Error('Method not implemented.');
    };
    R2ContentView.prototype.getCfi = function (offsetMain, offset2nd, backward) {
        throw new Error('Method not implemented.');
    };
    R2ContentView.prototype.getCfiFromElementId = function (elementId) {
        var cfi = this.cfiNavLogic.getCfiFromElementId(elementId);
        return cfi === null ? '' : cfi;
    };
    R2ContentView.prototype.onResize = function () {
        return;
    };
    R2ContentView.prototype.onSelfResize = function (callback) {
        return;
    };
    R2ContentView.prototype.setupIframe = function () {
        this.iframeContainer.style.transform = 'none';
        this.iframe.width = '100%';
        this.iframe.height = '100%';
    };
    R2ContentView.prototype.hideIframe = function () {
        this.iframe.style.visibility = 'hidden';
    };
    R2ContentView.prototype.showIFrame = function () {
        this.iframe.style.visibility = 'visible';
        this.iframe.style.left = '0px';
        this.iframe.style.top = '0px';
    };
    R2ContentView.prototype.iframeLoadedPromise = function (token) {
        var _this = this;
        return new Promise(function (resolve) {
            var listener = function (success) {
                resolve();
            };
            _this.iframeLoadedCallbacks.push(listener);
        });
    };
    R2ContentView.prototype.onIframeLoaded = function (success) {
        for (var _i = 0, _a = this.iframeLoadedCallbacks; _i < _a.length; _i++) {
            var callback = _a[_i];
            callback(success);
        }
        this.iframeLoadedCallbacks = [];
        var doc = this.iframe.contentDocument;
        this.cfiNavLogic = new cfiNavigationLogic.CfiNavigationLogic(doc, this.elementChecker);
    };
    R2ContentView.prototype.getHostSize = function () {
        if (!this.host.style.width || !this.host.style.height) {
            return null;
        }
        var width = parseFloat(this.host.style.width);
        var height = parseFloat(this.host.style.height);
        return [width, height];
    };
    return R2ContentView;
}());
exports.R2ContentView = R2ContentView;
});

unwrapExports(r2ContentView);
var r2ContentView_1 = r2ContentView.R2ContentView;

var r2MultiPageContentView = createCommonjsModule(function (module, exports) {
var __extends = (commonjsGlobal && commonjsGlobal.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
exports.__esModule = true;




var R2MultiPageContentView = /** @class */ (function (_super) {
    __extends(R2MultiPageContentView, _super);
    function R2MultiPageContentView() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    R2MultiPageContentView.prototype.render = function () {
        this.iframeContainer = document.createElement('div');
        this.iframe = document.createElement('iframe');
        this.iframeContainer.appendChild(this.iframe);
        this.iframeContainer.style.position = 'absolute';
        this.host.appendChild(this.iframeContainer);
        this.setupIframe();
        this.useReadiumCss = true;
    };
    R2MultiPageContentView.prototype.setViewSettings = function (viewSetting) {
        _super.prototype.setViewSettings.call(this, viewSetting);
        this.paginate();
    };
    R2MultiPageContentView.prototype.getOffsetFromCfi = function (cfi) {
        var offset = this.cfiNavLogic.getOffsetByCfi(cfi);
        if (offset === null) {
            return -1;
        }
        return offset[0];
    };
    R2MultiPageContentView.prototype.getOffsetFromElementId = function (cfi) {
        var offset = this.cfiNavLogic.getOffsetFromElementId(cfi);
        if (offset === null) {
            return -1;
        }
        return offset[0];
    };
    R2MultiPageContentView.prototype.getPageIndexOffsetFromCfi = function (cfi) {
        var offset = this.cfiNavLogic.getOffsetByCfi(cfi);
        if (offset === null) {
            return -1;
        }
        return Math.floor(offset[0] / this.hostWidth);
    };
    R2MultiPageContentView.prototype.getPageIndexOffsetFromElementId = function (elementId) {
        var offset = this.cfiNavLogic.getOffsetFromElementId(elementId);
        if (offset === null) {
            return -1;
        }
        return Math.floor(offset[0] / this.hostWidth);
    };
    R2MultiPageContentView.prototype.getCfi = function (offsetMain, offset2nd, backward) {
        var left = backward ? offsetMain - this.hostWidth : offsetMain;
        var right = left + this.hostWidth;
        var bottom = offset2nd + this.hostHeight;
        var cfi = this.cfiNavLogic.getFirstVisibleCfi(new rect.Rect(left, offset2nd, right, bottom), backward);
        return cfi ? cfi : '';
    };
    R2MultiPageContentView.prototype.onResize = function () {
        this.paginate();
    };
    R2MultiPageContentView.prototype.onIframeLoaded = function (success) {
        var epubContentDocument = this.iframe.contentDocument;
        if (epubContentDocument) {
            this.ePubHtml = epubContentDocument.querySelector('html');
            if (this.ePubHtml) {
                this.ePubBody = this.ePubHtml.querySelector('body');
            }
        }
        this.setViewSettings(this.vs);
        this.showIFrame();
        _super.prototype.onIframeLoaded.call(this, success);
        this.cfiNavLogic.setColumnSize(this.hostWidth, this.hostHeight);
    };
    R2MultiPageContentView.prototype.paginate = function () {
        if (!this.ePubHtml || !this.ePubBody) {
            return;
        }
        var hostSize = this.getHostSize();
        if (hostSize === null) {
            return;
        }
        this.hostWidth = hostSize[0];
        this.hostHeight = hostSize[1];
        // Need to set the iframe width to default value
        // so resize can work properly
        this.iframe.width = '100%';
        this.iframe.style.height = this.hostHeight + "px";
        this.ePubHtml.style.height = this.hostHeight + "px";
        this.ePubHtml.style.margin = '0px';
        this.ePubHtml.style.padding = '0px';
        this.ePubHtml.style.border = '0px';
        this.ePubBody.style.margin = '0px';
        this.ePubBody.style.padding = '0px';
        var gapValue = this.vs.getSetting(types.SettingName.ColumnGap);
        var columnGap = gapValue === undefined ? 0 : gapValue;
        var columnWidth = this.hostWidth - columnGap;
        var edgeMargin = columnGap / 2;
        this.iframeContainer.style.left = edgeMargin + "px";
        this.iframeContainer.style.right = edgeMargin + "px";
        // Have to set width to make Firefox paginate correctly
        this.ePubHtml.style.width = columnWidth + "px";
        this.ePubHtml.style.columnWidth = columnWidth + "px";
        this.ePubHtml.style.columnGap = columnGap + "px";
        this.ePubHtml.style.columnCount = 'auto';
        this.ePubHtml.style.columnFill = 'auto';
        this.ePubHtml.style.overflow = 'hidden';
        // This workaround is required for triggering layout changes in Safari
        domUtils.triggerLayout(this.iframe);
        // scrollWidth will round the value to an integer
        // so add 1 px to workaround possible rounding issue
        var fullWidth = this.ePubHtml.scrollWidth + 1;
        this.iframe.width = fullWidth + "px";
        this.spineItemPgCount = Math.round((fullWidth + columnGap) / this.hostWidth);
    };
    return R2MultiPageContentView;
}(r2ContentView.R2ContentView));
exports.R2MultiPageContentView = R2MultiPageContentView;
});

unwrapExports(r2MultiPageContentView);
var r2MultiPageContentView_1 = r2MultiPageContentView.R2MultiPageContentView;

var r2SinglePageContentView = createCommonjsModule(function (module, exports) {
var __extends = (commonjsGlobal && commonjsGlobal.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
exports.__esModule = true;



var R2SinglePageContentView = /** @class */ (function (_super) {
    __extends(R2SinglePageContentView, _super);
    function R2SinglePageContentView() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.ePubSvg = null;
        _this.ePubRoot = null;
        _this.metaSize = [0, 0];
        _this.metaScale = 1;
        _this.isVertical = false;
        _this.isFixedLayout = true;
        return _this;
    }
    R2SinglePageContentView.prototype.setLayout = function (isVert, isFxl) {
        this.isVertical = isVert;
        this.isFixedLayout = isFxl;
    };
    R2SinglePageContentView.prototype.element = function () {
        return this.iframeContainer;
    };
    R2SinglePageContentView.prototype.metaWidth = function () {
        return this.metaSize[0];
    };
    R2SinglePageContentView.prototype.metaHeight = function () {
        return this.metaSize[1];
    };
    R2SinglePageContentView.prototype.calculatedHeight = function () {
        return domUtils.height(this.iframeContainer);
    };
    R2SinglePageContentView.prototype.render = function () {
        this.iframeContainer = document.createElement('div');
        this.iframeScaler = document.createElement('div');
        this.iframe = document.createElement('iframe');
        this.iframeContainer.appendChild(this.iframeScaler);
        this.iframeScaler.appendChild(this.iframe);
        this.host.appendChild(this.iframeContainer);
        this.setupIframe();
        this.useReadiumCss = !this.isFixedLayout;
        this.useReadiumCssOverride = true;
    };
    R2SinglePageContentView.prototype.setViewSettings = function (viewSetting) {
        _super.prototype.setViewSettings.call(this, viewSetting);
        this.onResize();
    };
    R2SinglePageContentView.prototype.getOffsetFromCfi = function (cfi) {
        var offset = this.cfiNavLogic.getOffsetByCfi(cfi);
        if (offset === null) {
            return -1;
        }
        return this.isVertical ? offset[1] : offset[0];
    };
    R2SinglePageContentView.prototype.getOffsetFromElementId = function (cfi) {
        var offset = this.cfiNavLogic.getOffsetFromElementId(cfi);
        if (offset === null) {
            return -1;
        }
        return this.isVertical ? offset[1] : offset[0];
    };
    R2SinglePageContentView.prototype.getPageIndexOffsetFromCfi = function (cfi) {
        return 0;
    };
    R2SinglePageContentView.prototype.getPageIndexOffsetFromElementId = function (elementId) {
        return 0;
    };
    R2SinglePageContentView.prototype.getCfi = function (offsetMain, offset2nd, backward) {
        var left;
        var top;
        var right;
        var bottom;
        if (this.isVertical) {
            var size = this.getHostSize();
            left = offset2nd;
            top = offsetMain;
            if (backward && size) {
                top -= size[1];
            }
            right = left;
            bottom = top;
            if (size) {
                right += size[0];
                bottom += size[1];
            }
        }
        else {
            left = offsetMain;
            top = offset2nd;
            if (backward) {
                left -= this.metaWidth() * this.metaScale;
            }
            right = left + this.metaWidth() * this.metaScale;
            bottom = top + this.metaHeight() * this.metaScale;
        }
        var cfi = this.cfiNavLogic.getFirstVisibleCfi(new rect.Rect(left, top, right, bottom), backward);
        return cfi ? cfi : '';
    };
    R2SinglePageContentView.prototype.scale = function (scale) {
        this.transform(scale, 0, 0);
    };
    R2SinglePageContentView.prototype.spineItemPageCount = function () {
        return 1;
    };
    R2SinglePageContentView.prototype.onResize = function () {
        var contHeight = this.contentDocHeight();
        this.setHeight(contHeight);
    };
    R2SinglePageContentView.prototype.onIframeLoaded = function (success) {
        var epubContentDocument = this.iframe.contentDocument;
        if (epubContentDocument) {
            this.ePubHtml = epubContentDocument.querySelector('html');
            if (!this.ePubHtml) {
                this.ePubSvg = epubContentDocument.querySelector('svg');
            }
            else {
                this.ePubBody = this.ePubHtml.querySelector('body');
            }
        }
        this.ePubRoot = this.ePubHtml || this.ePubSvg;
        this.updateMetaSize();
        this.setViewSettings(this.vs);
        _super.prototype.onIframeLoaded.call(this, success);
        if (!this.isFixedLayout) {
            this.showIFrame();
        }
    };
    R2SinglePageContentView.prototype.contentDocHeight = function () {
        var win = this.iframe.contentWindow;
        var doc = this.iframe.contentDocument;
        if (win && doc && doc.documentElement) {
            return Math.round(domUtils.height(doc.documentElement, win));
        }
        if (this.ePubRoot) {
            console.error('getContentDocHeight ??');
            return domUtils.height(this.ePubRoot);
        }
        return 0;
    };
    R2SinglePageContentView.prototype.setHeight = function (h) {
        domUtils.setHeight(this.iframeScaler, h);
        domUtils.setHeight(this.iframeContainer, h);
    };
    R2SinglePageContentView.prototype.updateMetaSize = function () {
        var contentDocument = this.iframe.contentDocument;
        if (!contentDocument) {
            return;
        }
        var content;
        var viewport = contentDocument.querySelector('meta[name=viewport]');
        if (viewport) {
            content = viewport.getAttribute('content');
        }
        if (!content) {
            var viewbox = contentDocument.querySelector('meta[name=viewbox]');
            if (viewbox) {
                content = viewbox.getAttribute('content');
            }
        }
        var size;
        if (content) {
            size = this.parseMetaSize(content);
        }
        if (!size) {
            size = this.parseSvgSize(contentDocument);
        }
        if (size !== undefined) {
            this.metaSize = size;
        }
    };
    R2SinglePageContentView.prototype.parseMetaSize = function (content) {
        var pairs = content.replace(/\s/g, '').split(',');
        var width = Number.NaN;
        var height = Number.NaN;
        for (var _i = 0, pairs_1 = pairs; _i < pairs_1.length; _i++) {
            var pair = pairs_1[_i];
            var nameVal = pair.split('=');
            if (nameVal.length === 2) {
                if (nameVal[0] === 'width') {
                    width = parseInt(nameVal[1], 10);
                }
                if (nameVal[0] === 'height') {
                    height = parseInt(nameVal[1], 10);
                }
            }
        }
        if (!isNaN(width) && !isNaN(height)) {
            return [width, height];
        }
        return undefined;
    };
    R2SinglePageContentView.prototype.parseSvgSize = function (contentDoc) {
        var docElement = contentDoc.documentElement;
        if (!docElement || !docElement.nodeName || docElement.nodeName.toLowerCase() !== 'svg') {
            return undefined;
        }
        var width;
        var wAttr = docElement.getAttribute('width');
        var isWidthPercent = wAttr && wAttr.length >= 1 && wAttr[wAttr.length - 1] === '%';
        if (wAttr) {
            try {
                width = parseInt(wAttr, 10);
            }
            catch (err) {
                width = undefined;
            }
        }
        if (width && isWidthPercent) {
            width = undefined;
        }
        var height;
        var hAttr = docElement.getAttribute('height');
        var isHeightPercent = hAttr && hAttr.length >= 1 && hAttr[hAttr.length - 1] === '%';
        if (hAttr) {
            try {
                height = parseInt(hAttr, 10);
            }
            catch (err) {
                height = undefined;
            }
        }
        if (height && isHeightPercent) {
            height = undefined;
        }
        if (width && height) {
            return [width, height];
        }
        return undefined;
    };
    R2SinglePageContentView.prototype.transform = function (scale, left, top) {
        var _this = this;
        this.metaScale = scale;
        var elWidth = Math.ceil(this.metaSize[0] * scale);
        var elHeight = Math.floor(this.metaSize[1] * scale);
        this.iframeContainer.style.left = left + "px";
        this.iframeContainer.style.top = top + "px";
        this.iframeContainer.style.width = elWidth + "px";
        this.iframeContainer.style.height = elHeight + "px";
        var needsFixedLayoutScalerWorkAround = false;
        var scalerWidth = this.metaWidth();
        var scalerHeight = this.metaHeight();
        var scalerScale = scale;
        if (this.ePubBody // not SVG spine item (otherwise fails in Safari OSX)
            && needsFixedLayoutScalerWorkAround) {
            // See https://github.com/readium/readium-shared-js/issues/285
            if (this.ePubRoot) {
                this.ePubRoot.style.transform = "scale(" + scale + ")";
                this.ePubRoot.style.minWidth = this.metaWidth() + "px";
                this.ePubRoot.style.minHeight = this.metaHeight() + "px";
            }
            if (this.ePubBody) {
                this.ePubBody.style.width = this.metaWidth() + "px";
                this.ePubBody.style.height = this.metaHeight() + "px";
            }
            scalerWidth *= scale;
            scalerHeight *= scale;
            scalerScale = 1;
        }
        var transString = "scale(" + scalerScale + ")";
        this.iframeScaler.style.transform = transString;
        this.iframeScaler.style.width = scalerWidth + "px";
        this.iframeScaler.style.height = scalerHeight + "px";
        this.iframeScaler.style.transformOrigin = '0px 0px';
        // Chrome workaround: otherwise text is sometimes invisible
        // (probably a rendering glitch due to the 3D transform graphics backend?)
        // _$epubHtml.css("visibility", "hidden"); // "flashing" in two-page spread mode is annoying :(
        if (this.ePubRoot) {
            this.ePubRoot.style.opacity = '0.9999';
        }
        this.showIFrame();
        setTimeout(function () {
            if (_this.ePubRoot) {
                _this.ePubRoot.style.opacity = '1';
            }
        }, 0);
    };
    return R2SinglePageContentView;
}(r2ContentView.R2ContentView));
exports.R2SinglePageContentView = R2SinglePageContentView;
});

unwrapExports(r2SinglePageContentView);
var r2SinglePageContentView_1 = r2SinglePageContentView.R2SinglePageContentView;

var r2ContentViewFactory = createCommonjsModule(function (module, exports) {
exports.__esModule = true;



var R2ContentViewFactory = /** @class */ (function () {
    function R2ContentViewFactory(loader) {
        this.eleChecker = new elementChecker.ElementBlacklistedChecker([], [], []);
        this.iframeLoader = loader;
    }
    R2ContentViewFactory.prototype.setElementChecker = function (eleChecker) {
        this.eleChecker = eleChecker;
    };
    R2ContentViewFactory.prototype.createContentView = function (isFixedLayout, isVertical) {
        if (isFixedLayout || isVertical) {
            var cv = new r2SinglePageContentView.R2SinglePageContentView(this.iframeLoader, this.eleChecker);
            cv.setLayout(isVertical, isFixedLayout);
            return cv;
        }
        return new r2MultiPageContentView.R2MultiPageContentView(this.iframeLoader, this.eleChecker);
    };
    return R2ContentViewFactory;
}());
exports.R2ContentViewFactory = R2ContentViewFactory;
});

unwrapExports(r2ContentViewFactory);
var r2ContentViewFactory_1 = r2ContentViewFactory.R2ContentViewFactory;

var ReadiumGlue_payload_js_1 = "var ReadiumGlue = (function (exports) {\n    'use strict';\n\n    /*! *****************************************************************************\r\n    Copyright (c) Microsoft Corporation. All rights reserved.\r\n    Licensed under the Apache License, Version 2.0 (the \"License\"); you may not use\r\n    this file except in compliance with the License. You may obtain a copy of the\r\n    License at http://www.apache.org/licenses/LICENSE-2.0\r\n\r\n    THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY\r\n    KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED\r\n    WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,\r\n    MERCHANTABLITY OR NON-INFRINGEMENT.\r\n\r\n    See the Apache Version 2.0 License for specific language governing permissions\r\n    and limitations under the License.\r\n    ***************************************************************************** */\r\n    /* global Reflect, Promise */\r\n\r\n    var extendStatics = Object.setPrototypeOf ||\r\n        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||\r\n        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };\r\n\r\n    function __extends(d, b) {\r\n        extendStatics(d, b);\r\n        function __() { this.constructor = d; }\r\n        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());\r\n    }\r\n\r\n    function __awaiter(thisArg, _arguments, P, generator) {\r\n        return new (P || (P = Promise))(function (resolve, reject) {\r\n            function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }\r\n            function rejected(value) { try { step(generator[\"throw\"](value)); } catch (e) { reject(e); } }\r\n            function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }\r\n            step((generator = generator.apply(thisArg, _arguments || [])).next());\r\n        });\r\n    }\r\n\r\n    function __generator(thisArg, body) {\r\n        var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;\r\n        return g = { next: verb(0), \"throw\": verb(1), \"return\": verb(2) }, typeof Symbol === \"function\" && (g[Symbol.iterator] = function() { return this; }), g;\r\n        function verb(n) { return function (v) { return step([n, v]); }; }\r\n        function step(op) {\r\n            if (f) throw new TypeError(\"Generator is already executing.\");\r\n            while (_) try {\r\n                if (f = 1, y && (t = y[op[0] & 2 ? \"return\" : op[0] ? \"throw\" : \"next\"]) && !(t = t.call(y, op[1])).done) return t;\r\n                if (y = 0, t) op = [0, t.value];\r\n                switch (op[0]) {\r\n                    case 0: case 1: t = op; break;\r\n                    case 4: _.label++; return { value: op[1], done: false };\r\n                    case 5: _.label++; y = op[1]; op = [0]; continue;\r\n                    case 7: op = _.ops.pop(); _.trys.pop(); continue;\r\n                    default:\r\n                        if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }\r\n                        if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }\r\n                        if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }\r\n                        if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }\r\n                        if (t[2]) _.ops.pop();\r\n                        _.trys.pop(); continue;\r\n                }\r\n                op = body.call(thisArg, _);\r\n            } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }\r\n            if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };\r\n        }\r\n    }\n\n    var PROTOCOL_NAME = 'r2-glue-js';\r\n    var PROTOCOL_VERSION = '1.0.0';\r\n    var MessageType;\r\n    (function (MessageType) {\r\n        MessageType[\"Invoke\"] = \"invoke\";\r\n        MessageType[\"Return\"] = \"return\";\r\n        MessageType[\"Callback\"] = \"callback\";\r\n    })(MessageType || (MessageType = {}));\r\n    var messageCount = 0;\r\n    var Message = /** @class */ (function () {\r\n        function Message(namespace, type, key, value, correlationId) {\r\n            this.namespace = namespace;\r\n            this.type = type;\r\n            this.key = key;\r\n            this.value = value;\r\n            this.correlationId = correlationId || \"\" + messageCount; // uuid();\r\n            messageCount += 1;\r\n            this.protocol = PROTOCOL_NAME;\r\n            this.version = PROTOCOL_VERSION;\r\n        }\r\n        Message.validate = function (message) {\r\n            return !!message.protocol && message.protocol === PROTOCOL_NAME;\r\n        };\r\n        return Message;\r\n    }());\n\n    var Receiver = /** @class */ (function () {\r\n        function Receiver(namespace) {\r\n            var _this = this;\r\n            this.destroy = this.destroy.bind(this);\r\n            this.handler = function (event) {\r\n                var request = event.data;\r\n                if (!Message.validate(request) || request.namespace !== namespace) {\r\n                    return;\r\n                }\r\n                _this.processMessage(request, function (type, name, parameters) {\r\n                    if (!event.source) {\r\n                        return;\r\n                    }\r\n                    var sourceWindow = event.source;\r\n                    sourceWindow.postMessage(new Message(namespace, type, name, parameters, request.correlationId), event.origin);\r\n                });\r\n            };\r\n            window.addEventListener('message', this.handler);\r\n        }\r\n        Receiver.prototype.destroy = function () {\r\n            window.removeEventListener('message', this.handler);\r\n        };\r\n        return Receiver;\r\n    }());\n\n    var Dispatcher = /** @class */ (function (_super) {\r\n        __extends(Dispatcher, _super);\r\n        function Dispatcher(namespace, handlerType) {\r\n            var _this = _super.call(this, namespace) || this;\r\n            _this._handler = new handlerType();\r\n            return _this;\r\n        }\r\n        Dispatcher.prototype.processMessage = function (message, sendMessage) {\r\n            this._handleRequest(message, sendMessage);\r\n        };\r\n        Dispatcher.prototype._handleRequest = function (message, sendResponse) {\r\n            this._handler.declarations[message.key]\r\n                .apply(this._handler, [\r\n                function () {\r\n                    var callbackArgs = [];\r\n                    for (var _i = 0; _i < arguments.length; _i++) {\r\n                        callbackArgs[_i] = arguments[_i];\r\n                    }\r\n                    sendResponse(MessageType.Callback, message.key, callbackArgs);\r\n                }\r\n            ].concat(message.value))\r\n                .then(function (returnValue) { return sendResponse(MessageType.Return, message.key, returnValue); });\r\n        };\r\n        return Dispatcher;\r\n    }(Receiver));\n\n    var MessageHandler = /** @class */ (function () {\r\n        function MessageHandler() {\r\n        }\r\n        return MessageHandler;\r\n    }());\n\n    var AbstractEventManager = /** @class */ (function () {\r\n        function AbstractEventManager() {\r\n            this.lastEventID = 0;\r\n            this.registeredEventHandlers = {};\r\n        }\r\n        AbstractEventManager.prototype.getEventHandler = function (eventID) {\r\n            return this.registeredEventHandlers[eventID];\r\n        };\r\n        AbstractEventManager.prototype.generateEventID = function () {\r\n            return this.lastEventID += 1;\r\n        };\r\n        AbstractEventManager.prototype.addEventListener = function (eventType, callback, options) {\r\n            var id = this.generateEventID();\r\n            this.registeredEventHandlers[id] = {\r\n                eventType: eventType,\r\n                callback: callback,\r\n                options: options,\r\n            };\r\n            return id;\r\n        };\r\n        AbstractEventManager.prototype.removeEventListener = function (id) {\r\n            delete this.registeredEventHandlers[id];\r\n        };\r\n        return AbstractEventManager;\r\n    }());\n\n    var EventManager = /** @class */ (function (_super) {\r\n        __extends(EventManager, _super);\r\n        function EventManager() {\r\n            var _this = _super !== null && _super.apply(this, arguments) || this;\r\n            _this.registeredEventRemovers = {};\r\n            return _this;\r\n        }\r\n        EventManager.prototype.addEventListener = function (type, callback, options, resolvedTargets) {\r\n            var resolved = resolvedTargets;\r\n            if (!(resolved && resolved.length))\r\n                resolved = [window];\r\n            var listenerRemovers = resolved.map(function (resolvedTarget) {\r\n                resolvedTarget.addEventListener(type, callback, options);\r\n                return function () {\r\n                    resolvedTarget.removeEventListener(type, callback, options);\r\n                };\r\n            });\r\n            var id = _super.prototype.addEventListener.call(this, type, callback, options);\r\n            this.registeredEventRemovers[id] = listenerRemovers;\r\n            return id;\r\n        };\r\n        EventManager.prototype.removeEventListener = function (id) {\r\n            _super.prototype.removeEventListener.call(this, id);\r\n            var eventRemovers = this.registeredEventRemovers[id] || [];\r\n            eventRemovers.forEach(function (remove) {\r\n                remove();\r\n            });\r\n            delete this.registeredEventRemovers[id];\r\n        };\r\n        return EventManager;\r\n    }(AbstractEventManager));\n\n    var EventHandlingMessage;\r\n    (function (EventHandlingMessage) {\r\n        EventHandlingMessage[\"AddEventListener\"] = \"ADD_EVENT_LISTENER\";\r\n        EventHandlingMessage[\"RemoveEventListener\"] = \"REMOVE_EVENT_LISTENER\";\r\n    })(EventHandlingMessage || (EventHandlingMessage = {}));\n\n    var commonjsGlobal = typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};\n\n    function unwrapExports (x) {\n    \treturn x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x.default : x;\n    }\n\n    function createCommonjsModule(fn, module) {\n    \treturn module = { exports: {} }, fn(module, module.exports), module.exports;\n    }\n\n    /*! https://mths.be/cssesc v1.0.1 by @mathias */\n\n    var object = {};\n    var hasOwnProperty = object.hasOwnProperty;\n    var merge = function merge(options, defaults) {\n    \tif (!options) {\n    \t\treturn defaults;\n    \t}\n    \tvar result = {};\n    \tfor (var key in defaults) {\n    \t\t// `if (defaults.hasOwnProperty(key) { … }` is not needed here, since\n    \t\t// only recognized option names are used.\n    \t\tresult[key] = hasOwnProperty.call(options, key) ? options[key] : defaults[key];\n    \t}\n    \treturn result;\n    };\n\n    var regexAnySingleEscape = /[ -,\\.\\/;-@\\[-\\^`\\{-~]/;\n    var regexSingleEscape = /[ -,\\.\\/;-@\\[\\]\\^`\\{-~]/;\n    var regexExcessiveSpaces = /(^|\\\\+)?(\\\\[A-F0-9]{1,6})\\x20(?![a-fA-F0-9\\x20])/g;\n\n    // https://mathiasbynens.be/notes/css-escapes#css\n    var cssesc = function cssesc(string, options) {\n    \toptions = merge(options, cssesc.options);\n    \tif (options.quotes != 'single' && options.quotes != 'double') {\n    \t\toptions.quotes = 'single';\n    \t}\n    \tvar quote = options.quotes == 'double' ? '\"' : '\\'';\n    \tvar isIdentifier = options.isIdentifier;\n\n    \tvar firstChar = string.charAt(0);\n    \tvar output = '';\n    \tvar counter = 0;\n    \tvar length = string.length;\n    \twhile (counter < length) {\n    \t\tvar character = string.charAt(counter++);\n    \t\tvar codePoint = character.charCodeAt();\n    \t\tvar value = void 0;\n    \t\t// If it’s not a printable ASCII character…\n    \t\tif (codePoint < 0x20 || codePoint > 0x7E) {\n    \t\t\tif (codePoint >= 0xD800 && codePoint <= 0xDBFF && counter < length) {\n    \t\t\t\t// It’s a high surrogate, and there is a next character.\n    \t\t\t\tvar extra = string.charCodeAt(counter++);\n    \t\t\t\tif ((extra & 0xFC00) == 0xDC00) {\n    \t\t\t\t\t// next character is low surrogate\n    \t\t\t\t\tcodePoint = ((codePoint & 0x3FF) << 10) + (extra & 0x3FF) + 0x10000;\n    \t\t\t\t} else {\n    \t\t\t\t\t// It’s an unmatched surrogate; only append this code unit, in case\n    \t\t\t\t\t// the next code unit is the high surrogate of a surrogate pair.\n    \t\t\t\t\tcounter--;\n    \t\t\t\t}\n    \t\t\t}\n    \t\t\tvalue = '\\\\' + codePoint.toString(16).toUpperCase() + ' ';\n    \t\t} else {\n    \t\t\tif (options.escapeEverything) {\n    \t\t\t\tif (regexAnySingleEscape.test(character)) {\n    \t\t\t\t\tvalue = '\\\\' + character;\n    \t\t\t\t} else {\n    \t\t\t\t\tvalue = '\\\\' + codePoint.toString(16).toUpperCase() + ' ';\n    \t\t\t\t}\n    \t\t\t\t// Note: `:` could be escaped as `\\:`, but that fails in IE < 8.\n    \t\t\t} else if (/[\\t\\n\\f\\r\\x0B:]/.test(character)) {\n    \t\t\t\tif (!isIdentifier && character == ':') {\n    \t\t\t\t\tvalue = character;\n    \t\t\t\t} else {\n    \t\t\t\t\tvalue = '\\\\' + codePoint.toString(16).toUpperCase() + ' ';\n    \t\t\t\t}\n    \t\t\t} else if (character == '\\\\' || !isIdentifier && (character == '\"' && quote == character || character == '\\'' && quote == character) || isIdentifier && regexSingleEscape.test(character)) {\n    \t\t\t\tvalue = '\\\\' + character;\n    \t\t\t} else {\n    \t\t\t\tvalue = character;\n    \t\t\t}\n    \t\t}\n    \t\toutput += value;\n    \t}\n\n    \tif (isIdentifier) {\n    \t\tif (/^_/.test(output)) {\n    \t\t\t// Prevent IE6 from ignoring the rule altogether (in case this is for an\n    \t\t\t// identifier used as a selector)\n    \t\t\toutput = '\\\\_' + output.slice(1);\n    \t\t} else if (/^-[-\\d]/.test(output)) {\n    \t\t\toutput = '\\\\-' + output.slice(1);\n    \t\t} else if (/\\d/.test(firstChar)) {\n    \t\t\toutput = '\\\\3' + firstChar + ' ' + output.slice(1);\n    \t\t}\n    \t}\n\n    \t// Remove spaces after `\\HEX` escapes that are not followed by a hex digit,\n    \t// since they’re redundant. Note that this is only possible if the escape\n    \t// sequence isn’t preceded by an odd number of backslashes.\n    \toutput = output.replace(regexExcessiveSpaces, function ($0, $1, $2) {\n    \t\tif ($1 && $1.length % 2) {\n    \t\t\t// It’s not safe to remove the space, so don’t.\n    \t\t\treturn $0;\n    \t\t}\n    \t\t// Strip the space.\n    \t\treturn ($1 || '') + $2;\n    \t});\n\n    \tif (!isIdentifier && options.wrap) {\n    \t\treturn quote + output + quote;\n    \t}\n    \treturn output;\n    };\n\n    // Expose default options (so they can be overridden globally).\n    cssesc.options = {\n    \t'escapeEverything': false,\n    \t'isIdentifier': false,\n    \t'quotes': 'single',\n    \t'wrap': false\n    };\n\n    cssesc.version = '1.0.1';\n\n    var cssesc_1 = cssesc;\n\n    var dist = createCommonjsModule(function (module, exports) {\n    var __assign = (commonjsGlobal && commonjsGlobal.__assign) || function () {\n        __assign = Object.assign || function(t) {\n            for (var s, i = 1, n = arguments.length; i < n; i++) {\n                s = arguments[i];\n                for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))\n                    t[p] = s[p];\n            }\n            return t;\n        };\n        return __assign.apply(this, arguments);\n    };\n    var __generator = (commonjsGlobal && commonjsGlobal.__generator) || function (thisArg, body) {\n        var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;\n        return g = { next: verb(0), \"throw\": verb(1), \"return\": verb(2) }, typeof Symbol === \"function\" && (g[Symbol.iterator] = function() { return this; }), g;\n        function verb(n) { return function (v) { return step([n, v]); }; }\n        function step(op) {\n            if (f) throw new TypeError(\"Generator is already executing.\");\n            while (_) try {\n                if (f = 1, y && (t = op[0] & 2 ? y[\"return\"] : op[0] ? y[\"throw\"] || ((t = y[\"return\"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;\n                if (y = 0, t) op = [op[0] & 2, t.value];\n                switch (op[0]) {\n                    case 0: case 1: t = op; break;\n                    case 4: _.label++; return { value: op[1], done: false };\n                    case 5: _.label++; y = op[1]; op = [0]; continue;\n                    case 7: op = _.ops.pop(); _.trys.pop(); continue;\n                    default:\n                        if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }\n                        if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }\n                        if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }\n                        if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }\n                        if (t[2]) _.ops.pop();\n                        _.trys.pop(); continue;\n                }\n                op = body.call(thisArg, _);\n            } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }\n            if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };\n        }\n    };\n    var __values = (commonjsGlobal && commonjsGlobal.__values) || function (o) {\n        var m = typeof Symbol === \"function\" && o[Symbol.iterator], i = 0;\n        if (m) return m.call(o);\n        return {\n            next: function () {\n                if (o && i >= o.length) o = void 0;\n                return { value: o && o[i++], done: !o };\n            }\n        };\n    };\n    Object.defineProperty(exports, \"__esModule\", { value: true });\n\n    var Limit;\n    (function (Limit) {\n        Limit[Limit[\"All\"] = 0] = \"All\";\n        Limit[Limit[\"Two\"] = 1] = \"Two\";\n        Limit[Limit[\"One\"] = 2] = \"One\";\n    })(Limit || (Limit = {}));\n    var config;\n    var rootDocument;\n    function default_1(input, options) {\n        if (input.nodeType !== Node.ELEMENT_NODE) {\n            throw new Error(\"Can't generate CSS selector for non-element node type.\");\n        }\n        if ('html' === input.tagName.toLowerCase()) {\n            return input.tagName.toLowerCase();\n        }\n        var defaults = {\n            root: document.body,\n            idName: function (name) { return true; },\n            className: function (name) { return true; },\n            tagName: function (name) { return true; },\n            seedMinLength: 1,\n            optimizedMinLength: 2,\n            threshold: 1000,\n        };\n        config = __assign({}, defaults, options);\n        rootDocument = findRootDocument(config.root, defaults);\n        var path = bottomUpSearch(input, Limit.All, function () {\n            return bottomUpSearch(input, Limit.Two, function () {\n                return bottomUpSearch(input, Limit.One);\n            });\n        });\n        if (path) {\n            var optimized = sort(optimize(path, input));\n            if (optimized.length > 0) {\n                path = optimized[0];\n            }\n            return selector(path);\n        }\n        else {\n            throw new Error(\"Selector was not found.\");\n        }\n    }\n    exports.default = default_1;\n    function findRootDocument(rootNode, defaults) {\n        if (rootNode.nodeType === Node.DOCUMENT_NODE) {\n            return rootNode;\n        }\n        if (rootNode === defaults.root) {\n            return rootNode.ownerDocument;\n        }\n        return rootNode;\n    }\n    function bottomUpSearch(input, limit, fallback) {\n        var path = null;\n        var stack = [];\n        var current = input;\n        var i = 0;\n        var _loop_1 = function () {\n            var level = maybe(id(current)) || maybe.apply(void 0, classNames(current)) || maybe(tagName(current)) || [any()];\n            var nth = index(current);\n            if (limit === Limit.All) {\n                if (nth) {\n                    level = level.concat(level.filter(dispensableNth).map(function (node) { return nthChild(node, nth); }));\n                }\n            }\n            else if (limit === Limit.Two) {\n                level = level.slice(0, 1);\n                if (nth) {\n                    level = level.concat(level.filter(dispensableNth).map(function (node) { return nthChild(node, nth); }));\n                }\n            }\n            else if (limit === Limit.One) {\n                var node = (level = level.slice(0, 1))[0];\n                if (nth && dispensableNth(node)) {\n                    level = [nthChild(node, nth)];\n                }\n            }\n            for (var _i = 0, level_1 = level; _i < level_1.length; _i++) {\n                var node = level_1[_i];\n                node.level = i;\n            }\n            stack.push(level);\n            if (stack.length >= config.seedMinLength) {\n                path = findUniquePath(stack, fallback);\n                if (path) {\n                    return \"break\";\n                }\n            }\n            current = current.parentElement;\n            i++;\n        };\n        while (current && current !== config.root.parentElement) {\n            var state_1 = _loop_1();\n            if (state_1 === \"break\")\n                break;\n        }\n        if (!path) {\n            path = findUniquePath(stack, fallback);\n        }\n        return path;\n    }\n    function findUniquePath(stack, fallback) {\n        var paths = sort(combinations(stack));\n        if (paths.length > config.threshold) {\n            return fallback ? fallback() : null;\n        }\n        for (var _i = 0, paths_1 = paths; _i < paths_1.length; _i++) {\n            var candidate = paths_1[_i];\n            if (unique(candidate)) {\n                return candidate;\n            }\n        }\n        return null;\n    }\n    function selector(path) {\n        var node = path[0];\n        var query = node.name;\n        for (var i = 1; i < path.length; i++) {\n            var level = path[i].level || 0;\n            if (node.level === level - 1) {\n                query = path[i].name + \" > \" + query;\n            }\n            else {\n                query = path[i].name + \" \" + query;\n            }\n            node = path[i];\n        }\n        return query;\n    }\n    function penalty(path) {\n        return path.map(function (node) { return node.penalty; }).reduce(function (acc, i) { return acc + i; }, 0);\n    }\n    function unique(path) {\n        switch (rootDocument.querySelectorAll(selector(path)).length) {\n            case 0:\n                throw new Error(\"Can't select any node with this selector: \" + selector(path));\n            case 1:\n                return true;\n            default:\n                return false;\n        }\n    }\n    function id(input) {\n        var elementId = input.getAttribute('id');\n        if (elementId && config.idName(elementId)) {\n            return {\n                name: '#' + cssesc_1(elementId, { isIdentifier: true }),\n                penalty: 0,\n            };\n        }\n        return null;\n    }\n    function classNames(input) {\n        var names = Array.from(input.classList)\n            .filter(config.className);\n        return names.map(function (name) { return ({\n            name: '.' + cssesc_1(name, { isIdentifier: true }),\n            penalty: 1\n        }); });\n    }\n    function tagName(input) {\n        var name = input.tagName.toLowerCase();\n        if (config.tagName(name)) {\n            return {\n                name: name,\n                penalty: 2\n            };\n        }\n        return null;\n    }\n    function any() {\n        return {\n            name: '*',\n            penalty: 3\n        };\n    }\n    function index(input) {\n        var parent = input.parentNode;\n        if (!parent) {\n            return null;\n        }\n        var child = parent.firstChild;\n        if (!child) {\n            return null;\n        }\n        var i = 0;\n        while (child) {\n            if (child.nodeType === Node.ELEMENT_NODE) {\n                i++;\n            }\n            if (child === input) {\n                break;\n            }\n            child = child.nextSibling;\n        }\n        return i;\n    }\n    function nthChild(node, i) {\n        return {\n            name: node.name + (\":nth-child(\" + i + \")\"),\n            penalty: node.penalty + 1\n        };\n    }\n    function dispensableNth(node) {\n        return node.name !== 'html' && !node.name.startsWith('#');\n    }\n    function maybe() {\n        var level = [];\n        for (var _i = 0; _i < arguments.length; _i++) {\n            level[_i] = arguments[_i];\n        }\n        var list = level.filter(notEmpty);\n        if (list.length > 0) {\n            return list;\n        }\n        return null;\n    }\n    function notEmpty(value) {\n        return value !== null && value !== undefined;\n    }\n    function combinations(stack, path) {\n        var _i, _a, node;\n        if (path === void 0) { path = []; }\n        return __generator(this, function (_b) {\n            switch (_b.label) {\n                case 0:\n                    if (!(stack.length > 0)) return [3 /*break*/, 5];\n                    _i = 0, _a = stack[0];\n                    _b.label = 1;\n                case 1:\n                    if (!(_i < _a.length)) return [3 /*break*/, 4];\n                    node = _a[_i];\n                    return [5 /*yield**/, __values(combinations(stack.slice(1, stack.length), path.concat(node)))];\n                case 2:\n                    _b.sent();\n                    _b.label = 3;\n                case 3:\n                    _i++;\n                    return [3 /*break*/, 1];\n                case 4: return [3 /*break*/, 7];\n                case 5: return [4 /*yield*/, path];\n                case 6:\n                    _b.sent();\n                    _b.label = 7;\n                case 7: return [2 /*return*/];\n            }\n        });\n    }\n    function sort(paths) {\n        return Array.from(paths).sort(function (a, b) { return penalty(a) - penalty(b); });\n    }\n    function optimize(path, input) {\n        var i, newPath;\n        return __generator(this, function (_a) {\n            switch (_a.label) {\n                case 0:\n                    if (!(path.length > 2 && path.length > config.optimizedMinLength)) return [3 /*break*/, 5];\n                    i = 1;\n                    _a.label = 1;\n                case 1:\n                    if (!(i < path.length - 1)) return [3 /*break*/, 5];\n                    newPath = path.slice();\n                    newPath.splice(i, 1);\n                    if (!(unique(newPath) && same(newPath, input))) return [3 /*break*/, 4];\n                    return [4 /*yield*/, newPath];\n                case 2:\n                    _a.sent();\n                    return [5 /*yield**/, __values(optimize(newPath, input))];\n                case 3:\n                    _a.sent();\n                    _a.label = 4;\n                case 4:\n                    i++;\n                    return [3 /*break*/, 1];\n                case 5: return [2 /*return*/];\n            }\n        });\n    }\n    function same(path, input) {\n        return rootDocument.querySelector(selector(path)) === input;\n    }\n\n    });\n\n    var finder = unwrapExports(dist);\n\n    // tslint:enable\r\n    function isEventTarget(input) {\r\n        return !!(input.addEventListener && input.removeEventListener && input.dispatchEvent);\r\n    }\r\n    function resolveEventTargetSelector(selector) {\r\n        if (selector === '@window') {\r\n            return [window];\r\n        }\r\n        if (selector === '@document') {\r\n            return [document];\r\n        }\r\n        return Array.from(document.querySelectorAll(selector));\r\n    }\r\n    function generateEventTargetSelector(eventTarget) {\r\n        if (eventTarget === window) {\r\n            return '@window';\r\n        }\r\n        if (eventTarget === document) {\r\n            return '@document';\r\n        }\r\n        if (eventTarget instanceof Element) {\r\n            // Generate a CSS selector for the Element\r\n            return finder(eventTarget);\r\n        }\r\n    }\r\n    // tslint:disable\r\n    // Grabbed from:\r\n    //   https://gist.github.com/leofavre/d029cdda0338d878889ba73c88319295\r\n    /**\r\n     * Returns an array with all DOM elements affected by an event.\r\n     * The function serves as a polyfill for\r\n     * [`Event.composedPath()`](https://dom.spec.whatwg.org/#dom-event-composedpath).\r\n     *\r\n     * @category Event\r\n     * @param {Event} evt The triggered event.\r\n     * @return {Array.<HTMLElement>} The DOM elements affected by the event.\r\n     *\r\n     * @example\r\n     * let domChild = document.createElement(\"div\"),\r\n     * \tdomParent = document.createElement(\"div\"),\r\n     * \tdomGrandparent = document.createElement(\"div\"),\r\n     * \tbody = document.body,\r\n     * \thtml = document.querySelector(\"html\");\r\n     *\r\n     * domParent.appendChild(domChild);\r\n     * domGrandparent.appendChild(domParent);\r\n     * body.appendChild(domGrandparent);\r\n     *\r\n     * domChild.addEventListener(\"click\", dealWithClick);\r\n     * const dealWithClick = evt => getEventPath(evt);\r\n     *\r\n     * // when domChild is clicked:\r\n     * // => [domChild, domParent, domGrandparent, body, html, document, window]\r\n     */\r\n    function eventPath(evt) {\r\n        var path = (evt.composedPath && evt.composedPath()) || evt.path, target = evt.target;\r\n        if (path != null) {\r\n            // Safari doesn't include Window, and it should.\r\n            path = (path.indexOf(window) < 0) ? path.concat([window]) : path;\r\n            return path;\r\n        }\r\n        if (target === window) {\r\n            return [window];\r\n        }\r\n        function getParents(node, memo) {\r\n            memo = memo || [];\r\n            var parentNode = node.parentNode;\r\n            if (!parentNode) {\r\n                return memo;\r\n            }\r\n            else {\r\n                return getParents(parentNode, memo.concat([parentNode]));\r\n            }\r\n        }\r\n        return [target]\r\n            .concat(getParents(target))\r\n            .concat([window]);\r\n    }\r\n    // tslint:enable\n\n    var EVENT_PROPERTIES = [\r\n        'type',\r\n        'target',\r\n        'currentTarget',\r\n        'eventPhase',\r\n        'bubbles',\r\n        'cancelable',\r\n        'defaultPrevented',\r\n        'composed',\r\n        'timeStamp',\r\n        'srcElement',\r\n        'returnValue',\r\n        'cancelBubble',\r\n        'path',\r\n        'composedPath',\r\n    ];\r\n    var UI_EVENT_PROPERTIES = ['view', 'detail'];\r\n    function marshalEvent(event, enumeratedProperties) {\r\n        if (enumeratedProperties === void 0) { enumeratedProperties = []; }\r\n        var propertiesToEnumerate = EVENT_PROPERTIES.concat(enumeratedProperties);\r\n        if (event instanceof UIEvent) {\r\n            propertiesToEnumerate = enumeratedProperties.concat(UI_EVENT_PROPERTIES);\r\n        }\r\n        var eventObject = {};\r\n        propertiesToEnumerate.forEach(function (key) {\r\n            eventObject[key] = event[key];\r\n        });\r\n        return marshalObject(eventObject);\r\n    }\r\n    function marshalObject(obj) {\r\n        return JSON.parse(JSON.stringify(obj, function (key, value) {\r\n            if (isEventTarget(value)) {\r\n                return generateEventTargetSelector(value);\r\n            }\r\n            return value;\r\n        }));\r\n    }\n\n    var EventHandler = /** @class */ (function (_super) {\r\n        __extends(EventHandler, _super);\r\n        function EventHandler() {\r\n            var _a;\r\n            var _this = _super !== null && _super.apply(this, arguments) || this;\r\n            _this.declarations = (_a = {},\r\n                _a[EventHandlingMessage.AddEventListener] = _this._addEventListener,\r\n                _a[EventHandlingMessage.RemoveEventListener] = _this._removeEventListener,\r\n                _a);\r\n            _this.eventManager = new EventManager();\r\n            return _this;\r\n        }\r\n        EventHandler.prototype.createHandler = function (callback, properties, options) {\r\n            return function (event) {\r\n                if (options.preventDefault) {\r\n                    event.preventDefault();\r\n                }\r\n                if (options.stopPropagation) {\r\n                    event.stopPropagation();\r\n                }\r\n                if (options.stopImmediatePropagation) {\r\n                    event.stopImmediatePropagation();\r\n                }\r\n                callback(marshalEvent(event, properties));\r\n            };\r\n        };\r\n        EventHandler.prototype._addEventListener = function (callback, target, eventType, properties, options) {\r\n            return __awaiter(this, void 0, void 0, function () {\r\n                var targets, handler;\r\n                return __generator(this, function (_a) {\r\n                    targets = resolveEventTargetSelector(target);\r\n                    handler = this.createHandler(callback, properties, options);\r\n                    return [2 /*return*/, this.eventManager.addEventListener(eventType, handler, options, targets)];\r\n                });\r\n            });\r\n        };\r\n        EventHandler.prototype._removeEventListener = function (_a, listenerID) {\r\n            return __awaiter(this, void 0, void 0, function () {\r\n                return __generator(this, function (_b) {\r\n                    this.eventManager.removeEventListener(listenerID);\r\n                    return [2 /*return*/];\r\n                });\r\n            });\r\n        };\r\n        return EventHandler;\r\n    }(MessageHandler));\n\n    var index = new Dispatcher('event-handling', EventHandler);\n\n    var KeyHandlingMessage;\r\n    (function (KeyHandlingMessage) {\r\n        KeyHandlingMessage[\"AddKeyEventListener\"] = \"ADD_KEY_EVENT_LISTENER\";\r\n        KeyHandlingMessage[\"RemoveKeyEventListener\"] = \"REMOVE_KEY_EVENT_LISTENER\";\r\n    })(KeyHandlingMessage || (KeyHandlingMessage = {}));\n\n    var KEYBOARD_EVENT_PROPERTIES = [\r\n        'key',\r\n        'code',\r\n        'location',\r\n        'ctrlKey',\r\n        'shiftKey',\r\n        'altKey',\r\n        'metaKey',\r\n        'isComposing',\r\n    ];\r\n    var KeyHandler = /** @class */ (function (_super) {\r\n        __extends(KeyHandler, _super);\r\n        function KeyHandler() {\r\n            var _a;\r\n            var _this = _super.call(this) || this;\r\n            _this.declarations = (_a = {},\r\n                _a[KeyHandlingMessage.AddKeyEventListener] = _this._addEventListener,\r\n                _a[KeyHandlingMessage.RemoveKeyEventListener] = _this._removeEventListener,\r\n                _a);\r\n            _this.registeredKeyHandlers = {};\r\n            _this.registeredKeyCodes = {};\r\n            _this.lastUsedID = 0;\r\n            _this.eventManager = new EventManager();\r\n            var keyboardEventHandler = _this._createEventHandler();\r\n            var options = { useCapture: true };\r\n            _this.eventManager.addEventListener('keydown', keyboardEventHandler, options);\r\n            _this.eventManager.addEventListener('keypress', keyboardEventHandler, options);\r\n            _this.eventManager.addEventListener('keyup', keyboardEventHandler, options);\r\n            return _this;\r\n        }\r\n        KeyHandler.prototype._createEventHandler = function () {\r\n            var _this = this;\r\n            return function (event) {\r\n                if (event.defaultPrevented) {\r\n                    // Skip if event is already handled\r\n                    return;\r\n                }\r\n                var matchingKeyCodeSet = _this.registeredKeyCodes[event.key] || [];\r\n                matchingKeyCodeSet.forEach(function (listenerID) {\r\n                    var handlerInfo = _this.registeredKeyHandlers[listenerID] || {};\r\n                    if (handlerInfo.eventType !== event.type) {\r\n                        return;\r\n                    }\r\n                    if (handlerInfo.options && handlerInfo.options.preventDefault) {\r\n                        event.preventDefault();\r\n                    }\r\n                    handlerInfo.callback(marshalEvent(event, KEYBOARD_EVENT_PROPERTIES));\r\n                });\r\n            };\r\n        };\r\n        KeyHandler.prototype._addEventListener = function (callback, target, eventType, keyCode, options) {\r\n            return __awaiter(this, void 0, void 0, function () {\r\n                var id;\r\n                return __generator(this, function (_a) {\r\n                    this.lastUsedID = this.lastUsedID + 1;\r\n                    id = this.lastUsedID;\r\n                    if (!this.registeredKeyHandlers[id]) {\r\n                        this.registeredKeyHandlers[id] = { eventType: eventType, callback: callback, options: options };\r\n                    }\r\n                    if (!this.registeredKeyCodes[keyCode]) {\r\n                        this.registeredKeyCodes[keyCode] = [];\r\n                    }\r\n                    this.registeredKeyCodes[keyCode].push(id);\r\n                    return [2 /*return*/, this.lastUsedID];\r\n                });\r\n            });\r\n        };\r\n        KeyHandler.prototype._removeEventListener = function (_a, listenerID) {\r\n            return __awaiter(this, void 0, void 0, function () {\r\n                var obj, _i, _b, key, index;\r\n                return __generator(this, function (_c) {\r\n                    delete this.registeredKeyHandlers[listenerID];\r\n                    obj = this.registeredKeyCodes;\r\n                    for (_i = 0, _b = Object.keys(obj); _i < _b.length; _i++) {\r\n                        key = _b[_i];\r\n                        index = obj[key].indexOf(listenerID);\r\n                        if (index >= 0) {\r\n                            obj[key].splice(index, 1);\r\n                            break;\r\n                        }\r\n                    }\r\n                    return [2 /*return*/];\r\n                });\r\n            });\r\n        };\r\n        return KeyHandler;\r\n    }(MessageHandler));\n\n    var index$1 = new Dispatcher('key-handling', KeyHandler);\n\n    var LinkHandler = /** @class */ (function (_super) {\r\n        __extends(LinkHandler, _super);\r\n        function LinkHandler() {\r\n            return _super !== null && _super.apply(this, arguments) || this;\r\n        }\r\n        LinkHandler.prototype.createHandler = function (callback, properties, options) {\r\n            return function (event) {\r\n                var path = eventPath(event);\r\n                var i = 0;\r\n                var length = path.length;\r\n                var anchor = null;\r\n                // tslint:disable-next-line:no-increment-decrement\r\n                for (i; i < length; i++) {\r\n                    if (path[i].tagName === 'a')\r\n                        anchor = path[i];\r\n                }\r\n                if (!anchor)\r\n                    return;\r\n                var href = anchor && anchor.href;\r\n                if (!href)\r\n                    return;\r\n                event.preventDefault();\r\n                event.stopPropagation();\r\n                if (options.stopImmediatePropagation) {\r\n                    event.stopImmediatePropagation();\r\n                }\r\n                var newHref = { href: anchor.href };\r\n                var obj = marshalObject(newHref);\r\n                callback(obj);\r\n            };\r\n        };\r\n        return LinkHandler;\r\n    }(EventHandler));\n\n    var index$2 = new Dispatcher('link-handling', LinkHandler);\n\n    function createRangeData(range) {\r\n        // Ensure we don't use the Text node, so that it can be properly stringified later on\r\n        var startContainer = range.startContainer instanceof Text ?\r\n            range.startContainer.parentElement : range.startContainer;\r\n        var endContainer = range.endContainer instanceof Text ?\r\n            range.endContainer.parentElement : range.endContainer;\r\n        var startContainerPath = getElementPath(startContainer);\r\n        var endContainerPath = getElementPath(endContainer);\r\n        var rangeData = {\r\n            startOffset: range.startOffset,\r\n            startContainer: startContainerPath,\r\n            endOffset: range.endOffset,\r\n            endContainer: endContainerPath,\r\n        };\r\n        return rangeData;\r\n    }\r\n    function createRangeFromSelection(selection) {\r\n        return createRange(selection.anchorNode, selection.anchorOffset, selection.focusNode, selection.focusOffset);\r\n    }\r\n    function createRangeFromRangeData(rangeData) {\r\n        var startSelector = createSelectorFromStringArray(rangeData.startContainer);\r\n        var endSelector = createSelectorFromStringArray(rangeData.endContainer);\r\n        var startContainer = document.querySelector(startSelector);\r\n        var endContainer = document.querySelector(endSelector);\r\n        if (!startContainer || !endContainer) {\r\n            console.error('Element was not successfully retrieved with selector');\r\n            return new Range();\r\n        }\r\n        startContainer = getTextNode(startContainer);\r\n        endContainer = getTextNode(endContainer);\r\n        return createRange(startContainer, rangeData.startOffset, endContainer, rangeData.endOffset);\r\n    }\r\n    function createSelectorFromStringArray(array) {\r\n        var selector = '';\r\n        var value = '';\r\n        for (var i = array.length - 1; i >= 0; i -= 1) {\r\n            value = array[i];\r\n            // Ignore custom selectors, such as @window and @document\r\n            if (value.includes('@'))\r\n                continue;\r\n            if (selector.length !== 0)\r\n                selector += ' ';\r\n            selector += value;\r\n        }\r\n        return selector;\r\n    }\r\n    function createRange(startContainer, startOffset, endContainer, endOffset) {\r\n        var range = new Range();\r\n        var position = startContainer.compareDocumentPosition(endContainer);\r\n        var isBackwards = false;\r\n        if (position === 0) {\r\n            isBackwards = startOffset > endOffset;\r\n        }\r\n        if (position === startContainer.DOCUMENT_POSITION_PRECEDING) {\r\n            isBackwards = true;\r\n        }\r\n        var sc = isBackwards ? endContainer : startContainer;\r\n        var so = isBackwards ? endOffset : startOffset;\r\n        var ec = isBackwards ? startContainer : endContainer;\r\n        var eo = isBackwards ? startOffset : endOffset;\r\n        range.setStart(sc, so);\r\n        range.setEnd(ec, eo);\r\n        return range;\r\n    }\r\n    function getTextNode(element) {\r\n        var nodes = element.childNodes;\r\n        var node;\r\n        var textNode = undefined;\r\n        for (var i = 0; i < nodes.length; i += 1) {\r\n            node = nodes[i];\r\n            if (node.nodeType === Node.TEXT_NODE) {\r\n                textNode = node;\r\n                break;\r\n            }\r\n        }\r\n        return textNode;\r\n    }\r\n    function getElementPath(element, elements) {\r\n        var els = elements;\r\n        if (!els) {\r\n            els = [];\r\n        }\r\n        els.push(element);\r\n        var parentEl = element.parentElement;\r\n        // If a parent element exists, run this method again with that parent element\r\n        // Otherwise, return the elements with document and window appended to it\r\n        return parentEl ? getElementPath(parentEl, els) : addDocumentAndWindowToPath(els);\r\n    }\r\n    function addDocumentAndWindowToPath(elements) {\r\n        elements.push(document);\r\n        elements.push(window);\r\n        return elements;\r\n    }\n\n    var SelectionHandler = /** @class */ (function (_super) {\r\n        __extends(SelectionHandler, _super);\r\n        function SelectionHandler() {\r\n            return _super !== null && _super.apply(this, arguments) || this;\r\n        }\r\n        SelectionHandler.prototype.createHandler = function (callback, properties, options) {\r\n            return function (event) {\r\n                event.preventDefault();\r\n                if (options.stopPropagation) {\r\n                    event.stopPropagation();\r\n                }\r\n                if (options.stopImmediatePropagation) {\r\n                    event.stopImmediatePropagation();\r\n                }\r\n                var selection = window.getSelection();\r\n                var text = selection.toString();\r\n                var isEmpty = text.trim().length === 0;\r\n                if (isEmpty)\r\n                    return;\r\n                var range = createRangeFromSelection(selection);\r\n                selection.removeAllRanges();\r\n                selection.addRange(range);\r\n                var rangeData = createRangeData(range);\r\n                var obj = { text: text, rangeData: rangeData };\r\n                var ret = marshalObject(obj);\r\n                callback(ret);\r\n            };\r\n        };\r\n        return SelectionHandler;\r\n    }(EventHandler));\n\n    var index$3 = new Dispatcher('selection-handling', SelectionHandler);\n\n    var EventHandlingMessage$1;\r\n    (function (EventHandlingMessage) {\r\n        EventHandlingMessage[\"CreateHighlight\"] = \"CREATE_HIGHLIGHT\";\r\n    })(EventHandlingMessage$1 || (EventHandlingMessage$1 = {}));\n\n    var Highlighter = /** @class */ (function (_super) {\r\n        __extends(Highlighter, _super);\r\n        function Highlighter() {\r\n            var _a;\r\n            var _this = _super !== null && _super.apply(this, arguments) || this;\r\n            _this.declarations = (_a = {},\r\n                _a[EventHandlingMessage$1.CreateHighlight] = _this._createHighlight,\r\n                _a);\r\n            return _this;\r\n        }\r\n        Highlighter.prototype._createHighlight = function (callback, rangeData, options) {\r\n            return __awaiter(this, void 0, void 0, function () {\r\n                var range, highlights, clientRect, highlight;\r\n                return __generator(this, function (_a) {\r\n                    range = createRangeFromRangeData(rangeData);\r\n                    highlights = document.getElementById('highlights');\r\n                    if (!highlights)\r\n                        highlights = this._createHighlightContainer();\r\n                    clientRect = range.getBoundingClientRect();\r\n                    highlight = this._createHighlightDiv(clientRect);\r\n                    highlights.append(highlight);\r\n                    return [2 /*return*/, 1];\r\n                });\r\n            });\r\n        };\r\n        Highlighter.prototype._createHighlightContainer = function () {\r\n            var div = document.createElement('div');\r\n            div.setAttribute('id', 'highlights');\r\n            document.body.prepend(div);\r\n            return div;\r\n        };\r\n        Highlighter.prototype._createHighlightDiv = function (clientRect) {\r\n            var highlight = document.createElement('div');\r\n            highlight.style.setProperty('position', 'absolute');\r\n            highlight.style.setProperty('background', 'rgba(220, 255, 15, 0.40)');\r\n            highlight.style.setProperty('width', clientRect.width + \"px\");\r\n            highlight.style.setProperty('height', clientRect.height + \"px\");\r\n            highlight.style.setProperty('left', clientRect.left + \"px\");\r\n            highlight.style.setProperty('top', clientRect.top + \"px\");\r\n            return highlight;\r\n        };\r\n        return Highlighter;\r\n    }(MessageHandler));\n\n    var index$4 = new Dispatcher('highlighting', Highlighter);\n\n    exports.eventHandling = index;\n    exports.keyHandling = index$1;\n    exports.linkHandling = index$2;\n    exports.selectionHandling = index$3;\n    exports.highlighting = index$4;\n\n    return exports;\n\n}({}));\n//# sourceMappingURL=ReadiumGlue-payload.js.map\n";

var iframeLoader = createCommonjsModule(function (module, exports) {
var __awaiter = (commonjsGlobal && commonjsGlobal.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (commonjsGlobal && commonjsGlobal.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;

// @ts-ignore
// tslint:disable-next-line:no-submodule-imports

var IFrameLoader = /** @class */ (function () {
    function IFrameLoader(publicationURI) {
        this.loaderEvents = {};
        this.publicationURI = publicationURI;
        this.isIE =
            window.navigator.userAgent.indexOf('Trident') > 0 ||
                window.navigator.userAgent.indexOf('Edge') > 0;
    }
    IFrameLoader.prototype.setReadiumCssBasePath = function (path) {
        this.readiumCssBasePath = path;
    };
    IFrameLoader.prototype.addIFrameLoadedListener = function (callback) {
        var eventName = 'iframeLoaded';
        var events = this.loaderEvents[eventName] || [];
        events.push(callback);
        this.loaderEvents[eventName] = events;
    };
    IFrameLoader.prototype.loadIframe = function (iframe, src, 
    // tslint:disable-next-line:no-any
    callback, config, 
    // tslint:disable-next-line:no-any
    attachedData) {
        var _this = this;
        var baseURI = this.publicationURI || iframe.baseURI || document.baseURI || location.href;
        iframe.setAttribute('data-baseUri', baseURI);
        iframe.setAttribute('data-src', src);
        var contentUri = new module$1.URL(src, baseURI).toString();
        var contentType = 'text/html';
        // tslint:disable-next-line:no-any
        if ((attachedData).spineItem !== undefined) {
            var data = (attachedData);
            if (data.spineItem.media_type && data.spineItem.media_type.length) {
                contentType = data.spineItem.media_type;
            }
        }
        else {
            contentType = (attachedData);
        }
        this.fetchContentDocument(contentUri).then(function (contentData) {
            _this.loadIframeWithDocument(iframe, contentUri, contentData, contentType, config, callback);
        });
    };
    IFrameLoader.prototype.fetchContentDocument = function (src) {
        return __awaiter(this, void 0, void 0, function () {
            var resp;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, fetch(src)];
                    case 1:
                        resp = _a.sent();
                        return [2 /*return*/, resp.text()];
                }
            });
        });
    };
    IFrameLoader.prototype.inject = function (sourceText, contentType, href, config) {
        var parser = new DOMParser();
        // @ts-ignore
        var doc = parser.parseFromString(sourceText, (contentType));
        var headElement = doc.querySelector('head');
        if (!doc.documentElement || !headElement) {
            // No head element.. not a valid (X)HTML document?
            // Then just return the original source
            return sourceText;
        }
        this.injectBaseHref(doc, headElement, href);
        if (config.useReadiumCss === true) {
            var useOverride = config.useReadiumCssOverride === true;
            this.injectReadiumCss(headElement, useOverride);
        }
        this.injectReadiumGlue(doc, headElement);
        if (contentType.includes('xml')) {
            return new XMLSerializer().serializeToString(doc);
        }
        if (!doc.documentElement) {
            return '';
        }
        return doc.documentElement.outerHTML;
    };
    IFrameLoader.prototype.injectBaseHref = function (doc, headEle, href) {
        var baseElement = doc.createElement('base');
        baseElement.href = href;
        headEle.insertBefore(baseElement, headEle.firstChild);
    };
    IFrameLoader.prototype.injectReadiumCss = function (headEle, useOverride) {
        if (!this.readiumCssBasePath) {
            return;
        }
        var beforeCss = this.creatCssLink(this.readiumCssBasePath + "/ReadiumCSS-before.css");
        var defaultCss = this.creatCssLink(this.readiumCssBasePath + "/ReadiumCSS-default.css");
        var afterCss = this.creatCssLink(this.readiumCssBasePath + "/ReadiumCSS-after.css");
        // Need to insert before any node except <base>
        var refNode = null;
        if (headEle.firstChild) {
            // firstChild should be <base>
            refNode = headEle.firstChild.nextSibling;
        }
        headEle.insertBefore(beforeCss, refNode);
        headEle.insertBefore(defaultCss, refNode);
        headEle.insertBefore(afterCss, refNode);
        if (useOverride) {
            var overrideCss = this.creatCssLink(this.readiumCssBasePath + "/ReadiumCSS-override.css");
            headEle.insertBefore(overrideCss, refNode);
        }
    };
    IFrameLoader.prototype.injectReadiumGlue = function (doc, headEle) {
        // This lives within the iframe
        var payload = this.createJSElement(ReadiumGlue_payload_js_1["default"]);
        headEle.appendChild(payload);
    };
    IFrameLoader.prototype.creatCssLink = function (href) {
        var cssLink = document.createElement('link');
        cssLink.rel = 'stylesheet';
        cssLink.type = 'text/css';
        cssLink.href = href;
        return cssLink;
    };
    IFrameLoader.prototype.createJSElement = function (href) {
        var el = document.createElement('script');
        el.setAttribute('type', 'text/javascript');
        var blob = new Blob([href], { type: 'application/javascript' });
        var url = window.URL.createObjectURL(blob);
        el.setAttribute('src', url);
        return el;
    };
    IFrameLoader.prototype.iframeLoaded = function (iframe) {
        var eventCbs = this.loaderEvents.iframeLoaded;
        if (!eventCbs)
            return;
        eventCbs.forEach(function (eventCb) { return eventCb(iframe); });
    };
    IFrameLoader.prototype.loadIframeWithDocument = function (iframe, contentDocumentURI, contentDocumentData, contentType, config, 
    // tslint:disable-next-line:no-any
    callback) {
        var _this = this;
        var documentDataUri = '';
        if (!this.isIE) {
            var basedContentData = this.inject(contentDocumentData, contentType, new module$1.URL(contentDocumentURI, iframe.baseURI || document.baseURI || location.href).href, config);
            documentDataUri = window.URL.createObjectURL(new Blob([basedContentData], { type: contentType }));
        }
        else if (iframe.contentWindow) {
            // Internet Explorer doesn't handle loading documents from Blobs correctly.
            // Currently using the document.write() approach only for IE, as it breaks CSS selectors
            // with namespaces for some reason (e.g. the childrens-media-query sample EPUB)
            iframe.contentWindow.document.open();
            // tslint:disable-next-line:no-any
            var MSApp = window.MSApp;
            // Currently not handled automatically by winstore-jscompat,
            // so we're doing it manually. See:
            // https://github.com/MSOpenTech/winstore-jscompat/
            if (MSApp && MSApp.execUnsafeLocalFunction) {
                // tslint:disable-next-line:no-disable-auto-sanitization
                MSApp.execUnsafeLocalFunction(function () {
                    if (iframe.contentWindow) {
                        iframe.contentWindow.document.write(contentDocumentData);
                    }
                });
            }
            else {
                iframe.contentWindow.document.write(contentDocumentData);
            }
        }
        iframe.onload = function () {
            _this.iframeLoaded(iframe);
            callback(true);
            if (!_this.isIE) {
                window.URL.revokeObjectURL(documentDataUri);
            }
        };
        if (!this.isIE) {
            iframe.setAttribute('src', documentDataUri);
        }
        else if (iframe.contentWindow) {
            iframe.contentWindow.document.close();
        }
    };
    return IFrameLoader;
}());
exports.IFrameLoader = IFrameLoader;
});

unwrapExports(iframeLoader);
var iframeLoader_1 = iframeLoader.IFrameLoader;

var readingSystem = createCommonjsModule(function (module, exports) {
exports.__esModule = true;



var ReadingSystem = /** @class */ (function () {
    function ReadingSystem() {
    }
    ReadingSystem.prototype.initRenderer = function (viewport) {
        this.viewport = viewport;
    };
    ReadingSystem.prototype.openRendition = function (pub) {
        var loader = new iframeLoader.IFrameLoader(pub.getBaseURI());
        return new rendition.Rendition(pub, this.viewport, new r2ContentViewFactory.R2ContentViewFactory(loader));
    };
    return ReadingSystem;
}());
exports.ReadingSystem = ReadingSystem;
});

unwrapExports(readingSystem);
var readingSystem_1 = readingSystem.ReadingSystem;

var navigator$2 = createCommonjsModule(function (module, exports) {
exports.__esModule = true;

exports.Navigator = navigator.Navigator;

exports.RenditionContext = renditionContext.RenditionContext;

exports.ReadingSystem = readingSystem.ReadingSystem;

exports.Location = location_1.Location;

exports.Rendition = rendition.Rendition;
exports.SpreadMode = rendition.SpreadMode;

exports.IFrameLoader = iframeLoader.IFrameLoader;

exports.NavigationRequestManager = requestManager.NavigationRequestManager;

exports.SpineItemView = spineItemView.SpineItemView;

exports.ScrollMode = viewport.ScrollMode;
exports.Viewport = viewport.Viewport;

exports.ViewSettings = viewSettings.ViewSettings;

exports.LayoutView = layoutView.LayoutView;

exports.CancellationToken = types.CancellationToken;
exports.SettingName = types.SettingName;
exports.stringToSettingName = types.stringToSettingName;
exports.ZoomOptions = types.ZoomOptions;

exports.ElementBlacklistedChecker = elementChecker.ElementBlacklistedChecker;
exports.ElementVisibilityChecker = elementChecker.ElementVisibilityChecker;

exports.CfiNavigationLogic = cfiNavigationLogic.CfiNavigationLogic;

exports.Rect = rect.Rect;

exports.R2ContentViewFactory = r2ContentViewFactory.R2ContentViewFactory;

exports.R2SinglePageContentView = r2SinglePageContentView.R2SinglePageContentView;
});

unwrapExports(navigator$2);
var navigator_2 = navigator$2.Navigator;
var navigator_3 = navigator$2.RenditionContext;
var navigator_4 = navigator$2.ReadingSystem;
var navigator_5 = navigator$2.Location;
var navigator_6 = navigator$2.Rendition;
var navigator_7 = navigator$2.SpreadMode;
var navigator_8 = navigator$2.IFrameLoader;
var navigator_9 = navigator$2.NavigationRequestManager;
var navigator_10 = navigator$2.SpineItemView;
var navigator_11 = navigator$2.ScrollMode;
var navigator_12 = navigator$2.Viewport;
var navigator_13 = navigator$2.ViewSettings;
var navigator_14 = navigator$2.LayoutView;
var navigator_15 = navigator$2.CancellationToken;
var navigator_16 = navigator$2.SettingName;
var navigator_17 = navigator$2.stringToSettingName;
var navigator_18 = navigator$2.ZoomOptions;
var navigator_19 = navigator$2.ElementBlacklistedChecker;
var navigator_20 = navigator$2.ElementVisibilityChecker;
var navigator_21 = navigator$2.CfiNavigationLogic;
var navigator_22 = navigator$2.Rect;
var navigator_23 = navigator$2.R2ContentViewFactory;
var navigator_24 = navigator$2.R2SinglePageContentView;

var pageTitleTocResolver = createCommonjsModule(function (module, exports) {
exports.__esModule = true;
var PageTitleTocResolver = /** @class */ (function () {
    function PageTitleTocResolver(rend) {
        this.pageListMap = new Map();
        this.tocMap = new Map();
        this.rendition = rend;
        this.pub = rend.getPublication();
    }
    PageTitleTocResolver.prototype.getPageTitleFromLocation = function (loc) {
        var href = loc.getHref();
        this.ensureSpineItemPageListMap(href);
        var link = this.findMatchLink(loc, this.pageListMap);
        return link ? link.title : '';
    };
    PageTitleTocResolver.prototype.getTocLinkFromLocation = function (loc) {
        var href = loc.getHref();
        this.ensureSpineItemTocMap(href);
        return this.findMatchLink(loc, this.tocMap);
    };
    PageTitleTocResolver.prototype.findMatchLink = function (loc, infoMap) {
        var pageLocInfo = infoMap.get(loc.getHref());
        if (!pageLocInfo || pageLocInfo.length === 0) {
            return null;
        }
        var matchedLink = pageLocInfo[0].link;
        var locationCfi = loc.getLocation();
        if (locationCfi === '') {
            return matchedLink;
        }
        for (var _i = 0, pageLocInfo_1 = pageLocInfo; _i < pageLocInfo_1.length; _i++) {
            var info = pageLocInfo_1[_i];
            if (!info.cfi || info.cfi === '') {
                continue;
            }
            var ret = readiumCfi_esm.Interpreter.compareCFIs("epubcfi(/99!" + info.cfi + ")", "epubcfi(/99!" + locationCfi + ")");
            if (ret >= 0) {
                matchedLink = info.link;
            }
        }
        return matchedLink;
    };
    PageTitleTocResolver.prototype.ensureSpineItemPageListMap = function (href) {
        if (this.pageListMap.has(href)) {
            return;
        }
        var pageInfo = [];
        for (var _i = 0, _a = this.pub.pageList; _i < _a.length; _i++) {
            var pl = _a[_i];
            var locInfo = this.tryCreateLinkLocationInfo(pl, href);
            if (locInfo) {
                pageInfo.push(locInfo);
            }
        }
        this.pageListMap.set(href, pageInfo);
    };
    PageTitleTocResolver.prototype.ensureSpineItemTocMap = function (href) {
        if (this.tocMap.has(href)) {
            return;
        }
        var tocInfo = [];
        for (var _i = 0, _a = this.pub.toc; _i < _a.length; _i++) {
            var link = _a[_i];
            this.processTocLink(link, href, tocInfo);
        }
        this.tocMap.set(href, tocInfo);
    };
    PageTitleTocResolver.prototype.processTocLink = function (link, href, tocInfo) {
        var locInfo = this.tryCreateLinkLocationInfo(link, href);
        if (locInfo) {
            tocInfo.push(locInfo);
        }
        var children = link.children;
        if (!children) {
            return;
        }
        for (var _i = 0, children_1 = children; _i < children_1.length; _i++) {
            var cl = children_1[_i];
            this.processTocLink(cl, href, tocInfo);
        }
    };
    PageTitleTocResolver.prototype.tryCreateLinkLocationInfo = function (link, href) {
        var _a = this.getHrefAndElementId(link.href), siHref = _a[0], elementId = _a[1];
        if (siHref !== href) {
            return null;
        }
        var cfi = this.rendition.getCfiFromAnchor(siHref, elementId);
        if (cfi === undefined) {
            console.warn("failed to get cfi for " + link.href);
        }
        return { link: link, cfi: cfi };
    };
    PageTitleTocResolver.prototype.getHrefAndElementId = function (fullHref) {
        var hrefCompontents = fullHref.split('#');
        var href = hrefCompontents[0];
        var anchor = hrefCompontents.length >= 2 ? hrefCompontents[1] : '';
        return [href, anchor];
    };
    return PageTitleTocResolver;
}());
exports.PageTitleTocResolver = PageTitleTocResolver;
});

unwrapExports(pageTitleTocResolver);
var pageTitleTocResolver_1 = pageTitleTocResolver.PageTitleTocResolver;

var viewportResizer = createCommonjsModule(function (module, exports) {
var __awaiter = (commonjsGlobal && commonjsGlobal.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (commonjsGlobal && commonjsGlobal.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
var ViewportResizer = /** @class */ (function () {
    function ViewportResizer(rendCtx, updateCallback) {
        this.rendCtx = rendCtx;
        this.updateCallback = updateCallback;
        this.registerResizeHandler();
    }
    ViewportResizer.prototype.stopListenResize = function () {
        window.removeEventListener('resize', this.resizeListener);
    };
    ViewportResizer.prototype.registerResizeHandler = function () {
        this.resizeListener = extendedThrottle(this.handleViewportResizeStart.bind(this), this.handleViewportResizeTick.bind(this), this.handleViewportResizeEnd.bind(this), 250, 1000, this);
        window.addEventListener('resize', this.resizeListener);
    };
    ViewportResizer.prototype.handleViewportResizeStart = function () {
        this.location = this.rendCtx.navigator.getCurrentLocation();
    };
    ViewportResizer.prototype.handleViewportResizeTick = function () {
        // this.resize();
    };
    ViewportResizer.prototype.handleViewportResizeEnd = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.updateCallback();
                        if (!this.location) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.rendCtx.rendition.viewport.renderAtLocation(this.location)];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2: return [2 /*return*/];
                }
            });
        });
    };
    return ViewportResizer;
}());
exports.ViewportResizer = ViewportResizer;
function extendedThrottle(startCb, tickCb, endCb, delay, waitThreshold, context) {
    var aDelay = delay === undefined ? 250 : delay;
    var aWaitThreshold = waitThreshold === undefined ? aDelay : waitThreshold;
    var first = true;
    var last;
    var deferTimer;
    return function (event) {
        var now = (Date.now && Date.now()) || new Date().getTime();
        if (!(last && now < last + aDelay)) {
            last = now;
            if (first) {
                startCb(event);
                first = false;
            }
            else {
                tickCb(event);
            }
        }
        clearTimeout(deferTimer);
        deferTimer = window.setTimeout(function () {
            last = now;
            first = true;
            endCb(event);
        }, aWaitThreshold);
    };
}
});

unwrapExports(viewportResizer);
var viewportResizer_1 = viewportResizer.ViewportResizer;

export { pageTitleTocResolver_1 as PageTitleTocResolver, viewportResizer_1 as ViewportResizer, publication$1 as __moduleExports, publication_2 as Publication, navigator_2 as Navigator, navigator_3 as RenditionContext, navigator_4 as ReadingSystem, navigator_5 as Location, navigator_6 as Rendition, navigator_7 as SpreadMode, navigator_8 as IFrameLoader, navigator_9 as NavigationRequestManager, navigator_10 as SpineItemView, navigator_11 as ScrollMode, navigator_12 as Viewport, navigator_13 as ViewSettings, navigator_14 as LayoutView, navigator_15 as CancellationToken, navigator_16 as SettingName, navigator_17 as stringToSettingName, navigator_18 as ZoomOptions, navigator_19 as ElementBlacklistedChecker, navigator_20 as ElementVisibilityChecker, navigator_21 as CfiNavigationLogic, navigator_22 as Rect, navigator_23 as R2ContentViewFactory, navigator_24 as R2SinglePageContentView };
//# sourceMappingURL=readium-navigator-web.esm.js.map
