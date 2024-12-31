import {Button} from '@kobalte/core/button';
import {TextField} from '@kobalte/core/text-field';
import {createEffect, createSignal, ParentProps} from 'solid-js';
import {replaceUrlWith} from '../acum';

export function ImportForm(
  props: ParentProps & {field: string; onSubmit: (id: string) => Promise<void>; idPattern: string}
) {
  const [id, setId] = createSignal('');
  const [importing, setImporting] = createSignal(false);

  let submitButton: HTMLButtonElement;

  createEffect((prevTitle?: string) => {
    const button = submitButton!;
    button.disabled = importing();
    button.title = importing() ? 'Importing...' : (prevTitle ?? button.title);
    return button.title;
  });

  const onSubmit = (ev: SubmitEvent) => {
    ev.preventDefault();
    setImporting(true);
    props
      .onSubmit(id())
      .catch(console.error)
      .finally(() => setImporting(false));
  };

  return (
    <form onSubmit={onSubmit}>
      <div class="buttons" style={{display: 'flex'}}>
        <Button type="submit" ref={submitButton!}>
          <img
            src="https://nocs.acum.org.il/acumsitesearchdb/resources/images/faviconSite.svg"
            alt="ACUM logo"
            style={{width: '16px', height: '16px', margin: '2px'}}
          ></img>
          <span>Import works from ACUM</span>
        </Button>
        <TextField
          required={true}
          value={id()}
          onChange={value => setId(replaceUrlWith(`${props.field}id`)(value))}
          style={{'margin': '0 7px 0 0'}}
        >
          <TextField.Input
            pattern={props.idPattern}
            placeholder={`${props.field.charAt(0).toUpperCase()}${props.field.slice(1)} ID`}
          />
        </TextField>
        {props.children}
      </div>
    </form>
  );
}
