import type { SpriteRef } from '../../shared/sprites';
import type { CraftingMaterialCategory, CraftingRecipeEntry, CraftingRecipeOutcome } from './crafting/types';

export type ItemRank = 'D' | 'C' | 'B' | 'A' | 'S' | 'EX';

type AdventureItemBaseDefinition = {
  id: string;
  name: string;
  rank: ItemRank;
  icon: string;
  iconSprite?: SpriteRef;
  description: string;
  recipe?: CraftingRecipeEntry[];
  recipeOutcomes?: CraftingRecipeOutcome[];
};

export type PotionItemDefinition = AdventureItemBaseDefinition & {
  kind: 'potion';
  heal: number;
  cooldownMs: number;
};

export type MaterialItemDefinition = AdventureItemBaseDefinition & {
  kind: 'material';
  category: CraftingMaterialCategory;
};

export type RuneItemDefinition = AdventureItemBaseDefinition & {
  kind: 'rune';
};

export type AdventureItemDefinition = PotionItemDefinition | MaterialItemDefinition | RuneItemDefinition;

export type LootAmount = number | [number, number];

export type LootTable = {
  coin?: {
    probability: number;
    amount: LootAmount;
  };
  loot?: Array<{
    itemId: string;
    probability: number;
  }>;
};

export const CRAFTING_MATERIAL_PLACEHOLDER_SPRITE: SpriteRef = { sheetId: 'sheet-01', x: 7, y: 10 };

export const ITEM_RANK_COLORS: Record<ItemRank, string> = {
  D: '#666d76',
  C: '#343a43',
  B: '#287a3b',
  A: '#2867ad',
  S: '#7543a8',
  EX: '#a9560b',
};

export const ITEM_RANK_BACKGROUNDS: Record<ItemRank, string> = {
  D: '#d8dadd',
  C: '#ecebea',
  B: '#d8eddb',
  A: '#d9e7f7',
  S: '#e8dcf3',
  EX: '#f6dfca',
};

export const ITEM_RANK_EFFECT_COLORS: Record<ItemRank, string> = {
  D: '#858b93',
  C: '#c7c5c1',
  B: '#55b96c',
  A: '#4f8ee8',
  S: '#a46be0',
  EX: '#ee8b2d',
};

export const adventureItemDefinitions: AdventureItemDefinition[] = [
  // consumeable items
  {
    id: 'item-01',
    name: 'Cracked HP Potion',
    rank: 'D',
    icon: '🧪',
    description: 'A weak, cloudy restorative.',
    kind: 'potion',
    heal: 18,
    cooldownMs: 9000,
    recipe: [{ kind: 'category', id: 'food-base', category: 'food', count: 2, qualityWeight: 0.65 }, { kind: 'item', id: 'mana-catalyst', materialId: 'magical-product-01', count: 1, qualityWeight: 0.35 }],
    recipeOutcomes: [{ itemId: 'item-01', minQuality: 0 }, { itemId: 'item-02', minQuality: 2.6 }],
  },
  {
    id: 'item-02',
    name: 'HP Potion',
    rank: 'C',
    icon: '🧪',
    description: 'A dependable health potion.',
    kind: 'potion',
    heal: 35,
    cooldownMs: 7500,
    recipe: [{ kind: 'category', id: 'food-base', category: 'food', count: 3, minRank: 'C', qualityWeight: 0.55 }, { kind: 'item', id: 'mushroom', materialId: 'food-02', count: 1, qualityWeight: 0.2 }, { kind: 'item', id: 'mana-catalyst', materialId: 'magical-product-01', count: 1, qualityWeight: 0.25 }],
    recipeOutcomes: [{ itemId: 'item-02', minQuality: 0 }, { itemId: 'item-03', minQuality: 2.8 }],
  },
  {
    id: 'item-03',
    name: 'Fine HP Potion',
    rank: 'B',
    icon: '🧪',
    description: 'A concentrated potion with a quicker recovery.',
    kind: 'potion',
    heal: 42,
    cooldownMs: 6200,
    recipe: [{ kind: 'category', id: 'food-base', category: 'food', count: 3, minRank: 'C', qualityWeight: 0.45 }, { kind: 'item', id: 'mana-dust', materialId: 'magical-product-01', count: 2, qualityWeight: 0.25 }, { kind: 'item', id: 'arcane-crystal', materialId: 'magical-product-02', count: 1, qualityWeight: 0.3 }],
    recipeOutcomes: [{ itemId: 'item-03', minQuality: 0 }, { itemId: 'item-04', minQuality: 3.4 }],
  },
  {
    id: 'item-04',
    name: 'Royal HP Potion',
    rank: 'A',
    icon: '🧪',
    description: 'A rare restorative reserved for dangerous expeditions.',
    kind: 'potion',
    heal: 56,
    cooldownMs: 4800,
    recipe: [{ kind: 'category', id: 'food-base', category: 'food', count: 5, minRank: 'C', qualityWeight: 0.35 }, { kind: 'item', id: 'arcane-crystal', materialId: 'magical-product-02', count: 2, qualityWeight: 0.35 }, { kind: 'category', id: 'gem-focus', category: 'gem', count: 1, minRank: 'A', qualityWeight: 0.3 }],
    recipeOutcomes: [{ itemId: 'item-04', minQuality: 0 }, { itemId: 'item-05', minQuality: 3.9 }],
  },
  {
    id: 'item-05',
    name: 'Mythic HP Potion',
    rank: 'S',
    icon: '🧪',
    description: 'An exceptional potion carrying deep dungeon magic.',
    kind: 'potion',
    heal: 75,
    cooldownMs: 3400,
    recipe: [{ kind: 'category', id: 'food-base', category: 'food', count: 8, minRank: 'C', qualityWeight: 0.25 }, { kind: 'item', id: 'arcane-crystal', materialId: 'magical-product-02', count: 4, qualityWeight: 0.4 }, { kind: 'category', id: 'gem-focus', category: 'gem', count: 2, minRank: 'A', qualityWeight: 0.35 }],
  },
  {
    id: 'item-06',
    name: 'Dull Rune',
    rank: 'C',
    icon: '[]',
    iconSprite: CRAFTING_MATERIAL_PLACEHOLDER_SPRITE,
    description: 'A practice rune for future augmentation crafting.',
    kind: 'rune',
    recipe: [{ kind: 'category', id: 'stone-base', category: 'stone', count: 4, qualityWeight: 0.55 }, { kind: 'item', id: 'mana-dust', materialId: 'magical-product-01', count: 2, qualityWeight: 0.25 }, { kind: 'item', id: 'arcane-crystal', materialId: 'magical-product-02', count: 1, qualityWeight: 0.2 }],
  },

  // materials
  { id: 'junk-01', name: 'Bent Nail', rank: 'D', icon: '[]', iconSprite: CRAFTING_MATERIAL_PLACEHOLDER_SPRITE, description: 'A rusted nail pulled from broken gear. Useless except to sell to a merchant.', kind: 'material', category: 'junk' },
  { id: 'junk-02', name: 'Torn Tag', rank: 'D', icon: '[]', iconSprite: CRAFTING_MATERIAL_PLACEHOLDER_SPRITE, description: 'A label from something nobody wants to identify. Useless except to sell to a merchant.', kind: 'material', category: 'junk' },
  { id: 'junk-03', name: 'Cracked Button', rank: 'D', icon: '[]', iconSprite: CRAFTING_MATERIAL_PLACEHOLDER_SPRITE, description: 'A damaged button with no matching garment. Useless except to sell to a merchant.', kind: 'material', category: 'junk' },
  { id: 'food-01', name: 'Wild Berry', rank: 'C', icon: '[]', iconSprite: CRAFTING_MATERIAL_PLACEHOLDER_SPRITE, description: 'A common edible berry. Can be eaten for a tiny recovery later and is useful for basic cooking.', kind: 'material', category: 'food' },
  { id: 'food-02', name: 'Field Mushroom', rank: 'C', icon: '[]', iconSprite: CRAFTING_MATERIAL_PLACEHOLDER_SPRITE, description: 'A mild mushroom used in simple meals and restorative mixtures. Intended for small food buffs.', kind: 'material', category: 'food' },
  { id: 'wood-01', name: 'Softwood', rank: 'D', icon: '[]', iconSprite: CRAFTING_MATERIAL_PLACEHOLDER_SPRITE, description: 'Light, common timber from small trees and broken crates.', kind: 'material', category: 'wood' },
  { id: 'wood-02', name: 'Hardwood', rank: 'C', icon: '[]', iconSprite: CRAFTING_MATERIAL_PLACEHOLDER_SPRITE, description: 'Dense timber suited for handles, frames, and sturdier crafting recipes.', kind: 'material', category: 'wood' },
  { id: 'wood-03', name: 'Oak Plank', rank: 'B', icon: '[]', iconSprite: CRAFTING_MATERIAL_PLACEHOLDER_SPRITE, description: 'A cut plank of durable oak for higher-grade wooden components.', kind: 'material', category: 'wood' },
  { id: 'stone-01', name: 'Cobblestone', rank: 'D', icon: '[]', iconSprite: CRAFTING_MATERIAL_PLACEHOLDER_SPRITE, description: 'Rough building stone from rocks, rubble, and ruined walls.', kind: 'material', category: 'stone' },
  { id: 'stone-02', name: 'Limestone', rank: 'C', icon: '[]', iconSprite: CRAFTING_MATERIAL_PLACEHOLDER_SPRITE, description: 'A workable pale stone used for masonry and basic reinforcement.', kind: 'material', category: 'stone' },
  { id: 'stone-03', name: 'Marble', rank: 'B', icon: '[]', iconSprite: CRAFTING_MATERIAL_PLACEHOLDER_SPRITE, description: 'A polished stone used in durable structures and refined crafting.', kind: 'material', category: 'stone' },
  { id: 'mineral-01', name: 'Copper Ore', rank: 'D', icon: '[]', iconSprite: CRAFTING_MATERIAL_PLACEHOLDER_SPRITE, description: 'A soft metal ore used for simple fittings and low-tier blacksmithing.', kind: 'material', category: 'mineral' },
  { id: 'mineral-02', name: 'Coal', rank: 'D', icon: '[]', iconSprite: CRAFTING_MATERIAL_PLACEHOLDER_SPRITE, description: 'Fuel for smelting and blacksmithing. Dirty, common, and useful.', kind: 'material', category: 'mineral' },
  { id: 'mineral-03', name: 'Iron Ore', rank: 'C', icon: '[]', iconSprite: CRAFTING_MATERIAL_PLACEHOLDER_SPRITE, description: 'A practical blacksmithing ore for early weapon and armor work.', kind: 'material', category: 'mineral' },
  { id: 'mineral-04', name: 'Aluminium Ore', rank: 'C', icon: '[]', iconSprite: CRAFTING_MATERIAL_PLACEHOLDER_SPRITE, description: 'A light metal ore suited for fast equipment and utility crafting.', kind: 'material', category: 'mineral' },
  { id: 'mineral-05', name: 'Silver Ore', rank: 'B', icon: '[]', iconSprite: CRAFTING_MATERIAL_PLACEHOLDER_SPRITE, description: 'A valuable ore used in fine metalwork and some enchanting recipes.', kind: 'material', category: 'mineral' },
  { id: 'gem-01', name: 'Ruby', rank: 'A', icon: '[]', iconSprite: CRAFTING_MATERIAL_PLACEHOLDER_SPRITE, description: 'A red gemstone used for high-grade crafting and fire-aspected enchantments.', kind: 'material', category: 'gem' },
  { id: 'gem-02', name: 'Sapphire', rank: 'A', icon: '[]', iconSprite: CRAFTING_MATERIAL_PLACEHOLDER_SPRITE, description: 'A blue gemstone used for high-grade crafting and ice-aspected enchantments.', kind: 'material', category: 'gem' },
  { id: 'leather-01', name: 'Rawhide', rank: 'D', icon: '[]', iconSprite: CRAFTING_MATERIAL_PLACEHOLDER_SPRITE, description: 'Untreated hide taken from defeated creatures. Used for basic leatherwork.', kind: 'material', category: 'leather' },
  { id: 'leather-02', name: 'Cured Leather', rank: 'C', icon: '[]', iconSprite: CRAFTING_MATERIAL_PLACEHOLDER_SPRITE, description: 'Prepared leather suitable for armor straps, grips, and travel gear.', kind: 'material', category: 'leather' },
  { id: 'cloth-01', name: 'Linen Scrap', rank: 'D', icon: '[]', iconSprite: CRAFTING_MATERIAL_PLACEHOLDER_SPRITE, description: 'A small piece of cloth gathered from defeated minions or old containers.', kind: 'material', category: 'cloth' },
  { id: 'cloth-02', name: 'Wool Cloth', rank: 'C', icon: '[]', iconSprite: CRAFTING_MATERIAL_PLACEHOLDER_SPRITE, description: 'Warm, serviceable cloth for padding, cooking wraps, and simple tailoring.', kind: 'material', category: 'cloth' },
  { id: 'magical-product-01', name: 'Mana Dust', rank: 'C', icon: '[]', iconSprite: CRAFTING_MATERIAL_PLACEHOLDER_SPRITE, description: 'A small residue of usable magic. Commonly used in enchanting and potion work.', kind: 'material', category: 'magical-product' },
  { id: 'magical-product-02', name: 'Arcane Crystal', rank: 'B', icon: '[]', iconSprite: CRAFTING_MATERIAL_PLACEHOLDER_SPRITE, description: 'A condensed magical product used for stronger enchantments and advanced recipes.', kind: 'material', category: 'magical-product' },
];

export function getAdventureItem(id: string) {
  const item = adventureItemDefinitions.find((candidate) => candidate.id === id);
  if (!item) throw new Error(`Unknown Adventure item: ${id}`);
  return item;
}

export function rollLootTable(table: LootTable | undefined, random = Math.random) {
  const result: { coins: number; itemIds: string[] } = { coins: 0, itemIds: [] };
  if (!table) return result;

  if (table.coin && random() < clampProbability(table.coin.probability)) {
    result.coins = rollAmount(table.coin.amount, random);
  }

  for (const entry of table.loot ?? []) {
    if (random() < clampProbability(entry.probability)) {
      getAdventureItem(entry.itemId);
      result.itemIds.push(entry.itemId);
    }
  }
  return result;
}

function rollAmount(amount: LootAmount, random: () => number) {
  if (typeof amount === 'number') return Math.max(0, Math.floor(amount));
  const min = Math.max(0, Math.ceil(Math.min(...amount)));
  const max = Math.max(min, Math.floor(Math.max(...amount)));
  return min + Math.floor(random() * (max - min + 1));
}

function clampProbability(value: number) {
  return Math.max(0, Math.min(1, value));
}
