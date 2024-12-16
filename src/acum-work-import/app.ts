import {createReleaseEditorUI, releaseEditorContainerId} from './ui/release-editor-ui';
import {createWorkEditorUI} from './ui/work-editor-ui';

main();

function main() {
  VM.observe(document.body, () => {
    if (location.pathname.startsWith('/release/')) {
      const recordingCheckboxes = document.querySelectorAll<HTMLInputElement>(
        'input[type=checkbox].recording, input[type=checkbox].medium-recordings, input[type=checkbox].all-recordings'
      );
      if (recordingCheckboxes.length > 0 && !document.getElementById(releaseEditorContainerId)) {
        createReleaseEditorUI(recordingCheckboxes);
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
