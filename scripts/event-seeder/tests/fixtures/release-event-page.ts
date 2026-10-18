import {expect} from '@playwright/test';
import {test as base} from '@repo/test-support/musicbrainz-test';
import {UserscriptPage} from '@repo/test-support/userscript-page';
import {MBRelease} from '@repo/musicbrainz-ext/web-service-types';

class ReleaseEventPage {
  constructor(private readonly userscriptPage: UserscriptPage) {}

  get page() {
    return this.userscriptPage.page;
  }

  get setlist() {
    // MusicBrainz's setlist textarea has no accessible label.
    return this.page.locator('textarea[name="edit-event.setlist"]');
  }

  async openRelease(id: string): Promise<MBRelease> {
    const response = this.page.waitForResponse(response => {
      const url = new URL(response.url());
      return (
        response.ok() &&
        url.pathname === `/ws/2/release/${id}` &&
        !!url.searchParams.get('inc')?.includes('recording-level-rels')
      );
    });
    await this.userscriptPage.goto(`/release/${id}`);
    const source = (await (await response).json()) as MBRelease;
    await expect(this.page.getByRole('link', {name: 'Create or update event'})).toBeVisible();
    return source;
  }

  async openSeededEditor() {
    const action = this.page.getByRole('link', {name: 'Create or update event'});
    await expect(action).toHaveAttribute('href', /\/event\/.+\?/);
    const url = new URL((await action.getAttribute('href'))!, this.page.url());
    expect(this.userscriptPage.windowOpenLog).toHaveLength(0);
    expect([...url.searchParams].filter(([key, value]) => /^rels\.\d+\.type$/.test(key) && value === '810')).toEqual(
      []
    );
    await action.click();
    await expect(this.page).toHaveURL(url.href);
    return url;
  }

  async expectSetlist(count: number, firstWork: string, lastWork: string) {
    await expect(this.setlist).toHaveValue(/\S/);
    const songs = (await this.setlist.inputValue()).split('\n').filter(line => line.startsWith('* '));
    expect(songs).toHaveLength(count);
    expect(songs[0]).toContain(firstWork);
    expect(songs[count - 1]).toContain(lastWork);
  }

  async expectRecordingLinks(source: MBRelease, params: URLSearchParams, count: number) {
    const ids = [...new Set(source.media.flatMap(medium => medium.tracks.map(track => track.recording.id)))];
    const seeded = [...params]
      .filter(([key, value]) => /^rels\.\d+\.type$/.test(key) && value === '809')
      .map(([key]) => params.get(key.replace(/\.type$/, '.target')));
    expect(ids).toHaveLength(count);
    expect(seeded.sort()).toEqual(ids.sort());
    await this.page.getByRole('link', {name: `See all ${count} relationships`, exact: true}).click();
    const first = source.media[0]!.tracks[0]!.recording;
    await expect(this.page.getByRole('link', {name: first.title!, exact: true})).toBeVisible();
    const links = await this.page.getByRole('link').evaluateAll(links => links.map(link => link.getAttribute('href')));
    expect(links).toEqual(expect.arrayContaining(ids.map(id => `/recording/${id}`)));
    await expect(this.page.getByRole('link', {name: source.title, exact: true})).toHaveCount(0);
  }

  async expectEditNote(releaseId: string) {
    await expect(this.page.getByRole('textbox', {name: 'Edit note:'})).toHaveValue(
      new RegExp(`Seeded event from .*release/${releaseId} using userscript version`)
    );
  }
}

export const test = base.extend<{releaseEventPage: ReleaseEventPage}>({
  releaseEventPage: async ({userscriptPage, updateHar}, use, testInfo) => {
    if (updateHar) testInfo.setTimeout(90_000);
    const unrouteEdits = await userscriptPage.route('**/ws/js/edit/create', () => {
      throw new Error('Event seeding must not submit edits');
    });
    const unrouteEvents = await userscriptPage.route('**/event/**', async (route, request) => {
      expect(request.method(), 'Event forms must only be opened for review').toBe('GET');
      await route.fallback();
    });
    await use(new ReleaseEventPage(userscriptPage));
    await unrouteEvents();
    await unrouteEdits();
  },
});
