import {Entity} from '#acum.ts';
import {medleyWorkRelationships, importWork as tryImportWork} from '#import-work.ts';
import {updateMedleyWorkRelationship} from '#relationships.ts';
import {replaceSubmitButton, submitWork} from '#submit.ts';
import {ImportForm} from '#ui/import-form.tsx';
import {useWarnings, WarningsProvider} from '#ui/warnings.tsx';
import {toolbox} from '@repo/common-ui/toolbox';
import {REL_STATUS_EDIT} from '@repo/musicbrainz-ext/constants';
import {executePipeline} from '@repo/rxjs-ext/execute-pipeline';
import {waitForElement} from '@repo/rxjs-ext/wait-for-element';
import {endWith, filter, from, map, mergeMap, scan, tap} from 'rxjs';
import {createSignal, Setter} from 'solid-js';
import {render} from 'solid-js/web';
import {isNonReleaseRelationshipEditor} from 'typedbrainz';
import {RelationshipStateT, WorkT} from 'typedbrainz/types';
import {ProgressBar} from './progressbar.tsx';

function AcumImporter(props: {form: HTMLFormElement}) {
  const {addWarning, clearWarnings} = useWarnings();
  const [progress, setProgress] = createSignal<readonly [number, string]>([0, '']);

  async function importWork(entity: Entity<'Work' | 'Version'>) {
    clearWarnings();
    try {
      await tryImportWork(entity, props.form, addWarning, setProgress);
    } catch (err) {
      console.error(err);
      addWarning(`Import failed: ${String(err)}`);
    }
  }

  async function submitWorks() {
    const submitButton = document.querySelector<HTMLButtonElement>('button[data-acum-replaced]');
    if (submitButton) submitButton.disabled = true;
    clearWarnings(/submission failed.*/);
    try {
      await doSubmitWorks(setProgress);
      clearWarnings();
      return true;
    } catch (err) {
      addWarning(`Submission failed: ${String(err)}`);
      if (submitButton) submitButton.disabled = false;
      return false;
    }
  }
  replaceSubmitButton(submitWorks);

  return (
    <>
      <ImportForm entityTypes={['Work', 'Version']} onSubmit={importWork} idPattern="[12][0-9A-Z]+">
        <ProgressBar value={progress()[0]} label={progress()[1]} minValue={0} maxValue={1} />
      </ImportForm>
    </>
  );
}

const releaseEditorContainerId = 'acum-work-import-container';

export async function createWorkEditorUI() {
  const doRender = (workForm: HTMLFormElement) => {
    if (workForm.querySelector(`#${releaseEditorContainerId}`)) {
      return;
    }

    console.debug('Creating work editor');

    const container = (<div id={releaseEditorContainerId}></div>) as HTMLDivElement;
    const inIframe = location.pathname.startsWith('/dialog');
    const theToolbox = toolbox(workForm.ownerDocument, inIframe ? 'iframe' : 'half-page', toolbox =>
      workForm.querySelector(inIframe ? '.half-width' : '.documentation')?.insertAdjacentElement('beforebegin', toolbox)
    );
    theToolbox.append(container);

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
    doRender(workForm);
  }
}

async function doSubmitWorks(setProgress: Setter<readonly [number, string]>): Promise<void> {
  if (!MB || !MB.tree || !isNonReleaseRelationshipEditor(MB.relationshipEditor)) {
    return;
  }

  setProgress([0, 'Submitting works']);

  const medleyRelationship = medleyWorkRelationships();

  if (medleyRelationship) {
    await executePipeline(
      from(medleyRelationship).pipe(
        map(rel => [rel, rel.entity1 as WorkT] as const),
        map(([rel, work]) => [rel, document.getElementById(`submit-work-${work.id}`)] as const),
        filter((relWork): relWork is [RelationshipStateT, HTMLFormElement] => relWork[1] !== null),
        mergeMap(async ([rel, form]) => [rel, await submitWork(form)] as const),
        mergeMap(async ([rel, submittedWork]) => {
          if (rel.entity1.gid != submittedWork.gid) {
            updateMedleyWorkRelationship(
              REL_STATUS_EDIT,
              rel.linkOrder,
              MB?.relationshipEditor.state?.entity as WorkT,
              submittedWork,
              rel
            );
            // wait for new work link
            await waitForElement(
              (element): element is HTMLAnchorElement =>
                element instanceof HTMLAnchorElement && element.getAttribute('href') === `/work/${submittedWork.gid}`
            );
          }
          return submittedWork;
        }),
        scan((accumulator: readonly [number, string], work: WorkT) => [accumulator[0] + 1, work.name] as const, [
          0,
          ' ',
        ] as const),
        map(([count, name]) => [count / medleyRelationship.length, `Submitted ${name}`] as const),
        endWith([1, 'Done'] as const),
        tap(setProgress)
      )
    );
  }
}
