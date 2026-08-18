import { SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Library, Plus, X, ChevronLeft, Download, Trash2, Pencil, Search } from "lucide-react";
import { toastSuccess, toastError } from "@/lib/toast";
import { useState } from "react";
import type { BooksApi } from "@/lib/story-store";
import { cn } from "@/lib/utils";

export function SideMenu({ books, onClose }: { books: BooksApi; onClose: () => void }) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredBooks = books.books.filter((b) =>
    b.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  return <SheetContent side="left" className="w-[70vw] max-w-xs border-r border-border p-0 bg-background text-foreground">
      <div className="flex h-full flex-col">
        {/* Header */}
        <SheetHeader className="flex flex-row items-center justify-between border-b border-border/60 px-4 pb-3 pt-5 text-left shrink-0">
          <SheetTitle className="flex items-center gap-2 text-base font-semibold">
            <Library className="h-4 w-4 text-primary" /> Library & Books
          </SheetTitle>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1.5 hover:bg-muted text-muted-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </SheetHeader>

        {/* Search Bar */}
        <div className="px-4 py-2 border-b border-border/40 shrink-0">
          <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-[12.5px] outline-none placeholder-muted-foreground"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="text-muted-foreground hover:text-foreground text-xs">
                ×
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Books List */}
        <div className="flex-1 overflow-y-auto thin-scrollbar p-3 space-y-2">
          
          {/* Library Overview Tile */}
          <button
            onClick={() => {
              books.setActiveId(null);
              onClose();
            }}
            className="flex items-center gap-3.5 w-full rounded-2xl border border-border/70 bg-card p-3 text-left transition hover:border-primary/50 hover:bg-muted/30"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Library className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-bold text-foreground">Library Hub</div>
              <div className="text-[9px] text-muted-foreground">Switch or create projects</div>
            </div>
          </button>

          {/* New Book Creator */}
          <button
            onClick={() => {
              const id = books.createBook({ name: "Untitled Book" });
              books.setActiveId(id);
              onClose();
            }}
            className="flex w-full items-center gap-3.5 rounded-2xl border border-dashed border-border/80 p-3 text-left transition hover:bg-muted/40"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted border border-border text-foreground">
              <Plus className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
                <div className="text-[11px] font-bold text-foreground">Create New Book</div>
                <div className="text-[9px] text-muted-foreground">Draft a fresh manuscript</div>
            </div>
          </button>

          <div className="h-px bg-border/40 my-3" />

          {/* Books Grid/List */}
          <div className="space-y-2">
            {filteredBooks.length === 0 ? (
              <div className="text-center text-xs text-muted-foreground py-6 border border-dashed border-border/50 rounded-2xl">
                No matching projects found
              </div>
            ) : (
              filteredBooks.map((b) => (
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
              ))
            )}
          </div>
        </div>

        {/* Global actions at bottom */}
        <div className="space-y-1 border-t border-border/60 p-3 shrink-0 bg-muted/20">
          <div className="px-2 pb-1.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
            System & Storage
          </div>
          <button
            onClick={exportData}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[12.5px] hover:bg-muted transition font-medium text-foreground"
          >
            <Download className="h-4 w-4 text-muted-foreground" /> Export backups
          </button>
          <button
            onClick={clearAll}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[12.5px] text-destructive hover:bg-destructive/10 transition font-semibold"
          >
            <Trash2 className="h-4 w-4" /> Wipe application
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

  // Dynamic Unsplash Cover builder
  const coverUrl = (() => {
    if (book.cover && book.cover.startsWith("http")) return book.cover;
    const covers = [
      "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&w=120&q=60", // old book
      "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=120&q=60", // library study
      "https://images.unsplash.com/photo-1463171359979-300c485785f1?auto=format&fit=crop&w=120&q=60", // dark tower
      "https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=120&q=60"  // twilight fantasy
    ];
    const hash = book.id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return covers[hash % covers.length];
  })();

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-2xl border p-2.5 transition group",
        isActive
          ? "border-primary/50 bg-primary/5 dark:bg-primary/10"
          : "border-border/60 bg-card hover:bg-muted/40",
      )}
    >
      <button
        onClick={onOpen}
        className="relative h-14 w-10 shrink-0 overflow-hidden rounded-lg border border-border/75 shadow-sm bg-muted active:scale-95 transition"
      >
        <img src={coverUrl} alt="" className="h-full w-full object-cover" />
      </button>
      
      <div className="min-w-0 flex-1 pt-0.5">
        {editing ? (
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => {
              onRename(name.trim() || "Untitled");
              setEditing(false);
              toastSuccess("Renamed");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
            className="w-full bg-transparent text-[13px] font-bold outline-none border-b border-primary/50 py-0.5"
          />
        ) : (
          <button onClick={onOpen} className="block w-full text-left">
            <div className="truncate text-[13.5px] font-bold text-foreground group-hover:text-primary transition-colors">
              {book.name}
            </div>
          </button>
        )}
        <div className="mt-1 flex items-center gap-1.5 text-[10px] text-muted-foreground font-semibold">
          <span>{book.lore.length} lore</span>
          <span>·</span>
          <span>{book.chapters.length} chapters</span>
        </div>
      </div>

      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity self-center">
        <button
          onClick={() => setEditing(true)}
          className="rounded-full p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground"
          aria-label="Rename"
        >
          <Pencil className="h-3 w-3" />
        </button>
        <button
          onClick={onDelete}
          className="rounded-full p-1.5 hover:bg-muted text-muted-foreground hover:text-destructive"
          aria-label="Delete"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
