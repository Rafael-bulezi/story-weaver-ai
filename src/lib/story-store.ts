import { useEffect, useState, useCallback } from "react";

export type LoreType = "character" | "place" | "concept";
export type ChapterType = "canon" | "draft";

export interface LoreItem {
  id: string;
  type: LoreType;
  name: string;
  role?: string;
  description: string;
}

export interface Chapter {
  id: string;
  title: string;
  content: string;
  type: ChapterType;
  savedAt: number;
}

export interface CoreBlock {
  id: string;
  title: string;
  body: string;
}

export interface Core {
  id: string;
  title: string;
  emoji?: string;
  blocks: CoreBlock[];
}

export interface Book {
  id: string;
  title: string;
  subtitle?: string;
  cover?: string;
  content: string;
  updatedAt: number;
  lore: LoreItem[];
  chapters: Chapter[];
  cores: Core[];
}

const BOOKS_KEY = "sc:books:v3";
const ACTIVE_KEY = "sc:active-book";

const DEFAULT_LORE: LoreItem[] = [
  { id: "l1", type: "character", name: "Zeal", role: "Protagonist", description: "A Dawnborn who manipulates cyan light. Searching for the truth behind the Fracture." },
  { id: "l2", type: "character", name: "Nyra", role: "Rogue Seer", description: "Sees fragments of futures the Spire tries to erase." },
  { id: "l3", type: "place", name: "The Spire", role: "Location", description: "A governing spine cutting through Astrisol's upper haze." },
  { id: "l4", type: "concept", name: "Aetherlight", role: "Power / Energy", description: "The engineered luminance that structures every path in Astrisol." },
];

const DEFAULT_BOOKS: Book[] = [
  {
    id: "b1",
    title: "Astrisol",
    subtitle: "Chapter 1 — The Dawnborn",
    cover: "✦",
    content:
      "Morning had no meaning in Astrisol.\n\nThe city moved before its people did. Ribbons of engineered light — thin, silent pathways — crossed above the structures like frozen currents in the sky.\n\nZeal stood at the edge of a descending light-ribbon, watching it fold into the distance like a thought that refused to finish forming.",
    updatedAt: Date.now(),
    lore: DEFAULT_LORE,
    chapters: [],
    cores: [
      {
        id: "core1",
        title: "State of the World",
        emoji: "◈",
        blocks: [
          { id: "cb1", title: "Era", body: "Post-Fracture Astrisol, three generations after the sky split." },
          { id: "cb2", title: "Technology", body: "Aetherlight infrastructure — engineered luminance replaces roads, doors, contracts." },
        ],
      },
    ],
  },
];

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
function write<T>(key: string, val: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(val));
}

// migrate old chapters without a type
function migrate(books: Book[]): Book[] {
  return books.map((b) => ({
    ...b,
    cores: b.cores ?? [],
    chapters: (b.chapters ?? []).map((c) => ({ ...c, type: c.type ?? "draft" })),
  }));
}

export function useBooks() {
  const [books, setBooks] = useState<Book[]>(DEFAULT_BOOKS);
  const [activeId, setActiveIdState] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setBooks(migrate(read(BOOKS_KEY, DEFAULT_BOOKS)));
    setActiveIdState(read<string | null>(ACTIVE_KEY, null));
    setHydrated(true);
  }, []);

  const persist = useCallback((next: Book[]) => {
    setBooks(next);
    write(BOOKS_KEY, next);
  }, []);

  const setActiveId = useCallback((id: string | null) => {
    setActiveIdState(id);
    write(ACTIVE_KEY, id);
  }, []);

  const active = books.find((b) => b.id === activeId) ?? null;

  const updateBook = useCallback(
    (id: string, patch: Partial<Book> | ((b: Book) => Partial<Book>)) => {
      setBooks((prev) => {
        const next = prev.map((b) => {
          if (b.id !== id) return b;
          const p = typeof patch === "function" ? patch(b) : patch;
          return { ...b, ...p, updatedAt: Date.now() };
        });
        write(BOOKS_KEY, next);
        return next;
      });
    },
    [],
  );

  const createBook = useCallback(
    (input?: Partial<Book>) => {
      const id = `b${Date.now()}`;
      const book: Book = {
        id,
        title: input?.title ?? "Untitled Book",
        subtitle: input?.subtitle ?? "New project",
        cover: input?.cover ?? "◇",
        content: input?.content ?? "",
        updatedAt: Date.now(),
        lore: input?.lore ?? [],
        chapters: [],
        cores: [],
      };
      const next = [book, ...books];
      persist(next);
      return id;
    },
    [books, persist],
  );

  const deleteBook = useCallback(
    (id: string) => {
      const next = books.filter((b) => b.id !== id);
      persist(next);
      if (activeId === id) setActiveId(null);
    },
    [books, persist, activeId, setActiveId],
  );

  // ---------- lore ops ----------
  const addLore = (item: Omit<LoreItem, "id">) => {
    if (!active) return;
    updateBook(active.id, (b) => ({
      lore: [...b.lore, { ...item, id: `l${Date.now()}${Math.random().toString(36).slice(2, 5)}` }],
    }));
  };
  const updateLore = (loreId: string, patch: Partial<LoreItem>) => {
    if (!active) return;
    updateBook(active.id, (b) => ({
      lore: b.lore.map((i) => (i.id === loreId ? { ...i, ...patch } : i)),
    }));
  };
  const removeLore = (loreId: string) => {
    if (!active) return;
    updateBook(active.id, (b) => ({ lore: b.lore.filter((i) => i.id !== loreId) }));
  };

  /**
   * Parse AI extraction output and auto-route items into character/place/concept.
   * Accepts lines like:
   *   - CHARACTER — Name — description
   *   - PLACE: Name - description
   *   * concept | Name | description
   * Returns the count added.
   */
  const importExtractedLore = (text: string): number => {
    if (!active) return 0;
    const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
    const added: LoreItem[] = [];
    for (const raw of lines) {
      // strip leading bullets/numbers
      const line = raw.replace(/^[-*•\d.)\s]+/, "");
      // split on em-dash, en-dash, colon, or pipe
      const parts = line.split(/\s*[—–\-:|]\s*/);
      if (parts.length < 2) continue;
      const rawType = parts[0].toLowerCase();
      let type: LoreType | null = null;
      if (/char|person|protagonist|npc/.test(rawType)) type = "character";
      else if (/place|location|city|region|land|realm/.test(rawType)) type = "place";
      else if (/concept|idea|power|force|magic|tech|term|faction|group/.test(rawType)) type = "concept";
      if (!type) continue;
      const name = (parts[1] ?? "").trim();
      if (!name) continue;
      const desc = parts.slice(2).join(" — ").trim();
      added.push({
        id: `l${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
        type,
        name,
        description: desc,
      });
    }
    if (added.length === 0) return 0;
    updateBook(active.id, (b) => ({ lore: [...b.lore, ...added] }));
    return added.length;
  };

  // ---------- chapter ops ----------
  const saveChapter = (type: ChapterType = "draft") => {
    if (!active) return;
    const chapter: Chapter = {
      id: `c${Date.now()}`,
      title: active.title,
      content: active.content,
      type,
      savedAt: Date.now(),
    };
    updateBook(active.id, (b) => ({ chapters: [chapter, ...b.chapters] }));
  };

  // ---------- core ops ----------
  const addCore = (input: { title: string; emoji?: string }) => {
    if (!active) return;
    const core: Core = { id: `core${Date.now()}`, title: input.title, emoji: input.emoji ?? "◇", blocks: [] };
    updateBook(active.id, (b) => ({ cores: [...b.cores, core] }));
  };
  const updateCore = (coreId: string, patch: Partial<Core>) => {
    if (!active) return;
    updateBook(active.id, (b) => ({ cores: b.cores.map((c) => (c.id === coreId ? { ...c, ...patch } : c)) }));
  };
  const removeCore = (coreId: string) => {
    if (!active) return;
    updateBook(active.id, (b) => ({ cores: b.cores.filter((c) => c.id !== coreId) }));
  };
  const addCoreBlock = (coreId: string, block: Omit<CoreBlock, "id">) => {
    if (!active) return;
    const b2: CoreBlock = { ...block, id: `cb${Date.now()}` };
    updateBook(active.id, (b) => ({
      cores: b.cores.map((c) => (c.id === coreId ? { ...c, blocks: [...c.blocks, b2] } : c)),
    }));
  };
  const updateCoreBlock = (coreId: string, blockId: string, patch: Partial<CoreBlock>) => {
    if (!active) return;
    updateBook(active.id, (b) => ({
      cores: b.cores.map((c) =>
        c.id === coreId ? { ...c, blocks: c.blocks.map((bl) => (bl.id === blockId ? { ...bl, ...patch } : bl)) } : c,
      ),
    }));
  };
  const removeCoreBlock = (coreId: string, blockId: string) => {
    if (!active) return;
    updateBook(active.id, (b) => ({
      cores: b.cores.map((c) => (c.id === coreId ? { ...c, blocks: c.blocks.filter((bl) => bl.id !== blockId) } : c)),
    }));
  };

  return {
    books,
    active,
    activeId,
    setActiveId,
    hydrated,
    createBook,
    updateBook,
    deleteBook,
    addLore,
    updateLore,
    removeLore,
    importExtractedLore,
    saveChapter,
    addCore,
    updateCore,
    removeCore,
    addCoreBlock,
    updateCoreBlock,
    removeCoreBlock,
  };
}

export function loreToPrompt(items: LoreItem[]): string {
  if (!items.length) return "(no lore yet)";
  const grouped: Record<LoreType, LoreItem[]> = { character: [], place: [], concept: [] };
  items.forEach((i) => grouped[i.type].push(i));
  const section = (label: string, arr: LoreItem[]) =>
    arr.length
      ? `${label}:\n${arr.map((i) => `- ${i.name}${i.role ? ` (${i.role})` : ""}: ${i.description}`).join("\n")}`
      : "";
  return [
    section("Characters", grouped.character),
    section("Places", grouped.place),
    section("Concepts", grouped.concept),
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function coresToPrompt(cores: Core[]): string {
  if (!cores?.length) return "";
  return cores
    .map(
      (c) =>
        `## ${c.title}\n${c.blocks.map((b) => `- ${b.title}: ${b.body}`).join("\n")}`,
    )
    .join("\n\n");
}
