import {createReleaseEditorUI} from './ui/release-editor-ui';
import {registerSettingsDialog} from './ui/settings';
import {createWorkEditorUI} from './ui/work-editor-ui';

main();

function main() {
  registerSettingsDialog();
  VM.observe(document.body, () => {
    if (location.pathname.startsWith('/release/')) {
      if (document.querySelector('button.submit')) {
        createReleaseEditorUI();
        return true;
      }
    } else {
      const workForm = document.querySelector<HTMLFormElement>('form.edit-work');
      if (workForm) {
        createWorkEditorUI(workForm);
        return true;
      }
    }
  });
}
