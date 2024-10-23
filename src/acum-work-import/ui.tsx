import {releaseEditorTools} from '../common/release-editor-tools';

export function createUI(onClickCreateWorks: () => void, onClickImportInfo: () => void, onInput: (e: Event) => void) {
  const toolbox = releaseEditorTools();

  const ui = (
    <div id="acum-work-import-container" class="buttons">
      <input
        id="acum-album-id"
        type="text"
        placeholder="Album ID"
        style="marginLeft: 10px"
        pattern="\d+"
        title="numbers only"
        oninput={onInput}
      ></input>

      <button disabled={true} onclick={onClickCreateWorks}>
        <img
          src="https://nocs.acum.org.il/acumsitesearchdb/resources/images/faviconSite.svg"
          alt="ACUM logo"
          style="width: 16px; height: 16px; margin: 2px"
        ></img>
        <span>Create works from ACUM</span>
      </button>

      <button disabled={true} onclick={onClickImportInfo}>
        <img
          src="https://nocs.acum.org.il/acumsitesearchdb/resources/images/faviconSite.svg"
          alt="ACUM logo"
          style="width: 16px; height: 16px; margin: 2px"
        ></img>
        <span>Import work attributes from ACUM</span>
      </button>

      <p>This will add a new work for each checked recording that has no work already</p>

      <p class="warning always-on">
        Only use this option after you've tried searching for the work(s) you want to add, and are certain they do not
        already exist on MusicBrainz.
      </p>
    </div>
  ) as HTMLDivElement;

  toolbox.append(ui);
}
