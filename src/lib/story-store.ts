import { useEffect, useState, useCallback } from "react";

export type LoreType = "character" | "place" | "concept";

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
  savedAt: number;
}

export interface Book {
  id: string;
  title: string;
  subtitle?: string;
  cover?: string; // emoji or short glyph
  content: string; // current draft
  updatedAt: number;
  lore: LoreItem[];
  chapters: Chapter[];
}

const BOOKS_KEY = "sc:books:v2";
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
    title: "Astrisol",
    subtitle: "Chapter 1 — The Dawnborn",
    cover: "✦",
    content:
      "Morning had no meaning in Astrisol.\n\nThe city moved before its people did. Ribbons of engineered light — thin, silent pathways — crossed above the structures like frozen currents in the sky.\n\nZeal stood at the edge of a descending light-ribbon, watching it fold into the distance like a thought that refused to finish forming.",
    updatedAt: Date.now(),
    lore: DEFAULT_LORE,
    chapters: [],
  },
  {
    id: "b2",
    title: "Untitled Draft",
    subtitle: "New project",
    cover: "◐",
    content: "",
    updatedAt: Date.now(),
    lore: [],
    chapters: [],
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

export function useBooks() {
  const [books, setBooks] = useState<Book[]>(DEFAULT_BOOKS);
  const [activeId, setActiveIdState] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setBooks(read(BOOKS_KEY, DEFAULT_BOOKS));
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

  // ---------- lore ops on active book ----------
  const addLore = (item: Omit<LoreItem, "id">) => {
    if (!active) return;
    updateBook(active.id, (b) => ({
      lore: [...b.lore, { ...item, id: `l${Date.now()}` }],
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

  const saveChapter = () => {
    if (!active) return;
    const chapter: Chapter = {
      id: `c${Date.now()}`,
      title: active.title,
      content: active.content,
      savedAt: Date.now(),
    };
    updateBook(active.id, (b) => ({ chapters: [chapter, ...b.chapters] }));
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
    saveChapter,
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
