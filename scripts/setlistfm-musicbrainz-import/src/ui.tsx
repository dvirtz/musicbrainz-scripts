import {registerSettingsDialog} from '#settings.tsx';
import {createSignal, onCleanup, Show, For} from 'solid-js';
import {render} from 'solid-js/web';

type Option = {label: string; onSelect: () => void};

function SplitButton(props: {primary: Option; alternatives: Option[]}) {
  const [open, setOpen] = createSignal(false);

  onCleanup(() => setOpen(false));
  const {primary, alternatives} = props;
  return (
    <div
      class="split-button"
      role="group"
      aria-label={`${primary.label} options`}
      style="display: inline-block; position: relative;"
    >
      <button
        class="btn"
        onClick={() => {
          primary.onSelect();
        }}
        style="display: block; width: 100%; padding-right: 36px;"
      >
        <img
          src="https://musicbrainz.org/static/images/favicons/favicon-32x32.png"
          alt="MB"
          style="width: 16px; height: 16px; margin: 2px"
        />
        <span style="line-height: 1;">{primary.label}</span>
      </button>
      <Show when={alternatives.length > 0}>
        <div style="position: absolute; top: 0; right: 4px; z-index: 10001;">
          <button
            class="btn toggle"
            aria-haspopup="menu"
            aria-label="More actions"
            aria-expanded={open()}
            onClick={() => setOpen(!open())}
            onKeyDown={(e: KeyboardEvent) => {
              if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setOpen(true);
              } else if (e.key === 'Escape') {
                setOpen(false);
              }
            }}
            title={alternatives[0]?.label ?? 'More actions'}
            style="width: 28px; padding: 4px;"
          >
            ▾
          </button>
        </div>
        <Show when={open()}>
          <ul
            class="split-menu subHeader"
            role="menu"
            style="position: absolute; left: 0; top: calc(100% + 6px); width: 100%; padding: 4px; border-radius: 6px; list-style: none; box-sizing: border-box; z-index: 10000;"
            onKeyDown={(e: KeyboardEvent) => {
              if (e.key === 'Escape') setOpen(false);
            }}
          >
            <For each={alternatives}>
              {opt => (
                <li role="none">
                  <button
                    role="menuitem"
                    onClick={() => {
                      setOpen(false);
                      opt.onSelect();
                    }}
                    class="btn menu-item"
                    style="display: block; width: 100%; text-align: left;"
                  >
                    {opt.label}
                  </button>
                </li>
              )}
            </For>
          </ul>
        </Show>
      </Show>
    </div>
  );
}

export async function createUI(primary: Option, ...alternatives: Option[]) {
  const userFragment = document.querySelector('.user-fragment');
  if (!userFragment) return;

  const mount = document.createElement('div');
  mount.className = 'btn-group';
  // insert at start of fragment like original
  userFragment.insertBefore(mount, userFragment.firstChild);

  // render the Solid component into the mount directly; no shadow root so page styles apply
  render(() => <SplitButton primary={primary} alternatives={alternatives} />, mount);

  await registerSettingsDialog();
}
