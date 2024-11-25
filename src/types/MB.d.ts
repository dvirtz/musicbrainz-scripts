import * as tree from 'weight-balanced-tree';

declare global {
  declare const MB: {
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
    tree: typeof import('weight-balanced-tree');
    entity: <T>(data: Partial<T>, type?: string) => T;
  };

  declare type StrOrNum = string | number;

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

  declare type PagedTargetTypeGroupT = {
    [linkTypeIdAndSourceColumn: string]: PagedLinkTypeGroupT;
  };

  declare type PagedLinkTypeGroupT = {
    backward: boolean;
    is_loaded: boolean;
    limit: number;
    link_type_id: number;
    offset: number;
    relationships: ReadonlyArray<RelationshipT>;
    total_relationships: number;
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
    | AreaT
    | ArtistT
    | EventT
    // | GenreT
    // | InstrumentT
    // | LabelT
    | PlaceT
    | RecordingT
    | ReleaseGroupT
    | ReleaseT
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

  declare type PartialDateStringsT = {
    day?: string;
    month?: string;
    year?: string;
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

  declare type LanguageT = EntityRoleT<'language'> & {
    frequency: 0 | 1 | 2;
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
    | EventT
    // | GenreT
    // | InstrumentT
    // | LabelT
    | PlaceT
    | RecordingT
    | ReleaseGroupT
    | ReleaseT
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

  declare type UpdateEntityActionT = {
    changes: {[property: string]: mixed};
    entityType: RelatableEntityTypeT;
    type: 'update-entity';
  };

  declare type RelationshipEditorActionT =
    | UpdateRelationshipActionT
    | AcceptEditWorkDialogActionT
    | UpdateEntityActionT
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
      };

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
    type: {gid: string} | LinkAttrTypeT;
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

  declare type RelationshipT = DatePeriodRoleT &
    PendingEditsRoleT &
    Readonly<{
      attributes: ReadonlyArray<LinkAttrT>;
      backward: boolean;
      entity0?: ?RelatableEntityT;
      entity0_credit: string;
      entity0_id: number;
      entity1?: ?RelatableEntityT;
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

  declare type OptionListT = ReadonlyArray<{
    text: string;
    value: number;
  }>;

  declare type WorkAttributeTypeT = CommentRoleT &
    OptionTreeT<'work_attribute_type'> & {
      free_text: boolean;
    };

  declare type WorkAttributeTypeTreeT = WorkAttributeTypeT & {
    children?: ReadonlyArray<WorkAttributeTypeTreeT>;
  };

  declare type WorkAttributeTypeTreeRootT = {children: ReadonlyArray<WorkAttributeTypeTreeT>};

  declare type WorkAttributeTypeAllowedValueT = OptionTreeT<'work_attribute_type_allowed_value'> & {
    value: string;
    workAttributeTypeID: number;
  };

  declare type WorkAttributeTypeAllowedValueTreeT = WorkAttributeTypeAllowedValueT & {
    children?: ReadonlyArray<WorkAttributeTypeAllowedValueTreeT>;
  };

  declare type WorkAttributeTypeAllowedValueTreeRootT = {children: ReadonlyArray<WorkAttributeTypeAllowedValueTreeT>};

  declare type WsJsEditRelationshipT =
    | WsJsEditRelationshipCreateT
    | WsJsEditRelationshipEditT
    | WsJsEditRelationshipDeleteT
    | WsJsEditRelationshipsReorderT;

  declare type WsJsRelationshipAttributeT = {
    credited_as?: string;
    removed?: boolean;
    text_value?: string;
    type: {gid: string};
  };

  declare type WsJsRelationshipEntityT =
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

  declare type WsJsRelationshipCommonT = {
    attributes: ReadonlyArray<WsJsRelationshipAttributeT>;
    begin_date?: PartialDateT;
    end_date?: PartialDateT;
    ended?: boolean;
    entities: [WsJsRelationshipEntityT, WsJsRelationshipEntityT];
    entity0_credit: string;
    entity1_credit: string;
  };

  declare type EDIT_RELATIONSHIP_CREATE_T = 90;
  declare type EDIT_RELATIONSHIP_EDIT_T = 91;
  declare type EDIT_RELATIONSHIP_DELETE_T = 92;
  declare type EDIT_RELATIONSHIPS_REORDER_T = 99;

  declare type WsJsEditRelationshipCreateT = WsJsRelationshipCommonT &
    Readonly<{
      edit_type: EDIT_RELATIONSHIP_CREATE_T;
      linkOrder?: number;
      linkTypeID: number;
    }>;

  declare type WsJsEditRelationshipEditT = Partial<WsJsRelationshipCommonT> &
    Readonly<{
      edit_type: EDIT_RELATIONSHIP_EDIT_T;
      id: number;
      linkTypeID: number;
    }>;

  declare type WsJsEditRelationshipDeleteT = Readonly<{
    edit_type: EDIT_RELATIONSHIP_DELETE_T;
    id: number;
    linkTypeID: number;
  }>;

  declare type WsJsEditRelationshipsReorderT = {
    edit_type: EDIT_RELATIONSHIPS_REORDER_T;
    linkTypeID: number;
    relationship_order: ReadonlyArray<{
      link_order: number;
      relationship_id: number;
    }>;
  };

  declare type EDIT_WORK_CREATE_T = 41;
  declare type EDIT_WORK_EDIT_T = 42;

  declare type WsJsEditWorkCreateT = {
    comment: string;
    edit_type: EDIT_WORK_CREATE_T;
    languages: ReadonlyArray<number>;
    name: string;
    type_id: number | null;
  };

  declare type WS_EDIT_RESPONSE_OK_T = 1;
  declare type WS_EDIT_RESPONSE_NO_CHANGES_T = 2;

  declare type WsJsEditResponseT = {
    edits: ReadonlyArray<
      | {
          edit_type: EDIT_RELATIONSHIP_CREATE_T;
          relationship_id: number | null;
          response: WS_EDIT_RESPONSE_OK_T;
        }
      // | {
      //     edit_type: EDIT_RELEASE_CREATE_T;
      //     entity: ReleaseT;
      //     response: WS_EDIT_RESPONSE_OK_T;
      //   }
      // | {
      //     edit_type: EDIT_RELEASEGROUP_CREATE_T;
      //     entity: ReleaseGroupT;
      //     response: WS_EDIT_RESPONSE_OK_T;
      //   }
      // | {
      //     edit_type: EDIT_MEDIUM_CREATE_T;
      //     entity: {id: number; position: number};
      //     response: WS_EDIT_RESPONSE_OK_T;
      //   }
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

  declare type FieldT<V> = {
    errors: ReadonlyArray<string>;
    has_errors: boolean;
    html_name: string;
    id: number;
    pendingErrors?: ReadonlyArray<string>;
    type: 'field';
    value: V;
  };

  declare type RepeatableFieldT<F> = {
    errors: ReadonlyArray<string>;
    field: Array<F>;
    has_errors: boolean;
    html_name: string;
    id: number;
    last_index: number;
    pendingErrors?: ReadonlyArray<string>;
    type: 'repeatable_field';
  };

  declare type FormT<F, N extends string = ''> = {
    field: F;
    has_errors: boolean;
    name: N;
    type: 'form';
  };

  export type ReleaseWithMediumsAndReleaseGroupT = ReleaseWithMediumsT &
    Readonly<{
      releaseGroup: ReleaseGroupT;
    }>;

  declare type ReleaseWithMediumsT = ReleaseT &
    Readonly<{
      mediums: ReadonlyArray<MediumWithRecordingsT>;
    }>;

  declare type ReleaseT = AnnotationRoleT &
    ArtistCreditRoleT &
    CommentRoleT &
    RelatableEntityRoleT<'release'> &
    Readonly<{
      barcode: string | null;
      combined_format_name?: string;
      combined_track_count?: string;
      cover_art_presence: 'absent' | 'present' | 'darkened' | null;
      events?: ReadonlyArray<ReleaseEventT>;
      has_no_tracks: boolean;
      labels?: ReadonlyArray<ReleaseLabelT>;
      language: LanguageT | null;
      languageID: number | null;
      length?: number;
      may_have_cover_art?: boolean;
      may_have_discids?: boolean;
      mediums?: ReadonlyArray<MediumT>;
      packagingID: number | null;
      primaryAlias?: string | null;
      quality: QualityT;
      releaseGroup?: ReleaseGroupT;
      script: ScriptT | null;
      scriptID: number | null;
      status: ReleaseStatusT | null;
      statusID: number | null;
    }>;

  declare type ArtistCreditRoleT = {
    artist: string;
    artistCredit: ArtistCreditT;
  };

  declare type ReleaseEventT = {
    country: AreaT | null;
    date: PartialDateT | null;
  };

  declare type QualityT = -1 | 0 | 1 | 2;

  declare type ReleaseGroupT = AnnotationRoleT &
    ArtistCreditRoleT &
    CommentRoleT &
    RelatableEntityRoleT<'release_group'> &
    RatableRoleT &
    ReviewableRoleT &
    TypeRoleT<ReleaseGroupTypeT> &
    Readonly<{
      cover_art?: ReleaseArtT;
      firstReleaseDate: string | null;
      hasCoverArt: boolean;
      l_type_name: string | null;
      primaryAlias?: string | null;
      release_count: number;
      release_group?: ReleaseGroupT;
      secondaryTypeIDs: ReadonlyArray<number>;
      typeID: number | null;
      typeName: string | null;
    }>;

  declare type ReleaseGroupTypeT = OptionTreeT<'release_group_type'> & {
    historic: false;
  };

  declare type ReleaseArtT = ArtworkRoleT &
    Readonly<{
      release?: ReleaseT;
    }>;

  declare type ArtworkRoleT = PendingEditsRoleT &
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

  declare type EventT = AnnotationRoleT &
    CommentRoleT &
    RelatableEntityRoleT<'event'> &
    DatePeriodRoleT &
    RatableRoleT &
    ReviewableRoleT &
    TypeRoleT<EventTypeT> &
    Readonly<{
      areas: ReadonlyArray<{
        credit: string;
        entity: AreaT;
      }>;
      cancelled: boolean;
      event_art_presence: 'absent' | 'present' | 'darkened' | null;
      may_have_event_art?: boolean;
      performers: ReadonlyArray<{
        credit: string;
        entity: ArtistT;
        roles: ReadonlyArray<string>;
      }>;
      places: ReadonlyArray<{
        credit: string;
        entity: PlaceT;
      }>;
      primaryAlias?: string | null;
      related_entities?: {
        areas: AppearancesT<string>;
        performers: AppearancesT<string>;
        places: AppearancesT<string>;
      };
      related_series: ReadonlyArray<number>;
      setlist?: string;
      time: string;
    }>;

  declare type EventTypeT = OptionTreeT<'event_type'>;

  export type NonReleaseRelatableEntityT =
    // | AreaT
    | ArtistT
    | EventT
    // | GenreT
    // | InstrumentT
    // | LabelT
    | PlaceT
    | RecordingT
    | ReleaseGroupT
    // | SeriesT
    | UrlT
    | WorkT;

  declare type PlaceT = AnnotationRoleT &
    CommentRoleT &
    RelatableEntityRoleT<'place'> &
    DatePeriodRoleT &
    RatableRoleT &
    ReviewableRoleT &
    TypeRoleT<PlaceTypeT> &
    Readonly<{
      address: string;
      area: AreaT | null;
      coordinates: CoordinatesT | null;
      primaryAlias?: string | null;
    }>;

  declare type PlaceTypeT = OptionTreeT<'place_type'>;

  declare type CoordinatesT = {
    latitude: number;
    longitude: number;
  };

  declare type RelationshipSourceGroupsT = tree.ImmutableTree<RelationshipSourceGroupT> | null;

  declare type RelationshipSourceGroupT = [RelatableEntityT, RelationshipTargetTypeGroupsT];

  declare type MaybeGroupedOptionsT =
    | {grouped: true; options: GroupedOptionsT}
    | {grouped: false; options: SelectOptionsT};

  declare type GroupedOptionsT = ReadonlyArray<{
    optgroup: string;
    options: SelectOptionsT;
  }>;

  declare type SelectOptionsT = ReadonlyArray<SelectOptionT>;

  declare type SelectOptionT = {
    label: string | (() => string);
    value: number | string;
  };

  declare type FormOrAnyFieldT = FormT<SubfieldsT> | AnyFieldT;

  declare type SubfieldsT = {
    [fieldName: string]: AnyFieldT;
  };

  declare type AnyFieldT =
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
}
