import {test} from '#tests/fixtures/setlistfm-test.ts';
import {expect} from '@playwright/test';
import dedent from 'dedent';

test('existing event', async ({page, setlistfmPage, baseURL}) => {
  await setlistfmPage.goto('/setlist/elton-john/2022/enterprise-center-st-louis-mo-4389530f.html');

  const openInMB = page.getByRole('button', {name: 'Open in MB'});
  await expect(openInMB).toBeAttached();
  await openInMB.click();
  expect(setlistfmPage.windowOpenLog).toEqual([
    URL.parse('https://musicbrainz.org/event/f03ab6fe-e45a-44a4-80d1-12b4e63ef082'),
  ]);

  // also verify the alternate 'Edit in MB' action from the menu using Playwright locators
  const toggle = page.getByLabel('More actions');
  await expect(toggle).toBeAttached();
  await toggle.click();

  const expectedSearchParams = [
    ['edit-event.name', 'Farewell Yellow Brick Road World Tour: St. Louis'],
    ['edit-event.type_id', '1'],
    [
      'edit-event.setlist',
      // cspell:disable
      dedent.withOptions({trimWhitespace: false})`@ [b83bc61f-8451-4a5d-8b8e-7e9ed295e822|Elton John]
      * Pinball Wizard
      # from tape
      # Intro only
      * Bennie and the Jets
      * Philadelphia Freedom
      * I Guess That's Why They Call It the Blues
      * Border Song
      # dedicated to Aretha Franklin
      * Tiny Dancer
      * Have Mercy on the Criminal
      * Rocket Man (I Think It's Going to Be a Long, Long Time)
      * Take Me to the Pilot
      * Someone Saved My Life Tonight
      * Levon
      * Candle in the Wind
      * Funeral for a Friend/Love Lies Bleeding
      * Burn Down the Mission
      * Sad Songs (Say So Much)
      * Don't Let the Sun Go Down on Me
      * The Bitch Is Back
      * I'm Still Standing
      * Crocodile Rock
      * Saturday Night's Alright for Fighting

      # Encore:
      @ [b83bc61f-8451-4a5d-8b8e-7e9ed295e822|Elton John]
      * Cold Heart
      # virtual duet with Dua Lipa
      * Your Song
      * Goodbye Yellow Brick Road
      * Don't Go Breaking My Heart
      # from tape
      `,
      // cspell:enable
    ],
    ['edit-event.period.begin_date.year', '2022'],
    ['edit-event.period.begin_date.month', '3'],
    ['edit-event.period.begin_date.day', '30'],
    ['edit-event.period.end_date.year', '2022'],
    ['edit-event.period.end_date.month', '3'],
    ['edit-event.period.end_date.day', '30'],
    [
      'edit-event.edit_note',
      `----\nImported from ${baseURL}/setlist/elton-john/2022/enterprise-center-st-louis-mo-4389530f.html using userscript version 1.0.0 from https://homepage.com.`,
    ],
    ['edit-event.url.0.text', `${baseURL}/setlist/elton-john/2022/enterprise-center-st-louis-mo-4389530f.html`],
    ['edit-event.url.0.link_type_id', '811'],
    ['rels.0.type', '936c7c95-3156-3889-a062-8a0cd57f8946'],
    ['rels.0.target', 'b83bc61f-8451-4a5d-8b8e-7e9ed295e822'],
    ['rels.0.direction', 'backward'],
    ['rels.0.attributes.0.type', 'ebd303c3-7f57-452a-aa3b-d780ebad868d'],
    ['rels.0.attributes.0.text_value', '20:00'],
    ['rels.1.type', 'e2c6f697-07dc-38b1-be0b-83d740165532'],
    ['rels.1.target', '4bf41603-c878-412d-9806-65a12be6c1ab'],
  ];

  const editInMB = page.getByRole('menuitem', {name: 'Edit in MB'});
  await expect(editInMB).toBeAttached();
  await editInMB.click();
  expect(setlistfmPage.windowOpenLog[1]).toMatchObject({
    hostname: 'musicbrainz.org',
    pathname: '/event/f03ab6fe-e45a-44a4-80d1-12b4e63ef082/edit',
  });
  expect([...setlistfmPage.windowOpenLog[1]!.searchParams.entries()]).toEqual(expectedSearchParams);

  await toggle.click();
  const addToMB = page.getByRole('menuitem', {name: 'Add to MB'});
  await expect(addToMB).toBeAttached();
  await addToMB.click();
  expect(setlistfmPage.windowOpenLog[2]).toMatchObject({
    hostname: 'musicbrainz.org',
    pathname: '/event/create',
  });
  expect([...setlistfmPage.windowOpenLog[2]!.searchParams.entries()]).toEqual(expectedSearchParams);
});

test('missing event', async ({page, setlistfmPage, baseURL}) => {
  await setlistfmPage.goto('/setlist/artificial-joy/1991/whisky-a-go-go-west-hollywood-ca-1b85add4.html');

  const addToMB = page.getByRole('button', {name: 'Add to MB'});
  await expect(addToMB).toBeAttached();
  await addToMB.click();
  expect(setlistfmPage.windowOpenLog).toHaveLength(1);
  expect(setlistfmPage.windowOpenLog[0]).toMatchObject({
    hostname: 'musicbrainz.org',
    pathname: '/event/create',
  });
  expect([...setlistfmPage.windowOpenLog[0]!.searchParams.entries()]).toEqual([
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

test('missing event and place', async ({page, setlistfmPage}) => {
  await setlistfmPage.goto('/setlist/eternal-gray/2011/sublime-tel-aviv-israel-53d9eba1.html');

  const placeLink = page.getByText('at Sublime');
  const warning = placeLink.getByRole('img', {'name': 'warning'});
  await expect(warning).toBeAttached();
  await expect(warning).toHaveAttribute('title', 'place not found on MusicBrainz, click to search');
  await warning.click();

  expect(setlistfmPage.windowOpenLog).toHaveLength(1);
  expect(setlistfmPage.windowOpenLog[0]).toMatchObject({
    hostname: 'musicbrainz.org',
    pathname: '/search',
  });
  expect([...setlistfmPage.windowOpenLog[0]!.searchParams.entries()]).toEqual([
    ['query', 'place:Sublime AND area:Tel Aviv'],
    ['type', 'place'],
    ['method', 'advanced'],
  ]);
});
