export type LoreType = 'character' | 'place' | 'concept' | 'faction';
export type ChapterType = 'canon' | 'draft';
export type BrainstormRole = 'user' | 'assistant';
export type BrainstormMode = 'chat' | 'critic' | 'debater';

export interface BrainstormMessage {
  id: string;
  role: BrainstormRole;
  mode?: BrainstormMode;
  content: string;
  thought?: string;
  recommendations?: string[];
  createdAt: number;
}

export interface LoreItem {
  id: string;
  type: LoreType;
  name: string;
  role?: string;
  description: string;
  imageUrl?: string;
}

export interface Chapter {
  id: string;
  title: string;
  content: string;
  type: ChapterType;
  savedAt: number;
}

export interface CoreBlock {
  id: string;
  title: string;
  body: string;
}

export interface CoreAttachment {
  id: string;
  name: string;
  mime: string;
  dataUrl: string;
  createdAt: number;
}

export interface Core {
  id: string;
  title: string;
  emoji?: string;
  blocks: CoreBlock[];
  attachments?: CoreAttachment[];
}

export interface Goal {
  id: string;
  title: string;
  text: string;
  done: boolean;
  coreId?: string;
  createdAt: number;
  source?: 'ai' | 'user';
  status?: 'suggested' | 'active';
}

export interface LorePendingUpdate {
  id: string;
  candidate: LoreItem;
  existingId: string;
  similarity: number;
  confidence: number;
  createdAt: number;
}

export interface Book {
  id: string;
  name: string;
  title: string;
  subtitle?: string;
  cover: string;
  content: string;
  overview?: string;
  updatedAt: number;
  lore: LoreItem[];
  chapters: Chapter[];
  cores: Core[];
  brainstorm: BrainstormMessage[];
  goals: Goal[];
  candidates: LoreItem[];
  lorePending: LorePendingUpdate[];
}

export interface Branch {
  id: string;
  name: string;
  baseBookId: string;
  originMsgId?: string;
  originSnippet?: string;
  createdAt: number;
}

export type ContextUsage =
  | { kind: "none" }
  | { kind: "agent-used"; entityIds: string[]; label?: string }
  | { kind: "author-constraint"; entityIds: string[]; instruction: string };

export interface PinnedContextItem {
  id: string;
  label: string;
  type: "core" | "lore";
}
