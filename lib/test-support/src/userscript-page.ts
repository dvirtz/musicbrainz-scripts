import {invokeMenuCommand, mockUserscriptManager, waitForMenuCommand} from '#userscript-manager-mock.ts';
import {expect, type Page} from '@playwright/test';

export class UserscriptPage {
  windowOpenLog: URL[] = [];

  static async create(
    this: new (page: Page, userscriptPath: string) => UserscriptPage,
    page: Page,
    userscriptPath: string
  ) {
    const userscriptPage = new this(page, userscriptPath);
    await userscriptPage.mockWindowOpen();
    await userscriptPage.mockUserscriptManager();
    return userscriptPage;
  }

  public constructor(
    public readonly page: Page,
    readonly userscriptPath: string
  ) {}

  public async goto(url: string) {
    await this.page.goto(url);
    await this.injectUserScript();
  }

  private async injectUserScript() {
    await this.page.addScriptTag({
      path: this.userscriptPath,
    });
  }

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
    await this.page.addInitScript(mockUserscriptManager);
  }

  public async waitForMenuCommand(name: string) {
    await this.page.evaluate(waitForMenuCommand, name);
  }

  public async invokeMenuCommand(name: string) {
    await this.page.evaluate(invokeMenuCommand, name);
  }

  public async testSettings(options: {name: string; description: string; defaultValue: boolean}[]) {
    await this.waitForMenuCommand('settings');
    await this.invokeMenuCommand('settings');

    const settingsDialog = this.page.getByLabel('userscript options');
    await expect(settingsDialog).toBeVisible();

    const saveButton = this.page.getByText('Save changes');
    await expect(saveButton).toBeVisible();

    const cancelButton = this.page.getByText('Cancel');
    await expect(cancelButton).toBeVisible();

    for (const {description, defaultValue} of options) {
      const checkbox = this.page.getByLabel(description);
      await expect(checkbox).toBeVisible();
      if (defaultValue) {
        await expect(checkbox).toBeChecked();
      } else {
        await expect(checkbox).not.toBeChecked();
      }
      const text = this.page.getByText(description, {exact: true});
      await text.click();
      if (defaultValue) {
        await expect(checkbox).not.toBeChecked();
      } else {
        await expect(checkbox).toBeChecked();
      }
    }

    await saveButton.click();
    const storage = await this.page.context().storageState();

    expect(storage.origins[0]?.localStorage).toEqual(
      expect.arrayContaining(options.map(({name, defaultValue}) => ({name, value: (!defaultValue).toString()})))
    );
  }
}
