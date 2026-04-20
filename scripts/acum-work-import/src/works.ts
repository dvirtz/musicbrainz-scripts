import {trackName, WorkBean, workId, workISWCs} from '#acum.ts';
import {shouldSearchWorks} from '#ui/settings.tsx';
import {assertMB} from '@repo/musicbrainz-ext/asserts';
import {fetchJSON, tryFetchJSON} from '@repo/musicbrainz-ext/fetch';
import {formatISWC} from '@repo/musicbrainz-ext/format-iswc';
import {IswcLookupResultsT, WorkLookupResultT, WorkSearchResultsT} from '@repo/musicbrainz-ext/search-results';
import {defaultIfEmpty, filter, firstValueFrom, from, mergeMap} from 'rxjs';
import {WorkT} from 'typedbrainz/types';

const workCache = new Map<string, WorkT>();

export async function findWork(track: WorkBean) {
  const workGid = await (async () => {
    for (const iswc of await workISWCs(track)) {
      const byIswc = await tryFetchJSON<IswcLookupResultsT>(`/ws/2/iswc/${formatISWC(iswc)}?fmt=json`);
      if (byIswc && byIswc['work-count'] > 0) {
        return byIswc.works[0]!.id;
      }
    }

    const byName = await fetchJSON<WorkSearchResultsT>(`/ws/2/work?query=work:"${trackName(track)}"&fmt=json`);
    if (byName && byName.count > 0) {
      const matchingWork = await firstValueFrom(
        from(byName.works).pipe(
          mergeMap(async work => await fetchJSON<WorkLookupResultT>(`/ws/2/work/${work.id}`)),
          filter(
            work => work.attributes.find(attr => attr.type === 'ACUM ID' && attr.value === workId(track)) !== undefined
          ),
          defaultIfEmpty(undefined)
        )
      );
      return matchingWork?.id;
    }
  })();

  if (workGid) {
    const work = await fetchJSON<WorkT>(`/ws/js/entity/${workGid}`);
    workCache.set(workGid, work);
    return work;
  }

  return undefined;
}

export async function createNewWork(track: WorkBean): Promise<WorkT> {
  assertMB(MB);

  const newWork = await (async () => {
    const id = workId(track);
    if (workCache.has(id)) {
      return workCache.get(id)!;
    }
    if (await shouldSearchWorks()) {
      const existingWork = await findWork(track);
      if (existingWork) {
        return existingWork;
      }
    }
    const newWork = createWork({
      _fromBatchCreateWorksDialog: true,
      name: trackName(track),
    });
    workCache.set(id, newWork);
    return newWork;
  })();
  MB.linkedEntities.work[newWork.id] = newWork;
  return newWork;
}

export function createWork(attributes: Partial<WorkT>): WorkT {
  return {
    artists: [],
    attributes: [],
    comment: '',
    editsPending: false,
    entityType: 'work',
    gid: '',
    iswcs: [],
    languages: [],
    last_updated: null,
    name: '',
    typeID: null,
    authors: [],
    other_artists: [],
    ...attributes,
    id: MB?.relationshipEditor.getRelationshipStateId(null) ?? 0,
  };
}

export function isNewWork(work: WorkT) {
  return !work.gid;
}

export function workLink(work: WorkT) {
  return isNewWork(work) ? `#new-work-${work.id}` : `/work/${work.gid}`;
}
