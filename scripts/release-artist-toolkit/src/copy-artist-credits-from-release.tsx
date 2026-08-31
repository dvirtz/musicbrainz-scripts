import {
  formatArtistCredit,
  getReleaseGroupSources,
  getSourceRelease,
  getSourceTrackArtistCredits,
  Ws2Release,
} from '#artist-credit-source.ts';
import classes from '#manage-artist-credits-dialog.module.css';
import {
  copyTrackArtistCreditsFromSource,
  copyTrackArtistCreditsFromSourceMedium,
  getTargetMediums,
  SourceTrackArtistCredit,
} from '#release-artist-actions.ts';
import {Button} from '@kobalte/core/button';
import {Dialog} from '@kobalte/core/dialog';
import {createEffect, createSignal, For} from 'solid-js';

type PendingSource = {
  credits: SourceTrackArtistCredit[];
  sourceUrl: string;
};

export function CopyArtistCreditsFromRelease(props: {onDone: () => void}) {
  const [open, setOpen] = createSignal(false);
  const [selectedSourceId, setSelectedSourceId] = createSignal<string>();
  const [sourceValue, setSourceValue] = createSignal('');
  const [sources, setSources] = createSignal<Ws2Release[]>([]);
  const [pendingSource, setPendingSource] = createSignal<PendingSource>();
  const [status, setStatus] = createSignal<string>();
  const [isApplying, setIsApplying] = createSignal(false);

  createEffect(() => {
    void getReleaseGroupSources()
      .then(setSources)
      .catch((error: unknown) => setStatus(error instanceof Error ? error.message : String(error)));
  });

  const reportResult = (result: {applied: number; unmatched: number}) => {
    setStatus(`Copied ${result.applied} track credits; ${result.unmatched} tracks were not matched.`);
  };

  const closeAfterApply = () => {
    setOpen(false);
    props.onDone();
  };

  const trackCount = (source: Ws2Release) => {
    const mediaCounts = source.media?.flatMap(medium => (medium['track-count'] ? [medium['track-count']] : []));
    return mediaCounts?.length ? mediaCounts.join('+') : (source['track-count'] ?? '');
  };

  const applySource = async (value: string) => {
    setIsApplying(true);
    setStatus();
    setPendingSource();

    try {
      const source = await getSourceRelease(value);
      const sourceCredits = getSourceTrackArtistCredits(source.release, source.mediumPosition);
      if (sourceCredits.length === 0) {
        throw new Error('The source has no track artist credits.');
      }

      if (source.mediumPosition === undefined) {
        reportResult(await copyTrackArtistCreditsFromSource(sourceCredits, source.sourceUrl));
        closeAfterApply();
        return;
      }

      const targetMediums = getTargetMediums();
      const matchingMediums = targetMediums.filter(medium => medium.trackCount === sourceCredits.length);
      const targetMedium =
        targetMediums.length === 1 ? targetMediums[0] : matchingMediums.length === 1 ? matchingMediums[0] : undefined;
      if (targetMedium) {
        reportResult(
          await copyTrackArtistCreditsFromSourceMedium(sourceCredits, targetMedium.position, source.sourceUrl)
        );
        closeAfterApply();
        return;
      }

      setPendingSource({credits: sourceCredits, sourceUrl: source.sourceUrl});
      setStatus('Choose a target medium.');
    } catch (error) {
      setStatus((error as Error).message);
    } finally {
      setIsApplying(false);
    }
  };

  const applyToMedium = async (position: number) => {
    const source = pendingSource();
    if (!source) {
      return;
    }

    reportResult(await copyTrackArtistCreditsFromSourceMedium(source.credits, position, source.sourceUrl));
    setPendingSource();
    closeAfterApply();
  };

  const selectedSource = () => sourceValue().trim() || selectedSourceId();

  return (
    <Dialog open={open()} onOpenChange={setOpen} modal={true}>
      <Dialog.Trigger class="button">Copy credits from another release</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay class={classes.overlay} />
        <div class={classes.positioner}>
          <Dialog.Content class={`${classes.content} ${classes.wideContent}`}>
            <Dialog.Title class={classes.title}>Copy credits from another release</Dialog.Title>
            <Dialog.Description class={classes.description}>
              Select a release in this release group or paste a release or medium MBID or URL.
            </Dialog.Description>
            {sources().length > 0 && (
              <table class="tbl">
                <thead>
                  <tr>
                    <th></th>
                    <th>Release</th>
                    <th>Artist</th>
                    <th>Tracks</th>
                    <th>Date</th>
                    <th>Country</th>
                  </tr>
                </thead>
                <tbody>
                  {sources().map(source => (
                    <tr>
                      <td>
                        <input
                          aria-label={source.title}
                          checked={selectedSourceId() === source.id}
                          disabled={isApplying()}
                          name="release-artist-toolkit-source-release"
                          onChange={() => setSelectedSourceId(source.id)}
                          type="radio"
                        />
                      </td>
                      <td>
                        <a href={`/release/${source.id}`} target="_blank" rel="noopener noreferrer">
                          {source.title}
                        </a>
                        <span class="comment">{source.disambiguation ? <> ({source.disambiguation})</> : null}</span>
                      </td>
                      <td>{formatArtistCredit(source['artist-credit'])}</td>
                      <td>{trackCount(source) || ''}</td>
                      <td>{source.date ?? ''}</td>
                      <td>{source.country ?? ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <input
              aria-label="Source release or medium"
              class={classes.sourceInput}
              onInput={event => setSourceValue(event.currentTarget.value)}
              placeholder="Paste a release or medium MBID or URL"
              value={sourceValue()}
            />
            <div class={`buttons ${classes.footer}`}>
              <Button
                disabled={isApplying() || selectedSource() === undefined}
                onClick={() => void applySource(selectedSource() ?? '')}
              >
                Apply
              </Button>
              {pendingSource() && (
                <For each={getTargetMediums()}>
                  {medium => (
                    <Button
                      class="button"
                      onClick={() => {
                        applyToMedium(medium.position).catch(console.error);
                      }}
                    >
                      Apply to medium {medium.position} ({medium.trackCount} tracks)
                    </Button>
                  )}
                </For>
              )}
              <Dialog.CloseButton onClick={props.onDone}>Close</Dialog.CloseButton>
            </div>
            {status() && <p class={classes.status}>{status()}</p>}
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog>
  );
}
