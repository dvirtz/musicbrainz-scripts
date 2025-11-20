#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';

const scriptDir = path.dirname(process.argv[1] || __filename);
// Root should be the scripts directory so new packages live under scripts/
const root = scriptDir;
const templateDir = path.join(root, '_template');

interface ScriptContext {
  id: string;
  display: string;
  desc: string;
  version: string;
  icon: string;
  runAt: string;
  matches: string[];
  includeUi: boolean;
}

interface ParsedArgs {
  id?: string;
  display?: string;
  desc?: string;
  version?: string;
  icon?: string;
  runAt?: string;
  match?: string;
  ui?: string;
}

function parseArgs(): ParsedArgs {
  const args = process.argv.slice(2);
  const map: ParsedArgs = {};
  for (const a of args) {
    const [k, v] = a.split('=');
    if (k?.startsWith('--')) {
      const key = k.slice(2) as keyof ParsedArgs;
      map[key] = v === undefined ? 'true' : v;
    }
  }
  return map;
}

async function promptInputs(nonInteractive: ScriptContext | null): Promise<ScriptContext> {
  if (nonInteractive) return nonInteractive;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q: string): Promise<string> => new Promise(r => rl.question(q, ans => r(ans.trim())));
  const id = (await ask('Script id (kebab-case): ')) || 'new-script';
  const display = (await ask('Display name: ')) || id;
  const desc = (await ask('Description: ')) || 'TODO: description';
  const version = (await ask('Initial version (default 1.0.0): ')) || '1.0.0';
  const icon = await ask('Icon URL (optional, blank to skip): ');
  const runAt = (await ask('Run-at (default document-end): ')) || 'document-end';
  console.log('Enter match patterns (empty line to finish):');
  const matches: string[] = [];
  while (true) {
    const m = await ask('> ');
    if (!m) break;
    matches.push(m);
  }
  const includeUi = (await ask('Include UI (Solid + Kobalte)? (y/N): ')).toLowerCase() === 'y';
  rl.close();
  return { id, display, desc, version, icon, runAt, matches, includeUi };
}

function ensureUnique(id: string): string {
  const dest = path.join(root, id);
  if (fs.existsSync(dest)) {
    console.error(`Directory scripts/${id} already exists.`);
    process.exit(1);
  }
  return dest;
}

function tokenReplace(content: string, ctx: ScriptContext): string {
  return content
    .replace(/__ID__/g, ctx.id)
    .replace(/__DISPLAY_NAME__/g, ctx.display)
    .replace(/__DESCRIPTION__/g, ctx.desc)
    .replace(/__VERSION__/g, ctx.version)
    .replace(/__RUN_AT__/g, ctx.runAt)
    .replace(/__MATCH_LIST__/g, ctx.matches.join('\n'))
    .replace(/__MATCH_ARRAY__/g, ctx.matches.map(m => `    '${m}',`).join('\n'))
    .replace(/__ICON_LINE__/g, ctx.icon ? `icon: '${ctx.icon}',` : '');
}

function copyTemplate(dest: string, ctx: ScriptContext): void {
  fs.mkdirSync(dest);
  const entries = fs.readdirSync(templateDir, { withFileTypes: true });
  for (const e of entries) {
    const srcPath = path.join(templateDir, e.name);
    const destPath = path.join(dest, e.name);
    if (e.isDirectory()) {
      copyDir(srcPath, destPath, ctx);
    } else {
      const raw = fs.readFileSync(srcPath, 'utf8');
      fs.writeFileSync(destPath, tokenReplace(raw, ctx));
    }
  }
}

function copyDir(src: string, dest: string, ctx: ScriptContext): void {
  fs.mkdirSync(dest);
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, e.name);
    const destPath = path.join(dest, e.name);
    if (e.isDirectory()) copyDir(srcPath, destPath, ctx);
    else {
      const raw = fs.readFileSync(srcPath, 'utf8');
      fs.writeFileSync(destPath, tokenReplace(raw, ctx));
    }
  }
}

function postMessage(ctx: ScriptContext): void {
  console.log(`\nCreated scripts/${ctx.id}\nNext steps:\n`);
  console.log('1. Install (if needed) then build:');
  console.log(`   yarn workspace @dvirtz/${ctx.id} build`);
  console.log('2. Dev mode:');
  console.log(`   yarn workspace @dvirtz/${ctx.id} dev`);
  console.log('3. Run tests:');
  console.log(`   yarn workspace @dvirtz/${ctx.id} test`);
}

async function main(): Promise<void> {
  const args = parseArgs();
  const nonInteractive: ScriptContext | null = args.id
    ? {
        id: args.id,
        display: args.display || args.id,
        desc: args.desc || 'TODO: description',
        version: args.version || '1.0.0',
        icon: args.icon || '',
        runAt: args.runAt || 'document-end',
        matches: args.match
          ? args.match
              .split(',')
              .map(s => s.trim())
              .filter(Boolean)
          : [],
        includeUi: args.ui === 'true' || args.ui === '1' || false,
      }
    : null;
  const ctx = await promptInputs(nonInteractive);
  if (!ctx.matches.length) ctx.matches = ['http*://*.musicbrainz.org/*'];
  const dest = ensureUnique(ctx.id);
  copyTemplate(dest, ctx);
  if (ctx.includeUi) {
    const pkgPath = path.join(dest, 'package.json');
    const pkgRaw = fs.readFileSync(pkgPath, 'utf8');
    const pkg = JSON.parse(pkgRaw) as any;
    pkg.dependencies = {
      ...pkg.dependencies,
      '@repo/common-ui': 'workspace:*',
      '@kobalte/core': '*',
      'solid-js': '*',
    };
    pkg.devDependencies = {
      ...pkg.devDependencies,
      'vite-plugin-solid': '*',
    };
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  }
  postMessage(ctx);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
