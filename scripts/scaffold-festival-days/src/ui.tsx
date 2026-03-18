// cspell:words returnto

import {Button} from '@kobalte/core/button';
import {ToolLine} from '@repo/common-ui/tool-line';
import {toolbox} from '@repo/common-ui/toolbox';
import {waitForElement} from '@repo/rxjs-ext/wait-for-element';
import {createMemo, createSignal, For, Show} from 'solid-js';
import {render} from 'solid-js/web';
import {extractPlaceGid, fetchEvent, fetchPlaceByGid, getLinkedPlacesFromEvent, searchPlaces} from './api.ts';
import {DAY_WORD_PRESETS, DAY_WORD_STORAGE_KEY, DEFAULT_DAY_WORD} from './day-word.ts';
import {MatrixDialog} from './matrix-dialog.tsx';
import {
  deriveDates,
  isSingleDayFestival,
  scaffoldFestivalDays,
  shouldShowScaffoldUI,
  type StatusMessage,
} from './scaffold.ts';
import type {DateParts, MBEvent, MBPlace} from './types.ts';
import classes from './ui.module.css';

const CONTAINER_ID = 'scaffold-festival-days-toolbox';

function isUserLoggedIn(documentRef: Document = document): boolean {
  return Boolean(documentRef.querySelector('a[href="/logout"], a[href^="/logout?"]'));
}

function loginUrlWithReturnTo(locationRef: Location = window.location): string {
  const returnTo = `${locationRef.pathname}${locationRef.search}${locationRef.hash}`;
  return `/login?returnto=${encodeURIComponent(returnTo)}`;
}

const CUSTOM_SENTINEL = '__custom__';

function ScaffoldFestivalUI(props: {event: MBEvent; places: MBPlace[]; dayWord: string}) {
  const [availablePlaces, setAvailablePlaces] = createSignal<MBPlace[]>(props.places);
  const [searchResults, setSearchResults] = createSignal<MBPlace[]>([]);
  const [draftCreditNames, setDraftCreditNames] = createSignal<Record<string, string>>({});
  const [placeInput, setPlaceInput] = createSignal('');
  const [selectedPlaces, setSelectedPlaces] = createSignal<Set<string>>(new Set(props.places.map(place => place.gid)));
  const [isCreating, setIsCreating] = createSignal(false);
  const [isSearching, setIsSearching] = createSignal(false);
  const [isMatrixDialogOpen, setIsMatrixDialogOpen] = createSignal(false);
  const [status, setStatus] = createSignal<StatusMessage | null>(null);
  const [dayWord, setDayWord] = createSignal(props.dayWord);
  const [isCustomDayWord, setIsCustomDayWord] = createSignal(!DAY_WORD_PRESETS.some(p => p.word === props.dayWord));
  const [customEditNote, setCustomEditNote] = createSignal('');

  const selectedPlaceIds = createMemo(() => Array.from(selectedPlaces()));
  const eventDates = createMemo<DateParts[]>(() => deriveDates(props.event));
  const singleDayMode = createMemo(() => isSingleDayFestival(props.event));
  const selectedPlacesForMatrix = createMemo<MBPlace[]>(() => {
    const placeByGid = new Map(availablePlaces().map(place => [place.gid, place] as const));
    return selectedPlaceIds()
      .map(gid => placeByGid.get(gid))
      .filter(Boolean) as MBPlace[];
  });

  const togglePlace = (placeGid: string) => {
    const next = new Set(selectedPlaces());
    if (next.has(placeGid)) {
      next.delete(placeGid);
    } else {
      next.add(placeGid);
    }
    setSelectedPlaces(next);
  };

  const addPlaces = (placesToAdd: MBPlace[]) => {
    const merged = new Map(availablePlaces().map(place => [place.gid, place] as const));
    for (const place of placesToAdd) {
      merged.set(place.gid, place);
    }
    setAvailablePlaces(Array.from(merged.values()));
  };

  const addAndSelectPlace = (place: MBPlace) => {
    addPlaces([place]);
    const nextSelected = new Set(selectedPlaces());
    nextSelected.add(place.gid);
    setSelectedPlaces(nextSelected);
  };

  const handleFindPlace = async () => {
    const input = placeInput().trim();
    if (!input || isSearching()) {
      return;
    }

    setIsSearching(true);

    const placeGid = extractPlaceGid(input);
    if (placeGid) {
      const place = await fetchPlaceByGid(placeGid);
      if (place) {
        setSearchResults([place]);
        setStatus({message: `Found: ${place.name}. Optionally set a credit name, then click Add.`, kind: 'info'});
      } else {
        setStatus({message: 'Could not load place from provided link/MBID.', kind: 'error'});
      }
      setIsSearching(false);
      return;
    }

    const results = await searchPlaces(input);
    setSearchResults(results);
    if (results.length === 0) {
      setStatus({message: 'No places found for your search.', kind: 'error'});
    } else {
      setStatus({message: `Found ${results.length} place(s). Click Add to include them.`, kind: 'info'});
    }
    setIsSearching(false);
  };

  const startScaffold = async (selectedDayPlaceKeys: string[]) => {
    if (isCreating()) {
      return;
    }

    setIsMatrixDialogOpen(false);
    setIsCreating(true);
    setStatus({
      message: singleDayMode() ? 'Creating per-place sub-events...' : 'Creating festival day sub-events...',
      kind: 'info',
    });

    const didComplete = await scaffoldFestivalDays({
      event: props.event,
      places: availablePlaces(),
      selectedPlaceIds: selectedPlaceIds(),
      selectedDayPlaceKeys,
      onStatus: setStatus,
      dayWord: dayWord(),
      customEditNote: customEditNote(),
    });

    setIsCreating(false);

    if (didComplete) {
      const shouldRefresh = window.confirm(
        'Festival days scaffolding is complete. Refresh the page now to see the new sub-events?'
      );
      if (shouldRefresh) {
        window.location.reload();
      }
    }
  };

  const handleScaffold = () => {
    if (isCreating()) {
      return;
    }

    if (!isUserLoggedIn(document)) {
      window.location.assign(loginUrlWithReturnTo());
      return;
    }

    if (singleDayMode() || selectedPlaceIds().length === 0) {
      void startScaffold([]);
      return;
    }

    setIsMatrixDialogOpen(true);
  };

  return (
    <ToolLine title="Scaffold festival days" direction="vertical">
      <p>
        {singleDayMode()
          ? 'Select places to create direct per-place sub-events for this single-day festival.'
          : 'Select places to also create per-venue sub-events (optional).'}
      </p>
      <div class={classes.placeSearchBox}>
        <input
          class={classes.placeSearchInput}
          type="text"
          placeholder="Search places or paste a place URL/MBID"
          value={placeInput()}
          onInput={event => setPlaceInput(event.currentTarget.value)}
          onKeyDown={event => {
            if (event.key === 'Enter') {
              event.preventDefault();
              void handleFindPlace();
            }
          }}
          disabled={isCreating() || isSearching()}
        />
        <Button class="button" onClick={() => void handleFindPlace()} disabled={isCreating() || isSearching()}>
          {isSearching() ? 'Searching...' : 'Find place'}
        </Button>
      </div>
      <Show when={searchResults().length > 0}>
        <div class={classes.searchResults}>
          <For each={searchResults()}>
            {(place, index) => (
              <div class={classes.searchResultRow}>
                <span class={classes.searchResultPlaceName}>
                  <a href={`/place/${place.gid}`}>
                    {place.name}
                    <Show when={place.disambiguation}>{disambiguation => <span>{` (${disambiguation()})`}</span>}</Show>
                  </a>
                </span>
                <input
                  class={classes.creditNameInput}
                  type="text"
                  placeholder="Credited as"
                  value={draftCreditNames()[place.gid] ?? ''}
                  onInput={e => {
                    const value = (e.currentTarget as HTMLInputElement).value;
                    setDraftCreditNames(prev => ({...prev, [place.gid]: value}));
                  }}
                  disabled={isCreating()}
                />
                <Button
                  class={`button ${classes.addPlaceButton}`}
                  onClick={() => {
                    const draft = draftCreditNames()[place.gid] ?? '';
                    const creditName = draft.trim() || undefined;
                    addAndSelectPlace({...place, creditName});
                    setSearchResults(prev => prev.filter((_, i) => i !== index()));
                    setStatus({message: `Added place: ${creditName ?? place.name}`, kind: 'info'});
                  }}
                  disabled={isCreating()}
                >
                  Add
                </Button>
              </div>
            )}
          </For>
        </div>
      </Show>
      <Show
        when={availablePlaces().length > 0}
        fallback={
          <p>
            {singleDayMode()
              ? 'No linked places found. Add or select at least one place to create per-place sub-events.'
              : 'No linked places found. Only day sub-events will be created.'}
          </p>
        }
      >
        <div class={classes.placesList}>
          <For each={availablePlaces()}>
            {place => (
              <div class={classes.placeOption}>
                <input
                  type="checkbox"
                  aria-label={place.creditName ?? place.name}
                  checked={selectedPlaces().has(place.gid)}
                  onChange={() => togglePlace(place.gid)}
                  disabled={isCreating()}
                />
                <a href={`/place/${place.gid}`}>{place.creditName ?? place.name}</a>
              </div>
            )}
          </For>
        </div>
      </Show>
      <div class={classes.actionsRow}>
        <div class={classes.customEditNoteControl}>
          <label for="scaffold-festival-days-custom-edit-note">Edit note (optional):</label>
          <textarea
            id="scaffold-festival-days-custom-edit-note"
            class={classes.customEditNoteInput}
            value={customEditNote()}
            onInput={event => setCustomEditNote(event.currentTarget.value)}
            rows={3}
            disabled={isCreating()}
          />
        </div>
        <Show when={!singleDayMode()}>
          <div class={classes.dayWordControl}>
            <label for="scaffold-festival-days-day-word">Day word:</label>
            <select
              id="scaffold-festival-days-day-word"
              value={isCustomDayWord() ? CUSTOM_SENTINEL : dayWord()}
              onChange={e => {
                const value = (e.target as HTMLSelectElement).value;
                if (value === CUSTOM_SENTINEL) {
                  setIsCustomDayWord(true);
                  return;
                }

                setIsCustomDayWord(false);
                setDayWord(value);
                GM.setValue(DAY_WORD_STORAGE_KEY, value).catch(console.error);
              }}
              disabled={isCreating()}
            >
              <For each={DAY_WORD_PRESETS}>
                {preset => <option value={preset.word}>{`${preset.language} (${preset.word})`}</option>}
              </For>
              <option value={CUSTOM_SENTINEL}>Custom…</option>
            </select>
            <input
              class={classes.customDayWordInput}
              type="text"
              value={dayWord()}
              onInput={e => {
                const value = (e.target as HTMLInputElement).value;
                setIsCustomDayWord(true);
                setDayWord(value);
                GM.setValue(DAY_WORD_STORAGE_KEY, value).catch(console.error);
              }}
              disabled={isCreating() || !isCustomDayWord()}
              style={{visibility: isCustomDayWord() ? 'visible' : 'hidden'}}
              aria-hidden={!isCustomDayWord()}
              tabindex={isCustomDayWord() ? 0 : -1}
            />
          </div>
        </Show>
        <div class={`buttons ${classes.actionsButtons}`}>
          <Button
            class="button"
            onClick={() => void handleScaffold()}
            disabled={isCreating() || (singleDayMode() && selectedPlaceIds().length === 0)}
          >
            {isCreating()
              ? 'Creating...'
              : singleDayMode()
                ? 'Create Festival Place Sub-events'
                : 'Create Festival Day Sub-events'}
          </Button>
        </div>
      </div>
      <MatrixDialog
        open={isMatrixDialogOpen()}
        isCreating={isCreating()}
        dates={eventDates()}
        places={selectedPlacesForMatrix()}
        onCancel={() => setIsMatrixDialogOpen(false)}
        onConfirm={(selectedKeys: string[]) => void startScaffold(selectedKeys)}
      />
      <Show when={status()}>
        {statusValue => <p classList={{error: statusValue().kind === 'error'}}>{statusValue().message}</p>}
      </Show>
    </ToolLine>
  );
}

export async function createUI(eventGid: string) {
  if (document.getElementById(CONTAINER_ID)) {
    return;
  }

  const mainContent =
    document.querySelector<HTMLDivElement>('div#content') ??
    (await waitForElement((node): node is HTMLDivElement => node instanceof HTMLDivElement && node.id === 'content'));

  if (!mainContent) {
    console.error('[scaffold-festival-days] Could not find main content area');
    return;
  }

  const event = await fetchEvent(eventGid);

  if (!shouldShowScaffoldUI(event)) {
    return;
  }

  const theToolbox = toolbox(document, 'full-page', toolbox => {
    mainContent.appendChild(toolbox);
  });

  const container = (<div id={CONTAINER_ID}></div>) as HTMLDivElement;
  theToolbox.appendChild(container);

  const places = getLinkedPlacesFromEvent(event);

  const dayWord = await GM.getValue(DAY_WORD_STORAGE_KEY, DEFAULT_DAY_WORD);

  render(() => <ScaffoldFestivalUI event={event} places={places} dayWord={dayWord} />, container);
}
