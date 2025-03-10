import * as VM from '@violentmonkey/dom';
import * as solid from 'solid-js';
import * as solidStore from 'solid-js/store';
import * as solidWeb from 'solid-js/web';

if (typeof unsafeWindow === 'undefined') {
  Object.defineProperty(window, 'unsafeWindow', {
    get: () => window,
  });
}

if (typeof GM === 'undefined') {
  Object.defineProperty(window, 'GM_info', {
    get: () => ({
      script: {
        name: 'userscript',
        version: '1.0.0',
        namespace: 'https://homepage.com',
      },
    }),
  });
  Object.defineProperty(window, 'GM_getValue', {
    get:
      () =>
      <T>(key: string, defaultValue: T) => {
        const value = localStorage.getItem(key);
        return value != null ? (JSON.parse(value) as T) : defaultValue;
      },
  });
  Object.defineProperty(window, 'GM_registerMenuCommand', {
    get: () => (name: string) => {
      console.log('Menu command registered:', name);
    },
  });
}

if (!('VM' in window)) {
  Object.defineProperty(window, 'VM', {
    get: () => ({...VM, solid: {...solid, web: solidWeb, store: solidStore}}),
  });
}
