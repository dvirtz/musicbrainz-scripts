import {Checkbox, registerSettingsDialog as registerSettings} from 'common-ui';
import {createSignal} from 'solid-js';

export async function addCoverComment() {
  return await GM.getValue('addCoverComment', false);
}

export async function registerSettingsDialog() {
  const [coverComment, setCoverComment] = createSignal(await addCoverComment());
  const saveOptions = () => {
    GM.setValue('addCoverComment', coverComment()).catch(console.error);
  };

  registerSettings(
    saveOptions,
    <Checkbox label="Add cover comment" checked={coverComment()} onChange={setCoverComment} />
  );
}
