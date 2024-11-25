import {WorkEditData} from 'src/acum-work-import/components/work-edit-data';

export type WorkStateWithEditDataT = MediumWorkStateT & {
  originalEditData: WorkEditData;
  editData: WorkEditData;
};
