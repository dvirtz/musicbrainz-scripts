type MenuCommand = <T extends MouseEvent | KeyboardEvent>(event: T) => void;

declare global {
  interface Window {
    menuCommandId: number;
    menuCommands: Map<string, MenuCommand>;
    menuCommandName: Map<number, string>;

    valueEventId: number;
    valueEventListeners: Map<number, () => void>;
  }

  interface GlobalEventHandlersEventMap {
    'GM:registerMenuCommand': CustomEvent<{name: string}>;
  }
}

export function mockUserscriptManager() {
  const cast = <T>(value: unknown): T => value as T;

  window.menuCommands = new Map<string, MenuCommand>();
  window.menuCommandId = 0;
  window.menuCommandName = new Map<number, string>();
  window.valueEventId = 0;
  window.valueEventListeners = new Map<number, () => void>();

  window.unsafeWindow = cast<typeof unsafeWindow>(window); // Ensure unsafeWindow is set to the current window

  window.GM = {
    info: cast<typeof GM.info>({
      script: cast<typeof GM.info.script>({
        name: 'userscript',
        version: '1.0.0',
        namespace: 'https://homepage.com',
      }),
    }),
    log: (...message: unknown[]) => {
      console.log('GM:', ...message);
      return Promise.resolve();
    },
    getValue: <T>(key: string, defaultValue?: T) => {
      const value = localStorage.getItem(key);
      if (value !== null) {
        return Promise.resolve(JSON.parse(value) as T);
      }
      if (defaultValue !== undefined) {
        return Promise.resolve(defaultValue);
      }
      throw new Error(`Key "${key}" not found in localStorage and no default value provided.`);
    },
    setValue: <T>(key: string, value: T) => {
      localStorage.setItem(key, JSON.stringify(value));
      return Promise.resolve();
    },
    listValues: () => {
      const keys = Object.keys(localStorage);
      return Promise.resolve(keys);
    },
    deleteValue: (key: string) => {
      localStorage.removeItem(key);
      return Promise.resolve();
    },
    addValueChangeListener: <T = unknown>(
      name: string,
      callback: (name: string, oldValue: T, newValue: T, remote: boolean) => void
    ) => {
      const handler = (event: StorageEvent) => {
        if (event.key === name) {
          callback(name, JSON.parse(event.oldValue ?? '{}') as T, JSON.parse(event.newValue ?? '{}') as T, false);
        }
      };
      window.addEventListener('storage', handler);
      const id = window.valueEventId++;
      window.valueEventListeners.set(id, () => {
        window.removeEventListener('storage', handler);
        window.valueEventListeners.delete(id);
      });
      return Promise.resolve(id);
    },
    removeValueChangeListener: (id: number) => {
      const removeListener = window.valueEventListeners.get(id);
      if (removeListener) {
        removeListener();
      }
      return Promise.resolve();
    },
    registerMenuCommand: (name: string, onClick: () => void) => {
      window.menuCommands.set(name, onClick as MenuCommand);
      window.menuCommandId++;
      window.menuCommandName.set(window.menuCommandId, name);
      document.dispatchEvent(new CustomEvent('GM:registerMenuCommand', {detail: {name}}));
      return Promise.resolve(window.menuCommandId);
    },
    unregisterMenuCommand: (id: number) => {
      const commandName = window.menuCommandName.get(id);
      if (commandName) {
        window.menuCommands.delete(commandName);
      }
      window.menuCommandName.delete(id);
      return Promise.resolve();
    },
    getResourceText: async (resourceName: string) => {
      const response = await fetch(resourceName);
      if (!response.ok) {
        throw new Error(`Failed to fetch resource: ${response.statusText}`);
      }
      const text = await response.text();
      return await Promise.resolve(text);
    },
    getResourceUrl: (resourceName: string) => {
      const url = new URL(resourceName, window.location.href);
      return Promise.resolve(url.toString());
    },
    notification: (...params: unknown[]) => {
      console.log('Notification:', ...params);
      return Promise.resolve(true);
    },
    xmlHttpRequest: <T>(details: Parameters<typeof GM.xmlHttpRequest<T>>[0]) => {
      const {method, url, headers, data} = details;
      const xhr = new XMLHttpRequest();
      xhr.open(method || 'GET', url);
      if (headers) {
        Object.entries(headers).forEach(([key, value]) => {
          xhr.setRequestHeader(key, value);
        });
      }
      if (data) {
        xhr.send(
          typeof data === 'object' && !(data instanceof FormData) && !(data instanceof Blob)
            ? JSON.stringify(data)
            : data
        );
      }
      return Promise.resolve({
        finalUrl: xhr.responseURL,
        readyState: xhr.readyState as 0 | 1 | 2 | 3 | 4,
        status: xhr.status,
        statusText: xhr.statusText,
        responseHeaders: xhr.getAllResponseHeaders(),
        responseXML: xhr.responseXML,
        responseText: xhr.responseText,
        response: xhr.response as unknown,
        context: details.context!,
      });
    },
    download: (details: Parameters<typeof GM.download>[0]) => {
      const {url, name} = details;

      const xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.responseType = 'blob';
      xhr.onload = () => {
        if (xhr.status === 200) {
          const blob = xhr.response as Blob;
          const a = document.createElement('a');
          const objectUrl = URL.createObjectURL(blob);
          a.href = objectUrl;
          a.download = name || 'download';
          a.style.display = 'none';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(objectUrl);
        } else {
          console.error(`Failed to download: ${xhr.statusText}`);
        }
      };
      xhr.onerror = () => {
        console.error('An error occurred during the download.');
      };
      xhr.send();

      return Promise.resolve();
    },
    setClipboard: (text: string) => {
      console.log('Set clipboard:', text);
      return Promise.resolve();
    },
    addStyle: (css: string) => {
      const style = document.createElement('style');
      style.textContent = css;
      document.head.appendChild(style);
      return Promise.resolve(style);
    },
    getTab: <T>() => {
      const value = localStorage.getItem('GM:tab');
      if (value === null) {
        return {} as T;
      }
      return JSON.parse(value) as T;
    },
    saveTab: (tab: unknown) => {
      localStorage.setItem('GM:tab', JSON.stringify(tab));
      return Promise.resolve();
    },
    getTabs: <T>() => {
      const value = localStorage.getItem('GM:tab');
      if (value === null) {
        return Promise.resolve({});
      }
      return Promise.resolve({1: JSON.parse(value) as T});
    },
    openInTab: (url: string, options?: Parameters<typeof GM.openInTab>[1]) => {
      const newTab = window.open(url, '_blank');
      const openInBackground = typeof options === 'object' ? options.active : options;
      if (newTab && !openInBackground) {
        newTab.focus();
      }
      return Promise.resolve({
        close: () => {
          if (newTab) {
            newTab.close();
          }
        },
        closed: newTab === null,
      });
    },
  };
}

export async function waitForMenuCommand(name: string): Promise<void> {
  await new Promise<void>(resolve => {
    if (window.menuCommands.has(name)) {
      resolve();
      return;
    }
    document.addEventListener(
      'GM:registerMenuCommand',
      event => {
        if (event.detail.name == name) {
          resolve();
        }
      },
      {once: true}
    );
  });
}

export function invokeMenuCommand(name: string): void {
  const command = window.menuCommands.get(name);
  if (command) {
    command(new KeyboardEvent('click', {bubbles: true, cancelable: true}));
  } else {
    throw new Error(`Menu command "${name}" not found.`);
  }
}
