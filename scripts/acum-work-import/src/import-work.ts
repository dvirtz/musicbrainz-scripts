import {Entity, entityUrl, fetchWorks, IPBaseNumber, Version, WorkBean} from '#acum.ts';
import {updateMedleyWorkRelationship} from '#relationships.ts';
import {shouldSearchWorks} from '#ui/settings.tsx';
import {AddWarning} from '#ui/warnings.tsx';
import {addWorkEditor} from '#ui/work-editor.tsx';
import {workEditData} from '#work-edit-data.ts';
import {createNewWork, createWork, findWork, linkWriters, workLink} from '#works.ts';
import {compareInsensitive, compareTargetTypeWithGroup} from '@repo/musicbrainz-ext/compare';
import {MEDLEY_OF_LINK_TYPE_ID, REL_STATUS_ADD} from '@repo/musicbrainz-ext/constants';
import {addEditNote} from '@repo/musicbrainz-ext/edit-note';
import {findTargetTypeGroups, iterateRelationshipsInTargetTypeGroup} from '@repo/musicbrainz-ext/type-group';
import {executePipeline} from '@repo/rxjs-ext/execute-pipeline';
import {waitForElement} from '@repo/rxjs-ext/wait-for-element';
import {filter, from, lastValueFrom, map, mergeMap, scan, tap, toArray, zip} from 'rxjs';
import {Setter} from 'solid-js';
import {isNonReleaseRelationshipEditor} from 'typedbrainz';
import {ArtistT, RelationshipStateT, WorkAttributeT, WorkT} from 'typedbrainz/types';

export async function importWork(
  entity: Entity<'Work' | 'Version'>,
  form: HTMLFormElement,
  addWarning: AddWarning,
  setProgress: Setter<readonly [number, string]>
) {
  setProgress([0, 'Importing work']);

  // map of promises so that we don't fetch the same artist multiple times
  const artistCache = new Map<IPBaseNumber, Promise<ArtistT | null>>();
  const work =
    MB?.relationshipEditor.state?.entity.entityType == 'work'
      ? MB.relationshipEditor.state.entity
      : createWork({
          name: form.querySelector('[name="edit-work.name"]')?.getAttribute('value') || '',
        });

  const versions = await fetchWorks(entity);
  if (versions.length === 0) {
    alert(`failed to find work ID ${entity.id}`);
    throw new Error(`failed to find work ID ${entity.id}`);
  }

  if (await shouldSearchWorks()) {
    const existingWork = await findWork(versions[0]!);
    if (
      existingWork &&
      existingWork.id != MB?.relationshipEditor.state?.entity.id &&
      window.confirm('This work already exists in Musicbrainz, click "ok" to redirect to its page')
    ) {
      window.location.href = `/work/${existingWork.gid}`;
    }
  }

  const version = versions[0]!;

  if (version.isMedley === '1') {
    const workCount = version.list!.length + 1;
    await executePipeline(
      from(version.list ?? []).pipe(
        mergeMap(async medleyVersion => await fetchWorks(new Version(medleyVersion.id, medleyVersion.workId))),
        filter((works): works is NonEmptyArray<WorkBean> => works.length > 0),
        map(medleyWorks => medleyWorks[0]),
        mergeMap(
          async medleyWork =>
            await addMedleyWork(
              work,
              medleyWork,
              version.list!.findIndex(version => version.workId == medleyWork.workId) + 1,
              addWarning
            )
        ),
        scan(accumulator => accumulator + 1, 0),
        tap(count => setProgress([count / workCount, `Loaded ${count}/${workCount} works`]))
      )
    );
  }

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
    version,
    addWarning
  );

  setInput(form, 'name', editData.name, addWarning);
  setInput(form, 'comment', editData.comment, addWarning);
  setInput(form, 'type_id', String(editData.type_id), addWarning);

  await ensureRowCount(
    form.querySelector('#work-languages-editor')!,
    '[name^="edit-work.languages."]',
    editData.languages.length
  );

  editData.languages.forEach((lang, index) => setInput(form, `languages.${index}`, String(lang), addWarning));
  await ensureRowCount(
    form.querySelector('div.form-row-text-list')!,
    '[name^="edit-work.iswcs."]',
    editData.iswcs.length
  );

  editData.iswcs.forEach((iswc, index) => setInput(form, `iswcs.${index}`, iswc, addWarning));

  await ensureRowCount(
    form.querySelector('#work-attributes')!,
    '[name^="edit-work.attributes."][name$=type_id]',
    editData.attributes.length
  );
  editData.attributes.forEach((attr, index) => {
    setInput(form, `attributes.${index}.type_id`, String(attr.type_id), addWarning);
    setInput(form, `attributes.${index}.value`, attr.value, addWarning);
  });

  await linkWriters(
    artistCache,
    version,
    work,
    findTargetTypeGroups(MB?.relationshipEditor.state?.existingRelationshipsBySource ?? null, work),
    addWarning
  );

  setProgress([1, 'Done']);
  addEditNote(`Imported from ${entityUrl(entity)}`, form.ownerDocument);
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
    new MutationObserver((_mutations, observer) => {
      const rows = parent.querySelectorAll(rowSelector);
      if (rows.length >= count) {
        observer.disconnect();
        resolve();
      }
    }).observe(parent, {childList: true, subtree: true});
  });
  for (let i = rows.length; i < count; i++) {
    newRowBtn?.click();
  }
  await observer;
}

async function linkMedleyWork(work: WorkT, medleyWork: WorkT, linkOrder: number) {
  updateMedleyWorkRelationship(REL_STATUS_ADD, linkOrder, work, medleyWork);

  // wait for the work link to be added
  const href = workLink(medleyWork);
  await waitForElement((node): node is HTMLAnchorElement => {
    return node instanceof HTMLAnchorElement && node.getAttribute('href') === href;
  });
}

export function medleyWorkRelationships(): RelationshipStateT[] | undefined {
  if (MB && MB.tree && isNonReleaseRelationshipEditor(MB.relationshipEditor)) {
    const typeGroups = findTargetTypeGroups(
      MB?.relationshipEditor.state?.relationshipsBySource,
      MB.relationshipEditor.state.entity
    );
    if (typeGroups) {
      const targetTypeGroups = MB.tree.find(typeGroups, 'work', compareTargetTypeWithGroup, null);
      if (targetTypeGroups) {
        return iterateRelationshipsInTargetTypeGroup(targetTypeGroups)
          .filter(rel => rel.linkTypeID == MEDLEY_OF_LINK_TYPE_ID)
          .toArray();
      }
    }
  }
}

async function addMedleyWork(work: WorkT, medleyWork: WorkBean, linkOrder: number, addWarning: AddWarning) {
  const newWork = await (async () => {
    const linkedWork = medleyWorkRelationships()?.find(rel => rel.linkOrder == linkOrder);
    if (linkedWork) {
      return linkedWork.entity1 as WorkT;
    }
    const newWork = await createNewWork(medleyWork);
    await linkMedleyWork(work, newWork, linkOrder);
    return newWork;
  })();
  const {editData, originalEditData} = await workEditData(newWork, medleyWork, addWarning);
  const parent = document.querySelector(`.medley-of .relationship-item:nth-child(${linkOrder})`);
  if (parent) {
    await addWorkEditor(newWork, editData, originalEditData, parent);
  }
}
