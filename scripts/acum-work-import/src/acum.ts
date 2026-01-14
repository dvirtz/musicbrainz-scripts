import {AcumWorkType} from '#acum-work-type.ts';
import {tryFetchJSON} from '@repo/fetch/fetch';
import {formatISWC} from '@repo/musicbrainz-ext/format-iswc';
import {filter, lastValueFrom, map, mergeAll, mergeMap, range, startWith, toArray} from 'rxjs';

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

export type WorkBean = Bean<'org.acum.site.searchdb.dto.bean.WorkBean'> & {
  work_id: string;
  fullWorkId: string;
  workNumber: string;
  workLanguage: string;
  workHebName: string;
  workEngName: string;
  workId: string;
  versionNumber: string;
  creators?: Creators;
  authors?: ReadonlyArray<Creator>;
  composers?: ReadonlyArray<Creator>;
  arrangers?: ReadonlyArray<Creator>;
  translators?: ReadonlyArray<Creator>;
  composersAndAuthors?: ReadonlyArray<Creator>;
  versionIswcNumber: string;
  versionEssenceType: string;
  versionId: string;
  isMedley: '0' | '1';
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

export async function workISWCs(workID: string) {
  return (await fetchWork(workID))
    ?.map(albumVersion => albumVersion.versionIswcNumber)
    .filter(iswc => iswc.length > 0)
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

export function workType(track: WorkBean): AcumWorkType {
  const workType = track.original ? track.original.workType : track.workType;
  return stringToEnum(`${workType}${track.versionEssenceType}`, AcumWorkType);
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

const entityCache = new Map<Entity, ReadonlyArray<WorkBean>>();

export async function fetchWorks(entity: Entity): Promise<ReadonlyArray<WorkBean>> {
  if (!entityCache.has(entity)) {
    entityCache.set(entity, await fetchWorksUncached(entity));
  }
  return entityCache.get(entity)!;
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
