import {registerSettingsDialog} from '#settings.tsx';

export async function createUI(buttonText: string, onClick: () => void) {
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

  document.querySelector('div.main-navi')?.classList.add('col-md-7');
  document.querySelector('div.user-navi')?.classList.add('col-md-5');

  await registerSettingsDialog();
}
