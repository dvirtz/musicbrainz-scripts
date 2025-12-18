import {test as testRelease} from '#tests/fixtures/test-release.ts';
import {expect, mergeTests} from '@playwright/test';
import {compareInsensitive} from '@repo/musicbrainz-ext/compare';
import {
  ARRANGER_LINK_TYPE_ID,
  COMPOSER_LINK_TYPE_ID,
  EDIT_RELATIONSHIP_CREATE,
  LYRICIST_LINK_TYPE_ID,
} from '@repo/musicbrainz-ext/constants';
import {test as musicbrainzTest} from '@repo/test-support/musicbrainz-test';
import {WsJsEditRelationshipCreateT, WsJsRelationshipCommonT} from 'typedbrainz/types';

const base = mergeTests(testRelease, musicbrainzTest);

const test = base.extend({
  testRelease: async ({page, musicbrainzPage, userscriptPage, testRelease, baseURL}, use) => {
    await testRelease.editRelationships(musicbrainzPage);

    // turn off existing work search
    await userscriptPage.setLocalStorage('searchWorks', 'false');

    await use(testRelease);

    const recordingOfLabels = page.getByText('recording of:');
    await expect(recordingOfLabels).toHaveCount(testRelease.tracks().length);

    const arrangerLabels = page.getByText('arranger:');
    await expect(arrangerLabels).toHaveCount(testRelease.tracks().length);

    await page.route('**/work/create', async (route, request) => {
      const postData = await userscriptPage.postDataJSON(request);
      const workName = postData['edit-work.name'] as string;
      expect(workName).toBeDefined();
      const work = testRelease.work(workName)!;
      expect(work).toBeDefined(); // Show visible diff to debug whitespace/unicode differences
      musicbrainzPage.expectWorkCreateToMatch(postData, work);

      await route.fulfill({
        status: 302,
        headers: {
          Location: `${baseURL}/work/${work.id}`,
        },
      });
    });

    const trackTitles = testRelease.tracks().map(track => track.name);
    const workTitles = testRelease.works().map(work => work.title);
    const workCreators = workTitles.map(() => ({
      lyricists: [] as string[],
      composers: [] as string[],
      arrangers: [] as string[],
    }));
    const workIndex = (title: string) => workTitles.findIndex(v => compareInsensitive(v, title) === 0);
    await page.route('ws/js/edit/create', async (route, request) => {
      const postData = await userscriptPage.postDataJSON(request);
      if ('editNote' in postData) {
        // Show visible diff to debug whitespace/unicode differences
        expect(postData['editNote']).toMatch(
          /Imported from .* using userscript version 1.0.0 from https:\/\/homepage.com./
        );
      }
      expect(postData).toHaveProperty('edits');
      (postData['edits'] as (WsJsRelationshipCommonT & {edit_type: number})[])
        .filter((edit): edit is WsJsEditRelationshipCreateT => edit.edit_type === EDIT_RELATIONSHIP_CREATE)
        .forEach(edit => {
          switch (edit.linkTypeID) {
            case ARRANGER_LINK_TYPE_ID: {
              const index = trackTitles.indexOf(edit.entities[1].name);
              expect(index).toBeGreaterThanOrEqual(0);
              workCreators[index]?.arrangers.push(edit.entities[0].name);
              break;
            }
            case LYRICIST_LINK_TYPE_ID: {
              const index = workIndex(edit.entities[1].name);
              expect(index).toBeGreaterThanOrEqual(0);
              workCreators[index]?.lyricists.push(edit.entities[0].name);
              break;
            }
            case COMPOSER_LINK_TYPE_ID: {
              const index = workIndex(edit.entities[1].name);
              expect(index).toBeGreaterThanOrEqual(0);
              workCreators[index]?.composers.push(edit.entities[0].name);
              break;
            }
          }
        });
      await route.fulfill({json: {edits: []}});
    });

    // Now click "Enter edit" which will automatically submit works first, then proceed with the edit
    const enterEdit = page.getByRole('button', {name: 'Enter edit'});
    // verify the button has acumReplaced in its dataset
    await expect(enterEdit).toHaveAttribute('data-acum-replaced', 'true');
    await enterEdit.click();
    await expect(page).toHaveURL(`/release/${testRelease.gid}`);

    expect(
      testRelease.works().map(work => ({
        lyricists: work.lyricists,
        composers: work.composers,
        arrangers: work.arrangers,
      }))
    ).toEqual(workCreators);

    await page.unrouteAll();
  },
});

test.describe('release editor', () => {
  test('can import album', async ({page, testRelease}) => {
    // fill in the album ID
    const input = page.getByPlaceholder('Album ID or URL');
    await input.fill(testRelease.acumUrl());
    await expect(input).toHaveValue('006625');

    // import the album
    await testRelease.importAlbum(page);
  });

  test('can import individual works', async ({page, testRelease}) => {
    const input = page.getByPlaceholder('Album ID or URL');

    const tracks = testRelease.tracks();
    const works = testRelease.works();

    for (let index = 0; index < works.length; index++) {
      const work = works[index]!;
      await input.fill(work.acumUrl);
      await expect(input).toHaveValue(new URL(work.acumUrl).searchParams.get('versionid')!);

      const checkBox = page.getByRole('cell', {name: tracks[index]?.name}).getByRole('checkbox').first();
      await checkBox.check();

      await testRelease.importAlbum(page);

      // uncheck the checkbox for the next iteration
      await checkBox.uncheck();
    }
  });
});

base.describe('release editor', () => {
  base('work import does not add arrangers', async ({page, testRelease, musicbrainzPage}) => {
    await testRelease.editRelationships(musicbrainzPage);

    const work = testRelease.works()[2]!;

    const input = page.getByPlaceholder('Album ID or URL');

    await input.fill(work.acumUrl.replace(/version\?workid=(.*)&versionid=(.*)/, 'work?workid=$1'));

    const trackRow = page.getByRole('row', {name: work.title});
    const checkBox = trackRow.getByRole('checkbox').first();
    await checkBox.check();

    await testRelease.importAlbum(page);

    const arrangerLabels = trackRow.getByText('arranger:');
    await expect(arrangerLabels).toHaveCount(0);
  });

  base('retries fetching missing artists', async ({page, testRelease, musicbrainzPage, userscriptPage}) => {
    await testRelease.editRelationships(musicbrainzPage);

    const work = testRelease.works()[0]!;

    const input = page.getByPlaceholder('Album ID or URL');

    await input.fill(work.acumUrl);

    const trackRow = page.getByRole('row', {name: work.title});
    const checkBox = trackRow.getByRole('checkbox').first();
    await checkBox.check();

    // make sure artist is not found
    await userscriptPage.rejectRoute((url: URL) => {
      if (url.pathname === '/ws/2/artist') {
        const query = url.searchParams.get('query');
        return query ? query.includes(work.lyricists[0]!) || query.includes('ipi:') : false;
      }
      return url.pathname === '/ws/2/url';
    });

    await testRelease.importAlbum(page);

    const failedToFindWarning = page.getByText('failed to find');
    await expect(failedToFindWarning).toContainText(`Track 1: failed to find lyricist ${work.lyricists[0]}`);

    // enable artist fetching again
    await page.unrouteAll();

    await testRelease.importAlbum(page);

    const lyricistLinks = trackRow.getByRole('link', {name: work.lyricists[0]!});
    await expect(lyricistLinks).toHaveCount(1);
  });
});
