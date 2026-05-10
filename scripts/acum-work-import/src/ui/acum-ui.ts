// cspell:words versionlist
import {replaceUrlWith, saveLatestEntityData} from '#acum.ts';
import styles from '#ui/acum-ui.module.css';
import {executePipeline} from '@repo/rxjs-ext/execute-pipeline';
import {newElements} from '@repo/rxjs-ext/wait-for-element';
import {fromEvent, merge, tap} from 'rxjs';

const captureButtonId = 'acum-work-import-save-button';
const actionItemId = 'acum-work-import-menu-item';
const pageAnchorSelector = '#top-menu';
const pageContentSelector = '.content';

function isSupportedAcumEntityPage(): boolean {
  return replaceUrlWith(location.href) !== undefined;
}

function isPageAnchor(element: Element): element is HTMLUListElement {
  return element instanceof HTMLUListElement && element.isConnected && element.matches(pageAnchorSelector);
}

function isPageContentRoot(element: Element): element is HTMLElement {
  return element instanceof HTMLElement && element.isConnected && element.matches(pageContentSelector);
}

function findTopAnchor(): HTMLUListElement | null {
  const anchor = document.querySelector<HTMLUListElement>(pageAnchorSelector);
  return anchor && isPageAnchor(anchor) ? anchor : null;
}

class AcumButton {
  private element: HTMLButtonElement;

  private constructor(element: HTMLButtonElement) {
    this.element = element;
  }

  static getOrCreate(): AcumButton {
    // Always query DOM for button
    const existing = document.getElementById(captureButtonId);
    if (existing instanceof HTMLButtonElement) {
      const button = new AcumButton(existing);
      button.attachClickListener();
      return button;
    }

    // Create new button
    const element = document.createElement('button');
    element.id = captureButtonId;
    element.type = 'button';
    element.className = `${styles.captureButton} ${styles.captureButtonTopMenu}`;

    const button = new AcumButton(element);
    button.setTextContent();
    button.attachClickListener();
    return button;
  }

  private setTextContent(): void {
    this.element.textContent = 'Save for MusicBrainz';
  }

  private attachClickListener(): void {
    if (this.element.dataset.acumWorkImportBound === 'true') {
      return;
    }

    this.element.dataset.acumWorkImportBound = 'true';
    this.element.addEventListener('click', () => {
      void this.onClickHandler();
    });
  }

  private async onClickHandler(): Promise<void> {
    const entity = replaceUrlWith(location.href);
    if (!entity) {
      alert('Failed to detect ACUM entity from this page URL.');
      return;
    }

    const previousText = this.element.textContent;
    this.element.disabled = true;
    this.element.textContent = 'Saving...';

    try {
      const workCount = await saveLatestEntityData(entity);
      this.element.textContent = `Saved ${workCount} work${workCount === 1 ? '' : 's'}`;
    } catch (err) {
      console.error(err);
      alert(`Failed to save ACUM data: ${String(err)}`);
      this.element.textContent = previousText;
    } finally {
      this.element.disabled = false;
    }
  }

  mount(anchor: HTMLUListElement): void {
    let actionItem = anchor.querySelector<HTMLLIElement>(`#${actionItemId}`);
    if (!actionItem || actionItem.parentElement !== anchor) {
      actionItem = document.createElement('li');
      actionItem.id = actionItemId;
      actionItem.className = styles.topMenuActionItem ?? '';
      anchor.append(actionItem);
    }

    this.setTextContent();

    if (this.element.parentElement === actionItem) {
      return;
    }

    actionItem.append(this.element);
  }

  unmount(): void {
    this.element.parentElement?.remove();
  }

  syncToCurrentPage(): void {
    if (!isSupportedAcumEntityPage()) {
      this.unmount();
      return;
    }

    const anchor = findTopAnchor();
    if (!anchor) {
      this.unmount();
      return;
    }

    this.mount(anchor);
  }

  async startObserver(): Promise<void> {
    await executePipeline(
      merge(
        newElements(isPageAnchor, {childList: true, subtree: true}, document.body),
        newElements(isPageContentRoot, {childList: true, subtree: true}, document.body),
        fromEvent(window, 'popstate'),
        fromEvent(window, 'hashchange')
      ).pipe(tap(() => this.syncToCurrentPage()))
    );
  }
}

export async function createAcumUI() {
  const button = AcumButton.getOrCreate();
  button.syncToCurrentPage();
  await button.startObserver();
}
