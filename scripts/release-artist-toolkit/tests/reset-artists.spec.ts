import {expect} from '@playwright/test';
import {test} from '@repo/test-support/musicbrainz-test';

const release = '5fe5a3dd-3bc9-4dff-ab6c-6f7fae6e42e2';

test('reset action restores canonical artist name', async ({musicbrainzPage, page}) => {
  await musicbrainzPage.editTracklist(release);

  const trackName = 'Goodbye New York';
  // cspell: disable-next-line
  const artistName = /גלי עטרי/;

  const trackArtistName = page.getByRole('row', {name: trackName}).getByPlaceholder('Type to search, or paste an');
  await expect(trackArtistName).not.toHaveValue(artistName);

  const resetButton = page.getByRole('button', {name: 'Reset artist names'});
  await resetButton.click();

  await expect(trackArtistName).toHaveValue(artistName);
});
