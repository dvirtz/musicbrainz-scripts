import {expect} from '@playwright/test';
import {test} from '@repo/test-support/musicbrainz-test';

const FESTIVAL_GID = '6d5e8ba6-2e4c-44e6-b990-506eb50b4faa';
const DAY_EVENT_GID = '0d422c29-e2c7-4946-9d47-031c792f4fa8';
const STAGE_EVENT_GID = 'e5f279e2-c595-40cf-9ccc-aa15356c4cb4';
const SERIES_GID = '03ba1e1e-0b0b-4f64-a197-f7138c04dc49';

test.describe('expand-events', () => {
  test.describe.configure({mode: 'serial'});

  [
    {entity: 'event', gid: FESTIVAL_GID},
    {entity: 'series', gid: SERIES_GID},
  ].forEach(({entity, gid}) =>
    test(`injects toggles on ${entity} page and shows quick links on expand`, async ({userscriptPage, page}) => {
      await userscriptPage.goto(`${entity}/${gid}`);

      if (entity == 'series') {
        await page.locator(`.expand-events-toggle[data-event-gid="${FESTIVAL_GID}"]`).click();
      }

      const childToggle = page.locator(`.expand-events-toggle[data-event-gid="${DAY_EVENT_GID}"]`);
      await expect(childToggle).toBeVisible();
      await childToggle.click();

      const grandchildToggle = page.locator(
        `[data-expand-events-details-for="${DAY_EVENT_GID}"] .expand-events-toggle[data-event-gid="${STAGE_EVENT_GID}"]`
      );
      await expect(grandchildToggle).toBeVisible();
      await grandchildToggle.click();

      await expect(page.locator(`[data-expand-events-quick-links-for="${STAGE_EVENT_GID}"]`)).toBeVisible({
        timeout: 10_000,
      });

      const childRows = page.locator(
        `[data-expand-events-details-for="${STAGE_EVENT_GID}"] tr:has(td a[href*="/event/"]):not(:has([data-expand-events-quick-links-for]))`
      );
      await expect(childRows).toHaveCount(3);

      const actualOrder = await childRows.evaluateAll(rows =>
        rows.map(row => {
          const cells = row.querySelectorAll('td');
          const link = cells[0]?.querySelector('a');
          const name = link?.textContent?.trim() ?? '';
          const time = cells[1]?.textContent?.trim() ?? '';
          return {name, time};
        })
      );

      expect(actualOrder.map(x => x.time)).toEqual(['20:00', '22:30', '00:45']);

      const quickLinks = page.locator(`[data-expand-events-quick-links-for="${STAGE_EVENT_GID}"]`);
      await expect(quickLinks).toContainText('edit');
      await expect(quickLinks).toContainText('editing history');
      await expect(quickLinks).toContainText('add event art');
      await expect(quickLinks).not.toContainText('edit relationships');
    })
  );

  test('shows add sub-event quick link when event-seeder script is present', async ({userscriptPage, page}) => {
    await userscriptPage.goto(`/event/${FESTIVAL_GID}`);

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
    await userscriptPage.goto(`/event/${FESTIVAL_GID}`);

    const childToggle = page.locator(`.expand-events-toggle[data-event-gid="${DAY_EVENT_GID}"]`).first();
    await expect(childToggle).toBeVisible();
    await childToggle.click();
    await expect(page.locator(`[data-expand-events-row-for="${DAY_EVENT_GID}"]`)).not.toHaveAttribute('hidden', '');

    const grandchildToggle = page
      .locator(
        `[data-expand-events-details-for="${DAY_EVENT_GID}"] .expand-events-toggle[data-event-gid="${STAGE_EVENT_GID}"]`
      )
      .first();
    await expect(grandchildToggle).toBeVisible();
    await grandchildToggle.click();

    await expect(page.locator(`[data-expand-events-row-for="${STAGE_EVENT_GID}"]`)).not.toHaveAttribute('hidden', '');

    const childRows = page.locator(
      `[data-expand-events-details-for="${STAGE_EVENT_GID}"] tr:has(td a[href*="/event/"]):not(:has([data-expand-events-quick-links-for]))`
    );
    await expect(childRows).toHaveCount(3);

    const firstLeafToggle = page
      .locator(`[data-expand-events-details-for="${STAGE_EVENT_GID}"] .expand-events-toggle`)
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
    await expect(cells.nth(1)).not.toBeEmpty(); // type
  });

  test('expand all and collapse all work on the real event page', async ({userscriptPage, page}) => {
    await userscriptPage.goto(`/event/${FESTIVAL_GID}`);

    await page.getByRole('button', {name: 'Expand all'}).click();
    await expect(page.locator('[data-expand-events-row-for]:not([hidden])').first()).toBeVisible();

    await page.getByRole('button', {name: 'Collapse all'}).click();
    await expect(page.locator('[data-expand-events-row-for]:not([hidden])')).toHaveCount(0);
  });
});
