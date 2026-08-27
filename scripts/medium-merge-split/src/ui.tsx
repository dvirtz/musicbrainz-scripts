// cspell:ignore guesscase
import {injectButtons, refreshButtons} from '#inject-buttons.ts';
import {Button} from '@kobalte/core/button';
import {ToolLine} from '@repo/common-ui/tool-line';
import {toolbox} from '@repo/common-ui/toolbox';
import {waitForElement} from '@repo/rxjs-ext/wait-for-element';
import {createSignal} from 'solid-js';
import {render} from 'solid-js/web';

const CONTAINER_ID = 'medium-merge-split-toolbox';

function MediumMergeSplitUI() {
  const [enabled, setEnabled] = createSignal(false);

  injectButtons(() => enabled());

  return (
    <ToolLine title="Medium split/merge">
      <div class="buttons">
        <Button
          type="button"
          onClick={() => {
            const nextEnabled = !enabled();
            setEnabled(nextEnabled);
            refreshButtons(nextEnabled);
          }}
        >
          {enabled() ? 'Hide' : 'Show'}
        </Button>
      </div>
    </ToolLine>
  );
}

export async function createUI() {
  if (document.getElementById(CONTAINER_ID)) {
    return;
  }

  const guessCaseBox =
    document.querySelector<HTMLDivElement>('div:has(> fieldset.guesscase)') ??
    (await waitForElement(
      (node): node is HTMLDivElement =>
        node instanceof HTMLDivElement && node.querySelector('fieldset.guesscase') !== null
    ));

  const theToolbox = toolbox(document, 'full-page', toolboxElement => {
    guessCaseBox?.insertAdjacentElement('afterend', toolboxElement);
  });

  const container = document.createElement('div');
  container.id = CONTAINER_ID;

  theToolbox.append(container);

  render(() => <MediumMergeSplitUI />, container);
}
