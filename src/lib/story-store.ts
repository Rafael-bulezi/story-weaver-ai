import { useEffect, useState, useCallback } from "react";

export type LoreType = "character" | "place" | "concept";
export type ChapterType = "canon" | "draft";
export type BrainstormRole = "user" | "assistant";
export type BrainstormMode = "chat" | "critic" | "debater";

export interface LoreItem {
  id: string;
  type: LoreType;
  name: string;
  role?: string;
  description: string;
  imageUrl?: string;
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

export interface CoreAttachment {
  id: string;
  name: string;
  mime: string;
  dataUrl: string;
  createdAt: number;
}

export interface Core {
  id: string;
  title: string;
  emoji?: string;
  blocks: CoreBlock[];
  attachments?: CoreAttachment[];
}

export interface BrainstormMessage {
  id: string;
  role: BrainstormRole;
  mode?: BrainstormMode;
  content: string;
  createdAt: number;
}

export interface Book {
  id: string;
  /** Book name (edited in sidebar) */
  name: string;
  /** Current in-progress chapter title (edited in Chat header) */
  title: string;
  subtitle?: string;
  cover?: string;
  content: string;
  updatedAt: number;
  lore: LoreItem[];
  chapters: Chapter[];
  cores: Core[];
  brainstorm: BrainstormMessage[];
}

const BOOKS_KEY = "sc:books:v4";
const ACTIVE_KEY = "sc:active-book";

const DEFAULT_LORE: LoreItem[] = [
  {
    id: "l1",
    type: "character",
    name: "Zeal",
    role: "Protagonist",
    description:
      "A Dawnborn who manipulates cyan light. Searching for the truth behind the Fracture.",
  },
  {
    id: "l2",
    type: "character",
    name: "Nyra",
    role: "Rogue Seer",
    description: "Sees fragments of futures the Spire tries to erase.",
  },
  {
    id: "l3",
    type: "place",
    name: "The Spire",
    role: "Location",
    description: "A governing spine cutting through Astrisol's upper haze.",
  },
  {
    id: "l4",
    type: "concept",
    name: "Aetherlight",
    role: "Power / Energy",
    description: "The engineered luminance that structures every path in Astrisol.",
  },
];

const DEFAULT_BOOKS: Book[] = [
  {
    id: "b1",
    name: "Astrisol",
    title: "Chapter 1 — The Dawnborn",
    subtitle: "A city that moves before its people do",
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
          {
            id: "cb1",
            title: "Era",
            body: "Post-Fracture Astrisol, three generations after the sky split.",
          },
          {
            id: "cb2",
            title: "Technology",
            body: "Aetherlight infrastructure — engineered luminance replaces roads, doors, contracts.",
          },
        ],
      },
    ],
    brainstorm: [],
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

// migrate older versions
function migrate(books: Book[]): Book[] {
  return books.map((b) => {
    const anyB = b as Book & { title?: string; name?: string };
    const name = anyB.name ?? anyB.title ?? "Untitled Book";
    const title = anyB.title && anyB.name ? anyB.title : (anyB.subtitle ?? "Chapter 1");
    return {
      ...b,
      name,
      title,
      cores: b.cores ?? [],
      brainstorm: b.brainstorm ?? [],
      chapters: (b.chapters ?? []).map((c) => ({ ...c, type: c.type ?? "draft" })),
    };
  });
}

function migrateFromOldKeys(): Book[] | null {
  if (typeof window === "undefined") return null;
  for (const k of ["sc:books:v3", "sc:books:v2"]) {
    const raw = window.localStorage.getItem(k);
    if (raw) {
      try {
        return migrate(JSON.parse(raw) as Book[]);
      } catch {
        /* ignore */
      }
    }
  }
  return null;
}

export function useBooks() {
  const [books, setBooks] = useState<Book[]>(DEFAULT_BOOKS);
  const [activeId, setActiveIdState] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = read<Book[] | null>(BOOKS_KEY, null);
    if (stored) {
      setBooks(migrate(stored));
    } else {
      const migrated = migrateFromOldKeys();
      if (migrated) {
        setBooks(migrated);
        write(BOOKS_KEY, migrated);
      } else {
        setBooks(DEFAULT_BOOKS);
      }
    }
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
        name: input?.name ?? "Untitled Book",
        title: input?.title ?? "Chapter 1",
        subtitle: input?.subtitle,
        cover: input?.cover ?? "◇",
        content: input?.content ?? "",
        updatedAt: Date.now(),
        lore: input?.lore ?? [],
        chapters: [],
        cores: [],
        brainstorm: [],
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

  // ---------- lore ----------
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

  const importExtractedLore = (text: string): number => {
    if (!active) return 0;
    const lines = text
      .split(/\n+/)
      .map((l) => l.trim())
      .filter(Boolean);
    const added: LoreItem[] = [];
    for (const raw of lines) {
      const line = raw.replace(/^[-*•\d.)\s]+/, "");
      const parts = line.split(/\s*[—–\-:|]\s*/);
      if (parts.length < 2) continue;
      const rawType = parts[0].toLowerCase();
      let type: LoreType | null = null;
      if (/char|person|protagonist|npc/.test(rawType)) type = "character";
      else if (/place|location|city|region|land|realm/.test(rawType)) type = "place";
      else if (/concept|idea|power|force|magic|tech|term|faction|group/.test(rawType))
        type = "concept";
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

  // ---------- chapters ----------
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
  const setChapterType = (chapterId: string, type: ChapterType) => {
    if (!active) return;
    updateBook(active.id, (b) => ({
      chapters: b.chapters.map((c) => (c.id === chapterId ? { ...c, type } : c)),
    }));
  };
  const deleteChapter = (chapterId: string) => {
    if (!active) return;
    updateBook(active.id, (b) => ({ chapters: b.chapters.filter((c) => c.id !== chapterId) }));
  };
  const loadChapter = (chapterId: string) => {
    if (!active) return;
    const ch = active.chapters.find((c) => c.id === chapterId);
    if (!ch) return;
    updateBook(active.id, { title: ch.title, content: ch.content });
  };

  // ---------- cores ----------
  const addCore = (input: { title: string; emoji?: string }) => {
    if (!active) return null;
    const core: Core = {
      id: `core${Date.now()}`,
      title: input.title,
      emoji: input.emoji ?? "◇",
      blocks: [],
    };
    updateBook(active.id, (b) => ({ cores: [...b.cores, core] }));
    return core.id;
  };
  const updateCore = (coreId: string, patch: Partial<Core>) => {
    if (!active) return;
    updateBook(active.id, (b) => ({
      cores: b.cores.map((c) => (c.id === coreId ? { ...c, ...patch } : c)),
    }));
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
        c.id === coreId
          ? { ...c, blocks: c.blocks.map((bl) => (bl.id === blockId ? { ...bl, ...patch } : bl)) }
          : c,
      ),
    }));
  };
  const removeCoreBlock = (coreId: string, blockId: string) => {
    if (!active) return;
    updateBook(active.id, (b) => ({
      cores: b.cores.map((c) =>
        c.id === coreId ? { ...c, blocks: c.blocks.filter((bl) => bl.id !== blockId) } : c,
      ),
    }));
  };
  const addCoreAttachment = (coreId: string, file: File) => {
    if (!active) return;
    if (file.size > 3_000_000) throw new Error("File over 3MB — pick smaller.");
    const reader = new FileReader();
    reader.onload = () => {
      const att: CoreAttachment = {
        id: `at${Date.now()}${Math.random().toString(36).slice(2, 5)}`,
        name: file.name,
        mime: file.type || "application/octet-stream",
        dataUrl: String(reader.result),
        createdAt: Date.now(),
      };
      updateBook(active.id, (b) => ({
        cores: b.cores.map((c) =>
          c.id === coreId ? { ...c, attachments: [...(c.attachments ?? []), att] } : c,
        ),
      }));
    };
    reader.readAsDataURL(file);
  };
  const removeCoreAttachment = (coreId: string, attId: string) => {
    if (!active) return;
    updateBook(active.id, (b) => ({
      cores: b.cores.map((c) =>
        c.id === coreId
          ? { ...c, attachments: (c.attachments ?? []).filter((a) => a.id !== attId) }
          : c,
      ),
    }));
  };

  // ---------- brainstorm ----------
  const addBrainstorm = (msg: Omit<BrainstormMessage, "id" | "createdAt">) => {
    if (!active) return;
    const m: BrainstormMessage = {
      ...msg,
      id: `bs${Date.now()}${Math.random().toString(36).slice(2, 5)}`,
      createdAt: Date.now(),
    };
    updateBook(active.id, (b) => ({ brainstorm: [...b.brainstorm, m] }));
    return m;
  };
  const removeBrainstorm = (id: string) => {
    if (!active) return;
    updateBook(active.id, (b) => ({ brainstorm: b.brainstorm.filter((m) => m.id !== id) }));
  };
  const clearBrainstorm = () => {
    if (!active) return;
    updateBook(active.id, { brainstorm: [] });
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
    addBrainstorm,
    removeBrainstorm,
    clearBrainstorm,
  };
}

export type BooksApi = ReturnType<typeof useBooks>;

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
      (c, i) =>
        `## Core ${i + 1}: ${c.title}\n${c.blocks
          .map((b, j) => `${i + 1}.${j + 1} ${b.title}: ${b.body}`)
          .join("\n")}`,
    )
    .join("\n\n");
}

/**
 * Build the shared context block sent with every AI request.
 * - Cores are highest priority (always full).
 * - Lore is condensed (name + one-line role/desc).
 * - Chapter text is included only when includeChapter=true.
 * - Brainstorm tail (last N messages) is included when brainstormTail>0.
 */
export function buildBookContext(
  book: Book,
  opts: { includeChapter?: boolean; brainstormTail?: number } = {},
): string {
  const parts: string[] = [];
  parts.push(`BOOK: ${book.name}\nCHAPTER: ${book.title}`);
  if (book.cores.length) parts.push(`WORLD CORES (canonical facts):\n${coresToPrompt(book.cores)}`);
  if (book.lore.length) parts.push(`LORE:\n${loreToPrompt(book.lore)}`);
  if (opts.includeChapter && book.content.trim()) {
    parts.push(`CURRENT CHAPTER TEXT:\n${book.content}`);
  }
  const tail = opts.brainstormTail ?? 0;
  if (tail > 0 && book.brainstorm.length) {
    const recent = book.brainstorm.slice(-tail);
    parts.push(
      `RECENT BRAINSTORM (chronological):\n${recent.map((m) => `${m.role.toUpperCase()}${m.mode ? `(${m.mode})` : ""}: ${m.content}`).join("\n")}`,
    );
  }
  return parts.join("\n\n---\n\n");
}
