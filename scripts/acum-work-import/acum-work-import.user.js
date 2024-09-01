// ==UserScript==
// @name        ACUM work importer
// @id          acum-work-import
// @description imports MusicBrainz works from acum.org.il database
// @version     0.0.1
// @author      Dvir Yitzchaki (dvirtz@gmail.com)
// @namespace   https://github.com/dvirtz/musicbrainz-scripts
// @downloadURL https://github.com/dvirtz/musicbrainz-scripts/raw/main/scripts/acum-work-import/acum-work-import.user.js
// @updateURL   https://github.com/dvirtz/musicbrainz-scripts/raw/main/scripts/acum-work-import/acum-work-import.user.js
// @supportURL  https://github.com/dvirtz/musicbrainz-scripts/issues
// @match       http*://*musicbrainz.org/release/*/edit-relationships
// @icon        https://nocs.acum.org.il/acumsitesearchdb/resources/images/faviconSite.svg
// @require     https://cdn.jsdelivr.net/npm/@violentmonkey/dom@2
// @require     https://cdn.jsdelivr.net/npm/@violentmonkey/ui@0.7
// @require     https://cdn.jsdelivr.net/npm/@violentmonkey/dom@2/dist/solid.min.js
// @license     MIT
// @run-at      document-end
// ==/UserScript==

(function (web) {
'use strict';

function _extends() {
  return _extends = Object.assign ? Object.assign.bind() : function (n) {
    for (var e = 1; e < arguments.length; e++) {
      var t = arguments[e];
      for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]);
    }
    return n;
  }, _extends.apply(null, arguments);
}

var _tmpl$$1 = /*#__PURE__*/web.template(`<div id=dvirtz-release-editor-tools style="padding:8px;border:5px dotted rgb(171, 171, 109);margin:0px -6px 6px"><h2>dvirtz MusicBrainz scripts`);
function releaseEditorTools() {
  var _document$querySelect;
  const ID = 'dvirtz-release-editor-tools';
  const existing = document.getElementById(ID);
  if (existing) {
    return existing;
  }
  const toolbox = _tmpl$$1();
  (_document$querySelect = document.querySelector('div.tabs')) == null || _document$querySelect.insertAdjacentElement('afterend', toolbox);
  return toolbox;
}

var _tmpl$ = /*#__PURE__*/web.template(`<div id=acum-work-import-container class=buttons><button><img src=https://nocs.acum.org.il/acumsitesearchdb/resources/images/faviconSite.svg alt="ACUM logo"style=width:16px;height:16px;margin:2px><span>Import works from ACUM</span></button><input id=acum-album-id type=text placeholder="Album ID"style=marginLeft:10px pattern=\\d+ title="numbers only"><p>This will add a new work for each checked recording that has no work already</p><p class="warning always-on">Only use this option after you've tried searching for the work(s) you want to add, and are certain they do not already exist on MusicBrainz.`);
function createUI(onClick, onInput) {
  const toolbox = releaseEditorTools();
  const ui = (() => {
    var _el$ = _tmpl$(),
      _el$2 = _el$.firstChild,
      _el$3 = _el$2.nextSibling;
    web.addEventListener(_el$2, "click", onClick, true);
    _el$2.disabled = true;
    web.addEventListener(_el$3, "input", onInput, true);
    return _el$;
  })();
  toolbox.append(ui);
}
web.delegateEvents(["click", "input"]);

function getDefaultExportFromCjs (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

var fetchRetry$1 = function (fetch, defaults) {
  defaults = defaults || {};
  if (typeof fetch !== 'function') {
    throw new ArgumentError('fetch must be a function');
  }

  if (typeof defaults !== 'object') {
    throw new ArgumentError('defaults must be an object');
  }

  if (defaults.retries !== undefined && !isPositiveInteger(defaults.retries)) {
    throw new ArgumentError('retries must be a positive integer');
  }

  if (defaults.retryDelay !== undefined && !isPositiveInteger(defaults.retryDelay) && typeof defaults.retryDelay !== 'function') {
    throw new ArgumentError('retryDelay must be a positive integer or a function returning a positive integer');
  }

  if (defaults.retryOn !== undefined && !Array.isArray(defaults.retryOn) && typeof defaults.retryOn !== 'function') {
    throw new ArgumentError('retryOn property expects an array or function');
  }

  var baseDefaults = {
    retries: 3,
    retryDelay: 1000,
    retryOn: [],
  };

  defaults = Object.assign(baseDefaults, defaults);

  return function fetchRetry(input, init) {
    var retries = defaults.retries;
    var retryDelay = defaults.retryDelay;
    var retryOn = defaults.retryOn;

    if (init && init.retries !== undefined) {
      if (isPositiveInteger(init.retries)) {
        retries = init.retries;
      } else {
        throw new ArgumentError('retries must be a positive integer');
      }
    }

    if (init && init.retryDelay !== undefined) {
      if (isPositiveInteger(init.retryDelay) || (typeof init.retryDelay === 'function')) {
        retryDelay = init.retryDelay;
      } else {
        throw new ArgumentError('retryDelay must be a positive integer or a function returning a positive integer');
      }
    }

    if (init && init.retryOn) {
      if (Array.isArray(init.retryOn) || (typeof init.retryOn === 'function')) {
        retryOn = init.retryOn;
      } else {
        throw new ArgumentError('retryOn property expects an array or function');
      }
    }

    // eslint-disable-next-line no-undef
    return new Promise(function (resolve, reject) {
      var wrappedFetch = function (attempt) {
        // As of node 18, this is no longer needed since node comes with native support for fetch:
        /* istanbul ignore next */
        var _input =
          typeof Request !== 'undefined' && input instanceof Request
            ? input.clone()
            : input;
        fetch(_input, init)
          .then(function (response) {
            if (Array.isArray(retryOn) && retryOn.indexOf(response.status) === -1) {
              resolve(response);
            } else if (typeof retryOn === 'function') {
              try {
                // eslint-disable-next-line no-undef
                return Promise.resolve(retryOn(attempt, null, response))
                  .then(function (retryOnResponse) {
                    if(retryOnResponse) {
                      retry(attempt, null, response);
                    } else {
                      resolve(response);
                    }
                  }).catch(reject);
              } catch (error) {
                reject(error);
              }
            } else {
              if (attempt < retries) {
                retry(attempt, null, response);
              } else {
                resolve(response);
              }
            }
          })
          .catch(function (error) {
            if (typeof retryOn === 'function') {
              try {
                // eslint-disable-next-line no-undef
                Promise.resolve(retryOn(attempt, error, null))
                  .then(function (retryOnResponse) {
                    if(retryOnResponse) {
                      retry(attempt, error, null);
                    } else {
                      reject(error);
                    }
                  })
                  .catch(function(error) {
                    reject(error);
                  });
              } catch(error) {
                reject(error);
              }
            } else if (attempt < retries) {
              retry(attempt, error, null);
            } else {
              reject(error);
            }
          });
      };

      function retry(attempt, error, response) {
        var delay = (typeof retryDelay === 'function') ?
          retryDelay(attempt, error, response) : retryDelay;
        setTimeout(function () {
          wrappedFetch(++attempt);
        }, delay);
      }

      wrappedFetch(0);
    });
  };
};

function isPositiveInteger(value) {
  return Number.isInteger(value) && value >= 0;
}

function ArgumentError(message) {
  this.name = 'ArgumentError';
  this.message = message;
}

var fetchBuilder = /*@__PURE__*/getDefaultExportFromCjs(fetchRetry$1);

const fetchRetry = fetchBuilder(fetch);
async function tryFetch(url) {
  try {
    const result = await fetchRetry(url, {
      headers: {
        Accept: 'application/json'
      },
      retryOn: [503],
      retryDelay: attempt => Math.pow(2, attempt) * 1000
    });
    if (!result.ok) {
      throw new Error(`HTTP error: ${result.status}`);
    }
    return await result.json();
  } catch (e) {
    console.error(`Failed to fetch ${url}: ${e}`);
    return null;
  }
}

async function getWorkVersions(workId) {
  const result = await tryFetch(`https://nocs.acum.org.il/acumsitesearchdb/getworkinfo?workId=${workId}`);
  if (result) {
    const response = result;
    if (response.errorCode == 0) {
      return response.data.workVersions;
    }
    console.error('failed to fetch work %s: %s', workId, response.errorDescription);
  }
}
function albumUrl(albumId) {
  return `https://nocs.acum.org.il/acumsitesearchdb/getalbuminfo?albumId=${albumId}`;
}
async function getAlbumInfo(albumId) {
  const result = await tryFetch(albumUrl(albumId));
  if (result) {
    const response = result;
    if (response.errorCode == 0) {
      return response.data.albumBean;
    }
    console.error('failed to fetch album %s: %s', albumId, response.errorDescription);
  }
}

// from https://github.com/kellnerd/es-utils/blob/main/dom/react.js
function setReactTextareaValue(input, value) {
  var _Object$getOwnPropert;
  const setter = (_Object$getOwnPropert = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')) == null ? void 0 : _Object$getOwnPropert.set;
  setter == null || setter.call(input, value);
  input.dispatchEvent(new Event('input', {
    bubbles: true
  }));
}
function addEditNote(message) {
  const textArea = document.querySelector('#edit-note-text');
  const note = editNote(message);
  if (!textArea.value.includes(message)) {
    setReactTextareaValue(textArea, `${textArea.value}\n${note}`);
  }
}
function editNote(message) {
  return `----
${message} using ${GM.info.script.name} version ${GM.info.script.version} from ${GM.info.script.namespace}. `;
}

/**
 * @name isPromise
 *
 * @synopsis
 * isPromise(value any) -> boolean
 *
 * @description
 * Determine whether a value is a promise.
 */

const isPromise$R = value => value != null && typeof value.then == 'function';

var isPromise_1 = isPromise$R;

/**
 * @name symbolIterator
 *
 * @synopsis
 * symbolIterator = Symbol.iterator
 *
 * @description
 * Dereferenced `Symbol.iterator`
 */

const symbolIterator$d = Symbol.iterator;

var symbolIterator_1 = symbolIterator$d;

const symbolIterator$c = symbolIterator_1;

/**
 * @name MappingIterator
 *
 * @synopsis
 * ```coffeescript [specscript]
 * MappingIterator<
 *   T any,
 *   iterator Iterator<T>,
 *   mapper T=>any,
 * >(iterator, mapper) -> mappingIterator Object
 *
 * mappingIterator.next() -> nextIteration { value: any, done: boolean }
 * ```
 *
 * @description
 * Creates a mapping iterator, i.e. an iterator that applies a mapper to each item of a source iterator.
 *
 * Note: consuming the mapping iterator also consumes the source iterator.
 */
const MappingIterator$1 = (iterator, mapper) => ({
  toString() {
    return '[object MappingIterator]'
  },
  [symbolIterator$c]() {
    return this
  },
  next() {
    const iteration = iterator.next();
    return iteration.done ? iteration
      : { value: mapper(iteration.value), done: false }
  },
});

var MappingIterator_1 = MappingIterator$1;

/**
 * @name NextIteration
 *
 * @synopsis
 * NextIteration(value any) -> nextIteration { value, done: false }
 *
 * @description
 * Create an object to send for the next iteration
 */

const NextIteration$1 = value => ({ value, done: false });

var NextIteration_1 = NextIteration$1;

/**
 * @name symbolAsyncIterator
 *
 * @synopsis
 * symbolAsyncIterator = Symbol.asyncIterator
 *
 * @description
 * Dereferenced `Symbol.asyncIterator`
 */

const symbolAsyncIterator$b = Symbol.asyncIterator;

var symbolAsyncIterator_1 = symbolAsyncIterator$b;

const NextIteration = NextIteration_1;
const isPromise$Q = isPromise_1;
const symbolAsyncIterator$a = symbolAsyncIterator_1;

/**
 * @name MappingAsyncIterator
 *
 * @synopsis
 * ```coffeescript [specscript]
 * mappingAsyncIterator = new MappingAsyncIterator(
 *   asyncIter AsyncIterator<T>,
 *   mapper T=>Promise|any,
 * ) -> mappingAsyncIterator AsyncIterator
 *
 * mappingAsyncIterator.next() -> Promise<{ value: any, done: boolean }>
 * ```
 */
const MappingAsyncIterator$1 = (asyncIterator, mapper) => ({
  [symbolAsyncIterator$a]() {
    return this
  },
  async next() {
    const iteration = await asyncIterator.next();
    if (iteration.done) {
      return iteration
    }
    const mapped = mapper(iteration.value);
    return isPromise$Q(mapped)
      ? mapped.then(NextIteration)
      : { value: mapped, done: false }
  }
});

var MappingAsyncIterator_1 = MappingAsyncIterator$1;

const __$J = Symbol.for('placeholder');

var placeholder = __$J;

const __$I = placeholder;

// argument resolver for curry2
const curry2ResolveArg0 = (
  baseFunc, arg1,
) => function arg0Resolver(arg0) {
  return baseFunc(arg0, arg1)
};

// argument resolver for curry2
const curry2ResolveArg1 = (
  baseFunc, arg0,
) => function arg1Resolver(arg1) {
  return baseFunc(arg0, arg1)
};

/**
 * @name curry2
 *
 * @synopsis
 * ```coffeescript [specscript]
 * __ = Symbol('placeholder')
 *
 * curry2(
 *   baseFunc function,
 *   arg0 __|any,
 *   arg1 __|any,
 * ) -> function
 * ```
 *
 * @description
 * Curry a binary function.
 *
 * Note: exactly one argument must be the placeholder
 */
const curry2$e = function (baseFunc, arg0, arg1) {
  return arg0 == __$I
    ? curry2ResolveArg0(baseFunc, arg1)
    : curry2ResolveArg1(baseFunc, arg0)
};

var curry2_1 = curry2$e;

/**
 * @name isArray
 *
 * @synopsis
 * isArray(value any) -> boolean
 *
 * @description
 * Determine whether a value is an array.
 */

const isArray$i = Array.isArray;

var isArray_1 = isArray$i;

/**
 * @name isObject
 *
 * @synopsis
 * isObject(value any) -> boolean
 *
 * @description
 * Determine whether a value is an object. Note that Arrays are also objects in JS.
 */

const isObject$2 = value => {
  if (value == null) {
    return false
  }

  const typeofValue = typeof value;
  return (typeofValue == 'object') || (typeofValue == 'function')
};

var isObject_1$1 = isObject$2;

/**
 * @name promiseAll
 *
 * @synopsis
 * promiseAll(Iterable<Promise|any>) -> Promise<Array>
 *
 * @description
 * Dereferenced Promise.all
 */

const promiseAll$l = Promise.all.bind(Promise);

var promiseAll_1 = promiseAll$l;

const isPromise$P = isPromise_1;
const promiseAll$k = promiseAll_1;

/**
 * @name arrayMap
 *
 * @synopsis
 * ```coffeescript [specscript]
 * arrayMap(
 *   array Array,
 *   mapper (item any, index number, array Array)=>Promise|any,
 * ) -> Promise|Array
 * ```
 *
 * @description
 * Apply a mapper to each item of an array, returning an array. Mapper may be asynchronous.
 */
const arrayMap$4 = function (array, mapper) {
  const arrayLength = array.length,
    result = Array(arrayLength);
  let index = -1,
    isAsync = false;

  while (++index < arrayLength) {
    const resultItem = mapper(array[index], index, array);
    if (isPromise$P(resultItem)) {
      isAsync = true;
    }
    result[index] = resultItem;
  }
  return isAsync ? promiseAll$k(result) : result
};

var arrayMap_1 = arrayMap$4;

const __$H = placeholder;

// argument resolver for curry3
const curry3ResolveArg0 = (
  baseFunc, arg1, arg2,
) => function arg0Resolver(arg0) {
  return baseFunc(arg0, arg1, arg2)
};

// argument resolver for curry3
const curry3ResolveArg1 = (
  baseFunc, arg0, arg2,
) => function arg1Resolver(arg1) {
  return baseFunc(arg0, arg1, arg2)
};

// argument resolver for curry3
const curry3ResolveArg2 = (
  baseFunc, arg0, arg1,
) => function arg2Resolver(arg2) {
  return baseFunc(arg0, arg1, arg2)
};

/**
 * @name curry3
 *
 * @synopsis
 * ```coffeescript [specscript]
 * __ = Symbol('placeholder')
 *
 * curry3(
 *   baseFunc function,
 *   arg0 __|any,
 *   arg1 __|any,
 *   arg2 __|any
 * ) -> function
 * ```
 *
 * @description
 * Curry a 3-ary function.
 *
 * Note: exactly one argument must be the placeholder
 */
const curry3$k = function (baseFunc, arg0, arg1, arg2) {
  if (arg0 == __$H) {
    return curry3ResolveArg0(baseFunc, arg1, arg2)
  }
  if (arg1 == __$H) {
    return curry3ResolveArg1(baseFunc, arg0, arg2)
  }
  return curry3ResolveArg2(baseFunc, arg0, arg1)
};

var curry3_1 = curry3$k;

/**
 * @name callPropUnary
 *
 * @synopsis
 * ```coffeescript [specscript]
 * callPropUnary(
 *   value object,
 *   property string,
 *   arg0 any,
 * ) -> value[property](arg0)
 * ```
 *
 * @description
 * Call a property function on a value with a single argument.
 */

const callPropUnary$5 = (value, property, arg0) => value[property](arg0);

var callPropUnary_1 = callPropUnary$5;

const isPromise$O = isPromise_1;
const curry3$j = curry3_1;
const __$G = placeholder;
const arrayMap$3 = arrayMap_1;
const callPropUnary$4 = callPropUnary_1;

/**
 * @name stringMap
 *
 * @synopsis
 * ```coffeescript [specscript]
 * stringMap<
 *   character string,
 *   str String<character>,
 *   mapper character=>Promise|string|any,
 * >(str, mapper) -> stringWithCharactersMapped string
 * ```
 *
 * @description
 * Apply a mapper concurrently to each character of a string, returning a string result. `mapper` may be asynchronous.
 *
 * @related stringFlatMap
 */
const stringMap$1 = function (string, mapper) {
  const result = arrayMap$3(string, mapper);
  return isPromise$O(result)
    ? result.then(curry3$j(callPropUnary$4, __$G, 'join', ''))
    : result.join('')
};

var stringMap_1 = stringMap$1;

/**
 * @name always
 *
 * @synopsis
 * ```coffeescript [specscript]
 * always(value any) -> getter ()=>value
 * ```
 *
 * @description
 * Create a function that always returns a value.
 */

const always$i = value => function getter() { return value };

var always_1 = always$i;

const isPromise$N = isPromise_1;
const promiseAll$j = promiseAll_1;
const always$h = always_1;
const __$F = placeholder;
const curry3$i = curry3_1;
const callPropUnary$3 = callPropUnary_1;

/**
 * @name setMap
 *
 * @synopsis
 * ```coffeescript [specscript]
 * setMap<
 *   T any,
 *   value Set<T>,
 *   mapper T=>Promise|any,
 * >(value, mapper) -> Promise|Set
 * ```
 *
 * @description
 * Apply a mapper concurrently to each item of a set, returning a set of results.
 */
const setMap$2 = function (set, mapper) {
  const result = new Set(),
    promises = [];
  for (const item of set) {
    const resultItem = mapper(item, item, set);
    if (isPromise$N(resultItem)) {
      promises.push(resultItem.then(curry3$i(callPropUnary$3, result, 'add', __$F)));
    } else {
      result.add(resultItem);
    }
  }
  return promises.length == 0
    ? result
    : promiseAll$j(promises).then(always$h(result))
};

var setMap_1 = setMap$2;

const __$E = placeholder;

// argument resolver for curry4
const curry4ResolveArg0 = (
  baseFunc, arg1, arg2, arg3,
) => function arg0Resolver(arg0) {
  return baseFunc(arg0, arg1, arg2, arg3)
};

// argument resolver for curry4
const curry4ResolveArg1 = (
  baseFunc, arg0, arg2, arg3,
) => function arg1Resolver(arg1) {
  return baseFunc(arg0, arg1, arg2, arg3)
};

// argument resolver for curry4
const curry4ResolveArg2 = (
  baseFunc, arg0, arg1, arg3,
) => function arg2Resolver(arg2) {
  return baseFunc(arg0, arg1, arg2, arg3)
};

// argument resolver for curry4
const curry4ResolveArg3 = (
  baseFunc, arg0, arg1, arg2,
) => function arg3Resolver(arg3) {
  return baseFunc(arg0, arg1, arg2, arg3)
};

/**
 * @name curry4
 *
 * @synopsis
 * ```coffeescript [specscript]
 * __ = Symbol('placeholder')
 *
 * curry4(
 *   baseFunc function,
 *   arg0 __|any,
 *   arg1 __|any,
 *   arg2 __|any,
 *   arg3 __|any,
 * ) -> function
 * ```
 *
 * @description
 * Curry a 4-ary function.
 *
 * Note: exactly one argument must be the placeholder
 */
const curry4$6 = function (baseFunc, arg0, arg1, arg2, arg3) {
  if (arg0 == __$E) {
    return curry4ResolveArg0(baseFunc, arg1, arg2, arg3)
  }
  if (arg1 == __$E) {
    return curry4ResolveArg1(baseFunc, arg0, arg2, arg3)
  }
  if (arg2 == __$E) {
    return curry4ResolveArg2(baseFunc, arg0, arg1, arg3)
  }
  return curry4ResolveArg3(baseFunc, arg0, arg1, arg2)
};

var curry4_1 = curry4$6;

/**
 * @name callPropBinary
 *
 * @synopsis
 * ```coffeescript [specscript]
 * callPropBinary(
 *   value object,
 *   property string,
 *   arg0 any,
 *   arg1 any,
 * ) -> value[property](arg0, arg1)
 * ```
 *
 * @description
 * Call a property function on a value with two arguments.
 */

const callPropBinary$2 = (value, property, arg0, arg1) => value[property](arg0, arg1);

var callPropBinary_1 = callPropBinary$2;

const isPromise$M = isPromise_1;
const promiseAll$i = promiseAll_1;
const __$D = placeholder;
const curry4$5 = curry4_1;
const always$g = always_1;
const callPropBinary$1 = callPropBinary_1;

/**
 * @name mapMap
 *
 * @synopsis
 * ```coffeescript [specscript]
 * mapMap(
 *   value Map,
 *   mapper (item any, key any, value)=>Promise|any
 * ) -> Promise|Map<any=>any>
 * ```
 *
 * @description
 * Apply a mapper concurrently to each value (not entry) of a Map, returning a Map of results. `mapper` may be asynchronous.
 */
const mapMap$1 = function (value, mapper) {
  const result = new Map(),
    promises = [];
  for (const [key, item] of value) {
    const resultItem = mapper(item, key, value);
    if (isPromise$M(resultItem)) {
      promises.push(resultItem.then(
        curry4$5(callPropBinary$1, result, 'set', key, __$D)));
    } else {
      result.set(key, resultItem);
    }
  }
  return promises.length == 0
    ? result
    : promiseAll$i(promises).then(always$g(result))
};

var mapMap_1 = mapMap$1;

const isPromise$L = isPromise_1;

/**
 * @name promiseObjectAllExecutor
 *
 * @synopsis
 * ```coffeescript [specscript]
 * promiseObjectAllExecutor(resolve function) -> ()
 * ```
 */
const promiseObjectAllExecutor = object => function executor(resolve) {
  const result = {};
  let numPromises = 0;
  for (const key in object) {
    const value = object[key];
    if (isPromise$L(value)) {
      numPromises += 1;
      value.then((key => function (res) {
        result[key] = res;
        numPromises -= 1;
        if (numPromises == 0) {
          resolve(result);
        }
      })(key));
    } else {
      result[key] = value;
    }
  }
  if (numPromises == 0) {
    resolve(result);
  }
};

/**
 * @name promiseObjectAll
 *
 * @synopsis
 * ```coffeescript [specscript]
 * promiseObjectAll(object<Promise|any>) -> Promise<object>
 * ```
 *
 * @description
 * Like `Promise.all` but for objects.
 */
const promiseObjectAll$1 = object => new Promise(promiseObjectAllExecutor(object));

var promiseObjectAll_1 = promiseObjectAll$1;

const isPromise$K = isPromise_1;
const promiseObjectAll = promiseObjectAll_1;

/**
 * @name objectMap
 *
 * @synopsis
 * ```coffeescript [specscript]
 * objectMap<
 *   T any,
 *   object Object<T>,
 *   mapper T=>Promise|any,
 * >(object, mapper) -> Promise|Object
 * ```
 *
 * @description
 * Apply a mapper concurrently to each value of an object, returning an object of results. Mapper may be asynchronous.
 */
const objectMap$2 = function (object, mapper) {
  const result = {};
  let isAsync = false;
  for (const key in object) {
    const resultItem = mapper(object[key], key, object);
    if (isPromise$K(resultItem)) {
      isAsync = true;
    }
    result[key] = resultItem;
  }
  return isAsync ? promiseObjectAll(result) : result
};

var objectMap_1 = objectMap$2;

const isPromise$J = isPromise_1;

/**
 * @name funcConcat
 *
 * @synopsis
 * ```coffeescript [specscript]
 * funcConcat<
 *   args ...any,
 *   intermediate any,
 *   result any,
 * >(
 *   funcA ...args=>Promise|intermediate,
 *   funcB intermediate=>result
 * ) -> pipedFunction ...args=>Promise|result
 * ```
 */
const funcConcat$4 = (
  funcA, funcB,
) => function pipedFunction(...args) {
  const intermediate = funcA(...args);
  return isPromise$J(intermediate)
    ? intermediate.then(funcB)
    : funcB(intermediate)
};

var funcConcat_1 = funcConcat$4;

/**
 * @name objectSet
 *
 * @synopsis
 * ```coffeescript [specscript]
 * objectSet(
 *   object Object,
 *   property string,
 *   value any,
 * ) -> object
 * ```
 */

const objectSet$2 = function (object, property, value) {
  object[property] = value;
  return object
};

var objectSet_1 = objectSet$2;

const funcConcat$3 = funcConcat_1;
const __$C = placeholder;
const curry3$h = curry3_1;
const curry4$4 = curry4_1;
const isPromise$I = isPromise_1;
const objectSet$1 = objectSet_1;

/**
 * @name arrayMapSeriesAsync
 *
 * @synopsis
 * ```coffeescript [specscript]
 * arrayMapSeriesAsync<
 *   T any,
 *   array Array<T>,
 *   mapper (T,index)=>Promise|any,
 *   result Array,
 *   index number,
 * >(array, mapper, result Array, index) -> Promise|result
 * ```
 *
 * @description
 * Apply a mapper in series to each item of an array, returning a Promise of an array of results. `mapper` can be asynchronous.
 */
const arrayMapSeriesAsync = async function (
  array, mapper, result, index,
) {
  const arrayLength = array.length;
  while (++index < arrayLength) {
    const resultItem = mapper(array[index], index);
    result[index] = isPromise$I(resultItem) ? await resultItem : resultItem;
  }
  return result
};

/**
 * @name arrayMapSeries
 *
 * @synopsis
 * ```coffeescript [specscript]
 * arrayMapSeries<
 *   T any,
 *   array Array<T>,
 *   mapper (T,index)=>Promise|any,
 * >(array, mapper) -> mappedInSeries Promise|Array
 * ```
 *
 * @description
 * Apply a mapper in series to each item of an array, returning an array of results.
 */
const arrayMapSeries$1 = function (array, mapper) {
  const arrayLength = array.length,
    result = Array(arrayLength);
  let index = -1;

  while (++index < arrayLength) {
    const resultItem = mapper(array[index], index);
    if (isPromise$I(resultItem)) {
      return resultItem.then(funcConcat$3(
        curry3$h(objectSet$1, result, index, __$C),
        curry4$4(arrayMapSeriesAsync, array, mapper, __$C, index)))
    }
    result[index] = resultItem;
  }
  return result
};

var arrayMapSeries_1 = arrayMapSeries$1;

/**
 * @name tapSync
 *
 * @synopsis
 * ```coffeescript [specscript]
 * tapSync<
 *   tapper function,
 *   args ...any,
 * >(tapper)(...args) -> args[0]
 * ```
 *
 * @description
 * Call a function with arguments, returning the first argument. Promises are not handled.
 */

const tapSync$1 = func => function tapping(...args) {
  func(...args);
  return args[0]
};

var tapSync_1 = tapSync$1;

/**
 * @name promiseRace
 *
 * @synopsis
 * promiseRace(Iterable<Promise|any>) -> firstResolvedOrRejected Promise
 *
 * @description
 * Dereferenced Promise.race
 */

const promiseRace$3 = Promise.race.bind(Promise);

var promiseRace_1 = promiseRace$3;

const tapSync = tapSync_1;
const isPromise$H = isPromise_1;
const promiseAll$h = promiseAll_1;
const promiseRace$2 = promiseRace_1;

/**
 * @name arrayMapPoolAsync
 *
 * @synopsis
 * ```coffeescript [specscript]
 * arrayMapPoolAsync<
 *   T any,
 *   array Array<T>,
 *   mapper T=>Promise|any,
 *   concurrencyLimit number,
 *   result Array,
 *   index number,
 *   promises Set<Promise>,
 * >(array, mapper, concurrencyLimit, result, index, promises) -> result
 * ```
 *
 * @description
 * Apply a mapper with limited concurrency to each item of an array, returning a Promise of an array of results.
 */
const arrayMapPoolAsync = async function (
  array, mapper, concurrencyLimit, result, index, promises,
) {
  const arrayLength = array.length;
  while (++index < arrayLength) {
    if (promises.size >= concurrencyLimit) {
      await promiseRace$2(promises);
    }

    const resultItem = mapper(array[index]);
    if (isPromise$H(resultItem)) {
      const selfDeletingPromise = resultItem.then(
        tapSync(() => promises.delete(selfDeletingPromise)));
      promises.add(selfDeletingPromise);
      result[index] = selfDeletingPromise;
    } else {
      result[index] = resultItem;
    }
  }
  return promiseAll$h(result)
};

/**
 * @name
 * arrayMapPool
 *
 * @synopsis
 * ```coffeescript [specscript]
 * arrayMapPool<
 *   T any,
 *   array Array<T>
 *   mapper T=>Promise|any,
 *   concurrentLimit number,
 * >(array, mapper, concurrentLimit) -> Promise|Array
 * ```
 *
 * @description
 * Apply a mapper with limited concurrency to each item of an array, returning an array of results.
 */
const arrayMapPool$1 = function (array, mapper, concurrentLimit) {
  const arrayLength = array.length,
    result = Array(arrayLength);
  let index = -1;
  while (++index < arrayLength) {

    const resultItem = mapper(array[index]);
    if (isPromise$H(resultItem)) {
      const promises = new Set(),
        selfDeletingPromise = resultItem.then(
          tapSync(() => promises.delete(selfDeletingPromise)));
      promises.add(selfDeletingPromise);
      result[index] = selfDeletingPromise;
      return arrayMapPoolAsync(
        array, mapper, concurrentLimit, result, index, promises)
    }
    result[index] = resultItem;
  }
  return result
};

var arrayMapPool_1 = arrayMapPool$1;

const __$B = placeholder;

/**
 * @name _curryArity
 *
 * @synopsis
 * ```coffeescript [specscript]
 * __ = Symbol(placeholder)
 *
 * var arity number,
 *   func function,
 *   args Array<__|any>,
 *   curried function
 *
 * _curryArity(arity, func, args) -> curried|any
 * ```
 */
const _curryArity = (arity, func, args) => function curried(...curriedArgs) {
  const argsLength = args.length,
    curriedArgsLength = curriedArgs.length,
    nextArgs = [];
  let argsIndex = -1,
    curriedArgsIndex = -1,
    numCurriedPlaceholders = 0;

  while (++argsIndex < argsLength) {
    const arg = args[argsIndex];
    if (arg == __$B && (curriedArgsIndex += 1) < curriedArgsLength) {
      const curriedArg = curriedArgs[curriedArgsIndex];
      if (curriedArg == __$B) {
        numCurriedPlaceholders += 1;
      }
      nextArgs.push(curriedArg);
    } else {
      nextArgs.push(arg);
    }
    if (nextArgs.length == arity) {
      return numCurriedPlaceholders == 0
        ? func(...nextArgs)
        : curryArity$2(arity, func, nextArgs)
    }
  }

  while (++curriedArgsIndex < curriedArgsLength) {
    const curriedArg = curriedArgs[curriedArgsIndex];
    if (curriedArg == __$B) {
      numCurriedPlaceholders += 1;
    }
    nextArgs.push(curriedArg);
    if (nextArgs.length == arity) {
      return numCurriedPlaceholders == 0
        ? func(...nextArgs)
        : curryArity$2(arity, func, nextArgs)
    }
  }
  return curryArity$2(arity, func, nextArgs)
};

/**
 * @name curryArity
 *
 * @synopsis
 * ```coffeescript [specscript]
 * __ = Symbol(placeholder)
 *
 * var arity number,
 *   func function,
 *   args Array<__|any>,
 *   curried function
 *
 * curryArity(arity, func, args) -> curried|any
 * ```
 *
 * @description
 * Create a curried version of a function with specified arity.
 */

const curryArity$2 = function (arity, func, args) {
  const argsLength = args.length;
  if (argsLength < arity) {
    return _curryArity(arity, func, args)
  }
  let argsIndex = -1;
  while (++argsIndex < argsLength) {
    const arg = args[argsIndex];
    if (arg == __$B) {
      return _curryArity(arity, func, args)
    }
  }
  return func(...args)
};

var curryArity_1 = curryArity$2;

/**
 * @name spread2
 *
 * @synopsis
 * ```coffeescript [specscript]
 * spread2<
 *   func function,
 *   arg0 any,
 *   arg1 any,
 * >(func) -> spreading2 ([arg0, arg1])=>func(arg0, arg1)
 * ```
 */

const spread2$3 = func => function spreading2([arg0, arg1]) {
  return func(arg0, arg1)
};

var spread2_1 = spread2$3;

const isPromise$G = isPromise_1;
const promiseAll$g = promiseAll_1;
const objectSet = objectSet_1;
const curryArity$1 = curryArity_1;
const spread2$2 = spread2_1;
const always$f = always_1;

/**
 * @name objectMapEntries
 *
 * @synopsis
 * ```coffeescript [specscript]
 * objectMapEntries(
 *   object Object,
 *   mapper ([key string, value any])=>Promise|[string, any],
 * ) -> Promise|Object
 * ```
 */
const objectMapEntries$1 = function (object, mapper) {
  const result = {},
    promises = [];
  for (const key in object) {
    const value = object[key],
      mapping = mapper([key, value]);
    if (isPromise$G(mapping)) {
      promises.push(mapping.then(
        spread2$2(curryArity$1(3, objectSet, [result]))));
    } else {
      result[mapping[0]] = mapping[1];
    }
  }
  return promises.length == 0
    ? result
    : promiseAll$g(promises).then(always$f(result))
};

var objectMapEntries_1 = objectMapEntries$1;

/**
 * @name mapSet
 *
 * @synopsis
 * ```coffeescript [specscript]
 * mapSet(source Map, key any, value any) -> source
 * ```
 */

const mapSet$1 = function setting(source, key, value) {
  return source.set(key, value)
};

var mapSet_1 = mapSet$1;

const isPromise$F = isPromise_1;
const promiseAll$f = promiseAll_1;
const mapSet = mapSet_1;
const curryArity = curryArity_1;
const spread2$1 = spread2_1;
const always$e = always_1;

// (mapper function, result Map, promises Array<Promise>) => (key any, value any) => ()
const mapMapEntriesForEachCallback = (
  mapper, result, promises,
) => function callback(value, key) {
  const mapping = mapper([key, value]);
  if (isPromise$F(mapping)) {
    promises.push(mapping.then(spread2$1(curryArity(3, mapSet, [result]))));
  } else {
    result.set(mapping[0], mapping[1]);
  }
};

/**
 * @name mapMapEntries
 *
 * @synopsis
 * ```coffeescript [specscript]
 * mapMapEntries(
 *   source Map,
 *   mapper ([key string, source any])=>Promise|[string, any],
 * ) -> Promise|Map
 * ```
 */
const mapMapEntries$1 = function (source, mapper) {
  const result = new Map(),
    promises = [];
  source.forEach(mapMapEntriesForEachCallback(mapper, result, promises));
  return promises.length == 0
    ? result
    : promiseAll$f(promises).then(always$e(result))
};

var mapMapEntries_1 = mapMapEntries$1;

const isPromise$E = isPromise_1;
const MappingIterator = MappingIterator_1;
const MappingAsyncIterator = MappingAsyncIterator_1;
const __$A = placeholder;
const curry2$d = curry2_1;
const isArray$h = isArray_1;
const arrayMap$2 = arrayMap_1;
const stringMap = stringMap_1;
const setMap$1 = setMap_1;
const mapMap = mapMap_1;
const objectMap$1 = objectMap_1;
const arrayMapSeries = arrayMapSeries_1;
const arrayMapPool = arrayMapPool_1;
const objectMapEntries = objectMapEntries_1;
const mapMapEntries = mapMapEntries_1;
const symbolIterator$b = symbolIterator_1;
const symbolAsyncIterator$9 = symbolAsyncIterator_1;

/**
 * @name _map
 *
 * @synopsis
 * ```coffeescript [specscript]
 * _map(
 *   array Array,
 *   arrayMapper (value any, index number, array Array)=>Promise|any
 * ) -> mappedArray Promise|Array
 *
 * _map(
 *   object Object,
 *   objectMapper (value any, key string, object Object)=>Promise|any
 * ) -> mappedObject Promise|Array
 *
 * _map(
 *   set Set,
 *   setMapper (value any, value, set Set)=>Promise|any
 * ) -> mappedSet Promise|Set
 *
 * _map(
 *   originalMap Map,
 *   mapMapper (value any, key any, originalMap Map)=>Promise|any
 * ) -> mappedMap Promise|Map
 *
 * _map(
 *   generatorFunction ...args=>Generator,
 *   syncMapper (value any)=>any,
 * ) -> mappingGeneratorFunction ...args=>Generator
 *
 * _map(
 *   asyncGeneratorFunction ...args=>AsyncGenerator,
 *   mapper (value any)=>Promise|any
 * ) -> mappingAsyncGeneratorFunction ...args=>AsyncGenerator
 *
 * _map(
 *   originalReducer Reducer,
 *   mapper (value any)=>Promise|any,
 * ) -> mappingReducer Reducer
 * ```
 */

const _map = function (value, mapper) {
  if (isArray$h(value)) {
    return arrayMap$2(value, mapper)
  }
  if (value == null) {
    return value
  }

  if (typeof value.then == 'function') {
    return value.then(mapper)
  }
  if (typeof value.map == 'function') {
    return value.map(mapper)
  }
  if (typeof value == 'string' || value.constructor == String) {
    return stringMap(value, mapper)
  }
  if (value.constructor == Set) {
    return setMap$1(value, mapper)
  }
  if (value.constructor == Map) {
    return mapMap(value, mapper)
  }
  if (typeof value[symbolIterator$b] == 'function') {
    return MappingIterator(value[symbolIterator$b](), mapper)
  }
  if (typeof value[symbolAsyncIterator$9] == 'function') {
    return MappingAsyncIterator(value[symbolAsyncIterator$9](), mapper)
  }
  if (value.constructor == Object) {
    return objectMap$1(value, mapper)
  }
  return mapper(value)
};

/**
 * @name map
 *
 * @synopsis
 * ```coffeescript [specscript]
 * type Mappable = Array|Object|Set|Map|Iterator|AsyncIterator
 *
 * type Mapper = (
 *   value any,
 *   indexOrKey number|string,
 *   collection Mappable
 * )=>(mappedItem Promise|any)
 *
 * map(value Mappable, mapper Mapper) -> result Promise|Mappable
 * map(mapper Mapper)(value Mappable) -> result Promise|Mappable
 * ```
 *
 * @description
 * Applies a synchronous or asynchronous mapper function concurrently to each item of a collection, returning the results in a new collection of the same type. If order is implied by the collection, it is maintained in the result. `map` accepts the following collections:
 *
 *  * `Array`
 *  * `Object`
 *  * `Set`
 *  * `Map`
 *  * `Iterator`/`Generator`
 *  * `AsyncIterator`/`AsyncGenerator`
 *
 * With arrays (type `Array`), `map` applies the mapper function to each item of the array, returning the transformed results in a new array ordered the same as the original array.
 *
 * ```javascript [playground]
 * const square = number => number ** 2
 *
 * const array = [1, 2, 3, 4, 5]
 *
 * console.log(
 *   map(array, square)
 * ) // [1, 4, 9, 16, 25]
 *
 * console.log(
 *   map(square)(array)
 * ) // [1, 4, 9, 16, 25]
 * ```
 *
 * With objects (type `Object`), `map` applies the mapper function to each value of the object, returning the transformed results as values in a new object ordered by the keys of the original object
 *
 * ```javascript [playground]
 * const square = number => number ** 2
 *
 * const obj = { a: 1, b: 2, c: 3, d: 4, e: 5 }
 *
 * console.log(
 *   map(square)(obj)
 * ) // { a: 1, b: 4, c: 9, d: 16, e: 25 }
 *
 * console.log(
 *   map(obj, square)
 * ) // { a: 1, b: 4, c: 9, d: 16, e: 25 }
 * ```
 *
 * With sets (type `Set`), `map` applies the mapper function to each value of the set, returning the transformed results unordered in a new set.
 *
 * ```javascript [playground]
 * const square = number => number ** 2
 *
 * const set = new Set([1, 2, 3, 4, 5])
 *
 * console.log(
 *   map(set, square)
 * ) // [1, 4, 9, 16, 25]
 *
 * console.log(
 *   map(square)(set)
 * ) // [1, 4, 9, 16, 25]
 * ```
 *
 * With maps (type `Map`), `map` applies the mapper function to each value of the map, returning the results at the same keys in a new map. The entries of the resulting map are in the same order as those of the original map
 *
 * ```javascript [playground]
 * const square = number => number ** 2
 *
 * const m = new Map([['a', 1], ['b', 2], ['c', 3], ['d', 4], ['e', 5]])
 *
 * console.log(
 *   map(square)(m)
 * ) // Map { 'a' => 1, 'b' => 4, 'c' => 9, 'd' => 16, 'e' => 25 }
 *
 * console.log(
 *   map(m, square)
 * ) // Map { 'a' => 1, 'b' => 4, 'c' => 9, 'd' => 16, 'e' => 25 }
 * ```
 *
 * With iterators (type `Iterator`) or generators (type `Generator`), `map` applies the mapper function lazily to each value of the iterator/generator, creating a new iterator with transformed iterations.
 *
 * ```javascript [playground]
 * const capitalize = string => string.toUpperCase()
 *
 * const abcGeneratorFunc = function* () {
 *   yield 'a'; yield 'b'; yield 'c'
 * }
 *
 * const abcGenerator = abcGeneratorFunc()
 * const ABCGenerator = map(abcGeneratorFunc(), capitalize)
 * const ABCGenerator2 = map(capitalize)(abcGeneratorFunc())
 *
 * console.log([...abcGenerator]) // ['a', 'b', 'c']
 *
 * console.log([...ABCGenerator]) // ['A', 'B', 'C']
 *
 * console.log([...ABCGenerator2]) // ['A', 'B', 'C']
 * ```
 *
 * With asyncIterators (type `AsyncIterator`, or `AsyncGenerator`), `map` applies the mapper function lazily to each value of the asyncIterator, creating a new asyncIterator with transformed iterations
 *
 * ```javascript [playground]
 * const capitalize = string => string.toUpperCase()
 *
 * const abcAsyncGeneratorFunc = async function* () {
 *   yield 'a'; yield 'b'; yield 'c'
 * }
 *
 * const abcAsyncGenerator = abcAsyncGeneratorFunc()
 * const ABCGenerator = map(abcAsyncGeneratorFunc(), capitalize)
 * const ABCGenerator2 = map(capitalize)(abcAsyncGeneratorFunc())
 *
 * ;(async function () {
 *   for await (const letter of abcAsyncGenerator) {
 *     console.log(letter)
 *     // a
 *     // b
 *     // c
 *   }
 *
 *   for await (const letter of ABCGenerator) {
 *     console.log(letter)
 *     // A
 *     // B
 *     // C
 *   }
 *
 *   for await (const letter of ABCGenerator2) {
 *     console.log(letter)
 *     // A
 *     // B
 *     // C
 *   }
 * })()
 * ```
 *
 * @execution concurrent
 *
 * @TODO streamMap
 */

const map$1 = (...args) => {
  const mapper = args.pop();
  if (args.length == 0) {
    return curry2$d(_map, __$A, mapper)
  }

  const collection = args[0];
  if (isPromise$E(collection)) {
    return collection.then(curry2$d(_map, __$A, mapper))
  }
  return _map(collection, mapper)
};

/**
 * @name map.entries
 *
 * @synopsis
 * ```coffeescript [specscript]
 * map.entries(
 *   mapper ([key any, value any])=>Promise|[any, any],
 * )(value Map|Object) -> Promise|Map|Object
 * ```
 *
 * @description
 * `map` over the entries rather than the values of a collection. Accepts collections of type `Map` or `Object`.
 *
 * ```javascript [playground]
 * const upperCaseKeysAndSquareValues =
 *   map.entries(([key, value]) => [key.toUpperCase(), value ** 2])
 *
 * console.log(upperCaseKeysAndSquareValues({ a: 1, b: 2, c: 3 }))
 * // { A: 1, B: 4, C: 9 }
 *
 * console.log(upperCaseKeysAndSquareValues(new Map([['a', 1], ['b', 2], ['c', 3]])))
 * // Map(3) { 'A' => 1, 'B' => 4, 'C' => 9 }
 * ```
 *
 * @since v1.7.0
 */
map$1.entries = function mapEntries(mapper) {
  return function mappingEntries(value) {
    if (value == null) {
      throw new TypeError('value is not an Object or Map')
    }
    if (value.constructor == Object) {
      return objectMapEntries(value, mapper)
    }
    if (value.constructor == Map) {
      return mapMapEntries(value, mapper)
    }
    throw new TypeError('value is not an Object or Map')
  }
};

/**
 * @name map.series
 *
 * @synopsis
 * ```coffeescript [specscript]
 * map.series(
 *   mapperFunc (value any)=>Promise|any,
 * )(array Array) -> Promise|Array
 * ```
 *
 * @description
 * `map` with serial execution.
 *
 * ```javascript [playground]
 * const delayedLog = number => new Promise(function (resolve) {
 *   setTimeout(function () {
 *     console.log(number)
 *     resolve()
 *   }, 1000)
 * })
 *
 * console.log('start')
 * map.series(delayedLog)([1, 2, 3, 4, 5])
 * ```
 *
 * @execution series
 */
map$1.series = mapper => function mappingInSeries(value) {
  if (isArray$h(value)) {
    return arrayMapSeries(value, mapper)
  }
  throw new TypeError(`${value} is not an Array`)
};

/**
 * @name map.pool
 *
 * @synopsis
 * ```coffeescript [specscript]
 * map.pool(
 *   maxConcurrency number,
 *   mapper (value any)=>Promise|any,
 * )(array Array) -> result Promise|Array
 * ```
 *
 * @description
 * `map` that specifies the maximum concurrency (number of ongoing promises at any time) of the execution. Only works for arrays.
 *
 * ```javascript [playground]
 * const ids = [1, 2, 3, 4, 5]
 *
 * const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
 *
 * const delayedIdentity = async value => {
 *   await sleep(1000)
 *   return value
 * }
 *
 * map.pool(2, pipe([
 *   delayedIdentity,
 *   console.log,
 * ]))(ids)
 * ```
 *
 * @TODO objectMapPool
 *
 * @execution concurrent
 */
map$1.pool = (concurrencyLimit, mapper) => function concurrentPoolMapping(value) {
  if (isArray$h(value)) {
    return arrayMapPool(value, mapper, concurrencyLimit)
  }
  throw new TypeError(`${value} is not an Array`)
};

var map_1 = map$1;

var map$2 = /*@__PURE__*/getDefaultExportFromCjs(map_1);

const isPromise$D = isPromise_1;

/**
 * @name areAnyValuesPromises
 *
 * @synopsis
 * ```coffeescript [specscript]
 * areAnyValuesPromises(values Array) -> boolean
 * ```
 */
const areAnyValuesPromises$2 = function (values) {
  const length = values.length;
  let index = -1;
  while (++index < length) {
    const value = values[index];
    if (isPromise$D(value)) {
      return true
    }
  }
  return false
};

var areAnyValuesPromises_1 = areAnyValuesPromises$2;

/**
 * @name funcApply
 *
 * @synopsis
 * ```coffeescript [specscript]
 * funcApply<
 *   args ...any,
 *   func ...args=>any,
 * >(func, args) -> func(...args)
 * ```
 *
 * @description
 * Apply arguments to a function.
 */

const funcApply$1 = (func, args) => func(...args);

var funcApply_1 = funcApply$1;

const areAnyValuesPromises$1 = areAnyValuesPromises_1;
const promiseAll$e = promiseAll_1;
const funcConcat$2 = funcConcat_1;
const funcApply = funcApply_1;
const curry2$c = curry2_1;
const __$z = placeholder;

/**
 * @name pipe
 *
 * @synopsis
 * ```coffeescript [specscript]
 * pipe(funcs Array<function>)(...args) -> result Promise|any
 *
 * pipe(...args, funcs Array<function>) -> result Promise|any
 * ```
 *
 * @description
 * Creates a function pipeline from an array of functions, where each function passes its return value as a single argument to the next function until all functions have executed. The first function is called with the arguments to the pipeline, while the result of the pipeline execution is the return of its last function. If any function of the pipeline is asynchronous, the result of the execution is a Promise.
 *
 * ```javascript [playground]
 * const syncAdd123 = pipe([
 *   number => number + 1,
 *   number => number + 2,
 *   number => number + 3,
 * ])
 *
 * console.log(syncAdd123(5)) // 11
 *
 * const asyncAdd123 = pipe([
 *   async number => number + 1,
 *   async number => number + 2,
 *   async number => number + 3,
 * ])
 *
 * asyncAdd123(5).then(console.log) // 11
 * ```
 *
 * When passed any amount of arguments before the array of functions, `pipe` executes eagerly; the array of functions is immediately invoked with the supplied arguments.
 *
 * ```javascript [playground]
 * pipe(1, 2, 3, [
 *   Array.of,
 *   map(number => number * 3),
 *   console.log, // [3, 6, 9]
 * ])
 * ```
 *
 * @execution series
 *
 * @transducing
 *
 * @since 1.6.0
 */
const pipe = function (...args) {
  const funcs = args.pop();
  const pipeline = funcs.reduce(funcConcat$2);

  if (args.length == 0) {
    return pipeline
  }

  if (areAnyValuesPromises$1(args)) {
    return promiseAll$e(args).then(curry2$c(funcApply, pipeline, __$z))
  }

  return pipeline(...args)
};

var pipe_1 = pipe;

var pipe$1 = /*@__PURE__*/getDefaultExportFromCjs(pipe_1);

const symbolIterator$a = symbolIterator_1;

/**
 * @name FilteringIterator
 *
 * @synopsis
 * ```coffeescript [specscript]
 * FilteringIterator<
 *   T any,
 *   iterator Iterator<T>,
 *   predicate T=>boolean, # no async
 * >(iterator, predicate) -> filteringIterator Iterator<T>
 *
 * filteringIterator.next() -> { value: T, done: boolean }
 * ```
 *
 * @description
 * Creates a filtering iterator, i.e. an iterator that filteres a source iterator by predicate.
 */
const FilteringIterator$1 = (iterator, predicate) => ({
  [symbolIterator$a]() {
    return this
  },
  next() {
    let iteration = iterator.next();
    while (!iteration.done) {
      const { value } = iteration;
      if (predicate(value)) {
        return { value, done: false }
      }
      iteration = iterator.next();
    }
    return iteration
  },
});

var FilteringIterator_1 = FilteringIterator$1;

const isPromise$C = isPromise_1;
const symbolAsyncIterator$8 = symbolAsyncIterator_1;

/**
 * @name FilteringAsyncIterator
 *
 * @synopsis
 * ```coffeescript [specscript]
 * const filteringAsyncIterator = new FilteringAsyncIterator(
 *   asyncIterator AsyncIterator<T>,
 *   predicate T=>boolean,
 * ) -> FilteringAsyncIterator<T>
 *
 * filteringAsyncIterator.next() -> { value: Promise, done: boolean }
 * ```
 */
const FilteringAsyncIterator$1 = (asyncIterator, predicate) => ({
  isAsyncIteratorDone: false,
  [symbolAsyncIterator$8]() {
    return this
  },
  async next() {
    while (!this.isAsyncIteratorDone) {
      const { value, done } = await asyncIterator.next();
      if (done) {
        this.isAsyncIteratorDone = true;
      } else {
        const predication = predicate(value);
        if (isPromise$C(predication) ? await predication : predication) {
          return { value, done: false }
        }
      }
    }
    return { value: undefined, done: true }
  },
});

var FilteringAsyncIterator_1 = FilteringAsyncIterator$1;

/**
 * @name arrayExtendMap
 *
 * @synopsis
 * ```coffeescript [specscript]
 * any -> value; any -> mapped
 *
 * arrayExtendMap(
 *   array Array<mapped>,
 *   values Array<value>,
 *   valuesIndex number,
 *   valuesMapper value=>mapped,
 * ) -> array
 * ```
 *
 * @description
 * `arrayExtend` while mapping
 */

const arrayExtendMap$1 = function (
  array, values, valuesMapper, valuesIndex,
) {
  const valuesLength = values.length;
  let arrayIndex = array.length - 1;
  while (++valuesIndex < valuesLength) {
    array[++arrayIndex] = valuesMapper(values[valuesIndex], valuesIndex, array);
  }
  return array
};

var arrayExtendMap_1 = arrayExtendMap$1;

/**
 * @name arrayFilterByConditions
 *
 * @synopsis
 * ```coffeescript [specscript]
 * arrayFilterByConditions(
 *   array Array,
 *   result Array,
 *   index number,
 *   conditions Array<boolean>,
 * ) -> result
 * ```
 *
 * @description
 * Filter an array by a boolean array of conditions
 *
 * @TODO switch positions of index and conditions
 */

const arrayFilterByConditions$1 = function (
  array, result, index, conditions,
) {
  const arrayLength = array.length;
  let conditionsIndex = -1;
  while (++index < arrayLength) {
    if (conditions[++conditionsIndex]) {
      result.push(array[index]);
    }
  }
  return result
};

var arrayFilterByConditions_1 = arrayFilterByConditions$1;

const curry4$3 = curry4_1;
const __$y = placeholder;
const isPromise$B = isPromise_1;
const promiseAll$d = promiseAll_1;
const arrayExtendMap = arrayExtendMap_1;
const arrayFilterByConditions = arrayFilterByConditions_1;

/**
 * @name arrayFilter
 *
 * @synopsis
 * ```coffeescript [specscript]
 * arrayFilter<T>(
 *   array Array<T>,
 *   predicate T=>Promise|boolean,
 * ) -> result Promise|Array<T>
 * ```
 *
 * @description
 * Filter an array concurrently by predicate. `predicate` may be asynchronous.
 */
const arrayFilter$2 = function (array, predicate) {
  const arrayLength = array.length,
    result = [];
  let index = -1,
    resultIndex = -1;
  while (++index < arrayLength) {
    const item = array[index],
      shouldIncludeItem = predicate(item, index, array);
    if (isPromise$B(shouldIncludeItem)) {
      return promiseAll$d(
        arrayExtendMap([shouldIncludeItem], array, predicate, index)
      ).then(curry4$3(arrayFilterByConditions, array, result, index - 1, __$y))
    }
    if (shouldIncludeItem) {
      result[++resultIndex] = item;
    }
  }
  return result
};

var arrayFilter_1 = arrayFilter$2;

const isPromise$A = isPromise_1;
const curry3$g = curry3_1;
const __$x = placeholder;
const arrayFilter$1 = arrayFilter_1;
const callPropUnary$2 = callPropUnary_1;

/**
 * @name stringMap
 *
 * @synopsis
 * ```coffeescript [specscript]
 * stringMap<
 *   character string,
 *   str String<character>,
 *   mapper character=>Promise|string|any,
 * >(str, mapper) -> stringWithCharactersMapped string
 * ```
 *
 * @description
 * Filter a string's characters by predicate.
 */
const stringFilter$1 = function (string, predicate) {
  const filteredCharactersArray = arrayFilter$1(string, predicate);
  return isPromise$A(filteredCharactersArray)
    ? filteredCharactersArray.then(curry3$g(callPropUnary$2, __$x, 'join', ''))
    : filteredCharactersArray.join('')
};

var stringFilter_1 = stringFilter$1;

/**
 * @name thunkConditional
 *
 * @synopsis
 * ```coffeescript [specscript]
 * thunkConditional<
 *   conditionalExpression boolean,
 *   thunkOnTruthy ()=>any,
 *   thunkOnFalsy ()=>any,
 * >(conditionalExpression, thunkOnTruthy, thunkOnFalsy) -> any
 * ```
 *
 * @description
 * Like the conditional operator `a ? b : c` but for thunks.
 */

const thunkConditional$a = (
  conditionalExpression, thunkOnTruthy, thunkOnFalsy,
) => conditionalExpression ? thunkOnTruthy() : thunkOnFalsy();

var thunkConditional_1 = thunkConditional$a;

/**
 * @name thunkify1
 *
 * @synopsis
 * ```coffeescript [specscript]
 * thunkify1<
 *   arg0 any,
 *   func arg0=>any,
 * >(func, arg0) -> thunk ()=>func(arg0)
 * ```
 *
 * @description
 * Create a thunk from a function and one argument.
 */

const thunkify1$3 = (func, arg0) => function thunk() {
  return func(arg0)
};

var thunkify1_1 = thunkify1$3;

/**
 * @name noop
 *
 * @synopsis
 * noop() -> ()
 *
 * @description
 * Takes nothing, returns `undefined`
 */

const noop$6 = function () {};

var noop_1$1 = noop$6;

const isPromise$z = isPromise_1;
const promiseAll$c = promiseAll_1;
const always$d = always_1;
const __$w = placeholder;
const curry3$f = curry3_1;
const thunkConditional$9 = thunkConditional_1;
const thunkify1$2 = thunkify1_1;
const noop$5 = noop_1$1;

/**
 * @name setFilter
 *
 * @synopsis
 * ```coffeescript [specscript]
 * setFilter<T>(
 *   set Set<T>,
 *   predicate T=>Promise|boolean,
 * ) -> filteredSet Promise|Set<T>
 * ```
 *
 * @description
 * Filter items of a Set concurrently by predicate. `predicate` may be asynchronous.
 */
const setFilter$1 = function (value, predicate) {
  const result = new Set(),
    resultAdd = result.add.bind(result),
    promises = [];
  for (const item of value) {
    const predication = predicate(item, item, value);
    if (isPromise$z(predication)) {
      promises.push(predication.then(curry3$f(
        thunkConditional$9, __$w, thunkify1$2(resultAdd, item), noop$5)));
    } else if (predication) {
      result.add(item);
    }
  }
  return promises.length == 0
    ? result
    : promiseAll$c(promises).then(always$d(result))
};

var setFilter_1 = setFilter$1;

/**
 * @name thunkify4
 *
 * @synopsis
 * ```coffeescript [specscript]
 * thunkify4<
 *   arg0 any,
 *   arg1 any,
 *   arg2 any,
 *   arg3 any,
 *   func (arg0, arg1, arg2, arg3)=>any,
 * >(func, arg0, arg1, arg2, arg3) -> thunk ()=>func(arg0, arg1, arg2, arg3)
 * ```
 *
 * @description
 * Create a thunk from a function and four arguments.
 */

const thunkify4$2 = (func, arg0, arg1, arg2, arg3) => function thunk() {
  return func(arg0, arg1, arg2, arg3)
};

var thunkify4_1 = thunkify4$2;

const isPromise$y = isPromise_1;
const thunkify4$1 = thunkify4_1;
const thunkConditional$8 = thunkConditional_1;
const __$v = placeholder;
const curry3$e = curry3_1;
const noop$4 = noop_1$1;
const always$c = always_1;
const callPropBinary = callPropBinary_1;
const promiseAll$b = promiseAll_1;

/**
 * @name mapFilter
 *
 * @synopsis
 * ```coffeescript [specscript]
 * mapFilter<
 *   T any,
 *   map Map<any=>T>,
 *   predicate T=>Promise|boolean,
 * >(map, predicate) -> filteredValuesByPredicate Map<any=>T>
 * ```
 *
 * @description
 * Filter the values of a Map concurrently by predicate. `predicate` may be asynchronous.
 *
 * Note: for asynchronous predicates, the order of the resulting Map is not guaranteed
 *
 * @TODO mapFilterSeries (will guarantee order for asynchronous predicates)
 */
const mapFilter$1 = function (map, predicate) {
  const result = new Map(),
    promises = [];
  for (const [key, item] of map) {
    const predication = predicate(item, key, map);
    if (isPromise$y(predication)) {
      promises.push(predication.then(curry3$e(thunkConditional$8,
        __$v,
        thunkify4$1(callPropBinary, result, 'set', key, item),
        noop$4)));
    } else if (predication) {
      result.set(key, item);
    }
  }
  return promises.length == 0 ? result
    : promiseAll$b(promises).then(always$c(result))
};

var mapFilter_1 = mapFilter$1;

/**
 * @name objectSetIf
 *
 * @synopsis
 * ```coffeescript [specscript]
 * objectSetIf<
 *   object Object,
 *   key string,
 *   value any,
 *   condition boolean,
 * >(object, key, value, condition) -> object
 * ```
 */

const objectSetIf$1 = function (
  object, key, value, condition,
) {
  if (condition) {
    object[key] = value;
  }
};

var objectSetIf_1 = objectSetIf$1;

const promiseAll$a = promiseAll_1;
const isPromise$x = isPromise_1;
const curry4$2 = curry4_1;
const __$u = placeholder;
const always$b = always_1;
const objectSetIf = objectSetIf_1;

/**
 * @name objectFilter
 *
 * @synopsis
 * ```coffeescript [specscript]
 * objectFilter<T>(
 *   object Object<T>,
 *   predicate T=>boolean,
 * ) -> result Object<T>
 * ```
 */
const objectFilter$1 = function (object, predicate) {
  const result = {},
    promises = [];
  for (const key in object) {
    const item = object[key],
      shouldIncludeItem = predicate(item, key, object);
    if (isPromise$x(shouldIncludeItem)) {
      promises.push(shouldIncludeItem.then(
        curry4$2(objectSetIf, result, key, object[key], __$u)));
    } else if (shouldIncludeItem) {
      result[key] = item;
    }
  }
  return promises.length == 0
    ? result
    : promiseAll$a(promises).then(always$b(result))
};

var objectFilter_1 = objectFilter$1;

const __$t = placeholder;
const curry2$b = curry2_1;
const FilteringIterator = FilteringIterator_1;
const FilteringAsyncIterator = FilteringAsyncIterator_1;
const isArray$g = isArray_1;
const arrayFilter = arrayFilter_1;
const stringFilter = stringFilter_1;
const setFilter = setFilter_1;
const mapFilter = mapFilter_1;
const objectFilter = objectFilter_1;
const symbolIterator$9 = symbolIterator_1;
const symbolAsyncIterator$7 = symbolAsyncIterator_1;

/**
 * @name _filter
 *
 * @synopsis
 * ```coffeescript [specscript]
 * _filter(
 *   array Array,
 *   arrayPredicate (value any, index number, array Array)=>Promise|boolean
 * ) -> filteredArray Promise|Array
 *
 * _filter(
 *   object Object,
 *   objectPredicate (value any, key string, object Object)=>Promise|boolean
 * ) -> filteredObject Promise|Object
 *
 * _filter(
 *   set Set,
 *   setPredicate (value any, value, set Set)=>Promise|boolean
 * ) -> filteredSet Promise|Set
 *
 * _filter(
 *   map Map,
 *   mapPredicate (value any, key any, map Map)=>Promise|boolean
 * ) -> filteredMap Promise|Map
 *
 * _filter(
 *   generatorFunction GeneratorFunction,
 *   predicate (value any)=>Promise|boolean
 * ) -> filteringGeneratorFunction GeneratorFunction
 *
 * _filter(
 *   asyncGeneratorFunction AsyncGeneratorFunction,
 *   predicate (value any)=>Promise|boolean
 * ) -> filteringAsyncGeneratorFunction AsyncGeneratorFunction
 *
 * _filter(
 *   reducer Reducer,
 *   predicate (value any)=>Promise|boolean
 * ) -> filteringReducer Reducer
 * ```
 */
const _filter = function (value, predicate) {
  if (isArray$g(value)) {
    return arrayFilter(value, predicate)
  }
  if (value == null) {
    return value
  }

  if (typeof value == 'string' || value.constructor == String) {
    return stringFilter(value, predicate)
  }
  if (value.constructor == Set) {
    return setFilter(value, predicate)
  }
  if (value.constructor == Map) {
    return mapFilter(value, predicate)
  }
  if (typeof value.filter == 'function') {
    return value.filter(predicate)
  }
  if (typeof value[symbolIterator$9] == 'function') {
    return FilteringIterator(value[symbolIterator$9](), predicate)
  }
  if (typeof value[symbolAsyncIterator$7] == 'function') {
    return FilteringAsyncIterator(value[symbolAsyncIterator$7](), predicate)
  }
  if (value.constructor == Object) {
    return objectFilter(value, predicate)
  }
  return value
};

/**
 * @name filter
 *
 * @synopsis
 * ```coffeescript [specscript]
 * type Filterable = Array|Object|Set|Map|Iterator|AsyncIterator
 *
 * type Predicate = (
 *   value any,
 *   indexOrKey number|string,
 *   collection Filterable,
 * )=>boolean
 *
 * filter(collection Filterable, predicate Predicate) -> result Promise|Filterable
 * filter(predicate Predicate)(collection Filterable) -> result Promise|Filterable
 * ```
 *
 * @description
 * Filter out items from a collection based on the results of their concurrent executions with a synchronous or asynchronous predicate function. `filter` accepts the following collections:
 *
 *  * `Array`
 *  * `Object`
 *  * `Set`
 *  * `Map`
 *  * `Iterator`/`Generator`
 *  * `AsyncIterator`/`AsyncGenerator`
 *
 * For arrays (type `Array`), `filter` applies the predicate function to each item of the array, returning a new array containing only the items that tested truthy by the predicate. The order of the items is preserved. On each iteration, the predicate is passed the item, the index of the item, and a reference to the array.
 *
 * ```javascript [playground]
 * const isOdd = number => number % 2 == 1
 *
 * const array = [1, 2, 3, 4, 5]
 *
 * console.log(filter(isOdd)(array)) // [1, 3, 5]
 * console.log(filter(array, isOdd)) // [1, 3, 5]
 * ```
 *
 * For objects (type `Object`), `filter` applies the predicate function to each value of the object, returning a new object containing only the values that tested truthy by the predicate. On each iteration, the predicate is passed the object value, the key of the object value, and a reference to the object.
 *
 * ```javascript [playground]
 * const isOdd = number => number % 2 == 1
 *
 * const obj = { a: 1, b: 2, c: 3, d: 4, e: 5 }
 *
 * console.log(filter(isOdd)(obj)) // { a: 1, c: 3, e: 5 }
 * console.log(filter(obj, isOdd)) // { a: 1, c: 3, e: 5 }
 * ```
 *
 * For sets (type `Set`), `filter` applies the predicate function to each item in the set, returning a new set containing only the items that tested truthy by the predicate. On each iteration, the predicate is passed the item, the same item as the key argument, and a reference to the set.
 *
 * ```javascript [playground]
 * const isOdd = number => number % 2 == 1
 *
 * const set = new Set([1, 2, 3, 4, 5])
 *
 * console.log(filter(isOdd)(set)) // Set { 1, 3, 5 }
 * console.log(filter(set, isOdd)) // Set { 1, 3, 5 }
 * ```
 *
 * For maps (type `Map`), `filter` applies the predicate function to the value of each entry of the map, returning a new map containing only the entries where the values tested truthy by the predicate. The order of the entries are preserved. On each iteration, the predicate is passed the map value, the key of the value, and a reference to the map.
 *
 * ```javascript [playground]
 * const isOdd = number => number % 2 == 1
 *
 * const obj = { a: 1, b: 2, c: 3, d: 4, e: 5 }
 * const m = new Map([['a', 1], ['b', 2], ['c', 3], ['d', 4], ['e', 5]])
 *
 * console.log(filter(isOdd)(m)) // Map(3) { 'a' => 1, 'c' => 3, 'e' => 5 }
 * console.log(filter(m, isOdd)) // Map(3) { 'a' => 1, 'c' => 3, 'e' => 5 }
 * ```
 *
 * For iterators (type `Iterator`) or generators (type `Generator`), `filter` returns a lazily filtered iterator/generator; all values that are normally yielded by the iterator/generator that test falsy by the predicate function are skipped by the lazily filtered iterator/generator. On each iteration, the predicate is passed the iteration value only.
 *
 * ```javascript [playground]
 * const isOdd = number => number % 2 == 1
 *
 * const numbersGeneratorFunction = function* () {
 *   yield 1; yield 2; yield 3; yield 4; yield 5
 * }
 *
 * const numbersGenerator = numbersGeneratorFunction()
 * const oddNumbersGenerator = filter(numbersGeneratorFunction(), isOdd)
 * const oddNumbersGenerator2 = filter(isOdd)(numbersGeneratorFunction())
 *
 * for (const number of numbersGenerator) {
 *   console.log(number) // 1
 *                       // 2
 *                       // 3
 *                       // 4
 *                       // 5
 * }
 *
 * for (const number of oddNumbersGenerator) {
 *   console.log(number) // 1
 *                       // 3
 *                       // 5
 * }
 *
 * for (const number of oddNumbersGenerator2) {
 *   console.log(number) // 1
 *                       // 3
 *                       // 5
 * }
 * ```
 *
 * With asyncIterators (type `AsyncIterator`) or asyncGenerators (type `AsyncGenerator`), `filter` returns a lazily filtered asyncIterator/asyncGenerator; all values that are normally yielded by the asyncIterator/asyncGenerator that test falsy by the predicate function are skipped by the lazily filtered asyncIterator/asyncGenerator. On each iteration, the predicate is passed the iteration value only.
 *
 * ```javascript [playground]
 * const asyncIsOdd = async number => number % 2 == 1
 *
 * const asyncNumbersGeneratorFunction = async function* () {
 *   yield 1; yield 2; yield 3; yield 4; yield 5
 * }
 *
 * const asyncNumbersGenerator = asyncNumbersGeneratorFunction()
 *
 * const asyncOddNumbersGenerator = filter(asyncNumbersGeneratorFunction(), asyncIsOdd)
 *
 * const asyncOddNumbersGenerator2 = filter(asyncIsOdd)(asyncNumbersGeneratorFunction())
 *
 * for await (const number of asyncNumbersGenerator) {
 *   console.log(number) // 1
 *                       // 2
 *                       // 3
 *                       // 4
 *                       // 5
 * }
 *
 * for await (const number of asyncOddNumbersGenerator) {
 *   console.log(number) // 1
 *                       // 3
 *                       // 5
 * }
 *
 * for await (const number of asyncOddNumbersGenerator2) {
 *   console.log(number) // 1
 *                       // 3
 *                       // 5
 * }
 * ```
 *
 * @execution concurrent
 *
 * @transducing
 */

const filter$1 = function (...args) {
  const predicate = args.pop();
  if (args.length == 0) {
    return curry2$b(_filter, __$t, predicate)
  }
  return _filter(args[0], predicate)
};

var filter_1 = filter$1;

var filter$2 = /*@__PURE__*/getDefaultExportFromCjs(filter_1);

const isPromise$w = isPromise_1;
const promiseAll$9 = promiseAll_1;
const always$a = always_1;

/**
 * @name arrayForEach
 *
 * @synopsis
 * ```coffeescript [specscript]
 * var T any,
 *   array Array<T>,
 *   callback T=>()
 *
 * arrayForEach(array, callback) -> ()
 * ```
 *
 * @description
 * Call a callback for each item of an iterator. Return a promise if any executions are asynchronous.
 *
 * Note: iterator is consumed
 */
const arrayForEach$1 = function (array, callback) {
  const length = array.length,
    promises = [];
  let index = -1;
  while (++index < length) {
    const operation = callback(array[index]);
    if (isPromise$w(operation)) {
      promises.push(operation);
    }
  }
  return promises.length == 0 ? array : promiseAll$9(promises).then(always$a(array))
};

var arrayForEach_1 = arrayForEach$1;

const isPromise$v = isPromise_1;
const promiseAll$8 = promiseAll_1;
const always$9 = always_1;

/**
 * @name objectForEach
 *
 * @synopsis
 * ```coffeescript [specscript]
 * var T any,
 *   object Object<T>,
 *   callback T=>()
 *
 * objectForEach(object, callback) -> ()
 * ```
 *
 * @description
 * Execute a callback for each value of an object. Return a promise if any executions are asynchronous.
 */
const objectForEach$1 = function (object, callback) {
  const promises = [];
  for (const key in object) {
    const operation = callback(object[key]);
    if (isPromise$v(operation)) {
      promises.push(operation);
    }
  }
  return promises.length == 0 ? object : promiseAll$8(promises).then(always$9(object))
};

var objectForEach_1 = objectForEach$1;

const isPromise$u = isPromise_1;
const promiseAll$7 = promiseAll_1;
const always$8 = always_1;

/**
 * @name iteratorForEach
 *
 * @synopsis
 * ```coffeescript [specscript]
 * var T any,
 *   iterator Iterator<T>,
 *   callback T=>()
 *
 * iteratorForEach(iterator, callback) -> ()
 * ```
 *
 * @description
 * Call a callback for each item of an iterator. Return a promise if any executions are asynchronous.
 *
 * Note: iterator is consumed
 */
const iteratorForEach$1 = function (iterator, callback) {
  const promises = [];
  for (const item of iterator) {
    const operation = callback(item);
    if (isPromise$u(operation)) {
      promises.push(operation);
    }
  }
  return promises.length == 0 ? iterator : promiseAll$7(promises).then(always$8(iterator))
};

var iteratorForEach_1 = iteratorForEach$1;

const isPromise$t = isPromise_1;
const promiseAll$6 = promiseAll_1;
const always$7 = always_1;

/**
 * @name asyncIteratorForEach
 *
 * @synopsis
 * ```coffeescript [specscript]
 * var T any,
 *   asyncIterator AsyncIterator<T>,
 *   callback T=>()
 *
 * asyncIteratorForEach(asyncIterator, callback) -> Promise<>
 * ```
 *
 * @description
 * Execute a callback function for each item of an async iterator
 */
const asyncIteratorForEach$4 = async function (asyncIterator, callback) {
  const promises = [];
  for await (const item of asyncIterator) {
    const operation = callback(item);
    if (isPromise$t(operation)) {
      promises.push(operation);
    }
  }
  return promises.length == 0 ? asyncIterator
    : promiseAll$6(promises).then(always$7(asyncIterator))
};

var asyncIteratorForEach_1 = asyncIteratorForEach$4;

const isPromise$s = isPromise_1;
const __$s = placeholder;
const curry2$a = curry2_1;
const isArray$f = isArray_1;
const arrayForEach = arrayForEach_1;
const objectForEach = objectForEach_1;
const iteratorForEach = iteratorForEach_1;
const asyncIteratorForEach$3 = asyncIteratorForEach_1;
const symbolIterator$8 = symbolIterator_1;
const symbolAsyncIterator$6 = symbolAsyncIterator_1;

// type Collection = Array|Iterable|AsyncIterable|{ forEach: function }|Object
// _forEach(collection Collection, callback function) -> collection Collection
const _forEach = function (collection, callback) {
  if (isArray$f(collection)) {
    return arrayForEach(collection, callback)
  }
  if (collection == null) {
    return collection
  }
  if (typeof collection.forEach == 'function') {
    return collection.forEach(callback)
  }
  if (typeof collection[symbolIterator$8] == 'function') {
    return iteratorForEach(collection[symbolIterator$8](), callback)
  }
  if (typeof collection[symbolAsyncIterator$6] == 'function') {
    return asyncIteratorForEach$3(collection[symbolAsyncIterator$6](), callback)
  }
  if (collection.constructor == Object) {
    return objectForEach(collection, callback)
  }
  return collection
};

/**
 * @name forEach
 *
 * @synopsis
 * ```coffeescript [specscript]
 * type Collection = Array|Iterable|AsyncIterable|{ forEach: function }|Object
 *
 * forEach(collection Collection, callback function) -> collection Collection
 *
 * forEach(callback function)(collection Collection) -> collection Collection
 * ```
 *
 * @description
 * Execute a callback for each item of a collection, returning a Promise if the execution is asynchronous.
 *
 * ```javascript [playground]
 * forEach([1, 2, 3, 4, 5l], console.log) // 1 2 3 4 5
 *
 * forEach({ a: 1, b: 2, c: 3 }, console.log) // 1 2 3
 * ```
 *
 * Omit the data argument for a composable API
 *
 * ```javascript [playground]
 * pipe([1, 2, 3, 4, 5], [
 *   filter(number => number % 2 == 1),
 *   map(number => number ** 2),
 *   forEach(console.log), // 1
 *                         // 9
 *                         // 25
 * ])
 * ```
 */
const forEach = function (...args) {
  const callback = args.pop();
  if (args.length == 0) {
    return curry2$a(_forEach, __$s, callback)
  }
  const collection = args[0];
  return isPromise$s(collection)
    ? collection.then(curry2$a(_forEach, __$s, callback))
    : _forEach(collection, callback)
};

var forEach_1 = forEach;

var forEach$1 = /*@__PURE__*/getDefaultExportFromCjs(forEach_1);

/**
 * @name thunkifyArgs
 *
 * @synopsis
 * ```coffeescript [specscript]
 * thunkifyArgs(func function, args Array) -> ()=>func(...args)
 * ```
 *
 * @synopsis
 * Create a thunk from a function and an arguments array.
 */

const thunkifyArgs$1 = (func, args) => function thunk() {
  return func(...args)
};

var thunkifyArgs_1 = thunkifyArgs$1;

const __$r = placeholder;

// argument resolver for curryArgs2
const curryArgs2ResolveArgs0 = (
  baseFunc, arg1, arg2,
) => function args0Resolver(...args) {
  return baseFunc(args, arg1)
};

// argument resolver for curryArgs2
const curryArgs2ResolveArgs1 = (
  baseFunc, arg0, arg2,
) => function arg1Resolver(...args) {
  return baseFunc(arg0, args)
};

/**
 * @name curryArgs2
 *
 * @synopsis
 * ```coffeescript [specscript]
 * type __ = Symbol('placeholder')
 *
 * curryArgs2(
 *   baseFunc function,
 *   arg0 __|any,
 *   arg1 __|any,
 * ) -> function
 * ```
 *
 * @description
 * Curry arguments for a 2-ary function. Arguments are supplied in placeholder position as an array.
 *
 * Note: at least one argument must be the placeholder
 */
const curryArgs2$2 = function (baseFunc, arg0, arg1) {
  if (arg0 == __$r) {
    return curryArgs2ResolveArgs0(baseFunc, arg1)
  }
  return curryArgs2ResolveArgs1(baseFunc, arg0)
};

var curryArgs2_1 = curryArgs2$2;

const isPromise$r = isPromise_1;
const always$6 = always_1;
const thunkifyArgs = thunkifyArgs_1;
const thunkConditional$7 = thunkConditional_1;
const curry3$d = curry3_1;
const curryArgs2$1 = curryArgs2_1;
const __$q = placeholder;

// _tap(args Array, func function) -> Promise|any
const _tap = function (args, func) {
  const result = args[0],
    call = func(...args);
  return isPromise$r(call) ? call.then(always$6(result)) : result
};

/**
 * @name tap
 *
 * @synopsis
 * ```coffeescript [specscript]
 * tap(...args, func function) -> Promise|args[0]
 * tap(func function)(...args) -> Promise|args[0]
 * ```
 *
 * @description
 * Call a function with any number of arguments, returning the first argument. Promises created by the tapper are resolved before returning the value.
 *
 * ```javascript [playground]
 * const pipeline = pipe([
 *   tap(value => console.log(value)),
 *   tap(value => console.log(value + 'bar')),
 *   tap(value => console.log(value + 'barbaz')),
 * ])
 *
 * pipeline('foo') // 'foo'
 *                 // 'foobar'
 *                 // 'foobarbaz'
 * ```
 */
const tap$1 = function (...args) {
  const func = args.pop();
  if (args.length == 0) {
    return curryArgs2$1(_tap, __$q, func)
  }
  return _tap(args, func)
};

/**
 * @name tap.if
 *
 * @synopsis
 * ```coffeescript [specscript]
 * tap.if(predicate function, func function)(...args) -> Promise|args[0]
 * ```
 *
 * @description
 * A version of `tap` that accepts a predicate function (a function that returns a boolean value) before the function to execute. Only executes the function if the predicate function tests true for the same arguments provided to the execution function.
 *
 * ```javascript [playground]
 * const isOdd = number => number % 2 == 1
 *
 * const logIfOdd = tap.if(
 *   isOdd,
 *   number => console.log(number, 'is an odd number')
 * )
 *
 * logIfOdd(2)
 * logIfOdd(3) // 3 is an odd number
 * ```
 */
tap$1.if = (predicate, func) => function tappingIf(...args) {
  const predication = predicate(...args);
  if (isPromise$r(predication)) {
    return predication.then(curry3$d(
      thunkConditional$7, __$q, thunkifyArgs(tap$1(func), args), always$6(args[0])))
  }
  if (predication) {
    const execution = func(...args);
    if (isPromise$r(execution)) {
      return execution.then(always$6(args[0]))
    }
  }
  return args[0]
};

var tap_1 = tap$1;

var tap$2 = /*@__PURE__*/getDefaultExportFromCjs(tap_1);

const areAnyValuesPromises = areAnyValuesPromises_1;
const isPromise$q = isPromise_1;
const promiseAll$5 = promiseAll_1;
const __$p = placeholder;
const curry2$9 = curry2_1;
const curryArgs2 = curryArgs2_1;

// negate(value boolean) -> inverse boolean
const negate = value => !value;

// _not(args Array, predicate function)
const _not = function (args, predicate) {
  const boolean = predicate(...args);
  return isPromise$q(boolean) ? boolean.then(negate) : !boolean
};

/**
 * @name not
 *
 * @synopsis
 * ```coffeescript [specscript]
 * not(value boolean) -> negated boolean
 *
 * not(...args, predicate function) -> negated boolean
 *
 * not(predicate function)(...args) -> negated boolean
 * ```
 *
 * @description
 * Negate a value like the [logical NOT (`!`)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Logical_NOT) operator.
 *
 * ```javascript [playground]
 * const myObj = { a: 1 }
 *
 * console.log(not('a' in myObj)) // false
 * console.log(not('b' in myObj)) // true
 * ```
 *
 * If provided a predicate function, `not` returns a logically inverted predicate that returns true everywhere the original predicate would have returned false.
 *
 * ```javascript [playground]
 * const isOdd = number => number % 2 == 1
 *
 * console.log(
 *   not(isOdd)(3),
 * ) // false
 * ```
 */

const not$1 = function (...args) {
  const predicateOrValue = args.pop();
  if (typeof predicateOrValue == 'function') {
    if (args.length == 0) {
      return curryArgs2(_not, __$p, predicateOrValue)
    }
    if (areAnyValuesPromises(args)) {
      return promiseAll$5(args).then(curry2$9(_not, __$p, predicateOrValue))
    }
    return _not(args, predicateOrValue)
  }
  return !predicateOrValue
};

var not_1 = not$1;

var not$2 = /*@__PURE__*/getDefaultExportFromCjs(not_1);

/**
 * @name isString
 *
 * @synopsis
 * ```coffeescript [specscript]
 * isString(value any) -> boolean
 * ```
 *
 * @description
 * Determine whether a value is a string.
 *
 * ```javascript [playground]
 * import isString from 'https://unpkg.com/rubico/dist/x/isString.es.js'
 *
 * console.log(
 *   isString('hey'),
 * ) // true
 * ```
 */

const isString$3 = function (value) {
  return typeof value == 'string'
    || (value != null && value.constructor == String)
};

var isString_1 = isString$3;

const isString$2 = isString_1;
const isArray$e = isArray_1;

/**
 * @name append
 *
 * @synopsis
 * ```coffeescript [specscript]
 * append(
 *   item string|Array,
 * )(value string|Array) -> string|array
 * ```
 *
 * @description
 * Append a string or an array.
 *
 * ```javascript [playground]
 * import append from 'https://unpkg.com/rubico/dist/x/append.es.js'
 *
 * const myArray = ['orange', 'apple']
 *
 * {
 *   const result = append(['ananas'])(myArray)
 *   console.log(result) // ['orange', 'apple', 'ananas']
 * }
 *
 * {
 *   const result = append('ananas')(myArray)
 *   console.log(result) // ['orange', 'apple', 'ananas']
 * }
 *
 * {
 *   const result = append('world')('hello ')
 *   console.log(result) // 'hello world'
 * }
 * ```
 *
 * @since 1.7.3
 */

const append$1 = item => function appendFunc(value) {

    if (isArray$e(value)) {
      if (isArray$e(item)){
        return [...value, ...item]
      }
      return [...value, item]
    }

    if (isString$2(value)){
      if (!isString$2(item)){
        throw new TypeError(`${item} is not a string`)
      }
      return `${value}${item}`
    }

    throw new TypeError(`${value} is not an Array or string`)
  };

var append_1 = append$1;

/**
 * @name callProp
 *
 * @synopsis
 * ```coffeescript [specscript]
 * callProp(property string, ...args)(object) -> object[property](...args)
 * ```
 *
 * @description
 * Calls a property on an object with arguments.
 *
 * ```javascript [playground]
 * import callProp from 'https://unpkg.com/rubico/dist/x/callProp.es.js'
 *
 * const priceRoundedDown = callProp('toFixed', 2)(5.992)
 * console.log('priceRoundedDown:', priceRoundedDown) // '5.99'
 * ```
 */

const callProp$1 = (property, ...args) => function callingProp(object) {
  return object[property](...args)
};

var callProp_1 = callProp$1;

const isArray$d = isArray_1;

/**
 * @name arrayDefaultsDeepFromArray
 *
 * @synopsis
 * ```coffeescript [specscript]
 * var array Array<Array|Object|any>,
 *   defaultArray Array<Array|Object|any>,
 *
 * arrayDefaultsDeepFromArray(array, defaultArray) -> Array
 * ```
 */
const arrayDefaultsDeepFromArray = function (array, defaultArray) {
  const defaultArrayLength = defaultArray.length,
    result = array.slice();
  let index = -1;
  while (++index < defaultArrayLength) {
    const item = array[index],
      defaultItem = defaultArray[index];
    if (isArray$d(item) && isArray$d(defaultItem)) {
      result[index] = arrayDefaultsDeepFromArray(item, defaultItem);
    } else if (item == null) {
      result[index] = defaultItem;
    } else if (defaultItem == null) {
      result[index] = item;
    } else if (item.constructor == Object && defaultItem.constructor == Object) {
      result[index] = objectDefaultsDeepFromObject(item, defaultItem);
    } else {
      result[index] = item;
    }
  }
  return result
};

/**
 * @name objectDefaultsDeepFromObject
 *
 * @synopsis
 * ```coffeescript [specscript]
 * var object Object<Array|Object|any>,
 *   defaultObject Object<Array|Object|any>
 *
 * objectDefaultsDeepFromObject(object, defaultObject) -> Object
 * ```
 */
const objectDefaultsDeepFromObject = function (object, defaultObject) {
  const result = { ...object };
  for (const key in defaultObject) {
    const item = object[key],
      defaultItem = defaultObject[key];
    if (isArray$d(item) && isArray$d(defaultItem)) {
      result[key] = arrayDefaultsDeepFromArray(item, defaultItem);
    } else if (item == null) {
      result[key] = defaultItem;
    } else if (defaultItem == null) {
      result[key] = item;
    } else if (item.constructor == Object && defaultItem.constructor == Object) {
      result[key] = objectDefaultsDeepFromObject(item, defaultItem);
    } else {
      result[key] = item;
    }
  }
  return result
};

/**
 * @name defaultsDeep
 *
 * @synopsis
 * ```coffeescript [specscript]
 * var defaultCollection Array|Object,
 *   value Array|Object
 *
 * defaultsDeep(defaultCollection)(value) -> Array|Object
 * ```
 *
 * @description
 * Deeply assign default values to an array or object by an array or object of possibly nested default values.
 *
 * ```javascript [playground]
 * import defaultsDeep from 'https://unpkg.com/rubico/dist/x/defaultsDeep.es.js'
 *
 * const defaultUser = defaultsDeep({
 *   name: 'placeholder',
 *   images: [
 *     { url: 'https://via.placeholder.com/150' },
 *     { url: 'https://via.placeholder.com/150' },
 *     { url: 'https://via.placeholder.com/150' },
 *   ],
 * })
 *
 * console.log(defaultUser({
 *   name: 'George',
 *   images: [{ url: 'https://via.placeholder.com/150/0000FF/808080%20?Text=Digital.com' }],
 * }))
 * // {
 * //   name: 'George',
 * //   images: [
 * //    { url: 'https://via.placeholder.com/150/0000FF/808080%20?Text=Digital.com' },
 * //    { url: 'https://via.placeholder.com/150' },
 * //    { url: 'https://via.placeholder.com/150' },
 * //   ],
 * // }
 * ```
 */
const defaultsDeep$1 = defaultCollection => function defaulting(value) {
  if (isArray$d(value) && isArray$d(defaultCollection)) {
    return arrayDefaultsDeepFromArray(value, defaultCollection)
  }
  if (value == null || defaultCollection == null) {
    return value
  }
  if (value.constructor == Object && defaultCollection.constructor == Object) {
    return objectDefaultsDeepFromObject(value, defaultCollection)
  }
  return value
};

var defaultsDeep_1 = defaultsDeep$1;

/**
 * @name thunkify2
 *
 * @synopsis
 * ```coffeescript [specscript]
 * thunkify2<
 *   arg0 any,
 *   arg1 any,
 *   func (arg0, arg1)=>any,
 * >(func, arg0, arg1) -> thunk ()=>func(arg0, arg1)
 * ```
 *
 * @description
 * Create a thunk from a function and two arguments.
 */

const thunkify2$3 = (func, arg0, arg1) => function thunk() {
  return func(arg0, arg1)
};

var thunkify2_1 = thunkify2$3;

/**
 * @name thunkify5
 *
 * @synopsis
 * ```coffeescript [specscript]
 * thunkify5<
 *   arg0 any,
 *   arg1 any,
 *   arg2 any,
 *   arg3 any,
 *   arg4 any,
 *   func (arg0, arg1, arg2, arg3, arg4)=>any,
 * >(func, arg0, arg1, arg2, arg3, arg4) -> thunk ()=>func(arg0, arg1, arg2, arg3, arg4)
 * ```
 *
 * @description
 * Create a thunk from a function and five arguments.
 */

const thunkify5$1 = (func, arg0, arg1, arg2, arg3, arg4) => function thunk() {
  return func(arg0, arg1, arg2, arg3, arg4)
};

var thunkify5_1 = thunkify5$1;

/**
 * @name SelfReferencingPromise
 *
 * @synopsis
 * ```coffeescript [specscript]
 * SelfReferencingPromise(basePromise Promise<T>) -> Promise<[T, basePromise]>
 * ```
 */

const SelfReferencingPromise$1 = function (basePromise) {
  const promise = basePromise.then(res => [res, promise]);
  return promise
};

var SelfReferencingPromise_1 = SelfReferencingPromise$1;

const SelfReferencingPromise = SelfReferencingPromise_1;
const isPromise$p = isPromise_1;
const promiseRace$1 = promiseRace_1;

/**
 * @name asyncArraySome
 *
 * @synopsis
 * ```coffeescript [specscript]
 * asyncArraySome(
 *   array Array,
 *   predicate any=>Promise|boolean,
 *   index number,
 *   promisesInFlight Set<Promise>,
 * ) -> boolean
 * ```
 */
const asyncArraySome = async function (
  array, predicate, index, promisesInFlight,
) {
  const length = array.length;

  while (++index < length) {
    const predication = predicate(array[index]);
    if (isPromise$p(predication)) {
      promisesInFlight.add(SelfReferencingPromise(predication));
    } else if (predication) {
      return true
    }
  }
  while (promisesInFlight.size > 0) {
    const [predication, promise] = await promiseRace$1(promisesInFlight);
    promisesInFlight.delete(promise);
    if (predication) {
      return true
    }
  }
  return false
};

/**
 * @name arraySome
 *
 * @synopsis
 * ```coffeescript [specscript]
 * arraySome(
 *   array Array,
 *   predicate any=>Promise|boolean,
 * ) -> boolean
 * ```
 */
const arraySome$1 = function (array, predicate) {
  const length = array.length;
  let index = -1;
  while (++index < length) {
    const predication = predicate(array[index]);
    if (isPromise$p(predication)) {
      return asyncArraySome(
        array, predicate, index, new Set([SelfReferencingPromise(predication)]))
    }
    if (predication) {
      return true
    }
  }
  return false
};

var arraySome_1 = arraySome$1;

/**
 * @name arrayPush
 *
 * @synopsis
 * arrayPush(
 *   array Array,
 *   value any
 * ) -> array
 */

const arrayPush$5 = function (array, value) {
  array.push(value);
  return array
};

var arrayPush_1 = arrayPush$5;

/**
 * @name funcConcatSync
 *
 * @synopsis
 * ```coffeescript [specscript]
 * funcConcatSync<
 *   args ...any,
 *   intermediate any,
 *   result any,
 * >(
 *   funcA ...args=>intermediate,
 *   funcB intermediate=>result
 * ) -> pipedFunction ...args=>result
 * ```
 */

const funcConcatSync$4 = (
  funcA, funcB,
) => function pipedFunction(...args) {
  return funcB(funcA(...args))
};

var funcConcatSync_1 = funcConcatSync$4;

const __$o = placeholder;
const curry2$8 = curry2_1;
const curry3$c = curry3_1;
const thunkify2$2 = thunkify2_1;
const thunkify5 = thunkify5_1;
const thunkConditional$6 = thunkConditional_1;
const isPromise$o = isPromise_1;
const isArray$c = isArray_1;
const arraySome = arraySome_1;
const arrayPush$4 = arrayPush_1;
const funcConcatSync$3 = funcConcatSync_1;
const noop$3 = noop_1$1;

/**
 * @name differenceWithArrayAsync
 *
 * @synopsis
 * ```coffeescript [specscript]
 * differenceWithArrayAsync(
 *   comparator (any, any)=>Promise|boolean,
 *   allValues Array,
 *   array Array,
 *   result Array,
 *   index number,
 * ) -> result Promise<Array>
 * ```
 */
const differenceWithArrayAsync = async function (
  comparator, allValues, array, result, index
) {
  const allValuesLength = allValues.length;
  while (++index < allValuesLength) {
    const item = allValues[index];
    let doesItemExistByComparator = arraySome(array, curry2$8(comparator, item, __$o));
    if (isPromise$o(doesItemExistByComparator)) {
      doesItemExistByComparator = await doesItemExistByComparator;
    }
    if (!doesItemExistByComparator) {
      result.push(item);
    }
  }
  return result
};

/**
 * @name differenceWithArray
 *
 * @synopsis
 * ```coffeescript [specscript]
 * differenceWithArray(
 *   comparator (any, any)=>Promise|boolean,
 *   allValues Array,
 *   array Array,
 * ) -> someOrAllValues Promise|Array
 * ```
 */
const differenceWithArray = function (comparator, allValues, array) {
  const allValuesLength = allValues.length,
    result = [];
  let index = -1;
  while (++index < allValuesLength) {
    const item = allValues[index],
      doesItemExistByComparator = arraySome(array, curry2$8(comparator, item, __$o));
    if (isPromise$o(doesItemExistByComparator)) {
      return doesItemExistByComparator.then(funcConcatSync$3(
        curry3$c(thunkConditional$6, __$o, noop$3, thunkify2$2(arrayPush$4, result, item)),
        thunkify5(differenceWithArrayAsync, comparator, allValues, array, result, index)))
    } else if (!doesItemExistByComparator) {
      result.push(item);
    }
  }
  return result
};

/**
 * @name differenceWith
 *
 * @synopsis
 * ```coffeescript [specscript]
 * differenceWith(
 *   comparator (any, any)=>Promise|boolean,
 *   allValues Array,
 * )(values Array) -> someOrAllValues Array
 * ```
 *
 * @description
 * Create an array of all the values in an array that are not in another array as dictated by a comparator.
 *
 * ```javascript [playground]
 * import differenceWith from 'https://unpkg.com/rubico/dist/x/differenceWith.es.js'
 * import isDeepEqual from 'https://unpkg.com/rubico/dist/x/isDeepEqual.es.js'
 *
 * console.log(
 *   differenceWith(isDeepEqual, [{ a: 1 }, { b: 2 }, { c: 3 }])([{ b: 2 }]),
 * ) // [{ a: 1 }, { c: 3 }]
 * ```
 */
const differenceWith$1 = (
  comparator, allValues,
) => function excludingValues(values) {
  if (isArray$c(values)) {
    return differenceWithArray(comparator, allValues, values)
  }
  throw new TypeError(`${values} is not an Array`)
};

var differenceWith_1 = differenceWith$1;

const filter = filter_1;
const not = not_1;

/**
 * @name filterOut
 *
 * @synopsis
 * ```coffeescript [specscript]
 * filterOut(
 *   arrayPredicate (value any, index number, array Array)=>Promise|boolean
 * )(array) -> rejectedArray Promise|Array
 *
 * filterOut(
 *   objectPredicate (value any, key string, object Object)=>Promise|boolean
 * )(object) -> rejectedObject Promise|Object
 *
 * filterOut(
 *   setPredicate (value any, value, set Set)=>Promise|boolean
 * )(set) -> rejectedSet Promise|Set
 *
 * filterOut(
 *   mapPredicate (value any, key any, map Map)=>Promise|boolean
 * )(map) -> rejectedMap Promise|Map
 *
 * filterOut(
 *   predicate (value any)=>Promise|boolean
 * )(generatorFunction GeneratorFunction) -> rejectingGeneratorFunction GeneratorFunction
 *
 * filterOut(
 *   predicate (value any)=>Promise|boolean
 * )(asyncGeneratorFunction AsyncGeneratorFunction) -> rejectingAsyncGeneratorFunction AsyncGeneratorFunction
 *
 * filterOut(
 *   predicate (value any)=>Promise|boolean
 * )(reducer Reducer) -> rejectingReducer Reducer
 * ```
 *
 * @description
 * The inverse of `filter`. Values that test true by the predicate are filtered out, or "rejected".
 */
const filterOut$1 = predicate => filter(not(predicate));

var filterOut_1 = filterOut$1;

/**
 * @name objectValues
 *
 * @synopsis
 * objectValues<T>(object Object<T>) -> Array<T>
 *
 * @description
 * Dereferenced `Object.values`
 */

const objectValues$2 = Object.values;

var objectValues_1 = objectValues$2;

/**
 * @name thunkify3
 *
 * @synopsis
 * ```coffeescript [specscript]
 * thunkify3<
 *   arg0 any,
 *   arg1 any,
 *   arg2 any,
 *   func (arg0, arg1, arg2)=>any,
 * >(func, arg0, arg1, arg2) -> thunk ()=>func(arg0, arg1, arg2)
 * ```
 *
 * @description
 * Create a thunk from a function and three arguments.
 */

const thunkify3$2 = (func, arg0, arg1, arg2) => function thunk() {
  return func(arg0, arg1, arg2)
};

var thunkify3_1 = thunkify3$2;

const isPromise$n = isPromise_1;
const __$n = placeholder;
const curry3$b = curry3_1;
const thunkify3$1 = thunkify3_1;
const thunkConditional$5 = thunkConditional_1;
const always$5 = always_1;

/**
 * @name arrayFindAsync
 *
 * @synopsis
 * ```coffeescript [specscript]
 * var T any,
 *   array Array<T>,
 *   predicate T=>Promise|boolean,
 *   result Promise<T|undefined>
 *
 * arrayFindAsync(array, predicate) -> result
 * ```
 */
const arrayFindAsync = async function (array, predicate, index) {
  const length = array.length;
  while (++index < length) {
    const item = array[index];
    let predication = predicate(item);
    if (isPromise$n(predication)) {
      predication = await predication;
    }
    if (predication) {
      return item
    }
  }
  return undefined
};

/**
 * @name arrayFind
 *
 * @synopsis
 * ```coffeescript [specscript]
 * var T any,
 *   array Array<T>,
 *   predicate T=>Promise|boolean,
 *   result Promise|T|undefined
 *
 * arrayFind(array, predicate) -> result
 * ```
 */
const arrayFind$1 = function (array, predicate) {
  const length = array.length;
  let index = -1;
  while (++index < length) {
    const item = array[index],
      predication = predicate(item);
    if (isPromise$n(predication)) {
      return predication.then(curry3$b(
        thunkConditional$5,
        __$n,
        always$5(item),
        thunkify3$1(arrayFindAsync, array, predicate, index)))
    } else if (predication) {
      return item
    }
  }
  return undefined
};

var arrayFind_1 = arrayFind$1;

const isPromise$m = isPromise_1;
const curry3$a = curry3_1;
const __$m = placeholder;
const thunkify2$1 = thunkify2_1;
const thunkConditional$4 = thunkConditional_1;
const always$4 = always_1;

/**
 * @name iteratorFindAsync
 *
 * @synopsis
 * var T any,
 *   iterator Iterator<T>,
 *   predicate T=>Promise|boolean
 *
 * iteratorFindAsync(iterator, predicate) -> Promise<T|undefined>
 */
const iteratorFindAsync = async function (iterator, predicate) {
  let iteration = iterator.next();
  while (!iteration.done) {
    const item = iteration.value;
    let predication = predicate(item);
    if (isPromise$m(predication)) {
      predication = await predication;
    }
    if (predication) {
      return item
    }
    iteration = iterator.next();
  }
  return undefined
};

/**
 * @name iteratorFind
 *
 * @synopsis
 * var T any,
 *   iterator Iterator<T>,
 *   predicate T=>Promise|boolean
 *
 * iteratorFind(iterator, predicate) -> Promise|T|undefined
 */
const iteratorFind$1 = function (iterator, predicate) {
  let iteration = iterator.next();
  while (!iteration.done) {
    const item = iteration.value,
      predication = predicate(item);
    if (isPromise$m(predication)) {
      return predication.then(curry3$a(
        thunkConditional$4,
        __$m,
        always$4(item),
        thunkify2$1(iteratorFindAsync, iterator, predicate)))
    } else if (predication) {
      return item
    }
    iteration = iterator.next();
  }
  return undefined
};

var iteratorFind_1 = iteratorFind$1;

const isPromise$l = isPromise_1;

/**
 * @name asyncIteratorFind
 *
 * @synopsis
 * var T any,
 *   asyncIterator AsyncIterator<T>,
 *   predicate T=>Promise|boolean
 *
 * asyncIteratorFind(asyncIterator, predicate) -> Promise|T|undefined
 */
const asyncIteratorFind$1 = async function (asyncIterator, predicate) {
  let iteration = await asyncIterator.next();
  while (!iteration.done) {
    const item = iteration.value;
    let predication = predicate(item);
    if (isPromise$l(predication)) {
      predication = await predication;
    }
    if (predication) {
      return item
    }
    iteration = await asyncIterator.next();
  }
  return undefined
};

var asyncIteratorFind_1 = asyncIteratorFind$1;

const isArray$b = isArray_1;
const symbolIterator$7 = symbolIterator_1;
const symbolAsyncIterator$5 = symbolAsyncIterator_1;
const objectValues$1 = objectValues_1;
const arrayFind = arrayFind_1;
const iteratorFind = iteratorFind_1;
const asyncIteratorFind = asyncIteratorFind_1;

/**
 * @name find
 *
 * @synopsis
 * ```coffeescript [specscript]
 * Foldable<T> = Iterable<T>|AsyncIterable<T>|{ reduce: (any, T)=>any }|Object<T>
 *
 * var T any,
 *   predicate T=>Promise|boolean,
 *   foldable Foldable<T>,
 *   result Promise|T|undefined
 *
 * find(predicate)(foldable) -> result
 * ```
 *
 * @description
 * Get the first item in a foldable collection that matches a predicate.
 *
 * ```javascript [playground]
 * import find from 'https://unpkg.com/rubico/dist/x/find.es.js'
 *
 * const users = [
 *   { name: 'John', age: 16 },
 *   { name: 'Jill', age: 32 },
 *   { name: 'George', age: 51 },
 * ]
 *
 * console.log(
 *   find(user => user.age > 50)(users),
 * ) // { name: 'George', age: 51 }
 * ```
 */
const find$1 = predicate => function finding(value) {
  if (isArray$b(value)) {
    return arrayFind(value, predicate)
  }
  if (value == null) {
    return undefined
  }
  if (typeof value[symbolIterator$7] == 'function') {
    return iteratorFind(value[symbolIterator$7](), predicate)
  }
  if (typeof value[symbolAsyncIterator$5] == 'function') {
    return asyncIteratorFind(value[symbolAsyncIterator$5](), predicate)
  }
  if (typeof value.find == 'function') {
    return value.find(predicate)
  }
  if (value.constructor == Object) {
    return arrayFind(objectValues$1(value), predicate)
  }
  return undefined
};

var find_1 = find$1;

const isPromise$k = isPromise_1;
const thunkConditional$3 = thunkConditional_1;
const __$l = placeholder;
const always$3 = always_1;
const curry3$9 = curry3_1;
const thunkify3 = thunkify3_1;

/**
 * @name findIndexAsync
 *
 * @synopsis
 * ```coffeescript [specscript]
 * findIndexAsync(
 *   predicate function,
 *   array Array,
 *   index number
 * ) -> index Promise<number>
 * ```
 */
const findIndexAsync = async function (predicate, array, index) {
  const length = array.length;
  while (++index < length) {
    let predication = predicate(array[index]);
    if (isPromise$k(predication)) {
      predication = await predication;
    }
    if (predication) {
      return index
    }
  }
  return -1
};

/**
 * @name findIndex
 *
 * @synopsis
 * ```coffeescript [specscript]
 * findIndex(predicate function)(array Array) -> index Promise|number
 * ```
 *
 * @description
 * Returns the index of the first element in an array that satisfies the predicate. Returns -1 if no element satisfies the predicate.
 *
 * ```javascript [playground]
 * import findIndex from 'https://unpkg.com/rubico/dist/x/findIndex.es.js'
 *
 * const oddNumberIndex = findIndex(function isOdd(number) {
 *   return number % 2 == 1
 * })([2, 3, 5])
 *
 * console.log(oddNumberIndex) // 1
 * ```
 *
 * @since 1.6.26
 */
const findIndex$1 = predicate => function findingIndex(array) {
  const length = array.length;
  let index = -1;
  while (++index < length) {
    const predication = predicate(array[index]);
    if (isPromise$k(predication)) {
      return predication.then(curry3$9(
        thunkConditional$3,
        __$l,
        always$3(index),
        thunkify3(findIndexAsync, predicate, array, index),
      ))
    }
    if (predication) {
      return index
    }
  }
  return -1
};

var findIndex_1 = findIndex$1;

/**
 * @name first
 *
 * @synopsis
 * ```coffeescript [specscript]
 * var value Array|string
 *
 * first(value) -> any
 * ```
 *
 * @description
 * Get the first item of a collection
 *
 * ```javascript [playground]
 * import first from 'https://unpkg.com/rubico/dist/x/first.es.js'
 *
 * console.log(first([1, 2, 3])) // 1
 * console.log(first('abc')) // 'a'
 * console.log(first([])) // undefined
 * ```
 */

const first$1 = value => value == null ? undefined : value[0];

var first_1 = first$1;

/**
 * @name getArg1
 *
 * @synopsis
 * getArg1(arg0 any, arg1 any) -> arg1
 */

const getArg1$2 = (arg0, arg1) => arg1;

var getArg1_1 = getArg1$2;

/**
 * @name identity
 *
 * @synopsis
 * identity(value any) -> value
 *
 * @description
 * Returns the first argument
 */

const identity$6 = value => value;

var identity_1$1 = identity$6;

const __$k = placeholder;
const arrayPush$3 = arrayPush_1;
const always$2 = always_1;
const curry2$7 = curry2_1;
const getArg1$1 = getArg1_1;
const identity$5 = identity_1$1;
const isArray$a = isArray_1;
const isPromise$j = isPromise_1;
const promiseAll$4 = promiseAll_1;
const funcConcatSync$2 = funcConcatSync_1;
const asyncIteratorForEach$2 = asyncIteratorForEach_1;
const symbolIterator$6 = symbolIterator_1;
const symbolAsyncIterator$4 = symbolAsyncIterator_1;

/**
 * @name arrayFlatten
 *
 * @synopsis
 * ```coffeescript [specscript]
 * Stream<T> = { read: ()=>T, write: T=>() }
 * Monad<T> = Array<T>|String<T>|Set<T>
 *   |TypedArray<T>|Stream<T>|Iterator<Promise|T>
 *   |{ chain: T=>Monad<T> }|{ flatMap: T=>Monad<T> }|Object<T>
 * Reducer<T> = (any, T)=>Promise|any
 * Foldable<T> = Iterable<T>|AsyncIterable<T>|{ reduce: Reducer<T> }|Object<T>
 *
 * arrayFlatten<
 *   T any,
 *   array Array<Monad<T>|Foldable<T>|T>
 * >(array) -> Array<T>
 * ```
 */
const arrayFlatten$4 = function (array) {
  const length = array.length,
    promises = [],
    result = [];
  let index = -1;

  while (++index < length) {
    const item = array[index];
    if (isArray$a(item)) {
      const itemLength = item.length;
      let itemIndex = -1;
      while (++itemIndex < itemLength) {
        result.push(item[itemIndex]);
      }
    } else if (item == null) {
      result.push(item);
    } else if (typeof item.then == 'function') {
      promises.push(item.then(curry2$7(arrayPush$3, result, __$k)));
    } else if (typeof item[symbolIterator$6] == 'function') {
      for (const subItem of item) {
        result.push(subItem);
      }
    } else if (typeof item[symbolAsyncIterator$4] == 'function') {
      promises.push(asyncIteratorForEach$2(
        item[symbolAsyncIterator$4](), curry2$7(arrayPush$3, result, __$k)));
    } else if (typeof item.chain == 'function') {
      const monadValue = item.chain(identity$5);
      isPromise$j(monadValue)
        ? promises.push(monadValue.then(curry2$7(arrayPush$3, result, __$k)))
        : result.push(monadValue);
    } else if (typeof item.flatMap == 'function') {
      const monadValue = item.flatMap(identity$5);
      isPromise$j(monadValue)
        ? promises.push(monadValue.then(curry2$7(arrayPush$3, result, __$k)))
        : result.push(monadValue);
    } else if (typeof item.reduce == 'function') {
      const folded = item.reduce(funcConcatSync$2(
        getArg1$1, curry2$7(arrayPush$3, result, __$k)), null);
      isPromise$j(folded) && promises.push(folded);
    } else if (item.constructor == Object) {
      for (const key in item) {
        result.push(item[key]);
      }
    } else {
      result.push(item);
    }
  }
  return promises.length == 0
    ? result
    : promiseAll$4(promises).then(always$2(result))
};

var arrayFlatten_1 = arrayFlatten$4;

const __$j = placeholder;
const curry3$8 = curry3_1;
const identity$4 = identity_1$1;
const isPromise$i = isPromise_1;
const isArray$9 = isArray_1;
const promiseAll$3 = promiseAll_1;
const asyncIteratorForEach$1 = asyncIteratorForEach_1;
const symbolIterator$5 = symbolIterator_1;
const symbolAsyncIterator$3 = symbolAsyncIterator_1;
const callPropUnary$1 = callPropUnary_1;

/**
 * @name setFlatten
 *
 * @synopsis
 * ```coffeescript [specscript]
 * Stream<T> = { read: ()=>T, write: T=>() }
 * Monad<T> = Array<T>|String<T>|Set<T>
 *   |TypedArray<T>|Stream<T>|Iterator<Promise|T>
 *   |{ chain: T=>Monad<T> }|{ flatMap: T=>Monad<T> }|Object<T>
 * Reducer<T> = (any, T)=>Promise|any
 * Foldable<T> = Iterable<T>|AsyncIterable<T>|{ reduce: Reducer<T> }|Object<T>
 *
 * setFlatten<T>(
 *   set Set<Monad<T>|Foldable<T>|T>,
 * ) -> flattened Set<T>
 * ```
 */
const setFlatten$2 = function (set) {
  set.size;
    const promises = [],
    result = new Set(),
    resultAddReducer = (_, subItem) => result.add(subItem),
    resultAdd = curry3$8(callPropUnary$1, result, 'add', __$j),
    getResult = () => result;

  for (const item of set) {
    if (isArray$9(item)) {
      const itemLength = item.length;
      let itemIndex = -1;
      while (++itemIndex < itemLength) {
        result.add(item[itemIndex]);
      }
    } else if (item == null) {
      result.add(item);
    } else if (typeof item[symbolIterator$5] == 'function') {
      for (const subItem of item) {
        result.add(subItem);
      }
    } else if (typeof item[symbolAsyncIterator$3] == 'function') {
      promises.push(
        asyncIteratorForEach$1(item[symbolAsyncIterator$3](), resultAdd));
    } else if (typeof item.chain == 'function') {
      const monadValue = item.chain(identity$4);
      isPromise$i(monadValue)
        ? promises.push(monadValue.then(resultAdd))
        : result.add(monadValue);
    } else if (typeof item.flatMap == 'function') {
      const monadValue = item.flatMap(identity$4);
      isPromise$i(monadValue)
        ? promises.push(monadValue.then(resultAdd))
        : result.add(monadValue);
    } else if (typeof item.reduce == 'function') {
      const folded = item.reduce(resultAddReducer, null);
      isPromise$i(folded) && promises.push(folded);
    } else if (item.constructor == Object) {
      for (const key in item) {
        result.add(item[key]);
      }
    } else {
      result.add(item);
    }
  }
  return promises.length == 0 ? result : promiseAll$3(promises).then(getResult)
};

var setFlatten_1 = setFlatten$2;

/**
 * @name objectAssign
 *
 * @synopsis
 * ```coffeescript [specscript]
 * objectAssign<
 *   targetObject Object, sourceObjects ...Object,
 * >(targetObject, ...sourceObjects) -> merged Object
 * ```
 *
 * @description
 * Dereferenced `Object.assign`
 */

const objectAssign$1 = Object.assign;

var objectAssign_1 = objectAssign$1;

const __$i = placeholder;
const curry2$6 = curry2_1;
const getArg1 = getArg1_1;
const identity$3 = identity_1$1;
const isPromise$h = isPromise_1;
const promiseAll$2 = promiseAll_1;
const objectAssign = objectAssign_1;
const funcConcatSync$1 = funcConcatSync_1;
const asyncIteratorForEach = asyncIteratorForEach_1;
const symbolIterator$4 = symbolIterator_1;
const symbolAsyncIterator$2 = symbolAsyncIterator_1;

/**
 * @name objectFlatten
 *
 * @synopsis
 * ```coffeescript [specscript]
 * Stream<T> = { read: ()=>T, write: T=>() }
 * Monad<T> = Array<T>|String<T>|Set<T>
 *   |TypedArray<T>|Stream<T>|Iterator<Promise|T>
 *   |{ chain: T=>Monad<T> }|{ flatMap: T=>Monad<T> }|Object<T>
 * Reducer<T> = (any, T)=>Promise|any
 * Foldable<T> = Iterable<T>|AsyncIterable<T>|{ reduce: Reducer<T> }|Object<T>
 *
 * objectFlatten<T>(
 *   object Object<Monad<T>|Foldable<T>|T>,
 * ) -> Object<T>
 * ```
 *
 * @TODO change objectAssign to objectDeepAssign
 */
const objectFlatten$2 = function (object) {
  const promises = [],
    result = {},
    resultAssign = curry2$6(objectAssign, result, __$i),
    resultAssignReducer = funcConcatSync$1(getArg1, resultAssign),
    getResult = () => result;

  for (const key in object) {
    const item = object[key];
    if (item == null) {
      continue
    } else if (typeof item[symbolIterator$4] == 'function') {
      for (const monadItem of item) {
        objectAssign(result, monadItem);
      }
    } else if (typeof item[symbolAsyncIterator$2] == 'function') {
      promises.push(
        asyncIteratorForEach(item[symbolAsyncIterator$2](), resultAssign));
    } else if (typeof item.chain == 'function') {
      const monadValue = item.chain(identity$3);
      isPromise$h(monadValue)
        ? promises.push(monadValue.then(resultAssign))
        : objectAssign(result, monadValue);
    } else if (typeof item.flatMap == 'function') {
      const monadValue = item.flatMap(identity$3);
      isPromise$h(monadValue)
        ? promises.push(monadValue.then(resultAssign))
        : resultAssign(monadValue);
    } else if (typeof item.reduce == 'function') {
      const folded = item.reduce(resultAssignReducer, null);
      isPromise$h(folded) && promises.push(folded);
    } else {
      objectAssign(result, item);
    }
  }
  return promises.length == 0
    ? result
    : promiseAll$2(promises).then(getResult)
};

var objectFlatten_1 = objectFlatten$2;

const __$h = placeholder;
const curry3$7 = curry3_1;
const isPromise$g = isPromise_1;

/**
 * @name iteratorReduceAsync
 *
 * @synopsis
 * ```coffeescript [specscript]
 * var T any,
 *   iterator Iterator<T>,
 *   reducer (any, T)=>Promise|any,
 *   result any,
 *
 * iteratorReduceAsync(iterator, reducer, result) -> Promise
 * ```
 *
 * @description
 * Execute a reducer for each item of an iterator or async iterator, returning a promise of a single value.
 */
const iteratorReduceAsync = async function (
  iterator, reducer, result,
) {
  let iteration = iterator.next();
  if (iteration.done) {
    return result
  }

  while (!iteration.done) {
    result = reducer(result, iteration.value);
    if (isPromise$g(result)) {
      result = await result;
    }
    iteration = iterator.next();
  }
  return result
};

/**
 * @name iteratorReduce
 *
 * @synopsis
 * ```coffeescript [specscript]
 * var T any,
 *   iterator Iterator<T>,
 *   reducer (any, T)=>Promise|any,
 *   result any,
 *
 * iteratorReduce(iterator, reducer, result?) -> Promise|any
 * ```
 *
 * @description
 * Execute a reducer for each item of an iterator, returning a single value.
 */
const iteratorReduce$1 = function (iterator, reducer, result) {
  let iteration = iterator.next();
  if (iteration.done) {
    return result
  }
  if (result === undefined) {
    result = iteration.value;
    iteration = iterator.next();
  }
  while (!iteration.done) {
    result = reducer(result, iteration.value);
    if (isPromise$g(result)) {
      return result.then(curry3$7(iteratorReduceAsync, iterator, reducer, __$h))
    }
    iteration = iterator.next();
  }
  return result
};

var iteratorReduce_1 = iteratorReduce$1;

/**
 * @name asyncIteratorReduce
 *
 * @synopsis
 * ```coffeescript [specscript]
 * asyncIteratorReduce(
 *   asyncIterator AsyncIterator<T>,
 *   reducer (any, T)=>Promise|any,
 *   result any,
 * ) -> result any
 * ```
 */

const asyncIteratorReduce$1 = async function (asyncIterator, reducer, result) {
  let iteration = await asyncIterator.next();
  if (iteration.done) {
    return result
  }
  if (result === undefined) {
    result = iteration.value;
    iteration = await asyncIterator.next();
  }

  while (!iteration.done) {
    result = await reducer(result, iteration.value);
    iteration = await asyncIterator.next();
  }
  return result
};

var asyncIteratorReduce_1 = asyncIteratorReduce$1;

const isPromise$f = isPromise_1;
const __$g = placeholder;
const curry4$1 = curry4_1;

/**
 * @name arrayReduceAsync
 *
 * @synopsis
 * ```coffeescript [specscript]
 * arrayReduceAsync<T>(
 *   array Array<T>,
 *   reducer (any, T)=>any,
 *   result any,
 *   index number,
 * ) -> result
 * ```
 *
 * @description
 * Execute a reducer for each item of an array, returning a Promise of a single value.
 */
const arrayReduceAsync = async function (
  array, reducer, result, index,
) {
  const length = array.length;
  while (++index < length) {
    result = reducer(result, array[index], index, array);
    if (isPromise$f(result)) {
      result = await result;
    }
  }
  return result
};

/**
 * @name arrayReduce
 *
 * @synopsis
 * ```coffeescript [specscript]
 * arrayReduce<T>(
 *   array Array<T>,
 *   reducer (any, T)=>Promise|any,
 *   result any,
 * ) -> Promise|result
 * ```
 */
const arrayReduce$1 = function (array, reducer, result) {
  const arrayLength = array.length;
  let index = -1;
  if (result === undefined) {
    result = array[++index];
  }
  while (++index < arrayLength) {
    result = reducer(result, array[index], index, array);
    if (isPromise$f(result)) {
      return result.then(curry4$1(arrayReduceAsync, array, reducer, __$g, index))
    }
  }
  return result
};

var arrayReduce_1 = arrayReduce$1;

const __$f = placeholder;

// argument resolver for curry5
const curry5ResolveArg0 = (
  baseFunc, arg1, arg2, arg3, arg4,
) => function arg0Resolver(arg0) {
  return baseFunc(arg0, arg1, arg2, arg3, arg4)
};

// argument resolver for curry5
const curry5ResolveArg1 = (
  baseFunc, arg0, arg2, arg3, arg4,
) => function arg1Resolver(arg1) {
  return baseFunc(arg0, arg1, arg2, arg3, arg4)
};

// argument resolver for curry5
const curry5ResolveArg2 = (
  baseFunc, arg0, arg1, arg3, arg4,
) => function arg2Resolver(arg2) {
  return baseFunc(arg0, arg1, arg2, arg3, arg4)
};

// argument resolver for curry5
const curry5ResolveArg3 = (
  baseFunc, arg0, arg1, arg2, arg4,
) => function arg3Resolver(arg3) {
  return baseFunc(arg0, arg1, arg2, arg3, arg4)
};

// argument resolver for curry5
const curry5ResolveArg4 = (
  baseFunc, arg0, arg1, arg2, arg3,
) => function arg3Resolver(arg4) {
  return baseFunc(arg0, arg1, arg2, arg3, arg4)
};

/**
 * @name curry5
 *
 * @synopsis
 * ```coffeescript [specscript]
 * __ = Symbol('placeholder')
 *
 * curry5(
 *   baseFunc function,
 *   arg0 __|any,
 *   arg1 __|any,
 *   arg2 __|any,
 *   arg3 __|any,
 *   arg4 __|any,
 * ) -> function
 * ```
 *
 * @description
 * Curry a 5-ary function.
 *
 * Note: exactly one argument must be the placeholder
 */
const curry5$1 = function (baseFunc, arg0, arg1, arg2, arg3, arg4) {
  if (arg0 == __$f) {
    return curry5ResolveArg0(baseFunc, arg1, arg2, arg3, arg4)
  }
  if (arg1 == __$f) {
    return curry5ResolveArg1(baseFunc, arg0, arg2, arg3, arg4)
  }
  if (arg2 == __$f) {
    return curry5ResolveArg2(baseFunc, arg0, arg1, arg3, arg4)
  }
  if (arg3 == __$f) {
    return curry5ResolveArg3(baseFunc, arg0, arg1, arg2, arg4)
  }
  return curry5ResolveArg4(baseFunc, arg0, arg1, arg2, arg3)
};

var curry5_1 = curry5$1;

/**
 * @name objectKeys
 *
 * @synopsis
 * objectKeys<T>(object Object<T>) -> Array<T>
 *
 * @description
 * Dereferenced `Object.keys`
 */

const objectKeys$2 = Object.keys;

var objectKeys_1 = objectKeys$2;

const isPromise$e = isPromise_1;
const __$e = placeholder;
const curry5 = curry5_1;
const objectKeys$1 = objectKeys_1;

/**
 * @name objectReduceAsync
 *
 * @synopsis
 * ```coffeescript [specscript]
 * objectReduceAsync(
 *   object Object,
 *   reducer (any, item any, key string, object)=>Promise|any,
 *   result any,
 * ) -> Promise<result>
 * ```
 */
const objectReduceAsync = async function (object, reducer, result, keys, index) {
  const keysLength = keys.length;
  while (++index < keysLength) {
    const key = keys[index];
    result = reducer(result, object[key], key, object);
    if (isPromise$e(result)) {
      result = await result;
    }
  }
  return result
};

/**
 * @name objectReduce
 *
 * @synopsis
 * ```coffeescript [specscript]
 * objectReduce(
 *   object Object,
 *   reducer (any, item any, key string, object)=>Promise|any,
 *   result any,
 * ) -> Promise|result
 * ```
 */
const objectReduce$1 = function (object, reducer, result) {
  const keys = objectKeys$1(object),
    keysLength = keys.length;
  let index = -1;
  if (result === undefined) {
    result = object[keys[++index]];
  }
  while (++index < keysLength) {
    const key = keys[index];
    result = reducer(result, object[key], key, object);
    if (isPromise$e(result)) {
      return result.then(curry5(objectReduceAsync, object, reducer, __$e, keys, index))
    }
  }
  return result
};

var objectReduce_1 = objectReduce$1;

const isPromise$d = isPromise_1;
const __$d = placeholder;
const curry4 = curry4_1;

/**
 * @name mapReduceAsync
 *
 * @synopsis
 * ```coffeescript [specscript]
 * mapReduceAsync(
 *   map Map,
 *   reducer (result any, value any, key string, map)=>Promise|any,
 *   result any,
 *   mapEntriesIter Iterator<[key, value]>,
 * ) -> Promise<result>
 * ```
 */
const mapReduceAsync = async function (
  map, reducer, result, mapEntriesIter,
) {
  for (const [key, value] of mapEntriesIter) {
    result = reducer(result, value, key, map);
    if (isPromise$d(result)) {
      result = await result;
    }
  }
  return result
};

/**
 * @name mapReduce
 *
 * @synopsis
 * ```coffeescript [specscript]
 * mapReduce(
 *   map Map,
 *   reducer (result any, value any, key string, map)=>Promise|any,
 *   result any,
 * ) -> Promise|result
 * ```
 */
const mapReduce$1 = function (map, reducer, result) {
  const mapEntriesIter = map.entries();
  if (result === undefined) {
    const firstIteration = mapEntriesIter.next();
    if (firstIteration.done) {
      return result
    }
    result = firstIteration.value[1];
  }
  for (const [key, value] of mapEntriesIter) {
    result = reducer(result, value, key, map);
    if (isPromise$d(result)) {
      return result.then(curry4(
        mapReduceAsync, map, reducer, __$d, mapEntriesIter))
    }
  }
  return result
};

var mapReduce_1 = mapReduce$1;

const isArray$8 = isArray_1;
const iteratorReduce = iteratorReduce_1;
const asyncIteratorReduce = asyncIteratorReduce_1;
const symbolIterator$3 = symbolIterator_1;
const symbolAsyncIterator$1 = symbolAsyncIterator_1;
const __$c = placeholder;
const curry2$5 = curry2_1;
const arrayReduce = arrayReduce_1;
const objectReduce = objectReduce_1;
const mapReduce = mapReduce_1;

/**
 * @name genericReduce
 *
 * @synopsis
 * ```coffeescript [specscript]
 * Foldable<T> = Iterable<T>|AsyncIterable<T>
 *   |{ reduce: (any, T)=>any }|Object<T>
 *
 * genericReduce<T>(
 *   collection Foldable<T>,
 *   reducer (any, T)=>any,
 *   result any?,
 * ) -> result
 * ```
 *
 * @related genericReduceConcurrent
 *
 * @TODO genericReduceSync(collection, reducer, init) - performance optimization for some of these genericReduces that we know are synchronous
 *
 * @TODO genericReducePool(poolSize, collection, reducer, init) - for some of these genericReduces that we want to race - result should not care about order of concatenations
 * reduce.pool
 * transform.pool
 * flatMap.pool
 */
const genericReduce$3 = function (collection, reducer, result) {
  if (isArray$8(collection)) {
    return arrayReduce(collection, reducer, result)
  }
  if (collection == null) {
    return result === undefined
      ? curry2$5(reducer, collection, __$c)
      : reducer(result, collection)
  }

  if (collection.constructor == Map) {
    return mapReduce(collection, reducer, result)
  }
  if (typeof collection[symbolIterator$3] == 'function') {
    return iteratorReduce(
      collection[symbolIterator$3](), reducer, result)
  }
  if (typeof collection[symbolAsyncIterator$1] == 'function') {
    return asyncIteratorReduce(
      collection[symbolAsyncIterator$1](), reducer, result)
  }
  if (typeof collection.reduce == 'function') {
    return collection.reduce(reducer, result)
  }
  if (typeof collection.chain == 'function') {
    return collection.chain(curry2$5(reducer, result, __$c))
  }
  if (typeof collection.flatMap == 'function') {
    return collection.flatMap(curry2$5(reducer, result, __$c))
  }
  if (collection.constructor == Object) {
    return objectReduce(collection, reducer, result)
  }
  return result === undefined
    ? curry2$5(reducer, collection, __$c)
    : reducer(result, collection)
};

var genericReduce_1 = genericReduce$3;

const genericReduce$2 = genericReduce_1;
const symbolIterator$2 = symbolIterator_1;
const arrayPush$2 = arrayPush_1;

/**
 * @name FlatMappingIterator
 *
 * @synopsis
 * ```coffeescript [specscript]
 * FlatMappingIterator(
 *   iterator Iterator, flatMapper function,
 * ) -> FlatMappingIterator { next, SymbolIterator }
 * ```
 */
const FlatMappingIterator$1 = function (iterator, flatMapper) {
  let buffer = [],
    bufferIndex = 0;
  return {
    [symbolIterator$2]() {
      return this
    },
    next() {
      if (bufferIndex < buffer.length) {
        const value = buffer[bufferIndex];
        bufferIndex += 1;
        return { value, done: false }
      }

      const iteration = iterator.next();
      if (iteration.done) {
        return iteration
      }
      const monadAsArray = genericReduce$2(
        flatMapper(iteration.value),
        arrayPush$2,
        []); // this will always have at least one item
      if (monadAsArray.length > 1) {
        buffer = monadAsArray;
        bufferIndex = 1;
      }
      return {
        value: monadAsArray[0],
        done: false,
      }
    },
  }
};

var FlatMappingIterator_1 = FlatMappingIterator$1;

/**
 * @name sleep
 *
 * @synopsis
 * ```coffeescript [specscript]
 * sleep(time number) -> promiseThatResolvesAfterTime Promise
 * ```
 */

const sleep$1 = time => new Promise(resolve => {
  setTimeout(resolve, time);
});


var sleep_1 = sleep$1;

const isPromise$c = isPromise_1;
const genericReduce$1 = genericReduce_1;
const symbolAsyncIterator = symbolAsyncIterator_1;
const arrayPush$1 = arrayPush_1;
const curry3$6 = curry3_1;
const __$b = placeholder;
const promiseRace = promiseRace_1;
const sleep = sleep_1;

/**
 * @name FlatMappingAsyncIterator
 *
 * @synopsis
 * ```coffeescript [specscript]
 * new FlatMappingAsyncIterator(
 *   asyncIterator AsyncIterator, flatMapper function,
 * ) -> FlatMappingAsyncIterator AsyncIterator
 * ```
 *
 * @execution concurrent
 *
 * @muxing
 */
const FlatMappingAsyncIterator$1 = function (asyncIterator, flatMapper) {
  const buffer = [],
    promises = new Set();

  return {
    isAsyncIteratorDone: false,
    [symbolAsyncIterator]() {
      return this
    },
    toString() {
      return '[object FlatMappingAsyncIterator]'
    },

    /**
     * @name FlatMappingAsyncIterator.prototype.next
     *
     * @synopsis
     * ```coffeescript [specscript]
     * new FlatMappingAsyncIterator(
     *   asyncIterator AsyncIterator, flatMapper function,
     * ).next() -> Promise<{ value, done }>
     * ```
     */
    async next() {
      while (
        !this.isAsyncIteratorDone || buffer.length > 0 || promises.size > 0
      ) {
        if (!this.isAsyncIteratorDone) {
          const { value, done } = await asyncIterator.next();
          if (done) {
            this.isAsyncIteratorDone = done;
          } else {
            const monad = flatMapper(value);
            if (isPromise$c(monad)) {
              const bufferLoading =
                monad.then(curry3$6(genericReduce$1, __$b, arrayPush$1, buffer));
              const promise = bufferLoading.then(() => promises.delete(promise));
              promises.add(promise);
            } else {
              const bufferLoading = genericReduce$1(monad, arrayPush$1, buffer);
              if (isPromise$c(bufferLoading)) {
                const promise = bufferLoading.then(() => promises.delete(promise));
                promises.add(promise);
              }
            }
          }
        }
        if (buffer.length > 0) {
          return { value: buffer.shift(), done: false }
        }
        if (promises.size > 0) {
          await promiseRace([sleep(1000), ...promises]);
        }
      }
      return { value: undefined, done: true }
    },
  }
};

var FlatMappingAsyncIterator_1 = FlatMappingAsyncIterator$1;

const isPromise$b = isPromise_1;
const arrayFlatten$3 = arrayFlatten_1;
const arrayMap$1 = arrayMap_1;

/**
 * @name arrayFlatMap
 *
 * @synopsis
 * ```coffeescript [specscript]
 * Stream<T> = { read: ()=>T, write: T=>() }
 * Monad<T> = Array<T>|String<T>|Set<T>
 *   |TypedArray<T>|Stream<T>|Iterator<Promise|T>
 *   |{ chain: T=>Monad<T> }|{ flatMap: T=>Monad<T> }|Object<T>
 * Reducer<T> = (any, T)=>Promise|any
 * Foldable<T> = Iterable<T>|AsyncIterable<T>|{ reduce: Reducer<T> }|Object<T>
 *
 * arrayFlatMap<T>(
 *   array Array<T>,
 *   flatMapper T=>Promise|Monad<T>|Foldable<T>|T,
 * ) -> Promise|Array<T>
 * ```
 */
const arrayFlatMap$1 = function (array, flatMapper) {
  const monadArray = arrayMap$1(array, flatMapper);
  return isPromise$b(monadArray)
    ? monadArray.then(arrayFlatten$3)
    : arrayFlatten$3(monadArray)
};

var arrayFlatMap_1 = arrayFlatMap$1;

const isPromise$a = isPromise_1;
const objectMap = objectMap_1;
const objectFlatten$1 = objectFlatten_1;

/**
 * @name objectFlatMap
 *
 * @synopsis
 * ```coffeescript [specscript]
 * Stream<T> = { read: ()=>T, write: T=>() }
 * Monad<T> = Array<T>|String<T>|Set<T>
 *   |TypedArray<T>|Stream<T>|Iterator<Promise|T>
 *   |{ chain: T=>Monad<T> }|{ flatMap: T=>Monad<T> }|Object<T>
 * Reducer<T> = (any, T)=>Promise|any
 * Foldable<T> = Iterable<T>|AsyncIterable<T>|{ reduce: Reducer<T> }|Object<T>
 *
 * objectFlatMap<
 *   T any,
 *   object Object<T>,
 *   flatMapper T=>Promise|Monad<T>|Foldable<T>|T,
 * >(object, flatMapper) -> Promise|Object<T>
 * ```
 *
 * @description
 * Apply a flatMapper to each value of an object, assigning all items of all results into a new object.
 *
 * @TODO "deeply copies" after objectFlatten changes to deep assignment
 */
const objectFlatMap$1 = function (object, flatMapper) {
  const monadObject = objectMap(object, flatMapper);
  return isPromise$a(monadObject)
    ? monadObject.then(objectFlatten$1)
    : objectFlatten$1(monadObject)
};

var objectFlatMap_1 = objectFlatMap$1;

const isPromise$9 = isPromise_1;
const setMap = setMap_1;
const setFlatten$1 = setFlatten_1;

/**
 * @name setFlatMap
 *
 * @synopsis
 * ```coffeescript [specscript]
 * Stream<T> = { read: ()=>T, write: T=>() }
 * Monad<T> = Array<T>|String<T>|Set<T>
 *   |TypedArray<T>|Stream<T>|Iterator<Promise|T>
 *   |{ chain: T=>Monad<T> }|{ flatMap: T=>Monad<T> }|Object<T>
 * Reducer<T> = (any, T)=>Promise|any
 * Foldable<T> = Iterable<T>|AsyncIterable<T>|{ reduce: Reducer<T> }|Object<T>
 *
 * setFlatMap<
 *   T any,
 *   set Set<T>,
 *   flatMapper T=>Promise|Monad<T>|Foldable<T>|T,
 * >(set, flatMapper) -> Promise|Set<T>
 * ```
 */
const setFlatMap$1 = function (set, flatMapper) {
  const monadSet = setMap(set, flatMapper);
  return isPromise$9(monadSet)
    ? monadSet.then(setFlatten$1)
    : setFlatten$1(monadSet)
};

var setFlatMap_1 = setFlatMap$1;

/**
 * @name arrayJoin
 *
 * @synopsis
 * ```coffeescript [specscript]
 * arrayJoin(array Array, delimiter string) -> string
 * ```
 *
 * @description
 * Call `.join` on an array.
 */

const arrayJoin$1 = (array, delimiter) => array.join(delimiter);

var arrayJoin_1 = arrayJoin$1;

const funcConcat$1 = funcConcat_1;
const __$a = placeholder;
const curry2$4 = curry2_1;
const arrayMap = arrayMap_1;
const isPromise$8 = isPromise_1;
const arrayFlatten$2 = arrayFlatten_1;
const arrayJoin = arrayJoin_1;

/**
 * @name arrayFlattenToString
 *
 * @synopsis
 * ```coffeescript [specscript]
 * Stream<T> = { read: ()=>T, write: T=>() }
 * Monad<T> = Array<T>|String<T>|Set<T>
 *   |TypedArray<T>|Stream<T>|Iterator<Promise|T>
 *   |{ chain: T=>Monad<T> }|{ flatMap: T=>Monad<T> }|Object<T>
 * Reducer<T> = (any, T)=>Promise|any
 * Foldable<T> = Iterable<T>|AsyncIterable<T>|{ reduce: Reducer<T> }|Object<T>
 *
 * arrayFlattenToString<T>(
 *   array Array<Monad<T>|Foldable<T>|T>,
 * ) -> String<T>
 * ```
 */
const arrayFlattenToString = funcConcat$1(
  arrayFlatten$2,
  curry2$4(arrayJoin, __$a, ''));

/**
 * @name stringFlatMap
 *
 * @synopsis
 * ```coffeescript [specscript]
 * Stream<T> = { read: ()=>T, write: T=>() }
 * Monad<T> = Array<T>|String<T>|Set<T>
 *   |TypedArray<T>|Stream<T>|Iterator<Promise|T>
 *   |{ chain: T=>Monad<T> }|{ flatMap: T=>Monad<T> }|Object<T>
 * Reducer<T> = (any, T)=>Promise|any
 * Foldable<T> = Iterable<T>|AsyncIterable<T>|{ reduce: Reducer<T> }|Object<T>
 *
 * stringFlatMap<T>(
 *   string String<T>,
 *   flatMapper T=>Promise|Monad<T>|Foldable<T>|T,
 * ) -> Promise|String<T>
 * ```
 *
 * @related arrayFlatMap
 */
const stringFlatMap$1 = function (string, flatMapper) {
  const monadArray = arrayMap(string, flatMapper);
  return isPromise$8(monadArray)
    ? monadArray.then(arrayFlattenToString)
    : arrayFlattenToString(monadArray)
};

var stringFlatMap_1 = stringFlatMap$1;

const isPromise$7 = isPromise_1;
const FlatMappingIterator = FlatMappingIterator_1;
const FlatMappingAsyncIterator = FlatMappingAsyncIterator_1;
const isArray$7 = isArray_1;
const arrayFlatMap = arrayFlatMap_1;
const objectFlatMap = objectFlatMap_1;
const setFlatMap = setFlatMap_1;
const stringFlatMap = stringFlatMap_1;
const symbolIterator$1 = symbolIterator_1;
const curry2$3 = curry2_1;
const __$9 = placeholder;

/**
 * @name _flatMap
 *
 * @synopsis
 * ```coffeescript [specscript]
 * type FlatMappable = Array|String|Set|Iterator|AsyncIterator
 * type Iterable = Iterable|AsyncIterable|Object<value any>
 *
 * _flatMap(
 *   value FlatMappable,
 *   flatMapper (item any)=>Promise|Iterable,
 * ) -> result Promise|FlatMappable
 * ```
 */
const _flatMap = function (value, flatMapper) {
  if (isArray$7(value)) {
    return arrayFlatMap(value, flatMapper)
  }
  if (value == null) {
    return flatMapper(value)
  }

  if (typeof value.then == 'function') {
    return value.then(flatMapper)
  }
  if (typeof value.next == 'function') {
    return symbolIterator$1 in value
      ? FlatMappingIterator(value, flatMapper)
      : FlatMappingAsyncIterator(value, flatMapper)
  }
  if (typeof value.chain == 'function') {
    return value.chain(flatMapper)
  }
  if (typeof value.flatMap == 'function') {
    return value.flatMap(flatMapper)
  }
  const valueConstructor = value.constructor;
  if (valueConstructor == Object) {
    return objectFlatMap(value, flatMapper)
  }
  if (valueConstructor == Set) {
    return setFlatMap(value, flatMapper)
  }
  if (typeof value == 'string' || valueConstructor == String) {
    return stringFlatMap(value, flatMapper)
  }
  return flatMapper(value)
};

/**
 * @name flatMap
 *
 * @synopsis
 * ```coffeescript [specscript]
 * type FlatMappable = Array|String|Set|Iterator|AsyncIterator
 *
 * type Iterable = Iterable|AsyncIterable|Object<value any>
 *
 * type FlatMapper = (
 *   item any,
 *   indexOrKey string,
 *   collection FlatMappable
 * )=>Promise|FlatMappable
 *
 * flatMap(collection FlatMappable, flatMapper FlatMapper) -> result Promise|FlatMappable
 * flatMap(flatMapper FlatMapper)(collection FlatMappable) -> result Promise|FlatMappable
 * ```
 *
 * @description
 * Applies a flatMapper function concurrently to each item of a collection, creating a new collection of the same type. A flatMapping operation iterates through each item of a collection and applies the flatMapper function to each item, flattening the result of the execution into the result collection. The result of an individual execution can be any iterable, async iterable, or object values iterable collection. The flatMapper function may be asynchronous.
 *
 *  * `Iterable` - the execution result is iterated and each item is added to the result collection
 *  * `AsyncIterable` - the execution result is asynchronously iterated and each item is added to the result collection
 *  * `Object` - the execution result values are added to the result collection
 *
 * The following example demonstrates various execution results being flattened into the same array.
 *
 * ```javascript [playground]
 * const identity = value => value
 *
 * flatMap(identity)([
 *   [1, 1], // array
 *   new Set([2, 2]), // set
 *   (function* () { yield 3; yield 3 })(), // generator
 *   (async function* () { yield 7; yield 7 })(), // asyncGenerator
 *   { a: 5, b: 5 }, // object
 *   new Uint8Array([8]), // typedArray
 * ]).then(console.log)
 * // [1, 1, 2, 3, 3, 5, 5, 8, 7, 7]
 * ```
 *
 * A flatMapping operation concatenates onto the resulting collection synchronous values and muxes any asynchronous values. Muxing, or asynchronously "mixing", is the process of combining multiple asynchronous sources into one source, with order determined by the asynchronous resolution of the individual items.
 *
 * ```javascript [playground]
 * const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
 *
 * const repeat3 = function* (message) {
 *   yield message; yield message; yield message
 * }
 *
 * console.log( // sync is concatenated
 *   flatMap(['foo', 'bar', 'baz'], repeat3),
 * ) // ['foo', 'foo', 'foo', 'bar', 'bar', 'bar', 'baz', 'baz', 'baz']
 *
 * const asyncRepeat3 = async function* (message) {
 *   yield message
 *   await sleep(100)
 *   yield message
 *   await sleep(1000)
 *   yield message
 * }
 *
 * // async is muxed
 * flatMap(['foo', 'bar', 'baz'], asyncRepeat3).then(console.log)
 * // ['foo', 'bar', 'baz', 'foo', 'bar', 'baz', 'foo', 'bar', 'baz']
 * ```
 *
 * For arrays (type `Array`), `flatMap` applies the flatMapper function to each item, pushing (`.push`) the items of each execution into a new array.
 *
 * ```javascript [playground]
 * const duplicate = value => [value, value]
 *
 * console.log(
 *   flatMap([1, 2, 3, 4, 5], duplicate)
 * ) // [1, 1, 2, 2, 3, 3, 4, 4, 5, 5]
 * ```
 *
 * For strings (type `String`), `flatMap` applies the flatMapper function to each character, adding (`+`) the items of each execution into a new string
 *
 * ```javascript [playground]
 * const duplicate = value => [value, value]
 *
 * console.log(
 *   flatMap('12345', duplicate)
 * ) // 1122334455
 * ```
 *
 * For sets (type `Set`), `flatMap` applies the flatMapper function to each item, adding (`.add`) the items of each execution into a new set
 *
 * ```javascript [playground]
 * const pairPlus100 = value => [value, value + 100]
 *
 * console.log(
 *   flatMap(new Set([1, 2, 3, 4, 5]), pairPlus100)
 * ) // Set(10) { 1, 101, 2, 102, 3, 103, 4, 104, 5, 105 }
 * ```
 *
 * @execution concurrent
 *
 * @transducing
 *
 * @archive
 *  * For typed arrays (type [`TypedArray`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypedArray#typedarray_objects)) and Node.js buffers (type [`Buffer`](https://nodejs.org/api/buffer.html)), `flatMap` applies a flatMapper function to each value of the typed array/buffer, joining the result of each execution with `.set` into the resulting typed array
 *
 *  * For Node.js duplex streams (type [Stream](https://nodejs.org/api/stream.html#class-streamduplex)), `flatMap` applies a flatMapper function to each item of the stream, writing (`.write`) each item of each execution into the duplex stream
 */
const flatMap$1 = (...args) => {
  const flatMapper = args.pop();
  if (args.length == 0) {
    return curry2$3(_flatMap, __$9, flatMapper)
  }
  const collection = args[0];
  return isPromise$7(collection)
    ? collection.then(curry2$3(_flatMap, __$9, flatMapper))
    : _flatMap(args[0], flatMapper)
};

var flatMap_1 = flatMap$1;

const isArray$6 = isArray_1;
const arrayFlatten$1 = arrayFlatten_1;
const setFlatten = setFlatten_1;
const objectFlatten = objectFlatten_1;
const identity$2 = identity_1$1;
const flatMap = flatMap_1;

/**
 * @name flatten
 *
 * @synopsis
 * ```coffeescript [specscript]
 * Stream<T> = { read: ()=>T, write: T=>() }
 * Monad<T> = Array<T>|String<T>|Set<T>
 *   |TypedArray<T>|Stream<T>|Iterator<T>|AsyncIterator<T>
 *   |{ chain: T=>Monad<T> }|{ flatMap: T=>Monad<T> }|Object<T>
 * Reducer<T> = (any, T)=>Promise|any
 * Foldable<T> = Iterable<T>|AsyncIterable<T>|{ reduce: Reducer<T>=>any }|Object<T>
 *
 * var T any,
 *   monad Monad<Monad<T>|Foldable<T>|T>,
 *   args ...any,
 *   generatorFunction ...args=>Generator<Monad<T>|Foldable<T>|T>,
 *   asyncGeneratorFunction ...args=>AsyncGenerator<Monad<T>|Foldable<T>|T>,
 *   reducer Reducer<Monad<T>|Foldable<T>|T>
 *
 * flatten(monad) -> Monad<T>
 *
 * flatten(generatorFunction) -> ...args=>Generator<T>
 *
 * flatten(asyncGeneratorFunction) -> ...args=>AsyncGenerator<T>
 *
 * flatten(reducer) -> Reducer<T>
 * ```
 *
 * @description
 * Flatten a collection. Works in transducer position.
 *
 * ```javascript [playground]
 * import flatten from 'https://unpkg.com/rubico/dist/x/flatten.es.js'
 *
 * flatten([
 *   [1, 1],
 *   new Set([2, 2]),
 *   (function* () { yield 3; yield 3 })(),
 *   (async function* () { yield 4; yield 4 })(),
 *   { a: 5, b: 5 },
 *   6,
 *   Promise.resolve(7),
 *   new Uint8Array([8]),
 * ]).then(console.log)
 * // [1, 1, 2, 3, 3, 5, 5, 6, 7, 8, 4, 4]
 *
 * const add = (a, b) => a + b
 *
 * console.log(
 *   [[1], [2], [3], [4], [5]].reduce(flatten(add), 0),
 * ) // 15
 * ```
 *
 * @TODO flatten for each type
 */

const flatten$1 = function (value) {
  if (isArray$6(value)) {
    return arrayFlatten$1(value)
  }
  if (value == null) {
    return value
  }
  if (value.constructor == Set) {
    return setFlatten(value)
  }
  if (value.constructor == Object) {
    return objectFlatten(value)
  }
  return flatMap(value, identity$2)
};

var flatten_1 = flatten$1;

// () => Map<>
const EmptyMap$1 = () => new Map();

var EmptyMap_1 = EmptyMap$1;

const isPromise$6 = isPromise_1;
const __$8 = placeholder;
const curry3$5 = curry3_1;
const genericReduce = genericReduce_1;

// _reduce(collection any, reducer function, initialValue function|any) -> Promise
const _reduce = function (collection, reducer, initialValue) {
  if (typeof initialValue == 'function') {
    const actualInitialValue = initialValue(collection);
    return isPromise$6(actualInitialValue)
      ? actualInitialValue.then(curry3$5(genericReduce, collection, reducer, __$8))
      : genericReduce(collection, reducer, actualInitialValue)
  }
  return isPromise$6(initialValue)
    ? initialValue.then(curry3$5(genericReduce, collection, reducer, __$8))
    : genericReduce(collection, reducer, initialValue)
};

/**
 * @name reduce
 *
 * @synopsis
 * ```coffeescript [specscript]
 * type Foldable = Array|Object|Map|Iterator|AsyncIterator
 *
 * type Reducer = (
 *   accumulator any,
 *   value any,
 *   indexOrKey? number|string,
 *   collection? Foldable,
 * )=>(nextAccumulator Promise|any)
 *
 * type Resolver = (collection Foldable)=>Promise|any
 *
 * reduce(
 *   collection Foldable,
 *   reducer Reducer,
 *   initialValue? Resolver|any
 * ) -> result Promise|any
 *
 * reduce(
 *   reducer Reducer,
 *   initialValue? Resolver|any
 * )(collection Foldable) -> result Promise|any
 * ```
 *
 * @description
 * Transforms a collection based on a reducer function and optional initial value. In a reducing operation, the result is defined in the beginning as either the initial value if supplied or the first item of the collection. The reducing operation then iterates through the remaining items in the collection, executing the reducer at each iteration to return the result to be used in the next iteration. The final result is the result of the execution of the reducer at the last item of the iteration. `reduce` accepts the following collections:
 *
 *  * `Array`
 *  * `Object`
 *  * `Set`
 *  * `Map`
 *  * `Iterator`/`Generator`
 *  * `AsyncIterator`/`AsyncGenerator`
 *
 * For arrays (type `Array`), `reduce` executes the reducer function for each item of the array in order, returning a new result at each execution to be used in the next execution. On each iteration, the reducer is passed the accumulator, the item of the iteration, the index of the item in the array, and a reference to the original array.
 *
 * ```javascript [playground]
 * const max = (a, b) => a > b ? a : b
 *
 * console.log(
 *   reduce([1, 3, 5, 4, 2], max)
 * ) // 5
 *
 * console.log(
 *   reduce(max)([1, 3, 5, 4, 2])
 * ) // 5
 * ```
 *
 * If an optional initial value is provided, the result starts as the provided initial value rather than the first item of the collection.
 *
 * ```javascript [playground]
 * const add = (a, b) => a + b
 *
 * console.log(reduce([1, 2, 3, 4, 5], add, 0)) // 15
 * console.log(reduce(add, 0)([1, 2, 3, 4, 5])) // 15
 * ```
 *
 * If the initialization parameter is a function, it is treated as a resolver and called with the arguments to resolve the initial value.
 *
 * ```javascript [playground]
 * const concatSquares = (array, value) => array.concat(value ** 2)
 *
 * const contrivedInitializer = array => [`initial length ${array.length}`]
 *
 * const array = [1, 2, 3, 4, 5]
 *
 * console.log(reduce(concatSquares, contrivedInitializer)(array))
 * // ['initial length 5', 1, 4, 9, 16, 25]
 * console.log(reduce(array, concatSquares, contrivedInitializer))
 * // ['initial length 5', 1, 4, 9, 16, 25]
 * ```
 *
 * For objects (type `Object`), `reduce` executes the reducer function for each value of the object. On each iteration, the reducer is passed the accumulator, the object value, the key of the object value, and a reference to the original object.
 *
 * ```javascript [playground]
 * const add = (a, b) => a + b
 *
 * const obj = { a: 1, b: 2, c: 3, d: 4, e: 5 }
 *
 * console.log(
 *   reduce(obj, add)
 * ) // 15
 *
 * console.log(
 *   reduce(add)(obj)
 * ) // 15
 * ```
 *
 * For sets (type `Set`), `reduce` executes the reducer function for each item of the set. On each iteration, the reducer is passed the accumulator and item of the set.
 *
 * ```javascript [playground]
 * const add = (a, b) => a + b
 *
 * const set = new Set([1, 2, 3, 4, 5])
 *
 * console.log(
 *   reduce(set, add)
 * ) // 15
 *
 * console.log(
 *   reduce(add)(set)
 * ) // 15
 * ```
 *
 * For maps (type `Map`), `reduce` executes the reducer function for each value of each entry of the map. On each iteration, the reducer is passed the accumulator, the map item, the key of the map item, and a reference to the original map.
 *
 * ```javascript [playground]
 * const add = (a, b) => a + b
 *
 * const m = new Map([['a', 1], ['b', 2], ['c', 3], ['d', 4], ['e', 5]])
 *
 * console.log(
 *   reduce(m, add)
 * ) // 15
 *
 * console.log(
 *   reduce(add)(m)
 * ) // 15
 * ```
 *
 * For iterators (type `Iterator`) and generators (type `Generator`), `reduce` executes the reducer function for each value of the iterator/generator. On each iteration, the reducer is passed the accumulator and the item of the iteration. The iterator/generator is consumed in the process.
 *
 * ```javascript [playground]
 * const add = (a, b) => a + b
 *
 * const generate12345 = function* () {
 *   yield 1; yield 2; yield 3; yield 4; yield 5
 * }
 *
 * console.log(
 *   reduce(generate12345(), add)
 * ) // 15
 *
 * console.log(
 *   reduce(add)(generate12345())
 * ) // 15
 * ```
 *
 * For asyncIterators (type `AsyncIterator`) and asyncGenerators (type `AsyncGenerator`), `reduce` executes the reducer function for each value of the asyncIterator/asyncGenerator. On each iteration, the reducer is passed the accumulator and the item of the async iteration. The asyncIterator/asyncGenerator is consumed in the process.
 *
 * ```javascript [playground]
 * const asyncAdd = async (a, b) => a + b
 *
 * const asyncGenerate12345 = async function* () {
 *   yield 1; yield 2; yield 3; yield 4; yield 5
 * }
 *
 * reduce(asyncGenerate12345(), asyncAdd).then(console.log) // 15
 *
 * reduce(asyncAdd)(asyncGenerate12345()).then(console.log) // 15
 * ```
 *
 * @execution series
 *
 * @transducing
 *
 * @TODO readerReduce
 *
 * @TODO reduce.concurrent
 */

const reduce$1 = function (...args) {
  if (typeof args[0] == 'function') {
    return curry3$5(_reduce, __$8, args[0], args[1])
  }
  if (isPromise$6(args[0])) {
    return args[0].then(curry3$5(_reduce, __$8, args[1], args[2]))
  }
  return _reduce(args[0], args[1], args[2])
};

var reduce_1 = reduce$1;

const EmptyMap = EmptyMap_1;
const isPromise$5 = isPromise_1;
const reduce = reduce_1;
const __$7 = placeholder;
const curry3$4 = curry3_1;

// (mapOfArrays Map<any=>Array>, key any, item any) => mapOfArrays
// TODO: benchmark vs mapOfArrays.has(key)
const group = function (mapOfArrays, key, item) {
  const array = mapOfArrays.get(key);
  if (array == null) {
    mapOfArrays.set(key, [item]);
  } else {
    array.push(item);
  }
  return mapOfArrays
};

// property string => (mapOfArrays Map<any=>Array>, item any) => mapOfArrays
const groupByProperty = property => function groupByPropertyReducer(
  mapOfArrays, item,
) {
  return group(mapOfArrays, item[property], item)
};

// resolver any=>any => (mapOfArrays Map<any=>Array>, item any) => mapOfArrays
const groupByResolver = resolver => function groupByResolverReducer(
  mapOfArrays, item,
) {
  const key = resolver(item);
  return isPromise$5(key)
    ? key.then(curry3$4(group, mapOfArrays, __$7, item))
    : group(mapOfArrays, key, item)
};


/**
 * @name groupBy
 *
 * @synopsis
 * ```coffeescript [specscript]
 * Reducer<T> = (any, T)=>Promise|any
 * Foldable<T> = Iterable<T>|AsyncIterable<T>|{ reduce: Reducer<T>=>any }|Object<T>
 *
 * var property any,
 *   resolver any=>Promise|any,
 *   value Foldable
 *
 * groupBy(property)(value) -> groupedByProperty Map<any=>Array>
 *
 * groupBy(resolver)(value) -> groupedByResolver Promise|Map<any=>Array>
 * ```
 *
 * @description
 * Group a foldable collection into a Map of arrays by a property on each of its elements.
 *
 * ```javascript [playground]
 * import groupBy from 'https://unpkg.com/rubico/dist/x/groupBy.es.js'
 *
 * console.log(
 *   groupBy('age')([
 *     { name: 'George', age: 22 },
 *     { name: 'Jane', age: 22 },
 *     { name: 'Henry', age: 23 },
 *   ]),
 * )
 * // Map {
 * //   22 => [{ name: 'George', age: 22 }, { name: 'Jane', age: 22 }],
 * //   23 => [{ name: 'Henry', age: 23 }],
 * // }
 * ```
 *
 * Additionally, pass a resolver in property position to resolve a value for group membership for each item.
 *
 * ```javascript [playground]
 * import groupBy from 'https://unpkg.com/rubico/dist/x/groupBy.es.js'
 *
 * console.log(
 *   groupBy(
 *     word => word.toLowerCase(),
 *   )(['Hello', 'hello', 'Hey']),
 * ) // Map { 'hello' => ['Hello', 'hello'], 'hey' => ['Hey'] }
 * ```
 */
const groupBy$1 = propertyOrResolver => typeof propertyOrResolver == 'function'
  ? reduce(groupByResolver(propertyOrResolver), EmptyMap)
  : reduce(groupByProperty(propertyOrResolver), EmptyMap);

var groupBy_1 = groupBy$1;

// (object Object, key string) -> boolean
const objectHas = function (object, key) {
  return object[key] != null
};

/**
 * @name has
 *
 * @synopsis
 * ```coffeescript [specscript]
 * has(key any)(container Set|Map|{ has: function }|Object) -> Promise|boolean
 * ```
 *
 * @description
 * Check if a collection has a key.
 *
 * ```javascript [playground]
 * import has from 'https://unpkg.com/rubico/dist/x/has.es.js'
 *
 * console.log(
 *   has('a')({ a: 1, b: 2, c: 3 }),
 * ) // true
 *
 * console.log(
 *   has('a')({}),
 * ) // false
 * ```
 */
const has$1 = key => function hasKey(container) {
  if (container == null) {
    return false
  }
  if (typeof container.has == 'function') {
    return container.has(key)
  }
  if (container.constructor == Object) {
    return objectHas(container, key)
  }
  return false
};

var has_1 = has$1;

/**
 * @name identity
 *
 * @synopsis
 * ```coffeescript [specscript]
 * identity(value any) -> value
 * ```
 *
 * @description
 * Pass a value and receive the same value back.
 *
 * ```javascript [playground]
 * import identity from 'https://unpkg.com/rubico/dist/x/identity.es.js'
 *
 * console.log(
 *   identity(1),
 * ) // 1
 * ```
 */

const identity$1 = value => value;

var identity_1 = identity$1;

/**
 * @name sameValueZero
 *
 * @synopsis
 * ```coffeescript [specscript]
 * sameValueZero(left any, right any) -> boolean
 * ```
 *
 * @description
 * Determine if two values are the same value. [SameValueZero](http://ecma-international.org/ecma-262/7.0/#sec-samevaluezero).
 */

const sameValueZero$2 = function (left, right) {
  return left === right || (left !== left && right !== right)
};

var sameValueZero_1 = sameValueZero$2;

const sameValueZero$1 = sameValueZero_1;

// (object Object, value any) -> boolean
const objectIncludes = function (object, value) {
  for (const key in object) {
    if (sameValueZero$1(value, object[key])) {
      return true
    }
  }
  return false
};

/**
 * @name includes
 *
 * @synopsis
 * ```coffeescript [specscript]
 * includes(value any)(container Array|String|Object) -> boolean
 * ```
 *
 * @description
 * Check if a collection includes another value by [SameValueZero](http://ecma-international.org/ecma-262/7.0/#sec-samevaluezero).
 *
 * ```javascript [playground]
 * import includes from 'https://unpkg.com/rubico/dist/x/includes.es.js'
 *
 * console.log(
 *   includes(5)([1, 2, 3, 4, 5])
 * ) // true
 *
 * console.log(
 *   includes(5)([1, 2, 3])
 * ) // false
 * ```
 */
const includes$2 = value => function includesValue(container) {
  if (container == null) {
    return false
  }
  if (typeof container.includes == 'function') {
    return container.includes(value)
  }
  if (container.constructor == Object) {
    return objectIncludes(container, value)
  }
  return false
};

var includes_1 = includes$2;

/**
 * @name objectKeysLength
 *
 * @synopsis
 * ```coffeescript [specscript]
 * objectKeysLength(object Object) -> number
 * ```
 */

const objectKeysLength$3 = object => {
  let numKeys = 0;
  for (const _ in object) {
    numKeys += 1;
  }
  return numKeys
};

var objectKeysLength_1 = objectKeysLength$3;

const __$6 = placeholder;
const isArray$5 = isArray_1;
const isPromise$4 = isPromise_1;
const promiseAll$1 = promiseAll_1;
const spread2 = spread2_1;
const curry2$2 = curry2_1;
const objectKeysLength$2 = objectKeysLength_1;
const symbolIterator = symbolIterator_1;
const sameValueZero = sameValueZero_1;

/**
 * @name areIteratorsDeepEqual
 *
 * @synopsis
 * areIteratorsDeepEqual(left Iterator, right Iterator) -> boolean
 */
const areIteratorsDeepEqual = function (leftIterator, rightIterator) {
  let leftIteration = leftIterator.next(),
    rightIteration = rightIterator.next();
  if (leftIteration.done != rightIteration.done) {
    return false
  }
  while (!leftIteration.done) {
    if (!isDeepEqual$1(leftIteration.value, rightIteration.value)) {
      return false
    }
    leftIteration = leftIterator.next();
    rightIteration = rightIterator.next();
  }
  return rightIteration.done
};

/**
 * @name areObjectsDeepEqual
 *
 * @synopsis
 * areObjectsDeepEqual(left Object, right Object) -> boolean
 */
const areObjectsDeepEqual = function (leftObject, rightObject) {
  const leftKeysLength = objectKeysLength$2(leftObject),
    rightKeysLength = objectKeysLength$2(rightObject);
  if (leftKeysLength != rightKeysLength) {
    return false
  }
  for (const key in leftObject) {
    if (!isDeepEqual$1(leftObject[key], rightObject[key])) {
      return false
    }
  }
  return true
};

/**
 * @name areArraysDeepEqual
 *
 * @synopsis
 * areArraysDeepEqual(left Array, right Array) -> boolean
 */
const areArraysDeepEqual = function (leftArray, rightArray) {
  const length = leftArray.length;
  if (rightArray.length != length) {
    return false
  }
  let index = -1;
  while (++index < length) {
    if (!isDeepEqual$1(leftArray[index], rightArray[index])) {
      return false
    }
  }
  return true
};

/**
 * @name areValuesDeepEqual
 *
 * @synopsis
 * ```coffeescript [specscript]
 * areValuesDeepEqual(left any, right any) -> boolean
 * ```
 */
const areValuesDeepEqual = function (left, right) {
  const isLeftArray = isArray$5(left),
    isRightArray = isArray$5(right);
  if (isLeftArray || isRightArray) {
    return isLeftArray && isRightArray
      && areArraysDeepEqual(left, right)
  }
  if (left == null || right == null) {
    return sameValueZero(left, right)
  }

  const isLeftString = typeof left == 'string' || left.constructor == String,
    isRightString = typeof right == 'string' || right.constructor == String;
  if (isLeftString || isRightString) {
    return sameValueZero(left, right)
  }
  const isLeftIterable = typeof left[symbolIterator] == 'function',
    isRightIterable = typeof right[symbolIterator] == 'function';
  if (isLeftIterable || isRightIterable) {
    return isLeftIterable && isRightIterable
      && areIteratorsDeepEqual(left[symbolIterator](), right[symbolIterator]())
  }

  const isLeftObject = left.constructor == Object,
    isRightObject = right.constructor == Object;
  if (isLeftObject || isRightObject) {
    return isLeftObject && isRightObject
      && areObjectsDeepEqual(left, right)
  }
  return sameValueZero(left, right)
};

/**
 * @name isDeepEqual
 *
 * @synopsis
 * ```coffeescript [specscript]
 * Nested<T> = Array<Array<T>|Object<T>|Iterable<T>|T>|Object<Array<T>|Object<T>|Iterable<T>|T>
 *
 * var left Nested,
 *   right Nested
 *
 * isDeepEqual(left, right) -> boolean
 * ```
 *
 * @description
 * Check two values for deep [SameValueZero](http://ecma-international.org/ecma-262/7.0/#sec-samevaluezero) equality.
 *
 * ```javascript [playground]
 * import isDeepEqual from 'https://unpkg.com/rubico/dist/x/isDeepEqual.es.js'
 *
 * console.log(
 *   isDeepEqual({ a: 1, b: 2, c: [3] }, { a: 1, b: 2, c: [3] }),
 * ) // true
 *
 * console.log(
 *   isDeepEqual({ a: 1, b: 2, c: [3] }, { a: 1, b: 2, c: [5] }),
 * ) // false
 * ```
 *
 * When passed a resolver function as the left or right argument or resolvers as both arguments, returns a function that resolves the value by the resolver before performing the deep equal comparison.
 *
 * ```javascript [playground]
 * import isDeepEqual from 'https://unpkg.com/rubico/dist/x/isDeepEqual.es.js'
 *
 * const isPropADeepEqualTo123Array = isDeepEqual(object => object.a, [1, 2, 3])
 *
 * console.log(
 *   isPropADeepEqualTo123Array({ a: [1, 2, 3] }),
 * ) // true
 * ```
 */
const isDeepEqual$1 = function (left, right) {
  const isLeftResolver = typeof left == 'function',
    isRightResolver = typeof right == 'function';
  if (isLeftResolver && isRightResolver) {
    return function isDeepEqualBy(value) {
      const leftValue = left(value),
        rightValue = right(value);
      const isLeftPromise = isPromise$4(leftValue),
        isRightPromise = isPromise$4(rightValue);
      if (isLeftPromise && isRightPromise) {
        return promiseAll$1([
          leftValue,
          rightValue,
        ]).then(spread2(areValuesDeepEqual))
      }
      if (isLeftPromise) {
        return leftValue.then(curry2$2(areValuesDeepEqual, __$6, rightValue))
      }
      if (isRightPromise) {
        return rightValue.then(curry2$2(areValuesDeepEqual, leftValue, __$6))
      }
      return areValuesDeepEqual(leftValue, rightValue)
    }
  }

  if (isLeftResolver) {
    return function isDeepEqualBy(value) {
      const leftValue = left(value);
      return isPromise$4(leftValue)
        ? leftValue.then(curry2$2(areValuesDeepEqual, __$6, right))
        : areValuesDeepEqual(leftValue, right)
    }
  }

  if (isRightResolver) {
    return function isDeepEqualBy(value) {
      const rightValue = right(value);
      return isPromise$4(rightValue)
        ? rightValue.then(curry2$2(areValuesDeepEqual, left, __$6))
        : areValuesDeepEqual(left, rightValue)
    }
  }

  return areValuesDeepEqual(left, right)
};

var isDeepEqual_1 = isDeepEqual$1;

const objectKeysLength$1 = objectKeysLength_1;

/**
 * @name isEmpty
 *
 * @synopsis
 * ```coffeescript [specscript]
 * isEmpty(value any) -> boolean
 * ```
 *
 * @description
 * Check if a value is empty.
 *
 * ```javascript [playground]
 * import isEmpty from 'https://unpkg.com/rubico/dist/x/isEmpty.es.js'
 *
 * console.log('', isEmpty('')) // true
 * console.log([], isEmpty([])) // true
 * console.log({}, isEmpty({})) // true
 * console.log([1, 2, 3], isEmpty([1, 2, 3])) // false
 * console.log(new Set([1, 2, 3]), isEmpty(new Set([1, 2, 3]))) // false
 * console.log({ a: 1, b: 2, c: 3 }, isEmpty({ a: 1, b: 2, c: 3 })) // false
 * ```
 */
const isEmpty$1 = value => typeof value == 'string' ? value.length == 0
  : value == null ? true
  : typeof value.length == 'number' ? value.length == 0
  : typeof value.size == 'number' ? value.size == 0
  : value.constructor == Object ? objectKeysLength$1(value) == 0
  : false;

var isEmpty_1 = isEmpty$1;

const isEqual$1 = (a, b) => a === b;

var isEqual_1 = isEqual$1;

/**
 * @name isFunction
 *
 * @synopsis
 * ```coffeescript [specscript]
 * isFunction(value any) -> boolean
 * ```
 *
 * @description
 * Determine whether a value is a function.
 *
 * ```javascript [playground]
 * import isFunction from 'https://unpkg.com/rubico/dist/x/isFunction.es.js'
 *
 * const add = (a, b) => a + b
 *
 * console.log(
 *   isFunction(add),
 * ) // true
 * ```
 */

const isFunction$1 = value => typeof value == 'function';

var isFunction_1 = isFunction$1;

const isObject$1 = isObject_1$1;

/**
 * @name isObject
 *
 * @synopsis
 * ```coffeescript [specscript]
 * isObject(value any) -> boolean
 * ```
 *
 * @description
 * Determine whether a value has the [language type](http://www.ecma-international.org/ecma-262/7.0/#sec-ecmascript-language-types) of `Object`.
 *
 * ```javascript [playground]
 * import isObject from 'https://unpkg.com/rubico/dist/x/isObject.es.js'
 *
 * console.log(
 *   isObject({ a: 1, b: 2, c: 3 }),
 * ) // true
 *
 * console.log(
 *   isObject('hey'),
 * ) // false
 *
 * console.log(
 *   isObject(new Set([1, 2, 3])),
 * ) // true
 * ```
 */

var isObject_1 = isObject$1;

const objectKeys = objectKeys_1;

/**
 * @name keys
 *
 * @synopsis
 * ```coffeescript [specscript]
 * keys(value string|Array|Set|Map|object) -> Array<key number|string>
 * ```
 *
 * @description
 * Get an array of keys from an instance.
 *
 * ```javascript [playground]
 * import keys from 'https://unpkg.com/rubico/dist/x/keys.es.js'
 *
 * console.log(keys({ a: 1, b: 2, c: 3 })) // ['a', 'b', 'c']
 * console.log(keys(['hello', 'world'])) // [0, 1]
 * console.log(keys(new Map([['hello', 1], ['world', 2]]))) // ['hello', 'world']
 * ```
 *
 * @since 1.6.25
 */
const keys$1 = object => object == null ? []
  : typeof object.keys == 'function' ? [...object.keys()]
  : objectKeys(object);

var keys_1 = keys$1;

/**
 * @name last
 *
 * @synopsis
 * ```coffeescript [specscript]
 * var value Array|string
 *
 * last(value) -> any
 * ```
 *
 * @description
 * Get the last item of a collection
 *
 * ```javascript [playground]
 * import last from 'https://unpkg.com/rubico/dist/x/last.es.js'
 *
 * console.log(last([1, 2, 3])) // 3
 * console.log(last([])) // undefined
 * ```
 */

const last$1 = value => {
  if (value == null) {
    return undefined
  }
  const length = value.length;
  return typeof length == 'number' ? value[length - 1] : undefined
};

var last_1 = last$1;

/**
 * @name memoizeCappedUnary
 *
 * @synopsis
 * ```coffeescript [specscript]
 * memoizeCappedUnary(func function, cap number) -> memoized function
 * ```
 *
 * @description
 * Memoize a function. Clear cache when size reaches cap.
 *
 * @todo explore Map reimplementation
 */

const memoizeCappedUnary$1 = function (func, cap) {
  const cache = new Map(),
    memoized = function memoized(arg0) {
      if (cache.has(arg0)) {
        return cache.get(arg0)
      }
      const result = func(arg0);
      cache.set(arg0, result);
      if (cache.size > cap) {
        cache.clear();
      }
      return result
    };
  memoized.cache = cache;
  return memoized
};

var memoizeCappedUnary_1 = memoizeCappedUnary$1;

const isArray$4 = isArray_1;
const memoizeCappedUnary = memoizeCappedUnary_1;

// a[0].b.c
const pathDelimiters = /[.|[|\]]+/;

/**
 * @name parsePropertyPath
 *
 * @synopsis
 * ```coffeescript [specscript]
 * parsePropertyPath(pathString string) -> Array<string>
 * ```
 *
 * @note
 * a[0].b.c
 * a.0.b[0][1].c
 */
const parsePropertyPath = function (pathString) {
  const pathStringLastIndex = pathString.length - 1,
    firstChar = pathString[0],
    lastChar = pathString[pathStringLastIndex],
    isFirstCharLeftBracket = firstChar == '[',
    isLastCharRightBracket = lastChar == ']';

  if (isFirstCharLeftBracket && isLastCharRightBracket) {
    return pathString.slice(1, pathStringLastIndex).split(pathDelimiters)
  } else if (isFirstCharLeftBracket) {
    return pathString.slice(1).split(pathDelimiters)
  } else if (isLastCharRightBracket) {
    return pathString.slice(0, pathStringLastIndex).split(pathDelimiters)
  }
  return pathString.split(pathDelimiters)
};

// memoized version of parsePropertyPath, max cache size 500
const memoizedCappedParsePropertyPath = memoizeCappedUnary(parsePropertyPath, 500);

/**
 * @name propertyPathToArray
 *
 * @synopsis
 * ```coffeescript [specscript]
 * propertyPathToArray(path string|number|Array<string|number>) -> Array
 * ```
 */
const propertyPathToArray$1 = path => isArray$4(path) ? path
  : typeof path == 'string' ? memoizedCappedParsePropertyPath(path)
  : [path];

var propertyPathToArray_1 = propertyPathToArray$1;

const propertyPathToArray = propertyPathToArray_1;

/**
 * @name getByPath
 *
 * @synopsis
 * ```coffeescript [specscript]
 * getByPath<
 *   value any,
 *   path string|number|Array<string|number>,
 * >(value, path) -> valueAtPath any
 * ```
 */
const getByPath$1 = function (value, path) {
  const propertyPathArray = propertyPathToArray(path),
    length = propertyPathArray.length;
  let index = -1,
    result = value;
  while (++index < length) {
    result = result[propertyPathArray[index]];
    if (result == null) {
      return undefined
    }
  }
  return result
};

var getByPath_1 = getByPath$1;

const isPromise$3 = isPromise_1;
const __$5 = placeholder;
const curry3$3 = curry3_1;
const isArray$3 = isArray_1;
const getByPath = getByPath_1;

// _get(object Object, path string, defaultValue function|any)
const _get = function (object, path, defaultValue) {
  const result = object == null ? undefined : getByPath(object, path);
  return result === undefined
    ? typeof defaultValue == 'function' ? defaultValue(object) : defaultValue
    : result
};

/**
 * @name get
 *
 * @synopsis
 * ```coffeescript [specscript]
 * get(
 *   object Promise|Object,
 *   path string|number|Array<string|number>,
 *   defaultValue? function|any
 * ) -> result Promise|Object
 *
 * get(
 *   path string|number|Array<string|number>,
 *   defaultValue? function|any
 * )(object Object) -> result Promise|Object
 * ```
 *
 * @description
 * Accesses a property of an object given a path denoted by a string, number, or an array of string or numbers.
 *
 * ```javascript [playground]
 * const obj = { hello: 'world' }
 *
 * console.log(get(obj, 'hello')) // world
 * ```
 *
 * `get` supports a lazy API for composability
 *
 * ```javascript [playground]
 * const obj = { hello: 'world' }
 *
 * const getHello = get('hello')
 *
 * console.log(getHello({ hello: 'world' })) // world
 * ```
 *
 * If the value at the end of the path is not found on the object, returns an optional default value. The default value can be a function resolver that takes the object as an argument. If no default value is provided, returns `undefined`. The function resolver may be asynchronous (returns a promise).
 *
 * ```javascript [playground]
 * const getHelloWithDefaultValue = get('hello', 'default')
 *
 * console.log(getHelloWithDefaultValue({ foo: 'bar' })) // default
 *
 * const getHelloWithDefaultResolver = get('hello', object => object.foo)
 *
 * console.log(getHelloWithDefaultResolver({ foo: 'bar' })) // bar
 * ```
 *
 * `get` supports three types of path patterns for nested property access.
 *
 *  * dot delimited - `'a.b.c'`
 *  * bracket notation - `'a[0].value'`
 *  * an array of keys or indices - `['a', 0, 'value']`
 *
 * ```javascript [playground]
 * const getABC0 = get('a.b.c[0]')
 *
 * console.log(getABC0({ a: { b: { c: ['hello'] } } })) // hello
 *
 * const get00000DotNotation = get('0.0.0.0.0')
 * const get00000BracketNotation = get('[0][0][0][0][0]')
 * const get00000ArrayNotation = get([0, 0, 0, 0, 0])
 *
 * console.log(get00000DotNotation([[[[['foo']]]]])) // foo
 * console.log(get00000BracketNotation([[[[['foo']]]]])) // foo
 * console.log(get00000ArrayNotation([[[[['foo']]]]])) // foo
 * ```
 */

const get$2 = function (arg0, arg1, arg2) {
  if (typeof arg0 == 'string' || typeof arg0 == 'number' || isArray$3(arg0)) {
    return curry3$3(_get, __$5, arg0, arg1)
  }
  if (isPromise$3(arg0)) {
    return arg0.then(curry3$3(_get, __$5, arg1, arg2))
  }
  return _get(arg0, arg1, arg2)
};

var get_1 = get$2;

const get$1 = get_1;
const __$4 = placeholder;
const curry2$1 = curry2_1;

/**
 * @name _maxBy
 *
 * @synopsis
 * ```coffeescript [specscript]
 * _maxBy(array Array, path string) -> maxItemByPath any
 * ```
 */
const _maxBy = function (array, path) {
  const length = array.length;
  const getter = get$1(path);
  let index = 0;
  let maxItem = array[index];
  while (++index < length) {
    const item = array[index];
    if (getter(item) > getter(maxItem)) {
      maxItem = item;
    }
  }
  return maxItem
};

/**
 * @name maxBy
 *
 * @synopsis
 * ```coffeescript [specscript]
 * maxBy(array Array, path string) -> maxItemByPath any
 *
 * maxBy(path string)(array Array) -> maxItemByPath any
 * ```
 *
 * @description
 * Finds the item that is the max by a property denoted by path.
 *
 * ```javascript [playground]
 * import maxBy from 'https://unpkg.com/rubico/dist/x/maxBy.es.js'
 *
 * const array = [{ a: 1 }, { a: 2 }, { a: 3 }]
 *
 * const maxItem = maxBy(array, 'a')
 *
 * console.log(maxItem) // { a: 3 }
 * ```
 *
 * `maxBy` composes in a lazy way.
 *
 * ```javascript [playground]
 * import maxBy from 'https://unpkg.com/rubico/dist/x/maxBy.es.js'
 *
 * const numbers = [1, 2, 3]
 *
 * const maxItem = pipe(numbers, [
 *   map(number => number ** 2),
 *   map(number => ({ a: { b: { c: number } } })),
 *   maxBy('a.b.c')
 * ])
 *
 * console.log(maxItem) // { a: { b: { c: 9 } } }
 * ```
 */
const maxBy$1 = function (...args) {
  if (args.length > 1) {
    return _maxBy(...args)
  }
  return curry2$1(_maxBy, __$4, args[0])
};

var maxBy_1 = maxBy$1;

/**
 * @name noop
 *
 * @synopsis
 * ```coffeescript [specscript]
 * noop() -> undefined
 * ```
 *
 * @description
 * Doesn't do anything.
 *
 * ```javascript [playground]
 * import noop from 'https://unpkg.com/rubico/dist/x/noop.es.js'
 *
 * console.log(
 *   noop(),
 * ) // undefined
 * ```
 */

const noop$2 = function noop() {};

var noop_1 = noop$2;

const map = map_1;
const get = get_1;

/**
 * @name pluck
 *
 * @synopsis
 * ```coffeescript [specscript]
 * pluck(path string)(array Array) -> result Array
 *
 * pluck(array Array, path string) -> result Array
 * ```
 *
 * @description
 * Creates an array of picked properties denoted by a path from another array.
 *
 * `pluck` supports three types of path patterns for nested property access.
 *
 *  * dot delimited - `'a.b.c'`
 *  * bracket notation - `'a[0].value'`
 *  * an array of keys or indices - `['a', 0, 'value']`
 *
 * ```javascript [playground]
 * import pluck from 'https://unpkg.com/rubico/dist/x/pluck.es.js'
 *
 * const users = [
 *   { name: 'George', age: 33 },
 *   { name: 'Jane', age: 51 },
 *   { name: 'Jim', age: 22 },
 * ]
 *
 * const usernames = pluck(users, 'name')
 *
 * console.log(usernames) // ['George', 'Jane', 'Jim']
 * ```
 */
const pluck$1 = function (...args) {
  const path = args.pop();
  const getter = get(path);
  if (args.length == 0) {
    return map(getter)
  }
  return map(args[0], getter)
};

var pluck_1 = pluck$1;

const isString$1 = isString_1;
const isArray$2 = isArray_1;

/**
 * @name prepend
 *
 * @synopsis
 * ```coffeescript [specscript]
 * prepend(
 *   item string|Array,
 * )(value string|Array) -> string|array
 * ```
 *
 * @description
 * Prepend a string or an array.
 *
 * ```javascript [playground]
 * import prepend from 'https://unpkg.com/rubico/dist/x/prepend.es.js'
 *
 * const myArray = ['orange', 'apple']
 *
 * {
 *   const result = prepend(['ananas'])(myArray)
 *   console.log(result) // ['ananas', 'orange', 'apple']
 * }
 *
 * {
 *   const result = prepend('ananas')(myArray)
 *   console.log(result) // ['ananas', 'orange', 'apple']
 * }
 *
 * {
 *   const result = prepend('hello ')('world')
 *   console.log(result) // 'hello world'
 * }
 * ```
 *
 * @since 1.7.3
 */

const prepend$1 = item => function prependFunc(value) {

    if (isArray$2(value)) {
      if (isArray$2(item)){
        return [...item, ...value]
      }
      return [item, ...value]
    }

    if (isString$1(value)){
      if (!isString$1(item)){
        throw new TypeError(`${item} is not a string`)
      }
      return `${item}${value}`
    }

    throw new TypeError(`${value} is not an Array or string`)
  };

var prepend_1 = prepend$1;

const objectKeysLength = objectKeysLength_1;

/**
 * @name size
 *
 * @synopsis
 * ```coffeescript [specscript]
 * size(value any) -> number
 * ```
 *
 * @description
 * Get the count of items in a value.
 *
 * ```javascript [playground]
 * import size from 'https://unpkg.com/rubico/dist/x/size.es.js'
 *
 * console.log(size([1, 2, 3])) // 3
 * console.log(size('hey')) // 3
 * console.log(size(new Set([1, 2, 3]))) // 3
 * ```
 */
const size$1 = value => typeof value == 'string' ? value.length
  : value == null ? 0
  : typeof value.length == 'number' ? value.length
  : typeof value.size == 'number' ? value.size
  : value.constructor == Object ? objectKeysLength(value)
  : 1;

var size_1 = size$1;

const funcConcat = funcConcat_1;
const tap = tap_1;

// ...any => ()
const consoleLog = console.log;

/**
 * @name trace
 *
 * @synopsis
 * ```coffeescript [specscript]
 * var args ...any,
 *   resolved any,
 *   resolver ...args=>resolved
 *
 * trace(...args) -> args[0]
 *
 * trace(resolver)(...args) -> resolved
 * ```
 *
 * @description
 * Log a value out to the console, returning the value. If the value is a function, treat it as a resolver.
 *
 * ```javascript [playground]
 * import trace from 'https://unpkg.com/rubico/dist/x/trace.es.js'
 *
 * pipe([
 *   trace,
 *   trace(value => value.toUpperCase()),
 * ])('hey') // hey
 *           // HEY
 * console.log('check your console')
 * ```
 */
const trace$1 = function (...args) {
  const arg0 = args[0];
  if (typeof arg0 == 'function') {
    return tap(funcConcat(arg0, consoleLog))
  }
  return tap(consoleLog)(...args)
};

var trace_1 = trace$1;

const isArray$1 = isArray_1;
const isPromise$2 = isPromise_1;
const promiseAll = promiseAll_1;
const __$3 = placeholder;
const curry3$2 = curry3_1;
const thunkify2 = thunkify2_1;
const thunkify4 = thunkify4_1;
const funcConcatSync = funcConcatSync_1;
const callPropUnary = callPropUnary_1;
const thunkConditional$2 = thunkConditional_1;
const arrayFlatten = arrayFlatten_1;
const arrayPush = arrayPush_1;
const noop$1 = noop_1$1;

/**
 * @name arrayIncludesWith
 *
 * @synopsis
 * ```coffeescript [specscript]
 * var T any,
 *   array Array<T>,
 *   value T,
 *   comparator (T, T)=>boolean
 *
 * arrayIncludesWith
 * ```
 */
const arrayIncludesWith = function (array, value, comparator) {
  const length = array.length,
    promises = [];
  let index = -1;
  while (++index < length) {
    const predication = comparator(value, array[index]);
    if (isPromise$2(predication)) {
      promises.push(predication);
    } else if (predication) {
      return true
    }
  }
  return promises.length == 0 ? false
    : promiseAll(promises).then(curry3$2(callPropUnary, __$3, 'some', Boolean))
};

/**
 * @name arrayUniqWithAsync
 *
 * @synopsis
 * ```coffeescript [specscript]
 * var T any,
 *   array Array<T>,
 *   comparator (T, T)=>Promise|boolean
 *
 * arrayUniqWithAsync(array, comparator) -> Promise<Array<T>>
 * ```
 */
const arrayUniqWithAsync = async function (array, comparator, result, index) {
  const length = array.length;
  while (++index < length) {
    const item = array[index],
      itemAlreadyExists = arrayIncludesWith(result, item, comparator);
    if (!(
      isPromise$2(itemAlreadyExists) ? await itemAlreadyExists : itemAlreadyExists
    )) {
      result.push(item);
    }
  }
  return result
};

/**
 * @name arrayUniqWith
 *
 * @synopsis
 * ```coffeescript [specscript]
 * var T any,
 *   array Array<T>,
 *   comparator (T, T)=>Promise|boolean
 *
 * arrayUniqWith(array, comparator) -> Promise|Array<T>
 * ```
 *
 * @TODO rubico/x/uniqWith
 */
const arrayUniqWith = function (array, comparator) {
  const length = array.length,
    result = [];
  let index = -1;
  while (++index < length) {
    const item = array[index],
      itemAlreadyExists = arrayIncludesWith(result, item, comparator);
    if (isPromise$2(itemAlreadyExists)) {
      return itemAlreadyExists.then(funcConcatSync(
        curry3$2(thunkConditional$2, __$3, noop$1, thunkify2(arrayPush, result, item)),
        thunkify4(arrayUniqWithAsync, array, comparator, result, index)))
    } else if (!itemAlreadyExists) {
      result.push(item);
    }
  }
  return result
};

/**
 * @name unionWith
 *
 * @synopsis
 * ```coffeescript [specscript]
 * var T any,
 *   arrayOfArrays Array<Array<T>>,
 *   comparator (T, T)=>Promise|boolean
 *
 * unionWith(comparator)(arrayOfArrays) -> Array<T>
 * ```
 *
 * @description
 * Create an array of unique values from an array of arrays with uniqueness determined by a comparator. The comparator is a function that returns a boolean value, `true` if two given values are distinct.
 *
 * ```javascript [playground]
 * import isDeepEqual from 'https://unpkg.com/rubico/dist/x/isDeepEqual.es.js'
 * import unionWith from 'https://unpkg.com/rubico/dist/x/unionWith.es.js'
 *
 * console.log(
 *   unionWith(isDeepEqual)([
 *     [{ a: 1 }, { b: 2 }, { a: 1 }],
 *     [{ b: 2 }, { b: 2 }, { b: 2 }],
 *   ]),
 * ) // [{ a: 1 }, { b: 2 }]
 * ```
 *
 * @TODO setUnionWith
 */
const unionWith$1 = comparator => function unioning(value) {
  if (isArray$1(value)) {
    return arrayUniqWith(arrayFlatten(value), comparator)
  }
  throw new TypeError(`${value} is not an Array`)
};

var unionWith_1 = unionWith$1;

const isArray = isArray_1;

/**
 * @name uniq
 *
 * @synopsis
 * ```coffeescript [specscript]
 * var T any,
 *   array Array<T>
 *
 * uniq(array) -> Array
 * ```
 *
 * @description
 * Get an array of unique values from an array.
 *
 * ```javascript [playground]
 * import uniq from 'https://unpkg.com/rubico/dist/x/uniq.es.js'
 *
 * console.log(
 *   uniq([1, 2, 2, 3]),
 * ) // [1, 2, 3]
 * ```
 */
const uniq$1 = arr => {
  if (!isArray(arr)) throw Error('uniq(arr): arr is not an array')
  return [...new Set(arr)]
};

var uniq_1 = uniq$1;

const isPromise$1 = isPromise_1;
const always$1 = always_1;
const __$2 = placeholder;
const thunkify1$1 = thunkify1_1;
const curry3$1 = curry3_1;
const thunkConditional$1 = thunkConditional_1;

/**
 * @name unless
 *
 * @synopsis
 * ```coffeescript [specscript]
 * unless(
 *   predicate any=>Promise|boolean,
 *   func function,
 * )(value any) -> Promise|any
 * ```
 *
 * @description
 * Execute a function and return the result unless a condition is true, otherwise return the original value.
 *
 * ```javascript [playground]
 * import unless from 'https://unpkg.com/rubico/dist/x/unless.es.js'
 *
 * const isEven = num => num % 2 === 0
 * const doubleIfOdd = unless(isEven, num => num * 2)
 *
 * console.log(doubleIfOdd(100)) // 100
 * console.log(doubleIfOdd(101)) // 202
 * ```
 *
 * @since 1.7.3
 */

const unless$1 = (predicate, func) => function unlessFunc(value) {
  const predication = predicate(value);
  if (isPromise$1(predication)) {
    return predication.then(
      curry3$1(thunkConditional$1, __$2, always$1(value), thunkify1$1(func, value))
    )
  }
  if (!predication) {
    return func(value)
  }
  return value
};

var unless_1 = unless$1;

const objectValues = objectValues_1;

/**
 * @name values
 *
 * @synopsis
 * ```coffeescript [specscript]
 * values<T>(
 *   object String<T>|Array<T>|Set<T>|Map<any=>T>|Object<T>,
 * ) -> Array<T>
 * ```
 *
 * @description
 * Get an array of values from an instance.
 *
 * ```javascript [playground]
 * import values from 'https://unpkg.com/rubico/dist/x/values.es.js'
 *
 * console.log(values({ a: 1, b: 2, c: 3 })) // [1, 2, 3]
 * console.log(values('abc')) // ['a', 'b', 'c']
 * console.log(values(new Map([[1, 'hello'], [2, 'world']]))) // ['hello', 'world']
 * ```
 */
const values$1 = object => object == null ? []
  : typeof object.values == 'function' ? [...object.values()]
  : objectValues(object);

var values_1 = values$1;

const isPromise = isPromise_1;
const always = always_1;
const __$1 = placeholder;
const thunkify1 = thunkify1_1;
const curry3 = curry3_1;
const thunkConditional = thunkConditional_1;

/**
 * @name when
 *
 * @synopsis
 * ```coffeescript [specscript]
 * when(
 *   predicate any=>Promise|boolean,
 *   func function,
 * )(value any) -> Promise|any
 * ```
 *
 * @description
 * Execute a function and return the result when a condition is true, otherwise return the original value.
 *
 * ```javascript [playground]
 * import when from 'https://unpkg.com/rubico/dist/x/when.es.js'
 *
 * const isEven = num => num % 2 === 0
 * const doubleIfEven = when(isEven, num => num * 2)
 *
 * console.log(doubleIfEven(100)) // 200
 * console.log(doubleIfEven(101)) // 101
 * ```
 *
 * @since 1.7.1
 */

const when$1 = (predicate, func) => function whenFunc(value) {
  const predication = predicate(value);
  if (isPromise(predication)) {
    return predication.then(curry3(
      thunkConditional,
      __$1,
      thunkify1(func, value),
      always(value),
    ))
  }
  if (predication) {
    return func(value)
  }
  return value
};

var when_1 = when$1;

const includes$1 = includes_1;
const curry2 = curry2_1;
const __ = placeholder;

/**
 * @name _isIn
 *
 * @synopsis
 * ```coffeescript [specscript]
 * _isIn(value any, container Array|Object|String|Set|Map) -> boolean
 * ```
 *
 * @description
 * Counterpart to includes. Check if a collection includes another value.
 *
 * ```javascript [playground]
 * import isIn from 'https://unpkg.com/rubico/dist/x/isIn.es.js'
 *
 * console.log(
 *   isIn(1, [1, 2, 3])
 * ) // true
 *
 * console.log(
 *   isIn(4, [1, 2, 3])
 * ) // false
 *
 * console.log(
 *   isIn(1, { a: 1 })
 * ) // true
 *
 * console.log(
 *   isIn(2, { a: 1 })
 * ) // true
 *
 * console.log(
 *   isIn('a', 'abc')
 * ) // true
 *
 * console.log(
 *   isIn('ab', 'abc')
 * ) // true
 *
 * console.log(
 *   isIn('d', 'abc')
 * ) // false
 *
 * console.log(
 *   isIn(1, new Set([1, 2, 3]))
 * ) // true
 *
 * console.log(
 *   isIn(4, new Set([1, 2, 3]))
 * ) // false
 *
 * console.log(
 *   isIn(1, new Map([[1, 1], [2, 2], [3, 3]]))
 * ) // true
 *
 * console.log(
 *   isIn(4, new Map([[1, 1], [2, 2], [3, 3]]))
 * ) // false
 * ```
 */
const _isIn = function (value, container) {
  if (container == null) {
    return false
  }
  if (container.constructor == Set) {
    return container.has(value)
  }
  if (container.constructor == Map) {
    return Array.from(container.values()).includes(value)
  }

  return includes$1(value)(container)
};


/**
 * @name isIn
 *
 * @synopsis
 * ```coffeescript [specscript]
 * isIn(container Array|Object|String|Set|Map)(value any) -> boolean
 * ```
 *
 * @description
 * Counterpart to includes. Check if a collection includes another value.
 *
 * ```javascript [playground]
 * import isIn from 'https://unpkg.com/rubico/dist/x/isIn.es.js'
 *
 * console.log(
 *   isIn([1, 2, 3](1)
 * ) // true
 *
 * console.log(
 *   isIn([1, 2, 3](4)
 * ) // false
 *
 * console.log(
 *   isIn({ a: 1 })(1)
 * ) // true
 *
 * console.log(
 *   isIn({ a: 1 })(2)
 * ) // true
 *
 * console.log(
 *   isIn('abc')('a')
 * ) // true
 *
 * console.log(
 *   isIn('abc')('ab')
 * ) // true
 *
 * console.log(
 *   isIn('abc')('d')
 * ) // false
 *
 * console.log(
 *   isIn(new Set([1, 2, 3]))(1)
 * ) // true
 *
 * console.log(
 *   isIn(new Set([1, 2, 3]))(4)
 * ) // false
 *
 * console.log(
 *   isIn(new Map([[1, 1], [2, 2], [3, 3]]))(1)
 * ) // true
 *
 * console.log(
 *   isIn(new Map([[1, 1], [2, 2], [3, 3]]))(4)
 * ) // false
 * ```
 */
const isIn$1 = (...args) => {
  const container = args.pop();
  if (args.length > 0) {
    return _isIn(args[0], container)
  }
  return curry2(_isIn, __, container)
};

var isIn_1 = isIn$1;

const append = append_1;
const callProp = callProp_1;
const defaultsDeep = defaultsDeep_1;
const differenceWith = differenceWith_1;
const filterOut = filterOut_1;
const find = find_1;
const findIndex = findIndex_1;
const first = first_1;
const flatten = flatten_1;
const groupBy = groupBy_1;
const has = has_1;
const identity = identity_1;
const includes = includes_1;
const isDeepEqual = isDeepEqual_1;
const isEmpty = isEmpty_1;
const isEqual = isEqual_1;
const isFunction = isFunction_1;
const isObject = isObject_1;
const isString = isString_1;
const keys = keys_1;
const last = last_1;
const maxBy = maxBy_1;
const noop = noop_1;
const pluck = pluck_1;
const prepend = prepend_1;
const size = size_1;
const trace = trace_1;
const unionWith = unionWith_1;
const uniq = uniq_1;
const unless = unless_1;
const values = values_1;
const when = when_1;
const isIn = isIn_1;

const rubicoX = {
  append,
  callProp,
  defaultsDeep,
  differenceWith,
  filterOut,
  find,
  findIndex,
  first,
  flatten,
  groupBy,
  has,
  identity,
  includes,
  isDeepEqual,
  isEmpty,
  isEqual,
  isFunction,
  isObject,
  isString,
  keys,
  last,
  maxBy,
  noop,
  pluck,
  prepend,
  size,
  trace,
  unionWith,
  uniq,
  unless,
  values,
  when,
  isIn,
};

var x = rubicoX;

main();
const Constants = {
  RECORDING_OF_LINK_TYPE_ID: 278,
  COMPOSER_LINK_TYPE_ID: 168,
  LYRICIST_LINK_TYPE_ID: 165,
  ARRANGER_LINK_TYPE_ID: 297,
  TRANSLATOR_LINK_TYPE_ID: 872,
  REL_STATUS_NOOP: 0,
  REL_STATUS_ADD: 1,
  REL_STATUS_EDIT: 2,
  REL_STATUS_REMOVE: 3,
  ACUM_TYPE_ID: 206
};
function validateInput() {
  const input = document.querySelector('#acum-album-id');
  const button = document.querySelector('#acum-work-import-container button');
  button.disabled = !input.value || !verifySelection();
  input.reportValidity();
}
function main() {
  createUI(importFromAcum, validateInput);
  VM.observe(document.body, () => {
    const recordingCheckboxes = document.querySelectorAll('input[type=checkbox].recording, input[type=checkbox].medium-recordings, input[type=checkbox].all-recordings');
    if (recordingCheckboxes.length > 0) {
      recordingCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', validateInput);
      });
      return true;
    }
  });
}
const artistCache = new Map();
async function findArtist(ipBaseNumber, creators) {
  if (!artistCache.has(ipBaseNumber)) {
    const artistPromise = (async () => {
      const creator = creators.find(creator => creator.creatorIpBaseNumber === ipBaseNumber);
      const byIpi = await tryFetch(`/ws/2/artist?query=ipi:${creator.number}`);
      if (byIpi && byIpi.artists.length > 0) {
        return byIpi.artists[0].id;
      }
      const byName = await tryFetch(`/ws/2/artist?query=name:(${creator.creatorHebName} OR ${creator.creatorEngName})`);
      if (byName && byName.artists.length > 0) {
        addWarning('data', `artist ${byName.artists[0].name} found by name search, please verify (IPI = ${creator.number})`);
        return byName.artists[0].id;
      }
      addWarning('data', `failed to find ${creator.creatorHebName || creator.creatorEngName}, IPI ${creator.number}`);
      return null;
    })().then(async artistMBID => artistMBID ? await tryFetch(`/ws/js/entity/${artistMBID}`) : null);
    artistCache.set(ipBaseNumber, artistPromise);
  }
  return await artistCache.get(ipBaseNumber);
}
function createRelationshipState(attributes) {
  return _extends({}, {
    _lineage: [],
    _original: null,
    _status: 0,
    attributes: null,
    begin_date: null,
    editsPending: false,
    end_date: null,
    ended: false,
    entity0: null,
    entity0_credit: '',
    entity1: null,
    entity1_credit: '',
    id: -1,
    linkOrder: 0,
    linkTypeID: null
  }, attributes);
}
function addWriterRelationship(work, artist, linkTypeID) {
  MB.relationshipEditor.dispatch({
    type: 'update-relationship-state',
    sourceEntity: work,
    batchSelectionCount: undefined,
    creditsToChangeForSource: '',
    creditsToChangeForTarget: '',
    newRelationshipState: createRelationshipState({
      _status: Constants.REL_STATUS_ADD,
      backward: true,
      entity0: artist,
      entity1: work,
      id: MB.relationshipEditor.getRelationshipStateId(),
      linkTypeID: linkTypeID
    }),
    oldRelationshipState: null
  });
}
function addArrangerRelationship(recording, artist) {
  MB.relationshipEditor.dispatch({
    type: 'update-relationship-state',
    sourceEntity: recording,
    batchSelectionCount: undefined,
    creditsToChangeForSource: '',
    creditsToChangeForTarget: '',
    newRelationshipState: createRelationshipState({
      _status: Constants.REL_STATUS_ADD,
      backward: true,
      entity0: artist,
      entity1: recording,
      id: MB.relationshipEditor.getRelationshipStateId(),
      linkTypeID: Constants.ARRANGER_LINK_TYPE_ID
    }),
    oldRelationshipState: null
  });
}
async function workISWCs(workID) {
  var _await$getWorkVersion;
  const formatISWC = iswc => iswc.replace(/T(\d{3})(\d{3})(\d{3})(\d)/, 'T-$1.$2.$3-$4');
  return (_await$getWorkVersion = await getWorkVersions(workID)) == null ? void 0 : _await$getWorkVersion.map(albumVersion => albumVersion.versionIswcNumber).filter(iswc => iswc.length > 0).map(formatISWC);
}
const workCache = new Map();
function createWork(attributes) {
  return _extends({}, {
    artists: [],
    attributes: [],
    comment: '',
    editsPending: false,
    entityType: 'work',
    gid: '',
    id: 0,
    iswcs: [],
    languages: [],
    last_updated: null,
    name: '',
    typeID: null,
    writers: []
  }, attributes);
}
async function addWork(track, recording) {
  if (not$2(x.isEmpty(recording.related_works))) {
    return x.first(recording.related_works);
  }
  const newWork = await (async _await$workISWCs => {
    if (workCache.has(track.fullWorkId)) {
      return workCache.get(track.fullWorkId);
    }
    const workId = MB.relationshipEditor.getRelationshipStateId();
    const newWork = createWork({
      _fromBatchCreateWorksDialog: true,
      id: workId,
      name: track.workHebName,
      languages: track.workLanguage == '1' ? Object.values(MB.linkedEntities.language).filter(lang => lang.name == 'Hebrew').map(language => ({
        language: language
      })) : [],
      iswcs: (_await$workISWCs = await workISWCs(track.workId)) == null ? void 0 : _await$workISWCs.map(iswc => ({
        entityType: 'iswc',
        id: MB.relationshipEditor.getRelationshipStateId(),
        editsPending: true,
        iswc: iswc,
        work_id: workId
      })),
      attributes: [{
        id: MB.relationshipEditor.getRelationshipStateId(),
        typeID: Constants.ACUM_TYPE_ID,
        typeName: 'ACUM ID',
        value: track.fullWorkId,
        value_id: null
      }]
    });
    console.log(newWork.languages);
    workCache.set(track.fullWorkId, newWork);
    return newWork;
  })();
  MB.linkedEntities.work[newWork.id] = newWork;
  MB.relationshipEditor.dispatch({
    type: 'update-relationship-state',
    sourceEntity: recording,
    batchSelectionCount: undefined,
    creditsToChangeForSource: '',
    creditsToChangeForTarget: '',
    newRelationshipState: createRelationshipState({
      _status: Constants.REL_STATUS_ADD,
      backward: false,
      entity0: recording,
      entity1: newWork,
      id: MB.relationshipEditor.getRelationshipStateId(),
      linkTypeID: Constants.RECORDING_OF_LINK_TYPE_ID
    }),
    oldRelationshipState: null
  });
  return newWork;
}
function addWarning(className, message) {
  const container = document.querySelector('#acum-work-import-container');
  for (const element of container.querySelectorAll(`p.warning.${className}`).values()) {
    if (element.textContent === message) {
      return;
    }
  }
  const warning = document.createElement('p');
  warning.classList.add('warning', className);
  warning.textContent = message;
  container.appendChild(warning);
}
function clearWarnings(className) {
  const container = document.querySelector('#acum-work-import-container');
  container.querySelectorAll(`p.warning.${className}`).forEach(element => element.remove());
}
async function importFromAcum() {
  clearWarnings('data');
  const albumId = document.getElementById('acum-album-id').value;
  const albumBean = await getAlbumInfo(albumId);
  if (!albumBean) {
    alert('failed to find this album ID');
    return;
  }
  const searchName = recording => /[א-ת]/.test(recording.name) ? 'workHebName' : 'workEngName';
  const linkArtists = async (writers, creators, doLink) => {
    pipe$1(writers, [map$2(async author => await findArtist(author.creatorIpBaseNumber, creators)), filter$2(artist => artist !== undefined), forEach$1(doLink)]);
  };
  const linkWriters = async (work, writers, creators, linkTypeId) => {
    linkArtists(writers, creators, artist => addWriterRelationship(work, artist, linkTypeId));
  };
  const linkArrangers = async (recording, arrangers, creators) => {
    linkArtists(arrangers, creators, artist => addArrangerRelationship(recording, artist));
  };
  const tracks = albumBean.tracks;
  pipe$1(MB.tree.iterate(MB.relationshipEditor.state.selectedRecordings), [map$2(recording => {
    const mediums = MB.relationshipEditor.state.mediumsByRecordingId.get(recording.id);
    const position = mediums[0].tracks.find(track => track.recording === recording).position;
    return [recording, tracks.find((t, index) => t[searchName(recording)] === recording.name || index === position - 1)];
  }), filter$2(pair => pair[1] !== undefined), tap$2.if(not$2(x.isEmpty), () => addEditNote(`imported from ${albumUrl(albumId)}`)), forEach$1(async ([recording, track]) => {
    if (track[searchName(recording)] != recording.name) {
      addWarning('data', `Work name of ${recording.name} is different than recording name, please verify`);
    }
    const work = await addWork(track, recording);
    linkWriters(work, track.authors, track.creators, Constants.LYRICIST_LINK_TYPE_ID);
    linkWriters(work, track.composers, track.creators, Constants.COMPOSER_LINK_TYPE_ID);
    if (track.translators) {
      linkWriters(work, track.translators, track.creators, Constants.TRANSLATOR_LINK_TYPE_ID);
    }
    if (track.arrangers) {
      linkArrangers(recording, track.arrangers, track.creators);
    }
  })]);
}
let verifiedRecordings = undefined;
let recordingVerifyResult = undefined;
function verifySelection() {
  if (verifiedRecordings && MB.tree.equals(MB.relationshipEditor.state.selectedRecordings, verifiedRecordings)) {
    return recordingVerifyResult;
  }
  recordingVerifyResult = (() => {
    if (!MB.relationshipEditor.state.selectedRecordings || MB.relationshipEditor.state.selectedRecordings.size == 0) {
      addWarning('selection', 'select at least one recording');
      return false;
    }
    const selectedMediums = new Set(MB.tree.toArray(MB.tree.map(MB.relationshipEditor.state.selectedRecordings, recording => MB.relationshipEditor.state.mediumsByRecordingId.get(recording.id))).flat());
    if (selectedMediums.size > 1) {
      addWarning('selection', 'select recordings only from a single medium');
      return false;
    }
    clearWarnings('selection');
    return true;
  })();
  verifiedRecordings = MB.relationshipEditor.state.selectedRecordings;
  return recordingVerifyResult;
}

})(VM.solid.web);
