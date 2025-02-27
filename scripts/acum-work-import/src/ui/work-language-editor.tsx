import {removeAtIndex} from 'common';
import {createField, createRepeatableField, LANGUAGE_MUL_ID, LANGUAGE_ZXX_ID} from 'musicbrainz-ext';
import PLazy from 'p-lazy';
import {identity} from 'rxjs';
import {createResource} from 'solid-js';
import {FormRowSelectList} from './form-row-select-list';
import {useWorkEditData} from './work-edit-data-provider';

const FREQUENT_LANGUAGE = 2;
const NON_FREQUENT_LANGUAGE = 1;
// 0 means skip

const lazyLanguageOptions = PLazy.from<MaybeGroupedOptionsT>(() => {
  const languagesByFrequency = Map.groupBy(Object.values(MB.linkedEntities.language), language =>
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
  const {editData, setEditData} = useWorkEditData();
  const languagesField = () =>
    createRepeatableField(
      'edit-work.languages',
      editData.languages.map((language, index) => createField(`edit-work.languages.${index}`, String(language)))
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
          editData.languages.find(lang => lang === LANGUAGE_MUL_ID || lang === LANGUAGE_ZXX_ID) !== undefined
        }
        label={'Lyrics languages:'}
        onAdd={() => setEditData('languages', editData.languages.length, NaN)}
        onEdit={(index, value) => setEditData('languages', index, Number(value))}
        onRemove={index => setEditData('languages', removeAtIndex(editData.languages, index))}
        options={languageOptions()}
        removeClassName="remove-language"
        removeLabel={'Remove language'}
        repeatable={languagesField()}
      />
    </div>
  );
}
