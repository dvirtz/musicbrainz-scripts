import {expect, Locator, Page} from '@playwright/test';
import {test as baseTest} from '@repo/test-support/musicbrainz-test';

// cspell: disable
const release = '5fe5a3dd-3bc9-4dff-ab6c-6f7fae6e42e2';
const trackName = 'Goodbye New York';
const copyTargetRelease = '73de723f-874d-43b0-8c1b-68a1e3b1332b';
const copyTargetTrackName = 'על הים';
const copySourceRelease = '29fef51a-6c85-4f4d-8274-9fd342fe0a24';
const artistName = /גלי עטרי/;
const releaseArtistCredit = 'Milk & Honey With Gali';
const recordingArtistCredit = 'Milk and Honey with Gali';
const expectedCopiedCredit = 'Daniela Spector';
// cspell: enable

type ArtistCreditTool = {
  openDialog: () => Promise<Locator>;
  page: Page;
  trackArtistName: Locator;
};

type ArtistCreditToolOptions = {
  targetRelease: string;
  targetTrackName: string;
};

async function verifyEditNoteTab(page: Page, message: string) {
  await page.getByRole('link', {name: 'Edit note'}).click();

  await expect(page.getByRole('textbox', {name: 'Edit note:'})).toHaveValue(
    `\n----\n${message} using userscript version 1.0.0 from https://homepage.com.`
  );
}

const test = baseTest.extend<ArtistCreditToolOptions & {artistCreditTool: ArtistCreditTool}>({
  targetRelease: [release, {option: true}],
  targetTrackName: [trackName, {option: true}],
  artistCreditTool: async ({musicbrainzPage, page, targetRelease, targetTrackName}, use) => {
    await musicbrainzPage.editTracklist(targetRelease);
    await use({
      openDialog: async () => {
        await page.getByRole('button', {name: 'Manage artist credits'}).click();
        return page.getByRole('dialog', {name: 'Manage artist credits'});
      },
      page,
      trackArtistName: page.getByRole('row', {name: targetTrackName}).getByPlaceholder('Type to search, or paste an'),
    });
  },
});

test('reset action restores canonical artist name', async ({artistCreditTool}) => {
  await expect(artistCreditTool.trackArtistName).not.toHaveValue(artistName);
  const dialog = await artistCreditTool.openDialog();

  await dialog.getByRole('button', {name: 'Reset credits to artist names'}).click();

  await expect(artistCreditTool.trackArtistName).toHaveValue(artistName);
  await verifyEditNoteTab(artistCreditTool.page, 'Reset artist credits to artist names');
});

test('applies the release artist credit to every track', async ({artistCreditTool}) => {
  await expect(artistCreditTool.trackArtistName).not.toHaveValue(artistName);
  const dialog = await artistCreditTool.openDialog();

  await dialog.getByRole('button', {name: 'Reset credits to release artist'}).click();

  await expect(artistCreditTool.trackArtistName).toHaveValue(releaseArtistCredit);
  await verifyEditNoteTab(artistCreditTool.page, 'Reset track artist credits to release artist');
});

test('copies recording artist credits to tracks', async ({artistCreditTool}) => {
  await expect(artistCreditTool.trackArtistName).not.toHaveValue(artistName);
  const dialog = await artistCreditTool.openDialog();

  await dialog.getByRole('button', {name: 'Copy credits from recordings'}).click();

  await expect(artistCreditTool.trackArtistName).toHaveValue(recordingArtistCredit);
  await verifyEditNoteTab(artistCreditTool.page, 'Copied track artist credits from recordings');
});

const copyFromReleaseTest = test.extend({
  targetRelease: copyTargetRelease,
  targetTrackName: copyTargetTrackName,
});

copyFromReleaseTest('copies credits from a pasted source release', async ({artistCreditTool, baseURL}) => {
  const dialog = await artistCreditTool.openDialog();
  await dialog.getByRole('button', {name: 'Copy credits from another release'}).click();
  const sourceDialog = artistCreditTool.page.getByRole('dialog', {name: 'Copy credits from another release'});
  await artistCreditTool.page.getByLabel('Source release or medium').fill(copySourceRelease);
  await artistCreditTool.page.getByRole('button', {name: 'Apply'}).click();
  await expect(sourceDialog).not.toBeVisible();
  await expect(dialog).not.toBeVisible();

  await expect(artistCreditTool.trackArtistName).toHaveClass(/lookup-performed/);
  await expect(artistCreditTool.trackArtistName).toHaveValue(expectedCopiedCredit);
  await verifyEditNoteTab(
    artistCreditTool.page,
    `Copied track artist credits from ${baseURL}/release/${copySourceRelease}`
  );
});

copyFromReleaseTest('copies credits from a selected source release', async ({artistCreditTool, baseURL}) => {
  const dialog = await artistCreditTool.openDialog();
  await dialog.getByRole('button', {name: 'Copy credits from another release'}).click();
  const sourceDialog = artistCreditTool.page.getByRole('dialog', {name: 'Copy credits from another release'});
  await sourceDialog.getByRole('row', {name: expectedCopiedCredit}).getByRole('radio').check();
  await expect(sourceDialog.getByRole('row', {name: expectedCopiedCredit})).toBeVisible();
  await sourceDialog.getByRole('button', {name: 'Apply'}).click();
  await expect(sourceDialog).not.toBeVisible();
  await expect(dialog).not.toBeVisible();

  await expect(artistCreditTool.trackArtistName).toHaveClass(/lookup-performed/);
  await expect(artistCreditTool.trackArtistName).toHaveValue(expectedCopiedCredit);
  await verifyEditNoteTab(
    artistCreditTool.page,
    `Copied track artist credits from ${baseURL}/release/${copySourceRelease}`
  );
});
