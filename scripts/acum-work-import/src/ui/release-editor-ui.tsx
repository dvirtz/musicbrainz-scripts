import {Entity} from '#acum.ts';
import {importAlbum as tryImportWorks} from '#import-album.ts';
import {submitWorks as trySubmitWorks} from '#submit.ts';
import {ImportForm} from '#ui/import-form.tsx';
import {ProgressBar} from '#ui/progressbar.tsx';
import {useWarnings, WarningsProvider} from '#ui/warnings.tsx';
import {toolbox} from '@repo/common-ui/toolbox';
import {assertReleaseRelationshipEditor} from '@repo/musicbrainz-ext/asserts';
import {executePipeline} from '@repo/rxjs-ext/execute-pipeline';
import {waitForElement} from '@repo/rxjs-ext/wait-for-element';
import domMutations from 'dom-mutations';
import {first, from, tap} from 'rxjs';
import {createSignal} from 'solid-js';
import {render} from 'solid-js/web';
import {ReleaseRelationshipEditorActionT} from 'typedbrainz/types';

function AcumImporter() {
  const {addWarning, clearWarnings} = useWarnings();
  const [progress, setProgress] = createSignal<readonly [number, string]>([0, '']);

  // One-time button replacement on mount
  function replaceSubmitButton() {
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

  async function importWorks(entity: Entity) {
    clearWarnings();
    try {
      if (await tryImportWorks(entity, addWarning, setProgress)) {
        replaceSubmitButton();
      }
    } catch (err) {
      console.error(err);
      addWarning(`Import failed: ${String(err)}`);
    }
  }

  async function submitWorks(originalSubmitButton: HTMLButtonElement) {
    const submitButton = document.querySelector<HTMLButtonElement>('button[data-acum-replaced]');
    if (submitButton) submitButton.disabled = true;
    const dispatch = (action: ReleaseRelationshipEditorActionT) => {
      assertReleaseRelationshipEditor(MB?.relationshipEditor);
      MB.relationshipEditor.dispatch(action);
    };
    clearWarnings(/submission failed.*/);
    dispatch({type: 'start-submission'});
    const worksSubmitted = await (async () => {
      try {
        return await trySubmitWorks(setProgress);
      } catch (err) {
        addWarning(`Submission failed: ${String(err)}`);
        if (submitButton) submitButton.disabled = false;
        return undefined;
      } finally {
        dispatch({
          type: 'stop-submission',
        });
      }
    })();
    switch (worksSubmitted) {
      case undefined:
        return;
      case 0:
        originalSubmitButton.click();
        break;
      default:
        // wait for original submit button to be enabled from stop-submission
        await executePipeline(
          from(domMutations(originalSubmitButton, {attributeFilter: ['disabled']})).pipe(
            tap(() => {
              originalSubmitButton.click();
            }),
            first()
          )
        );
    }
  }

  addWarning(
    "Only use this option after you've tried searching for the work(s) " +
      'you want to add, and are certain they do not already exist on MusicBrainz.'
  );

  return (
    <>
      <ImportForm entityTypes={['Album', 'Version', 'Work']} onSubmit={importWorks} idPattern="[0-9A-Z]+">
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
