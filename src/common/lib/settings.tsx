import {Checkbox as CheckboxRoot} from '@kobalte/core/checkbox';
import {Dialog} from '@kobalte/core/dialog';
import {getPanel} from '@violentmonkey/ui';
import {createSignal, JSX, ParentProps} from 'solid-js';
import {render} from 'solid-js/web';
import style from './settings.css';

type OptionsDialogProps = ParentProps & {
  mount: HTMLElement;
  saveOptions: () => void;
};

function SettingsDialog(props: OptionsDialogProps) {
  const [open, setOpen] = createSignal(true);

  return (
    <Dialog open={open()} onOpenChange={setOpen}>
      <Dialog.Portal mount={props.mount} useShadow={false}>
        <Dialog.Overlay class="dialog__overlay" />
        <div class="dialog__positioner">
          <Dialog.Content
            class="dialog__content"
            // https://github.com/kobaltedev/kobalte/issues/169
            onPointerDownOutside={ev => {
              ev.preventDefault();
            }}
          >
            <Dialog.Title class="dialog__title">{GM_info.script.name} options</Dialog.Title>
            {props.children}
            <div class="dialog__close_buttons">
              <Dialog.CloseButton
                class="dialog__close_button"
                type="submit"
                onClick={() => {
                  props.saveOptions();
                  setOpen(false);
                }}
              >
                Save changes
              </Dialog.CloseButton>
              <Dialog.CloseButton
                class="dialog__close_button"
                onClick={() => {
                  setOpen(false);
                }}
              >
                Cancel
              </Dialog.CloseButton>
            </div>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog>
  );
}

export function Checkbox(props: {label: string; checked: boolean; onChange: (value: boolean) => void}) {
  return (
    <CheckboxRoot class="checkbox" checked={props.checked} onChange={props.onChange}>
      <CheckboxRoot.Input class="checkbox__input" />
      <CheckboxRoot.Control class="checkbox__control">
        <CheckboxRoot.Indicator />
      </CheckboxRoot.Control>
      <CheckboxRoot.Label class="checkbox__label">{props.label}</CheckboxRoot.Label>
    </CheckboxRoot>
  );
}

export function registerSettingsDialog(
  saveOptions: OptionsDialogProps['saveOptions'],
  children: JSX.Element,
  additionalStyle: string = ''
) {
  GM_registerMenuCommand('settings', () => {
    const panel = getPanel({style: style + additionalStyle, theme: 'off'});
    Object.assign(panel.wrapper.style, {
      // position in middle of screen
      top: '50%',
      left: '50%',
    });
    render(() => <SettingsDialog mount={panel.body} saveOptions={saveOptions} children={children} />, panel.body);
    panel.show();
  });
}
