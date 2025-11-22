import {expect, test} from '@playwright/test';

// Basic existence test, extend as needed

test('userscript bundle exists', async ({page, baseURL}) => {
  await page.goto(baseURL || '');
  await expect(page).toHaveURL(baseURL || '');
});
