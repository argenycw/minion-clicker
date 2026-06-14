export type OutfitDefinition = {
  id: string;
  name: string;
  glyph?: string;
  description: string;
  color: string;
  offsetX?: number;
  offsetY?: number;
  maxHpBonus?: number;
  speedBonus?: number;
  damageBonus?: number;
};

export const outfitDefinitions: OutfitDefinition[] = [
  { id: 'outfit-00', name: 'No Outfit', description: 'The classic unadorned look.', color: '#687282' },
  { id: 'outfit-01', name: 'Trail Scarf', glyph: '⌁', description: 'A light scarf for long walks. Speed +15.', color: '#d94f5f', offsetY: 11, speedBonus: 15 },
  { id: 'outfit-02', name: 'Sturdy Cap', glyph: '⌒', description: 'A reassuringly solid cap. Max HP +10.', color: '#4777bd', offsetY: -18, maxHpBonus: 10 },
  { id: 'outfit-03', name: 'Spark Charm', glyph: '✦', description: 'A tiny charm with unreasonable confidence. Damage +2.', color: '#f0a729', offsetX: 19, offsetY: 7, damageBonus: 2 },
];

export function getOutfit(id: string | undefined) {
  return outfitDefinitions.find((outfit) => outfit.id === id) ?? outfitDefinitions[0];
}
