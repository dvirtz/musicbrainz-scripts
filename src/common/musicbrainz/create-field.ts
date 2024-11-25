// adapted from https://github.com/metabrainz/musicbrainz-server/blob/f47a266d79224df119fa9f28a5fbcbd85b869e00/root/static/scripts/edit/utility/createField.js

/*
 * Copyright (C) 2017 MetaBrainz Foundation
 *
 * This file is part of MusicBrainz, the open internet music database,
 * and is licensed under the GPL version 2, or (at your option) any
 * later version: http://www.gnu.org/licenses/gpl-2.0.txt
 */

/*
 * The Perl will assign a unique ID to all existing fields in
 * MusicBrainz::Server::Form::Role::ToJSON. The initial value of
 * `LAST_FIELD_ID` here is high enough that it should never overlap
 * with an ID assigned on the server.
 */
let LAST_FIELD_ID = 99999;

export function createField<T>(name: string, value: T): FieldT<T> {
  return {
    errors: [],
    has_errors: false,
    html_name: name,
    id: ++LAST_FIELD_ID,
    type: 'field',
    value,
  };
}

export function createRepeatableField<T>(name: string, field: T[]): RepeatableFieldT<T> {
  return {
    errors: [],
    has_errors: false,
    html_name: name,
    id: ++LAST_FIELD_ID,
    type: 'repeatable_field',
    field,
    last_index: field.length - 1,
  };
}
