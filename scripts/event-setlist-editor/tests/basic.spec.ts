// spell:words lsqb rsqb
import {expect} from '@playwright/test';
import {test as base} from '@repo/test-support/musicbrainz-test';

const artistId = '64b94289-9474-4d43-8c93-918ccc1920d1';
const workId = '834f1928-ca14-4ea0-9801-ad92cb32952e';
const test = base.extend<{seed: string; eventPath: string}>({
  seed: ['', {option: true}],
  eventPath: ['/event/create', {option: true}],
});

test.beforeEach(async ({userscriptPage, seed, eventPath}) => {
  await userscriptPage.goto(`${eventPath}?${new URLSearchParams({'edit-event.setlist': seed})}`);
});

test('writes songs, independent credits, notes and sections into the textarea', async ({page}) => {
  const details = page.getByRole('group', {name: 'Event details', exact: true});
  const editNote = page.getByRole('textbox', {name: 'Edit note:', exact: true});
  await expect(details.getByRole('table', {name: 'Event setlist', exact: true})).toBeVisible();
  await expect(editNote).toHaveValue('');
  await editNote.fill('Setlist source: my concert notes');
  await expect(details).toHaveCSS('min-width', '0px');
  await details.getByRole('button', {name: 'Markup', exact: true}).click();
  await expect(details.getByRole('textbox', {name: 'Setlist:', exact: true})).toBeVisible();
  await details.getByRole('button', {name: 'Table', exact: true}).click();
  await expect(details.getByRole('textbox', {name: 'Setlist:', exact: true})).toBeHidden();
  await page.getByRole('button', {name: 'song(s)', exact: true}).click();
  await expect(editNote).toHaveValue('Setlist source: my concert notes');
  await page.getByLabel('Title 1', {exact: true}).fill('First [live] & loud');
  await expect(editNote).toHaveValue(
    /^Setlist source: my concert notes\n----\nEdited event setlist using .+ version .+ from .+\.$/
  );
  const noteAfterFirstChange = await editNote.inputValue();
  await page.getByLabel('Artist name 1', {exact: true}).fill('Main artist');
  await page.getByRole('button', {name: 'Add additional info', exact: true}).click();
  const infoDialog = page.getByRole('dialog', {name: 'Additional info', exact: true});
  await infoDialog.getByRole('textbox', {name: 'Additional info', exact: true}).fill('from tape\nwith guests');
  await infoDialog.getByRole('button', {name: 'Done', exact: true}).click();
  await page.getByRole('button', {name: 'song(s)', exact: true}).click();
  await page.getByLabel('Title 2', {exact: true}).fill('Second');
  await expect(page.getByLabel('Artist name 2', {exact: true})).toHaveValue('Main artist');
  await page.getByLabel('Artist name 2', {exact: true}).fill('Guest');
  await page.getByRole('button', {name: 'section(s)', exact: true}).click();
  await page.getByRole('textbox', {name: 'Section information', exact: true}).fill('Encore');
  // The native field retains its stable form name while hidden in table mode.
  await expect(page.locator('textarea[name="edit-event.setlist"]')).toHaveValue(
    '@ Main artist\n* First &lsqb;live&rsqb; &amp; loud\n# from tape\n# with guests\n@ Guest\n* Second\n\n# Encore'
  );
  await expect(page.getByLabel('Artist name 1', {exact: true})).toHaveValue('Main artist');
  const firstRow = page.getByRole('row').filter({has: page.getByLabel('Title 1', {exact: true})});
  await expect(firstRow.getByRole('cell').first().getByRole('button', {name: 'Move song 1 down'})).toBeVisible();
  await expect(page.getByRole('button', {name: 'Search work 1', exact: true})).toHaveClass(/\bsearch\b/);
  await expect(page.getByRole('button', {name: 'Search work 1', exact: true})).toHaveCSS(
    'background-image',
    /data:image\/svg/
  );
  await expect(page.getByRole('table', {name: 'Event setlist', exact: true})).toHaveClass(/(^|\s)tbl(\s|$)/);
  await expect(page.getByRole('button', {name: 'Add work to item 2', exact: true})).toBeHidden();
  await page.getByRole('button', {name: 'Edit works 2', exact: true}).click();
  const worksDialog = page.getByRole('dialog', {name: 'Edit works 2', exact: true});
  await expect(worksDialog).toBeVisible();
  await expect(worksDialog.getByRole('columnheader', {name: 'Work in MusicBrainz:', exact: true})).toBeVisible();
  await expect(worksDialog.getByRole('columnheader', {name: 'Work as credited:', exact: true})).toBeVisible();
  await worksDialog.getByLabel('Work as credited 2', {exact: true}).fill('Discard me');
  await worksDialog.getByRole('button', {name: 'Cancel', exact: true}).click();
  await expect(page.getByLabel('Title 2', {exact: true})).toHaveValue('Second');
  await expect(page.getByRole('button', {name: 'Edit works 2', exact: true})).toBeFocused();
  await page.getByRole('button', {name: 'Edit works 2', exact: true}).press('Enter');
  await worksDialog.getByLabel('Work as credited 2', {exact: true}).fill('Discard with Escape');
  await worksDialog.getByLabel('Work in MusicBrainz 2', {exact: true}).focus();
  await page.keyboard.press('Shift+Tab');
  await expect(worksDialog.getByRole('button', {name: 'Cancel', exact: true})).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(worksDialog).toBeHidden();
  await expect(page.getByLabel('Title 2', {exact: true})).toHaveValue('Second');
  await expect(page.getByRole('button', {name: 'Edit works 2', exact: true})).toBeFocused();
  await page.getByRole('button', {name: 'Edit works 2', exact: true}).click();
  await page.getByRole('button', {name: 'Add work to item 2', exact: true}).click();
  await worksDialog.getByLabel('Work in MusicBrainz 2.2', {exact: true}).fill('Third movement');
  await worksDialog.getByRole('button', {name: 'Move work 2.2 up', exact: true}).click();
  await expect(worksDialog.getByLabel('Work as credited 2', {exact: true})).toHaveValue('Third movement');
  await worksDialog.getByRole('button', {name: 'Move work 2 down', exact: true}).click();
  await worksDialog.getByRole('button', {name: 'Done', exact: true}).click();
  await expect(page.locator('textarea[name="edit-event.setlist"]')).toHaveValue(
    '@ Main artist\n* First &lsqb;live&rsqb; &amp; loud\n# from tape\n# with guests\n@ Guest\n* Second / Third movement\n\n# Encore'
  );
  await expect(page.getByLabel('Title 2', {exact: true})).toHaveValue('Second / Third movement');
  await page.getByRole('button', {name: 'Edit works 2', exact: true}).click();
  await worksDialog.getByRole('button', {name: 'Remove work 2.2', exact: true}).click();
  await worksDialog.getByRole('button', {name: 'Done', exact: true}).click();
  await expect(page.locator('textarea[name="edit-event.setlist"]')).toHaveValue(
    '@ Main artist\n* First &lsqb;live&rsqb; &amp; loud\n# from tape\n# with guests\n@ Guest\n* Second\n\n# Encore'
  );
  await expect(editNote).toHaveValue(noteAfterFirstChange);
});

test('supports keyboard controls and blank credits inheriting the preceding artist', async ({page}) => {
  await page.getByRole('button', {name: 'song(s)', exact: true}).focus();
  await page.keyboard.press('Enter');
  await page.getByLabel('Title 1', {exact: true}).fill('First');
  await page.getByLabel('Artist name 1', {exact: true}).fill('Artist');
  await page.getByLabel('Number of songs').fill('2');
  await page.getByRole('button', {name: 'song(s)', exact: true}).click();
  await page.getByLabel('Title 2', {exact: true}).fill('Second');
  await page.getByLabel('Artist name 2', {exact: true}).fill('');
  await page.getByLabel('Title 3', {exact: true}).fill('Third');
  await expect(page.locator('textarea[name="edit-event.setlist"]')).toHaveValue('@ Artist\n* First\n* Second\n* Third');
  await expect(page.getByLabel('Title 3', {exact: true})).toBeFocused();
  await page.getByRole('button', {name: 'Move song 2 down', exact: true}).click();
  await expect(page.locator('textarea[name="edit-event.setlist"]')).toHaveValue('@ Artist\n* First\n* Third\n* Second');
});

test('searches titles by text and discards stale responses', async ({page, userscriptPage}) => {
  let releaseResponse: () => void = () => {};
  const responseReady = new Promise<void>(resolve => {
    releaseResponse = resolve;
  });
  const unroute = await userscriptPage.route('**/ws/js/work/**', async route => {
    await responseReady;
    await route.fulfill({
      json: [
        {
          gid: workId,
          name: 'Old result',
          comment: 'studio version',
          primaryAlias: 'Alternate title',
          typeName: 'Song',
          languages: [{language: {name: 'English'}}, {language: {name: 'Hebrew'}}],
          related_artists: {
            authors: {hits: 2, results: ['Composer', 'Lyricist']},
            artists: {hits: 4, results: ['Performer', 'Another performer', 'Third performer']},
          },
        },
        {gid: artistId, name: 'Minimal result', languages: []},
        {current: '1', pages: 1},
      ],
    });
  });
  try {
    await page.getByRole('button', {name: 'song(s)', exact: true}).click();
    await page.getByLabel('Title 1', {exact: true}).fill('Old query');
    const request = page.waitForRequest(request => request.url().includes('/ws/js/work/'));
    await page.getByRole('button', {name: 'Search work 1', exact: true}).click();
    expect(new URL((await request).url()).searchParams.get('q')).toBe('Old query');
    await page.getByLabel('Title 1', {exact: true}).fill('New query');
    const response = page.waitForResponse(response => response.url().includes('/ws/js/work/'));
    releaseResponse();
    await response;
    await expect(page.getByRole('option', {name: 'Select Old result', exact: true})).toBeHidden();
    await page.getByRole('button', {name: 'Search work 1', exact: true}).click();
    await expect(page.getByRole('option', {name: 'Select Old result', exact: true})).toBeVisible();
    await expect(page.getByRole('listbox', {name: 'work search results'})).toMatchAriaSnapshot(`
      - option "Select Old result":
        - text: "Old result (Alternate title, studio version) English, Hebrew Type: Song Authors: Composer, Lyricist Artists: Performer, Another performer, Third performer, …"
      - option "Select Minimal result": Minimal result
    `);
    const languageBounds = await page.getByText('English, Hebrew', {exact: true}).boundingBox();
    const titleBounds = await page
      .getByText('Old result (Alternate title, studio version)', {exact: true})
      .boundingBox();
    expect(languageBounds!.x).toBeGreaterThanOrEqual(titleBounds!.x + titleBounds!.width);
    expect(Math.abs(languageBounds!.y - titleBounds!.y)).toBeLessThan(5);
    await page.getByRole('button', {name: 'Search work 1', exact: true}).click();
    await expect(page.getByRole('button', {name: 'Search work 1', exact: true})).toHaveAttribute('aria-busy', 'false');
    await expect(page.getByRole('listbox', {name: 'work search results'})).toBeHidden();
    await expect(page.getByLabel('Title 1', {exact: true})).toHaveValue('New query');
    await page.getByRole('button', {name: 'Search work 1', exact: true}).click();
    await expect(page.getByRole('option', {name: 'Select Old result', exact: true})).toBeVisible();
    await page.getByLabel('Title 1', {exact: true}).press('ArrowDown');
    await page.getByLabel('Title 1', {exact: true}).press('Enter');
    await expect(page.locator('textarea[name="edit-event.setlist"]')).toHaveValue(`* [${workId}|Old result]`);
    await page.getByRole('button', {name: 'Edit works 1', exact: true}).click();
    const dialog = page.getByRole('dialog', {name: 'Edit works 1', exact: true});
    await dialog.getByRole('button', {name: 'Unlink', exact: true}).click();
    await dialog.getByRole('button', {name: 'Done', exact: true}).click();
    await expect(page.getByLabel('Title 1', {exact: true})).not.toHaveClass(/\blookup-performed\b/);
    await expect(page.locator('textarea[name="edit-event.setlist"]')).toHaveValue('* Old result');
    await page.getByRole('button', {name: 'Edit works 1', exact: true}).click();
    await dialog.getByRole('button', {name: 'Search work 1', exact: true}).click();
    const result = dialog.getByRole('option', {name: 'Select Old result', exact: true});
    await expect(result).toContainText('Authors: Composer, Lyricist');
    await dialog.getByRole('button', {name: 'Search work 1', exact: true}).click();
    await expect(dialog.getByRole('button', {name: 'Search work 1', exact: true})).toHaveAttribute(
      'aria-busy',
      'false'
    );
    await expect(dialog.getByRole('listbox', {name: 'work search results'})).toBeHidden();
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', {name: 'Search work 1', exact: true}).click();
    await expect(result).toBeVisible();
    await expect(dialog).toHaveCSS('overflow', 'visible');
    const minimalResult = dialog.getByRole('option', {name: 'Select Minimal result', exact: true});
    const resultBounds = await minimalResult.boundingBox();
    const dialogBounds = await dialog.boundingBox();
    expect(resultBounds!.y + resultBounds!.height).toBeGreaterThan(dialogBounds!.y + dialogBounds!.height);
    await minimalResult.click();
    await expect(dialog.getByLabel('Work in MusicBrainz 1', {exact: true})).toHaveValue('Minimal result');
    await dialog.getByRole('button', {name: 'Search work 1', exact: true}).click();
    await result.click();
    await dialog.getByRole('button', {name: 'Done', exact: true}).click();
    await expect(page.locator('textarea[name="edit-event.setlist"]')).toHaveValue(`* [${workId}|Old result]`);
  } finally {
    releaseResponse();
    await unroute();
  }
});

test.describe('existing event editor', () => {
  test.use({eventPath: '/event/7f3e30bb-fe44-4e64-9842-ddbca1499678/edit'});
  test('keeps the existing setlist and synchronizes an added song on edit pages', async ({page}) => {
    const textarea = page.locator('textarea[name="edit-event.setlist"]');
    const original = await textarea.inputValue();
    await expect(
      page.getByRole('group', {name: 'Event details', exact: true}).getByRole('table', {name: 'Event setlist'})
    ).toBeVisible();
    await expect(textarea).toHaveValue(original);
    await page.getByRole('button', {name: 'song(s)', exact: true}).click();
    await page
      .getByRole('textbox', {name: /^Title \d+$/})
      .last()
      .fill('Added song');
    await expect(textarea).toHaveValue(`${original}${original ? '\n' : ''}* Added song`);
  });
});

test('pastes titles and moves and deletes rows without submitting', async ({page}) => {
  await page.getByRole('button', {name: 'Markup', exact: true}).click();
  await page.getByLabel('Setlist:', {exact: true}).fill('@ The band\n* 1. First\n* Second\n* Third');
  await page.getByRole('button', {name: 'Table', exact: true}).click();
  await page.getByRole('button', {name: 'Move song 2 up', exact: true}).click();
  await page.getByRole('button', {name: 'Delete song 3', exact: true}).click();
  await expect(page.locator('textarea[name="edit-event.setlist"]')).toHaveValue('@ The band\n* Second\n* 1. First');
});

test.describe('seeded markup', () => {
  test.use({
    seed: `@ [${artistId}|Billy Joel]\n* [${workId}|52nd Street]\n# Encore\n\n* [${workId}|A] / [${workId}|B]\nunknown line`,
  });

  test('preserves links, medleys, blank lines and unknown content across mode switches', async ({page, seed}) => {
    await expect(page.getByLabel('Title 1', {exact: true})).toHaveValue('52nd Street');
    await expect(page.getByLabel('Title 2', {exact: true})).toHaveValue('A / B');
    await expect(page.getByLabel('Title 2', {exact: true})).toHaveClass(/\blookup-performed\b/);
    await expect(page.getByRole('button', {name: 'Search work 2', exact: true})).toBeDisabled();
    await expect(page.getByLabel('Title 2.2', {exact: true})).toBeHidden();
    await page.getByRole('button', {name: 'Markup', exact: true}).click();
    await expect(page.getByLabel('Setlist:', {exact: true})).toHaveValue(seed);
    await page.getByRole('button', {name: 'Table', exact: true}).click();
    await page.getByRole('button', {name: 'Edit works 2', exact: true}).click();
    await page
      .getByRole('dialog', {name: 'Edit works 2', exact: true})
      .getByRole('button', {name: 'Done', exact: true})
      .click();
    await expect(page.locator('textarea[name="edit-event.setlist"]')).toHaveValue(seed);
    await page.getByLabel('Title 1', {exact: true}).fill('Renamed');
    await expect(page.getByLabel('Title 1', {exact: true})).not.toHaveClass(/\blookup-performed\b/);
    await expect(page.locator('textarea[name="edit-event.setlist"]')).toHaveValue(
      seed.replace(`[${workId}|52nd Street]`, 'Renamed')
    );
    await page.getByRole('button', {name: 'Edit works 2', exact: true}).click();
    await page.getByLabel('Work as credited 2.2', {exact: true}).fill('Edited work');
    await page.getByLabel('Work join phrase 2', {exact: true}).fill(' → ');
    await expect(page.getByLabel('Work in MusicBrainz 2.2', {exact: true})).toHaveValue('B');
    await page
      .getByRole('dialog', {name: 'Edit works 2', exact: true})
      .getByRole('button', {name: 'Done', exact: true})
      .click();
    await expect(page.locator('textarea[name="edit-event.setlist"]')).toHaveValue(
      seed.replace(`[${workId}|52nd Street]`, 'Renamed').replace(`|A] / [${workId}|B]`, `|A] → [${workId}|Edited work]`)
    );
  });

  test('incorporates markup edits and external input events without duplicate mounting', async ({page}) => {
    const editNote = page.getByRole('textbox', {name: 'Edit note:', exact: true});
    await expect(editNote).toHaveValue('');
    await page.getByRole('button', {name: 'Markup', exact: true}).click();
    await expect(editNote).toHaveValue('');
    await page.getByLabel('Setlist:', {exact: true}).fill('@ Another artist\n* Another song');
    await expect(editNote).toHaveValue(/^\n----\nEdited event setlist using .+ version .+ from .+\.$/);
    const noteAfterMarkupChange = await editNote.inputValue();
    await editNote.fill('');
    await page.getByRole('button', {name: 'Table', exact: true}).click();
    await expect(page.getByLabel('Title 1', {exact: true})).toHaveValue('Another song');
    await page.locator('textarea[name="edit-event.setlist"]').evaluate((element: HTMLTextAreaElement) => {
      element.value = '* External song';
      element.dispatchEvent(new Event('input', {bubbles: true}));
    });
    await expect(page.getByLabel('Title 1', {exact: true})).toHaveValue('External song');
    await expect(editNote).toHaveValue(noteAfterMarkupChange);
    await expect(page.getByRole('table', {name: 'Event setlist'})).toHaveCount(1);
    await page.locator('textarea[name="edit-event.setlist"]').evaluate((element: HTMLTextAreaElement) => {
      element.value = '* Assigned without an event';
    });
    await page.getByRole('button', {name: 'Markup', exact: true}).click();
    await page.getByRole('button', {name: 'Table', exact: true}).click();
    await expect(page.getByLabel('Title 1', {exact: true})).toHaveValue('Assigned without an event');
  });
});

test('links artist and work MBIDs and edits credited names and join phrases', async ({page, userscriptPage}) => {
  const unroute = await userscriptPage.route('**/ws/{2/artist,js/entity}/**', async route => {
    const isArtist = route.request().url().includes('/artist/');
    await route.fulfill({
      json: isArtist
        ? {id: artistId, name: 'Billy Joel'}
        : {entityType: 'work', gid: workId, name: '52nd Street', typeName: 'Song'},
    });
  });
  try {
    await page.getByRole('button', {name: 'song(s)', exact: true}).click();
    await page.getByLabel('Title 1', {exact: true}).fill(workId);
    await page.getByRole('button', {name: 'Search work 1', exact: true}).click();
    await expect(page.getByRole('option', {name: 'Select 52nd Street', exact: true})).toContainText('Type: Song');
    await page.getByRole('option', {name: 'Select 52nd Street', exact: true}).click();
    await expect(page.getByLabel('Title 1', {exact: true})).toHaveClass(/\blookup-performed\b/);
    await page.getByLabel('Artist name 1', {exact: true}).fill(`https://musicbrainz.org/artist/${artistId}`);
    await page.getByRole('button', {name: 'Search artist 1', exact: true}).click();
    await expect(page.getByRole('option', {name: 'Select Billy Joel', exact: true})).toBeVisible();
    await page.getByRole('button', {name: 'Search artist 1', exact: true}).click();
    await expect(page.getByRole('button', {name: 'Search artist 1', exact: true})).toHaveAttribute(
      'aria-busy',
      'false'
    );
    await expect(page.getByRole('listbox', {name: 'artist search results'})).toBeHidden();
    await page.getByRole('button', {name: 'Search artist 1', exact: true}).click();
    await page.getByRole('option', {name: 'Select Billy Joel', exact: true}).click();
    await expect(page.getByLabel('Artist name 1', {exact: true})).toHaveClass(/\blookup-performed\b/);
    await page.getByRole('button', {name: 'Edit artist credit 1', exact: true}).click();
    await page.getByLabel('Join phrase 1', {exact: true}).fill(' with ');
    await page.getByRole('button', {name: 'Add artist to song 1'}).click();
    await page.getByLabel('Artist as credited 1.2', {exact: true}).fill('Guest');
    await expect(page.getByRole('columnheader', {name: 'Artist in MusicBrainz:', exact: true})).toBeVisible();
    await expect(page.getByLabel('Artist in MusicBrainz 1', {exact: true})).toHaveValue('Billy Joel');
    await page.getByLabel('Artist as credited 1', {exact: true}).fill('Billy J');
    await expect(page.getByLabel('Artist in MusicBrainz 1', {exact: true})).toHaveValue('Billy Joel');
    await expect(page.getByLabel('Artist in MusicBrainz 1', {exact: true})).toHaveClass(/\blookup-performed\b/);
    await page.getByLabel('Artist as credited 1', {exact: true}).fill('Billy');
    await page
      .getByRole('dialog', {name: 'Edit artist credit 1', exact: true})
      .getByRole('button', {name: 'Done', exact: true})
      .click();
    await expect(page.locator('textarea[name="edit-event.setlist"]')).toHaveValue(
      `@ [${artistId}|Billy] with Guest\n* [${workId}|52nd Street]`
    );
  } finally {
    await unroute();
  }
});

test('keeps unlinked text and keyboard focus when search fails', async ({page, userscriptPage}) => {
  const unroute = await userscriptPage.route('**/ws/js/work/**', route =>
    route.fulfill({status: 500, body: 'Unavailable'})
  );
  try {
    await page.getByRole('button', {name: 'song(s)', exact: true}).click();
    const title = page.getByLabel('Title 1', {exact: true});
    await title.fill('Unknown song');
    await expect(title).toBeFocused();
    await title.press('Enter');
    await expect(page.getByRole('alert')).toContainText('Search failed');
    await expect(title).toHaveValue('Unknown song');
    await expect(title).not.toHaveClass(/\blookup-performed\b/);
    await expect(page.locator('textarea[name="edit-event.setlist"]')).toHaveValue('* Unknown song');
  } finally {
    await unroute();
  }
});
