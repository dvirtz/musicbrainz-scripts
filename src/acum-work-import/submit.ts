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
import {Setter} from 'solid-js';
import {compareTargetTypeWithGroup} from 'src/common/musicbrainz/compare';
import {EDIT_WORK_CREATE, WS_EDIT_RESPONSE_OK} from 'src/common/musicbrainz/constants';
import {fetchJSON, fetchResponse} from 'src/common/musicbrainz/fetch';
import {iterateRelationshipsInTargetTypeGroup} from 'src/common/musicbrainz/type-group';

async function submitWork(form: HTMLFormElement): Promise<WorkT> {
  return await firstValueFrom(
    of(form).pipe(
      mergeMap(
        async form =>
          await fetchResponse(form.action, {
            method: 'POST',
            body: (() => {
              const formData = new FormData(form);
              formData.append('edit-work.edit_note', MB.relationshipEditor.state.editNoteField.value);
              return formData;
            })(),
          })
      ),
      map(response => response.url),
      map(url => url.split('/').pop()),
      mergeMap(async mbid => await fetchJSON<WorkT>(`/ws/js/entity/${mbid}`)),
      tap(work => {
        if (work) {
          form.dispatchEvent(new Event('submit'));
        }
      })
    )
  );
}

function relatedWorkRelationship(work: MediumWorkStateT, recording: RecordingT): RelationshipStateT | undefined {
  const targetTypeGroup = MB.tree.find(work.targetTypeGroups, 'recording', compareTargetTypeWithGroup, null);
  if (targetTypeGroup) {
    return iterateRelationshipsInTargetTypeGroup(targetTypeGroup).find(
      rel => rel.entity0.entityType == 'recording' && rel.entity0.id == recording.id
    );
  }
}

export async function submitWorks(setProgress: Setter<readonly [number, string]>): Promise<void> {
  setProgress([0, 'Submitting works']);

  const worksToSubmit = await firstValueFrom(
    from(MB.tree.iterate(MB.relationshipEditor.state.mediums)).pipe(
      mergeMap(([, mediumState]) => from(MB.tree.iterate(mediumState))),
      mergeMap((recordingState: MediumRecordingStateT) =>
        zip(from(MB.tree.iterate(recordingState.relatedWorks)), of(recordingState).pipe(repeat()))
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
