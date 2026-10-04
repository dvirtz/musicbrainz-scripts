// spell:words lsqb rsqb
import {expect} from '@playwright/test';
import {createSetlistItem, parseSetlist, serializeSetlist} from '@repo/musicbrainz-ext/setlist';
import {test} from '@repo/test-support/userscript-test';

test('inherits artist declarations and separates song notes from standalone information', () => {
  const setlist = parseSetlist(
    '@ Artist\n* One\n# Note\n# More notes\n* Two\n\n# Encore\n# Interlude\n@ Guest\n* Three'
  );
  const songs = setlist.entries.filter(entry => entry.kind === 'item');
  expect(songs.map(song => song.credits[0]?.name)).toEqual(['Artist', 'Artist', 'Guest']);
  expect(songs[0]?.notes).toBe('Note\nMore notes');
  expect(setlist.entries.filter(entry => entry.kind === 'info')).toMatchObject([{text: 'Encore\nInterlude'}]);
  songs[0]!.credits = [{name: 'Replacement', joinPhrase: ''}];
  expect(serializeSetlist(setlist)).toBe(
    '@ Replacement\n* One\n# Note\n# More notes\n@ Artist\n* Two\n\n# Encore\n# Interlude\n@ Guest\n* Three'
  );
});

test('preserves unsupported inline entities as malformed lines', () => {
  const artist = '64b94289-9474-4d43-8c93-918ccc1920d1';
  const work = '834f1928-ca14-4ea0-9801-ad92cb32952e';
  const original = `@ [${artist}|Artist] * [${work}|Title]\n* Next`;
  const setlist = parseSetlist(original);
  expect(setlist.entries[0]).toMatchObject({kind: 'raw', text: original.split('\n')[0]});
  expect(setlist.entries[1]).toMatchObject({kind: 'item', credits: [], works: [{name: 'Next'}]});
  expect(serializeSetlist(setlist)).toBe(original);
});

test('round trips mixed markup exactly and keeps raw entries when a song changes', () => {
  const original = '@ Artist\r\n* Song &amp; &lsqb;live&rsqb;\r\n# Encore\r\n\r\n* [bad|link]\r\n';
  const setlist = parseSetlist(original);
  expect(serializeSetlist(setlist)).toBe(original);
  const song = setlist.entries.find(entry => entry.kind === 'item');
  if (!song || song.kind !== 'item') throw new Error('Missing song');
  expect(song.works[0]!.name).toBe('Song & [live]');
  song.works[0]!.name = 'Renamed &amp; [live]';
  expect(serializeSetlist(setlist)).toBe('@ Artist\n* Renamed &amp; &lsqb;live&rsqb;\n# Encore\n\n* [bad|link]\n');
});

test('retains explicit repeated artist changes and inherits blank song credits', () => {
  const setlist = parseSetlist('@ Artist\n* One\n@ Artist\n* Two');
  const song = setlist.entries.find(entry => entry.kind === 'item');
  if (!song || song.kind !== 'item') throw new Error('Missing song');
  song.credits = [];
  song.notes = 'note';
  expect(serializeSetlist(setlist)).toBe('@ Artist\n* One\n# note\n@ Artist\n* Two');
});

test('keeps multiple linked artist credits and work links when editing names', () => {
  const artist = '64b94289-9474-4d43-8c93-918ccc1920d1';
  const guest = '9f8ee15f-8fe8-4b4e-8a8a-8e905211b642';
  const work = '834f1928-ca14-4ea0-9801-ad92cb32952e';
  const setlist = parseSetlist(`@ [${artist}|Billy] with [${guest}|Guest]\n* [${work}|Song]`);
  const song = setlist.entries.find(entry => entry.kind === 'item');
  if (!song || song.kind !== 'item') throw new Error('Missing song');
  expect(song.credits).toEqual([
    {mbid: artist, name: 'Billy', joinPhrase: ' with '},
    {mbid: guest, name: 'Guest', joinPhrase: ''},
  ]);
  song.credits[0]!.name = 'Billy & band';
  song.works[0]!.name = 'New [title]';
  expect(serializeSetlist(setlist)).toBe(
    `@ [${artist}|Billy &amp; band] with [${guest}|Guest]\n* [${work}|New &lsqb;title&rsqb;]`
  );
});

test('preserves opaque artist declarations without restoring an earlier artist', () => {
  const setlist = parseSetlist('@ First\n* One\n@ [unsupported]\n* Two');
  const song = setlist.entries.find(entry => entry.kind === 'item' && entry.works[0]!.name === 'Two');
  if (!song || song.kind !== 'item') throw new Error('Missing song');
  song.notes = 'note';
  expect(serializeSetlist(setlist)).toBe('@ First\n* One\n@ [unsupported]\n* Two\n# note');
});

test('ignores blank new song rows and emits each note and section line with a prefix', () => {
  const setlist = parseSetlist('');
  const song = createSetlistItem('Title', [{name: 'Artist', joinPhrase: ''}]);
  song.notes = 'first note\n\nsecond & note';
  setlist.entries.push(createSetlistItem(), song, {id: 'section', kind: 'info', text: 'Encore\nInterlude'});
  expect(serializeSetlist(setlist)).toBe(
    '@ Artist\n* Title\n# first note\n# second &amp; note\n\n# Encore\n# Interlude'
  );
});

test('parses linked medley works and preserves their joins when another entry changes', () => {
  const first = '834f1928-ca14-4ea0-9801-ad92cb32952e';
  const second = '887f0014-1625-4a3c-baa6-7c8bf23913bf';
  const original = `* [${first}|First] / [${second}|Second]\n\n# Encore`;
  const setlist = parseSetlist(original);
  expect(setlist.entries[0]).toMatchObject({
    kind: 'item',
    works: [
      {mbid: first, name: 'First', joinPhrase: ' / '},
      {mbid: second, name: 'Second', joinPhrase: ''},
    ],
  });
  expect(serializeSetlist(setlist)).toBe(original);
  const info = setlist.entries.find(entry => entry.kind === 'info');
  if (!info || info.kind !== 'info') throw new Error('Missing section');
  info.text = 'Interlude';
  expect(serializeSetlist(setlist)).toBe(original.replace('Encore', 'Interlude'));
});
