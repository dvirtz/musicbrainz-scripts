// cspell: ignore guesscase

import {removeLHS, removeRHS} from '#keep-single-language.ts';
import {Button} from '@kobalte/core/button';
import {TextField} from '@kobalte/core/text-field';
import {ToolLine} from '@repo/common-ui/tool-line';
import {toolbox} from '@repo/common-ui/toolbox';
import {waitForElement} from '@repo/rxjs-ext/wait-for-element';
import {createSignal, For} from 'solid-js';
import {render} from 'solid-js/web';

function SingleLanguageTracklistUI(props: {separator: string}) {
  const [separator, setSeparator] = createSignal(props.separator);

  const onChange = (newValue: string) => {
    setSeparator(newValue);
    GM.setValue('separator', newValue).catch(console.error);
  };

  return (
    <ToolLine title="Keep single language">
      <div class="buttons">
        <For each={[[removeLHS, 'Remove LHS'] as const, [removeRHS, 'Remove RHS'] as const]}>
          {([callback, text]) => (
            <Button
              class="button"
              onClick={() => {
                callback(separator()).catch(console.error);
              }}
              disabled={separator().length == 0}
            >
              {text}
            </Button>
          )}
        </For>
      </div>
      <TextField value={separator()} onChange={onChange}>
        <TextField.Label style={{padding: '6px'}}>separator:</TextField.Label>
        <TextField.Input style={{width: '3em', 'text-align': 'center'}} />
      </TextField>
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

  const theToolbox = toolbox(document, 'full-page', toolbox => {
    guessCaseBox?.insertAdjacentElement('afterend', toolbox);
  });

  const container = (<div id={containerId}></div>) as HTMLDivElement;
  theToolbox.appendChild(container);

  const separator = await GM.getValue('separator', '=');
  render(() => <SingleLanguageTracklistUI separator={separator} />, container);
}
