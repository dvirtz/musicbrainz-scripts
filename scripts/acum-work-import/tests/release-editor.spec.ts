import {test as musicbrainzTest} from '@repo/test-support/musicbrainz-test';
import {test as testRelease} from '#tests/fixtures/test-release.ts';
import {expect, mergeTests} from '@playwright/test';

const test = mergeTests(testRelease, musicbrainzTest);

test.describe('release editor', () => {
  test('can import album', async ({page, testRelease, musicbrainzPage, baseURL}) => {
    await testRelease.editRelationships(musicbrainzPage);

    // fill in the album ID
    const input = page.getByPlaceholder('Album/Version/Work ID');
    await input.fill('https://nocs.acum.org.il/acumsitesearchdb/album?albumid=006625');
    await expect(input).toHaveValue('006625');

    // turn off existing work search
    await page.evaluate(() => localStorage.setItem('searchWorks', 'false'));

    // import the album
    const importButton = page.getByRole('button', {name: 'Import works from ACUM'});
    await importButton.click();

    const recordingOfLabels = page.getByText('recording of:');
    await expect(recordingOfLabels).toHaveCount(testRelease.tracks().length);

    const arrangerLabels = page.getByText('arranger:');
    await expect(arrangerLabels).toHaveCount(testRelease.tracks().length);

    await page.route('**/work/create', async (route, request) => {
      const postData = request.postDataJSON() as Record<string, string>;
      expect(postData).toHaveProperty('edit-work.name');
      const work = testRelease.work(postData['edit-work.name']!);
      expect(work).toBeDefined();
      expect(postData).toMatchObject({
        'edit-work.name': work!.title,
        'edit-work.comment': work!.disambiguation,
        'edit-work.type_id': work!['type-id'],
        ...work!.languages.reduce(
          (acc, lang, index) => {
            {
              acc[`edit-work.language.${index}`] = lang;
              return acc;
            }
          },
          {} as Record<string, unknown>
        ),
        ...work!.iswcs.reduce(
          (acc, iswc, index) => {
            {
              acc[`edit-work.iswc.${index}`] = iswc;
              return acc;
            }
          },
          {} as Record<string, unknown>
        ),
        ...work!.attributes.reduce(
          (acc, attr, index) => {
            {
              acc[`edit-work.attribute.${index}.0`] = attr['type-id'];
              acc[`edit-work.attribute.value.${index}.0`] = attr.value;
              return acc;
            }
          },
          {} as Record<string, unknown>
        ),
      });

      await route.fulfill({
        response: await page.request.get(`${baseURL}/work/${work!.id}`),
      });
    });

    await page.route('**/edit/create', route => route.fulfill({json: {edits: []}}));

    // Now click "Enter edit" which will automatically submit works first, then proceed with the edit
    const enterEdit = page.getByRole('button', {name: 'Enter edit'});
    await enterEdit.click();
    await expect(page).toHaveURL(`/release/${testRelease.gid}`);

    await page.unrouteAll();
  });
});
