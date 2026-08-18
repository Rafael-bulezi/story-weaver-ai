import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  ArrowUp,
  Loader2,
  Sparkles,
  ScanSearch,
  Scale,
  RefreshCw,
  X,
  Copy,
  Replace,
  Wand2,
  ChevronDown,
  Feather,
  Plus,
  AtSign,
  Zap,
  MoreHorizontal,
  GitBranch,
  Paperclip,
  Image,
} from "lucide-react";

import type { BooksApi, BrainstormMessage, Core, Branch } from "@/lib/story-store";
import { buildSelectiveContext, findSimilarLore } from "@/lib/story-store";
import { invokeAssistant } from "@/lib/ai.functions";
import { cn } from "@/lib/utils";
import { toastSuccess, toastError, copyText } from "@/lib/toast";
import { ContextStrip, type ContextSelection } from "@/components/story/ContextStrip";
import { GoalPanel } from "@/components/story/GoalPanel";
import { CandidateChips, LoreDuplicateCard } from "@/components/story/LoreDuplicateCard";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Module-level: tracks streamed message IDs — backed by localStorage so page refreshes don't re-animate old messages
// ---------------------------------------------------------------------------
// ActivityStep type — used by the live activity stream
// ---------------------------------------------------------------------------
export interface ActivityStep {
  id: string;
  text: string;
  status: "pending" | "done";
  /** What kind of resource this step references */
  classifier?: "core" | "character" | "place" | "concept" | "process";
  /** Expandable content shown in a lightbox-style dropdown */
  refContent?: string;
}

/** Build contextual activity steps based on what is actually in context */
function buildContextualSteps(
  active: { cores: Array<{ id: string; title: string; blocks?: Array<{ title: string; body: string }> }>; lore: Array<{ id: string; name: string; type: string; description: string }>; brainstorm: unknown[] },
  ctx: { coreIds: string[]; loreIds: string[] }
): ActivityStep[] {
  const steps: ActivityStep[] = [];
  steps.push({ id: "fs", text: "Reading Focus Session", status: "pending", classifier: "process" });

  // Real core entries from context
  ctx.coreIds.forEach((cid) => {
    const c = active.cores.find((x) => x.id === cid);
    if (!c) return;
    const preview = (c.blocks ?? [])
      .slice(0, 3)
      .map((b) => `**${b.title}**: ${b.body}`)
      .join("\n");
    steps.push({ id: `core-${cid}`, text: c.title, status: "pending", classifier: "core", refContent: preview || undefined });
  });

  // Real lore entries from context
  ctx.loreIds.forEach((lid) => {
    const l = active.lore.find((x) => x.id === lid);
    if (!l) return;
    const clf = (/char|person|protagonist|npc/i.test(l.type) ? "character" : /place|location|city|region|land|realm/i.test(l.type) ? "place" : "concept") as "character" | "place" | "concept";
    steps.push({ id: `lore-${lid}`, text: l.name, status: "pending", classifier: clf, refContent: l.description || undefined });
  });

  // General lore library scan
  const extraLore = active.lore.length - ctx.loreIds.length;
  if (extraLore > 0) {
    steps.push({ id: "lore-scan", text: `Scanned Lore Library (${active.lore.length} entries)`, status: "pending", classifier: "process" });
  }

  // Brainstorm history awareness
  if (active.brainstorm.length > 3) {
    steps.push({ id: "history", text: `Reviewed ${active.brainstorm.length} conversation messages`, status: "pending", classifier: "process" });
  }

  steps.push({ id: "canon", text: "Checking Canon Consistency", status: "pending", classifier: "process" });
  steps.push({ id: "plan", text: "Comparing Possibilities", status: "pending", classifier: "process" });
  steps.push({ id: "prepare", text: "Preparing Response", status: "pending", classifier: "process" });
  steps.push({ id: "write", text: "Writing", status: "pending", classifier: "process" });
  return steps;
}

const _STORAGE_KEY = "sc:streamed-msg-ids";

function _loadStreamedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(_STORAGE_KEY);
    if (raw) return new Set(JSON.parse(raw) as string[]);
  } catch { /* ignore */ }
  return new Set();
}
function _saveStreamedId(id: string) {
  try {
    const ids = _loadStreamedIds();
    ids.add(id);
    // Cap at 500 entries to avoid bloating localStorage
    const arr = [...ids].slice(-500);
    localStorage.setItem(_STORAGE_KEY, JSON.stringify(arr));
  } catch { /* ignore */ }
}
const _streamedMessageIds = _loadStreamedIds();

export function BrainstormTab({
  books,
  editorRef,
  onSwitchToChat,
  onOpenTab,
}: {
  books: BooksApi;
  editorRef: React.MutableRefObject<HTMLTextAreaElement | null>;
  onSwitchToChat: () => void;
  onOpenTab?: (tab: "lore" | "cores") => void;
}) {
  const active = books.active!;
  const feed = useMemo(() => {
    if (books.activeBranchId) {
      return books.branchMessages[books.activeBranchId] ?? [];
    }
    return active.brainstorm;
  }, [books.activeBranchId, books.branchMessages, active.brainstorm]);

  const [busy, setBusy] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [includeChapter, setIncludeChapter] = useState(false);
  // Stores {mode, text, userMsgId} of the last failed request so we can retry
  const [lastFailed, setLastFailed] = useState<{ mode: "chat" | "critic" | "debater" | "rewrite"; text: string; userMsgId?: string } | null>(null);
  // AbortController ref for cancelling in-flight requests
  const abortRef = useRef<AbortController | null>(null);
  const [wideMode, setWideMode] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("sc:wide-brainstorm");
      return saved === "true";
    }
    return false;
  });

  const handleToggleWideMode = (val: boolean) => {
    setWideMode(val);
    if (typeof window !== "undefined") {
      localStorage.setItem("sc:wide-brainstorm", String(val));
    }
  };
  
  // Persist selected context chips per-book
  const [ctx, setCtx] = useState<ContextSelection>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(`sc:context:${active.id}`);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // ignore fallback
        }
      }
    }
    return { coreIds: [], loreIds: [] };
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(`sc:context:${active.id}`, JSON.stringify(ctx));
    }
  }, [ctx, active.id]);

  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Live activity stream — typed steps with classifier metadata
  const [activities, setActivities] = useState<ActivityStep[]>([]);
  // Persists the final completed activity list per message ID (session-only, not persisted to localStorage)
  const messageActivitiesMapRef = useRef<Record<string, ActivityStep[]>>({});
  // Snapshot of latest activities for capture in send() finally block
  const activitiesRef = useRef<ActivityStep[]>([]);
  // Latest ctx / active snapshot for use in the activity effect
  const ctxRef = useRef(ctx);
  ctxRef.current = ctx;
  const activeRef = useRef(active);
  activeRef.current = active;

  // Keep activitiesRef in sync with state
  useEffect(() => { activitiesRef.current = activities; }, [activities]);

  // Build and animate contextual activity steps when busy starts; freeze when done
  useEffect(() => {
    if (!busy) {
      // Freeze: mark all remaining steps as done, keep them visible
      setActivities((prev) =>
        prev.length > 0 ? prev.map((a) => ({ ...a, status: "done" as const })) : prev
      );
      return;
    }

    // New request — rebuild steps from current context
    const steps = buildContextualSteps(activeRef.current, ctxRef.current);
    setActivities([{ ...steps[0] }]);
    let idx = 0;

    const interval = setInterval(() => {
      setActivities((prev) => {
        const next = prev.map((a, i) =>
          i === prev.length - 1 ? { ...a, status: "done" as const } : a
        );
        idx++;
        if (idx < steps.length) next.push({ ...steps[idx] });
        return next;
      });
    }, 1100);

    return () => clearInterval(interval);
  }, [busy]);

  // Autocomplete suggestions state
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const composerInputRef = useRef<HTMLTextAreaElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  const adjustTextareaHeight = useCallback(() => {
    const el = composerInputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, []);

  // Click outside to dismiss mention dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        composerInputRef.current &&
        !composerInputRef.current.contains(event.target as Node)
      ) {
        setMentionQuery(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  
  // Watch input changes for "@"
  useEffect(() => {
    const match = input.match(/@(\w*)$/);
    if (match) {
      setMentionQuery(match[1].toLowerCase());
    } else {
      setMentionQuery(null);
    }
  }, [input]);

  // Combine cores and lore for suggestions
  const suggestions = useMemo(() => {
    if (mentionQuery === null) return [];
    
    const list: Array<{ id: string; name: string; type: "core" | "lore"; subtype?: string }> = [];
    
    // Add cores
    active.cores.forEach((c, idx) => {
      list.push({
        id: c.id,
        name: c.title,
        type: "core",
        subtype: `Core ${idx + 1}`
      });
    });
    
    // Add lore
    active.lore.forEach((l) => {
      list.push({
        id: l.id,
        name: l.name,
        type: "lore",
        subtype: l.type.toUpperCase()
      });
    });
    
    // Filter by query
    return list
      .filter((item) => item.name.toLowerCase().includes(mentionQuery))
      .slice(0, 5); // Limit to 5 suggestions
  }, [mentionQuery, active.cores, active.lore]);

  const selectSuggestion = (item: { id: string; name: string; type: "core" | "lore" }) => {
    // Replace the trailing @word with the selected name
    const completedInput = input.replace(/@\w*$/, `${item.name} `);
    setInput(completedInput);
    
    // Add to context selection automatically
    if (item.type === "core") {
      if (!ctx.coreIds.includes(item.id)) {
        setCtx((prev) => ({ ...prev, coreIds: [...prev.coreIds, item.id] }));
        toastSuccess(`Added Core to context: ${item.name}`);
      }
    } else {
      if (!ctx.loreIds.includes(item.id)) {
        setCtx((prev) => ({ ...prev, loreIds: [...prev.loreIds, item.id] }));
        toastSuccess(`Added Lore to context: ${item.name}`);
      }
    }
    
    setMentionQuery(null);
    setTimeout(() => {
      if (composerInputRef.current) {
        composerInputRef.current.focus();
        composerInputRef.current.style.height = "auto";
      }
    }, 20);
  };
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [feed.length, busy, activities.length]);
  async function send(mode: "chat" | "critic" | "debater" | "rewrite", override?: string, retryUserMsgId?: string) {
    const text = (override ?? input).trim();
    if (!text && mode === "chat") return;
    setLastFailed(null);

    // Create a new AbortController for this request
    const abort = new AbortController();
    abortRef.current = abort;

    setBusy(mode);
    let addedUserMsgId: string | undefined = retryUserMsgId;
    if (mode === "chat" && !override && !retryUserMsgId) {
      books.addBrainstorm({ role: "user", content: text });
      setInput("");
    }
    try {
      const context = buildSelectiveContext(active, {
        overview: true,
        coreIds: ctx.coreIds,
        loreIds: ctx.loreIds,
        includeChapter,
        brainstormTail: 10,
        brainstormMessages: feed,
      });
      let action = text;
      if (mode === "critic")
        action =
          "Review the recent brainstorm and current story context for plot holes, inconsistency vs cores/lore, or thin motivation.";
      else if (mode === "debater")
        action = "Propose 2–3 bold alternate directions from the recent brainstorm.";
      else if (mode === "rewrite") {
        const last = [...feed].reverse();
        const asst = last.find((m) => m.role === "assistant");
        const user = last.find((m) => m.role === "user");
        if (!asst) {
          toastError("No assistant reply to rewrite yet.");
          setBusy(null);
          return;
        }
        action = `LAST USER MESSAGE:\n${user?.content ?? "(none)"}\n\nLAST ASSISTANT REPLY (rewrite this stronger):\n${asst.content}`;
      }
      const { content, thought } = await invokeAssistant({ data: { mode, action, context }, signal: abort.signal });
      const addedMsg = books.addBrainstorm({
        role: "assistant",
        mode: mode === "rewrite" ? "chat" : mode,
        content: content.trim(),
        thought: thought,
      });
      // Snapshot completed activities for this message so the bubble can show them
      if (addedMsg?.id) {
        messageActivitiesMapRef.current[addedMsg.id] = activitiesRef.current.map((a) => ({
          ...a,
          status: "done" as const,
        }));
      }

      // --- Silent lore extraction and goal auto-detection after every AI reply ---
      if (mode === "chat" || mode === "rewrite") {
        silentExtractLore(content.trim()).catch(() => {/* best-effort */});
        detectGoalsAndAdd(content.trim());
      }
    } catch (e) {
      if ((e as Error)?.name === "AbortError") {
        // User cancelled — don't show an error, just clean up
        return;
      }
      const msg = e instanceof Error ? e.message : "AI request failed";
      toastError(msg);
      // Store for retry
      setLastFailed({ mode, text, userMsgId: addedUserMsgId });
    } finally {
      setBusy(null);
      abortRef.current = null;
    }
  }

  function cancelRequest() {
    abortRef.current?.abort();
    abortRef.current = null;
    setBusy(null);
  }

  function insertAtCursor(text: string) {
    const el = editorRef.current;
    const addition = `\n\n${text.trim()}`;
    const next = el
      ? active.content.slice(0, el.selectionStart ?? active.content.length) +
        addition +
        active.content.slice(el.selectionStart ?? active.content.length)
      : active.content + addition;
    books.updateBook(active.id, { content: next });
    toastSuccess("Appended to chapter");
    onSwitchToChat();
  }

  async function insertAsCore(text: string) {
    try {
      const { content: title } = await invokeAssistant({
        data: {
          mode: "categorize",
          action: "Categorize this brainstorm output into a short Core title.",
          context: `BRAINSTORM OUTPUT:\n${text}`,
        },
      });
      const coreTitle =
        (title || "New Core")
          .trim()
          .replace(/^["'`]|["'`]$/g, "")
          .slice(0, 60) || "New Core";
      const id = books.addCore({ title: coreTitle, emoji: "◇" });
      if (id) books.addCoreBlock(id, { title: "Note", body: text.trim() });
      toastSuccess(`Added as new Core: ${coreTitle}`);
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Couldn't create core");
    }
  }

  const activeBranch = useMemo(() => {
    if (!books.activeBranchId) return null;
    return books.branches.find((b: Branch) => b.id === books.activeBranchId) ?? null;
  }, [books.branches, books.activeBranchId]);

  const handleCreateBranch = (msg: BrainstormMessage) => {
    const count = books.branches.length + 1;
    const placeholder = `Branch ${count}`;
    const snippet = msg.content.length > 50 ? msg.content.slice(0, 50) + "..." : msg.content;
    const newBranchId = books.createBranch(placeholder, msg.id, snippet);
    if (newBranchId) {
      books.setActiveBranch(newBranchId);
      toastSuccess(`Created and switched to ${placeholder}`);
      // Auto-name the branch based on message content (fire-and-forget)
      autoNameBranch(newBranchId, msg.content);
    }
  };

  async function autoNameBranch(branchId: string, originContent: string) {
    try {
      const excerpt = originContent.slice(0, 400).trim();
      const { content } = await invokeAssistant({
        data: {
          mode: "categorize",
          action:
            "Create a short, evocative branch name (3–5 words) for a story exploration that starts from the message below. Return ONLY the name — no quotes, no punctuation at the end, no explanation.",
          context: `ORIGIN MESSAGE:\n${excerpt}`,
        },
      });
      const cleaned = content
        .trim()
        .replace(/^["\'`]|["\'`]$/g, "")
        .replace(/\.$/, "")
        .slice(0, 55);
      if (cleaned) {
        books.renameBranch(branchId, cleaned);
      }
    } catch {
      // Best-effort — keep the placeholder name if this fails
    }
  }

  async function silentExtractLore(responseText: string) {
    // Only extract if there's room for new candidates (max 3 shown at once)
    if ((active.candidates ?? []).length >= 3) return;

    // Build a combined name list of existing lore + current candidates to prevent any duplication
    const existingNames = new Set([
      ...(active.lore ?? []).map((l) => l.name.trim().toLowerCase()),
      ...(active.candidates ?? []).map((c) => c.name.trim().toLowerCase()),
    ]);

    try {
      const excerpt = responseText.slice(0, 1200).trim();
      const { content } = await invokeAssistant({
        data: {
          mode: "extract",
          action: [
            "You are a strict lore-extraction parser for a creative writing tool.",
            "Read the TEXT carefully and extract AT MOST 2 named story-world entities.",
            "",
            "RULES — follow exactly:",
            "  1. Only extract proper names that appear VERBATIM in the TEXT.",
            "  2. Only extract SIGNIFICANT, named entities: major characters, important named locations, factions/organizations, or pivotal concepts.",
            "  3. Do NOT extract: generic nouns ('city', 'magic', 'council'), minor passing references, descriptive phrases, or anything already in EXISTING LORE.",
            "  4. A faction/group/organization (e.g. 'Chamber of Luminari', 'Council of Elders') must use TYPE: faction.",
            "  5. If fewer than 2 truly significant entities qualify, return fewer. If NONE qualify, return the single word: NONE.",
            "",
            "OUTPUT — one entry per line, format exactly:",
            "  TYPE — NAME — one-sentence description (using ONLY what the text states)",
            "Valid TYPEs: character | place | concept | faction",
            "Do NOT add bullets, numbers, intro text, or blank lines.",
          ].join("\n"),
          context: [
            `EXISTING LORE (do NOT re-extract these):\n${(active.lore ?? [])
              .map((l) => `- ${l.name} (${l.type})`)
              .join("\n") || "(none)"}`,
            `TEXT:\n${excerpt}`,
          ].join("\n\n"),
        },
      });

      if (!content || /^none$/i.test(content.trim())) return;

      const lines = content.split(/\n+/).map((l) => l.trim()).filter(Boolean);
      // Strictly limit to max 2 extracted entries
      for (const line of lines.slice(0, 2)) {
        if (/^none$/i.test(line)) continue;
        const parts = line.replace(/^[-*•\d.)\s]+/, "").split(/\s*[—\-|:]\s*/);
        if (parts.length < 2) continue;

        const rawType = (parts[0] || "").toLowerCase();
        let type: "character" | "place" | "concept" | "faction" = "concept";
        if (/char|person|protagonist|npc/.test(rawType)) type = "character";
        else if (/place|location|city|region|land|realm/.test(rawType)) type = "place";
        else if (/faction|group|org|council|order|guild|house|chamber|clan|tribe/.test(rawType)) type = "faction";

        const name = (parts[1] || "").trim();
        if (!name) continue;

        // ── Hard exact-name dedup ─────────────────────────────────────────────
        // Reject if this name (case-insensitive) is already in lore or candidates
        if (existingNames.has(name.toLowerCase())) continue;
        // ─────────────────────────────────────────────────────────────────────

        // ── Grounding check ───────────────────────────────────────────────────
        // The name must appear verbatim in the source text (whole-word match)
        const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const namePattern = new RegExp(`\\b${escapedName}\\b`, "i");
        if (!namePattern.test(responseText)) continue;
        // ─────────────────────────────────────────────────────────────────────

        const desc = parts.slice(2).join(" — ").trim() || line;

        const candidate = {
          id: `cand_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
          type,
          name,
          description: desc,
        };

        // Fuzzy duplicate check against existing lore
        const match = findSimilarLore(candidate, active.lore ?? [], 0.85);
        if (match) {
          // Similar entry exists — queue for user review (update vs dismiss)
          books.addLorePending({
            candidate,
            existingId: match.item.id,
            similarity: match.similarity,
            confidence: 1 - match.similarity,
          });
        } else {
          // Genuinely new — add as a candidate chip for user to keep/cancel
          books.addCandidate(candidate);
          existingNames.add(name.toLowerCase()); // prevent later lines in same batch from duping
        }
      }
    } catch {
      // Silent best-effort — never disrupt the user
    }
  }

  function detectGoalsAndAdd(responseText: string) {
    const foundGoals: string[] = [];

    // Pattern A: **Core X.Y: Title Here** — title is INSIDE bold markers WITH a prefix
    // e.g. "- **Core 3.6: Regional Fracture Zones**, detailing..."
    const regexBoldWithPrefix = /\*\*(?:Core|Subtopic)\s*\d+(?:\.\d+)*:\s*([^*]+?)\*\*/gi;
    let m;
    while ((m = regexBoldWithPrefix.exec(responseText)) !== null) {
      if (m[1]) foundGoals.push(m[1].trim());
    }

    // Pattern B: ### [Core] X.Y: **Title** — title is OUTSIDE bold markers after heading
    // e.g. "### Core 3.2: **The Spire's Council**"
    const regexHeadingBold = /(?:###?\s*)?(?:Core|Subtopic)?\s*\d+(?:\.\d+)*:\s*\*\*([^*]+)\*\*/gi;
    while ((m = regexHeadingBold.exec(responseText)) !== null) {
      if (m[1]) foundGoals.push(m[1].trim());
    }

    // Deduplicate
    const uniqueGoals = Array.from(new Set(foundGoals)).filter(Boolean);

    uniqueGoals.forEach((goalTitle) => {
      const exists = (active.goals ?? []).some(
        (g) => g.title.toLowerCase() === goalTitle.toLowerCase()
      );
      if (!exists) {
        books.addGoal(goalTitle);
      }
    });

    if (uniqueGoals.length > 0) {
      toastSuccess(`🎯 ${uniqueGoals.length} goal${uniqueGoals.length > 1 ? "s" : ""} detected`);
    }
  }

  // insertAsLore: manually promote a brainstorm reply to the lore library
  async function insertAsLore(text: string) {
    try {
      const { content } = await invokeAssistant({
        data: {
          mode: "extract",
          action: [
            "Extract a single named story-world entity from the TEXT.",
            "Output ONLY in the exact format: TYPE — NAME — description",
            "Valid TYPEs: character | place | concept | faction",
            "Use 'faction' for any group, organization, council, or order.",
            "Do NOT add numbers, bullets, or introductory remarks.",
          ].join("\n"),
          context: `TEXT:\n${text}`,
        },
      });
      const parts = content.split("—").map((p) => p.trim());
      const rawType = (parts[0] || "").toLowerCase();
      let type: "character" | "place" | "concept" | "faction" = "concept";
      if (/char|person|protagonist|npc/.test(rawType)) type = "character";
      else if (/place|location|city|region|land|realm/.test(rawType)) type = "place";
      else if (/faction|group|org|council|order|guild|house|chamber|clan|tribe/.test(rawType)) type = "faction";
      const name = parts[1] || "Extracted Lore";
      const desc = parts.slice(2).join(" — ").trim() || text.trim();

      // Hard exact-name check first
      const exactMatch = (active.lore ?? []).some(
        (l) => l.name.trim().toLowerCase() === name.trim().toLowerCase()
      );
      if (exactMatch) {
        toastSuccess(`"${name}" is already in your Lore.`);
        return;
      }

      // Fuzzy duplicate check
      const candidate = { id: `l${Date.now()}`, type, name, description: desc };
      const match = findSimilarLore(candidate, active.lore ?? [], 0.85);
      if (match) {
        toastSuccess(`Similar lore exists — "${match.item.name}" already covers this.`);
      } else {
        books.addLore({ type, name, description: desc });
        toastSuccess(`Added to Lore: ${name} (${type})`);
      }
    } catch {
      // Fallback: add raw text as a concept
      books.addLore({ type: "concept", name: "Extracted Item", description: text.trim() });
      toastSuccess("Added to Lore as a concept");

  }
}


  const cores = active.cores;
  const [quickQueryOpen, setQuickQueryOpen] = useState(false);

  // Shortcut handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ctrl+Shift+Q -> Open Quick Query
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "q") {
        e.preventDefault();
        setQuickQueryOpen(true);
        return;
      }
      // Ctrl+K -> focus composer textarea
      if (e.ctrlKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        composerInputRef.current?.focus();
        return;
      }
      // Ctrl+Enter -> send message (if not busy)
      if (e.ctrlKey && e.key === "Enter") {
        e.preventDefault();
        if (!busy && input.trim()) {
          // emulate form submit
          (document.activeElement as HTMLElement)?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
        }
        return;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [busy, input]);

  // File / image attachment refs
  const fileRef = useRef<HTMLInputElement | null>(null);
  const imageRef = useRef<HTMLInputElement | null>(null);

  function handleFileAttach(e: React.ChangeEvent<HTMLInputElement>, type: "file" | "image") {
    const f = e.target.files?.[0];
    if (!f) return;
    const label = type === "image" ? `[Image: ${f.name}]` : `[File: ${f.name}]`;
    setInput((v) => (v ? `${v}\n${label}` : label));
    adjustTextareaHeight();
    toastSuccess(`${type === "image" ? "Image" : "File"} attached: ${f.name}`);
    e.target.value = "";
  }

  return (
    <div className="flex h-full flex-col">
      {/* Hidden file inputs for attachment */}
      <input
        ref={fileRef}
        type="file"
        className="hidden"
        accept=".txt,.md,.pdf,.doc,.docx"
        onChange={(e) => handleFileAttach(e, "file")}
      />
      <input
        ref={imageRef}
        type="file"
        className="hidden"
        accept="image/*"
        onChange={(e) => handleFileAttach(e, "image")}
      />

      <ContextStrip book={active} books={books} value={ctx} onChange={setCtx} onOpenTab={onOpenTab} />

      {/* Quick Query Lightbox */}
      {quickQueryOpen && (
        <QuickQueryLightbox onClose={() => setQuickQueryOpen(false)} />
      )}

      {/* Chat scroll area */}
      <div 
        ref={scrollRef} 
        className="thin-scrollbar flex-1 overflow-y-auto py-3"
      >
        <div className={cn("mx-auto px-4 space-y-2.5 w-full transition-all duration-300", wideMode ? "max-w-none" : "max-w-2xl")}>
          {feed.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border p-6 text-center text-[13px] text-muted-foreground">
              <Wand2 className="mx-auto mb-2 h-4 w-4" />
              {books.activeBranchId 
                ? "This branch is empty. Ask a question to start the branch feed." 
                : "Chat freely — I remember your cores, lore, and this thread."}
            </div>
          )}
          {activeBranch && (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
              <span className="font-semibold shrink-0">🌱 Branched from:</span>
              <span className="italic opacity-85 truncate">
                {activeBranch.originSnippet || "Previous point"}
              </span>
            </div>
          )}
            {feed.map((m, idx) => {
              const messageBranches = (books.branches ?? []).filter((b) => b.originMsgId === m.id);
              return (
                <div key={m.id} className="space-y-2">
                  {m.role === "user" ? (
                    <UserBubble message={m} onDelete={() => books.removeBrainstorm(m.id)} />
                  ) : (
                    <div className="relative">
                      <AssistantBubble
                        message={m}
                        completedActivities={messageActivitiesMapRef.current[m.id] ?? []}
                        cores={cores}
                        onDelete={() => books.removeBrainstorm(m.id)}
                        onCopy={() => copyText(m.content, "Reply copied")}
                        onAppend={() => insertAtCursor(m.content)}
                        onInsertCore={() => insertAsCore(m.content)}
                        onBranch={books.activeBranchId || (books.branches ?? []).some((b) => b.originMsgId === m.id) ? undefined : () => handleCreateBranch(m)}
                        showPromotionNudge={!!books.activeBranchId && feed.length >= 5 && idx === feed.length - 1}
                        onPromoteToLore={() => insertAsLore(m.content)}
                        onPromoteToCore={() => insertAsCore(m.content)}
                        onSuggestFix={async () => {
                          const { content } = await invokeAssistant({
                            data: {
                              mode: "suggest_fix",
                              action: "Suggest 3 fixes for this critic note.",
                              context: `CRITIC NOTE:\n${m.content}`,
                            },
                          });
                          books.addBrainstorm({
                            role: "assistant",
                            mode: "critic",
                            content: `FIX OPTIONS:\n${content.trim()}`,
                          });
                        }}
                        onAddOptionToCore={(option, coreId, subcard) => {
                          if (coreId === "__new__") {
                            const id = books.addCore({ title: option.slice(0, 40), emoji: "◇" });
                            if (id) books.addCoreBlock(id, { title: "Fix", body: option });
                            toastSuccess("Added as new Core");
                          } else {
                            books.addCoreBlock(coreId, { title: subcard || "Fix", body: option });
                            toastSuccess("Added to Core");
                          }
                        }}
                      />
                      {/* Show candidate chips after the LAST assistant message */}
                      {idx === feed.length - 1 && (active.candidates ?? []).length > 0 && (
                        <div className="mt-2">
                          <CandidateChips
                            books={books}
                            candidates={active.candidates ?? []}
                            onAccept={(item) => {
                              const match = findSimilarLore(item, active.lore ?? [], 0.75);
                              if (match) {
                                books.addLorePending({
                                  candidate: item,
                                  existingId: match.item.id,
                                  similarity: match.similarity,
                                  confidence: 1 - match.similarity,
                                });
                                books.removeCandidate(item.id);
                              } else {
                                books.addLore({ type: item.type, name: item.name, description: item.description });
                                books.removeCandidate(item.id);
                                toastSuccess(`Added ${item.name} to Lore`);
                              }
                            }}
                            onDismiss={(id) => books.removeCandidate(id)}
                          />
                        </div>
                      )}
                      {/* Lore duplicate resolution cards */}
                      {idx === feed.length - 1 && (active.lorePending ?? []).length > 0 && (
                        <div className="mt-2 space-y-2">
                          {(active.lorePending ?? []).map((pending) => (
                            <LoreDuplicateCard key={pending.id} books={books} pending={pending} />
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Branch start indicator links */}
                  {!books.activeBranchId && messageBranches.map((br) => (
                    <div
                      key={br.id}
                      className={cn(
                        "flex items-center justify-between rounded-2xl border border-indigo-500/20 bg-indigo-500/5 px-3 py-1.5 text-xs text-indigo-700 dark:text-indigo-300 animate-slide-up-fade",
                        m.role === "user" ? "ml-auto max-w-[85%]" : "w-full"
                      )}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <GitBranch className="h-3.5 w-3.5 shrink-0 text-indigo-500 animate-pulse" />
                        <span className="font-semibold shrink-0">Sub-branch here:</span>
                        <span className="italic truncate font-medium">"{br.name}"</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          books.setActiveBranch(br.id);
                          toastSuccess(`Switched to branch: ${br.name}`);
                        }}
                        className="ml-3 text-[11px] font-bold text-primary hover:underline shrink-0"
                      >
                        Switch to path →
                      </button>
                    </div>
                  ))}
                </div>
              );
            })}

            {/* Live AI Activity Stream (during wait/generation) */}
            {busy && (
              <div className="rounded-2xl border border-border/40 bg-muted/10 p-3.5 space-y-3 animate-slide-up-fade">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[color:var(--writer)]">
                  <Loader2 className="h-3 w-3 animate-spin text-primary" />
                  <span>AI is thinking...</span>
                </div>
                <div className="space-y-1 border-l-2 border-border/50 pl-3">
                  {activities.map((act) => (
                    <ActivityRow key={act.id} act={act} />
                  ))}
                </div>
              </div>
            )}
        </div>
      </div>

      {/* Retry banner — shown after a failed request */}
      {lastFailed && !busy && (
        <div className="mx-auto mb-1 flex items-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-[12px] text-destructive" style={{ maxWidth: wideMode ? undefined : "42rem" }}>
          <X className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1">Request failed.</span>
          <button
            type="button"
            onClick={() => send(lastFailed.mode, lastFailed.text)}
            className="flex items-center gap-1 rounded-lg bg-destructive/10 px-2 py-1 font-semibold hover:bg-destructive/20 transition"
          >
            <RefreshCw className="h-3 w-3" /> Retry
          </button>
          <button
            type="button"
            onClick={() => setLastFailed(null)}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Mention Autocomplete Dropup */}
      {mentionQuery !== null && suggestions.length > 0 && (
        <div ref={dropdownRef} className={cn("mx-auto px-3 mb-1.5 w-full transition-all duration-300", wideMode ? "max-w-none" : "max-w-2xl")}>
          <div className="overflow-hidden rounded-[1.5rem] border border-border bg-card shadow-lg animate-slide-up-fade">
            <div className="bg-muted/40 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/40">
              Mention Suggestions (Adds to Context)
            </div>
            <div className="divide-y divide-border/45 max-h-48 overflow-y-auto no-scrollbar">
              {suggestions.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => selectSuggestion(item)}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-xs hover:bg-primary/5 dark:hover:bg-primary/10 focus:bg-primary/5 outline-none transition-colors"
                >
                  <span className="font-semibold text-foreground">{item.name}</span>
                  <span className="text-[9.5px] text-muted-foreground font-mono bg-muted/80 px-1.5 py-0.5 rounded-md">
                    {item.subtype}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send("chat");
        }}
        className="border-t border-border/60 bg-background px-3 py-2 shrink-0"
      >
        <div className={cn("mx-auto w-full transition-all duration-300", wideMode ? "max-w-none" : "max-w-2xl")}>
          <div className={cn(
            "flex items-start gap-1 rounded-2xl border bg-card px-2 py-1.5 transition-all duration-200",
            isFocused 
              ? "border-primary/50 ring-1 ring-primary/30 shadow-[0_0_8px_rgba(var(--ring),0.2)]" 
              : "border-border"
          )}>
            {busy ? (
              <Loader2 className="ml-1 mt-1.5 h-3.5 w-3.5 shrink-0 text-primary animate-spin" />
            ) : (
              <Sparkles className="ml-1 mt-1.5 h-3.5 w-3.5 shrink-0 text-muted-foreground animate-pulse" />
            )}
            <textarea
              ref={composerInputRef}
              rows={1}
              value={input}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onChange={(e) => {
                setInput(e.target.value);
                adjustTextareaHeight();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send("chat");
                  if (composerInputRef.current) {
                    composerInputRef.current.style.height = "auto";
                  }
                }
              }}
              placeholder="Ask anything... (@ to mention)"
              className="min-w-0 flex-1 bg-transparent px-1 py-1 text-sm outline-none resize-none no-scrollbar max-h-36 leading-normal"
              style={{ height: "auto" }}
            />

            {/* ── Priority actions (always visible) ── */}
            <div className="flex items-center gap-0.5 border-l border-border/60 pl-1 shrink-0">
              {/* Critic */}
              <button
                type="button"
                disabled={!!busy}
                onClick={() => send("critic")}
                title="Critic — surface plot holes"
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-[color:var(--critic-bg)] hover:text-[color:var(--critic)]",
                  busy === "critic" && "bg-[color:var(--critic-bg)] text-[color:var(--critic)]"
                )}
              >
                <ScanSearch className={cn("h-4 w-4", busy === "critic" && "animate-spin")} />
              </button>
              {/* Debater */}
              <button
                type="button"
                disabled={!!busy}
                onClick={() => send("debater")}
                title="Debater — alternative directions"
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-[color:var(--debater-bg)] hover:text-[color:var(--debater)]",
                  busy === "debater" && "bg-[color:var(--debater-bg)] text-[color:var(--debater)]"
                )}
              >
                <Scale className={cn("h-4 w-4", busy === "debater" && "animate-spin")} />
              </button>
              {/* Rewrite */}
              <button
                type="button"
                disabled={!!busy}
                onClick={() => send("rewrite")}
                title="Rewrite last reply"
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-[color:var(--writer-bg)] hover:text-[color:var(--writer)]",
                  busy === "rewrite" && "bg-[color:var(--writer-bg)] text-[color:var(--writer)]"
                )}
              >
                <RefreshCw className={cn("h-4 w-4", busy === "rewrite" && "animate-spin")} />
              </button>
            </div>

            {/* ── Secondary actions (overflow + goals + send) ── */}
            <div className="flex items-center gap-0.5 border-l border-border/60 pl-1 shrink-0">
              {/* Goals */}
              <GoalPanel books={books} />

              {/* ⚡ Quick Query */}
              <button
                type="button"
                onClick={() => setQuickQueryOpen(true)}
                title="Quick Query — ask a quick question online"
                className="flex h-7 w-7 mt-0.5 items-center justify-center rounded-lg text-muted-foreground hover:bg-amber-500/10 hover:text-amber-500 transition"
              >
                <Zap className="h-3.5 w-3.5" />
              </button>

              {/* … Overflow menu — Wide mode, Include chapter, @ mention */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label="More options"
                    className="flex h-7 w-7 mt-0.5 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
                  >
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>More Options</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem
                    checked={includeChapter}
                    onCheckedChange={setIncludeChapter}
                  >
                    Include chapter text
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={wideMode}
                    onCheckedChange={handleToggleWideMode}
                  >
                    Wide view mode
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuSeparator />
                  {/* @ Mention shortcut */}
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted"
                    onClick={() => {
                      setInput((v) => (v.endsWith("@") ? v : v + (v && !v.endsWith(" ") ? " @" : "@")));
                      setTimeout(() => {
                        if (composerInputRef.current) {
                          composerInputRef.current.focus();
                          adjustTextareaHeight();
                        }
                      }, 20);
                    }}
                  >
                    <AtSign className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Mention lore / core</span>
                  </button>
                  {/* Attach file */}
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted"
                    onClick={() => fileRef.current?.click()}
                  >
                    <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Attach file</span>
                    <span className="ml-auto text-[10px] text-muted-foreground/60">.txt .md .pdf</span>
                  </button>
                  {/* Attach image */}
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted"
                    onClick={() => imageRef.current?.click()}
                  >
                    <Image className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Attach image</span>
                    <span className="ml-auto text-[10px] text-muted-foreground/60">PNG JPG</span>
                  </button>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Send / Cancel */}
              <button
                type={busy ? "button" : "submit"}
                onClick={busy ? cancelRequest : undefined}
                disabled={!busy && !input.trim()}
                className={cn(
                  "flex h-7 w-7 mt-0.5 items-center justify-center rounded-lg transition",
                  busy
                    ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                    : "bg-primary text-primary-foreground disabled:opacity-40"
                )}
                aria-label={busy ? "Cancel" : "Send"}
              >
                {busy ? (
                  <X className="h-3.5 w-3.5" />
                ) : (
                  <ArrowUp className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

function SettingsModal({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" />
      <div ref={ref} className="relative z-10 w-full max-w-md rounded-3xl bg-card p-6 shadow-xl animate-slide-up-fade">
        <div className="flex items-center justify-between border-b pb-3">
          <h2 className="text-lg font-semibold">App Settings & Shortcuts</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-4 space-y-4">
          <section>
            <h3 className="text-sm font-medium mb-2">Keyboard Shortcuts</h3>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="font-medium text-muted-foreground">Ctrl + Shift + Q</dt>
              <dd>Open Quick Query lightbox</dd>
              <dt className="font-medium text-muted-foreground">Ctrl + K</dt>
              <dd>Focus the composer textarea</dd>
              <dt className="font-medium text-muted-foreground">Ctrl + Enter</dt>
              <dd>Send the current message</dd>
              <dt className="font-medium text-muted-foreground">Esc</dt>
              <dd>Close any open modal (Quick Query, Settings)</dd>
            </dl>
          </section>
          <section>
            <h3 className="text-sm font-medium mb-2">Future Settings</h3>
            <p className="text-muted-foreground text-xs">
              The settings page can later host theme toggles, notification preferences, and model selection.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

function SecondaryPill({
  icon: Icon,
  label,
  mode,
  onClick,
  disabled,
  spin,
}: {
  icon: React.ElementType;
  label: string;
  mode: "critic" | "debater" | "writer";
  onClick: () => void;
  disabled?: boolean;
  spin?: boolean;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-2xl border border-border/70 bg-card px-2.5 py-1.5 text-left transition active:scale-[0.98]",
        disabled && "opacity-60",
      )}
    >
      <span
        className={cn(
          "flex h-6 w-6 items-center justify-center rounded-lg",
          mode === "critic" && "bg-[color:var(--critic-bg)] text-[color:var(--critic)]",
          mode === "debater" && "bg-[color:var(--debater-bg)] text-[color:var(--debater)]",
          mode === "writer" && "bg-[color:var(--writer-bg)] text-[color:var(--writer)]",
        )}
      >
        <Icon className={cn("h-3 w-3", spin && "animate-spin")} />
      </span>
      <span className="text-[12px] font-semibold">{label}</span>
    </button>
  );
}

function UserBubble({ message, onDelete }: { message: BrainstormMessage; onDelete: () => void }) {
  return (
    <div className="group flex justify-end">
      <div className="animate-slide-up-fade relative max-w-[85%] rounded-2xl bg-primary px-3.5 py-2 text-[13.5px] text-primary-foreground">
        {message.content}
        <button
          onClick={onDelete}
          className="absolute -right-2 -top-2 hidden h-5 w-5 items-center justify-center rounded-full bg-background text-muted-foreground shadow group-hover:flex"
          aria-label="Delete"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

/** A single row in the activity stream (live or completed) */
function ActivityRow({ act }: { act: ActivityStep }) {
  const [open, setOpen] = useState(false);
  const classifierLabel: Record<string, string> = {
    core: "CORE",
    character: "CHARACTER",
    place: "PLACE",
    concept: "CONCEPT",
  };
  const classifierColor: Record<string, string> = {
    core: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    character: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    place: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    concept: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
  };
  const label = act.classifier ? classifierLabel[act.classifier] : null;
  const color = act.classifier ? classifierColor[act.classifier] : "";
  return (
    <div className="animate-slide-up-fade py-0.5">
      <div className="flex items-center gap-2 text-[11px] font-mono">
        {act.status === "pending" ? (
          <span className="flex h-3 w-3 shrink-0 items-center justify-center">
            <span className="h-1.5 w-1.5 animate-ping rounded-full bg-primary" />
          </span>
        ) : (
          <span className="shrink-0 font-bold text-green-500">✓</span>
        )}
        {label && act.classifier !== "process" && (
          <span className={cn("shrink-0 rounded px-1 py-0.5 text-[9px] font-bold uppercase tracking-wider", color)}>
            {label}
          </span>
        )}
        <span className={cn("flex-1", act.status === "pending" ? "font-semibold text-foreground" : "text-muted-foreground")}>
          {act.status === "pending" ? `${act.text}...` : act.text}
        </span>
        {act.refContent && act.status === "done" && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="ml-1 shrink-0 rounded px-1 py-0.5 text-[9px] font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition"
          >
            {open ? "▲ hide" : "▼ view"}
          </button>
        )}
      </div>
      {open && act.refContent && (
        <div className="mt-1 ml-5 rounded-xl border border-border/50 bg-muted/30 px-2.5 py-2 text-[11px] font-sans text-muted-foreground whitespace-pre-wrap leading-relaxed">
          {act.refContent}
        </div>
      )}
    </div>
  );
}

function AssistantBubble({
  message,
  cores,
  completedActivities = [],
  onDelete,
  onCopy,
  onAppend,
  onInsertCore,
  onSuggestFix,
  onAddOptionToCore,
  onBranch,
  showPromotionNudge = false,
  onPromoteToLore,
  onPromoteToCore,
}: {
  message: BrainstormMessage;
  cores: Core[];
  completedActivities?: ActivityStep[];
  onDelete: () => void;
  onCopy: () => void;
  onAppend: () => void;
  onInsertCore: () => void;
  onSuggestFix: () => Promise<void>;
  onAddOptionToCore: (option: string, coreId: string, subcard?: string) => void;
  onBranch?: () => void;
  showPromotionNudge?: boolean;
  onPromoteToLore?: () => void;
  onPromoteToCore?: () => void;
}) {
  const [suggesting, setSuggesting] = useState(false);
  const [showThoughts, setShowThoughts] = useState(false);
  const [openFor, setOpenFor] = useState<string | null>(null);
  const tone =
    message.mode === "critic"
      ? {
          bg: "bg-[color:var(--critic-bg)]",
          text: "text-[color:var(--critic)]",
          Icon: ScanSearch,
          label: "Critic",
        }
      : message.mode === "debater"
        ? {
            bg: "bg-[color:var(--debater-bg)]",
            text: "text-[color:var(--debater)]",
            Icon: Scale,
            label: "Debater",
          }
        : {
            bg: "bg-transparent",
            text: "text-[color:var(--writer)]",
            Icon: Sparkles,
            label: "AI",
          };
  const Icon = tone.Icon;
  // Streaming: only animate NEW messages; old ones appear instantly.
  const alreadyStreamed = _streamedMessageIds.has(message.id);
  const [displayedContent, setDisplayedContent] = useState(
    alreadyStreamed ? message.content : ""
  );

  useEffect(() => {
    // If this message was already streamed before, show full content immediately
    if (_streamedMessageIds.has(message.id)) {
      setDisplayedContent(message.content);
      return;
    }
    // Animate word-by-word for a fresh message
    const words = message.content.split(/\s+/);
    let index = 0;
    const interval = setInterval(() => {
      setDisplayedContent((prev: string) => (prev ? prev + " " : "") + words[index]);
      index++;
      if (index >= words.length) {
        clearInterval(interval);
        _streamedMessageIds.add(message.id); // mark as done in memory
        _saveStreamedId(message.id);          // persist so page refresh skips animation
      }
    }, 50);
    return () => clearInterval(interval);
  }, [message.id, message.content]);

  const isFixList = /^FIX OPTIONS:/i.test(message.content);
  const options = isFixList
    ? message.content
        .replace(/^FIX OPTIONS:\s*/i, "")
        .split(/\n+/)
        .map((l: string) => l.replace(/^[-*•\d.)\s]+/, "").trim())
        .filter(Boolean)
    : [];

  return (
    <div className={cn("group animate-slide-up-fade relative rounded-2xl p-3", tone.bg)}>
      <button
        onClick={onDelete}
        aria-label="Delete"
        className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-background/90 text-muted-foreground shadow-sm ring-1 ring-border/60 hover:bg-background hover:text-foreground"
      >
        <X className="h-3.5 w-3.5" />
      </button>
      <div className={cn("mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold", tone.text)}>
        <Icon className="h-3 w-3" /> {tone.label}
      </div>

      {/* Collapsible Used Context */}
      <details className="mb-2 text-[11px] font-mono text-muted-foreground group/details">
        <summary className="flex cursor-pointer select-none items-center gap-1.5 font-sans font-bold text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground outline-none">
          <ChevronDown className="h-3.5 w-3.5 transition-transform group-open/details:rotate-180" />
          Used Context
        </summary>
        <div className="mt-1.5 space-y-0.5 border-l-2 border-border/40 pl-3">
          {completedActivities.length > 0 ? (
            completedActivities.map((act) => <ActivityRow key={act.id} act={act} />)
          ) : (
            // Fallback for messages generated before the activity tracking was added
            ["Read Focus Session", "Checked Core & Lore continuity", "Compared possibilities", "Prepared response"].map((s) => (
              <div key={s} className="flex items-center gap-2 py-0.5 text-[11px] font-mono text-muted-foreground">
                <span className="font-bold text-green-500">✓</span><span>{s}</span>
              </div>
            ))
          )}
        </div>
      </details>

      {message.thought && (
        <div className="mb-2 rounded-xl bg-muted/40 p-2.5 text-xs text-muted-foreground/80 border border-border/40 font-mono">
          <button
            onClick={() => setShowThoughts((v) => !v)}
            className="flex items-center gap-1.5 font-sans font-semibold text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
          >
            <Sparkles className="h-3 w-3 text-primary animate-pulse" />
            {showThoughts ? "Hide AI Thought Process" : "Show AI Thought Process"}
          </button>
          {showThoughts && (
            <div className="mt-1.5 whitespace-pre-wrap pl-2 border-l-2 border-primary/30 leading-relaxed text-[11px]">
              {message.thought}
            </div>
          )}
        </div>
      )}

      <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed">{displayedContent}</p>

      {isFixList && (
        <div className="mt-3 space-y-2">
          {options.map((opt: string, i: number) => (
            <div key={i} className="rounded-xl border border-border/60 bg-background p-2.5">
              <div className="text-[12.5px]">{opt}</div>
              <div className="mt-1.5 flex items-center gap-1.5">
                <button
                  onClick={() => setOpenFor(openFor === `${i}` ? null : `${i}`)}
                  className="flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-[10.5px] font-semibold"
                >
                  <Plus className="h-3 w-3" /> Add to core <ChevronDown className="h-3 w-3" />
                </button>
              </div>
              {openFor === `${i}` && (
                <div className="mt-2 space-y-1 rounded-lg border border-border/60 bg-card p-2">
                  <button
                    onClick={() => {
                      onAddOptionToCore(opt, "__new__");
                      setOpenFor(null);
                    }}
                    className="block w-full rounded px-2 py-1 text-left text-[11.5px] hover:bg-muted"
                  >
                    + Add as new Core
                  </button>
                  {cores.map((c, ci) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        onAddOptionToCore(opt, c.id, `Fix ${(c.blocks.length ?? 0) + 1}`);
                        setOpenFor(null);
                      }}
                      className="block w-full rounded px-2 py-1 text-left text-[11.5px] hover:bg-muted"
                    >
                      Core {ci + 1}: {c.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-2.5 flex flex-wrap gap-1.5">
        <MiniBtn icon={Feather} label="Append" onClick={onAppend} />
        <MiniBtn icon={Plus} label="→ Core" onClick={onInsertCore} />
        <MiniBtn icon={Copy} label="Copy" onClick={onCopy} />
        {onBranch && <MiniBtn icon={GitBranch} label="Explore" onClick={onBranch} />}
        {message.mode === "critic" && !isFixList && (
          <MiniBtn
            icon={suggesting ? Loader2 : Replace}
            spin={suggesting}
            label="Suggest Fix"
            onClick={async () => {
              setSuggesting(true);
              try {
                await onSuggestFix();
              } finally {
                setSuggesting(false);
              }
            }}
          />
        )}
        <MiniBtn icon={X} label="Delete" onClick={onDelete} />
      </div>

      {showPromotionNudge && (
        <div className="mt-3 flex items-center justify-between border-t border-amber-500/10 pt-2.5">
          <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
            <Sparkles className="h-3 w-3 animate-pulse text-amber-500" />
            💡 Settled? Send to:
          </span>
          <div className="flex gap-1.5">
            <button
              onClick={onPromoteToLore}
              className="rounded-full bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-1 text-[10.5px] font-bold text-amber-700 dark:text-amber-400 transition"
            >
              → Lore
            </button>
            <button
              onClick={onPromoteToCore}
              className="rounded-full bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-1 text-[10.5px] font-bold text-amber-700 dark:text-amber-400 transition"
            >
              → Core
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MiniBtn({
  icon: Icon,
  label,
  onClick,
  spin,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  spin?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-7 items-center gap-1 rounded-full bg-muted px-2.5 text-[11px] font-semibold hover:bg-muted/70"
    >
      <Icon className={cn("h-3 w-3", spin && "animate-spin")} /> {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// QuickQueryLightbox — lightweight floating composer for one-off questions
// ---------------------------------------------------------------------------
interface QQMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

function QuickQueryLightbox({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<QQMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Auto-focus on open
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 60);
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  async function ask() {
    const text = input.trim();
    if (!text || busy) return;
    setError(null);
    setInput("");
    const userMsg: QQMessage = { id: `qq${Date.now()}`, role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setBusy(true);

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      // Build a short conversation history for multi-turn context
      const historyCtx = messages
        .slice(-6)
        .map((m) => `${m.role === "user" ? "USER" : "ASSISTANT"}: ${m.content}`)
        .join("\n");

      const { content } = await invokeAssistant({
        data: {
          mode: "quick_query",
          action: text,
          context: historyCtx
            ? `PREVIOUS EXCHANGE (for context):\n${historyCtx}`
            : "(no prior context)",
        },
        signal: abort.signal,
      });

      const asstMsg: QQMessage = {
        id: `qq${Date.now()}a`,
        role: "assistant",
        content: content.trim(),
      };
      setMessages((prev) => [...prev, asstMsg]);
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return;
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setBusy(false);
      abortRef.current = null;
      setTimeout(() => inputRef.current?.focus(), 40);
    }
  }

  function cancel() {
    abortRef.current?.abort();
    setBusy(false);
  }

  function adjustHeight() {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label="Quick Query"
    >
      {/* Blurred backdrop */}
      <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" />

      {/* Panel */}
      <div className="relative z-10 flex w-full max-w-lg flex-col rounded-3xl border border-border bg-card shadow-2xl animate-slide-up-fade overflow-hidden"
        style={{ maxHeight: "80dvh" }}
      >
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
          <Zap className="h-4 w-4 text-amber-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold leading-tight">Quick Query</p>
            <p className="text-[10px] text-muted-foreground leading-tight">
              Ask anything — drawing on general knowledge
            </p>
          </div>
          {/* Online indicator */}
          <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-500">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </span>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition ml-1"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Message thread */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 py-3 space-y-3 no-scrollbar"
          style={{ minHeight: messages.length === 0 ? "0px" : "120px" }}
        >
          {messages.length === 0 && !busy && (
            <div className="py-6 text-center text-[12px] text-muted-foreground">
              <Zap className="mx-auto mb-2 h-5 w-5 text-amber-400/60" />
              Ask a quick question — writing tips, mythology, world-building facts, anything.
            </div>
          )}
          {messages.map((m) => (
            <div
              key={m.id}
              className={cn(
                "rounded-2xl px-3 py-2 text-[13px] leading-relaxed animate-slide-up-fade",
                m.role === "user"
                  ? "ml-6 bg-primary text-primary-foreground"
                  : "mr-6 bg-muted/60 text-foreground whitespace-pre-wrap"
              )}
            >
              {m.content}
            </div>
          ))}
          {busy && (
            <div className="mr-6 flex items-center gap-2 rounded-2xl bg-muted/40 px-3 py-2.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary shrink-0" />
              <span className="text-[12px] text-muted-foreground font-mono">Thinking...</span>
            </div>
          )}
          {error && (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-[12px] text-destructive">
              {error}
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="border-t border-border/60 px-3 py-2.5">
          <div className="flex items-end gap-2 rounded-2xl border border-border bg-background px-3 py-1.5 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/30 transition">
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => { setInput(e.target.value); adjustHeight(); }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  ask();
                  if (inputRef.current) inputRef.current.style.height = "auto";
                }
              }}
              placeholder="Type your question... (Enter to send)"
              className="min-w-0 flex-1 bg-transparent py-1 text-sm outline-none resize-none no-scrollbar max-h-28 leading-normal"
              style={{ height: "auto" }}
              disabled={busy}
            />
            <button
              type="button"
              onClick={busy ? cancel : ask}
              disabled={!busy && !input.trim()}
              className={cn(
                "mb-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition",
                busy
                  ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                  : "bg-amber-500 text-white hover:bg-amber-400 disabled:opacity-40"
              )}
              aria-label={busy ? "Cancel" : "Ask"}
            >
              {busy ? <X className="h-3.5 w-3.5" /> : <ArrowUp className="h-4 w-4" />}
            </button>
          </div>
          <p className="mt-1 px-1 text-[10px] text-muted-foreground">
            Shift+Enter for new line · Esc to close
          </p>
        </div>
      </div>
    </div>
  );
}
