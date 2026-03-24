import {expect, type Page} from '@playwright/test';
import {test} from '@repo/test-support/musicbrainz-test';

const LIVE_EVENT_GID = '6d5e8ba6-2e4c-44e6-b990-506eb50b4faa';
const LIVE_CHILD_EVENT_GID = '0d422c29-e2c7-4946-9d47-031c792f4fa8';
const LIVE_GRANDCHILD_EVENT_GID = 'e5f279e2-c595-40cf-9ccc-aa15356c4cb4';

type RealUserscriptPage = {
  page: Page;
  userscriptPath: string;
};

type ChildRowSummary = {
  name: string;
  date?: string;
  time?: string;
};

function compareOptionalStrings(a?: string, b?: string): number {
  if (!a && !b) {
    return 0;
  }
  if (!a) {
    return 1;
  }
  if (!b) {
    return -1;
  }
  return a.localeCompare(b, undefined, {sensitivity: 'base'});
}

function compareChildRowSummary(a: ChildRowSummary, b: ChildRowSummary): number {
  const byDate = compareOptionalStrings(a.date, b.date);
  if (byDate !== 0) {
    return byDate;
  }

  const byTime = compareOptionalStrings(a.time, b.time);
  if (byTime !== 0) {
    return byTime;
  }

  return a.name.localeCompare(b.name, undefined, {sensitivity: 'base'});
}

async function gotoLiveEvent(userscriptPage: RealUserscriptPage) {
  const response = await userscriptPage.page.goto(`/event/${LIVE_EVENT_GID}`);
  expect(response?.ok(), `Live event /event/${LIVE_EVENT_GID} should be available`).toBeTruthy();

  await userscriptPage.page.waitForFunction(() => document.body !== null);
  await userscriptPage.page.addScriptTag({path: userscriptPage.userscriptPath});
}

test.describe('expand-events', () => {
  test('injects toggles on a real event page and shows quick links on expand', async ({userscriptPage, page}) => {
    await gotoLiveEvent(userscriptPage);

    const childToggle = page.locator(`.expand-events-toggle[data-event-gid="${LIVE_CHILD_EVENT_GID}"]`).first();
    await expect(childToggle).toBeVisible();
    await childToggle.click();
    await expect(page.locator(`[data-expand-events-row-for="${LIVE_CHILD_EVENT_GID}"]`)).not.toHaveAttribute(
      'hidden',
      ''
    );

    const grandchildToggle = page
      .locator(
        `[data-expand-events-details-for="${LIVE_CHILD_EVENT_GID}"] .expand-events-toggle[data-event-gid="${LIVE_GRANDCHILD_EVENT_GID}"]`
      )
      .first();
    await expect(grandchildToggle).toBeVisible();
    await grandchildToggle.click();
    await expect(page.locator(`[data-expand-events-row-for="${LIVE_GRANDCHILD_EVENT_GID}"]`)).not.toHaveAttribute(
      'hidden',
      ''
    );

    await expect(page.locator(`[data-expand-events-quick-links-for="${LIVE_GRANDCHILD_EVENT_GID}"]`)).toBeVisible();

    const childRows = page.locator(
      `[data-expand-events-details-for="${LIVE_GRANDCHILD_EVENT_GID}"] tr:has(td a[href*="/event/"]):not(:has([data-expand-events-quick-links-for]))`
    );
    await expect(childRows).toHaveCount(3);

    const actualOrder = await childRows.evaluateAll(rows =>
      rows.map(row => {
        const cells = row.querySelectorAll('td');
        const link = cells[0]?.querySelector('a');
        const name = link?.textContent?.trim() ?? '';
        const date = cells[2]?.textContent?.trim() || undefined;
        const time = cells[3]?.textContent?.trim() || undefined;
        return {name, date, time};
      })
    );

    const expectedOrder = [...actualOrder].sort(compareChildRowSummary);
    expect(actualOrder).toEqual(expectedOrder);

    const quickLinks = page.locator(`[data-expand-events-quick-links-for="${LIVE_GRANDCHILD_EVENT_GID}"]`);
    await expect(quickLinks).toContainText('edit');
    await expect(quickLinks).toContainText('editing history');
    await expect(quickLinks).toContainText('add event art');
    await expect(quickLinks).not.toContainText('edit relationships');
  });

  test('shows add sub-event quick link when add-sub-event script is present', async ({userscriptPage, page}) => {
    await gotoLiveEvent(userscriptPage);

    await page.addScriptTag({
      content: `
        (() => {
          if (document.getElementById('add-sub-event-link')) {
            return;
          }

          const link = document.createElement('a');
          link.id = 'add-sub-event-link';
          link.href = '/event/create';
          link.textContent = 'Add sub-event';
          document.body.appendChild(link);
        })();
      `,
    });

    const firstToggle = page.locator('.expand-events-toggle').first();
    const firstEventGid = await firstToggle.getAttribute('data-event-gid');
    expect(firstEventGid).toBeTruthy();

    await firstToggle.click();

    const quickLinks = page.locator(`[data-expand-events-quick-links-for="${firstEventGid}"]`);
    const addSubEventQuickLink = quickLinks.getByRole('link', {name: 'add sub-event'});

    await expect(addSubEventQuickLink).toBeVisible();
    await expect(addSubEventQuickLink).toHaveAttribute('href', /\/event\/create\?/);
  });

  test('supports recursive expansion on a real event page and shows leaf metadata', async ({userscriptPage, page}) => {
    await gotoLiveEvent(userscriptPage);

    const childToggle = page.locator(`.expand-events-toggle[data-event-gid="${LIVE_CHILD_EVENT_GID}"]`).first();
    await expect(childToggle).toBeVisible();
    await childToggle.click();
    await expect(page.locator(`[data-expand-events-row-for="${LIVE_CHILD_EVENT_GID}"]`)).not.toHaveAttribute(
      'hidden',
      ''
    );

    const grandchildToggle = page
      .locator(
        `[data-expand-events-details-for="${LIVE_CHILD_EVENT_GID}"] .expand-events-toggle[data-event-gid="${LIVE_GRANDCHILD_EVENT_GID}"]`
      )
      .first();
    await expect(grandchildToggle).toBeVisible();
    await grandchildToggle.click();

    await expect(page.locator(`[data-expand-events-row-for="${LIVE_GRANDCHILD_EVENT_GID}"]`)).not.toHaveAttribute(
      'hidden',
      ''
    );

    const childRows = page.locator(
      `[data-expand-events-details-for="${LIVE_GRANDCHILD_EVENT_GID}"] tr:has(td a[href*="/event/"]):not(:has([data-expand-events-quick-links-for]))`
    );
    await expect(childRows).toHaveCount(3);

    const firstLeafToggle = page
      .locator(`[data-expand-events-details-for="${LIVE_GRANDCHILD_EVENT_GID}"] .expand-events-toggle`)
      .first();
    await expect(firstLeafToggle).toBeVisible();

    const firstLeafGid = await firstLeafToggle.getAttribute('data-event-gid');
    expect(firstLeafGid).toBeTruthy();

    await firstLeafToggle.click();
    await expect(page.locator(`[data-expand-events-row-for="${firstLeafGid}"]`)).not.toHaveAttribute('hidden', '');

    const leafRows = page.locator(
      `[data-expand-events-details-for="${firstLeafGid}"] tr:not(:has([data-expand-events-quick-links-for]))`
    );
    await expect(leafRows.first()).toBeVisible();

    const cells = leafRows.first().locator('td');
    await expect(cells.nth(0)).not.toBeEmpty(); // place
    await expect(cells.nth(1)).toBeEmpty(); // removed type column for leaves
    await expect(cells.nth(2)).not.toBeEmpty(); // type
    await expect(cells.nth(2)).toHaveAttribute('colspan', '2'); // spans date+time columns
    await expect(cells.nth(3)).toBeEmpty(); // spacer column
  });

  test('expand all and collapse all work on the real event page', async ({userscriptPage, page}) => {
    await gotoLiveEvent(userscriptPage);

    await page.getByRole('button', {name: 'Expand all'}).click();
    await expect(page.locator('[data-expand-events-row-for]:not([hidden])').first()).toBeVisible();

    await page.getByRole('button', {name: 'Collapse all'}).click();
    await expect(page.locator('[data-expand-events-row-for]:not([hidden])')).toHaveCount(0);
  });
});
