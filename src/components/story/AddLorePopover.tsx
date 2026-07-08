import { useState } from "react";
import { User, MapPin, Lightbulb, ImagePlus, X, Plus } from "lucide-react";
import type { LoreType } from "@/lib/story-store";
import { cn } from "@/lib/utils";

export function AddLoreOverlay({
  onPick,
  onClose,
}: {
  onPick: (type: LoreType | "image") => void;
  onClose: () => void;
}) {
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/30 backdrop-blur-sm pb-24"
    >
      <div onClick={(e) => e.stopPropagation()} className="grid grid-cols-2 gap-3 px-6">
        <AddBtn label="Character" icon={User} onClick={() => onPick("character")} />
        <AddBtn label="Place" icon={MapPin} onClick={() => onPick("place")} />
        <AddBtn label="Concept" icon={Lightbulb} onClick={() => onPick("concept")} />
        <AddBtn label="Generate Image" icon={ImagePlus} onClick={() => onPick("image")} />
      </div>
    </div>
  );
}

function AddBtn({
  label,
  icon: Icon,
  onClick,
}: {
  label: string;
  icon: React.ElementType;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 rounded-2xl bg-white p-4 shadow-lg active:scale-95"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color:var(--writer-bg)] text-[color:var(--writer)]">
        <Icon className="h-5 w-5" />
      </span>
      <span className="text-[12px] font-semibold">{label}</span>
    </button>
  );
}

export function AddButton({ open, onClick }: { open: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label={open ? "Close add menu" : "Add lore"}
      className={cn(
        "flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition active:scale-90",
        open && "rotate-45",
      )}
    >
      {open ? <X className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
    </button>
  );
}
