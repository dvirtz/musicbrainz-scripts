// adapted from https://github.com/metabrainz/musicbrainz-server/blob/7344dd66957cb06d536e078b5c0aeeb7b537ccfd/root/static/scripts/edit/utility/subfieldErrors.js

import {FormT} from 'typedbrainz/types';

/*
 * Copyright (C) 2017 MetaBrainz Foundation
 *
 * This file is part of MusicBrainz, the open internet music database,
 * and is licensed under the GPL version 2, or (at your option) any
 * later version: http://www.gnu.org/licenses/gpl-2.0.txt
 */

type FormOrAnyFieldT = FormT<SubfieldsT> | AnyFieldT;

type SubfieldsT = {
  [fieldName: string]: AnyFieldT;
};

export type AnyFieldT =
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

function* iterSubfields(formOrField: FormOrAnyFieldT): Generator<AnyFieldT, void, void> {
  switch (formOrField.type) {
    case 'compound_field':
      yield formOrField;
      break;
    // falls through
    case 'form':
      for (const subfield of Object.values(formOrField.field)) {
        yield* iterSubfields(subfield);
      }
      break;
    case 'field':
      yield formOrField;
      break;
    case 'repeatable_field': {
      yield formOrField;
      for (const subfield of formOrField.field) {
        yield* iterSubfields(subfield);
      }
      break;
    }
  }
}

export function subfieldErrors(
  formOrField: FormOrAnyFieldT,
  accumulator: ReadonlyArray<string> = []
): ReadonlyArray<string> {
  let result = accumulator;
  for (const subfield of iterSubfields(formOrField)) {
    if (subfield.errors?.length) {
      result = result.concat(subfield.errors);
    }
  }
  return result;
}
