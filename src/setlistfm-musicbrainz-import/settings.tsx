import {createSignal} from 'solid-js';
import {Checkbox, registerSettingsDialog as registerSettings} from 'src/common/lib/settings';

export function addCoverComment() {
  return GM_getValue('addCoverComment', false);
}

export function registerSettingsDialog() {
  const [coverComment, setCoverComment] = createSignal(addCoverComment());
  const saveOptions = () => {
    GM_setValues({
      addCoverComment: coverComment(),
    });
  };

  registerSettings(
    saveOptions,
    <Checkbox label="Add cover comment" checked={addCoverComment()} onChange={setCoverComment} />
  );
}
