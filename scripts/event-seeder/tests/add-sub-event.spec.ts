import {test as eventTest, TestEvent} from '#tests/fixtures/test-event.ts';
import {test as seriesTest} from '#tests/fixtures/test-series.ts';
import {expect, mergeTests} from '@playwright/test';

const test = mergeTests(eventTest, seriesTest);

test.describe('event-seeder:add-sub-event', () => {
  test('adds link at top of sidebar', async ({page, musicbrainzPage, testEvent}) => {
    await musicbrainzPage.userscriptPage.goto(`/event/${testEvent.gid}`);

    const addSubEventLink = page.getByRole('link', {name: 'Add sub-event'});
    await expect(addSubEventLink).toBeAttached();

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

    const addSubEventLink = page.getByRole('link', {name: 'Add sub-event'});
    await expect(addSubEventLink).toBeAttached();

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

  test('seeds event from series data', async ({page, musicbrainzPage, testSeries, baseURL}) => {
    await musicbrainzPage.userscriptPage.goto(`/series/${testSeries.gid}`);

    const addEventLink = page.locator('#sidebar').getByRole('link', {name: 'Add event'});
    await expect(addEventLink).toBeAttached();

    await addEventLink.click();
    await expect(page).toHaveURL(/\/event\/create\?/);

    await expect(page.getByRole('textbox', {name: 'name'})).toHaveValue(testSeries.name);

    await expect(page.getByRole('textbox', {name: 'Edit note:'})).toHaveValue(
      `----\nCreated from ${baseURL}/series/${testSeries.gid} using userscript version 1.0.0 from https://homepage.com.`
    );

    const partOfRow = page.getByRole('row', {name: /part of:/i});
    await expect(partOfRow).toBeAttached();
    await expect(partOfRow).toContainText(seriesTest.name);
    await expect(partOfRow.getByRole('link')).toHaveAttribute('href', `/series/${testSeries.gid}`);

    const heldAtRow = page.getByRole('row', {name: /held at:/i});
    await expect(heldAtRow).toBeAttached();
    await expect(heldAtRow.getByRole('link')).toHaveAttribute('href', `/place/${testSeries.heldAt}`);
  });
});
