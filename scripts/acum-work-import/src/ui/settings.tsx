import {registerSettingsDialog as registerSettings} from 'common-ui';

export async function shouldSearchWorks() {
  return await GM.getValue('searchWorks', true);
}

export async function shouldSetLanguage() {
  return await GM.getValue('setLanguage', true);
}

export async function registerSettingsDialog() {
  await registerSettings([
    {
      name: 'searchWorks',
      description: 'Search for existing works',
      defaultValue: true,
    },
    {
      name: 'setLanguage',
      description: 'Set work language',
      defaultValue: true,
    },
  ]);
}
