import {createReleaseEditorUI} from './ui/release-editor-ui';
import {registerSettingsDialog} from './ui/settings';
import {createWorkEditorUI} from './ui/work-editor-ui';

main().catch(console.error);

function waitForEditorState() {
  return new Promise(resolve => {
    const interval = setInterval(() => {
      if (MB.relationshipEditor.state) {
        console.debug('Editor state is ready');
        clearInterval(interval);
        resolve(MB.relationshipEditor.state);
      }
    }, 50); // Check every 50ms
  });
}

async function main() {
  console.debug('start');
  await registerSettingsDialog();
  await waitForEditorState();
  const createUI = (_mutations: MutationRecord[], observer: MutationObserver) => {
    if (location.pathname.startsWith('/release/')) {
      if (document.querySelector('button.submit')) {
        console.debug('Creating release editor');
        createReleaseEditorUI();
        observer.disconnect();
      }
    } else {
      const workForm = document.querySelector<HTMLFormElement>('form.edit-work');
      if (workForm) {
        console.debug('Creating work editor');
        createWorkEditorUI(workForm);
        observer.disconnect();
      }
    }
  };
  const observer = new MutationObserver(createUI);
  observer.observe(document.body, {childList: true, subtree: true});
  // Initial call to createEditor to handle the case where the editor is already present
  createUI([], observer);
}
