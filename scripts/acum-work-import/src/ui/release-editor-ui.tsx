import {Entity} from '#acum.ts';
import {importAlbum as tryImportWorks} from '#import-album.ts';
import {replaceSubmitButton, submitWork} from '#submit.ts';
import {ImportForm} from '#ui/import-form.tsx';
import {ProgressBar} from '#ui/progressbar.tsx';
import {useWarnings, WarningsProvider} from '#ui/warnings.tsx';
import {toolbox} from '@repo/common-ui/toolbox';
import {assertMBTree, assertReleaseRelationshipEditor} from '@repo/musicbrainz-ext/asserts';
import {compareTargetTypeWithGroup} from '@repo/musicbrainz-ext/compare';
import {EDIT_WORK_CREATE, WS_EDIT_RESPONSE_OK} from '@repo/musicbrainz-ext/constants';
import {iterateRelationshipsInTargetTypeGroup} from '@repo/musicbrainz-ext/type-group';
import {waitForAttribute, waitForElement} from '@repo/rxjs-ext/wait-for-element';
import {
  connect,
  distinct,
  endWith,
  filter,
  firstValueFrom,
  from,
  ignoreElements,
  map,
  merge,
  mergeMap,
  of,
  pipe,
  repeat,
  scan,
  tap,
  toArray,
  zip,
} from 'rxjs';
import {createSignal, Setter} from 'solid-js';
import {render} from 'solid-js/web';
import {
  MediumRecordingStateT,
  MediumWorkStateT,
  RecordingT,
  RelationshipStateT,
  ReleaseRelationshipEditor,
  WorkLanguageT,
  WorkT,
} from 'typedbrainz/types';

function AcumImporter() {
  const {addWarning, clearWarnings} = useWarnings();
  const [progress, setProgress] = createSignal<readonly [number, string]>([0, '']);

  async function importWorks(entity: Entity) {
    clearWarnings();
    try {
      if (await tryImportWorks(entity, addWarning, setProgress)) {
        replaceSubmitButton(submitWorks);
      }
    } catch (err) {
      console.error(err);
      addWarning(`Import failed: ${String(err)}`);
    }
  }

  async function submitWorks(originalSubmitButton: HTMLButtonElement) {
    const submitButton = document.querySelector<HTMLButtonElement>('button[data-acum-replaced]');
    if (submitButton) submitButton.disabled = true;
    (MB?.relationshipEditor as ReleaseRelationshipEditor).dispatch?.({
      type: 'start-submission',
    });
    clearWarnings(/submission failed.*/);
    try {
      await doSubmitWorks(setProgress);
      clearWarnings();
      return true;
    } catch (err) {
      addWarning(`Submission failed: ${String(err)}`);
      if (submitButton) submitButton.disabled = false;
      return false;
    } finally {
      (MB?.relationshipEditor as ReleaseRelationshipEditor).dispatch?.({
        type: 'stop-submission',
      });
      await waitForAttribute(originalSubmitButton, 'disabled');
    }
  }

  addWarning(
    "Only use this option after you've tried searching for the work(s) " +
      'you want to add, and are certain they do not already exist on MusicBrainz.'
  );

  return (
    <>
      <ImportForm entityTypes={['Album', 'Version', 'Work']} onSubmit={importWorks} idPattern="[0-9A-Z]+">
        <ProgressBar value={progress()[0]} label={progress()[1]} minValue={0} maxValue={1} />
      </ImportForm>

      <div>
        <p>This will add a new work for each checked recording that has no work already</p>
      </div>
    </>
  );
}

const releaseEditorContainerId = 'acum-release-editor-container';

export async function createReleaseEditorUI() {
  if (document.querySelector(`#${releaseEditorContainerId}`)) {
    return;
  }

  const doRender = () => {
    console.debug('Creating release editor');
    const container = (<div id={releaseEditorContainerId}></div>) as HTMLDivElement;
    const theToolbox = toolbox(document, 'full-page', toolbox =>
      document.querySelector('div.tabs')?.insertAdjacentElement('afterend', toolbox)
    );
    theToolbox.append(container);

    render(
      () => (
        <WarningsProvider>
          <AcumImporter />
        </WarningsProvider>
      ),
      container
    );
  };

  const submitButton =
    document.querySelector('button.submit') ??
    (await waitForElement(
      (node): node is HTMLButtonElement => node instanceof HTMLButtonElement && node.classList.contains('submit')
    ));
  if (submitButton) {
    doRender();
  }
}

async function doSubmitWorks(setProgress: Setter<readonly [number, string]>): Promise<void> {
  assertMBTree(MB?.tree);
  assertReleaseRelationshipEditor(MB.relationshipEditor);

  setProgress([0, 'Submitting works']);

  const relatedWorkRelationship = (work: MediumWorkStateT, recording: RecordingT): RelationshipStateT | undefined => {
    const targetTypeGroup = MB?.tree?.find(work.targetTypeGroups, 'recording', compareTargetTypeWithGroup, null);
    if (targetTypeGroup) {
      return iterateRelationshipsInTargetTypeGroup(targetTypeGroup).find(
        rel => rel.entity0.entityType == 'recording' && rel.entity0.id == recording.id
      );
    }
  };

  const worksToSubmit = await firstValueFrom(
    from(MB.tree.iterate(MB.relationshipEditor.state.mediums)).pipe(
      mergeMap(([, mediumState]) => from(MB!.tree!.iterate(mediumState))),
      mergeMap((recordingState: MediumRecordingStateT) =>
        zip(from(MB!.tree!.iterate(recordingState.relatedWorks)), of(recordingState).pipe(repeat()))
      ),
      distinct(([relatedWork]) => relatedWork.work.id),
      map(
        ([relatedWork, recordingState]) =>
          [
            relatedWorkRelationship(relatedWork, recordingState.recording),
            document.getElementById(`submit-work-${relatedWork.work.id}`),
          ] as const
      ),
      filter((pair): pair is [RelationshipStateT, HTMLFormElement] => pair[0] !== undefined && pair[1] != null),
      toArray()
    )
  );

  const updateProgress = pipe(
    scan((accumulator: readonly [number, string], work: WorkT) => [accumulator[0] + 1, work.name] as const, [
      0,
      ' ',
    ] as const),
    map(([count, name]) => [count / worksToSubmit.length, `Submitted ${name}`] as const),
    endWith([1, 'Done'] as const),
    tap(setProgress)
  );

  const addWorkRelationships = await firstValueFrom(
    from(worksToSubmit).pipe(
      mergeMap(async ([relationship, form]) => [relationship, await submitWork(form)] as const),
      connect(shared =>
        merge(
          shared.pipe(toArray()),
          shared.pipe(
            map(([, newWork]) => newWork),
            updateProgress,
            ignoreElements()
          )
        )
      )
    )
  );

  MB.relationshipEditor.dispatch({
    type: 'update-submitted-relationships',
    edits: addWorkRelationships.map(
      ([relationship, newWork]) =>
        [
          [relationship],
          {
            comment: newWork.comment,
            edit_type: EDIT_WORK_CREATE,
            languages: newWork.languages.map((x: WorkLanguageT) => x.language.id),
            name: newWork.name,
            type_id: newWork.typeID,
          },
        ] as const
    ),
    responseData: {
      edits: addWorkRelationships.map(([, newWork]) => ({
        edit_type: EDIT_WORK_CREATE,
        entity: newWork,
        response: WS_EDIT_RESPONSE_OK,
      })),
    },
  });
}
