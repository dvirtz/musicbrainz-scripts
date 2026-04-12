import {expect} from '@playwright/test';
import {test} from '@repo/test-support/musicbrainz-test';

const url = 'release/4a4c1819-f721-4c76-8213-9b0557b18961/edit#tracklist';

test('propagates partially matching credits', async ({userscriptPage, page}) => {
  await userscriptPage.goto(url);

  const changePartiallyMatchingCheckbox = page.locator('#checkbox-cl-2-control > input');
  await expect(changePartiallyMatchingCheckbox).not.toBeChecked();
  await changePartiallyMatchingCheckbox.check();

  const firstRow = page.getByRole('row', {name: 'The Lady Is a Tramp'});
  await expect(firstRow.getByPlaceholder('Type to search, or paste an')).toHaveValue(/Frank Sinatra duet with/);
  await firstRow.getByRole('button', {name: 'Edit'}).click();
  await page.locator('#ac-16090067-credited-as-0').fill('Dean Martin');
  await page.getByRole('checkbox', {name: 'Change all artists on this'}).check();
  await page.getByRole('button', {name: 'Done'}).click();
  await expect(firstRow.getByPlaceholder('Type to search, or paste an')).toHaveValue(/Dean Martin duet with/);

  const secondRow = page.getByRole('row', {name: 'What Now My Love'});
  await expect(secondRow.getByPlaceholder('Type to search, or paste an')).toHaveValue(/Dean Martin duet with/);
});
