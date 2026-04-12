// cspell: ignore guesscase

import {resetAllArtistCreditsToDefault} from '#release-artist-actions.ts';
import {Button} from '@kobalte/core/button';
import {Checkbox} from '@kobalte/core/checkbox';
import {ToolLine} from '@repo/common-ui/tool-line';
import {toolbox} from '@repo/common-ui/toolbox';
import {waitForElement} from '@repo/rxjs-ext/wait-for-element';
import {createEffect, createSignal} from 'solid-js';
import {render} from 'solid-js/web';

function ReleaseArtistToolkitUI(props: {changeAllMatching: boolean; changePartiallyMatching: boolean}) {
  const [changeAllMatching, setChangeAllMatching] = createSignal(props.changeAllMatching);
  const [changePartiallyMatching, setChangePartiallyMatching] = createSignal(props.changePartiallyMatching);

  createEffect(async () => {
    await GM.setValue('change-matching-artists', changeAllMatching());
  });

  createEffect(async () => {
    await GM.setValue('change-partially-matching', changePartiallyMatching());
  });

  return (
    <ToolLine title="Release artist toolkit">
      <div class="buttons">
        <Button
          class="button"
          onClick={() => {
            try {
              resetAllArtistCreditsToDefault();
            } catch (error) {
              console.error(error);
            }
          }}
        >
          Reset artist names
        </Button>
      </div>
      <Checkbox
        checked={changeAllMatching()}
        onChange={setChangeAllMatching}
        children={state => (
          <>
            <Checkbox.Input />
            <Checkbox.Label>Change all artists default:</Checkbox.Label>
            <Checkbox.Control>
              <input type="checkbox" checked={state.checked()} />
            </Checkbox.Control>
          </>
        )}
      ></Checkbox>
      <Checkbox
        checked={changePartiallyMatching()}
        onChange={setChangePartiallyMatching}
        children={state => (
          <>
            <Checkbox.Input />
            <Checkbox.Label>Change partially matching credits:</Checkbox.Label>
            <Checkbox.Control>
              <input type="checkbox" checked={state.checked()} />
            </Checkbox.Control>
          </>
        )}
      ></Checkbox>
    </ToolLine>
  );
}

export async function createUI() {
  const containerId = 'release-artist-toolkit-toolbox';
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
  const changeAllMatching = await GM.getValue('change-matching-artists', false);
  const changePartiallyMatching = await GM.getValue('change-partially-matching', false);
  render(
    () => (
      <ReleaseArtistToolkitUI changeAllMatching={changeAllMatching} changePartiallyMatching={changePartiallyMatching} />
    ),
    container
  );
}
