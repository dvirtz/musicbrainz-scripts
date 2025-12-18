import {MBID_REGEXP} from '@repo/musicbrainz-ext/constants';
import {editNote} from '@repo/musicbrainz-ext/edit-note';
import {fetchJSON, fetchResponse} from '@repo/musicbrainz-ext/fetch';
import {firstValueFrom, map, mergeMap, of, tap} from 'rxjs';
import {WorkT} from 'typedbrainz/types';

export async function submitWork(form: HTMLFormElement): Promise<WorkT> {
  const withEditNote = (form: HTMLFormElement) => {
    const formData = new FormData(form);
    formData.append('edit-work.edit_note', editNote() ?? '');
    return formData;
  };
  return await firstValueFrom(
    of(form).pipe(
      map(form => [form.action, withEditNote(form)] as const),
      mergeMap(([action, body]) =>
        fetchResponse(action, {
          method: 'POST',
          body,
        })
      ),
      mergeMap(async response => {
        const url = form.action.endsWith('/edit') ? form.action : response.url;
        const m = url.match(MBID_REGEXP);
        if (m) {
          return m[0];
        }
        // for test to avoid redirection
        const json = (await response.json()) as {'mbid': string};
        if ('mbid' in json) {
          return json['mbid'];
        }

        throw new Error(`url does not include MBID: ${response.url}`);
      }),
      mergeMap(async mbid => await fetchJSON<WorkT>(`/ws/js/entity/${mbid}`)),
      tap(work => {
        if (work) {
          form.dispatchEvent(new Event('submit'));
        }
      })
    )
  );
}

export function replaceSubmitButton(submitWorks: (originalSubmitButton: HTMLButtonElement) => Promise<void>) {
  const originalSubmitButton = document.querySelector('button.submit') as HTMLButtonElement;
  if (originalSubmitButton && !originalSubmitButton.dataset.acumReplaced) {
    // Replace the original submit button with our custom one
    const newSubmitButton = document.createElement('button');
    newSubmitButton.className = originalSubmitButton.className;
    newSubmitButton.textContent = originalSubmitButton.textContent;
    newSubmitButton.type = 'button';
    newSubmitButton.dataset.acumReplaced = 'true';

    newSubmitButton.onclick = () => submitWorks(originalSubmitButton).catch(console.error);

    // Hide the original button and insert our new one
    originalSubmitButton.style.display = 'none';
    originalSubmitButton.parentNode?.insertBefore(newSubmitButton, originalSubmitButton);
  }
}
