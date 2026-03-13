import {Button} from '@kobalte/core/button';
import {createEffect, createSignal, For, Show} from 'solid-js';
import classes from './matrix-dialog.module.css';
import type {DateParts, MBPlace} from './types.ts';

export function MatrixDialog(props: {
  open: boolean;
  isCreating: boolean;
  dates: DateParts[];
  places: MBPlace[];
  onCancel: () => void;
  onConfirm: (selectedDayPlaceKeys: string[]) => void;
}) {
  const [selectedDayPlaceKeys, setSelectedDayPlaceKeys] = createSignal<Set<string>>(new Set());

  const dayPlaceKey = (dayNumber: number, placeGid: string) => `${dayNumber}|${placeGid}`;
  const formatDateLabel = (day: DateParts) => `${day.year}-${day.month}-${day.day}`;

  createEffect(() => {
    if (!props.open) {
      return;
    }

    const initial = new Set<string>();
    for (const day of props.dates) {
      for (const place of props.places) {
        initial.add(dayPlaceKey(day.dayNumber, place.gid));
      }
    }
    setSelectedDayPlaceKeys(initial);
  });

  const toggleDayPlaceCell = (dayNumber: number, placeGid: string) => {
    const key = dayPlaceKey(dayNumber, placeGid);
    const next = new Set(selectedDayPlaceKeys());
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    setSelectedDayPlaceKeys(next);
  };

  const setDaySelected = (dayNumber: number, selected: boolean) => {
    const next = new Set(selectedDayPlaceKeys());
    for (const place of props.places) {
      const key = dayPlaceKey(dayNumber, place.gid);
      if (selected) {
        next.add(key);
      } else {
        next.delete(key);
      }
    }
    setSelectedDayPlaceKeys(next);
  };

  const setPlaceSelected = (placeGid: string, selected: boolean) => {
    const next = new Set(selectedDayPlaceKeys());
    for (const day of props.dates) {
      const key = dayPlaceKey(day.dayNumber, placeGid);
      if (selected) {
        next.add(key);
      } else {
        next.delete(key);
      }
    }
    setSelectedDayPlaceKeys(next);
  };

  return (
    <Show when={props.open}>
      <div class={classes.dialogOverlay} role="dialog" aria-modal="true" aria-label="Scaffold sub-events matrix">
        <div class={classes.dialogPanel}>
          <h4 class={classes.dialogTitle}>Confirm sub-event matrix</h4>
          <p class={classes.dialogWarning}>Warning: accepting this action will create new event entities.</p>
          <p>Use this matrix to choose which date/place combinations should create venue sub-events.</p>
          <Show
            when={props.places.length > 0}
            fallback={<p>No places selected. Only day sub-events will be created.</p>}
          >
            <div class={classes.matrixTableWrap}>
              <table class={classes.matrixTable}>
                <thead>
                  <tr>
                    <th>Date \ Place</th>
                    <For each={props.places}>
                      {place => {
                        const isColumnChecked = () =>
                          props.dates.every(day => selectedDayPlaceKeys().has(dayPlaceKey(day.dayNumber, place.gid)));

                        return (
                          <th>
                            <label class={classes.headerToggle}>
                              <input
                                type="checkbox"
                                checked={isColumnChecked()}
                                onChange={event => setPlaceSelected(place.gid, event.currentTarget.checked)}
                              />
                              <span>{place.name}</span>
                            </label>
                          </th>
                        );
                      }}
                    </For>
                  </tr>
                </thead>
                <tbody>
                  <For each={props.dates}>
                    {day => {
                      const isRowChecked = () =>
                        props.places.every(place => selectedDayPlaceKeys().has(dayPlaceKey(day.dayNumber, place.gid)));

                      return (
                        <tr>
                          <th>
                            <label class={classes.headerToggle}>
                              <input
                                type="checkbox"
                                checked={isRowChecked()}
                                onChange={event => setDaySelected(day.dayNumber, event.currentTarget.checked)}
                              />
                              <span>{formatDateLabel(day)}</span>
                            </label>
                          </th>
                          <For each={props.places}>
                            {place => (
                              <td>
                                <input
                                  type="checkbox"
                                  checked={selectedDayPlaceKeys().has(dayPlaceKey(day.dayNumber, place.gid))}
                                  onChange={() => toggleDayPlaceCell(day.dayNumber, place.gid)}
                                />
                              </td>
                            )}
                          </For>
                        </tr>
                      );
                    }}
                  </For>
                </tbody>
              </table>
            </div>
          </Show>
          <div class={classes.dialogActions}>
            <Button class="button" onClick={props.onCancel} disabled={props.isCreating}>
              Cancel
            </Button>
            <Button
              class="button"
              onClick={() => props.onConfirm(Array.from(selectedDayPlaceKeys()))}
              disabled={props.isCreating}
            >
              Confirm and Create
            </Button>
          </div>
        </div>
      </div>
    </Show>
  );
}
