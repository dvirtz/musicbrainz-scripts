// adapted from https://github.com/metabrainz/musicbrainz-server/blob/107f2ae094a10b0d0ca5e0e488e4877edfd0b2be/root/static/scripts/common/constants.js

/*
 * @flow strict
 * Copyright (C) 2015 MetaBrainz Foundation
 *
 * This file is part of MusicBrainz, the open internet music database,
 * and is licensed under the GPL version 2, or (at your option) any
 * later version: http://www.gnu.org/licenses/gpl-2.0.txt
 */

export const RECORDING_OF_LINK_TYPE_ID = 278;
export const COMPOSER_LINK_TYPE_ID = 168;
export const LYRICIST_LINK_TYPE_ID = 165;
export const ARRANGER_LINK_TYPE_ID = 297;
export const TRANSLATOR_LINK_TYPE_ID = 872;
export const REL_STATUS_NOOP: RelationshipEditStatusT = 0;
export const REL_STATUS_ADD: RelationshipEditStatusT = 1;
export const REL_STATUS_EDIT: RelationshipEditStatusT = 2;
export const REL_STATUS_REMOVE: RelationshipEditStatusT = 3;
export const ACUM_TYPE_ID = window.location.host.startsWith('test.') ? 141 : 206;
export const LANGUAGE_MUL_ID = 284;
export const LANGUAGE_ZXX_ID = 486;

export const EDIT_WORK_CREATE: EDIT_WORK_CREATE_T = 41;
export const EDIT_WORK_EDIT: EDIT_WORK_EDIT_T = 42;
export const EDIT_RELATIONSHIP_CREATE: EDIT_RELATIONSHIP_CREATE_T = 90;
export const EDIT_RELATIONSHIP_EDIT: EDIT_RELATIONSHIP_EDIT_T = 91;
export const EDIT_RELATIONSHIP_DELETE: EDIT_RELATIONSHIP_DELETE_T = 92;
export const EDIT_RELATIONSHIPS_REORDER: EDIT_RELATIONSHIPS_REORDER_T = 99;
export const WS_EDIT_RESPONSE_OK: WS_EDIT_RESPONSE_OK_T = 1;

export const EMPTY_PARTIAL_DATE: PartialDateT = Object.freeze({
  day: null,
  month: null,
  year: null,
});

export const SERIES_ORDERING_TYPE_MANUAL = 2;
