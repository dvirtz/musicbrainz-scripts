type ImmutableTree<T> = Readonly<{
  left: ImmutableTree<T>;
  right: ImmutableTree<T>;
  value: T;
  size: number;
}>;

type Medium = Readonly<{
  id: number;
  tracks: ReadonlyArray<Track>;
}>;

type Track = Readonly<{
  position: number;
  recording: Recording;
}>;

type CreditChangeOptionT = '' | 'all' | 'same-entity-types' | 'same-relationship-type';

declare type EntityRoleT<T> = {
  entityType: T;
  id: number;
};

declare type LastUpdateRoleT = {
  last_updated: string | null;
};

declare type PendingEditsRoleT = {
  editsPending: boolean;
};

declare type RelatableEntityRoleT<T> = EntityRoleT<T> &
  LastUpdateRoleT &
  PendingEditsRoleT & {
    gid: string;
    name: string;
    paged_relationship_groups?: {
      [targetType: RelatableEntityTypeT]: PagedTargetTypeGroupT | void;
    };
    relationships?: ReadonlyArray<RelationshipT>;
  };

declare type UrlT = Readonly<
  RelatableEntityRoleT<T> & {
    decoded: string;
    href_url: string;
    pretty_name: string;
    show_in_external_links?: boolean;
    show_license_in_sidebar?: boolean;
    sidebar_name?: string;
  }
>;

declare type AnnotationRoleT = {
  latest_annotation?: AnnotationT;
};

declare type CommentRoleT = {
  comment: string;
};

declare type DatePeriodRoleT = {
  begin_date: PartialDateT | null;
  end_date: PartialDateT | null;
  ended: boolean;
};

declare type IpiCodesRoleT = {
  ipi_codes: ReadonlyArray<IpiCodeT>;
};

declare type IpiCodeT = PendingEditsRoleT & {
  ipi: string;
};

declare type IsniCodesRoleT = {
  isni_codes: ReadonlyArray<IsniCodeT>;
};

declare type IsniCodeT = PendingEditsRoleT & {
  isni: string;
};

declare type RatableRoleT = {
  rating?: number;
  rating_count?: number;
  user_rating?: number;
};

declare type ReviewableRoleT = {
  review_count?: number;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare type TypeRoleT<T> = {
  typeID: number | null;
  typeName?: string;
};

declare type ArtistT = Readonly<
  AnnotationRoleT &
    CommentRoleT &
    RelatableEntityRoleT<'artist'> &
    DatePeriodRoleT &
    IpiCodesRoleT &
    IsniCodesRoleT &
    RatableRoleT &
    ReviewableRoleT &
    TypeRoleT<ArtistTypeT> & {
      area: AreaT | null;
      begin_area: AreaT | null;
      begin_area_id: number | null;
      end_area: AreaT | null;
      end_area_id: number | null;
      gender: GenderT | null;
      gender_id: number | null;
      primaryAlias?: string | null;
      sort_name: string;
    }
>;

declare type AreaT = Readonly<
  AnnotationRoleT &
    CommentRoleT &
    RelatableEntityRoleT<'area'> &
    DatePeriodRoleT &
    TypeRoleT<AreaTypeT> & {
      containment: ReadonlyArray<AreaT> | null;
      country_code: string;
      iso_3166_1_codes: ReadonlyArray<string>;
      iso_3166_2_codes: ReadonlyArray<string>;
      iso_3166_3_codes: ReadonlyArray<string>;
      primary_code: string;
      primaryAlias?: string | null;
    }
>;

declare type GenderT = OptionTreeT<'gender'>;

declare type OptionTreeT<T> = EntityRoleT<T> & {
  child_order: number;
  description: string;
  gid: string;
  name: string;
  parent_id: number | null;
};

declare type AppearancesT<T> = {
  hits: number;
  results: ReadonlyArray<T>;
};

declare type ArtistCreditNameT = {
  artist: ArtistT;
  joinPhrase: string;
  name: string;
};

declare type ArtistCreditT = {
  editsPending?: boolean;
  entityType?: 'artist_credit';
  id?: number;
  names: ReadonlyArray<ArtistCreditNameT>;
};

declare type PartialDateT = {
  day?: ?number;
  month?: ?number;
  year?: ?number;
};

declare type IsrcT = EntityRoleT<'isrc'> &
  PendingEditsRoleT & {
    isrc: string;
    recording_id: number;
  };

declare type RecordingT = Readonly<
  AnnotationRoleT &
    CommentRoleT &
    RelatableEntityRoleT<'recording'> &
    RatableRoleT &
    ReviewableRoleT & {
      appearsOn?: AppearancesT<{gid: string; name: string}>;
      artist?: string;
      artistCredit?: ArtistCreditT;
      first_release_date?: PartialDateT;
      isrcs: ReadonlyArray<IsrcT>;
      length: number;
      primaryAlias?: string | null;
      related_works: ReadonlyArray<number>;
      video: boolean;
    }
>;

declare type WorkTypeT = OptionTreeT<'work_type'>;

declare type WorkAttributeT = {
  id: number | null;
  typeID: number;
  typeName: string;
  value: string;
  value_id: number | null;
};

declare type IswcT = EntityRoleT<'iswc'> &
  PendingEditsRoleT & {
    iswc: string;
    work_id: number;
  };

declare type LanguageT = {
  entityType: 'language';
  frequency: 0 | 1 | 2;
  id: number;
  iso_code_1: string | null;
  iso_code_2b: string | null;
  iso_code_2t: string | null;
  iso_code_3: string | null;
  name: string;
};

declare type WorkLanguageT = {
  language: LanguageT;
};

declare type WorkT = Readonly<
  AnnotationRoleT &
    CommentRoleT &
    RelatableEntityRoleT<'work'> &
    RatableRoleT &
    ReviewableRoleT &
    TypeRoleT<WorkTypeT> & {
      _fromBatchCreateWorksDialog?: boolean;
      artists: ReadonlyArray<ArtistCreditT>;
      attributes: ReadonlyArray<WorkAttributeT>;
      iswcs: ReadonlyArray<IswcT>;
      languages: ReadonlyArray<WorkLanguageT>;
      primaryAlias?: string | null;
      related_artists?: {
        artists: AppearancesT<string>;
        writers: AppearancesT<string>;
      };
      writers: ReadonlyArray<{
        credit: string;
        entity: ArtistT;
        roles: ReadonlyArray<string>;
      }>;
    }
>;

declare type NonUrlRelatableEntityT =
  | AreaT
  | ArtistT
  // | EventT
  // | GenreT
  // | InstrumentT
  // | LabelT
  // | PlaceT
  | RecordingT
  // | ReleaseGroupT
  // | ReleaseT
  // | SeriesT
  | WorkT;

type RelatableEntityT = NonUrlRelatableEntityT | UrlT;

type RelationshipEditStatusT = number;

type RelationshipStateForTypesT<T0 extends RelatableEntityT, T1 extends RelatableEntityT> = Readonly<{
  /*
   * _lineage is purely to help debug how a piece of relationship
   * state was created.  It should be appended to whenever
   * `cloneRelationshipState` is used.
   */
  _lineage: ReadonlyArray<string>;
  _original: RelationshipStateT | null;
  _status: RelationshipEditStatusT;
  attributes: ImmutableTree<LinkAttrT> | null;
  begin_date: PartialDateT | null;
  editsPending: boolean;
  end_date: PartialDateT | null;
  ended: boolean;
  entity0: T0;
  entity0_credit: string;
  entity1: T1;
  entity1_credit: string;
  id: number;
  linkOrder: number;
  linkTypeID: number | null;
}>;

type RelationshipStateT = RelationshipStateForTypesT<RelatableEntityT, RelatableEntityT>;

type UpdateRelationshipActionT = {
  batchSelectionCount: number | void;
  creditsToChangeForSource: CreditChangeOptionT;
  creditsToChangeForTarget: CreditChangeOptionT;
  newRelationshipState: RelationshipStateT;
  oldRelationshipState: RelationshipStateT | null;
  sourceEntity: RelatableEntityT;
  type: 'update-relationship-state';
};

type RelationshipEditorActionT = UpdateRelationshipActionT;

type MBID = string;

declare const MB: {
  relationshipEditor: {
    dispatch: (action: RelationshipEditorActionT) => void;
    getRelationshipStateId: () => number;
    state: {
      readonly selectedRecordings: ImmutableTree<Recording>;
      readonly mediumsByRecordingId: Map<number, Array<Medium>>;
    };
  };
  linkedEntities: {
    work: {[key: number]: WorkT};
    language: {[key: number]: LanguageT};
  };
  tree: {
    iterate: <T>(tree: ImmutableTree<T>) => Iterable<T>;
    equals: <T>(lhs: ImmutableTree<T>, rhs: ImmutableTree<T>) => boolean;
    toArray: <T>(tree: ImmutableTree<T>) => ReadonlyArray<T>;
    map: <T, U>(tree: ImmutableTree<T>, f: (value: T) => U) => ImmutableTree<U>;
  };
};
