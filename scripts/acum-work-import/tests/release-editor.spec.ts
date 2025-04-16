import {expect, mergeTests} from '@playwright/test';
import {test as musicbrainzPage} from './fixtures/musicbrainz-test';
import {test as testRelease} from './fixtures/test-release';

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
    const submitWorks = page.getByRole('button', {name: 'Submit works'});
    await expect(submitWorks).toBeDisabled();
    await importButton.click();
    await expect(submitWorks).toBeEnabled();

    const enterEdit = page.getByRole('button', {name: 'Enter edit'});
    await expect(enterEdit).toBeDisabled();

    const recordingOfLabels = page.getByText('recording of:');
    await expect(recordingOfLabels).toHaveCount(testRelease.tracks().length);

    const arrangerLabels = page.getByText('arranger:');
    await expect(arrangerLabels).toHaveCount(testRelease.tracks().length);

    await submitWorks.click();
    await expect(enterEdit).toBeEnabled();

    await enterEdit.click();
    await expect(page).toHaveURL(`/release/${testRelease.gid}`);
  });
});
