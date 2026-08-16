import classes from '#buttons.module.css';
import {canMerge, canSplit, hasDiscID, mergeDown, mergeUp, siblingMedium, splitMedium} from '#medium-operations.ts';
import {EditorMedium, EditorTrack, getRelease} from '@repo/musicbrainz-ext/release-editor';

type ButtonState = {enabled: boolean; title: string};

function ensureButton(
  container: Element,
  markerClass: string,
  insert: (button: HTMLButtonElement) => void,
  onClick: () => void
): HTMLButtonElement {
  const existing = container.querySelector<HTMLButtonElement>(`button.${markerClass}`);
  if (existing) {
    return existing;
  }

  const button = document.createElement('button');
  button.type = 'button';
  button.classList.add(markerClass, 'icon');
  button.addEventListener('click', event => {
    event.preventDefault();
    onClick();
  });
  insert(button);
  return button;
}

function applyState(button: HTMLButtonElement, {enabled, title}: ButtonState) {
  button.disabled = !enabled;
  button.title = title;
  // the button is icon-only, so it has no accessible name otherwise
  button.setAttribute('aria-label', title);
}

function mergeState(target: EditorMedium | undefined, source: EditorMedium | undefined, label: string): ButtonState {
  if (!target || !source) {
    return {enabled: false, title: label};
  }
  if (hasDiscID(target) || hasDiscID(source)) {
    return {enabled: false, title: 'Cannot merge mediums with disc IDs'};
  }
  if (!target.loaded() || !source.loaded()) {
    return {enabled: false, title: 'Expand both mediums to load their tracklists first'};
  }
  return {enabled: canMerge(target, source), title: label};
}

function setButtonVisibility(button: HTMLButtonElement, visible: boolean) {
  button.style.display = visible && !button.hidden ? 'inline-block' : 'none';
}

function updateMedium(fieldset: Element, medium: EditorMedium, visible: boolean) {
  const buttonCell = fieldset.querySelector('table.advanced-format td.align-right.icon');
  const mediumDownButton = buttonCell?.querySelector('button.medium-down');
  if (!buttonCell || !mediumDownButton) {
    return;
  }

  const downButton = ensureButton(
    buttonCell,
    classes['merge-medium-down']!,
    button => mediumDownButton.insertAdjacentElement('beforebegin', button),
    () => mergeDown(medium)
  );
  const upButton = ensureButton(
    buttonCell,
    classes['merge-medium-up']!,
    button => downButton.insertAdjacentElement('afterend', button),
    () => mergeUp(medium)
  );

  applyState(downButton, mergeState(medium, siblingMedium(medium, 1), 'Merge with next medium'));
  applyState(upButton, mergeState(siblingMedium(medium, -1), medium, 'Merge with previous medium'));
  setButtonVisibility(downButton, visible);
  setButtonVisibility(upButton, visible);
}

function fieldsetForMedium(medium: EditorMedium): Element | null {
  return document.getElementById(`medium-format-${medium.uniqueID}`)?.closest('fieldset.advanced-medium') ?? null;
}

function rowForTrack(track: EditorTrack): Element | null {
  return document.getElementById(track.elementID);
}

function updateTrack(row: Element, medium: EditorMedium, track: EditorTrack, visible: boolean) {
  const reorderCell = row.querySelector('td.reorder');
  if (!reorderCell) {
    return;
  }

  const button = ensureButton(
    reorderCell,
    classes['medium-split-here']!,
    b => reorderCell.appendChild(b),
    () => splitMedium(medium, track)
  );
  reorderCell.classList.add(classes.reorderCell!);

  const splittable = canSplit(medium, track);
  applyState(button, {
    enabled: splittable,
    title: hasDiscID(medium) ? 'Cannot split a medium with a disc ID' : 'Split medium before this track',
  });
  button.hidden = !splittable;
  setButtonVisibility(button, visible);
}

export function refreshButtons(visible: boolean) {
  const release = getRelease();

  for (const medium of release.mediums()) {
    const fieldset = fieldsetForMedium(medium);
    if (!fieldset) {
      continue;
    }
    updateMedium(fieldset, medium, visible);
    for (const track of medium.tracks()) {
      const row = rowForTrack(track);
      if (row) {
        updateTrack(row, medium, track, visible);
      }
    }
  }
}

export function injectButtons(isVisible: () => boolean) {
  let refreshScheduled = false;
  const subscribedMediums = new Set<EditorMedium>();

  const refreshLater = () => {
    if (refreshScheduled) {
      return;
    }
    refreshScheduled = true;
    setTimeout(() => {
      refreshScheduled = false;
      refreshButtons(isVisible());
    });
  };

  const subscribeToMedium = (medium: EditorMedium) => {
    if (subscribedMediums.has(medium)) {
      return;
    }
    subscribedMediums.add(medium);
    medium.tracks.subscribe(refreshLater);
  };

  const release = getRelease();
  release.mediums().forEach(subscribeToMedium);
  release.mediums.subscribe(() => {
    release.mediums().forEach(subscribeToMedium);
    refreshLater();
  });

  refreshButtons(isVisible());
}
