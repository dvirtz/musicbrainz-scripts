// adapted from https://github.com/metabrainz/musicbrainz-server/blob/de898cc4e8fede8c459c8eee67e626a72c3a6326/root/static/scripts/relationship-editor/components/DialogButtons.js
export function DialogButtons(props: {isDoneDisabled: boolean; onCancel: () => void; onDone: () => void}) {
  return (
    <div class="buttons" style={{'margin-top': '1em'}}>
      <button class="negative" onClick={props.onCancel} type="button">
        {'Cancel'}
      </button>
      <div class="buttons-right">
        <button class="positive" disabled={props.isDoneDisabled} onClick={props.onDone} type="button">
          {'Done'}
        </button>
      </div>
    </div>
  );
}
