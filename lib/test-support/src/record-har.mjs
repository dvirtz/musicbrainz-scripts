#!/usr/bin/env node

import {spawn} from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import {fileURLToPath} from 'node:url';

const [, , ...args] = process.argv;

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const sanitizeScriptPath = path.join(scriptDir, 'sanitize-har.mjs');

const run = (command, commandArgs, env = process.env) =>
  new Promise(resolve => {
    const child = spawn(command, commandArgs, {
      stdio: 'inherit',
      shell: process.platform === 'win32',
      env,
    });

    child.on('close', code => resolve(code ?? 1));
    child.on('error', () => resolve(1));
  });

const main = async () => {
  const testExitCode = await run('yarn', ['test', ...args], {
    ...process.env,
    UPDATE_HAR: '1',
  });

  const sanitizeExitCode = await run('node', [sanitizeScriptPath]);

  if (testExitCode !== 0) {
    process.exitCode = testExitCode;
    return;
  }

  if (sanitizeExitCode !== 0) {
    process.exitCode = sanitizeExitCode;
  }
};

main().catch(() => {
  process.exitCode = 1;
});
