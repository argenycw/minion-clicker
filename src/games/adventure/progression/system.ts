import { GAME_SETTINGS } from '../../../shared/settings';
import { getAdventureItem, type LootTable } from '../loot';
import { adventureWorld, getAdventureWorldBounds } from '../world';
import type { AdventureRank } from './types';

const rankMultipliers: Record<AdventureRank, { enemyHp: number; enemyAttack: number; enemySpeed: number; coin: number; chestRollBonus: number }> = {
  C: { enemyHp: 1, enemyAttack: 1, enemySpeed: 1, coin: 1, chestRollBonus: 0 },
  B: { enemyHp: 1.28, enemyAttack: 1.18, enemySpeed: 1.04, coin: 1.25, chestRollBonus: 0 },
  A: { enemyHp: 1.68, enemyAttack: 1.42, enemySpeed: 1.08, coin: 1.55, chestRollBonus: 1 },
  S: { enemyHp: 2.18, enemyAttack: 1.75, enemySpeed: 1.12, coin: 1.95, chestRollBonus: 1 },
};

// Selectors

export function getAdventureRankAtWorldPosition(position: { x: number; y: number }): AdventureRank {
  const bounds = getAdventureWorldBounds();
  const maxDistance = Math.max(
    1,
    Math.hypot(
      Math.max(adventureWorld.spawn.x - bounds.left, bounds.right - adventureWorld.spawn.x),
      Math.max(adventureWorld.spawn.y - bounds.top, bounds.bottom - adventureWorld.spawn.y),
    ),
  );
  const distanceRatio = Math.min(1, Math.hypot(position.x - adventureWorld.spawn.x, position.y - adventureWorld.spawn.y) / maxDistance);
  if (distanceRatio >= 0.78) return 'S';
  if (distanceRatio >= 0.54) return 'A';
  if (distanceRatio >= 0.28) return 'B';
  return 'C';
}

export function getAdventureRankMultiplier(rank: AdventureRank) {
  return rankMultipliers[rank];
}

export function getMaxAdventureDungeons() {
  return Math.max(0, Math.floor(GAME_SETTINGS.adventure.maxDungeons));
}

// Operations

export function scaleLootTableForRank(table: LootTable | undefined, rank: AdventureRank): LootTable | undefined {
  if (!table) return undefined;
  const multiplier = rankMultipliers[rank].coin;
  return {
    coin: table.coin ? { ...table.coin, amount: scaleLootAmount(table.coin.amount, multiplier) } : undefined,
    loot: table.loot?.filter((entry) => isItemRankAllowedForAdventureRank(entry.itemId, rank)),
  };
}

export function scaleEnemyStatsForRank<T extends {
  name: string;
  hp: number;
  maxHp: number;
  attack: number;
  speed: number;
  loot?: LootTable;
}>(enemy: T, rank: AdventureRank): T {
  const multiplier = rankMultipliers[rank];
  const hp = Math.max(1, Math.round(enemy.hp * multiplier.enemyHp));
  const maxHp = Math.max(1, Math.round(enemy.maxHp * multiplier.enemyHp));
  return {
    ...enemy,
    name: rank === 'C' ? enemy.name : `${rank}-Rank ${enemy.name}`,
    hp,
    maxHp,
    attack: Math.max(1, Math.round(enemy.attack * multiplier.enemyAttack)),
    speed: Math.max(1, Math.round(enemy.speed * multiplier.enemySpeed)),
    loot: scaleLootTableForRank(enemy.loot, rank),
  };
}

export function scaleDungeonChestRollRangeForRank(range: [number, number], rank: AdventureRank): [number, number] {
  const bonus = rankMultipliers[rank].chestRollBonus;
  return [range[0] + bonus, range[1] + bonus];
}

export function scaleDungeonEnemyCountRangeForRank(range: [number, number], rank: AdventureRank): [number, number] {
  const bonus = rank === 'S' ? 2 : rank === 'A' ? 1 : 0;
  return [range[0] + Math.min(1, bonus), Math.min(6, range[1] + bonus)];
}

function isItemRankAllowedForAdventureRank(itemId: string, rank: AdventureRank) {
  const itemRank = getAdventureItem(itemId).rank;
  const maxRank = rankToMaxItemRank(rank);
  return getItemRankIndex(itemRank) <= getItemRankIndex(maxRank);
}

function rankToMaxItemRank(rank: AdventureRank) {
  if (rank === 'S') return 'S';
  return rank;
}

function getItemRankIndex(rank: string) {
  return ['D', 'C', 'B', 'A', 'S', 'EX'].indexOf(rank);
}

function scaleLootAmount(amount: NonNullable<LootTable['coin']>['amount'], multiplier: number) {
  if (typeof amount === 'number') return Math.max(0, Math.round(amount * multiplier));
  return [
    Math.max(0, Math.round(amount[0] * multiplier)),
    Math.max(0, Math.round(amount[1] * multiplier)),
  ] as [number, number];
}
