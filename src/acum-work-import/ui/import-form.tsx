import {Button} from '@kobalte/core/button';
import {TextField} from '@kobalte/core/text-field';
import {createEffect, createSignal, ParentProps} from 'solid-js';
import {Entity, EntityT, replaceUrlWith} from '../acum';

export function ImportForm<T extends EntityT>(
  props: ParentProps & {
    entityTypes: T[];
    onSubmit: (entity: Entity<T>) => Promise<void>;
    idPattern: string;
  }
) {
  const uniqueTypes = Array.from(new Set(props.entityTypes));

  const [entity, setEntity] = createSignal(new Entity<T>('', props.entityTypes[0]), {
    equals: (a, b) => a?.toString() === b?.toString(),
  });
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
      .onSubmit(entity())
      .catch(console.error)
      .finally(() => setImporting(false));
  };

  const onInput = (value: string) => {
    const newEntity = replaceUrlWith(uniqueTypes)(value);
    setEntity(newEntity);
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
        <TextField required={true} value={entity().toString()} onChange={onInput} style={{'margin': '0 7px 0 0'}}>
          <TextField.Input pattern={props.idPattern} placeholder={`${uniqueTypes.join('/')} ID`} />
        </TextField>
        {props.children}
      </div>
    </form>
  );
}
