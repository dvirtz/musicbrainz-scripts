// adapted from https://github.com/metabrainz/musicbrainz-server/blob/de898cc4e8fede8c459c8eee67e626a72c3a6326/root/static/scripts/relationship-editor/hooks/useDialogEnterKeyHandler.js

export default function useDialogEnterKeyHandler(acceptDialog: () => void): (event: KeyboardEvent) => void {
  return event => {
    if (
      event.key === 'Enter' &&
      !event.defaultPrevented &&
      /*
       * MBS-12619: Hitting <Enter> on a button should click the button
       * rather than accept the dialog.
       */
      !(event.target instanceof HTMLButtonElement)
    ) {
      // Prevent a click event on the ButtonPopover.
      event.preventDefault();
      // This will return focus to the button.
      acceptDialog();
    }
  };
}
