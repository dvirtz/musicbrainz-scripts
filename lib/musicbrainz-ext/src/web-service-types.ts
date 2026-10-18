// cspell:words joinphrase
// JSON web-service shapes; typedbrainz describes the website's internal entity models.
export type MBEntityReference = {
  id: string;
  name?: string;
  title?: string;
  disambiguation?: string;
  type?: string;
  'type-id'?: string;
};
type MBNamedEntity = MBEntityReference & {name: string};

export type MBRelationship = {
  type?: string;
  'type-id'?: string;
  direction?: string;
  begin?: string | null;
  end?: string | null;
  ended?: boolean;
  attributes?: string[];
  'attribute-ids'?: Record<string, string>;
  'attribute-values'?: Record<string, string>;
  'source-credit'?: string;
  'target-credit'?: string;
  'target-type'?: string;
  'ordering-key'?: number;
  area?: MBNamedEntity;
  artist?: MBNamedEntity;
  event?: MBNamedEntity & {time?: string; 'life-span'?: {begin?: string; end?: string}};
  label?: MBNamedEntity;
  place?: MBNamedEntity;
  recording?: MBEntityReference;
  release?: MBEntityReference;
  release_group?: MBEntityReference;
  series?: MBNamedEntity;
  url?: {id?: string; resource?: string};
  work?: MBEntityReference;
};

export type MBEvent = MBEntityReference & {
  name: string;
  time?: string;
  setlist?: string;
  cancelled?: boolean;
  'life-span'?: {begin?: string; end?: string};
  relations?: readonly MBRelationship[];
};

export type MBSeries = MBEntityReference & {name: string; relations?: readonly MBRelationship[]};
export type MBEntity = MBEvent | MBSeries | MBRelease;
export type MBArtistCredit = {artist: MBEntityReference; name?: string; joinphrase?: string};
export type MBRecording = MBEntityReference & {relations?: MBRelationship[]; 'artist-credit'?: MBArtistCredit[]};
export type MBTrack = {position: number; title: string; 'artist-credit'?: MBArtistCredit[]; recording: MBRecording};
export type MBRelease = MBEntityReference & {
  title: string;
  date?: string;
  'release-group'?: {'secondary-types'?: string[]};
  relations: MBRelationship[];
  'artist-credit': MBArtistCredit[];
  media: {position: number; tracks: MBTrack[]}[];
};
