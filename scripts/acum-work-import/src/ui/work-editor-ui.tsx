import {toolbox} from 'common-ui';
import {render} from 'solid-js/web';
import {Entity} from '../acum';
import {importWork as tryImportWork} from '../import-work';
import {ImportForm} from './import-form';
import {waitForElement} from './wait-for-element';
import {useWarnings, WarningsProvider} from './warnings';

function AcumImporter(props: {form: HTMLFormElement}) {
  const {addWarning, clearWarnings} = useWarnings();

  async function importWork(entity: Entity<'Work' | 'Version'>) {
    clearWarnings();
    try {
      await tryImportWork(entity, props.form, addWarning);
    } catch (err) {
      console.error(err);
      addWarning(`Import failed: ${String(err)}`);
    }
  }

  return <ImportForm entityTypes={['Version', 'Work']} onSubmit={importWork} idPattern="[12][0-9A-Z]+" />;
}

const releaseEditorContainerId = 'acum-work-import-container';

export async function createWorkEditorUI() {
  const doRender = async (workForm: HTMLFormElement) => {
    if (workForm.querySelector(`#${releaseEditorContainerId}`)) {
      return;
    }

    console.debug('Creating work editor');

    const container = (<div id={releaseEditorContainerId}></div>) as HTMLDivElement;
    const inIframe = location.pathname.startsWith('/dialog');
    const theToolbox = await toolbox(workForm.ownerDocument, inIframe ? 'iframe' : 'half-page');
    theToolbox.append(container);
    workForm
      .querySelector(inIframe ? '.half-width' : '.documentation')
      ?.insertAdjacentElement('beforebegin', theToolbox);

    render(
      () => (
        <WarningsProvider>
          <AcumImporter form={workForm} />
        </WarningsProvider>
      ),
      container
    );
  };

  const workForm =
    document.querySelector<HTMLFormElement>('form.edit-work') ??
    (await waitForElement(
      (node): node is HTMLFormElement => node instanceof HTMLFormElement && node.classList.contains('edit-work')
    ));
  if (workForm) {
    await doRender(workForm);
  }
}
