// cspell:ignore unloadpage

/**
 * Type definitions for MusicBrainz Release Editor
 * Based on knockout observables exposed in the MB.releaseEditor context
 */

import {assertMBReleaseEditor} from '#asserts.ts';
import {ArtistCreditT, MediumT, TrackT} from 'typedbrainz/types';

// Knockout observable shape used by MusicBrainz release editor
type Observable<T> = {
  (): T;
  (value: T): void;
};
type ObservableArray<T> = {
  (): T[];
  (value: T[]): void;
};
type Computed<T> = () => T;

declare class EditorMedium {
  release: EditorRelease;
  formatID: Observable<string>;
  position: Observable<number>;
  name: Observable<string>;
  tracks: ObservableArray<EditorTrack>;
  pushTrack(data: Partial<TrackT>): void;

  constructor(medium: Partial<MediumT>, release: EditorRelease);
}

declare class EditorTrack {
  name: Observable<string>;
  medium: EditorMedium;
  /// milliseconds
  length: Observable<number | null>;
  artistCredit: Observable<ArtistCreditT>;
  recording: Observable<{
    artistCredit: ArtistCreditT;
  }>;
}

declare class EditorBarcode {
  value: Computed<string>;
}

declare class EditorReleaseLabel {
  label: Observable<{name: string}>;
  catalogNumber: Observable<string>;
}

declare class EditorReleaseEvent {
  date: {
    year: Observable<string | null>;
    month: Observable<string | null>;
    day: Observable<string | null>;
  };
  countryID: Observable<string | null>;
  hasInvalidDate: Computed<boolean>;
}

type EditorReleaseGroup = {
  artistCredit: ArtistCreditT;
  [key: string]: unknown;
};

export declare class EditorRelease {
  name: Observable<string>;
  statusID: Observable<string>;
  languageID: Observable<string>;
  scriptID: Observable<string>;
  packagingID: Observable<string>;
  labels: ObservableArray<EditorReleaseLabel>;
  events: ObservableArray<EditorReleaseEvent>;
  barcode: EditorBarcode;
  artistCredit: Observable<ArtistCreditT>;
  releaseGroup: Observable<EditorReleaseGroup>;
  mediums: ObservableArray<EditorMedium>;
  allTracks(): Iterable<EditorTrack>;
}

export interface MBReleaseEditor {
  rootField: {
    release: Observable<EditorRelease>;
    editNote: Observable<string>;
  };
  externalLinks?: {
    byType: Record<string, unknown>;
  };
  confirmSubmit(event: Event): Promise<'success' | 'error' | 'unloadpage' | 'failed-submission' | undefined>;
  _parseLanguageScript(languageID: string): {
    language: Observable<string | null>;
    script: Observable<string | null>;
  };
  getEditNote(): string;
  setEditNote(editNote: string): void;
  _editNoteDiff(): string;
  addArtistCredit(): void;
  editArtistCredit(index: number): void;
  removeArtistCredit(index: number): void;
  toggleEditNote(): void;
  toggleArtistCredit(): void;
  trackSelectable(index: number): void;
  switchBothSides(): void;
  openGuessCase(): void;
  openGuessCase(index: number): void;
  closeGuessCase(): void;
  guessCase(index: number, ...args: unknown[]): unknown;
  jumpToVisibleElement(): void;
  jumpToFirstError(): void;
  previousMedium(): void;
  nextMedium(): void;
  checkFormatAndShowWarning(): void;
  _mediaSelectable(): boolean;
}

export function getRelease() {
  assertMBReleaseEditor(MB);
  const release = MB.releaseEditor.rootField.release();
  if (!release) {
    throw new Error('Release data not available');
  }

  return release;
}
