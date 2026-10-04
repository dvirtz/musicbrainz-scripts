import {JoinedEntityEditor} from '#joined-entity-editor.tsx';
import {InfoEditor} from '#info-editor.tsx';
import classes from '#editor.module.css';
import {setInputValue} from '@repo/musicbrainz-ext/set-input-value';
import {
  createSetlistItem,
  joinedEntityText,
  parseSetlist,
  serializeSetlist,
  SetlistCredit,
  Setlist,
  SetlistEntry,
} from '@repo/musicbrainz-ext/setlist';
import {createSignal, For, onCleanup, Show} from 'solid-js';
import {createStore, produce, reconcile} from 'solid-js/store';

function parseForEditor(value: string) {
  const setlist = parseSetlist(value);
  for (const entry of setlist.entries) {
    if ((entry.kind === 'item' || entry.kind === 'artist') && !entry.credits.length)
      entry.credits.push({name: '', joinPhrase: ''});
  }
  setlist.baseline = JSON.stringify(setlist.entries);
  return setlist;
}

export function Editor(props: {textarea: HTMLTextAreaElement}) {
  const [setlist, setSetlist] = createStore<Setlist>(parseForEditor(props.textarea.value));
  const [markup, setMarkup] = createSignal(false);
  const [count, setCount] = createSignal(1);
  let synchronizing = false;
  let lastValue = props.textarea.value;
  const nativeRow = props.textarea.closest<HTMLElement>('.row');
  const originalRowHidden = nativeRow?.hidden ?? false;
  const markupHelp = Array.from(
    props.textarea.closest('fieldset')?.querySelectorAll<HTMLParagraphElement>(':scope > p') ?? []
  ).map(element => ({element, hidden: element.hidden}));

  function receiveMarkup() {
    if (synchronizing || lastValue === props.textarea.value) return;
    lastValue = props.textarea.value;
    setSetlist(reconcile(parseForEditor(lastValue)));
  }
  props.textarea.addEventListener('input', receiveMarkup);
  props.textarea.addEventListener('change', receiveMarkup);
  onCleanup(() => {
    props.textarea.removeEventListener('input', receiveMarkup);
    props.textarea.removeEventListener('change', receiveMarkup);
    props.textarea.hidden = false;
    if (nativeRow) nativeRow.hidden = originalRowHidden;
    for (const help of markupHelp) help.element.hidden = help.hidden;
  });
  props.textarea.hidden = true;
  if (nativeRow) nativeRow.hidden = true;
  for (const help of markupHelp) help.element.hidden = true;

  function edit(change: (setlist: Setlist) => void) {
    receiveMarkup();
    setSetlist(produce(change));
    const value = serializeSetlist(setlist);
    if (value === props.textarea.value) return;
    synchronizing = true;
    try {
      lastValue = value;
      setInputValue(props.textarea, value, {focus: false});
    } finally {
      synchronizing = false;
    }
    receiveMarkup();
  }

  function itemNumber(entry: SetlistEntry) {
    return String(
      setlist.entries
        .slice(0, setlist.entries.findIndex(value => value.id === entry.id) + 1)
        .filter(value => value.kind === 'item').length
    );
  }
  function update(id: string, change: (entry: SetlistEntry) => void) {
    edit(setlist => {
      const entry = setlist.entries.find(entry => entry.id === id);
      if (entry) change(entry);
    });
  }
  function previousCredits(): SetlistCredit[] {
    for (const entry of [...setlist.entries].reverse()) {
      if ((entry.kind === 'item' || entry.kind === 'artist') && joinedEntityText(entry.credits))
        return entry.credits.map(credit => ({...credit}));
      if (entry.kind === 'raw' && entry.text.startsWith('@ ')) break;
    }
    return [{name: '', joinPhrase: ''}];
  }
  function changeCredits(id: string, credits: SetlistCredit[]) {
    edit(setlist => {
      const index = setlist.entries.findIndex(value => value.id === id);
      const entry = setlist.entries[index];
      if (!entry || (entry.kind !== 'artist' && entry.kind !== 'item')) return;
      const old = joinedEntityText(entry.credits);
      entry.credits = credits;
      if (entry.kind === 'artist') {
        for (const following of setlist.entries.slice(index + 1)) {
          if (following.kind === 'artist' || (following.kind === 'raw' && following.text.startsWith('@ '))) break;
          if (following.kind === 'item' && joinedEntityText(following.credits) === old)
            following.credits = credits.map(credit => ({...credit}));
        }
      }
    });
  }
  function move(id: string, direction: number) {
    edit(setlist => {
      const index = setlist.entries.findIndex(value => value.id === id);
      const rows = setlist.entries.filter(isTableRow);
      const targetRow = rows[rows.findIndex(value => value.id === id) + direction];
      if (index < 0 || !targetRow) return;
      const target = setlist.entries.findIndex(value => value.id === targetRow.id);
      const [entry] = setlist.entries.splice(index, 1);
      setlist.entries.splice(target, 0, entry!);
    });
  }

  function isTableRow(entry: SetlistEntry) {
    return entry.kind !== 'artist' && !(entry.kind === 'raw' && !entry.text.trim());
  }

  const tableRows = () => setlist.entries.filter(isTableRow);

  return (
    <div
      class={classes.editor}
      onKeyDown={event => {
        // Single-line editor fields should not submit the surrounding event form.
        if (event.key === 'Enter' && event.target instanceof HTMLInputElement) event.preventDefault();
      }}
    >
      <Show when={!markup()}>
        <div class={classes['table-scroll']}>
          <table class={`tbl medium ${classes.table}`} aria-label="Event setlist">
            <colgroup>
              <col class={classes.reorder} />
              <col class={classes.number} />
              <col class={classes.artist} />
              <col class={classes.title} />
              <col class={classes.controls} />
            </colgroup>
            <thead>
              <tr>
                <th aria-label="Move rows" />
                <th class="position">#</th>
                <th class="artist">Artist credit</th>
                <th class="title">Title</th>
                <th class="icons" aria-label="Row actions" />
              </tr>
            </thead>
            <tbody>
              <For each={tableRows()}>
                {(entry, index) => {
                  const number = () => itemNumber(entry);
                  const label = () => (entry.kind === 'item' ? `song ${number()}` : `row ${index() + 1}`);
                  return (
                    <tr>
                      <td class="reorder">
                        <div class={classes['row-actions']}>
                          <button
                            type="button"
                            class="icon track-up"
                            aria-label={`Move ${label()} up`}
                            disabled={index() === 0}
                            onClick={() => move(entry.id, -1)}
                          ></button>
                          <button
                            type="button"
                            class="icon track-down"
                            aria-label={`Move ${label()} down`}
                            disabled={index() === tableRows().length - 1}
                            onClick={() => move(entry.id, 1)}
                          ></button>
                        </div>
                      </td>
                      <td>{entry.kind === 'item' ? number() : '—'}</td>
                      <Show
                        when={entry.kind === 'item'}
                        fallback={
                          <Show
                            when={entry.kind === 'artist'}
                            fallback={
                              <td colspan="2">
                                <Show
                                  when={entry.kind === 'info'}
                                  fallback={
                                    <span
                                      class={`${classes.summary} error`}
                                      title={`Edit this preserved line in Markup mode: ${entry.kind === 'raw' ? entry.text : ''}`}
                                    >
                                      Malformed markup:{' '}
                                      <code>{entry.kind === 'raw' ? entry.text || '(blank line)' : ''}</code>
                                    </span>
                                  }
                                >
                                  <input
                                    type="text"
                                    class={classes['section-input']}
                                    aria-label="Section information"
                                    placeholder="Section information"
                                    value={entry.kind === 'info' ? entry.text.replace(/\r?\n/g, ' ') : ''}
                                    onInput={event =>
                                      update(entry.id, value => {
                                        if (value.kind === 'info') value.text = event.currentTarget.value;
                                      })
                                    }
                                  />
                                </Show>
                              </td>
                            }
                          >
                            <td>
                              <JoinedEntityEditor
                                type="artist"
                                parts={entry.kind === 'artist' ? entry.credits : []}
                                number={`change ${index() + 1}`}
                                onChange={credits => changeCredits(entry.id, credits)}
                              />
                            </td>
                            <td>Artist change</td>
                          </Show>
                        }
                      >
                        <td>
                          <JoinedEntityEditor
                            type="artist"
                            parts={entry.kind === 'item' ? entry.credits : []}
                            otherParts={entry.kind === 'item' ? entry.works : []}
                            number={number()}
                            onChange={credits => changeCredits(entry.id, credits)}
                          />
                        </td>
                        <td>
                          <JoinedEntityEditor
                            type="work"
                            parts={entry.kind === 'item' ? entry.works : []}
                            otherParts={entry.kind === 'item' ? entry.credits : []}
                            number={number()}
                            onChange={works =>
                              update(entry.id, value => {
                                if (value.kind === 'item') value.works = works;
                              })
                            }
                          />
                        </td>
                      </Show>
                      <td class="icon">
                        <div class={classes['row-actions']}>
                          <Show when={entry.kind === 'item' || entry.kind === 'info'}>
                            <InfoEditor
                              label={entry.kind === 'info' ? 'Section information' : 'Additional info'}
                              value={entry.kind === 'item' ? entry.notes : entry.kind === 'info' ? entry.text : ''}
                              onChange={text =>
                                update(entry.id, value => {
                                  if (value.kind === 'item') value.notes = text;
                                  else if (value.kind === 'info') value.text = text;
                                })
                              }
                            />
                          </Show>
                          <button
                            type="button"
                            class="icon remove-item"
                            aria-label={`Delete ${label()}`}
                            onClick={() =>
                              edit(setlist => {
                                setlist.entries = setlist.entries.filter(value => value.id !== entry.id);
                              })
                            }
                          ></button>
                        </div>
                      </td>
                    </tr>
                  );
                }}
              </For>
            </tbody>
          </table>
        </div>
      </Show>
      <div class={`buttons ${classes.toolbar}`}>
        <button
          type="button"
          class={`button ${classes['mode-toggle']}`}
          onClick={() => {
            if (markup()) receiveMarkup();
            const showMarkup = !markup();
            setMarkup(showMarkup);
            props.textarea.hidden = !showMarkup;
            if (nativeRow) nativeRow.hidden = !showMarkup;
            for (const help of markupHelp) help.element.hidden = !showMarkup || help.hidden;
          }}
        >
          {markup() ? 'Table' : 'Markup'}
        </button>
        <Show when={!markup()}>
          <div class={classes['add-controls']}>
            <label>
              Add{' '}
              <input
                type="number"
                aria-label="Number of songs"
                min="1"
                max="100"
                value={count()}
                onInput={event => setCount(Number(event.currentTarget.value))}
              />
            </label>
            <button
              type="button"
              class="button"
              disabled={!Number.isInteger(count()) || count() < 1 || count() > 100}
              onClick={() => {
                const credits = previousCredits();
                edit(setlist => {
                  setlist.entries.push(...Array.from({length: count()}, () => createSetlistItem('', credits)));
                });
              }}
            >
              song(s)
            </button>
            <button
              type="button"
              class="button"
              onClick={() =>
                edit(setlist => {
                  setlist.entries.push({id: crypto.randomUUID(), kind: 'info', text: ''});
                })
              }
            >
              section(s)
            </button>
          </div>
        </Show>
      </div>
    </div>
  );
}
