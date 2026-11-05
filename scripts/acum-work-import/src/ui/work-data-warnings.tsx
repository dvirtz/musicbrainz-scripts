import {trackName} from '#acum.ts';
import {openWorkDialogFromWarning} from '#ui/warning-actions.ts';
import {useWorkEditData} from '#ui/work-edit-data-provider.tsx';
import classes from '#ui/work-edit-dialog.module.css';
import {createWork} from '#works.ts';
import {assertMB} from '@repo/musicbrainz-ext/asserts';
import {MEDLEY_OF_LINK_TYPE_ID} from '@repo/musicbrainz-ext/constants';
import {WorkT} from 'typedbrainz/types';

import type {WarningStore} from '#warning-store.ts';
import {WorkWarning, WorkWarningContext} from '#work-warning.ts';

export class WorkNameDifferentWarning extends WorkWarning {
  constructor(
    context: WorkWarningContext,
    private readonly store: WarningStore,
    public readonly recordingName: string
  ) {
    super(context);
  }
  render() {
    const {savedEditData, saveEditData} = useWorkEditData();
    return (
      <>
        Work name is different from recording name {this.recordingName}, please verify.{' '}
        <button
          type="button"
          class={`btn-link ${classes['btn-link']}`}
          onClick={() => {
            this.store.remove(warning => warning === this);
            saveEditData({...savedEditData(), name: this.recordingName});
          }}
        >
          update
        </button>
      </>
    );
  }
}

export class WorkNameMatchWarning extends WorkWarning {
  readonly workName: string;
  constructor(
    context: WorkWarningContext,
    private readonly store: WarningStore
  ) {
    super(context);
    this.workName = context.work.name;
  }
  render() {
    const {replaceWork} = useWorkEditData();
    assertMB(MB);

    const onConfirmed = (work: WorkT) => {
      this.store.remove(warning => warning === this);
      replaceWork(work);
    };

    return (
      <>
        Work <a href={`/work/${this.context.work.gid}`}>{this.workName}</a> was found by name linked to an author,
        please verify.{' '}
        <button
          type="button"
          class={`btn-link ${classes['btn-link']}`}
          onClick={() => {
            openWorkDialogFromWarning({
              linkType: this.context.recording ? MB.constants.RECORDING_OF_LINK_TYPE_ID : MEDLEY_OF_LINK_TYPE_ID,
              action: 'search',
              work: this.context.work,
              recording: this.context.recording,
              name: trackName(this.context.track),
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
                ...this.context.work,
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
}

export class UnknownLanguageWarning extends WorkWarning {
  constructor(
    context: WorkWarningContext,
    public readonly workLanguage: string
  ) {
    super(context);
  }
  render() {
    return 'Unknown language ' + this.workLanguage + '.';
  }
}

export class UnknownWorkTypeWarning extends WorkWarning {
  constructor(
    context: WorkWarningContext,
    public readonly workType: string,
    public readonly versionEssenceType: string
  ) {
    super(context);
  }
  render() {
    return (
      <>
        Unknown work type {this.workType}
        {this.versionEssenceType}
      </>
    );
  }
}
