// adapted from https://github.dev/loujine/musicbrainz-scripts/blob/master/mbz-loujine-common.js

import {AcumWorkType} from '#acum-work-type.ts';
import {trackName, WorkBean, workId, workISWCs, workLanguage, WorkLanguage, workType} from '#acum.ts';
import {shouldSetLanguage} from '#ui/settings.tsx';
import {mergeArrays} from '@repo/common/merge-arrays';
import {fetchEditParams, urlFromMbid} from '@repo/musicbrainz-ext/edits';
import {parseIntegerOrNull} from '@repo/musicbrainz-ext/parse-integer-or-null';
import {workAttributeTypes, workLanguages, workTypes} from '@repo/musicbrainz-ext/type-info';
import PLazy from 'p-lazy';
import {IswcT, WorkAttributeT, WorkLanguageT, WorkT} from 'typedbrainz/types';

const ACUM_TYPE_ID = PLazy.from(async () => {
  return Object.values(await workAttributeTypes).find(type => type.name === 'ACUM ID')!.id;
});

export type WorkEditAttribute = {
  type_id: number;
  value: string;
  // set for attribute types with allowed values, where the form field holds the value id
  value_id: number | null;
};

export type WorkEditData = {
  name: string;
  comment: string;
  type_id: number | null;
  languages: Array<number>;
  iswcs: Array<string>;
  attributes: Array<WorkEditAttribute>;
};

export type WorkEditDataWarning =
  | {type: 'unknown-language'; workLanguage: string}
  | {type: 'unknown-work-type'; workType: string; versionEssenceType: string};

function getWorkEditParams(work: WorkT): WorkEditData {
  return {
    name: work.name,
    comment: work.comment,
    type_id: work.typeID,
    languages: work.languages.map((it: WorkLanguageT) => it.language.id),
    iswcs: work.iswcs.map((it: IswcT) => it.iswc),
    attributes: work.attributes.map((attr: WorkAttributeT) => ({
      type_id: attr.typeID,
      value: attr.value,
      value_id: attr.value_id,
    })),
  };
}

export function workFormAttributes(form: HTMLFormElement): WorkEditAttribute[] {
  function rowAttribute(typeElement: HTMLSelectElement): WorkEditAttribute {
    const valueElement = typeElement
      .closest('tr')
      ?.querySelector<HTMLInputElement | HTMLSelectElement>('[name$=".value"]');
    const allowedValue = valueElement instanceof HTMLSelectElement;
    return {
      type_id: Number(typeElement.value),
      value: allowedValue ? (valueElement.selectedOptions[0]?.textContent ?? '') : (valueElement?.value ?? ''),
      value_id: allowedValue ? parseIntegerOrNull(valueElement.value) : null,
    };
  }

  return Array.from(form.querySelectorAll<HTMLSelectElement>('#work-attributes select[name$=".type_id"]'))
    .map(rowAttribute)
    .filter(attribute => attribute.value);
}

export function formToEditData(form: HTMLFormElement): WorkEditData {
  const fieldValue = (name: string) =>
    form.querySelector<HTMLInputElement | HTMLSelectElement>(`[name="edit-work.${name}"]`)?.value ?? '';
  const fieldValues = (prefix: string) =>
    Array.from(form.querySelectorAll<HTMLInputElement | HTMLSelectElement>(`[name^="edit-work.${prefix}."]`)).map(
      element => element.value
    );

  return {
    name: fieldValue('name'),
    comment: fieldValue('comment'),
    type_id: parseIntegerOrNull(fieldValue('type_id')),
    // an unselected language is kept as NaN so that it survives until it is sanitized away
    languages: fieldValues('languages').map(value => (value ? Number(value) : NaN)),
    iswcs: fieldValues('iswcs'),
    attributes: workFormAttributes(form),
  };
}

export function editDataToFormData(editData: WorkEditData): FormData {
  const formData = new FormData();
  formData.append('edit-work.name', editData.name);
  formData.append('edit-work.comment', editData.comment);
  formData.append('edit-work.type_id', editData.type_id === null ? '' : String(editData.type_id));
  editData.languages.forEach((language, index) => formData.append(`edit-work.languages.${index}`, String(language)));
  editData.iswcs.forEach((iswc, index) => formData.append(`edit-work.iswcs.${index}`, iswc));
  editData.attributes.forEach((attribute, index) => {
    formData.append(`edit-work.attributes.${index}.type_id`, String(attribute.type_id));
    formData.append(
      `edit-work.attributes.${index}.value`,
      attribute.value_id === null ? attribute.value : String(attribute.value_id)
    );
  });
  return formData;
}

async function fetchWorkEditParams(mbid: string): Promise<WorkEditData> {
  const url = urlFromMbid('work', mbid);
  const work = await fetchEditParams<WorkT>(url);
  return getWorkEditParams(work);
}

export function workEditDataEqual(lhs: WorkEditData, rhs: WorkEditData) {
  const res =
    lhs.name === rhs.name &&
    lhs.comment === rhs.comment &&
    lhs.type_id === rhs.type_id &&
    lhs.languages.length === rhs.languages.length &&
    lhs.iswcs.length === rhs.iswcs.length &&
    lhs.attributes.length === rhs.attributes.length &&
    lhs.languages.every((lang, idx) => lang === rhs.languages[idx]) &&
    lhs.iswcs.every((iswc, idx) => iswc === rhs.iswcs[idx]) &&
    lhs.attributes.every(
      (attr, idx) =>
        attr.type_id === rhs.attributes[idx]?.type_id &&
        attr.value === rhs.attributes[idx]?.value &&
        attr.value_id === rhs.attributes[idx]?.value_id
    );
  return res;
}

export async function workEditData(
  work: WorkT,
  track: WorkBean
): Promise<{originalEditData: WorkEditData; editData: WorkEditData; warnings: WorkEditDataWarning[]}> {
  const originalEditData = work.gid ? await fetchWorkEditParams(work.gid) : getWorkEditParams(work);
  const acumTypeId = await ACUM_TYPE_ID;
  const acumWorkType = await workType(track);
  const workTypesValues = Object.values(await workTypes);
  const acumWorkId = workId(track);
  const warnings: WorkEditDataWarning[] = [];
  return {
    originalEditData,
    editData: {
      name: originalEditData.name || trackName(track),
      comment: originalEditData.comment,
      type_id: (() => {
        switch (acumWorkType) {
          case AcumWorkType.PopularSong:
          case AcumWorkType.OriginalSongFor4PartChoir:
            return workTypesValues.find(workType => workType.name === 'Song')?.id ?? null;

          case AcumWorkType.AudioVisualSkit:
          case AcumWorkType.AudioSkit:
          case AcumWorkType.DocumentaryDidacticalTvOrRadioScript:
          case AcumWorkType.DramaWithOriginalMusic:
            return workTypesValues.find(workType => workType.name === 'Audio drama')?.id ?? null;

          case AcumWorkType.Prose:
          case AcumWorkType.LiteratureNonFiction:
          case AcumWorkType.DramaticWorksInProse:
            return workTypesValues.find(workType => workType.name === 'Prose')?.id ?? null;

          case AcumWorkType.Poetry:
          case AcumWorkType.Poetry2:
            return workTypesValues.find(workType => workType.name === 'Poem')?.id ?? null;

          case AcumWorkType.MusicalPlay:
            return workTypesValues.find(workType => workType.name === 'Musical')?.id ?? null;

          default:
            return originalEditData.type_id;
        }
      })(),
      languages: (await shouldSetLanguage())
        ? mergeArrays(
            originalEditData.languages,
            await (async () => {
              switch (acumWorkType) {
                case AcumWorkType.ChamberMusic12Instruments:
                case AcumWorkType.ChamberMusic311Instruments:
                case AcumWorkType.SyncLicensingOnly:
                case AcumWorkType.OriginalJazzWork:
                case AcumWorkType.StationIdentificationMusic:
                case AcumWorkType.Mailbox:
                case AcumWorkType.SyncLicensingOnly2:
                case AcumWorkType.ProgramIdentificationMusic:
                case AcumWorkType.ElectroAcousticWorks:
                case AcumWorkType.InterludeInProgram:
                case AcumWorkType.Jingle2:
                case AcumWorkType.SymphonyChamberMusFor12InstAndMore:
                case AcumWorkType.MusicForFilms:
                case AcumWorkType.DramaticMusicalWorksWithOrch:
                case AcumWorkType.PromoForStation:
                case AcumWorkType.LightMusicWithoutWords:
                case AcumWorkType.Promo2:
                case AcumWorkType.LibraryWork:
                case AcumWorkType.Ringtone:
                case AcumWorkType.InstrumentalMusicForDanceElectronMusic:
                  return [MB!.constants.LANGUAGE_ZXX_ID];
                case AcumWorkType.StoryForEducationalProgram:
                case AcumWorkType.TvScriptForEducationalProgram:
                case AcumWorkType.Jingle:
                case AcumWorkType.Promo:
                case AcumWorkType.DocumentaryDidacticalTvOrRadioScript:
                case AcumWorkType.StoryForChildYouth:
                case AcumWorkType.TvScriptForChildYouth:
                case AcumWorkType.ChildrenDubbingScript:
                case AcumWorkType.Recitation:
                case AcumWorkType.AudioVisualSkit:
                case AcumWorkType.AudioSkit:
                case AcumWorkType.LiteratureNonFiction:
                case AcumWorkType.Prose:
                case AcumWorkType.Storyteller:
                case AcumWorkType.Poetry:
                case AcumWorkType.DramaticWorksInProse:
                case AcumWorkType.OriginalScriptForTvSeries:
                case AcumWorkType.OriginalDramaticTvOrRadioScript:
                case AcumWorkType.DramaWithOriginalMusic:
                case AcumWorkType.DramaticLyricalWorks:
                case AcumWorkType.Poetry2:
                case AcumWorkType.KaraokeMobilePhone:
                case AcumWorkType.PopularSong:
                case AcumWorkType.WorkForChapel3Voices:
                case AcumWorkType.SongAndMessage:
                case AcumWorkType.OriginalSongFor4PartChoir:
                case AcumWorkType.MusicalPlay:
                case AcumWorkType.TranslationOfForeignWork:
                case AcumWorkType.SongAndMessage2:
                  return await (async () => {
                    switch (workLanguage(track)) {
                      case WorkLanguage.Hebrew:
                        return Object.values(await workLanguages)
                          .filter(language => language.name === 'Hebrew')
                          .map(language => language.id);
                      case WorkLanguage.Foreign:
                        return [];
                      default:
                        warnings.push({type: 'unknown-language', workLanguage: String(track.workLanguage)});
                        return [];
                    }
                  })();
                default:
                  warnings.push({
                    type: 'unknown-work-type',
                    workType: String(track.workType),
                    versionEssenceType: String(track.versionEssenceType),
                  });
                  return originalEditData.languages;
              }
            })()
          )
        : originalEditData.languages,
      iswcs: mergeArrays(originalEditData.iswcs, (await workISWCs(track)) ?? []),
      // remove older longer ACUM ID attributes
      attributes: [
        ...originalEditData.attributes.filter(
          element =>
            element.type_id !== acumTypeId ||
            (element.value !== acumWorkId && element.value.length == acumWorkId.length)
        ),
        {
          type_id: acumTypeId,
          value: acumWorkId,
          value_id: null,
        },
      ],
    },
    warnings,
  };
}
