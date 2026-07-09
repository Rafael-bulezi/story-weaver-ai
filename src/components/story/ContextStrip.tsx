import { useMemo, useState } from "react";
import { X, Plus, Layers, User, MapPin, Lightbulb, Diamond } from "lucide-react";
import type { Book } from "@/lib/story-store";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export interface ContextSelection {
  coreIds: string[];
  loreIds: string[];
}

export function ContextStrip({
  book,
  value,
  onChange,
}: {
  book: Book;
  value: ContextSelection;
  onChange: (v: ContextSelection) => void;
}) {
  const [open, setOpen] = useState(false);

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
    <div className="flex items-center gap-1.5 overflow-x-auto px-3 py-1.5 text-[11px] no-scrollbar">
      <span className="shrink-0 text-muted-foreground">Using:</span>
      {/* Non-removable Overview chip */}
      <span className="flex shrink-0 items-center gap-1 rounded-full bg-[color:var(--writer-bg)] px-2 py-1 font-medium text-[color:var(--writer)]">
        <Diamond className="h-2.5 w-2.5" /> Overview
      </span>
      {coreChips.map((c, i) => (
        <Chip
          key={c.id}
          label={`Core ${book.cores.indexOf(c) + 1 || i + 1}`}
          onRemove={() => toggleCore(c.id)}
        />
      ))}
      {loreChips.map((l) => (
        <Chip key={l.id} label={l.name} onRemove={() => toggleLore(l.id)} />
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
          <div className="mt-4 space-y-4">
            <Section title="Cores" icon={Layers}>
              {book.cores.length === 0 && <Empty />}
              {book.cores.map((c, i) => (
                <Row
                  key={c.id}
                  label={`Core ${i + 1} — ${c.title}`}
                  selected={value.coreIds.includes(c.id)}
                  onClick={() => toggleCore(c.id)}
                />
              ))}
            </Section>
            <Section title="Characters" icon={User}>
              {book.lore.filter((l) => l.type === "character").length === 0 && <Empty />}
              {book.lore
                .filter((l) => l.type === "character")
                .map((l) => (
                  <Row
                    key={l.id}
                    label={l.name}
                    selected={value.loreIds.includes(l.id)}
                    onClick={() => toggleLore(l.id)}
                  />
                ))}
            </Section>
            <Section title="Places" icon={MapPin}>
              {book.lore.filter((l) => l.type === "place").length === 0 && <Empty />}
              {book.lore
                .filter((l) => l.type === "place")
                .map((l) => (
                  <Row
                    key={l.id}
                    label={l.name}
                    selected={value.loreIds.includes(l.id)}
                    onClick={() => toggleLore(l.id)}
                  />
                ))}
            </Section>
            <Section title="Concepts" icon={Lightbulb}>
              {book.lore.filter((l) => l.type === "concept").length === 0 && <Empty />}
              {book.lore
                .filter((l) => l.type === "concept")
                .map((l) => (
                  <Row
                    key={l.id}
                    label={l.name}
                    selected={value.loreIds.includes(l.id)}
                    onClick={() => toggleLore(l.id)}
                  />
                ))}
            </Section>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="flex shrink-0 items-center gap-1 rounded-full bg-muted px-2 py-1 font-medium">
      {label}
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
