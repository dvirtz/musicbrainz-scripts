import {AlbumBean, getAlbumInfo} from './acum';

const albumCache = new Map<string, AlbumBean>();

export async function albumInfo(albumId: string): Promise<AlbumBean> {
  if (!albumCache.has(albumId)) {
    const albumInfo = await getAlbumInfo(albumId);
    if (albumInfo) {
      albumCache.set(albumId, albumInfo);
    } else {
      alert(`failed to find album ID ${albumId}`);
      throw new Error(`failed to find album ID ${albumId}`);
    }
  }
  return albumCache.get(albumId)!;
}
