// import {onMount} from 'solid-js';
// import $ from 'jquery';

export type AutocompleteStateT<V extends AutocompleteEntityItemT> = {
  entityType: V['entityType'];
  value: string;
};

export function Autocomplete<V extends AutocompleteEntityItemT>(props: AutocompleteStateT<V>) {
  let ref: HTMLSpanElement | undefined;

  // onMount(() => {
  //   MB.Control.EntityAutocomplete({
  //     entity: props.entityType,
  //     inputs: $(ref!),
  //   });
  // });

  return (
    <>
      <span ref={ref}>
        <input type="text" class="name" value={props.value} />
        <input type="hidden" class="id" />
        <input type="hidden" class="gid" />
      </span>
    </>
  );
}
