import {modifyArtistCreditBubble} from '#credit-bubble.ts';
import {asyncTap} from '@repo/rxjs-ext/async-tap';
import {executePipeline} from '@repo/rxjs-ext/execute-pipeline';
import domMutations from 'dom-mutations';
import {filter, from, mergeMap} from 'rxjs';

async function main() {
  await executePipeline(
    from(domMutations(document.body, {subtree: true, childList: true})).pipe(
      mergeMap(m => from(m.addedNodes)),
      filter(node => node instanceof HTMLElement),
      filter(element => element.id === 'artist-credit-bubble'),
      asyncTap(modifyArtistCreditBubble)
    )
  );
}

main().catch(console.error);
