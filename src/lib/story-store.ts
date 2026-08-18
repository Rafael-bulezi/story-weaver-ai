import { useEffect, useState, useCallback, useMemo } from "react";

export type LoreType = "character" | "place" | "concept" | "faction";
export type ChapterType = "canon" | "draft";
export type BrainstormRole = "user" | "assistant";
export type BrainstormMode = "chat" | "critic" | "debater";

export interface BrainstormMessage {
  id: string;
  role: BrainstormRole;
  mode?: BrainstormMode;
  content: string;
  thought?: string;
  createdAt: number;
}


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

export interface Goal {
  id: string;
  title: string;
  text: string;
  done: boolean;
  coreId?: string;
  createdAt: number;
}

/** Pending lore-update review: new candidate may be a duplicate of an existing lore item */
export interface LorePendingUpdate {
  id: string;
  candidate: LoreItem;
  /** existing lore item that is similar (similarity >= threshold) */
  existingId: string;
  similarity: number;
  /** 0.0–1.0, AI confidence that this IS a new entry (low = more likely a duplicate) */
  confidence: number;
  createdAt: number;
}



export interface Book {
  id: string;
  name: string;
  title: string;
  subtitle?: string;
  cover: string;
  content: string;
  overview?: string;
  updatedAt: number;
  lore: LoreItem[];
  chapters: Chapter[];
  cores: Core[];
  brainstorm: BrainstormMessage[];
  goals: Goal[];
  candidates: LoreItem[];
  /** Lore items pending user confirmation (possible duplicates) */
  lorePending: LorePendingUpdate[];
}

const BOOKS_KEY = "sc:books:v4";
const ACTIVE_KEY = "sc:active-book";

export interface Branch {
  id: string;
  name: string;
  baseBookId: string;
  originMsgId?: string;
  originSnippet?: string;
  createdAt: number;
}

const BRANCHES_KEY = "sc:branches:v1";

function readBranches(): Branch[] {
  return read<Branch[]>(BRANCHES_KEY, []);
}

function writeBranches(branches: Branch[]) {
  write(BRANCHES_KEY, branches);
}

export function useBranches() {
  const [branches, setBranches] = useState<Branch[]>(readBranches());
  const persist = useCallback((next: Branch[]) => {
    setBranches(next);
    writeBranches(next);
  }, []);

  const createBranch = useCallback((baseBookId: string, name: string, originMsgId?: string, originSnippet?: string) => {
    const id = `br${Date.now()}`;
    const branch: Branch = { id, name, baseBookId, originMsgId, originSnippet, createdAt: Date.now() };
    const next = [...branches, branch];
    persist(next);
    return id;
  }, [branches, persist]);

  const renameBranch = useCallback((id: string, newName: string) => {
    const next = branches.map(b => b.id === id ? { ...b, name: newName } : b);
    persist(next);
  }, [branches, persist]);

  const deleteBranch = useCallback((id: string) => {
    const next = branches.filter(b => b.id !== id);
    persist(next);
  }, [branches, persist]);

  return { branches, createBranch, renameBranch, deleteBranch };
}

// Default lore definition
const DEFAULT_LORE: LoreItem[] = [
  {
    id: "l1",
    type: "character",
    name: "Zeal",
    role: "Protagonist",
    description: "A Dawnborn who manipulates cyan light. Searching for the truth behind the Fracture.",
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
    goals: [],
    candidates: [],
    lorePending: [],
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
      goals: (b.goals ?? []).map((g: Goal & { text?: string; title?: string }) => ({
        ...g,
        title: g.title ?? g.text ?? "Goal",
        text: g.text ?? g.title ?? "Goal",
        createdAt: g.createdAt ?? Date.now(),
      })),
      candidates: b.candidates ?? [],
      lorePending: (b as Book & { lorePending?: LorePendingUpdate[] }).lorePending ?? [],
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
  const branchApi = useBranches();
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
        goals: [],
        candidates: [],
        lorePending: [],
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
  /** Derive a short descriptive title from the first sentence(s) of content */
  const autoTitle = (content: string, fallback: string): string => {
    const text = content.trim();
    if (!text) return fallback;
    // Take first sentence or up to 80 chars
    const sentence = text.split(/[.!?]/)[0].trim();
    const raw = sentence || text.slice(0, 80);
    // Trim to 60 chars at word boundary
    if (raw.length <= 60) return raw;
    const cut = raw.slice(0, 60);
    const lastSpace = cut.lastIndexOf(" ");
    return (lastSpace > 20 ? cut.slice(0, lastSpace) : cut) + "…";
  };

  const saveChapter = (type: ChapterType = "draft") => {
    if (!active) return;
    const isGenericTitle =
      !active.title.trim() ||
      /^chapter\s*\d*$/i.test(active.title.trim());
    const title = isGenericTitle
      ? autoTitle(active.content, `Draft ${Date.now()}`)
      : active.title;
    const chapter: Chapter = {
      id: `c${Date.now()}`,
      title,
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

  // ---------- goals ----------
  const addGoal = (title: string, coreId?: string) => {
    if (!active) return;
    const id = `g${Date.now()}`;
    updateBook(active.id, (b) => ({
      goals: [...b.goals, { id, title, text: title, done: false, coreId, createdAt: Date.now() }]
    }));
    return id;
  };
  const toggleGoalDone = (goalId: string) => {
    if (!active) return;
    updateBook(active.id, (b) => ({
      goals: b.goals.map((g) => g.id === goalId ? { ...g, done: !g.done } : g)
    }));
  };
  const removeGoal = (goalId: string) => {
    if (!active) return;
    updateBook(active.id, (b) => ({ goals: b.goals.filter((g) => g.id !== goalId) }));
  };
  const updateGoal = (goalId: string, patch: Partial<Goal>) => {
    if (!active) return;
    updateBook(active.id, (b) => ({
      goals: b.goals.map((g) => g.id === goalId ? { ...g, ...patch } : g)
    }));
  };

  // ---------- candidates ----------
  const addCandidate = (item: LoreItem) => {
    if (!active) return;
    updateBook(active.id, (b) => ({ candidates: [...b.candidates, item] }));
  };
  const clearCandidates = () => {
    if (!active) return;
    updateBook(active.id, { candidates: [] });
  };
  const removeCandidate = (loreId: string) => {
    if (!active) return;
    updateBook(active.id, (b) => ({ candidates: b.candidates.filter((c) => c.id !== loreId) }));
  };

  // ---------- lore pending updates (duplicate detection) ----------
  const addLorePending = (pending: Omit<LorePendingUpdate, "id" | "createdAt">) => {
    if (!active) return;
    const entry: LorePendingUpdate = { ...pending, id: `lp${Date.now()}`, createdAt: Date.now() };
    updateBook(active.id, (b) => ({ lorePending: [...(b.lorePending ?? []), entry] }));
    return entry.id;
  };
  const resolveLorePending = (pendingId: string, action: "update" | "create") => {
    if (!active) return;
    const pending = (active.lorePending ?? []).find((p) => p.id === pendingId);
    if (!pending) return;
    if (action === "update") {
      // Merge description into existing lore item
      updateBook(active.id, (b) => ({
        lore: b.lore.map((l) =>
          l.id === pending.existingId
            ? { ...l, description: pending.candidate.description }
            : l
        ),
        lorePending: (b.lorePending ?? []).filter((p) => p.id !== pendingId),
      }));
    } else {
      // Create new entry
      updateBook(active.id, (b) => ({
        lore: [...b.lore, { ...pending.candidate, id: `l${Date.now()}${Math.random().toString(36).slice(2, 5)}` }],
        lorePending: (b.lorePending ?? []).filter((p) => p.id !== pendingId),
      }));
    }
  };
  const dismissLorePending = (pendingId: string) => {
    if (!active) return;
    updateBook(active.id, (b) => ({ lorePending: (b.lorePending ?? []).filter((p) => p.id !== pendingId) }));
  };

  // ---------- branching ----------
  const [activeBranchId, setActiveBranchId] = useState<string | null>(null);
  const [branchMessages, setBranchMessages] = useState<Record<string, BrainstormMessage[]>>({});

  // Persist branch messages per book
  const branchKey = `sc:branch-messages:${active?.id ?? ""}`;
  useEffect(() => {
    if (!active) return;
    const stored = read<Record<string, BrainstormMessage[]>>(branchKey, {});
    setBranchMessages(stored);
  }, [active]);

  const persistBranchMessages = useCallback((next: Record<string, BrainstormMessage[]>) => {
    if (!active) return;
    setBranchMessages(next);
    write(branchKey, next);
  }, [active, branchKey]);

  const setActiveBranch = useCallback((branchId: string | null) => {
    setActiveBranchId(branchId);
  }, []);

  const addBranchMessage = useCallback((msg: Omit<BrainstormMessage, "id" | "createdAt">) => {
    if (!active) return;
    const targetId = activeBranchId ?? "main";
    const m: BrainstormMessage = {
      ...msg,
      id: `bs${Date.now()}${Math.random().toString(36).slice(2, 5)}`,
      createdAt: Date.now(),
    };
    const next = {
      ...branchMessages,
      [targetId]: [...(branchMessages[targetId] ?? []), m],
    };
    persistBranchMessages(next);
    return m;
  }, [active, activeBranchId, branchMessages, persistBranchMessages]);

  const clearBranch = useCallback(() => {
    if (!active) return;
    const next = { ...branchMessages, [activeBranchId ?? "main"]: [] };
    persistBranchMessages(next);
  }, [active, activeBranchId, branchMessages, persistBranchMessages]);

  // Override default brainstorm functions to use branching when active
  const addBrainstorm = useCallback(
    (msg: Omit<BrainstormMessage, "id" | "createdAt">) => {
      // If a branch is active, add to branch, else to main book
      if (activeBranchId) return addBranchMessage(msg);
      if (!active) return;
      const m: BrainstormMessage = {
        ...msg,
        id: `bs${Date.now()}${Math.random().toString(36).slice(2, 5)}`,
        createdAt: Date.now(),
      };
      updateBook(active.id, (b) => ({ brainstorm: [...b.brainstorm, m] }));
      return m;
    },
    [active, activeBranchId, addBranchMessage, updateBook],
  );

  const removeBrainstorm = useCallback((id: string) => {
    if (activeBranchId) {
      const targetId = activeBranchId ?? "main";
      const msgs = branchMessages[targetId] ?? [];
      const filtered = msgs.filter((m) => m.id !== id);
      const next = { ...branchMessages, [targetId]: filtered };
      persistBranchMessages(next);
      return;
    }
    if (!active) return;
    updateBook(active.id, (b) => ({ brainstorm: b.brainstorm.filter((m) => m.id !== id) }));
  }, [active, activeBranchId, branchMessages, persistBranchMessages, updateBook]);

  const clearBrainstorm = useCallback(() => {
    if (activeBranchId) return clearBranch();
    if (!active) return;
    updateBook(active.id, { brainstorm: [] });
  }, [active, activeBranchId, clearBranch, updateBook]);

  const bookBranches = useMemo(() => {
    if (!active) return [];
    return branchApi.branches.filter((b) => b.baseBookId === active.id);
  }, [branchApi.branches, active]);

  const createBranch = useCallback(
    (name: string, originMsgId?: string, originSnippet?: string) => {
      if (!active) return "";
      return branchApi.createBranch(active.id, name, originMsgId, originSnippet);
    },
    [active, branchApi],
  );

  const renameBranch = branchApi.renameBranch;
  const deleteBranch = branchApi.deleteBranch;

  return {
    books,
    activeId,
    setActiveId,
    active,
    createBook,
    deleteBook,
    updateBook,
    addLore,
    updateLore,
    removeLore,
    importExtractedLore,
    saveChapter,
    setChapterType,
    deleteChapter,
    loadChapter,
    addCore,
    updateCore,
    removeCore,
    addCoreBlock,
    updateCoreBlock,
    removeCoreBlock,
    addCoreAttachment,
    removeCoreAttachment,
    // Goals
    addGoal,
    toggleGoalDone,
    removeGoal,
    updateGoal,
    // Candidates
    addCandidate,
    clearCandidates,
    removeCandidate,
    // Lore pending updates
    addLorePending,
    resolveLorePending,
    dismissLorePending,
    // Branching
    activeBranchId,
    setActiveBranch,
    addBranchMessage,
    clearBranch,
    branches: bookBranches,
    createBranch,
    renameBranch,
    deleteBranch,
    branchMessages,
    // Brainstorm
    addBrainstorm,
    removeBrainstorm,
    hydrated,
    clearBrainstorm,
  };
}

export type BooksApi = ReturnType<typeof useBooks>;

export function loreToPrompt(items: LoreItem[]): string {
  if (!items.length) return "(no lore yet)";
  const grouped: Record<LoreType, LoreItem[]> = { character: [], place: [], concept: [], faction: [] };
  items.forEach((i) => grouped[i.type].push(i));
  const section = (label: string, arr: LoreItem[]) =>
    arr.length
      ? `${label}:\n${arr.map((i) => `- ${i.name}${i.role ? ` (${i.role})` : ""}: ${i.description}`).join("\n")}`
      : "";
  return [
    section("Characters", grouped.character),
    section("Places", grouped.place),
    section("Factions", grouped.faction),
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
  opts: { includeChapter?: boolean; brainstormTail?: number; brainstormMessages?: BrainstormMessage[] } = {},
): string {
  const parts: string[] = [];
  parts.push(`BOOK: ${book.name}\nCHAPTER: ${book.title}`);
  if (book.cores.length) parts.push(`WORLD CORES (canonical facts):\n${coresToPrompt(book.cores)}`);
  if (book.lore.length) parts.push(`LORE:\n${loreToPrompt(book.lore)}`);
  if (opts.includeChapter && book.content.trim()) {
    parts.push(`CURRENT CHAPTER TEXT:\n${book.content}`);
  }
  const tail = opts.brainstormTail ?? 0;
  const messages = opts.brainstormMessages ?? book.brainstorm;
  if (tail > 0 && messages.length) {
    const recent = messages.slice(-tail);
    parts.push(
      `RECENT BRAINSTORM (chronological):\n${recent.map((m) => `${m.role.toUpperCase()}${m.mode ? `(${m.mode})` : ""}: ${m.content}`).join("\n")}`,
    );
  }
  return parts.join("\n\n---\n\n");
}

/** One-paragraph digest — user-authored overview when present, else auto-built from cores. */
export function buildOverview(book: Book): string {
  if (book.overview && book.overview.trim()) return book.overview.trim();
  if (!book.cores.length) return `${book.name}: no cores yet.`;
  const bits = book.cores.map((c, i) => {
    const first = c.blocks[0];
    const detail = first ? ` — ${first.title}: ${first.body}` : "";
    return `Core ${i + 1} (${c.title})${detail}`;
  });
  const joined = bits.join(" · ");
  return joined.length > 500 ? joined.slice(0, 497) + "…" : joined;
}

/** Build a scoped context from selected core / lore IDs. Includes overview + selected only. */
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
  const parts: string[] = [`BOOK: ${book.name}\nCHAPTER: ${book.title}`];
  if (opts.overview !== false) parts.push(`OVERVIEW:\n${buildOverview(book)}`);
  const cores = book.cores.filter((c) => opts.coreIds?.includes(c.id));
  if (cores.length) parts.push(`SELECTED CORES:\n${coresToPrompt(cores)}`);
  const lore = book.lore.filter((l) => opts.loreIds?.includes(l.id));
  if (lore.length) parts.push(`SELECTED LORE:\n${loreToPrompt(lore)}`);
  if (opts.includeChapter && book.content.trim()) {
    parts.push(`CURRENT CHAPTER TEXT:\n${book.content}`);
  }
  const tail = opts.brainstormTail ?? 0;
  const messages = opts.brainstormMessages ?? book.brainstorm;
  if (tail > 0 && messages.length) {
    const recent = messages.slice(-tail);
    parts.push(
      `RECENT BRAINSTORM:\n${recent.map((m) => `${m.role.toUpperCase()}${m.mode ? `(${m.mode})` : ""}: ${m.content}`).join("\n")}`,
    );
  }
  return parts.join("\n\n---\n\n");
}

/**
 * Jaccard similarity on word sets of name + description.
 * Returns 0.0 (no overlap) to 1.0 (identical).
 */
export function loreStringSimilarity(a: LoreItem, b: LoreItem): number {
  const tokenize = (s: string) =>
    new Set(s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(Boolean));
  const setA = tokenize(`${a.name} ${a.description}`);
  const setB = tokenize(`${b.name} ${b.description}`);
  if (!setA.size && !setB.size) return 1;
  let intersection = 0;
  setA.forEach((w) => { if (setB.has(w)) intersection++; });
  return intersection / (setA.size + setB.size - intersection);
}

/**
 * Given a candidate LoreItem and the existing lore array, find the most similar
 * existing item. Returns { item, similarity } or null if nothing exceeds the threshold.
 */
export function findSimilarLore(
  candidate: LoreItem,
  existing: LoreItem[],
  threshold = 0.75,
): { item: LoreItem; similarity: number } | null {
  let best: { item: LoreItem; similarity: number } | null = null;
  for (const item of existing) {
    if (item.type !== candidate.type) continue; // only compare same type
    const sim = loreStringSimilarity(candidate, item);
    if (sim >= threshold && (!best || sim > best.similarity)) {
      best = { item, similarity: sim };
    }
  }
  return best;
}
