import { expect, test } from '@playwright/test';
import { fileURLToPath } from 'url';

// Basic existence test, extend as needed

test('userscript bundle exists', async () => {
  const path = fileURLToPath(import.meta.resolve('@dvirtz/__ID__'));
  expect(path.endsWith('__ID__/package.json')).toBeTruthy();
});
