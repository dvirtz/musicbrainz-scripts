// adapted from https://github.com/metabrainz/musicbrainz-server/blob/107f2ae094a10b0d0ca5e0e488e4877edfd0b2be/root/static/scripts/common/constants.js

import {
  EDIT_MEDIUM_CREATE_T,
  EDIT_RELATIONSHIP_CREATE_T,
  EDIT_RELEASE_CREATE_T,
  EDIT_WORK_CREATE_T,
  RelationshipEditStatusT,
  WS_EDIT_RESPONSE_OK_T,
} from 'typedbrainz/types';

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
export const MEDLEY_OF_LINK_TYPE_ID = 239;
export const WRITER_LINK_TYPE_ID = 167;
export const MEDLEY_LINK_TYPE_ID = 750;
export const REL_STATUS_NOOP = 0 as RelationshipEditStatusT;
export const REL_STATUS_ADD = 1 as RelationshipEditStatusT;
export const REL_STATUS_EDIT = 2 as RelationshipEditStatusT;
export const REL_STATUS_REMOVE = 3 as RelationshipEditStatusT;
export const LANGUAGE_MUL_ID = 284;
export const LANGUAGE_ZXX_ID = 486;

export const EDIT_RELEASE_CREATE: EDIT_RELEASE_CREATE_T = 31;
export const EDIT_WORK_CREATE: EDIT_WORK_CREATE_T = 41;
export const EDIT_MEDIUM_CREATE: EDIT_MEDIUM_CREATE_T = 51;
export const EDIT_RELATIONSHIP_CREATE: EDIT_RELATIONSHIP_CREATE_T = 90;
export const WS_EDIT_RESPONSE_OK: WS_EDIT_RESPONSE_OK_T = 1;

export const MBID_REGEXP = /[0-9a-f]{8}-[0-9a-f]{4}-[345][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;

// https://musicbrainz.org/doc/MusicBrainz_API/Rate_Limiting
export const RATE_LIMIT_INTERVAL = 1000;
