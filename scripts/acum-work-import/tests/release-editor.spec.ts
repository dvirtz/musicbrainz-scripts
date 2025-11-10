import {test as musicbrainzTest} from '@repo/test-support/musicbrainz-test';
import {test as testRelease} from '#tests/fixtures/test-release.ts';
import {expect, mergeTests} from '@playwright/test';
import {
  ARRANGER_LINK_TYPE_ID,
  COMPOSER_LINK_TYPE_ID,
  EDIT_RELATIONSHIP_CREATE,
  LYRICIST_LINK_TYPE_ID,
} from '@repo/musicbrainz-ext/constants';
import {WsJsEditRelationshipCreateT, WsJsRelationshipCommonT} from 'typedbrainz/types';
import {compareInsensitive} from '@repo/musicbrainz-ext/compare';

const base = mergeTests(testRelease, musicbrainzTest);

const test = base.extend({
  testRelease: async ({page, musicbrainzPage, testRelease, baseURL}, use) => {
    await testRelease.editRelationships(musicbrainzPage);

    // turn off existing work search
    await page.evaluate(() => localStorage.setItem('searchWorks', 'false'));

    await use(testRelease);

    const recordingOfLabels = page.getByText('recording of:');
    await expect(recordingOfLabels).toHaveCount(testRelease.tracks().length);

    const arrangerLabels = page.getByText('arranger:');
    await expect(arrangerLabels).toHaveCount(testRelease.tracks().length);

    await page.route('**/work/create', async (route, request) => {
      const postData = await parseMultipartFormData(request.postData() || '', request.headers()['content-type'] || '');
      const workName = postData['edit-work.name'] as string | undefined;
      expect(workName).toBeDefined();
      const work = testRelease.work(workName!)!;
      expect(work).toBeDefined(); // Show visible diff to debug whitespace/unicode differences
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
      const postData = request.postDataJSON() as Record<string, unknown>;
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

// Lightweight multipart/form-data parser for test assertions. It extracts simple text fields.
async function parseMultipartFormData(body: string, contentType: string) {
  const formData = await new Response(body, {
    headers: {
      'Content-Type': contentType,
    },
  }).formData();

  return Object.fromEntries(formData.entries());
}

test.describe('release editor', () => {
  test('can import album', async ({page, testRelease}) => {
    // fill in the album ID
    const input = page.getByPlaceholder('Album/Version/Work ID');
    await input.fill(testRelease.acumUrl());
    await expect(input).toHaveValue('006625');

    // import the album
    const importButton = page.getByRole('button', {name: 'Import works from ACUM'});
    await importButton.click();
  });

  test('can import individual works', async ({page, testRelease}) => {
    const input = page.getByPlaceholder('Album/Version/Work ID');

    const tracks = testRelease.tracks();
    const works = testRelease.works();

    for (let index = 0; index < works.length; index++) {
      const work = works[index]!;
      await input.fill(work.acumUrl);
      await expect(input).toHaveValue(new URL(work.acumUrl).searchParams.get(`${'version'}id`)!);

      const checkBox = page.getByRole('cell', {name: tracks[index]?.name}).getByRole('checkbox').first();
      await checkBox.check();

      const importButton = page.getByRole('button', {name: 'Import works from ACUM'});
      await importButton.click();

      await expect(importButton).toBeDisabled();

      // wait for import to finish
      await expect(importButton).toBeEnabled();

      // uncheck the checkbox for the next iteration
      await checkBox.uncheck();
    }
  });
});
