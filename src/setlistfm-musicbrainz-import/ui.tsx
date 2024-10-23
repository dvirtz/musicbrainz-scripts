import {render} from 'solid-js/web';
import {getPanel, showToast} from '@violentmonkey/ui';
import panelStyle from 'src/app.css';
import {createSignal} from 'solid-js';
import {SettingsDialog} from './settings';

export function Counter() {
  const [getCount, setCount] = createSignal(0);
  const handleAmazing = () => {
    setCount(count => count + 1);
    showToast('Amazing + 1', {theme: 'dark'});
  };
  return (
    <div>
      <button class={'count'} onClick={handleAmazing}>
        Amazing+1
      </button>
      <p>Drag me</p>
      <p>
        <span class={'plus1'}>{getCount()}</span> people think this is amazing.
      </p>
    </div>
  );
}

export function createUI(buttonText: string, onClick: () => void) {
  const div = (
    <div class="btn-group">
      <button class="btn" onclick={onClick}>
        <img
          src="https://musicbrainz.org/static/images/favicons/favicon-32x32.png"
          alt="MB"
          style="width: 16px; height: 16px; margin: 2px"
        ></img>
        <span>{buttonText}</span>
      </button>
    </div>
  ) as HTMLDivElement;

  const userFragment = document.querySelector('.user-fragment');
  userFragment?.insertBefore(div, userFragment.firstChild);

  const panel = getPanel({style: panelStyle, theme: 'disabled'});

  GM_registerMenuCommand('settings', () => {
    render(() => <SettingsDialog mount={panel.body} />, panel.body);
    panel.show();
  });
}
