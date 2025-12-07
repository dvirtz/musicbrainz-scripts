import {expect} from '@playwright/test';
import {test} from '@repo/test-support/musicbrainz-test';

// Basic existence test, extend as needed

[
  {buttonName: 'Remove LHS', keptIndex: 1},
  {buttonName: 'Remove RHS', keptIndex: 0},
  {buttonName: 'Remove RHS', keptIndex: 0, separator: '-'},
].forEach(({buttonName, keptIndex, separator}) => {
  test(`${buttonName}${separator ? `, ${separator}` : ''}`, async ({page, baseURL, userscriptPage}) => {
    const formData: Record<string, string> = {
      // cspell: disable
      'name': 'סודות גדולים = Big Secrets',
      'artist_credit.names.0.name': 'דויד ברוזה',
      'artist_credit.names.0.mbid': '2077bf4d-9bf2-43ac-8c9d-d3eec73e3b30',
      'artist_credit.names.0.join_phrase': ' = ',
      'artist_credit.names.1.name': 'David Broza',
      'artist_credit.names.1.mbid': '2077bf4d-9bf2-43ac-8c9d-d3eec73e3b30',
      'country': 'IL',
      'date.year': '1996',
      'labels.0.name': 'RGB Records',
      'labels.0.catalog_number': '64277',
      'urls.0.url': 'https://www.discogs.com/release/13155647',
      'urls.0.link_type': '76',
      'mediums.0.format': 'CD',
      'mediums.0.track.0.name': 'סודות גדולים = Big Secrets',
      'mediums.0.track.0.length': '233000',
      'mediums.0.track.1.name': 'שיר געגועים = Longing',
      'mediums.0.track.1.length': '298000',
      'mediums.0.track.2.name': "את אישה = You're A Woman",
      'mediums.0.track.2.length': '214000',
      'mediums.0.track.2.artist_credit.names.0.name': 'דויד ברוזה',
      'mediums.0.track.2.artist_credit.names.0.mbid': '2077bf4d-9bf2-43ac-8c9d-d3eec73e3b30',
      'mediums.0.track.2.artist_credit.names.0.join_phrase': ' ו',
      'mediums.0.track.2.artist_credit.names.1.name': 'אברהם טל',
      'mediums.0.track.2.artist_credit.names.1.mbid': '56700752-75da-4f2b-bf11-ff8823c7a911',
      'mediums.0.track.2.artist_credit.names.1.join_phrase': ' = ',
      'mediums.0.track.2.artist_credit.names.2.name': 'David Broza',
      'mediums.0.track.2.artist_credit.names.2.mbid': '2077bf4d-9bf2-43ac-8c9d-d3eec73e3b30',
      'mediums.0.track.2.artist_credit.names.2.join_phrase': ' & ',
      'mediums.0.track.2.artist_credit.names.3.name': 'Avraham Tal',
      'mediums.0.track.2.artist_credit.names.3.mbid': '56700752-75da-4f2b-bf11-ff8823c7a911',
      'mediums.0.track.3.name': 'החל רש = Hachel Rash',
      'mediums.0.track.3.length': '408000',
      'mediums.0.track.4.name': 'גלויה מצוירת = A Painted Postcard',
      'mediums.0.track.4.length': '279000',
      'mediums.0.track.5.name': 'השמש ממול ומגב = The Sun In Front And Back',
      'mediums.0.track.5.length': '232000',
      'mediums.0.track.6.name': 'האהבה היא נושא מפתח = Love Is A Key Subject',
      'mediums.0.track.6.length': '223000',
      'mediums.0.track.7.name': 'הנסיך הגדול = The Big Prince',
      'mediums.0.track.7.length': '216000',
      'mediums.0.track.8.name': 'הומה יונה = Howling Dove',
      'mediums.0.track.8.length': '274000',
      'mediums.0.track.9.name': 'כמו ענן = Like A Cloud',
      'mediums.0.track.9.length': '395000',
      'type': 'album',
      // cspell: enable
    };

    const withSeparator = separator
      ? Object.fromEntries(
          Object.entries(formData).map(entry => {
            const [key, value] = entry;
            return [key.replace('=', separator), value.replace('=', separator)] as const;
          })
        )
      : formData;

    await userscriptPage.submitForm(withSeparator, `${baseURL}/release/add`);

    await page.getByRole('link', {name: 'Tracklist'}).click();

    const separatorInput = page.getByRole('textbox', {name: 'separator:'});
    if (separator) {
      await separatorInput.fill(separator);
    }

    const removeButton = page.getByRole('button', {name: buttonName});
    await removeButton.click();

    const actualSeparator = separator || '=';

    // Verify that the track names have been updated correctly
    const title = page.locator('input[id="name"]');
    await expect(title).toHaveValue(withSeparator['name']!.split(actualSeparator)[keptIndex]!.trim());

    const releaseArtistInput = page.locator('.release-artist input');
    await expect(releaseArtistInput).toHaveValue(withSeparator[`artist_credit.names.${keptIndex}.name`]!.trim());

    for (let i = 0; i < 10; i++) {
      const trackInput = page.locator(`input.track-name`).nth(i);
      const originalTrackName = withSeparator[`mediums.0.track.${i}.name`]!;
      const expectedTrackName = originalTrackName.split(actualSeparator)[keptIndex]!.trim();
      await expect(trackInput).toHaveValue(expectedTrackName);

      const artistInput = page.locator(`.artist input`).nth(i);
      if (`mediums.0.track.${i}.artist_credit.names.0.name` in withSeparator) {
        await expect(artistInput).toHaveValue(
          `${withSeparator[`mediums.0.track.${i}.artist_credit.names.${keptIndex * 2}.name`]}${withSeparator[`mediums.0.track.${i}.artist_credit.names.${keptIndex * 2}.join_phrase`]}${withSeparator[`mediums.0.track.${i}.artist_credit.names.${keptIndex * 2 + 1}.name`]!}`
        );
      } else {
        await expect(artistInput).toHaveValue(withSeparator[`artist_credit.names.${keptIndex}.name`]!);
      }
    }
  });
});

test('prepopulated from storage: true', async ({userscriptPage, page}) => {
  // Seed localStorage before the userscript and page are initialized
  await page.addInitScript(() => {
    localStorage.setItem('separator', JSON.stringify('<=>'));
  });

  await userscriptPage.goto('/release/add');

  await page.getByRole('link', {name: 'Tracklist'}).click();

  const separatorInput = page.getByRole('textbox', {name: 'separator:'});
  await expect(separatorInput).toHaveValue('<=>');
});

test('persisted value survives reload', async ({userscriptPage, page}) => {
  await userscriptPage.goto('/release/add');
  await page.getByRole('link', {name: 'Tracklist'}).click();

  const separatorInput = page.getByRole('textbox', {name: 'separator:'});
  await separatorInput.fill('~');

  // Reload and re-inject the userscript
  await userscriptPage.reload();
  await page.getByRole('link', {name: 'Tracklist'}).click();

  await expect(separatorInput).toHaveValue('~');
});
