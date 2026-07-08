import { SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Library, Plus, X, ChevronLeft, Download, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import type { BooksApi } from "@/lib/story-store";
import { cn } from "@/lib/utils";

export function SideMenu({ books, onClose }: { books: BooksApi; onClose: () => void }) {
  function exportData() {
    const data = typeof window !== "undefined" ? localStorage.getItem("sc:books:v4") : null;
    if (!data) return;
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `story-canvas-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
  function clearAll() {
    if (confirm("Delete all books, lore, and chapters? This cannot be undone.")) {
      localStorage.removeItem("sc:books:v4");
      localStorage.removeItem("sc:active-book");
      window.location.reload();
    }
  }
  return (
    <SheetContent side="left" className="w-[88vw] max-w-sm border-r border-border p-0">
      <div className="flex h-full flex-col">
        <SheetHeader className="flex flex-row items-center justify-between border-b border-border/60 px-4 pb-3 pt-5 text-left">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Library className="h-4 w-4" /> Your Books
          </SheetTitle>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1.5 hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto p-3">
          <button
            onClick={() => {
              const id = books.createBook({ name: "Untitled Book" });
              books.setActiveId(id);
              onClose();
            }}
            className="mb-3 flex w-full items-center gap-2 rounded-2xl border border-dashed border-border p-3 text-left text-sm text-muted-foreground hover:bg-muted/40"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Plus className="h-4 w-4" />
            </div>
            New book
          </button>
          <div className="space-y-1.5">
            {books.books.map((b) => (
              <BookRow
                key={b.id}
                book={b}
                isActive={books.activeId === b.id}
                onOpen={() => {
                  books.setActiveId(b.id);
                  onClose();
                }}
                onRename={(name) => books.updateBook(b.id, { name })}
                onDelete={() => {
                  if (confirm(`Delete "${b.name}"?`)) books.deleteBook(b.id);
                }}
              />
            ))}
          </div>
          <button
            onClick={() => {
              books.setActiveId(null);
              onClose();
            }}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-2xl border border-border/60 bg-card p-2.5 text-[12px] font-medium text-muted-foreground hover:bg-muted"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Back to Library
          </button>
        </div>
        <div className="space-y-1.5 border-t border-border/60 p-3">
          <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Settings
          </div>
          <button
            onClick={exportData}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[13px] hover:bg-muted"
          >
            <Download className="h-4 w-4 text-muted-foreground" /> Export data
          </button>
          <button
            onClick={clearAll}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[13px] text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" /> Clear all data
          </button>
        </div>
      </div>
    </SheetContent>
  );
}

function BookRow({
  book,
  isActive,
  onOpen,
  onRename,
  onDelete,
}: {
  book: { id: string; name: string; cover?: string; lore: unknown[]; chapters: unknown[] };
  isActive: boolean;
  onOpen: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(book.name);
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-2xl border p-3 transition",
        isActive
          ? "border-primary/40 bg-[color:var(--writer-bg)]"
          : "border-border/70 bg-card hover:bg-muted/40",
      )}
    >
      <button
        onClick={onOpen}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted font-serif text-lg"
      >
        {book.cover ?? "◇"}
      </button>
      <div className="min-w-0 flex-1">
        {editing ? (
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => {
              onRename(name.trim() || "Untitled");
              setEditing(false);
              toast.success("Renamed");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
            className="w-full bg-transparent text-sm font-semibold outline-none"
          />
        ) : (
          <button onClick={onOpen} className="block w-full text-left">
            <div className="truncate text-sm font-semibold">{book.name}</div>
          </button>
        )}
        <div className="mt-1 flex gap-2 text-[10.5px] text-muted-foreground">
          <span>{book.lore.length} lore</span>
          <span>·</span>
          <span>{book.chapters.length} chapters</span>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <button
          onClick={() => setEditing(true)}
          className="rounded-full p-1 hover:bg-muted"
          aria-label="Rename"
        >
          <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
        <button onClick={onDelete} className="rounded-full p-1 hover:bg-muted" aria-label="Delete">
          <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}
