#!/usr/bin/env node
// cspell:words mapbox
import {readdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {fileURLToPath} from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '../../..');
const harRoot = path.join(repoRoot, 'scripts');

const TEXT_EXTENSIONS = new Set(['.har', '.html', '.js', '.json', '.txt', '.dat', '.css', '.svg', '.xml']);

const TOKEN_PATTERNS = [
  {
    name: 'MAPBOX_ACCESS_TOKEN',
    regex: /("MAPBOX_ACCESS_TOKEN"\s*:\s*")([^"]+)(")/g,
    replacement: '$1[redacted]$3',
  },
  {
    name: 'Mapbox public token',
    regex: /\bpk\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
    replacement: 'pk.redacted.redacted.redacted',
  },
  {
    name: 'Mapbox secret token',
    regex: /\bsk\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
    replacement: 'sk.redacted.redacted.redacted',
  },
];

const collectFiles = async dir => {
  const entries = await readdir(dir, {withFileTypes: true});
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(fullPath)));
      continue;
    }

    if (TEXT_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      files.push(fullPath);
    }
  }

  return files;
};

const sanitizeFile = async filePath => {
  const original = await readFile(filePath, 'utf8');
  let sanitized = original;

  for (const pattern of TOKEN_PATTERNS) {
    sanitized = sanitized.replace(pattern.regex, pattern.replacement);
  }

  if (sanitized !== original) {
    await writeFile(filePath, sanitized, 'utf8');
    return true;
  }

  return false;
};

const main = async () => {
  const allFiles = await collectFiles(harRoot);
  const harFixtureFiles = allFiles.filter(filePath =>
    filePath.includes(`${path.sep}tests${path.sep}fixtures${path.sep}har${path.sep}`)
  );

  let updatedCount = 0;

  for (const filePath of harFixtureFiles) {
    if (await sanitizeFile(filePath)) {
      updatedCount += 1;
    }
  }

  console.info(`HAR sanitizer updated ${updatedCount} file(s).`);
};

main().catch(error => {
  console.error('HAR sanitizer failed:', error);
  process.exitCode = 1;
});
