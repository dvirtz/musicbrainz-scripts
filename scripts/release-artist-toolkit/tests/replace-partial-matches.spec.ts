import {expect, Page} from '@playwright/test';
import {test} from '@repo/test-support/musicbrainz-test';

const url = 'release/4a4c1819-f721-4c76-8213-9b0557b18961/edit#tracklist';

const closeMethods = [
  {
    name: 'clicking Done',
    close: async (page: Page) => {
      await page.getByRole('button', {name: 'Done'}).click();
    },
  },
  {
    name: 'pressing Enter in an input and then clicking Done',
    close: async (page: Page) => {
      await page.locator('#ac-16090067-join-phrase-0').press('Enter');
      await page.getByRole('button', {name: 'Done'}).click();
    },
  },
];

for (const {name, close} of closeMethods) {
  test(`propagates partially matching credits when closing by ${name}`, async ({userscriptPage, page}) => {
    await userscriptPage.goto(url);

    const changePartiallyMatchingCheckbox = page.locator('#checkbox-cl-2-control > input');
    await expect(changePartiallyMatchingCheckbox).not.toBeChecked();
    await changePartiallyMatchingCheckbox.check();

    const firstRow = page.getByRole('row', {name: 'The Lady Is a Tramp'});
    await expect(firstRow.getByPlaceholder('Type to search, or paste an')).toHaveValue(/Frank Sinatra duet with/);
    await firstRow.getByRole('button', {name: 'Edit'}).click();
    await page.locator('#ac-16090067-credited-as-0').fill('Dean Martin');
    await page.locator('#ac-16090067-join-phrase-0').fill(' and ');
    await page.getByRole('checkbox', {name: 'Change all artists on this'}).check();
    await close(page);
    await expect(firstRow.getByPlaceholder('Type to search, or paste an')).toHaveValue(/Dean Martin and/);

    const secondRow = page.getByRole('row', {name: 'What Now My Love'});
    await expect(secondRow.getByPlaceholder('Type to search, or paste an')).toHaveValue(/Dean Martin and/);
  });
}
