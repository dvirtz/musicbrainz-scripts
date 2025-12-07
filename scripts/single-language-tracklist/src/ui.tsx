// cspell: ignore guesscase

import {removeLHS, removeRHS} from '#keep-single-language.ts';
import {Button} from '@kobalte/core/button';
import {TextField} from '@kobalte/core/text-field';
import {ToolLine} from '@repo/common-ui/tool-line';
import {toolbox} from '@repo/common-ui/toolbox';
import {waitForElement} from '@repo/rxjs-ext/wait-for-element';
import {render} from 'solid-js/web';

function SingleLanguageTracklistUI() {
  return (
    <ToolLine title="Keep single language">
      <div class="buttons">
      <Button
        class="button"
        onClick={() => {
          removeLHS().catch(console.error);
        }}
      >
        Remove LHS
      </Button>
      <Button
        class="button"
        onClick={() => {
          removeRHS().catch(console.error);
        }}
      >
        Remove RHS
      </Button>
    </div>
    </ToolLine>
  );
}

export async function createUI() {
  const containerId = 'single-language-tracklist-default-toolbox';
  if (document.getElementById(containerId)) {
    return;
  }

  const guessCaseBox =
    document.querySelector<HTMLDivElement>('div:has(> fieldset.guesscase)') ??
    (await waitForElement(
      (node): node is HTMLDivElement =>
        node instanceof HTMLDivElement && node.querySelector('fieldset.guesscase') !== null
    ));

  const theToolbox = await toolbox(document, 'full-page', toolbox => {
    guessCaseBox?.insertAdjacentElement('afterend', toolbox);
  });

  const container = (<div id={containerId}></div>) as HTMLDivElement;
  theToolbox.appendChild(container);
  render(() => <SingleLanguageTracklistUI />, container);
}
