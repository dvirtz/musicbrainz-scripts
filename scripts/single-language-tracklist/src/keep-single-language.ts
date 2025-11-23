import {waitForElement} from '@repo/rxjs-ext/wait-for-element';

enum Side {
  Left,
  Right,
}

function keepTitleSide(side: Side) {
  const titleFields = document.querySelectorAll<HTMLInputElement>('input[id="name"], input.track-name');
  const index = side === Side.Left ? 0 : 1;
  for (const title of titleFields) {
    const parts = title.value.split(/ = /);
    if (parts.length > 1 && index < parts.length) {
      title.value = parts[index]!.trim();
      title.dispatchEvent(new Event('input', {bubbles: true}));
    }
  }
}

async function keepArtistSide(side: Side) {
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
    const equalJoiner = Array.from(acBubble.querySelectorAll<HTMLInputElement>('input[id*="join-phrase"]')).findIndex(
      input => input.value.trim() === '='
    );
    if (equalJoiner !== -1) {
      Array.from(acBubble.querySelectorAll<HTMLButtonElement>('button.remove-artist-credit'))
        .slice(side === Side.Left ? equalJoiner + 1 : 0, side === Side.Left ? undefined : equalJoiner + 1)
        .forEach(button => button.click());
      await waitForElement(
        (node): node is HTMLTableCellElement =>
          node instanceof HTMLTableCellElement && node.classList.contains('removed-ac-name'),
        undefined,
        acBubble
      );
      await new Promise(resolve => setTimeout(resolve, 5)); // Allow time for the main page to update
    }
    const submitButton = acBubble.querySelector<HTMLButtonElement>('button[type="submit"]');
    submitButton?.click();
  }
}

export async function removeRHS() {
  keepTitleSide(Side.Left);
  await keepArtistSide(Side.Left);
}

export async function removeLHS() {
  keepTitleSide(Side.Right);
  await keepArtistSide(Side.Right);
}
