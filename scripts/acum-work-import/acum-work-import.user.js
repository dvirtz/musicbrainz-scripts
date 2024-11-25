// ==UserScript==
// @name        ACUM work importer
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

(function (web, solidJs, store) {
'use strict';

function chain(callbacks) {
  return (...args) => {
    for (const callback of callbacks)
      callback && callback(...args);
  };
}
var access$1 = (v) => typeof v === "function" && !v.length ? v() : v;
function accessWith(valueOrFn, ...args) {
  return typeof valueOrFn === "function" ? valueOrFn(...args) : valueOrFn;
}

var extractCSSregex = /((?:--)?(?:\w+-?)+)\s*:\s*([^;]*)/g;
function stringStyleToObject(style) {
  const object = {};
  let match;
  while (match = extractCSSregex.exec(style)) {
    object[match[1]] = match[2];
  }
  return object;
}
function combineStyle(a, b) {
  if (typeof a === "string") {
    if (typeof b === "string")
      return `${a};${b}`;
    a = stringStyleToObject(a);
  } else if (typeof b === "string") {
    b = stringStyleToObject(b);
  }
  return { ...a, ...b };
}

// src/index.ts
function mergeRefs(...refs) {
  return chain(refs);
}

function removeItemFromArray(array, item) {
  const updatedArray = [...array];
  const index = updatedArray.indexOf(item);
  if (index !== -1) {
    updatedArray.splice(index, 1);
  }
  return updatedArray;
}
function isString(value) {
  return Object.prototype.toString.call(value) === "[object String]";
}
function isFunction$1(value) {
  return typeof value === "function";
}

// src/create-generate-id.ts
function createGenerateId(baseId) {
  return (suffix) => `${baseId()}-${suffix}`;
}

// src/dom.ts
function contains$1(parent, child) {
  if (!parent) {
    return false;
  }
  return parent === child || parent.contains(child);
}
function getActiveElement(node, activeDescendant = false) {
  const { activeElement } = getDocument(node);
  if (!activeElement?.nodeName) {
    return null;
  }
  if (isFrame(activeElement) && activeElement.contentDocument) {
    return getActiveElement(
      activeElement.contentDocument.body,
      activeDescendant
    );
  }
  if (activeDescendant) {
    const id = activeElement.getAttribute("aria-activedescendant");
    if (id) {
      const element = getDocument(activeElement).getElementById(id);
      if (element) {
        return element;
      }
    }
  }
  return activeElement;
}
function getWindow$1(node) {
  return getDocument(node).defaultView || window;
}
function getDocument(node) {
  return node ? node.ownerDocument || node : document;
}
function isFrame(element) {
  return element.tagName === "IFRAME";
}

// src/enums.ts
var EventKey = /* @__PURE__ */ ((EventKey2) => {
  EventKey2["Escape"] = "Escape";
  EventKey2["Enter"] = "Enter";
  EventKey2["Tab"] = "Tab";
  EventKey2["Space"] = " ";
  EventKey2["ArrowDown"] = "ArrowDown";
  EventKey2["ArrowLeft"] = "ArrowLeft";
  EventKey2["ArrowRight"] = "ArrowRight";
  EventKey2["ArrowUp"] = "ArrowUp";
  EventKey2["End"] = "End";
  EventKey2["Home"] = "Home";
  EventKey2["PageDown"] = "PageDown";
  EventKey2["PageUp"] = "PageUp";
  return EventKey2;
})(EventKey || {});
function testPlatform(re) {
  return typeof window !== "undefined" && window.navigator != null ? re.test(
    // @ts-ignore
    window.navigator.userAgentData?.platform || window.navigator.platform
  ) : false;
}
function isMac() {
  return testPlatform(/^Mac/i);
}

// src/events.ts
function callHandler(event, handler) {
  if (handler) {
    if (isFunction$1(handler)) {
      handler(event);
    } else {
      handler[0](handler[1], event);
    }
  }
  return event?.defaultPrevented;
}
function composeEventHandlers(handlers) {
  return (event) => {
    for (const handler of handlers) {
      callHandler(event, handler);
    }
  };
}
function isCtrlKey(e) {
  if (isMac()) {
    return e.metaKey && !e.ctrlKey;
  }
  return e.ctrlKey && !e.metaKey;
}

// src/focus-without-scrolling.ts
function focusWithoutScrolling(element) {
  if (!element) {
    return;
  }
  if (supportsPreventScroll()) {
    element.focus({ preventScroll: true });
  } else {
    const scrollableElements = getScrollableElements(element);
    element.focus();
    restoreScrollPosition(scrollableElements);
  }
}
var supportsPreventScrollCached = null;
function supportsPreventScroll() {
  if (supportsPreventScrollCached == null) {
    supportsPreventScrollCached = false;
    try {
      const focusElem = document.createElement("div");
      focusElem.focus({
        get preventScroll() {
          supportsPreventScrollCached = true;
          return true;
        }
      });
    } catch (e) {
    }
  }
  return supportsPreventScrollCached;
}
function getScrollableElements(element) {
  let parent = element.parentNode;
  const scrollableElements = [];
  const rootScrollingElement = document.scrollingElement || document.documentElement;
  while (parent instanceof HTMLElement && parent !== rootScrollingElement) {
    if (parent.offsetHeight < parent.scrollHeight || parent.offsetWidth < parent.scrollWidth) {
      scrollableElements.push({
        element: parent,
        scrollTop: parent.scrollTop,
        scrollLeft: parent.scrollLeft
      });
    }
    parent = parent.parentNode;
  }
  if (rootScrollingElement instanceof HTMLElement) {
    scrollableElements.push({
      element: rootScrollingElement,
      scrollTop: rootScrollingElement.scrollTop,
      scrollLeft: rootScrollingElement.scrollLeft
    });
  }
  return scrollableElements;
}
function restoreScrollPosition(scrollableElements) {
  for (const { element, scrollTop, scrollLeft } of scrollableElements) {
    element.scrollTop = scrollTop;
    element.scrollLeft = scrollLeft;
  }
}

// src/tabbable.ts
var focusableElements = [
  "input:not([type='hidden']):not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "button:not([disabled])",
  "a[href]",
  "area[href]",
  "[tabindex]",
  "iframe",
  "object",
  "embed",
  "audio[controls]",
  "video[controls]",
  "[contenteditable]:not([contenteditable='false'])"
];
var FOCUSABLE_ELEMENT_SELECTOR = `${focusableElements.join(
  ":not([hidden]),"
)},[tabindex]:not([disabled]):not([hidden])`;
function getAllTabbableIn(container, includeContainer) {
  const elements = Array.from(
    container.querySelectorAll(FOCUSABLE_ELEMENT_SELECTOR)
  );
  const tabbableElements2 = elements.filter(isTabbable);
  if (includeContainer && isTabbable(container)) {
    tabbableElements2.unshift(container);
  }
  tabbableElements2.forEach((element, i) => {
    if (isFrame(element) && element.contentDocument) {
      const frameBody = element.contentDocument.body;
      const allFrameTabbable = getAllTabbableIn(frameBody, false);
      tabbableElements2.splice(i, 1, ...allFrameTabbable);
    }
  });
  return tabbableElements2;
}
function isTabbable(element) {
  return isFocusable(element) && !hasNegativeTabIndex(element);
}
function isFocusable(element) {
  return element.matches(FOCUSABLE_ELEMENT_SELECTOR) && isElementVisible(element);
}
function hasNegativeTabIndex(element) {
  const tabIndex = Number.parseInt(element.getAttribute("tabindex") || "0", 10);
  return tabIndex < 0;
}
function isElementVisible(element, childElement) {
  return element.nodeName !== "#comment" && isStyleVisible(element) && isAttributeVisible(element, childElement) && (!element.parentElement || isElementVisible(element.parentElement, element));
}
function isStyleVisible(element) {
  if (!(element instanceof HTMLElement) && !(element instanceof SVGElement)) {
    return false;
  }
  const { display, visibility } = element.style;
  let isVisible = display !== "none" && visibility !== "hidden" && visibility !== "collapse";
  if (isVisible) {
    if (!element.ownerDocument.defaultView) {
      return isVisible;
    }
    const { getComputedStyle } = element.ownerDocument.defaultView;
    const { display: computedDisplay, visibility: computedVisibility } = getComputedStyle(element);
    isVisible = computedDisplay !== "none" && computedVisibility !== "hidden" && computedVisibility !== "collapse";
  }
  return isVisible;
}
function isAttributeVisible(element, childElement) {
  return !element.hasAttribute("hidden") && (element.nodeName === "DETAILS" && childElement && childElement.nodeName !== "SUMMARY" ? element.hasAttribute("open") : true);
}

// src/noop.ts
function noop$1() {
  return;
}
function mergeDefaultProps(defaultProps, props) {
  return solidJs.mergeProps(defaultProps, props);
}

// src/run-after-transition.ts
var transitionsByElement = /* @__PURE__ */ new Map();
var transitionCallbacks = /* @__PURE__ */ new Set();
function setupGlobalEvents() {
  if (typeof window === "undefined") {
    return;
  }
  const onTransitionStart = (e) => {
    if (!e.target) {
      return;
    }
    let transitions = transitionsByElement.get(e.target);
    if (!transitions) {
      transitions = /* @__PURE__ */ new Set();
      transitionsByElement.set(e.target, transitions);
      e.target.addEventListener(
        "transitioncancel",
        onTransitionEnd
      );
    }
    transitions.add(e.propertyName);
  };
  const onTransitionEnd = (e) => {
    if (!e.target) {
      return;
    }
    const properties = transitionsByElement.get(e.target);
    if (!properties) {
      return;
    }
    properties.delete(e.propertyName);
    if (properties.size === 0) {
      e.target.removeEventListener(
        "transitioncancel",
        onTransitionEnd
      );
      transitionsByElement.delete(e.target);
    }
    if (transitionsByElement.size === 0) {
      for (const cb of transitionCallbacks) {
        cb();
      }
      transitionCallbacks.clear();
    }
  };
  document.body.addEventListener("transitionrun", onTransitionStart);
  document.body.addEventListener("transitionend", onTransitionEnd);
}
if (typeof document !== "undefined") {
  if (document.readyState !== "loading") {
    setupGlobalEvents();
  } else {
    document.addEventListener("DOMContentLoaded", setupGlobalEvents);
  }
}

// src/styles.ts
var visuallyHiddenStyles = {
  border: "0",
  clip: "rect(0 0 0 0)",
  "clip-path": "inset(50%)",
  height: "1px",
  margin: "0 -1px -1px 0",
  overflow: "hidden",
  padding: "0",
  position: "absolute",
  width: "1px",
  "white-space": "nowrap"
};

// src/primitives/create-tag-name/create-tag-name.ts
function createTagName(ref, fallback) {
  const [tagName, setTagName] = solidJs.createSignal(stringOrUndefined(fallback?.()));
  solidJs.createEffect(() => {
    setTagName(ref()?.tagName.toLowerCase() || stringOrUndefined(fallback?.()));
  });
  return tagName;
}
function stringOrUndefined(value) {
  return isString(value) ? value : void 0;
}

// src/polymorphic/polymorphic.tsx
function Polymorphic(props) {
  const [local, others] = solidJs.splitProps(props, ["as"]);
  if (!local.as) {
    throw new Error("[kobalte]: Polymorphic is missing the required `as` prop.");
  }
  return (
    // @ts-ignore: Props are valid but not worth calculating
    web.createComponent(web.Dynamic, web.mergeProps(others, {
      get component() {
        return local.as;
      }
    }))
  );
}

var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/button/index.tsx
var button_exports = {};
__export(button_exports, {
  Button: () => Button,
  Root: () => ButtonRoot
});

// src/button/is-button.ts
var BUTTON_INPUT_TYPES = [
  "button",
  "color",
  "file",
  "image",
  "reset",
  "submit"
];
function isButton(element) {
  const tagName = element.tagName.toLowerCase();
  if (tagName === "button") {
    return true;
  }
  if (tagName === "input" && element.type) {
    return BUTTON_INPUT_TYPES.indexOf(element.type) !== -1;
  }
  return false;
}

// src/button/button-root.tsx
function ButtonRoot(props) {
  let ref;
  const mergedProps = mergeDefaultProps({
    type: "button"
  }, props);
  const [local, others] = solidJs.splitProps(mergedProps, ["ref", "type", "disabled"]);
  const tagName = createTagName(() => ref, () => "button");
  const isNativeButton = solidJs.createMemo(() => {
    const elementTagName = tagName();
    if (elementTagName == null) {
      return false;
    }
    return isButton({
      tagName: elementTagName,
      type: local.type
    });
  });
  const isNativeInput = solidJs.createMemo(() => {
    return tagName() === "input";
  });
  const isNativeLink = solidJs.createMemo(() => {
    return tagName() === "a" && ref?.getAttribute("href") != null;
  });
  return web.createComponent(Polymorphic, web.mergeProps({
    as: "button",
    ref(r$) {
      const _ref$ = mergeRefs((el) => ref = el, local.ref);
      typeof _ref$ === "function" && _ref$(r$);
    },
    get type() {
      return isNativeButton() || isNativeInput() ? local.type : void 0;
    },
    get role() {
      return !isNativeButton() && !isNativeLink() ? "button" : void 0;
    },
    get tabIndex() {
      return !isNativeButton() && !isNativeLink() && !local.disabled ? 0 : void 0;
    },
    get disabled() {
      return isNativeButton() || isNativeInput() ? local.disabled : void 0;
    },
    get ["aria-disabled"]() {
      return !isNativeButton() && !isNativeInput() && local.disabled ? true : void 0;
    },
    get ["data-disabled"]() {
      return local.disabled ? "" : void 0;
    }
  }, others));
}

// src/button/index.tsx
var Button = ButtonRoot;

var _tmpl$$e = /*#__PURE__*/web.template(`<div id=dvirtz-release-editor-tools style="padding:8px;border:5px dotted rgb(171, 171, 109);margin:0px -6px 6px"><h2>dvirtz MusicBrainz scripts`);
function releaseEditorTools() {
  var _document$querySelect;
  const ID = 'dvirtz-release-editor-tools';
  const existing = document.getElementById(ID);
  if (existing) {
    return existing;
  }
  const toolbox = _tmpl$$e();
  (_document$querySelect = document.querySelector('div.tabs')) == null || _document$querySelect.insertAdjacentElement('afterend', toolbox);
  return toolbox;
}

var _tmpl$$d = /*#__PURE__*/web.template(`<p class=warning>`);
const makeWarningContext = () => {
  const [state, setState] = solidJs.createSignal(new Set(["Only use this option after you've tried searching for the work(s) you want to add, and are certain they do not already exist on MusicBrainz."]));
  return {
    state,
    addWarning: message => setState(new Set([...state(), message])),
    clearWarnings: (pattern = /.*/) => {
      setState(new Set([...state()].filter(warning => !warning.match(pattern))));
    }
  };
};
const WarningsContext = solidJs.createContext();
function WarningsProvider(props) {
  const {
    state,
    addWarning,
    clearWarnings
  } = makeWarningContext();
  return web.createComponent(WarningsContext.Provider, {
    value: {
      state,
      addWarning,
      clearWarnings
    },
    get children() {
      return props.children;
    }
  });
}
function useWarnings() {
  const context = solidJs.useContext(WarningsContext);
  if (!context) {
    throw new Error('useWarnings should be called inside WarningsProvider');
  }
  return context;
}
function Warnings() {
  const {
    state
  } = useWarnings();
  return web.createComponent(solidJs.For, {
    get each() {
      return [...state()];
    },
    children: message => (() => {
      var _el$ = _tmpl$$d();
      web.insert(_el$, message);
      return _el$;
    })()
  });
}

/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
/* global Reflect, Promise, SuppressedError, Symbol, Iterator */

var extendStatics = function(d, b) {
  extendStatics = Object.setPrototypeOf ||
      ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
      function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
  return extendStatics(d, b);
};

function __extends(d, b) {
  if (typeof b !== "function" && b !== null)
      throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
  extendStatics(d, b);
  function __() { this.constructor = d; }
  d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
}

function __awaiter(thisArg, _arguments, P, generator) {
  function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
  return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
      function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
      function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
}

function __generator(thisArg, body) {
  var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
  return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
  function verb(n) { return function (v) { return step([n, v]); }; }
  function step(op) {
      if (f) throw new TypeError("Generator is already executing.");
      while (g && (g = 0, op[0] && (_ = 0)), _) try {
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
}

function __values(o) {
  var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
  if (m) return m.call(o);
  if (o && typeof o.length === "number") return {
      next: function () {
          if (o && i >= o.length) o = void 0;
          return { value: o && o[i++], done: !o };
      }
  };
  throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
}

function __read(o, n) {
  var m = typeof Symbol === "function" && o[Symbol.iterator];
  if (!m) return o;
  var i = m.call(o), r, ar = [], e;
  try {
      while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
  }
  catch (error) { e = { error: error }; }
  finally {
      try {
          if (r && !r.done && (m = i["return"])) m.call(i);
      }
      finally { if (e) throw e.error; }
  }
  return ar;
}

function __spreadArray(to, from, pack) {
  if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
      if (ar || !(i in from)) {
          if (!ar) ar = Array.prototype.slice.call(from, 0, i);
          ar[i] = from[i];
      }
  }
  return to.concat(ar || Array.prototype.slice.call(from));
}

function __await(v) {
  return this instanceof __await ? (this.v = v, this) : new __await(v);
}

function __asyncGenerator(thisArg, _arguments, generator) {
  if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
  var g = generator.apply(thisArg, _arguments || []), i, q = [];
  return i = Object.create((typeof AsyncIterator === "function" ? AsyncIterator : Object).prototype), verb("next"), verb("throw"), verb("return", awaitReturn), i[Symbol.asyncIterator] = function () { return this; }, i;
  function awaitReturn(f) { return function (v) { return Promise.resolve(v).then(f, reject); }; }
  function verb(n, f) { if (g[n]) { i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; if (f) i[n] = f(i[n]); } }
  function resume(n, v) { try { step(g[n](v)); } catch (e) { settle(q[0][3], e); } }
  function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r); }
  function fulfill(value) { resume("next", value); }
  function reject(value) { resume("throw", value); }
  function settle(f, v) { if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]); }
}

function __asyncValues(o) {
  if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
  var m = o[Symbol.asyncIterator], i;
  return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
  function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
  function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
}

typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
  var e = new Error(message);
  return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
};

function isFunction(value) {
    return typeof value === 'function';
}

function createErrorClass(createImpl) {
    var _super = function (instance) {
        Error.call(instance);
        instance.stack = new Error().stack;
    };
    var ctorFunc = createImpl(_super);
    ctorFunc.prototype = Object.create(Error.prototype);
    ctorFunc.prototype.constructor = ctorFunc;
    return ctorFunc;
}

var UnsubscriptionError = createErrorClass(function (_super) {
    return function UnsubscriptionErrorImpl(errors) {
        _super(this);
        this.message = errors
            ? errors.length + " errors occurred during unsubscription:\n" + errors.map(function (err, i) { return i + 1 + ") " + err.toString(); }).join('\n  ')
            : '';
        this.name = 'UnsubscriptionError';
        this.errors = errors;
    };
});

function arrRemove(arr, item) {
    if (arr) {
        var index = arr.indexOf(item);
        0 <= index && arr.splice(index, 1);
    }
}

var Subscription = (function () {
    function Subscription(initialTeardown) {
        this.initialTeardown = initialTeardown;
        this.closed = false;
        this._parentage = null;
        this._finalizers = null;
    }
    Subscription.prototype.unsubscribe = function () {
        var e_1, _a, e_2, _b;
        var errors;
        if (!this.closed) {
            this.closed = true;
            var _parentage = this._parentage;
            if (_parentage) {
                this._parentage = null;
                if (Array.isArray(_parentage)) {
                    try {
                        for (var _parentage_1 = __values(_parentage), _parentage_1_1 = _parentage_1.next(); !_parentage_1_1.done; _parentage_1_1 = _parentage_1.next()) {
                            var parent_1 = _parentage_1_1.value;
                            parent_1.remove(this);
                        }
                    }
                    catch (e_1_1) { e_1 = { error: e_1_1 }; }
                    finally {
                        try {
                            if (_parentage_1_1 && !_parentage_1_1.done && (_a = _parentage_1.return)) _a.call(_parentage_1);
                        }
                        finally { if (e_1) throw e_1.error; }
                    }
                }
                else {
                    _parentage.remove(this);
                }
            }
            var initialFinalizer = this.initialTeardown;
            if (isFunction(initialFinalizer)) {
                try {
                    initialFinalizer();
                }
                catch (e) {
                    errors = e instanceof UnsubscriptionError ? e.errors : [e];
                }
            }
            var _finalizers = this._finalizers;
            if (_finalizers) {
                this._finalizers = null;
                try {
                    for (var _finalizers_1 = __values(_finalizers), _finalizers_1_1 = _finalizers_1.next(); !_finalizers_1_1.done; _finalizers_1_1 = _finalizers_1.next()) {
                        var finalizer = _finalizers_1_1.value;
                        try {
                            execFinalizer(finalizer);
                        }
                        catch (err) {
                            errors = errors !== null && errors !== void 0 ? errors : [];
                            if (err instanceof UnsubscriptionError) {
                                errors = __spreadArray(__spreadArray([], __read(errors)), __read(err.errors));
                            }
                            else {
                                errors.push(err);
                            }
                        }
                    }
                }
                catch (e_2_1) { e_2 = { error: e_2_1 }; }
                finally {
                    try {
                        if (_finalizers_1_1 && !_finalizers_1_1.done && (_b = _finalizers_1.return)) _b.call(_finalizers_1);
                    }
                    finally { if (e_2) throw e_2.error; }
                }
            }
            if (errors) {
                throw new UnsubscriptionError(errors);
            }
        }
    };
    Subscription.prototype.add = function (teardown) {
        var _a;
        if (teardown && teardown !== this) {
            if (this.closed) {
                execFinalizer(teardown);
            }
            else {
                if (teardown instanceof Subscription) {
                    if (teardown.closed || teardown._hasParent(this)) {
                        return;
                    }
                    teardown._addParent(this);
                }
                (this._finalizers = (_a = this._finalizers) !== null && _a !== void 0 ? _a : []).push(teardown);
            }
        }
    };
    Subscription.prototype._hasParent = function (parent) {
        var _parentage = this._parentage;
        return _parentage === parent || (Array.isArray(_parentage) && _parentage.includes(parent));
    };
    Subscription.prototype._addParent = function (parent) {
        var _parentage = this._parentage;
        this._parentage = Array.isArray(_parentage) ? (_parentage.push(parent), _parentage) : _parentage ? [_parentage, parent] : parent;
    };
    Subscription.prototype._removeParent = function (parent) {
        var _parentage = this._parentage;
        if (_parentage === parent) {
            this._parentage = null;
        }
        else if (Array.isArray(_parentage)) {
            arrRemove(_parentage, parent);
        }
    };
    Subscription.prototype.remove = function (teardown) {
        var _finalizers = this._finalizers;
        _finalizers && arrRemove(_finalizers, teardown);
        if (teardown instanceof Subscription) {
            teardown._removeParent(this);
        }
    };
    Subscription.EMPTY = (function () {
        var empty = new Subscription();
        empty.closed = true;
        return empty;
    })();
    return Subscription;
}());
Subscription.EMPTY;
function isSubscription(value) {
    return (value instanceof Subscription ||
        (value && 'closed' in value && isFunction(value.remove) && isFunction(value.add) && isFunction(value.unsubscribe)));
}
function execFinalizer(finalizer) {
    if (isFunction(finalizer)) {
        finalizer();
    }
    else {
        finalizer.unsubscribe();
    }
}

var config = {
    onUnhandledError: null,
    onStoppedNotification: null,
    Promise: undefined,
    useDeprecatedSynchronousErrorHandling: false,
    useDeprecatedNextContext: false,
};

var timeoutProvider = {
    setTimeout: function (handler, timeout) {
        var args = [];
        for (var _i = 2; _i < arguments.length; _i++) {
            args[_i - 2] = arguments[_i];
        }
        return setTimeout.apply(void 0, __spreadArray([handler, timeout], __read(args)));
    },
    clearTimeout: function (handle) {
        var delegate = timeoutProvider.delegate;
        return ((delegate === null || delegate === void 0 ? void 0 : delegate.clearTimeout) || clearTimeout)(handle);
    },
    delegate: undefined,
};

function reportUnhandledError(err) {
    timeoutProvider.setTimeout(function () {
        {
            throw err;
        }
    });
}

function noop() { }

function errorContext(cb) {
    {
        cb();
    }
}

var Subscriber = (function (_super) {
    __extends(Subscriber, _super);
    function Subscriber(destination) {
        var _this = _super.call(this) || this;
        _this.isStopped = false;
        if (destination) {
            _this.destination = destination;
            if (isSubscription(destination)) {
                destination.add(_this);
            }
        }
        else {
            _this.destination = EMPTY_OBSERVER;
        }
        return _this;
    }
    Subscriber.create = function (next, error, complete) {
        return new SafeSubscriber(next, error, complete);
    };
    Subscriber.prototype.next = function (value) {
        if (this.isStopped) ;
        else {
            this._next(value);
        }
    };
    Subscriber.prototype.error = function (err) {
        if (this.isStopped) ;
        else {
            this.isStopped = true;
            this._error(err);
        }
    };
    Subscriber.prototype.complete = function () {
        if (this.isStopped) ;
        else {
            this.isStopped = true;
            this._complete();
        }
    };
    Subscriber.prototype.unsubscribe = function () {
        if (!this.closed) {
            this.isStopped = true;
            _super.prototype.unsubscribe.call(this);
            this.destination = null;
        }
    };
    Subscriber.prototype._next = function (value) {
        this.destination.next(value);
    };
    Subscriber.prototype._error = function (err) {
        try {
            this.destination.error(err);
        }
        finally {
            this.unsubscribe();
        }
    };
    Subscriber.prototype._complete = function () {
        try {
            this.destination.complete();
        }
        finally {
            this.unsubscribe();
        }
    };
    return Subscriber;
}(Subscription));
var _bind = Function.prototype.bind;
function bind(fn, thisArg) {
    return _bind.call(fn, thisArg);
}
var ConsumerObserver = (function () {
    function ConsumerObserver(partialObserver) {
        this.partialObserver = partialObserver;
    }
    ConsumerObserver.prototype.next = function (value) {
        var partialObserver = this.partialObserver;
        if (partialObserver.next) {
            try {
                partialObserver.next(value);
            }
            catch (error) {
                handleUnhandledError(error);
            }
        }
    };
    ConsumerObserver.prototype.error = function (err) {
        var partialObserver = this.partialObserver;
        if (partialObserver.error) {
            try {
                partialObserver.error(err);
            }
            catch (error) {
                handleUnhandledError(error);
            }
        }
        else {
            handleUnhandledError(err);
        }
    };
    ConsumerObserver.prototype.complete = function () {
        var partialObserver = this.partialObserver;
        if (partialObserver.complete) {
            try {
                partialObserver.complete();
            }
            catch (error) {
                handleUnhandledError(error);
            }
        }
    };
    return ConsumerObserver;
}());
var SafeSubscriber = (function (_super) {
    __extends(SafeSubscriber, _super);
    function SafeSubscriber(observerOrNext, error, complete) {
        var _this = _super.call(this) || this;
        var partialObserver;
        if (isFunction(observerOrNext) || !observerOrNext) {
            partialObserver = {
                next: (observerOrNext !== null && observerOrNext !== void 0 ? observerOrNext : undefined),
                error: error !== null && error !== void 0 ? error : undefined,
                complete: complete !== null && complete !== void 0 ? complete : undefined,
            };
        }
        else {
            var context_1;
            if (_this && config.useDeprecatedNextContext) {
                context_1 = Object.create(observerOrNext);
                context_1.unsubscribe = function () { return _this.unsubscribe(); };
                partialObserver = {
                    next: observerOrNext.next && bind(observerOrNext.next, context_1),
                    error: observerOrNext.error && bind(observerOrNext.error, context_1),
                    complete: observerOrNext.complete && bind(observerOrNext.complete, context_1),
                };
            }
            else {
                partialObserver = observerOrNext;
            }
        }
        _this.destination = new ConsumerObserver(partialObserver);
        return _this;
    }
    return SafeSubscriber;
}(Subscriber));
function handleUnhandledError(error) {
    {
        reportUnhandledError(error);
    }
}
function defaultErrorHandler(err) {
    throw err;
}
var EMPTY_OBSERVER = {
    closed: true,
    next: noop,
    error: defaultErrorHandler,
    complete: noop,
};

var observable = (function () { return (typeof Symbol === 'function' && Symbol.observable) || '@@observable'; })();

function identity(x) {
    return x;
}

function pipeFromArray(fns) {
    if (fns.length === 0) {
        return identity;
    }
    if (fns.length === 1) {
        return fns[0];
    }
    return function piped(input) {
        return fns.reduce(function (prev, fn) { return fn(prev); }, input);
    };
}

var Observable = (function () {
    function Observable(subscribe) {
        if (subscribe) {
            this._subscribe = subscribe;
        }
    }
    Observable.prototype.lift = function (operator) {
        var observable = new Observable();
        observable.source = this;
        observable.operator = operator;
        return observable;
    };
    Observable.prototype.subscribe = function (observerOrNext, error, complete) {
        var _this = this;
        var subscriber = isSubscriber(observerOrNext) ? observerOrNext : new SafeSubscriber(observerOrNext, error, complete);
        errorContext(function () {
            var _a = _this, operator = _a.operator, source = _a.source;
            subscriber.add(operator
                ?
                    operator.call(subscriber, source)
                : source
                    ?
                        _this._subscribe(subscriber)
                    :
                        _this._trySubscribe(subscriber));
        });
        return subscriber;
    };
    Observable.prototype._trySubscribe = function (sink) {
        try {
            return this._subscribe(sink);
        }
        catch (err) {
            sink.error(err);
        }
    };
    Observable.prototype.forEach = function (next, promiseCtor) {
        var _this = this;
        promiseCtor = getPromiseCtor(promiseCtor);
        return new promiseCtor(function (resolve, reject) {
            var subscriber = new SafeSubscriber({
                next: function (value) {
                    try {
                        next(value);
                    }
                    catch (err) {
                        reject(err);
                        subscriber.unsubscribe();
                    }
                },
                error: reject,
                complete: resolve,
            });
            _this.subscribe(subscriber);
        });
    };
    Observable.prototype._subscribe = function (subscriber) {
        var _a;
        return (_a = this.source) === null || _a === void 0 ? void 0 : _a.subscribe(subscriber);
    };
    Observable.prototype[observable] = function () {
        return this;
    };
    Observable.prototype.pipe = function () {
        var operations = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            operations[_i] = arguments[_i];
        }
        return pipeFromArray(operations)(this);
    };
    Observable.prototype.toPromise = function (promiseCtor) {
        var _this = this;
        promiseCtor = getPromiseCtor(promiseCtor);
        return new promiseCtor(function (resolve, reject) {
            var value;
            _this.subscribe(function (x) { return (value = x); }, function (err) { return reject(err); }, function () { return resolve(value); });
        });
    };
    Observable.create = function (subscribe) {
        return new Observable(subscribe);
    };
    return Observable;
}());
function getPromiseCtor(promiseCtor) {
    var _a;
    return (_a = promiseCtor !== null && promiseCtor !== void 0 ? promiseCtor : config.Promise) !== null && _a !== void 0 ? _a : Promise;
}
function isObserver(value) {
    return value && isFunction(value.next) && isFunction(value.error) && isFunction(value.complete);
}
function isSubscriber(value) {
    return (value && value instanceof Subscriber) || (isObserver(value) && isSubscription(value));
}

function hasLift(source) {
    return isFunction(source === null || source === void 0 ? void 0 : source.lift);
}
function operate(init) {
    return function (source) {
        if (hasLift(source)) {
            return source.lift(function (liftedSource) {
                try {
                    return init(liftedSource, this);
                }
                catch (err) {
                    this.error(err);
                }
            });
        }
        throw new TypeError('Unable to lift unknown Observable type');
    };
}

function createOperatorSubscriber(destination, onNext, onComplete, onError, onFinalize) {
    return new OperatorSubscriber(destination, onNext, onComplete, onError, onFinalize);
}
var OperatorSubscriber = (function (_super) {
    __extends(OperatorSubscriber, _super);
    function OperatorSubscriber(destination, onNext, onComplete, onError, onFinalize, shouldUnsubscribe) {
        var _this = _super.call(this, destination) || this;
        _this.onFinalize = onFinalize;
        _this.shouldUnsubscribe = shouldUnsubscribe;
        _this._next = onNext
            ? function (value) {
                try {
                    onNext(value);
                }
                catch (err) {
                    destination.error(err);
                }
            }
            : _super.prototype._next;
        _this._error = onError
            ? function (err) {
                try {
                    onError(err);
                }
                catch (err) {
                    destination.error(err);
                }
                finally {
                    this.unsubscribe();
                }
            }
            : _super.prototype._error;
        _this._complete = onComplete
            ? function () {
                try {
                    onComplete();
                }
                catch (err) {
                    destination.error(err);
                }
                finally {
                    this.unsubscribe();
                }
            }
            : _super.prototype._complete;
        return _this;
    }
    OperatorSubscriber.prototype.unsubscribe = function () {
        var _a;
        if (!this.shouldUnsubscribe || this.shouldUnsubscribe()) {
            var closed_1 = this.closed;
            _super.prototype.unsubscribe.call(this);
            !closed_1 && ((_a = this.onFinalize) === null || _a === void 0 ? void 0 : _a.call(this));
        }
    };
    return OperatorSubscriber;
}(Subscriber));

var dateTimestampProvider = {
    now: function () {
        return (Date).now();
    },
    delegate: undefined,
};

var Action = (function (_super) {
    __extends(Action, _super);
    function Action(scheduler, work) {
        return _super.call(this) || this;
    }
    Action.prototype.schedule = function (state, delay) {
        return this;
    };
    return Action;
}(Subscription));

var intervalProvider = {
    setInterval: function (handler, timeout) {
        var args = [];
        for (var _i = 2; _i < arguments.length; _i++) {
            args[_i - 2] = arguments[_i];
        }
        return setInterval.apply(void 0, __spreadArray([handler, timeout], __read(args)));
    },
    clearInterval: function (handle) {
        var delegate = intervalProvider.delegate;
        return ((delegate === null || delegate === void 0 ? void 0 : delegate.clearInterval) || clearInterval)(handle);
    },
    delegate: undefined,
};

var AsyncAction = (function (_super) {
    __extends(AsyncAction, _super);
    function AsyncAction(scheduler, work) {
        var _this = _super.call(this, scheduler, work) || this;
        _this.scheduler = scheduler;
        _this.work = work;
        _this.pending = false;
        return _this;
    }
    AsyncAction.prototype.schedule = function (state, delay) {
        var _a;
        if (delay === void 0) { delay = 0; }
        if (this.closed) {
            return this;
        }
        this.state = state;
        var id = this.id;
        var scheduler = this.scheduler;
        if (id != null) {
            this.id = this.recycleAsyncId(scheduler, id, delay);
        }
        this.pending = true;
        this.delay = delay;
        this.id = (_a = this.id) !== null && _a !== void 0 ? _a : this.requestAsyncId(scheduler, this.id, delay);
        return this;
    };
    AsyncAction.prototype.requestAsyncId = function (scheduler, _id, delay) {
        if (delay === void 0) { delay = 0; }
        return intervalProvider.setInterval(scheduler.flush.bind(scheduler, this), delay);
    };
    AsyncAction.prototype.recycleAsyncId = function (_scheduler, id, delay) {
        if (delay === void 0) { delay = 0; }
        if (delay != null && this.delay === delay && this.pending === false) {
            return id;
        }
        if (id != null) {
            intervalProvider.clearInterval(id);
        }
        return undefined;
    };
    AsyncAction.prototype.execute = function (state, delay) {
        if (this.closed) {
            return new Error('executing a cancelled action');
        }
        this.pending = false;
        var error = this._execute(state, delay);
        if (error) {
            return error;
        }
        else if (this.pending === false && this.id != null) {
            this.id = this.recycleAsyncId(this.scheduler, this.id, null);
        }
    };
    AsyncAction.prototype._execute = function (state, _delay) {
        var errored = false;
        var errorValue;
        try {
            this.work(state);
        }
        catch (e) {
            errored = true;
            errorValue = e ? e : new Error('Scheduled action threw falsy error');
        }
        if (errored) {
            this.unsubscribe();
            return errorValue;
        }
    };
    AsyncAction.prototype.unsubscribe = function () {
        if (!this.closed) {
            var _a = this, id = _a.id, scheduler = _a.scheduler;
            var actions = scheduler.actions;
            this.work = this.state = this.scheduler = null;
            this.pending = false;
            arrRemove(actions, this);
            if (id != null) {
                this.id = this.recycleAsyncId(scheduler, id, null);
            }
            this.delay = null;
            _super.prototype.unsubscribe.call(this);
        }
    };
    return AsyncAction;
}(Action));

var Scheduler = (function () {
    function Scheduler(schedulerActionCtor, now) {
        if (now === void 0) { now = Scheduler.now; }
        this.schedulerActionCtor = schedulerActionCtor;
        this.now = now;
    }
    Scheduler.prototype.schedule = function (work, delay, state) {
        if (delay === void 0) { delay = 0; }
        return new this.schedulerActionCtor(this, work).schedule(state, delay);
    };
    Scheduler.now = dateTimestampProvider.now;
    return Scheduler;
}());

var AsyncScheduler = (function (_super) {
    __extends(AsyncScheduler, _super);
    function AsyncScheduler(SchedulerAction, now) {
        if (now === void 0) { now = Scheduler.now; }
        var _this = _super.call(this, SchedulerAction, now) || this;
        _this.actions = [];
        _this._active = false;
        return _this;
    }
    AsyncScheduler.prototype.flush = function (action) {
        var actions = this.actions;
        if (this._active) {
            actions.push(action);
            return;
        }
        var error;
        this._active = true;
        do {
            if ((error = action.execute(action.state, action.delay))) {
                break;
            }
        } while ((action = actions.shift()));
        this._active = false;
        if (error) {
            while ((action = actions.shift())) {
                action.unsubscribe();
            }
            throw error;
        }
    };
    return AsyncScheduler;
}(Scheduler));

var asyncScheduler = new AsyncScheduler(AsyncAction);
var async = asyncScheduler;

var EMPTY = new Observable(function (subscriber) { return subscriber.complete(); });

function isScheduler(value) {
    return value && isFunction(value.schedule);
}

function last(arr) {
    return arr[arr.length - 1];
}
function popResultSelector(args) {
    return isFunction(last(args)) ? args.pop() : undefined;
}
function popScheduler(args) {
    return isScheduler(last(args)) ? args.pop() : undefined;
}

var isArrayLike = (function (x) { return x && typeof x.length === 'number' && typeof x !== 'function'; });

function isPromise(value) {
    return isFunction(value === null || value === void 0 ? void 0 : value.then);
}

function isInteropObservable(input) {
    return isFunction(input[observable]);
}

function isAsyncIterable(obj) {
    return Symbol.asyncIterator && isFunction(obj === null || obj === void 0 ? void 0 : obj[Symbol.asyncIterator]);
}

function createInvalidObservableTypeError(input) {
    return new TypeError("You provided " + (input !== null && typeof input === 'object' ? 'an invalid object' : "'" + input + "'") + " where a stream was expected. You can provide an Observable, Promise, ReadableStream, Array, AsyncIterable, or Iterable.");
}

function getSymbolIterator() {
    if (typeof Symbol !== 'function' || !Symbol.iterator) {
        return '@@iterator';
    }
    return Symbol.iterator;
}
var iterator = getSymbolIterator();

function isIterable(input) {
    return isFunction(input === null || input === void 0 ? void 0 : input[iterator]);
}

function readableStreamLikeToAsyncGenerator(readableStream) {
    return __asyncGenerator(this, arguments, function readableStreamLikeToAsyncGenerator_1() {
        var reader, _a, value, done;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    reader = readableStream.getReader();
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, , 9, 10]);
                    _b.label = 2;
                case 2:
                    return [4, __await(reader.read())];
                case 3:
                    _a = _b.sent(), value = _a.value, done = _a.done;
                    if (!done) return [3, 5];
                    return [4, __await(void 0)];
                case 4: return [2, _b.sent()];
                case 5: return [4, __await(value)];
                case 6: return [4, _b.sent()];
                case 7:
                    _b.sent();
                    return [3, 2];
                case 8: return [3, 10];
                case 9:
                    reader.releaseLock();
                    return [7];
                case 10: return [2];
            }
        });
    });
}
function isReadableStreamLike(obj) {
    return isFunction(obj === null || obj === void 0 ? void 0 : obj.getReader);
}

function innerFrom(input) {
    if (input instanceof Observable) {
        return input;
    }
    if (input != null) {
        if (isInteropObservable(input)) {
            return fromInteropObservable(input);
        }
        if (isArrayLike(input)) {
            return fromArrayLike(input);
        }
        if (isPromise(input)) {
            return fromPromise(input);
        }
        if (isAsyncIterable(input)) {
            return fromAsyncIterable(input);
        }
        if (isIterable(input)) {
            return fromIterable(input);
        }
        if (isReadableStreamLike(input)) {
            return fromReadableStreamLike(input);
        }
    }
    throw createInvalidObservableTypeError(input);
}
function fromInteropObservable(obj) {
    return new Observable(function (subscriber) {
        var obs = obj[observable]();
        if (isFunction(obs.subscribe)) {
            return obs.subscribe(subscriber);
        }
        throw new TypeError('Provided object does not correctly implement Symbol.observable');
    });
}
function fromArrayLike(array) {
    return new Observable(function (subscriber) {
        for (var i = 0; i < array.length && !subscriber.closed; i++) {
            subscriber.next(array[i]);
        }
        subscriber.complete();
    });
}
function fromPromise(promise) {
    return new Observable(function (subscriber) {
        promise
            .then(function (value) {
            if (!subscriber.closed) {
                subscriber.next(value);
                subscriber.complete();
            }
        }, function (err) { return subscriber.error(err); })
            .then(null, reportUnhandledError);
    });
}
function fromIterable(iterable) {
    return new Observable(function (subscriber) {
        var e_1, _a;
        try {
            for (var iterable_1 = __values(iterable), iterable_1_1 = iterable_1.next(); !iterable_1_1.done; iterable_1_1 = iterable_1.next()) {
                var value = iterable_1_1.value;
                subscriber.next(value);
                if (subscriber.closed) {
                    return;
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (iterable_1_1 && !iterable_1_1.done && (_a = iterable_1.return)) _a.call(iterable_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        subscriber.complete();
    });
}
function fromAsyncIterable(asyncIterable) {
    return new Observable(function (subscriber) {
        process(asyncIterable, subscriber).catch(function (err) { return subscriber.error(err); });
    });
}
function fromReadableStreamLike(readableStream) {
    return fromAsyncIterable(readableStreamLikeToAsyncGenerator(readableStream));
}
function process(asyncIterable, subscriber) {
    var asyncIterable_1, asyncIterable_1_1;
    var e_2, _a;
    return __awaiter(this, void 0, void 0, function () {
        var value, e_2_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 5, 6, 11]);
                    asyncIterable_1 = __asyncValues(asyncIterable);
                    _b.label = 1;
                case 1: return [4, asyncIterable_1.next()];
                case 2:
                    if (!(asyncIterable_1_1 = _b.sent(), !asyncIterable_1_1.done)) return [3, 4];
                    value = asyncIterable_1_1.value;
                    subscriber.next(value);
                    if (subscriber.closed) {
                        return [2];
                    }
                    _b.label = 3;
                case 3: return [3, 1];
                case 4: return [3, 11];
                case 5:
                    e_2_1 = _b.sent();
                    e_2 = { error: e_2_1 };
                    return [3, 11];
                case 6:
                    _b.trys.push([6, , 9, 10]);
                    if (!(asyncIterable_1_1 && !asyncIterable_1_1.done && (_a = asyncIterable_1.return))) return [3, 8];
                    return [4, _a.call(asyncIterable_1)];
                case 7:
                    _b.sent();
                    _b.label = 8;
                case 8: return [3, 10];
                case 9:
                    if (e_2) throw e_2.error;
                    return [7];
                case 10: return [7];
                case 11:
                    subscriber.complete();
                    return [2];
            }
        });
    });
}

function executeSchedule(parentSubscription, scheduler, work, delay, repeat) {
    if (delay === void 0) { delay = 0; }
    if (repeat === void 0) { repeat = false; }
    var scheduleSubscription = scheduler.schedule(function () {
        work();
        if (repeat) {
            parentSubscription.add(this.schedule(null, delay));
        }
        else {
            this.unsubscribe();
        }
    }, delay);
    parentSubscription.add(scheduleSubscription);
    if (!repeat) {
        return scheduleSubscription;
    }
}

function observeOn(scheduler, delay) {
    if (delay === void 0) { delay = 0; }
    return operate(function (source, subscriber) {
        source.subscribe(createOperatorSubscriber(subscriber, function (value) { return executeSchedule(subscriber, scheduler, function () { return subscriber.next(value); }, delay); }, function () { return executeSchedule(subscriber, scheduler, function () { return subscriber.complete(); }, delay); }, function (err) { return executeSchedule(subscriber, scheduler, function () { return subscriber.error(err); }, delay); }));
    });
}

function subscribeOn(scheduler, delay) {
    if (delay === void 0) { delay = 0; }
    return operate(function (source, subscriber) {
        subscriber.add(scheduler.schedule(function () { return source.subscribe(subscriber); }, delay));
    });
}

function scheduleObservable(input, scheduler) {
    return innerFrom(input).pipe(subscribeOn(scheduler), observeOn(scheduler));
}

function schedulePromise(input, scheduler) {
    return innerFrom(input).pipe(subscribeOn(scheduler), observeOn(scheduler));
}

function scheduleArray(input, scheduler) {
    return new Observable(function (subscriber) {
        var i = 0;
        return scheduler.schedule(function () {
            if (i === input.length) {
                subscriber.complete();
            }
            else {
                subscriber.next(input[i++]);
                if (!subscriber.closed) {
                    this.schedule();
                }
            }
        });
    });
}

function scheduleIterable(input, scheduler) {
    return new Observable(function (subscriber) {
        var iterator$1;
        executeSchedule(subscriber, scheduler, function () {
            iterator$1 = input[iterator]();
            executeSchedule(subscriber, scheduler, function () {
                var _a;
                var value;
                var done;
                try {
                    (_a = iterator$1.next(), value = _a.value, done = _a.done);
                }
                catch (err) {
                    subscriber.error(err);
                    return;
                }
                if (done) {
                    subscriber.complete();
                }
                else {
                    subscriber.next(value);
                }
            }, 0, true);
        });
        return function () { return isFunction(iterator$1 === null || iterator$1 === void 0 ? void 0 : iterator$1.return) && iterator$1.return(); };
    });
}

function scheduleAsyncIterable(input, scheduler) {
    if (!input) {
        throw new Error('Iterable cannot be null');
    }
    return new Observable(function (subscriber) {
        executeSchedule(subscriber, scheduler, function () {
            var iterator = input[Symbol.asyncIterator]();
            executeSchedule(subscriber, scheduler, function () {
                iterator.next().then(function (result) {
                    if (result.done) {
                        subscriber.complete();
                    }
                    else {
                        subscriber.next(result.value);
                    }
                });
            }, 0, true);
        });
    });
}

function scheduleReadableStreamLike(input, scheduler) {
    return scheduleAsyncIterable(readableStreamLikeToAsyncGenerator(input), scheduler);
}

function scheduled(input, scheduler) {
    if (input != null) {
        if (isInteropObservable(input)) {
            return scheduleObservable(input, scheduler);
        }
        if (isArrayLike(input)) {
            return scheduleArray(input, scheduler);
        }
        if (isPromise(input)) {
            return schedulePromise(input, scheduler);
        }
        if (isAsyncIterable(input)) {
            return scheduleAsyncIterable(input, scheduler);
        }
        if (isIterable(input)) {
            return scheduleIterable(input, scheduler);
        }
        if (isReadableStreamLike(input)) {
            return scheduleReadableStreamLike(input, scheduler);
        }
    }
    throw createInvalidObservableTypeError(input);
}

function from(input, scheduler) {
    return scheduler ? scheduled(input, scheduler) : innerFrom(input);
}

function of() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    var scheduler = popScheduler(args);
    return from(args, scheduler);
}

var EmptyError = createErrorClass(function (_super) { return function EmptyErrorImpl() {
    _super(this);
    this.name = 'EmptyError';
    this.message = 'no elements in sequence';
}; });

function lastValueFrom(source, config) {
    return new Promise(function (resolve, reject) {
        var _hasValue = false;
        var _value;
        source.subscribe({
            next: function (value) {
                _value = value;
                _hasValue = true;
            },
            error: reject,
            complete: function () {
                if (_hasValue) {
                    resolve(_value);
                }
                else {
                    reject(new EmptyError());
                }
            },
        });
    });
}

function firstValueFrom(source, config) {
    return new Promise(function (resolve, reject) {
        var subscriber = new SafeSubscriber({
            next: function (value) {
                resolve(value);
                subscriber.unsubscribe();
            },
            error: reject,
            complete: function () {
                {
                    reject(new EmptyError());
                }
            },
        });
        source.subscribe(subscriber);
    });
}

function isValidDate(value) {
    return value instanceof Date && !isNaN(value);
}

function map(project, thisArg) {
    return operate(function (source, subscriber) {
        var index = 0;
        source.subscribe(createOperatorSubscriber(subscriber, function (value) {
            subscriber.next(project.call(thisArg, value, index++));
        }));
    });
}

function mergeInternals(source, subscriber, project, concurrent, onBeforeNext, expand, innerSubScheduler, additionalFinalizer) {
    var buffer = [];
    var active = 0;
    var index = 0;
    var isComplete = false;
    var checkComplete = function () {
        if (isComplete && !buffer.length && !active) {
            subscriber.complete();
        }
    };
    var outerNext = function (value) { return (active < concurrent ? doInnerSub(value) : buffer.push(value)); };
    var doInnerSub = function (value) {
        active++;
        var innerComplete = false;
        innerFrom(project(value, index++)).subscribe(createOperatorSubscriber(subscriber, function (innerValue) {
            {
                subscriber.next(innerValue);
            }
        }, function () {
            innerComplete = true;
        }, undefined, function () {
            if (innerComplete) {
                try {
                    active--;
                    var _loop_1 = function () {
                        var bufferedValue = buffer.shift();
                        if (innerSubScheduler) ;
                        else {
                            doInnerSub(bufferedValue);
                        }
                    };
                    while (buffer.length && active < concurrent) {
                        _loop_1();
                    }
                    checkComplete();
                }
                catch (err) {
                    subscriber.error(err);
                }
            }
        }));
    };
    source.subscribe(createOperatorSubscriber(subscriber, outerNext, function () {
        isComplete = true;
        checkComplete();
    }));
    return function () {
    };
}

function mergeMap(project, resultSelector, concurrent) {
    if (concurrent === void 0) { concurrent = Infinity; }
    if (isFunction(resultSelector)) {
        return mergeMap(function (a, i) { return map(function (b, ii) { return resultSelector(a, b, i, ii); })(innerFrom(project(a, i))); }, concurrent);
    }
    else if (typeof resultSelector === 'number') {
        concurrent = resultSelector;
    }
    return operate(function (source, subscriber) { return mergeInternals(source, subscriber, project, concurrent); });
}

function timer(dueTime, intervalOrScheduler, scheduler) {
    if (dueTime === void 0) { dueTime = 0; }
    if (scheduler === void 0) { scheduler = async; }
    return new Observable(function (subscriber) {
        var due = isValidDate(dueTime) ? +dueTime - scheduler.now() : dueTime;
        if (due < 0) {
            due = 0;
        }
        var n = 0;
        return scheduler.schedule(function () {
            if (!subscriber.closed) {
                subscriber.next(n++);
                {
                    subscriber.complete();
                }
            }
        }, due);
    });
}

var isArray = Array.isArray;
function argsOrArgArray(args) {
    return args.length === 1 && isArray(args[0]) ? args[0] : args;
}

function filter(predicate, thisArg) {
    return operate(function (source, subscriber) {
        var index = 0;
        source.subscribe(createOperatorSubscriber(subscriber, function (value) { return predicate.call(thisArg, value, index++) && subscriber.next(value); }));
    });
}

function zip() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    var resultSelector = popResultSelector(args);
    var sources = argsOrArgArray(args);
    return sources.length
        ? new Observable(function (subscriber) {
            var buffers = sources.map(function () { return []; });
            var completed = sources.map(function () { return false; });
            subscriber.add(function () {
                buffers = completed = null;
            });
            var _loop_1 = function (sourceIndex) {
                innerFrom(sources[sourceIndex]).subscribe(createOperatorSubscriber(subscriber, function (value) {
                    buffers[sourceIndex].push(value);
                    if (buffers.every(function (buffer) { return buffer.length; })) {
                        var result = buffers.map(function (buffer) { return buffer.shift(); });
                        subscriber.next(resultSelector ? resultSelector.apply(void 0, __spreadArray([], __read(result))) : result);
                        if (buffers.some(function (buffer, i) { return !buffer.length && completed[i]; })) {
                            subscriber.complete();
                        }
                    }
                }, function () {
                    completed[sourceIndex] = true;
                    !buffers[sourceIndex].length && subscriber.complete();
                }));
            };
            for (var sourceIndex = 0; !subscriber.closed && sourceIndex < sources.length; sourceIndex++) {
                _loop_1(sourceIndex);
            }
            return function () {
                buffers = completed = null;
            };
        })
        : EMPTY;
}

function scanInternals(accumulator, seed, hasSeed, emitOnNext, emitBeforeComplete) {
    return function (source, subscriber) {
        var hasState = hasSeed;
        var state = seed;
        var index = 0;
        source.subscribe(createOperatorSubscriber(subscriber, function (value) {
            var i = index++;
            state = hasState
                ?
                    accumulator(state, value, i)
                :
                    ((hasState = true), value);
        }, (function () {
                hasState && subscriber.next(state);
                subscriber.complete();
            })));
    };
}

function reduce(accumulator, seed) {
    return operate(scanInternals(accumulator, seed, arguments.length >= 2, false, true));
}

var arrReducer = function (arr, value) { return (arr.push(value), arr); };
function toArray() {
    return operate(function (source, subscriber) {
        reduce(arrReducer, [])(source).subscribe(subscriber);
    });
}

function count(predicate) {
    return reduce(function (total, value, i) { return (!predicate || predicate(value, i) ? total + 1 : total); }, 0);
}

function distinct(keySelector, flushes) {
    return operate(function (source, subscriber) {
        var distinctKeys = new Set();
        source.subscribe(createOperatorSubscriber(subscriber, function (value) {
            var key = keySelector ? keySelector(value) : value;
            if (!distinctKeys.has(key)) {
                distinctKeys.add(key);
                subscriber.next(value);
            }
        }));
        flushes && innerFrom(flushes).subscribe(createOperatorSubscriber(subscriber, function () { return distinctKeys.clear(); }, noop));
    });
}

function repeat(countOrConfig) {
    var count = Infinity;
    var delay;
    return count <= 0
        ? function () { return EMPTY; }
        : operate(function (source, subscriber) {
            var soFar = 0;
            var sourceSub;
            var resubscribe = function () {
                sourceSub === null || sourceSub === void 0 ? void 0 : sourceSub.unsubscribe();
                sourceSub = null;
                var notifier, notifierSubscriber_1; if (delay != null) ;
                else {
                    subscribeToSource();
                }
            };
            var subscribeToSource = function () {
                var syncUnsub = false;
                sourceSub = source.subscribe(createOperatorSubscriber(subscriber, undefined, function () {
                    if (++soFar < count) {
                        if (sourceSub) {
                            resubscribe();
                        }
                        else {
                            syncUnsub = true;
                        }
                    }
                    else {
                        subscriber.complete();
                    }
                }));
                if (syncUnsub) {
                    resubscribe();
                }
            };
            subscribeToSource();
        });
}

function tap(observerOrNext, error, complete) {
    var tapObserver = isFunction(observerOrNext) || error || complete
        ?
            { next: observerOrNext, error: error, complete: complete }
        : observerOrNext;
    return tapObserver
        ? operate(function (source, subscriber) {
            var _a;
            (_a = tapObserver.subscribe) === null || _a === void 0 ? void 0 : _a.call(tapObserver);
            var isUnsub = true;
            source.subscribe(createOperatorSubscriber(subscriber, function (value) {
                var _a;
                (_a = tapObserver.next) === null || _a === void 0 ? void 0 : _a.call(tapObserver, value);
                subscriber.next(value);
            }, function () {
                var _a;
                isUnsub = false;
                (_a = tapObserver.complete) === null || _a === void 0 ? void 0 : _a.call(tapObserver);
                subscriber.complete();
            }, function (err) {
                var _a;
                isUnsub = false;
                (_a = tapObserver.error) === null || _a === void 0 ? void 0 : _a.call(tapObserver, err);
                subscriber.error(err);
            }, function () {
                var _a, _b;
                if (isUnsub) {
                    (_a = tapObserver.unsubscribe) === null || _a === void 0 ? void 0 : _a.call(tapObserver);
                }
                (_b = tapObserver.finalize) === null || _b === void 0 ? void 0 : _b.call(tapObserver);
            }));
        })
        :
            identity;
}

// adapted from https://github.com/metabrainz/musicbrainz-server/blob/107f2ae094a10b0d0ca5e0e488e4877edfd0b2be/root/static/scripts/common/constants.js

/*
 * @flow strict
 * Copyright (C) 2015 MetaBrainz Foundation
 *
 * This file is part of MusicBrainz, the open internet music database,
 * and is licensed under the GPL version 2, or (at your option) any
 * later version: http://www.gnu.org/licenses/gpl-2.0.txt
 */

const RECORDING_OF_LINK_TYPE_ID = 278;
const COMPOSER_LINK_TYPE_ID = 168;
const LYRICIST_LINK_TYPE_ID = 165;
const ARRANGER_LINK_TYPE_ID = 297;
const TRANSLATOR_LINK_TYPE_ID = 872;
const REL_STATUS_ADD = 1;
const REL_STATUS_REMOVE = 3;
const ACUM_TYPE_ID = window.location.host.startsWith('test.') ? 141 : 206;
const LANGUAGE_MUL_ID = 284;
const LANGUAGE_ZXX_ID = 486;
const EDIT_WORK_CREATE = 41;
const WS_EDIT_RESPONSE_OK = 1;

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

// adapted from https://github.com/metabrainz/musicbrainz-server/blob/5a64d781cb84039afd4894688f12164f21dc92f0/root/static/scripts/release/components/MediumRelationshipEditor.js

/*
 * @flow strict-local
 * Copyright (C) 2020 MetaBrainz Foundation
 *
 * This file is part of MusicBrainz, the open internet music database,
 * and is licensed under the GPL version 2, or (at your option) any
 * later version: http://www.gnu.org/licenses/gpl-2.0.txt
 */

function compareRecordingWithRecordingState(recording, recordingState) {
  return recording.id - recordingState.recording.id;
}
function trackRecordingState(track, recordingStates) {
  return MB.tree.find(recordingStates, track.recording, compareRecordingWithRecordingState, null);
}

function getDefaultExportFromCjs (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

var fetchRetry = function (fetch, defaults) {
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

var fetchBuilder = /*@__PURE__*/getDefaultExportFromCjs(fetchRetry);

const fetchRetryBuilder = fetchBuilder(unsafeWindow.fetch);
function tryFetch(fetcher) {
  return async (url, options) => {
    try {
      return await fetcher(url, options);
    } catch (e) {
      console.error(`Failed to fetch ${url}: ${e}`);
      return null;
    }
  };
}
const tryFetchText = tryFetch(fetchText);
const tryFetchJSON = (url, options) => tryFetch(fetchJSON)(url, options);
async function fetchJSON(url, options) {
  const response = await fetchResponse(url, Object.assign(Object.assign({
    headers: {
      Accept: 'application/json'
    }
  }, options == null ? void 0 : options.headers), options));
  return await response.json();
}
async function fetchText(url, options) {
  const response = await fetchResponse(url, options);
  return await response.text();
}
async function fetchResponse(url, options) {
  const response = await fetchRetryBuilder(url, Object.assign({
    retryOn: [503],
    retryDelay: attempt => Math.pow(2, attempt) * 1000,
    headers: Object.assign({
      Accept: 'application/json'
    }, options == null ? void 0 : options.headers)
  }, options));
  if (!response.ok) {
    throw new Error(`HTTP error: ${response.status}`);
  }
  return response;
}

async function getWorkVersions(workId) {
  const result = await tryFetchJSON(`https://nocs.acum.org.il/acumsitesearchdb/getworkinfo?workId=${workId}`);
  if (result) {
    if (result.errorCode == 0) {
      return result.data.workVersions;
    }
    console.error('failed to fetch work %s: %s', workId, result.errorDescription);
  }
}
function albumUrl(albumId) {
  return `https://nocs.acum.org.il/acumsitesearchdb/album?albumId=${albumId}`;
}
function albumApiUrl(albumId) {
  return `https://nocs.acum.org.il/acumsitesearchdb/getalbuminfo?albumId=${albumId}`;
}
async function getAlbumInfo(albumId) {
  const result = await tryFetchJSON(albumApiUrl(albumId));
  if (result) {
    if (result.errorCode == 0) {
      return result.data.albumBean;
    }
    console.error('failed to fetch album %s: %s', albumId, result.errorDescription);
  }
}
async function workISWCs(workID) {
  var _await$getWorkVersion;
  const formatISWC = iswc => iswc.replace(/T(\d{3})(\d{3})(\d{3})(\d)/, 'T-$1.$2.$3-$4');
  return (_await$getWorkVersion = await getWorkVersions(workID)) == null ? void 0 : _await$getWorkVersion.map(albumVersion => albumVersion.versionIswcNumber).filter(iswc => iswc.length > 0).map(formatISWC);
}
function searchName(name) {
  return /[א-ת]/.test(name) ? 'workHebName' : 'workEngName';
}
let EssenceType = /*#__PURE__*/function (EssenceType) {
  EssenceType["NoLyrics"] = "15";
  EssenceType["Song"] = "30";
  EssenceType["Unknown"] = "-1";
  return EssenceType;
}({});
function stringToEnum(value, enumType) {
  if (Object.values(enumType).includes(value)) {
    return value;
  }
  return enumType.Unknown;
}
function essenceType(track) {
  return stringToEnum(track.versionEssenceType, EssenceType);
}
let WorkLanguage = /*#__PURE__*/function (WorkLanguage) {
  WorkLanguage["Hebrew"] = "1";
  WorkLanguage["Unknown"] = "-1";
  return WorkLanguage;
}({});
function workLanguage(track) {
  return stringToEnum(track.workLanguage, WorkLanguage);
}

const albumCache = new Map();
async function albumInfo(albumId) {
  if (!albumCache.has(albumId)) {
    const albumInfo = await getAlbumInfo(albumId);
    if (albumInfo) {
      albumCache.set(albumId, albumInfo);
    } else {
      alert(`failed to find album ID ${albumId}`);
      throw new Error(`failed to find album ID ${albumId}`);
    }
  }
  return albumCache.get(albumId);
}

function nameMatch(creator, artist) {
  const removePunctuation = name => name.replace(/[!-#%-\*,-\/:;\?@\[-\]_\{\}\xA1\xA7\xAB\xB6\xB7\xBB\xBF\u037E\u0387\u055A-\u055F\u0589\u058A\u05BE\u05C0\u05C3\u05C6\u05F3\u05F4\u0609\u060A\u060C\u060D\u061B\u061D-\u061F\u066A-\u066D\u06D4\u0700-\u070D\u07F7-\u07F9\u0830-\u083E\u085E\u0964\u0965\u0970\u09FD\u0A76\u0AF0\u0C77\u0C84\u0DF4\u0E4F\u0E5A\u0E5B\u0F04-\u0F12\u0F14\u0F3A-\u0F3D\u0F85\u0FD0-\u0FD4\u0FD9\u0FDA\u104A-\u104F\u10FB\u1360-\u1368\u1400\u166E\u169B\u169C\u16EB-\u16ED\u1735\u1736\u17D4-\u17D6\u17D8-\u17DA\u1800-\u180A\u1944\u1945\u1A1E\u1A1F\u1AA0-\u1AA6\u1AA8-\u1AAD\u1B5A-\u1B60\u1B7D\u1B7E\u1BFC-\u1BFF\u1C3B-\u1C3F\u1C7E\u1C7F\u1CC0-\u1CC7\u1CD3\u2010-\u2027\u2030-\u2043\u2045-\u2051\u2053-\u205E\u207D\u207E\u208D\u208E\u2308-\u230B\u2329\u232A\u2768-\u2775\u27C5\u27C6\u27E6-\u27EF\u2983-\u2998\u29D8-\u29DB\u29FC\u29FD\u2CF9-\u2CFC\u2CFE\u2CFF\u2D70\u2E00-\u2E2E\u2E30-\u2E4F\u2E52-\u2E5D\u3001-\u3003\u3008-\u3011\u3014-\u301F\u3030\u303D\u30A0\u30FB\uA4FE\uA4FF\uA60D-\uA60F\uA673\uA67E\uA6F2-\uA6F7\uA874-\uA877\uA8CE\uA8CF\uA8F8-\uA8FA\uA8FC\uA92E\uA92F\uA95F\uA9C1-\uA9CD\uA9DE\uA9DF\uAA5C-\uAA5F\uAADE\uAADF\uAAF0\uAAF1\uABEB\uFD3E\uFD3F\uFE10-\uFE19\uFE30-\uFE52\uFE54-\uFE61\uFE63\uFE68\uFE6A\uFE6B\uFF01-\uFF03\uFF05-\uFF0A\uFF0C-\uFF0F\uFF1A\uFF1B\uFF1F\uFF20\uFF3B-\uFF3D\uFF3F\uFF5B\uFF5D\uFF5F-\uFF65\u{10100}-\u{10102}\u{1039F}\u{103D0}\u{1056F}\u{10857}\u{1091F}\u{1093F}\u{10A50}-\u{10A58}\u{10A7F}\u{10AF0}-\u{10AF6}\u{10B39}-\u{10B3F}\u{10B99}-\u{10B9C}\u{10EAD}\u{10F55}-\u{10F59}\u{10F86}-\u{10F89}\u{11047}-\u{1104D}\u{110BB}\u{110BC}\u{110BE}-\u{110C1}\u{11140}-\u{11143}\u{11174}\u{11175}\u{111C5}-\u{111C8}\u{111CD}\u{111DB}\u{111DD}-\u{111DF}\u{11238}-\u{1123D}\u{112A9}\u{1144B}-\u{1144F}\u{1145A}\u{1145B}\u{1145D}\u{114C6}\u{115C1}-\u{115D7}\u{11641}-\u{11643}\u{11660}-\u{1166C}\u{116B9}\u{1173C}-\u{1173E}\u{1183B}\u{11944}-\u{11946}\u{119E2}\u{11A3F}-\u{11A46}\u{11A9A}-\u{11A9C}\u{11A9E}-\u{11AA2}\u{11B00}-\u{11B09}\u{11C41}-\u{11C45}\u{11C70}\u{11C71}\u{11EF7}\u{11EF8}\u{11F43}-\u{11F4F}\u{11FFF}\u{12470}-\u{12474}\u{12FF1}\u{12FF2}\u{16A6E}\u{16A6F}\u{16AF5}\u{16B37}-\u{16B3B}\u{16B44}\u{16E97}-\u{16E9A}\u{16FE2}\u{1BC9F}\u{1DA87}-\u{1DA8B}\u{1E95E}\u{1E95F}]/gu, '');
  return [removePunctuation(creator.creatorHebName), removePunctuation(creator.creatorEngName)].includes(removePunctuation(artist.name));
}
async function findArtist(ipBaseNumber, creators, addWarning) {
  const artistMBID = await (async () => {
    const creator = creators.find(creator => creator.creatorIpBaseNumber === ipBaseNumber);
    const byIpi = await tryFetchJSON(`/ws/2/artist?query=ipi:${creator.number}&limit=1&fmt=json`);
    if (byIpi && byIpi.artists.length > 0) {
      return byIpi.artists[0].id;
    }
    const byName = await tryFetchJSON(`/ws/2/artist?query=name:(${creator.creatorHebName} OR ${creator.creatorEngName})&limit=1&fmt=json`);
    if (byName && byName.artists.length > 0 && nameMatch(creator, byName.artists[0])) {
      addWarning(`artist ${byName.artists[0].name} found by name search, please verify (IPI = ${creator.number})`);
      return byName.artists[0].id;
    }
    addWarning(`failed to find ${creator.creatorHebName || creator.creatorEngName}, IPI ${creator.number}`);
    return null;
  })();
  return artistMBID ? await tryFetchJSON(`/ws/js/entity/${artistMBID}`) : null;
}

function mergeArrays(array1, array2) {
  return [...new Set([...array1, ...array2])];
}

// adapted from https://github.dev/loujine/musicbrainz-scripts/blob/master/mbz-loujine-common.js

function urlFromMbid(entityType, mbid) {
  return `/${entityType}/${encodeURIComponent(mbid)}/edit`;
}

/* in order to determine the edit parameters required by POST
 * we first load the /edit page and parse the JSON data
 * in the sourceData (before 2023) or source_entity block
 */
async function fetchEditParams(url) {
  const editPage = await tryFetchText(url);
  const result = editPage == null ? void 0 : editPage.match(/source_entity":(.*)},"user":/);
  if (result) {
    return JSON.parse(result[1]);
  }
  throw Error(`failed to find source_entity in ${url}`);
}

function getWorkEditParams(work) {
  return {
    name: work.name,
    comment: work.comment,
    type_id: work.typeID,
    languages: work.languages.map(it => it.language.id),
    iswcs: work.iswcs.map(it => it.iswc),
    attributes: work.attributes.map(attr => ({
      type_id: attr.typeID,
      value: attr.value
    }))
  };
}
async function fetchWorkEditParams(mbid) {
  const url = urlFromMbid('work', mbid);
  const work = await fetchEditParams(url);
  return getWorkEditParams(work);
}
function workEditDataEqual(lhs, rhs) {
  return lhs.name === rhs.name && lhs.comment === rhs.comment && lhs.type_id === rhs.type_id && lhs.languages.length === rhs.languages.length && lhs.iswcs.length === rhs.iswcs.length && lhs.attributes.length === rhs.attributes.length && lhs.languages.every((lang, idx) => lang === rhs.languages[idx]) && lhs.iswcs.every((iswc, idx) => iswc === rhs.iswcs[idx]) && lhs.attributes.every((attr, idx) => attr.type_id === rhs.attributes[idx].type_id && attr.value === rhs.attributes[idx].value);
}
async function udpateEditData(workState, track, addWarning) {
  var _Object$values$find$i, _Object$values$find, _await$workISWCs;
  workState.originalEditData = workState.work.gid ? await fetchWorkEditParams(workState.work.gid) : getWorkEditParams(workState.work);
  workState.editData = {
    name: track.workHebName,
    comment: workState.originalEditData.comment,
    type_id: essenceType(track) == EssenceType.Song ? (_Object$values$find$i = (_Object$values$find = Object.values(MB.linkedEntities.work_type).find(workType => workType.name === 'Song')) == null ? void 0 : _Object$values$find.id) != null ? _Object$values$find$i : null : workState.originalEditData.type_id,
    languages: mergeArrays(workState.originalEditData.languages, (() => {
      switch (essenceType(track)) {
        case EssenceType.NoLyrics:
          return [LANGUAGE_ZXX_ID];
        case EssenceType.Song:
          return (() => {
            switch (workLanguage(track)) {
              case WorkLanguage.Hebrew:
                return Object.values(MB.linkedEntities.language).filter(language => language.name === 'Hebrew').map(language => language.id);
              default:
                addWarning(`Unknown language ${track.workLanguage}`);
                return [];
            }
          })();
        default:
          addWarning(`Unknown work type ${track.versionEssenceType}`);
          return workState.originalEditData.languages;
      }
    })()),
    iswcs: mergeArrays(workState.originalEditData.iswcs, (_await$workISWCs = await workISWCs(track.workId)) != null ? _await$workISWCs : []),
    attributes: workState.originalEditData.attributes.find(element => element.type_id === ACUM_TYPE_ID && element.value === track.fullWorkId) ? workState.originalEditData.attributes : [...workState.originalEditData.attributes, {
      type_id: ACUM_TYPE_ID,
      value: track.fullWorkId
    }]
  };
}
const makeWorkEditDataContext = workState => {
  const [editData, setEditData] = store.createStore(structuredClone(workState.editData));
  return {
    editData,
    setEditData,
    isModified: () => !workEditDataEqual(workState.originalEditData, editData),
    workName: () => editData.name,
    submitUrl: () => workState.work.gid ? urlFromMbid('work', workState.work.gid) : '/work/create',
    saveEditData: () => {
      const unwrapped = store.unwrap(editData);
      workState.editData.name = unwrapped.name;
      workState.editData.comment = unwrapped.comment;
      workState.editData.type_id = unwrapped.type_id;
      workState.editData.languages = unwrapped.languages.filter(lang => Number.isNaN(lang) === false);
      workState.editData.iswcs = unwrapped.iswcs.filter(iswc => iswc !== '');
      workState.editData.attributes = unwrapped.attributes.filter(attr => attr.value !== '');
    },
    workId: () => workState.work.id
  };
};
const WorkEditDataContext = solidJs.createContext();
function useWorkEditData() {
  const context = solidJs.useContext(WorkEditDataContext);
  if (!context) {
    throw new Error('useWorkEditData should be called inside WorkEditDataProvider');
  }
  return context;
}
function WorkEditDataProvider(props) {
  return web.createComponent(WorkEditDataContext.Provider, {
    get value() {
      return makeWorkEditDataContext(props.workState);
    },
    get children() {
      return props.children;
    }
  });
}

function _extends() {
  return _extends = Object.assign ? Object.assign.bind() : function (n) {
    for (var e = 1; e < arguments.length; e++) {
      var t = arguments[e];
      for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]);
    }
    return n;
  }, _extends.apply(null, arguments);
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
      _status: REL_STATUS_ADD,
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
      _status: REL_STATUS_ADD,
      backward: true,
      entity0: artist,
      entity1: recording,
      id: MB.relationshipEditor.getRelationshipStateId(),
      linkTypeID: ARRANGER_LINK_TYPE_ID
    }),
    oldRelationshipState: null
  });
}

// addapted from https://github.com/metabrainz/musicbrainz-server/blob/dccbf69fd541cceebdb5908f58589483cf1b98e3/root/static/scripts/common/utility/compare.js

function compareStrings(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

/*
 * The `compareStrings` implementation above works with numbers too,
 * but a separate function (1) allows for separate Flow types and (2)
 * keeps the function calls monomorphic. There's no real benefit to
 * importing this if you're simply comparing two numbers as part of a
 * larger sort function; it's mainly useful for passing to .sort()
 * directly.
 */
function compareNumbers(a, b) {
  return a - b;
}

function head(it) {
  return it.next().value;
}

function compareTargetTypeWithGroup(targetType, targetTypeGroup) {
  return compareStrings(targetType, targetTypeGroup[0]);
}

function* iterateRelationshipsInTargetTypeGroup(targetTypeGroup) {
  const [, /* targetType */linkTypeGroups] = targetTypeGroup;
  for (const linkTypeGroup of MB.tree.iterate(linkTypeGroups)) {
    for (const linkPhraseGroup of MB.tree.iterate(linkTypeGroup.phraseGroups)) {
      yield* MB.tree.iterate(linkPhraseGroup.relationships);
    }
  }
}

// src/i18n/create-collator.ts

// src/i18n/utils.ts
var RTL_SCRIPTS = /* @__PURE__ */ new Set([
  "Avst",
  "Arab",
  "Armi",
  "Syrc",
  "Samr",
  "Mand",
  "Thaa",
  "Mend",
  "Nkoo",
  "Adlm",
  "Rohg",
  "Hebr"
]);
var RTL_LANGS = /* @__PURE__ */ new Set([
  "ae",
  "ar",
  "arc",
  "bcc",
  "bqi",
  "ckb",
  "dv",
  "fa",
  "glk",
  "he",
  "ku",
  "mzn",
  "nqo",
  "pnb",
  "ps",
  "sd",
  "ug",
  "ur",
  "yi"
]);
function isRTL$1(locale) {
  if (Intl.Locale) {
    const script = new Intl.Locale(locale).maximize().script ?? "";
    return RTL_SCRIPTS.has(script);
  }
  const lang = locale.split("-")[0];
  return RTL_LANGS.has(lang);
}
function getReadingDirection(locale) {
  return isRTL$1(locale) ? "rtl" : "ltr";
}

// src/i18n/create-default-locale.ts
function getDefaultLocale() {
  let locale = typeof navigator !== "undefined" && // @ts-ignore
  (navigator.language || navigator.userLanguage) || "en-US";
  return {
    locale,
    direction: getReadingDirection(locale)
  };
}
var currentLocale = getDefaultLocale();
var listeners = /* @__PURE__ */ new Set();
function updateLocale() {
  currentLocale = getDefaultLocale();
  for (const listener of listeners) {
    listener(currentLocale);
  }
}
function createDefaultLocale() {
  const defaultSSRLocale = {
    locale: "en-US",
    direction: "ltr"
  };
  const [defaultClientLocale, setDefaultClientLocale] = solidJs.createSignal(currentLocale);
  const defaultLocale = solidJs.createMemo(
    () => web.isServer ? defaultSSRLocale : defaultClientLocale()
  );
  solidJs.onMount(() => {
    if (listeners.size === 0) {
      window.addEventListener("languagechange", updateLocale);
    }
    listeners.add(setDefaultClientLocale);
    solidJs.onCleanup(() => {
      listeners.delete(setDefaultClientLocale);
      if (listeners.size === 0) {
        window.removeEventListener("languagechange", updateLocale);
      }
    });
  });
  return {
    locale: () => defaultLocale().locale,
    direction: () => defaultLocale().direction
  };
}

// src/i18n/i18n-provider.tsx
var I18nContext = solidJs.createContext();
function useLocale() {
  const defaultLocale = createDefaultLocale();
  const context = solidJs.useContext(I18nContext);
  return context || defaultLocale;
}

/**
 * Custom positioning reference element.
 * @see https://floating-ui.com/docs/virtual-elements
 */

const sides = ['top', 'right', 'bottom', 'left'];
const min = Math.min;
const max = Math.max;
const round = Math.round;
const floor = Math.floor;
const createCoords = v => ({
  x: v,
  y: v
});
const oppositeSideMap = {
  left: 'right',
  right: 'left',
  bottom: 'top',
  top: 'bottom'
};
const oppositeAlignmentMap = {
  start: 'end',
  end: 'start'
};
function clamp(start, value, end) {
  return max(start, min(value, end));
}
function evaluate(value, param) {
  return typeof value === 'function' ? value(param) : value;
}
function getSide(placement) {
  return placement.split('-')[0];
}
function getAlignment(placement) {
  return placement.split('-')[1];
}
function getOppositeAxis(axis) {
  return axis === 'x' ? 'y' : 'x';
}
function getAxisLength(axis) {
  return axis === 'y' ? 'height' : 'width';
}
function getSideAxis(placement) {
  return ['top', 'bottom'].includes(getSide(placement)) ? 'y' : 'x';
}
function getAlignmentAxis(placement) {
  return getOppositeAxis(getSideAxis(placement));
}
function getAlignmentSides(placement, rects, rtl) {
  if (rtl === void 0) {
    rtl = false;
  }
  const alignment = getAlignment(placement);
  const alignmentAxis = getAlignmentAxis(placement);
  const length = getAxisLength(alignmentAxis);
  let mainAlignmentSide = alignmentAxis === 'x' ? alignment === (rtl ? 'end' : 'start') ? 'right' : 'left' : alignment === 'start' ? 'bottom' : 'top';
  if (rects.reference[length] > rects.floating[length]) {
    mainAlignmentSide = getOppositePlacement(mainAlignmentSide);
  }
  return [mainAlignmentSide, getOppositePlacement(mainAlignmentSide)];
}
function getExpandedPlacements(placement) {
  const oppositePlacement = getOppositePlacement(placement);
  return [getOppositeAlignmentPlacement(placement), oppositePlacement, getOppositeAlignmentPlacement(oppositePlacement)];
}
function getOppositeAlignmentPlacement(placement) {
  return placement.replace(/start|end/g, alignment => oppositeAlignmentMap[alignment]);
}
function getSideList(side, isStart, rtl) {
  const lr = ['left', 'right'];
  const rl = ['right', 'left'];
  const tb = ['top', 'bottom'];
  const bt = ['bottom', 'top'];
  switch (side) {
    case 'top':
    case 'bottom':
      if (rtl) return isStart ? rl : lr;
      return isStart ? lr : rl;
    case 'left':
    case 'right':
      return isStart ? tb : bt;
    default:
      return [];
  }
}
function getOppositeAxisPlacements(placement, flipAlignment, direction, rtl) {
  const alignment = getAlignment(placement);
  let list = getSideList(getSide(placement), direction === 'start', rtl);
  if (alignment) {
    list = list.map(side => side + "-" + alignment);
    if (flipAlignment) {
      list = list.concat(list.map(getOppositeAlignmentPlacement));
    }
  }
  return list;
}
function getOppositePlacement(placement) {
  return placement.replace(/left|right|bottom|top/g, side => oppositeSideMap[side]);
}
function expandPaddingObject(padding) {
  return {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    ...padding
  };
}
function getPaddingObject(padding) {
  return typeof padding !== 'number' ? expandPaddingObject(padding) : {
    top: padding,
    right: padding,
    bottom: padding,
    left: padding
  };
}
function rectToClientRect(rect) {
  const {
    x,
    y,
    width,
    height
  } = rect;
  return {
    width,
    height,
    top: y,
    left: x,
    right: x + width,
    bottom: y + height,
    x,
    y
  };
}

function computeCoordsFromPlacement(_ref, placement, rtl) {
  let {
    reference,
    floating
  } = _ref;
  const sideAxis = getSideAxis(placement);
  const alignmentAxis = getAlignmentAxis(placement);
  const alignLength = getAxisLength(alignmentAxis);
  const side = getSide(placement);
  const isVertical = sideAxis === 'y';
  const commonX = reference.x + reference.width / 2 - floating.width / 2;
  const commonY = reference.y + reference.height / 2 - floating.height / 2;
  const commonAlign = reference[alignLength] / 2 - floating[alignLength] / 2;
  let coords;
  switch (side) {
    case 'top':
      coords = {
        x: commonX,
        y: reference.y - floating.height
      };
      break;
    case 'bottom':
      coords = {
        x: commonX,
        y: reference.y + reference.height
      };
      break;
    case 'right':
      coords = {
        x: reference.x + reference.width,
        y: commonY
      };
      break;
    case 'left':
      coords = {
        x: reference.x - floating.width,
        y: commonY
      };
      break;
    default:
      coords = {
        x: reference.x,
        y: reference.y
      };
  }
  switch (getAlignment(placement)) {
    case 'start':
      coords[alignmentAxis] -= commonAlign * (rtl && isVertical ? -1 : 1);
      break;
    case 'end':
      coords[alignmentAxis] += commonAlign * (rtl && isVertical ? -1 : 1);
      break;
  }
  return coords;
}

/**
 * Computes the `x` and `y` coordinates that will place the floating element
 * next to a given reference element.
 *
 * This export does not have any `platform` interface logic. You will need to
 * write one for the platform you are using Floating UI with.
 */
const computePosition$1 = async (reference, floating, config) => {
  const {
    placement = 'bottom',
    strategy = 'absolute',
    middleware = [],
    platform
  } = config;
  const validMiddleware = middleware.filter(Boolean);
  const rtl = await (platform.isRTL == null ? void 0 : platform.isRTL(floating));
  let rects = await platform.getElementRects({
    reference,
    floating,
    strategy
  });
  let {
    x,
    y
  } = computeCoordsFromPlacement(rects, placement, rtl);
  let statefulPlacement = placement;
  let middlewareData = {};
  let resetCount = 0;
  for (let i = 0; i < validMiddleware.length; i++) {
    const {
      name,
      fn
    } = validMiddleware[i];
    const {
      x: nextX,
      y: nextY,
      data,
      reset
    } = await fn({
      x,
      y,
      initialPlacement: placement,
      placement: statefulPlacement,
      strategy,
      middlewareData,
      rects,
      platform,
      elements: {
        reference,
        floating
      }
    });
    x = nextX != null ? nextX : x;
    y = nextY != null ? nextY : y;
    middlewareData = {
      ...middlewareData,
      [name]: {
        ...middlewareData[name],
        ...data
      }
    };
    if (reset && resetCount <= 50) {
      resetCount++;
      if (typeof reset === 'object') {
        if (reset.placement) {
          statefulPlacement = reset.placement;
        }
        if (reset.rects) {
          rects = reset.rects === true ? await platform.getElementRects({
            reference,
            floating,
            strategy
          }) : reset.rects;
        }
        ({
          x,
          y
        } = computeCoordsFromPlacement(rects, statefulPlacement, rtl));
      }
      i = -1;
    }
  }
  return {
    x,
    y,
    placement: statefulPlacement,
    strategy,
    middlewareData
  };
};

/**
 * Resolves with an object of overflow side offsets that determine how much the
 * element is overflowing a given clipping boundary on each side.
 * - positive = overflowing the boundary by that number of pixels
 * - negative = how many pixels left before it will overflow
 * - 0 = lies flush with the boundary
 * @see https://floating-ui.com/docs/detectOverflow
 */
async function detectOverflow(state, options) {
  var _await$platform$isEle;
  if (options === void 0) {
    options = {};
  }
  const {
    x,
    y,
    platform,
    rects,
    elements,
    strategy
  } = state;
  const {
    boundary = 'clippingAncestors',
    rootBoundary = 'viewport',
    elementContext = 'floating',
    altBoundary = false,
    padding = 0
  } = evaluate(options, state);
  const paddingObject = getPaddingObject(padding);
  const altContext = elementContext === 'floating' ? 'reference' : 'floating';
  const element = elements[altBoundary ? altContext : elementContext];
  const clippingClientRect = rectToClientRect(await platform.getClippingRect({
    element: ((_await$platform$isEle = await (platform.isElement == null ? void 0 : platform.isElement(element))) != null ? _await$platform$isEle : true) ? element : element.contextElement || (await (platform.getDocumentElement == null ? void 0 : platform.getDocumentElement(elements.floating))),
    boundary,
    rootBoundary,
    strategy
  }));
  const rect = elementContext === 'floating' ? {
    x,
    y,
    width: rects.floating.width,
    height: rects.floating.height
  } : rects.reference;
  const offsetParent = await (platform.getOffsetParent == null ? void 0 : platform.getOffsetParent(elements.floating));
  const offsetScale = (await (platform.isElement == null ? void 0 : platform.isElement(offsetParent))) ? (await (platform.getScale == null ? void 0 : platform.getScale(offsetParent))) || {
    x: 1,
    y: 1
  } : {
    x: 1,
    y: 1
  };
  const elementClientRect = rectToClientRect(platform.convertOffsetParentRelativeRectToViewportRelativeRect ? await platform.convertOffsetParentRelativeRectToViewportRelativeRect({
    elements,
    rect,
    offsetParent,
    strategy
  }) : rect);
  return {
    top: (clippingClientRect.top - elementClientRect.top + paddingObject.top) / offsetScale.y,
    bottom: (elementClientRect.bottom - clippingClientRect.bottom + paddingObject.bottom) / offsetScale.y,
    left: (clippingClientRect.left - elementClientRect.left + paddingObject.left) / offsetScale.x,
    right: (elementClientRect.right - clippingClientRect.right + paddingObject.right) / offsetScale.x
  };
}

/**
 * Provides data to position an inner element of the floating element so that it
 * appears centered to the reference element.
 * @see https://floating-ui.com/docs/arrow
 */
const arrow$1 = options => ({
  name: 'arrow',
  options,
  async fn(state) {
    const {
      x,
      y,
      placement,
      rects,
      platform,
      elements,
      middlewareData
    } = state;
    // Since `element` is required, we don't Partial<> the type.
    const {
      element,
      padding = 0
    } = evaluate(options, state) || {};
    if (element == null) {
      return {};
    }
    const paddingObject = getPaddingObject(padding);
    const coords = {
      x,
      y
    };
    const axis = getAlignmentAxis(placement);
    const length = getAxisLength(axis);
    const arrowDimensions = await platform.getDimensions(element);
    const isYAxis = axis === 'y';
    const minProp = isYAxis ? 'top' : 'left';
    const maxProp = isYAxis ? 'bottom' : 'right';
    const clientProp = isYAxis ? 'clientHeight' : 'clientWidth';
    const endDiff = rects.reference[length] + rects.reference[axis] - coords[axis] - rects.floating[length];
    const startDiff = coords[axis] - rects.reference[axis];
    const arrowOffsetParent = await (platform.getOffsetParent == null ? void 0 : platform.getOffsetParent(element));
    let clientSize = arrowOffsetParent ? arrowOffsetParent[clientProp] : 0;

    // DOM platform can return `window` as the `offsetParent`.
    if (!clientSize || !(await (platform.isElement == null ? void 0 : platform.isElement(arrowOffsetParent)))) {
      clientSize = elements.floating[clientProp] || rects.floating[length];
    }
    const centerToReference = endDiff / 2 - startDiff / 2;

    // If the padding is large enough that it causes the arrow to no longer be
    // centered, modify the padding so that it is centered.
    const largestPossiblePadding = clientSize / 2 - arrowDimensions[length] / 2 - 1;
    const minPadding = min(paddingObject[minProp], largestPossiblePadding);
    const maxPadding = min(paddingObject[maxProp], largestPossiblePadding);

    // Make sure the arrow doesn't overflow the floating element if the center
    // point is outside the floating element's bounds.
    const min$1 = minPadding;
    const max = clientSize - arrowDimensions[length] - maxPadding;
    const center = clientSize / 2 - arrowDimensions[length] / 2 + centerToReference;
    const offset = clamp(min$1, center, max);

    // If the reference is small enough that the arrow's padding causes it to
    // to point to nothing for an aligned placement, adjust the offset of the
    // floating element itself. To ensure `shift()` continues to take action,
    // a single reset is performed when this is true.
    const shouldAddOffset = !middlewareData.arrow && getAlignment(placement) != null && center !== offset && rects.reference[length] / 2 - (center < min$1 ? minPadding : maxPadding) - arrowDimensions[length] / 2 < 0;
    const alignmentOffset = shouldAddOffset ? center < min$1 ? center - min$1 : center - max : 0;
    return {
      [axis]: coords[axis] + alignmentOffset,
      data: {
        [axis]: offset,
        centerOffset: center - offset - alignmentOffset,
        ...(shouldAddOffset && {
          alignmentOffset
        })
      },
      reset: shouldAddOffset
    };
  }
});

/**
 * Optimizes the visibility of the floating element by flipping the `placement`
 * in order to keep it in view when the preferred placement(s) will overflow the
 * clipping boundary. Alternative to `autoPlacement`.
 * @see https://floating-ui.com/docs/flip
 */
const flip$1 = function (options) {
  if (options === void 0) {
    options = {};
  }
  return {
    name: 'flip',
    options,
    async fn(state) {
      var _middlewareData$arrow, _middlewareData$flip;
      const {
        placement,
        middlewareData,
        rects,
        initialPlacement,
        platform,
        elements
      } = state;
      const {
        mainAxis: checkMainAxis = true,
        crossAxis: checkCrossAxis = true,
        fallbackPlacements: specifiedFallbackPlacements,
        fallbackStrategy = 'bestFit',
        fallbackAxisSideDirection = 'none',
        flipAlignment = true,
        ...detectOverflowOptions
      } = evaluate(options, state);

      // If a reset by the arrow was caused due to an alignment offset being
      // added, we should skip any logic now since `flip()` has already done its
      // work.
      // https://github.com/floating-ui/floating-ui/issues/2549#issuecomment-1719601643
      if ((_middlewareData$arrow = middlewareData.arrow) != null && _middlewareData$arrow.alignmentOffset) {
        return {};
      }
      const side = getSide(placement);
      const initialSideAxis = getSideAxis(initialPlacement);
      const isBasePlacement = getSide(initialPlacement) === initialPlacement;
      const rtl = await (platform.isRTL == null ? void 0 : platform.isRTL(elements.floating));
      const fallbackPlacements = specifiedFallbackPlacements || (isBasePlacement || !flipAlignment ? [getOppositePlacement(initialPlacement)] : getExpandedPlacements(initialPlacement));
      const hasFallbackAxisSideDirection = fallbackAxisSideDirection !== 'none';
      if (!specifiedFallbackPlacements && hasFallbackAxisSideDirection) {
        fallbackPlacements.push(...getOppositeAxisPlacements(initialPlacement, flipAlignment, fallbackAxisSideDirection, rtl));
      }
      const placements = [initialPlacement, ...fallbackPlacements];
      const overflow = await detectOverflow(state, detectOverflowOptions);
      const overflows = [];
      let overflowsData = ((_middlewareData$flip = middlewareData.flip) == null ? void 0 : _middlewareData$flip.overflows) || [];
      if (checkMainAxis) {
        overflows.push(overflow[side]);
      }
      if (checkCrossAxis) {
        const sides = getAlignmentSides(placement, rects, rtl);
        overflows.push(overflow[sides[0]], overflow[sides[1]]);
      }
      overflowsData = [...overflowsData, {
        placement,
        overflows
      }];

      // One or more sides is overflowing.
      if (!overflows.every(side => side <= 0)) {
        var _middlewareData$flip2, _overflowsData$filter;
        const nextIndex = (((_middlewareData$flip2 = middlewareData.flip) == null ? void 0 : _middlewareData$flip2.index) || 0) + 1;
        const nextPlacement = placements[nextIndex];
        if (nextPlacement) {
          // Try next placement and re-run the lifecycle.
          return {
            data: {
              index: nextIndex,
              overflows: overflowsData
            },
            reset: {
              placement: nextPlacement
            }
          };
        }

        // First, find the candidates that fit on the mainAxis side of overflow,
        // then find the placement that fits the best on the main crossAxis side.
        let resetPlacement = (_overflowsData$filter = overflowsData.filter(d => d.overflows[0] <= 0).sort((a, b) => a.overflows[1] - b.overflows[1])[0]) == null ? void 0 : _overflowsData$filter.placement;

        // Otherwise fallback.
        if (!resetPlacement) {
          switch (fallbackStrategy) {
            case 'bestFit':
              {
                var _overflowsData$filter2;
                const placement = (_overflowsData$filter2 = overflowsData.filter(d => {
                  if (hasFallbackAxisSideDirection) {
                    const currentSideAxis = getSideAxis(d.placement);
                    return currentSideAxis === initialSideAxis ||
                    // Create a bias to the `y` side axis due to horizontal
                    // reading directions favoring greater width.
                    currentSideAxis === 'y';
                  }
                  return true;
                }).map(d => [d.placement, d.overflows.filter(overflow => overflow > 0).reduce((acc, overflow) => acc + overflow, 0)]).sort((a, b) => a[1] - b[1])[0]) == null ? void 0 : _overflowsData$filter2[0];
                if (placement) {
                  resetPlacement = placement;
                }
                break;
              }
            case 'initialPlacement':
              resetPlacement = initialPlacement;
              break;
          }
        }
        if (placement !== resetPlacement) {
          return {
            reset: {
              placement: resetPlacement
            }
          };
        }
      }
      return {};
    }
  };
};

function getSideOffsets(overflow, rect) {
  return {
    top: overflow.top - rect.height,
    right: overflow.right - rect.width,
    bottom: overflow.bottom - rect.height,
    left: overflow.left - rect.width
  };
}
function isAnySideFullyClipped(overflow) {
  return sides.some(side => overflow[side] >= 0);
}
/**
 * Provides data to hide the floating element in applicable situations, such as
 * when it is not in the same clipping context as the reference element.
 * @see https://floating-ui.com/docs/hide
 */
const hide$1 = function (options) {
  if (options === void 0) {
    options = {};
  }
  return {
    name: 'hide',
    options,
    async fn(state) {
      const {
        rects
      } = state;
      const {
        strategy = 'referenceHidden',
        ...detectOverflowOptions
      } = evaluate(options, state);
      switch (strategy) {
        case 'referenceHidden':
          {
            const overflow = await detectOverflow(state, {
              ...detectOverflowOptions,
              elementContext: 'reference'
            });
            const offsets = getSideOffsets(overflow, rects.reference);
            return {
              data: {
                referenceHiddenOffsets: offsets,
                referenceHidden: isAnySideFullyClipped(offsets)
              }
            };
          }
        case 'escaped':
          {
            const overflow = await detectOverflow(state, {
              ...detectOverflowOptions,
              altBoundary: true
            });
            const offsets = getSideOffsets(overflow, rects.floating);
            return {
              data: {
                escapedOffsets: offsets,
                escaped: isAnySideFullyClipped(offsets)
              }
            };
          }
        default:
          {
            return {};
          }
      }
    }
  };
};

// For type backwards-compatibility, the `OffsetOptions` type was also
// Derivable.

async function convertValueToCoords(state, options) {
  const {
    placement,
    platform,
    elements
  } = state;
  const rtl = await (platform.isRTL == null ? void 0 : platform.isRTL(elements.floating));
  const side = getSide(placement);
  const alignment = getAlignment(placement);
  const isVertical = getSideAxis(placement) === 'y';
  const mainAxisMulti = ['left', 'top'].includes(side) ? -1 : 1;
  const crossAxisMulti = rtl && isVertical ? -1 : 1;
  const rawValue = evaluate(options, state);

  // eslint-disable-next-line prefer-const
  let {
    mainAxis,
    crossAxis,
    alignmentAxis
  } = typeof rawValue === 'number' ? {
    mainAxis: rawValue,
    crossAxis: 0,
    alignmentAxis: null
  } : {
    mainAxis: rawValue.mainAxis || 0,
    crossAxis: rawValue.crossAxis || 0,
    alignmentAxis: rawValue.alignmentAxis
  };
  if (alignment && typeof alignmentAxis === 'number') {
    crossAxis = alignment === 'end' ? alignmentAxis * -1 : alignmentAxis;
  }
  return isVertical ? {
    x: crossAxis * crossAxisMulti,
    y: mainAxis * mainAxisMulti
  } : {
    x: mainAxis * mainAxisMulti,
    y: crossAxis * crossAxisMulti
  };
}

/**
 * Modifies the placement by translating the floating element along the
 * specified axes.
 * A number (shorthand for `mainAxis` or distance), or an axes configuration
 * object may be passed.
 * @see https://floating-ui.com/docs/offset
 */
const offset$1 = function (options) {
  if (options === void 0) {
    options = 0;
  }
  return {
    name: 'offset',
    options,
    async fn(state) {
      var _middlewareData$offse, _middlewareData$arrow;
      const {
        x,
        y,
        placement,
        middlewareData
      } = state;
      const diffCoords = await convertValueToCoords(state, options);

      // If the placement is the same and the arrow caused an alignment offset
      // then we don't need to change the positioning coordinates.
      if (placement === ((_middlewareData$offse = middlewareData.offset) == null ? void 0 : _middlewareData$offse.placement) && (_middlewareData$arrow = middlewareData.arrow) != null && _middlewareData$arrow.alignmentOffset) {
        return {};
      }
      return {
        x: x + diffCoords.x,
        y: y + diffCoords.y,
        data: {
          ...diffCoords,
          placement
        }
      };
    }
  };
};

/**
 * Optimizes the visibility of the floating element by shifting it in order to
 * keep it in view when it will overflow the clipping boundary.
 * @see https://floating-ui.com/docs/shift
 */
const shift$1 = function (options) {
  if (options === void 0) {
    options = {};
  }
  return {
    name: 'shift',
    options,
    async fn(state) {
      const {
        x,
        y,
        placement
      } = state;
      const {
        mainAxis: checkMainAxis = true,
        crossAxis: checkCrossAxis = false,
        limiter = {
          fn: _ref => {
            let {
              x,
              y
            } = _ref;
            return {
              x,
              y
            };
          }
        },
        ...detectOverflowOptions
      } = evaluate(options, state);
      const coords = {
        x,
        y
      };
      const overflow = await detectOverflow(state, detectOverflowOptions);
      const crossAxis = getSideAxis(getSide(placement));
      const mainAxis = getOppositeAxis(crossAxis);
      let mainAxisCoord = coords[mainAxis];
      let crossAxisCoord = coords[crossAxis];
      if (checkMainAxis) {
        const minSide = mainAxis === 'y' ? 'top' : 'left';
        const maxSide = mainAxis === 'y' ? 'bottom' : 'right';
        const min = mainAxisCoord + overflow[minSide];
        const max = mainAxisCoord - overflow[maxSide];
        mainAxisCoord = clamp(min, mainAxisCoord, max);
      }
      if (checkCrossAxis) {
        const minSide = crossAxis === 'y' ? 'top' : 'left';
        const maxSide = crossAxis === 'y' ? 'bottom' : 'right';
        const min = crossAxisCoord + overflow[minSide];
        const max = crossAxisCoord - overflow[maxSide];
        crossAxisCoord = clamp(min, crossAxisCoord, max);
      }
      const limitedCoords = limiter.fn({
        ...state,
        [mainAxis]: mainAxisCoord,
        [crossAxis]: crossAxisCoord
      });
      return {
        ...limitedCoords,
        data: {
          x: limitedCoords.x - x,
          y: limitedCoords.y - y,
          enabled: {
            [mainAxis]: checkMainAxis,
            [crossAxis]: checkCrossAxis
          }
        }
      };
    }
  };
};

/**
 * Provides data that allows you to change the size of the floating element —
 * for instance, prevent it from overflowing the clipping boundary or match the
 * width of the reference element.
 * @see https://floating-ui.com/docs/size
 */
const size$1 = function (options) {
  if (options === void 0) {
    options = {};
  }
  return {
    name: 'size',
    options,
    async fn(state) {
      var _state$middlewareData, _state$middlewareData2;
      const {
        placement,
        rects,
        platform,
        elements
      } = state;
      const {
        apply = () => {},
        ...detectOverflowOptions
      } = evaluate(options, state);
      const overflow = await detectOverflow(state, detectOverflowOptions);
      const side = getSide(placement);
      const alignment = getAlignment(placement);
      const isYAxis = getSideAxis(placement) === 'y';
      const {
        width,
        height
      } = rects.floating;
      let heightSide;
      let widthSide;
      if (side === 'top' || side === 'bottom') {
        heightSide = side;
        widthSide = alignment === ((await (platform.isRTL == null ? void 0 : platform.isRTL(elements.floating))) ? 'start' : 'end') ? 'left' : 'right';
      } else {
        widthSide = side;
        heightSide = alignment === 'end' ? 'top' : 'bottom';
      }
      const maximumClippingHeight = height - overflow.top - overflow.bottom;
      const maximumClippingWidth = width - overflow.left - overflow.right;
      const overflowAvailableHeight = min(height - overflow[heightSide], maximumClippingHeight);
      const overflowAvailableWidth = min(width - overflow[widthSide], maximumClippingWidth);
      const noShift = !state.middlewareData.shift;
      let availableHeight = overflowAvailableHeight;
      let availableWidth = overflowAvailableWidth;
      if ((_state$middlewareData = state.middlewareData.shift) != null && _state$middlewareData.enabled.x) {
        availableWidth = maximumClippingWidth;
      }
      if ((_state$middlewareData2 = state.middlewareData.shift) != null && _state$middlewareData2.enabled.y) {
        availableHeight = maximumClippingHeight;
      }
      if (noShift && !alignment) {
        const xMin = max(overflow.left, 0);
        const xMax = max(overflow.right, 0);
        const yMin = max(overflow.top, 0);
        const yMax = max(overflow.bottom, 0);
        if (isYAxis) {
          availableWidth = width - 2 * (xMin !== 0 || xMax !== 0 ? xMin + xMax : max(overflow.left, overflow.right));
        } else {
          availableHeight = height - 2 * (yMin !== 0 || yMax !== 0 ? yMin + yMax : max(overflow.top, overflow.bottom));
        }
      }
      await apply({
        ...state,
        availableWidth,
        availableHeight
      });
      const nextDimensions = await platform.getDimensions(elements.floating);
      if (width !== nextDimensions.width || height !== nextDimensions.height) {
        return {
          reset: {
            rects: true
          }
        };
      }
      return {};
    }
  };
};

function hasWindow() {
  return typeof window !== 'undefined';
}
function getNodeName(node) {
  if (isNode(node)) {
    return (node.nodeName || '').toLowerCase();
  }
  // Mocked nodes in testing environments may not be instances of Node. By
  // returning `#document` an infinite loop won't occur.
  // https://github.com/floating-ui/floating-ui/issues/2317
  return '#document';
}
function getWindow(node) {
  var _node$ownerDocument;
  return (node == null || (_node$ownerDocument = node.ownerDocument) == null ? void 0 : _node$ownerDocument.defaultView) || window;
}
function getDocumentElement(node) {
  var _ref;
  return (_ref = (isNode(node) ? node.ownerDocument : node.document) || window.document) == null ? void 0 : _ref.documentElement;
}
function isNode(value) {
  if (!hasWindow()) {
    return false;
  }
  return value instanceof Node || value instanceof getWindow(value).Node;
}
function isElement(value) {
  if (!hasWindow()) {
    return false;
  }
  return value instanceof Element || value instanceof getWindow(value).Element;
}
function isHTMLElement(value) {
  if (!hasWindow()) {
    return false;
  }
  return value instanceof HTMLElement || value instanceof getWindow(value).HTMLElement;
}
function isShadowRoot(value) {
  if (!hasWindow() || typeof ShadowRoot === 'undefined') {
    return false;
  }
  return value instanceof ShadowRoot || value instanceof getWindow(value).ShadowRoot;
}
function isOverflowElement(element) {
  const {
    overflow,
    overflowX,
    overflowY,
    display
  } = getComputedStyle$1(element);
  return /auto|scroll|overlay|hidden|clip/.test(overflow + overflowY + overflowX) && !['inline', 'contents'].includes(display);
}
function isTableElement(element) {
  return ['table', 'td', 'th'].includes(getNodeName(element));
}
function isTopLayer(element) {
  return [':popover-open', ':modal'].some(selector => {
    try {
      return element.matches(selector);
    } catch (e) {
      return false;
    }
  });
}
function isContainingBlock(elementOrCss) {
  const webkit = isWebKit();
  const css = isElement(elementOrCss) ? getComputedStyle$1(elementOrCss) : elementOrCss;

  // https://developer.mozilla.org/en-US/docs/Web/CSS/Containing_block#identifying_the_containing_block
  return css.transform !== 'none' || css.perspective !== 'none' || (css.containerType ? css.containerType !== 'normal' : false) || !webkit && (css.backdropFilter ? css.backdropFilter !== 'none' : false) || !webkit && (css.filter ? css.filter !== 'none' : false) || ['transform', 'perspective', 'filter'].some(value => (css.willChange || '').includes(value)) || ['paint', 'layout', 'strict', 'content'].some(value => (css.contain || '').includes(value));
}
function getContainingBlock(element) {
  let currentNode = getParentNode(element);
  while (isHTMLElement(currentNode) && !isLastTraversableNode(currentNode)) {
    if (isContainingBlock(currentNode)) {
      return currentNode;
    } else if (isTopLayer(currentNode)) {
      return null;
    }
    currentNode = getParentNode(currentNode);
  }
  return null;
}
function isWebKit() {
  if (typeof CSS === 'undefined' || !CSS.supports) return false;
  return CSS.supports('-webkit-backdrop-filter', 'none');
}
function isLastTraversableNode(node) {
  return ['html', 'body', '#document'].includes(getNodeName(node));
}
function getComputedStyle$1(element) {
  return getWindow(element).getComputedStyle(element);
}
function getNodeScroll(element) {
  if (isElement(element)) {
    return {
      scrollLeft: element.scrollLeft,
      scrollTop: element.scrollTop
    };
  }
  return {
    scrollLeft: element.scrollX,
    scrollTop: element.scrollY
  };
}
function getParentNode(node) {
  if (getNodeName(node) === 'html') {
    return node;
  }
  const result =
  // Step into the shadow DOM of the parent of a slotted node.
  node.assignedSlot ||
  // DOM Element detected.
  node.parentNode ||
  // ShadowRoot detected.
  isShadowRoot(node) && node.host ||
  // Fallback.
  getDocumentElement(node);
  return isShadowRoot(result) ? result.host : result;
}
function getNearestOverflowAncestor(node) {
  const parentNode = getParentNode(node);
  if (isLastTraversableNode(parentNode)) {
    return node.ownerDocument ? node.ownerDocument.body : node.body;
  }
  if (isHTMLElement(parentNode) && isOverflowElement(parentNode)) {
    return parentNode;
  }
  return getNearestOverflowAncestor(parentNode);
}
function getOverflowAncestors(node, list, traverseIframes) {
  var _node$ownerDocument2;
  if (list === void 0) {
    list = [];
  }
  if (traverseIframes === void 0) {
    traverseIframes = true;
  }
  const scrollableAncestor = getNearestOverflowAncestor(node);
  const isBody = scrollableAncestor === ((_node$ownerDocument2 = node.ownerDocument) == null ? void 0 : _node$ownerDocument2.body);
  const win = getWindow(scrollableAncestor);
  if (isBody) {
    const frameElement = getFrameElement(win);
    return list.concat(win, win.visualViewport || [], isOverflowElement(scrollableAncestor) ? scrollableAncestor : [], frameElement && traverseIframes ? getOverflowAncestors(frameElement) : []);
  }
  return list.concat(scrollableAncestor, getOverflowAncestors(scrollableAncestor, [], traverseIframes));
}
function getFrameElement(win) {
  return win.parent && Object.getPrototypeOf(win.parent) ? win.frameElement : null;
}

function getCssDimensions(element) {
  const css = getComputedStyle$1(element);
  // In testing environments, the `width` and `height` properties are empty
  // strings for SVG elements, returning NaN. Fallback to `0` in this case.
  let width = parseFloat(css.width) || 0;
  let height = parseFloat(css.height) || 0;
  const hasOffset = isHTMLElement(element);
  const offsetWidth = hasOffset ? element.offsetWidth : width;
  const offsetHeight = hasOffset ? element.offsetHeight : height;
  const shouldFallback = round(width) !== offsetWidth || round(height) !== offsetHeight;
  if (shouldFallback) {
    width = offsetWidth;
    height = offsetHeight;
  }
  return {
    width,
    height,
    $: shouldFallback
  };
}

function unwrapElement(element) {
  return !isElement(element) ? element.contextElement : element;
}

function getScale(element) {
  const domElement = unwrapElement(element);
  if (!isHTMLElement(domElement)) {
    return createCoords(1);
  }
  const rect = domElement.getBoundingClientRect();
  const {
    width,
    height,
    $
  } = getCssDimensions(domElement);
  let x = ($ ? round(rect.width) : rect.width) / width;
  let y = ($ ? round(rect.height) : rect.height) / height;

  // 0, NaN, or Infinity should always fallback to 1.

  if (!x || !Number.isFinite(x)) {
    x = 1;
  }
  if (!y || !Number.isFinite(y)) {
    y = 1;
  }
  return {
    x,
    y
  };
}

const noOffsets = /*#__PURE__*/createCoords(0);
function getVisualOffsets(element) {
  const win = getWindow(element);
  if (!isWebKit() || !win.visualViewport) {
    return noOffsets;
  }
  return {
    x: win.visualViewport.offsetLeft,
    y: win.visualViewport.offsetTop
  };
}
function shouldAddVisualOffsets(element, isFixed, floatingOffsetParent) {
  if (isFixed === void 0) {
    isFixed = false;
  }
  if (!floatingOffsetParent || isFixed && floatingOffsetParent !== getWindow(element)) {
    return false;
  }
  return isFixed;
}

function getBoundingClientRect(element, includeScale, isFixedStrategy, offsetParent) {
  if (includeScale === void 0) {
    includeScale = false;
  }
  if (isFixedStrategy === void 0) {
    isFixedStrategy = false;
  }
  const clientRect = element.getBoundingClientRect();
  const domElement = unwrapElement(element);
  let scale = createCoords(1);
  if (includeScale) {
    if (offsetParent) {
      if (isElement(offsetParent)) {
        scale = getScale(offsetParent);
      }
    } else {
      scale = getScale(element);
    }
  }
  const visualOffsets = shouldAddVisualOffsets(domElement, isFixedStrategy, offsetParent) ? getVisualOffsets(domElement) : createCoords(0);
  let x = (clientRect.left + visualOffsets.x) / scale.x;
  let y = (clientRect.top + visualOffsets.y) / scale.y;
  let width = clientRect.width / scale.x;
  let height = clientRect.height / scale.y;
  if (domElement) {
    const win = getWindow(domElement);
    const offsetWin = offsetParent && isElement(offsetParent) ? getWindow(offsetParent) : offsetParent;
    let currentWin = win;
    let currentIFrame = getFrameElement(currentWin);
    while (currentIFrame && offsetParent && offsetWin !== currentWin) {
      const iframeScale = getScale(currentIFrame);
      const iframeRect = currentIFrame.getBoundingClientRect();
      const css = getComputedStyle$1(currentIFrame);
      const left = iframeRect.left + (currentIFrame.clientLeft + parseFloat(css.paddingLeft)) * iframeScale.x;
      const top = iframeRect.top + (currentIFrame.clientTop + parseFloat(css.paddingTop)) * iframeScale.y;
      x *= iframeScale.x;
      y *= iframeScale.y;
      width *= iframeScale.x;
      height *= iframeScale.y;
      x += left;
      y += top;
      currentWin = getWindow(currentIFrame);
      currentIFrame = getFrameElement(currentWin);
    }
  }
  return rectToClientRect({
    width,
    height,
    x,
    y
  });
}

function convertOffsetParentRelativeRectToViewportRelativeRect(_ref) {
  let {
    elements,
    rect,
    offsetParent,
    strategy
  } = _ref;
  const isFixed = strategy === 'fixed';
  const documentElement = getDocumentElement(offsetParent);
  const topLayer = elements ? isTopLayer(elements.floating) : false;
  if (offsetParent === documentElement || topLayer && isFixed) {
    return rect;
  }
  let scroll = {
    scrollLeft: 0,
    scrollTop: 0
  };
  let scale = createCoords(1);
  const offsets = createCoords(0);
  const isOffsetParentAnElement = isHTMLElement(offsetParent);
  if (isOffsetParentAnElement || !isOffsetParentAnElement && !isFixed) {
    if (getNodeName(offsetParent) !== 'body' || isOverflowElement(documentElement)) {
      scroll = getNodeScroll(offsetParent);
    }
    if (isHTMLElement(offsetParent)) {
      const offsetRect = getBoundingClientRect(offsetParent);
      scale = getScale(offsetParent);
      offsets.x = offsetRect.x + offsetParent.clientLeft;
      offsets.y = offsetRect.y + offsetParent.clientTop;
    }
  }
  return {
    width: rect.width * scale.x,
    height: rect.height * scale.y,
    x: rect.x * scale.x - scroll.scrollLeft * scale.x + offsets.x,
    y: rect.y * scale.y - scroll.scrollTop * scale.y + offsets.y
  };
}

function getClientRects(element) {
  return Array.from(element.getClientRects());
}

// If <html> has a CSS width greater than the viewport, then this will be
// incorrect for RTL.
function getWindowScrollBarX(element, rect) {
  const leftScroll = getNodeScroll(element).scrollLeft;
  if (!rect) {
    return getBoundingClientRect(getDocumentElement(element)).left + leftScroll;
  }
  return rect.left + leftScroll;
}

// Gets the entire size of the scrollable document area, even extending outside
// of the `<html>` and `<body>` rect bounds if horizontally scrollable.
function getDocumentRect(element) {
  const html = getDocumentElement(element);
  const scroll = getNodeScroll(element);
  const body = element.ownerDocument.body;
  const width = max(html.scrollWidth, html.clientWidth, body.scrollWidth, body.clientWidth);
  const height = max(html.scrollHeight, html.clientHeight, body.scrollHeight, body.clientHeight);
  let x = -scroll.scrollLeft + getWindowScrollBarX(element);
  const y = -scroll.scrollTop;
  if (getComputedStyle$1(body).direction === 'rtl') {
    x += max(html.clientWidth, body.clientWidth) - width;
  }
  return {
    width,
    height,
    x,
    y
  };
}

function getViewportRect(element, strategy) {
  const win = getWindow(element);
  const html = getDocumentElement(element);
  const visualViewport = win.visualViewport;
  let width = html.clientWidth;
  let height = html.clientHeight;
  let x = 0;
  let y = 0;
  if (visualViewport) {
    width = visualViewport.width;
    height = visualViewport.height;
    const visualViewportBased = isWebKit();
    if (!visualViewportBased || visualViewportBased && strategy === 'fixed') {
      x = visualViewport.offsetLeft;
      y = visualViewport.offsetTop;
    }
  }
  return {
    width,
    height,
    x,
    y
  };
}

// Returns the inner client rect, subtracting scrollbars if present.
function getInnerBoundingClientRect(element, strategy) {
  const clientRect = getBoundingClientRect(element, true, strategy === 'fixed');
  const top = clientRect.top + element.clientTop;
  const left = clientRect.left + element.clientLeft;
  const scale = isHTMLElement(element) ? getScale(element) : createCoords(1);
  const width = element.clientWidth * scale.x;
  const height = element.clientHeight * scale.y;
  const x = left * scale.x;
  const y = top * scale.y;
  return {
    width,
    height,
    x,
    y
  };
}
function getClientRectFromClippingAncestor(element, clippingAncestor, strategy) {
  let rect;
  if (clippingAncestor === 'viewport') {
    rect = getViewportRect(element, strategy);
  } else if (clippingAncestor === 'document') {
    rect = getDocumentRect(getDocumentElement(element));
  } else if (isElement(clippingAncestor)) {
    rect = getInnerBoundingClientRect(clippingAncestor, strategy);
  } else {
    const visualOffsets = getVisualOffsets(element);
    rect = {
      ...clippingAncestor,
      x: clippingAncestor.x - visualOffsets.x,
      y: clippingAncestor.y - visualOffsets.y
    };
  }
  return rectToClientRect(rect);
}
function hasFixedPositionAncestor(element, stopNode) {
  const parentNode = getParentNode(element);
  if (parentNode === stopNode || !isElement(parentNode) || isLastTraversableNode(parentNode)) {
    return false;
  }
  return getComputedStyle$1(parentNode).position === 'fixed' || hasFixedPositionAncestor(parentNode, stopNode);
}

// A "clipping ancestor" is an `overflow` element with the characteristic of
// clipping (or hiding) child elements. This returns all clipping ancestors
// of the given element up the tree.
function getClippingElementAncestors(element, cache) {
  const cachedResult = cache.get(element);
  if (cachedResult) {
    return cachedResult;
  }
  let result = getOverflowAncestors(element, [], false).filter(el => isElement(el) && getNodeName(el) !== 'body');
  let currentContainingBlockComputedStyle = null;
  const elementIsFixed = getComputedStyle$1(element).position === 'fixed';
  let currentNode = elementIsFixed ? getParentNode(element) : element;

  // https://developer.mozilla.org/en-US/docs/Web/CSS/Containing_block#identifying_the_containing_block
  while (isElement(currentNode) && !isLastTraversableNode(currentNode)) {
    const computedStyle = getComputedStyle$1(currentNode);
    const currentNodeIsContaining = isContainingBlock(currentNode);
    if (!currentNodeIsContaining && computedStyle.position === 'fixed') {
      currentContainingBlockComputedStyle = null;
    }
    const shouldDropCurrentNode = elementIsFixed ? !currentNodeIsContaining && !currentContainingBlockComputedStyle : !currentNodeIsContaining && computedStyle.position === 'static' && !!currentContainingBlockComputedStyle && ['absolute', 'fixed'].includes(currentContainingBlockComputedStyle.position) || isOverflowElement(currentNode) && !currentNodeIsContaining && hasFixedPositionAncestor(element, currentNode);
    if (shouldDropCurrentNode) {
      // Drop non-containing blocks.
      result = result.filter(ancestor => ancestor !== currentNode);
    } else {
      // Record last containing block for next iteration.
      currentContainingBlockComputedStyle = computedStyle;
    }
    currentNode = getParentNode(currentNode);
  }
  cache.set(element, result);
  return result;
}

// Gets the maximum area that the element is visible in due to any number of
// clipping ancestors.
function getClippingRect(_ref) {
  let {
    element,
    boundary,
    rootBoundary,
    strategy
  } = _ref;
  const elementClippingAncestors = boundary === 'clippingAncestors' ? isTopLayer(element) ? [] : getClippingElementAncestors(element, this._c) : [].concat(boundary);
  const clippingAncestors = [...elementClippingAncestors, rootBoundary];
  const firstClippingAncestor = clippingAncestors[0];
  const clippingRect = clippingAncestors.reduce((accRect, clippingAncestor) => {
    const rect = getClientRectFromClippingAncestor(element, clippingAncestor, strategy);
    accRect.top = max(rect.top, accRect.top);
    accRect.right = min(rect.right, accRect.right);
    accRect.bottom = min(rect.bottom, accRect.bottom);
    accRect.left = max(rect.left, accRect.left);
    return accRect;
  }, getClientRectFromClippingAncestor(element, firstClippingAncestor, strategy));
  return {
    width: clippingRect.right - clippingRect.left,
    height: clippingRect.bottom - clippingRect.top,
    x: clippingRect.left,
    y: clippingRect.top
  };
}

function getDimensions(element) {
  const {
    width,
    height
  } = getCssDimensions(element);
  return {
    width,
    height
  };
}

function getRectRelativeToOffsetParent(element, offsetParent, strategy) {
  const isOffsetParentAnElement = isHTMLElement(offsetParent);
  const documentElement = getDocumentElement(offsetParent);
  const isFixed = strategy === 'fixed';
  const rect = getBoundingClientRect(element, true, isFixed, offsetParent);
  let scroll = {
    scrollLeft: 0,
    scrollTop: 0
  };
  const offsets = createCoords(0);
  if (isOffsetParentAnElement || !isOffsetParentAnElement && !isFixed) {
    if (getNodeName(offsetParent) !== 'body' || isOverflowElement(documentElement)) {
      scroll = getNodeScroll(offsetParent);
    }
    if (isOffsetParentAnElement) {
      const offsetRect = getBoundingClientRect(offsetParent, true, isFixed, offsetParent);
      offsets.x = offsetRect.x + offsetParent.clientLeft;
      offsets.y = offsetRect.y + offsetParent.clientTop;
    } else if (documentElement) {
      // If the <body> scrollbar appears on the left (e.g. RTL systems). Use
      // Firefox with layout.scrollbar.side = 3 in about:config to test this.
      offsets.x = getWindowScrollBarX(documentElement);
    }
  }
  let htmlX = 0;
  let htmlY = 0;
  if (documentElement && !isOffsetParentAnElement && !isFixed) {
    const htmlRect = documentElement.getBoundingClientRect();
    htmlY = htmlRect.top + scroll.scrollTop;
    htmlX = htmlRect.left + scroll.scrollLeft -
    // RTL <body> scrollbar.
    getWindowScrollBarX(documentElement, htmlRect);
  }
  const x = rect.left + scroll.scrollLeft - offsets.x - htmlX;
  const y = rect.top + scroll.scrollTop - offsets.y - htmlY;
  return {
    x,
    y,
    width: rect.width,
    height: rect.height
  };
}

function isStaticPositioned(element) {
  return getComputedStyle$1(element).position === 'static';
}

function getTrueOffsetParent(element, polyfill) {
  if (!isHTMLElement(element) || getComputedStyle$1(element).position === 'fixed') {
    return null;
  }
  if (polyfill) {
    return polyfill(element);
  }
  let rawOffsetParent = element.offsetParent;

  // Firefox returns the <html> element as the offsetParent if it's non-static,
  // while Chrome and Safari return the <body> element. The <body> element must
  // be used to perform the correct calculations even if the <html> element is
  // non-static.
  if (getDocumentElement(element) === rawOffsetParent) {
    rawOffsetParent = rawOffsetParent.ownerDocument.body;
  }
  return rawOffsetParent;
}

// Gets the closest ancestor positioned element. Handles some edge cases,
// such as table ancestors and cross browser bugs.
function getOffsetParent(element, polyfill) {
  const win = getWindow(element);
  if (isTopLayer(element)) {
    return win;
  }
  if (!isHTMLElement(element)) {
    let svgOffsetParent = getParentNode(element);
    while (svgOffsetParent && !isLastTraversableNode(svgOffsetParent)) {
      if (isElement(svgOffsetParent) && !isStaticPositioned(svgOffsetParent)) {
        return svgOffsetParent;
      }
      svgOffsetParent = getParentNode(svgOffsetParent);
    }
    return win;
  }
  let offsetParent = getTrueOffsetParent(element, polyfill);
  while (offsetParent && isTableElement(offsetParent) && isStaticPositioned(offsetParent)) {
    offsetParent = getTrueOffsetParent(offsetParent, polyfill);
  }
  if (offsetParent && isLastTraversableNode(offsetParent) && isStaticPositioned(offsetParent) && !isContainingBlock(offsetParent)) {
    return win;
  }
  return offsetParent || getContainingBlock(element) || win;
}

const getElementRects = async function (data) {
  const getOffsetParentFn = this.getOffsetParent || getOffsetParent;
  const getDimensionsFn = this.getDimensions;
  const floatingDimensions = await getDimensionsFn(data.floating);
  return {
    reference: getRectRelativeToOffsetParent(data.reference, await getOffsetParentFn(data.floating), data.strategy),
    floating: {
      x: 0,
      y: 0,
      width: floatingDimensions.width,
      height: floatingDimensions.height
    }
  };
};

function isRTL(element) {
  return getComputedStyle$1(element).direction === 'rtl';
}

const platform = {
  convertOffsetParentRelativeRectToViewportRelativeRect,
  getDocumentElement,
  getClippingRect,
  getOffsetParent,
  getElementRects,
  getClientRects,
  getDimensions,
  getScale,
  isElement,
  isRTL
};

// https://samthor.au/2021/observing-dom/
function observeMove(element, onMove) {
  let io = null;
  let timeoutId;
  const root = getDocumentElement(element);
  function cleanup() {
    var _io;
    clearTimeout(timeoutId);
    (_io = io) == null || _io.disconnect();
    io = null;
  }
  function refresh(skip, threshold) {
    if (skip === void 0) {
      skip = false;
    }
    if (threshold === void 0) {
      threshold = 1;
    }
    cleanup();
    const {
      left,
      top,
      width,
      height
    } = element.getBoundingClientRect();
    if (!skip) {
      onMove();
    }
    if (!width || !height) {
      return;
    }
    const insetTop = floor(top);
    const insetRight = floor(root.clientWidth - (left + width));
    const insetBottom = floor(root.clientHeight - (top + height));
    const insetLeft = floor(left);
    const rootMargin = -insetTop + "px " + -insetRight + "px " + -insetBottom + "px " + -insetLeft + "px";
    const options = {
      rootMargin,
      threshold: max(0, min(1, threshold)) || 1
    };
    let isFirstUpdate = true;
    function handleObserve(entries) {
      const ratio = entries[0].intersectionRatio;
      if (ratio !== threshold) {
        if (!isFirstUpdate) {
          return refresh();
        }
        if (!ratio) {
          // If the reference is clipped, the ratio is 0. Throttle the refresh
          // to prevent an infinite loop of updates.
          timeoutId = setTimeout(() => {
            refresh(false, 1e-7);
          }, 1000);
        } else {
          refresh(false, ratio);
        }
      }
      isFirstUpdate = false;
    }

    // Older browsers don't support a `document` as the root and will throw an
    // error.
    try {
      io = new IntersectionObserver(handleObserve, {
        ...options,
        // Handle <iframe>s
        root: root.ownerDocument
      });
    } catch (e) {
      io = new IntersectionObserver(handleObserve, options);
    }
    io.observe(element);
  }
  refresh(true);
  return cleanup;
}

/**
 * Automatically updates the position of the floating element when necessary.
 * Should only be called when the floating element is mounted on the DOM or
 * visible on the screen.
 * @returns cleanup function that should be invoked when the floating element is
 * removed from the DOM or hidden from the screen.
 * @see https://floating-ui.com/docs/autoUpdate
 */
function autoUpdate(reference, floating, update, options) {
  if (options === void 0) {
    options = {};
  }
  const {
    ancestorScroll = true,
    ancestorResize = true,
    elementResize = typeof ResizeObserver === 'function',
    layoutShift = typeof IntersectionObserver === 'function',
    animationFrame = false
  } = options;
  const referenceEl = unwrapElement(reference);
  const ancestors = ancestorScroll || ancestorResize ? [...(referenceEl ? getOverflowAncestors(referenceEl) : []), ...getOverflowAncestors(floating)] : [];
  ancestors.forEach(ancestor => {
    ancestorScroll && ancestor.addEventListener('scroll', update, {
      passive: true
    });
    ancestorResize && ancestor.addEventListener('resize', update);
  });
  const cleanupIo = referenceEl && layoutShift ? observeMove(referenceEl, update) : null;
  let reobserveFrame = -1;
  let resizeObserver = null;
  if (elementResize) {
    resizeObserver = new ResizeObserver(_ref => {
      let [firstEntry] = _ref;
      if (firstEntry && firstEntry.target === referenceEl && resizeObserver) {
        // Prevent update loops when using the `size` middleware.
        // https://github.com/floating-ui/floating-ui/issues/1740
        resizeObserver.unobserve(floating);
        cancelAnimationFrame(reobserveFrame);
        reobserveFrame = requestAnimationFrame(() => {
          var _resizeObserver;
          (_resizeObserver = resizeObserver) == null || _resizeObserver.observe(floating);
        });
      }
      update();
    });
    if (referenceEl && !animationFrame) {
      resizeObserver.observe(referenceEl);
    }
    resizeObserver.observe(floating);
  }
  let frameId;
  let prevRefRect = animationFrame ? getBoundingClientRect(reference) : null;
  if (animationFrame) {
    frameLoop();
  }
  function frameLoop() {
    const nextRefRect = getBoundingClientRect(reference);
    if (prevRefRect && (nextRefRect.x !== prevRefRect.x || nextRefRect.y !== prevRefRect.y || nextRefRect.width !== prevRefRect.width || nextRefRect.height !== prevRefRect.height)) {
      update();
    }
    prevRefRect = nextRefRect;
    frameId = requestAnimationFrame(frameLoop);
  }
  update();
  return () => {
    var _resizeObserver2;
    ancestors.forEach(ancestor => {
      ancestorScroll && ancestor.removeEventListener('scroll', update);
      ancestorResize && ancestor.removeEventListener('resize', update);
    });
    cleanupIo == null || cleanupIo();
    (_resizeObserver2 = resizeObserver) == null || _resizeObserver2.disconnect();
    resizeObserver = null;
    if (animationFrame) {
      cancelAnimationFrame(frameId);
    }
  };
}

/**
 * Modifies the placement by translating the floating element along the
 * specified axes.
 * A number (shorthand for `mainAxis` or distance), or an axes configuration
 * object may be passed.
 * @see https://floating-ui.com/docs/offset
 */
const offset = offset$1;

/**
 * Optimizes the visibility of the floating element by shifting it in order to
 * keep it in view when it will overflow the clipping boundary.
 * @see https://floating-ui.com/docs/shift
 */
const shift = shift$1;

/**
 * Optimizes the visibility of the floating element by flipping the `placement`
 * in order to keep it in view when the preferred placement(s) will overflow the
 * clipping boundary. Alternative to `autoPlacement`.
 * @see https://floating-ui.com/docs/flip
 */
const flip = flip$1;

/**
 * Provides data that allows you to change the size of the floating element —
 * for instance, prevent it from overflowing the clipping boundary or match the
 * width of the reference element.
 * @see https://floating-ui.com/docs/size
 */
const size = size$1;

/**
 * Provides data to hide the floating element in applicable situations, such as
 * when it is not in the same clipping context as the reference element.
 * @see https://floating-ui.com/docs/hide
 */
const hide = hide$1;

/**
 * Provides data to position an inner element of the floating element so that it
 * appears centered to the reference element.
 * @see https://floating-ui.com/docs/arrow
 */
const arrow = arrow$1;

/**
 * Computes the `x` and `y` coordinates that will place the floating element
 * next to a given reference element.
 */
const computePosition = (reference, floating, options) => {
  // This caches the expensive `getClippingElementAncestors` function so that
  // multiple lifecycle resets re-use the same result. It only lives for a
  // single call. If other functions become expensive, we can add them as well.
  const cache = new Map();
  const mergedOptions = {
    platform,
    ...options
  };
  const platformWithCache = {
    ...mergedOptions.platform,
    _c: cache
  };
  return computePosition$1(reference, floating, {
    ...mergedOptions,
    platform: platformWithCache
  });
};

var PopperContext = solidJs.createContext();
function usePopperContext() {
  const context = solidJs.useContext(PopperContext);
  if (context === void 0) {
    throw new Error("[kobalte]: `usePopperContext` must be used within a `Popper` component");
  }
  return context;
}

// src/popper/popper-arrow.tsx
var _tmpl$$c = /* @__PURE__ */ web.template(`<svg display="block" viewBox="0 0 30 30" style="transform:scale(1.02)"><g><path fill="none" d="M23,27.8c1.1,1.2,3.4,2.2,5,2.2h2H0h2c1.7,0,3.9-1,5-2.2l6.6-7.2c0.7-0.8,2-0.8,2.7,0L23,27.8L23,27.8z"></path><path stroke="none" d="M23,27.8c1.1,1.2,3.4,2.2,5,2.2h2H0h2c1.7,0,3.9-1,5-2.2l6.6-7.2c0.7-0.8,2-0.8,2.7,0L23,27.8L23,27.8z">`);
var DEFAULT_SIZE = 30;
var HALF_DEFAULT_SIZE = DEFAULT_SIZE / 2;
var ROTATION_DEG = {
  top: 180,
  right: -90,
  bottom: 0,
  left: 90
};
function PopperArrow(props) {
  const context = usePopperContext();
  const mergedProps = mergeDefaultProps({
    size: DEFAULT_SIZE
  }, props);
  const [local, others] = solidJs.splitProps(mergedProps, ["ref", "style", "size"]);
  const dir = () => context.currentPlacement().split("-")[0];
  const contentStyle = createComputedStyle(context.contentRef);
  const fill = () => contentStyle()?.getPropertyValue("background-color") || "none";
  const stroke = () => contentStyle()?.getPropertyValue(`border-${dir()}-color`) || "none";
  const borderWidth = () => contentStyle()?.getPropertyValue(`border-${dir()}-width`) || "0px";
  const strokeWidth = () => {
    return Number.parseInt(borderWidth()) * 2 * (DEFAULT_SIZE / local.size);
  };
  const rotate = () => {
    return `rotate(${ROTATION_DEG[dir()]} ${HALF_DEFAULT_SIZE} ${HALF_DEFAULT_SIZE}) translate(0 2)`;
  };
  return web.createComponent(Polymorphic, web.mergeProps({
    as: "div",
    ref(r$) {
      const _ref$ = mergeRefs(context.setArrowRef, local.ref);
      typeof _ref$ === "function" && _ref$(r$);
    },
    "aria-hidden": "true",
    get style() {
      return combineStyle({
        // server side rendering
        position: "absolute",
        "font-size": `${local.size}px`,
        width: "1em",
        height: "1em",
        "pointer-events": "none",
        fill: fill(),
        stroke: stroke(),
        "stroke-width": strokeWidth()
      }, local.style);
    }
  }, others, {
    get children() {
      const _el$ = _tmpl$$c(), _el$2 = _el$.firstChild;
      web.effect(() => web.setAttribute(_el$2, "transform", rotate()));
      return _el$;
    }
  }));
}
function createComputedStyle(element) {
  const [style, setStyle] = solidJs.createSignal();
  solidJs.createEffect(() => {
    const el = element();
    el && setStyle(getWindow$1(el).getComputedStyle(el));
  });
  return style;
}
function PopperPositioner(props) {
  const context = usePopperContext();
  const [local, others] = solidJs.splitProps(props, ["ref", "style"]);
  return web.createComponent(Polymorphic, web.mergeProps({
    as: "div",
    ref(r$) {
      const _ref$ = mergeRefs(context.setPositionerRef, local.ref);
      typeof _ref$ === "function" && _ref$(r$);
    },
    "data-popper-positioner": "",
    get style() {
      return combineStyle({
        position: "absolute",
        top: 0,
        left: 0,
        "min-width": "max-content"
      }, local.style);
    }
  }, others));
}

// src/popper/utils.ts
function createDOMRect(anchorRect) {
  const { x = 0, y = 0, width = 0, height = 0 } = anchorRect ?? {};
  if (typeof DOMRect === "function") {
    return new DOMRect(x, y, width, height);
  }
  const rect = {
    x,
    y,
    width,
    height,
    top: y,
    right: x + width,
    bottom: y + height,
    left: x
  };
  return { ...rect, toJSON: () => rect };
}
function getAnchorElement(anchor, getAnchorRect) {
  const contextElement = anchor;
  return {
    contextElement,
    getBoundingClientRect: () => {
      const anchorRect = getAnchorRect(anchor);
      if (anchorRect) {
        return createDOMRect(anchorRect);
      }
      if (anchor) {
        return anchor.getBoundingClientRect();
      }
      return createDOMRect();
    }
  };
}
function isValidPlacement(flip2) {
  return /^(?:top|bottom|left|right)(?:-(?:start|end))?$/.test(flip2);
}
var REVERSE_BASE_PLACEMENT = {
  top: "bottom",
  right: "left",
  bottom: "top",
  left: "right"
};
function getTransformOrigin(placement, readingDirection) {
  const [basePlacement, alignment] = placement.split("-");
  const reversePlacement = REVERSE_BASE_PLACEMENT[basePlacement];
  if (!alignment) {
    return `${reversePlacement} center`;
  }
  if (basePlacement === "left" || basePlacement === "right") {
    return `${reversePlacement} ${alignment === "start" ? "top" : "bottom"}`;
  }
  if (alignment === "start") {
    return `${reversePlacement} ${readingDirection === "rtl" ? "right" : "left"}`;
  }
  return `${reversePlacement} ${readingDirection === "rtl" ? "left" : "right"}`;
}

// src/popper/popper-root.tsx
function PopperRoot(props) {
  const mergedProps = mergeDefaultProps({
    getAnchorRect: (anchor) => anchor?.getBoundingClientRect(),
    placement: "bottom",
    gutter: 0,
    shift: 0,
    flip: true,
    slide: true,
    overlap: false,
    sameWidth: false,
    fitViewport: false,
    hideWhenDetached: false,
    detachedPadding: 0,
    arrowPadding: 4,
    overflowPadding: 8
  }, props);
  const [positionerRef, setPositionerRef] = solidJs.createSignal();
  const [arrowRef, setArrowRef] = solidJs.createSignal();
  const [currentPlacement, setCurrentPlacement] = solidJs.createSignal(mergedProps.placement);
  const anchorRef = () => getAnchorElement(mergedProps.anchorRef?.(), mergedProps.getAnchorRect);
  const {
    direction
  } = useLocale();
  async function updatePosition() {
    const referenceEl = anchorRef();
    const floatingEl = positionerRef();
    const arrowEl = arrowRef();
    if (!referenceEl || !floatingEl) {
      return;
    }
    const arrowOffset = (arrowEl?.clientHeight || 0) / 2;
    const finalGutter = typeof mergedProps.gutter === "number" ? mergedProps.gutter + arrowOffset : mergedProps.gutter ?? arrowOffset;
    floatingEl.style.setProperty("--kb-popper-content-overflow-padding", `${mergedProps.overflowPadding}px`);
    referenceEl.getBoundingClientRect();
    const middleware = [
      // https://floating-ui.com/docs/offset
      offset(({
        placement
      }) => {
        const hasAlignment = !!placement.split("-")[1];
        return {
          mainAxis: finalGutter,
          crossAxis: !hasAlignment ? mergedProps.shift : void 0,
          alignmentAxis: mergedProps.shift
        };
      })
    ];
    if (mergedProps.flip !== false) {
      const fallbackPlacements = typeof mergedProps.flip === "string" ? mergedProps.flip.split(" ") : void 0;
      if (fallbackPlacements !== void 0 && !fallbackPlacements.every(isValidPlacement)) {
        throw new Error("`flip` expects a spaced-delimited list of placements");
      }
      middleware.push(flip({
        padding: mergedProps.overflowPadding,
        fallbackPlacements
      }));
    }
    if (mergedProps.slide || mergedProps.overlap) {
      middleware.push(shift({
        mainAxis: mergedProps.slide,
        crossAxis: mergedProps.overlap,
        padding: mergedProps.overflowPadding
      }));
    }
    middleware.push(size({
      padding: mergedProps.overflowPadding,
      apply({
        availableWidth,
        availableHeight,
        rects
      }) {
        const referenceWidth = Math.round(rects.reference.width);
        availableWidth = Math.floor(availableWidth);
        availableHeight = Math.floor(availableHeight);
        floatingEl.style.setProperty("--kb-popper-anchor-width", `${referenceWidth}px`);
        floatingEl.style.setProperty("--kb-popper-content-available-width", `${availableWidth}px`);
        floatingEl.style.setProperty("--kb-popper-content-available-height", `${availableHeight}px`);
        if (mergedProps.sameWidth) {
          floatingEl.style.width = `${referenceWidth}px`;
        }
        if (mergedProps.fitViewport) {
          floatingEl.style.maxWidth = `${availableWidth}px`;
          floatingEl.style.maxHeight = `${availableHeight}px`;
        }
      }
    }));
    if (mergedProps.hideWhenDetached) {
      middleware.push(hide({
        padding: mergedProps.detachedPadding
      }));
    }
    if (arrowEl) {
      middleware.push(arrow({
        element: arrowEl,
        padding: mergedProps.arrowPadding
      }));
    }
    const pos = await computePosition(referenceEl, floatingEl, {
      placement: mergedProps.placement,
      strategy: "absolute",
      middleware,
      platform: {
        ...platform,
        isRTL: () => direction() === "rtl"
      }
    });
    setCurrentPlacement(pos.placement);
    mergedProps.onCurrentPlacementChange?.(pos.placement);
    if (!floatingEl) {
      return;
    }
    floatingEl.style.setProperty("--kb-popper-content-transform-origin", getTransformOrigin(pos.placement, direction()));
    const x = Math.round(pos.x);
    const y = Math.round(pos.y);
    let visibility;
    if (mergedProps.hideWhenDetached) {
      visibility = pos.middlewareData.hide?.referenceHidden ? "hidden" : "visible";
    }
    Object.assign(floatingEl.style, {
      top: "0",
      left: "0",
      transform: `translate3d(${x}px, ${y}px, 0)`,
      visibility
    });
    if (arrowEl && pos.middlewareData.arrow) {
      const {
        x: arrowX,
        y: arrowY
      } = pos.middlewareData.arrow;
      const dir = pos.placement.split("-")[0];
      Object.assign(arrowEl.style, {
        left: arrowX != null ? `${arrowX}px` : "",
        top: arrowY != null ? `${arrowY}px` : "",
        [dir]: "100%"
      });
    }
  }
  solidJs.createEffect(() => {
    const referenceEl = anchorRef();
    const floatingEl = positionerRef();
    if (!referenceEl || !floatingEl) {
      return;
    }
    const cleanupAutoUpdate = autoUpdate(referenceEl, floatingEl, updatePosition, {
      // JSDOM doesn't support ResizeObserver
      elementResize: typeof ResizeObserver === "function"
    });
    solidJs.onCleanup(cleanupAutoUpdate);
  });
  solidJs.createEffect(() => {
    const positioner = positionerRef();
    const content = mergedProps.contentRef?.();
    if (!positioner || !content) {
      return;
    }
    queueMicrotask(() => {
      positioner.style.zIndex = getComputedStyle(content).zIndex;
    });
  });
  const context = {
    currentPlacement,
    contentRef: () => mergedProps.contentRef?.(),
    setPositionerRef,
    setArrowRef
  };
  return web.createComponent(PopperContext.Provider, {
    value: context,
    get children() {
      return mergedProps.children;
    }
  });
}

// src/popper/index.tsx
var Popper = Object.assign(PopperRoot, {
  Arrow: PopperArrow,
  Context: PopperContext,
  usePopperContext,
  Positioner: PopperPositioner
});

// src/dismissable-layer/layer-stack.tsx
var DATA_TOP_LAYER_ATTR = "data-kb-top-layer";
var originalBodyPointerEvents;
var hasDisabledBodyPointerEvents = false;
var layers = [];
function indexOf(node) {
  return layers.findIndex((layer) => layer.node === node);
}
function find(node) {
  return layers[indexOf(node)];
}
function isTopMostLayer(node) {
  return layers[layers.length - 1].node === node;
}
function getPointerBlockingLayers() {
  return layers.filter((layer) => layer.isPointerBlocking);
}
function getTopMostPointerBlockingLayer() {
  return [...getPointerBlockingLayers()].slice(-1)[0];
}
function hasPointerBlockingLayer() {
  return getPointerBlockingLayers().length > 0;
}
function isBelowPointerBlockingLayer(node) {
  const highestBlockingIndex = indexOf(getTopMostPointerBlockingLayer()?.node);
  return indexOf(node) < highestBlockingIndex;
}
function addLayer(layer) {
  layers.push(layer);
}
function removeLayer(node) {
  const index = indexOf(node);
  if (index < 0) {
    return;
  }
  layers.splice(index, 1);
}
function assignPointerEventToLayers() {
  for (const {
    node
  } of layers) {
    node.style.pointerEvents = isBelowPointerBlockingLayer(node) ? "none" : "auto";
  }
}
function disableBodyPointerEvents(node) {
  if (hasPointerBlockingLayer() && !hasDisabledBodyPointerEvents) {
    const ownerDocument = getDocument(node);
    originalBodyPointerEvents = document.body.style.pointerEvents;
    ownerDocument.body.style.pointerEvents = "none";
    hasDisabledBodyPointerEvents = true;
  }
}
function restoreBodyPointerEvents(node) {
  if (hasPointerBlockingLayer()) {
    return;
  }
  const ownerDocument = getDocument(node);
  ownerDocument.body.style.pointerEvents = originalBodyPointerEvents;
  if (ownerDocument.body.style.length === 0) {
    ownerDocument.body.removeAttribute("style");
  }
  hasDisabledBodyPointerEvents = false;
}
var layerStack = {
  layers,
  isTopMostLayer,
  hasPointerBlockingLayer,
  isBelowPointerBlockingLayer,
  addLayer,
  removeLayer,
  indexOf,
  find,
  assignPointerEventToLayers,
  disableBodyPointerEvents,
  restoreBodyPointerEvents
};

var AUTOFOCUS_ON_MOUNT_EVENT = "focusScope.autoFocusOnMount";
var AUTOFOCUS_ON_UNMOUNT_EVENT = "focusScope.autoFocusOnUnmount";
var EVENT_OPTIONS = {
  bubbles: false,
  cancelable: true
};
var focusScopeStack = {
  /** A stack of focus scopes, with the active one at the top */
  stack: [],
  active() {
    return this.stack[0];
  },
  add(scope) {
    if (scope !== this.active()) {
      this.active()?.pause();
    }
    this.stack = removeItemFromArray(this.stack, scope);
    this.stack.unshift(scope);
  },
  remove(scope) {
    this.stack = removeItemFromArray(this.stack, scope);
    this.active()?.resume();
  }
};
function createFocusScope(props, ref) {
  const [isPaused, setIsPaused] = solidJs.createSignal(false);
  const focusScope = {
    pause() {
      setIsPaused(true);
    },
    resume() {
      setIsPaused(false);
    }
  };
  let lastFocusedElement = null;
  const onMountAutoFocus = (e) => props.onMountAutoFocus?.(e);
  const onUnmountAutoFocus = (e) => props.onUnmountAutoFocus?.(e);
  const ownerDocument = () => getDocument(ref());
  const createSentinel = () => {
    const element = ownerDocument().createElement("span");
    element.setAttribute("data-focus-trap", "");
    element.tabIndex = 0;
    Object.assign(element.style, visuallyHiddenStyles);
    return element;
  };
  const tabbables = () => {
    const container = ref();
    if (!container) {
      return [];
    }
    return getAllTabbableIn(container, true).filter((el) => !el.hasAttribute("data-focus-trap"));
  };
  const firstTabbable = () => {
    const items = tabbables();
    return items.length > 0 ? items[0] : null;
  };
  const lastTabbable = () => {
    const items = tabbables();
    return items.length > 0 ? items[items.length - 1] : null;
  };
  const shouldPreventUnmountAutoFocus = () => {
    const container = ref();
    if (!container) {
      return false;
    }
    const activeElement = getActiveElement(container);
    if (!activeElement) {
      return false;
    }
    if (contains$1(container, activeElement)) {
      return false;
    }
    return isFocusable(activeElement);
  };
  solidJs.createEffect(() => {
    if (web.isServer) {
      return;
    }
    const container = ref();
    if (!container) {
      return;
    }
    focusScopeStack.add(focusScope);
    const previouslyFocusedElement = getActiveElement(container);
    const hasFocusedCandidate = contains$1(container, previouslyFocusedElement);
    if (!hasFocusedCandidate) {
      const mountEvent = new CustomEvent(AUTOFOCUS_ON_MOUNT_EVENT, EVENT_OPTIONS);
      container.addEventListener(AUTOFOCUS_ON_MOUNT_EVENT, onMountAutoFocus);
      container.dispatchEvent(mountEvent);
      if (!mountEvent.defaultPrevented) {
        setTimeout(() => {
          focusWithoutScrolling(firstTabbable());
          if (getActiveElement(container) === previouslyFocusedElement) {
            focusWithoutScrolling(container);
          }
        }, 0);
      }
    }
    solidJs.onCleanup(() => {
      container.removeEventListener(AUTOFOCUS_ON_MOUNT_EVENT, onMountAutoFocus);
      setTimeout(() => {
        const unmountEvent = new CustomEvent(AUTOFOCUS_ON_UNMOUNT_EVENT, EVENT_OPTIONS);
        if (shouldPreventUnmountAutoFocus()) {
          unmountEvent.preventDefault();
        }
        container.addEventListener(AUTOFOCUS_ON_UNMOUNT_EVENT, onUnmountAutoFocus);
        container.dispatchEvent(unmountEvent);
        if (!unmountEvent.defaultPrevented) {
          focusWithoutScrolling(previouslyFocusedElement ?? ownerDocument().body);
        }
        container.removeEventListener(AUTOFOCUS_ON_UNMOUNT_EVENT, onUnmountAutoFocus);
        focusScopeStack.remove(focusScope);
      }, 0);
    });
  });
  solidJs.createEffect(() => {
    if (web.isServer) {
      return;
    }
    const container = ref();
    if (!container || !access$1(props.trapFocus) || isPaused()) {
      return;
    }
    const onFocusIn = (event) => {
      const target = event.target;
      if (target?.closest(`[${DATA_TOP_LAYER_ATTR}]`)) {
        return;
      }
      if (contains$1(container, target)) {
        lastFocusedElement = target;
      } else {
        focusWithoutScrolling(lastFocusedElement);
      }
    };
    const onFocusOut = (event) => {
      const relatedTarget = event.relatedTarget;
      const target = relatedTarget ?? getActiveElement(container);
      if (target?.closest(`[${DATA_TOP_LAYER_ATTR}]`)) {
        return;
      }
      if (!contains$1(container, target)) {
        focusWithoutScrolling(lastFocusedElement);
      }
    };
    ownerDocument().addEventListener("focusin", onFocusIn);
    ownerDocument().addEventListener("focusout", onFocusOut);
    solidJs.onCleanup(() => {
      ownerDocument().removeEventListener("focusin", onFocusIn);
      ownerDocument().removeEventListener("focusout", onFocusOut);
    });
  });
  solidJs.createEffect(() => {
    if (web.isServer) {
      return;
    }
    const container = ref();
    if (!container || !access$1(props.trapFocus) || isPaused()) {
      return;
    }
    const startSentinel = createSentinel();
    container.insertAdjacentElement("afterbegin", startSentinel);
    const endSentinel = createSentinel();
    container.insertAdjacentElement("beforeend", endSentinel);
    function onFocus(event) {
      const first = firstTabbable();
      const last = lastTabbable();
      if (event.relatedTarget === first) {
        focusWithoutScrolling(last);
      } else {
        focusWithoutScrolling(first);
      }
    }
    startSentinel.addEventListener("focusin", onFocus);
    endSentinel.addEventListener("focusin", onFocus);
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.previousSibling === endSentinel) {
          endSentinel.remove();
          container.insertAdjacentElement("beforeend", endSentinel);
        }
        if (mutation.nextSibling === startSentinel) {
          startSentinel.remove();
          container.insertAdjacentElement("afterbegin", startSentinel);
        }
      }
    });
    observer.observe(container, {
      childList: true,
      subtree: false
    });
    solidJs.onCleanup(() => {
      startSentinel.removeEventListener("focusin", onFocus);
      endSentinel.removeEventListener("focusin", onFocus);
      startSentinel.remove();
      endSentinel.remove();
      observer.disconnect();
    });
  });
}

var DATA_LIVE_ANNOUNCER_ATTR = "data-live-announcer";

function createHideOutside(props) {
  solidJs.createEffect(() => {
    if (access$1(props.isDisabled)) {
      return;
    }
    solidJs.onCleanup(ariaHideOutside(access$1(props.targets), access$1(props.root)));
  });
}
var refCountMap = /* @__PURE__ */ new WeakMap();
var observerStack = [];
function ariaHideOutside(targets, root = document.body) {
  const visibleNodes = new Set(targets);
  const hiddenNodes = /* @__PURE__ */ new Set();
  const walk = (root2) => {
    for (const element of root2.querySelectorAll(
      `[${DATA_LIVE_ANNOUNCER_ATTR}], [${DATA_TOP_LAYER_ATTR}]`
    )) {
      visibleNodes.add(element);
    }
    const acceptNode = (node) => {
      if (visibleNodes.has(node) || node.parentElement && hiddenNodes.has(node.parentElement) && node.parentElement.getAttribute("role") !== "row") {
        return NodeFilter.FILTER_REJECT;
      }
      for (const target of visibleNodes) {
        if (node.contains(target)) {
          return NodeFilter.FILTER_SKIP;
        }
      }
      return NodeFilter.FILTER_ACCEPT;
    };
    const walker = document.createTreeWalker(root2, NodeFilter.SHOW_ELEMENT, {
      acceptNode
    });
    const acceptRoot = acceptNode(root2);
    if (acceptRoot === NodeFilter.FILTER_ACCEPT) {
      hide(root2);
    }
    if (acceptRoot !== NodeFilter.FILTER_REJECT) {
      let node = walker.nextNode();
      while (node != null) {
        hide(node);
        node = walker.nextNode();
      }
    }
  };
  const hide = (node) => {
    const refCount = refCountMap.get(node) ?? 0;
    if (node.getAttribute("aria-hidden") === "true" && refCount === 0) {
      return;
    }
    if (refCount === 0) {
      node.setAttribute("aria-hidden", "true");
    }
    hiddenNodes.add(node);
    refCountMap.set(node, refCount + 1);
  };
  if (observerStack.length) {
    observerStack[observerStack.length - 1].disconnect();
  }
  walk(root);
  const observer = new MutationObserver((changes) => {
    for (const change of changes) {
      if (change.type !== "childList" || change.addedNodes.length === 0) {
        continue;
      }
      if (![...visibleNodes, ...hiddenNodes].some(
        (node) => node.contains(change.target)
      )) {
        for (const node of change.removedNodes) {
          if (node instanceof Element) {
            visibleNodes.delete(node);
            hiddenNodes.delete(node);
          }
        }
        for (const node of change.addedNodes) {
          if ((node instanceof HTMLElement || node instanceof SVGElement) && (node.dataset.liveAnnouncer === "true" || node.dataset.reactAriaTopLayer === "true")) {
            visibleNodes.add(node);
          } else if (node instanceof Element) {
            walk(node);
          }
        }
      }
    }
  });
  observer.observe(root, { childList: true, subtree: true });
  const observerWrapper = {
    observe() {
      observer.observe(root, { childList: true, subtree: true });
    },
    disconnect() {
      observer.disconnect();
    }
  };
  observerStack.push(observerWrapper);
  return () => {
    observer.disconnect();
    for (const node of hiddenNodes) {
      const count = refCountMap.get(node);
      if (count == null) {
        return;
      }
      if (count === 1) {
        node.removeAttribute("aria-hidden");
        refCountMap.delete(node);
      } else {
        refCountMap.set(node, count - 1);
      }
    }
    if (observerWrapper === observerStack[observerStack.length - 1]) {
      observerStack.pop();
      if (observerStack.length) {
        observerStack[observerStack.length - 1].observe();
      }
    } else {
      observerStack.splice(observerStack.indexOf(observerWrapper), 1);
    }
  };
}

// src/primitives/create-escape-key-down/create-escape-key-down.ts
function createEscapeKeyDown(props) {
  const handleKeyDown = (event) => {
    if (event.key === EventKey.Escape) {
      props.onEscapeKeyDown?.(event);
    }
  };
  solidJs.createEffect(() => {
    if (web.isServer) {
      return;
    }
    if (access$1(props.isDisabled)) {
      return;
    }
    const document = props.ownerDocument?.() ?? getDocument();
    document.addEventListener("keydown", handleKeyDown);
    solidJs.onCleanup(() => {
      document.removeEventListener("keydown", handleKeyDown);
    });
  });
}

var POINTER_DOWN_OUTSIDE_EVENT = "interactOutside.pointerDownOutside";
var FOCUS_OUTSIDE_EVENT = "interactOutside.focusOutside";
function createInteractOutside(props, ref) {
  let pointerDownTimeoutId;
  let clickHandler = noop$1;
  const ownerDocument = () => getDocument(ref());
  const onPointerDownOutside = (e) => props.onPointerDownOutside?.(e);
  const onFocusOutside = (e) => props.onFocusOutside?.(e);
  const onInteractOutside = (e) => props.onInteractOutside?.(e);
  const isEventOutside = (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) {
      return false;
    }
    if (target.closest(`[${DATA_TOP_LAYER_ATTR}]`)) {
      return false;
    }
    if (!contains$1(ownerDocument(), target)) {
      return false;
    }
    if (contains$1(ref(), target)) {
      return false;
    }
    return !props.shouldExcludeElement?.(target);
  };
  const onPointerDown = (e) => {
    function handler() {
      const container = ref();
      const target = e.target;
      if (!container || !target || !isEventOutside(e)) {
        return;
      }
      const handler2 = composeEventHandlers([
        onPointerDownOutside,
        onInteractOutside
      ]);
      target.addEventListener(POINTER_DOWN_OUTSIDE_EVENT, handler2, {
        once: true
      });
      const pointerDownOutsideEvent = new CustomEvent(
        POINTER_DOWN_OUTSIDE_EVENT,
        {
          bubbles: false,
          cancelable: true,
          detail: {
            originalEvent: e,
            isContextMenu: e.button === 2 || isCtrlKey(e) && e.button === 0
          }
        }
      );
      target.dispatchEvent(pointerDownOutsideEvent);
    }
    if (e.pointerType === "touch") {
      ownerDocument().removeEventListener("click", handler);
      clickHandler = handler;
      ownerDocument().addEventListener("click", handler, { once: true });
    } else {
      handler();
    }
  };
  const onFocusIn = (e) => {
    const container = ref();
    const target = e.target;
    if (!container || !target || !isEventOutside(e)) {
      return;
    }
    const handler = composeEventHandlers([
      onFocusOutside,
      onInteractOutside
    ]);
    target.addEventListener(FOCUS_OUTSIDE_EVENT, handler, { once: true });
    const focusOutsideEvent = new CustomEvent(FOCUS_OUTSIDE_EVENT, {
      bubbles: false,
      cancelable: true,
      detail: {
        originalEvent: e,
        isContextMenu: false
      }
    });
    target.dispatchEvent(focusOutsideEvent);
  };
  solidJs.createEffect(() => {
    if (web.isServer) {
      return;
    }
    if (access$1(props.isDisabled)) {
      return;
    }
    pointerDownTimeoutId = window.setTimeout(() => {
      ownerDocument().addEventListener("pointerdown", onPointerDown, true);
    }, 0);
    ownerDocument().addEventListener("focusin", onFocusIn, true);
    solidJs.onCleanup(() => {
      window.clearTimeout(pointerDownTimeoutId);
      ownerDocument().removeEventListener("click", clickHandler);
      ownerDocument().removeEventListener("pointerdown", onPointerDown, true);
      ownerDocument().removeEventListener("focusin", onFocusIn, true);
    });
  });
}

var DismissableLayerContext = solidJs.createContext();
function useOptionalDismissableLayerContext() {
  return solidJs.useContext(DismissableLayerContext);
}

// src/dismissable-layer/dismissable-layer.tsx
function DismissableLayer(props) {
  let ref;
  const parentContext = useOptionalDismissableLayerContext();
  const [local, others] = solidJs.splitProps(props, ["ref", "disableOutsidePointerEvents", "excludedElements", "onEscapeKeyDown", "onPointerDownOutside", "onFocusOutside", "onInteractOutside", "onDismiss", "bypassTopMostLayerCheck"]);
  const nestedLayers = /* @__PURE__ */ new Set([]);
  const registerNestedLayer = (element) => {
    nestedLayers.add(element);
    const parentUnregister = parentContext?.registerNestedLayer(element);
    return () => {
      nestedLayers.delete(element);
      parentUnregister?.();
    };
  };
  const shouldExcludeElement = (element) => {
    if (!ref) {
      return false;
    }
    return local.excludedElements?.some((node) => contains$1(node(), element)) || [...nestedLayers].some((layer) => contains$1(layer, element));
  };
  const onPointerDownOutside = (e) => {
    if (!ref || layerStack.isBelowPointerBlockingLayer(ref)) {
      return;
    }
    if (!local.bypassTopMostLayerCheck && !layerStack.isTopMostLayer(ref)) {
      return;
    }
    local.onPointerDownOutside?.(e);
    local.onInteractOutside?.(e);
    if (!e.defaultPrevented) {
      local.onDismiss?.();
    }
  };
  const onFocusOutside = (e) => {
    local.onFocusOutside?.(e);
    local.onInteractOutside?.(e);
    if (!e.defaultPrevented) {
      local.onDismiss?.();
    }
  };
  createInteractOutside({
    shouldExcludeElement,
    onPointerDownOutside,
    onFocusOutside
  }, () => ref);
  createEscapeKeyDown({
    ownerDocument: () => getDocument(ref),
    onEscapeKeyDown: (e) => {
      if (!ref || !layerStack.isTopMostLayer(ref)) {
        return;
      }
      local.onEscapeKeyDown?.(e);
      if (!e.defaultPrevented && local.onDismiss) {
        e.preventDefault();
        local.onDismiss();
      }
    }
  });
  solidJs.onMount(() => {
    if (!ref) {
      return;
    }
    layerStack.addLayer({
      node: ref,
      isPointerBlocking: local.disableOutsidePointerEvents,
      dismiss: local.onDismiss
    });
    const unregisterFromParentLayer = parentContext?.registerNestedLayer(ref);
    layerStack.assignPointerEventToLayers();
    layerStack.disableBodyPointerEvents(ref);
    solidJs.onCleanup(() => {
      if (!ref) {
        return;
      }
      layerStack.removeLayer(ref);
      unregisterFromParentLayer?.();
      layerStack.assignPointerEventToLayers();
      layerStack.restoreBodyPointerEvents(ref);
    });
  });
  solidJs.createEffect(solidJs.on([() => ref, () => local.disableOutsidePointerEvents], ([ref2, disableOutsidePointerEvents]) => {
    if (!ref2) {
      return;
    }
    const layer = layerStack.find(ref2);
    if (layer && layer.isPointerBlocking !== disableOutsidePointerEvents) {
      layer.isPointerBlocking = disableOutsidePointerEvents;
      layerStack.assignPointerEventToLayers();
    }
    if (disableOutsidePointerEvents) {
      layerStack.disableBodyPointerEvents(ref2);
    }
    solidJs.onCleanup(() => {
      layerStack.restoreBodyPointerEvents(ref2);
    });
  }, {
    defer: true
  }));
  const context = {
    registerNestedLayer
  };
  return web.createComponent(DismissableLayerContext.Provider, {
    value: context,
    get children() {
      return web.createComponent(Polymorphic, web.mergeProps({
        as: "div",
        ref(r$) {
          const _ref$ = mergeRefs((el) => ref = el, local.ref);
          typeof _ref$ === "function" && _ref$(r$);
        }
      }, others));
    }
  });
}

// src/primitives/create-controllable-signal/create-controllable-signal.ts
function createControllableSignal(props) {
  const [_value, _setValue] = solidJs.createSignal(props.defaultValue?.());
  const isControlled = solidJs.createMemo(() => props.value?.() !== void 0);
  const value = solidJs.createMemo(() => isControlled() ? props.value?.() : _value());
  const setValue = (next) => {
    solidJs.untrack(() => {
      const nextValue = accessWith(next, value());
      if (!Object.is(nextValue, value())) {
        if (!isControlled()) {
          _setValue(nextValue);
        }
        props.onChange?.(nextValue);
      }
      return nextValue;
    });
  };
  return [value, setValue];
}
function createControllableBooleanSignal(props) {
  const [_value, setValue] = createControllableSignal(props);
  const value = () => _value() ?? false;
  return [value, setValue];
}

function createDisclosureState(props = {}) {
  const [isOpen, setIsOpen] = createControllableBooleanSignal({
    value: () => access$1(props.open),
    defaultValue: () => !!access$1(props.defaultOpen),
    onChange: (value) => props.onOpenChange?.(value)
  });
  const open = () => {
    setIsOpen(true);
  };
  const close = () => {
    setIsOpen(false);
  };
  const toggle = () => {
    isOpen() ? close() : open();
  };
  return {
    isOpen,
    setIsOpen,
    open,
    close,
    toggle
  };
}

// src/primitives/create-register-id/create-register-id.ts
function createRegisterId(setter) {
  return (id) => {
    setter(id);
    return () => setter(void 0);
  };
}

// src/reactivity/lib.ts
var access = (v) => typeof v === "function" ? v() : v;

// src/dom/lib.ts
var contains = (wrapper, target) => {
  if (wrapper.contains(target)) return true;
  let currentElement = target;
  while (currentElement) {
    if (currentElement === wrapper) return true;
    currentElement = currentElement._$host ?? currentElement.parentElement;
  }
  return false;
};

var activeStyles = /* @__PURE__ */ new Map();
var createStyle = (props) => {
  solidJs.createEffect(() => {
    const style = access(props.style) ?? {};
    const properties = access(props.properties) ?? [];
    const originalStyles = {};
    for (const key in style) {
      originalStyles[key] = props.element.style[key];
    }
    const activeStyle = activeStyles.get(props.key);
    if (activeStyle) {
      activeStyle.activeCount++;
    } else {
      activeStyles.set(props.key, {
        activeCount: 1,
        originalStyles,
        properties: properties.map((property) => property.key)
      });
    }
    Object.assign(props.element.style, props.style);
    for (const property of properties) {
      props.element.style.setProperty(property.key, property.value);
    }
    solidJs.onCleanup(() => {
      const activeStyle2 = activeStyles.get(props.key);
      if (!activeStyle2) return;
      if (activeStyle2.activeCount !== 1) {
        activeStyle2.activeCount--;
        return;
      }
      activeStyles.delete(props.key);
      for (const [key, value] of Object.entries(activeStyle2.originalStyles)) {
        props.element.style[key] = value;
      }
      for (const property of activeStyle2.properties) {
        props.element.style.removeProperty(property);
      }
      if (props.element.style.length === 0) {
        props.element.removeAttribute("style");
      }
      props.cleanup?.();
    });
  });
};
var style_default = createStyle;

// src/scroll/lib.ts
var getScrollDimensions = (element, axis) => {
  switch (axis) {
    case "x":
      return [element.clientWidth, element.scrollLeft, element.scrollWidth];
    case "y":
      return [element.clientHeight, element.scrollTop, element.scrollHeight];
  }
};
var isScrollContainer = (element, axis) => {
  const styles = getComputedStyle(element);
  const overflow = axis === "x" ? styles.overflowX : styles.overflowY;
  return overflow === "auto" || overflow === "scroll" || // The HTML element is a scroll container if it has overflow visible
  element.tagName === "HTML" && overflow === "visible";
};
var getScrollAtLocation = (location, axis, stopAt) => {
  const directionFactor = axis === "x" && window.getComputedStyle(location).direction === "rtl" ? -1 : 1;
  let currentElement = location;
  let availableScroll = 0;
  let availableScrollTop = 0;
  let wrapperReached = false;
  do {
    const [clientSize, scrollOffset, scrollSize] = getScrollDimensions(
      currentElement,
      axis
    );
    const scrolled = scrollSize - clientSize - directionFactor * scrollOffset;
    if ((scrollOffset !== 0 || scrolled !== 0) && isScrollContainer(currentElement, axis)) {
      availableScroll += scrolled;
      availableScrollTop += scrollOffset;
    }
    if (currentElement === (stopAt ?? document.documentElement)) {
      wrapperReached = true;
    } else {
      currentElement = currentElement._$host ?? currentElement.parentElement;
    }
  } while (currentElement && !wrapperReached);
  return [availableScroll, availableScrollTop];
};

// src/preventScroll.ts
var [preventScrollStack, setPreventScrollStack] = solidJs.createSignal([]);
var isActive = (id) => preventScrollStack().indexOf(id) === preventScrollStack().length - 1;
var createPreventScroll = (props) => {
  const defaultedProps = solidJs.mergeProps(
    {
      element: null,
      enabled: true,
      hideScrollbar: true,
      preventScrollbarShift: true,
      preventScrollbarShiftMode: "padding",
      restoreScrollPosition: true,
      allowPinchZoom: false
    },
    props
  );
  const preventScrollId = solidJs.createUniqueId();
  let currentTouchStart = [0, 0];
  let currentTouchStartAxis = null;
  let currentTouchStartDelta = null;
  solidJs.createEffect(() => {
    if (!access(defaultedProps.enabled)) return;
    setPreventScrollStack((stack) => [...stack, preventScrollId]);
    solidJs.onCleanup(() => {
      setPreventScrollStack(
        (stack) => stack.filter((id) => id !== preventScrollId)
      );
    });
  });
  solidJs.createEffect(() => {
    if (!access(defaultedProps.enabled) || !access(defaultedProps.hideScrollbar))
      return;
    const { body } = document;
    const scrollbarWidth = window.innerWidth - body.offsetWidth;
    if (access(defaultedProps.preventScrollbarShift)) {
      const style = { overflow: "hidden" };
      const properties = [];
      if (scrollbarWidth > 0) {
        if (access(defaultedProps.preventScrollbarShiftMode) === "padding") {
          style.paddingRight = `calc(${window.getComputedStyle(body).paddingRight} + ${scrollbarWidth}px)`;
        } else {
          style.marginRight = `calc(${window.getComputedStyle(body).marginRight} + ${scrollbarWidth}px)`;
        }
        properties.push({
          key: "--scrollbar-width",
          value: `${scrollbarWidth}px`
        });
      }
      const offsetTop = window.scrollY;
      const offsetLeft = window.scrollX;
      style_default({
        key: "prevent-scroll",
        element: body,
        style,
        properties,
        cleanup: () => {
          if (access(defaultedProps.restoreScrollPosition) && scrollbarWidth > 0) {
            window.scrollTo(offsetLeft, offsetTop);
          }
        }
      });
    } else {
      style_default({
        key: "prevent-scroll",
        element: body,
        style: {
          overflow: "hidden"
        }
      });
    }
  });
  solidJs.createEffect(() => {
    if (!isActive(preventScrollId) || !access(defaultedProps.enabled)) return;
    document.addEventListener("wheel", maybePreventWheel, {
      passive: false
    });
    document.addEventListener("touchstart", logTouchStart, {
      passive: false
    });
    document.addEventListener("touchmove", maybePreventTouch, {
      passive: false
    });
    solidJs.onCleanup(() => {
      document.removeEventListener("wheel", maybePreventWheel);
      document.removeEventListener("touchstart", logTouchStart);
      document.removeEventListener("touchmove", maybePreventTouch);
    });
  });
  const logTouchStart = (event) => {
    currentTouchStart = getTouchXY(event);
    currentTouchStartAxis = null;
    currentTouchStartDelta = null;
  };
  const maybePreventWheel = (event) => {
    const target = event.target;
    const wrapper = access(defaultedProps.element);
    const delta = getDeltaXY(event);
    const axis = Math.abs(delta[0]) > Math.abs(delta[1]) ? "x" : "y";
    const axisDelta = axis === "x" ? delta[0] : delta[1];
    const resultsInScroll = wouldScroll(target, axis, axisDelta, wrapper);
    let shouldCancel;
    if (wrapper && contains(wrapper, target)) {
      shouldCancel = !resultsInScroll;
    } else {
      shouldCancel = true;
    }
    if (shouldCancel && event.cancelable) {
      event.preventDefault();
    }
  };
  const maybePreventTouch = (event) => {
    const wrapper = access(defaultedProps.element);
    const target = event.target;
    let shouldCancel;
    if (event.touches.length === 2) {
      shouldCancel = !access(defaultedProps.allowPinchZoom);
    } else {
      if (currentTouchStartAxis == null || currentTouchStartDelta === null) {
        const delta = getTouchXY(event).map(
          (touch, i) => currentTouchStart[i] - touch
        );
        const axis = Math.abs(delta[0]) > Math.abs(delta[1]) ? "x" : "y";
        currentTouchStartAxis = axis;
        currentTouchStartDelta = axis === "x" ? delta[0] : delta[1];
      }
      if (target.type === "range") {
        shouldCancel = false;
      } else {
        const wouldResultInScroll = wouldScroll(
          target,
          currentTouchStartAxis,
          currentTouchStartDelta,
          wrapper
        );
        if (wrapper && contains(wrapper, target)) {
          shouldCancel = !wouldResultInScroll;
        } else {
          shouldCancel = true;
        }
      }
    }
    if (shouldCancel && event.cancelable) {
      event.preventDefault();
    }
  };
};
var getDeltaXY = (event) => [
  event.deltaX,
  event.deltaY
];
var getTouchXY = (event) => event.changedTouches[0] ? [event.changedTouches[0].clientX, event.changedTouches[0].clientY] : [0, 0];
var wouldScroll = (target, axis, delta, wrapper) => {
  const targetInWrapper = wrapper !== null && contains(wrapper, target);
  const [availableScroll, availableScrollTop] = getScrollAtLocation(
    target,
    axis,
    targetInWrapper ? wrapper : void 0
  );
  if (delta > 0 && Math.abs(availableScroll) <= 1) {
    return false;
  }
  if (delta < 0 && Math.abs(availableScrollTop) < 1) {
    return false;
  }
  return true;
};
var preventScroll_default = createPreventScroll;

// src/index.ts
var src_default$1 = preventScroll_default;

// src/presence.ts
var createPresence = (props) => {
  const refStyles = solidJs.createMemo(() => {
    const element = access(props.element);
    if (!element) return;
    return getComputedStyle(element);
  });
  const getAnimationName = () => {
    return refStyles()?.animationName ?? "none";
  };
  const [presentState, setPresentState] = solidJs.createSignal(access(props.show) ? "present" : "hidden");
  let animationName = "none";
  solidJs.createEffect((prevShow) => {
    const show = access(props.show);
    solidJs.untrack(() => {
      if (prevShow === show) return show;
      const prevAnimationName = animationName;
      const currentAnimationName = getAnimationName();
      if (show) {
        setPresentState("present");
      } else if (currentAnimationName === "none" || refStyles()?.display === "none") {
        setPresentState("hidden");
      } else {
        const isAnimating = prevAnimationName !== currentAnimationName;
        if (prevShow === true && isAnimating) {
          setPresentState("hiding");
        } else {
          setPresentState("hidden");
        }
      }
    });
    return show;
  });
  solidJs.createEffect(() => {
    const element = access(props.element);
    if (!element) return;
    const handleAnimationStart = (event) => {
      if (event.target === element) {
        animationName = getAnimationName();
      }
    };
    const handleAnimationEnd = (event) => {
      const currentAnimationName = getAnimationName();
      const isCurrentAnimation = currentAnimationName.includes(
        event.animationName
      );
      if (event.target === element && isCurrentAnimation && presentState() === "hiding") {
        setPresentState("hidden");
      }
    };
    element.addEventListener("animationstart", handleAnimationStart);
    element.addEventListener("animationcancel", handleAnimationEnd);
    element.addEventListener("animationend", handleAnimationEnd);
    solidJs.onCleanup(() => {
      element.removeEventListener("animationstart", handleAnimationStart);
      element.removeEventListener("animationcancel", handleAnimationEnd);
      element.removeEventListener("animationend", handleAnimationEnd);
    });
  });
  return {
    present: () => presentState() === "present" || presentState() === "hiding",
    state: presentState,
    setState: setPresentState
  };
};
var presence_default = createPresence;

// src/index.ts
var src_default = presence_default;

// src/popover/index.tsx
var popover_exports = {};
__export(popover_exports, {
  Anchor: () => PopoverAnchor,
  Arrow: () => PopperArrow,
  CloseButton: () => PopoverCloseButton,
  Content: () => PopoverContent,
  Description: () => PopoverDescription,
  Popover: () => Popover,
  Portal: () => PopoverPortal,
  Root: () => PopoverRoot,
  Title: () => PopoverTitle,
  Trigger: () => PopoverTrigger
});
var PopoverContext = solidJs.createContext();
function usePopoverContext() {
  const context = solidJs.useContext(PopoverContext);
  if (context === void 0) {
    throw new Error("[kobalte]: `usePopoverContext` must be used within a `Popover` component");
  }
  return context;
}

// src/popover/popover-anchor.tsx
function PopoverAnchor(props) {
  const context = usePopoverContext();
  const [local, others] = solidJs.splitProps(props, ["ref"]);
  return web.createComponent(Polymorphic, web.mergeProps({
    as: "div",
    ref(r$) {
      const _ref$ = mergeRefs(context.setDefaultAnchorRef, local.ref);
      typeof _ref$ === "function" && _ref$(r$);
    }
  }, () => context.dataset(), others));
}
function PopoverCloseButton(props) {
  const context = usePopoverContext();
  const [local, others] = solidJs.splitProps(props, ["aria-label", "onClick"]);
  const onClick = (e) => {
    callHandler(e, local.onClick);
    context.close();
  };
  return web.createComponent(ButtonRoot, web.mergeProps({
    get ["aria-label"]() {
      return local["aria-label"] || context.translations().dismiss;
    },
    onClick
  }, () => context.dataset(), others));
}
function PopoverContent(props) {
  let ref;
  const context = usePopoverContext();
  const mergedProps = mergeDefaultProps({
    id: context.generateId("content")
  }, props);
  const [local, others] = solidJs.splitProps(mergedProps, ["ref", "style", "onOpenAutoFocus", "onCloseAutoFocus", "onPointerDownOutside", "onFocusOutside", "onInteractOutside"]);
  let isRightClickOutside = false;
  let hasInteractedOutside = false;
  let hasPointerDownOutside = false;
  const onCloseAutoFocus = (e) => {
    local.onCloseAutoFocus?.(e);
    if (context.isModal()) {
      e.preventDefault();
      if (!isRightClickOutside) {
        focusWithoutScrolling(context.triggerRef());
      }
    } else {
      if (!e.defaultPrevented) {
        if (!hasInteractedOutside) {
          focusWithoutScrolling(context.triggerRef());
        }
        e.preventDefault();
      }
      hasInteractedOutside = false;
      hasPointerDownOutside = false;
    }
  };
  const onPointerDownOutside = (e) => {
    local.onPointerDownOutside?.(e);
    if (context.isModal()) {
      isRightClickOutside = e.detail.isContextMenu;
    }
  };
  const onFocusOutside = (e) => {
    local.onFocusOutside?.(e);
    if (context.isOpen() && context.isModal()) {
      e.preventDefault();
    }
  };
  const onInteractOutside = (e) => {
    local.onInteractOutside?.(e);
    if (context.isModal()) {
      return;
    }
    if (!e.defaultPrevented) {
      hasInteractedOutside = true;
      if (e.detail.originalEvent.type === "pointerdown") {
        hasPointerDownOutside = true;
      }
    }
    if (contains$1(context.triggerRef(), e.target)) {
      e.preventDefault();
    }
    if (e.detail.originalEvent.type === "focusin" && hasPointerDownOutside) {
      e.preventDefault();
    }
  };
  createHideOutside({
    isDisabled: () => !(context.isOpen() && context.isModal()),
    targets: () => ref ? [ref] : []
  });
  src_default$1({
    element: () => ref ?? null,
    enabled: () => context.contentPresent() && context.preventScroll()
  });
  createFocusScope({
    trapFocus: () => context.isOpen() && context.isModal(),
    onMountAutoFocus: local.onOpenAutoFocus,
    onUnmountAutoFocus: onCloseAutoFocus
  }, () => ref);
  solidJs.createEffect(() => solidJs.onCleanup(context.registerContentId(others.id)));
  return web.createComponent(solidJs.Show, {
    get when() {
      return context.contentPresent();
    },
    get children() {
      return web.createComponent(Popper.Positioner, {
        get children() {
          return web.createComponent(DismissableLayer, web.mergeProps({
            ref(r$) {
              const _ref$ = mergeRefs((el) => {
                context.setContentRef(el);
                ref = el;
              }, local.ref);
              typeof _ref$ === "function" && _ref$(r$);
            },
            role: "dialog",
            tabIndex: -1,
            get disableOutsidePointerEvents() {
              return web.memo(() => !!context.isOpen())() && context.isModal();
            },
            get excludedElements() {
              return [context.triggerRef];
            },
            get style() {
              return combineStyle({
                "--kb-popover-content-transform-origin": "var(--kb-popper-content-transform-origin)",
                position: "relative"
              }, local.style);
            },
            get ["aria-labelledby"]() {
              return context.titleId();
            },
            get ["aria-describedby"]() {
              return context.descriptionId();
            },
            onPointerDownOutside,
            onFocusOutside,
            onInteractOutside,
            get onDismiss() {
              return context.close;
            }
          }, () => context.dataset(), others));
        }
      });
    }
  });
}
function PopoverDescription(props) {
  const context = usePopoverContext();
  const mergedProps = mergeDefaultProps({
    id: context.generateId("description")
  }, props);
  const [local, others] = solidJs.splitProps(mergedProps, ["id"]);
  solidJs.createEffect(() => solidJs.onCleanup(context.registerDescriptionId(local.id)));
  return web.createComponent(Polymorphic, web.mergeProps({
    as: "p",
    get id() {
      return local.id;
    }
  }, () => context.dataset(), others));
}
function PopoverPortal(props) {
  const context = usePopoverContext();
  return web.createComponent(solidJs.Show, {
    get when() {
      return context.contentPresent();
    },
    get children() {
      return web.createComponent(web.Portal, props);
    }
  });
}

// src/popover/popover.intl.ts
var POPOVER_INTL_TRANSLATIONS = {
  // `aria-label` of Popover.CloseButton.
  dismiss: "Dismiss"
};

// src/popover/popover-root.tsx
function PopoverRoot(props) {
  const defaultId = `popover-${solidJs.createUniqueId()}`;
  const mergedProps = mergeDefaultProps({
    id: defaultId,
    modal: false,
    translations: POPOVER_INTL_TRANSLATIONS
  }, props);
  const [local, others] = solidJs.splitProps(mergedProps, ["translations", "id", "open", "defaultOpen", "onOpenChange", "modal", "preventScroll", "forceMount", "anchorRef"]);
  const [defaultAnchorRef, setDefaultAnchorRef] = solidJs.createSignal();
  const [triggerRef, setTriggerRef] = solidJs.createSignal();
  const [contentRef, setContentRef] = solidJs.createSignal();
  const [contentId, setContentId] = solidJs.createSignal();
  const [titleId, setTitleId] = solidJs.createSignal();
  const [descriptionId, setDescriptionId] = solidJs.createSignal();
  const disclosureState = createDisclosureState({
    open: () => local.open,
    defaultOpen: () => local.defaultOpen,
    onOpenChange: (isOpen) => local.onOpenChange?.(isOpen)
  });
  const anchorRef = () => {
    return local.anchorRef?.() ?? defaultAnchorRef() ?? triggerRef();
  };
  const {
    present: contentPresent
  } = src_default({
    show: () => local.forceMount || disclosureState.isOpen(),
    element: () => contentRef() ?? null
  });
  const dataset = solidJs.createMemo(() => ({
    "data-expanded": disclosureState.isOpen() ? "" : void 0,
    "data-closed": !disclosureState.isOpen() ? "" : void 0
  }));
  const context = {
    translations: () => local.translations ?? POPOVER_INTL_TRANSLATIONS,
    dataset,
    isOpen: disclosureState.isOpen,
    isModal: () => local.modal ?? false,
    preventScroll: () => local.preventScroll ?? context.isModal(),
    contentPresent,
    triggerRef,
    contentId,
    titleId,
    descriptionId,
    setDefaultAnchorRef,
    setTriggerRef,
    setContentRef,
    close: disclosureState.close,
    toggle: disclosureState.toggle,
    generateId: createGenerateId(() => local.id),
    registerContentId: createRegisterId(setContentId),
    registerTitleId: createRegisterId(setTitleId),
    registerDescriptionId: createRegisterId(setDescriptionId)
  };
  return web.createComponent(PopoverContext.Provider, {
    value: context,
    get children() {
      return web.createComponent(Popper, web.mergeProps({
        anchorRef,
        contentRef
      }, others));
    }
  });
}
function PopoverTitle(props) {
  const context = usePopoverContext();
  const mergedProps = mergeDefaultProps({
    id: context.generateId("title")
  }, props);
  const [local, others] = solidJs.splitProps(mergedProps, ["id"]);
  solidJs.createEffect(() => solidJs.onCleanup(context.registerTitleId(local.id)));
  return web.createComponent(Polymorphic, web.mergeProps({
    as: "h2",
    get id() {
      return local.id;
    }
  }, () => context.dataset(), others));
}
function PopoverTrigger(props) {
  const context = usePopoverContext();
  const [local, others] = solidJs.splitProps(props, ["ref", "onClick", "onPointerDown"]);
  const onPointerDown = (e) => {
    callHandler(e, local.onPointerDown);
    e.preventDefault();
  };
  const onClick = (e) => {
    callHandler(e, local.onClick);
    context.toggle();
  };
  return web.createComponent(ButtonRoot, web.mergeProps({
    ref(r$) {
      const _ref$ = mergeRefs(context.setTriggerRef, local.ref);
      typeof _ref$ === "function" && _ref$(r$);
    },
    "aria-haspopup": "dialog",
    get ["aria-expanded"]() {
      return context.isOpen();
    },
    get ["aria-controls"]() {
      return web.memo(() => !!context.isOpen())() ? context.contentId() : void 0;
    },
    onPointerDown,
    onClick
  }, () => context.dataset(), others));
}

// src/popover/index.tsx
var Popover = Object.assign(PopoverRoot, {
  Anchor: PopoverAnchor,
  Arrow: PopperArrow,
  CloseButton: PopoverCloseButton,
  Content: PopoverContent,
  Description: PopoverDescription,
  Portal: PopoverPortal,
  Title: PopoverTitle,
  Trigger: PopoverTrigger
});

// adapted from https://github.com/metabrainz/musicbrainz-server/blob/de898cc4e8fede8c459c8eee67e626a72c3a6326/root/static/scripts/common/utility/parseInteger.js

/*
 * Copyright (C) 2017 MetaBrainz Foundation
 *
 * This file is part of MusicBrainz, the open internet music database,
 * and is licensed under the GPL version 2, or (at your option) any
 * later version: http://www.gnu.org/licenses/gpl-2.0.txt
 */

const regexp = /^[0-9]+$/;
function parseInteger(num) {
  return regexp.test(num) ? parseInt(num, 10) : NaN;
}

// adapted from https://github.com/metabrainz/musicbrainz-server/blob/de898cc4e8fede8c459c8eee67e626a72c3a6326/root/static/scripts/common/utility/parseIntegerOrNull.js

function parseIntegerOrNull(value) {
  if (value == null) {
    return null;
  }
  const integer = parseInteger(String(value));
  return isNaN(integer) ? null : integer;
}

// adapted from https://github.com/metabrainz/musicbrainz-server/blob/de898cc4e8fede8c459c8eee67e626a72c3a6326/root/static/scripts/common/utility/buildOptionList.js
// and from https://github.com/metabrainz/musicbrainz-server/blob/77f247e91fe9563d6f4a1d0011ecbcbdf6c21853/root/static/scripts/edit/forms.js

/*
 * Copyright (C) 2013-2021 MetaBrainz Foundation
 *
 * This file is part of MusicBrainz, the open internet music database,
 * and is licensed under the GPL version 2, or (at your option) any
 * later version: http://www.gnu.org/licenses/gpl-2.0.txt
 */

function buildOptionList(options) {
  return buildOptionListFromKeys(options, 'name', 'id');
}
function buildOptionListFromKeys(options, textAttr, valueAttr) {
  const optionsByParentId = Map.groupBy(options, option => option.parent_id);
  const text = function (option) {
    return typeof textAttr === 'function' ? textAttr(option) : option[textAttr];
  };
  const compareChildren = (a, b) => {
    return a.child_order - b.child_order || text(a).localeCompare(text(b));
  };
  const getOptionsByParentId = (parentId, level) => {
    const options = optionsByParentId.get(parentId);
    if (!options) {
      return [];
    }
    options.sort(compareChildren);
    return options.flatMap(option => {
      return [{
        text: '\xA0'.repeat(level * 2) + text(option),
        value: option[valueAttr]
      }, ...getOptionsByParentId(option[valueAttr], level + 1)];
    });
  };
  return getOptionsByParentId(null, 0);
}

var _tmpl$$b = /*#__PURE__*/web.template(`<div>`);
function FormRow(props) {
  props = solidJs.mergeProps({
    hasNoLabel: false,
    hasNoMarge: false
  }, props);
  return (() => {
    var _el$ = _tmpl$$b();
    var _ref$ = props.rowRef;
    typeof _ref$ === "function" ? web.use(_ref$, _el$) : props.rowRef = _el$;
    web.insert(_el$, () => props.children);
    web.effect(() => web.className(_el$, `row ${props.hasNoLabel ? 'no-label' : ''} ${props.hasNoMargin ? 'no-margin' : ''}`));
    return _el$;
  })();
}

var _tmpl$$a = /*#__PURE__*/web.template(`<tr><td class=section></td><td>`),
  _tmpl$2$9 = /*#__PURE__*/web.template(`<select><option value=""> `),
  _tmpl$3$6 = /*#__PURE__*/web.template(`<option>`);
function SelectBox(props) {
  const [local, children] = solidJs.splitProps(props, ['label']);
  return web.createComponent(solidJs.Show, {
    get when() {
      return local.label;
    },
    get fallback() {
      return web.createComponent(StrippedSelectBox, children);
    },
    get children() {
      var _el$ = _tmpl$$a(),
        _el$2 = _el$.firstChild,
        _el$3 = _el$2.nextSibling;
      web.insert(_el$2, () => local.label);
      web.insert(_el$3, web.createComponent(StrippedSelectBox, children));
      return _el$;
    }
  });
}
function StrippedSelectBox(props) {
  const [local, selectProps] = solidJs.splitProps(props, ['options', 'onChange']);
  return (() => {
    var _el$4 = _tmpl$2$9();
      _el$4.firstChild;
    _el$4.addEventListener("change", ev => local.onChange(parseInteger(ev.target.value)));
    web.spread(_el$4, selectProps, false, true);
    web.insert(_el$4, web.createComponent(solidJs.For, {
      get each() {
        return local.options;
      },
      children: option => (() => {
        var _el$6 = _tmpl$3$6();
        web.insert(_el$6, () => option.text);
        web.effect(() => _el$6.selected = option.value == selectProps.value);
        web.effect(() => _el$6.value = option.value);
        return _el$6;
      })()
    }), null);
    return _el$4;
  })();
}

class PLazy extends Promise {
	#executor;
	#promise;

	constructor(executor) {
		super(resolve => {
			resolve();
		});

		this.#executor = executor;
	}

	static from(function_) {
		return new PLazy(resolve => {
			resolve(function_());
		});
	}

	static resolve(value) {
		return new PLazy(resolve => {
			resolve(value);
		});
	}

	static reject(error) {
		return new PLazy((resolve, reject) => {
			reject(error);
		});
	}

	then(onFulfilled, onRejected) {
		this.#promise ??= new Promise(this.#executor);
		return this.#promise.then(onFulfilled, onRejected);
	}

	catch(onRejected) {
		this.#promise ??= new Promise(this.#executor);
		return this.#promise.catch(onRejected);
	}

	finally(onFinally) {
		this.#promise ??= new Promise(this.#executor);
		return this.#promise.finally(onFinally);
	}
}

function removeAtIndex(array, index) {
  return [...array.slice(0, index), ...array.slice(index + 1)];
}

var _tmpl$$9 = /*#__PURE__*/web.template(`<tr><td></td><td></td><td><button class="nobutton icon remove-item"title="Remove attribute">`),
  _tmpl$2$8 = /*#__PURE__*/web.template(`<input type=text>`);
function byId(list) {
  return Object.fromEntries(list.map(item => [item.id, item]));
}
const lazyAttributeTypes = PLazy.from(async () => {
  var _await$tryFetchJSON$w, _await$tryFetchJSON;
  const workAttributeTypes = Object.keys(MB.linkedEntities.work_attribute_type).length > 0 ? MB.linkedEntities.work_attribute_type : byId((_await$tryFetchJSON$w = (_await$tryFetchJSON = await tryFetchJSON('/ws/js/type-info/work_attribute_type')) == null ? void 0 : _await$tryFetchJSON.work_attribute_type_list) != null ? _await$tryFetchJSON$w : []);
  return buildOptionList(Object.values(workAttributeTypes));
});
const lazyAllowedValuesByID = PLazy.from(async () => {
  var _await$tryFetchJSON2;
  const workAttributeAllowedValues = byId(((_await$tryFetchJSON2 = await tryFetchJSON('/ws/js/type-info/work_attribute_type_allowed_value')) == null ? void 0 : _await$tryFetchJSON2.work_attribute_type_allowed_value_list) || []);
  return new Map(Map.groupBy(Object.values(workAttributeAllowedValues), x => x.workAttributeTypeID).entries().map(([typeId, children]) => [typeId, buildOptionListFromKeys(children, 'value', 'id')]));
});
function WorkAttributeRow(props) {
  const [typeId, setTypeId] = solidJs.createSignal(props.attribute.type_id);
  const [attributeTypes] = solidJs.createResource(async () => await lazyAttributeTypes, {
    initialValue: []
  });
  const [allowedValues] = solidJs.createResource(typeId, async typeId => (await lazyAllowedValuesByID).get(typeId));
  return (() => {
    var _el$ = _tmpl$$9(),
      _el$2 = _el$.firstChild,
      _el$3 = _el$2.nextSibling,
      _el$4 = _el$3.nextSibling,
      _el$5 = _el$4.firstChild;
    web.insert(_el$2, web.createComponent(SelectBox, {
      get name() {
        return `edit-work.attributes.${props.index()}.type_id`;
      },
      get options() {
        return attributeTypes();
      },
      get value() {
        var _attributeTypes$find;
        return (_attributeTypes$find = attributeTypes().find(type => type.value === props.attribute.type_id)) == null ? void 0 : _attributeTypes$find.value;
      },
      onChange: type => {
        setTypeId(type);
        props.setEditData('attributes', props.index(), 'type_id', parseIntegerOrNull(type) || 0);
      }
    }));
    web.insert(_el$3, web.createComponent(solidJs.Show, {
      get when() {
        return typeof allowedValues() !== 'undefined';
      },
      get fallback() {
        return (() => {
          var _el$6 = _tmpl$2$8();
          _el$6.addEventListener("change", event => props.setEditData('attributes', props.index(), 'value', event.currentTarget.value));
          web.effect(() => web.setAttribute(_el$6, "name", `edit-work.attributes.${props.index()}.value`));
          web.effect(() => _el$6.value = props.attribute.value);
          return _el$6;
        })();
      },
      get children() {
        return web.createComponent(SelectBox, {
          get name() {
            return `edit-work.attributes.${props.index()}.value`;
          },
          get options() {
            return allowedValues();
          },
          get value() {
            var _allowedValues;
            return (_allowedValues = allowedValues()) == null || (_allowedValues = _allowedValues.find(x => x.text === props.attribute.value)) == null ? void 0 : _allowedValues.value;
          },
          onChange: value => {
            var _allowedValues2;
            return props.setEditData('attributes', props.index(), 'value', ((_allowedValues2 = allowedValues()) == null || (_allowedValues2 = _allowedValues2.find(x => x.value == value)) == null ? void 0 : _allowedValues2.text) || '');
          }
        });
      }
    }));
    _el$5.$$click = () => props.setEditData('attributes', attributes => removeAtIndex(attributes, props.index()));
    return _el$;
  })();
}
web.delegateEvents(["click"]);

var _tmpl$$8 = /*#__PURE__*/web.template(`<fieldset><legend>Work attributes</legend><table id=work-attributes class=row-form data-bind="delegatedHandler: 'click'"><tbody><tr><td></td><td class=add-item colspan=2><button class="with-label add-item"type=button title="Add work attribute">Add work attribute`),
  _tmpl$2$7 = /*#__PURE__*/web.template(`<tr><td>Loading...`);
function WorkAttributes() {
  const {
    editData,
    setEditData
  } = useWorkEditData();
  return (() => {
    var _el$ = _tmpl$$8(),
      _el$2 = _el$.firstChild,
      _el$3 = _el$2.nextSibling,
      _el$4 = _el$3.firstChild,
      _el$5 = _el$4.firstChild,
      _el$6 = _el$5.firstChild,
      _el$7 = _el$6.nextSibling,
      _el$8 = _el$7.firstChild;
    web.insert(_el$4, web.createComponent(solidJs.For, {
      get each() {
        return editData.attributes;
      },
      children: (attribute, index) => web.createComponent(solidJs.Suspense, {
        get fallback() {
          return _tmpl$2$7();
        },
        get children() {
          return web.createComponent(WorkAttributeRow, {
            attribute: attribute,
            index: index,
            setEditData: setEditData
          });
        }
      })
    }), _el$5);
    _el$8.$$click = () => setEditData('attributes', editData.attributes.length, {
      type_id: 0,
      value: ''
    });
    return _el$;
  })();
}
web.delegateEvents(["click"]);

function styleInject(css, ref) {
  if ( ref === void 0 ) ref = {};
  var insertAt = ref.insertAt;

  if (typeof document === 'undefined') { return; }

  var head = document.head || document.getElementsByTagName('head')[0];
  var style = document.createElement('style');
  style.type = 'text/css';

  if (insertAt === 'top') {
    if (head.firstChild) {
      head.insertBefore(style, head.firstChild);
    } else {
      head.appendChild(style);
    }
  } else {
    head.appendChild(style);
  }

  if (style.styleSheet) {
    style.styleSheet.cssText = css;
  } else {
    style.appendChild(document.createTextNode(css));
  }
}

var css_248z = ".edit-work-button-container{.work-dialog{display:none;div.half-width{width:100%;fieldset{input,label.row,select{width:100%}div.row,div.select-list-row,div.text-list-row{display:flex}div.row{margin:6px}div.form-row-add{width:100%}div.form-row-select-list,div.form-row-text-list{flex:1;margin-left:0}}}table.row-form{>tbody>tr,>thead>tr{>td:first-child,>th:first-child{padding:0 6px}>td,>th{background-color:unset}}}}.work-dialog[data-expanded]{display:inherit}}";
styleInject(css_248z);

var _tmpl$$7 = /*#__PURE__*/web.template(`<label>ISWCs:`),
  _tmpl$2$6 = /*#__PURE__*/web.template(`<div class=form-row-text-list><div class=form-row-add><button class="add-item with-label"type=button title="Add ISWC">Add ISWC`),
  _tmpl$3$5 = /*#__PURE__*/web.template(`<div class=text-list-row><input class="value with-button"type=text><button class="nobutton icon remove-item"title="Remove ISWC">`);
function WorkISWCsEditor() {
  const {
    editData,
    setEditData
  } = useWorkEditData();
  return web.createComponent(FormRow, {
    get children() {
      return [_tmpl$$7(), (() => {
        var _el$2 = _tmpl$2$6(),
          _el$3 = _el$2.firstChild,
          _el$4 = _el$3.firstChild;
        web.insert(_el$2, web.createComponent(solidJs.For, {
          get each() {
            return editData.iswcs;
          },
          children: (iswc, index) => (() => {
            var _el$5 = _tmpl$3$5(),
              _el$6 = _el$5.firstChild,
              _el$7 = _el$6.nextSibling;
            _el$6.addEventListener("change", event => setEditData('iswcs', index(), event.currentTarget.value));
            _el$6.value = iswc;
            _el$7.$$click = () => setEditData('iswcs', iswcs => removeAtIndex(iswcs, index()));
            web.effect(() => web.setAttribute(_el$6, "name", `edit-work.iswcs.${index()}`));
            return _el$5;
          })()
        }), _el$3);
        _el$4.$$click = () => setEditData('iswcs', editData.iswcs.length, '');
        return _el$2;
      })()];
    }
  });
}
web.delegateEvents(["click"]);

// adapted from https://github.com/metabrainz/musicbrainz-server/blob/f47a266d79224df119fa9f28a5fbcbd85b869e00/root/static/scripts/edit/utility/createField.js

/*
 * Copyright (C) 2017 MetaBrainz Foundation
 *
 * This file is part of MusicBrainz, the open internet music database,
 * and is licensed under the GPL version 2, or (at your option) any
 * later version: http://www.gnu.org/licenses/gpl-2.0.txt
 */

/*
 * The Perl will assign a unique ID to all existing fields in
 * MusicBrainz::Server::Form::Role::ToJSON. The initial value of
 * `LAST_FIELD_ID` here is high enough that it should never overlap
 * with an ID assigned on the server.
 */
let LAST_FIELD_ID = 99999;
function createField(name, value) {
  return {
    errors: [],
    has_errors: false,
    html_name: name,
    id: ++LAST_FIELD_ID,
    type: 'field',
    value
  };
}
function createRepeatableField(name, field) {
  return {
    errors: [],
    has_errors: false,
    html_name: name,
    id: ++LAST_FIELD_ID,
    type: 'repeatable_field',
    field,
    last_index: field.length - 1
  };
}

// adapted from https://github.com/metabrainz/musicbrainz-server/blob/f47a266d79224df119fa9f28a5fbcbd85b869e00/root/static/scripts/common/utility/getSelectValue.js

/*
 * Copyright (C) 2017 MetaBrainz Foundation
 *
 * This file is part of MusicBrainz, the open internet music database,
 * and is licensed under the GPL version 2, or (at your option) any
 * later version: http://www.gnu.org/licenses/gpl-2.0.txt
 */

function getSelectValue(field, options, allowEmpty = false) {
  if (field.value !== undefined && field.value !== null) {
    return String(field.value);
  }
  if (allowEmpty) {
    return '';
  }
  let value;
  if (options.grouped) {
    value = options.options[0].options[0].value;
  } else {
    value = options.options[0].value;
  }
  return String(value);
}

var _tmpl$$6 = /*#__PURE__*/web.template(`<option>`),
  _tmpl$2$5 = /*#__PURE__*/web.template(`<optgroup>`),
  _tmpl$3$4 = /*#__PURE__*/web.template(`<select>`),
  _tmpl$4$3 = /*#__PURE__*/web.template(`<option value=""> `);
const buildOption = (option, value) => {
  const values = Array.isArray(value) ? value : [value];
  return (() => {
    var _el$ = _tmpl$$6();
    web.insert(_el$, (() => {
      var _c$ = web.memo(() => typeof option.label === 'function');
      return () => _c$() ? option.label() : option.label;
    })());
    web.effect(() => _el$.selected = values.includes(String(option.value)));
    web.effect(() => _el$.value = option.value);
    return _el$;
  })();
};
const buildOptGroup = (optgroup, value) => (() => {
  var _el$2 = _tmpl$2$5();
  web.insert(_el$2, () => optgroup.options.map(opt => buildOption(opt, value)));
  web.effect(() => web.setAttribute(_el$2, "label", optgroup.optgroup));
  return _el$2;
})();
const isStringField = field => !Array.isArray(field.value);
const buildOptions = (field, options, allowEmpty) => {
  const value = isStringField(field) ? getSelectValue(field, options, allowEmpty) : field.value || [];
  if (options.grouped) {
    return options.options.map(opt => buildOptGroup(opt, value));
  }
  return options.options.map(opt => buildOption(opt, value));
};
function SelectField(props) {
  const [local, selectProps] = solidJs.splitProps(solidJs.mergeProps({
    allowEmpty: true,
    uncontrolled: false,
    class: 'with-button',
    disabled: false,
    id: `id-${props.field.html_name}`,
    name: props.field.html_name
  }, props), ['allowEmpty', 'field', 'options', 'uncontrolled']);
  return (() => {
    var _el$3 = _tmpl$3$4();
    web.spread(_el$3, web.mergeProps(selectProps, {
      get onChange() {
        return local.uncontrolled ? undefined : selectProps.onChange;
      }
    }), false, true);
    web.insert(_el$3, (() => {
      var _c$2 = web.memo(() => !!local.allowEmpty);
      return () => _c$2() ? _tmpl$4$3() : null;
    })(), null);
    web.insert(_el$3, () => buildOptions(local.field, local.options, local.allowEmpty), null);
    return _el$3;
  })();
}

// adapted from https://github.com/metabrainz/musicbrainz-server/blob/7344dd66957cb06d536e078b5c0aeeb7b537ccfd/root/static/scripts/edit/utility/subfieldErrors.js

/*
 * Copyright (C) 2017 MetaBrainz Foundation
 *
 * This file is part of MusicBrainz, the open internet music database,
 * and is licensed under the GPL version 2, or (at your option) any
 * later version: http://www.gnu.org/licenses/gpl-2.0.txt
 */

function* iterSubfields(formOrField) {
  switch (formOrField.type) {
    case 'compound_field':
      yield formOrField;
    // falls through
    case 'form':
      for (const subfield of Object.values(formOrField.field)) {
        yield* iterSubfields(subfield);
      }
      break;
    case 'field':
      yield formOrField;
      break;
    case 'repeatable_field':
      {
        yield formOrField;
        for (const subfield of formOrField.field) {
          yield* iterSubfields(subfield);
        }
        break;
      }
  }
}
function subfieldErrors(formOrField, accum = []) {
  let result = accum;
  for (const subfield of iterSubfields(formOrField)) {
    var _subfield$errors;
    if ((_subfield$errors = subfield.errors) != null && _subfield$errors.length) {
      result = result.concat(subfield.errors);
    }
  }
  return result;
}

var _tmpl$$5 = /*#__PURE__*/web.template(`<ul class=errors>`),
  _tmpl$2$4 = /*#__PURE__*/web.template(`<li>`);
function FieldErrorsList(props) {
  var _props$errors;
  if ((_props$errors = props.errors) != null && _props$errors.length) {
    return (() => {
      var _el$ = _tmpl$$5();
      web.insert(_el$, web.createComponent(solidJs.For, {
        get each() {
          return props.errors;
        },
        children: error => (() => {
          var _el$2 = _tmpl$2$4();
          web.insert(_el$2, error);
          return _el$2;
        })()
      }));
      return _el$;
    })();
  }
  return null;
}
function FieldErrors(props) {
  if (!props.field) {
    return null;
  }
  props = solidJs.mergeProps({
    includeSubFields: true
  }, props);
  const errors = props.includeSubFields ? subfieldErrors(props.field) : props.field.errors;
  return web.createComponent(FieldErrorsList, {
    errors: errors
  });
}

var _tmpl$$4 = /*#__PURE__*/web.template(`<label>`),
  _tmpl$2$3 = /*#__PURE__*/web.template(`<div class=form-row-select-list>`),
  _tmpl$3$3 = /*#__PURE__*/web.template(`<div class=select-list-row> <button type=button>`),
  _tmpl$4$2 = /*#__PURE__*/web.template(`<div class=form-row-add><button class="with-label add-item"type=button>`);
function FormRowSelectList(props) {
  props = solidJs.mergeProps({
    hideAddButton: false
  }, props);
  return web.createComponent(FormRow, {
    get children() {
      return [(() => {
        var _el$ = _tmpl$$4();
        web.insert(_el$, () => props.label);
        return _el$;
      })(), (() => {
        var _el$2 = _tmpl$2$3();
        web.insert(_el$2, web.createComponent(solidJs.For, {
          get each() {
            return props.repeatable.field;
          },
          children: (subfield, index) => (() => {
            var _el$3 = _tmpl$3$3(),
              _el$4 = _el$3.firstChild,
              _el$5 = _el$4.nextSibling;
            web.insert(_el$3, web.createComponent(SelectField, {
              get field() {
                return props.getSelectField(subfield);
              },
              onChange: event => props.onEdit(index(), event.currentTarget.value),
              get options() {
                return props.options;
              }
            }), _el$4);
            _el$5.$$click = () => props.onRemove(index());
            web.insert(_el$3, web.createComponent(FieldErrors, {
              get field() {
                return props.getSelectField(subfield);
              }
            }), null);
            web.effect(_p$ => {
              var _v$ = `nobutton icon remove-item ${props.removeClassName}`,
                _v$2 = props.removeLabel;
              _v$ !== _p$.e && web.className(_el$5, _p$.e = _v$);
              _v$2 !== _p$.t && web.setAttribute(_el$5, "title", _p$.t = _v$2);
              return _p$;
            }, {
              e: undefined,
              t: undefined
            });
            return _el$3;
          })()
        }), null);
        web.insert(_el$2, (() => {
          var _c$ = web.memo(() => !!props.hideAddButton);
          return () => _c$() ? null : (() => {
            var _el$6 = _tmpl$4$2(),
              _el$7 = _el$6.firstChild;
            web.addEventListener(_el$7, "click", props.onAdd, true);
            web.insert(_el$7, () => props.addLabel);
            web.effect(() => web.setAttribute(_el$7, "id", props.addId));
            return _el$6;
          })();
        })(), null);
        return _el$2;
      })()];
    }
  });
}
web.delegateEvents(["click"]);

var _tmpl$$3 = /*#__PURE__*/web.template(`<div id=work-languages-editor>`);
const FREQUENT_LANGUAGE = 2;
const NON_FREQURENT_LANGUAGE = 1;
// 0 means skip

const lazyLanguageOptions = PLazy.from(async () => {
  var _languagesByFrequency, _languagesByFrequency2;
  const languagesByFrequency = Map.groupBy(Object.values(MB.linkedEntities.language), language => language.id == LANGUAGE_ZXX_ID ? FREQUENT_LANGUAGE : language.frequency);
  const compareLanguages = (a, b) => (a.id === LANGUAGE_ZXX_ID ? 0 : 1) - (b.id === LANGUAGE_ZXX_ID ? 0 : 1) || a.name.localeCompare(b.name);
  return {
    grouped: true,
    options: [{
      optgroup: 'Frequently used',
      options: ((_languagesByFrequency = languagesByFrequency.get(FREQUENT_LANGUAGE)) == null || (_languagesByFrequency = _languagesByFrequency.sort(compareLanguages)) == null ? void 0 : _languagesByFrequency.map(lang => ({
        label: lang.id == LANGUAGE_ZXX_ID ? '[No Lyrics]' : lang.name,
        value: lang.id
      }))) || []
    }, {
      optgroup: 'Other',
      options: ((_languagesByFrequency2 = languagesByFrequency.get(NON_FREQURENT_LANGUAGE)) == null || (_languagesByFrequency2 = _languagesByFrequency2.sort(compareLanguages)) == null ? void 0 : _languagesByFrequency2.map(lang => ({
        label: lang.name,
        value: lang.id
      }))) || []
    }]
  };
});
function WorkLanguageEditor() {
  const {
    editData,
    setEditData
  } = useWorkEditData();
  const languagesField = () => createRepeatableField('edit-work.languages', editData.languages.map((language, index) => createField(`edit-work.languages.${index}`, String(language))));
  const [languageOptions] = solidJs.createResource(async () => await lazyLanguageOptions, {
    initialValue: {
      grouped: true,
      options: []
    }
  });
  return (() => {
    var _el$ = _tmpl$$3();
    web.insert(_el$, web.createComponent(FormRowSelectList, {
      addId: "add-language",
      addLabel: 'Add language',
      getSelectField: identity,
      get hideAddButton() {
        return editData.languages.find(lang => lang === LANGUAGE_MUL_ID || lang === LANGUAGE_ZXX_ID) !== undefined;
      },
      label: 'Lyrics languages:',
      onAdd: () => setEditData('languages', editData.languages.length, NaN),
      onEdit: (index, value) => setEditData('languages', index, Number(value)),
      onRemove: index => setEditData('languages', removeAtIndex(editData.languages, index)),
      get options() {
        return languageOptions();
      },
      removeClassName: "remove-language",
      removeLabel: 'Remove language',
      get repeatable() {
        return languagesField();
      }
    }));
    return _el$;
  })();
}

var _tmpl$$2 = /*#__PURE__*/web.template(`<label class=required for=id-edit-work.name id=label-id-edit-work.name>Name:`),
  _tmpl$2$2 = /*#__PURE__*/web.template(`<input id=id-edit-work.name name=edit-work.name type=text>`),
  _tmpl$3$2 = /*#__PURE__*/web.template(`<label for=id-edit-work.comment id=label-id-edit-work.comment>Disambiguation:`),
  _tmpl$4$1 = /*#__PURE__*/web.template(`<input id=id-edit-work.comment name=edit-work.comment type=text>`),
  _tmpl$5$1 = /*#__PURE__*/web.template(`<label class=""for=id-edit-work.type_id id=label-id-edit-work.type_id>Type:`),
  _tmpl$6$1 = /*#__PURE__*/web.template(`<form method=post class=edit-work><h1>Edit work</h1><div class=half-width><fieldset><legend>Work details</legend></fieldset></div><div class=buttons>`);
function WorkEditDialog(props) {
  const {
    editData,
    setEditData,
    isModified,
    workName,
    submitUrl,
    saveEditData,
    workId
  } = useWorkEditData();
  const isNameBlank = () => /^\s*$/.test(workName());
  const [open, setOpen] = solidJs.createSignal(false);

  // need forceMount to keep forms in the DOM even when the dialog is closed so they can be submitted
  // this requires manually handling escape key to close the dialog
  const onEscapeKeyDown = ev => {
    if (open() && ev.key === 'Escape') {
      setOpen(false);
    }
  };
  document.addEventListener('keydown', onEscapeKeyDown);
  solidJs.onCleanup(() => document.removeEventListener('keydown', onEscapeKeyDown));
  return web.createComponent(Popover, {
    get open() {
      return open();
    },
    onOpenChange: setOpen,
    forceMount: true,
    get children() {
      return [web.createComponent(Popover.Trigger, {
        "class": "icon edit-item"
      }), web.createComponent(Popover.Content, {
        "class": "dialog popover work-dialog",
        onEscapeKeyDown: ev => {
          ev.preventDefault();
        },
        get children() {
          return [web.createComponent(Popover.Arrow, {}), (() => {
            var _el$ = _tmpl$6$1(),
              _el$2 = _el$.firstChild,
              _el$3 = _el$2.nextSibling,
              _el$4 = _el$3.firstChild;
              _el$4.firstChild;
              var _el$11 = _el$3.nextSibling;
            web.addEventListener(_el$, "submit", props.onSubmit);
            web.insert(_el$4, web.createComponent(FormRow, {
              get children() {
                return [_tmpl$$2(), (() => {
                  var _el$7 = _tmpl$2$2();
                  _el$7.addEventListener("change", ev => setEditData('name', ev.target.value));
                  _el$7.required = true;
                  web.effect(() => _el$7.value = editData.name);
                  return _el$7;
                })()];
              }
            }), null);
            web.insert(_el$4, web.createComponent(FormRow, {
              get children() {
                return [_tmpl$3$2(), (() => {
                  var _el$9 = _tmpl$4$1();
                  web.effect(() => _el$9.value = editData.comment);
                  return _el$9;
                })()];
              }
            }), null);
            web.insert(_el$4, web.createComponent(FormRow, {
              get children() {
                return [_tmpl$5$1(), web.createComponent(SelectBox, {
                  id: "id-edit-work.type_id",
                  name: "edit-work.type_id",
                  get options() {
                    return buildOptionList(Object.values(MB.linkedEntities.work_type));
                  },
                  get value() {
                    return editData.type_id || undefined;
                  },
                  onChange: workType => setEditData('type_id', parseIntegerOrNull(workType))
                })];
              }
            }), null);
            web.insert(_el$4, web.createComponent(WorkLanguageEditor, {}), null);
            web.insert(_el$4, web.createComponent(WorkISWCsEditor, {}), null);
            web.insert(_el$3, web.createComponent(WorkAttributes, {}), null);
            _el$11.style.setProperty("margin-top", "1em");
            web.insert(_el$11, web.createComponent(Popover.CloseButton, {
              "class": "negative",
              get children() {
                return ['Cancel', " "];
              }
            }), null);
            web.insert(_el$11, web.createComponent(Popover.CloseButton, {
              "class": "positive",
              get disabled() {
                return isNameBlank();
              },
              onClick: saveEditData,
              children: 'Done'
            }), null);
            web.effect(_p$ => {
              var _v$ = `submit-work-${workId()}`,
                _v$2 = submitUrl(),
                _v$3 = !!isModified();
              _v$ !== _p$.e && web.setAttribute(_el$, "id", _p$.e = _v$);
              _v$2 !== _p$.t && web.setAttribute(_el$, "action", _p$.t = _v$2);
              _v$3 !== _p$.a && _el$.classList.toggle("modified", _p$.a = _v$3);
              return _p$;
            }, {
              e: undefined,
              t: undefined,
              a: undefined
            });
            return _el$;
          })()];
        }
      })];
    }
  });
}

var _tmpl$$1 = /*#__PURE__*/web.template(`<input type=checkbox class=work>`),
  _tmpl$2$1 = /*#__PURE__*/web.template(`<a class=wrap-anywhere>`),
  _tmpl$3$1 = /*#__PURE__*/web.template(`<h3 class=edit-work-button-container>`);
function isNewWork(work) {
  return !work.gid;
}
function workLink(work) {
  return isNewWork(work) ? `#new-work-${work.id}` : `/work/${work.gid}`;
}
function WorkEditor(props) {
  var _document$getElementB;
  const isNew = isNewWork(props.workState.work);
  const {
    isModified,
    workName
  } = useWorkEditData();
  const [isPending, setIsPending] = solidJs.createSignal(isModified());
  const selectRecording = event => {
    MB.relationshipEditor.dispatch({
      isSelected: event.currentTarget.checked,
      work: props.workState.work,
      type: 'toggle-select-work'
    });
  };
  const removeWork = () => {
    MB.relationshipEditor.dispatch({
      recording: props.recordingState.recording,
      type: 'remove-work',
      workState: props.workState
    });
  };
  solidJs.createEffect(previousDisplay => {
    const originalDisplay = props.originalHeader.style.display;
    props.originalHeader.style.display = isPending() ? 'none' : previousDisplay != null ? previousDisplay : '';
    return originalDisplay;
  });
  (_document$getElementB = document.getElementById('acum-work-cancel')) == null || _document$getElementB.addEventListener('click', () => {
    setIsPending(false);
  });
  return web.createComponent(solidJs.Show, {
    get when() {
      return isPending();
    },
    get children() {
      return [(() => {
        var _el$ = _tmpl$$1();
        _el$.addEventListener("change", selectRecording);
        web.effect(() => _el$.checked = props.workState.isSelected);
        return _el$;
      })(), ' ', web.createComponent(Button, {
        "class": "icon remove-item",
        onClick: removeWork
      }), web.createComponent(WorkEditDialog, {
        onSubmit: () => setIsPending(false)
      }), ' ', (() => {
        var _el$2 = _tmpl$2$1();
        _el$2.classList.toggle("rel-add", !!isNew);
        _el$2.classList.toggle("rel-edit", !!!isNew);
        web.insert(_el$2, workName);
        web.effect(() => web.setAttribute(_el$2, "href", workLink(props.workState.work)));
        return _el$2;
      })()];
    }
  });
}
function addWorkEditor(workState, recordingState) {
  var _document$querySelect;
  const header = (_document$querySelect = document.querySelector(`.works a[href="${workLink(workState.work)}"]`)) == null ? void 0 : _document$querySelect.closest('h3');
  if (header && !header.classList.contains('edit-work-button-container')) {
    var _header$parentElement;
    const container = _tmpl$3$1();
    (_header$parentElement = header.parentElement) == null || _header$parentElement.insertBefore(container, header);
    web.render(() => web.createComponent(WorkEditDataProvider, {
      workState: workState,
      get children() {
        return web.createComponent(WorkEditor, {
          workState: workState,
          recordingState: recordingState,
          originalHeader: header
        });
      }
    }), container);
  }
}

const workCache = new Map();
function shouldAddNewWork(relatedWorks) {
  const relatedWork = head(MB.tree.iterate(relatedWorks));
  if (!relatedWork) {
    return true;
  }
  const targetTypeGroup = MB.tree.find(relatedWork.targetTypeGroups, 'recording', compareTargetTypeWithGroup, null);
  if (!targetTypeGroup) {
    return true;
  }
  for (const relationship of iterateRelationshipsInTargetTypeGroup(targetTypeGroup)) {
    if (relationship._status !== REL_STATUS_REMOVE) {
      return false;
    }
  }
  return true;
}
async function addWork(track, recordingState, addWarning) {
  if (shouldAddNewWork(recordingState.relatedWorks)) {
    recordingState = await createNewWork(track, recordingState);
  }
  const workState = head(MB.tree.iterate(recordingState.relatedWorks));
  await udpateEditData(workState, track, addWarning);
  addWorkEditor(workState, recordingState);
  return workState;
}
async function createNewWork(track, recordingState) {
  const newWork = (() => {
    if (workCache.has(track.fullWorkId)) {
      return workCache.get(track.fullWorkId);
    }
    const newWork = createWork({
      _fromBatchCreateWorksDialog: true,
      id: MB.relationshipEditor.getRelationshipStateId(),
      name: track.workHebName
    });
    workCache.set(track.fullWorkId, newWork);
    return newWork;
  })();
  MB.linkedEntities.work[newWork.id] = newWork;
  MB.relationshipEditor.dispatch({
    type: 'update-relationship-state',
    sourceEntity: recordingState.recording,
    batchSelectionCount: undefined,
    creditsToChangeForSource: '',
    creditsToChangeForTarget: '',
    newRelationshipState: createRelationshipState({
      _status: REL_STATUS_ADD,
      backward: false,
      entity0: recordingState.recording,
      entity1: newWork,
      id: MB.relationshipEditor.getRelationshipStateId(),
      linkTypeID: RECORDING_OF_LINK_TYPE_ID
    }),
    oldRelationshipState: null
  });
  // wait for the work to be added
  const observer = await new Promise(resolve => {
    VM.observe(document.querySelector('.release-relationship-editor'), (mutations, observer) => {
      if (document.querySelector(`.works a[href="#new-work-${newWork.id}"]`)) {
        resolve(observer);
      }
    });
  });
  observer.disconnect();
  // refresh recording state
  const mediumRecordingStates = MB.tree.find(MB.relationshipEditor.state.mediums, MB.relationshipEditor.state.mediumsByRecordingId.get(recordingState.recording.id)[0], (mediumKey, [mediumVal]) => {
    return compareNumbers(mediumKey.id, mediumVal.id);
  }, null)[1];
  return MB.tree.find(mediumRecordingStates, recordingState.recording, (recording, recordingState) => compareNumbers(recording.id, recordingState.recording.id), null);
}
function createWork(attributes) {
  return MB.entity(_extends({}, {
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
  }, attributes));
}

async function importWorks(albumId, addWarning, clearWarnings) {
  clearWarnings();
  const albumBean = await albumInfo(albumId);
  const artistCache = new Map();
  const linkArtists = async (writers, creators, doLink) => {
    from(writers || []).pipe(mergeMap(async author => await (artistCache.get(author.creatorIpBaseNumber) || artistCache.set(author.creatorIpBaseNumber, findArtist(author.creatorIpBaseNumber, creators, addWarning)).get(author.creatorIpBaseNumber))), filter(artist => artist !== null)).subscribe(doLink);
  };
  const linkWriters = async (work, writers, creators, linkTypeId) => {
    linkArtists(writers, creators, artist => addWriterRelationship(work, artist, linkTypeId));
  };
  const linkArrangers = async (recording, arrangers, creators) => {
    linkArtists(arrangers, creators, artist => addArrangerRelationship(recording, artist));
  };
  return await lastValueFrom(from(MB.tree.iterate(MB.relationshipEditor.state.mediums)).pipe(mergeMap(([medium, recordingStateTree]) => {
    return zip(from(albumBean.tracks), from(medium.tracks.map(track => trackRecordingState(track, recordingStateTree))));
  }), filter(trackAndRecordingState => {
    const [, recordingState] = trackAndRecordingState;
    return recordingState != null && recordingState.isSelected;
  }), tap(([track, recordingState]) => {
    const recording = recordingState.recording;
    if (track[searchName(recording.name)] != recording.name) {
      addWarning(`Work name of ${recording.name} is different than recording name, please verify`);
    }
  }), mergeMap(async ([track, recordingState]) => [track, recordingState.recording, await addWork(track, recordingState, addWarning)]), tap(([track, recording, workState]) => {
    const work = workState.work;
    linkWriters(work, track.authors, track.creators, LYRICIST_LINK_TYPE_ID);
    linkWriters(work, track.composers, track.creators, COMPOSER_LINK_TYPE_ID);
    linkWriters(work, track.translators, track.creators, TRANSLATOR_LINK_TYPE_ID);
    linkArrangers(recording, track.arrangers, track.creators);
  }), map(([,, workState]) => workState), count(workState => !workEditDataEqual(workState.editData, workState.originalEditData)), map(count => count > 0), tap(hasEdits => {
    if (hasEdits) {
      addEditNote(`Imported from ${albumUrl(albumId)}`);
    } else {
      addWarning('All works are up to date');
    }
  })));
}

async function submitWork(form) {
  return await firstValueFrom(of(form).pipe(mergeMap(async form => await fetchResponse(form.action, {
    method: 'POST',
    body: (() => {
      const formData = new FormData(form);
      formData.append('edit-work.edit_note', MB.relationshipEditor.state.editNoteField.value);
      return formData;
    })()
  })), map(response => response.url), map(url => url.split('/').pop()), mergeMap(async mbid => await fetchJSON(`/ws/js/entity/${mbid}`)), tap(work => {
    if (work) {
      form.dispatchEvent(new Event('submit'));
    }
  })));
}
async function submitWorks() {
  const addWorkRelationships = await firstValueFrom(from(MB.tree.iterate(MB.relationshipEditor.state.mediums)).pipe(mergeMap(([, mediumState]) => from(MB.tree.iterate(mediumState))), mergeMap(recordingState => zip(from(MB.tree.iterate(recordingState.relatedWorks)), of(recordingState).pipe(repeat()))), distinct(([relatedWork]) => relatedWork.work.id), map(([relatedWork, recordingState]) => [recordingState, document.getElementById(`submit-work-${relatedWork.work.id}`)]), filter(([, form]) => form !== null)).pipe(mergeMap(async ([recordingState, form]) => [recordingState, await submitWork(form)]), map(([recordingState, newWork]) => [MB.tree.find(recordingState.targetTypeGroups, 'work', compareTargetTypeWithGroup, null), newWork]), filter(pair => pair[0] !== null), mergeMap(([workTargetGroup, newWork]) => zip(from(iterateRelationshipsInTargetTypeGroup(workTargetGroup)), of(newWork).pipe(repeat()))), filter(([relationship]) => relationship._status === REL_STATUS_ADD), toArray()));
  MB.relationshipEditor.dispatch({
    type: 'update-submitted-relationships',
    edits: addWorkRelationships.map(([relationship, newWork]) => [[relationship], {
      comment: newWork.comment,
      edit_type: EDIT_WORK_CREATE,
      languages: newWork.languages.map(x => x.language.id),
      name: newWork.name,
      type_id: newWork.typeID
    }]),
    responseData: {
      edits: addWorkRelationships.map(([, newWork]) => ({
        edit_type: EDIT_WORK_CREATE,
        entity: newWork,
        response: WS_EDIT_RESPONSE_OK
      }))
    }
  });
}

let SelectionStatus = /*#__PURE__*/function (SelectionStatus) {
  SelectionStatus[SelectionStatus["VALID"] = 0] = "VALID";
  SelectionStatus[SelectionStatus["NO_RECORDINGS"] = 1] = "NO_RECORDINGS";
  SelectionStatus[SelectionStatus["MULTIPLE_MEDIA"] = 2] = "MULTIPLE_MEDIA";
  return SelectionStatus;
}({});

// https://docs.solidjs.com/configuration/typescript#custom-directives

function validateAlbumId(input, accessor) {
  const [[albumId, setAlbumId], setAlbumIdValid] = accessor();
  input.oninput = () => {
    setAlbumId(input.value);
    if (/^\d+$/.test(albumId())) {
      setAlbumIdValid(true);
      input.setCustomValidity('');
    } else {
      setAlbumIdValid(false);
      input.setCustomValidity('Album ID must be a number');
    }
    input.reportValidity();
  };
}
function validateSelection(selectedRecordings) {
  if (!selectedRecordings || selectedRecordings.size == 0) {
    return SelectionStatus.NO_RECORDINGS;
  }
  const selectedMediums = new Set(MB.tree.toArray(MB.tree.map(selectedRecordings, recording => MB.relationshipEditor.state.mediumsByRecordingId.get(recording.id))).flat());
  if (selectedMediums.size > 1) {
    return SelectionStatus.MULTIPLE_MEDIA;
  }
  return SelectionStatus.VALID;
}

var _tmpl$ = /*#__PURE__*/web.template(`<img src=https://nocs.acum.org.il/acumsitesearchdb/resources/images/faviconSite.svg alt="ACUM logo"style=width:16px;height:16px;margin:2px>`),
  _tmpl$2 = /*#__PURE__*/web.template(`<span>Import works from ACUM`),
  _tmpl$3 = /*#__PURE__*/web.template(`<span>Submit works`),
  _tmpl$4 = /*#__PURE__*/web.template(`<span>Cancel`),
  _tmpl$5 = /*#__PURE__*/web.template(`<div class=buttons><input type=text placeholder="Album ID">`),
  _tmpl$6 = /*#__PURE__*/web.template(`<div><p>This will add a new work for each checked recording that has no work already`),
  _tmpl$7 = /*#__PURE__*/web.template(`<div id=acum-work-import-container>`);
function AcumImporter(props) {
  const [albumId, setAlbumId] = solidJs.createSignal('Album ID');
  const [selectedRecordings, setSelectedRecordings] = solidJs.createSignal(MB.relationshipEditor.state.selectedRecordings);
  props.recordingCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', () => setSelectedRecordings(MB.relationshipEditor.state.selectedRecordings));
  });
  const selectionStatus = solidJs.createMemo(() => validateSelection(selectedRecordings()));
  const [albumIdValid, setAlbumIdValid] = solidJs.createSignal(false);
  const inputValid = solidJs.createMemo(() => albumIdValid() && selectionStatus() == SelectionStatus.VALID);
  const {
    addWarning,
    clearWarnings
  } = useWarnings();
  const [worksPending, setWorksPending] = solidJs.createSignal(false);
  // need dependencies explicit to avoid infinite recursion
  // otherwise, the warning actions will trigger the effect again
  solidJs.createEffect(solidJs.on([albumIdValid, selectionStatus], () => {
    if (albumIdValid()) {
      switch (selectionStatus()) {
        case SelectionStatus.VALID:
          clearWarnings(/select .*/);
          break;
        case SelectionStatus.NO_RECORDINGS:
          addWarning('select at least one recording');
          break;
        case SelectionStatus.MULTIPLE_MEDIA:
          addWarning('select recordings only from a single medium');
          break;
      }
    }
  }));
  solidJs.createEffect(prevTitle => {
    const submitButton = document.querySelector('Button.submit');
    submitButton.disabled = worksPending();
    submitButton.title = worksPending() ? 'Submit works or cancel first' : prevTitle != null ? prevTitle : submitButton.title;
    return submitButton.title;
  });
  function submitWorks$1() {
    clearWarnings(/submission failed.*/);
    submitWorks().then(() => {
      setWorksPending(false);
      clearWarnings();
    }).catch(err => addWarning(`submission failed: ${err}`));
  }
  function cancel() {
    setWorksPending(false);
    clearWarnings();
  }
  return [(() => {
    var _el$ = _tmpl$5(),
      _el$4 = _el$.firstChild;
    web.insert(_el$, web.createComponent(Button, {
      get disabled() {
        return !inputValid();
      },
      onclick: async () => setWorksPending(await importWorks(albumId(), addWarning, clearWarnings)),
      get children() {
        return [_tmpl$(), _tmpl$2()];
      }
    }), _el$4);
    web.use(validateAlbumId, _el$4, () => [[albumId, setAlbumId], setAlbumIdValid]);
    web.insert(_el$, web.createComponent(Button, {
      id: "acum-work-submit",
      "class": "worksubmit",
      get disabled() {
        return !worksPending();
      },
      onclick: submitWorks$1,
      get children() {
        return _tmpl$3();
      }
    }), null);
    web.insert(_el$, web.createComponent(Button, {
      id: "acum-work-cancel",
      "class": "worksubmit",
      get disabled() {
        return !worksPending();
      },
      onclick: cancel,
      get children() {
        return _tmpl$4();
      }
    }), null);
    return _el$;
  })(), _tmpl$6(), web.createComponent(Warnings, {})];
}
function createUI(recordingCheckboxes) {
  const toolbox = releaseEditorTools();
  const container = _tmpl$7();
  toolbox.append(container);
  web.render(() => web.createComponent(WarningsProvider, {
    get children() {
      return web.createComponent(AcumImporter, {
        recordingCheckboxes: recordingCheckboxes
      });
    }
  }), container);
}

main();
function main() {
  VM.observe(document.body, () => {
    const recordingCheckboxes = document.querySelectorAll('input[type=checkbox].recording, input[type=checkbox].medium-recordings, input[type=checkbox].all-recordings');
    if (recordingCheckboxes.length > 0) {
      createUI(recordingCheckboxes);
      return true;
    }
  });
}

})(VM.solid.web, VM.solid, VM.solid.store);
