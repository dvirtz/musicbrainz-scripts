import {creatorUrl, Entity, entityUrl, WorkBean} from '#acum.ts';
import {WriterLinkWarning} from '#link-artists.ts';
import {WorkEditDataWarning} from '#work-edit-data.ts';
import {editNoteFormat} from '@repo/musicbrainz-ext/edit-note';
import {For} from 'solid-js';

export type PerWorkWarning =
  | WorkEditDataWarning
  | WriterLinkWarning
  | {type: 'work-name-different'; recordingName: string};

function artistActionUrl(
  action: 'edit' | 'create',
  track: WorkBean,
  options: {artistMBID?: string; name?: string; ipi: string; ipBaseNumber: string}
) {
  const params = new URLSearchParams();
  if (options.name) {
    params.set('edit-artist.name', options.name);
  }

  if (Number(options.ipi)) {
    params.set('edit-artist.ipi_codes.0', options.ipi);
  } else {
    params.set('edit-artist.url.0.text', creatorUrl(options.ipBaseNumber));
  }

  params.set(
    'edit-artist.edit_note',
    editNoteFormat(
      `matched from ${entityUrl(track.versionId ? new Entity(track.versionId, 'Version') : new Entity(track.workId!, 'Work'))}`
    )
  );

  const href =
    action === 'edit'
      ? `/artist/${options.artistMBID!}/edit?${params.toString()}`
      : `/artist/create?${params.toString()}`;
  return <a href={href}>{action === 'edit' ? 'update' : 'create'}</a>;
}

function artistSearchUrl(name: string) {
  const params = new URLSearchParams();
  params.set('query', name);
  params.set('type', 'artist');
  params.set('method', 'indexed');
  return <a href={`/search?${params.toString()}`}>search</a>;
}

function capitalizeFirst(text: string) {
  return text ? text[0]!.toUpperCase() + text.slice(1) : text;
}

export function renderWarning(warning: PerWorkWarning, track: WorkBean) {
  switch (warning.type) {
    case 'work-name-different':
      return <>Work name is different from recording name {warning.recordingName}, please verify.</>;
    case 'unknown-language':
      return <>Unknown language {warning.workLanguage}.</>;
    case 'unknown-work-type':
      return (
        <>
          Unknown work type {warning.workType}
          {warning.versionEssenceType}
        </>
      );
    case 'creator-not-found':
      return <>Failed to find creator with IPI {warning.ipi}.</>;
    case 'found-by-name':
      return (
        <>
          {capitalizeFirst(warning.role)} <a href={`/artist/${warning.artistId}`}>{warning.artistName}</a> found by name
          search, please verify (IPI = {warning.ipi}).{' '}
          {artistActionUrl('edit', track, {
            artistMBID: warning.artistId,
            ipi: warning.ipi,
            ipBaseNumber: warning.ipBaseNumber,
          })}
          |{artistSearchUrl(warning.artistName)}|
          {artistActionUrl('create', track, {
            name: warning.artistName,
            ipi: warning.ipi,
            ipBaseNumber: warning.ipBaseNumber,
          })}
        </>
      );
    case 'found-by-alias':
      return (
        <>
          {capitalizeFirst(warning.role)} <a href={`/artist/${warning.artistId}`}>{warning.artistName}</a> found by
          alias search, please verify (IPI = {warning.ipi}).{' '}
          {artistActionUrl('edit', track, {
            artistMBID: warning.artistId,
            ipi: warning.ipi,
            ipBaseNumber: warning.ipBaseNumber,
          })}
          |{artistSearchUrl(warning.artistName)}|
          {artistActionUrl('create', track, {
            name: warning.artistName,
            ipi: warning.ipi,
            ipBaseNumber: warning.ipBaseNumber,
          })}
        </>
      );
    case 'failed-to-find':
      return (
        <>
          Failed to find {warning.role} {warning.creatorName} (IPI = {warning.ipi}).{' '}
          {artistSearchUrl(warning.creatorName)}|
          {artistActionUrl('create', track, {
            name: warning.creatorName,
            ipi: warning.ipi,
            ipBaseNumber: warning.ipBaseNumber,
          })}
        </>
      );
    case 'skipping-special-purpose':
      return <>Skipping special purpose artist {warning.artistName} when there are existing authors.</>;
  }
}

export function WorkWarnings(props: {track: WorkBean; warnings: ReadonlyArray<PerWorkWarning>}) {
  return (
    <For each={props.warnings}>
      {workWarning => (
        <p class="error" style={{margin: '2px 0 0 1.8rem'}}>
          {renderWarning(workWarning, props.track)}
        </p>
      )}
    </For>
  );
}
