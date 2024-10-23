import {createSignal} from 'solid-js';
import {Dialog, DialogContent, DialogFooter, DialogTitle} from 'src/common/components/ui/dialog';
import {Button} from 'src/common/components/ui/button';
import {Switch, SwitchControl, SwitchLabel, SwitchThumb} from 'src/common/components/ui/switch';

type OptionsDialogProps = {
  mount: HTMLElement;
};

export function SettingsDialog(props: OptionsDialogProps) {
  const [open, setOpen] = createSignal(true);
  const [coverComment, setCoverComment] = createSignal(addCoverComment());

  const saveOptions = () => {
    GM_setValues({
      addCoverComment: coverComment(),
    });
  };

  return (
    <Dialog open={open()} onOpenChange={setOpen}>
      <DialogContent
        mount={props.mount}
        // https://github.com/kobaltedev/kobalte/issues/169
        onPointerDownOutside={ev => {
          ev.preventDefault();
        }}
        class="sm:max-w-[425px]"
      >
        <DialogTitle>{GM_info.script.name} Options</DialogTitle>
        <Switch class="flex items-center space-x-2" checked={coverComment()} onChange={setCoverComment}>
          <SwitchControl>
            <SwitchThumb />
          </SwitchControl>
          <SwitchLabel>Add cover comment</SwitchLabel>
        </Switch>
        <DialogFooter>
          <Button
            type="submit"
            onClick={() => {
              saveOptions();
              setOpen(false);
            }}
          >
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function addCoverComment() {
  return GM_getValue('addCoverComment', false);
}
