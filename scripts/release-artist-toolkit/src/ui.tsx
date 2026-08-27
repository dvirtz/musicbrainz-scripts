// cspell: ignore guesscase

import {ManageArtistCreditsDialog} from '#manage-artist-credits-dialog.tsx';
import {SettingKey, setSetting} from '#settings.ts';
import {ToolLine} from '@repo/common-ui/tool-line';
import {toolbox} from '@repo/common-ui/toolbox';
import {waitForElement} from '@repo/rxjs-ext/wait-for-element';
import {createSignal} from 'solid-js';
import {render} from 'solid-js/web';

function SettingCheckbox(props: {label: string; settingKey: SettingKey; initialValue: boolean}) {
  const [checked, setChecked] = createSignal(props.initialValue);
  const [sessionOnly, setSessionOnly] = createSignal(false);

  const onClick = (event: MouseEvent & {currentTarget: HTMLInputElement}) => {
    const persist = !event.altKey;
    setChecked(event.currentTarget.checked);
    setSessionOnly(!persist);
    setSetting(props.settingKey, checked(), persist).catch(console.error);
  };

  return (
    <label
      style={{display: 'flex', 'align-items': 'center', gap: '4px'}}
      title="Alt-click to change for this page only"
    >
      {props.label}:
      <input type="checkbox" id={`setting-${props.settingKey}`} checked={checked()} onClick={onClick} />
      {/* always rendered so toggling it does not shift the line */}
      <span
        title={`"${props.label}" is set for this page only`}
        style={{visibility: sessionOnly() ? 'visible' : 'hidden'}}
      >
        *
      </span>
    </label>
  );
}

function ReleaseArtistToolkitUI(props: {changeAllMatching: boolean; changePartiallyMatching: boolean}) {
  return (
    <ToolLine title="Release artist toolkit">
      <div class="buttons">
        <ManageArtistCreditsDialog />
      </div>
      <SettingCheckbox
        label="Change all artists default"
        settingKey="change-matching-artists"
        initialValue={props.changeAllMatching}
      />
      <SettingCheckbox
        label="Change partially matching credits"
        settingKey="change-partially-matching"
        initialValue={props.changePartiallyMatching}
      />
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
