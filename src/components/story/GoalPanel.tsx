import { useState } from "react";
import { Target, Check, X, Plus, Sparkles, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BooksApi, Goal } from "@/lib/story-store";

/**
 * GoalPanel — "Task Hub" — a Manus-style agentic progress tracker.
 *
 * Goals have two states:
 *  - "suggested" (source: "ai"): AI-staged, shown in indigo with a Sparkles badge.
 *    User must Accept (→ active) or Dismiss (→ remove).
 *  - "active" (status: "active"): Confirmed goals with a checkbox to toggle done.
 */
export function GoalPanel({ books, defaultOpen = false }: { books: BooksApi; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const active = books.active;
  if (!active) return null;

  const goals: Goal[] = active.goals ?? [];
  const suggested = goals.filter((g) => g.status === "suggested" || (!g.status && g.source === "ai"));
  const activeGoals = goals.filter((g) => g.status === "active" || (!g.status && g.source !== "ai"));
  const doneCount = activeGoals.filter((g) => g.done).length;
  const totalActive = activeGoals.length;
  const hasSuggested = suggested.length > 0;
  const hasPending = activeGoals.some((g) => !g.done);

  const progressPct = totalActive > 0 ? Math.round((doneCount / totalActive) * 100) : 0;

  return (
    <div className="relative">
      <button
        type="button"
        title={
          hasSuggested
            ? `${suggested.length} AI suggestion${suggested.length > 1 ? "s" : ""} — review in Task Hub`
            : hasPending
            ? `${activeGoals.filter((g) => !g.done).length} active task${activeGoals.filter((g) => !g.done).length > 1 ? "s" : ""}`
            : "Task Hub"
        }
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "relative flex h-7 w-7 items-center justify-center rounded-lg transition",
          hasSuggested
            ? "text-violet-500 hover:bg-violet-500/10"
            : hasPending
            ? "text-green-500 hover:bg-green-500/10"
            : "text-muted-foreground hover:bg-muted"
        )}
        aria-label="Task Hub"
      >
        <Target className="h-4 w-4" />
        {/* Badge: violet for suggestions, green for active pending */}
        {(hasSuggested || hasPending) && (
          <span
            className={cn(
              "absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full text-[8px] font-bold text-white",
              hasSuggested ? "bg-violet-500" : "bg-green-500"
            )}
          >
            {hasSuggested ? suggested.length : activeGoals.filter((g) => !g.done).length}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />

          {/* Panel */}
          <div className="absolute bottom-full right-0 z-40 mb-2 w-80 overflow-hidden rounded-2xl border border-border bg-card shadow-xl animate-slide-up-fade">

            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/50 px-3 py-2.5">
              <div className="flex items-center gap-2">
                <Target className="h-3.5 w-3.5 text-primary" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-foreground">
                  Task Hub
                </span>
                {totalActive > 0 && (
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {doneCount}/{totalActive}
                  </span>
                )}
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground transition"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Progress bar */}
            {totalActive > 0 && (
              <div className="px-3 pt-2 pb-0.5">
                <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-green-500 transition-all duration-500"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <p className="mt-1 text-right text-[9px] font-mono text-muted-foreground">
                  {progressPct}% complete
                </p>
              </div>
            )}

            {/* AI-Suggested Goals */}
            {suggested.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-violet-500/20 bg-violet-500/5">
                  <Sparkles className="h-3 w-3 text-violet-500 animate-pulse" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-violet-500">
                    AI Suggestions
                  </span>
                  <span className="ml-auto text-[9px] text-violet-400/70 font-mono">
                    Accept or dismiss
                  </span>
                </div>
                <div className="divide-y divide-violet-500/10 max-h-40 overflow-y-auto">
                  {suggested.map((g) => (
                    <div key={g.id} className="flex items-start gap-2 px-3 py-2.5 bg-violet-500/[0.03]">
                      <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-400" />
                      <span className="flex-1 text-[12px] leading-snug text-foreground/90">
                        {g.title}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        {/* Accept → converts to active goal */}
                        <button
                          onClick={() => (books as any).acceptGoal(g.id)}
                          title="Accept this goal"
                          className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500/10 text-green-600 hover:bg-green-500/20 dark:text-green-400 transition"
                        >
                          <Check className="h-3 w-3" />
                        </button>
                        {/* Dismiss */}
                        <button
                          onClick={() => books.removeGoal(g.id)}
                          title="Dismiss suggestion"
                          className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Active Goals */}
            {activeGoals.length === 0 && suggested.length === 0 ? (
              <div className="px-4 py-5 text-center text-[12px] text-muted-foreground">
                <Target className="mx-auto mb-1.5 h-5 w-5 opacity-30" />
                <p>No tasks yet.</p>
                <p className="mt-0.5 opacity-70 text-[11px]">
                  AI-detected goals appear here automatically as you brainstorm.
                </p>
              </div>
            ) : (
              activeGoals.length > 0 && (
                <div>
                  {suggested.length > 0 && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-border/40 bg-muted/20">
                      <CheckCircle2 className="h-3 w-3 text-muted-foreground" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Active Tasks
                      </span>
                    </div>
                  )}
                  <div className="max-h-48 overflow-y-auto divide-y divide-border/40">
                    {activeGoals.map((g) => (
                      <div
                        key={g.id}
                        className={cn(
                          "flex items-start gap-2 px-3 py-2.5 border-l-2 transition-colors",
                          g.done
                            ? "border-green-500/40 bg-muted/10"
                            : "border-amber-500/50"
                        )}
                      >
                        {/* Check toggle */}
                        <button
                          onClick={() => books.toggleGoalDone(g.id)}
                          className={cn(
                            "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition",
                            g.done
                              ? "border-green-500 bg-green-500 text-white"
                              : "border-muted-foreground/40 hover:border-green-500"
                          )}
                        >
                          {g.done && <Check className="h-2.5 w-2.5" />}
                        </button>
                        <span
                          className={cn(
                            "flex-1 text-[12.5px] leading-snug",
                            g.done && "text-muted-foreground line-through opacity-60"
                          )}
                        >
                          {g.title}
                        </span>
                        {/* Dismiss */}
                        <button
                          onClick={() => books.removeGoal(g.id)}
                          className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center text-muted-foreground hover:text-destructive transition"
                          title="Remove task"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )
            )}

            {/* Add task input */}
            <div className="border-t border-border/50 px-3 py-2">
              <GoalInput onAdd={(title) => { books.addGoal(title); }} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function GoalInput({ onAdd }: { onAdd: (title: string) => void }) {
  const [val, setVal] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const t = val.trim();
        if (t) { onAdd(t); setVal(""); }
      }}
      className="flex items-center gap-1.5"
    >
      <input
        value={val}
        onChange={(e) => setVal(e.target.value)}
        placeholder="Add a task…"
        className="min-w-0 flex-1 rounded-lg border border-border bg-background px-2 py-1 text-[12px] outline-none placeholder:text-muted-foreground/60 focus:border-primary/60 transition"
      />
      <button
        type="submit"
        disabled={!val.trim()}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground disabled:opacity-40 transition"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </form>
  );
}
