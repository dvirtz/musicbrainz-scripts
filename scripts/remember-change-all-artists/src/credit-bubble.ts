export async function modifyArtistCreditBubble(bubble: HTMLElement) {
  const form = bubble.querySelector<HTMLFormElement>('form');
  if (!form) {
    return;
  }

  const changeMatching = form?.querySelector<HTMLInputElement>('input#change-matching-artists');
  if (!changeMatching) {
    return;
  }

  if ((await GM.getValue('change-matching-artists', false)) && !changeMatching.checked) {
    changeMatching.click();
  }
}
