// cspell:ignore Broza
import type {Page} from '@playwright/test';
import {expect} from '@playwright/test';
import type {MBReleaseEditor} from '@repo/musicbrainz-ext/release-editor';
import {test} from '@repo/test-support/musicbrainz-test';

declare const MB: {releaseEditor: MBReleaseEditor};
type TaggedRecording = {tag?: string};

const releaseFormData = {
  'name': 'Merge Split Test',
  'artist_credit.names.0.name': 'David Broza',
  'artist_credit.names.0.mbid': '2077bf4d-9bf2-43ac-8c9d-d3eec73e3b30',
  'type': 'album',
};

function mediumForm(mediumIndex: number, trackNames: string[]): Record<string, string> {
  return Object.fromEntries([
    [`mediums.${mediumIndex}.format`, 'CD'],
    ...trackNames.flatMap((name, trackIndex) => [
      [`mediums.${mediumIndex}.track.${trackIndex}.name`, name] as const,
      [`mediums.${mediumIndex}.track.${trackIndex}.length`, `${180000 + trackIndex * 1000}`] as const,
    ]),
  ]);
}

/** Tags every recording instance so we can tell whether merging/splitting reuses the same objects. */
async function tagRecordings(page: Page) {
  await page.evaluate(() => {
    let index = 0;
    for (const track of MB.releaseEditor.rootField.release().allTracks()) {
      (track.recording() as TaggedRecording).tag = `recording-${index++}`;
    }
  });
}

async function tracklistState(page: Page) {
  return await page.evaluate(() =>
    MB.releaseEditor.rootField
      .release()
      .mediums()
      .map(medium => ({
        position: medium.position(),
        tracks: medium.tracks().map(track => ({
          name: track.name(),
          number: String(track.number()),
          recordingTag: (track.recording() as TaggedRecording).tag,
        })),
      }))
  );
}

test('merge with next medium', async ({page, baseURL, userscriptPage}) => {
  await userscriptPage.submitForm(
    {...releaseFormData, ...mediumForm(0, ['One', 'Two', 'Three']), ...mediumForm(1, ['Four', 'Five'])},
    `${baseURL}/release/add`
  );
  await page.getByRole('link', {name: 'Tracklist'}).click();
  await page.getByRole('button', {name: 'Show'}).click();
  await tagRecordings(page);

  await page.locator('fieldset.advanced-medium').first().getByRole('button', {name: 'Merge with next medium'}).click();

  expect(await tracklistState(page)).toEqual([
    {
      position: 1,
      tracks: ['One', 'Two', 'Three', 'Four', 'Five'].map((name, index) => ({
        name,
        number: String(index + 1),
        recordingTag: `recording-${index}`,
      })),
    },
  ]);
});

test('merge with previous medium', async ({page, baseURL, userscriptPage}) => {
  await userscriptPage.submitForm(
    {...releaseFormData, ...mediumForm(0, ['One', 'Two']), ...mediumForm(1, ['Three', 'Four'])},
    `${baseURL}/release/add`
  );
  await page.getByRole('link', {name: 'Tracklist'}).click();
  await page.getByRole('button', {name: 'Show'}).click();
  await tagRecordings(page);

  await page
    .locator('fieldset.advanced-medium')
    .nth(1)
    .getByRole('button', {name: 'Merge with previous medium'})
    .click();

  expect(await tracklistState(page)).toEqual([
    {
      position: 1,
      tracks: ['One', 'Two', 'Three', 'Four'].map((name, index) => ({
        name,
        number: String(index + 1),
        recordingTag: `recording-${index}`,
      })),
    },
  ]);
});

test('split medium before a track', async ({page, baseURL, userscriptPage}) => {
  await userscriptPage.submitForm(
    {...releaseFormData, ...mediumForm(0, ['One', 'Two', 'Three', 'Four'])},
    `${baseURL}/release/add`
  );
  await page.getByRole('link', {name: 'Tracklist'}).click();
  await page.getByRole('button', {name: 'Show'}).click();
  await tagRecordings(page);

  await page
    .locator('tr.track')
    .nth(2)
    .getByRole('button', {name: 'Split medium before this track'})
    .evaluate(button => (button as HTMLButtonElement).click());

  expect(await tracklistState(page)).toEqual([
    {
      position: 1,
      tracks: ['One', 'Two'].map((name, index) => ({
        name,
        number: String(index + 1),
        recordingTag: `recording-${index}`,
      })),
    },
    {
      position: 2,
      tracks: ['Three', 'Four'].map((name, index) => ({
        name,
        number: String(index + 1),
        recordingTag: `recording-${index + 2}`,
      })),
    },
  ]);
});

test('merge buttons are disabled without an adjacent medium', async ({page, baseURL, userscriptPage}) => {
  await userscriptPage.submitForm({...releaseFormData, ...mediumForm(0, ['One', 'Two'])}, `${baseURL}/release/add`);
  await page.getByRole('link', {name: 'Tracklist'}).click();
  await page.getByRole('button', {name: 'Show'}).click();

  const medium = page.locator('fieldset.advanced-medium').first();
  await expect(medium.getByRole('button', {name: 'Merge with previous medium'})).toBeDisabled();
  await expect(medium.getByRole('button', {name: 'Merge with next medium'})).toBeDisabled();
  await expect(
    page.locator('tr.track').first().getByRole('button', {name: 'Split medium before this track'})
  ).toBeHidden();
});

test('adds controls for tracks added after activation', async ({page, baseURL, userscriptPage}) => {
  await userscriptPage.submitForm({...releaseFormData, ...mediumForm(0, ['One', 'Two'])}, `${baseURL}/release/add`);
  await page.getByRole('link', {name: 'Tracklist'}).click();
  await page.getByRole('button', {name: 'Show'}).click();

  await page.evaluate(() => {
    const medium = MB.releaseEditor.rootField.release().mediums()[0]!;
    medium.pushTrack({name: 'Three', length: 183000});
  });

  const newTrack = page.locator('tr.track').nth(2);
  await expect(newTrack.getByRole('button', {name: 'Split medium before this track'})).toBeVisible();
});
