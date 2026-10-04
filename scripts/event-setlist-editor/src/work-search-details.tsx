import classes from '#editor.module.css';
import {RelatedArtists, WorkSearchResult} from '#work-search.ts';
import {Show} from 'solid-js';

function relatedNames(artists?: RelatedArtists) {
  if (!artists || Number(artists.hits) <= 0) return '';
  return [...artists.results, ...(Number(artists.hits) > artists.results.length ? ['…'] : [])].join(', ');
}

export function WorkSearchLanguage(props: {work: WorkSearchResult}) {
  const languages = () => props.work.languages?.map(item => item.language.name).join(', ');
  return (
    <Show when={languages()}>
      <span class={`${classes['result-language']} autocomplete-language`}>{languages()}</span>
    </Show>
  );
}

export function WorkSearchDetails(props: {work: WorkSearchResult}) {
  const authors = () => relatedNames(props.work.related_artists?.authors);
  const artists = () => relatedNames(props.work.related_artists?.artists);
  return (
    <>
      <Show when={props.work.typeName}>
        <span class={`${classes['result-detail']} autocomplete-comment`}>Type: {props.work.typeName}</span>
      </Show>
      <Show when={authors()}>
        <span class={`${classes['result-detail']} autocomplete-comment`}>Authors: {authors()}</span>
      </Show>
      <Show when={artists()}>
        <span class={`${classes['result-detail']} autocomplete-comment`}>Artists: {artists()}</span>
      </Show>
    </>
  );
}
