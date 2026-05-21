import {readFile, readdir, rm, writeFile} from 'fs/promises';
import path from 'path';

const TEXT_EXTENSIONS = new Set(['.har', '.html', '.js', '.json', '.txt', '.dat', '.css', '.svg', '.xml']);
const TOKEN_PATTERNS = [
  {
    regex: /("\w+_ACCESS_TOKEN"\s*:\s*")([^"]+)(")/g,
    replacement: '$1[redacted]$3',
  },
  {
    regex: /\bpk\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
    replacement: 'pk.redacted.redacted.redacted',
  },
  {
    regex: /\bsk\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
    replacement: 'sk.redacted.redacted.redacted',
  },
];

type HarEntry = {
  request: {
    method: string;
    url: string;
  };
  response: {
    content: {
      _file?: string;
    };
  };
};

type HarFile = {
  log: {
    entries: HarEntry[];
  };
};

const sanitizeFile = async (filePath: string) => {
  const original = await readFile(filePath, 'utf8');
  let sanitized = original;

  for (const pattern of TOKEN_PATTERNS) {
    sanitized = sanitized.replace(pattern.regex, pattern.replacement);
  }

  if (sanitized !== original) {
    await writeFile(filePath, sanitized, 'utf8');
  }
};

const sanitizeSpecFiles = async (specDir: string) => {
  const entries = await readdir(specDir, {withFileTypes: true});
  for (const entry of entries) {
    if (entry.isDirectory()) {
      continue;
    }

    if (TEXT_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      await sanitizeFile(path.join(specDir, entry.name));
    }
  }
};

const deduplicateHarEntries = async (harFilePath: string) => {
  const content = await readFile(harFilePath, 'utf8');
  const har = JSON.parse(content) as HarFile;
  const entries = har.log.entries;

  const keysWithContent = new Set();
  for (const entry of entries) {
    const key = `${entry.request.method} ${entry.request.url}`;
    if (entry.response.content._file) {
      keysWithContent.add(key);
    }
  }

  har.log.entries = entries.filter(entry => {
    const key = `${entry.request.method} ${entry.request.url}`;
    return !(keysWithContent.has(key) && !entry.response.content._file);
  });

  await writeFile(harFilePath, JSON.stringify(har, null, 2), 'utf8');
};

const deleteUnreferencedPayloads = async (specDir: string) => {
  const entries = await readdir(specDir, {withFileTypes: true});
  const harFiles = entries.filter(entry => !entry.isDirectory() && path.extname(entry.name) === '.har');
  const payloadFiles = entries.filter(entry => !entry.isDirectory() && path.extname(entry.name) !== '.har');

  const referencedFiles = new Set();
  for (const harEntry of harFiles) {
    const content = await readFile(path.join(specDir, harEntry.name), 'utf8');
    for (const match of content.matchAll(/"_file"\s*:\s*"([^"]+)"/g)) {
      referencedFiles.add(match[1]);
    }
  }

  for (const payloadEntry of payloadFiles) {
    if (!referencedFiles.has(payloadEntry.name)) {
      await rm(path.join(specDir, payloadEntry.name), {force: true});
    }
  }
};

export const sanitizeHarArtifacts = async (harFilePath: string) => {
  const specDir = path.dirname(harFilePath);
  await sanitizeSpecFiles(specDir);
  await deduplicateHarEntries(harFilePath);
  await deleteUnreferencedPayloads(specDir);
};
