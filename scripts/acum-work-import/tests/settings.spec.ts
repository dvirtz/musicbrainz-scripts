import {test} from './fixtures/musicbrainz-test';

test('musicbrainz settings dialog', async ({musicbrainzPage}) => {
  await musicbrainzPage.goto('/work/create');
  await musicbrainzPage.testSettings([
    {
      name: 'searchWorks',
      description: 'Search for existing works',
      defaultValue: true,
    },
    {
      name: 'setLanguage',
      description: 'Set work language',
      defaultValue: true,
    },
  ]);
});
