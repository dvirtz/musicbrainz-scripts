import {createSignal} from 'solid-js';
import {Checkbox, registerSettingsDialog as registerSettings} from 'src/common/lib/settings';

export function shouldSearchWorks() {
  return GM_getValue('searchWorks', true);
}

export function registerSettingsDialog() {
  const [searchWorks, setSearchWorks] = createSignal(shouldSearchWorks());
  const saveOptions = () => {
    GM_setValues({
      searchWorks: searchWorks(),
    });
  };

  registerSettings(
    saveOptions,
    <Checkbox label="Search for existing works" checked={searchWorks()} onChange={setSearchWorks} />
  );
}
