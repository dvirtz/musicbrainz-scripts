import {registerSettingsDialog as registerSettings} from '@repo/common-ui/settings';

export async function addCoverComment() {
  return await GM.getValue('addCoverComment', false);
}

export async function registerSettingsDialog() {
  await registerSettings([
    {
      name: 'addCoverComment',
      description: 'Add cover comment',
      defaultValue: false,
    },
  ]);
}
