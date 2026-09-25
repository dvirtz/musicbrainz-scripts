import {setInputValue} from '@repo/musicbrainz-ext/set-input-value';
import {waitForElement} from '@repo/rxjs-ext/wait-for-element';

/** Add a URL through the page's external-links editor. */
export async function addExternalLink(doc: Document, url: string): Promise<void> {
  const view = doc.defaultView;
  if (!view) {
    throw new Error('External links editor has no owning window');
  }
  const externalLinksContainer = doc.querySelector<HTMLDivElement>('div.external-links-editor-container');
  const urlInput =
    externalLinksContainer?.querySelector<HTMLInputElement>('input[type="url"]') ||
    (await waitForElement(
      (element): element is HTMLInputElement => {
        const view = element.ownerDocument.defaultView;
        return view !== null && element instanceof view.HTMLInputElement && element.getAttribute('type') === 'url';
      },
      undefined,
      externalLinksContainer ?? undefined
    ));
  if (urlInput) {
    setInputValue(urlInput, url);
  } else {
    throw new Error('no URL input found');
  }
}
