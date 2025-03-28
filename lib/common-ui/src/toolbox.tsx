import {styleInject} from './styleInject';
import toolboxStyle from './toolbox.css';

export function Toolbox(doc: Document, className: 'full-page' | 'half-page' | 'iframe'): HTMLDivElement {
  const ID = 'dvirtz-toolbox';
  const existing = doc.getElementById(ID);
  if (existing) {
    return existing as HTMLDivElement;
  }

  styleInject(toolboxStyle, {document: doc});
  return (
    <div id={ID} class={className}>
      <h2>dvirtz MusicBrainz scripts</h2>
      <br />
    </div>
  ) as HTMLDivElement;
}
