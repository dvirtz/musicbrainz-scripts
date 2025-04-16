import type {Page} from '@playwright/test';
import {MenuCommand, mockUserscriptManager} from './userscript-manager-mock';

export class UserscriptPage {
  windowOpenLog: URL[] = [];
  menuCommands: Map<string, MenuCommand> = new Map();

  static async create<T extends UserscriptPage>(this: new (page: Page) => T, page: Page) {
    const userscriptPage = new this(page);
    await userscriptPage.mockWindowOpen();
    await userscriptPage.mockUserscriptManager();
    return userscriptPage;
  }

  protected constructor(public readonly page: Page) {}

  private async mockWindowOpen() {
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

  private async mockUserscriptManager() {
    const pushMenuCommand = (name: string, command: MenuCommand) => {
      console.log('Menu command registered:', name);
      this.menuCommands.set(name, command);
    };
    await this.page.exposeFunction('pushMenuCommand', pushMenuCommand);
    await this.page.addInitScript(mockUserscriptManager, pushMenuCommand);
  }
}
