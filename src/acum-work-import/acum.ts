import {tryFetchJSON} from 'src/common/lib/fetch';

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

export type CreatorFull = CreatorBase<'org.acum.site.searchdb.dto.bean.CreatorFullBean'> & {
  number: string;
};

export type Creators = ReadonlyArray<CreatorFull>;

export type AlbumBean = Bean<'org.acum.site.searchdb.dto.bean.AlbumBean'> & {
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

export type WorkVersion = WorkBean & {
  versionNumber: string;
  creators: Creators;
  authors: ReadonlyArray<Creator>;
  composers: ReadonlyArray<Creator>;
  arrangers: ReadonlyArray<Creator> | undefined;
  translators: ReadonlyArray<Creator> | undefined;
  versionIswcNumber: string;
  versionEssenceType: string;
  albumTrackNumber: string;
};

type WorkBean = Bean<'org.acum.site.searchdb.dto.bean.WorkBean'> & {
  work_id: string;
  fullWorkId: string;
  workNumber: string;
  workLanguage: string;
  workHebName: string;
  workEngName: string;
  workId: string;
};

type WorkInfoResponse = Response<{
  type: 'org.acum.site.searchdb.dto.response.GetWorkInfoResponse';
  work: WorkBean;
  workVersionCount: number;
  workVersions: ReadonlyArray<WorkVersion>;
  workAlbumsCount: number;
  workAlbums: ReadonlyArray<AlbumBean>;
}>;

async function getWorkVersions(workId: string): Promise<ReadonlyArray<WorkVersion> | undefined> {
  const result = await tryFetchJSON<WorkInfoResponse>(
    `https://nocs.acum.org.il/acumsitesearchdb/getworkinfo?workId=${workId}`
  );
  if (result) {
    if (result.errorCode == 0) {
      return result.data.workVersions;
    }

    console.error('failed to fetch work %s: %s', workId, result.errorDescription);
  }
}

export function albumUrl(albumId: string) {
  return `https://nocs.acum.org.il/acumsitesearchdb/album?albumid=${albumId}`;
}

function albumApiUrl(albumId: string) {
  return `https://nocs.acum.org.il/acumsitesearchdb/getalbuminfo?albumId=${albumId}`;
}

export async function getAlbumInfo(albumId: string): Promise<AlbumBean | undefined> {
  const result = await tryFetchJSON<AlbumInfoResponse>(albumApiUrl(albumId));
  if (result) {
    if (result.errorCode == 0) {
      return result.data.albumBean;
    }

    console.error('failed to fetch album %s: %s', albumId, result.errorDescription);
  }
}

export async function workISWCs(workID: string) {
  const formatISWC = (iswc: string) => iswc.replace(/T(\d{3})(\d{3})(\d{3})(\d)/, 'T-$1.$2.$3-$4');

  return (await getWorkVersions(workID))
    ?.map(albumVersion => albumVersion.versionIswcNumber)
    .filter(iswc => iswc.length > 0)
    .map(formatISWC);
}

export function searchName(name: string) {
  return /[א-ת]/.test(name) ? 'workHebName' : 'workEngName';
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

export function essenceType(track: WorkVersion): EssenceType {
  return stringToEnum(track.versionEssenceType, EssenceType);
}

export enum WorkLanguage {
  Hebrew = '1',
  /** @knipignore */
  Unknown = '-1',
}

export function workLanguage(track: WorkVersion): WorkLanguage {
  return stringToEnum(track.workLanguage, WorkLanguage);
}
