import {invokeMenuCommand, mockUserscriptManager, waitForMenuCommand} from '#userscript-manager-mock.ts';
import {expect, Request, type Page, type Response} from '@playwright/test';

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

  public async goto(url: string): Promise<null | Response> {
    const res = await this.page.goto(url);
    expect(res?.ok(), `Failed to navigate to ${url}: ${res?.status()}`).toBeTruthy();
    await this.injectUserScript();
    return res;
  }

  public async reload(): Promise<null | Response> {
    const res = await this.page.reload();
    expect(res?.ok(), `Failed to reload ${this.page.url()}: ${res?.status()}`).toBeTruthy();
    await this.injectUserScript();
    return res;
  }

  private async injectUserScript() {
    // Wait for document.body to exist, simulating @run-at document-end
    await this.page.waitForFunction(() => document.body !== null);

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

  public async submitForm(formData: Record<string, string>, actionUrl: string) {
    // Create HTML with form and auto-submit
    const html = `
    <html>
      <body>
        <form id="testForm" method="POST" action="${actionUrl}">
          ${Object.entries(formData)
            .map(([name, value]) => `<input type="hidden" name="${name}" value="${value}">`)
            .join('\n')}
            <button type="submit">Submit</button>
        </form>
      </body>
    </html>
    `;

    // Load the HTML and let it auto-submit
    await this.page.setContent(html);

    const submitButton = this.page.locator('button[type="submit"]');
    await submitButton.click();

    await expect(this.page).toHaveURL(actionUrl);

    // Re-inject userscript after navigation
    await this.injectUserScript();
  }

  public async postDataJSON(request: Request): Promise<{[k: string]: unknown}> {
    const contentType = await request.headerValue('content-type');
    if (contentType?.startsWith('multipart/form-data')) {
      const formData = await new Response(request.postData(), {
        headers: {
          'Content-Type': contentType,
        },
      }).formData();

      return Object.fromEntries(formData.entries());
    }

    const postData = (await request.postDataJSON()) as {[k: string]: unknown} | null;
    expect(postData).not.toBeNull();
    return postData!;
  }

  public async setLocalStorage(key: string, value: string) {
    await this.page.evaluate(([key, value]) => localStorage.setItem(key, value), [key, value] as const);
  }
}
