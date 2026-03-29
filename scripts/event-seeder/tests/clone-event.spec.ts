import {test, TestEvent} from '#tests/fixtures/test-event.ts';
import {expect, type Page} from '@playwright/test';

async function expectSeededEntityRelationships(page: Page) {
  const relEditorRows = page.locator('table.rel-editor-table').locator('tr');
  for (const [index, relationship] of TestEvent.entityRelationships.entries()) {
    const row = relEditorRows.nth(index);
    await expect(row.locator('th.link-phrase')).toHaveText(`${relationship.phrase}:`);
    await expect(row.locator('td.relationship-list')).toContainText(relationship.targetText);
  }
}

async function expectSeededUrlRelationships(page: Page) {
  const externalLinksRows = page.locator('#external-links-editor').locator('tr');
  for (const [index, relationship] of TestEvent.urlRelationships.entries()) {
    const linkRow = externalLinksRows.nth(index * 2);
    await expect(linkRow.locator('input')).toHaveValue(relationship.url);
    const typeRow = externalLinksRows.nth(index * 2 + 1);
    await expect(typeRow.locator('label.relationship-name')).toContainText(relationship.linkTypeName);
  }
}

test.describe('event-seeder:clone-event', () => {
  test('adds link to sidebar', async ({page, musicbrainzPage, testEvent}) => {
    await musicbrainzPage.userscriptPage.goto(`/event/${testEvent.gid}`);

    const cloneEventLink = page.locator('#clone-event-link');

    await expect(cloneEventLink).toBeAttached();
    await expect(cloneEventLink).toHaveText('Clone event');
  });

  test('link seeds from real event and carries real relationships', async ({
    page,
    musicbrainzPage,
    testEvent,
    baseURL,
  }) => {
    await musicbrainzPage.userscriptPage.goto(`/event/${testEvent.gid}`);

    const cloneEventLink = page.locator('#clone-event-link');
    await cloneEventLink.click();
    await expect(page).toHaveURL(/\/event\/create\?/);

    // Wait for the form edit section to be visible to ensure form has loaded
    await expect(page.locator('fieldset', {has: page.locator('input[name="edit-event.name"]')})).toBeVisible();

    await expect(page.getByRole('textbox', {name: 'Name:'})).toHaveValue(TestEvent.eventName);
    await expect(page.locator('input[name="edit-event.time"]')).toHaveValue(TestEvent.time);
    await expect(page.getByRole('textbox', {name: 'Begin date:'})).toHaveValue(TestEvent.beginDate.year);
    await expect(page.getByRole('textbox', {name: 'MM'}).first()).toHaveValue(TestEvent.beginDate.month);
    await expect(page.getByRole('textbox', {name: 'DD'}).first()).toHaveValue(TestEvent.beginDate.day);
    await expect(page.getByRole('textbox', {name: 'End date:'})).toHaveValue(TestEvent.endDate.year);
    await expect(page.getByRole('textbox', {name: 'MM'}).nth(1)).toHaveValue(TestEvent.endDate.month);
    await expect(page.getByRole('textbox', {name: 'DD'}).nth(1)).toHaveValue(TestEvent.endDate.day);
    await expect(page.locator('textarea[name="edit-event.setlist"]')).toHaveValue(TestEvent.setlist);
    await expect(page.locator('input[name="edit-event.comment"]')).toHaveValue(TestEvent.disambiguation);
    await expect(page.locator('input[name="edit-event.cancelled"]')).not.toBeChecked();
    await expect(page.getByRole('textbox', {name: 'Edit note:'})).toHaveValue(
      `----\nCloned from ${baseURL}/event/${testEvent.gid} using userscript version 1.0.0 from https://homepage.com.`
    );

    await expectSeededEntityRelationships(page);
    await expectSeededUrlRelationships(page);
  });
});
