import {creatorUrl, Entity, entityUrl, WorkBean} from '#acum.ts';
import {WriterLinkWarning} from '#link-artists.ts';
import {openArtistDialogFromWarning, OpenArtistDialogParams, updateArtist} from '#ui/relationship-dialog-actions.ts';
import {useWorkEditData} from '#ui/work-edit-data-provider.tsx';
import classes from '#ui/work-edit-dialog.module.css';
import {WorkEditDataWarning} from '#work-edit-data.ts';
import {editNoteFormat} from '@repo/musicbrainz-ext/edit-note';
import {For} from 'solid-js';
import {ArtistT, RecordingT, WorkT} from 'typedbrainz/types';

export type PerWorkWarning =
  | WorkEditDataWarning
  | WriterLinkWarning
  | {type: 'work-name-different'; recordingName: string};

function artistUpdateAction(
  track: WorkBean,
  options: {artistMBID: string; name?: string; ipi: string; ipBaseNumber: string},
  onVerified: (artist: ArtistT) => void
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

  const href = `/artist/${options.artistMBID}/edit?${params.toString()}`;
  return (
    <button
      type="button"
      class={`btn-link ${classes['btn-link']}`}
      onClick={() => {
        updateArtist(href, onVerified);
      }}
    >
      update
    </button>
  );
}

function artistAction(params: OpenArtistDialogParams) {
  return (
    <button
      type="button"
      class={`btn-link ${classes['btn-link']}`}
      onClick={() => {
        void openArtistDialogFromWarning(params).catch((error: unknown) => {
          console.error(`Failed to ${params.action} artist from warning`, error);
        });
      }}
    >
      {params.action}
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

function renderFoundArtistWarning(
  warning: Extract<PerWorkWarning, {type: 'found-by-name' | 'found-by-alias' | 'artist-missing-data'}>,
  description: string,
  track: WorkBean,
  work: WorkT,
  recording: RecordingT | undefined,
  resolveArtistWarnings?: (ipBaseNumber: string, artist: ArtistT) => void
) {
  return (
    <>
      {capitalizeFirst(warning.role)} <a href={`/artist/${warning.artistId}`}>{warning.artistName}</a> {description},
      please verify (IPI = {warning.ipi}).{' '}
      {artistUpdateAction(
        track,
        {
          artistMBID: warning.artistId,
          ipi: warning.ipi,
          ipBaseNumber: warning.ipBaseNumber,
        },
        artist => resolveArtistWarnings?.(warning.ipBaseNumber, artist)
      )}
      |
      {artistAction({
        action: 'search',
        linkType: warning.linkTypeID,
        name: warning.artistName,
        creatorHebName: warning.creatorHebName,
        creatorEngName: warning.creatorEngName,
        editNote: warningEditNote(track),
        work,
        recording,
        artistId: warning.artistId,
        onConfirmed: artist => resolveArtistWarnings?.(warning.ipBaseNumber, artist),
      })}
      |
      {artistAction({
        action: 'create',
        linkType: warning.linkTypeID,
        name: warning.artistName,
        creatorHebName: warning.creatorHebName,
        creatorEngName: warning.creatorEngName,
        editNote: warningEditNote(track),
        ipi: warning.ipi,
        ipBaseNumber: warning.ipBaseNumber,
        work,
        recording,
        artistId: warning.artistId,
        onConfirmed: artist => resolveArtistWarnings?.(warning.ipBaseNumber, artist),
      })}
    </>
  );
}

function WorkNameDifferentWarning(props: {recordingName: string}) {
  const {setLiveEditData, saveEditData} = useWorkEditData();
  return (
    <>
      Work name is different from recording name {props.recordingName}, please verify.{' '}
      <button
        type="button"
        class={`btn-link ${classes['btn-link']}`}
        onClick={() => {
          setLiveEditData('name', props.recordingName);
          saveEditData();
        }}
      >
        update
      </button>
    </>
  );
}

export function renderWarning(
  warning: PerWorkWarning,
  track: WorkBean,
  work: WorkT,
  recording?: RecordingT,
  resolveArtistWarnings?: (ipBaseNumber: string, artist: ArtistT) => void
) {
  switch (warning.type) {
    case 'work-name-different':
      return <WorkNameDifferentWarning recordingName={warning.recordingName} />;
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
      return renderFoundArtistWarning(warning, 'was found by name', track, work, recording, resolveArtistWarnings);
    case 'found-by-alias':
      return renderFoundArtistWarning(warning, 'was found by an alias', track, work, recording, resolveArtistWarnings);
    case 'artist-missing-data':
      return renderFoundArtistWarning(
        warning,
        'is missing IPI or ACUM link',
        track,
        work,
        recording,
        resolveArtistWarnings
      );
    case 'failed-to-find':
      return (
        <>
          Failed to find {warning.role} {warning.creatorHebName || warning.creatorEngName || warning.ipi} (IPI ={' '}
          {warning.ipi}).{' '}
          {artistAction({
            action: 'search',
            linkType: warning.linkTypeID,
            name: warning.creatorHebName || warning.creatorEngName,
            creatorHebName: warning.creatorHebName,
            creatorEngName: warning.creatorEngName,
            editNote: warningEditNote(track),
            work,
            recording,
            onConfirmed: artist => resolveArtistWarnings?.(warning.ipBaseNumber, artist),
          })}
          |
          {artistAction({
            action: 'create',
            linkType: warning.linkTypeID,
            name: warning.creatorHebName || warning.creatorEngName,
            creatorHebName: warning.creatorHebName,
            creatorEngName: warning.creatorEngName,
            editNote: warningEditNote(track),
            ipi: warning.ipi,
            ipBaseNumber: warning.ipBaseNumber,
            work,
            recording,
            onConfirmed: artist => resolveArtistWarnings?.(warning.ipBaseNumber, artist),
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
  const {resolveArtistWarnings} = useWorkEditData();
  return (
    <For each={props.warnings}>
      {workWarning => (
        <p class="error" style={{margin: '2px 0 0 1.8rem'}}>
          {renderWarning(workWarning, props.track, props.work, props.recording, resolveArtistWarnings)}
        </p>
      )}
    </For>
  );
}
