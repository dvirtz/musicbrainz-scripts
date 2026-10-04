import classes from '#editor.module.css';
import {Editor} from '#editor.tsx';
import {waitForElement} from '@repo/rxjs-ext/wait-for-element';
import {render} from 'solid-js/web';

async function mountEditor() {
  const selector = 'textarea[name="edit-event.setlist"]';
  const textarea =
    document.querySelector<HTMLTextAreaElement>(selector) ??
    (await waitForElement(
      (element): element is HTMLTextAreaElement => element instanceof HTMLTextAreaElement && element.matches(selector)
    ));
  if (!textarea || textarea.dataset.eventSetlistEditor) {
    console.warn('failed to find setlist element');
    return;
  }
  textarea.dataset.eventSetlistEditor = 'mounted';
  const host = document.createElement('section');
  host.classList.add('clear-both');
  host.setAttribute('aria-label', 'Event setlist editor');
  textarea.closest('fieldset')?.classList.add(classes.details!);
  (textarea.closest('.row') ?? textarea).after(host);
  render(() => Editor({textarea}), host);
}

void mountEditor().catch(console.error);
