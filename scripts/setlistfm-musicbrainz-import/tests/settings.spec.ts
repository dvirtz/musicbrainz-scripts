import {test} from './fixtures/setlistfm-test';

test('setlistfm settings dialog', async ({setlistfmPage}) => {
  await setlistfmPage.goto('/venue/whisky-a-go-go-west-hollywood-ca-usa-5bd66bd4.html');
  await setlistfmPage.testSettings([
    {
      name: 'addCoverComment',
      description: 'Add cover comment',
      defaultValue: false,
    },
  ]);
});
