import { useMemo } from "react";
import { ArrowRight, BookOpen, Layers, ScrollText, FileText, Feather } from "lucide-react";
import type { BooksApi } from "@/lib/story-store";

export function StudioTab({
  books,
  onOpenChat,
  onOpenLore,
  onOpenCores,
}: {
  books: BooksApi;
  onOpenChat: () => void;
  onOpenLore: () => void;
  onOpenCores: () => void;
}) {
  const active = books.active!;
  const wc = useMemo(
    () => (active.content.trim() ? active.content.trim().split(/\s+/).length : 0),
    [active.content],
  );
  const canonCount = active.chapters.filter((c) => c.type === "canon").length;
  const draftCount = active.chapters.filter((c) => c.type === "draft").length;

  return (
    <div className="mx-auto h-full w-full max-w-2xl overflow-y-auto px-5 py-5 no-scrollbar">
      <div className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
        Studio
      </div>
      <h2 className="mt-0.5 font-serif text-3xl font-semibold">{active.name}</h2>
      <p className="mt-1 text-[12.5px] text-muted-foreground">Your creative studio for this book.</p>

      {/* Continue writing card */}
      <button
        onClick={onOpenChat}
        className="animate-slide-up-fade mt-5 flex w-full items-center justify-between rounded-2xl bg-primary p-4 text-left text-primary-foreground shadow-sm active:scale-[0.99]"
      >
        <div>
          <div className="text-[11px] uppercase tracking-widest opacity-70">Continue writing</div>
          <div className="mt-0.5 font-serif text-lg font-semibold">
            {active.title || "Untitled chapter"}
          </div>
          <div className="mt-0.5 text-[11px] opacity-80">{wc} words · last updated just now</div>
        </div>
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-foreground/15">
          <ArrowRight className="h-4 w-4" />
        </span>
      </button>

      {/* Stat tiles */}
      <div className="mt-5 grid grid-cols-2 gap-2.5">
        <Stat icon={BookOpen} label="Lore items" value={active.lore.length} onClick={onOpenLore} />
        <Stat icon={Layers} label="Cores" value={active.cores.length} onClick={onOpenCores} />
        <Stat icon={ScrollText} label="Canon chapters" value={canonCount} />
        <Stat icon={FileText} label="Drafts" value={draftCount} />
      </div>

      {/* Recent chapters */}
      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Recent chapters
          </div>
        </div>
        {active.chapters.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-4 text-center text-[12px] text-muted-foreground">
            No saved chapters yet — save from the Chat tab.
          </div>
        )}
        <div className="space-y-2">
          {active.chapters.slice(0, 6).map((c, i) => (
            <button
              key={c.id}
              onClick={() => {
                books.loadChapter(c.id);
                onOpenChat();
              }}
              className="animate-slide-up-fade flex w-full items-start gap-3 rounded-2xl border border-border/70 bg-card p-3 text-left hover:border-primary/40"
              style={{ animationDelay: `${i * 30}ms` }}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[color:var(--writer-bg)] text-[color:var(--writer)]">
                <Feather className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-[13px] font-semibold">
                    {c.title || "Untitled"}
                  </span>
                  <span
                    className={
                      c.type === "canon"
                        ? "rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-primary"
                        : "rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-muted-foreground"
                    }
                  >
                    {c.type}
                  </span>
                </div>
                <p className="mt-0.5 line-clamp-2 text-[11.5px] text-muted-foreground">
                  {c.content.slice(0, 140) || "Empty."}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  onClick?: () => void;
}) {
  const inner = (
    <>
      <div className="flex items-center justify-between">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[color:var(--writer-bg)] text-[color:var(--writer)]">
          <Icon className="h-4 w-4" />
        </span>
        <span className="font-serif text-2xl font-semibold">{value}</span>
      </div>
      <div className="mt-2 text-[11px] text-muted-foreground">{label}</div>
    </>
  );
  return onClick ? (
    <button
      onClick={onClick}
      className="animate-slide-up-fade rounded-2xl border border-border/70 bg-card p-3 text-left hover:border-primary/40"
    >
      {inner}
    </button>
  ) : (
    <div className="animate-slide-up-fade rounded-2xl border border-border/70 bg-card p-3">
      {inner}
    </div>
  );
}
