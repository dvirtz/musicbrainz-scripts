// cspell: ignore guesscase

import {Checkbox} from '@kobalte/core/checkbox';
import {ToolLine} from '@repo/common-ui/tool-line';
import {toolbox} from '@repo/common-ui/toolbox';
import {waitForElement} from '@repo/rxjs-ext/wait-for-element';
import {createSignal} from 'solid-js';
import {render} from 'solid-js/web';

function ChangeAllArtistsDefault(props: {initiallyChecked: boolean}) {
  const [checked, setChecked] = createSignal(props.initiallyChecked);

  const onChange = (newValue: boolean) => {
    setChecked(newValue);
    GM.setValue('change-matching-artists', newValue).catch(console.error);
  };

  return (
    <ToolLine title="Change all artists default">
      <Checkbox>
        <input type="checkbox" checked={checked()} onChange={e => onChange(e.currentTarget.checked)} />
      </Checkbox>
    </ToolLine>
  );
}

export async function createUI() {
  const containerId = 'change-all-artists-default-toolbox';
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
  const initiallyChecked = await GM.getValue('change-matching-artists', false);
  render(() => <ChangeAllArtistsDefault initiallyChecked={initiallyChecked} />, container);
}
