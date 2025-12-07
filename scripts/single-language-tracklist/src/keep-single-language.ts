import {asyncTap} from '@repo/rxjs-ext/async-tap';
import {executePipeline} from '@repo/rxjs-ext/execute-pipeline';
import {waitForElement} from '@repo/rxjs-ext/wait-for-element';
import {from, skip, take, tap} from 'rxjs';

enum Side {
  Left,
  Right,
}

function keepTitleSide(side: Side, sep: string) {
  const titleFields = document.querySelectorAll<HTMLInputElement>('input[id="name"], input.track-name');
  const index = side === Side.Left ? 0 : 1;
  for (const title of titleFields) {
    const parts = title.value.split(sep);
    if (parts.length > 1 && index < parts.length) {
      title.value = parts[index]!.trim();
      title.dispatchEvent(new Event('input', {bubbles: true}));
    }
  }
}

async function keepArtistSide(side: Side, sep: string) {
  const artistCreditButtons = document.querySelectorAll<HTMLButtonElement>('button.open-ac');
  for (const button of Array.from(artistCreditButtons)) {
    button.click();
    const acBubble = await waitForElement(
      (node): node is HTMLDivElement => node instanceof HTMLDivElement && node.id === 'artist-credit-bubble'
    );
    if (!acBubble) {
      console.error('Artist credit bubble not found');
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 1)); // Allow time for the dialog to populate
    const equalJoiner = Array.from(acBubble.querySelectorAll<HTMLInputElement>('input[id*="join-phrase"]')).findIndex(
      input => input.value.trim() === sep
    );
    if (equalJoiner !== -1) {
      await executePipeline(
        from(acBubble.querySelectorAll<HTMLButtonElement>('button.remove-artist-credit')).pipe(
          side === Side.Right ? take(equalJoiner + 1) : skip(equalJoiner + 1),
          tap(button => button.click()),
          asyncTap(async () => {
            await waitForElement(
              (node): node is HTMLTableCellElement =>
                node instanceof HTMLTableCellElement && node.classList.contains('removed-ac-name'),
              undefined,
              acBubble
            );
          })
        )
      );
    }
    const submitButton = acBubble.querySelector<HTMLButtonElement>('button[type="submit"]');
    submitButton?.click();
  }
}

export async function removeRHS(sep: string) {
  keepTitleSide(Side.Left, sep);
  await keepArtistSide(Side.Left, sep);
}

export async function removeLHS(sep: string) {
  keepTitleSide(Side.Right, sep);
  await keepArtistSide(Side.Right, sep);
}
