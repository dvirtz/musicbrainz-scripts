// cspell: ignore ipis

import {creatorUrl, Entity, entityUrl, Version, WorkBean} from '#acum.ts';
import {ArtistLinkTypeID, ArtistWarning} from '#artists.ts';
import {addArtistRelationship} from '#relationships.ts';
import {openArtistUpdateDialog} from '#ui/artist-update-dialog.tsx';
import {openArtistDialogFromWarning, OpenArtistDialogParams} from '#ui/warning-actions.ts';
import {PerWorkWarning, tryUseWorkEditData, WarningResolutionContext} from '#ui/work-edit-data-provider.tsx';
import classes from '#ui/work-edit-dialog.module.css';
import {
  ARRANGER_LINK_TYPE_ID,
  COMPOSER_LINK_TYPE_ID,
  LYRICIST_LINK_TYPE_ID,
  TRANSLATOR_LINK_TYPE_ID,
  WRITER_LINK_TYPE_ID,
} from '@repo/musicbrainz-ext/constants';
import {editNoteFormat} from '@repo/musicbrainz-ext/edit-note';
import {fetchJSON} from '@repo/musicbrainz-ext/fetch';
import {ArtistT, RecordingT, WorkT} from 'typedbrainz/types';

function artistUpdateAction(
  track: WorkBean,
  options: {artistMBID: string; name?: string; ipi: string; ipBaseNumber: string},
  onVerified: (artist: ArtistT) => void
) {
  const params = new URLSearchParams();
  if (options.name) {
    params.set('edit-artist.name', options.name);
  }

  // use high index to avoid overriding existing values
  if (Number(options.ipi)) {
    params.set('edit-artist.ipi_codes.9999', options.ipi);
  } else {
    params.set('edit-artist.url.9999.text', creatorUrl(options.ipBaseNumber));
  }

  params.set('edit-artist.edit_note', warningEditNote(track));

  const href = `/artist/${options.artistMBID}/edit?${params.toString()}`;
  return (
    <button
      type="button"
      class={`btn-link ${classes['btn-link']}`}
      onClick={() => {
        openArtistUpdateDialog(href, onVerified);
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
        openArtistDialogFromWarning(params).catch((error: unknown) => {
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
  const workId = track.workId || track.fullWorkId;
  return editNoteFormat(
    `matched from ${entityUrl(track.versionId ? new Version(track.versionId, workId) : new Entity(workId, 'Work'))}`
  );
}

type MissingArtistWarning = Extract<
  ArtistWarning,
  {type: 'found-by-alias' | 'found-by-name' | 'failed-to-find' | 'artist-missing-data'}
>;

function isMissingArtistWarning(warning: PerWorkWarning): warning is MissingArtistWarning {
  return (
    warning.type === 'found-by-alias' ||
    warning.type === 'found-by-name' ||
    warning.type === 'failed-to-find' ||
    warning.type === 'artist-missing-data'
  );
}

async function artistHasIpiOrAcumLink(artist: ArtistT, ipi: string, ipBaseNumber: string) {
  type ArtistResponse = {
    ipis?: string[];
    relations?: Array<{
      'target-type'?: string;
      url?: {id?: string; resource?: string};
    }>;
  };

  const {ipis, relations} = await fetchJSON<ArtistResponse>(`/ws/2/artist/${artist.gid}?fmt=json&inc=url-rels`);

  return (
    ipis?.includes(ipi) ||
    relations?.some(rel => rel['target-type'] === 'url' && rel.url?.resource === creatorUrl(ipBaseNumber))
  );
}

function artistLinkTypeName(linkTypeID: ArtistLinkTypeID): string {
  switch (linkTypeID) {
    case COMPOSER_LINK_TYPE_ID:
      return 'composer';
    case LYRICIST_LINK_TYPE_ID:
      return 'lyricist';
    case ARRANGER_LINK_TYPE_ID:
      return 'arranger';
    case TRANSLATOR_LINK_TYPE_ID:
      return 'translator';
    case WRITER_LINK_TYPE_ID:
      return 'writer';
  }
}

export function FoundArtistWarning(props: {
  warning: Extract<PerWorkWarning, {type: 'found-by-name' | 'found-by-alias' | 'artist-missing-data'}>;
  description: string;
  track: WorkBean;
  work: WorkT;
  recording: RecordingT | undefined;
}) {
  return (
    <>
      {capitalizeFirst(artistLinkTypeName(props.warning.linkTypeID))}{' '}
      <a href={`/artist/${props.warning.artistId}`}>{props.warning.artistName}</a> {props.description}, please verify
      (IPI = {props.warning.ipi}
      ).{' '}
      {artistUpdateAction(
        props.track,
        {
          artistMBID: props.warning.artistId,
          ipi: props.warning.ipi,
          ipBaseNumber: props.warning.ipBaseNumber,
        },
        artist => resolveArtistWarnings(props.warning.ipBaseNumber, artist)
      )}
      |
      {artistAction({
        action: 'search',
        linkType: props.warning.linkTypeID,
        name: props.warning.artistName,
        creatorHebName: props.warning.creatorHebName,
        creatorEngName: props.warning.creatorEngName,
        editNote: warningEditNote(props.track),
        work: props.work,
        recording: props.recording,
        artistId: props.warning.artistId,
        onConfirmed: artist => resolveArtistWarnings(props.warning.ipBaseNumber, artist),
      })}
      |
      {artistAction({
        action: 'create',
        linkType: props.warning.linkTypeID,
        name: props.warning.artistName,
        creatorHebName: props.warning.creatorHebName,
        creatorEngName: props.warning.creatorEngName,
        editNote: warningEditNote(props.track),
        ipi: props.warning.ipi,
        ipBaseNumber: props.warning.ipBaseNumber,
        work: props.work,
        recording: props.recording,
        artistId: props.warning.artistId,
        onConfirmed: artist => resolveArtistWarnings(props.warning.ipBaseNumber, artist),
      })}
    </>
  );
}

export function MissingArtistWarning(props: {
  warning: Extract<PerWorkWarning, {type: 'failed-to-find'}>;
  track: WorkBean;
  work: WorkT;
  recording: RecordingT | undefined;
}) {
  return (
    <>
      Failed to find {artistLinkTypeName(props.warning.linkTypeID)}{' '}
      {props.warning.creatorHebName || props.warning.creatorEngName || props.warning.ipi} (IPI = {props.warning.ipi}).{' '}
      {artistAction({
        action: 'search',
        linkType: props.warning.linkTypeID,
        name: props.warning.creatorHebName || props.warning.creatorEngName,
        creatorHebName: props.warning.creatorHebName,
        creatorEngName: props.warning.creatorEngName,
        editNote: warningEditNote(props.track),
        work: props.work,
        recording: props.recording,
        onConfirmed: artist => resolveArtistWarnings(props.warning.ipBaseNumber, artist),
      })}
      |
      {artistAction({
        action: 'create',
        linkType: props.warning.linkTypeID,
        name: props.warning.creatorHebName || props.warning.creatorEngName,
        creatorHebName: props.warning.creatorHebName,
        creatorEngName: props.warning.creatorEngName,
        editNote: warningEditNote(props.track),
        ipi: props.warning.ipi,
        ipBaseNumber: props.warning.ipBaseNumber,
        work: props.work,
        recording: props.recording,
        onConfirmed: artist => resolveArtistWarnings(props.warning.ipBaseNumber, artist),
      })}
    </>
  );
}

function resolveArtistWarnings(ipBaseNumber: string, artist: ArtistT) {
  const context = tryUseWorkEditData();

  context
    ?.resolveWarnings?.(
      (warning: PerWorkWarning): warning is MissingArtistWarning =>
        isMissingArtistWarning(warning) && warning.ipBaseNumber === ipBaseNumber,
      async (artistWarnings, context: WarningResolutionContext) => {
        for (const warning of artistWarnings) {
          const sourceEntity =
            warning.linkTypeID === ARRANGER_LINK_TYPE_ID && context.recording ? context.recording : context.work;
          addArtistRelationship(
            sourceEntity,
            warning.linkTypeID,
            artist,
            'artistId' in warning ? warning.artistId : undefined
          );
        }

        if (await artistHasIpiOrAcumLink(artist, artistWarnings[0]!.ipi, ipBaseNumber)) {
          return [];
        }

        return artistWarnings.map(warning => ({
          ...warning,
          artistId: artist.gid,
          artistName: artist.name,
          type: 'artist-missing-data' as const,
        }));
      },
      {scope: 'all'}
    )
    .catch(console.error);
}
