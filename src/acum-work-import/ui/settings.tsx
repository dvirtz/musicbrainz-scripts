import {createSignal} from 'solid-js';
import {Checkbox, registerSettingsDialog as registerSettings} from 'src/common/lib/settings';

export function shouldSearchWorks() {
  return GM_getValue('searchWorks', true);
}

export function shouldSetLanguage() {
  return GM_getValue('setLanguage', true);
}

export function registerSettingsDialog() {
  const [searchWorks, setSearchWorks] = createSignal(shouldSearchWorks());
  const [setLanguage, setSetLanguage] = createSignal(shouldSetLanguage());
  const saveOptions = () => {
    GM_setValues({
      searchWorks: searchWorks(),
      setLanguage: setLanguage(),
    });
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
