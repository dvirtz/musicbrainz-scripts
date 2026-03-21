import {expect, type Page} from '@playwright/test';
import {test} from '@repo/test-support/musicbrainz-test';

const LIVE_EVENT_GID = '6d5e8ba6-2e4c-44e6-b990-506eb50b4faa';

type RealUserscriptPage = {
  page: Page;
  userscriptPath: string;
};

async function gotoLiveEvent(userscriptPage: RealUserscriptPage) {
  const response = await userscriptPage.page.goto(`/event/${LIVE_EVENT_GID}`);
  const status = response?.status() ?? 'unknown';
  test.skip(!response?.ok(), `Live event /event/${LIVE_EVENT_GID} is unavailable (HTTP ${status}).`);

  await userscriptPage.page.waitForFunction(() => document.body !== null);
  await userscriptPage.page.addScriptTag({path: userscriptPage.userscriptPath});
}

test.describe('expand-events', () => {
  test('injects toggles on a real event page and shows quick links on expand', async ({userscriptPage, page}) => {
    await gotoLiveEvent(userscriptPage);

    const toggles = page.locator('.expand-events-toggle');
    await expect(toggles.first()).toBeVisible();

    const firstToggle = toggles.first();
    const firstEventGid = await firstToggle.getAttribute('data-event-gid');
    expect(firstEventGid).toBeTruthy();

    await firstToggle.click();

    const detailsRow = page.locator(`[data-expand-events-row-for="${firstEventGid}"]`);
    await expect(detailsRow).not.toHaveAttribute('hidden', '');

    const quickLinks = page.locator(`[data-expand-events-quick-links-for="${firstEventGid}"]`);
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

  test('supports recursive expansion on a real event page', async ({userscriptPage, page}) => {
    await gotoLiveEvent(userscriptPage);

    const firstTopLevelToggle = page.locator('.expand-events-toggle').first();
    const firstEventGid = await firstTopLevelToggle.getAttribute('data-event-gid');
    expect(firstEventGid).toBeTruthy();

    await firstTopLevelToggle.click();

    const nestedToggle = page
      .locator(`[data-expand-events-details-for="${firstEventGid}"] .expand-events-toggle`)
      .first();
    await expect(nestedToggle).toBeVisible();

    const nestedEventGid = await nestedToggle.getAttribute('data-event-gid');
    expect(nestedEventGid).toBeTruthy();

    await nestedToggle.click();

    await expect(page.locator(`[data-expand-events-row-for="${nestedEventGid}"]`)).not.toHaveAttribute('hidden', '');
  });

  test('expand all and collapse all work on the real event page', async ({userscriptPage, page}) => {
    await gotoLiveEvent(userscriptPage);

    await page.getByRole('button', {name: 'Expand all'}).click();
    await expect(page.locator('[data-expand-events-row-for]:not([hidden])').first()).toBeVisible();

    await page.getByRole('button', {name: 'Collapse all'}).click();
    await expect(page.locator('[data-expand-events-row-for]:not([hidden])')).toHaveCount(0);
  });
});
