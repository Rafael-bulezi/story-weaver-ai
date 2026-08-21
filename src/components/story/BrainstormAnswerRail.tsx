import { useEffect, useRef, useState, useCallback, memo } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BrainstormMessage } from "@/lib/story-store";

// ─────────────────────────────────────────────────────────────────────────────
// Module-level title cache
//
// Frozen at first derivation. Survives remounts, tab switches, HMR, and
// Suspense boundaries. Never re-derived from current `content`, which prevents
// the label-jump bug when the agent rewrites or extends a response.
//
// Call clearRailTitleCache() on chapter switch so memory doesn't leak across
// chapters.
// ─────────────────────────────────────────────────────────────────────────────
const titleCache = new Map<string, string>();

function deriveRailTitle(content: string): string {
  const first = content
    .split(/[.!?\n]/)[0]
    .trim()
    .replace(/^(please|could you|can you|i'?d like to)\s+/i, "")
    .replace(/[?!.,]+$/, "");
  const words = first.split(/\s+/).slice(0, 8).join(" ");
  return words || "Untitled";
}

function getRailTitle(m: BrainstormMessage): string {
  let t = titleCache.get(m.id);
  if (!t) {
    t = deriveRailTitle(m.content);
    titleCache.set(m.id, t);
  }
  return t;
}

export function clearRailTitleCache() {
  titleCache.clear();
}

// ─────────────────────────────────────────────────────────────────────────────
// Status
// ─────────────────────────────────────────────────────────────────────────────
export type RailStatus = "ready" | "running" | "review" | "failed";

function getStatus(
  m: BrainstormMessage,
  runningId: string | null,
  lastFailedId: string | null
): RailStatus {
  if (m.id === lastFailedId) return "failed";
  if (m.id === runningId) return "running";
  return "ready";
}

// ─────────────────────────────────────────────────────────────────────────────
// RailItem (expanded state)
//
// MVP: accepts re-renders when `selected` changes. Only two items re-render per
// selection event (old + new selected).
// ─────────────────────────────────────────────────────────────────────────────
const RailItem = memo(function RailItem({
  message,
  selected,
  status,
  chapterLabel,
  onClick,
}: {
  message: BrainstormMessage;
  selected: boolean;
  status: RailStatus;
  chapterLabel: string;
  onClick: () => void;
}) {
  const title = getRailTitle(message);
  const time = new Date(message.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  const modeLabel = message.mode ?? "chat";

  return (
    <button
      type="button"
      role="listitem"
      className={cn(
        "group relative flex w-full items-start gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-colors duration-150 mb-0.5",
        "focus-visible:outline-2 focus-visible:outline-cyan-400 focus-visible:-outline-offset-2",
        selected
          ? "border-cyan-500/30 bg-cyan-500/5 dark:bg-cyan-500/10 text-cyan-500 dark:text-cyan-400"
          : "border-transparent bg-transparent hover:bg-muted/50 text-foreground"
      )}
      data-id={message.id}
      data-status={status}
      aria-controls={`brainstorm-answer-${message.id}`}
      aria-current={selected ? "true" : "false"}
      aria-label={`${title}, ${status}${status === "review" ? ", pending review" : ""}${status === "failed" ? ", failed" : ""}`}
      onClick={onClick}
    >
      {/* Selected left-edge bar */}
      {selected && (
        <span
          aria-hidden
          className="absolute -left-1 top-2.5 bottom-2.5 w-1 rounded-full bg-cyan-500 dark:bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.6)]"
        />
      )}

      {/* Status dot */}
      <span className="mt-[3px] flex h-3.5 w-3.5 shrink-0 items-center justify-center">
        <span
          aria-hidden
          className={cn(
            "h-[7px] w-[7px] rounded-full transition-colors",
            status === "ready" && "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]",
            status === "running" && "animate-rail-pulse bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]",
            status === "review" && "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.4)]",
            status === "failed" && "bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.4)]"
          )}
        />
      </span>

      {/* Text */}
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block truncate text-[12.5px] font-medium leading-snug mb-0.5",
            selected ? "text-cyan-600 dark:text-cyan-300 font-semibold" : "text-foreground"
          )}
        >
          {title}
        </span>
        <span className="flex flex-wrap items-center gap-1.5 font-mono text-[10px] text-muted-foreground/70">
          <span>{chapterLabel}</span>
          <span className="text-border">·</span>
          <span className="uppercase tracking-wide">{modeLabel}</span>
          <span className="text-border">·</span>
          <span>{time}</span>
          {status === "review" && (
            <span className="rounded border border-amber-400/40 bg-amber-500/10 px-1 text-[9px] text-amber-500 dark:text-amber-400">
              review
            </span>
          )}
          {status === "failed" && (
            <span className="text-[9px] text-rose-500 dark:text-rose-400 font-semibold">failed</span>
          )}
        </span>
      </span>
    </button>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// RailDash (collapsed state) — the quiet "_" ticks on the right edge.
// Status survives collapse: running pulses cyan, review amber, failed rose,
// selected is longer + cyan.
// ─────────────────────────────────────────────────────────────────────────────
const RailDash = memo(function RailDash({
  message,
  selected,
  status,
  onClick,
}: {
  message: BrainstormMessage;
  selected: boolean;
  status: RailStatus;
  onClick: () => void;
}) {
  const title = getRailTitle(message);
  return (
    <button
      type="button"
      title={title}
      aria-label={`Jump to ${title}, ${status}`}
      aria-controls={`brainstorm-answer-${message.id}`}
      aria-current={selected ? "true" : "false"}
      onClick={onClick}
      className="group/dash flex h-3.5 w-full items-center justify-end pr-[7px] rounded-sm
                 focus-visible:outline-2 focus-visible:outline-cyan-400 focus-visible:-outline-offset-2"
    >
      <span
        aria-hidden
        className={cn(
          "h-[2px] rounded-full transition-all duration-200",
          selected ? "w-[18px]" : "w-[10px] group-hover/dash:w-[14px]",
          status === "running" && "animate-rail-pulse bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.8)]",
          status === "failed" && "bg-rose-500",
          status === "review" && "bg-amber-400",
          status === "ready" &&
            (selected
              ? "bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.6)]"
              : "bg-muted-foreground/35 group-hover/dash:bg-muted-foreground/70")
        )}
      />
    </button>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Flash helper — manipulates the stream article DOM directly.
// ─────────────────────────────────────────────────────────────────────────────
export function flashAnswer(id: string) {
  const el = document.getElementById(`brainstorm-answer-${id}`);
  if (!el) return;
  el.classList.remove("answer-flash");
  void (el as HTMLElement).offsetWidth; // force reflow to restart animation
  el.classList.add("answer-flash");
}

// ─────────────────────────────────────────────────────────────────────────────
// BrainstormAnswerRail
//
// Desktop: 28px collapsed minimap by default; expands into a 256px OVERLAY on
// hover/focus (no stream reflow). Collapsed ticks remain clickable (touch).
// Mobile (<md): floating pill + bottom drawer, unchanged.
// ─────────────────────────────────────────────────────────────────────────────
export interface BrainstormAnswerRailProps {
  feed: BrainstormMessage[];
  selectedAnswerId: string | null;
  onSelect: (id: string, opts?: { userInitiated?: boolean }) => void;
  busy: boolean;
  runningId: string | null;
  lastFailedId: string | null;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  chapterLabel: string;
}

export function BrainstormAnswerRail({
  feed,
  selectedAnswerId,
  onSelect,
  runningId,
  lastFailedId,
  scrollContainerRef,
  chapterLabel,
}: BrainstormAnswerRailProps) {
  const assistantMessages = feed.filter((m) => m.role === "assistant");
  const count = assistantMessages.length;

  // ── Expand / collapse with hover-intent delay ─────────────────────────────
  const [expanded, setExpanded] = useState(false);
  const hoveredRef = useRef(false);
  const collapseTimerRef = useRef<number | null>(null);
  const autoExpandTimerRef = useRef<number | null>(null);

  const cancelCollapse = useCallback(() => {
    if (collapseTimerRef.current !== null) {
      window.clearTimeout(collapseTimerRef.current);
      collapseTimerRef.current = null;
    }
  }, []);

  const expand = useCallback(() => {
    cancelCollapse();
    setExpanded(true);
  }, [cancelCollapse]);

  const collapseSoon = useCallback((delay = 250) => {
    cancelCollapse();
    collapseTimerRef.current = window.setTimeout(() => setExpanded(false), delay);
  }, [cancelCollapse]);

  // After a tick click (touch): show landing context, then settle back down.
  const autoExpandBriefly = useCallback((ms = 1400) => {
    expand();
    if (autoExpandTimerRef.current !== null) window.clearTimeout(autoExpandTimerRef.current);
    autoExpandTimerRef.current = window.setTimeout(() => {
      if (!hoveredRef.current) setExpanded(false);
    }, ms);
  }, [expand]);

  useEffect(() => () => {
    if (collapseTimerRef.current !== null) window.clearTimeout(collapseTimerRef.current);
    if (autoExpandTimerRef.current !== null) window.clearTimeout(autoExpandTimerRef.current);
  }, []);

  // ── Jump lock ─────────────────────────────────────────────────────────────
  const isJumpingRef = useRef(false);

  const jumpTo = useCallback(
    (id: string, opts?: { userInitiated?: boolean }) => {
      isJumpingRef.current = true;

      onSelect(id, opts);
      flashAnswer(id);

      const articleEl = document.getElementById(`brainstorm-answer-${id}`);
      articleEl?.scrollIntoView({ behavior: "smooth", block: "start" });

      const unlock = () => {
        isJumpingRef.current = false;
      };
      scrollContainerRef.current?.addEventListener("scrollend", unlock, {
        once: true,
      });
      // Fallback for browsers without scrollend support
      setTimeout(unlock, 1000);
    },
    [onSelect, scrollContainerRef]
  );

  // ── IntersectionObserver — reading-line hysteresis ─────────────────────────
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (isJumpingRef.current) return;

        const visible = entries.filter((e) => e.isIntersecting);
        if (!visible.length) return;

        // Pick sentinel highest in scroll viewport
        const best = visible.reduce((a, b) =>
          a.boundingClientRect.top > b.boundingClientRect.top ? a : b
        );

        const answerId = (best.target as HTMLElement).dataset.answerId;
        if (answerId && answerId !== selectedAnswerId) {
          onSelect(answerId, { userInitiated: false });
        }
      },
      {
        root: container,
        rootMargin: "-25% 0px -65% 0px",
        threshold: 0,
      }
    );

    const sentinels = container.querySelectorAll("[data-answer-id]");
    sentinels.forEach((s) => observer.observe(s));

    return () => observer.disconnect();
  }, [feed, scrollContainerRef, onSelect, selectedAnswerId]);

  // ── Mobile drawer ─────────────────────────────────────────────────────────
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement | null>(null);
  const pillButtonRef = useRef<HTMLButtonElement | null>(null);

  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    setTimeout(() => pillButtonRef.current?.focus(), 50);
  }, []);

  // Basic focus trap inside drawer
  useEffect(() => {
    if (!drawerOpen) return;
    const el = drawerRef.current;
    if (!el) return;

    const focusable = el.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    first?.focus();

    function trap(e: KeyboardEvent) {
      if (e.key !== "Tab") return;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    }
    function escape(e: KeyboardEvent) {
      if (e.key === "Escape") closeDrawer();
    }

    document.addEventListener("keydown", trap);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("keydown", trap);
      document.removeEventListener("keydown", escape);
    };
  }, [drawerOpen, closeDrawer]);

  // ── Item list renderer (expanded rail + drawer) ───────────────────────────
  const renderItems = (onItemClick?: () => void) =>
    assistantMessages.map((m) => (
      <RailItem
        key={m.id}
        message={m}
        selected={m.id === selectedAnswerId}
        status={getStatus(m, runningId, lastFailedId)}
        chapterLabel={chapterLabel}
        onClick={() => {
          jumpTo(m.id, { userInitiated: true });
          onItemClick?.();
        }}
      />
    ));

  return (
    <>
      {/* ── Desktop: Floating vertically-centered rounded minimap rail ── */}
      <div
        role="navigation"
        aria-label="Answer index"
        className="fixed right-3 top-1/2 -translate-y-1/2 z-30 hidden md:block select-none pointer-events-auto"
        onMouseEnter={() => {
          hoveredRef.current = true;
          expand();
        }}
        onMouseLeave={() => {
          hoveredRef.current = false;
          collapseSoon(250);
        }}
        onFocusCapture={expand}
        onBlurCapture={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) collapseSoon(100);
        }}
      >
        {/* Collapsed Pill Rail (30-40vh height, rounded pill, vertically centered) */}
        <div
          className={cn(
            "relative flex flex-col justify-center items-center py-3 px-1 rounded-full border border-border/70 bg-card/85 backdrop-blur-md shadow-lg transition-all duration-300 w-5.5",
            "max-h-[38vh] overflow-y-auto no-scrollbar",
            expanded ? "opacity-0 scale-95 pointer-events-none" : "opacity-100 scale-100"
          )}
        >
          <div className="flex flex-col gap-1.5 w-full items-center justify-center">
            {assistantMessages.map((m) => (
              <RailDash
                key={m.id}
                message={m}
                selected={m.id === selectedAnswerId}
                status={getStatus(m, runningId, lastFailedId)}
                onClick={() => {
                  jumpTo(m.id, { userInitiated: true });
                  autoExpandBriefly();
                }}
              />
            ))}
          </div>
        </div>

        {/* Expanded Floating Lightbox Card (Floats over the stream without reflowing any layout) */}
        <div
          className={cn(
            "absolute right-0 top-1/2 -translate-y-1/2 w-64 max-h-[70vh] flex flex-col",
            "rounded-3xl border border-border/80 bg-card/95 backdrop-blur-xl shadow-2xl overflow-hidden",
            "transition-all duration-300 ease-out origin-right",
            expanded
              ? "opacity-100 scale-100 translate-x-0 pointer-events-auto"
              : "opacity-0 scale-95 translate-x-4 pointer-events-none"
          )}
        >
          <div className="flex items-center justify-between border-b border-border/60 px-4 py-3 shrink-0 bg-muted/30">
            <span className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-muted-foreground font-bold">
              Answers
            </span>
            <span className="font-mono text-[10px] text-muted-foreground font-semibold bg-background/80 px-2 py-0.5 rounded-full border border-border/50">
              {count || "—"}
            </span>
          </div>

          <div className="thin-scrollbar flex-1 overflow-y-auto p-2" role="list">
            {count === 0 ? (
              <p className="px-3 py-6 text-center font-mono text-[11px] text-muted-foreground/50">
                No answers yet
              </p>
            ) : (
              renderItems()
            )}
          </div>
        </div>
      </div>

      {/* ── Mobile floating pill ── */}
      <button
        ref={pillButtonRef}
        type="button"
        aria-label={`Open answers index, ${count} answers`}
        onClick={openDrawer}
        className={cn(
          "md:hidden fixed bottom-24 right-4 z-20 flex items-center gap-1.5 rounded-full border border-border bg-card/90 backdrop-blur-md px-4 py-2.5",
          "font-mono text-[11px] tracking-[0.1em] text-foreground shadow-xl transition-all active:scale-95",
          "hover:border-cyan-400/50 hover:text-cyan-400",
          count === 0 && "pointer-events-none opacity-40"
        )}
      >
        Answers
        <span className="rounded-full bg-primary/10 text-primary px-1.5 py-0.5 text-[9px] font-bold">
          {count}
        </span>
      </button>

      {/* ── Mobile backdrop ── */}
      {drawerOpen && (
        <div
          aria-hidden
          className="md:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-xs animate-soft-fade-in"
          onClick={closeDrawer}
        />
      )}

      {/* ── Mobile bottom drawer ── */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-label="Answer index"
        aria-modal="true"
        className={cn(
          "md:hidden fixed inset-x-0 bottom-0 z-40 flex flex-col rounded-t-3xl border-t border-border bg-card shadow-2xl",
          "transition-transform duration-300 ease-out",
          drawerOpen ? "translate-y-0" : "translate-y-full pointer-events-none"
        )}
        style={{ maxHeight: "70vh" }}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3.5">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/80 font-bold">
            Answers · {count}
          </span>
          <button
            type="button"
            aria-label="Close answer index"
            onClick={closeDrawer}
            className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div
          className="thin-scrollbar overflow-y-auto p-2"
          role="list"
          style={{ maxHeight: "calc(70vh - 60px)" }}
        >
          {count === 0 ? (
            <p className="px-3 py-6 text-center font-mono text-[11px] text-muted-foreground/50">
              No answers yet
            </p>
          ) : (
            renderItems(closeDrawer)
          )}
        </div>
      </div>
    </>
  );
}

