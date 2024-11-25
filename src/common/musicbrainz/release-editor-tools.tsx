export function releaseEditorTools(): HTMLDivElement {
  const ID = 'dvirtz-release-editor-tools';
  const existing = document.getElementById(ID);
  if (existing) {
    return existing as HTMLDivElement;
  }

  const toolbox = (
    <div id={ID} style={{padding: '8px', border: '5px dotted rgb(171, 171, 109)', margin: '0px -6px 6px'}}>
      <h2>dvirtz MusicBrainz scripts</h2>
    </div>
  ) as HTMLDivElement;

  document.querySelector('div.tabs')?.insertAdjacentElement('afterend', toolbox);
  return toolbox;
}
