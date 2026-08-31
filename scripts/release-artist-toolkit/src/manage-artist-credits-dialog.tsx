import {CopyArtistCreditsFromRelease} from '#copy-artist-credits-from-release.tsx';
import classes from '#manage-artist-credits-dialog.module.css';
import {
  copyTrackArtistCreditsFromRecordings,
  resetAllArtistCreditsToDefault,
  resetTrackArtistCreditsToReleaseArtist,
} from '#release-artist-actions.ts';
import {Button} from '@kobalte/core/button';
import {Dialog} from '@kobalte/core/dialog';
import {createSignal} from 'solid-js';

export function ManageArtistCreditsDialog() {
  const [open, setOpen] = createSignal(false);

  return (
    <Dialog open={open()} onOpenChange={setOpen} modal={true}>
      <Dialog.Trigger class="button">Manage artist credits</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay class={classes.overlay} />
        <div class={classes.positioner}>
          <Dialog.Content class={`buttons ${classes.content}`}>
            <Dialog.Title class={classes.title}>Manage artist credits</Dialog.Title>
            <Dialog.Description class={classes.description}>
              Choose the artist-credit source to apply.
            </Dialog.Description>
            <div class={classes.actions}>
              <Button
                class="button"
                onClick={() => {
                  resetAllArtistCreditsToDefault();
                  setOpen(false);
                }}
              >
                Reset credits to artist names
              </Button>
              <Button
                class="button"
                onClick={() => {
                  resetTrackArtistCreditsToReleaseArtist()
                    .then(() => setOpen(false))
                    .catch(console.error);
                }}
              >
                Reset credits to release artist
              </Button>
              <Button
                class="button"
                onClick={() => {
                  copyTrackArtistCreditsFromRecordings()
                    .then(() => setOpen(false))
                    .catch(console.error);
                }}
              >
                Copy credits from recordings
              </Button>
              <CopyArtistCreditsFromRelease onDone={() => setOpen(false)} />
            </div>
            <div class={classes.footer}>
              <Dialog.CloseButton>Cancel</Dialog.CloseButton>
            </div>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog>
  );
}
