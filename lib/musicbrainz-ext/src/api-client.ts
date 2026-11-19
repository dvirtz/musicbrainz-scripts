import {ApiError} from '@dvirtz/musicbrainz';
import type {EntityIncludeMap, EntityTypeMap} from '@dvirtz/musicbrainz/api-types';
import {MusicBrainzClient, type LookupOptions} from '@dvirtz/musicbrainz/client';
import type {EntityType} from '@dvirtz/musicbrainz/data/entity';

export const apiClient = new MusicBrainzClient({
  apiUrl: new URL('/ws/2/', location.origin),
});

export async function tryLookup<Type extends EntityType, Include extends EntityIncludeMap[Type] = never>(
  entityType: Type,
  gid: string,
  options?: LookupOptions<Include>
): Promise<EntityTypeMap<Include>[Type] | null> {
  return await tryApiRequest(() => apiClient.lookup(entityType, gid, options), `${entityType}/${gid}`);
}

export async function tryApiRequest<T>(request: () => Promise<T>, description: string): Promise<T | null> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await request();
    } catch (error) {
      if (!(error instanceof ApiError) || error.statusCode !== 503 || attempt === 3) {
        console.error(`Failed to fetch ${description}:`, error);
        return null;
      }
      await new Promise(resolve => setTimeout(resolve, 2 ** attempt * 1000));
    }
  }
}
