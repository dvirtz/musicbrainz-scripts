import {clearWarnings} from './warnings';
import {albumInfo} from './albums';
import {filter, from, switchMap, zip} from 'rxjs';

export async function importWorkInfo() {
  clearWarnings('data');

  const albumId = (document.getElementById('acum-album-id') as HTMLInputElement).value;
  const albumBean = await albumInfo(albumId);

  from(MB.tree.iterate(MB.relationshipEditor.state.mediums!)).pipe(
    switchMap(([, recordingStateTree]) => {
      return zip(from(albumBean.tracks), from(MB.tree.iterate(recordingStateTree!)));
    }),
    filter(([, recordingState]) => recordingState.isSelected)
    // map(([work, track]: [WorkT, WorkVersion]) => {
    //   iswcs: (await workISWCs(track.workId))?.map(iswc => ({
    //     entityType: 'iswc',
    //     id: MB.relationshipEditor.getRelationshipStateId(),
    //     editsPending: true,
    //     iswc: iswc,
    //     work_id: workId,
    //   })),
    //   attributes: [
    //     {
    //       id: MB.relationshipEditor.getRelationshipStateId(),
    //       typeID: Constants.ACUM_TYPE_ID,
    //       typeName: 'ACUM ID',
    //       value: track.fullWorkId,
    //       value_id: null,
    //     },
    //   ],
  );
}
