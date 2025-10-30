export async function modifyArtistCreditBubble(bubble: HTMLElement) {
  const form = bubble.querySelector<HTMLFormElement>('form');
  if (!form) {
    return;
  }
  const changeMatching = form?.querySelector<HTMLInputElement>('input#change-matching-artists');
  if (!changeMatching) {
    return;
  }

  changeMatching.checked = await GM.getValue('change-matching-artists', false);
  form.onsubmit = async () => {
    await GM.setValue('change-matching-artists', changeMatching.checked);
  };
}
