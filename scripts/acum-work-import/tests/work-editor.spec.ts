import {test} from '#tests/fixtures/musicbrainz-test.ts';
import {expect, Locator} from '@playwright/test';

async function selectBoxText(locator: Locator) {
  return await locator.evaluate(
    (typeNode: HTMLSelectElement) => typeNode.options[typeNode.options.selectedIndex]?.text
  );
}

test.describe('work editor', () => {
  test('can import work', async ({page, musicbrainzPage}) => {
    await musicbrainzPage.goto('/work/create');

    const versionId = '2661255001';
    const workId = versionId.substring(0, versionId.length - 3);
    const workUrl = `https://nocs.acum.org.il/acumsitesearchdb/version?workid=${workId}&versionid=${versionId}`;

    const input = page.getByPlaceholder('Version/Work ID');
    await input.fill(workUrl);
    await expect(input).toHaveValue(versionId);

    const importButton = page.getByRole('button', {name: 'Import work from ACUM'});
    await importButton.click();

    const name = page.getByRole('textbox', {name: 'Name'});
    await expect(name).toHaveValue('MEET THE STARS');

    const typeText = await selectBoxText(page.getByRole('combobox', {name: 'Type'}));
    expect(typeText).toBe('Song');

    // no language is set for foreign works
    const language = page.locator('[id="id-edit-work.languages.0"]');
    await expect(language).toHaveValue('');

    const attributeType = await selectBoxText(page.locator('select[name="edit-work.attributes.0.type_id"]'));
    expect(attributeType).toMatch(/\s*ACUM ID/);

    const attributeValue = page.locator('input[name="edit-work.attributes.0.value"]');
    await expect(attributeValue).toHaveValue(workId);

    for (const role of ['composer', 'lyricist']) {
      const roleRow = page.getByRole('row', {name: role});
      const links = roleRow.getByRole('link');
      await expect(links).toHaveCount(2);
      await expect(links).toHaveText(['Stephen Duffy', 'Robbie Williams']);
    }

    const editNote = page.getByRole('textbox', {name: 'Edit note'});
    await expect(editNote).toHaveValue(
      `\n----\nImported from ${workUrl} using userscript version 1.0.0 from https://homepage.com.`
    );
  });

  test('can find all artists', async ({page, musicbrainzPage}) => {
    await musicbrainzPage.goto('/work/create');

    const versionId = '1119554001';
    const workId = versionId.substring(0, versionId.length - 3);
    const workUrl = `https://nocs.acum.org.il/acumsitesearchdb/work?workid=${workId}`;

    const input = page.getByPlaceholder('Version/Work ID');
    await input.fill(workUrl);
    await expect(input).toHaveValue(workId);

    const importButton = page.getByRole('button', {name: 'Import work from ACUM'});
    await importButton.click();

    const name = page.getByRole('textbox', {name: 'Name'});
    await expect(name).toHaveValue('OPEN UP YOUR EYES');

    const typeText = await selectBoxText(page.getByRole('combobox', {name: 'Type'}));
    expect(typeText).toBe('Song');

    const attributeType = await selectBoxText(page.locator('select[name="edit-work.attributes.0.type_id"]'));
    expect(attributeType).toMatch(/\s*ACUM ID/);

    const attributeValue = page.locator('input[name="edit-work.attributes.0.value"]');
    await expect(attributeValue).toHaveValue(workId);

    for (const role of ['composer', 'lyricist']) {
      const roleRow = page.getByRole('row', {name: role});
      const links = roleRow.getByRole('link');
      await expect(links).toHaveCount(2);
      // cspell: disable-next-line
      await expect(links).toHaveText(['Robb Huxley', 'סטן סולומון']);
    }

    const editNote = page.getByRole('textbox', {name: 'Edit note'});
    await expect(editNote).toHaveValue(
      `\n----\nImported from ${workUrl} using userscript version 1.0.0 from https://homepage.com.`
    );
  });

  test('avoid adding special purpose artists when other artists exist and artists which are already linked', async ({
    page,
    musicbrainzPage,
  }) => {
    await musicbrainzPage.goto('/work/85a460d6-0c92-4b5f-8fe2-7dfc639a6d56/edit');
    const workUrl = `https://nocs.acum.org.il/acumsitesearchdb/version?workid=1010819&versionid=1010819002`;

    const input = page.getByPlaceholder('Version/Work ID');
    await input.fill(workUrl);
    await expect(input).toHaveValue('1010819002');

    const consoleMessages: string[] = [];
    page.on('console', msg => {
      consoleMessages.push(msg.text());
    });

    const importButton = page.getByRole('button', {name: 'Import work from ACUM'});
    await importButton.click();

    await expect(page.getByRole('row', {name: 'composer'}).getByRole('link', {name: '[traditional]'})).toHaveCount(0);
    await expect(page.getByText('skipping special purpose artist')).toHaveCount(1);

    // cspell: disable-next-line
    await expect(page.getByRole('row', {name: 'lyricist'}).getByRole('link', {name: 'נתן אלתרמן'})).toHaveCount(0);
    expect(consoleMessages.filter(msg => msg.includes('skipping existing author'))).toHaveLength(1);
  });
});
