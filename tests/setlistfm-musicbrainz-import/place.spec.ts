import {expect, mergeTests} from '@playwright/test';
import {test as userscriptTest} from '../fixtures/userscript-test';
import {test as setlistfmTest} from './fixtures/setlistfm-test';

const test = mergeTests(userscriptTest, setlistfmTest);

test('existing place', async ({page, userscriptPage, setlistfmPage}) => {
  await setlistfmPage.goto('/venue/whisky-a-go-go-west-hollywood-ca-usa-5bd66bd4.html');

  const openInMB = page.getByRole('button', {name: 'Open in MB'});
  await expect(openInMB).toBeAttached();
  await openInMB.click();
  expect(userscriptPage.windowOpenLog).toEqual([
    URL.parse('https://beta.musicbrainz.org/place/414283ed-c2a6-4e27-93cb-3663ab2ac3e9'),
  ]);
});

test('missing event', async ({page, userscriptPage, setlistfmPage, baseURL}) => {
  // cspell:disable-next-line
  await setlistfmPage.goto('/venue/el-teatrito-buenos-aires-argentina-4bd61f1e.html');

  const addToMB = page.getByRole('button', {name: 'Add to MB'});
  await expect(addToMB).toBeAttached();
  await addToMB.click();
  expect(userscriptPage.windowOpenLog).toHaveLength(1);
  expect(userscriptPage.windowOpenLog[0]).toMatchObject({
    hostname: 'musicbrainz.org',
    pathname: '/place/create',
  });
  expect([...userscriptPage.windowOpenLog[0].searchParams.entries()]).toEqual([
    // cspell:disable
    ['edit-place.name', 'El Teatrito'],
    [
      'edit-place.edit_note',
      `----\nImported from ${baseURL}/venue/el-teatrito-buenos-aires-argentina-4bd61f1e.html using userscript version 1.0.0 from https://homepage.com.`,
    ],
    ['edit-place.area.name', 'Buenos Aires'],
    ['edit-place.address', 'Sarmiento 777, Buenos Aires, Argentina'],
    ['edit-place.url.0.text', `${baseURL}/venue/el-teatrito-buenos-aires-argentina-4bd61f1e.html`],
    ['edit-place.url.0.link_type_id', '817'],
    // cspell:enable
  ]);
});
