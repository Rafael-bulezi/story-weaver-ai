import { useRef, useState } from "react";
import { X, ImagePlus, Users, Trash2 } from "lucide-react";
import type { BooksApi, LoreItem } from "@/lib/story-store";
import { cn } from "@/lib/utils";
import { toastSuccess, toastError } from "@/lib/toast";

interface Props {
  books: BooksApi;
  onClose: () => void;
}

export function CharacterGallery({ books, onClose }: Props) {
  const active = books.active!;
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [uploadTarget, setUploadTarget] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<LoreItem | null>(null);

  // Check if any lore item has an image
  const hasImages = active.lore.some((l) => l.imageUrl);

  function pickImage(loreId: string) {
    setUploadTarget(loreId);
    fileRef.current?.click();
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f || !uploadTarget) return;
    if (f.size > 5_000_000) {
      toastError("Image over 5MB — choose a smaller file.");
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      books.updateLore(uploadTarget, { imageUrl: String(reader.result) });
      toastSuccess("Image saved");
      setUploadTarget(null);
    };
    reader.readAsDataURL(f);
    e.target.value = "";
  }

  // Group by type for display
  const characters = active.lore.filter((l) => l.type === "character");
  const places = active.lore.filter((l) => l.type === "place");
  const concepts = active.lore.filter((l) => l.type === "concept" || l.type === ("faction" as any));

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="animate-slide-left flex h-full w-[min(90vw,420px)] flex-col border-l border-border bg-background shadow-2xl">
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[color:var(--writer-bg)] text-[color:var(--writer)]">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-semibold">Story Image Gallery</div>
              <div className="text-[10.5px] text-muted-foreground">{active.name}</div>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close gallery"
            className="rounded-full p-1.5 hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 thin-scrollbar">
          {active.lore.length === 0 && (
            <div className="mt-10 text-center text-[13px] text-muted-foreground">
              <Users className="mx-auto mb-3 h-10 w-10 opacity-30" />
              <p>No lore items yet.</p>
              <p className="mt-1 text-[11px]">Add characters, places, and concepts in the Lore tab first.</p>
            </div>
          )}

          {!hasImages && active.lore.length > 0 && (
            <p className="mb-4 text-center text-[11.5px] text-muted-foreground bg-muted/30 py-2 px-3 rounded-xl">
              Tap a card to upload an image for that item.
            </p>
          )}

          {[
            { label: "Characters", items: characters, color: "var(--writer)" },
            { label: "Places", items: places, color: "var(--critic)" },
            { label: "Concepts & Factions", items: concepts, color: "var(--debater)" },
          ]
            .filter((g) => g.items.length > 0)
            .map((group) => (
              <div key={group.label} className="mb-5">
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {group.label}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {group.items.map((item) => (
                    <GalleryCard
                      key={item.id}
                      item={item}
                      accentColor={group.color}
                      onAddImage={() => pickImage(item.id)}
                      onRemoveImage={() => {
                        books.updateLore(item.id, { imageUrl: undefined });
                        toastSuccess("Image removed");
                      }}
                      onExpand={() => setLightbox(item)}
                    />
                  ))}
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setLightbox(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-[90vw] overflow-hidden rounded-3xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {lightbox.imageUrl ? (
              <img
                src={lightbox.imageUrl}
                alt={lightbox.name}
                className="max-h-[80vh] max-w-[80vw] object-contain"
              />
            ) : (
              <div className="flex h-60 w-60 items-center justify-center rounded-3xl bg-card text-6xl">
                {lightbox.type === "character" ? "👤" : lightbox.type === "place" ? "🗺️" : "💡"}
              </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4 text-white">
              <div className="text-base font-semibold">{lightbox.name}</div>
              {lightbox.role && (
                <div className="text-[11px] text-white/70">{lightbox.role}</div>
              )}
              {lightbox.description && (
                <p className="mt-1.5 text-xs text-white/80 line-clamp-2">{lightbox.description}</p>
              )}
            </div>
            <button
              onClick={() => setLightbox(null)}
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function GalleryCard({
  item,
  accentColor,
  onAddImage,
  onRemoveImage,
  onExpand,
}: {
  item: LoreItem;
  accentColor: string;
  onAddImage: () => void;
  onRemoveImage: () => void;
  onExpand: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="group relative overflow-hidden rounded-2xl border border-border/70 bg-card"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Image area */}
      <button
        onClick={item.imageUrl ? onExpand : onAddImage}
        className="relative block w-full text-left"
        aria-label={item.imageUrl ? `View ${item.name}` : `Add image for ${item.name}`}
      >
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            className="h-32 w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div
            className="flex h-32 w-full flex-col items-center justify-center gap-1.5 bg-muted/50 text-muted-foreground transition-colors hover:bg-muted"
          >
            <ImagePlus className="h-6 w-6 opacity-50" />
            <span className="text-[10.5px]">Add image</span>
          </div>
        )}

        {/* Overlay for expand hint */}
        {item.imageUrl && hovered && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <span className="rounded-full bg-black/60 px-2.5 py-1 text-[10.5px] font-medium text-white shadow-sm">
              View
            </span>
          </div>
        )}
      </button>

      {/* Footer */}
      <div className="flex items-center justify-between gap-1 px-2.5 py-2">
        <div className="min-w-0 flex-1">
          <div className="truncate text-[11.5px] font-semibold text-foreground">{item.name}</div>
          {item.role && (
            <div
              className="truncate text-[9.5px] font-medium"
              style={{ color: `color-mix(in srgb, ${accentColor} 85%, currentColor)` }}
            >
              {item.role}
            </div>
          )}
        </div>
        <div className="flex shrink-0 gap-0.5 ml-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddImage();
            }}
            aria-label="Replace image"
            className="rounded-full p-1 hover:bg-muted"
            title="Replace image"
          >
            <ImagePlus className="h-3 w-3 text-muted-foreground hover:text-foreground" />
          </button>
          {item.imageUrl && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemoveImage();
              }}
              aria-label="Remove image"
              className="rounded-full p-1 hover:bg-destructive/10 hover:text-destructive text-muted-foreground"
              title="Remove image"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
