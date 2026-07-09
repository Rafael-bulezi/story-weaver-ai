import { useState } from "react";
import { toast } from "sonner";
import { ArrowUp, ArrowDown, Trash2, Edit3, ScrollText, FileText } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { BooksApi, Chapter } from "@/lib/story-store";
import { cn } from "@/lib/utils";

export function ChaptersSheet({
  books,
  trigger,
  onLoaded,
}: {
  books: BooksApi;
  trigger: React.ReactNode;
  onLoaded?: () => void;
}) {
  const active = books.active!;
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Chapter | null>(null);

  const canon = active.chapters.filter((c) => c.type === "canon");
  const drafts = active.chapters.filter((c) => c.type === "draft");

  const loadCh = (id: string) => {
    books.loadChapter(id);
    setOpen(false);
    onLoaded?.();
    toast.success("Loaded into editor");
  };

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>{trigger}</SheetTrigger>
        <SheetContent side="right" className="w-[90vw] max-w-md overflow-y-auto sm:w-[420px]">
          <SheetHeader>
            <SheetTitle>Chapters</SheetTitle>
          </SheetHeader>

          <Section title="Canon" icon={ScrollText} count={canon.length}>
            {canon.length === 0 && <Empty text="Push a chapter to canon from the Chat tab." />}
            {canon.map((c) => (
              <Row
                key={c.id}
                chapter={c}
                onLoad={() => loadCh(c.id)}
                onMove={() => {
                  books.setChapterType(c.id, "draft");
                  toast.success("Moved to Drafts");
                }}
                moveLabel="Move to Drafts"
                MoveIcon={ArrowDown}
              />
            ))}
          </Section>

          <Section title="Drafts" icon={FileText} count={drafts.length}>
            {drafts.length === 0 && <Empty text="Save from Chat to create a draft." />}
            {drafts.map((c) => (
              <Row
                key={c.id}
                chapter={c}
                onLoad={() => loadCh(c.id)}
                onMove={() => {
                  books.setChapterType(c.id, "canon");
                  toast.success("Promoted to Canon");
                }}
                moveLabel="Promote to Canon"
                MoveIcon={ArrowUp}
                onDelete={() => setConfirmDelete(c)}
              />
            ))}
          </Section>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!confirmDelete} onOpenChange={(v) => !v && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this draft?</AlertDialogTitle>
            <AlertDialogDescription>
              "{confirmDelete?.title}" will be permanently removed. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmDelete) {
                  books.deleteChapter(confirmDelete.id);
                  toast.success("Draft deleted");
                }
                setConfirmDelete(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function Section({
  title,
  icon: Icon,
  count,
  children,
}: {
  title: string;
  icon: React.ElementType;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-5">
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {title}
        <span className="ml-1 rounded-full bg-muted px-1.5 text-[10px]">{count}</span>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}
function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border p-3 text-center text-[12px] text-muted-foreground">
      {text}
    </div>
  );
}
function Row({
  chapter,
  onLoad,
  onMove,
  moveLabel,
  MoveIcon,
  onDelete,
}: {
  chapter: Chapter;
  onLoad: () => void;
  onMove: () => void;
  moveLabel: string;
  MoveIcon: React.ElementType;
  onDelete?: () => void;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-card p-3">
      <div className="text-[13px] font-semibold">{chapter.title || "Untitled chapter"}</div>
      <div className="mt-0.5 text-[11px] text-muted-foreground">
        {new Date(chapter.savedAt).toLocaleString()} · {chapter.content.trim().split(/\s+/).length}{" "}
        words
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Mini icon={Edit3} label="Edit" onClick={onLoad} />
        <Mini icon={MoveIcon} label={moveLabel} onClick={onMove} />
        {onDelete && (
          <Mini icon={Trash2} label="Delete" onClick={onDelete} tone="destructive" />
        )}
      </div>
    </div>
  );
}
function Mini({
  icon: Icon,
  label,
  onClick,
  tone,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  tone?: "destructive";
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex h-7 items-center gap-1 rounded-full border border-border/60 bg-background px-2.5 text-[11px] font-medium hover:bg-muted",
        tone === "destructive" && "text-destructive border-destructive/30",
      )}
    >
      <Icon className="h-3 w-3" /> {label}
    </button>
  );
}
