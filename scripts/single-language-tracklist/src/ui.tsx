// cspell: ignore guesscase

import {removeLHS, removeRHS} from '#keep-single-language.ts';
import {Button} from '@kobalte/core/button';
import {toolbox} from '@repo/common-ui/toolbox';
import {waitForElement} from '@repo/rxjs-ext/wait-for-element';
import {render} from 'solid-js/web';

function SingleLanguageTracklistUI() {
  return (
    <div class="buttons" style={{display: 'flex', gap: '8px', 'align-items': 'center'}}>
      <label>Keep single language</label>
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
  );
}

export async function createUI() {
  const guessCaseBox =
    document.querySelector<HTMLDivElement>('div:has(> fieldset.guesscase)') ??
    (await waitForElement(
      (node): node is HTMLDivElement =>
        node instanceof HTMLDivElement && node.querySelector('fieldset.guesscase') !== null
    ));

  const containerId = 'change-all-artists-default-toolbox';
  if (document.getElementById(containerId)) {
    return;
  }

  const theToolbox = await toolbox(document, 'full-page');
  guessCaseBox?.insertAdjacentElement('afterend', theToolbox);

  const container = (<div id={containerId}></div>) as HTMLDivElement;
  theToolbox.appendChild(container);
  render(() => <SingleLanguageTracklistUI />, container);
}
