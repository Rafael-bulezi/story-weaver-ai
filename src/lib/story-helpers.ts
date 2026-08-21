import type { Book, Core, LoreItem, LoreType, BrainstormMessage } from './story-types';

export function loreToPrompt(items: LoreItem[]): string {
  if (!items.length) return '(no lore yet)';
  const grouped: Record<LoreType, LoreItem[]> = { character: [], place: [], concept: [], faction: [] };
  items.forEach((i) => grouped[i.type].push(i));
  const section = (label: string, arr: LoreItem[]) =>
    arr.length
      ? label + ':\n' + arr.map((i) => '- ' + i.name + (i.role ? ' (' + i.role + ')' : '') + ': ' + i.description).join('\n')
      : '';
  return [
    section('Characters', grouped.character),
    section('Places', grouped.place),
    section('Factions', grouped.faction),
    section('Concepts', grouped.concept),
  ]
    .filter(Boolean)
    .join('\n\n');
}

export function coresToPrompt(cores: Core[]): string {
  if (!cores?.length) return '';
  return cores
    .map(
      (c, i) =>
        '## Core ' + (i + 1) + ': ' + c.title + '\n' + c.blocks
          .map((b, j) => (i + 1) + '.' + (j + 1) + ' ' + b.title + ': ' + b.body)
          .join('\n'),
    )
    .join('\n\n');
}

export function buildOverview(book: Book): string {
  if (book.overview && book.overview.trim()) return book.overview.trim();
  if (!book.cores.length) return book.name + ': no cores yet.';
  const bits = book.cores.map((c, i) => {
    const first = c.blocks[0];
    const detail = first ? ' — ' + first.title + ': ' + first.body : '';
    return 'Core ' + (i + 1) + ' (' + c.title + ')' + detail;
  });
  const joined = bits.join(' · ');
  return joined.length > 500 ? joined.slice(0, 497) + '…' : joined;
}

export function buildBookContext(
  book: Book,
  opts: { includeChapter?: boolean; brainstormTail?: number; brainstormMessages?: BrainstormMessage[] } = {},
): string {
  const parts: string[] = [];
  parts.push('BOOK: ' + book.name + '\nCHAPTER: ' + book.title);
  if (book.cores.length) parts.push('WORLD CORES (canonical facts):\n' + coresToPrompt(book.cores));
  if (book.lore.length) parts.push('LORE:\n' + loreToPrompt(book.lore));
  if (opts.includeChapter && book.content.trim()) {
    parts.push('CURRENT CHAPTER TEXT:\n' + book.content);
  }
  const tail = opts.brainstormTail ?? 0;
  const messages = opts.brainstormMessages ?? book.brainstorm;
  if (tail > 0 && messages.length) {
    const recent = messages.slice(-tail);
    parts.push(
      'RECENT BRAINSTORM (chronological):\n' + recent.map((m) => m.role.toUpperCase() + (m.mode ? '(' + m.mode + ')' : '') + ': ' + m.content).join('\n'),
    );
  }
  return parts.join('\n\n---\n\n');
}

export function buildSelectiveContext(
  book: Book,
  opts: {
    overview?: boolean;
    coreIds?: string[];
    loreIds?: string[];
    includeChapter?: boolean;
    brainstormTail?: number;
    brainstormMessages?: BrainstormMessage[];
  },
): string {
  const parts: string[] = ['BOOK: ' + book.name + '\nCHAPTER: ' + book.title];
  if (opts.overview !== false) parts.push('OVERVIEW:\n' + buildOverview(book));
  const cores = book.cores.filter((c) => opts.coreIds?.includes(c.id));
  if (cores.length) parts.push('SELECTED CORES:\n' + coresToPrompt(cores));
  const lore = book.lore.filter((l) => opts.loreIds?.includes(l.id));
  if (lore.length) parts.push('SELECTED LORE:\n' + loreToPrompt(lore));
  if (opts.includeChapter && book.content.trim()) {
    parts.push('CURRENT CHAPTER TEXT:\n' + book.content);
  }
  const tail = opts.brainstormTail ?? 0;
  const messages = opts.brainstormMessages ?? book.brainstorm;
  if (tail > 0 && messages.length) {
    const recent = messages.slice(-tail);
    parts.push(
      'RECENT BRAINSTORM:\n' + recent.map((m) => m.role.toUpperCase() + (m.mode ? '(' + m.mode + ')' : '') + ': ' + m.content).join('\n'),
    );
  }
  return parts.join('\n\n---\n\n');
}

export function loreStringSimilarity(a: LoreItem, b: LoreItem): number {
  const tokenize = (s: string) =>
    new Set(s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean));
  const setA = tokenize(a.name + ' ' + a.description);
  const setB = tokenize(b.name + ' ' + b.description);
  if (!setA.size && !setB.size) return 1;
  let intersection = 0;
  setA.forEach((w) => { if (setB.has(w)) intersection++; });
  return intersection / (setA.size + setB.size - intersection);
}

export function findSimilarLore(
  candidate: LoreItem,
  existing: LoreItem[],
  threshold = 0.75,
): { item: LoreItem; similarity: number } | null {
  let best: { item: LoreItem; similarity: number } | null = null;
  for (const item of existing) {
    if (item.type !== candidate.type) continue;
    const sim = loreStringSimilarity(candidate, item);
    if (sim >= threshold && (!best || sim > best.similarity)) {
      best = { item, similarity: sim };
    }
  }
  return best;
}
