import { getTrait, getWeapon } from '../content';
import { getAdventureItem, type ItemRank } from '../loot';
import type { AdventureState } from '../state';
import type { PotionStack, TraitStack } from '../inventory/types';
import { getShopDefinition } from './definitions';
import type { ShopId, ShopStockDefinition, ShopStockId } from './types';

// Selectors

export function getShopStock(shopId: ShopId, stockId: ShopStockId) {
  return getShopDefinition(shopId).stock.find((stock) => stock.id === stockId);
}

export function getShopStockName(stock: ShopStockDefinition) {
  return stock.kind === 'potion' ? getAdventureItem(stock.itemId).name : getTrait(stock.traitId).name;
}

export function getShopStockIcon(stock: ShopStockDefinition) {
  return stock.kind === 'potion' ? getAdventureItem(stock.itemId).icon : getTrait(stock.traitId).icon;
}

export function getShopStockRank(stock: ShopStockDefinition): ItemRank {
  return stock.kind === 'potion' ? getAdventureItem(stock.itemId).rank : getTrait(stock.traitId).rank;
}

export function getInventorySellPrice(state: AdventureState, shopId: ShopId, kind: 'weapon' | 'trait' | 'potion', itemNo: number) {
  return Math.max(1, Math.floor(getInventoryBasePrice(state, kind, itemNo) * getShopDefinition(shopId).buybackRate));
}

export function canSellInventoryItem(state: AdventureState, shopId: ShopId, kind: 'weapon' | 'trait' | 'potion', itemNo: number) {
  const shop = getShopDefinition(shopId);
  const rank = getInventoryRank(state, kind, itemNo);
  if (!rank || !shop.allowedSellRanks.includes(rank)) return false;
  if (kind !== 'weapon') return true;
  const weapon = state.inventory.weapons.find((item) => item.itemNo === itemNo);
  return Boolean(weapon && weapon.id !== state.character.leftWeaponInstanceId && weapon.id !== state.character.rightWeaponInstanceId);
}

// Operations

export function buyShopItem(state: AdventureState, shopId: ShopId, stockId: ShopStockId, quantity: number): AdventureState {
  const stock = getShopStock(shopId, stockId);
  if (!stock) return state;
  const count = Math.max(1, Math.min(stock.stock, Math.floor(quantity)));
  const total = stock.price * count;
  if (state.coins < total) return state;
  return {
    ...state,
    coins: state.coins - total,
    inventory: stock.kind === 'potion'
      ? { ...state.inventory, potions: addPotionStack(state.inventory.potions, stock.itemId, count) }
      : { ...state.inventory, traits: addTraitStack(state.inventory.traits, stock.traitId, count) },
  };
}

export function sellInventoryItem(state: AdventureState, shopId: ShopId, kind: 'weapon' | 'trait' | 'potion', itemNo: number, quantity: number): AdventureState {
  if (!canSellInventoryItem(state, shopId, kind, itemNo)) return state;
  const count = Math.max(1, Math.floor(quantity));
  const unitPrice = getInventorySellPrice(state, shopId, kind, itemNo);
  if (kind === 'weapon') {
    return {
      ...state,
      coins: state.coins + unitPrice,
      inventory: { ...state.inventory, weapons: state.inventory.weapons.filter((item) => item.itemNo !== itemNo) },
    };
  }
  if (kind === 'trait') {
    const stack = state.inventory.traits.find((item) => item.itemNo === itemNo);
    if (!stack) return state;
    const sold = Math.min(count, stack.count);
    return {
      ...state,
      coins: state.coins + unitPrice * sold,
      inventory: {
        ...state.inventory,
        traits: state.inventory.traits
          .map((item) => item.itemNo === itemNo ? { ...item, count: item.count - sold } : item)
          .filter((item) => item.count > 0),
      },
    };
  }
  const stack = state.inventory.potions.find((item) => item.itemNo === itemNo);
  if (!stack) return state;
  const sold = Math.min(count, stack.count);
  return {
    ...state,
    coins: state.coins + unitPrice * sold,
    inventory: {
      ...state.inventory,
      potions: state.inventory.potions
        .map((item) => item.itemNo === itemNo ? { ...item, count: item.count - sold } : item)
        .filter((item) => item.count > 0),
    },
    hotbarSlots: sold >= stack.count
      ? state.hotbarSlots.map((entry) => entry?.kind === 'potion' && entry.itemNo === itemNo ? undefined : entry)
      : state.hotbarSlots,
  };
}

function addPotionStack(potions: PotionStack[], itemId: string, count: number): PotionStack[] {
  const item = getAdventureItem(itemId);
  if (item.kind !== 'potion') return potions;
  const existing = potions.find((stack) => stack.itemId === itemId);
  if (existing) return potions.map((stack) => stack.itemId === itemId ? { ...stack, count: stack.count + count } : stack);
  return [...potions, {
    itemNo: getNextItemNo(potions.map((stack) => stack.itemNo), 200),
    itemId,
    name: item.name,
    icon: item.icon,
    iconSprite: item.iconSprite,
    rank: item.rank,
    count,
    heal: item.heal,
    cooldownMs: item.cooldownMs,
  }];
}

function addTraitStack(traits: TraitStack[], traitId: string, count: number): TraitStack[] {
  getTrait(traitId);
  const existing = traits.find((stack) => stack.traitId === traitId);
  if (existing) return traits.map((stack) => stack.traitId === traitId ? { ...stack, count: stack.count + count } : stack);
  return [...traits, { itemNo: getNextItemNo(traits.map((stack) => stack.itemNo), 100), traitId, count }];
}

function getNextItemNo(existing: number[], floor: number) {
  return Math.max(floor, ...existing) + 1;
}

function getInventoryRank(state: AdventureState, kind: 'weapon' | 'trait' | 'potion', itemNo: number): ItemRank | undefined {
  if (kind === 'potion') return state.inventory.potions.find((item) => item.itemNo === itemNo)?.rank;
  if (kind === 'trait') {
    const stack = state.inventory.traits.find((item) => item.itemNo === itemNo);
    return stack ? getTrait(stack.traitId).rank : undefined;
  }
  const weapon = state.inventory.weapons.find((item) => item.itemNo === itemNo);
  return weapon ? getWeapon(weapon.baseWeaponId).rank : undefined;
}

function getInventoryBasePrice(state: AdventureState, kind: 'weapon' | 'trait' | 'potion', itemNo: number) {
  if (kind === 'potion') {
    const item = state.inventory.potions.find((candidate) => candidate.itemNo === itemNo);
    if (!item) return 0;
    return item.rank === 'B' ? 75 : item.rank === 'D' ? 10 : 20;
  }
  if (kind === 'trait') {
    const item = state.inventory.traits.find((candidate) => candidate.itemNo === itemNo);
    if (!item) return 0;
    const trait = getTrait(item.traitId);
    return trait.rank === 'B' ? 120 : trait.rank === 'D' ? 18 : 40;
  }
  const item = state.inventory.weapons.find((candidate) => candidate.itemNo === itemNo);
  if (!item) return 0;
  const weapon = getWeapon(item.baseWeaponId);
  return weapon.rank === 'B' ? 160 : weapon.rank === 'D' ? 25 : 70;
}
