export type SettingKey = 'change-matching-artists' | 'change-partially-matching';

// Session-only values, deliberately kept in memory so they are dropped on page reload.
const overrides = new Map<SettingKey, boolean>();

export async function getSetting(key: SettingKey): Promise<boolean> {
  return overrides.get(key) ?? (await GM.getValue(key, false));
}

export async function setSetting(key: SettingKey, value: boolean, persist: boolean): Promise<void> {
  if (persist) {
    overrides.delete(key);
    await GM.setValue(key, value);
  } else {
    overrides.set(key, value);
  }
}
