import {expect, Locator} from '@playwright/test';
import {MEDLEY_OF_LINK_TYPE_ID} from '@repo/musicbrainz-ext/constants';
import {test} from '@repo/test-support/musicbrainz-test';
import {WorkT} from 'typedbrainz/types';

async function selectBoxText(locator: Locator) {
  return await locator.evaluate(
    (typeNode: HTMLSelectElement) => typeNode.options[typeNode.options.selectedIndex]?.text
  );
}

test.describe('work editor', () => {
  test('can import work', async ({page, userscriptPage}) => {
    await userscriptPage.goto('/work/create');

    const versionId = '2661255001';
    const workId = versionId.substring(0, versionId.length - 3);
    const workUrl = `https://nocs.acum.org.il/acumsitesearchdb/version?workid=${workId}&versionid=${versionId}`;

    const input = page.getByPlaceholder('Work ID or URL');
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

  test('can find all artists', async ({page, userscriptPage}) => {
    await userscriptPage.goto('/work/create');

    const versionId = '1119554001';
    const workId = versionId.substring(0, versionId.length - 3);
    const workUrl = `https://nocs.acum.org.il/acumsitesearchdb/work?workid=${workId}`;

    const input = page.getByPlaceholder('Work ID or URL');
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
    userscriptPage,
  }) => {
    await userscriptPage.goto('/work/85a460d6-0c92-4b5f-8fe2-7dfc639a6d56/edit');
    const workUrl = `https://nocs.acum.org.il/acumsitesearchdb/version?workid=1010819&versionid=1010819002`;

    const input = page.getByPlaceholder('Work ID or URL');
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

  test('can import medley work', async ({page, userscriptPage, musicbrainzPage, baseURL}) => {
    // turn off existing work search
    await userscriptPage.setLocalStorage('searchWorks', 'false');

    await userscriptPage.goto('/work/create');

    // spell: disable
    const work = {
      title: 'מחרוזת סוכת דוד',
      disambiguation: '',
      workId: '1251909',
      id: 'c60de222-aaca-491a-9c25-b38f08f60e35',
      'type-id': '17',
      iswcs: [],
      languages: ['167'],
      attributes: [
        {
          type: 'ACUM ID',
          value: '1251909',
          'type-id': '141',
        },
      ],
    };
    const medleyWorks = [
      {
        title: 'סוכת דוד הנופלת',
        disambiguation: '',
        workId: '1058369',
        id: 'c0a2900b-6f9d-4cf5-99c4-92a81a01092e',
        'type-id': '17',
        iswcs: ['T-002.101.104-0'],
        languages: ['167'],
        attributes: [
          {
            type: 'ACUM ID',
            value: '1058369',
            'type-id': '141',
          },
        ],
      },
      {
        title: 'דוד מלך ישראל חי וקיים',
        disambiguation: '',
        workId: '1251910',
        id: '08dfd189-c4b7-459a-a5ee-f485d05b08d4',
        'type-id': '17',
        iswcs: ['T-002.541.630-1'],
        languages: ['167'],
        attributes: [
          {
            type: 'ACUM ID',
            value: '1251910',
            'type-id': '141',
          },
        ],
      },
      {
        title: 'ביום ההוא אקים את סוכת דוד הנופלת',
        disambiguation: '',
        workId: '1251911',
        'type-id': '17',
        id: 'fe9246c2-bbb6-44d1-aa81-801b847cbc5e',
        iswcs: ['T-002.541.631-2'],
        languages: ['167'],
        attributes: [
          {
            type: 'ACUM ID',
            value: '1251911',
            'type-id': '141',
          },
        ],
      },
    ];
    // spell: enable

    const workUrl = `https://nocs.acum.org.il/acumsitesearchdb/work?workid=${work.workId}`;
    const input = page.getByPlaceholder('Work ID or URL');
    await input.fill(workUrl);
    await expect(input).toHaveValue(work.workId);

    const importButton = page.getByRole('button', {name: 'Import work from ACUM'});
    await importButton.click();

    // Verify the medley work name
    const name = page.getByRole('textbox', {name: 'Name'});
    await expect(name).toHaveValue(work.title);

    const typeText = await selectBoxText(page.getByLabel('Type:'));
    expect(typeText).toBe('Song');

    // Verify ACUM ID attribute
    const workAttributes = page.getByRole('group', {name: 'Work attributes'});
    const attributeType = await selectBoxText(workAttributes.getByRole('combobox'));
    expect(attributeType).toMatch(/\s*ACUM ID/);

    const attributeValue = workAttributes.getByRole('textbox');
    await expect(attributeValue).toHaveValue(work.workId);

    // Verify medley parts are linked
    // The medley parts should be linked with 'medley of' relationships
    const medleyRelationships = page.getByRole('row', {name: 'medley of:'}).getByRole('link');
    await expect(medleyRelationships).toHaveCount(3); // 3 parts in the medley
    await expect(medleyRelationships).toHaveText(medleyWorks.map(work => work.title));

    // Reroute submit endpoints to verify data
    await page.route('/work/create', async (route, request) => {
      const postData = await userscriptPage.postDataJSON(request);
      const title = postData['edit-work.name'];
      const expected = [work, ...medleyWorks].find(work => work.title === title)!;
      expect(expected).toBeDefined();
      musicbrainzPage.expectWorkCreateToMatch(postData, expected);

      if (title === work.title) {
        expect(postData).toEqual(
          expect.objectContaining(
            Object.fromEntries(
              medleyWorks.flatMap((work, index) => [
                [`edit-work.rel.${index}.link_type_id`, String(MEDLEY_OF_LINK_TYPE_ID)],
                [`edit-work.rel.${index}.link_order`, String(index + 1)],
                [`edit-work.rel.${index}.target`, work.id],
              ])
            ) as Record<string, unknown>
          )
        );

        await route.fulfill({
          status: 303,
          headers: {
            Location: `${baseURL}`,
          },
        });
      } else {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({
            mbid: expected.id,
          }),
        });
      }
    });

    let relationshipId = 1;

    await page.route('/ws/js/entity/**', async (route, request) => {
      const parts = request.url().split('/');
      const gid = parts[parts.length - 1]!;
      expect(gid).toBeDefined();
      const work = medleyWorks.find(work => work.id == gid)!;
      expect(work).toBeDefined();
      const body: WorkT = {
        entityType: 'work',
        id: relationshipId++,
        gid,
        name: work.title,
        comment: work.disambiguation,
        typeID: Number(work['type-id']),
        iswcs: work?.iswcs.map(iswc => ({
          entityType: 'iswc',
          id: relationshipId++,
          iswc: iswc,
          work_id: Number(work.workId),
          editsPending: false,
        })),
        attributes: work.attributes.map(attr => ({
          id: relationshipId++,
          typeID: Number(attr['type-id']),
          typeName: attr.type,
          value: attr.value,
          value_id: Number(attr.value),
        })),
        languages: work.languages.map(lang => ({
          language: {
            entityType: 'language',
            id: Number(lang),
            frequency: 0,
            iso_code_1: null,
            iso_code_2b: null,
            iso_code_2t: null,
            iso_code_3: null,
            name: '',
          },
        })),
        artists: [],
        editsPending: false,
        last_updated: null,
        authors: [],
        other_artists: [],
      };
      await route.fulfill({
        status: 200,
        body: JSON.stringify(body),
      });
    });

    // Submit the work
    const submitButton = page.getByRole('button', {name: 'Enter edit'});
    await submitButton.click();

    await expect(page).toHaveURL(`${baseURL}`);

    await page.unrouteAll();
  });
});
