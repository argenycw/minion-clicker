import type { AdventureEnemy } from '../enemies/types';
import type { LootTable } from '../loot';
import type { AdventureRank } from '../progression/types';
import type { WorldObject } from '../world/types';

export type DungeonId = 'dungeon-01';
export type DungeonLocationKind = 'cave' | 'castle' | 'tower' | 'mountain';

export type DungeonDefinition = {
  id: DungeonId;
  kind: DungeonLocationKind;
  name: string;
  totalDepth: number;
  roomCount: [number, number];
  roomWidth: [number, number];
  roomHeight: [number, number];
  enemiesPerRoom: [number, number];
  enemyIds: string[];
  bossEnemyId: string;
  chestChance: number;
  chestLoot: LootTable;
  chestRolls: [number, number];
  colors: {
    void: string;
    floor: string;
    floorEdge: string;
    corridor: string;
    grid: string;
  };
};

export type DungeonRect = { x: number; y: number; width: number; height: number };
export type DungeonPoint = { x: number; y: number };

export type DungeonRoom = DungeonRect & {
  id: string;
  index: number;
  kind: 'start' | 'combat' | 'clutter' | 'l-shape' | 'boss';
  walkableRects: DungeonRect[];
  footprint: DungeonPoint[];
  centerX: number;
  centerY: number;
};

export type DungeonChest = {
  id: string;
  x: number;
  y: number;
  opened: boolean;
  requiresBossDefeat?: boolean;
};

export type DungeonProp = {
  id: string;
  kind: 'floor-pile' | 'stone-object' | 'stone-decor' | 'tall-stone' | 'wall-mount' | 'light-source' | 'destroyable-prop';
  x: number;
  y: number;
  scale: number;
  flipX?: boolean;
};

export type DungeonInstance = {
  id: string;
  definitionId: DungeonId;
  entranceId: string;
  rank: AdventureRank;
  depth: number;
  totalDepth: number;
  rooms: DungeonRoom[];
  corridors: DungeonRect[];
  walkable: DungeonRect[];
  enemies: AdventureEnemy[];
  chests: DungeonChest[];
  props: DungeonProp[];
  objects: WorldObject[];
  exit: { id: string; x: number; y: number };
  stairs?: { id: string; x: number; y: number; targetDepth: number };
  bossEnemyId?: string;
  spawn: { x: number; y: number };
};
