import {Button} from '@kobalte/core/button';
import {toolbox} from 'common-ui';
import {createEffect, createMemo, createSignal} from 'solid-js';
import {render} from 'solid-js/web';
import {Entity} from '../acum';
import {importAlbum as tryImportWorks} from '../import-album';
import {submitWorks as trySubmitWorks} from '../submit';
import {ImportForm} from './import-form';
import {ProgressBar} from './progressbar';
import progressBarStyle from './progressbar.css?inline';
import {waitForElement} from './wait-for-element';
import {useWarnings, WarningsProvider} from './warnings';
import workEditDialogStyle from './work-edit-dialog.css?inline';

function AcumImporter() {
  const {addWarning, clearWarnings} = useWarnings();
  const [worksPending, setWorksPending] = createSignal(false);
  const [submitting, setSubmitting] = createSignal(false);
  const [progress, setProgress] = createSignal<readonly [number, string]>([0, '']);
  const submissionDisabled = createMemo(() => !worksPending() || submitting());

  createEffect((prevTitle?: string) => {
    const submitButton = document.querySelector('button.submit') as HTMLButtonElement;
    submitButton.disabled = worksPending();
    submitButton.title = worksPending() ? 'Submit works or cancel first' : (prevTitle ?? submitButton.title);
    return submitButton.title;
  });

  async function importWorks(entity: Entity) {
    clearWarnings();
    try {
      setWorksPending(await tryImportWorks(entity, addWarning, setProgress));
    } catch (err) {
      console.error(err);
      addWarning(`Import failed: ${String(err)}`);
    }
  }

  function submitWorks() {
    setSubmitting(true);
    clearWarnings(/submission failed.*/);
    trySubmitWorks(setProgress)
      .then(() => {
        setWorksPending(false);
        clearWarnings();
      })
      .catch(err => addWarning(`Submission failed: ${err}`))
      .finally(() => setSubmitting(false));
  }

  function cancel() {
    setWorksPending(false);
    clearWarnings();
  }

  addWarning(
    "Only use this option after you've tried searching for the work(s) " +
      'you want to add, and are certain they do not already exist on MusicBrainz.'
  );

  return (
    <>
      <ImportForm entityTypes={['Album', 'Version', 'Work']} onSubmit={importWorks} idPattern="[0-9A-Z]+">
        <Button id="acum-work-submit" class="worksubmit" disabled={submissionDisabled()} onclick={submitWorks}>
          <span>Submit works</span>
        </Button>
        <Button id="acum-work-cancel" class="worksubmit" disabled={submissionDisabled()} onclick={cancel}>
          <span>Cancel</span>
        </Button>
        <ProgressBar
          value={progress()[0]}
          label={progress()[1]}
          minValue={0}
          maxValue={1}
          style={{'flex-grow': 1, padding: '5px 10px 5px 7px'}}
        />
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

  await GM.addStyle(workEditDialogStyle);
  await GM.addStyle(progressBarStyle);

  const doRender = async () => {
    console.debug('Creating release editor');
    const container = (<div id={releaseEditorContainerId}></div>) as HTMLDivElement;
    const theToolbox = await toolbox(document, 'full-page');
    theToolbox.append(container);
    document.querySelector('div.tabs')?.insertAdjacentElement('afterend', theToolbox);

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
    await doRender();
  }
}
