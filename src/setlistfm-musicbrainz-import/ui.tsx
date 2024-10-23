import {render} from 'solid-js/web';
import {getPanel} from '@violentmonkey/ui';
import panelStyle from './app.css';
import {SettingsDialog} from './settings';

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
