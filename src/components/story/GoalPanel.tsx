import { useState } from "react";
import { Target, Check, X, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BooksApi, Goal } from "@/lib/story-store";

/**
 * GoalPanel — green Target icon that opens a compact dropdown showing
 * per-branch goals. Goals are AI-created; users can check them off or dismiss.
 */
export function GoalPanel({ books }: { books: BooksApi }) {
  const [open, setOpen] = useState(false);
  const active = books.active;
  if (!active) return null;

  const goals: Goal[] = active.goals ?? [];
  const pending = goals.filter((g) => !g.done);
  const hasPending = pending.length > 0;

  return (
    <div className="relative">
      <button
        type="button"
        title={hasPending ? `${pending.length} active goal${pending.length > 1 ? "s" : ""}` : "Goals"}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "relative flex h-7 w-7 items-center justify-center rounded-lg transition",
          hasPending
            ? "text-green-500 hover:bg-green-500/10"
            : "text-muted-foreground hover:bg-muted"
        )}
        aria-label="Goals"
      >
        <Target className="h-4 w-4" />
        {hasPending && (
          <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-green-500 text-[8px] font-bold text-white">
            {pending.length}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          {/* Panel */}
          <div className="absolute bottom-full right-0 z-40 mb-2 w-72 overflow-hidden rounded-2xl border border-border bg-card shadow-xl animate-slide-up-fade">
            <div className="flex items-center justify-between border-b border-border/50 px-3 py-2">
              <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-green-500">
                <Target className="h-3 w-3" />
                Session Goals
              </span>
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {goals.length === 0 ? (
              <div className="px-4 py-5 text-center text-[12px] text-muted-foreground">
                <Target className="mx-auto mb-1.5 h-5 w-5 opacity-30" />
                <p>No goals yet.</p>
                <p className="mt-0.5 opacity-70">Goals appear automatically as you brainstorm — the AI will suggest them as your story direction becomes clear.</p>
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto divide-y divide-border/40">
                {goals.map((g) => (
                  <div key={g.id} className="flex items-start gap-2 px-3 py-2.5">
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
                    <span className={cn("flex-1 text-[12.5px] leading-snug", g.done && "text-muted-foreground line-through")}>
                      {g.title}
                    </span>
                    <button
                      onClick={() => books.removeGoal(g.id)}
                      className="mt-0.5 text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100"
                      title="Remove goal"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

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
        placeholder="Add a goal…"
        className="min-w-0 flex-1 rounded-lg border border-border bg-background px-2 py-1 text-[12px] outline-none placeholder:text-muted-foreground/60 focus:border-green-500/60"
      />
      <button
        type="submit"
        disabled={!val.trim()}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-green-500 text-white disabled:opacity-40"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </form>
  );
}
