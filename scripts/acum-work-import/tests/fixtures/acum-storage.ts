import {UserscriptPage} from '@repo/test-support/userscript-page';
import {readFile} from 'node:fs/promises';

type SourceEntity = {
  entityType: 'Album' | 'Version' | 'Work';
  id: string;
  workId?: string;
};

type StoredAcumData = {
  version: 1;
  savedAt: string;
  sourceEntity: SourceEntity;
  worksByEntity: Record<string, unknown>;
};

const storageKey = 'acum-work-import';

function sourceEntityFromUrl(url: string): SourceEntity {
  const parsedUrl = new URL(url);
  const versionId = parsedUrl.searchParams.get('versionid');
  if (versionId) {
    return {
      entityType: 'Version',
      id: versionId,
      workId: parsedUrl.searchParams.get('workid') ?? versionId.slice(0, -3),
    };
  }

  const albumId = parsedUrl.searchParams.get('albumid');
  if (albumId) {
    return {
      entityType: 'Album',
      id: albumId,
    };
  }

  const workId = parsedUrl.searchParams.get('workid');
  if (workId) {
    return {
      entityType: 'Work',
      id: workId,
    };
  }

  throw new Error(`Unable to infer ACUM source entity from ${url}`);
}

export async function seedAcumStorageFromUrl(userscriptPage: UserscriptPage, fixtureName: string, sourceUrl: string) {
  const sourceEntity = sourceEntityFromUrl(sourceUrl);
  const fixtureUrl = new URL(`./acum-data/${fixtureName}`, import.meta.url);
  const fixtureText = await readFile(fixtureUrl, 'utf8');
  const storedData = JSON.parse(fixtureText.replace(/^\uFEFF/, '')) as StoredAcumData;
  const payload: StoredAcumData = {
    ...storedData,
    sourceEntity: sourceEntity ?? storedData.sourceEntity,
  };

  const currentValue = await userscriptPage.page.evaluate(key => localStorage.getItem(key), storageKey);
  if (currentValue) {
    const currentData = JSON.parse(currentValue) as StoredAcumData;
    payload.sourceEntity = currentData.sourceEntity;
    payload.worksByEntity = {
      ...currentData.worksByEntity,
      ...payload.worksByEntity,
    };
  }

  await userscriptPage.setLocalStorage(storageKey, JSON.stringify(payload));
}
