import {Button} from '@kobalte/core/button';
import {TextField} from '@kobalte/core/text-field';
import {createEffect, createSignal, ParentProps} from 'solid-js';
import {Entity, replaceUrlWith} from '../acum';

export function ImportForm(
  props: ParentProps & {
    entities: Entity[];
    onSubmit: (entity: Entity, id: string) => Promise<void>;
    idPattern: string;
  }
) {
  const [id, setId] = createSignal('');
  const [entity, setEntity] = createSignal(props.entities[0]);

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
      .onSubmit(entity(), id())
      .catch(console.error)
      .finally(() => setImporting(false));
  };

  const onInput = (value: string) => {
    const [id, entity] = replaceUrlWith(props.entities)(value);
    setId(id);
    if (entity) {
      setEntity(entity);
    }
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
        <TextField required={true} value={id()} onChange={onInput} style={{'margin': '0 7px 0 0'}}>
          <TextField.Input
            pattern={props.idPattern}
            placeholder={`${props.entities.map(entity => `${entity.charAt(0).toUpperCase()}${entity.slice(1)}`).join('/')} ID`}
          />
        </TextField>
        {props.children}
      </div>
    </form>
  );
}
