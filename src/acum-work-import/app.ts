import {createUI} from './ui';

main();

function main() {
  VM.observe(document.body, () => {
    const recordingCheckboxes = document.querySelectorAll(
      'input[type=checkbox].recording, input[type=checkbox].medium-recordings, input[type=checkbox].all-recordings'
    ) as NodeListOf<HTMLInputElement>;
    if (recordingCheckboxes.length > 0) {
      createUI(recordingCheckboxes);
      return true;
    }
  });
}
