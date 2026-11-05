import {MessageWarning} from '#warning.ts';
import type {WarningStore} from '#warning-store.ts';
import {Entity, entityUrl, fetchWorks, Version, WorkBean, workEntity} from '#acum.ts';
import {ArtistLookupCache} from '#artists.ts';
import {linkWriters} from '#link-artists.ts';
import {updateMedleyWorkRelationship} from '#relationships.ts';
import {addExternalLink} from '#ui/add-external-link.ts';
import {shouldSearchWorks} from '#ui/settings.tsx';

import {addWorkEditor} from '#ui/work-editor.tsx';
import {workEditData, workFormAttributes} from '#work-edit-data.ts';
import {createNewWork, createWork, findWork} from '#works.ts';
import {compareInsensitive, compareTargetTypeWithGroup} from '@repo/musicbrainz-ext/compare';
import {MEDLEY_OF_LINK_TYPE_ID, REL_STATUS_ADD} from '@repo/musicbrainz-ext/constants';
import {addEditNote} from '@repo/musicbrainz-ext/edit-note';
import {findTargetTypeGroups, iterateRelationshipsInTargetTypeGroup} from '@repo/musicbrainz-ext/type-group';
import {executePipeline} from '@repo/rxjs-ext/execute-pipeline';
import {waitForElement} from '@repo/rxjs-ext/wait-for-element';
import {filter, from, map, mergeMap, scan, tap} from 'rxjs';
import {Setter} from 'solid-js';
import {isNonReleaseRelationshipEditor} from 'typedbrainz';
import {RelationshipStateT, WorkAttributeT, WorkT} from 'typedbrainz/types';

export async function importWork(
  entity: Entity<'Work' | 'Version'>,
  form: HTMLFormElement,
  warningStore: WarningStore,
  setProgress: Setter<readonly [number, string]>
) {
  setProgress([0, 'Importing work']);

  // map of promises so that we don't fetch the same artist multiple times
  const artistCache: ArtistLookupCache = new Map();
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
    const existingWork = await findWork(versions[0]!, artistCache);
    if (
      existingWork &&
      existingWork.id != MB?.relationshipEditor.state?.entity.id &&
      window.confirm('This work already exists in Musicbrainz, click "ok" to redirect to its page')
    ) {
      window.location.href = `/work/${existingWork.gid}`;
      return;
    }
  }

  const version = versions[0]!;

  // needs to be before medley works are added
  // otherwise the attribute selectors will match the medley attributes
  const {editData} = await workEditData(
    {
      ...work,
      // the attributes are rendered in a different order
      attributes: workFormAttributes(form).map(
        attr => ({typeID: attr.type_id, value: attr.value, value_id: attr.value_id}) as WorkAttributeT
      ),
    },
    version,
    warningStore
  );

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
              artistCache,
              warningStore
            )
        ),
        scan(accumulator => accumulator + 1, 0),
        tap(count => setProgress([count / workCount, `Loaded ${count}/${workCount} works`]))
      )
    );
  }

  setInput(form, 'name', editData.name, warningStore);
  setInput(form, 'comment', editData.comment, warningStore);
  setInput(form, 'type_id', String(editData.type_id), warningStore);

  await ensureRowCount(
    form.querySelector('#work-languages-editor')!,
    '[name^="edit-work.languages."]',
    editData.languages.length
  );

  editData.languages.forEach((lang, index) => setInput(form, `languages.${index}`, String(lang), warningStore));
  await ensureRowCount(
    form.querySelector('div.form-row-text-list')!,
    '[name^="edit-work.iswcs."]',
    editData.iswcs.length
  );

  editData.iswcs.forEach((iswc, index) => setInput(form, `iswcs.${index}`, iswc, warningStore));

  await ensureRowCount(
    form.querySelector('#work-attributes')!,
    '[name^="edit-work.attributes."][name$=type_id]',
    editData.attributes.length
  );
  editData.attributes.forEach((attr, index) => {
    setInput(form, `attributes.${index}.type_id`, String(attr.type_id), warningStore);
    setInput(
      form,
      `attributes.${index}.value`,
      attr.value_id === null ? attr.value : String(attr.value_id),
      warningStore
    );
  });

  await linkWriters(artistCache, {work, track: version}, warningStore);

  const acumWork = workEntity(version);
  if (acumWork.entityType === 'Version') {
    warningStore.add(
      new MessageWarning(
        'The MusicBrainz work editor does not support ACUM version URLs; the translation URL was not added'
      )
    );
  } else {
    await addExternalLink(form.ownerDocument, entityUrl(acumWork));
  }
  setProgress([1, 'Done']);
  addEditNote(`Imported from ${entityUrl(entity)}`, form.ownerDocument);
}

function setInput(form: HTMLFormElement, name: string, value: string, warningStore: WarningStore) {
  const input = form.querySelector<HTMLInputElement | HTMLSelectElement>(`[name="edit-work.${name}"]`);
  if (input) {
    if (input.value.trim()) {
      if (value.trim() && compareInsensitive(input.value.trim(), value.trim()) !== 0) {
        warningStore.add(new MessageWarning(`Suggesting different ${name.replace(/\W/g, ' ')}: ${value}`));
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

function linkMedleyWork(work: WorkT, medleyWork: WorkT, linkOrder: number) {
  updateMedleyWorkRelationship(REL_STATUS_ADD, linkOrder, work, medleyWork);
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

async function addMedleyWork(
  work: WorkT,
  medleyWork: WorkBean,
  linkOrder: number,
  artistCache: ArtistLookupCache,
  warningStore: WarningStore
) {
  const newWork = await (async () => {
    const linkedWork = medleyWorkRelationships()?.find(rel => rel.linkOrder == linkOrder);
    if (linkedWork) {
      return linkedWork.entity1 as WorkT;
    }
    const result = await createNewWork(medleyWork, warningStore, artistCache);
    linkMedleyWork(work, result, linkOrder);
    return result;
  })();
  await addWorkEditor({
    getParent: async (href: string) => {
      const anchor =
        document.querySelector<HTMLAnchorElement>(`a[href="${href}"]`) ??
        (await waitForElement(
          (node): node is HTMLAnchorElement => node instanceof HTMLAnchorElement && node.getAttribute('href') === href
        ));
      return anchor!.closest('.relationship-item')!;
    },
    getElementsToReplace: () => [],
    context: {work: newWork, track: medleyWork},
    warningStore,
    artistCache,
    shouldLinkArrangers: false,
  });
}
