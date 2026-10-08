// spell:words lsqb rsqb
import {expect} from '@playwright/test';
import {test} from '#tests/fixtures/event-editor.ts';

const artistId = '64b94289-9474-4d43-8c93-918ccc1920d1';
const workId = '834f1928-ca14-4ea0-9801-ad92cb32952e';

test('writes songs, independent credits, notes and sections into the textarea', async ({page, eventEditor}) => {
  const details = eventEditor.details;
  const editNote = eventEditor.editNote;

  // Switching views and adding a blank row must preserve the existing edit note.
  await expect(eventEditor.table).toBeVisible();
  await expect(editNote).toHaveValue('');
  await editNote.fill('Setlist source: my concert notes');
  await expect(details).toHaveCSS('min-width', '0px');
  await eventEditor.switchMode('Markup');
  await expect(eventEditor.markup).toBeVisible();
  await eventEditor.switchMode('Table');
  await expect(eventEditor.markup).toBeHidden();
  await eventEditor.addSong();
  await expect(editNote).toHaveValue('Setlist source: my concert notes');

  // Add song details, then verify the edit note is attributed only once.
  await eventEditor.title(1).fill('First [live] & loud');
  await expect(editNote).toHaveValue(
    /^Setlist source: my concert notes\n----\nEdited event setlist using .+ version .+ from .+\.$/
  );
  const noteAfterFirstChange = await editNote.inputValue();
  await eventEditor.artist(1).fill('Main artist');
  await eventEditor.setAdditionalInfo('from tape\nwith guests');

  // The next song inherits its artist until a different credit is entered.
  await eventEditor.addSong();
  await eventEditor.title(2).fill('Second');
  await expect(eventEditor.artist(2)).toHaveValue('Main artist');
  await eventEditor.artist(2).fill('Guest');
  await page.getByRole('button', {name: 'section(s)', exact: true}).click();
  await page.getByRole('textbox', {name: 'Section information', exact: true}).fill('Encore');
  await expect(eventEditor.setlist).toHaveValue(
    '@ Main artist\n* First &lsqb;live&rsqb; &amp; loud\n# from tape\n# with guests\n@ Guest\n* Second\n\n# Encore'
  );
  await expect(eventEditor.artist(1)).toHaveValue('Main artist');

  // Check that the table uses the native MusicBrainz controls and appearance.
  const firstRow = page.getByRole('row').filter({has: eventEditor.title(1)});
  await expect(firstRow.getByRole('cell').first().getByRole('button', {name: 'Move song 1 down'})).toBeVisible();
  await expect(eventEditor.searchButton('work', 1)).toHaveClass(/\bsearch\b/);
  await expect(eventEditor.searchButton('work', 1)).toHaveCSS('background-image', /data:image\/svg/);
  await expect(eventEditor.table).toHaveClass(/(^|\s)tbl(\s|$)/);

  // Cancel discards dialog edits and returns focus to the Edit button.
  await expect(page.getByRole('button', {name: 'Add work to item 2', exact: true})).toBeHidden();
  const worksDialog = await eventEditor.editWorks(2);
  await expect(worksDialog).toBeVisible();
  await expect(worksDialog.getByRole('columnheader', {name: 'Work in MusicBrainz:', exact: true})).toBeVisible();
  await expect(worksDialog.getByRole('columnheader', {name: 'Work as credited:', exact: true})).toBeVisible();
  await worksDialog.getByLabel('Work as credited 2', {exact: true}).fill('Discard me');
  await worksDialog.getByRole('button', {name: 'Cancel', exact: true}).click();
  await expect(eventEditor.title(2)).toHaveValue('Second');
  await expect(eventEditor.workEditButton(2)).toBeFocused();

  // Keyboard cancellation also discards changes and keeps focus inside the open dialog.
  await eventEditor.workEditButton(2).press('Enter');
  await worksDialog.getByLabel('Work as credited 2', {exact: true}).fill('Discard with Escape');
  await worksDialog.getByLabel('Work in MusicBrainz 2', {exact: true}).focus();
  await page.keyboard.press('Shift+Tab');
  await expect(worksDialog.getByRole('button', {name: 'Cancel', exact: true})).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(worksDialog).toBeHidden();
  await expect(eventEditor.title(2)).toHaveValue('Second');
  await expect(eventEditor.workEditButton(2)).toBeFocused();

  // Add and reorder medley entries, then save their joined titles.
  await eventEditor.workEditButton(2).click();
  await page.getByRole('button', {name: 'Add work to item 2', exact: true}).click();
  await worksDialog.getByLabel('Work in MusicBrainz 2.2', {exact: true}).fill('Third movement');
  await worksDialog.getByRole('button', {name: 'Move work 2.2 up', exact: true}).click();
  await expect(worksDialog.getByLabel('Work as credited 2', {exact: true})).toHaveValue('Third movement');
  await worksDialog.getByRole('button', {name: 'Move work 2 down', exact: true}).click();
  await worksDialog.getByRole('button', {name: 'Done', exact: true}).click();
  await expect(eventEditor.setlist).toHaveValue(
    '@ Main artist\n* First &lsqb;live&rsqb; &amp; loud\n# from tape\n# with guests\n@ Guest\n* Second / Third movement\n\n# Encore'
  );
  await expect(eventEditor.title(2)).toHaveValue('Second / Third movement');

  // Removing a medley entry restores the remaining title without duplicating attribution.
  await eventEditor.workEditButton(2).click();
  await worksDialog.getByRole('button', {name: 'Remove work 2.2', exact: true}).click();
  await worksDialog.getByRole('button', {name: 'Done', exact: true}).click();
  await expect(eventEditor.setlist).toHaveValue(
    '@ Main artist\n* First &lsqb;live&rsqb; &amp; loud\n# from tape\n# with guests\n@ Guest\n* Second\n\n# Encore'
  );
  await expect(editNote).toHaveValue(noteAfterFirstChange);
});

test('supports keyboard controls and blank credits inheriting the preceding artist', async ({page, eventEditor}) => {
  // Create the first song using the keyboard.
  await page.getByRole('button', {name: 'song(s)', exact: true}).focus();
  await page.keyboard.press('Enter');
  await eventEditor.title(1).fill('First');
  await eventEditor.artist(1).fill('Artist');

  // Blank credits inherit the preceding artist in the serialized setlist.
  await page.getByLabel('Number of songs').fill('2');
  await eventEditor.addSong();
  await eventEditor.title(2).fill('Second');
  await eventEditor.artist(2).fill('');
  await eventEditor.title(3).fill('Third');
  await expect(eventEditor.setlist).toHaveValue('@ Artist\n* First\n* Second\n* Third');
  await expect(eventEditor.title(3)).toBeFocused();

  // Reordering songs preserves the inherited credit.
  await page.getByRole('button', {name: 'Move song 2 down', exact: true}).click();
  await expect(eventEditor.setlist).toHaveValue('@ Artist\n* First\n* Third\n* Second');
});

test('searches titles by text and discards stale responses', async ({page, eventEditor}) => {
  // Hold the first search response so the title can change while it is in flight.
  const {ready: responseReady, release: releaseResponse} = eventEditor.holdResponse();
  await eventEditor.route('**/ws/js/work/**', async route => {
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

  // Discard the response for the previous query.
  await eventEditor.addSong();
  await eventEditor.title(1).fill('Old query');
  const request = page.waitForRequest(request => request.url().includes('/ws/js/work/'));
  await eventEditor.searchButton('work', 1).click();
  expect(new URL((await request).url()).searchParams.get('q')).toBe('Old query');
  await eventEditor.title(1).fill('New query');
  const response = page.waitForResponse(response => response.url().includes('/ws/js/work/'));
  releaseResponse();
  await response;
  await expect(eventEditor.result('Old result')).toBeHidden();

  // A fresh search displays aliases, languages, authors and performers.
  await eventEditor.searchButton('work', 1).click();
  await expect(eventEditor.result('Old result')).toBeVisible();
  await expect(eventEditor.results('work')).toMatchAriaSnapshot(`
      - option "Select Old result":
        - text: "Old result (Alternate title, studio version) English, Hebrew Type: Song Authors: Composer, Lyricist Artists: Performer, Another performer, Third performer, …"
      - option "Select Minimal result": Minimal result
    `);
  const languageBounds = await page.getByText('English, Hebrew', {exact: true}).boundingBox();
  const titleBounds = await page.getByText('Old result (Alternate title, studio version)', {exact: true}).boundingBox();
  expect(languageBounds!.x).toBeGreaterThanOrEqual(titleBounds!.x + titleBounds!.width);
  expect(Math.abs(languageBounds!.y - titleBounds!.y)).toBeLessThan(5);

  // Closing the results preserves the query; keyboard selection creates a work link.
  await eventEditor.searchButton('work', 1).click();
  await expect(eventEditor.searchButton('work', 1)).toHaveAttribute('aria-busy', 'false');
  await expect(eventEditor.results('work')).toBeHidden();
  await expect(eventEditor.title(1)).toHaveValue('New query');
  await eventEditor.searchButton('work', 1).click();
  await expect(eventEditor.result('Old result')).toBeVisible();
  await eventEditor.title(1).press('ArrowDown');
  await eventEditor.title(1).press('Enter');
  await expect(eventEditor.setlist).toHaveValue(`* [${workId}|Old result]`);

  // Unlink through the work dialog, then search again within that dialog.
  const dialog = await eventEditor.editWorks(1);
  await dialog.getByRole('button', {name: 'Unlink', exact: true}).click();
  await dialog.getByRole('button', {name: 'Done', exact: true}).click();
  await expect(eventEditor.title(1)).not.toHaveClass(/\blookup-performed\b/);
  await expect(eventEditor.setlist).toHaveValue('* Old result');
  await eventEditor.workEditButton(1).click();
  await eventEditor.searchButton('work', 1, dialog).click();
  const result = eventEditor.result('Old result', dialog);
  await expect(result).toContainText('Authors: Composer, Lyricist');
  await eventEditor.searchButton('work', 1, dialog).click();
  await expect(eventEditor.searchButton('work', 1, dialog)).toHaveAttribute('aria-busy', 'false');
  await expect(eventEditor.results('work', dialog)).toBeHidden();
  await expect(dialog).toBeVisible();
  await eventEditor.searchButton('work', 1, dialog).click();
  await expect(result).toBeVisible();

  // Results may extend beyond the dialog and must remain selectable.
  await expect(dialog).toHaveCSS('overflow', 'visible');
  const minimalResult = eventEditor.result('Minimal result', dialog);
  const resultBounds = await minimalResult.boundingBox();
  const dialogBounds = await dialog.boundingBox();
  expect(resultBounds!.y + resultBounds!.height).toBeGreaterThan(dialogBounds!.y + dialogBounds!.height);
  await minimalResult.click();
  await expect(dialog.getByLabel('Work in MusicBrainz 1', {exact: true})).toHaveValue('Minimal result');
  await eventEditor.searchButton('work', 1, dialog).click();
  await result.click();
  await dialog.getByRole('button', {name: 'Done', exact: true}).click();
  await expect(eventEditor.setlist).toHaveValue(`* [${workId}|Old result]`);

  // Ranking uses existing performer annotations, without extra work lookups.
  let performanceRequests = 0;
  await eventEditor.route('**/ws/2/work/**', route => {
    performanceRequests++;
    return route.fulfill({json: {relations: []}});
  });
  await eventEditor.replaceMarkup(`@ [${artistId}|Billy Joel]\n* Query`);
  const artistDialog = await eventEditor.editArtistCredit(1);
  await artistDialog.getByLabel('Artist as credited 1', {exact: true}).fill('Different credited name');
  await artistDialog.getByRole('button', {name: 'Done', exact: true}).click();
  await eventEditor.route('**/ws/js/work/**', route =>
    route.fulfill({
      json: [
        {gid: artistId, name: 'Other work', related_artists: {authors: {hits: 1, results: ['Billy Joel']}}},
        {gid: workId, name: 'Performed work', related_artists: {artists: {hits: 1, results: ['Billy Joel']}}},
      ],
    })
  );

  // Performer matches come first even when the artist has a different credited name.
  await eventEditor.searchButton('work', 1).click();
  const options = eventEditor.results('work').getByRole('option');
  await expect(options).toHaveText([/^Performed work.*Performed by linked artist/, /^Other work/]);
  await expect(options.first()).toHaveCSS('background-color', 'rgb(232, 245, 233)');
  await eventEditor.title(1).press('ArrowDown');
  await eventEditor.title(1).press('Enter');
  await expect(eventEditor.title(1)).toHaveValue('Performed work');
  await eventEditor.workEditButton(1).click();
  await eventEditor.searchButton('work', 1, dialog).click();
  await expect(dialog.getByRole('option').first()).toContainText('Performed by linked artist');
  await dialog.getByRole('button', {name: 'Cancel', exact: true}).click();

  // Removing the artist link restores the original search order.
  await eventEditor.artist(1).fill('Unlinked artist');
  await eventEditor.searchButton('work', 1).click();
  await expect(options).toHaveText([/^Other work/, /^Performed work/]);
  expect(performanceRequests).toBe(0);
});

test.describe('existing event editor', () => {
  test.use({eventPath: '/event/7f3e30bb-fe44-4e64-9842-ddbca1499678/edit'});
  test('keeps the existing setlist and synchronizes an added song on edit pages', async ({page, eventEditor}) => {
    const textarea = eventEditor.setlist;
    const original = await textarea.inputValue();
    await expect(eventEditor.table).toBeVisible();
    await expect(textarea).toHaveValue(original);
    await eventEditor.addSong();
    await page
      .getByRole('textbox', {name: /^Title \d+$/})
      .last()
      .fill('Added song');
    await expect(textarea).toHaveValue(`${original}${original ? '\n' : ''}* Added song`);
  });
});

test('pastes titles and moves and deletes rows without submitting', async ({page, eventEditor}) => {
  await eventEditor.replaceMarkup('@ The band\n* 1. First\n* Second\n* Third');
  await page.getByRole('button', {name: 'Move song 2 up', exact: true}).click();
  await page.getByRole('button', {name: 'Delete song 3', exact: true}).click();
  await expect(eventEditor.setlist).toHaveValue('@ The band\n* Second\n* 1. First');
});

test.describe('seeded markup', () => {
  test.use({
    seed: `@ [${artistId}|Billy Joel]\n* [${workId}|52nd Street]\n# Encore\n\n* [${workId}|A] / [${workId}|B]\nunknown line`,
  });

  test('preserves links, medleys, blank lines and unknown content across mode switches', async ({
    page,
    eventEditor,
    seed,
  }) => {
    // The seeded links and medley survive view switches and a dialog opened without changes.
    await expect(eventEditor.title(1)).toHaveValue('52nd Street');
    await expect(eventEditor.title(2)).toHaveValue('A / B');
    await expect(eventEditor.title(2)).toHaveClass(/\blookup-performed\b/);
    await expect(eventEditor.searchButton('work', 2)).toBeDisabled();
    await expect(eventEditor.title('2.2')).toBeHidden();
    await eventEditor.switchMode('Markup');
    await expect(eventEditor.markup).toHaveValue(seed);
    await eventEditor.switchMode('Table');
    await eventEditor.workEditButton(2).click();
    await eventEditor.worksDialog(2).getByRole('button', {name: 'Done', exact: true}).click();
    await expect(eventEditor.setlist).toHaveValue(seed);

    // Typing a new title removes its link while preserving unrelated markup.
    await eventEditor.title(1).fill('Renamed');
    await expect(eventEditor.title(1)).not.toHaveClass(/\blookup-performed\b/);
    await expect(eventEditor.setlist).toHaveValue(seed.replace(`[${workId}|52nd Street]`, 'Renamed'));

    // Editing the credited title and join phrase retains both work links.
    await eventEditor.workEditButton(2).click();
    await page.getByLabel('Work as credited 2.2', {exact: true}).fill('Edited work');
    await page.getByLabel('Work join phrase 2', {exact: true}).fill(' → ');
    await expect(page.getByLabel('Work in MusicBrainz 2.2', {exact: true})).toHaveValue('B');
    await eventEditor.worksDialog(2).getByRole('button', {name: 'Done', exact: true}).click();
    await expect(eventEditor.setlist).toHaveValue(
      seed.replace(`[${workId}|52nd Street]`, 'Renamed').replace(`|A] / [${workId}|B]`, `|A] → [${workId}|Edited work]`)
    );
  });

  test('incorporates markup edits and external input events without duplicate mounting', async ({eventEditor}) => {
    // View switches do not add attribution; editing markup does.
    const editNote = eventEditor.editNote;
    await expect(editNote).toHaveValue('');
    await eventEditor.switchMode('Markup');
    await expect(editNote).toHaveValue('');
    await eventEditor.markup.fill('@ Another artist\n* Another song');
    await expect(editNote).toHaveValue(/^\n----\nEdited event setlist using .+ version .+ from .+\.$/);
    const noteAfterMarkupChange = await editNote.inputValue();
    await editNote.fill('');
    await eventEditor.switchMode('Table');
    await expect(eventEditor.title(1)).toHaveValue('Another song');

    // An external input event refreshes the table without mounting a second editor.
    await eventEditor.setlist.evaluate((element: HTMLTextAreaElement) => {
      element.value = '* External song';
      element.dispatchEvent(new Event('input', {bubbles: true}));
    });
    await expect(eventEditor.title(1)).toHaveValue('External song');
    await expect(editNote).toHaveValue(noteAfterMarkupChange);
    await expect(eventEditor.table).toHaveCount(1);

    // A value assigned without an event is picked up on the next view switch.
    await eventEditor.setlist.evaluate((element: HTMLTextAreaElement) => {
      element.value = '* Assigned without an event';
    });
    await eventEditor.switchMode('Markup');
    await eventEditor.switchMode('Table');
    await expect(eventEditor.title(1)).toHaveValue('Assigned without an event');
  });
});

test('links artist and work MBIDs and edits credited names and join phrases', async ({page, eventEditor}) => {
  // Stub entity lookups so selection never depends on live search results.
  await eventEditor.route('**/ws/{2/artist,js/entity}/**', async route => {
    const isArtist = route.request().url().includes('/artist/');
    await route.fulfill({
      json: isArtist
        ? {id: artistId, name: 'Billy Joel'}
        : {entityType: 'work', gid: workId, name: '52nd Street', typeName: 'Song'},
    });
  });

  // Look up and select a work by MBID.
  await eventEditor.addSong();
  await eventEditor.title(1).fill(workId);
  await eventEditor.searchButton('work', 1).click();
  await expect(eventEditor.result('52nd Street')).toContainText('Type: Song');
  await eventEditor.result('52nd Street').click();
  await expect(eventEditor.title(1)).toHaveClass(/\blookup-performed\b/);

  // Look up an artist URL and verify that closing the results preserves the query.
  await eventEditor.artist(1).fill(`https://musicbrainz.org/artist/${artistId}`);
  await eventEditor.searchButton('artist', 1).click();
  await expect(eventEditor.result('Billy Joel')).toBeVisible();
  await eventEditor.searchButton('artist', 1).click();
  await expect(eventEditor.searchButton('artist', 1)).toHaveAttribute('aria-busy', 'false');
  await expect(eventEditor.results('artist')).toBeHidden();
  await eventEditor.searchButton('artist', 1).click();
  await eventEditor.result('Billy Joel').click();
  await expect(eventEditor.artist(1)).toHaveClass(/\blookup-performed\b/);

  // Credited names and join phrases can change independently of the linked artist.
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
  await eventEditor.artistDialog(1).getByRole('button', {name: 'Done', exact: true}).click();
  await expect(eventEditor.setlist).toHaveValue(`@ [${artistId}|Billy] with Guest\n* [${workId}|52nd Street]`);
});

test('keeps unlinked text and keyboard focus when search fails', async ({page, eventEditor}) => {
  await eventEditor.route('**/ws/js/work/**', route => route.fulfill({status: 500, body: 'Unavailable'}));
  await eventEditor.addSong();
  const title = eventEditor.title(1);
  await title.fill('Unknown song');
  await expect(title).toBeFocused();
  await title.press('Enter');
  await expect(page.getByRole('alert')).toContainText('Search failed');
  await expect(title).toHaveValue('Unknown song');
  await expect(title).not.toHaveClass(/\blookup-performed\b/);
  await expect(eventEditor.setlist).toHaveValue('* Unknown song');
});
