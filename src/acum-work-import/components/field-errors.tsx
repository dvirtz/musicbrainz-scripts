// adapted from https://github.com/metabrainz/musicbrainz-server/blob/ca8fce921f21ee024acc1b2616e59cb68127e970/root/static/scripts/edit/components/FieldErrors.js

/*
 * Copyright (C) 2018 MetaBrainz Foundation
 *
 * This file is part of MusicBrainz, the open internet music database,
 * and is licensed under the GPL version 2, or (at your option) any
 * later version: http://www.gnu.org/licenses/gpl-2.0.txt
 */

import {For, mergeProps} from 'solid-js';
import subfieldErrors from 'src/common/musicbrainz/subfield-errors';

function FieldErrorsList(props: {errors?: ReadonlyArray<string>}) {
  if (props.errors?.length) {
    return (
      <ul class="errors">
        <For each={props.errors}>{error => <li>{error}</li>}</For>
      </ul>
    );
  }
  return null;
}

export function FieldErrors(props: {field: AnyFieldT; includeSubFields?: boolean}) {
  if (!props.field) {
    return null;
  }

  props = mergeProps({includeSubFields: true}, props);

  const errors = props.includeSubFields ? subfieldErrors(props.field) : props.field.errors;
  return <FieldErrorsList errors={errors} />;
}
