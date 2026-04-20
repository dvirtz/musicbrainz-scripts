import classes from '#ui/artist-update-dialog.module.css';
import {Dialog} from '@kobalte/core/dialog';
import {MBID_REGEXP} from '@repo/musicbrainz-ext/constants';
import {tryFetchJSON} from '@repo/musicbrainz-ext/fetch';
import {createSignal} from 'solid-js';
import {render} from 'solid-js/web';
import {ArtistT} from 'typedbrainz/types';

function handleOnLoad(
  iframe: HTMLIFrameElement,
  onSubmitted: (artist: ArtistT) => void,
  setOpen: (closed: boolean) => void
) {
  const frameDocument = iframe.contentDocument;
  if (!frameDocument) {
    return;
  }

  frameDocument.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
    }
  });

  const editForm = frameDocument.querySelector<HTMLFormElement>('form.edit-artist');
  const m = frameDocument.location.href.match(new RegExp(`/artist/(${MBID_REGEXP.source})`));
  if (m) {
    if (iframe.dataset.artistSubmitted === 'true') {
      delete iframe.dataset.artistSubmitted;
      tryFetchJSON<ArtistT>(`/ws/js/entity/${m[1]}`)
        .then(artist => {
          if (artist) {
            onSubmitted(artist);
          }
        })
        .catch(console.error);
      setOpen(false);
    }

    editForm?.addEventListener('submit', () => {
      iframe.dataset.artistSubmitted = 'true';
    });
  }

  const style = frameDocument.createElement('style');
  style.textContent = `
    html, body {
      margin: 0 !important;
      padding: 0 !important;
    }

    body > *:not(#page) {
      display: none !important;
    }

    body > #page {
      display: table !important;
      margin-top: 0 !important;
    }

    body > #page .tabs {
      display: none !important;
    }
  `;
  frameDocument.head.append(style);
}

export function openArtistUpdateDialog(href: string, onSubmitted: (artist: ArtistT) => void) {
  const mount = document.createElement('div');
  document.body.append(mount);
  const lifecycle = {dispose: () => {}};
  lifecycle.dispose = render(
    () => (
      <ArtistUpdateDialog
        href={href}
        onClose={() => {
          lifecycle.dispose();
          mount.remove();
        }}
        onSubmitted={onSubmitted}
      />
    ),
    mount
  );
}

function ArtistUpdateDialog(props: {href: string; onClose: () => void; onSubmitted: (artist: ArtistT) => void}) {
  const [open, setOpen] = createSignal(true);
  return (
    <Dialog modal={true} open={open()} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay class={classes.overlay} />
        <div class={`modal-backdrop ${classes.backdrop}`}>
          <Dialog.Content class="dialog modal iframe-dialog" onEscapeKeyDown={() => setOpen(false)}>
            <div class="title-bar">
              <Dialog.Title as="h1">Update artist</Dialog.Title>
              <Dialog.CloseButton class="close-dialog icon" type="button"></Dialog.CloseButton>
            </div>
            <div class="dialog-content">
              <iframe
                class={classes.frame}
                src={props.href}
                title="Update artist"
                onLoad={event => handleOnLoad(event.currentTarget, props.onSubmitted, setOpen)}
              />
            </div>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog>
  );
}
