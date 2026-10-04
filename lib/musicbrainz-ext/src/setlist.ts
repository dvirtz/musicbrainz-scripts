// spell:words lsqb rsqb lbrack rbrack
import {MBID_REGEXP} from '#constants.ts';

export type SetlistEntity = {name: string; mbid?: string; entityName?: string};
export type SetlistPart = SetlistEntity & {joinPhrase: string};
export type SetlistCredit = SetlistPart;

type EntryBase = {id: string; source?: string; baseline?: string};
export type SetlistItem = EntryBase & {
  kind: 'item';
  works: SetlistPart[];
  credits: SetlistCredit[];
  notes: string;
};
export type SetlistEntry =
  | SetlistItem
  | (EntryBase & {kind: 'artist'; credits: SetlistCredit[]})
  | (EntryBase & {kind: 'info'; text: string})
  | (EntryBase & {kind: 'raw'; text: string});
export type Setlist = {entries: SetlistEntry[]; original: string; baseline: string};

const linkPattern = new RegExp(`\\[(${MBID_REGEXP.source})\\|([^\\[\\]\\r\\n]*)\\]`, 'gi');
const escapes: Record<string, string> = {
  amp: '&',
  AMP: '&',
  lsqb: '[',
  lbrack: '[',
  rsqb: ']',
  rbrack: ']',
  '#91': '[',
  '#x5b': '[',
  '#93': ']',
  '#x5d': ']',
  '#38': '&',
  '#x26': '&',
};

function decodeText(text: string): string {
  return text.replace(/&([^;]+);/g, (original: string, entity: string) => escapes[entity] ?? original);
}

function escapeText(text: string): string {
  return text
    .replace(new RegExp(`&(?!(?:${Object.keys(escapes).join('|')});)`, 'g'), '&amp;')
    .replace(/\[/g, '&lsqb;')
    .replace(/\]/g, '&rsqb;');
}

function entityText(entity: SetlistEntity): string {
  const name = escapeText(entity.name);
  return entity.mbid ? `[${entity.mbid}|${name}]` : name;
}

export function joinedEntityText(credits: readonly SetlistPart[]): string {
  return credits
    .filter(credit => credit.name.trim())
    .map(credit => entityText(credit) + escapeText(credit.joinPhrase))
    .join('');
}

function parseParts(text: string): SetlistPart[] | undefined {
  const matches = [...text.matchAll(linkPattern)];
  if (!matches.length) {
    return /[[\]]/.test(text) ? undefined : [{name: decodeText(text), joinPhrase: ''}];
  }
  // Mixed unlinked/linked credits cannot be split unambiguously; keep them raw.
  if (matches[0]!.index !== 0) return undefined;
  const credits: SetlistPart[] = [];
  for (let index = 0; index < matches.length; index++) {
    const match = matches[index]!;
    let join = text.slice(match.index + match[0].length, matches[index + 1]?.index ?? text.length);
    // Preserve misplaced entry markers as raw content instead of treating them as join phrases.
    if (/[[\]]/.test(join) || /\s[*#]/.test(join)) return undefined;
    if (index === matches.length - 1 && !join.trim()) join = '';
    credits.push({mbid: match[1]!.toLowerCase(), name: decodeText(match[2]!), joinPhrase: decodeText(join)});
  }
  return credits;
}

function markupState(value: unknown): string {
  // Lookup names are UI metadata; opening a credit dialog does not edit the markup.
  return JSON.stringify(value, (key, value: unknown) => (key === 'entityName' ? undefined : value));
}

function signature(entry: SetlistEntry): string {
  switch (entry.kind) {
    case 'item':
      return markupState(entry.works);
    case 'artist':
      return joinedEntityText(entry.credits);
    default:
      return entry.text;
  }
}

export function createSetlistItem(name = '', credits: readonly SetlistCredit[] = []): SetlistItem {
  return {
    id: crypto.randomUUID(),
    kind: 'item',
    works: [{name, joinPhrase: ''}],
    credits: credits.map(credit => ({...credit})),
    notes: '',
  };
}

export function parseSetlist(original: string): Setlist {
  const entries: SetlistEntry[] = [];
  let credits: SetlistCredit[] = [];
  let content: SetlistItem | (EntryBase & {kind: 'info'; text: string}) | undefined;
  for (const line of original ? original.split(/\r?\n/) : []) {
    const text = line.slice(2);
    let entry: SetlistEntry = {id: crypto.randomUUID(), kind: 'raw', text: line};
    if (line.startsWith('@ ')) {
      content = undefined;
      const parsed = parseParts(text);
      if (parsed) {
        credits = parsed;
        entry = {id: entry.id, kind: 'artist', credits: parsed.map(credit => ({...credit}))};
      } else {
        credits = [];
      }
    } else if (line.startsWith('* ')) {
      const works = parseParts(text);
      if (works) {
        entry = {...createSetlistItem('', credits), id: entry.id, works};
        content = entry;
      } else content = undefined;
    } else if (line.startsWith('# ') && !/[[\]]/.test(text)) {
      if (content?.kind === 'item') {
        content.notes += `${content.notes ? '\n' : ''}${decodeText(text)}`;
        continue;
      }
      if (content?.kind === 'info') {
        content.text += `\n${decodeText(text)}`;
        content.source += `\n${line}`;
        content.baseline = signature(content);
        continue;
      }
      entry = {id: entry.id, kind: 'info', text: decodeText(text)};
      content = entry;
    } else {
      content = undefined;
    }
    entry.source = line;
    entry.baseline = signature(entry);
    entries.push(entry);
  }
  return {entries, original, baseline: markupState(entries)};
}

export function serializeSetlist(setlist: Setlist): string {
  if (markupState(setlist.entries) === setlist.baseline) return setlist.original;
  const lines: string[] = [];
  let activeCredit = '';
  for (const [index, entry] of setlist.entries.entries()) {
    const unchanged = entry.source !== undefined && signature(entry) === entry.baseline;
    if (entry.kind === 'raw') {
      lines.push(entry.text);
      if (entry.text.startsWith('@ ')) activeCredit = '';
    } else if (entry.kind === 'info') {
      if (lines.length && lines[lines.length - 1]!.trim()) lines.push('');
      if (unchanged) lines.push(entry.source!);
      else lines.push(...entry.text.split(/\r?\n/).map(text => `# ${escapeText(text)}`));
    } else if (entry.kind === 'artist') {
      const next = setlist.entries
        .slice(index + 1)
        .find(next => next.kind === 'artist' || next.kind === 'item' || (next.kind === 'raw' && next.text.trim()));
      // Declarations are context for songs, so omit ones superseded before the next song.
      if (next?.kind === 'artist') continue;
      if (next?.kind === 'item') {
        const nextCredit = joinedEntityText(next.credits);
        if (nextCredit && nextCredit !== joinedEntityText(entry.credits)) continue;
      }
      activeCredit = joinedEntityText(entry.credits);
      lines.push(unchanged ? entry.source! : `@ ${activeCredit}`);
    } else {
      if (entry.works.some(work => work.name.trim())) {
        const credit = joinedEntityText(entry.credits);
        if (credit && credit !== activeCredit) {
          lines.push(`@ ${credit}`);
          activeCredit = credit;
        }
        lines.push(unchanged ? entry.source! : `* ${joinedEntityText(entry.works)}`);
      }
      lines.push(
        ...entry.notes
          .split(/\r?\n/)
          .filter(note => note.trim())
          .map(note => `# ${escapeText(note)}`)
      );
    }
  }
  return lines.join('\n');
}
