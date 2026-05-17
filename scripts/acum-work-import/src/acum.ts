import {AcumWorkType} from '#acum-work-type.ts';
import {tryFetchJSON} from '@repo/fetch/fetch';
import {formatISWC} from '@repo/musicbrainz-ext/format-iswc';
import {executePipeline} from '@repo/rxjs-ext/execute-pipeline';
import {filter, from, ignoreElements, lastValueFrom, map, mergeAll, mergeMap, range, startWith, toArray} from 'rxjs';

export type IPBaseNumber = string;

type Bean<Type extends string> = {
  type: Type;
};

type CreatorBase<Type extends string> = Bean<Type> & {
  creatorHebName: string;
  creatorEngName: string;
  creatorIpBaseNumber: IPBaseNumber;
};

export type Creator = CreatorBase<'org.acum.site.searchdb.dto.bean.CreatorBean'>;

export enum RoleCode {
  Composer = 'C',
  Author = 'A',
  Arranger = 'AR',
  Translator = 'AT',
  ComposerAndAuthor = 'CA',
}

export type CreatorFull = CreatorBase<'org.acum.site.searchdb.dto.bean.CreatorFullBean'> & {
  number: string;
  roleCode: RoleCode;
};

export type Creators = ReadonlyArray<CreatorFull>;

type AlbumBean = Bean<'org.acum.site.searchdb.dto.bean.AlbumBean'> & {
  number: string;
  title: string;
  tracks: ReadonlyArray<WorkVersion>;
};

type InfoResponse<Type extends string> = {
  type: Type;
};

type Response<ResponseData extends InfoResponse<string>> = Readonly<{
  errorCode: number;
  errorDescription: string;
  data: ResponseData;
}>;

type AlbumInfoResponse = Response<{
  type: 'org.acum.site.searchdb.dto.response.GetAlbumInfoResponse';
  albumBean: AlbumBean;
}>;

type WorkVersion = WorkBean & {
  albumTrackNumber: string;
};

type Flag = '0' | '1';

export type WorkBean = Bean<'org.acum.site.searchdb.dto.bean.WorkBean'> & {
  work_id: string;
  fullWorkId: string;
  workNumber: string;
  workLanguage: string;
  workHebName: string;
  workEngName: string;
  workId?: string;
  versionNumber: string;
  creators?: Creators;
  authors?: ReadonlyArray<Creator>;
  composers?: ReadonlyArray<Creator>;
  arrangers?: ReadonlyArray<Creator>;
  translators?: ReadonlyArray<Creator>;
  composersAndAuthors?: ReadonlyArray<Creator>;
  versionIswcNumber?: string;
  versionEssenceType?: string;
  versionId: string;
  isMedley: Flag;
  isTranslated: Flag;
  list?: ReadonlyArray<MedleyVersionBean>;
  original?: TranslatedOriginalVersion;
  workType?: string;
};

type TranslatedOriginalVersion = Bean<'org.acum.site.searchdb.dto.bean.TranslatedOriginalVersionBean'> & {
  workType: string;
  versionId: string;
  workId: string;
};

type MedleyVersionBean = Bean<'org.acum.site.searchdb.dto.bean.MedleyVersionBean'> & {
  id: string;
  workId: string;
};

type WorkInfoPageResponseData = {
  type: 'org.acum.site.searchdb.dto.response.GetWorkInfoResponse';
  workVersionCount: number;
  workVersions: ReadonlyArray<WorkVersion>;
};

type WorkInfoPageResponse = Response<WorkInfoPageResponseData>;

type WorkInfoResponse = Response<
  WorkInfoPageResponseData & {
    work: WorkBean;
    workAlbumsCount: number;
    workAlbums: ReadonlyArray<AlbumBean>;
  }
>;

const baseUrl = 'https://nocs.acum.org.il/acumsitesearchdb';
// cSpell:ignoreRegExp `\${baseUrl}\/[^`]*`

async function fetchWork(workId: string, versionId?: string): Promise<ReadonlyArray<WorkBean>> {
  const result = await tryFetchJSON<WorkInfoResponse>(
    `${baseUrl}/getworkinfo?workId=${workId}${versionId ? `&versionId=${versionId}` : ''}`
  );
  if (result) {
    if (result.errorCode == 0) {
      if (result.data.workVersions) {
        if (result.data.workVersions.length == result.data.workVersionCount) {
          return result.data.workVersions;
        } else {
          return await lastValueFrom(
            range(2, Math.ceil(result.data.workVersionCount / result.data.workVersions.length) - 1).pipe(
              mergeMap(
                async pageNumber =>
                  await tryFetchJSON<WorkInfoPageResponse>(
                    `${baseUrl}/getworkinfo?workId=${workId}&pageNumber=${pageNumber}`
                  )
              ),
              filter(
                (page: WorkInfoPageResponse | null): page is WorkInfoPageResponse =>
                  page !== null && page.errorCode == 0
              ),
              map(page => page.data.workVersions),
              startWith(result.data.workVersions),
              mergeAll(),
              toArray()
            )
          );
        }
      } else {
        return [result.data.work];
      }
    }

    console.error('failed to fetch work %s: %s', workId, result.errorDescription);
  }

  throw new Error(`failed to fetch work ${workId}`);
}

function versionWorkId(versionId: string) {
  return versionId.substring(0, 7);
}

async function fetchAlbum(albumId: string): Promise<AlbumBean> {
  const result = await tryFetchJSON<AlbumInfoResponse>(`${baseUrl}/getalbuminfo?albumId=${albumId}`);
  if (result) {
    if (result.errorCode == 0) {
      return result.data.albumBean;
    }

    console.error('failed to fetch album %s: %s', albumId, result.errorDescription);
  }

  throw new Error(`failed to fetch album ${albumId}`);
}

export async function workISWCs(work: WorkBean) {
  return (work.isTranslated === '1' ? [] : await fetchWorks(new Entity(workId(work), 'Work')))
    ?.map(albumVersion => albumVersion.versionIswcNumber)
    .filter((iswc): iswc is string => iswc !== undefined && iswc.length > 0)
    .map(formatISWC);
}

export function trackName(track: WorkBean): string {
  return workLanguage(track) == WorkLanguage.Hebrew ? track.workHebName : track.workEngName;
}

function stringToEnum<T>(value: string, enumType: {[s: string]: T}): T {
  if (Object.values(enumType).includes(value as T)) {
    return value as T;
  }
  return enumType.Unknown!;
}

export async function workType(track: WorkBean): Promise<AcumWorkType> {
  if (track.isMedley == '1' && track.list && track.list[0]) {
    const medleyVersion = track.list[0];
    const medleyWorks = await fetchWorks(new Version(medleyVersion.id, medleyVersion.workId));
    if (medleyWorks[0]) {
      return await workType(medleyWorks[0]);
    }

    return AcumWorkType.Unknown;
  }

  const originalWorkType = track.original ? track.original.workType : track.workType;
  return stringToEnum(`${originalWorkType}${track.versionEssenceType}`, AcumWorkType);
}

export enum WorkLanguage {
  Hebrew = '1',
  Foreign = '2',
  /** @knipignore */
  Unknown = '-1',
}

export function workLanguage(track: WorkBean): WorkLanguage {
  return stringToEnum(track.workLanguage, WorkLanguage);
}

export type EntityT = 'Work' | 'Album' | 'Version';

const latestAcumDataStorageKey = 'acum-work-import';

type StoredEntity = Readonly<{
  entityType: EntityT;
  id: string;
  workId?: string;
}>;

type StoredAcumData = Readonly<{
  version: 1;
  savedAt: string;
  sourceEntity: StoredEntity;
  worksByEntity: Readonly<Record<string, ReadonlyArray<WorkBean>>>;
}>;

export class Entity<T extends EntityT = EntityT> {
  constructor(
    readonly id: string,
    readonly entityType: T
  ) {}

  toString(): string {
    return this.id;
  }
}

export class Version<T extends EntityT = 'Version'> extends Entity<T> {
  constructor(
    readonly id: string,
    readonly workId: string,
    readonly entityType: T = 'Version' as T
  ) {
    super(id, entityType);
  }
}

function entityCacheKey(entity: Entity) {
  if (entity.entityType === 'Version') {
    const version = entity as Version;
    return `${entity.entityType}:${entity.id}:${version.workId ?? versionWorkId(entity.id)}`;
  }

  return `${entity.entityType}:${entity.id}`;
}

function parseEntityCacheKey(key: string): Entity | undefined {
  const [entityType, id, workId] = key.split(':');
  if (!entityType || !id || !['Work', 'Album', 'Version'].includes(entityType)) {
    return;
  }
  const typedEntityType = entityType as EntityT;

  if (typedEntityType === 'Version') {
    return new Version(id, workId ?? versionWorkId(id));
  }

  return new Entity(id, typedEntityType);
}

function serializeEntity(entity: Entity): StoredEntity {
  if (entity.entityType === 'Version') {
    const version = entity as Version;
    return {
      entityType: entity.entityType,
      id: entity.id,
      workId: version.workId ?? versionWorkId(entity.id),
    };
  }

  return {
    entityType: entity.entityType,
    id: entity.id,
  };
}

function deserializeEntity(entity: StoredEntity): Entity | undefined {
  if (!entity.id || !['Work', 'Album', 'Version'].includes(entity.entityType)) {
    return;
  }

  if (entity.entityType === 'Version') {
    return new Version(entity.id, entity.workId ?? versionWorkId(entity.id));
  }

  return new Entity(entity.id, entity.entityType);
}

async function readStoredAcumData(): Promise<StoredAcumData | undefined> {
  try {
    const parsed = await GM.getValue<StoredAcumData>(latestAcumDataStorageKey);
    if (parsed.version !== 1 || !parsed.sourceEntity || !parsed.worksByEntity) {
      return;
    }
    return parsed;
  } catch (err) {
    console.debug('failed to parse stored ACUM data', err);
    return;
  }
}

async function prefetchRelatedWorks(works: ReadonlyArray<WorkBean>): Promise<void> {
  await executePipeline(
    from(works).pipe(
      mergeMap(work =>
        from(work.list ?? []).pipe(
          map(medleyVersion => new Version(medleyVersion.id, medleyVersion.workId)),
          startWith(new Entity(work.workId || work.fullWorkId, 'Work'))
        )
      ),
      mergeMap(fetchWorks),
      ignoreElements()
    )
  );
}

export async function saveLatestEntityData(entity: Entity): Promise<number> {
  entityCache.clear();

  const works = await fetchWorks(entity);
  await prefetchRelatedWorks(works);

  const payload: StoredAcumData = {
    version: 1,
    savedAt: new Date().toISOString(),
    sourceEntity: serializeEntity(entity),
    worksByEntity: Object.fromEntries(entityCache.entries()),
  };

  await GM.setValue(latestAcumDataStorageKey, payload);
  return works.length;
}

export async function loadLatestEntityData(entityTypes?: ReadonlyArray<EntityT>): Promise<Entity | undefined> {
  const stored = await readStoredAcumData();
  if (!stored) {
    return;
  }

  const entity = deserializeEntity(stored.sourceEntity);
  if (!entity) {
    return;
  }

  if (entityTypes && !entityTypes.includes(entity.entityType)) {
    return;
  }

  entityCache.clear();
  for (const [key, works] of Object.entries(stored.worksByEntity)) {
    const parsedEntity = parseEntityCacheKey(key);
    if (parsedEntity && works) {
      entityCache.set(entityCacheKey(parsedEntity), works);
    }
  }

  return entity;
}

export function replaceUrlWith<T extends EntityT>(input: string): Entity<T> | undefined {
  try {
    const url = new URL(input);
    if (url.hostname === 'nocs.acum.org.il') {
      const versionId = url.searchParams.get('versionid');
      if (versionId) {
        return new Version<T>(versionId, url.searchParams.get('workid') ?? versionWorkId(versionId));
      }
      return ['Album', 'Work']
        .map(entityType => [entityType, url.searchParams.get(`${entityType.toLowerCase()}id`)] as const)
        .filter((pair): pair is [T, string] => !!pair[1])
        .map(([entityType, id]) => {
          if (entityType === 'Version') {
            return new Version<T>(id, url.searchParams.get('workid') ?? versionWorkId(id));
          }
          return new Entity<T>(id, entityType);
        })
        .at(0);
    }
  } catch (e) {
    console.debug('failed to parse URL', input, e);
  }
}

const entityCache = new Map<string, ReadonlyArray<WorkBean>>();

export async function fetchWorks(entity: Entity): Promise<ReadonlyArray<WorkBean>> {
  const key = entityCacheKey(entity);
  if (!entityCache.has(key)) {
    entityCache.set(key, await fetchWorksUncached(entity));
  }
  return entityCache.get(key)!;
}

async function fetchWorksUncached(entity: Entity): Promise<ReadonlyArray<WorkBean>> {
  switch (entity.entityType) {
    case 'Work':
      return await fetchWork(entity.id);
    case 'Album':
      return (await fetchAlbum(entity.id))?.tracks;
    case 'Version': {
      // only add versionId if it does not start with workId (usually for translated versions)
      const workId = (entity as Version).workId ?? versionWorkId(entity.id);
      if (entity.id.startsWith(workId)) {
        // call fetchWorks so that the work is cached
        return (await fetchWorks(new Entity(workId, 'Work'))).filter(track => track.versionId === entity.id);
      }
      return await fetchWork(workId, entity.id);
    }
  }
}

export function entityUrl(entity: Entity) {
  switch (entity.entityType) {
    case 'Work':
      return `${baseUrl}/work?workid=${entity.id}`;
    case 'Album':
      return `${baseUrl}/album?albumid=${entity.id}`;
    case 'Version':
      return `${baseUrl}/version?workid=${versionWorkId(entity.id)}&versionid=${entity.id}`;
  }
}

export function creatorUrl(creator: CreatorBase<string>) {
  return `${baseUrl}/results?creatorid=${creator.creatorIpBaseNumber}`;
}

export function workId(work: WorkBean) {
  return work.isTranslated === '1' ? work.versionId : work.workId || work.fullWorkId;
}
