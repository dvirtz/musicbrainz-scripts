import {Checkbox as CheckboxRoot} from '@kobalte/core/checkbox';
import {Dialog} from '@kobalte/core/dialog';
import {ComponentProps, createResource, createSignal, For, splitProps} from 'solid-js';
import {render} from 'solid-js/web';
import classes from './settings.module.css';
import style from './settings.module.css?inline';

export type SettingsDialogOptions = {
  name: string;
  description: string;
  defaultValue: boolean;
};

function SettingsDialog(props: {mount: HTMLElement; options: SettingsDialogOptions[]}) {
  const [open, setOpen] = createSignal(true);
  const resources = props.options.map(option => {
    const [value, {mutate}] = createResource(async () => GM.getValue(option.name, option.defaultValue));
    return {
      name: option.name,
      description: option.description,
      get: () => value(),
      set: (v: boolean) => {
        mutate(v);
      },
    };
  });
  const onSave = () => {
    Promise.all(resources.map(resource => GM.setValue(resource.name, resource.get()))).catch(console.error);
  };

  return (
    <Dialog open={open()} onOpenChange={setOpen} modal={true}>
      <Dialog.Portal mount={props.mount}>
        <Dialog.Overlay class={classes.dialog__overlay} />
        <div class={classes.dialog__positioner}>
          <Dialog.Content class={classes.dialog__content} onPointerDownOutside={e => e.preventDefault()}>
            <div class={classes.dialog__header}>
              <Dialog.Title class={classes.dialog__title}>{GM.info.script.name} options</Dialog.Title>
            </div>
            <Dialog.Description as="div" class={classes.dialog__description}>
              <For each={resources}>
                {item => <Checkbox label={item.description} checked={item.get()} onChange={item.set} />}
              </For>
            </Dialog.Description>
            <div class={classes.dialog__close_buttons}>
              <Dialog.CloseButton
                class={classes.dialog__close_button}
                type="submit"
                onClick={() => {
                  onSave();
                  setOpen(false);
                }}
              >
                Save changes
              </Dialog.CloseButton>
              <Dialog.CloseButton class={classes.dialog__close_button} onClick={() => setOpen(false)}>
                Cancel
              </Dialog.CloseButton>
            </div>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog>
  );
}

function Checkbox(props: ComponentProps<typeof CheckboxRoot> & {label: string}) {
  const [other, rootProps] = splitProps(props, ['label']);
  return (
    <CheckboxRoot class={classes.checkbox} {...rootProps}>
      <CheckboxRoot.Input class={classes.checkbox__input} />
      <CheckboxRoot.Control class={classes.checkbox__control}>
        <CheckboxRoot.Indicator />
      </CheckboxRoot.Control>
      <CheckboxRoot.Label class={classes.checkbox__label}>{other.label}</CheckboxRoot.Label>
    </CheckboxRoot>
  );
}

export async function registerSettingsDialog(options: SettingsDialogOptions[]) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = host.attachShadow({mode: 'open'});
  root.appendChild((<style>{style}</style>) as HTMLStyleElement);
  const mount = (<div class={classes.dialog__panel}></div>) as HTMLDivElement;
  root.appendChild(mount);
  await GM.registerMenuCommand('settings', () =>
    render(() => <SettingsDialog mount={mount} options={options} />, mount)
  );
}
