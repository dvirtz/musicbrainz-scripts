// adapted from https://github.com/metabrainz/musicbrainz-server/blob/9d6631ac6d4eacb2cae4fe51dd288fae56420b5f/root/static/scripts/edit/components/FormRow.js

/*
 * Copyright (C) 2017 MetaBrainz Foundation
 *
 * This file is part of MusicBrainz, the open internet music database,
 * and is licensed under the GPL version 2, or (at your option) any
 * later version: http://www.gnu.org/licenses/gpl-2.0.txt
 */

import {mergeProps, ParentProps} from 'solid-js';

export function FormRow(
  props: ParentProps & {
    hasNoLabel?: boolean;
    hasNoMargin?: boolean;
    rowRef?: HTMLDivElement;
  }
) {
  props = mergeProps({hasNoLabel: false, hasNoMarge: false}, props);
  return (
    <div class={`row ${props.hasNoLabel ? 'no-label' : ''} ${props.hasNoMargin ? 'no-margin' : ''}`} ref={props.rowRef}>
      {props.children}
    </div>
  );
}
