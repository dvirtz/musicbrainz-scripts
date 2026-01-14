import {expect} from '@playwright/test';
import {UserscriptPage} from '@repo/test-support/userscript-page';
import {NonUrlRelatableEntityTypeT, WsJsEditResponseT} from 'typedbrainz/types';

export type Work = {
  title: string;
  disambiguation: string;
  'type-id': string;
  iswcs: string[];
  languages: string[];
  attributes: {type: string; value: string; 'type-id': string}[];
};

export class MusicbrainzPage {
  public constructor(
    public userscriptPage: UserscriptPage,
    public page = userscriptPage.page
  ) {}

  static async create(userscriptPage: UserscriptPage) {
    const musicbrainzPage = new MusicbrainzPage(userscriptPage);
    await musicbrainzPage.login();
    return musicbrainzPage;
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

  async deleteEntity(entityType: NonUrlRelatableEntityTypeT, gid: string, editNote: string) {
    await this.page.request.post(`/${entityType}/${gid}/delete`, {
      form: {
        'confirm.edit_note': editNote,
      },
      failOnStatusCode: true,
    });
  }

  public expectWorkCreateToMatch(postData: {[k: string]: unknown}, work: Work) {
    expect(postData).toMatchObject({
      'edit-work.name': work.title,
      'edit-work.comment': work.disambiguation,
      'edit-work.type_id': work['type-id'],
      'edit-work.edit_note': expect.stringMatching(
        /Imported from .* using userscript version 1.0.0 from https:\/\/homepage.com./
      ),
    });
    expect(work.iswcs.map((value, index) => postData[`edit-work.iswcs.${index}`]).sort()).toEqual(work.iswcs.sort());
    expect(work.languages.map((value, index) => postData[`edit-work.languages.${index}`]).sort()).toEqual(
      work.languages.sort()
    );
    expect(
      work.attributes
        .map((value, index) => ({
          'type-id': postData[`edit-work.attributes.${index}.type_id`],
          value: postData[`edit-work.attributes.${index}.value`],
        }))
        .sort()
    ).toEqual(
      work.attributes
        .map(attr => ({
          'type-id': attr['type-id'],
          value: attr.value,
        }))
        .sort()
    );
  }
}
