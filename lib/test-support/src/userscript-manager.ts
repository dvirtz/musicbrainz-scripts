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
  Object.defineProperty(window, 'GM', {
    get: () => ({
      info: {
        script: {
          name: 'userscript',
          version: '1.0.0',
          namespace: 'https://homepage.com',
        },
      },
      getValue: <T>(key: string, defaultValue: T) => {
        const value = localStorage.getItem(key);
        return Promise.resolve(value != null ? (JSON.parse(value) as T) : defaultValue);
      },
      setValue: <T>(key: string, value: T) => {
        localStorage.setItem(key, JSON.stringify(value));
        return Promise.resolve();
      },
      registerMenuCommand: (name: string) => {
        console.log('Menu command registered:', name);
      },
    }),
  });
}

if (!('VM' in window)) {
  Object.defineProperty(window, 'VM', {
    get: () => ({...VM, solid: {...solid, web: solidWeb, store: solidStore}}),
  });
}
