import * as tree from 'weight-balanced-tree';

declare global {
  const MB: {
    relationshipEditor: {
      dispatch: (action: RelationshipEditorActionT) => void;
      getRelationshipStateId: () => number;
      state: Readonly<{
        selectedRecordings: tree.ImmutableTree<RecordingT>;
        selectedWorks: tree.ImmutableTree<WorkT>;
        mediumsByRecordingId: Map<number, Array<MediumWithRecordingsT>>;
        mediums: MediumStateTreeT;
        editNoteField: FieldT<string>;
        enterEditForm: FormT<{
          make_votable: FieldT<boolean>;
        }>;
        entity: NonReleaseRelatableEntityT | ReleaseWithMediumsAndReleaseGroupT;
        relationshipsBySource: RelationshipSourceGroupsT;
        loadedTracks: LoadedTracksMapT;
      }>;
    };
    linkedEntities: {
      work: {[key: number]: WorkT};
      language: {[key: number]: LanguageT};
      work_type: {
        [workTypeId: number]: WorkTypeT;
      };
      link_attribute_type: {
        [linkAttributeTypeIdOrGid: StrOrNum]: LinkAttrTypeT;
      };
      link_type: {
        [linkTypeIdOrGid: StrOrNum]: LinkTypeT;
      };
      work_attribute_type: {
        [workAttributeTypeId: number]: WorkAttributeTypeT;
      };
    };
    tree: typeof tree;
    entity: <T>(data: Partial<T>, type?: string) => T;
  };

  type StrOrNum = string | number;

  type MediumT = EntityRoleT<'medium'> &
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

  type PagerT = {
    current_page: number;
    entries_per_page: number;
    first_page: 1;
    last_page: number;
    next_page: number | null;
    previous_page: number | null;
    total_entries: number;
  };

  type MediumFormatT = OptionTreeT<'medium_format'> & {
    has_discids: boolean;
    year?: number;
  };

  type MediumWithRecordingsT = MediumT &
    Readonly<{
      tracks?: ReadonlyArray<TrackWithRecordingT>;
    }>;

  type TrackWithRecordingT = TrackT &
    Readonly<{
      recording: RecordingT;
    }>;

  type TrackT = Readonly<{
    position: number;
    recording: RecordingT;
  }>;

  type CreditChangeOptionT = '' | 'all' | 'same-entity-types' | 'same-relationship-type';

  type EntityRoleT<T> = {
    entityType: T;
    id: number;
  };

  type LastUpdateRoleT = {
    last_updated: string | null;
  };

  type PendingEditsRoleT = {
    editsPending: boolean;
  };

  interface RelatableEntityRoleT<T> extends EntityRoleT<T>, LastUpdateRoleT, PendingEditsRoleT {
    gid: string;
    name: string;
    paged_relationship_groups?: {
      [targetType in RelatableEntityTypeT]: PagedTargetTypeGroupT | void;
    };
    relationships?: ReadonlyArray<RelationshipT>;
  }

  type PagedTargetTypeGroupT = {
    [linkTypeIdAndSourceColumn: string]: PagedLinkTypeGroupT;
  };

  type PagedLinkTypeGroupT = {
    backward: boolean;
    is_loaded: boolean;
    limit: number;
    link_type_id: number;
    offset: number;
    relationships: ReadonlyArray<RelationshipT>;
    total_relationships: number;
  };

  type UrlT = Readonly<
    RelatableEntityRoleT<'url'> & {
      decoded: string;
      href_url: string;
      pretty_name: string;
      show_in_external_links?: boolean;
      show_license_in_sidebar?: boolean;
      sidebar_name?: string;
    }
  >;

  type AnnotatedEntityT =
    | AreaT
    | ArtistT
    | EventT
    // | GenreT
    // | InstrumentT
    | LabelT
    | PlaceT
    | RecordingT
    | ReleaseGroupT
    | ReleaseT
    // | SeriesT
    | WorkT;

  type AnnotationT = {
    changelog: string;
    creation_date: string;
    editor: EditorT | null;
    html: string;
    id: number;
    parent: AnnotatedEntityT | null;
    text: string | null;
  };

  type EditorT = EntityRoleT<'editor'> & {
    avatar: string;
    deleted: boolean;
    name: string;
    privileges: number;
  };

  type AnnotationRoleT = {
    latest_annotation?: AnnotationT;
  };

  type CommentRoleT = {
    comment: string;
  };

  type DatePeriodRoleT = {
    begin_date: PartialDateT | null;
    end_date: PartialDateT | null;
    ended: boolean;
  };

  type IpiCodesRoleT = {
    ipi_codes: ReadonlyArray<IpiCodeT>;
  };

  type IpiCodeT = PendingEditsRoleT & {
    ipi: string;
  };

  type IsniCodesRoleT = {
    isni_codes: ReadonlyArray<IsniCodeT>;
  };

  type IsniCodeT = PendingEditsRoleT & {
    isni: string;
  };

  type RatableRoleT = {
    rating?: number;
    rating_count?: number;
    user_rating?: number;
  };

  type ReviewableRoleT = {
    review_count?: number;
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  type TypeRoleT<T> = {
    typeID: number | null;
    typeName?: string;
  };

  // need to use interface to break circular dependency
  interface ArtistT
    extends Readonly<AnnotationRoleT>,
      Readonly<CommentRoleT>,
      Readonly<RelatableEntityRoleT<'artist'>>,
      Readonly<DatePeriodRoleT>,
      Readonly<IpiCodesRoleT>,
      Readonly<IsniCodesRoleT>,
      Readonly<RatableRoleT>,
      Readonly<ReviewableRoleT>,
      Readonly<TypeRoleT<ArtistTypeT>> {
    readonly area: AreaT | null;
    readonly begin_area: AreaT | null;
    readonly begin_area_id: number | null;
    readonly end_area: AreaT | null;
    readonly end_area_id: number | null;
    readonly gender: GenderT | null;
    readonly gender_id: number | null;
    readonly primaryAlias?: string | null;
    readonly sort_name: string;
  }

  type ArtistTypeT = OptionTreeT<'artist_type'>;

  // need to use interface to break circular dependency
  interface AreaT
    extends Readonly<AnnotationRoleT>,
      Readonly<CommentRoleT>,
      Readonly<RelatableEntityRoleT<'area'>>,
      Readonly<DatePeriodRoleT>,
      Readonly<TypeRoleT<AreaTypeT>> {
    readonly containment: ReadonlyArray<AreaT> | null;
    readonly country_code: string;
    readonly iso_3166_1_codes: ReadonlyArray<string>;
    readonly iso_3166_2_codes: ReadonlyArray<string>;
    readonly iso_3166_3_codes: ReadonlyArray<string>;
    readonly primary_code: string;
    readonly primaryAlias?: string | null;
  }

  type AreaTypeT = OptionTreeT<'area_type'>;

  type GenderT = OptionTreeT<'gender'>;

  type OptionTreeT<T> = EntityRoleT<T> & {
    child_order: number;
    description: string;
    gid: string;
    name: string;
    parent_id: number | null;
  };

  type AppearancesT<T> = {
    hits: number;
    results: ReadonlyArray<T>;
  };

  type ArtistCreditNameT = {
    artist: ArtistT;
    joinPhrase: string;
    name: string;
  };

  type ArtistCreditT = {
    editsPending?: boolean;
    entityType?: 'artist_credit';
    id?: number;
    names: ReadonlyArray<ArtistCreditNameT>;
  };

  type PartialDateT = {
    day?: number | null;
    month?: number | null;
    year?: number | null;
  };

  type PartialDateStringsT = {
    day?: string;
    month?: string;
    year?: string;
  };

  type IsrcT = EntityRoleT<'isrc'> &
    PendingEditsRoleT & {
      isrc: string;
      recording_id: number;
    };

  // need to use interface to break circular dependency
  interface RecordingT
    extends Readonly<AnnotationRoleT>,
      Readonly<CommentRoleT>,
      Readonly<RelatableEntityRoleT<'recording'>>,
      Readonly<RatableRoleT>,
      Readonly<ReviewableRoleT> {
    readonly appearsOn?: AppearancesT<{gid: string; name: string}>;
    readonly artist?: string;
    readonly artistCredit?: ArtistCreditT;
    readonly first_release_date?: PartialDateT;
    readonly isrcs: ReadonlyArray<IsrcT>;
    readonly length: number;
    readonly primaryAlias?: string | null;
    readonly related_works: ReadonlyArray<number>;
    readonly video: boolean;
  }

  type WorkTypeT = OptionTreeT<'work_type'>;

  type WorkAttributeT = {
    id: number | null;
    typeID: number;
    typeName: string;
    value: string;
    value_id: number | null;
  };

  type IswcT = EntityRoleT<'iswc'> &
    PendingEditsRoleT & {
      iswc: string;
      work_id: number;
    };

  type LanguageT = EntityRoleT<'language'> & {
    frequency: 0 | 1 | 2;
    iso_code_1: string | null;
    iso_code_2b: string | null;
    iso_code_2t: string | null;
    iso_code_3: string | null;
    name: string;
  };

  type WorkLanguageT = {
    language: LanguageT;
  };

  // need to use interface to break circular dependency
  interface WorkT
    extends Readonly<AnnotationRoleT>,
      Readonly<CommentRoleT>,
      Readonly<RelatableEntityRoleT<'work'>>,
      Readonly<RatableRoleT>,
      Readonly<ReviewableRoleT>,
      Readonly<TypeRoleT<WorkTypeT>> {
    readonly _fromBatchCreateWorksDialog?: boolean;
    readonly artists: ReadonlyArray<ArtistCreditT>;
    readonly attributes: ReadonlyArray<WorkAttributeT>;
    readonly iswcs: ReadonlyArray<IswcT>;
    readonly languages: ReadonlyArray<WorkLanguageT>;
    readonly primaryAlias?: string | null;
    readonly related_artists?: {
      artists: AppearancesT<string>;
      writers: AppearancesT<string>;
    };
    readonly writers: ReadonlyArray<{
      credit: string;
      entity: ArtistT;
      roles: ReadonlyArray<string>;
    }>;
  }

  type NonUrlRelatableEntityT =
    | AreaT
    | ArtistT
    | EventT
    // | GenreT
    // | InstrumentT
    | LabelT
    | PlaceT
    | RecordingT
    | ReleaseGroupT
    | ReleaseT
    // | SeriesT
    | WorkT;

  type RelatableEntityT = NonUrlRelatableEntityT | UrlT;

  type RelationshipEditStatusT = number;

  // need to use interface to break circular dependency
  interface RelationshipStateForTypesT<T0 extends RelatableEntityT, T1 extends RelatableEntityT> {
    /*
     * _lineage is purely to help debug how a piece of relationship
     * state was created.  It should be appended to whenever
     * `cloneRelationshipState` is used.
     */
    readonly _lineage: ReadonlyArray<string>;
    readonly _original: RelationshipStateT | null;
    readonly _status: RelationshipEditStatusT;
    readonly attributes: tree.ImmutableTree<LinkAttrT> | null;
    readonly begin_date: PartialDateT | null;
    readonly editsPending: boolean;
    readonly end_date: PartialDateT | null;
    readonly ended: boolean;
    readonly entity0: T0;
    readonly entity0_credit: string;
    readonly entity1: T1;
    readonly entity1_credit: string;
    readonly id: number;
    readonly linkOrder: number;
    readonly linkTypeID: number | null;
  }

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

  type AcceptEditWorkDialogActionT = {
    languages: ReadonlyArray<LanguageT>;
    name: string;
    type: 'accept-edit-work-dialog';
    work: WorkT;
    workType: number | null;
  };

  type RelationshipEditorActionT =
    | UpdateRelationshipActionT
    | AcceptEditWorkDialogActionT
    | {
        isSelected: boolean;
        type: 'toggle-select-work';
        work: WorkT;
      }
    | {
        recording: RecordingT;
        type: 'remove-work';
        workState: MediumWorkStateT;
      }
    | {
        edits:
          | Array<[Array<RelationshipStateT>, WsJsEditRelationshipT]>
          | Array<[Array<RelationshipStateT>, WsJsEditWorkCreateT]>;
        responseData: WsJsEditResponseT;
        type: 'update-submitted-relationships';
      }
    | {
        editNote: string;
        type: 'update-edit-note';
      };

  type MediumStateTreeT = tree.ImmutableTree<[MediumWithRecordingsT, MediumRecordingStateTreeT]> | null;

  type MediumRecordingStateTreeT = tree.ImmutableTree<MediumRecordingStateT> | null;

  type MediumRecordingStateT = {
    isSelected: boolean;
    recording: RecordingT;
    relatedWorks: MediumWorkStateTreeT;
    targetTypeGroups: RelationshipTargetTypeGroupsT;
  };

  type MediumWorkStateTreeT = tree.ImmutableTree<MediumWorkStateT> | null;

  type MediumWorkStateT = {
    isSelected: boolean;
    targetTypeGroups: RelationshipTargetTypeGroupsT;
    work: WorkT;
  };

  type RelationshipTargetTypeGroupsT = tree.ImmutableTree<RelationshipTargetTypeGroupT> | null;

  type RelationshipTargetTypeGroupT = [RelatableEntityTypeT, RelationshipLinkTypeGroupsT];

  type RelationshipLinkTypeGroupsT = tree.ImmutableTree<RelationshipLinkTypeGroupT> | null;

  type RelationshipLinkTypeGroupT = {
    backward: boolean;
    phraseGroups: tree.ImmutableTree<RelationshipPhraseGroupT> | null;
    // Null types are represented by 0;
    typeId: number;
  };

  type RelationshipPhraseGroupT = {
    relationships: tree.ImmutableTree<RelationshipStateT> | null;
    textPhrase: string;
  };

  type RelatableEntityTypeT = NonUrlRelatableEntityTypeT | 'url';

  type NonUrlRelatableEntityTypeT = NonUrlRelatableEntityT['entityType'];

  type MBID = string;

  type CommonSearchResultsT = Readonly<{
    count: number;
  }>;

  type ArtistSearchResultsT = CommonSearchResultsT & {
    artists: ReadonlyArray<{
      id: MBID;
      name: string;
      aliases: ReadonlyArray<{name: string}>;
    }>;
  };

  type WorkSearchResultsT = CommonSearchResultsT & {
    works: ReadonlyArray<{
      id: MBID;
    }>;
  };

  type IswcLookupResultsT = Readonly<{
    'work-count': number;
    works: ReadonlyArray<{
      id: MBID;
    }>;
  }>;

  type WorkLookupResultT = Readonly<{
    id: MBID;
    attributes: ReadonlyArray<{
      type: string;
      value: string;
    }>;
  }>;

  type LinkAttrT = {
    credited_as?: string;
    text_value?: string;
    type: {gid: string} | LinkAttrTypeT;
    typeID: number;
    typeName: string;
  };

  type LinkAttrTypeT = OptionTreeT<'link_attribute_type'> & {
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

  type LinkTypeAttrTypeT = TypeRoleT<LinkAttrTypeT> &
    Readonly<{
      max: number | null;
      min: number | null;
    }>;

  type LinkTypeT = OptionTreeT<'link_type'> & {
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

  type RelationshipT = DatePeriodRoleT &
    PendingEditsRoleT &
    Readonly<{
      attributes: ReadonlyArray<LinkAttrT>;
      backward: boolean;
      entity0?: RelatableEntityT;
      entity0_credit: string;
      entity0_id: number;
      entity1?: RelatableEntityT;
      entity1_credit: string;
      entity1_id: number;
      id: number;
      linkOrder: number;
      linkTypeID: number;
      source_id: number | null;
      source_type: RelatableEntityTypeT;
      target: RelatableEntityT;
      target_type: RelatableEntityTypeT;
      verbosePhrase: string;
    }>;

  type OptionListT = ReadonlyArray<{
    text: string;
    value: number;
  }>;

  type WorkAttributeTypeT = CommentRoleT &
    OptionTreeT<'work_attribute_type'> & {
      free_text: boolean;
    };

  type WorkAttributeTypeTreeT = WorkAttributeTypeT & {
    children?: ReadonlyArray<WorkAttributeTypeTreeT>;
  };

  type WorkAttributeTypeTreeRootT = {
    children: ReadonlyArray<WorkAttributeTypeTreeT>;
  };

  type WorkAttributeTypeAllowedValueT = OptionTreeT<'work_attribute_type_allowed_value'> & {
    value: string;
    workAttributeTypeID: number;
  };

  type WorkAttributeTypeAllowedValueTreeT = WorkAttributeTypeAllowedValueT & {
    children?: ReadonlyArray<WorkAttributeTypeAllowedValueTreeT>;
  };

  type WorkAttributeTypeAllowedValueTreeRootT = {
    children: ReadonlyArray<WorkAttributeTypeAllowedValueTreeT>;
  };

  type WsJsEditRelationshipT =
    | WsJsEditRelationshipCreateT
    | WsJsEditRelationshipEditT
    | WsJsEditRelationshipDeleteT
    | WsJsEditRelationshipsReorderT;

  type WsJsRelationshipAttributeT = {
    credited_as?: string;
    removed?: boolean;
    text_value?: string;
    type: {gid: string};
  };

  type WsJsRelationshipEntityT =
    | {
        entityType: NonUrlRelatableEntityTypeT;
        gid: string;
        name: string;
      }
    | {
        entityType: 'url';
        // We only use URL gids on the edit-url form.
        gid?: string;
        name: string;
      };

  type WsJsRelationshipCommonT = {
    attributes: ReadonlyArray<WsJsRelationshipAttributeT>;
    begin_date?: PartialDateT;
    end_date?: PartialDateT;
    ended?: boolean;
    entities: [WsJsRelationshipEntityT, WsJsRelationshipEntityT];
    entity0_credit: string;
    entity1_credit: string;
  };

  type EDIT_RELEASE_CREATE_T = 31;
  type EDIT_MEDIUM_CREATE_T = 51;
  type EDIT_RELATIONSHIP_CREATE_T = 90;
  type EDIT_RELATIONSHIP_EDIT_T = 91;
  type EDIT_RELATIONSHIP_DELETE_T = 92;
  type EDIT_RELATIONSHIPS_REORDER_T = 99;

  type WsJsEditRelationshipCreateT = WsJsRelationshipCommonT &
    Readonly<{
      edit_type: EDIT_RELATIONSHIP_CREATE_T;
      linkOrder?: number;
      linkTypeID: number;
    }>;

  type WsJsEditRelationshipEditT = Partial<WsJsRelationshipCommonT> &
    Readonly<{
      edit_type: EDIT_RELATIONSHIP_EDIT_T;
      id: number;
      linkTypeID: number;
    }>;

  type WsJsEditRelationshipDeleteT = Readonly<{
    edit_type: EDIT_RELATIONSHIP_DELETE_T;
    id: number;
    linkTypeID: number;
  }>;

  type WsJsEditRelationshipsReorderT = {
    edit_type: EDIT_RELATIONSHIPS_REORDER_T;
    linkTypeID: number;
    relationship_order: ReadonlyArray<{
      link_order: number;
      relationship_id: number;
    }>;
  };

  type EDIT_WORK_CREATE_T = 41;
  type EDIT_WORK_EDIT_T = 42;

  type WsJsEditWorkCreateT = {
    comment: string;
    edit_type: EDIT_WORK_CREATE_T;
    languages: ReadonlyArray<number>;
    name: string;
    type_id: number | null;
  };

  type WS_EDIT_RESPONSE_OK_T = 1;
  type WS_EDIT_RESPONSE_NO_CHANGES_T = 2;

  type WsJsEditResponseT = {
    edits: ReadonlyArray<
      | {
          edit_type: EDIT_RELATIONSHIP_CREATE_T;
          relationship_id: number | null;
          response: WS_EDIT_RESPONSE_OK_T;
        }
      | {
          edit_type: EDIT_RELEASE_CREATE_T;
          entity: ReleaseT;
          response: WS_EDIT_RESPONSE_OK_T;
        }
      // | {
      //     edit_type: EDIT_RELEASEGROUP_CREATE_T;
      //     entity: ReleaseGroupT;
      //     response: WS_EDIT_RESPONSE_OK_T;
      //   }
      | {
          edit_type: EDIT_MEDIUM_CREATE_T;
          entity: {id: number; position: number};
          response: WS_EDIT_RESPONSE_OK_T;
        }
      | {
          edit_type: EDIT_WORK_CREATE_T;
          entity: WorkT;
          response: WS_EDIT_RESPONSE_OK_T;
        }
      // | {
      //     edit_type: EDIT_RELEASE_ADDRELEASELABEL_T;
      //     entity: {
      //       catalogNumber: string | null;
      //       id: number;
      //       labelID: number | null;
      //     };
      //     response: WS_EDIT_RESPONSE_OK_T;
      //   }
      | {
          edit_type: // | EDIT_MEDIUM_ADD_DISCID_T
          // | EDIT_MEDIUM_DELETE_T
          // | EDIT_MEDIUM_EDIT_T
          // | EDIT_RECORDING_EDIT_T
          // | EDIT_RELATIONSHIP_DELETE_T
          EDIT_RELATIONSHIP_EDIT_T;
          // | EDIT_RELEASE_ADD_ANNOTATION_T
          // | EDIT_RELEASE_DELETERELEASELABEL_T
          // | EDIT_RELEASE_EDIT_T
          // | EDIT_RELEASE_EDITRELEASELABEL_T
          // | EDIT_RELEASE_REORDER_MEDIUMS_T
          // | EDIT_RELEASEGROUP_EDIT_T;
          response: WS_EDIT_RESPONSE_OK_T;
        }
      | {response: WS_EDIT_RESPONSE_NO_CHANGES_T}
    >;
  };

  type FieldT<V> = {
    errors: ReadonlyArray<string>;
    has_errors: boolean;
    html_name: string;
    id: number;
    pendingErrors?: ReadonlyArray<string>;
    type: 'field';
    value: V;
  };

  type RepeatableFieldT<F> = {
    errors: ReadonlyArray<string>;
    field: Array<F>;
    has_errors: boolean;
    html_name: string;
    id: number;
    last_index: number;
    pendingErrors?: ReadonlyArray<string>;
    type: 'repeatable_field';
  };

  type FormT<F, N extends string = ''> = {
    field: F;
    has_errors: boolean;
    name: N;
    type: 'form';
  };

  export type ReleaseWithMediumsAndReleaseGroupT = ReleaseWithMediumsT &
    Readonly<{
      releaseGroup: ReleaseGroupT;
    }>;

  type ReleaseWithMediumsT = ReleaseT &
    Readonly<{
      mediums: ReadonlyArray<MediumWithRecordingsT>;
    }>;

  // need to use interface to break circular dependency
  interface ReleaseT
    extends Readonly<AnnotationRoleT>,
      Readonly<ArtistCreditRoleT>,
      Readonly<CommentRoleT>,
      Readonly<RelatableEntityRoleT<'release'>> {
    readonly barcode: string | null;
    readonly combined_format_name?: string;
    readonly combined_track_count?: string;
    readonly cover_art_presence: 'absent' | 'present' | 'darkened' | null;
    readonly events?: ReadonlyArray<ReleaseEventT>;
    readonly has_no_tracks: boolean;
    readonly labels?: ReadonlyArray<ReleaseLabelT>;
    readonly language: LanguageT | null;
    readonly languageID: number | null;
    readonly length?: number;
    readonly may_have_cover_art?: boolean;
    readonly may_have_discids?: boolean;
    readonly mediums?: ReadonlyArray<MediumT>;
    readonly packagingID: number | null;
    readonly primaryAlias?: string | null;
    readonly quality: QualityT;
    readonly releaseGroup?: ReleaseGroupT;
    readonly script: ScriptT | null;
    readonly scriptID: number | null;
    readonly status: ReleaseStatusT | null;
    readonly statusID: number | null;
  }

  type ReleaseLabelT = {
    catalogNumber: string | null;
    label: LabelT | null;
    label_id: number | null;
  };

  // need to use interface to break circular dependency
  interface LabelT
    extends Readonly<AnnotationRoleT>,
      Readonly<CommentRoleT>,
      Readonly<RelatableEntityRoleT<'label'>>,
      Readonly<DatePeriodRoleT>,
      Readonly<IpiCodesRoleT>,
      Readonly<IsniCodesRoleT>,
      Readonly<RatableRoleT>,
      Readonly<ReviewableRoleT>,
      Readonly<TypeRoleT<LabelTypeT>> {
    readonly area: AreaT | null;
    readonly label_code: number;
    readonly primaryAlias?: string | null;
  }

  type LabelTypeT = OptionTreeT<'label_type'>;

  type ScriptT = {
    entityType: 'script';
    frequency: 1 | 2 | 3 | 4;
    id: number;
    iso_code: string;
    iso_number: string | null;
    name: string;
  };

  type ReleaseStatusT = OptionTreeT<'release_status'>;

  type ArtistCreditRoleT = {
    artist: string;
    artistCredit: ArtistCreditT;
  };

  type ReleaseEventT = {
    country: AreaT | null;
    date: PartialDateT | null;
  };

  type QualityT = -1 | 0 | 1 | 2;

  // need to use interface to break circular dependency
  interface ReleaseGroupT
    extends Readonly<AnnotationRoleT>,
      Readonly<ArtistCreditRoleT>,
      Readonly<CommentRoleT>,
      Readonly<RelatableEntityRoleT<'release_group'>>,
      Readonly<RatableRoleT>,
      Readonly<ReviewableRoleT>,
      Readonly<TypeRoleT<ReleaseGroupTypeT>> {
    readonly cover_art?: ReleaseArtT;
    readonly firstReleaseDate: string | null;
    readonly hasCoverArt: boolean;
    readonly l_type_name: string | null;
    readonly primaryAlias?: string | null;
    readonly release_count: number;
    readonly release_group?: ReleaseGroupT;
    readonly secondaryTypeIDs: ReadonlyArray<number>;
    readonly typeID: number | null;
  }

  type ReleaseGroupTypeT = OptionTreeT<'release_group_type'> & {
    historic: false;
  };

  type ReleaseArtT = ArtworkRoleT &
    Readonly<{
      release?: ReleaseT;
    }>;

  type ArtworkRoleT = PendingEditsRoleT &
    Readonly<{
      comment: string;
      event?: EventT;
      filename: string | null;
      huge_ia_thumbnail: string;
      huge_thumbnail: string;
      id: number;
      image: string | null;
      large_ia_thumbnail: string;
      large_thumbnail: string;
      mime_type: string;
      small_ia_thumbnail: string;
      small_thumbnail: string;
      suffix: string;
      types: ReadonlyArray<string>;
    }>;

  // need to use interface to break circular dependency
  interface EventT
    extends Readonly<AnnotationRoleT>,
      Readonly<CommentRoleT>,
      Readonly<RelatableEntityRoleT<'event'>>,
      Readonly<DatePeriodRoleT>,
      Readonly<RatableRoleT>,
      Readonly<ReviewableRoleT>,
      Readonly<TypeRoleT<EventTypeT>> {
    readonly areas: ReadonlyArray<{
      credit: string;
      entity: AreaT;
    }>;
    readonly cancelled: boolean;
    readonly event_art_presence: 'absent' | 'present' | 'darkened' | null;
    readonly may_have_event_art?: boolean;
    readonly performers: ReadonlyArray<{
      credit: string;
      entity: ArtistT;
      roles: ReadonlyArray<string>;
    }>;
    readonly places: ReadonlyArray<{
      credit: string;
      entity: PlaceT;
    }>;
    readonly primaryAlias?: string | null;
    readonly related_entities?: {
      areas: AppearancesT<string>;
      performers: AppearancesT<string>;
      places: AppearancesT<string>;
    };
    readonly related_series: ReadonlyArray<number>;
    readonly setlist?: string;
    readonly time: string;
  }

  type EventTypeT = OptionTreeT<'event_type'>;

  export type NonReleaseRelatableEntityT =
    // | AreaT
    | ArtistT
    | EventT
    // | GenreT
    // | InstrumentT
    | LabelT
    | PlaceT
    | RecordingT
    | ReleaseGroupT
    // | SeriesT
    | UrlT
    | WorkT;

  // need to use interface to break circular dependency
  interface PlaceT
    extends Readonly<AnnotationRoleT>,
      Readonly<CommentRoleT>,
      Readonly<RelatableEntityRoleT<'place'>>,
      Readonly<DatePeriodRoleT>,
      Readonly<RatableRoleT>,
      Readonly<ReviewableRoleT>,
      Readonly<TypeRoleT<PlaceTypeT>> {
    readonly address: string;
    readonly area: AreaT | null;
    readonly coordinates: CoordinatesT | null;
    readonly primaryAlias?: string | null;
  }

  type PlaceTypeT = OptionTreeT<'place_type'>;

  type CoordinatesT = {
    latitude: number;
    longitude: number;
  };

  type RelationshipSourceGroupsT = tree.ImmutableTree<RelationshipSourceGroupT> | null;

  type RelationshipSourceGroupT = [RelatableEntityT, RelationshipTargetTypeGroupsT];

  type MaybeGroupedOptionsT = {grouped: true; options: GroupedOptionsT} | {grouped: false; options: SelectOptionsT};

  type GroupedOptionsT = ReadonlyArray<{
    optgroup: string;
    options: SelectOptionsT;
  }>;

  type SelectOptionsT = ReadonlyArray<SelectOptionT>;

  type SelectOptionT = {
    label: string | (() => string);
    value: number | string;
  };

  type FormOrAnyFieldT = FormT<SubfieldsT> | AnyFieldT;

  type SubfieldsT = {
    [fieldName: string]: AnyFieldT;
  };

  type AnyFieldT =
    | {
        errors: ReadonlyArray<string>;
        field: SubfieldsT;
        pendingErrors?: ReadonlyArray<string>;
        type: 'compound_field';
      }
    | {
        errors: ReadonlyArray<string>;
        field: ReadonlyArray<AnyFieldT>;
        pendingErrors?: ReadonlyArray<string>;
        type: 'repeatable_field';
      }
    | {
        errors: ReadonlyArray<string>;
        pendingErrors?: ReadonlyArray<string>;
        type: 'field';
      };

  type LoadedTracksMapT = ReadonlyMap<number, ReadonlyArray<TrackWithRecordingT>>;
}
