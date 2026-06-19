export type ItemRank = 'D' | 'C' | 'B' | 'A' | 'S' | 'EX';

export type AdventureItemDefinition = {
  id: string;
  name: string;
  rank: ItemRank;
  icon: string;
  description: string;
  kind: 'potion';
  heal: number;
  cooldownMs: number;
};

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
  { id: 'item-01', name: 'Cracked HP Potion', rank: 'D', icon: '🧪', description: 'A weak, cloudy restorative.', kind: 'potion', heal: 18, cooldownMs: 9000 },
  { id: 'item-02', name: 'HP Potion', rank: 'C', icon: '🧪', description: 'A dependable health potion.', kind: 'potion', heal: 35, cooldownMs: 7500 },
  { id: 'item-03', name: 'Fine HP Potion', rank: 'B', icon: '🧪', description: 'A concentrated potion with a quicker recovery.', kind: 'potion', heal: 42, cooldownMs: 6200 },
  { id: 'item-04', name: 'Royal HP Potion', rank: 'A', icon: '🧪', description: 'A rare restorative reserved for dangerous expeditions.', kind: 'potion', heal: 56, cooldownMs: 4800 },
  { id: 'item-05', name: 'Mythic HP Potion', rank: 'S', icon: '🧪', description: 'An exceptional potion carrying deep dungeon magic.', kind: 'potion', heal: 75, cooldownMs: 3400 },
];

export function getAdventureItem(id: string) {
  const item = adventureItemDefinitions.find((candidate) => candidate.id === id);
  if (!item) throw new Error(`Unknown Adventure item: ${id}`);
  return item;
}

export function rollLootTable(table: LootTable | undefined, random = Math.random) {
  const result: { coins: number; itemId?: string } = { coins: 0 };
  if (!table) return result;

  if (table.coin && random() < clampProbability(table.coin.probability)) {
    result.coins = rollAmount(table.coin.amount, random);
  }

  const itemRoll = random();
  let cursor = 0;
  for (const entry of table.loot ?? []) {
    cursor += clampProbability(entry.probability);
    if (itemRoll < cursor) {
      getAdventureItem(entry.itemId);
      result.itemId = entry.itemId;
      break;
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
