import {FormRowSelectList} from '#ui/form-row-select-list.tsx';
import {useWorkEditData} from '#ui/work-edit-data-provider.tsx';
import {removeAtIndex} from '@repo/common/remove-at-index';
import {LANGUAGE_MUL_ID, LANGUAGE_ZXX_ID} from '@repo/musicbrainz-ext/constants';
import {createField, createRepeatableField} from '@repo/musicbrainz-ext/create-field';
import {MaybeGroupedOptionsT} from '@repo/musicbrainz-ext/get-select-value';
import {workLanguages} from '@repo/musicbrainz-ext/type-info';
import PLazy from 'p-lazy';
import {identity} from 'rxjs';
import {createResource} from 'solid-js';
import {LanguageT} from 'typedbrainz/types';

const FREQUENT_LANGUAGE = 2;
const NON_FREQUENT_LANGUAGE = 1;
// 0 means skip

const lazyLanguageOptions = PLazy.from<MaybeGroupedOptionsT>(async () => {
  const languagesByFrequency = Map.groupBy(Object.values(await workLanguages), language =>
    language.id == LANGUAGE_ZXX_ID ? FREQUENT_LANGUAGE : language.frequency
  );

  const compareLanguages = (a: LanguageT, b: LanguageT) =>
    (a.id === LANGUAGE_ZXX_ID ? 0 : 1) - (b.id === LANGUAGE_ZXX_ID ? 0 : 1) || a.name.localeCompare(b.name);

  return {
    grouped: true,
    options: [
      {
        optgroup: 'Frequently used',
        options:
          languagesByFrequency
            .get(FREQUENT_LANGUAGE)
            ?.sort(compareLanguages)
            ?.map(lang => ({
              label: lang.id == LANGUAGE_ZXX_ID ? '[No Lyrics]' : lang.name,
              value: lang.id,
            })) || [],
      },
      {
        optgroup: 'Other',
        options:
          languagesByFrequency
            .get(NON_FREQUENT_LANGUAGE)
            ?.sort(compareLanguages)
            ?.map(lang => ({
              label: lang.name,
              value: lang.id,
            })) || [],
      },
    ],
  };
});

export function WorkLanguageEditor() {
  const {liveEditData, setEditData} = useWorkEditData();
  const languagesField = () =>
    createRepeatableField(
      'edit-work.languages',
      liveEditData.languages.map((language, index) => createField(`edit-work.languages.${index}`, String(language)))
    );

  const [languageOptions] = createResource(async () => await lazyLanguageOptions, {
    initialValue: {grouped: true, options: []},
  });

  return (
    <div id="work-languages-editor">
      <FormRowSelectList
        addId="add-language"
        addLabel={'Add language'}
        getSelectField={identity}
        hideAddButton={
          liveEditData.languages.find(lang => lang === LANGUAGE_MUL_ID || lang === LANGUAGE_ZXX_ID) !== undefined
        }
        label={'Lyrics languages:'}
        onAdd={() => setEditData('languages', liveEditData.languages.length, NaN)}
        onEdit={(index, value) => setEditData('languages', index, Number(value))}
        onRemove={index => setEditData('languages', removeAtIndex(liveEditData.languages, index))}
        options={languageOptions()}
        removeClassName="remove-language"
        removeLabel={'Remove language'}
        repeatable={languagesField()}
      />
    </div>
  );
}
