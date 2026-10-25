import {seedAcumStorageFromUrl} from '#tests/fixtures/acum-storage.ts';
import {test as releaseTest} from '#tests/fixtures/test-release.ts';
import {expect, Locator, mergeTests} from '@playwright/test';
import {test as musicbrainzTest} from '@repo/test-support/musicbrainz-test';
import {WorkT} from 'typedbrainz/types';

// cspell:words Arik

export const test = mergeTests(releaseTest, musicbrainzTest).extend<{
  matchedWork: {trackRow: Locator; warning: Locator; matchedId: string; selectedId: string; title: string};
}>({
  matchedWork: async ({page, testRelease, musicbrainzPage, userscriptPage, baseURL}, use) => {
    await testRelease.editRelationships(musicbrainzPage);
    const trackWork = testRelease.works()[2]!;

    const matchedId = '6fec0410-692f-4ebf-9c4a-9397648dd8e2';
    const selectedId = '7f3cbe6b-9d8a-45eb-8ffb-511a81817d90';
    const authorId = 'd3c90d1b-f529-404b-939d-41873386d4b4';
    const matched = await userscriptPage.requestJSON<WorkT>(`/ws/js/entity/${matchedId}`, {baseURL});
    const unrouteEntity = await userscriptPage.route(`**/ws/js/entity/${matchedId}`, route =>
      route.fulfill({json: {...matched, name: trackWork.title}})
    );
    const unrouteIswc = await userscriptPage.route('**/ws/2/iswc/**', route =>
      route.fulfill({json: {'work-count': 0, works: []}})
    );
    const unrouteArtists = await userscriptPage.route('**/ws/2/artist?*', route =>
      route.fulfill({json: {count: 1, artists: [{id: authorId, name: 'Arik Einstein'}]}})
    );
    const unrouteSearch = await userscriptPage.route('**/ws/2/work?*', route =>
      route.fulfill({json: {count: 1, works: [{id: matchedId}]}})
    );
    const unrouteLookup = await userscriptPage.route(`**/ws/2/work/${matchedId}*`, route =>
      route.fulfill({
        json: {id: matchedId, title: trackWork.title, attributes: [], relations: [{artist: {id: authorId}}]},
      })
    );
    await seedAcumStorageFromUrl(userscriptPage, 'release-album-006625.json', trackWork.acumUrl);
    const trackRow = page.getByRole('row', {name: trackWork.title});
    await trackRow.getByRole('checkbox').first().check();
    await testRelease.importAlbum(page);
    const warning = trackRow.getByText('was found by name linked to an author, please verify.', {exact: false});
    await expect(warning).toBeVisible();

    const unrouteWrites = await userscriptPage.route('**/ws/js/edit/create', () => {
      throw new Error('Work warning actions should only change the pending edit.');
    });
    const unrouteCreate = await userscriptPage.route('**/work/create', () => {
      throw new Error('Creating a work from a warning should defer submission.');
    });
    await use({trackRow, warning, matchedId, selectedId, title: trackWork.title});
    await unrouteCreate();
    await unrouteWrites();
    await unrouteEntity();
    await unrouteIswc();
    await unrouteArtists();
    await unrouteSearch();
    await unrouteLookup();
  },
});
