// cspell: ignore ipis
import {CreatorFull, creatorUrl, Entity, entityUrl, Version, WorkBean} from '#acum.ts';
import {ArtistLinkTypeID} from '#artists.ts';
import {openArtistUpdateDialog} from '#ui/artist-update-dialog.tsx';
import {openArtistDialogFromWarning, OpenArtistDialogParams} from '#ui/warning-actions.ts';
import classes from '#ui/work-edit-dialog.module.css';
import {
  ARRANGER_LINK_TYPE_ID,
  COMPOSER_LINK_TYPE_ID,
  LYRICIST_LINK_TYPE_ID,
  TRANSLATOR_LINK_TYPE_ID,
  WRITER_LINK_TYPE_ID,
} from '@repo/musicbrainz-ext/constants';
import {editNoteFormat} from '@repo/musicbrainz-ext/edit-note';
import {ArtistT} from 'typedbrainz/types';

import {WorkWarning, WorkWarningContext} from '#work-warning.ts';
import type {WarningStore} from '#warning-store.ts';
import {addArtistRelationship} from '#relationships.ts';
import {fetchJSON} from '@repo/musicbrainz-ext/fetch';

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

abstract class ArtistWarning extends WorkWarning {
  constructor(
    context: WorkWarningContext,
    public readonly linkTypeID: ArtistLinkTypeID,
    public readonly creator: CreatorFull,
    protected readonly store: WarningStore
  ) {
    super(context);
  }
  get ipi() {
    return this.creator.number;
  }
  get ipBaseNumber() {
    return this.creator.creatorIpBaseNumber;
  }
  get creatorHebName() {
    return this.creator.creatorHebName;
  }
  get creatorEngName() {
    return this.creator.creatorEngName;
  }
  resolve(artist: ArtistT) {
    return this.store.resolve(
      (warning): warning is ArtistWarning =>
        warning instanceof ArtistWarning && warning.ipBaseNumber === this.ipBaseNumber,
      async warnings => {
        for (const warning of warnings) {
          const {context} = warning;
          const source =
            warning.linkTypeID === ARRANGER_LINK_TYPE_ID && context.recording ? context.recording : context.work;
          addArtistRelationship(
            source,
            warning.linkTypeID,
            artist,
            warning instanceof FoundArtistWarning ? warning.artistId : undefined
          );
        }
        if (await artistHasIpiOrAcumLink(artist, this.ipi, this.ipBaseNumber)) return [];
        return warnings.map(
          warning =>
            new FoundArtistWarning(
              warning.context,
              warning.linkTypeID,
              warning.creator,
              this.store,
              artist.gid,
              artist.name,
              'is missing IPI or ACUM link'
            )
        );
      }
    );
  }
}
export class FoundArtistWarning extends ArtistWarning {
  constructor(
    context: WorkWarningContext,
    linkTypeID: ArtistLinkTypeID,
    creator: CreatorFull,
    store: WarningStore,
    public readonly artistId: string,
    public readonly artistName: string,
    public readonly description: string
  ) {
    super(context, linkTypeID, creator, store);
  }
  render() {
    return (
      <>
        {capitalizeFirst(artistLinkTypeName(this.linkTypeID))}{' '}
        <a href={`/artist/${this.artistId}`}>{this.artistName}</a> {this.description}, please verify (IPI = {this.ipi}
        ).{' '}
        {artistUpdateAction(
          this.context.track,
          {
            artistMBID: this.artistId,
            ipi: this.ipi,
            ipBaseNumber: this.ipBaseNumber,
          },
          artist => {
            this.resolve(artist).catch(console.error);
          }
        )}
        |
        {artistAction({
          action: 'search',
          linkType: this.linkTypeID,
          name: this.artistName,
          creatorHebName: this.creatorHebName,
          creatorEngName: this.creatorEngName,
          editNote: warningEditNote(this.context.track),
          work: this.context.work,
          recording: this.context.recording,
          artistId: this.artistId,
          onConfirmed: artist => {
            this.resolve(artist).catch(console.error);
          },
        })}
        |
        {artistAction({
          action: 'create',
          linkType: this.linkTypeID,
          name: this.artistName,
          creatorHebName: this.creatorHebName,
          creatorEngName: this.creatorEngName,
          editNote: warningEditNote(this.context.track),
          ipi: this.ipi,
          ipBaseNumber: this.ipBaseNumber,
          work: this.context.work,
          recording: this.context.recording,
          artistId: this.artistId,
          onConfirmed: artist => {
            this.resolve(artist).catch(console.error);
          },
        })}
      </>
    );
  }
}
export class MissingArtistWarning extends ArtistWarning {
  render() {
    return (
      <>
        Failed to find {artistLinkTypeName(this.linkTypeID)} {this.creatorHebName || this.creatorEngName || this.ipi}{' '}
        (IPI = {this.ipi}).{' '}
        {artistAction({
          action: 'search',
          linkType: this.linkTypeID,
          name: this.creatorHebName || this.creatorEngName,
          creatorHebName: this.creatorHebName,
          creatorEngName: this.creatorEngName,
          editNote: warningEditNote(this.context.track),
          work: this.context.work,
          recording: this.context.recording,
          onConfirmed: artist => {
            this.resolve(artist).catch(console.error);
          },
        })}
        |
        {artistAction({
          action: 'create',
          linkType: this.linkTypeID,
          name: this.creatorHebName || this.creatorEngName,
          creatorHebName: this.creatorHebName,
          creatorEngName: this.creatorEngName,
          editNote: warningEditNote(this.context.track),
          ipi: this.ipi,
          ipBaseNumber: this.ipBaseNumber,
          work: this.context.work,
          recording: this.context.recording,
          onConfirmed: artist => {
            this.resolve(artist).catch(console.error);
          },
        })}
      </>
    );
  }
}
export class CreatorNotFoundWarning extends WorkWarning {
  constructor(
    context: WorkWarningContext,
    public readonly ipi: string
  ) {
    super(context);
  }
  render() {
    return 'Failed to find creator with IPI ' + this.ipi + '.';
  }
}
export class SkippingSpecialPurposeArtistWarning extends WorkWarning {
  constructor(
    context: WorkWarningContext,
    public readonly artistName: string
  ) {
    super(context);
  }
  render() {
    return 'Skipping special purpose artist ' + this.artistName + ' when there are existing authors.';
  }
}
