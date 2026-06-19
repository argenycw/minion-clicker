import type { LootTable } from '../loot';

export type WorldObjectKind = 'tree' | 'bush' | 'rock' | 'flower' | 'flowerbed' | 'mushroom' | 'stump' | 'dead-tree' | 'ruin-wall' | 'ruin-pillar' | 'barrel' | 'crate' | 'rubble';

export type CollisionShape =
  | { kind: 'circle'; radiusRatio: number }
  | { kind: 'ellipse'; radiusXRatio: number; radiusYRatio: number }
  | { kind: 'box'; widthRatio: number; heightRatio: number };

export type PropDefinition = {
  kind: WorldObjectKind;
  width: number;
  height: number;
  blocking: boolean;
  maxHp?: number;
  hitPieces?: [number, number];
  destroyPieces?: [number, number];
  collision?: CollisionShape;
  loot?: LootTable;
};

export type WorldObject = {
  id: string;
  chunkKey?: string;
  kind: WorldObjectKind;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  blocking: boolean;
  collision?: CollisionShape;
  hp?: number;
  maxHp?: number;
  hitPieces?: [number, number];
  destroyPieces?: [number, number];
  hitAt?: number;
  playerInside?: boolean;
  biomeId?: string;
  areaId?: string;
  loot?: LootTable;
};

export type WorldArea = {
  id: string;
  kind: 'ruin';
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
};
