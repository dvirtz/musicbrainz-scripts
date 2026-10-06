import {setInputValue} from '@repo/musicbrainz-ext/set-input-value';
import {waitForElement} from '@repo/rxjs-ext/wait-for-element';

/** Add a URL through the page's external-links editor. */
export async function addExternalLink(doc: Document, url: string): Promise<void> {
  const view = doc.defaultView;
  if (!view) {
    throw new Error('External links editor has no owning window');
  }
  const externalLinksContainer = doc.querySelector<HTMLDivElement>('div.external-links-editor-container');
  const urlInputs = Array.from(externalLinksContainer?.querySelectorAll<HTMLInputElement>('input[type="url"]') ?? []);
  const urlLinks = Array.from(externalLinksContainer?.querySelectorAll<HTMLAnchorElement>('a[href]') ?? []);
  if (urlInputs.some(input => input.value === url) || urlLinks.some(link => link.href === url)) {
    return;
  }
  const urlInput =
    urlInputs.find(input => !input.value) ||
    (await waitForElement(
      (element): element is HTMLInputElement => {
        const view = element.ownerDocument.defaultView;
        return (
          view !== null &&
          element instanceof view.HTMLInputElement &&
          element.getAttribute('type') === 'url' &&
          !element.value
        );
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
