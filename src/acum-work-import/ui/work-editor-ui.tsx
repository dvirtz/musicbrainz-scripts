import {render} from 'solid-js/web';
import {Toolbox} from 'src/common/musicbrainz/toolbox';
import {Entity} from '../acum';
import {importWork as tryImportWork} from '../import-work';
import {ImportForm} from './import-form';
import {useWarnings, WarningsProvider} from './warnings';

function AcumImporter(props: {form: HTMLFormElement}) {
  const {addWarning, clearWarnings} = useWarnings();

  async function importWork(entity: Entity<'Work'>) {
    clearWarnings();
    try {
      await tryImportWork(entity, props.form, addWarning);
    } catch (err) {
      console.error(err);
      addWarning(`Import failed: ${String(err)}`);
    }
  }

  return <ImportForm entityTypes={['Work']} onSubmit={importWork} idPattern="[12][0-9A-Z]+" />;
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
