import {trackName, WorkBean} from '#acum.ts';
import {openWorkDialogFromWarning} from '#ui/warning-actions.ts';
import {PerWorkWarning, tryUseWorkEditData, useWorkEditData} from '#ui/work-edit-data-provider.tsx';
import classes from '#ui/work-edit-dialog.module.css';
import {createWork} from '#works.ts';
import {assertMB} from '@repo/musicbrainz-ext/asserts';
import {MEDLEY_OF_LINK_TYPE_ID} from '@repo/musicbrainz-ext/constants';
import {RecordingT, WorkT} from 'typedbrainz/types';

export function WorkNameDifferentWarning(props: {recordingName: string}) {
  const {savedEditData, saveEditData, resolveWarnings} = useWorkEditData();
  return (
    <>
      Work name is different from recording name {props.recordingName}, please verify.{' '}
      <button
        type="button"
        class={`btn-link ${classes['btn-link']}`}
        onClick={() => {
          saveEditData({...savedEditData(), name: props.recordingName});
          const isWorkNameWarning = (
            warning: PerWorkWarning
          ): warning is Extract<PerWorkWarning, {type: 'work-name-different'}> =>
            warning.type === 'work-name-different';
          resolveWarnings(isWorkNameWarning, () => []).catch(console.error);
        }}
      >
        update
      </button>
    </>
  );
}

export function WorkNameMatchWarning(props: {
  track: WorkBean;
  workId: string;
  workName: string;
  work: WorkT;
  recording?: RecordingT;
}) {
  assertMB(MB);

  const context = tryUseWorkEditData();

  const onConfirmed = (work: WorkT) => {
    if (context) {
      context
        .resolveWarnings(
          (warning: PerWorkWarning): warning is Extract<PerWorkWarning, {type: 'work-found-by-name'}> =>
            warning.type === 'work-found-by-name' && warning.workId === props.workId,
          () => []
        )
        .then(() => context.replaceWork(work))
        .catch(console.error);
    }
  };

  return (
    <>
      Work <a href={`/work/${props.work.gid}`}>{props.workName}</a> was found by name linked to an author, please
      verify.{' '}
      <button
        type="button"
        class={`btn-link ${classes['btn-link']}`}
        onClick={() => {
          openWorkDialogFromWarning({
            linkType: props.recording ? MB.constants.RECORDING_OF_LINK_TYPE_ID : MEDLEY_OF_LINK_TYPE_ID,
            action: 'search',
            work: props.work,
            recording: props.recording,
            name: trackName(props.track),
            onConfirmed,
          }).catch((error: unknown) => {
            console.error(`Failed to search artist from warning`, error);
          });
        }}
      >
        search
      </button>
      |
      <button
        type="button"
        class={`btn-link ${classes['btn-link']}`}
        onClick={() =>
          onConfirmed(
            createWork({
              ...props.work,
              gid: '',
              _fromBatchCreateWorksDialog: true,
            })
          )
        }
      >
        create
      </button>
    </>
  );
}
