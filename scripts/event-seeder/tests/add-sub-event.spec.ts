import {test, TestEvent} from '#tests/fixtures/test-event.ts';
import {expect} from '@playwright/test';

test.describe('event-seeder:add-sub-event', () => {
  test('adds link at top of sidebar', async ({page, musicbrainzPage, testEvent}) => {
    await musicbrainzPage.userscriptPage.goto(`/event/${testEvent.gid}`);

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
  });

  test('link seeds form from real event data', async ({page, musicbrainzPage, testEvent, baseURL}) => {
    await musicbrainzPage.userscriptPage.goto(`/event/${testEvent.gid}`);

    const addSubEventLink = page.locator('#add-sub-event-link');
    await expect(addSubEventLink).toBeAttached();
    await expect(addSubEventLink).toHaveText('Add sub-event');

    const href = await addSubEventLink.getAttribute('href');
    expect(href).not.toBeNull();
    if (!href) {
      throw new Error('Expected add-sub-event href to exist');
    }
    const seededUrl = new URL(href, baseURL);

    expect(seededUrl.pathname).toBe('/event/create');

    await addSubEventLink.click();
    await expect(page).toHaveURL(/\/event\/create\?/);

    await expect(page.getByRole('textbox', {name: 'Begin date:'})).toHaveValue(TestEvent.beginDate.year);
    await expect(page.getByRole('textbox', {name: 'MM'}).first()).toHaveValue(TestEvent.beginDate.month);
    await expect(page.getByRole('textbox', {name: 'DD'}).first()).toHaveValue(TestEvent.beginDate.day);
    await expect(page.getByRole('textbox', {name: 'End date:'})).toHaveValue(TestEvent.endDate.year);
    await expect(page.getByRole('textbox', {name: 'MM'}).nth(1)).toHaveValue(TestEvent.endDate.month);
    await expect(page.getByRole('textbox', {name: 'DD'}).nth(1)).toHaveValue(TestEvent.endDate.day);

    await expect(page.getByRole('textbox', {name: 'Edit note:'})).toHaveValue(
      `----\nCreated from ${baseURL}/event/${testEvent.gid} using userscript version 1.0.0 from https://homepage.com.`
    );

    const partOfRow = page.getByRole('row', {name: /part of:/i});
    await expect(partOfRow).toBeAttached();
    await expect(partOfRow).toContainText(TestEvent.eventName);
    await expect(partOfRow.getByRole('link')).toHaveAttribute('href', `/event/${testEvent.gid}`);

    const heldAtRow = page.getByRole('row', {name: /held at:/i});
    await expect(heldAtRow).toBeAttached();
    await expect(heldAtRow.getByRole('link')).toHaveAttribute('href', `/place/${TestEvent.heldAt}`);
  });

  test('falls back to appending in editing links list when merge link is missing', async ({
    page,
    musicbrainzPage,
    testEvent,
  }) => {
    await page.route(`**/event/${testEvent.gid}`, async route => {
      const response = await route.fetch();
      const body = await response.text();
      await route.fulfill({
        response,
        body: body.replace(/<a href="[^"]*merge_queue[^"]*">[^<]*<\/a>/, ''),
      });
    });

    await musicbrainzPage.userscriptPage.goto(`/event/${testEvent.gid}`);

    const addSubEventLink = page.locator('#add-sub-event-link');
    await expect(addSubEventLink).toBeAttached();
    await expect(page.locator('div#sidebar ul.links li:has(#add-sub-event-link)')).toBeAttached();
  });
});
