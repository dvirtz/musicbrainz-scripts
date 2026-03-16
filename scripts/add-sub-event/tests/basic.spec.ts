import {test, TestParentEvent} from '#tests/fixtures/test-event.ts';
import {expect} from '@playwright/test';

const PLACE_GID = '4bf41603-c878-412d-9806-65a12be6c1ab';

test.describe('add-sub-event', () => {
  test('adds link as first item and seeds date + place relationships', async ({
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
    expect(seededUrl.searchParams.get('edit-event.edit_note')).toBe(
      `----\nCreated from ${baseURL}/event/${testParentEvent.gid} using userscript version 1.0.0 from https://homepage.com.`
    );
    expect(seededUrl.searchParams.get('edit-event.period.begin_date.year')).toBe(TestParentEvent.beginDate.year);
    expect(seededUrl.searchParams.get('edit-event.period.begin_date.month')).toBe(TestParentEvent.beginDate.month);
    expect(seededUrl.searchParams.get('edit-event.period.begin_date.day')).toBe(TestParentEvent.beginDate.day);
    expect(seededUrl.searchParams.get('edit-event.period.end_date.year')).toBe(TestParentEvent.endDate.year);
    expect(seededUrl.searchParams.get('edit-event.period.end_date.month')).toBe(TestParentEvent.endDate.month);
    expect(seededUrl.searchParams.get('edit-event.period.end_date.day')).toBe(TestParentEvent.endDate.day);
    expect(seededUrl.searchParams.get('rels.0.type')).toBe('818');
    expect(seededUrl.searchParams.get('rels.0.target')).toBe(testParentEvent.gid);
    expect(seededUrl.searchParams.get('rels.0.backward')).toBe('1');
    expect(seededUrl.searchParams.get('rels.1.type')).toBe('794');
    expect(seededUrl.searchParams.get('rels.1.target')).toBe(PLACE_GID);

    if (process.env.DOCS_SCREENSHOTS === '1') {
      await page.screenshot({
        path: 'assets/workflow-event-sidebar.png',
        fullPage: true,
      });

      await addSubEventLink.click();
      await expect(page).toHaveURL(/\/event\/create\?/);

      await page.screenshot({
        path: 'assets/workflow-event-create.png',
        fullPage: true,
      });
    }
  });

  test('preserves place credit name from parent event', async ({page, musicbrainzPage, testParentEvent, baseURL}) => {
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

    const href = await page.locator('#add-sub-event-link').getAttribute('href');
    expect(href).not.toBeNull();
    const seededUrl = new URL(href!, baseURL);

    expect(seededUrl.searchParams.get('rels.1.target')).toBe(PLACE_GID);
    expect(seededUrl.searchParams.get('rels.1.targetCredit')).toBe(PLACE_CREDIT);
  });

  test('seeds without held-at when parent has no places', async ({page, musicbrainzPage, testParentEvent, baseURL}) => {
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

    const href = await page.locator('#add-sub-event-link').getAttribute('href');
    expect(href).not.toBeNull();
    const seededUrl = new URL(href!, baseURL);

    expect(seededUrl.searchParams.get('rels.0.target')).toBe(testParentEvent.gid);
    expect(seededUrl.searchParams.get('rels.1.type')).toBeNull();
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
