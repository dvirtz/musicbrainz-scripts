// cspell:words Mando Diao
import {test} from '#tests/fixtures/release-event-page.ts';
import {expect} from '@playwright/test';
import {MBEvent} from '@repo/musicbrainz-ext/web-service-types';

const MANDO_DIAO_RELEASE = '4d2865b4-b1a9-4bb7-920e-0ad3a06d9426';
const MANDO_DIAO_EVENT = '836117c8-4737-42f6-ae9a-ff531e497f9e';
const LED_ZEPPELIN_RELEASE = 'c146ff21-0643-4464-9187-d115f9901d53';

test('seeds a new event', async ({releaseEventPage}) => {
  const source = await releaseEventPage.openRelease(LED_ZEPPELIN_RELEASE);
  expect(source['release-group']?.['secondary-types']).toContain('Live');
  expect(source.relations.some(rel => rel.event)).toBe(false);
  const recordings = source.media.flatMap(medium => medium.tracks.map(track => track.recording));
  expect(recordings).toHaveLength(17);
  expect(recordings.some(recording => recording.relations?.some(rel => rel.event))).toBe(false);
  expect(source.relations).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        type: 'recorded at',
        begin: '1970-09-19',
        end: '1970-09-19',
        place: expect.objectContaining({id: 'a727b970-8ea0-4f75-abc8-db131f72aecb'}),
      }),
    ])
  );

  const url = await releaseEventPage.openSeededEditor();
  expect(url.pathname).toBe('/event/create');
  const page = releaseEventPage.page;
  await expect(page.getByRole('textbox', {name: 'Name:', exact: true})).toHaveValue(
    'Led Zeppelin at Madison Square Garden'
  );
  await expect(page.getByRole('combobox', {name: 'Type:', exact: true})).toHaveValue('1');
  await expect(page.getByRole('textbox', {name: 'Begin date:'})).toHaveValue('1970');
  await expect(page.getByRole('textbox', {name: 'MM'}).first()).toHaveValue('09');
  await expect(page.getByRole('textbox', {name: 'DD'}).first()).toHaveValue('19');
  await expect(page.getByRole('textbox', {name: 'End date:'})).toHaveValue('1970');
  await expect(page.getByRole('textbox', {name: 'MM'}).nth(1)).toHaveValue('09');
  await expect(page.getByRole('textbox', {name: 'DD'}).nth(1)).toHaveValue('19');
  await expect(page.getByRole('link', {name: 'Madison Square Garden', exact: true})).toBeVisible();
  await releaseEventPage.expectSetlist(17, 'Immigrant Song', 'How Many More Times');
  await releaseEventPage.expectRecordingLinks(source, url.searchParams, 17);
  await releaseEventPage.expectEditNote(LED_ZEPPELIN_RELEASE);
});

test('updates existing event', async ({releaseEventPage, userscriptPage, baseURL}) => {
  const source = await releaseEventPage.openRelease(MANDO_DIAO_RELEASE);
  expect(source['release-group']?.['secondary-types']).toContain('Live');
  expect(source.relations.some(rel => rel.event)).toBe(false);
  const recordings = source.media.flatMap(medium => medium.tracks.map(track => track.recording));
  expect(recordings).toHaveLength(24);
  for (const recording of recordings) {
    expect(recording.relations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({type: 'recorded at', event: expect.objectContaining({id: MANDO_DIAO_EVENT})}),
      ])
    );
  }
  const event = await userscriptPage.requestJSON<MBEvent>(`/ws/2/event/${MANDO_DIAO_EVENT}?fmt=json`, {baseURL});
  expect(event.setlist).toBe('');

  const url = await releaseEventPage.openSeededEditor();
  expect(url.pathname).toBe(`/event/${MANDO_DIAO_EVENT}/edit`);
  expect(url.searchParams.has('edit-event.name')).toBe(false);
  expect(url.searchParams.has('edit-event.type_id')).toBe(false);
  await releaseEventPage.expectSetlist(24, 'Long Before Rock ’n’ Roll', 'God Knows');
  await releaseEventPage.expectRecordingLinks(source, url.searchParams, 24);
  await releaseEventPage.expectEditNote(MANDO_DIAO_RELEASE);
});
