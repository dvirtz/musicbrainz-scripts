import {test, TestParentEvent} from '#tests/fixtures/test-event.ts';
import {expect} from '@playwright/test';

const PLACE_GID = '4bf41603-c878-412d-9806-65a12be6c1ab';

test.describe('add-sub-event', () => {
  test('adds link as first item and seeds create-event form fields + relationships', async ({
    page,
    musicbrainzPage,
    testParentEvent,
    baseURL,
  }) => {
    await page.route(`**/ws/2/event/${testParentEvent.gid}?*`, async route => {
      await route.fulfill({
        json: {
          id: testParentEvent.gid,
          gid: testParentEvent.gid,
          'life-span': {
            begin: `${TestParentEvent.beginDate.year}-${TestParentEvent.beginDate.month}-${TestParentEvent.beginDate.day}`,
            end: `${TestParentEvent.endDate.year}-${TestParentEvent.endDate.month}-${TestParentEvent.endDate.day}`,
          },
          relations: [
            {
              'target-type': 'place',
              place: {
                id: PLACE_GID,
                gid: PLACE_GID,
              },
            },
          ],
        },
      });
    });

    await musicbrainzPage.userscriptPage.goto(`/event/${testParentEvent.gid}`);

    const addSubEventLink = page.locator('#add-sub-event-link');
    await expect(addSubEventLink).toBeAttached();
    await expect(addSubEventLink).toHaveText('Add sub-event');

    const isFirstListItem = await page.evaluate(() => {
      const addLink = document.getElementById('add-sub-event-link');
      const addItem = addLink?.closest('li');
      const list = addItem?.parentElement;
      return list?.firstElementChild === addItem;
    });
    expect(isFirstListItem).toBe(true);

    const href = await addSubEventLink.getAttribute('href');
    expect(href).not.toBeNull();
    const seededUrl = new URL(href!, baseURL);

    expect(seededUrl.pathname).toBe('/event/create');

    await addSubEventLink.click();
    await expect(page).toHaveURL(/\/event\/create\?/);

    await expect(page.getByRole('textbox', {name: 'Begin date:'})).toHaveValue(TestParentEvent.beginDate.year);
    await expect(page.getByRole('textbox', {name: 'MM'}).first()).toHaveValue(TestParentEvent.beginDate.month);
    await expect(page.getByRole('textbox', {name: 'DD'}).first()).toHaveValue(TestParentEvent.beginDate.day);
    await expect(page.getByRole('textbox', {name: 'End date:'})).toHaveValue(TestParentEvent.endDate.year);
    await expect(page.getByRole('textbox', {name: 'MM'}).nth(1)).toHaveValue(TestParentEvent.endDate.month);
    await expect(page.getByRole('textbox', {name: 'DD'}).nth(1)).toHaveValue(TestParentEvent.endDate.day);

    await expect(page.getByRole('textbox', {name: 'Edit note:'})).toHaveValue(
      `----\nCreated from ${baseURL}/event/${testParentEvent.gid} using userscript version 1.0.0 from https://homepage.com.`
    );

    const partOfRow = page.getByRole('row', {name: /part of:/i});
    await expect(partOfRow).toBeAttached();
    await expect(partOfRow).toContainText('add-sub-event test: Parent Event');
    await expect(partOfRow.getByRole('link')).toHaveAttribute('href', `/event/${testParentEvent.gid}`);

    const heldAtRow = page.getByRole('row', {name: /held at:/i});
    await expect(heldAtRow).toBeAttached();
    await expect(heldAtRow.getByRole('link')).toHaveAttribute('href', `/place/${PLACE_GID}`);
  });

  test('preserves place credit name in seeded create-event relationships', async ({
    page,
    musicbrainzPage,
    testParentEvent,
  }) => {
    const PLACE_CREDIT = 'The Venue (credited name)';

    await page.route(`**/ws/2/event/${testParentEvent.gid}?*`, async route => {
      await route.fulfill({
        json: {
          id: testParentEvent.gid,
          gid: testParentEvent.gid,
          'life-span': {
            begin: `${TestParentEvent.beginDate.year}-${TestParentEvent.beginDate.month}-${TestParentEvent.beginDate.day}`,
            end: `${TestParentEvent.endDate.year}-${TestParentEvent.endDate.month}-${TestParentEvent.endDate.day}`,
          },
          relations: [
            {
              'target-type': 'place',
              'target-credit': PLACE_CREDIT,
              place: {
                id: PLACE_GID,
                gid: PLACE_GID,
              },
            },
          ],
        },
      });
    });

    await musicbrainzPage.userscriptPage.goto(`/event/${testParentEvent.gid}`);

    await page.locator('#add-sub-event-link').click();
    await expect(page).toHaveURL(/\/event\/create\?/);

    const heldAtRow = page.getByRole('row', {name: /held at:/i});
    await expect(heldAtRow).toContainText(PLACE_CREDIT);
    await expect(heldAtRow.getByRole('link')).toHaveAttribute('href', `/place/${PLACE_GID}`);
  });

  test('seeds without held-at when parent has no places', async ({page, musicbrainzPage, testParentEvent}) => {
    await page.route(`**/ws/2/event/${testParentEvent.gid}?*`, async route => {
      await route.fulfill({
        json: {
          id: testParentEvent.gid,
          gid: testParentEvent.gid,
          'life-span': {
            begin: `${TestParentEvent.beginDate.year}-${TestParentEvent.beginDate.month}-${TestParentEvent.beginDate.day}`,
            end: `${TestParentEvent.beginDate.year}-${TestParentEvent.beginDate.month}-${TestParentEvent.beginDate.day}`,
          },
          relations: [],
        },
      });
    });

    await musicbrainzPage.userscriptPage.goto(`/event/${testParentEvent.gid}`);

    await page.locator('#add-sub-event-link').click();
    await expect(page).toHaveURL(/\/event\/create\?/);

    const partOfRow = page.getByRole('row', {name: /part of:/i});
    await expect(partOfRow).toBeAttached();
    await expect(partOfRow.getByRole('link')).toHaveAttribute('href', `/event/${testParentEvent.gid}`);
    await expect(page.getByRole('row', {name: /held at:/i})).toHaveCount(0);
  });

  test('falls back to appending in editing links list when merge link is missing', async ({
    page,
    musicbrainzPage,
    testParentEvent,
  }) => {
    await page.route(`**/event/${testParentEvent.gid}`, async route => {
      const response = await route.fetch();
      const body = await response.text();
      await route.fulfill({
        response,
        body: body.replace(/<a href="[^"]*merge_queue[^"]*">[^<]*<\/a>/, ''),
      });
    });

    await page.route(`**/ws/2/event/${testParentEvent.gid}?*`, async route => {
      await route.fulfill({
        json: {
          id: testParentEvent.gid,
          gid: testParentEvent.gid,
          relations: [],
        },
      });
    });

    await musicbrainzPage.userscriptPage.goto(`/event/${testParentEvent.gid}`);

    const addSubEventLink = page.locator('#add-sub-event-link');
    await expect(addSubEventLink).toBeAttached();
    await expect(page.locator('div#sidebar ul.links li:has(#add-sub-event-link)')).toBeAttached();
  });
});
