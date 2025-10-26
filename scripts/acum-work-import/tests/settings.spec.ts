import {test} from '#tests/fixtures/musicbrainz-test.ts';

test('musicbrainz settings dialog', async ({userscriptPage}) => {
  await userscriptPage.goto('/work/create');
  await userscriptPage.testSettings([
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
