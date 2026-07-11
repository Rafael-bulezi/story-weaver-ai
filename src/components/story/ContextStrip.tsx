import { useMemo, useState } from "react";
import { X, Plus, Layers, User, MapPin, Lightbulb, Diamond, Search } from "lucide-react";
import type { Book, BooksApi } from "@/lib/story-store";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { OverviewSheet } from "@/components/story/OverviewSheet";
import { ChipPreviewSheet, type ChipTarget } from "@/components/story/ChipPreviewSheet";

export interface ContextSelection {
  coreIds: string[];
  loreIds: string[];
}

export function ContextStrip({
  book,
  books,
  value,
  onChange,
  onOpenTab,
}: {
  book: Book;
  books: BooksApi;
  value: ContextSelection;
  onChange: (v: ContextSelection) => void;
  onOpenTab?: (tab: "lore" | "cores") => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [overviewOpen, setOverviewOpen] = useState(false);
  const [chipTarget, setChipTarget] = useState<ChipTarget | null>(null);
  const q = query.trim().toLowerCase();
  const matchLore = (name: string) => !q || name.toLowerCase().includes(q);
  const matchCore = (c: { title: string }) => !q || c.title.toLowerCase().includes(q);

  const coreChips = useMemo(
    () => book.cores.filter((c) => value.coreIds.includes(c.id)),
    [book.cores, value.coreIds],
  );
  const loreChips = useMemo(
    () => book.lore.filter((l) => value.loreIds.includes(l.id)),
    [book.lore, value.loreIds],
  );

  const toggleCore = (id: string) =>
    onChange({
      ...value,
      coreIds: value.coreIds.includes(id)
        ? value.coreIds.filter((x) => x !== id)
        : [...value.coreIds, id],
    });
  const toggleLore = (id: string) =>
    onChange({
      ...value,
      loreIds: value.loreIds.includes(id)
        ? value.loreIds.filter((x) => x !== id)
        : [...value.loreIds, id],
    });

  return (
    <>
      <div className="flex items-center gap-1.5 overflow-x-auto px-3 py-1.5 text-[11px] no-scrollbar">
        <span className="shrink-0 text-muted-foreground">Using:</span>
        <button
          type="button"
          onClick={() => setOverviewOpen(true)}
          className="flex shrink-0 items-center gap-1 rounded-full bg-[color:var(--writer-bg)] px-2 py-1 font-medium text-[color:var(--writer)] hover:brightness-95"
        >
          <Diamond className="h-2.5 w-2.5" /> Overview
        </button>
        {coreChips.map((c, i) => (
          <Chip
            key={c.id}
            label={`Core ${book.cores.indexOf(c) + 1 || i + 1}`}
            onClick={() => setChipTarget({ kind: "core", id: c.id })}
            onRemove={() => toggleCore(c.id)}
          />
        ))}
        {loreChips.map((l) => (
          <Chip
            key={l.id}
            label={l.name}
            onClick={() => setChipTarget({ kind: "lore", id: l.id })}
            onRemove={() => toggleLore(l.id)}
          />
        ))}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button
              aria-label="Add to context"
              className="flex h-6 shrink-0 items-center justify-center rounded-full border border-dashed border-border px-1.5 text-muted-foreground hover:bg-muted"
            >
              <Plus className="h-3 w-3" />
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[70vh] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Add to context</SheetTitle>
            </SheetHeader>
            <div className="mt-3 flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5">
              <Search className="h-3.5 w-3.5 text-muted-foreground" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search cores, characters, places, concepts…"
                className="min-w-0 flex-1 bg-transparent text-[13px] outline-none"
              />
              {query && (
                <button onClick={() => setQuery("")} className="text-muted-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div className="mt-4 space-y-4">
              <Section title="Cores" icon={Layers}>
                {book.cores.filter(matchCore).length === 0 && <Empty />}
                {book.cores.filter(matchCore).map((c) => {
                  const i = book.cores.indexOf(c);
                  return (
                    <Row
                      key={c.id}
                      label={`Core ${i + 1} — ${c.title}`}
                      selected={value.coreIds.includes(c.id)}
                      onClick={() => toggleCore(c.id)}
                    />
                  );
                })}
              </Section>
              {(["character", "place", "concept"] as const).map((type) => {
                const label =
                  type === "character" ? "Characters" : type === "place" ? "Places" : "Concepts";
                const Icon = type === "character" ? User : type === "place" ? MapPin : Lightbulb;
                const items = book.lore.filter((l) => l.type === type && matchLore(l.name));
                return (
                  <Section key={type} title={label} icon={Icon}>
                    {items.length === 0 && <Empty />}
                    {items.map((l) => (
                      <Row
                        key={l.id}
                        label={l.name}
                        selected={value.loreIds.includes(l.id)}
                        onClick={() => toggleLore(l.id)}
                      />
                    ))}
                  </Section>
                );
              })}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <OverviewSheet books={books} open={overviewOpen} onOpenChange={setOverviewOpen} />
      <ChipPreviewSheet
        book={book}
        target={chipTarget}
        onOpenChange={(v) => !v && setChipTarget(null)}
        onOpenTab={(k) => {
          setChipTarget(null);
          onOpenTab?.(k === "core" ? "cores" : "lore");
        }}
      />
    </>
  );
}

function Chip({
  label,
  onClick,
  onRemove,
}: {
  label: string;
  onClick: () => void;
  onRemove: () => void;
}) {
  return (
    <span className="flex shrink-0 items-center gap-1 rounded-full bg-muted px-2 py-1 font-medium">
      <button type="button" onClick={onClick} className="hover:underline">
        {label}
      </button>
      <button
        onClick={onRemove}
        aria-label={`Remove ${label}`}
        className="text-muted-foreground hover:text-foreground"
      >
        <X className="h-2.5 w-2.5" />
      </button>
    </span>
  );
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" /> {title}
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}
function Empty() {
  return <div className="rounded-lg bg-muted/40 p-2 text-[12px] text-muted-foreground">None</div>;
}
function Row({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-left text-[13px]",
        selected ? "bg-primary/10 border-primary/30" : "bg-card hover:bg-muted/50",
      )}
    >
      <span className="truncate">{label}</span>
      <span
        className={cn(
          "ml-2 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
          selected ? "border-primary bg-primary text-primary-foreground" : "border-border",
        )}
      >
        {selected && "✓"}
      </span>
    </button>
  );
}
