// spell:words domcontentloaded
import {invokeMenuCommand, mockUserscriptManager, waitForMenuCommand} from '#userscript-manager-mock.ts';
import {expect, Request, type Page, type Response, type Route} from '@playwright/test';

type UserscriptRequestParams = Readonly<Record<string, boolean | number | string>>;

type UserscriptRequestOptions = Readonly<{
  method?: 'GET' | 'POST';
  params?: UserscriptRequestParams;
  data?: unknown;
  failOnStatusCode?: boolean;
  form?: Readonly<Record<string, string>>;
  headers?: Readonly<Record<string, string>>;
  baseURL?: string;
}>;

type UserscriptResponse = Readonly<{
  body: string;
  ok: boolean;
  status: number;
  statusText: string;
}>;

export class UserscriptPage {
  windowOpenLog: URL[] = [];

  static async create(
    this: new (page: Page, userscriptPath: string, isHarReplay: boolean) => UserscriptPage,
    page: Page,
    userscriptPath: string,
    isHarReplay = false
  ) {
    const userscriptPage = new this(page, userscriptPath, isHarReplay);
    await userscriptPage.mockWindowOpen();
    await userscriptPage.mockUserscriptManager();
    return userscriptPage;
  }

  public constructor(
    public readonly page: Page,
    readonly userscriptPath: string,
    public readonly isHarReplay = false
  ) {}

  public async goto(url: string): Promise<null | Response> {
    // In HAR replay mode, third-party assets may be intentionally missing and can block the load event.
    // Wait for DOM readiness instead, which matches userscript @run-at document-end behavior.
    const res = await this.page.goto(url, {waitUntil: 'domcontentloaded'});
    expect(res?.ok(), `Failed to navigate to ${url}: ${res?.status()}`).toBeTruthy();
    await this.injectUserScript();
    return res;
  }

  public async reload(): Promise<null | Response> {
    const res = await this.page.reload({waitUntil: 'domcontentloaded'});
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
    const localStorageEntries = await this.page.evaluate(() => Object.entries(localStorage));

    expect(localStorageEntries).toEqual(
      expect.arrayContaining(options.map(({name, defaultValue}) => [name, (!defaultValue).toString()]))
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

  public async requestJSON<TResponse>(url: string, options: UserscriptRequestOptions): Promise<TResponse> {
    const response = await this.request(url, options);
    return JSON.parse(response.body) as TResponse;
  }

  public async request(url: string, options: UserscriptRequestOptions = {}): Promise<UserscriptResponse> {
    expect(
      options.data === undefined || options.form === undefined,
      'Request cannot include both JSON data and form data'
    ).toBeTruthy();
    expect(!url.startsWith('/') || options.baseURL !== undefined, 'baseURL required for relative URLs').toBeTruthy();

    const response = await this.page.evaluate(
      async ({options, url}) => {
        const headers = new Headers(options.headers);
        const requestUrl = new URL(url, options.baseURL);

        Object.entries(options.params ?? {}).forEach(([key, value]) => {
          requestUrl.searchParams.set(key, String(value));
        });

        let body: string | undefined;
        if (options.form) {
          const formData = new URLSearchParams();
          Object.entries(options.form).forEach(([key, value]) => {
            formData.set(key, value);
          });
          body = formData.toString();
          if (!headers.has('Content-Type')) {
            headers.set('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
          }
        } else if (options.data !== undefined) {
          body = JSON.stringify(options.data);
          if (!headers.has('Content-Type')) {
            headers.set('Content-Type', 'application/json');
          }
        }

        const response = await fetch(requestUrl.toString(), {
          body,
          credentials: 'same-origin',
          headers,
          method: options.method ?? (body === undefined ? 'GET' : 'POST'),
        });

        return {
          body: await response.text(),
          ok: response.ok,
          status: response.status,
          statusText: response.statusText,
        };
      },
      {options, url}
    );

    if (options.failOnStatusCode ?? true) {
      expect(
        response.ok,
        `Request failed for ${options.method ?? 'GET'} ${url}: ${response.status} ${response.statusText}\n${response.body}`
      ).toBeTruthy();
    }

    return response;
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

  public async route(
    url: string | RegExp | ((url: URL) => boolean),
    handler: (route: Route, request: Request) => Promise<void> | void
  ): Promise<() => Promise<void>> {
    await this.page.route(url, handler);

    return async () => {
      await this.page.unroute(url, handler);
    };
  }

  public async rejectRoute(url: string | RegExp | ((url: URL) => boolean)): Promise<() => Promise<void>> {
    const handler = (route: Route) =>
      route.fulfill({
        status: 404,
      });

    return this.route(url, handler);
  }
}
