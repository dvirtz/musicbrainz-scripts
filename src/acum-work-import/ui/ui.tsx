import {Button} from '@kobalte/core/button';
import {Progress} from '@kobalte/core/progress';
import {ComponentProps, createEffect, createMemo, createSignal, on, Show, splitProps} from 'solid-js';
import {render} from 'solid-js/web';
import {releaseEditorTools} from 'src/common/musicbrainz/release-editor-tools';
import {importWorks as tryImportWorks} from '../import-works';
import {submitWorks as trySubmitWorks} from '../submit';
import {SelectionStatus, validateAlbumId, validateSelection} from '../validate';
import './progressbar.css';
import {useWarnings, Warnings, WarningsProvider} from './warnings';

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
  const [progress, setProgress] = createSignal<readonly [number, string]>([0, '']);

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

  function importWorks() {
    clearWarnings();
    tryImportWorks(albumId(), addWarning, clearWarnings, setProgress)
      .then(() => setWorksPending(true))
      .catch(err => addWarning(`Import failed: ${err}`));
  }

  function submitWorks() {
    clearWarnings(/submission failed.*/);
    trySubmitWorks(setProgress)
      .then(() => {
        setWorksPending(false);
        clearWarnings();
      })
      .catch(err => addWarning(`Submission failed: ${err}`));
  }

  function cancel() {
    setWorksPending(false);
    clearWarnings();
  }

  return (
    <>
      <div class="buttons" style={{display: 'flex'}}>
        <Button disabled={!inputValid()} onclick={importWorks}>
          <img
            src="https://nocs.acum.org.il/acumsitesearchdb/resources/images/faviconSite.svg"
            alt="ACUM logo"
            style={{width: '16px', height: '16px', margin: '2px'}}
          ></img>
          <span>Import works from ACUM</span>
        </Button>
        <input
          type="text"
          placeholder={'Album ID'}
          use:validateAlbumId={[[albumId, setAlbumId], setAlbumIdValid]}
          style={{'margin': '0 7px 0 0'}}
        ></input>
        <Button id="acum-work-submit" class="worksubmit" disabled={!worksPending()} onclick={submitWorks}>
          <span>Submit works</span>
        </Button>
        <Button id="acum-work-cancel" class="worksubmit" disabled={!worksPending()} onclick={cancel}>
          <span>Cancel</span>
        </Button>
        <ProgressBar
          value={progress()[0]}
          label={progress()[1]}
          minValue={0}
          maxValue={1}
          style={{'flex-grow': 1, padding: '5px 10px 5px 7px'}}
        />
      </div>

      <div>
        <p>This will add a new work for each checked recording that has no work already</p>
      </div>

      <Warnings />
    </>
  );
}

function ProgressBar(props: ComponentProps<typeof Progress> & {label: string}) {
  const [local, root] = splitProps(props, ['label']);
  return (
    <Progress class="progressbar" {...root}>
      <Progress.Track class="ui-progressbar ui-widget ui-widget-content ui-corner-all">
        <Progress.Fill class="ui-progressbar-value ui-corner-left">&nbsp;</Progress.Fill>
        <div class="values">
          <Progress.Label>{local.label}</Progress.Label>
          <Show when={local.label != ''} fallback={<>&nbsp;</>}>
            <Progress.ValueLabel />
          </Show>
        </div>
      </Progress.Track>
    </Progress>
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
