import {modifyArtistCreditBubble} from '#credit-bubble.ts';
import {createUI} from '#ui.tsx';
import {asyncTap} from '@repo/rxjs-ext/async-tap';
import {executePipeline} from '@repo/rxjs-ext/execute-pipeline';
import {newElements} from '@repo/rxjs-ext/wait-for-element';

async function main() {
  await createUI();

  const isArtistCreditBubble = (node: Node): node is HTMLElement => {
    return node instanceof HTMLElement && node.id === 'artist-credit-bubble';
  };

  await executePipeline(
    newElements(isArtistCreditBubble, {subtree: true, childList: true}).pipe(asyncTap(modifyArtistCreditBubble))
  );
}

main().catch(console.error);
