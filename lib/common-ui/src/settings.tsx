import {Checkbox as CheckboxRoot} from '@kobalte/core/checkbox';
import {Dialog} from '@kobalte/core/dialog';
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
    <Dialog open={open()} onOpenChange={setOpen} modal={true}>
      <Dialog.Portal>
        <Dialog.Overlay class="dialog__overlay" />
        <div class="dialog__positioner">
          <Dialog.Content
            class="dialog__content"
            // https://github.com/kobaltedev/kobalte/issues/169
            onPointerDownOutside={ev => {
              ev.preventDefault();
            }}
          >
            <Dialog.Title class="dialog__title">{GM.info.script.name} options</Dialog.Title>
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
  GM.registerMenuCommand('settings', () => {
    const mount = document.createElement('div');
    mount.style.cssText = style + additionalStyle;
    render(() => <SettingsDialog saveOptions={saveOptions} children={children} mount={mount} />, mount);
  });
}
