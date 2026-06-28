import type { AdventureEnemy } from '../enemies/types';
import type { LootTable } from '../loot';
import type { WorldObject } from '../world/types';

export type DungeonId = 'dungeon-01';
export type DungeonLocationKind = 'cave' | 'castle' | 'tower' | 'mountain';

export type DungeonDefinition = {
  id: DungeonId;
  kind: DungeonLocationKind;
  name: string;
  roomCount: [number, number];
  roomWidth: [number, number];
  roomHeight: [number, number];
  enemiesPerRoom: [number, number];
  enemyIds: string[];
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

export type DungeonRoom = DungeonRect & {
  id: string;
  index: number;
  centerX: number;
  centerY: number;
};

export type DungeonChest = {
  id: string;
  x: number;
  y: number;
  opened: boolean;
};

export type DungeonProp = {
  id: string;
  kind: 'rock' | 'stalagmite' | 'bones';
  x: number;
  y: number;
  scale: number;
  rotation: number;
};

export type DungeonInstance = {
  id: string;
  definitionId: DungeonId;
  entranceId: string;
  rooms: DungeonRoom[];
  corridors: DungeonRect[];
  walkable: DungeonRect[];
  enemies: AdventureEnemy[];
  chests: DungeonChest[];
  props: DungeonProp[];
  objects: WorldObject[];
  exit: { id: string; x: number; y: number };
  spawn: { x: number; y: number };
};
