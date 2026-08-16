// cspell:ignore unloadpage

/**
 * Type definitions for MusicBrainz Release Editor
 * Based on knockout observables exposed in the MB.releaseEditor context
 */

import {assertMBReleaseEditor} from '#asserts.ts';
import {ArtistCreditT, MediumT, TrackT} from 'typedbrainz/types';

// Knockout observable shape used by MusicBrainz release editor
export type Observable<T> = {
  (): T;
  (value: T): void;
  subscribe(callback: (value: T) => void): {dispose(): void};
};
type ObservableArray<T> = {
  (): T[];
  (value: T[]): void;
  subscribe(callback: (value: T[]) => void): {dispose(): void};
  peek(): T[];
  push(...values: T[]): void;
  remove(value: T): T[];
  removeAll(): T[];
  splice(start: number, deleteCount: number, ...values: T[]): T[];
  indexOf(value: T): number;
  notifySubscribers(values?: T[]): void;
};
type Computed<T> = () => T;

export type EditorMedium = {
  release: EditorRelease;
  formatID: Observable<string>;
  position: Observable<number>;
  name: Observable<string | undefined>;
  tracks: ObservableArray<EditorTrack>;
  audioTracks: Computed<EditorTrack[]>;
  dataTracks: Computed<EditorTrack[]>;
  hasPregap: Computed<boolean>;
  loaded: Observable<boolean>;
  loading: Observable<boolean>;
  collapsed: Observable<boolean>;
  toc: Observable<unknown>;
  uniqueID: number | string;
  originalID?: number;
  id?: number;
  /** set by `MB.releaseEditor.removeMedium` */
  removed?: boolean;
  hasTracks(): boolean;
  hasToc(): boolean;
  hasExistingTocs(): boolean;
  loadTracks(): void;
  formattedName(): string;
  pushTrack(data: Partial<TrackT>): void;
};

export type EditorTrack = {
  uniqueID: number | string;
  elementID: string;
  id?: number;
  gid?: string;
  name: Observable<string>;
  /** plain property, not an observable: must be reassigned when moving a track between mediums */
  medium: EditorMedium;
  position: Observable<number>;
  number: Observable<string | number>;
  isDataTrack: Observable<boolean>;
  /// milliseconds
  length: Observable<number | null>;
  artistCredit: Observable<ArtistCreditT>;
  recording: Observable<{
    gid?: string;
    artistCredit: ArtistCreditT;
  }>;
  hasExistingRecording(): boolean;
  previous(): EditorTrack | undefined;
  next(): EditorTrack | undefined;
};

type EditorBarcode = {
  value: Computed<string>;
};

type EditorReleaseLabel = {
  label: Observable<{name: string}>;
  catalogNumber: Observable<string>;
};

type EditorReleaseEvent = {
  date: {
    year: Observable<string | null>;
    month: Observable<string | null>;
    day: Observable<string | null>;
  };
  countryID: Observable<string | null>;
  hasInvalidDate: Computed<boolean>;
};

type EditorReleaseGroup = {
  artistCredit: ArtistCreditT;
  [key: string]: unknown;
};

export type EditorRelease = {
  uniqueID: number | string;
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
};

export type MBReleaseEditor = {
  rootField: {
    release: Observable<EditorRelease>;
    editNote: Observable<string>;
  };
  fields: {
    Medium: new (medium: Partial<MediumT>, release: EditorRelease) => EditorMedium;
    Track: new (track: Partial<TrackT>, medium: EditorMedium) => EditorTrack;
  };
  moveMediumUp(medium: EditorMedium): void;
  moveMediumDown(medium: EditorMedium): void;
  changeMediumPosition(medium: EditorMedium, delta: number): void;
  removeMedium(medium: EditorMedium): void;
  resetTrackNumbers(medium: EditorMedium): void;
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
};

export function getRelease() {
  const release = getReleaseEditor().rootField.release();
  if (!release) {
    throw new Error('Release data not available');
  }

  return release;
}

export function getReleaseEditor() {
  assertMBReleaseEditor(MB);
  return MB.releaseEditor;
}
