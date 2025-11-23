import {expect} from '@playwright/test';
import {test} from '@repo/test-support/musicbrainz-test';

// Basic existence test, extend as needed

[
  {buttonName: 'Remove LHS', titleIndex: 1, artistIndex: 1},
  {buttonName: 'Remove RHS', titleIndex: 0, artistIndex: 0},
].forEach(({buttonName, titleIndex, artistIndex}) => {
  test(buttonName, async ({page, baseURL, userscriptPage}) => {
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

    await userscriptPage.submitForm(formData, `${baseURL}/release/add`);

    await page.getByRole('link', {name: 'Tracklist'}).click();

    const removeButton = page.getByRole('button', {name: buttonName});
    await removeButton.click();

    // Verify that the track names have been updated correctly
    const title = page.locator('input[id="name"]');
    await expect(title).toHaveValue(formData['name']!.split('=')[titleIndex]!.trim());

    const releaseArtistInput = page.locator('.release-artist input');
    await expect(releaseArtistInput).toHaveValue(formData[`artist_credit.names.${artistIndex}.name`]!.trim());

    for (let i = 0; i < 10; i++) {
      const trackInput = page.locator(`input.track-name`).nth(i);
      const originalTrackName = formData[`mediums.0.track.${i}.name`]!;
      const expectedTrackName = originalTrackName.split('=')[titleIndex]!.trim();
      await expect(trackInput).toHaveValue(expectedTrackName);

      const artistInput = page.locator(`.artist input`).nth(i);
      if (`mediums.0.track.${i}.artist_credit.names.0.name` in formData) {
        await expect(artistInput).toHaveValue(
          `${formData[`mediums.0.track.${i}.artist_credit.names.${artistIndex * 2}.name`]}${formData[`mediums.0.track.${i}.artist_credit.names.${artistIndex * 2}.join_phrase`]}${formData[`mediums.0.track.${i}.artist_credit.names.${artistIndex * 2 + 1}.name`]!}`
        );
      } else {
        await expect(artistInput).toHaveValue(formData[`artist_credit.names.${artistIndex}.name`]!);
      }
    }
  });
});
