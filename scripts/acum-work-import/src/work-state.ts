import {WorkEditData} from '#work-edit-data.ts';
import {MediumWorkStateT} from 'typedbrainz/types';

export type WorkStateWithEditDataT = MediumWorkStateT & {
  originalEditData: WorkEditData;
  editData: WorkEditData;
};
