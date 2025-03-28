import {Checkbox, registerSettingsDialog as registerSettings} from 'common-ui';
import {createSignal} from 'solid-js';

export async function shouldSearchWorks() {
  return await GM.getValue('searchWorks', true);
}

export async function shouldSetLanguage() {
  return await GM.getValue('setLanguage', true);
}

export async function registerSettingsDialog() {
  const [searchWorks, setSearchWorks] = createSignal(await shouldSearchWorks());
  const [setLanguage, setSetLanguage] = createSignal(await shouldSetLanguage());
  const saveOptions = () => {
    Promise.all([GM.setValue('searchWorks', searchWorks()), GM.setValue('setLanguage', setLanguage())]).catch(
      console.error
    );
  };

  registerSettings(
    saveOptions,
    <div>
      <div>
        <Checkbox label="Search for existing works" checked={searchWorks()} onChange={setSearchWorks} />
      </div>
      <div>
        <Checkbox label="Set language" checked={setLanguage()} onChange={setSetLanguage} />
      </div>
    </div>
  );
}
