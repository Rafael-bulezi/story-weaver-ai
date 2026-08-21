import { useEffect, useState, useCallback, useMemo } from "react";
import type {
  LoreType,
  ChapterType,
  BrainstormRole,
  BrainstormMode,
  BrainstormMessage,
  LoreItem,
  Chapter,
  CoreBlock,
  CoreAttachment,
  Core,
  Goal,
  LorePendingUpdate,
  Book,
  Branch,
  ContextUsage,
  PinnedContextItem,
} from "./story-types";

export type {
  LoreType,
  ChapterType,
  BrainstormRole,
  BrainstormMode,
  BrainstormMessage,
  LoreItem,
  Chapter,
  CoreBlock,
  CoreAttachment,
  Core,
  Goal,
  LorePendingUpdate,
  Book,
  Branch,
  ContextUsage,
  PinnedContextItem,
};

export {
  loreToPrompt,
  coresToPrompt,
  buildOverview,
  buildBookContext,
  buildSelectiveContext,
  loreStringSimilarity,
  findSimilarLore,
} from "./story-helpers";

const BOOKS_KEY = "sc:books:v4";
const ACTIVE_KEY = "sc:active-book";
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

export { DEFAULT_LORE, DEFAULT_BOOKS } from "./story-defaults";
import { DEFAULT_BOOKS } from "./story-defaults";

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
    const initialActive = read<string | null>(ACTIVE_KEY, null);
    if (initialActive) {
      setActiveIdState(initialActive);
    } else if (stored && stored.length > 0) {
      setActiveIdState(stored[0].id);
      write(ACTIVE_KEY, stored[0].id);
    } else {
      setActiveIdState(DEFAULT_BOOKS[0].id);
      write(ACTIVE_KEY, DEFAULT_BOOKS[0].id);
    }
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
  const addGoal = (title: string, opts?: { coreId?: string; source?: "ai" | "user"; status?: "suggested" | "active" }) => {
    if (!active) return;
    const id = `g${Date.now()}`;
    const source = opts?.source ?? "user";
    const status = opts?.status ?? (source === "ai" ? "suggested" : "active");
    updateBook(active.id, (b) => ({
      goals: [...b.goals, { id, title, text: title, done: false, coreId: opts?.coreId, createdAt: Date.now(), source, status }]
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
  /** Promote an AI-suggested goal to an active (user-confirmed) goal */
  const acceptGoal = (goalId: string) => {
    if (!active) return;
    updateBook(active.id, (b) => ({
      goals: b.goals.map((g) => g.id === goalId ? { ...g, status: "active" as const, source: "user" as const } : g)
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

  const updateBrainstorm = useCallback(
    (id: string, patch: Partial<BrainstormMessage>) => {
      if (activeBranchId) {
        const targetId = activeBranchId ?? "main";
        const msgs = branchMessages[targetId] ?? [];
        const nextMsgs = msgs.map((m) => (m.id === id ? { ...m, ...patch } : m));
        const next = { ...branchMessages, [targetId]: nextMsgs };
        persistBranchMessages(next);
        return;
      }
      if (!active) return;
      updateBook(active.id, (b) => ({
        brainstorm: b.brainstorm.map((m) => (m.id === id ? { ...m, ...patch } : m)),
      }));
    },
    [active, activeBranchId, branchMessages, persistBranchMessages, updateBook],
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
    acceptGoal,
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
    updateBrainstorm,
    removeBrainstorm,
    hydrated,
    clearBrainstorm,
  };
}

export type BooksApi = ReturnType<typeof useBooks>;
