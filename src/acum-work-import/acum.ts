import {tryFetch} from '../common/try-fetch';

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

type CreatorFull = CreatorBase<'org.acum.site.searchdb.dto.bean.CreatorFullBean'> & {
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

export async function getWorkVersions(workId: string): Promise<ReadonlyArray<WorkVersion> | undefined> {
  const result = await tryFetch(`https://nocs.acum.org.il/acumsitesearchdb/getworkinfo?workId=${workId}`);
  if (result) {
    const response = result as WorkInfoResponse;
    if (response.errorCode == 0) {
      return response.data.workVersions;
    }

    console.error('failed to fetch work %s: %s', workId, response.errorDescription);
  }
}

export function albumUrl(albumId: string) {
  return `https://nocs.acum.org.il/acumsitesearchdb/getalbuminfo?albumId=${albumId}`;
}

export async function getAlbumInfo(albumId: string): Promise<AlbumBean | undefined> {
  const result = await tryFetch(albumUrl(albumId));
  if (result) {
    const response = result as AlbumInfoResponse;
    if (response.errorCode == 0) {
      return response.data.albumBean;
    }

    console.error('failed to fetch album %s: %s', albumId, response.errorDescription);
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
