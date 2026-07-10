import { useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toastSuccess, toastError, toastInfo } from "@/lib/toast";
import {
  User,
  MapPin,
  Lightbulb,
  Trash2,
  Pencil,
  X,
  ImageIcon,
  ImagePlus,
  Wand2,
  Loader2,
  Upload,
} from "lucide-react";

import type { BooksApi, LoreItem, LoreType } from "@/lib/story-store";
import { generateLoreImage } from "@/lib/image.functions";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FloatingAddMenu } from "@/components/story/FloatingAddMenu";

export function LoreTab({ books }: { books: BooksApi }) {
  const active = books.active!;
  const [tab, setTab] = useState<LoreType>("character");
  const filtered = active.lore.filter((i) => i.type === tab);
  const [viewImage, setViewImage] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [pending, setPending] = useState<LoreType | null>(null);

  const tabs: { id: LoreType; label: string; icon: React.ElementType }[] = [
    { id: "character", label: "Characters", icon: User },
    { id: "place", label: "Places", icon: MapPin },
    { id: "concept", label: "Concepts", icon: Lightbulb },
  ];

  return (
    <div className="relative mx-auto flex h-full w-full max-w-2xl flex-col">
      <div className="flex items-center gap-1 border-b border-border/60 px-3 py-2">
        {tabs.map(({ id, label, icon: Icon }) => {
          const count = active.lore.filter((i) => i.type === id).length;
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                "flex h-8 items-center gap-1.5 rounded-full px-3 text-[12px] font-medium",
                tab === id ? "bg-primary text-primary-foreground" : "text-muted-foreground",
              )}
            >
              <Icon className="h-3.5 w-3.5" /> {label}
              {count > 0 && <span className="ml-0.5 text-[11px] opacity-70">{count}</span>}
            </button>
          );
        })}
      </div>
      <div className="no-scrollbar flex-1 space-y-2 overflow-y-auto px-4 py-4 pb-28">
        {filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Nothing here yet. Use the <span className="font-medium">+</span> button above the nav.
          </div>
        )}
        {filtered.map((item) => (
          <LoreRow
            key={item.id}
            item={item}
            onSave={(patch) => {
              books.updateLore(item.id, patch);
              toast.success("Updated");
            }}
            onDelete={() => books.removeLore(item.id)}
            onViewImage={() => item.imageUrl && setViewImage(item.imageUrl)}
          />
        ))}
      </div>

      {pending && (
        <div
          className="animate-soft-fade-in fixed inset-0 z-50 flex items-end bg-black/40 backdrop-blur-sm"
          onClick={() => setPending(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="animate-slide-up-fade w-full rounded-t-3xl border-t border-border bg-background p-4 pb-[calc(env(safe-area-inset-bottom)+80px)]"
          >
            <div className="mx-auto max-w-lg">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                New {pending}
              </div>
              <LoreEditor
                initialType={pending}
                onCancel={() => setPending(null)}
                onSave={(v) => {
                  books.addLore({
                    type: v.type ?? pending,
                    name: v.name,
                    role: v.role,
                    description: v.description,
                    imageUrl: v.imageUrl,
                  });
                  setPending(null);
                  toast.success("Added to lore");
                }}
              />
            </div>
          </div>
        </div>
      )}

      {viewImage && (
        <div
          className="animate-soft-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
          onClick={() => setViewImage(null)}
        >
          <img src={viewImage} alt="Lore" className="max-h-full max-w-full rounded-xl" />
        </div>
      )}

      <FloatingAddMenu
        open={addOpen}
        onOpenChange={setAddOpen}
        options={[
          { id: "char", label: "Character", icon: User, onClick: () => setPending("character") },
          { id: "place", label: "Place", icon: MapPin, onClick: () => setPending("place") },
          { id: "concept", label: "Concept", icon: Lightbulb, onClick: () => setPending("concept") },
          {
            id: "image",
            label: "Generate Image",
            icon: ImagePlus,
            onClick: () => {
              setPending("character");
              toast.info("Add a character/place/concept then tap Generate.");
            },
          },
        ]}
      />
    </div>
  );
}

function LoreRow({
  item,
  onSave,
  onDelete,
  onViewImage,
}: {
  item: LoreItem;
  onSave: (patch: Partial<LoreItem>) => void;
  onDelete: () => void;
  onViewImage: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const Icon = item.type === "character" ? User : item.type === "place" ? MapPin : Lightbulb;
  if (editing) {
    return (
      <LoreEditor
        item={item}
        onCancel={() => setEditing(false)}
        onSave={(v) => {
          onSave(v);
          setEditing(false);
        }}
      />
    );
  }
  return (
    <div className="group rounded-2xl border border-border/70 bg-card p-3 transition-shadow hover:shadow-md">
      <div className="flex items-start gap-3">
        {item.imageUrl ? (
          <button onClick={onViewImage} className="h-12 w-12 shrink-0 overflow-hidden rounded-xl">
            <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
          </button>
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted">
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{item.name}</div>
              {item.role && (
                <div className="truncate text-[11px] text-muted-foreground">{item.role}</div>
              )}
            </div>
            <div className="flex gap-1">
              {item.imageUrl && (
                <button
                  onClick={onViewImage}
                  className="rounded-full p-1.5 hover:bg-muted"
                  aria-label="View image"
                >
                  <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              )}
              <button
                onClick={() => setEditing(true)}
                className="rounded-full p-1.5 hover:bg-muted"
                aria-label="Edit"
              >
                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
              <button
                onClick={onDelete}
                className="rounded-full p-1.5 hover:bg-muted"
                aria-label="Delete"
              >
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </div>
          </div>
          {item.description && (
            <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
              {item.description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function LoreEditor({
  item,
  initialType,
  onCancel,
  onSave,
}: {
  item?: LoreItem;
  initialType?: LoreType;
  onCancel: () => void;
  onSave: (v: {
    name: string;
    role?: string;
    description: string;
    imageUrl?: string;
    type?: LoreType;
  }) => void;
}) {
  const type = item?.type ?? initialType ?? "character";
  const [name, setName] = useState(item?.name ?? "");
  const [role, setRole] = useState(item?.role ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [imageUrl, setImageUrl] = useState<string | undefined>(item?.imageUrl);
  const [generating, setGenerating] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const genImage = useServerFn(generateLoreImage);

  function pickFile() {
    fileRef.current?.click();
  }
  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 2_000_000) {
      toast.error("Image over 2MB — pick smaller.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImageUrl(String(reader.result));
    reader.readAsDataURL(f);
  }
  async function generate() {
    if (!name.trim()) {
      toast.error("Add a name first");
      return;
    }
    setGenerating(true);
    try {
      const prompt = `${type === "character" ? "Portrait of a character" : type === "place" ? "Illustration of a place" : "Symbolic illustration of a concept"} named ${name}. ${role ? `${role}. ` : ""}${description}. Cinematic, painterly, moody lighting.`;
      const { dataUrl } = await genImage({ data: { prompt } });
      setImageUrl(dataUrl);
      toast.success("Image generated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="mb-3 space-y-2 rounded-2xl border border-border bg-card p-3">
      <div className="flex items-start gap-3">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-border/60 bg-muted">
          {imageUrl ? (
            <>
              <img src={imageUrl} alt="" className="h-full w-full object-cover" />
              <button
                onClick={() => setImageUrl(undefined)}
                className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white"
                aria-label="Remove image"
              >
                <X className="h-3 w-3" />
              </button>
            </>
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <ImageIcon className="h-5 w-5" />
            </div>
          )}
        </div>
        <div className="flex-1 space-y-1.5">
          <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input
            placeholder={
              type === "character"
                ? "Role (e.g. Protagonist)"
                : type === "place"
                  ? "Kind (e.g. City)"
                  : "Category"
            }
            value={role}
            onChange={(e) => setRole(e.target.value)}
          />
        </div>
      </div>
      <Textarea
        rows={3}
        placeholder="Description — what should the AI always remember?"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
      <div className="flex flex-wrap gap-1.5">
        <Button
          size="sm"
          variant="outline"
          onClick={pickFile}
          className="h-8 rounded-full text-[11.5px]"
        >
          <Upload className="mr-1 h-3.5 w-3.5" /> Attach
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={generate}
          disabled={generating}
          className="h-8 rounded-full text-[11.5px]"
        >
          {generating ? (
            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Wand2 className="mr-1 h-3.5 w-3.5" />
          )}{" "}
          Generate
        </Button>
      </div>
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          size="sm"
          disabled={!name.trim()}
          onClick={() =>
            onSave({
              name: name.trim(),
              role: role.trim() || undefined,
              description: description.trim(),
              imageUrl,
              type,
            })
          }
        >
          Save
        </Button>
      </div>
    </div>
  );
}
