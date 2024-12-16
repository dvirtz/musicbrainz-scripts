import {from, lastValueFrom, switchMap, take, tap} from 'rxjs';
import {asyncTap} from 'src/common/lib/asyncTap';
import {COMPOSER_LINK_TYPE_ID, LYRICIST_LINK_TYPE_ID, TRANSLATOR_LINK_TYPE_ID} from 'src/common/musicbrainz/constants';
import {addEditNote} from 'src/common/musicbrainz/edit-note';
import {Creator, Creators, IPBaseNumber, workUrl, workVersions} from './acum';
import {linkArtists} from './artists';
import {addWriterRelationship} from './relationships';
import {AddWarning} from './ui/warnings';
import {workEditData} from './ui/work-edit-data';
import {createWork} from './works';

export async function importWork(workId: string, form: HTMLFormElement, addWarning: AddWarning) {
  // map of promises so that we don't fetch the same artist multiple times
  const artistCache = new Map<IPBaseNumber, Promise<ArtistT | null>>();
  const work =
    MB.relationshipEditor.state.entity.entityType == 'work'
      ? MB.relationshipEditor.state.entity
      : createWork({
          name: form.querySelector('[name="edit-work.name"]')?.getAttribute('value') || '',
        });

  const linkWriters = async (
    work: WorkT,
    writers: ReadonlyArray<Creator> | undefined,
    creators: Creators,
    linkTypeId: number
  ) => {
    await linkArtists(
      artistCache,
      writers,
      creators,
      (artist: ArtistT) => addWriterRelationship(work, artist, linkTypeId),
      addWarning
    );
  };

  const versions = await workVersions(workId);
  if (!versions) {
    alert(`failed to find work ID ${workId}`);
    throw new Error(`failed to find work ID ${workId}`);
  }

  await lastValueFrom(
    from(versions)
      .pipe(
        take(1),
        switchMap(async track => {
          const {editData} = await workEditData(work, track, addWarning);
          return [track, editData] as const;
        }),
        tap(([, editData]) => setInput(form, 'name', editData.name, addWarning)),
        tap(([, editData]) => setInput(form, 'comment', editData.comment, addWarning)),
        tap(([, editData]) => setInput(form, 'type_id', String(editData.type_id), addWarning)),
        asyncTap(
          async ([, editData]) =>
            await ensureRowCount(
              form.querySelector('#work-languages-editor')!,
              '[name^="edit-work.languages."]',
              editData.languages.length
            )
        ),
        tap(([, editData]) =>
          editData.languages.forEach((lang, index) => setInput(form, `languages.${index}`, String(lang), addWarning))
        ),
        asyncTap(
          async ([, editData]) =>
            await ensureRowCount(
              form.querySelector('div.form-row-text-list')!,
              '[name^="edit-work.iswcs."]',
              editData.iswcs.length
            )
        ),
        tap(([, editData]) =>
          editData.iswcs.forEach((iswc, index) => setInput(form, `iswcs.${index}`, iswc, addWarning))
        )
      )
      .pipe(
        asyncTap(
          async ([, editData]) =>
            await ensureRowCount(
              form.querySelector('#work-attributes')!,
              '[name^="edit-work.attributes."]',
              2 * editData.attributes.length
            )
        ),
        tap(([, editData]) => {
          editData.attributes.forEach((attr, index) => {
            setInput(form, `attributes.${index}.type_id`, String(attr.type_id), addWarning);
            setInput(form, `attributes.${index}.value`, attr.value, addWarning);
          });
        }),
        switchMap(async ([track]) => {
          await linkWriters(work, track.authors, track.creators, LYRICIST_LINK_TYPE_ID);
          await linkWriters(work, track.composers, track.creators, COMPOSER_LINK_TYPE_ID);
          await linkWriters(work, track.translators, track.creators, TRANSLATOR_LINK_TYPE_ID);
          return track;
        }),
        tap(() => addEditNote(`Imported from ${workUrl(workId)}`, form.ownerDocument))
      )
  );
}

function setInput(form: HTMLFormElement, name: string, value: string, addWarning: AddWarning) {
  const input = form.querySelector<HTMLInputElement | HTMLSelectElement>(`[name="edit-work.${name}"]`);
  if (input) {
    if (input.value.trim() && input.value.trim() !== value.trim()) {
      if (value.trim()) {
        addWarning(`Suggeting different ${name.replace(/\W/g, ' ')}: ${value}`);
      }
    } else {
      input.value = value;
      input.dispatchEvent(new Event('change', {bubbles: true}));
    }
  }
}

async function ensureRowCount(parent: HTMLElement, rowSelector: string, count: number) {
  const rows = parent.querySelectorAll(rowSelector);
  if (rows.length >= count) {
    return;
  }
  const newRowBtn = parent.querySelector<HTMLButtonElement>('button.add-item');
  for (let i = rows.length; i < count; i++) {
    newRowBtn?.click();
  }
  await new Promise<void>(resolve => {
    VM.observe(parent, (mutations, observer) => {
      const rows = parent.querySelectorAll(rowSelector);
      if (rows.length >= count) {
        observer.disconnect();
        resolve();
      }
    });
  });
}
