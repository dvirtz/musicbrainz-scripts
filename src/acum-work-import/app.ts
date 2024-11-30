import {createUI} from './ui/ui';

main();

function main() {
  VM.observe(document.body, () => {
    const recordingCheckboxes = document.querySelectorAll<HTMLInputElement>(
      'input[type=checkbox].recording, input[type=checkbox].medium-recordings, input[type=checkbox].all-recordings'
    );
    if (recordingCheckboxes.length > 0) {
      createUI(recordingCheckboxes);
      return true;
    }
  });
}
