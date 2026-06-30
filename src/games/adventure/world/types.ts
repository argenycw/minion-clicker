import type { LootTable } from '../loot';
import type { AdventureAudioCue } from '../audio/types';
import type { SpriteRef } from '../../../shared/sprites';

export type WorldObjectKind = string;
export type WorldObjectFamily = 'pile' | 'flowerbed' | 'tree' | 'bush' | 'rock' | 'prop-xs' | 'prop-sm' | 'prop-md' | 'stump' | 'dead-tree' | 'ruin-wall' | 'ruin-pillar' | 'barrel' | 'crate' | 'rubble';

export type CollisionShape =
  | { kind: 'circle'; radiusRatio: number }
  | { kind: 'ellipse'; radiusXRatio: number; radiusYRatio: number }
  | { kind: 'box'; widthRatio: number; heightRatio: number };

export type PropDefinition = {
  kind: WorldObjectKind;
  family: WorldObjectFamily;
  width: number;
  height: number;
  blocking: boolean;
  scaleRange?: [number, number];
  randomFlipX?: boolean;
  maxHp?: number;
  hitPieces?: [number, number];
  destroyPieces?: [number, number];
  collision?: CollisionShape;
  castsShadow?: boolean;
  renderPriority?: number;
  loot?: LootTable;
  audio?: PropAudioDefinition;
  sprite?: SpriteRef;
};

export type PropAudioDefinition = {
  onHit?: AdventureAudioCue;
  onDestroy?: AdventureAudioCue;
};

export type WorldObject = {
  id: string;
  chunkKey?: string;
  kind: WorldObjectKind;
  family: WorldObjectFamily;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  flipX?: boolean;
  blocking: boolean;
  collision?: CollisionShape;
  hp?: number;
  maxHp?: number;
  hitPieces?: [number, number];
  destroyPieces?: [number, number];
  castsShadow?: boolean;
  renderPriority?: number;
  hitAt?: number;
  playerInside?: boolean;
  biomeId?: string;
  areaId?: string;
  loot?: LootTable;
  audio?: PropAudioDefinition;
  sprite?: SpriteRef;
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
