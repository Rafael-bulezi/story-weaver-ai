import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Wand2, GitBranch, X, RefreshCw } from "lucide-react";

import type { BooksApi, BrainstormMessage, Branch, ContextUsage, PinnedContextItem } from "@/lib/story-store";
import { buildSelectiveContext } from "@/lib/story-store";
import { invokeAssistant } from "@/lib/ai.functions";
import { cn } from "@/lib/utils";
import { toastSuccess, toastError, copyText } from "@/lib/toast";
import { LiveContextStrip } from "@/components/story/LiveContextStrip";
import { ContextManagerSheet } from "@/components/story/ContextManagerSheet";
import { CandidateChips, LoreDuplicateCard } from "@/components/story/WorthKeeping";
import { buildContextualSteps, type HierarchicalStep, leavesOf } from "@/components/story/ActivityStream";
import { QuickQueryLightbox } from "@/components/story/QuickQueryLightbox";
import { UserBubble, AssistantBubble } from "@/components/story/BrainstormMessageBubble";
import { AgentExecutionLog } from "@/components/story/AgentExecutionLog";
import { BrainstormComposer } from "@/components/story/BrainstormComposer";
import { useBrainstormExtraction } from "@/components/story/useBrainstormExtraction";
import { BrainstormAnswerRail, clearRailTitleCache, flashAnswer } from "@/components/story/BrainstormAnswerRail";

export interface ContextSelection {
  coreIds: string[];
  loreIds: string[];
}

export function BrainstormTab({
  books,
  editorRef,
  onSwitchToChat,
  onOpenTab,
}: {
  books: BooksApi;
  editorRef: React.MutableRefObject<HTMLTextAreaElement | null>;
  onSwitchToChat: () => void;
  onOpenTab?: (tab: "lore" | "cores", loreId?: string) => void;
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
  const [lastFailed, setLastFailed] = useState<{ mode: "chat" | "critic" | "debater" | "rewrite"; text: string; userMsgId?: string } | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [managerOpen, setManagerOpen] = useState(false);

  // ── Answer Rail States & Logic ──
  const [selectedAnswerId, setSelectedAnswerId] = useState<string | null>(null);
  const userNavigatedDuringRun = useRef(false);
  const prevBusyRef = useRef<string | null>(null);

  // Track the running assistant message explicitly
  const runningId = useMemo(() => {
    if (!busy) return null;
    return [...feed].reverse().find((m) => m.role === "assistant")?.id ?? null;
  }, [feed, busy]);

  // Reset user navigation tracking when a new busy run starts
  useEffect(() => {
    if (busy) {
      userNavigatedDuringRun.current = false;
    }
  }, [busy]);

  // Auto-select newest assistant message when busy finishes only if user didn't navigate away during run
  useEffect(() => {
    if (prevBusyRef.current && !busy && !userNavigatedDuringRun.current) {
      const newestAssistant = [...feed].reverse().find((m) => m.role === "assistant");
      if (newestAssistant) {
        setSelectedAnswerId(newestAssistant.id);
        flashAnswer(newestAssistant.id);
      }
    }
    prevBusyRef.current = busy;
  }, [busy, feed]);

  // Chapter switch: clear selected ID and module title cache to avoid memory leak
  useEffect(() => {
    setSelectedAnswerId(null);
    clearRailTitleCache();
  }, [active.id]);

  const handleSelectAnswer = useCallback((id: string, opts?: { userInitiated?: boolean }) => {
    if (busy && opts?.userInitiated) {
      userNavigatedDuringRun.current = true;
    }
    setSelectedAnswerId(id);
  }, [busy]);

  const handleDeleteMessage = useCallback((id: string) => {
    if (selectedAnswerId === id) {
      const assistantIds = feed.filter((m) => m.role === "assistant").map((m) => m.id);
      const idx = assistantIds.indexOf(id);
      const fallback = assistantIds[idx - 1] ?? assistantIds[idx + 1] ?? null;
      setSelectedAnswerId(fallback);
    }
    books.removeBrainstorm(id);
  }, [selectedAnswerId, feed, books]);

  const [wideMode, setWideMode] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sc:wide-brainstorm") === "true";
    }
    return false;
  });

  const handleToggleWideMode = (val: boolean) => {
    setWideMode(val);
    if (typeof window !== "undefined") {
      localStorage.setItem("sc:wide-brainstorm", String(val));
    }
  };
  
  // 1. Persistent author intent (pinned context selection)
  const [ctx, setCtx] = useState<ContextSelection>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(`sc:context:${active.id}`);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch { /* ignore fallback */ }
      }
    }
    return { coreIds: [], loreIds: [] };
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(`sc:context:${active.id}`, JSON.stringify(ctx));
    }
  }, [ctx, active.id]);

  // 2. Resolve pinned items for LiveContextStrip
  const pinnedItems: PinnedContextItem[] = useMemo(() => {
    const items: PinnedContextItem[] = [];
    ctx.coreIds.forEach((id) => {
      const c = active.cores.find((x) => x.id === id);
      if (c) items.push({ id, label: c.title, type: "core" });
    });
    ctx.loreIds.forEach((id) => {
      const l = active.lore.find((x) => x.id === id);
      if (l) items.push({ id, label: l.name, type: "lore" });
    });
    return items;
  }, [active.cores, active.lore, ctx]);

  const handleTogglePinned = (id: string, type: "core" | "lore") => {
    setCtx((prev) => {
      const key = type === "core" ? "coreIds" : "loreIds";
      const exists = prev[key].includes(id);
      return {
        ...prev,
        [key]: exists ? prev[key].filter((x) => x !== id) : [...prev[key], id],
      };
    });
  };

  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Live activity stream — hierarchical step tree
  const [activities, setActivities] = useState<HierarchicalStep[]>([]);
  const [logExpanded, setLogExpanded] = useState(false);
  const messageActivitiesMapRef = useRef<Record<string, HierarchicalStep[]>>({});
  const activitiesRef = useRef<HierarchicalStep[]>([]);
  const ctxRef = useRef(ctx);
  ctxRef.current = ctx;
  const activeRef = useRef(active);
  activeRef.current = active;

  useEffect(() => { activitiesRef.current = activities; }, [activities]);

  // 3. Ephemeral agent context usage derived from active step
  const currentUsage: ContextUsage = useMemo(() => {
    if (!busy) return { kind: "none" };
    const leaves = activities.flatMap(leavesOf);
    const activeLeaf = leaves.find((l) => l.state === "active");
    if (activeLeaf && activeLeaf.label) {
      return {
        kind: "agent-used",
        entityIds: [],
        label: activeLeaf.label,
      };
    }
    return { kind: "none" };
  }, [busy, activities]);

  const {
    silentExtractLore,
    detectGoalsAndAdd,
    generateRecommendations,
    insertAsLore,
    autoNameBranch,
  } = useBrainstormExtraction(books);

  // Build and animate contextual hierarchical steps when busy starts; freeze when done
  useEffect(() => {
    if (!busy) {
      setActivities((prev) => {
        if (prev.length === 0) return prev;
        const markComplete = (nodes: HierarchicalStep[]): HierarchicalStep[] =>
          nodes.map((node) => ({
            ...node,
            state: node.children && node.children.length > 0 ? undefined : "complete",
            children: node.children ? markComplete(node.children) : undefined,
          }));
        return markComplete(prev);
      });
      return;
    }

    const initialTree = buildContextualSteps(activeRef.current, ctxRef.current);
    const leaves = leavesOf({ id: "root", label: "root", icon: "spark", children: initialTree });
    if (leaves.length > 0) {
      leaves[0].state = "active";
    }
    setActivities(initialTree);

    let activeLeafIndex = 0;
    const interval = setInterval(() => {
      setActivities((prevTree) => {
        if (prevTree.length === 0) return prevTree;
        const currentLeaves = leavesOf({ id: "root", label: "root", icon: "spark", children: prevTree });
        if (activeLeafIndex < currentLeaves.length) {
          currentLeaves[activeLeafIndex].state = "complete";
          activeLeafIndex++;
          if (activeLeafIndex < currentLeaves.length) {
            currentLeaves[activeLeafIndex].state = "active";
          }
        }
        return [...prevTree];
      });
    }, 1200);

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
    return () => document.removeEventListener("mousedown", handleClickOutside);
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

  const suggestions = useMemo(() => {
    if (mentionQuery === null) return [];
    const list: Array<{ id: string; name: string; type: "core" | "lore"; subtype?: string }> = [];
    active.cores.forEach((c, idx) => {
      list.push({ id: c.id, name: c.title, type: "core", subtype: `Core ${idx + 1}` });
    });
    active.lore.forEach((l) => {
      list.push({ id: l.id, name: l.name, type: "lore", subtype: l.type.toUpperCase() });
    });
    return list.filter((item) => item.name.toLowerCase().includes(mentionQuery)).slice(0, 5);
  }, [mentionQuery, active.cores, active.lore]);

  const selectSuggestion = (item: { id: string; name: string; type: "core" | "lore" }) => {
    const completedInput = input.replace(/@\w*$/, `${item.name} `);
    setInput(completedInput);
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
        action = "Review the recent brainstorm and current story context for plot holes, inconsistency vs cores/lore, or thin motivation.";
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
      if (addedMsg?.id) {
        messageActivitiesMapRef.current[addedMsg.id] = activitiesRef.current.map((a) => ({
          ...a,
          status: "done" as const,
        }));
      }
      if (mode === "chat" || mode === "rewrite") {
        silentExtractLore(content.trim()).catch(() => {});
        detectGoalsAndAdd(content.trim());
        if (addedMsg?.id) {
          generateRecommendations(addedMsg.id, content.trim());
        }
      }
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return;
      const msg = e instanceof Error ? e.message : "AI request failed";
      toastError(msg);
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
      const coreTitle = (title || "New Core").trim().replace(/^["'`]|["'`]$/g, "").slice(0, 60) || "New Core";
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
      autoNameBranch(newBranchId, msg.content);
    }
  };

  const cores = active.cores;
  const [quickQueryOpen, setQuickQueryOpen] = useState(false);

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

  // Chapter and branch scope label
  const chapterScopeLabel = useMemo(() => {
    const ch = active.chapters?.[0];
    const chName = ch?.title || "Overview";
    const brName = activeBranch ? activeBranch.name : "MAIN CANON";
    return `${chName} · ${brName}`;
  }, [active.chapters, activeBranch]);

  return (
    <div className="flex h-full flex-row overflow-hidden">
      <input ref={fileRef} type="file" className="hidden" accept=".txt,.md,.pdf,.doc,.docx" onChange={(e) => handleFileAttach(e, "file")} />
      <input ref={imageRef} type="file" className="hidden" accept="image/*" onChange={(e) => handleFileAttach(e, "image")} />

      {/* ── Main Stream Column (Left / Center) ── */}
      <div className="flex flex-1 flex-col h-full min-w-0 overflow-hidden">
        {/* ── LIVE CONTEXT STRIP (Minimal, Dark-Industrial, High-Signal) ── */}
        <LiveContextStrip
          chapterLabel={chapterScopeLabel}
          usage={currentUsage}
          pinned={pinnedItems}
          onTogglePinned={handleTogglePinned}
          onOpenManager={() => setManagerOpen(true)}
        />

        {/* Dedicated Context Manager Sheet */}
        <ContextManagerSheet
          open={managerOpen}
          onOpenChange={setManagerOpen}
          book={active}
          books={books}
          value={ctx}
          onChange={setCtx}
          onOpenTab={onOpenTab}
        />

        {quickQueryOpen && <QuickQueryLightbox onClose={() => setQuickQueryOpen(false)} />}

        {/* Chat scroll area */}
        <div ref={scrollRef} className="thin-scrollbar flex-1 overflow-y-auto py-4">
          <div className={cn("mx-auto px-4 space-y-6 pb-6 w-full transition-all duration-300", wideMode ? "max-w-none" : "max-w-2xl")}>
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
                <span className="italic opacity-85 truncate">{activeBranch.originSnippet || "Previous point"}</span>
              </div>
            )}
            {feed.map((m, idx) => {
              const messageBranches = (books.branches ?? []).filter((b) => b.originMsgId === m.id);
              const isSelected = m.id === selectedAnswerId;

              return (
                <div key={m.id} className={cn("space-y-3", idx > 0 && m.role === "user" && "pt-3")}>
                  {m.role === "user" ? (
                    <UserBubble message={m} onDelete={() => handleDeleteMessage(m.id)} />
                  ) : (
                    <article
                      id={`brainstorm-answer-${m.id}`}
                      className={cn(
                        "relative rounded-2xl transition-all duration-300",
                        isSelected && "ring-1 ring-cyan-500/40 bg-cyan-500/[0.02]"
                      )}
                      style={{ scrollMarginTop: "96px" }}
                    >
                      {/* Top 1px sentinel for IntersectionObserver reading-line detection */}
                      <div
                        data-answer-id={m.id}
                        aria-hidden="true"
                        className="pointer-events-none absolute -top-4 left-0 h-[1px] w-full"
                      />

                      <AssistantBubble
                        message={m}
                        completedActivities={messageActivitiesMapRef.current[m.id] ?? []}
                        cores={cores}
                        loreItems={active.lore ?? []}
                        onOpenTab={onOpenTab}
                        onDelete={() => handleDeleteMessage(m.id)}
                        onCopy={() => copyText(m.content, "Reply copied")}
                        onAppend={() => insertAtCursor(m.content)}
                        onInsertCore={() => insertAsCore(m.content)}
                        onBranch={books.activeBranchId || (books.branches ?? []).some((b) => b.originMsgId === m.id) ? undefined : () => handleCreateBranch(m)}
                        showPromotionNudge={!!books.activeBranchId && feed.length >= 5 && idx === feed.length - 1}
                        onPromoteToLore={() => insertAsLore(m.content)}
                        onPromoteToCore={() => insertAsCore(m.content)}
                        onSelectRecommendation={(rec) => {
                          setInput(rec);
                          if (composerInputRef.current) {
                            composerInputRef.current.focus();
                            adjustTextareaHeight();
                          }
                        }}
                        onSuggestFix={async () => {
                          const { content } = await invokeAssistant({
                            data: {
                              mode: "suggest_fix",
                              action: "Propose 3 concrete fix options for the critic note below.",
                              context: `CRITIC NOTE:\n${m.content}`,
                            },
                          });
                          books.addBrainstorm({
                            role: "assistant",
                            mode: "critic",
                            content: `FIX OPTIONS:\n${content.trim()}`,
                          });
                        }}
                        onAddOptionToCore={(opt, coreId) => {
                          books.addCoreBlock(coreId, { title: "From Brainstorm", body: opt });
                          toastSuccess("Added option to core");
                        }}
                      />

                      {/* Extracted Candidate Lore Chips */}
                      {idx === feed.length - 1 && (active.candidates ?? []).length > 0 && (
                        <div className="mt-2">
                          <CandidateChips
                            candidates={active.candidates ?? []}
                            onKeep={(c) => {
                              books.addLore({ type: c.type, name: c.name, description: c.description });
                              books.removeCandidate(c.id);
                              toastSuccess(`Added to Lore: ${c.name}`);
                            }}
                            onCancel={(id) => books.removeCandidate(id)}
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
                    </article>
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
          </div>
        </div>

        {/* Retry banner */}
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

        {/* Composer (unified with docked Agent Execution Log) */}
        <BrainstormComposer
          input={input}
          setInput={setInput}
          busy={busy}
          isFocused={isFocused}
          setIsFocused={setIsFocused}
          wideMode={wideMode}
          includeChapter={includeChapter}
          setIncludeChapter={setIncludeChapter}
          handleToggleWideMode={handleToggleWideMode}
          onSend={send}
          onCancel={cancelRequest}
          onQuickQuery={() => setQuickQueryOpen(true)}
          composerInputRef={composerInputRef}
          fileRef={fileRef}
          imageRef={imageRef}
          books={books}
          activities={activities}
          logExpanded={logExpanded}
          onToggleExpandLog={() => setLogExpanded((v) => !v)}
        />
      </div>

      {/* ── Answer Rail (Desktop sidebar + Mobile drawer trigger) ── */}
      <BrainstormAnswerRail
        feed={feed}
        selectedAnswerId={selectedAnswerId}
        onSelect={handleSelectAnswer}
        busy={!!busy}
        runningId={runningId}
        lastFailedId={lastFailed ? (lastFailed.userMsgId ?? runningId) : null}
        scrollContainerRef={scrollRef}
        chapterLabel={chapterScopeLabel}
      />
    </div>
  );
}
