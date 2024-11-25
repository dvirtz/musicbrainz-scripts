// ==UserScript==
// @name        setlist.fm event importer
// @description Add a button to import a setlist.fm event to MusicBrainz
// @version     1.2.1
// @author      Dvir Yitzchaki (dvirtz@gmail.com)
// @namespace   https://github.com/dvirtz/musicbrainz-scripts
// @downloadURL https://github.com/dvirtz/musicbrainz-scripts/raw/main/scripts/setlistfm-musicbrainz-import/setlistfm-musicbrainz-import.user.js
// @updateURL   https://github.com/dvirtz/musicbrainz-scripts/raw/main/scripts/setlistfm-musicbrainz-import/setlistfm-musicbrainz-import.user.js
// @supportURL  https://github.com/dvirtz/musicbrainz-scripts/issues
// @match       *://www.setlist.fm/setlist/*
// @match       *://www.setlist.fm/venue/*
// @icon        https://api.setlist.fm/favicon.ico
// @require     https://cdn.jsdelivr.net/npm/@violentmonkey/dom@2
// @require     https://cdn.jsdelivr.net/npm/@violentmonkey/ui@0.7
// @require     https://cdn.jsdelivr.net/npm/@violentmonkey/dom@2/dist/solid.min.js
// @license     MIT
// @run-at      document-end
// @grant       GM_getValue
// @grant       GM_info
// @grant       GM_registerMenuCommand
// @grant       GM_setValues
// ==/UserScript==

(function (web, ui, solidJs) {
'use strict';

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
const tryFetchJSON = (url, options) => tryFetch(fetchJSON)(url, options);
async function fetchJSON(url, options) {
  const response = await fetchResponse(url, Object.assign(Object.assign({
    headers: {
      Accept: 'application/json'
    }
  }, options == null ? void 0 : options.headers), options));
  return await response.json();
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

function convertMonth(monthName) {
  const monthMap = {
    Jan: 1,
    January: 1,
    Feb: 2,
    February: 2,
    Mar: 3,
    March: 3,
    Apr: 4,
    April: 4,
    May: 5,
    Jun: 6,
    June: 6,
    Jul: 7,
    July: 7,
    Aug: 8,
    August: 8,
    Sep: 9,
    September: 9,
    Oct: 10,
    October: 10,
    Nov: 11,
    November: 11,
    Dec: 12,
    December: 12
  };

  // convert 3-letter month name to number
  return monthMap[monthName];
}

// from https://github.com/kellnerd/es-utils/blob/main/dom/react.js
function editNote(message) {
  return `----
${message} using ${GM.info.script.name} version ${GM.info.script.version} from ${GM.info.script.namespace}. `;
}

var css_248z = "*,:after,:before{--tw-border-spacing-x:0;--tw-border-spacing-y:0;--tw-translate-x:0;--tw-translate-y:0;--tw-rotate:0;--tw-skew-x:0;--tw-skew-y:0;--tw-scale-x:1;--tw-scale-y:1;--tw-pan-x: ;--tw-pan-y: ;--tw-pinch-zoom: ;--tw-scroll-snap-strictness:proximity;--tw-gradient-from-position: ;--tw-gradient-via-position: ;--tw-gradient-to-position: ;--tw-ordinal: ;--tw-slashed-zero: ;--tw-numeric-figure: ;--tw-numeric-spacing: ;--tw-numeric-fraction: ;--tw-ring-inset: ;--tw-ring-offset-width:0px;--tw-ring-offset-color:#fff;--tw-ring-color:rgba(59,130,246,.5);--tw-ring-offset-shadow:0 0 #0000;--tw-ring-shadow:0 0 #0000;--tw-shadow:0 0 #0000;--tw-shadow-colored:0 0 #0000;--tw-blur: ;--tw-brightness: ;--tw-contrast: ;--tw-grayscale: ;--tw-hue-rotate: ;--tw-invert: ;--tw-saturate: ;--tw-sepia: ;--tw-drop-shadow: ;--tw-backdrop-blur: ;--tw-backdrop-brightness: ;--tw-backdrop-contrast: ;--tw-backdrop-grayscale: ;--tw-backdrop-hue-rotate: ;--tw-backdrop-invert: ;--tw-backdrop-opacity: ;--tw-backdrop-saturate: ;--tw-backdrop-sepia: ;--tw-contain-size: ;--tw-contain-layout: ;--tw-contain-paint: ;--tw-contain-style: }::backdrop{--tw-border-spacing-x:0;--tw-border-spacing-y:0;--tw-translate-x:0;--tw-translate-y:0;--tw-rotate:0;--tw-skew-x:0;--tw-skew-y:0;--tw-scale-x:1;--tw-scale-y:1;--tw-pan-x: ;--tw-pan-y: ;--tw-pinch-zoom: ;--tw-scroll-snap-strictness:proximity;--tw-gradient-from-position: ;--tw-gradient-via-position: ;--tw-gradient-to-position: ;--tw-ordinal: ;--tw-slashed-zero: ;--tw-numeric-figure: ;--tw-numeric-spacing: ;--tw-numeric-fraction: ;--tw-ring-inset: ;--tw-ring-offset-width:0px;--tw-ring-offset-color:#fff;--tw-ring-color:rgba(59,130,246,.5);--tw-ring-offset-shadow:0 0 #0000;--tw-ring-shadow:0 0 #0000;--tw-shadow:0 0 #0000;--tw-shadow-colored:0 0 #0000;--tw-blur: ;--tw-brightness: ;--tw-contrast: ;--tw-grayscale: ;--tw-hue-rotate: ;--tw-invert: ;--tw-saturate: ;--tw-sepia: ;--tw-drop-shadow: ;--tw-backdrop-blur: ;--tw-backdrop-brightness: ;--tw-backdrop-contrast: ;--tw-backdrop-grayscale: ;--tw-backdrop-hue-rotate: ;--tw-backdrop-invert: ;--tw-backdrop-opacity: ;--tw-backdrop-saturate: ;--tw-backdrop-sepia: ;--tw-contain-size: ;--tw-contain-layout: ;--tw-contain-paint: ;--tw-contain-style: }/*! tailwindcss v3.4.14 | MIT License | https://tailwindcss.com*/*,:after,:before{border:0 solid #e5e7eb;box-sizing:border-box}:after,:before{--tw-content:\"\"}:host,html{-webkit-text-size-adjust:100%;font-feature-settings:normal;-webkit-tap-highlight-color:transparent;font-family:ui-sans-serif,system-ui,sans-serif,Apple Color Emoji,Segoe UI Emoji,Segoe UI Symbol,Noto Color Emoji;font-variation-settings:normal;line-height:1.5;-moz-tab-size:4;tab-size:4}body{line-height:inherit;margin:0}hr{border-top-width:1px;color:inherit;height:0}abbr:where([title]){text-decoration:underline dotted}h1,h2,h3,h4,h5,h6{font-size:inherit;font-weight:inherit}a{color:inherit;text-decoration:inherit}b,strong{font-weight:bolder}code,kbd,pre,samp{font-feature-settings:normal;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,Liberation Mono,Courier New,monospace;font-size:1em;font-variation-settings:normal}small{font-size:80%}sub,sup{font-size:75%;line-height:0;position:relative;vertical-align:initial}sub{bottom:-.25em}sup{top:-.5em}table{border-collapse:collapse;border-color:inherit;text-indent:0}button,input,optgroup,select,textarea{font-feature-settings:inherit;color:inherit;font-family:inherit;font-size:100%;font-variation-settings:inherit;font-weight:inherit;letter-spacing:inherit;line-height:inherit;margin:0;padding:0}button,select{text-transform:none}button,input:where([type=button]),input:where([type=reset]),input:where([type=submit]){-webkit-appearance:button;background-color:initial;background-image:none}:-moz-focusring{outline:auto}:-moz-ui-invalid{box-shadow:none}progress{vertical-align:initial}::-webkit-inner-spin-button,::-webkit-outer-spin-button{height:auto}[type=search]{-webkit-appearance:textfield;outline-offset:-2px}::-webkit-search-decoration{-webkit-appearance:none}::-webkit-file-upload-button{-webkit-appearance:button;font:inherit}summary{display:list-item}blockquote,dd,dl,figure,h1,h2,h3,h4,h5,h6,hr,p,pre{margin:0}fieldset{margin:0}fieldset,legend{padding:0}menu,ol,ul{list-style:none;margin:0;padding:0}dialog{padding:0}textarea{resize:vertical}input::placeholder,textarea::placeholder{color:#9ca3af;opacity:1}[role=button],button{cursor:pointer}:disabled{cursor:default}audio,canvas,embed,iframe,img,object,svg,video{display:block;vertical-align:middle}img,video{height:auto;max-width:100%}[hidden]:where(:not([hidden=until-found])){display:none}:host,:root{--background:0 0% 100%;--foreground:240 10% 3.9%;--muted:240 4.8% 95.9%;--muted-foreground:240 3.8% 46.1%;--popover:0 0% 100%;--popover-foreground:240 10% 3.9%;--border:240 5.9% 90%;--input:240 5.9% 90%;--card:0 0% 100%;--card-foreground:240 10% 3.9%;--primary:240 5.9% 10%;--primary-foreground:0 0% 98%;--secondary:240 4.8% 95.9%;--secondary-foreground:240 5.9% 10%;--accent:240 4.8% 95.9%;--accent-foreground:240 5.9% 10%;--destructive:0 84.2% 60.2%;--destructive-foreground:0 0% 98%;--info:204 94% 94%;--info-foreground:199 89% 48%;--success:149 80% 90%;--success-foreground:160 84% 39%;--warning:48 96% 89%;--warning-foreground:25 95% 53%;--error:0 93% 94%;--error-foreground:0 84% 60%;--ring:240 5.9% 10%;--radius:0.5rem}.dark,[data-kb-theme=dark]{--background:240 10% 3.9%;--foreground:0 0% 98%;--muted:240 3.7% 15.9%;--muted-foreground:240 5% 64.9%;--accent:240 3.7% 15.9%;--accent-foreground:0 0% 98%;--popover:240 10% 3.9%;--popover-foreground:0 0% 98%;--border:240 3.7% 15.9%;--input:240 3.7% 15.9%;--card:240 10% 3.9%;--card-foreground:0 0% 98%;--primary:0 0% 98%;--primary-foreground:240 5.9% 10%;--secondary:240 3.7% 15.9%;--secondary-foreground:0 0% 98%;--destructive:0 62.8% 30.6%;--destructive-foreground:0 0% 98%;--info:204 94% 94%;--info-foreground:199 89% 48%;--success:149 80% 90%;--success-foreground:160 84% 39%;--warning:48 96% 89%;--warning-foreground:25 95% 53%;--error:0 93% 94%;--error-foreground:0 84% 60%;--ring:240 4.9% 83.9%;--radius:0.5rem}*{border-color:hsl(var(--border))}body{font-feature-settings:\"rlig\" 1,\"calt\" 1;background-color:hsl(var(--background));color:hsl(var(--foreground))}.container{margin-left:auto;margin-right:auto;padding-left:2rem;padding-right:2rem;width:100%}@media (min-width:1400px){.container{max-width:1400px}}.sr-only{clip:rect(0,0,0,0);border-width:0;height:1px;margin:-1px;overflow:hidden;padding:0;position:absolute;white-space:nowrap;width:1px}.pointer-events-none{pointer-events:none}.fixed{position:fixed}.absolute{position:absolute}.relative{position:relative}.inset-0{inset:0}.left-1\\/2{left:50%}.right-4{right:1rem}.top-1\\/2{top:50%}.top-4{top:1rem}.z-50{z-index:50}.block{display:block}.flex{display:flex}.inline-flex{display:inline-flex}.table{display:table}.grid{display:grid}.size-10{height:2.5rem;width:2.5rem}.size-4{height:1rem;width:1rem}.size-5{height:1.25rem;width:1.25rem}.h-10{height:2.5rem}.h-11{height:2.75rem}.h-6{height:1.5rem}.h-9{height:2.25rem}.max-h-screen{max-height:100vh}.w-11{width:2.75rem}.w-full{width:100%}.max-w-lg{max-width:32rem}.shrink-0{flex-shrink:0}.flex-grow{flex-grow:1}.-translate-x-1\\/2{--tw-translate-x:-50%}.-translate-x-1\\/2,.-translate-y-1\\/2{transform:translate(var(--tw-translate-x),var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y))}.-translate-y-1\\/2{--tw-translate-y:-50%}.translate-x-0{--tw-translate-x:0px;transform:translate(var(--tw-translate-x),var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y))}.cursor-pointer{cursor:pointer}.flex-col{flex-direction:column}.flex-col-reverse{flex-direction:column-reverse}.items-start{align-items:flex-start}.items-center{align-items:center}.justify-center{justify-content:center}.gap-4{gap:1rem}.space-x-2>:not([hidden])~:not([hidden]){--tw-space-x-reverse:0;margin-left:calc(.5rem*(1 - var(--tw-space-x-reverse)));margin-right:calc(.5rem*var(--tw-space-x-reverse))}.space-y-1\\.5>:not([hidden])~:not([hidden]){--tw-space-y-reverse:0;margin-bottom:calc(.375rem*var(--tw-space-y-reverse));margin-top:calc(.375rem*(1 - var(--tw-space-y-reverse)))}.overflow-y-auto{overflow-y:auto}.rounded-full{border-radius:9999px}.rounded-md{border-radius:calc(var(--radius) - 2px)}.rounded-sm{border-radius:calc(var(--radius) - 4px)}.border{border-width:1px}.border-2{border-width:2px}.border-input{border-color:hsl(var(--input))}.border-primary{border-color:hsl(var(--primary))}.border-transparent{border-color:transparent}.bg-background{background-color:hsl(var(--background))}.bg-background\\/80{background-color:hsl(var(--background)/.8)}.bg-destructive{background-color:hsl(var(--destructive))}.bg-input{background-color:hsl(var(--input))}.bg-primary{background-color:hsl(var(--primary))}.bg-secondary{background-color:hsl(var(--secondary))}.p-6{padding:1.5rem}.px-3{padding-left:.75rem;padding-right:.75rem}.px-4{padding-left:1rem;padding-right:1rem}.px-8{padding-left:2rem;padding-right:2rem}.py-2{padding-bottom:.5rem;padding-top:.5rem}.text-center{text-align:center}.text-lg{font-size:1.125rem;line-height:1.75rem}.text-sm{font-size:.875rem;line-height:1.25rem}.font-medium{font-weight:500}.font-semibold{font-weight:600}.leading-none{line-height:1}.tracking-tight{letter-spacing:-.025em}.text-destructive-foreground{color:hsl(var(--destructive-foreground))}.text-muted-foreground{color:hsl(var(--muted-foreground))}.text-primary{color:hsl(var(--primary))}.text-primary-foreground{color:hsl(var(--primary-foreground))}.text-secondary-foreground{color:hsl(var(--secondary-foreground))}.underline-offset-4{text-underline-offset:4px}.opacity-70{opacity:.7}.shadow-lg{--tw-shadow:0 10px 15px -3px rgba(0,0,0,.1),0 4px 6px -4px rgba(0,0,0,.1);--tw-shadow-colored:0 10px 15px -3px var(--tw-shadow-color),0 4px 6px -4px var(--tw-shadow-color);box-shadow:var(--tw-ring-offset-shadow,0 0 #0000),var(--tw-ring-shadow,0 0 #0000),var(--tw-shadow)}.outline{outline-style:solid}.ring-0{--tw-ring-offset-shadow:var(--tw-ring-inset) 0 0 0 var(--tw-ring-offset-width) var(--tw-ring-offset-color);--tw-ring-shadow:var(--tw-ring-inset) 0 0 0 calc(var(--tw-ring-offset-width)) var(--tw-ring-color);box-shadow:var(--tw-ring-offset-shadow),var(--tw-ring-shadow),var(--tw-shadow,0 0 #0000)}.ring-offset-background{--tw-ring-offset-color:hsl(var(--background))}.filter{filter:var(--tw-blur) var(--tw-brightness) var(--tw-contrast) var(--tw-grayscale) var(--tw-hue-rotate) var(--tw-invert) var(--tw-saturate) var(--tw-sepia) var(--tw-drop-shadow)}.backdrop-blur-sm{--tw-backdrop-blur:blur(4px);backdrop-filter:var(--tw-backdrop-blur) var(--tw-backdrop-brightness) var(--tw-backdrop-contrast) var(--tw-backdrop-grayscale) var(--tw-backdrop-hue-rotate) var(--tw-backdrop-invert) var(--tw-backdrop-opacity) var(--tw-backdrop-saturate) var(--tw-backdrop-sepia)}.transition-\\[color\\2c background-color\\2c box-shadow\\]{transition-duration:.15s;transition-property:color,background-color,box-shadow;transition-timing-function:cubic-bezier(.4,0,.2,1)}.transition-colors{transition-duration:.15s;transition-property:color,background-color,border-color,text-decoration-color,fill,stroke;transition-timing-function:cubic-bezier(.4,0,.2,1)}.transition-opacity{transition-duration:.15s;transition-property:opacity;transition-timing-function:cubic-bezier(.4,0,.2,1)}.transition-transform{transition-duration:.15s;transition-property:transform;transition-timing-function:cubic-bezier(.4,0,.2,1)}.duration-200{transition-duration:.2s}@media (max-width:640px){.container{padding-left:1rem;padding-right:1rem}}::-webkit-scrollbar{width:16px}::-webkit-scrollbar-thumb{background-clip:content-box;background-color:hsl(var(--accent));border:4px solid transparent;border-radius:9999px}::-webkit-scrollbar-corner{display:none}.hover\\:bg-accent:hover{background-color:hsl(var(--accent))}.hover\\:bg-destructive\\/90:hover{background-color:hsl(var(--destructive)/.9)}.hover\\:bg-primary\\/90:hover{background-color:hsl(var(--primary)/.9)}.hover\\:bg-secondary\\/80:hover{background-color:hsl(var(--secondary)/.8)}.hover\\:text-accent-foreground:hover{color:hsl(var(--accent-foreground))}.hover\\:underline:hover{text-decoration-line:underline}.hover\\:opacity-100:hover{opacity:1}.focus\\:outline-none:focus{outline:2px solid transparent;outline-offset:2px}.focus\\:ring-2:focus{--tw-ring-offset-shadow:var(--tw-ring-inset) 0 0 0 var(--tw-ring-offset-width) var(--tw-ring-offset-color);--tw-ring-shadow:var(--tw-ring-inset) 0 0 0 calc(2px + var(--tw-ring-offset-width)) var(--tw-ring-color);box-shadow:var(--tw-ring-offset-shadow),var(--tw-ring-shadow),var(--tw-shadow,0 0 #0000)}.focus\\:ring-ring:focus{--tw-ring-color:hsl(var(--ring))}.focus\\:ring-offset-2:focus{--tw-ring-offset-width:2px}.focus-visible\\:outline-none:focus-visible{outline:2px solid transparent;outline-offset:2px}.focus-visible\\:ring-2:focus-visible{--tw-ring-offset-shadow:var(--tw-ring-inset) 0 0 0 var(--tw-ring-offset-width) var(--tw-ring-offset-color);--tw-ring-shadow:var(--tw-ring-inset) 0 0 0 calc(2px + var(--tw-ring-offset-width)) var(--tw-ring-color);box-shadow:var(--tw-ring-offset-shadow),var(--tw-ring-shadow),var(--tw-shadow,0 0 #0000)}.focus-visible\\:ring-ring:focus-visible{--tw-ring-color:hsl(var(--ring))}.focus-visible\\:ring-offset-2:focus-visible{--tw-ring-offset-width:2px}.disabled\\:pointer-events-none:disabled{pointer-events:none}.disabled\\:cursor-not-allowed:disabled{cursor:not-allowed}.disabled\\:opacity-50:disabled{opacity:.5}.peer:focus-visible~.peer-focus-visible\\:outline-none{outline:2px solid transparent;outline-offset:2px}.peer:focus-visible~.peer-focus-visible\\:ring-2{--tw-ring-offset-shadow:var(--tw-ring-inset) 0 0 0 var(--tw-ring-offset-width) var(--tw-ring-offset-color);--tw-ring-shadow:var(--tw-ring-inset) 0 0 0 calc(2px + var(--tw-ring-offset-width)) var(--tw-ring-color);box-shadow:var(--tw-ring-offset-shadow),var(--tw-ring-shadow),var(--tw-shadow,0 0 #0000)}.peer:focus-visible~.peer-focus-visible\\:ring-ring{--tw-ring-color:hsl(var(--ring))}.peer:focus-visible~.peer-focus-visible\\:ring-offset-2{--tw-ring-offset-width:2px}.peer:disabled~.peer-disabled\\:cursor-not-allowed{cursor:not-allowed}.peer:disabled~.peer-disabled\\:opacity-70{opacity:.7}.data-\\[checked\\]\\:translate-x-5[data-checked]{--tw-translate-x:1.25rem;transform:translate(var(--tw-translate-x),var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y))}.data-\\[disabled\\]\\:cursor-not-allowed[data-disabled]{cursor:not-allowed}.data-\\[checked\\]\\:border-none[data-checked],.data-\\[indeterminate\\]\\:border-none[data-indeterminate]{border-style:none}.data-\\[checked\\]\\:bg-primary[data-checked]{background-color:hsl(var(--primary))}.data-\\[expanded\\]\\:bg-accent[data-expanded]{background-color:hsl(var(--accent))}.data-\\[indeterminate\\]\\:bg-primary[data-indeterminate]{background-color:hsl(var(--primary))}.data-\\[checked\\]\\:text-primary-foreground[data-checked]{color:hsl(var(--primary-foreground))}.data-\\[expanded\\]\\:text-muted-foreground[data-expanded]{color:hsl(var(--muted-foreground))}.data-\\[indeterminate\\]\\:text-primary-foreground[data-indeterminate]{color:hsl(var(--primary-foreground))}.data-\\[disabled\\]\\:opacity-50[data-disabled]{opacity:.5}.data-\\[disabled\\]\\:opacity-70[data-disabled]{opacity:.7}@media (min-width:640px){.sm\\:max-w-\\[425px\\]{max-width:425px}.sm\\:flex-row{flex-direction:row}.sm\\:items-center{align-items:center}.sm\\:justify-end{justify-content:flex-end}.sm\\:space-x-2>:not([hidden])~:not([hidden]){--tw-space-x-reverse:0;margin-left:calc(.5rem*(1 - var(--tw-space-x-reverse)));margin-right:calc(.5rem*var(--tw-space-x-reverse))}.sm\\:rounded-lg{border-radius:var(--radius)}.sm\\:text-left{text-align:left}}.\\[\\&\\:focus-visible\\+div\\]\\:outline-none:focus-visible+div{outline:2px solid transparent;outline-offset:2px}.\\[\\&\\:focus-visible\\+div\\]\\:ring-2:focus-visible+div{--tw-ring-offset-shadow:var(--tw-ring-inset) 0 0 0 var(--tw-ring-offset-width) var(--tw-ring-offset-color);--tw-ring-shadow:var(--tw-ring-inset) 0 0 0 calc(2px + var(--tw-ring-offset-width)) var(--tw-ring-color);box-shadow:var(--tw-ring-offset-shadow),var(--tw-ring-shadow),var(--tw-shadow,0 0 #0000)}.\\[\\&\\:focus-visible\\+div\\]\\:ring-ring:focus-visible+div{--tw-ring-color:hsl(var(--ring))}.\\[\\&\\:focus-visible\\+div\\]\\:ring-offset-2:focus-visible+div{--tw-ring-offset-width:2px}.\\[\\&\\:focus-visible\\+div\\]\\:ring-offset-background:focus-visible+div{--tw-ring-offset-color:hsl(var(--background))}";

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
function isFunction(value) {
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
    if (isFunction(handler)) {
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
function noop() {
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
  let clickHandler = noop;
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

var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/button/index.tsx
var button_exports = {};
__export(button_exports, {
  Button: () => Button$1,
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
var Button$1 = ButtonRoot;

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

// src/dialog/index.tsx
var dialog_exports = {};
__export(dialog_exports, {
  CloseButton: () => DialogCloseButton,
  Content: () => DialogContent$1,
  Description: () => DialogDescription,
  Dialog: () => Dialog$1,
  Overlay: () => DialogOverlay$1,
  Portal: () => DialogPortal$1,
  Root: () => DialogRoot,
  Title: () => DialogTitle$1,
  Trigger: () => DialogTrigger
});
var DialogContext = solidJs.createContext();
function useDialogContext() {
  const context = solidJs.useContext(DialogContext);
  if (context === void 0) {
    throw new Error("[kobalte]: `useDialogContext` must be used within a `Dialog` component");
  }
  return context;
}

// src/dialog/dialog-close-button.tsx
function DialogCloseButton(props) {
  const context = useDialogContext();
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
  }, others));
}
function DialogContent$1(props) {
  let ref;
  const context = useDialogContext();
  const mergedProps = mergeDefaultProps({
    id: context.generateId("content")
  }, props);
  const [local, others] = solidJs.splitProps(mergedProps, ["ref", "onOpenAutoFocus", "onCloseAutoFocus", "onPointerDownOutside", "onFocusOutside", "onInteractOutside"]);
  let hasInteractedOutside = false;
  let hasPointerDownOutside = false;
  const onPointerDownOutside = (e) => {
    local.onPointerDownOutside?.(e);
    if (context.modal() && e.detail.isContextMenu) {
      e.preventDefault();
    }
  };
  const onFocusOutside = (e) => {
    local.onFocusOutside?.(e);
    if (context.modal()) {
      e.preventDefault();
    }
  };
  const onInteractOutside = (e) => {
    local.onInteractOutside?.(e);
    if (context.modal()) {
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
  const onCloseAutoFocus = (e) => {
    local.onCloseAutoFocus?.(e);
    if (context.modal()) {
      e.preventDefault();
      focusWithoutScrolling(context.triggerRef());
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
  createHideOutside({
    isDisabled: () => !(context.isOpen() && context.modal()),
    targets: () => ref ? [ref] : []
  });
  src_default$1({
    element: () => ref ?? null,
    enabled: () => context.contentPresent() && context.preventScroll()
  });
  createFocusScope({
    trapFocus: () => context.isOpen() && context.modal(),
    onMountAutoFocus: local.onOpenAutoFocus,
    onUnmountAutoFocus: onCloseAutoFocus
  }, () => ref);
  solidJs.createEffect(() => solidJs.onCleanup(context.registerContentId(others.id)));
  return web.createComponent(solidJs.Show, {
    get when() {
      return context.contentPresent();
    },
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
          return web.memo(() => !!context.modal())() && context.isOpen();
        },
        get excludedElements() {
          return [context.triggerRef];
        },
        get ["aria-labelledby"]() {
          return context.titleId();
        },
        get ["aria-describedby"]() {
          return context.descriptionId();
        },
        get ["data-expanded"]() {
          return context.isOpen() ? "" : void 0;
        },
        get ["data-closed"]() {
          return !context.isOpen() ? "" : void 0;
        },
        onPointerDownOutside,
        onFocusOutside,
        onInteractOutside,
        get onDismiss() {
          return context.close;
        }
      }, others));
    }
  });
}
function DialogDescription(props) {
  const context = useDialogContext();
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
  }, others));
}
function DialogOverlay$1(props) {
  const context = useDialogContext();
  const [local, others] = solidJs.splitProps(props, ["ref", "style", "onPointerDown"]);
  const onPointerDown = (e) => {
    callHandler(e, local.onPointerDown);
    if (e.target === e.currentTarget) {
      e.preventDefault();
    }
  };
  return web.createComponent(solidJs.Show, {
    get when() {
      return context.overlayPresent();
    },
    get children() {
      return web.createComponent(Polymorphic, web.mergeProps({
        as: "div",
        ref(r$) {
          const _ref$ = mergeRefs(context.setOverlayRef, local.ref);
          typeof _ref$ === "function" && _ref$(r$);
        },
        get style() {
          return combineStyle({
            "pointer-events": "auto"
          }, local.style);
        },
        get ["data-expanded"]() {
          return context.isOpen() ? "" : void 0;
        },
        get ["data-closed"]() {
          return !context.isOpen() ? "" : void 0;
        },
        onPointerDown
      }, others));
    }
  });
}
function DialogPortal$1(props) {
  const context = useDialogContext();
  return web.createComponent(solidJs.Show, {
    get when() {
      return context.contentPresent() || context.overlayPresent();
    },
    get children() {
      return web.createComponent(web.Portal, props);
    }
  });
}

// src/dialog/dialog.intl.ts
var DIALOG_INTL_TRANSLATIONS = {
  // `aria-label` of Dialog.CloseButton.
  dismiss: "Dismiss"
};

// src/dialog/dialog-root.tsx
function DialogRoot(props) {
  const defaultId = `dialog-${solidJs.createUniqueId()}`;
  const mergedProps = mergeDefaultProps({
    id: defaultId,
    modal: true,
    translations: DIALOG_INTL_TRANSLATIONS
  }, props);
  const [contentId, setContentId] = solidJs.createSignal();
  const [titleId, setTitleId] = solidJs.createSignal();
  const [descriptionId, setDescriptionId] = solidJs.createSignal();
  const [overlayRef, setOverlayRef] = solidJs.createSignal();
  const [contentRef, setContentRef] = solidJs.createSignal();
  const [triggerRef, setTriggerRef] = solidJs.createSignal();
  const disclosureState = createDisclosureState({
    open: () => mergedProps.open,
    defaultOpen: () => mergedProps.defaultOpen,
    onOpenChange: (isOpen) => mergedProps.onOpenChange?.(isOpen)
  });
  const shouldMount = () => mergedProps.forceMount || disclosureState.isOpen();
  const {
    present: overlayPresent
  } = src_default({
    show: shouldMount,
    element: () => overlayRef() ?? null
  });
  const {
    present: contentPresent
  } = src_default({
    show: shouldMount,
    element: () => contentRef() ?? null
  });
  const context = {
    translations: () => mergedProps.translations ?? DIALOG_INTL_TRANSLATIONS,
    isOpen: disclosureState.isOpen,
    modal: () => mergedProps.modal ?? true,
    preventScroll: () => mergedProps.preventScroll ?? context.modal(),
    contentId,
    titleId,
    descriptionId,
    triggerRef,
    overlayRef,
    setOverlayRef,
    contentRef,
    setContentRef,
    overlayPresent,
    contentPresent,
    close: disclosureState.close,
    toggle: disclosureState.toggle,
    setTriggerRef,
    generateId: createGenerateId(() => mergedProps.id),
    registerContentId: createRegisterId(setContentId),
    registerTitleId: createRegisterId(setTitleId),
    registerDescriptionId: createRegisterId(setDescriptionId)
  };
  return web.createComponent(DialogContext.Provider, {
    value: context,
    get children() {
      return mergedProps.children;
    }
  });
}
function DialogTitle$1(props) {
  const context = useDialogContext();
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
  }, others));
}
function DialogTrigger(props) {
  const context = useDialogContext();
  const [local, others] = solidJs.splitProps(props, ["ref", "onClick"]);
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
    get ["data-expanded"]() {
      return context.isOpen() ? "" : void 0;
    },
    get ["data-closed"]() {
      return !context.isOpen() ? "" : void 0;
    },
    onClick
  }, others));
}

// src/dialog/index.tsx
var Dialog$1 = Object.assign(DialogRoot, {
  CloseButton: DialogCloseButton,
  Content: DialogContent$1,
  Description: DialogDescription,
  Overlay: DialogOverlay$1,
  Portal: DialogPortal$1,
  Title: DialogTitle$1,
  Trigger: DialogTrigger
});

function r$1(e){var t,f,n="";if("string"==typeof e||"number"==typeof e)n+=e;else if("object"==typeof e)if(Array.isArray(e)){var o=e.length;for(t=0;t<o;t++)e[t]&&(f=r$1(e[t]))&&(n&&(n+=" "),n+=f);}else for(f in e)e[f]&&(n&&(n+=" "),n+=f);return n}function clsx$1(){for(var e,t,f=0,n="",o=arguments.length;f<o;f++)(e=arguments[f])&&(t=r$1(e))&&(n&&(n+=" "),n+=t);return n}

const CLASS_PART_SEPARATOR = '-';
const createClassGroupUtils = config => {
  const classMap = createClassMap(config);
  const {
    conflictingClassGroups,
    conflictingClassGroupModifiers
  } = config;
  const getClassGroupId = className => {
    const classParts = className.split(CLASS_PART_SEPARATOR);
    // Classes like `-inset-1` produce an empty string as first classPart. We assume that classes for negative values are used correctly and remove it from classParts.
    if (classParts[0] === '' && classParts.length !== 1) {
      classParts.shift();
    }
    return getGroupRecursive(classParts, classMap) || getGroupIdForArbitraryProperty(className);
  };
  const getConflictingClassGroupIds = (classGroupId, hasPostfixModifier) => {
    const conflicts = conflictingClassGroups[classGroupId] || [];
    if (hasPostfixModifier && conflictingClassGroupModifiers[classGroupId]) {
      return [...conflicts, ...conflictingClassGroupModifiers[classGroupId]];
    }
    return conflicts;
  };
  return {
    getClassGroupId,
    getConflictingClassGroupIds
  };
};
const getGroupRecursive = (classParts, classPartObject) => {
  if (classParts.length === 0) {
    return classPartObject.classGroupId;
  }
  const currentClassPart = classParts[0];
  const nextClassPartObject = classPartObject.nextPart.get(currentClassPart);
  const classGroupFromNextClassPart = nextClassPartObject ? getGroupRecursive(classParts.slice(1), nextClassPartObject) : undefined;
  if (classGroupFromNextClassPart) {
    return classGroupFromNextClassPart;
  }
  if (classPartObject.validators.length === 0) {
    return undefined;
  }
  const classRest = classParts.join(CLASS_PART_SEPARATOR);
  return classPartObject.validators.find(({
    validator
  }) => validator(classRest))?.classGroupId;
};
const arbitraryPropertyRegex = /^\[(.+)\]$/;
const getGroupIdForArbitraryProperty = className => {
  if (arbitraryPropertyRegex.test(className)) {
    const arbitraryPropertyClassName = arbitraryPropertyRegex.exec(className)[1];
    const property = arbitraryPropertyClassName?.substring(0, arbitraryPropertyClassName.indexOf(':'));
    if (property) {
      // I use two dots here because one dot is used as prefix for class groups in plugins
      return 'arbitrary..' + property;
    }
  }
};
/**
 * Exported for testing only
 */
const createClassMap = config => {
  const {
    theme,
    prefix
  } = config;
  const classMap = {
    nextPart: new Map(),
    validators: []
  };
  const prefixedClassGroupEntries = getPrefixedClassGroupEntries(Object.entries(config.classGroups), prefix);
  prefixedClassGroupEntries.forEach(([classGroupId, classGroup]) => {
    processClassesRecursively(classGroup, classMap, classGroupId, theme);
  });
  return classMap;
};
const processClassesRecursively = (classGroup, classPartObject, classGroupId, theme) => {
  classGroup.forEach(classDefinition => {
    if (typeof classDefinition === 'string') {
      const classPartObjectToEdit = classDefinition === '' ? classPartObject : getPart(classPartObject, classDefinition);
      classPartObjectToEdit.classGroupId = classGroupId;
      return;
    }
    if (typeof classDefinition === 'function') {
      if (isThemeGetter(classDefinition)) {
        processClassesRecursively(classDefinition(theme), classPartObject, classGroupId, theme);
        return;
      }
      classPartObject.validators.push({
        validator: classDefinition,
        classGroupId
      });
      return;
    }
    Object.entries(classDefinition).forEach(([key, classGroup]) => {
      processClassesRecursively(classGroup, getPart(classPartObject, key), classGroupId, theme);
    });
  });
};
const getPart = (classPartObject, path) => {
  let currentClassPartObject = classPartObject;
  path.split(CLASS_PART_SEPARATOR).forEach(pathPart => {
    if (!currentClassPartObject.nextPart.has(pathPart)) {
      currentClassPartObject.nextPart.set(pathPart, {
        nextPart: new Map(),
        validators: []
      });
    }
    currentClassPartObject = currentClassPartObject.nextPart.get(pathPart);
  });
  return currentClassPartObject;
};
const isThemeGetter = func => func.isThemeGetter;
const getPrefixedClassGroupEntries = (classGroupEntries, prefix) => {
  if (!prefix) {
    return classGroupEntries;
  }
  return classGroupEntries.map(([classGroupId, classGroup]) => {
    const prefixedClassGroup = classGroup.map(classDefinition => {
      if (typeof classDefinition === 'string') {
        return prefix + classDefinition;
      }
      if (typeof classDefinition === 'object') {
        return Object.fromEntries(Object.entries(classDefinition).map(([key, value]) => [prefix + key, value]));
      }
      return classDefinition;
    });
    return [classGroupId, prefixedClassGroup];
  });
};

// LRU cache inspired from hashlru (https://github.com/dominictarr/hashlru/blob/v1.0.4/index.js) but object replaced with Map to improve performance
const createLruCache = maxCacheSize => {
  if (maxCacheSize < 1) {
    return {
      get: () => undefined,
      set: () => {}
    };
  }
  let cacheSize = 0;
  let cache = new Map();
  let previousCache = new Map();
  const update = (key, value) => {
    cache.set(key, value);
    cacheSize++;
    if (cacheSize > maxCacheSize) {
      cacheSize = 0;
      previousCache = cache;
      cache = new Map();
    }
  };
  return {
    get(key) {
      let value = cache.get(key);
      if (value !== undefined) {
        return value;
      }
      if ((value = previousCache.get(key)) !== undefined) {
        update(key, value);
        return value;
      }
    },
    set(key, value) {
      if (cache.has(key)) {
        cache.set(key, value);
      } else {
        update(key, value);
      }
    }
  };
};
const IMPORTANT_MODIFIER = '!';
const createParseClassName = config => {
  const {
    separator,
    experimentalParseClassName
  } = config;
  const isSeparatorSingleCharacter = separator.length === 1;
  const firstSeparatorCharacter = separator[0];
  const separatorLength = separator.length;
  // parseClassName inspired by https://github.com/tailwindlabs/tailwindcss/blob/v3.2.2/src/util/splitAtTopLevelOnly.js
  const parseClassName = className => {
    const modifiers = [];
    let bracketDepth = 0;
    let modifierStart = 0;
    let postfixModifierPosition;
    for (let index = 0; index < className.length; index++) {
      let currentCharacter = className[index];
      if (bracketDepth === 0) {
        if (currentCharacter === firstSeparatorCharacter && (isSeparatorSingleCharacter || className.slice(index, index + separatorLength) === separator)) {
          modifiers.push(className.slice(modifierStart, index));
          modifierStart = index + separatorLength;
          continue;
        }
        if (currentCharacter === '/') {
          postfixModifierPosition = index;
          continue;
        }
      }
      if (currentCharacter === '[') {
        bracketDepth++;
      } else if (currentCharacter === ']') {
        bracketDepth--;
      }
    }
    const baseClassNameWithImportantModifier = modifiers.length === 0 ? className : className.substring(modifierStart);
    const hasImportantModifier = baseClassNameWithImportantModifier.startsWith(IMPORTANT_MODIFIER);
    const baseClassName = hasImportantModifier ? baseClassNameWithImportantModifier.substring(1) : baseClassNameWithImportantModifier;
    const maybePostfixModifierPosition = postfixModifierPosition && postfixModifierPosition > modifierStart ? postfixModifierPosition - modifierStart : undefined;
    return {
      modifiers,
      hasImportantModifier,
      baseClassName,
      maybePostfixModifierPosition
    };
  };
  if (experimentalParseClassName) {
    return className => experimentalParseClassName({
      className,
      parseClassName
    });
  }
  return parseClassName;
};
/**
 * Sorts modifiers according to following schema:
 * - Predefined modifiers are sorted alphabetically
 * - When an arbitrary variant appears, it must be preserved which modifiers are before and after it
 */
const sortModifiers = modifiers => {
  if (modifiers.length <= 1) {
    return modifiers;
  }
  const sortedModifiers = [];
  let unsortedModifiers = [];
  modifiers.forEach(modifier => {
    const isArbitraryVariant = modifier[0] === '[';
    if (isArbitraryVariant) {
      sortedModifiers.push(...unsortedModifiers.sort(), modifier);
      unsortedModifiers = [];
    } else {
      unsortedModifiers.push(modifier);
    }
  });
  sortedModifiers.push(...unsortedModifiers.sort());
  return sortedModifiers;
};
const createConfigUtils = config => ({
  cache: createLruCache(config.cacheSize),
  parseClassName: createParseClassName(config),
  ...createClassGroupUtils(config)
});
const SPLIT_CLASSES_REGEX = /\s+/;
const mergeClassList = (classList, configUtils) => {
  const {
    parseClassName,
    getClassGroupId,
    getConflictingClassGroupIds
  } = configUtils;
  /**
   * Set of classGroupIds in following format:
   * `{importantModifier}{variantModifiers}{classGroupId}`
   * @example 'float'
   * @example 'hover:focus:bg-color'
   * @example 'md:!pr'
   */
  const classGroupsInConflict = [];
  const classNames = classList.trim().split(SPLIT_CLASSES_REGEX);
  let result = '';
  for (let index = classNames.length - 1; index >= 0; index -= 1) {
    const originalClassName = classNames[index];
    const {
      modifiers,
      hasImportantModifier,
      baseClassName,
      maybePostfixModifierPosition
    } = parseClassName(originalClassName);
    let hasPostfixModifier = Boolean(maybePostfixModifierPosition);
    let classGroupId = getClassGroupId(hasPostfixModifier ? baseClassName.substring(0, maybePostfixModifierPosition) : baseClassName);
    if (!classGroupId) {
      if (!hasPostfixModifier) {
        // Not a Tailwind class
        result = originalClassName + (result.length > 0 ? ' ' + result : result);
        continue;
      }
      classGroupId = getClassGroupId(baseClassName);
      if (!classGroupId) {
        // Not a Tailwind class
        result = originalClassName + (result.length > 0 ? ' ' + result : result);
        continue;
      }
      hasPostfixModifier = false;
    }
    const variantModifier = sortModifiers(modifiers).join(':');
    const modifierId = hasImportantModifier ? variantModifier + IMPORTANT_MODIFIER : variantModifier;
    const classId = modifierId + classGroupId;
    if (classGroupsInConflict.includes(classId)) {
      // Tailwind class omitted due to conflict
      continue;
    }
    classGroupsInConflict.push(classId);
    const conflictGroups = getConflictingClassGroupIds(classGroupId, hasPostfixModifier);
    for (let i = 0; i < conflictGroups.length; ++i) {
      const group = conflictGroups[i];
      classGroupsInConflict.push(modifierId + group);
    }
    // Tailwind class not in conflict
    result = originalClassName + (result.length > 0 ? ' ' + result : result);
  }
  return result;
};

/**
 * The code in this file is copied from https://github.com/lukeed/clsx and modified to suit the needs of tailwind-merge better.
 *
 * Specifically:
 * - Runtime code from https://github.com/lukeed/clsx/blob/v1.2.1/src/index.js
 * - TypeScript types from https://github.com/lukeed/clsx/blob/v1.2.1/clsx.d.ts
 *
 * Original code has MIT license: Copyright (c) Luke Edwards <luke.edwards05@gmail.com> (lukeed.com)
 */
function twJoin() {
  let index = 0;
  let argument;
  let resolvedValue;
  let string = '';
  while (index < arguments.length) {
    if (argument = arguments[index++]) {
      if (resolvedValue = toValue(argument)) {
        string && (string += ' ');
        string += resolvedValue;
      }
    }
  }
  return string;
}
const toValue = mix => {
  if (typeof mix === 'string') {
    return mix;
  }
  let resolvedValue;
  let string = '';
  for (let k = 0; k < mix.length; k++) {
    if (mix[k]) {
      if (resolvedValue = toValue(mix[k])) {
        string && (string += ' ');
        string += resolvedValue;
      }
    }
  }
  return string;
};
function createTailwindMerge(createConfigFirst, ...createConfigRest) {
  let configUtils;
  let cacheGet;
  let cacheSet;
  let functionToCall = initTailwindMerge;
  function initTailwindMerge(classList) {
    const config = createConfigRest.reduce((previousConfig, createConfigCurrent) => createConfigCurrent(previousConfig), createConfigFirst());
    configUtils = createConfigUtils(config);
    cacheGet = configUtils.cache.get;
    cacheSet = configUtils.cache.set;
    functionToCall = tailwindMerge;
    return tailwindMerge(classList);
  }
  function tailwindMerge(classList) {
    const cachedResult = cacheGet(classList);
    if (cachedResult) {
      return cachedResult;
    }
    const result = mergeClassList(classList, configUtils);
    cacheSet(classList, result);
    return result;
  }
  return function callTailwindMerge() {
    return functionToCall(twJoin.apply(null, arguments));
  };
}
const fromTheme = key => {
  const themeGetter = theme => theme[key] || [];
  themeGetter.isThemeGetter = true;
  return themeGetter;
};
const arbitraryValueRegex = /^\[(?:([a-z-]+):)?(.+)\]$/i;
const fractionRegex = /^\d+\/\d+$/;
const stringLengths = /*#__PURE__*/new Set(['px', 'full', 'screen']);
const tshirtUnitRegex = /^(\d+(\.\d+)?)?(xs|sm|md|lg|xl)$/;
const lengthUnitRegex = /\d+(%|px|r?em|[sdl]?v([hwib]|min|max)|pt|pc|in|cm|mm|cap|ch|ex|r?lh|cq(w|h|i|b|min|max))|\b(calc|min|max|clamp)\(.+\)|^0$/;
const colorFunctionRegex = /^(rgba?|hsla?|hwb|(ok)?(lab|lch))\(.+\)$/;
// Shadow always begins with x and y offset separated by underscore optionally prepended by inset
const shadowRegex = /^(inset_)?-?((\d+)?\.?(\d+)[a-z]+|0)_-?((\d+)?\.?(\d+)[a-z]+|0)/;
const imageRegex = /^(url|image|image-set|cross-fade|element|(repeating-)?(linear|radial|conic)-gradient)\(.+\)$/;
const isLength = value => isNumber(value) || stringLengths.has(value) || fractionRegex.test(value);
const isArbitraryLength = value => getIsArbitraryValue(value, 'length', isLengthOnly);
const isNumber = value => Boolean(value) && !Number.isNaN(Number(value));
const isArbitraryNumber = value => getIsArbitraryValue(value, 'number', isNumber);
const isInteger = value => Boolean(value) && Number.isInteger(Number(value));
const isPercent = value => value.endsWith('%') && isNumber(value.slice(0, -1));
const isArbitraryValue = value => arbitraryValueRegex.test(value);
const isTshirtSize = value => tshirtUnitRegex.test(value);
const sizeLabels = /*#__PURE__*/new Set(['length', 'size', 'percentage']);
const isArbitrarySize = value => getIsArbitraryValue(value, sizeLabels, isNever);
const isArbitraryPosition = value => getIsArbitraryValue(value, 'position', isNever);
const imageLabels = /*#__PURE__*/new Set(['image', 'url']);
const isArbitraryImage = value => getIsArbitraryValue(value, imageLabels, isImage);
const isArbitraryShadow = value => getIsArbitraryValue(value, '', isShadow);
const isAny = () => true;
const getIsArbitraryValue = (value, label, testValue) => {
  const result = arbitraryValueRegex.exec(value);
  if (result) {
    if (result[1]) {
      return typeof label === 'string' ? result[1] === label : label.has(result[1]);
    }
    return testValue(result[2]);
  }
  return false;
};
const isLengthOnly = value =>
// `colorFunctionRegex` check is necessary because color functions can have percentages in them which which would be incorrectly classified as lengths.
// For example, `hsl(0 0% 0%)` would be classified as a length without this check.
// I could also use lookbehind assertion in `lengthUnitRegex` but that isn't supported widely enough.
lengthUnitRegex.test(value) && !colorFunctionRegex.test(value);
const isNever = () => false;
const isShadow = value => shadowRegex.test(value);
const isImage = value => imageRegex.test(value);
const getDefaultConfig = () => {
  const colors = fromTheme('colors');
  const spacing = fromTheme('spacing');
  const blur = fromTheme('blur');
  const brightness = fromTheme('brightness');
  const borderColor = fromTheme('borderColor');
  const borderRadius = fromTheme('borderRadius');
  const borderSpacing = fromTheme('borderSpacing');
  const borderWidth = fromTheme('borderWidth');
  const contrast = fromTheme('contrast');
  const grayscale = fromTheme('grayscale');
  const hueRotate = fromTheme('hueRotate');
  const invert = fromTheme('invert');
  const gap = fromTheme('gap');
  const gradientColorStops = fromTheme('gradientColorStops');
  const gradientColorStopPositions = fromTheme('gradientColorStopPositions');
  const inset = fromTheme('inset');
  const margin = fromTheme('margin');
  const opacity = fromTheme('opacity');
  const padding = fromTheme('padding');
  const saturate = fromTheme('saturate');
  const scale = fromTheme('scale');
  const sepia = fromTheme('sepia');
  const skew = fromTheme('skew');
  const space = fromTheme('space');
  const translate = fromTheme('translate');
  const getOverscroll = () => ['auto', 'contain', 'none'];
  const getOverflow = () => ['auto', 'hidden', 'clip', 'visible', 'scroll'];
  const getSpacingWithAutoAndArbitrary = () => ['auto', isArbitraryValue, spacing];
  const getSpacingWithArbitrary = () => [isArbitraryValue, spacing];
  const getLengthWithEmptyAndArbitrary = () => ['', isLength, isArbitraryLength];
  const getNumberWithAutoAndArbitrary = () => ['auto', isNumber, isArbitraryValue];
  const getPositions = () => ['bottom', 'center', 'left', 'left-bottom', 'left-top', 'right', 'right-bottom', 'right-top', 'top'];
  const getLineStyles = () => ['solid', 'dashed', 'dotted', 'double', 'none'];
  const getBlendModes = () => ['normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'color-dodge', 'color-burn', 'hard-light', 'soft-light', 'difference', 'exclusion', 'hue', 'saturation', 'color', 'luminosity'];
  const getAlign = () => ['start', 'end', 'center', 'between', 'around', 'evenly', 'stretch'];
  const getZeroAndEmpty = () => ['', '0', isArbitraryValue];
  const getBreaks = () => ['auto', 'avoid', 'all', 'avoid-page', 'page', 'left', 'right', 'column'];
  const getNumberAndArbitrary = () => [isNumber, isArbitraryValue];
  return {
    cacheSize: 500,
    separator: ':',
    theme: {
      colors: [isAny],
      spacing: [isLength, isArbitraryLength],
      blur: ['none', '', isTshirtSize, isArbitraryValue],
      brightness: getNumberAndArbitrary(),
      borderColor: [colors],
      borderRadius: ['none', '', 'full', isTshirtSize, isArbitraryValue],
      borderSpacing: getSpacingWithArbitrary(),
      borderWidth: getLengthWithEmptyAndArbitrary(),
      contrast: getNumberAndArbitrary(),
      grayscale: getZeroAndEmpty(),
      hueRotate: getNumberAndArbitrary(),
      invert: getZeroAndEmpty(),
      gap: getSpacingWithArbitrary(),
      gradientColorStops: [colors],
      gradientColorStopPositions: [isPercent, isArbitraryLength],
      inset: getSpacingWithAutoAndArbitrary(),
      margin: getSpacingWithAutoAndArbitrary(),
      opacity: getNumberAndArbitrary(),
      padding: getSpacingWithArbitrary(),
      saturate: getNumberAndArbitrary(),
      scale: getNumberAndArbitrary(),
      sepia: getZeroAndEmpty(),
      skew: getNumberAndArbitrary(),
      space: getSpacingWithArbitrary(),
      translate: getSpacingWithArbitrary()
    },
    classGroups: {
      // Layout
      /**
       * Aspect Ratio
       * @see https://tailwindcss.com/docs/aspect-ratio
       */
      aspect: [{
        aspect: ['auto', 'square', 'video', isArbitraryValue]
      }],
      /**
       * Container
       * @see https://tailwindcss.com/docs/container
       */
      container: ['container'],
      /**
       * Columns
       * @see https://tailwindcss.com/docs/columns
       */
      columns: [{
        columns: [isTshirtSize]
      }],
      /**
       * Break After
       * @see https://tailwindcss.com/docs/break-after
       */
      'break-after': [{
        'break-after': getBreaks()
      }],
      /**
       * Break Before
       * @see https://tailwindcss.com/docs/break-before
       */
      'break-before': [{
        'break-before': getBreaks()
      }],
      /**
       * Break Inside
       * @see https://tailwindcss.com/docs/break-inside
       */
      'break-inside': [{
        'break-inside': ['auto', 'avoid', 'avoid-page', 'avoid-column']
      }],
      /**
       * Box Decoration Break
       * @see https://tailwindcss.com/docs/box-decoration-break
       */
      'box-decoration': [{
        'box-decoration': ['slice', 'clone']
      }],
      /**
       * Box Sizing
       * @see https://tailwindcss.com/docs/box-sizing
       */
      box: [{
        box: ['border', 'content']
      }],
      /**
       * Display
       * @see https://tailwindcss.com/docs/display
       */
      display: ['block', 'inline-block', 'inline', 'flex', 'inline-flex', 'table', 'inline-table', 'table-caption', 'table-cell', 'table-column', 'table-column-group', 'table-footer-group', 'table-header-group', 'table-row-group', 'table-row', 'flow-root', 'grid', 'inline-grid', 'contents', 'list-item', 'hidden'],
      /**
       * Floats
       * @see https://tailwindcss.com/docs/float
       */
      float: [{
        float: ['right', 'left', 'none', 'start', 'end']
      }],
      /**
       * Clear
       * @see https://tailwindcss.com/docs/clear
       */
      clear: [{
        clear: ['left', 'right', 'both', 'none', 'start', 'end']
      }],
      /**
       * Isolation
       * @see https://tailwindcss.com/docs/isolation
       */
      isolation: ['isolate', 'isolation-auto'],
      /**
       * Object Fit
       * @see https://tailwindcss.com/docs/object-fit
       */
      'object-fit': [{
        object: ['contain', 'cover', 'fill', 'none', 'scale-down']
      }],
      /**
       * Object Position
       * @see https://tailwindcss.com/docs/object-position
       */
      'object-position': [{
        object: [...getPositions(), isArbitraryValue]
      }],
      /**
       * Overflow
       * @see https://tailwindcss.com/docs/overflow
       */
      overflow: [{
        overflow: getOverflow()
      }],
      /**
       * Overflow X
       * @see https://tailwindcss.com/docs/overflow
       */
      'overflow-x': [{
        'overflow-x': getOverflow()
      }],
      /**
       * Overflow Y
       * @see https://tailwindcss.com/docs/overflow
       */
      'overflow-y': [{
        'overflow-y': getOverflow()
      }],
      /**
       * Overscroll Behavior
       * @see https://tailwindcss.com/docs/overscroll-behavior
       */
      overscroll: [{
        overscroll: getOverscroll()
      }],
      /**
       * Overscroll Behavior X
       * @see https://tailwindcss.com/docs/overscroll-behavior
       */
      'overscroll-x': [{
        'overscroll-x': getOverscroll()
      }],
      /**
       * Overscroll Behavior Y
       * @see https://tailwindcss.com/docs/overscroll-behavior
       */
      'overscroll-y': [{
        'overscroll-y': getOverscroll()
      }],
      /**
       * Position
       * @see https://tailwindcss.com/docs/position
       */
      position: ['static', 'fixed', 'absolute', 'relative', 'sticky'],
      /**
       * Top / Right / Bottom / Left
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      inset: [{
        inset: [inset]
      }],
      /**
       * Right / Left
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      'inset-x': [{
        'inset-x': [inset]
      }],
      /**
       * Top / Bottom
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      'inset-y': [{
        'inset-y': [inset]
      }],
      /**
       * Start
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      start: [{
        start: [inset]
      }],
      /**
       * End
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      end: [{
        end: [inset]
      }],
      /**
       * Top
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      top: [{
        top: [inset]
      }],
      /**
       * Right
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      right: [{
        right: [inset]
      }],
      /**
       * Bottom
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      bottom: [{
        bottom: [inset]
      }],
      /**
       * Left
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      left: [{
        left: [inset]
      }],
      /**
       * Visibility
       * @see https://tailwindcss.com/docs/visibility
       */
      visibility: ['visible', 'invisible', 'collapse'],
      /**
       * Z-Index
       * @see https://tailwindcss.com/docs/z-index
       */
      z: [{
        z: ['auto', isInteger, isArbitraryValue]
      }],
      // Flexbox and Grid
      /**
       * Flex Basis
       * @see https://tailwindcss.com/docs/flex-basis
       */
      basis: [{
        basis: getSpacingWithAutoAndArbitrary()
      }],
      /**
       * Flex Direction
       * @see https://tailwindcss.com/docs/flex-direction
       */
      'flex-direction': [{
        flex: ['row', 'row-reverse', 'col', 'col-reverse']
      }],
      /**
       * Flex Wrap
       * @see https://tailwindcss.com/docs/flex-wrap
       */
      'flex-wrap': [{
        flex: ['wrap', 'wrap-reverse', 'nowrap']
      }],
      /**
       * Flex
       * @see https://tailwindcss.com/docs/flex
       */
      flex: [{
        flex: ['1', 'auto', 'initial', 'none', isArbitraryValue]
      }],
      /**
       * Flex Grow
       * @see https://tailwindcss.com/docs/flex-grow
       */
      grow: [{
        grow: getZeroAndEmpty()
      }],
      /**
       * Flex Shrink
       * @see https://tailwindcss.com/docs/flex-shrink
       */
      shrink: [{
        shrink: getZeroAndEmpty()
      }],
      /**
       * Order
       * @see https://tailwindcss.com/docs/order
       */
      order: [{
        order: ['first', 'last', 'none', isInteger, isArbitraryValue]
      }],
      /**
       * Grid Template Columns
       * @see https://tailwindcss.com/docs/grid-template-columns
       */
      'grid-cols': [{
        'grid-cols': [isAny]
      }],
      /**
       * Grid Column Start / End
       * @see https://tailwindcss.com/docs/grid-column
       */
      'col-start-end': [{
        col: ['auto', {
          span: ['full', isInteger, isArbitraryValue]
        }, isArbitraryValue]
      }],
      /**
       * Grid Column Start
       * @see https://tailwindcss.com/docs/grid-column
       */
      'col-start': [{
        'col-start': getNumberWithAutoAndArbitrary()
      }],
      /**
       * Grid Column End
       * @see https://tailwindcss.com/docs/grid-column
       */
      'col-end': [{
        'col-end': getNumberWithAutoAndArbitrary()
      }],
      /**
       * Grid Template Rows
       * @see https://tailwindcss.com/docs/grid-template-rows
       */
      'grid-rows': [{
        'grid-rows': [isAny]
      }],
      /**
       * Grid Row Start / End
       * @see https://tailwindcss.com/docs/grid-row
       */
      'row-start-end': [{
        row: ['auto', {
          span: [isInteger, isArbitraryValue]
        }, isArbitraryValue]
      }],
      /**
       * Grid Row Start
       * @see https://tailwindcss.com/docs/grid-row
       */
      'row-start': [{
        'row-start': getNumberWithAutoAndArbitrary()
      }],
      /**
       * Grid Row End
       * @see https://tailwindcss.com/docs/grid-row
       */
      'row-end': [{
        'row-end': getNumberWithAutoAndArbitrary()
      }],
      /**
       * Grid Auto Flow
       * @see https://tailwindcss.com/docs/grid-auto-flow
       */
      'grid-flow': [{
        'grid-flow': ['row', 'col', 'dense', 'row-dense', 'col-dense']
      }],
      /**
       * Grid Auto Columns
       * @see https://tailwindcss.com/docs/grid-auto-columns
       */
      'auto-cols': [{
        'auto-cols': ['auto', 'min', 'max', 'fr', isArbitraryValue]
      }],
      /**
       * Grid Auto Rows
       * @see https://tailwindcss.com/docs/grid-auto-rows
       */
      'auto-rows': [{
        'auto-rows': ['auto', 'min', 'max', 'fr', isArbitraryValue]
      }],
      /**
       * Gap
       * @see https://tailwindcss.com/docs/gap
       */
      gap: [{
        gap: [gap]
      }],
      /**
       * Gap X
       * @see https://tailwindcss.com/docs/gap
       */
      'gap-x': [{
        'gap-x': [gap]
      }],
      /**
       * Gap Y
       * @see https://tailwindcss.com/docs/gap
       */
      'gap-y': [{
        'gap-y': [gap]
      }],
      /**
       * Justify Content
       * @see https://tailwindcss.com/docs/justify-content
       */
      'justify-content': [{
        justify: ['normal', ...getAlign()]
      }],
      /**
       * Justify Items
       * @see https://tailwindcss.com/docs/justify-items
       */
      'justify-items': [{
        'justify-items': ['start', 'end', 'center', 'stretch']
      }],
      /**
       * Justify Self
       * @see https://tailwindcss.com/docs/justify-self
       */
      'justify-self': [{
        'justify-self': ['auto', 'start', 'end', 'center', 'stretch']
      }],
      /**
       * Align Content
       * @see https://tailwindcss.com/docs/align-content
       */
      'align-content': [{
        content: ['normal', ...getAlign(), 'baseline']
      }],
      /**
       * Align Items
       * @see https://tailwindcss.com/docs/align-items
       */
      'align-items': [{
        items: ['start', 'end', 'center', 'baseline', 'stretch']
      }],
      /**
       * Align Self
       * @see https://tailwindcss.com/docs/align-self
       */
      'align-self': [{
        self: ['auto', 'start', 'end', 'center', 'stretch', 'baseline']
      }],
      /**
       * Place Content
       * @see https://tailwindcss.com/docs/place-content
       */
      'place-content': [{
        'place-content': [...getAlign(), 'baseline']
      }],
      /**
       * Place Items
       * @see https://tailwindcss.com/docs/place-items
       */
      'place-items': [{
        'place-items': ['start', 'end', 'center', 'baseline', 'stretch']
      }],
      /**
       * Place Self
       * @see https://tailwindcss.com/docs/place-self
       */
      'place-self': [{
        'place-self': ['auto', 'start', 'end', 'center', 'stretch']
      }],
      // Spacing
      /**
       * Padding
       * @see https://tailwindcss.com/docs/padding
       */
      p: [{
        p: [padding]
      }],
      /**
       * Padding X
       * @see https://tailwindcss.com/docs/padding
       */
      px: [{
        px: [padding]
      }],
      /**
       * Padding Y
       * @see https://tailwindcss.com/docs/padding
       */
      py: [{
        py: [padding]
      }],
      /**
       * Padding Start
       * @see https://tailwindcss.com/docs/padding
       */
      ps: [{
        ps: [padding]
      }],
      /**
       * Padding End
       * @see https://tailwindcss.com/docs/padding
       */
      pe: [{
        pe: [padding]
      }],
      /**
       * Padding Top
       * @see https://tailwindcss.com/docs/padding
       */
      pt: [{
        pt: [padding]
      }],
      /**
       * Padding Right
       * @see https://tailwindcss.com/docs/padding
       */
      pr: [{
        pr: [padding]
      }],
      /**
       * Padding Bottom
       * @see https://tailwindcss.com/docs/padding
       */
      pb: [{
        pb: [padding]
      }],
      /**
       * Padding Left
       * @see https://tailwindcss.com/docs/padding
       */
      pl: [{
        pl: [padding]
      }],
      /**
       * Margin
       * @see https://tailwindcss.com/docs/margin
       */
      m: [{
        m: [margin]
      }],
      /**
       * Margin X
       * @see https://tailwindcss.com/docs/margin
       */
      mx: [{
        mx: [margin]
      }],
      /**
       * Margin Y
       * @see https://tailwindcss.com/docs/margin
       */
      my: [{
        my: [margin]
      }],
      /**
       * Margin Start
       * @see https://tailwindcss.com/docs/margin
       */
      ms: [{
        ms: [margin]
      }],
      /**
       * Margin End
       * @see https://tailwindcss.com/docs/margin
       */
      me: [{
        me: [margin]
      }],
      /**
       * Margin Top
       * @see https://tailwindcss.com/docs/margin
       */
      mt: [{
        mt: [margin]
      }],
      /**
       * Margin Right
       * @see https://tailwindcss.com/docs/margin
       */
      mr: [{
        mr: [margin]
      }],
      /**
       * Margin Bottom
       * @see https://tailwindcss.com/docs/margin
       */
      mb: [{
        mb: [margin]
      }],
      /**
       * Margin Left
       * @see https://tailwindcss.com/docs/margin
       */
      ml: [{
        ml: [margin]
      }],
      /**
       * Space Between X
       * @see https://tailwindcss.com/docs/space
       */
      'space-x': [{
        'space-x': [space]
      }],
      /**
       * Space Between X Reverse
       * @see https://tailwindcss.com/docs/space
       */
      'space-x-reverse': ['space-x-reverse'],
      /**
       * Space Between Y
       * @see https://tailwindcss.com/docs/space
       */
      'space-y': [{
        'space-y': [space]
      }],
      /**
       * Space Between Y Reverse
       * @see https://tailwindcss.com/docs/space
       */
      'space-y-reverse': ['space-y-reverse'],
      // Sizing
      /**
       * Width
       * @see https://tailwindcss.com/docs/width
       */
      w: [{
        w: ['auto', 'min', 'max', 'fit', 'svw', 'lvw', 'dvw', isArbitraryValue, spacing]
      }],
      /**
       * Min-Width
       * @see https://tailwindcss.com/docs/min-width
       */
      'min-w': [{
        'min-w': [isArbitraryValue, spacing, 'min', 'max', 'fit']
      }],
      /**
       * Max-Width
       * @see https://tailwindcss.com/docs/max-width
       */
      'max-w': [{
        'max-w': [isArbitraryValue, spacing, 'none', 'full', 'min', 'max', 'fit', 'prose', {
          screen: [isTshirtSize]
        }, isTshirtSize]
      }],
      /**
       * Height
       * @see https://tailwindcss.com/docs/height
       */
      h: [{
        h: [isArbitraryValue, spacing, 'auto', 'min', 'max', 'fit', 'svh', 'lvh', 'dvh']
      }],
      /**
       * Min-Height
       * @see https://tailwindcss.com/docs/min-height
       */
      'min-h': [{
        'min-h': [isArbitraryValue, spacing, 'min', 'max', 'fit', 'svh', 'lvh', 'dvh']
      }],
      /**
       * Max-Height
       * @see https://tailwindcss.com/docs/max-height
       */
      'max-h': [{
        'max-h': [isArbitraryValue, spacing, 'min', 'max', 'fit', 'svh', 'lvh', 'dvh']
      }],
      /**
       * Size
       * @see https://tailwindcss.com/docs/size
       */
      size: [{
        size: [isArbitraryValue, spacing, 'auto', 'min', 'max', 'fit']
      }],
      // Typography
      /**
       * Font Size
       * @see https://tailwindcss.com/docs/font-size
       */
      'font-size': [{
        text: ['base', isTshirtSize, isArbitraryLength]
      }],
      /**
       * Font Smoothing
       * @see https://tailwindcss.com/docs/font-smoothing
       */
      'font-smoothing': ['antialiased', 'subpixel-antialiased'],
      /**
       * Font Style
       * @see https://tailwindcss.com/docs/font-style
       */
      'font-style': ['italic', 'not-italic'],
      /**
       * Font Weight
       * @see https://tailwindcss.com/docs/font-weight
       */
      'font-weight': [{
        font: ['thin', 'extralight', 'light', 'normal', 'medium', 'semibold', 'bold', 'extrabold', 'black', isArbitraryNumber]
      }],
      /**
       * Font Family
       * @see https://tailwindcss.com/docs/font-family
       */
      'font-family': [{
        font: [isAny]
      }],
      /**
       * Font Variant Numeric
       * @see https://tailwindcss.com/docs/font-variant-numeric
       */
      'fvn-normal': ['normal-nums'],
      /**
       * Font Variant Numeric
       * @see https://tailwindcss.com/docs/font-variant-numeric
       */
      'fvn-ordinal': ['ordinal'],
      /**
       * Font Variant Numeric
       * @see https://tailwindcss.com/docs/font-variant-numeric
       */
      'fvn-slashed-zero': ['slashed-zero'],
      /**
       * Font Variant Numeric
       * @see https://tailwindcss.com/docs/font-variant-numeric
       */
      'fvn-figure': ['lining-nums', 'oldstyle-nums'],
      /**
       * Font Variant Numeric
       * @see https://tailwindcss.com/docs/font-variant-numeric
       */
      'fvn-spacing': ['proportional-nums', 'tabular-nums'],
      /**
       * Font Variant Numeric
       * @see https://tailwindcss.com/docs/font-variant-numeric
       */
      'fvn-fraction': ['diagonal-fractions', 'stacked-fractons'],
      /**
       * Letter Spacing
       * @see https://tailwindcss.com/docs/letter-spacing
       */
      tracking: [{
        tracking: ['tighter', 'tight', 'normal', 'wide', 'wider', 'widest', isArbitraryValue]
      }],
      /**
       * Line Clamp
       * @see https://tailwindcss.com/docs/line-clamp
       */
      'line-clamp': [{
        'line-clamp': ['none', isNumber, isArbitraryNumber]
      }],
      /**
       * Line Height
       * @see https://tailwindcss.com/docs/line-height
       */
      leading: [{
        leading: ['none', 'tight', 'snug', 'normal', 'relaxed', 'loose', isLength, isArbitraryValue]
      }],
      /**
       * List Style Image
       * @see https://tailwindcss.com/docs/list-style-image
       */
      'list-image': [{
        'list-image': ['none', isArbitraryValue]
      }],
      /**
       * List Style Type
       * @see https://tailwindcss.com/docs/list-style-type
       */
      'list-style-type': [{
        list: ['none', 'disc', 'decimal', isArbitraryValue]
      }],
      /**
       * List Style Position
       * @see https://tailwindcss.com/docs/list-style-position
       */
      'list-style-position': [{
        list: ['inside', 'outside']
      }],
      /**
       * Placeholder Color
       * @deprecated since Tailwind CSS v3.0.0
       * @see https://tailwindcss.com/docs/placeholder-color
       */
      'placeholder-color': [{
        placeholder: [colors]
      }],
      /**
       * Placeholder Opacity
       * @see https://tailwindcss.com/docs/placeholder-opacity
       */
      'placeholder-opacity': [{
        'placeholder-opacity': [opacity]
      }],
      /**
       * Text Alignment
       * @see https://tailwindcss.com/docs/text-align
       */
      'text-alignment': [{
        text: ['left', 'center', 'right', 'justify', 'start', 'end']
      }],
      /**
       * Text Color
       * @see https://tailwindcss.com/docs/text-color
       */
      'text-color': [{
        text: [colors]
      }],
      /**
       * Text Opacity
       * @see https://tailwindcss.com/docs/text-opacity
       */
      'text-opacity': [{
        'text-opacity': [opacity]
      }],
      /**
       * Text Decoration
       * @see https://tailwindcss.com/docs/text-decoration
       */
      'text-decoration': ['underline', 'overline', 'line-through', 'no-underline'],
      /**
       * Text Decoration Style
       * @see https://tailwindcss.com/docs/text-decoration-style
       */
      'text-decoration-style': [{
        decoration: [...getLineStyles(), 'wavy']
      }],
      /**
       * Text Decoration Thickness
       * @see https://tailwindcss.com/docs/text-decoration-thickness
       */
      'text-decoration-thickness': [{
        decoration: ['auto', 'from-font', isLength, isArbitraryLength]
      }],
      /**
       * Text Underline Offset
       * @see https://tailwindcss.com/docs/text-underline-offset
       */
      'underline-offset': [{
        'underline-offset': ['auto', isLength, isArbitraryValue]
      }],
      /**
       * Text Decoration Color
       * @see https://tailwindcss.com/docs/text-decoration-color
       */
      'text-decoration-color': [{
        decoration: [colors]
      }],
      /**
       * Text Transform
       * @see https://tailwindcss.com/docs/text-transform
       */
      'text-transform': ['uppercase', 'lowercase', 'capitalize', 'normal-case'],
      /**
       * Text Overflow
       * @see https://tailwindcss.com/docs/text-overflow
       */
      'text-overflow': ['truncate', 'text-ellipsis', 'text-clip'],
      /**
       * Text Wrap
       * @see https://tailwindcss.com/docs/text-wrap
       */
      'text-wrap': [{
        text: ['wrap', 'nowrap', 'balance', 'pretty']
      }],
      /**
       * Text Indent
       * @see https://tailwindcss.com/docs/text-indent
       */
      indent: [{
        indent: getSpacingWithArbitrary()
      }],
      /**
       * Vertical Alignment
       * @see https://tailwindcss.com/docs/vertical-align
       */
      'vertical-align': [{
        align: ['baseline', 'top', 'middle', 'bottom', 'text-top', 'text-bottom', 'sub', 'super', isArbitraryValue]
      }],
      /**
       * Whitespace
       * @see https://tailwindcss.com/docs/whitespace
       */
      whitespace: [{
        whitespace: ['normal', 'nowrap', 'pre', 'pre-line', 'pre-wrap', 'break-spaces']
      }],
      /**
       * Word Break
       * @see https://tailwindcss.com/docs/word-break
       */
      break: [{
        break: ['normal', 'words', 'all', 'keep']
      }],
      /**
       * Hyphens
       * @see https://tailwindcss.com/docs/hyphens
       */
      hyphens: [{
        hyphens: ['none', 'manual', 'auto']
      }],
      /**
       * Content
       * @see https://tailwindcss.com/docs/content
       */
      content: [{
        content: ['none', isArbitraryValue]
      }],
      // Backgrounds
      /**
       * Background Attachment
       * @see https://tailwindcss.com/docs/background-attachment
       */
      'bg-attachment': [{
        bg: ['fixed', 'local', 'scroll']
      }],
      /**
       * Background Clip
       * @see https://tailwindcss.com/docs/background-clip
       */
      'bg-clip': [{
        'bg-clip': ['border', 'padding', 'content', 'text']
      }],
      /**
       * Background Opacity
       * @deprecated since Tailwind CSS v3.0.0
       * @see https://tailwindcss.com/docs/background-opacity
       */
      'bg-opacity': [{
        'bg-opacity': [opacity]
      }],
      /**
       * Background Origin
       * @see https://tailwindcss.com/docs/background-origin
       */
      'bg-origin': [{
        'bg-origin': ['border', 'padding', 'content']
      }],
      /**
       * Background Position
       * @see https://tailwindcss.com/docs/background-position
       */
      'bg-position': [{
        bg: [...getPositions(), isArbitraryPosition]
      }],
      /**
       * Background Repeat
       * @see https://tailwindcss.com/docs/background-repeat
       */
      'bg-repeat': [{
        bg: ['no-repeat', {
          repeat: ['', 'x', 'y', 'round', 'space']
        }]
      }],
      /**
       * Background Size
       * @see https://tailwindcss.com/docs/background-size
       */
      'bg-size': [{
        bg: ['auto', 'cover', 'contain', isArbitrarySize]
      }],
      /**
       * Background Image
       * @see https://tailwindcss.com/docs/background-image
       */
      'bg-image': [{
        bg: ['none', {
          'gradient-to': ['t', 'tr', 'r', 'br', 'b', 'bl', 'l', 'tl']
        }, isArbitraryImage]
      }],
      /**
       * Background Color
       * @see https://tailwindcss.com/docs/background-color
       */
      'bg-color': [{
        bg: [colors]
      }],
      /**
       * Gradient Color Stops From Position
       * @see https://tailwindcss.com/docs/gradient-color-stops
       */
      'gradient-from-pos': [{
        from: [gradientColorStopPositions]
      }],
      /**
       * Gradient Color Stops Via Position
       * @see https://tailwindcss.com/docs/gradient-color-stops
       */
      'gradient-via-pos': [{
        via: [gradientColorStopPositions]
      }],
      /**
       * Gradient Color Stops To Position
       * @see https://tailwindcss.com/docs/gradient-color-stops
       */
      'gradient-to-pos': [{
        to: [gradientColorStopPositions]
      }],
      /**
       * Gradient Color Stops From
       * @see https://tailwindcss.com/docs/gradient-color-stops
       */
      'gradient-from': [{
        from: [gradientColorStops]
      }],
      /**
       * Gradient Color Stops Via
       * @see https://tailwindcss.com/docs/gradient-color-stops
       */
      'gradient-via': [{
        via: [gradientColorStops]
      }],
      /**
       * Gradient Color Stops To
       * @see https://tailwindcss.com/docs/gradient-color-stops
       */
      'gradient-to': [{
        to: [gradientColorStops]
      }],
      // Borders
      /**
       * Border Radius
       * @see https://tailwindcss.com/docs/border-radius
       */
      rounded: [{
        rounded: [borderRadius]
      }],
      /**
       * Border Radius Start
       * @see https://tailwindcss.com/docs/border-radius
       */
      'rounded-s': [{
        'rounded-s': [borderRadius]
      }],
      /**
       * Border Radius End
       * @see https://tailwindcss.com/docs/border-radius
       */
      'rounded-e': [{
        'rounded-e': [borderRadius]
      }],
      /**
       * Border Radius Top
       * @see https://tailwindcss.com/docs/border-radius
       */
      'rounded-t': [{
        'rounded-t': [borderRadius]
      }],
      /**
       * Border Radius Right
       * @see https://tailwindcss.com/docs/border-radius
       */
      'rounded-r': [{
        'rounded-r': [borderRadius]
      }],
      /**
       * Border Radius Bottom
       * @see https://tailwindcss.com/docs/border-radius
       */
      'rounded-b': [{
        'rounded-b': [borderRadius]
      }],
      /**
       * Border Radius Left
       * @see https://tailwindcss.com/docs/border-radius
       */
      'rounded-l': [{
        'rounded-l': [borderRadius]
      }],
      /**
       * Border Radius Start Start
       * @see https://tailwindcss.com/docs/border-radius
       */
      'rounded-ss': [{
        'rounded-ss': [borderRadius]
      }],
      /**
       * Border Radius Start End
       * @see https://tailwindcss.com/docs/border-radius
       */
      'rounded-se': [{
        'rounded-se': [borderRadius]
      }],
      /**
       * Border Radius End End
       * @see https://tailwindcss.com/docs/border-radius
       */
      'rounded-ee': [{
        'rounded-ee': [borderRadius]
      }],
      /**
       * Border Radius End Start
       * @see https://tailwindcss.com/docs/border-radius
       */
      'rounded-es': [{
        'rounded-es': [borderRadius]
      }],
      /**
       * Border Radius Top Left
       * @see https://tailwindcss.com/docs/border-radius
       */
      'rounded-tl': [{
        'rounded-tl': [borderRadius]
      }],
      /**
       * Border Radius Top Right
       * @see https://tailwindcss.com/docs/border-radius
       */
      'rounded-tr': [{
        'rounded-tr': [borderRadius]
      }],
      /**
       * Border Radius Bottom Right
       * @see https://tailwindcss.com/docs/border-radius
       */
      'rounded-br': [{
        'rounded-br': [borderRadius]
      }],
      /**
       * Border Radius Bottom Left
       * @see https://tailwindcss.com/docs/border-radius
       */
      'rounded-bl': [{
        'rounded-bl': [borderRadius]
      }],
      /**
       * Border Width
       * @see https://tailwindcss.com/docs/border-width
       */
      'border-w': [{
        border: [borderWidth]
      }],
      /**
       * Border Width X
       * @see https://tailwindcss.com/docs/border-width
       */
      'border-w-x': [{
        'border-x': [borderWidth]
      }],
      /**
       * Border Width Y
       * @see https://tailwindcss.com/docs/border-width
       */
      'border-w-y': [{
        'border-y': [borderWidth]
      }],
      /**
       * Border Width Start
       * @see https://tailwindcss.com/docs/border-width
       */
      'border-w-s': [{
        'border-s': [borderWidth]
      }],
      /**
       * Border Width End
       * @see https://tailwindcss.com/docs/border-width
       */
      'border-w-e': [{
        'border-e': [borderWidth]
      }],
      /**
       * Border Width Top
       * @see https://tailwindcss.com/docs/border-width
       */
      'border-w-t': [{
        'border-t': [borderWidth]
      }],
      /**
       * Border Width Right
       * @see https://tailwindcss.com/docs/border-width
       */
      'border-w-r': [{
        'border-r': [borderWidth]
      }],
      /**
       * Border Width Bottom
       * @see https://tailwindcss.com/docs/border-width
       */
      'border-w-b': [{
        'border-b': [borderWidth]
      }],
      /**
       * Border Width Left
       * @see https://tailwindcss.com/docs/border-width
       */
      'border-w-l': [{
        'border-l': [borderWidth]
      }],
      /**
       * Border Opacity
       * @see https://tailwindcss.com/docs/border-opacity
       */
      'border-opacity': [{
        'border-opacity': [opacity]
      }],
      /**
       * Border Style
       * @see https://tailwindcss.com/docs/border-style
       */
      'border-style': [{
        border: [...getLineStyles(), 'hidden']
      }],
      /**
       * Divide Width X
       * @see https://tailwindcss.com/docs/divide-width
       */
      'divide-x': [{
        'divide-x': [borderWidth]
      }],
      /**
       * Divide Width X Reverse
       * @see https://tailwindcss.com/docs/divide-width
       */
      'divide-x-reverse': ['divide-x-reverse'],
      /**
       * Divide Width Y
       * @see https://tailwindcss.com/docs/divide-width
       */
      'divide-y': [{
        'divide-y': [borderWidth]
      }],
      /**
       * Divide Width Y Reverse
       * @see https://tailwindcss.com/docs/divide-width
       */
      'divide-y-reverse': ['divide-y-reverse'],
      /**
       * Divide Opacity
       * @see https://tailwindcss.com/docs/divide-opacity
       */
      'divide-opacity': [{
        'divide-opacity': [opacity]
      }],
      /**
       * Divide Style
       * @see https://tailwindcss.com/docs/divide-style
       */
      'divide-style': [{
        divide: getLineStyles()
      }],
      /**
       * Border Color
       * @see https://tailwindcss.com/docs/border-color
       */
      'border-color': [{
        border: [borderColor]
      }],
      /**
       * Border Color X
       * @see https://tailwindcss.com/docs/border-color
       */
      'border-color-x': [{
        'border-x': [borderColor]
      }],
      /**
       * Border Color Y
       * @see https://tailwindcss.com/docs/border-color
       */
      'border-color-y': [{
        'border-y': [borderColor]
      }],
      /**
       * Border Color S
       * @see https://tailwindcss.com/docs/border-color
       */
      'border-color-s': [{
        'border-s': [borderColor]
      }],
      /**
       * Border Color E
       * @see https://tailwindcss.com/docs/border-color
       */
      'border-color-e': [{
        'border-e': [borderColor]
      }],
      /**
       * Border Color Top
       * @see https://tailwindcss.com/docs/border-color
       */
      'border-color-t': [{
        'border-t': [borderColor]
      }],
      /**
       * Border Color Right
       * @see https://tailwindcss.com/docs/border-color
       */
      'border-color-r': [{
        'border-r': [borderColor]
      }],
      /**
       * Border Color Bottom
       * @see https://tailwindcss.com/docs/border-color
       */
      'border-color-b': [{
        'border-b': [borderColor]
      }],
      /**
       * Border Color Left
       * @see https://tailwindcss.com/docs/border-color
       */
      'border-color-l': [{
        'border-l': [borderColor]
      }],
      /**
       * Divide Color
       * @see https://tailwindcss.com/docs/divide-color
       */
      'divide-color': [{
        divide: [borderColor]
      }],
      /**
       * Outline Style
       * @see https://tailwindcss.com/docs/outline-style
       */
      'outline-style': [{
        outline: ['', ...getLineStyles()]
      }],
      /**
       * Outline Offset
       * @see https://tailwindcss.com/docs/outline-offset
       */
      'outline-offset': [{
        'outline-offset': [isLength, isArbitraryValue]
      }],
      /**
       * Outline Width
       * @see https://tailwindcss.com/docs/outline-width
       */
      'outline-w': [{
        outline: [isLength, isArbitraryLength]
      }],
      /**
       * Outline Color
       * @see https://tailwindcss.com/docs/outline-color
       */
      'outline-color': [{
        outline: [colors]
      }],
      /**
       * Ring Width
       * @see https://tailwindcss.com/docs/ring-width
       */
      'ring-w': [{
        ring: getLengthWithEmptyAndArbitrary()
      }],
      /**
       * Ring Width Inset
       * @see https://tailwindcss.com/docs/ring-width
       */
      'ring-w-inset': ['ring-inset'],
      /**
       * Ring Color
       * @see https://tailwindcss.com/docs/ring-color
       */
      'ring-color': [{
        ring: [colors]
      }],
      /**
       * Ring Opacity
       * @see https://tailwindcss.com/docs/ring-opacity
       */
      'ring-opacity': [{
        'ring-opacity': [opacity]
      }],
      /**
       * Ring Offset Width
       * @see https://tailwindcss.com/docs/ring-offset-width
       */
      'ring-offset-w': [{
        'ring-offset': [isLength, isArbitraryLength]
      }],
      /**
       * Ring Offset Color
       * @see https://tailwindcss.com/docs/ring-offset-color
       */
      'ring-offset-color': [{
        'ring-offset': [colors]
      }],
      // Effects
      /**
       * Box Shadow
       * @see https://tailwindcss.com/docs/box-shadow
       */
      shadow: [{
        shadow: ['', 'inner', 'none', isTshirtSize, isArbitraryShadow]
      }],
      /**
       * Box Shadow Color
       * @see https://tailwindcss.com/docs/box-shadow-color
       */
      'shadow-color': [{
        shadow: [isAny]
      }],
      /**
       * Opacity
       * @see https://tailwindcss.com/docs/opacity
       */
      opacity: [{
        opacity: [opacity]
      }],
      /**
       * Mix Blend Mode
       * @see https://tailwindcss.com/docs/mix-blend-mode
       */
      'mix-blend': [{
        'mix-blend': [...getBlendModes(), 'plus-lighter', 'plus-darker']
      }],
      /**
       * Background Blend Mode
       * @see https://tailwindcss.com/docs/background-blend-mode
       */
      'bg-blend': [{
        'bg-blend': getBlendModes()
      }],
      // Filters
      /**
       * Filter
       * @deprecated since Tailwind CSS v3.0.0
       * @see https://tailwindcss.com/docs/filter
       */
      filter: [{
        filter: ['', 'none']
      }],
      /**
       * Blur
       * @see https://tailwindcss.com/docs/blur
       */
      blur: [{
        blur: [blur]
      }],
      /**
       * Brightness
       * @see https://tailwindcss.com/docs/brightness
       */
      brightness: [{
        brightness: [brightness]
      }],
      /**
       * Contrast
       * @see https://tailwindcss.com/docs/contrast
       */
      contrast: [{
        contrast: [contrast]
      }],
      /**
       * Drop Shadow
       * @see https://tailwindcss.com/docs/drop-shadow
       */
      'drop-shadow': [{
        'drop-shadow': ['', 'none', isTshirtSize, isArbitraryValue]
      }],
      /**
       * Grayscale
       * @see https://tailwindcss.com/docs/grayscale
       */
      grayscale: [{
        grayscale: [grayscale]
      }],
      /**
       * Hue Rotate
       * @see https://tailwindcss.com/docs/hue-rotate
       */
      'hue-rotate': [{
        'hue-rotate': [hueRotate]
      }],
      /**
       * Invert
       * @see https://tailwindcss.com/docs/invert
       */
      invert: [{
        invert: [invert]
      }],
      /**
       * Saturate
       * @see https://tailwindcss.com/docs/saturate
       */
      saturate: [{
        saturate: [saturate]
      }],
      /**
       * Sepia
       * @see https://tailwindcss.com/docs/sepia
       */
      sepia: [{
        sepia: [sepia]
      }],
      /**
       * Backdrop Filter
       * @deprecated since Tailwind CSS v3.0.0
       * @see https://tailwindcss.com/docs/backdrop-filter
       */
      'backdrop-filter': [{
        'backdrop-filter': ['', 'none']
      }],
      /**
       * Backdrop Blur
       * @see https://tailwindcss.com/docs/backdrop-blur
       */
      'backdrop-blur': [{
        'backdrop-blur': [blur]
      }],
      /**
       * Backdrop Brightness
       * @see https://tailwindcss.com/docs/backdrop-brightness
       */
      'backdrop-brightness': [{
        'backdrop-brightness': [brightness]
      }],
      /**
       * Backdrop Contrast
       * @see https://tailwindcss.com/docs/backdrop-contrast
       */
      'backdrop-contrast': [{
        'backdrop-contrast': [contrast]
      }],
      /**
       * Backdrop Grayscale
       * @see https://tailwindcss.com/docs/backdrop-grayscale
       */
      'backdrop-grayscale': [{
        'backdrop-grayscale': [grayscale]
      }],
      /**
       * Backdrop Hue Rotate
       * @see https://tailwindcss.com/docs/backdrop-hue-rotate
       */
      'backdrop-hue-rotate': [{
        'backdrop-hue-rotate': [hueRotate]
      }],
      /**
       * Backdrop Invert
       * @see https://tailwindcss.com/docs/backdrop-invert
       */
      'backdrop-invert': [{
        'backdrop-invert': [invert]
      }],
      /**
       * Backdrop Opacity
       * @see https://tailwindcss.com/docs/backdrop-opacity
       */
      'backdrop-opacity': [{
        'backdrop-opacity': [opacity]
      }],
      /**
       * Backdrop Saturate
       * @see https://tailwindcss.com/docs/backdrop-saturate
       */
      'backdrop-saturate': [{
        'backdrop-saturate': [saturate]
      }],
      /**
       * Backdrop Sepia
       * @see https://tailwindcss.com/docs/backdrop-sepia
       */
      'backdrop-sepia': [{
        'backdrop-sepia': [sepia]
      }],
      // Tables
      /**
       * Border Collapse
       * @see https://tailwindcss.com/docs/border-collapse
       */
      'border-collapse': [{
        border: ['collapse', 'separate']
      }],
      /**
       * Border Spacing
       * @see https://tailwindcss.com/docs/border-spacing
       */
      'border-spacing': [{
        'border-spacing': [borderSpacing]
      }],
      /**
       * Border Spacing X
       * @see https://tailwindcss.com/docs/border-spacing
       */
      'border-spacing-x': [{
        'border-spacing-x': [borderSpacing]
      }],
      /**
       * Border Spacing Y
       * @see https://tailwindcss.com/docs/border-spacing
       */
      'border-spacing-y': [{
        'border-spacing-y': [borderSpacing]
      }],
      /**
       * Table Layout
       * @see https://tailwindcss.com/docs/table-layout
       */
      'table-layout': [{
        table: ['auto', 'fixed']
      }],
      /**
       * Caption Side
       * @see https://tailwindcss.com/docs/caption-side
       */
      caption: [{
        caption: ['top', 'bottom']
      }],
      // Transitions and Animation
      /**
       * Tranisition Property
       * @see https://tailwindcss.com/docs/transition-property
       */
      transition: [{
        transition: ['none', 'all', '', 'colors', 'opacity', 'shadow', 'transform', isArbitraryValue]
      }],
      /**
       * Transition Duration
       * @see https://tailwindcss.com/docs/transition-duration
       */
      duration: [{
        duration: getNumberAndArbitrary()
      }],
      /**
       * Transition Timing Function
       * @see https://tailwindcss.com/docs/transition-timing-function
       */
      ease: [{
        ease: ['linear', 'in', 'out', 'in-out', isArbitraryValue]
      }],
      /**
       * Transition Delay
       * @see https://tailwindcss.com/docs/transition-delay
       */
      delay: [{
        delay: getNumberAndArbitrary()
      }],
      /**
       * Animation
       * @see https://tailwindcss.com/docs/animation
       */
      animate: [{
        animate: ['none', 'spin', 'ping', 'pulse', 'bounce', isArbitraryValue]
      }],
      // Transforms
      /**
       * Transform
       * @see https://tailwindcss.com/docs/transform
       */
      transform: [{
        transform: ['', 'gpu', 'none']
      }],
      /**
       * Scale
       * @see https://tailwindcss.com/docs/scale
       */
      scale: [{
        scale: [scale]
      }],
      /**
       * Scale X
       * @see https://tailwindcss.com/docs/scale
       */
      'scale-x': [{
        'scale-x': [scale]
      }],
      /**
       * Scale Y
       * @see https://tailwindcss.com/docs/scale
       */
      'scale-y': [{
        'scale-y': [scale]
      }],
      /**
       * Rotate
       * @see https://tailwindcss.com/docs/rotate
       */
      rotate: [{
        rotate: [isInteger, isArbitraryValue]
      }],
      /**
       * Translate X
       * @see https://tailwindcss.com/docs/translate
       */
      'translate-x': [{
        'translate-x': [translate]
      }],
      /**
       * Translate Y
       * @see https://tailwindcss.com/docs/translate
       */
      'translate-y': [{
        'translate-y': [translate]
      }],
      /**
       * Skew X
       * @see https://tailwindcss.com/docs/skew
       */
      'skew-x': [{
        'skew-x': [skew]
      }],
      /**
       * Skew Y
       * @see https://tailwindcss.com/docs/skew
       */
      'skew-y': [{
        'skew-y': [skew]
      }],
      /**
       * Transform Origin
       * @see https://tailwindcss.com/docs/transform-origin
       */
      'transform-origin': [{
        origin: ['center', 'top', 'top-right', 'right', 'bottom-right', 'bottom', 'bottom-left', 'left', 'top-left', isArbitraryValue]
      }],
      // Interactivity
      /**
       * Accent Color
       * @see https://tailwindcss.com/docs/accent-color
       */
      accent: [{
        accent: ['auto', colors]
      }],
      /**
       * Appearance
       * @see https://tailwindcss.com/docs/appearance
       */
      appearance: [{
        appearance: ['none', 'auto']
      }],
      /**
       * Cursor
       * @see https://tailwindcss.com/docs/cursor
       */
      cursor: [{
        cursor: ['auto', 'default', 'pointer', 'wait', 'text', 'move', 'help', 'not-allowed', 'none', 'context-menu', 'progress', 'cell', 'crosshair', 'vertical-text', 'alias', 'copy', 'no-drop', 'grab', 'grabbing', 'all-scroll', 'col-resize', 'row-resize', 'n-resize', 'e-resize', 's-resize', 'w-resize', 'ne-resize', 'nw-resize', 'se-resize', 'sw-resize', 'ew-resize', 'ns-resize', 'nesw-resize', 'nwse-resize', 'zoom-in', 'zoom-out', isArbitraryValue]
      }],
      /**
       * Caret Color
       * @see https://tailwindcss.com/docs/just-in-time-mode#caret-color-utilities
       */
      'caret-color': [{
        caret: [colors]
      }],
      /**
       * Pointer Events
       * @see https://tailwindcss.com/docs/pointer-events
       */
      'pointer-events': [{
        'pointer-events': ['none', 'auto']
      }],
      /**
       * Resize
       * @see https://tailwindcss.com/docs/resize
       */
      resize: [{
        resize: ['none', 'y', 'x', '']
      }],
      /**
       * Scroll Behavior
       * @see https://tailwindcss.com/docs/scroll-behavior
       */
      'scroll-behavior': [{
        scroll: ['auto', 'smooth']
      }],
      /**
       * Scroll Margin
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      'scroll-m': [{
        'scroll-m': getSpacingWithArbitrary()
      }],
      /**
       * Scroll Margin X
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      'scroll-mx': [{
        'scroll-mx': getSpacingWithArbitrary()
      }],
      /**
       * Scroll Margin Y
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      'scroll-my': [{
        'scroll-my': getSpacingWithArbitrary()
      }],
      /**
       * Scroll Margin Start
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      'scroll-ms': [{
        'scroll-ms': getSpacingWithArbitrary()
      }],
      /**
       * Scroll Margin End
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      'scroll-me': [{
        'scroll-me': getSpacingWithArbitrary()
      }],
      /**
       * Scroll Margin Top
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      'scroll-mt': [{
        'scroll-mt': getSpacingWithArbitrary()
      }],
      /**
       * Scroll Margin Right
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      'scroll-mr': [{
        'scroll-mr': getSpacingWithArbitrary()
      }],
      /**
       * Scroll Margin Bottom
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      'scroll-mb': [{
        'scroll-mb': getSpacingWithArbitrary()
      }],
      /**
       * Scroll Margin Left
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      'scroll-ml': [{
        'scroll-ml': getSpacingWithArbitrary()
      }],
      /**
       * Scroll Padding
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      'scroll-p': [{
        'scroll-p': getSpacingWithArbitrary()
      }],
      /**
       * Scroll Padding X
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      'scroll-px': [{
        'scroll-px': getSpacingWithArbitrary()
      }],
      /**
       * Scroll Padding Y
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      'scroll-py': [{
        'scroll-py': getSpacingWithArbitrary()
      }],
      /**
       * Scroll Padding Start
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      'scroll-ps': [{
        'scroll-ps': getSpacingWithArbitrary()
      }],
      /**
       * Scroll Padding End
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      'scroll-pe': [{
        'scroll-pe': getSpacingWithArbitrary()
      }],
      /**
       * Scroll Padding Top
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      'scroll-pt': [{
        'scroll-pt': getSpacingWithArbitrary()
      }],
      /**
       * Scroll Padding Right
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      'scroll-pr': [{
        'scroll-pr': getSpacingWithArbitrary()
      }],
      /**
       * Scroll Padding Bottom
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      'scroll-pb': [{
        'scroll-pb': getSpacingWithArbitrary()
      }],
      /**
       * Scroll Padding Left
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      'scroll-pl': [{
        'scroll-pl': getSpacingWithArbitrary()
      }],
      /**
       * Scroll Snap Align
       * @see https://tailwindcss.com/docs/scroll-snap-align
       */
      'snap-align': [{
        snap: ['start', 'end', 'center', 'align-none']
      }],
      /**
       * Scroll Snap Stop
       * @see https://tailwindcss.com/docs/scroll-snap-stop
       */
      'snap-stop': [{
        snap: ['normal', 'always']
      }],
      /**
       * Scroll Snap Type
       * @see https://tailwindcss.com/docs/scroll-snap-type
       */
      'snap-type': [{
        snap: ['none', 'x', 'y', 'both']
      }],
      /**
       * Scroll Snap Type Strictness
       * @see https://tailwindcss.com/docs/scroll-snap-type
       */
      'snap-strictness': [{
        snap: ['mandatory', 'proximity']
      }],
      /**
       * Touch Action
       * @see https://tailwindcss.com/docs/touch-action
       */
      touch: [{
        touch: ['auto', 'none', 'manipulation']
      }],
      /**
       * Touch Action X
       * @see https://tailwindcss.com/docs/touch-action
       */
      'touch-x': [{
        'touch-pan': ['x', 'left', 'right']
      }],
      /**
       * Touch Action Y
       * @see https://tailwindcss.com/docs/touch-action
       */
      'touch-y': [{
        'touch-pan': ['y', 'up', 'down']
      }],
      /**
       * Touch Action Pinch Zoom
       * @see https://tailwindcss.com/docs/touch-action
       */
      'touch-pz': ['touch-pinch-zoom'],
      /**
       * User Select
       * @see https://tailwindcss.com/docs/user-select
       */
      select: [{
        select: ['none', 'text', 'all', 'auto']
      }],
      /**
       * Will Change
       * @see https://tailwindcss.com/docs/will-change
       */
      'will-change': [{
        'will-change': ['auto', 'scroll', 'contents', 'transform', isArbitraryValue]
      }],
      // SVG
      /**
       * Fill
       * @see https://tailwindcss.com/docs/fill
       */
      fill: [{
        fill: [colors, 'none']
      }],
      /**
       * Stroke Width
       * @see https://tailwindcss.com/docs/stroke-width
       */
      'stroke-w': [{
        stroke: [isLength, isArbitraryLength, isArbitraryNumber]
      }],
      /**
       * Stroke
       * @see https://tailwindcss.com/docs/stroke
       */
      stroke: [{
        stroke: [colors, 'none']
      }],
      // Accessibility
      /**
       * Screen Readers
       * @see https://tailwindcss.com/docs/screen-readers
       */
      sr: ['sr-only', 'not-sr-only'],
      /**
       * Forced Color Adjust
       * @see https://tailwindcss.com/docs/forced-color-adjust
       */
      'forced-color-adjust': [{
        'forced-color-adjust': ['auto', 'none']
      }]
    },
    conflictingClassGroups: {
      overflow: ['overflow-x', 'overflow-y'],
      overscroll: ['overscroll-x', 'overscroll-y'],
      inset: ['inset-x', 'inset-y', 'start', 'end', 'top', 'right', 'bottom', 'left'],
      'inset-x': ['right', 'left'],
      'inset-y': ['top', 'bottom'],
      flex: ['basis', 'grow', 'shrink'],
      gap: ['gap-x', 'gap-y'],
      p: ['px', 'py', 'ps', 'pe', 'pt', 'pr', 'pb', 'pl'],
      px: ['pr', 'pl'],
      py: ['pt', 'pb'],
      m: ['mx', 'my', 'ms', 'me', 'mt', 'mr', 'mb', 'ml'],
      mx: ['mr', 'ml'],
      my: ['mt', 'mb'],
      size: ['w', 'h'],
      'font-size': ['leading'],
      'fvn-normal': ['fvn-ordinal', 'fvn-slashed-zero', 'fvn-figure', 'fvn-spacing', 'fvn-fraction'],
      'fvn-ordinal': ['fvn-normal'],
      'fvn-slashed-zero': ['fvn-normal'],
      'fvn-figure': ['fvn-normal'],
      'fvn-spacing': ['fvn-normal'],
      'fvn-fraction': ['fvn-normal'],
      'line-clamp': ['display', 'overflow'],
      rounded: ['rounded-s', 'rounded-e', 'rounded-t', 'rounded-r', 'rounded-b', 'rounded-l', 'rounded-ss', 'rounded-se', 'rounded-ee', 'rounded-es', 'rounded-tl', 'rounded-tr', 'rounded-br', 'rounded-bl'],
      'rounded-s': ['rounded-ss', 'rounded-es'],
      'rounded-e': ['rounded-se', 'rounded-ee'],
      'rounded-t': ['rounded-tl', 'rounded-tr'],
      'rounded-r': ['rounded-tr', 'rounded-br'],
      'rounded-b': ['rounded-br', 'rounded-bl'],
      'rounded-l': ['rounded-tl', 'rounded-bl'],
      'border-spacing': ['border-spacing-x', 'border-spacing-y'],
      'border-w': ['border-w-s', 'border-w-e', 'border-w-t', 'border-w-r', 'border-w-b', 'border-w-l'],
      'border-w-x': ['border-w-r', 'border-w-l'],
      'border-w-y': ['border-w-t', 'border-w-b'],
      'border-color': ['border-color-s', 'border-color-e', 'border-color-t', 'border-color-r', 'border-color-b', 'border-color-l'],
      'border-color-x': ['border-color-r', 'border-color-l'],
      'border-color-y': ['border-color-t', 'border-color-b'],
      'scroll-m': ['scroll-mx', 'scroll-my', 'scroll-ms', 'scroll-me', 'scroll-mt', 'scroll-mr', 'scroll-mb', 'scroll-ml'],
      'scroll-mx': ['scroll-mr', 'scroll-ml'],
      'scroll-my': ['scroll-mt', 'scroll-mb'],
      'scroll-p': ['scroll-px', 'scroll-py', 'scroll-ps', 'scroll-pe', 'scroll-pt', 'scroll-pr', 'scroll-pb', 'scroll-pl'],
      'scroll-px': ['scroll-pr', 'scroll-pl'],
      'scroll-py': ['scroll-pt', 'scroll-pb'],
      touch: ['touch-x', 'touch-y', 'touch-pz'],
      'touch-x': ['touch'],
      'touch-y': ['touch'],
      'touch-pz': ['touch']
    },
    conflictingClassGroupModifiers: {
      'font-size': ['leading']
    }
  };
};
const twMerge = /*#__PURE__*/createTailwindMerge(getDefaultConfig);

function cn(...inputs) {
  return twMerge(clsx$1(inputs));
}

var _tmpl$$1 = /*#__PURE__*/web.template(`<div class="fixed inset-0 z-50 flex items-start justify-center sm:items-center">`),
  _tmpl$2 = /*#__PURE__*/web.template(`<svg xmlns=http://www.w3.org/2000/svg viewBox="0 0 24 24"fill=none stroke=currentColor stroke-width=2 stroke-linecap=round stroke-linejoin=round class=size-4><path d="M18 6l-12 12"></path><path d="M6 6l12 12">`),
  _tmpl$3 = /*#__PURE__*/web.template(`<span class=sr-only>Close`),
  _tmpl$4 = /*#__PURE__*/web.template(`<div>`);
const Dialog = DialogRoot;
const DialogPortal = props => {
  const [, rest] = solidJs.splitProps(props, ['children']);
  return web.createComponent(DialogPortal$1, web.mergeProps(rest, {
    get children() {
      var _el$ = _tmpl$$1();
      web.insert(_el$, () => props.children);
      return _el$;
    }
  }));
};
const DialogOverlay = props => {
  const [, rest] = solidJs.splitProps(props, ['class']);
  return web.createComponent(DialogOverlay$1, web.mergeProps({
    get ["class"]() {
      return cn('fixed inset-0 z-50 bg-background/80 backdrop-blur-sm data-[expanded]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[expanded]:fade-in-0', props.class);
    }
  }, rest));
};
const DialogContent = props => {
  const [, rest] = solidJs.splitProps(props, ['class', 'children', 'useShadow', 'mount']);
  return web.createComponent(DialogPortal, {
    get useShadow() {
      return props.useShadow;
    },
    get mount() {
      return props.mount;
    },
    get children() {
      return [web.createComponent(DialogOverlay, {}), web.createComponent(DialogContent$1, web.mergeProps({
        get ["class"]() {
          return cn('fixed left-1/2 top-1/2 z-50 grid max-h-screen w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 overflow-y-auto border bg-background p-6 shadow-lg duration-200 data-[expanded]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[expanded]:fade-in-0 data-[closed]:zoom-out-95 data-[expanded]:zoom-in-95 data-[closed]:slide-out-to-left-1/2 data-[closed]:slide-out-to-top-[48%] data-[expanded]:slide-in-from-left-1/2 data-[expanded]:slide-in-from-top-[48%] sm:rounded-lg', props.class);
        }
      }, rest, {
        get children() {
          return [web.memo(() => props.children), web.createComponent(DialogCloseButton, {
            "class": "absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[expanded]:bg-accent data-[expanded]:text-muted-foreground",
            get children() {
              return [_tmpl$2(), _tmpl$3()];
            }
          })];
        }
      }))];
    }
  });
};
const DialogFooter = props => {
  const [, rest] = solidJs.splitProps(props, ['class']);
  return (() => {
    var _el$5 = _tmpl$4();
    web.spread(_el$5, web.mergeProps({
      get ["class"]() {
        return cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', props.class);
      }
    }, rest), false, false);
    return _el$5;
  })();
};
const DialogTitle = props => {
  const [, rest] = solidJs.splitProps(props, ['class']);
  return web.createComponent(DialogTitle$1, web.mergeProps({
    get ["class"]() {
      return cn('text-lg font-semibold leading-none tracking-tight', props.class);
    }
  }, rest));
};

function r(e){var t,f,n="";if("string"==typeof e||"number"==typeof e)n+=e;else if("object"==typeof e)if(Array.isArray(e))for(t=0;t<e.length;t++)e[t]&&(f=r(e[t]))&&(n&&(n+=" "),n+=f);else for(t in e)e[t]&&(n&&(n+=" "),n+=t);return n}function clsx(){for(var e,t,f=0,n="";f<arguments.length;)(e=arguments[f++])&&(t=r(e))&&(n&&(n+=" "),n+=t);return n}

const falsyToString = (value)=>typeof value === "boolean" ? "".concat(value) : value === 0 ? "0" : value;
const cx = clsx;
const cva = (base, config)=>{
    return (props)=>{
        var ref;
        if ((config === null || config === void 0 ? void 0 : config.variants) == null) return cx(base, props === null || props === void 0 ? void 0 : props.class, props === null || props === void 0 ? void 0 : props.className);
        const { variants , defaultVariants  } = config;
        const getVariantClassNames = Object.keys(variants).map((variant)=>{
            const variantProp = props === null || props === void 0 ? void 0 : props[variant];
            const defaultVariantProp = defaultVariants === null || defaultVariants === void 0 ? void 0 : defaultVariants[variant];
            if (variantProp === null) return null;
            const variantKey = falsyToString(variantProp) || falsyToString(defaultVariantProp);
            return variants[variant][variantKey];
        });
        const propsWithoutUndefined = props && Object.entries(props).reduce((acc, param)=>{
            let [key, value] = param;
            if (value === undefined) {
                return acc;
            }
            acc[key] = value;
            return acc;
        }, {});
        const getCompoundVariantClassNames = config === null || config === void 0 ? void 0 : (ref = config.compoundVariants) === null || ref === void 0 ? void 0 : ref.reduce((acc, param1)=>{
            let { class: cvClass , className: cvClassName , ...compoundVariantOptions } = param1;
            return Object.entries(compoundVariantOptions).every((param)=>{
                let [key, value] = param;
                return Array.isArray(value) ? value.includes({
                    ...defaultVariants,
                    ...propsWithoutUndefined
                }[key]) : ({
                    ...defaultVariants,
                    ...propsWithoutUndefined
                })[key] === value;
            }) ? [
                ...acc,
                cvClass,
                cvClassName
            ] : acc;
        }, []);
        return cx(base, getVariantClassNames, getCompoundVariantClassNames, props === null || props === void 0 ? void 0 : props.class, props === null || props === void 0 ? void 0 : props.className);
    };
};

const buttonVariants = cva('inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50', {
  variants: {
    variant: {
      default: 'bg-primary text-primary-foreground hover:bg-primary/90',
      destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
      outline: 'border border-input hover:bg-accent hover:text-accent-foreground',
      secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
      ghost: 'hover:bg-accent hover:text-accent-foreground',
      link: 'text-primary underline-offset-4 hover:underline'
    },
    size: {
      default: 'h-10 px-4 py-2',
      sm: 'h-9 rounded-md px-3',
      lg: 'h-11 rounded-md px-8',
      icon: 'size-10'
    }
  },
  defaultVariants: {
    variant: 'default',
    size: 'default'
  }
});
const Button = props => {
  const [local, others] = solidJs.splitProps(props, ['variant', 'size', 'class']);
  return web.createComponent(ButtonRoot, web.mergeProps({
    get ["class"]() {
      return cn(buttonVariants({
        variant: local.variant,
        size: local.size
      }), local.class);
    }
  }, others));
};

var FORM_CONTROL_PROP_NAMES = ["id", "name", "validationState", "required", "disabled", "readOnly"];
function createFormControl(props) {
  const defaultId = `form-control-${solidJs.createUniqueId()}`;
  const mergedProps = mergeDefaultProps({
    id: defaultId
  }, props);
  const [labelId, setLabelId] = solidJs.createSignal();
  const [fieldId, setFieldId] = solidJs.createSignal();
  const [descriptionId, setDescriptionId] = solidJs.createSignal();
  const [errorMessageId, setErrorMessageId] = solidJs.createSignal();
  const getAriaLabelledBy = (fieldId2, fieldAriaLabel, fieldAriaLabelledBy) => {
    const hasAriaLabelledBy = fieldAriaLabelledBy != null || labelId() != null;
    return [
      fieldAriaLabelledBy,
      labelId(),
      // If there is both an aria-label and aria-labelledby, add the field itself has an aria-labelledby
      hasAriaLabelledBy && fieldAriaLabel != null ? fieldId2 : void 0
    ].filter(Boolean).join(" ") || void 0;
  };
  const getAriaDescribedBy = (fieldAriaDescribedBy) => {
    return [
      descriptionId(),
      // Use aria-describedby for error message because aria-errormessage is unsupported using VoiceOver or NVDA.
      // See https://github.com/adobe/react-spectrum/issues/1346#issuecomment-740136268
      errorMessageId(),
      fieldAriaDescribedBy
    ].filter(Boolean).join(" ") || void 0;
  };
  const dataset = solidJs.createMemo(() => ({
    "data-valid": access$1(mergedProps.validationState) === "valid" ? "" : void 0,
    "data-invalid": access$1(mergedProps.validationState) === "invalid" ? "" : void 0,
    "data-required": access$1(mergedProps.required) ? "" : void 0,
    "data-disabled": access$1(mergedProps.disabled) ? "" : void 0,
    "data-readonly": access$1(mergedProps.readOnly) ? "" : void 0
  }));
  const formControlContext = {
    name: () => access$1(mergedProps.name) ?? access$1(mergedProps.id),
    dataset,
    validationState: () => access$1(mergedProps.validationState),
    isRequired: () => access$1(mergedProps.required),
    isDisabled: () => access$1(mergedProps.disabled),
    isReadOnly: () => access$1(mergedProps.readOnly),
    labelId,
    fieldId,
    descriptionId,
    errorMessageId,
    getAriaLabelledBy,
    getAriaDescribedBy,
    generateId: createGenerateId(() => access$1(mergedProps.id)),
    registerLabel: createRegisterId(setLabelId),
    registerField: createRegisterId(setFieldId),
    registerDescription: createRegisterId(setDescriptionId),
    registerErrorMessage: createRegisterId(setErrorMessageId)
  };
  return {
    formControlContext
  };
}
var FormControlContext = solidJs.createContext();
function useFormControlContext() {
  const context = solidJs.useContext(FormControlContext);
  if (context === void 0) {
    throw new Error("[kobalte]: `useFormControlContext` must be used within a `FormControlContext.Provider` component");
  }
  return context;
}
function FormControlDescription(props) {
  const context = useFormControlContext();
  const mergedProps = mergeDefaultProps({
    id: context.generateId("description")
  }, props);
  solidJs.createEffect(() => solidJs.onCleanup(context.registerDescription(mergedProps.id)));
  return web.createComponent(Polymorphic, web.mergeProps({
    as: "div"
  }, () => context.dataset(), mergedProps));
}
function FormControlErrorMessage(props) {
  const context = useFormControlContext();
  const mergedProps = mergeDefaultProps({
    id: context.generateId("error-message")
  }, props);
  const [local, others] = solidJs.splitProps(mergedProps, ["forceMount"]);
  const isInvalid = () => context.validationState() === "invalid";
  solidJs.createEffect(() => {
    if (!isInvalid()) {
      return;
    }
    solidJs.onCleanup(context.registerErrorMessage(others.id));
  });
  return web.createComponent(solidJs.Show, {
    get when() {
      return local.forceMount || isInvalid();
    },
    get children() {
      return web.createComponent(Polymorphic, web.mergeProps({
        as: "div"
      }, () => context.dataset(), others));
    }
  });
}
function FormControlLabel(props) {
  let ref;
  const context = useFormControlContext();
  const mergedProps = mergeDefaultProps({
    id: context.generateId("label")
  }, props);
  const [local, others] = solidJs.splitProps(mergedProps, ["ref"]);
  const tagName = createTagName(() => ref, () => "label");
  solidJs.createEffect(() => solidJs.onCleanup(context.registerLabel(others.id)));
  return web.createComponent(Polymorphic, web.mergeProps({
    as: "label",
    ref(r$) {
      const _ref$ = mergeRefs((el) => ref = el, local.ref);
      typeof _ref$ === "function" && _ref$(r$);
    },
    get ["for"]() {
      return web.memo(() => tagName() === "label")() ? context.fieldId() : void 0;
    }
  }, () => context.dataset(), others));
}

var FORM_CONTROL_FIELD_PROP_NAMES = ["id", "aria-label", "aria-labelledby", "aria-describedby"];
function createFormControlField(props) {
  const context = useFormControlContext();
  const mergedProps = mergeDefaultProps({
    id: context.generateId("field")
  }, props);
  solidJs.createEffect(() => solidJs.onCleanup(context.registerField(access$1(mergedProps.id))));
  return {
    fieldProps: {
      id: () => access$1(mergedProps.id),
      ariaLabel: () => access$1(mergedProps["aria-label"]),
      ariaLabelledBy: () => context.getAriaLabelledBy(access$1(mergedProps.id), access$1(mergedProps["aria-label"]), access$1(mergedProps["aria-labelledby"])),
      ariaDescribedBy: () => context.getAriaDescribedBy(access$1(mergedProps["aria-describedby"]))
    }
  };
}

// src/primitives/create-form-reset-listener/create-form-reset-listener.ts
function createFormResetListener(element, handler) {
  solidJs.createEffect(
    solidJs.on(element, (element2) => {
      if (element2 == null) {
        return;
      }
      const form = getClosestForm(element2);
      if (form == null) {
        return;
      }
      form.addEventListener("reset", handler, { passive: true });
      solidJs.onCleanup(() => {
        form.removeEventListener("reset", handler);
      });
    })
  );
}
function getClosestForm(element) {
  return isFormElement(element) ? element.form : element.closest("form");
}
function isFormElement(element) {
  return element.matches("textarea, input, select, button");
}

function createToggleState(props = {}) {
  const [isSelected, _setIsSelected] = createControllableBooleanSignal({
    value: () => access$1(props.isSelected),
    defaultValue: () => !!access$1(props.defaultIsSelected),
    onChange: (value) => props.onSelectedChange?.(value)
  });
  const setIsSelected = (value) => {
    if (!access$1(props.isReadOnly) && !access$1(props.isDisabled)) {
      _setIsSelected(value);
    }
  };
  const toggle = () => {
    if (!access$1(props.isReadOnly) && !access$1(props.isDisabled)) {
      _setIsSelected(!isSelected());
    }
  };
  return {
    isSelected,
    setIsSelected,
    toggle
  };
}

// src/switch/index.tsx
var switch_exports = {};
__export(switch_exports, {
  Control: () => SwitchControl$1,
  Description: () => SwitchDescription,
  ErrorMessage: () => SwitchErrorMessage,
  Input: () => SwitchInput,
  Label: () => SwitchLabel$1,
  Root: () => SwitchRoot,
  Switch: () => Switch$1,
  Thumb: () => SwitchThumb$1
});
var SwitchContext = solidJs.createContext();
function useSwitchContext() {
  const context = solidJs.useContext(SwitchContext);
  if (context === void 0) {
    throw new Error("[kobalte]: `useSwitchContext` must be used within a `Switch` component");
  }
  return context;
}

// src/switch/switch-control.tsx
function SwitchControl$1(props) {
  const formControlContext = useFormControlContext();
  const context = useSwitchContext();
  const mergedProps = mergeDefaultProps({
    id: context.generateId("control")
  }, props);
  const [local, others] = solidJs.splitProps(mergedProps, ["onClick", "onKeyDown"]);
  const onClick = (e) => {
    callHandler(e, local.onClick);
    context.toggle();
    context.inputRef()?.focus();
  };
  const onKeyDown = (e) => {
    callHandler(e, local.onKeyDown);
    if (e.key === EventKey.Space) {
      context.toggle();
      context.inputRef()?.focus();
    }
  };
  return web.createComponent(Polymorphic, web.mergeProps({
    as: "div",
    onClick,
    onKeyDown
  }, () => formControlContext.dataset(), () => context.dataset(), others));
}
function SwitchDescription(props) {
  const context = useSwitchContext();
  return web.createComponent(FormControlDescription, web.mergeProps(() => context.dataset(), props));
}
function SwitchErrorMessage(props) {
  const context = useSwitchContext();
  return web.createComponent(FormControlErrorMessage, web.mergeProps(() => context.dataset(), props));
}
function SwitchInput(props) {
  const formControlContext = useFormControlContext();
  const context = useSwitchContext();
  const mergedProps = mergeDefaultProps({
    id: context.generateId("input")
  }, props);
  const [local, formControlFieldProps, others] = solidJs.splitProps(mergedProps, ["ref", "style", "onChange", "onFocus", "onBlur"], FORM_CONTROL_FIELD_PROP_NAMES);
  const {
    fieldProps
  } = createFormControlField(formControlFieldProps);
  const onChange = (e) => {
    callHandler(e, local.onChange);
    e.stopPropagation();
    const target = e.target;
    context.setIsChecked(target.checked);
    target.checked = context.checked();
  };
  const onFocus = (e) => {
    callHandler(e, local.onFocus);
    context.setIsFocused(true);
  };
  const onBlur = (e) => {
    callHandler(e, local.onBlur);
    context.setIsFocused(false);
  };
  return web.createComponent(Polymorphic, web.mergeProps({
    as: "input",
    ref(r$) {
      const _ref$ = mergeRefs(context.setInputRef, local.ref);
      typeof _ref$ === "function" && _ref$(r$);
    },
    type: "checkbox",
    role: "switch",
    get id() {
      return fieldProps.id();
    },
    get name() {
      return formControlContext.name();
    },
    get value() {
      return context.value();
    },
    get checked() {
      return context.checked();
    },
    get required() {
      return formControlContext.isRequired();
    },
    get disabled() {
      return formControlContext.isDisabled();
    },
    get readonly() {
      return formControlContext.isReadOnly();
    },
    get style() {
      return combineStyle({
        ...visuallyHiddenStyles
      }, local.style);
    },
    get ["aria-checked"]() {
      return context.checked();
    },
    get ["aria-label"]() {
      return fieldProps.ariaLabel();
    },
    get ["aria-labelledby"]() {
      return fieldProps.ariaLabelledBy();
    },
    get ["aria-describedby"]() {
      return fieldProps.ariaDescribedBy();
    },
    get ["aria-invalid"]() {
      return formControlContext.validationState() === "invalid" || void 0;
    },
    get ["aria-required"]() {
      return formControlContext.isRequired() || void 0;
    },
    get ["aria-disabled"]() {
      return formControlContext.isDisabled() || void 0;
    },
    get ["aria-readonly"]() {
      return formControlContext.isReadOnly() || void 0;
    },
    onChange,
    onFocus,
    onBlur
  }, () => formControlContext.dataset(), () => context.dataset(), others));
}
function SwitchLabel$1(props) {
  const context = useSwitchContext();
  return web.createComponent(FormControlLabel, web.mergeProps(() => context.dataset(), props));
}
function SwitchRoot(props) {
  let ref;
  const defaultId = `switch-${solidJs.createUniqueId()}`;
  const mergedProps = mergeDefaultProps({
    value: "on",
    id: defaultId
  }, props);
  const [local, formControlProps, others] = solidJs.splitProps(mergedProps, ["ref", "children", "value", "checked", "defaultChecked", "onChange", "onPointerDown"], FORM_CONTROL_PROP_NAMES);
  const [inputRef, setInputRef] = solidJs.createSignal();
  const [isFocused, setIsFocused] = solidJs.createSignal(false);
  const {
    formControlContext
  } = createFormControl(formControlProps);
  const state = createToggleState({
    isSelected: () => local.checked,
    defaultIsSelected: () => local.defaultChecked,
    onSelectedChange: (selected) => local.onChange?.(selected),
    isDisabled: () => formControlContext.isDisabled(),
    isReadOnly: () => formControlContext.isReadOnly()
  });
  createFormResetListener(() => ref, () => state.setIsSelected(local.defaultChecked ?? false));
  const onPointerDown = (e) => {
    callHandler(e, local.onPointerDown);
    if (isFocused()) {
      e.preventDefault();
    }
  };
  const dataset = solidJs.createMemo(() => ({
    "data-checked": state.isSelected() ? "" : void 0
  }));
  const context = {
    value: () => local.value,
    dataset,
    checked: () => state.isSelected(),
    inputRef,
    generateId: createGenerateId(() => access$1(formControlProps.id)),
    toggle: () => state.toggle(),
    setIsChecked: (isChecked) => state.setIsSelected(isChecked),
    setIsFocused,
    setInputRef
  };
  return web.createComponent(FormControlContext.Provider, {
    value: formControlContext,
    get children() {
      return web.createComponent(SwitchContext.Provider, {
        value: context,
        get children() {
          return web.createComponent(Polymorphic, web.mergeProps({
            as: "div",
            ref(r$) {
              const _ref$ = mergeRefs((el) => ref = el, local.ref);
              typeof _ref$ === "function" && _ref$(r$);
            },
            role: "group",
            get id() {
              return access$1(formControlProps.id);
            },
            onPointerDown
          }, () => formControlContext.dataset(), dataset, others, {
            get children() {
              return web.createComponent(SwitchRootChild, {
                state: context,
                get children() {
                  return local.children;
                }
              });
            }
          }));
        }
      });
    }
  });
}
function SwitchRootChild(props) {
  const resolvedChildren = solidJs.children(() => {
    const body = props.children;
    return isFunction(body) ? body(props.state) : body;
  });
  return web.memo(resolvedChildren);
}
function SwitchThumb$1(props) {
  const formControlContext = useFormControlContext();
  const context = useSwitchContext();
  const mergedProps = mergeDefaultProps({
    id: context.generateId("thumb")
  }, props);
  return web.createComponent(Polymorphic, web.mergeProps({
    as: "div"
  }, () => formControlContext.dataset(), () => context.dataset(), mergedProps));
}

// src/switch/index.tsx
var Switch$1 = Object.assign(SwitchRoot, {
  Control: SwitchControl$1,
  Description: SwitchDescription,
  ErrorMessage: SwitchErrorMessage,
  Input: SwitchInput,
  Label: SwitchLabel$1,
  Thumb: SwitchThumb$1
});

const Switch = SwitchRoot;
const SwitchControl = props => {
  const [local, others] = solidJs.splitProps(props, ['class', 'children']);
  return [web.createComponent(SwitchInput, {
    get ["class"]() {
      return cn('[&:focus-visible+div]:outline-none [&:focus-visible+div]:ring-2 [&:focus-visible+div]:ring-ring [&:focus-visible+div]:ring-offset-2 [&:focus-visible+div]:ring-offset-background', local.class);
    }
  }), web.createComponent(SwitchControl$1, web.mergeProps({
    get ["class"]() {
      return cn('inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent bg-input transition-[color,background-color,box-shadow] data-[disabled]:cursor-not-allowed data-[checked]:bg-primary data-[disabled]:opacity-50', local.class);
    }
  }, others, {
    get children() {
      return local.children;
    }
  }))];
};
const SwitchThumb = props => {
  const [local, others] = solidJs.splitProps(props, ['class']);
  return web.createComponent(SwitchThumb$1, web.mergeProps({
    get ["class"]() {
      return cn('pointer-events-none block size-5 translate-x-0 rounded-full bg-background shadow-lg ring-0 transition-transform data-[checked]:translate-x-5', local.class);
    }
  }, others));
};
const SwitchLabel = props => {
  const [local, others] = solidJs.splitProps(props, ['class']);
  return web.createComponent(SwitchLabel$1, web.mergeProps({
    get ["class"]() {
      return cn('text-sm font-medium leading-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-70', local.class);
    }
  }, others));
};

function SettingsDialog(props) {
  const [open, setOpen] = solidJs.createSignal(true);
  const [coverComment, setCoverComment] = solidJs.createSignal(addCoverComment());
  const saveOptions = () => {
    GM_setValues({
      addCoverComment: coverComment()
    });
  };
  return web.createComponent(Dialog, {
    get open() {
      return open();
    },
    onOpenChange: setOpen,
    get children() {
      return web.createComponent(DialogContent, {
        get mount() {
          return props.mount;
        },
        onPointerDownOutside: ev => {
          ev.preventDefault();
        },
        "class": "sm:max-w-[425px]",
        get children() {
          return [web.createComponent(DialogTitle, {
            get children() {
              return [web.memo(() => GM_info.script.name), " Options"];
            }
          }), web.createComponent(Switch, {
            "class": "flex items-center space-x-2",
            get checked() {
              return coverComment();
            },
            onChange: setCoverComment,
            get children() {
              return [web.createComponent(SwitchControl, {
                get children() {
                  return web.createComponent(SwitchThumb, {});
                }
              }), web.createComponent(SwitchLabel, {
                children: "Add cover comment"
              })];
            }
          }), web.createComponent(DialogFooter, {
            get children() {
              return web.createComponent(Button, {
                type: "submit",
                onClick: () => {
                  saveOptions();
                  setOpen(false);
                },
                children: "Save changes"
              });
            }
          })];
        }
      });
    }
  });
}
function addCoverComment() {
  return GM_getValue('addCoverComment', false);
}

var _tmpl$ = /*#__PURE__*/web.template(`<div class=btn-group><button class=btn><img src=https://musicbrainz.org/static/images/favicons/favicon-32x32.png alt=MB style=width:16px;height:16px;margin:2px><span>`);
function createUI(buttonText, onClick) {
  const div = (() => {
    var _el$ = _tmpl$(),
      _el$2 = _el$.firstChild,
      _el$3 = _el$2.firstChild,
      _el$4 = _el$3.nextSibling;
    web.addEventListener(_el$2, "click", onClick, true);
    web.insert(_el$4, buttonText);
    return _el$;
  })();
  const userFragment = document.querySelector('.user-fragment');
  userFragment == null || userFragment.insertBefore(div, userFragment.firstChild);
  const panel = ui.getPanel({
    style: css_248z,
    theme: 'disabled'
  });
  GM_registerMenuCommand('settings', () => {
    web.render(() => web.createComponent(SettingsDialog, {
      get mount() {
        return panel.body;
      }
    }), panel.body);
    panel.show();
  });
}
web.delegateEvents(["click"]);

var TypeID$1 = /*#__PURE__*/function (TypeID) {
  TypeID["SetlistFmUrl"] = "817";
  return TypeID;
}(TypeID$1 || {}); // MB.linkedEntities.link_type['751e8fb1-ed8d-4a94-b71b-a38065054f5d'].id
async function handleVenuePage() {
  const placeMBID = await findVenue(document.location.href);
  if (placeMBID) {
    createUI('Open in MB', () => {
      window.open(`https://musicbrainz.org/place/${placeMBID}`);
    });
  } else {
    createUI('Add to MB', () => {
      submitPlace();
    });
  }
}
async function findVenue(url) {
  const existingVenue = await tryFetchJSON(`https://musicbrainz.org/ws/2/url?resource=${url}&inc=place-rels&fmt=json`);
  return existingVenue && existingVenue['relations'][0]['place'].id;
}
function submitPlace() {
  const searchParams = new URLSearchParams();
  searchParams.append('edit-place.name', unsafeWindow.sfmPageAttributes.venue.name);
  searchParams.append('edit-place.edit_note', editNote(`Imported from ${document.location.href}`));
  searchParams.append('edit-place.area.name', unsafeWindow.sfmPageAttributes.venue.city);
  const infoPart = document.querySelector('div.info');
  if (infoPart) {
    for (const form of infoPart.querySelectorAll('.form-group')) {
      var _form$querySelector;
      const label = (_form$querySelector = form.querySelector('.label')) == null ? void 0 : _form$querySelector.textContent;
      switch (label) {
        case 'Address':
          searchParams.append('edit-place.address', form.querySelector('span.address').innerText.replaceAll('\n', ', '));
          break;
        case 'Opened':
          {
            const openedLabel = form.querySelector('span:not(.label)');
            if (openedLabel && openedLabel.textContent) {
              const tokens = openedLabel.textContent.split(' ');
              searchParams.append('edit-place.period.begin_date.year', tokens[tokens.length - 1]);
              if (tokens.length > 1) {
                searchParams.append('edit-place.period.begin_date.month', convertMonth(tokens[tokens.length - 2]).toString());
                if (tokens.length > 2) {
                  searchParams.append('edit-place.period.begin_date.day', tokens[tokens.length - 3]);
                }
              }
            }
            break;
          }
        case 'Web':
          form.querySelectorAll('span:not(.label) a').forEach((link, index) => {
            searchParams.append(`edit-place.url.${index + 1}.text`, link.href);
          });
          break;
      }
    }
  }
  searchParams.append('edit-place.url.0.text', document.location.href);
  searchParams.append('edit-place.url.0.link_type_id', TypeID$1.SetlistFmUrl);

  // navigate to the place creation page
  unsafeWindow.open('https://musicbrainz.org/place/create?' + searchParams.toString());
}

var GUID = /*#__PURE__*/function (GUID) {
  GUID["MainPerformer"] = "936c7c95-3156-3889-a062-8a0cd57f8946";
  GUID["HeldAt"] = "e2c6f697-07dc-38b1-be0b-83d740165532";
  GUID["PerformanceTime"] = "ebd303c3-7f57-452a-aa3b-d780ebad868d";
  return GUID;
}(GUID || {});
var TypeID = /*#__PURE__*/function (TypeID) {
  TypeID["SetlistFmUrl"] = "811";
  return TypeID;
}(TypeID || {}); // MB.linkedEntities.link_type['027fce0c-c621-4fd1-b728-1678ae08f280'].id
async function handleSetlistPage() {
  const eventMBID = await findEvent(document.location.href);
  if (eventMBID) {
    createUI('Open in MB', () => {
      window.open(`https://musicbrainz.org/event/${eventMBID}`);
    });
  } else {
    const venueElement = document.querySelector('a[href*="/venue/"]');
    const placeMBID = await findVenue(venueElement.href);
    if (!placeMBID) {
      addWarningIcon('place', `place:${unsafeWindow.sfmPageAttributes.venue.name} AND area:${unsafeWindow.sfmPageAttributes.venue.city}`, venueElement);
    }
    createUI('Add to MB', () => {
      submitEvent(placeMBID || '');
    });
  }
}
function tourName() {
  const anchors = document.querySelectorAll('a');

  // Filter anchors based on href pattern
  const filteredAnchors = Array.from(anchors).filter(anchor => anchor.href.match(/search\?artist=\w+&tour=\w+/));
  return filteredAnchors.length > 0 ? filteredAnchors[0].textContent : null;
}
function entity(name, mbid) {
  return mbid ? `[${mbid}|${name}]` : name;
}
function artist(name, mbid) {
  return `@ ${entity(name, mbid)}`;
}
function work(name, mbid) {
  return `* ${entity(name, mbid)}`;
}
function info(comment) {
  return `# ${comment}`;
}
function* setlistEntry(setlistPart, mainArtistName, addCoverComment) {
  if (setlistPart.classList.contains('tape') || setlistPart.classList.contains('song')) {
    yield work(setlistPart.querySelector('.songPart').textContent.trim());
    if (setlistPart.classList.contains('tape')) {
      yield info('from tape');
    }
    const infoPart = setlistPart.querySelector('.infoPart');
    if (infoPart) {
      yield* infoPart.textContent.split('\n').filter(line => line.trim().length > 0).flatMap(line => {
        const match = line.match(/\(with (.*)\)/);
        if (match) {
          return [artist(`${mainArtistName} with ${match[1]}`)];
        } else if (!line.includes('cover') || addCoverComment) {
          return [info(line)];
        } else {
          return [];
        }
      });
    }
  } else if (setlistPart.classList.contains('encore') || setlistPart.classList.contains('section')) {
    yield `\n${info(setlistPart.textContent.trim())}`;
  }
}
function submitEvent(placeMBID) {
  const searchParams = new URLSearchParams();
  const artistMBID = unsafeWindow.sfmPageAttributes.artist.mbid;
  const artistName = unsafeWindow.sfmPageAttributes.artist.name;

  // name (see https://musicbrainz.org/doc/Style/Event#Title)
  const tour = tourName();
  if (tour) {
    // use "Tour Name: City" style
    searchParams.append('edit-event.name', `${tour}: ${unsafeWindow.sfmPageAttributes.venue.city}`);
  } else {
    // use "Artist at Venue" style
    searchParams.append('edit-event.name', `${artistName} at ${unsafeWindow.sfmPageAttributes.venue.name}`);
  }

  // type
  searchParams.append('edit-event.type_id', '1'); // Concert

  const addCoverComment$1 = addCoverComment();

  // setlist
  const setlist = [artist(artistName, artistMBID)].concat(Array.from(document.querySelectorAll('.setlistParts')).flatMap(part => [...setlistEntry(part, artistName, addCoverComment$1)])).join('\n');
  searchParams.append('edit-event.setlist', setlist);

  // date-time
  const dateBlock = document.querySelector('.dateBlock');
  const year = dateBlock.querySelector('.year').textContent;
  const month = convertMonth(dateBlock.querySelector('.month').textContent);
  const day = dateBlock.querySelector('.day').textContent;
  for (const period of ['begin', 'end']) {
    searchParams.append(`edit-event.period.${period}_date.year`, year);
    searchParams.append(`edit-event.period.${period}_date.month`, month == null ? void 0 : month.toString());
    searchParams.append(`edit-event.period.${period}_date.day`, day);
  }
  const doorTime = parseTime('.door');
  if (doorTime) {
    searchParams.append('edit-event.time', doorTime);
  }
  searchParams.append('edit-event.edit_note', `Imported from ${document.location.href} using ${GM.info.script.name} version ${GM.info.script.version} from ${GM.info.script.namespace}.`);
  searchParams.append('edit-event.url.0.text', document.location.href);
  searchParams.append('edit-event.url.0.link_type_id', TypeID.SetlistFmUrl);
  searchParams.append('rels.0.type', GUID.MainPerformer);
  searchParams.append('rels.0.target', artistMBID);
  searchParams.append('rels.0.direction', 'backward');
  const startTime = parseTime('.start');
  if (startTime) {
    searchParams.append('rels.0.attributes.0.type', GUID.PerformanceTime);
    searchParams.append('rels.0.attributes.0.text_value', startTime);
  }
  searchParams.append('rels.1.type', GUID.HeldAt);
  searchParams.append('rels.1.target', placeMBID);

  // navigate to the event creation page
  unsafeWindow.open('https://musicbrainz.org/event/create?' + searchParams.toString());
}
function parseTime(query) {
  const mainTime = document.querySelector(query);
  if (mainTime) {
    const m = mainTime.textContent.match(/(\d+):(\d+)\s*(PM)?/);
    if (m) {
      let hours = parseInt(m[1]);
      const minutes = m[2];
      if (m[3]) {
        hours += 12;
      }
      return `${hours}:${minutes}`;
    }
  }
}
async function findEvent(url) {
  const existingEvent = await tryFetchJSON(`https://musicbrainz.org/ws/2/url?resource=${url}&inc=event-rels&fmt=json`);
  return existingEvent && existingEvent['relations'][0]['event'].id;
}
async function addWarningIcon(type, query, afterElement) {
  const warningIcon = document.createElement('img');
  warningIcon.src = 'https://musicbrainz.org/static/images/icons/warning.png';
  warningIcon.alt = 'warning';
  warningIcon.style.width = '16px';
  warningIcon.style.height = '16px';
  warningIcon.style.margin = '2px';
  warningIcon.title = `${type} not found on MusicBrainz, click to search`;
  warningIcon.addEventListener('click', () => {
    window.open(`https://musicbrainz.org/search?query=${query}&type=${type}&method=advanced`);
  });
  afterElement.parentNode.insertBefore(warningIcon, afterElement.nextSibling);
}

main();
async function main() {
  if (location.href.includes('/venue/')) {
    await handleVenuePage();
  } else {
    await handleSetlistPage();
  }
}

})(VM.solid.web, VM, VM.solid);
