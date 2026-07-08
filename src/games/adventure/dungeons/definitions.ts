import type { DungeonDefinition, DungeonId } from './types';

export const dungeonDefinitions: Record<DungeonId, DungeonDefinition> = {
  'dungeon-01': {
    id: 'dungeon-01',
    kind: 'cave',
    name: 'Echoing Cave',
    totalDepth: 10,
    roomCount: [6, 9],
    roomWidth: [760, 1040],
    roomHeight: [560, 760],
    enemiesPerRoom: [1, 3],
    enemyIds: ['minion-01', 'minion-02', 'minion-04', 'minion-09'],
    bossEnemyId: 'minion-09',
    chestChance: 0.48,
    chestRolls: [2, 4],
    chestLoot: {
      coin: { probability: 1, amount: [5, 18] },
      loot: [
        { itemId: 'item-01', probability: 0.3 },
        { itemId: 'item-02', probability: 0.35 },
        { itemId: 'item-03', probability: 0.2 },
        { itemId: 'item-04', probability: 0.1 },
        { itemId: 'item-05', probability: 0.05 },
      ],
    },
    colors: {
      void: '#21160f',
      floor: '#755333',
      floorEdge: '#9a754d',
      corridor: '#604329',
      grid: 'rgba(255, 225, 177, 0.06)',
    },
  },
};

export function getDungeonDefinition(id: DungeonId) {
  return dungeonDefinitions[id];
}
