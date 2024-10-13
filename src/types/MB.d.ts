import * as tree from 'weight-balanced-tree';

declare global {
  declare type MediumT = EntityRoleT<'medium'> &
    LastUpdateRoleT &
    Readonly<{
      cdtoc_track_lengths?: ReadonlyArray<number | null>;
      cdtoc_tracks?: ReadonlyArray<TrackT>;
      cdtocs: ReadonlyArray<string>;
      data_track_lengths?: ReadonlyArray<number | null>;
      editsPending: boolean;
      format: MediumFormatT | null;
      format_id: number | null;
      name: string;
      position: number;
      pregap_length?: ReadonlyArray<number | null>;
      release_id: number;
      track_count: number | null;
      tracks?: ReadonlyArray<TrackT>;
      tracks_pager?: PagerT;
    }>;

  declare type MediumWithRecordingsT = MediumT &
    Readonly<{
      tracks?: ReadonlyArray<TrackWithRecordingT>;
    }>;

  declare type TrackWithRecordingT = TrackT &
    Readonly<{
      recording: RecordingT;
    }>;

  declare type TrackT = Readonly<{
    position: number;
    recording: RecordingT;
  }>;

  declare type CreditChangeOptionT = '' | 'all' | 'same-entity-types' | 'same-relationship-type';

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

  declare type AnnotatedEntityT =
    // | AreaT
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

  declare type AnnotationT = {
    changelog: string;
    creation_date: string;
    editor: EditorT | null;
    html: string;
    id: number;
    parent: AnnotatedEntityT | null;
    text: string | null;
  };

  declare type EditorT = EntityRoleT<'editor'> & {
    avatar: string;
    deleted: boolean;
    name: string;
    privileges: number;
  };

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

  declare type ArtistTypeT = OptionTreeT<'artist_type'>;

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

  declare type AreaTypeT = OptionTreeT<'area_type'>;

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

  declare type RelatableEntityT = NonUrlRelatableEntityT | UrlT;

  declare type RelationshipEditStatusT = number;

  declare type RelationshipStateForTypesT<T0 extends RelatableEntityT, T1 extends RelatableEntityT> = Readonly<{
    /*
     * _lineage is purely to help debug how a piece of relationship
     * state was created.  It should be appended to whenever
     * `cloneRelationshipState` is used.
     */
    _lineage: ReadonlyArray<string>;
    _original: RelationshipStateT | null;
    _status: RelationshipEditStatusT;
    attributes: tree.ImmutableTree<LinkAttrT> | null;
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

  declare type RelationshipStateT = RelationshipStateForTypesT<RelatableEntityT, RelatableEntityT>;

  declare type UpdateRelationshipActionT = {
    batchSelectionCount: number | void;
    creditsToChangeForSource: CreditChangeOptionT;
    creditsToChangeForTarget: CreditChangeOptionT;
    newRelationshipState: RelationshipStateT;
    oldRelationshipState: RelationshipStateT | null;
    sourceEntity: RelatableEntityT;
    type: 'update-relationship-state';
  };

  declare type AcceptEditWorkDialogActionT = {
    languages: ReadonlyArray<LanguageT>;
    name: string;
    type: 'accept-edit-work-dialog';
    work: WorkT;
    workType: number | null;
  };

  declare type RelationshipEditorActionT = UpdateRelationshipActionT | AcceptEditWorkDialogActionT;

  declare type MediumStateTreeT = tree.ImmutableTree<[MediumWithRecordingsT, MediumRecordingStateTreeT]> | null;

  declare type MediumRecordingStateTreeT = tree.ImmutableTree<MediumRecordingStateT> | null;

  declare type MediumRecordingStateT = {
    isSelected: boolean;
    recording: RecordingT;
    relatedWorks: MediumWorkStateTreeT;
    targetTypeGroups: RelationshipTargetTypeGroupsT;
  };

  declare type MediumWorkStateTreeT = tree.ImmutableTree<MediumWorkStateT> | null;

  declare type MediumWorkStateT = {
    isSelected: boolean;
    targetTypeGroups: RelationshipTargetTypeGroupsT;
    work: WorkT;
  };

  declare type RelationshipTargetTypeGroupsT = tree.ImmutableTree<RelationshipTargetTypeGroupT> | null;

  declare type RelationshipTargetTypeGroupT = [RelatableEntityTypeT, RelationshipLinkTypeGroupsT];

  declare type RelationshipLinkTypeGroupsT = tree.ImmutableTree<RelationshipLinkTypeGroupT> | null;

  declare type RelationshipLinkTypeGroupT = {
    backward: boolean;
    phraseGroups: tree.ImmutableTree<RelationshipPhraseGroupT> | null;
    // Null types are represented by 0;
    typeId: number;
  };

  declare type RelationshipPhraseGroupT = {
    relationships: tree.ImmutableTree<RelationshipStateT> | null;
    textPhrase: string;
  };

  declare type RelatableEntityTypeT = NonUrlRelatableEntityTypeT | 'url';

  declare type NonUrlRelatableEntityTypeT = NonUrlRelatableEntityT['entityType'];

  declare type MBID = string;

  declare const MB: {
    relationshipEditor: {
      dispatch: (action: RelationshipEditorActionT) => void;
      getRelationshipStateId: () => number;
      state: Readonly<{
        selectedRecordings: tree.ImmutableTree<RecordingT>;
        selectedWorks: tree.ImmutableTree<WorkT>;
        mediumsByRecordingId: Map<number, Array<MediumWithRecordingsT>>;
        mediums: MediumStateTreeT;
      }>;
    };
    linkedEntities: {
      work: {[key: number]: WorkT};
      language: {[key: number]: LanguageT};
      work_type: {
        [workTypeId: number]: WorkTypeT;
      };
    };
    tree: typeof import('weight-balanced-tree');
    entity: <T>(data: Partial<T>, type?: string) => T;
    Control: {
      EntityAutocomplete: (options: {
        inputs?: JQuery<HTMLSpanElement>;
        entity?: string;
        input?: JQuery<HTMLInputElement>;
      }) => object;
    };
  };

  declare type ArtistSearchResultsT = {
    artists: ReadonlyArray<{
      id: MBID;
      name: string;
    }>;
    count: number;
  };

  declare type LinkAttrT = {
    credited_as?: string;
    text_value?: string;
    ype: {gid: string} | LinkAttrTypeT;
    typeID: number;
    typeName: string;
  };

  declare type LinkAttrTypeT = OptionTreeT<'link_attribute_type'> & {
    children?: ReadonlyArray<LinkAttrTypeT>;
    creditable: boolean;
    free_text: boolean;
    instrument_aliases?: ReadonlyArray<string>;
    instrument_comment?: string;
    instrument_type_id?: number;
    instrument_type_name?: string;
    l_description?: string;
    l_name?: string;
    level?: number;
    root_gid: string;
    root_id: number;
  };

  declare type LinkTypeAttrTypeT = TypeRoleT<LinkAttrTypeT> &
    Readonly<{
      max: number | null;
      min: number | null;
    }>;

  declare type LinkTypeT = OptionTreeT<'link_type'> & {
    attributes: {[typeId: StrOrNum]: LinkTypeAttrTypeT};
    cardinality0: number;
    cardinality1: number;
    children?: ReadonlyArray<LinkTypeT>;
    deprecated: boolean;
    documentation: string | null;
    examples: ReadonlyArray<{
      name: string;
      relationship: RelationshipT;
    }> | null;
    has_dates: boolean;
    id: number;
    /*
     * The l_* properties are not sent by the server; but cached client-
     * side by the relationship editor.
     */
    l_description?: string;
    l_link_phrase?: string;
    l_name?: string;
    l_reverse_link_phrase?: string;
    link_phrase: string;
    long_link_phrase: string;
    orderable_direction: number;
    reverse_link_phrase: string;
    root_id: number | null;
    type0: RelatableEntityTypeT;
    type1: RelatableEntityTypeT;
  };

  declare type OptionListT = ReadonlyArray<{
    text: string;
    value: number;
  }>;
}
