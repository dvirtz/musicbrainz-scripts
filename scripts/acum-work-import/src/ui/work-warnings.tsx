import {WorkBean} from '#acum.ts';
import {FoundArtistWarning, MissingArtistWarning} from '#ui/work-artist-warnings.tsx';
import {WorkNameDifferentWarning, WorkNameMatchWarning} from '#ui/work-data-warnings.tsx';
import {PerWorkWarning} from '#ui/work-edit-data-provider.tsx';
import {For} from 'solid-js';
import {RecordingT, WorkT} from 'typedbrainz/types';

export function renderWarning(warning: PerWorkWarning, track: WorkBean, work: WorkT, recording?: RecordingT) {
  switch (warning.type) {
    case 'work-found-by-name':
      return (
        <WorkNameMatchWarning
          track={track}
          workId={warning.workId}
          workName={warning.workName}
          work={work}
          recording={recording}
        />
      );
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
      return (
        <FoundArtistWarning
          warning={warning}
          description="was found by name"
          track={track}
          work={work}
          recording={recording}
        />
      );
    case 'found-by-alias':
      return (
        <FoundArtistWarning
          warning={warning}
          description="was found by an alias"
          track={track}
          work={work}
          recording={recording}
        />
      );
    case 'artist-missing-data':
      return (
        <FoundArtistWarning
          warning={warning}
          description="is missing IPI or ACUM link"
          track={track}
          work={work}
          recording={recording}
        />
      );
    case 'failed-to-find':
      return (
        <MissingArtistWarning warning={warning} track={track} work={work} recording={recording}></MissingArtistWarning>
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
