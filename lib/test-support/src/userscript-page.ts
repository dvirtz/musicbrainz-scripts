import type {Page} from '@playwright/test';

export class UserscriptPage {
  windowOpenLog: URL[] = [];

  constructor(public readonly page: Page) {}

  async mockWindowOpen() {
    // Expose function for pushing messages to the Node.js script.
    const logURL = (url: URL) => this.windowOpenLog.push(url);
    await this.page.exposeFunction('logURL', logURL);
    await this.page.addInitScript(() => {
      window.open = (url?: string | URL) => {
        if (url) {
          logURL(typeof url === 'string' ? new URL(url) : url);
        }
        return window;
      };
    });
  }
}
