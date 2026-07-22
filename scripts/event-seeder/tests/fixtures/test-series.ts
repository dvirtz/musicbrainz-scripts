import {expect} from '@playwright/test';
import {MBID_REGEXP, SERIES_HELD_AT_RELATIONSHIP_TYPE_ID} from '@repo/musicbrainz-ext/constants';
import {MusicbrainzPage} from '@repo/test-support/musicbrainz-page';
import {test as base} from '@repo/test-support/musicbrainz-test';

type SeriesSearchResultsT = Readonly<{
  series: ReadonlyArray<{
    id: string;
  }>;
}>;

class TestSeries {
  static readonly name = 'event-seeder test: Festival series';
  static readonly heldAt = 'a727b970-8ea0-4f75-abc8-db131f72aecb';

  private constructor(public readonly gid: string) {}

  static async create(musicbrainzPage: MusicbrainzPage, baseURL: string | undefined) {
    const seriesGid = await TestSeries.createSeries(musicbrainzPage, baseURL);
    return new TestSeries(seriesGid);
  }

  readonly name = TestSeries.name;
  readonly heldAt = TestSeries.heldAt;

  private static async createSeries(musicbrainzPage: MusicbrainzPage, baseURL: string | undefined): Promise<string> {
    expect(baseURL, 'baseURL is required for series lookup').toBeTruthy();

    const searchUrl = new URL('/ws/2/series', baseURL);
    searchUrl.searchParams.set('query', `series:"${this.name}"`);
    searchUrl.searchParams.set('fmt', 'json');

    const searchResponse = await musicbrainzPage.page.request.get(searchUrl.toString());
    expect(searchResponse.ok(), `Series lookup failed: ${searchResponse.status()}`).toBeTruthy();
    const existingSeriesJson = (await searchResponse.json()) as SeriesSearchResultsT;
    if (existingSeriesJson?.series && existingSeriesJson.series.length > 0) {
      return existingSeriesJson.series[0]!.id;
    }

    const searchParams = new URLSearchParams();
    searchParams.append('edit-series.name', this.name);
    searchParams.append('edit-series.type_id', '8');
    searchParams.append('rels.0.type', String(SERIES_HELD_AT_RELATIONSHIP_TYPE_ID));
    searchParams.append('rels.0.target', this.heldAt);

    await musicbrainzPage.userscriptPage.goto(`/series/create?${searchParams.toString()}`);
    const page = musicbrainzPage.page;

    await expect(page.getByRole('textbox', {name: 'Name:'})).toHaveValue(this.name);
    await expect(page.locator('select[name="edit-series.type_id"]')).toHaveValue('8');
    await expect(page.getByRole('row', {name: /held at:/i})).toContainText('Madison Square Garden');

    await page.getByRole('textbox', {name: 'Edit note:'}).fill('test');
    await page.getByRole('button', {name: 'Enter edit'}).click();

    await expect(page).toHaveURL(new RegExp(`/series/${MBID_REGEXP.source}$`, 'i'));
    const gid = page.url().split('/series/')[1] ?? '';
    expect(gid).toMatch(MBID_REGEXP);
    return gid;
  }
}

export const test = base.extend<{
  testSeries: TestSeries;
}>({
  testSeries: async ({musicbrainzPage, baseURL}, use) => {
    const testSeries = await TestSeries.create(musicbrainzPage, baseURL);
    await use(testSeries);
  },
});
