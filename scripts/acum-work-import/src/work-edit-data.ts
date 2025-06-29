// adapted from https://github.dev/loujine/musicbrainz-scripts/blob/master/mbz-loujine-common.js

import {AcumWorkType} from '#acum-work-type.ts';
import {workType, trackName, WorkBean, workISWCs, workLanguage, WorkLanguage} from '#acum.ts';
import {shouldSetLanguage} from '#ui/settings.tsx';
import {AddWarning} from '#ui/warnings.tsx';
import {mergeArrays} from '@repo/common/merge-arrays';
import {LANGUAGE_ZXX_ID} from '@repo/musicbrainz-ext/constants';
import {fetchEditParams, urlFromMbid} from '@repo/musicbrainz-ext/edits';
import {workAttributeTypes, workLanguages, workTypes} from '@repo/musicbrainz-ext/type-info';
import PLazy from 'p-lazy';
import {IswcT, WorkAttributeT, WorkLanguageT, WorkT} from 'typedbrainz/types';

const ACUM_TYPE_ID = PLazy.from(async () => {
  return Object.values(await workAttributeTypes).find(type => type.name === 'ACUM ID')!.id;
});

export type WorkEditData = {
  name: string;
  comment: string;
  type_id: number | null;
  languages: Array<number>;
  iswcs: Array<string>;
  attributes: Array<{type_id: number; value: string}>;
};

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
    })),
  };
}

async function fetchWorkEditParams(mbid: string): Promise<WorkEditData> {
  const url = urlFromMbid('work', mbid);
  const work = await fetchEditParams<WorkT>(url);
  return getWorkEditParams(work);
}

export function workEditDataEqual(lhs: WorkEditData, rhs: WorkEditData) {
  return (
    lhs.name === rhs.name &&
    lhs.comment === rhs.comment &&
    lhs.type_id === rhs.type_id &&
    lhs.languages.length === rhs.languages.length &&
    lhs.iswcs.length === rhs.iswcs.length &&
    lhs.attributes.length === rhs.attributes.length &&
    lhs.languages.every((lang, idx) => lang === rhs.languages[idx]) &&
    lhs.iswcs.every((iswc, idx) => iswc === rhs.iswcs[idx]) &&
    lhs.attributes.every(
      (attr, idx) => attr.type_id === rhs.attributes[idx]?.type_id && attr.value === rhs.attributes[idx]?.value
    )
  );
}

export async function workEditData(
  work: WorkT,
  track: WorkBean,
  addWarning: AddWarning
): Promise<{originalEditData: WorkEditData; editData: WorkEditData}> {
  const originalEditData =
    work.gid && unsafeWindow.location.pathname.startsWith('/release')
      ? await fetchWorkEditParams(work.gid)
      : getWorkEditParams(work);
  const acumTypeId = await ACUM_TYPE_ID;
  const acumWorkType = workType(track);
  const workTypesValues = Object.values(await workTypes);
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
                  return [LANGUAGE_ZXX_ID];
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
                        addWarning(`Unknown language ${track.workLanguage}`);
                        return [];
                    }
                  })();
                default:
                  addWarning(`Unknown work type ${track.workType}${track.versionEssenceType}`);
                  return originalEditData.languages;
              }
            })()
          )
        : originalEditData.languages,
      iswcs: mergeArrays(originalEditData.iswcs, (await workISWCs(track.workId)) ?? []),
      attributes: originalEditData.attributes.find(
        element => element.type_id === acumTypeId && element.value === track.fullWorkId
      )
        ? originalEditData.attributes
        : [
            ...originalEditData.attributes,
            {
              type_id: acumTypeId,
              value: track.fullWorkId,
            },
          ],
    },
  };
}
