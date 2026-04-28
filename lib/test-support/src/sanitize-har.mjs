#!/usr/bin/env node
// cspell:words mapbox
import {readdir, readFile, rm, writeFile} from 'node:fs/promises';
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

/**
 * For each HAR file, remove duplicate entries for the same URL+method where
 * earlier entries have no response body (no _file) and a later entry has content.
 * This handles the MusicBrainz __meb_verify double-load pattern recorded during
 * UPDATE_HAR runs, where Playwright would otherwise serve the empty first entry.
 */
const deduplicateHarEntries = async harFilePath => {
  const content = await readFile(harFilePath, 'utf8');
  const har = JSON.parse(content);
  const entries = har.log.entries;

  // Build a set of URL+method keys that have at least one content-bearing entry
  const keysWithContent = new Set();
  for (const entry of entries) {
    const key = `${entry.request.method} ${entry.request.url}`;
    if (entry.response.content._file) {
      keysWithContent.add(key);
    }
  }

  // Filter out empty entries for keys that also have a content-bearing entry
  const filtered = entries.filter(entry => {
    const key = `${entry.request.method} ${entry.request.url}`;
    if (keysWithContent.has(key) && !entry.response.content._file) {
      return false;
    }
    return true;
  });

  if (filtered.length === entries.length) {
    return false;
  }

  har.log.entries = filtered;
  await writeFile(harFilePath, JSON.stringify(har, null, 2), 'utf8');
  console.info(`Deduplicated ${entries.length - filtered.length} empty entry/entries in ${harFilePath}`);
  return true;
};

const deleteUnreferencedPayloads = async specDir => {
  const entries = await readdir(specDir, {withFileTypes: true});
  const harFiles = entries.filter(e => !e.isDirectory() && path.extname(e.name) === '.har');
  const payloadFiles = entries.filter(e => !e.isDirectory() && path.extname(e.name) !== '.har');

  if (payloadFiles.length === 0) return 0;

  const referencedFiles = new Set();
  for (const harEntry of harFiles) {
    const content = await readFile(path.join(specDir, harEntry.name), 'utf8');
    for (const match of content.matchAll(/"_file"\s*:\s*"([^"]+)"/g)) {
      referencedFiles.add(match[1]);
    }
  }

  let deletedCount = 0;
  for (const payloadEntry of payloadFiles) {
    if (!referencedFiles.has(payloadEntry.name)) {
      await rm(path.join(specDir, payloadEntry.name), {force: true});
      console.info(`Deleted unreferenced payload: ${path.join(specDir, payloadEntry.name)}`);
      deletedCount += 1;
    }
  }
  return deletedCount;
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

  // Deduplicate HAR entries (remove empty-body entries shadowed by real ones)
  let deduplicatedCount = 0;
  for (const filePath of harFixtureFiles.filter(f => path.extname(f) === '.har')) {
    if (await deduplicateHarEntries(filePath)) {
      deduplicatedCount += 1;
    }
  }

  if (deduplicatedCount > 0) {
    console.info(`HAR sanitizer deduplicated entries in ${deduplicatedCount} file(s).`);
  }

  // Collect unique HAR spec directories and delete unreferenced payload files
  const specDirs = new Set(
    harFixtureFiles.filter(filePath => path.extname(filePath) === '.har').map(filePath => path.dirname(filePath))
  );

  let deletedCount = 0;
  for (const specDir of specDirs) {
    deletedCount += await deleteUnreferencedPayloads(specDir);
  }

  if (deletedCount > 0) {
    console.info(`HAR sanitizer deleted ${deletedCount} unreferenced payload file(s).`);
  }
};

main().catch(error => {
  console.error('HAR sanitizer failed:', error);
  process.exitCode = 1;
});
