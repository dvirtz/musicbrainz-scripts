import {createUI} from './ui';
import {createWorks} from './create-works';
import {importWorkInfo} from './add-work-info';
import {validateInput} from './validate';

main();

function main() {
  createUI(createWorks, importWorkInfo, validateInput);

  new MutationObserver((mutations, observer) => {
    const recordingCheckboxes = document.querySelectorAll(
      'input[type=checkbox].recording, input[type=checkbox].medium-recordings, input[type=checkbox].all-recordings'
    ) as NodeListOf<HTMLInputElement>;
    if (recordingCheckboxes.length > 0) {
      recordingCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', validateInput);
      });
      observer.disconnect();
    }
  }).observe(document.body, {childList: true, subtree: true});
}
