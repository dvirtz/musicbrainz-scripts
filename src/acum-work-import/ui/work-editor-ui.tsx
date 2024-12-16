import {Button} from '@kobalte/core/button';
import {createEffect, createSignal} from 'solid-js';
import {render} from 'solid-js/web';
import {Toolbox} from 'src/common/musicbrainz/toolbox';
import {importWork as tryImportWork} from '../import-work';
import {validateNumericId} from '../validate';
import {useWarnings, WarningsProvider} from './warnings';

void validateNumericId;

function AcumImporter(props: {form: HTMLFormElement}) {
  const [workId, setWorkId] = createSignal('');
  const [workIdValid, setWorkIdValid] = createSignal(false);
  const {addWarning, clearWarnings} = useWarnings();
  const [importing, setImporting] = createSignal(false);

  function importWork() {
    setImporting(true);
    clearWarnings();
    tryImportWork(workId(), props.form, addWarning)
      .catch(err => {
        console.error(err);
        addWarning(`Import failed: ${err}`);
      })
      .finally(() => setImporting(false));
  }

  createEffect((prevTitle?: string) => {
    const submitButton = document.querySelector('button.submit') as HTMLButtonElement;
    submitButton.disabled = importing();
    submitButton.title = importing() ? 'Importing...' : (prevTitle ?? submitButton.title);
    return submitButton.title;
  });

  return (
    <>
      <div class="buttons" style={{display: 'flex'}}>
        <Button disabled={!workIdValid() || importing()} type="button" onClick={importWork}>
          <img
            src="https://nocs.acum.org.il/acumsitesearchdb/resources/images/faviconSite.svg"
            alt="ACUM logo"
            style={{width: '16px', height: '16px', margin: '2px'}}
          ></img>
          <span>Import works from ACUM</span>
        </Button>
        <input
          type="text"
          placeholder={'Work ID'}
          use:validateNumericId={[[workId, setWorkId], setWorkIdValid]}
          style={{'margin': '0 7px 0 0'}}
        ></input>
      </div>
    </>
  );
}

const releaseEditorContainerId = 'acum-work-import-container';

export function createWorkEditorUI(workForm: HTMLFormElement) {
  if (workForm.querySelector(`#${releaseEditorContainerId}`)) {
    return;
  }

  const container = (<div id={releaseEditorContainerId}></div>) as HTMLDivElement;
  const inIframe = location.pathname.startsWith('/dialog');
  const toolbox = Toolbox(workForm.ownerDocument, inIframe ? 'iframe' : 'half-page');
  toolbox.append(container);
  workForm.querySelector(inIframe ? '.half-width' : '.documentation')?.insertAdjacentElement('beforebegin', toolbox);

  render(
    () => (
      <WarningsProvider>
        <AcumImporter form={workForm} />
      </WarningsProvider>
    ),
    container
  );
}
