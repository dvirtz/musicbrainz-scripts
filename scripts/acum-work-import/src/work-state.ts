import {WorkEditData} from './work-edit-data';

export type WorkStateWithEditDataT = MediumWorkStateT & {
  originalEditData: WorkEditData;
  editData: WorkEditData;
};
