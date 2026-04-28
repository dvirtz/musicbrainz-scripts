import {test} from '#tests/fixtures/setlistfm-test.ts';

test('setlistfm settings dialog', async ({setlistfmPage, userscriptPage}) => {
  await setlistfmPage.goto('/venue/whisky-a-go-go-west-hollywood-ca-usa-5bd66bd4.html');
  await userscriptPage.testSettings([
    {
      name: 'addCoverComment',
      description: 'Add cover comment',
      defaultValue: false,
    },
  ]);
});
