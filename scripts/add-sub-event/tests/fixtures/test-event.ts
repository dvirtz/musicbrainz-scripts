import {expect} from '@playwright/test';
import {MBID_REGEXP} from '@repo/musicbrainz-ext/constants';
import {MusicbrainzPage} from '@repo/test-support/musicbrainz-page';
import {test as base} from '@repo/test-support/musicbrainz-test';

type EventSearchResultsT = Readonly<{
  events: ReadonlyArray<{
    id: string;
  }>;
}>;

export class TestParentEvent {
  private static readonly eventName = 'add-sub-event test: Parent Event';
  static readonly beginDate = {
    year: '2026',
    month: '03',
    day: '10',
  };
  static readonly endDate = {
    year: '2026',
    month: '03',
    day: '12',
  };

  private constructor(public readonly gid: string) {}

  static async create(musicbrainzPage: MusicbrainzPage) {
    const eventGid = await TestParentEvent.createEvent(musicbrainzPage);
    return new TestParentEvent(eventGid);
  }

  private static async createEvent(musicbrainzPage: MusicbrainzPage): Promise<string> {
    const existingEvent = await musicbrainzPage.page.request.get('/ws/2/event', {
      params: {
        query: `event:"${this.eventName}"`,
        fmt: 'json',
      },
    });
    const existingEventJson = (await existingEvent.json()) as EventSearchResultsT;
    if (existingEventJson?.events && existingEventJson.events.length > 0) {
      return existingEventJson.events[0]!.id;
    }

    await musicbrainzPage.userscriptPage.goto('/event/create');

    const page = musicbrainzPage.page;
    await page.getByRole('textbox', {name: 'Name:'}).fill(this.eventName);

    await page.getByRole('textbox', {name: 'Begin date:'}).fill(this.beginDate.year);
    await page.locator('[id="id-edit-event.period.begin_date.month"]').fill(this.beginDate.month);
    await page.locator('[id="id-edit-event.period.begin_date.day"]').fill(this.beginDate.day);

    await page.getByRole('textbox', {name: 'End date:'}).fill(this.endDate.year);
    await page.locator('[id="id-edit-event.period.end_date.month"]').fill(this.endDate.month);
    await page.locator('[id="id-edit-event.period.end_date.day"]').fill(this.endDate.day);

    await page.getByRole('textbox', {name: 'Edit note:'}).fill('test');
    await page.getByRole('button', {name: 'Enter edit'}).click();

    await expect(page).toHaveURL(new RegExp(`/event/${MBID_REGEXP.source}$`, 'i'));
    const gid = page.url().split('/event/')[1] ?? '';
    expect(gid).toMatch(MBID_REGEXP);
    return gid;
  }
}

export const test = base.extend<{
  testParentEvent: TestParentEvent;
  musicbrainzPage: MusicbrainzPage;
}>({
  testParentEvent: async ({musicbrainzPage}, use) => {
    const testParentEvent = await TestParentEvent.create(musicbrainzPage);
    await use(testParentEvent);
  },
});
