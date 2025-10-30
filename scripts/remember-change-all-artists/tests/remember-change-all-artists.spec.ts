import {expect} from '@playwright/test';
import {test} from '@repo/test-support/musicbrainz-test';

test('remember change all artists', async ({userscriptPage, page}) => {
  await userscriptPage.goto('release/148cc205-92b8-42e6-a3b8-9758503a48cd/edit#tracklist');

  await page.locator('#open-ac-5628185').click();
  const changeAllArtistsCheckbox = page.getByRole('checkbox', {name: 'Change all artists on this'});
  await expect(changeAllArtistsCheckbox).not.toBeChecked();
  await changeAllArtistsCheckbox.check();
  await page.getByRole('button', {name: 'Done'}).click();

  await page.locator('#open-ac-5628186').click();
  const nextChangeAllArtistsCheckbox = page.getByRole('checkbox', {name: 'Change all artists on this'});
  await expect(nextChangeAllArtistsCheckbox).toBeChecked();
});

test('prepopulated from storage: true', async ({userscriptPage, page}) => {
  // Seed localStorage before the userscript and page are initialized
  await page.addInitScript(() => {
    localStorage.setItem('change-matching-artists', JSON.stringify(true));
  });

  await userscriptPage.goto('release/148cc205-92b8-42e6-a3b8-9758503a48cd/edit#tracklist');

  await page.locator('#open-ac-5628185').click();
  const checkbox = page.getByRole('checkbox', {name: 'Change all artists on this'});
  await expect(checkbox).toBeChecked();
});

test('persisted value survives reload', async ({userscriptPage, page}) => {
  await userscriptPage.goto('release/148cc205-92b8-42e6-a3b8-9758503a48cd/edit#tracklist');

  await page.locator('#open-ac-5628185').click();
  const checkbox = page.getByRole('checkbox', {name: 'Change all artists on this'});
  await checkbox.check();
  await page.getByRole('button', {name: 'Done'}).click();

  // Reload and re-inject the userscript
  await userscriptPage.goto('release/148cc205-92b8-42e6-a3b8-9758503a48cd/edit#tracklist');

  await page.locator('#open-ac-5628186').click();
  const nextCheckbox = page.getByRole('checkbox', {name: 'Change all artists on this'});
  await expect(nextCheckbox).toBeChecked();
});
