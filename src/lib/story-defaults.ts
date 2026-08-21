import type { LoreItem, Book } from './story-types';

export const DEFAULT_LORE: LoreItem[] = [
  {
    id: 'l1',
    type: 'character',
    name: 'Zeal',
    role: 'Protagonist',
    description: 'A Dawnborn who manipulates cyan light. Searching for the truth behind the Fracture.',
  },
  {
    id: 'l2',
    type: 'character',
    name: 'Nyra',
    role: 'Rogue Seer',
    description: 'Sees fragments of futures the Spire tries to erase.',
  },
  {
    id: 'l3',
    type: 'place',
    name: 'The Spire',
    role: 'Location',
    description: "A governing spine cutting through Astrisol's upper haze.",
  },
  {
    id: 'l4',
    type: 'concept',
    name: 'Aetherlight',
    role: 'Power / Energy',
    description: 'The engineered luminance that structures every path in Astrisol.',
  },
];

export const DEFAULT_BOOKS: Book[] = [
  {
    id: 'b1',
    name: 'Astrisol',
    title: 'Chapter 1 — The Dawnborn',
    subtitle: 'A city that moves before its people do',
    cover: '✦',
    content:
      'Morning had no meaning in Astrisol.\n\nThe city moved before its people did. Ribbons of engineered light — thin, silent pathways — crossed above the structures like frozen currents in the sky.\n\nZeal stood at the edge of a descending light-ribbon, watching it fold into the distance like a thought that refused to finish forming.',
    updatedAt: Date.now(),
    lore: DEFAULT_LORE,
    chapters: [],
    cores: [
      {
        id: 'core1',
        title: 'State of the World',
        emoji: '◈',
        blocks: [
          {
            id: 'cb1',
            title: 'Era',
            body: 'Post-Fracture Astrisol, three generations after the sky split.',
          },
          {
            id: 'cb2',
            title: 'Technology',
            body: 'Aetherlight infrastructure — engineered luminance replaces roads, doors, contracts.',
          },
        ],
      },
    ],
    brainstorm: [],
    goals: [],
    candidates: [],
    lorePending: [],
  },
];
