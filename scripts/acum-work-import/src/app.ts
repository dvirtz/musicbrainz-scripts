import {createReleaseEditorUI} from './ui/release-editor-ui';
import {registerSettingsDialog} from './ui/settings';
import {createWorkEditorUI} from './ui/work-editor-ui';

main().catch(console.error);

async function main() {
  await registerSettingsDialog();
  new MutationObserver((_mutations, observer) => {
    if (location.pathname.startsWith('/release/')) {
      if (document.querySelector('button.submit')) {
        createReleaseEditorUI();
        observer.disconnect();
      }
    } else {
      const workForm = document.querySelector<HTMLFormElement>('form.edit-work');
      if (workForm) {
        createWorkEditorUI(workForm);
        observer.disconnect();
      }
    }
  }).observe(document.body, {childList: true, subtree: true});
}
