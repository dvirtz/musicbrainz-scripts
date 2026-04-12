import {expect} from '@playwright/test';
import {test} from '@repo/test-support/musicbrainz-test';

const url = 'release/5fe5a3dd-3bc9-4dff-ab6c-6f7fae6e42e2/edit#tracklist';

test('reset action restores canonical artist name', async ({userscriptPage, page}) => {
  await userscriptPage.goto(url);

  const trackName = 'Goodbye New York';
  // cspell: disable-next-line
  const artistName = /גלי עטרי/;

  const trackArtistName = page.getByRole('row', {name: trackName}).getByPlaceholder('Type to search, or paste an');
  await expect(trackArtistName).not.toHaveValue(artistName);

  const resetButton = page.getByRole('button', {name: 'Reset artist names'});
  await resetButton.click();

  await expect(trackArtistName).toHaveValue(artistName);
});
