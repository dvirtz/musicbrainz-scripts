import {SetlistPart} from '@repo/musicbrainz-ext/setlist';
import {For, Show} from 'solid-js';

export function EntityPreview(props: {parts: SetlistPart[]; type: 'artist' | 'work'}) {
  return (
    <For each={props.parts}>
      {part => (
        <>
          <bdi>
            <Show when={part.mbid} fallback={part.name}>
              <a href={`/${props.type}/${part.mbid}`} target="_blank" rel="noopener noreferrer" title={part.entityName}>
                {part.name}
              </a>
            </Show>
          </bdi>
          {part.joinPhrase}
        </>
      )}
    </For>
  );
}
