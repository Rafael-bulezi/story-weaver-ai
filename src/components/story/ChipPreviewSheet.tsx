import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, Layers, User, MapPin, Lightbulb } from "lucide-react";
import type { Book } from "@/lib/story-store";
import { coresToPrompt } from "@/lib/story-store";

export type ChipTarget =
  | { kind: "core"; id: string }
  | { kind: "lore"; id: string };

export function ChipPreviewSheet({
  book,
  target,
  onOpenChange,
  onOpenTab,
}: {
  book: Book;
  target: ChipTarget | null;
  onOpenChange: (v: boolean) => void;
  onOpenTab: (kind: "core" | "lore") => void;
}) {
  if (!target) {
    return (
      <Sheet open={false} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" />
      </Sheet>
    );
  }

  let title = "";
  let body: React.ReactNode = null;
  let TabIcon: React.ElementType = Layers;
  let openLabel = "Open in Cores";
  let kind: "core" | "lore" = "core";

  if (target.kind === "core") {
    const idx = book.cores.findIndex((c) => c.id === target.id);
    const core = book.cores[idx];
    if (core) {
      title = `Core ${idx + 1} — ${core.title}`;
      body = (
        <pre className="whitespace-pre-wrap font-sans text-[13px] leading-relaxed">
          {coresToPrompt([core])}
        </pre>
      );
    }
  } else {
    const l = book.lore.find((x) => x.id === target.id);
    if (l) {
      title = l.name + (l.role ? ` · ${l.role}` : "");
      TabIcon =
        l.type === "character" ? User : l.type === "place" ? MapPin : Lightbulb;
      openLabel = "Open in Lore";
      kind = "lore";
      body = (
        <p className="whitespace-pre-wrap text-[13px] leading-relaxed">
          {l.description || "(no description)"}
        </p>
      );
    }
  }

  return (
    <Sheet open={!!target} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[70vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted">
              <TabIcon className="h-3 w-3" />
            </span>
            {title}
          </SheetTitle>
        </SheetHeader>
        <div className="mt-1 text-[10.5px] font-semibold uppercase tracking-widest text-muted-foreground">
          Read-only preview · this is what the AI sees
        </div>
        <div className="mt-3 rounded-xl border border-border/60 bg-muted/40 p-3">{body}</div>
        <div className="mt-4 flex justify-end">
          <Button size="sm" variant="outline" onClick={() => onOpenTab(kind)}>
            {openLabel} <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
