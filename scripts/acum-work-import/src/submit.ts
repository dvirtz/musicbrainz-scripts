import {editDataToFormData, WorkEditData} from '#work-edit-data.ts';
import {MBID_REGEXP} from '@repo/musicbrainz-ext/constants';
import {editNote} from '@repo/musicbrainz-ext/edit-note';
import {fetchJSON, fetchResponse} from '@repo/musicbrainz-ext/fetch';
import {WorkT} from 'typedbrainz/types';

export async function submitWork(action: string, editData: WorkEditData): Promise<WorkT> {
  const body = editDataToFormData(editData);
  body.append('edit-work.edit_note', editNote() ?? '');

  const response = await fetchResponse(action, {method: 'POST', body});
  const url = action.endsWith('/edit') ? action : response.url;
  // tests return the mbid in json to avoid redirection
  const mbid = url.match(MBID_REGEXP)?.[0] ?? ((await response.json()) as {mbid?: string}).mbid;
  if (!mbid) {
    throw new Error(`url does not include MBID: ${response.url}`);
  }

  return await fetchJSON<WorkT>(`/ws/js/entity/${mbid}`);
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
