import {type Locator} from '@playwright/test';
import {test as base} from '@repo/test-support/musicbrainz-test';
import {type UserscriptPage} from '@repo/test-support/userscript-page';

class EventSetlistPage {
  private readonly unrouteCallbacks: (() => Promise<void>)[] = [];
  private readonly releaseResponses: (() => void)[] = [];

  constructor(private readonly userscriptPage: UserscriptPage) {}

  get page() {
    return this.userscriptPage.page;
  }

  get details() {
    return this.page.getByRole('group', {name: 'Event details', exact: true});
  }

  get table() {
    return this.details.getByRole('table', {name: 'Event setlist', exact: true});
  }

  get setlist() {
    // The native field has no accessible name while hidden in table mode.
    return this.page.locator('textarea[name="edit-event.setlist"]');
  }

  get markup() {
    return this.page.getByLabel('Setlist:', {exact: true});
  }

  get editNote() {
    return this.page.getByRole('textbox', {name: 'Edit note:', exact: true});
  }

  title(number: number | string) {
    return this.page.getByLabel(`Title ${number}`, {exact: true});
  }

  artist(number: number) {
    return this.page.getByLabel(`Artist name ${number}`, {exact: true});
  }

  searchButton(type: 'artist' | 'work', number: number, scope: Locator = this.details) {
    return scope.getByRole('button', {name: `Search ${type} ${number}`, exact: true});
  }

  results(type: 'artist' | 'work', scope: Locator = this.details) {
    return scope.getByRole('listbox', {name: `${type} search results`});
  }

  result(name: string, scope: Locator = this.details) {
    return scope.getByRole('option', {name: `Select ${name}`, exact: true});
  }

  workEditButton(number: number) {
    return this.page.getByRole('button', {name: `Edit works ${number}`, exact: true});
  }

  worksDialog(number: number) {
    return this.page.getByRole('dialog', {name: `Edit works ${number}`, exact: true});
  }

  artistDialog(number: number) {
    return this.page.getByRole('dialog', {name: `Edit artist credit ${number}`, exact: true});
  }

  async addSong() {
    await this.page.getByRole('button', {name: 'song(s)', exact: true}).click();
  }

  async switchMode(mode: 'Markup' | 'Table') {
    await this.details.getByRole('button', {name: mode, exact: true}).click();
  }

  async replaceMarkup(value: string) {
    await this.switchMode('Markup');
    await this.markup.fill(value);
    await this.switchMode('Table');
  }

  async editWorks(number: number) {
    await this.workEditButton(number).click();
    return this.worksDialog(number);
  }

  async editArtistCredit(number: number) {
    await this.page.getByRole('button', {name: `Edit artist credit ${number}`, exact: true}).click();
    return this.artistDialog(number);
  }

  async setAdditionalInfo(value: string) {
    await this.page.getByRole('button', {name: 'Add additional info', exact: true}).click();
    const dialog = this.page.getByRole('dialog', {name: 'Additional info', exact: true});
    await dialog.getByRole('textbox', {name: 'Additional info', exact: true}).fill(value);
    await dialog.getByRole('button', {name: 'Done', exact: true}).click();
  }

  async route(...args: Parameters<UserscriptPage['route']>) {
    this.unrouteCallbacks.push(await this.userscriptPage.route(...args));
  }

  holdResponse() {
    let release = () => {};
    const ready = new Promise<void>(resolve => {
      release = resolve;
    });
    this.releaseResponses.push(release);
    return {ready, release};
  }

  async dispose() {
    // Release delayed requests even when an assertion fails, then remove only our routes.
    for (const release of this.releaseResponses) release();
    for (const unroute of this.unrouteCallbacks.reverse()) await unroute();
  }
}

export const test = base.extend<{seed: string; eventPath: string; eventEditor: EventSetlistPage}>({
  seed: ['', {option: true}],
  eventPath: ['/event/create', {option: true}],
  eventEditor: async ({userscriptPage, seed, eventPath}, use) => {
    const editor = new EventSetlistPage(userscriptPage);
    await userscriptPage.goto(`${eventPath}?${new URLSearchParams({'edit-event.setlist': seed})}`);
    try {
      await use(editor);
    } finally {
      await editor.dispose();
    }
  },
});
