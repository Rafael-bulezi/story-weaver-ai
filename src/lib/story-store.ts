import { useEffect, useState, useCallback } from "react";

export type LoreType = "character" | "place" | "concept";

export interface LoreItem {
  id: string;
  type: LoreType;
  name: string;
  role?: string;
  description: string;
}

export interface Story {
  title: string;
  content: string;
  updatedAt: number;
}

const STORY_KEY = "sc:story";
const LORE_KEY = "sc:lore";

const DEFAULT_STORY: Story = {
  title: "Chapter 1",
  content:
    "Morning had no meaning in Astrisol.\n\nThe city moved before its people did. Ribbons of engineered light — thin, silent pathways — crossed above the structures like frozen currents in the sky.\n\nZeal stood at the edge of a descending light-ribbon, watching it fold into the distance like a thought that refused to finish forming.",
  updatedAt: Date.now(),
};

const DEFAULT_LORE: LoreItem[] = [
  {
    id: "l1",
    type: "character",
    name: "Zeal",
    role: "Protagonist",
    description:
      "A Dawnborn who manipulates cyan light. Searching for the truth behind the Fracture.",
  },
  {
    id: "l2",
    type: "character",
    name: "Nyra",
    role: "Rogue Seer",
    description: "Sees fragments of futures the Spire tries to erase.",
  },
  {
    id: "l3",
    type: "place",
    name: "The Spire",
    role: "Location",
    description: "A governing spine cutting through Astrisol's upper haze.",
  },
  {
    id: "l4",
    type: "concept",
    name: "Aetherlight",
    role: "Power / Energy",
    description: "The engineered luminance that structures every path in Astrisol.",
  },
];

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, val: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(val));
}

export function useStory() {
  const [story, setStory] = useState<Story>(DEFAULT_STORY);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setStory(read(STORY_KEY, DEFAULT_STORY));
    setHydrated(true);
  }, []);

  const update = useCallback((patch: Partial<Story>) => {
    setStory((prev) => {
      const next = { ...prev, ...patch, updatedAt: Date.now() };
      write(STORY_KEY, next);
      return next;
    });
  }, []);

  return { story, update, hydrated };
}

export function useLore() {
  const [items, setItems] = useState<LoreItem[]>(DEFAULT_LORE);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setItems(read(LORE_KEY, DEFAULT_LORE));
    setHydrated(true);
  }, []);

  const persist = (next: LoreItem[]) => {
    setItems(next);
    write(LORE_KEY, next);
  };

  const add = (item: Omit<LoreItem, "id">) => {
    const next = [...items, { ...item, id: `l${Date.now()}` }];
    persist(next);
  };
  const remove = (id: string) => persist(items.filter((i) => i.id !== id));
  const updateItem = (id: string, patch: Partial<LoreItem>) =>
    persist(items.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  return { items, add, remove, updateItem, hydrated };
}

export function loreToPrompt(items: LoreItem[]): string {
  if (!items.length) return "(no lore yet)";
  const grouped: Record<LoreType, LoreItem[]> = { character: [], place: [], concept: [] };
  items.forEach((i) => grouped[i.type].push(i));
  const section = (label: string, arr: LoreItem[]) =>
    arr.length
      ? `${label}:\n${arr.map((i) => `- ${i.name}${i.role ? ` (${i.role})` : ""}: ${i.description}`).join("\n")}`
      : "";
  return [
    section("Characters", grouped.character),
    section("Places", grouped.place),
    section("Concepts", grouped.concept),
  ]
    .filter(Boolean)
    .join("\n\n");
}
