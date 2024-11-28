import {WorkEditData} from 'src/acum-work-import/ui/work-edit-data';

export type WorkStateWithEditDataT = MediumWorkStateT & {
  originalEditData: WorkEditData;
  editData: WorkEditData;
};
