// cspell:ignore Broza
import type {Page} from '@playwright/test';
import {expect} from '@playwright/test';
import {type MB} from '@repo/musicbrainz-ext/release-editor';
import {MusicbrainzPage} from '@repo/test-support/musicbrainz-page';
import {test as base} from '@repo/test-support/musicbrainz-test';

const release = '70134fa0-9324-4a03-bb57-28df33834904';

class ReleaseEditorPage {
  constructor(
    public musicbrainzPage: MusicbrainzPage,
    public page: Page = musicbrainzPage.page
  ) {}

  async waitForAllMediumsToLoad() {
    await this.page.waitForFunction(() =>
      (MB as MB).releaseEditor.rootField
        .release()
        .mediums()
        .every(medium => medium.loaded())
    );
  }

  async tracklistState() {
    return await this.page.evaluate(() =>
      (MB as MB).releaseEditor.rootField
        .release()
        .mediums()
        .map(medium => ({
          position: medium.position(),
          tracks: medium.tracks().map(track => ({
            id: track.id,
            name: track.name(),
            position: track.position(),
            recordingGid: track.recording().gid,
          })),
        }))
    );
  }

  async verifyEditNoteTab(action: string, editCount: {mediumsEdited?: number; mediumsAdded?: number}) {
    await this.page.getByRole('link', {name: 'Edit note'}).click();

    await expect(this.page.getByRole('textbox', {name: 'Edit note:'})).toHaveValue(
      `\n----\nMedium ${action} using userscript version 1.0.0 from https://homepage.com.`
    );

    await expect(this.page.getByRole('heading', {name: 'Edit medium'})).toHaveCount(editCount.mediumsEdited ?? 0);
    await expect(this.page.getByRole('heading', {name: 'Add medium'})).toHaveCount(editCount.mediumsAdded ?? 0);
  }

  async verifyTrackList(expected: Awaited<ReturnType<typeof this.tracklistState>>) {
    await this.waitForAllMediumsToLoad();
    expect(await this.tracklistState()).toEqual(expected);
  }
}

const test = base.extend<{releaseEditorPage: ReleaseEditorPage}>({
  releaseEditorPage: async ({musicbrainzPage}, use) => {
    const releaseEditorPage = new ReleaseEditorPage(musicbrainzPage);
    await musicbrainzPage.editTracklist(release);
    await releaseEditorPage.waitForAllMediumsToLoad();
    await musicbrainzPage.page.getByRole('button', {name: 'Show'}).click();
    await use(releaseEditorPage);
  },
});

test('merge with next medium', async ({releaseEditorPage, page}) => {
  const oldTrackList = await releaseEditorPage.tracklistState();

  await page.getByRole('group', {name: 'Medium 1'}).getByLabel('Merge with next medium').click();

  await releaseEditorPage.verifyTrackList([
    {
      position: 1,
      tracks: [
        ...oldTrackList[0]!.tracks,
        ...oldTrackList[1]!.tracks.map(track => ({
          ...track,
          id: undefined,
          position: track.position + oldTrackList[0]!.tracks.length,
        })),
      ],
    },
    {
      position: 2,
      tracks: oldTrackList[2]!.tracks,
    },
  ]);
  await releaseEditorPage.verifyEditNoteTab('merge', {mediumsEdited: 1});
});

test('merge with previous medium', async ({releaseEditorPage, page}) => {
  const oldTrackList = await releaseEditorPage.tracklistState();

  await page.getByRole('group', {name: 'Medium 3'}).getByLabel('Merge with previous medium').click();

  await releaseEditorPage.verifyTrackList([
    {
      position: 1,
      tracks: oldTrackList[0]!.tracks,
    },
    {
      position: 2,
      tracks: [
        ...oldTrackList[1]!.tracks,
        ...oldTrackList[2]!.tracks.map(track => ({
          ...track,
          id: undefined,
          position: track.position + oldTrackList[1]!.tracks.length,
        })),
      ],
    },
  ]);
  await releaseEditorPage.verifyEditNoteTab('merge', {mediumsEdited: 1});
});

test('split medium before a track', async ({releaseEditorPage, page}) => {
  const oldTrackList = await releaseEditorPage.tracklistState();

  await page
    .locator('tr.track')
    .nth(5)
    .getByRole('button', {name: 'Split medium before this track'})
    .evaluate(button => (button as HTMLButtonElement).click());

  await releaseEditorPage.verifyTrackList([
    {
      position: 1,
      tracks: oldTrackList[0]!.tracks.slice(0, 5),
    },
    {
      position: 2,
      tracks: oldTrackList[0]!.tracks.slice(5).map((track, index) => ({...track, id: undefined, position: index + 1})),
    },
    {
      position: 3,
      tracks: oldTrackList[1]!.tracks,
    },
    {
      position: 4,
      tracks: oldTrackList[2]!.tracks,
    },
  ]);
  await releaseEditorPage.verifyEditNoteTab('split', {mediumsEdited: 1, mediumsAdded: 1});
});

test('merge buttons are disabled without an adjacent medium', async ({releaseEditorPage: _, page}) => {
  await expect(page.getByRole('button', {name: 'Merge with previous medium'}).first()).toBeDisabled();
  await expect(page.getByRole('button', {name: 'Merge with next medium'}).last()).toBeDisabled();
  await expect(
    page.locator('tr.track').first().getByRole('button', {name: 'Split medium before this track'})
  ).toBeHidden();
});

test('adds controls for tracks added after activation', async ({releaseEditorPage: _, page}) => {
  const medium = page.getByRole('group', {name: 'Medium 1'});
  await medium.getByRole('button', {name: 'Add track(s)'}).click();
  const newTrack = medium.getByRole('row').last();
  await expect(newTrack.getByRole('button', {name: 'Split medium before this track'})).toBeVisible();
});
