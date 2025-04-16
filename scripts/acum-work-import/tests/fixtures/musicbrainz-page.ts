import {Page} from '@playwright/test';
import * as path from 'path';
import {UserscriptPage} from 'test-support';

export class MusicbrainzPage extends UserscriptPage {
  public constructor(page: Page) {
    super(page);
  }

  static async create<T extends UserscriptPage>(this: new (page: Page) => T, page: Page): Promise<T>;
  static async create(page: Page) {
    const musicbrainzPage = await super.create<MusicbrainzPage>(page);
    await musicbrainzPage.login();
    return musicbrainzPage;
  }

  async goto(path: string) {
    await this.page.goto(path);
    await this.injectUserScript();
  }

  async injectUserScript() {
    await this.page.addScriptTag({
      path: path.resolve(import.meta.dirname, '..', '..', 'dist', 'acum-work-import.user.js'),
    });
  }

  async login() {
    await this.page.goto('/login');
    // Check if we are already logged in
    if (this.page.url().includes('/login')) {
      const username = this.envVar('MB_USERNAME');
      const password = this.envVar('MB_PASSWORD');
      const usernameBox = this.page.getByLabel('Username');
      await usernameBox.fill(username);
      const passwordBox = this.page.getByLabel('Password');
      await passwordBox.fill(password);
      const loginButton = this.page.getByRole('button', {name: 'Log in'});
      await loginButton.click();
    }
  }

  private envVar(name: string): string {
    const value = process.env[name];
    if (!value) {
      throw new Error(`Environment variable ${name} is required`);
    }
    return value;
  }

  async createEdit(body: object): Promise<WsJsEditResponseT> {
    const response = await this.page.request.post('/ws/js/edit/create', {
      data: body,
      failOnStatusCode: true,
    });

    return (await response.json()) as WsJsEditResponseT;
  }

  async deleteEntity(entityType: NonUrlRelatableEntityTypeT, gid: MBID, editNote: string) {
    await this.page.request.post(`/${entityType}/${gid}/delete`, {
      form: {
        'confirm.edit_note': editNote,
      },
      failOnStatusCode: true,
    });
  }
}
