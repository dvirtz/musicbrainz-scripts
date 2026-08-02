import {creatorUrl, Entity, entityUrl, WorkBean} from '#acum.ts';
import {WriterLinkWarning} from '#link-artists.ts';
import {openArtistDialogFromWarning} from '#ui/relationship-dialog-actions.ts';
import {WorkEditDataWarning} from '#work-edit-data.ts';
import {editNoteFormat} from '@repo/musicbrainz-ext/edit-note';
import {For} from 'solid-js';
import {RecordingT, WorkT} from 'typedbrainz/types';

export type PerWorkWarning =
  | WorkEditDataWarning
  | WriterLinkWarning
  | {type: 'work-name-different'; recordingName: string};

function artistActionUrl(
  action: 'edit',
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

  params.set('edit-artist.edit_note', warningEditNote(track));

  const href = `/artist/${options.artistMBID!}/edit?${params.toString()}`;
  return <a href={href}>update</a>;
}

function artistAction(
  action: 'search' | 'create',
  options: {
    linkType: number;
    name: string;
    creatorHebName: string;
    creatorEngName: string;
    editNote: string;
    ipi?: string;
    ipBaseNumber?: string;
    work: WorkT;
    recording?: RecordingT;
  }
) {
  return (
    <button
      type="button"
      class="as-link"
      onClick={() => {
        void openArtistDialogFromWarning({
          action,
          ...options,
        }).catch((error: unknown) => {
          console.error(`Failed to ${action} artist from warning`, error);
        });
      }}
    >
      {action}
    </button>
  );
}

function capitalizeFirst(text: string) {
  return text ? text[0]!.toUpperCase() + text.slice(1) : text;
}

function warningEditNote(track: WorkBean) {
  return editNoteFormat(
    `matched from ${entityUrl(track.versionId ? new Entity(track.versionId, 'Version') : new Entity(track.workId!, 'Work'))}`
  );
}

export function renderWarning(warning: PerWorkWarning, track: WorkBean, work: WorkT, recording?: RecordingT) {
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
          |
          {artistAction('search', {
            linkType: warning.linkTypeID,
            name: warning.artistName,
            creatorHebName: warning.creatorHebName,
            creatorEngName: warning.creatorEngName,
            editNote: warningEditNote(track),
            work,
            recording,
          })}
          |
          {artistAction('create', {
            linkType: warning.linkTypeID,
            name: warning.artistName,
            creatorHebName: warning.creatorHebName,
            creatorEngName: warning.creatorEngName,
            editNote: warningEditNote(track),
            ipi: warning.ipi,
            ipBaseNumber: warning.ipBaseNumber,
            work,
            recording,
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
          |
          {artistAction('search', {
            linkType: warning.linkTypeID,
            name: warning.artistName,
            creatorHebName: warning.creatorHebName,
            creatorEngName: warning.creatorEngName,
            editNote: warningEditNote(track),
            work,
            recording,
          })}
          |
          {artistAction('create', {
            linkType: warning.linkTypeID,
            name: warning.artistName,
            creatorHebName: warning.creatorHebName,
            creatorEngName: warning.creatorEngName,
            editNote: warningEditNote(track),
            ipi: warning.ipi,
            ipBaseNumber: warning.ipBaseNumber,
            work,
            recording,
          })}
        </>
      );
    case 'failed-to-find':
      return (
        <>
          Failed to find {warning.role} {warning.creatorHebName || warning.creatorEngName || warning.ipi} (IPI ={' '}
          {warning.ipi}).{' '}
          {artistAction('search', {
            linkType: warning.linkTypeID,
            name: warning.creatorEngName || warning.creatorHebName || warning.ipi,
            creatorHebName: warning.creatorHebName,
            creatorEngName: warning.creatorEngName,
            editNote: warningEditNote(track),
            work,
            recording,
          })}
          |
          {artistAction('create', {
            linkType: warning.linkTypeID,
            name: warning.creatorEngName || warning.creatorHebName || warning.ipi,
            creatorHebName: warning.creatorHebName,
            creatorEngName: warning.creatorEngName,
            editNote: warningEditNote(track),
            ipi: warning.ipi,
            ipBaseNumber: warning.ipBaseNumber,
            work,
            recording,
          })}
        </>
      );
    case 'skipping-special-purpose':
      return <>Skipping special purpose artist {warning.artistName} when there are existing authors.</>;
  }
}

export function WorkWarnings(props: {
  track: WorkBean;
  warnings: ReadonlyArray<PerWorkWarning>;
  work: WorkT;
  recording?: RecordingT;
}) {
  return (
    <For each={props.warnings}>
      {workWarning => (
        <p class="error" style={{margin: '2px 0 0 1.8rem'}}>
          {renderWarning(workWarning, props.track, props.work, props.recording)}
        </p>
      )}
    </For>
  );
}
