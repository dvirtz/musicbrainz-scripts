// adapted from https://github.com/metabrainz/musicbrainz-server/blob/de898cc4e8fede8c459c8eee67e626a72c3a6326/root/static/scripts/release/components/WorkLanguageMultiselect.js

import {AutocompleteStateT} from './autocomplete';
import {LANGUAGE_ZXX_ID} from '../constants';
import Multiselect, {MultiselectStateT} from './multiselect';

export type MultiselectLanguageStateT = {
  max: number | null;
  values: ReadonlyArray<MultiselectLanguageValueStateT>;
};

type MultiselectLanguageValueStateT = {
  autocomplete: AutocompleteStateT<LanguageT>;
  key: number;
  removed: boolean;
};

// https://github.com/metabrainz/musicbrainz-server/blob/de898cc4e8fede8c459c8eee67e626a72c3a6326/root/static/scripts/common/i18n/localizeLanguageName.js
function localizeLanguageName(language: LanguageT | null, isWork: boolean = false): string {
  if (!language) {
    return '[removed]';
  }
  // For works, "No linguistic content" is meant as "No lyrics"
  if (isWork && language.iso_code_3 === 'zxx') {
    return '[No lyrics]';
  }
  return language.name;
}

export function createInitialState(initialLanguages?: ReadonlyArray<LanguageT>): MultiselectLanguageStateT {
  const languages: Array<LanguageT> = Object.values(MB.linkedEntities.language);

  languages.sort(
    (a, b) =>
      (a.id === LANGUAGE_ZXX_ID ? 0 : 1) - (b.id === LANGUAGE_ZXX_ID ? 0 : 1) ||
      b.frequency - a.frequency ||
      a.name.localeCompare(b.name)
  );

  const newState = {
    max: null,
    values: [] as Array<MultiselectLanguageValueStateT>,
  };
  if (initialLanguages?.length) {
    for (const language of initialLanguages) {
      newState.values.push(createSelectedLanguageValue(language));
    }
  } else {
    newState.values.push(createEmptyLanguageValue());
  }
  return newState;
}

export function createSelectedLanguageValue(selectedLanguage: LanguageT | null): MultiselectLanguageValueStateT {
  // getRelationshipStateId returns -uniqueId()
  const key = -MB.relationshipEditor.getRelationshipStateId();
  return {
    autocomplete: {
      entityType: 'language',
      value: localizeLanguageName(selectedLanguage, /* isWork = */ true),
    },
    key,
    removed: false,
  };
}

export function createEmptyLanguageValue(): MultiselectLanguageValueStateT {
  return createSelectedLanguageValue(null);
}

function LanguageMultiselect(props: MultiselectStateT<LanguageT, MultiselectLanguageValueStateT>) {
  return Multiselect(props);
}

function WorkLanguageMultiselect(props: MultiselectLanguageStateT) {
  return (
    <tr>
      <td class="section">{'Lyrics languages: '}</td>
      <td class="lyrics-languages">
        <LanguageMultiselect
          {...{addLabel: 'Add lyrics language', createMultiselectValue: createEmptyLanguageValue, ...props}}
        />
      </td>
    </tr>
  );
}

export default WorkLanguageMultiselect;
