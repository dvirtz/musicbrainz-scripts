import {test} from '#tests/fixtures/setlistfm-test.ts';
import {expect} from '@playwright/test';

test('existing place', async ({page, setlistfmPage, userscriptPage, baseURL}) => {
  await setlistfmPage.goto('/venue/whisky-a-go-go-west-hollywood-ca-usa-5bd66bd4.html');

  const openInMB = page.getByRole('button', {name: 'Open in MB'});
  await expect(openInMB).toBeAttached();
  await openInMB.click();
  expect(userscriptPage.windowOpenLog[0]).toMatchObject({
    hostname: 'musicbrainz.org',
    pathname: '/place/414283ed-c2a6-4e27-93cb-3663ab2ac3e9',
  });

  // also verify the alternate 'Edit in MB' action from the menu using Playwright locators
  const toggle = page.getByLabel('More actions');
  await expect(toggle).toBeAttached();
  await toggle.click();

  const expectedSearchParams = [
    ['edit-place.name', 'Whisky A Go Go'],
    [
      'edit-place.edit_note',
      `----\nImported from ${baseURL}/venue/whisky-a-go-go-west-hollywood-ca-usa-5bd66bd4.html using userscript version 1.0.0 from https://homepage.com.`,
    ],
    ['edit-place.area.name', 'West Hollywood'],
    ['edit-place.address', '8901 West Sunset Boulevard, West Hollywood, CA 90069, USA'],
    ['edit-place.period.begin_date.year', '1964'],
    ['edit-place.period.begin_date.month', '1'],
    ['edit-place.period.begin_date.day', '16'],
    ['edit-place.url.1.text', `http://www.whiskyagogo.com/`],
    ['edit-place.url.2.text', `http://en.wikipedia.org/wiki/Whisky_a_Go_Go`],
    ['edit-place.url.0.text', `${baseURL}/venue/whisky-a-go-go-west-hollywood-ca-usa-5bd66bd4.html`],
    ['edit-place.url.0.link_type_id', '817'],
  ];

  const editInMB = page.getByRole('menuitem', {name: 'Edit in MB'});
  await expect(editInMB).toBeAttached();
  await editInMB.click();
  expect(userscriptPage.windowOpenLog[1]).toMatchObject({
    hostname: 'musicbrainz.org',
    pathname: '/place/414283ed-c2a6-4e27-93cb-3663ab2ac3e9/edit',
  });
  expect([...userscriptPage.windowOpenLog[1]!.searchParams.entries()]).toEqual(expectedSearchParams);

  await toggle.click();
  const addToMB = page.getByRole('menuitem', {name: 'Add to MB'});
  await expect(addToMB).toBeAttached();
  await addToMB.click();
  expect(userscriptPage.windowOpenLog[2]).toMatchObject({
    hostname: 'musicbrainz.org',
    pathname: '/place/create',
  });
  expect([...userscriptPage.windowOpenLog[2]!.searchParams.entries()]).toEqual(expectedSearchParams);
});

test('missing place', async ({page, setlistfmPage, userscriptPage, baseURL}) => {
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
  expect([...userscriptPage.windowOpenLog[0]!.searchParams.entries()]).toEqual([
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
