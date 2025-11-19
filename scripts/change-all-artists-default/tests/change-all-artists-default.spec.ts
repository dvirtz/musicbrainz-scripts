import {expect} from '@playwright/test';
import {test} from '@repo/test-support/musicbrainz-test';

const url = 'release/148cc205-92b8-42e6-a3b8-9758503a48cd/edit#tracklist';

test('change all artists default', async ({userscriptPage, page}) => {
  await userscriptPage.goto(url);

  const checkbox = page.getByRole('checkbox', {name: '"Change all artists" default'});
  await expect(checkbox).not.toBeChecked();
  await checkbox.check();

  await page.locator('#open-ac-5628185').click();
  const changeAllArtistsCheckbox = page.getByRole('checkbox', {name: 'Change all artists on this'});
  await expect(changeAllArtistsCheckbox).toBeChecked();

  // rename artist
  // cspell: disable
  const oldArtistName = 'אריק איינשטיין';
  const newArtistName = 'Arik Einstein';
  const trackName = 'אחינעם לא יודעת';
  // cspell: enable
  const artistNameInput = page.getByRole('cell', {name: oldArtistName, exact: true}).getByRole('textbox');
  await artistNameInput.fill(newArtistName);
  await page.getByRole('button', {name: 'Done'}).click();

  // cspell: disable-next-line
  const artistName = page.getByRole('row', {name: trackName}).getByPlaceholder('Type to search, or paste an');
  await expect(artistName).toHaveValue(newArtistName);
});

test('prepopulated from storage: true', async ({userscriptPage, page}) => {
  // Seed localStorage before the userscript and page are initialized
  await page.addInitScript(() => {
    localStorage.setItem('change-matching-artists', JSON.stringify(true));
  });

  await userscriptPage.goto(url);

  await page.locator('#open-ac-5628185').click();
  const checkbox = page.getByRole('checkbox', {name: 'Change all artists on this'});
  await expect(checkbox).toBeChecked();
});

test('persisted value survives reload', async ({userscriptPage, page}) => {
  await userscriptPage.goto(url);

  const checkbox = page.getByRole('checkbox', {name: '"Change all artists" default'});
  await checkbox.check();

  // Reload and re-inject the userscript
  await userscriptPage.goto(url);

  await expect(checkbox).toBeChecked();
});
