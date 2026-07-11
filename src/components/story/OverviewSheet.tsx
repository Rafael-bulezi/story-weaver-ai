import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Diamond, RotateCcw } from "lucide-react";
import type { BooksApi } from "@/lib/story-store";
import { buildOverview } from "@/lib/story-store";
import { toastSuccess } from "@/lib/toast";

export function OverviewSheet({
  books,
  open,
  onOpenChange,
}: {
  books: BooksApi;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const active = books.active!;
  const auto = buildOverview({ ...active, overview: undefined });
  const [draft, setDraft] = useState(active.overview ?? "");

  useEffect(() => {
    if (open) setDraft(active.overview ?? "");
  }, [open, active.overview]);

  function save() {
    books.updateBook(active.id, { overview: draft.trim() || undefined });
    toastSuccess("Overview saved");
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[color:var(--writer-bg)] text-[color:var(--writer)]">
              <Diamond className="h-3 w-3" />
            </span>
            Overview
          </SheetTitle>
        </SheetHeader>
        <p className="mt-2 text-[12px] text-muted-foreground">
          A short digest sent with every AI request. Leave blank to auto-generate from your cores.
        </p>

        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-[10.5px] font-semibold uppercase tracking-widest text-muted-foreground">
            Your overview
            <button
              onClick={() => setDraft(auto)}
              className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-foreground normal-case"
            >
              <RotateCcw className="h-3 w-3" /> Use auto
            </button>
          </div>
          <Textarea
            rows={6}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={auto}
            className="text-[13px]"
          />
        </div>

        <div className="mt-3">
          <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-widest text-muted-foreground">
            Auto-generated preview
          </div>
          <div className="rounded-xl border border-border/60 bg-muted/40 p-3 text-[12.5px] leading-relaxed text-muted-foreground">
            {auto}
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={save}>
            Save
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
