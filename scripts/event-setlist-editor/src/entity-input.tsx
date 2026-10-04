import classes from '#editor.module.css';
import {WorkSearchDetails, WorkSearchLanguage} from '#work-search-details.tsx';
import {searchWorks, WorkSearchResult} from '#work-search.ts';
import {MBID_REGEXP} from '@repo/musicbrainz-ext/constants';
import {fetchJSON} from '@repo/musicbrainz-ext/fetch';
import {SetlistEntity} from '@repo/musicbrainz-ext/setlist';
import {createEffect, createSignal, createUniqueId, For, onCleanup, Show} from 'solid-js';

type SearchEntity = {id: string; name?: string; title?: string; disambiguation?: string; work?: WorkSearchResult};

export function EntityInput(props: {
  entity: SetlistEntity;
  type: 'artist' | 'work';
  label: string;
  number: string;
  preserveLinkOnInput?: boolean;
  onChange: (entity: SetlistEntity) => void;
}) {
  const [results, setResults] = createSignal<SearchEntity[]>([]);
  const [error, setError] = createSignal('');
  const [busy, setBusy] = createSignal(false);
  const [activeResult, setActiveResult] = createSignal(-1);
  const resultsId = createUniqueId();
  let requestNumber = 0;

  function invalidateSearch() {
    requestNumber++;
    setResults([]);
    setError('');
    setBusy(false);
    setActiveResult(-1);
  }

  function select(result: SearchEntity) {
    invalidateSearch();
    const name = result.name ?? result.title ?? '';
    props.onChange({name, entityName: name, mbid: result.id});
  }

  createEffect(() => {
    // External form updates invalidate in-flight searches too.
    void props.entity.name;
    invalidateSearch();
  });
  onCleanup(() => {
    requestNumber++;
  });

  async function search() {
    const query = props.entity.name.trim();
    if (!query) return;
    const currentRequest = ++requestNumber;
    setBusy(true);
    setError('');
    setResults([]);
    setActiveResult(-1);
    try {
      const id = query.match(new RegExp(`^(?:https?://[^/]+/${props.type}/)?(${MBID_REGEXP.source})/?$`, 'i'))?.[1];
      let found: SearchEntity[];
      if (props.type === 'work') {
        found = (await searchWorks(query, id)).map(work => ({
          id: work.gid,
          name: work.name,
          disambiguation: [work.primaryAlias !== work.name ? work.primaryAlias : '', work.comment]
            .filter(Boolean)
            .join(', '),
          work,
        }));
      } else {
        const params = new URLSearchParams({fmt: 'json', ...(id ? {} : {query, limit: '10'})});
        const response = await fetchJSON<SearchEntity & {artists?: SearchEntity[]}>(
          `${location.origin}/ws/2/artist/${id ?? ''}?${params}`,
          {signal: AbortSignal.timeout(15000)}
        );
        found = id ? [response] : (response.artists ?? []);
      }
      if (currentRequest !== requestNumber) return;
      setResults(found);
      if (!found.length) setError('No results. You can keep this text unlinked.');
    } catch {
      if (currentRequest === requestNumber) setError('Search failed. Try again or keep this text unlinked.');
    } finally {
      if (currentRequest === requestNumber) setBusy(false);
    }
  }

  return (
    <div class={classes.lookup}>
      <div class={`autocomplete2 ${classes.lookup}`}>
        <div
          class={classes['lookup-field']}
          role="combobox"
          aria-label={`${props.label} lookup`}
          aria-expanded={results().length > 0}
          aria-haspopup="listbox"
          aria-controls={resultsId}
        >
          <input
            aria-label={props.label}
            classList={{'lookup-performed': Boolean(props.entity.mbid)}}
            aria-autocomplete="list"
            aria-controls={resultsId}
            aria-activedescendant={activeResult() >= 0 ? `${resultsId}-${activeResult()}` : undefined}
            type="text"
            value={props.entity.name}
            placeholder="Type to search, or paste an MBID"
            onKeyDown={event => {
              if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && results().length) {
                event.preventDefault();
                const direction = event.key === 'ArrowDown' ? 1 : -1;
                setActiveResult(index => {
                  const start = index < 0 && direction < 0 ? results().length : index;
                  return (start + direction + results().length) % results().length;
                });
              } else if (event.key === 'Escape' && results().length) {
                event.preventDefault();
                event.stopPropagation();
                invalidateSearch();
              } else if (event.key === 'Enter') {
                event.preventDefault();
                const result = results()[activeResult()];
                if (result) select(result);
                else void search();
              }
            }}
            onInput={event => {
              invalidateSearch();
              props.onChange({
                ...(props.preserveLinkOnInput === false ? {} : props.entity),
                name: event.currentTarget.value,
              });
            }}
          />
          <button
            type="button"
            class="search"
            classList={{loading: busy()}}
            aria-label={`Search ${props.type} ${props.number}`}
            title={busy() ? 'Searching…' : results().length ? 'Close search results' : 'Search'}
            aria-busy={busy()}
            disabled={busy()}
            onClick={() => {
              if (results().length) invalidateSearch();
              else void search();
            }}
          />
        </div>
        <ul role="listbox" id={resultsId} aria-label={`${props.type} search results`}>
          <For each={results()}>
            {(result, index) => (
              <li
                role="option"
                id={`${resultsId}-${index()}`}
                aria-selected={activeResult() === index()}
                classList={{selected: activeResult() === index()}}
                aria-label={`Select ${result.name ?? result.title ?? result.id}`}
                onClick={() => select(result)}
              >
                <div class={classes['result-heading']}>
                  <span>
                    {result.name ?? result.title} {result.disambiguation ? `(${result.disambiguation})` : ''}
                  </span>
                  <Show when={result.work}>{work => <WorkSearchLanguage work={work()} />}</Show>
                </div>
                <Show when={result.work}>{work => <WorkSearchDetails work={work()} />}</Show>
              </li>
            )}
          </For>
        </ul>
      </div>
      <Show when={error()}>
        <p role="alert">{error()}</p>
      </Show>
    </div>
  );
}
