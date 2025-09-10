import {test as musicbrainzPage} from '#tests/fixtures/musicbrainz-test.ts';
import {test as testRelease} from '#tests/fixtures/test-release.ts';
import {expect, mergeTests} from '@playwright/test';

const test = mergeTests(testRelease, musicbrainzPage);

test.describe('release editor', () => {
  test('can import album', async ({page, testRelease, musicbrainzPage}) => {
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

    // Now click "Enter edit" which will automatically submit works first, then proceed with the edit
    const enterEdit = page.getByRole('button', {name: 'Enter edit'});
    await enterEdit.click();
    await expect(page).toHaveURL(`/release/${testRelease.gid}`);
  });
});
