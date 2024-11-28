import {distinct, filter, firstValueFrom, from, map, mergeMap, of, repeat, tap, toArray, zip} from 'rxjs';
import {compareTargetTypeWithGroup} from 'src/common/musicbrainz/compare';
import {EDIT_WORK_CREATE, REL_STATUS_ADD, WS_EDIT_RESPONSE_OK} from 'src/common/musicbrainz/constants';
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

export async function submitWorks() {
  const addWorkRelationships = await firstValueFrom(
    from(MB.tree.iterate(MB.relationshipEditor.state.mediums))
      .pipe(
        mergeMap(([, mediumState]) => from(MB.tree.iterate(mediumState))),
        mergeMap((recordingState: MediumRecordingStateT) =>
          zip(from(MB.tree.iterate(recordingState.relatedWorks)), of(recordingState).pipe(repeat()))
        ),
        distinct(([relatedWork]) => relatedWork.work.id),
        map(
          ([relatedWork, recordingState]) =>
            [recordingState, document.getElementById(`submit-work-${relatedWork.work.id}`)] as const
        ),
        filter(([, form]) => form !== null)
      )
      .pipe(
        mergeMap(
          async ([recordingState, form]) => [recordingState, await submitWork(form as HTMLFormElement)] as const
        ),
        map(
          ([recordingState, newWork]) =>
            [MB.tree.find(recordingState.targetTypeGroups, 'work', compareTargetTypeWithGroup, null), newWork] as const
        ),
        filter((pair): pair is [RelationshipTargetTypeGroupT, WorkT] => pair[0] !== null),
        mergeMap(([workTargetGroup, newWork]) =>
          zip(from(iterateRelationshipsInTargetTypeGroup(workTargetGroup)), of(newWork).pipe(repeat()))
        ),
        filter(([relationship]) => relationship._status === REL_STATUS_ADD),
        toArray()
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
            languages: newWork.languages.map(x => x.language.id),
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