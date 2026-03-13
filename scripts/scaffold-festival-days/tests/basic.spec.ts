import {test} from '#tests/fixtures/test-festival-event.ts';
import {expect} from '@playwright/test';

test('creates test festival event when missing', async ({musicbrainzPage, testFestivalEvent}) => {
  await musicbrainzPage.userscriptPage.goto(`/event/${testFestivalEvent.gid}`);
  await expect(
    musicbrainzPage.page.getByRole('heading', {name: 'scaffold-festival-days test: Test Festival'})
  ).toBeVisible();
});

test('creates two test places when missing', async ({musicbrainzPage, testPlaces}) => {
  const places = testPlaces.getAll();
  expect(places).toHaveLength(2);

  for (const placeGid of places) {
    await musicbrainzPage.userscriptPage.goto(`/place/${placeGid}`);
    await expect(musicbrainzPage.page.getByRole('heading', {name: /scaffold-festival-days test: Place/})).toBeVisible();
  }
});
