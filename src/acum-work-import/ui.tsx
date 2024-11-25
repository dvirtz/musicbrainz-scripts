import {Button} from '@kobalte/core/button';
import {createEffect, createMemo, createSignal, on} from 'solid-js';
import {render} from 'solid-js/web';
import {releaseEditorTools} from 'src/common/musicbrainz/release-editor-tools';
import {useWarnings, Warnings, WarningsProvider} from './components/warnings';
import {importWorks} from './import-works';
import {submitWorks as trySubmitWorks} from './submit';
import {SelectionStatus, validateAlbumId, validateSelection} from './validate';

void validateAlbumId;

function AcumImporter(props: {recordingCheckboxes: NodeListOf<HTMLInputElement>}) {
  const [albumId, setAlbumId] = createSignal('Album ID');
  const [selectedRecordings, setSelectedRecordings] = createSignal(MB.relationshipEditor.state.selectedRecordings);
  props.recordingCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', () => setSelectedRecordings(MB.relationshipEditor.state.selectedRecordings));
  });
  const selectionStatus = createMemo(() => validateSelection(selectedRecordings()));
  const [albumIdValid, setAlbumIdValid] = createSignal(false);
  const inputValid = createMemo(() => albumIdValid() && selectionStatus() == SelectionStatus.VALID);
  const {addWarning, clearWarnings} = useWarnings();
  const [worksPending, setWorksPending] = createSignal(false);
  // need dependencies explicit to avoid infinite recursion
  // otherwise, the warning actions will trigger the effect again
  createEffect(
    on([albumIdValid, selectionStatus], () => {
      if (albumIdValid()) {
        switch (selectionStatus()) {
          case SelectionStatus.VALID:
            clearWarnings(/select .*/);
            break;
          case SelectionStatus.NO_RECORDINGS:
            addWarning('select at least one recording');
            break;
          case SelectionStatus.MULTIPLE_MEDIA:
            addWarning('select recordings only from a single medium');
            break;
        }
      }
    })
  );
  createEffect((prevTitle?: string) => {
    const submitButton = document.querySelector('Button.submit') as HTMLButtonElement;
    submitButton.disabled = worksPending();
    submitButton.title = worksPending() ? 'Submit works or cancel first' : (prevTitle ?? submitButton.title);
    return submitButton.title;
  });

  function submitWorks() {
    clearWarnings(/submission failed.*/);
    trySubmitWorks()
      .then(() => {
        setWorksPending(false);
        clearWarnings();
      })
      .catch(err => addWarning(`submission failed: ${err}`));
  }

  function cancel() {
    setWorksPending(false);
    clearWarnings();
  }

  return (
    <>
      <div class="buttons">
        <Button
          disabled={!inputValid()}
          onclick={async () => setWorksPending(await importWorks(albumId(), addWarning, clearWarnings))}
        >
          <img
            src="https://nocs.acum.org.il/acumsitesearchdb/resources/images/faviconSite.svg"
            alt="ACUM logo"
            style="width: 16px; height: 16px; margin: 2px"
          ></img>
          <span>Import works from ACUM</span>
        </Button>

        <input
          type="text"
          placeholder={'Album ID'}
          use:validateAlbumId={[[albumId, setAlbumId], setAlbumIdValid]}
        ></input>

        <Button id="acum-work-submit" class="worksubmit" disabled={!worksPending()} onclick={submitWorks}>
          <span>Submit works</span>
        </Button>

        <Button id="acum-work-cancel" class="worksubmit" disabled={!worksPending()} onclick={cancel}>
          <span>Cancel</span>
        </Button>
      </div>
      <div>
        <p>This will add a new work for each checked recording that has no work already</p>
      </div>

      <Warnings />
    </>
  );
}

export function createUI(recordingCheckboxes: NodeListOf<HTMLInputElement>) {
  const toolbox = releaseEditorTools();

  const container = (<div id="acum-work-import-container"></div>) as HTMLDivElement;
  toolbox.append(container);

  render(
    () => (
      <WarningsProvider>
        <AcumImporter recordingCheckboxes={recordingCheckboxes} />
      </WarningsProvider>
    ),
    container
  );
}
