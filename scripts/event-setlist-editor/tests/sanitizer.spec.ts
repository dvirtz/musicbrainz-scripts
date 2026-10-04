import {expect} from '@playwright/test';
import {sanitizeHarArtifacts} from '@repo/test-support/har-sanitizer';
import {test} from '@repo/test-support/userscript-test';
import {mkdir, readFile, writeFile, access} from 'node:fs/promises';
import path from 'node:path';

test('removes login credentials and session cookies from recorded fixtures', async ({baseURL}, testInfo) => {
  const directory = testInfo.outputPath('sanitizer');
  await mkdir(directory, {recursive: true});
  const harPath = path.join(directory, 'sample.har');
  const loginPayload = path.join(directory, 'login.html');
  await writeFile(loginPayload, 'unneeded login response');
  await writeFile(
    harPath,
    JSON.stringify({
      log: {
        entries: [
          {
            request: {
              method: 'POST',
              url: `${baseURL}/login`,
              postData: {text: 'password=private-password'},
            },
            response: {content: {_file: 'login.html'}},
          },
          {
            request: {
              method: 'GET',
              url: `${baseURL}/event/create`,
              headers: [
                {name: 'Cookie', value: 'private-session'},
                {name: 'Authorization', value: 'private-token'},
                {name: 'Accept', value: 'text/html'},
              ],
              cookies: [{value: 'private-cookie'}],
            },
            response: {
              headers: [{name: 'Set-Cookie', value: 'private-response-cookie'}],
              cookies: [{value: 'private-cookie'}],
              content: {},
            },
          },
        ],
      },
    })
  );
  await sanitizeHarArtifacts(harPath);
  const sanitized = await readFile(harPath, 'utf8');
  expect(sanitized).not.toContain('private-');
  expect(sanitized).not.toContain('/login');
  expect(sanitized).toContain('/event/create');
  expect(sanitized).toContain('text/html');
  await expect(access(loginPayload)).rejects.toThrow();
});
