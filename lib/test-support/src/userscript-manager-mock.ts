export type MenuCommand = () => void;

declare const pushMenuCommand: (name: string, command: MenuCommand) => void;

export function mockUserscriptManager() {
  window.unsafeWindow = window; // Ensure unsafeWindow is set to the current window

  window.GM = {
    info: {
      script: {
        name: 'userscript',
        version: '1.0.0',
        namespace: 'https://homepage.com',
        description: '',
        excludes: [],
        includes: [],
        matches: [],
        resources: {},
        runAt: 'start',
        uuid: '',
      },
      scriptMetaStr: '',
      scriptHandler: '',
      version: '',
    },
    getValue: <T>(key: string, defaultValue?: T) => {
      const value = localStorage.getItem(key);
      return Promise.resolve(value != null ? (JSON.parse(value) as T) : defaultValue);
    },
    setValue: <T>(key: string, value: T) => {
      localStorage.setItem(key, JSON.stringify(value));
      return Promise.resolve();
    },
    registerMenuCommand: (name: string, command: MenuCommand) => {
      console.log('Menu command registered:', name);
      pushMenuCommand(name, command);
    },
    deleteValue: (key: string) => {
      localStorage.removeItem(key);
      return Promise.resolve();
    },
    getResourceUrl: (resourceName: string) => {
      const url = new URL(resourceName, window.location.href);
      return Promise.resolve(url.toString());
    },
    listValues: () => {
      const keys = Object.keys(localStorage);
      return Promise.resolve(keys);
    },
    notification: (text: string, title: string, image?: string, onClick?: () => void) => {
      console.log('Notification:', {text, title, image});
      if (onClick) {
        onClick();
      }
    },
    xmlHttpRequest: (details: GM.Request) => {
      const {method, url, headers, data} = details;
      const xhr = new XMLHttpRequest();
      xhr.open(method, url);
      if (headers) {
        Object.entries(headers).forEach(([key, value]) => {
          xhr.setRequestHeader(key, value);
        });
      }
      xhr.send(data);
      return xhr;
    },
    openInTab: (url: string, openInBackground?: boolean) => {
      const newTab = window.open(url, '_blank');
      if (newTab && !openInBackground) {
        newTab.focus();
      }
      return newTab;
    },
    setClipboard: (text: string) => {
      console.log('Set clipboard:', text);
    },
  };
}
