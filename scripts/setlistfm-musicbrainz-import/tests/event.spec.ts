import {expect, mergeTests} from '@playwright/test';
import {test as userscriptTest} from 'test-support';
import {test as setlistfmTest} from './fixtures/setlistfm-test';

const test = mergeTests(userscriptTest, setlistfmTest);

test('existing event', async ({page, userscriptPage, setlistfmPage}) => {
  await setlistfmPage.goto('/setlist/elton-john/2022/enterprise-center-st-louis-mo-4389530f.html');

  const openInMB = page.getByRole('button', {name: 'Open in MB'});
  await expect(openInMB).toBeAttached();
  await openInMB.click();
  expect(userscriptPage.windowOpenLog).toEqual([
    URL.parse('https://musicbrainz.org/event/f03ab6fe-e45a-44a4-80d1-12b4e63ef082'),
  ]);
});

test('missing event', async ({page, userscriptPage, setlistfmPage, baseURL}) => {
  await setlistfmPage.goto('/setlist/artificial-joy/1991/whisky-a-go-go-west-hollywood-ca-1b85add4.html');

  const addToMB = page.getByRole('button', {name: 'Add to MB'});
  await expect(addToMB).toBeAttached();
  await addToMB.click();
  expect(userscriptPage.windowOpenLog).toHaveLength(1);
  expect(userscriptPage.windowOpenLog[0]).toMatchObject({
    hostname: 'musicbrainz.org',
    pathname: '/event/create',
  });
  expect([...userscriptPage.windowOpenLog[0].searchParams.entries()]).toEqual([
    ['edit-event.name', 'Artificial Joy at Whisky A Go Go'],
    ['edit-event.type_id', '1'],
    ['edit-event.setlist', ''],
    ['edit-event.period.begin_date.year', '1991'],
    ['edit-event.period.begin_date.month', '5'],
    ['edit-event.period.begin_date.day', '10'],
    ['edit-event.period.end_date.year', '1991'],
    ['edit-event.period.end_date.month', '5'],
    ['edit-event.period.end_date.day', '10'],
    [
      'edit-event.edit_note',
      `----\nImported from ${baseURL}/setlist/artificial-joy/1991/whisky-a-go-go-west-hollywood-ca-1b85add4.html using userscript version 1.0.0 from https://homepage.com.`,
    ],
    ['edit-event.url.0.text', `${baseURL}/setlist/artificial-joy/1991/whisky-a-go-go-west-hollywood-ca-1b85add4.html`],
    ['edit-event.url.0.link_type_id', '811'],
    ['rels.0.type', '936c7c95-3156-3889-a062-8a0cd57f8946'],
    ['rels.0.target', '37a715c9-b344-4850-b195-756e972d83bc'],
    ['rels.0.direction', 'backward'],
    ['rels.1.type', 'e2c6f697-07dc-38b1-be0b-83d740165532'],
    ['rels.1.target', '414283ed-c2a6-4e27-93cb-3663ab2ac3e9'],
  ]);
});

test('missing event and place', async ({page, userscriptPage, setlistfmPage}) => {
  await setlistfmPage.goto('/setlist/eternal-gray/2011/sublime-tel-aviv-israel-53d9eba1.html');

  const placeLink = page.getByText('at Sublime');
  const warning = placeLink.getByRole('img', {'name': 'warning'});
  await expect(warning).toBeAttached();
  await expect(warning).toHaveAttribute('title', 'place not found on MusicBrainz, click to search');
  await warning.click();

  expect(userscriptPage.windowOpenLog).toHaveLength(1);
  expect(userscriptPage.windowOpenLog[0]).toMatchObject({
    hostname: 'musicbrainz.org',
    pathname: '/search',
  });
  expect([...userscriptPage.windowOpenLog[0].searchParams.entries()]).toEqual([
    ['query', 'place:Sublime AND area:Tel Aviv'],
    ['type', 'place'],
    ['method', 'advanced'],
  ]);
});
