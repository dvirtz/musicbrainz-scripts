import {tryFetchJSON} from 'src/common/lib/fetch';

export const enum Entity {
  Album = 'album',
  Work = 'work',
  Version = 'version',
}

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
};

type WorkInfoResponse = Response<{
  type: 'org.acum.site.searchdb.dto.response.GetWorkInfoResponse';
  work: WorkBean;
  workVersionCount: number;
  workVersions: ReadonlyArray<WorkVersion>;
  workAlbumsCount: number;
  workAlbums: ReadonlyArray<AlbumBean>;
}>;

async function fetchWork(workId: string): Promise<ReadonlyArray<WorkBean>> {
  const result = await tryFetchJSON<WorkInfoResponse>(
    `https://nocs.acum.org.il/acumsitesearchdb/getworkinfo?workId=${workId}`
  );
  if (result) {
    if (result.errorCode == 0) {
      return result.data.workVersions ? result.data.workVersions : [result.data.work];
    }

    console.error('failed to fetch work %s: %s', workId, result.errorDescription);
  }

  throw new Error(`failed to fetch work ${workId}`);
}

function versionWorkId(versionId: string) {
  return versionId.substring(0, versionId.length - 3);
}

async function fetchAlbum(albumId: string): Promise<AlbumBean> {
  const result = await tryFetchJSON<AlbumInfoResponse>(
    `https://nocs.acum.org.il/acumsitesearchdb/getalbuminfo?albumId=${albumId}`
  );
  if (result) {
    if (result.errorCode == 0) {
      return result.data.albumBean;
    }

    console.error('failed to fetch album %s: %s', albumId, result.errorDescription);
  }

  throw new Error(`failed to fetch album ${albumId}`);
}

export async function workISWCs(workID: string) {
  const formatISWC = (iswc: string) => iswc.replace(/T(\d{3})(\d{3})(\d{3})(\d)/, 'T-$1.$2.$3-$4');

  return (await fetchWork(workID))
    ?.map(albumVersion => albumVersion.versionIswcNumber)
    .filter(iswc => iswc.length > 0)
    .map(formatISWC);
}

export function trackName(track: WorkBean): string {
  return workLanguage(track) == WorkLanguage.Hebrew ? track.workHebName : track.workEngName;
}

export enum EssenceType {
  LightMusicNoWords = '15', // Light music (without words)
  Song = '30', // Popular song
  Jazz = '40', // Original jazz work
  ChoirSong = '53', // Original song for 4 part choir
  /** @knipignore */
  Unknown = '-1',
}

function stringToEnum<T>(value: string, enumType: {[s: string]: T}): T {
  if (Object.values(enumType).includes(value as T)) {
    return value as T;
  }
  return enumType.Unknown;
}

export function essenceType(track: WorkBean): EssenceType {
  return stringToEnum(track.versionEssenceType, EssenceType);
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

export function replaceUrlWith(entities: Entity[]): (input: string) => [string, Entity | undefined] {
  return (input: string) => {
    try {
      const url = new URL(input);
      if (url.hostname === 'nocs.acum.org.il') {
        return (
          entities
            .map(entity => [url.searchParams.get(`${entity}id`), entity] as const)
            .find((pair): pair is [string, Entity] => !!pair[0]) ?? [input, undefined]
        );
      }
    } catch (e) {
      console.debug('failed to parse URL', input, e);
    }
    return [input, undefined] as const;
  };
}

const entityCache = new Map<string, ReadonlyArray<WorkBean>>();

export async function fetchWorks(entity: Entity, id: string): Promise<ReadonlyArray<WorkBean>> {
  const key = `${entity}:${id}`;
  if (!entityCache.has(key)) {
    entityCache.set(key, await fetchWorksUncached(entity, id));
  }
  return entityCache.get(key)!;
}

async function fetchWorksUncached(entity: Entity, id: string): Promise<ReadonlyArray<WorkBean>> {
  switch (entity) {
    case Entity.Work:
      return await fetchWork(id);
    case Entity.Album:
      return (await fetchAlbum(id))?.tracks;
    case Entity.Version:
      return (await fetchWork(versionWorkId(id))).filter(track => track.fullWorkId === id);
  }
}

export function entityUrl(entity: Entity, id: string) {
  switch (entity) {
    case Entity.Work:
      return `https://nocs.acum.org.il/acumsitesearchdb/work?workId=${id}`;
    case Entity.Album:
      return `https://nocs.acum.org.il/acumsitesearchdb/album?albumid=${id}`;
    case Entity.Version:
      return `https://nocs.acum.org.il/acumsitesearchdb/version?workid=${versionWorkId(id)}&versionid=${id}`;
  }
}
