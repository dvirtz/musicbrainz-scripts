import {filter, firstValueFrom, from, lastValueFrom, map, switchMap, take, tap, toArray, zip} from 'rxjs';
import {asyncTap} from 'src/common/lib/async-tap';
import {compareInsensitive} from 'src/common/lib/compare';
import {executePipeline} from 'src/common/lib/execute-pipeline';
import {addEditNote} from 'src/common/musicbrainz/edit-note';
import {Entity, entityUrl, fetchWorks, IPBaseNumber} from './acum';
import {addWriterRelationship} from './relationships';
import {shouldSearchWorks} from './ui/settings';
import {AddWarning} from './ui/warnings';
import {workEditData} from './ui/work-edit-data';
import {createWork, findWork, linkWriters} from './works';

export async function importWork(entity: Entity<'Work' | 'Version'>, form: HTMLFormElement, addWarning: AddWarning) {
  // map of promises so that we don't fetch the same artist multiple times
  const artistCache = new Map<IPBaseNumber, Promise<ArtistT | null>>();
  const work =
    MB.relationshipEditor.state.entity.entityType == 'work'
      ? MB.relationshipEditor.state.entity
      : createWork({
          name: form.querySelector('[name="edit-work.name"]')?.getAttribute('value') || '',
        });

  const versions = await fetchWorks(entity);
  if (!versions) {
    alert(`failed to find work ID ${entity.id}`);
    throw new Error(`failed to find work ID ${entity.id}`);
  }

  if (shouldSearchWorks()) {
    const existingWork = await firstValueFrom(
      from(versions).pipe(
        switchMap(async track => await findWork(track)),
        filter(work => work !== undefined)
      ),
      {
        defaultValue: undefined,
      }
    );
    if (existingWork && window.confirm('This work already exists in Musicbrainz, click "ok" to redirect to its page')) {
      window.location.href = `/work/${existingWork.gid}`;
    }
  }

  await executePipeline(
    from(versions)
      .pipe(
        take(1),
        switchMap(async track => {
          const {editData} = await workEditData(
            Object.assign(work, {
              // the attributes are rendered in a different order
              attributes: await lastValueFrom(
                zip(
                  from(form.querySelectorAll<HTMLInputElement>('[name^="edit-work.attributes."][name$=type_id]')),
                  from(form.querySelectorAll<HTMLInputElement>('[name^="edit-work.attributes."][name$=value]'))
                ).pipe(
                  filter(([type, value]) => type.value.length > 0 && value.value.length > 0),
                  map(
                    ([type, value]) =>
                      ({
                        typeID: Number(type.value),
                        value: value.value,
                      }) as WorkAttributeT
                  ),
                  toArray()
                )
              ),
            }),
            track,
            addWarning
          );
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
              '[name^="edit-work.attributes."][name$=type_id]',
              editData.attributes.length
            )
        ),
        tap(([, editData]) => {
          editData.attributes.forEach((attr, index) => {
            setInput(form, `attributes.${index}.type_id`, String(attr.type_id), addWarning);
            setInput(form, `attributes.${index}.value`, attr.value, addWarning);
          });
        }),
        asyncTap(async ([track]) => {
          await linkWriters(
            artistCache,
            track,
            (artist: ArtistT, linkTypeId: number) => addWriterRelationship(work, artist, linkTypeId),
            addWarning
          );
        }),
        tap(() => addEditNote(`Imported from ${entityUrl(entity)}`, form.ownerDocument))
      )
  );
}

function setInput(form: HTMLFormElement, name: string, value: string, addWarning: AddWarning) {
  const input = form.querySelector<HTMLInputElement | HTMLSelectElement>(`[name="edit-work.${name}"]`);
  if (input) {
    if (input.value.trim()) {
      if (value.trim() && compareInsensitive(input.value.trim(), value.trim()) !== 0) {
        addWarning(`Suggesting different ${name.replace(/\W/g, ' ')}: ${value}`);
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
  const observer = new Promise<void>(resolve => {
    VM.observe(parent, (mutations, observer) => {
      const rows = parent.querySelectorAll(rowSelector);
      if (rows.length >= count) {
        observer.disconnect();
        resolve();
      }
    });
  });
  for (let i = rows.length; i < count; i++) {
    newRowBtn?.click();
  }
  await observer;
}
