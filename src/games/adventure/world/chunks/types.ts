import type { AdventureEnemy } from '../../enemies/types';
import type { BiomeTile } from '../biomes/types';
import type { WorldArea, WorldObject } from '../types';
import type { ChunkCoordinate } from './coordinates';
import type { WorldLocation } from '../locations/types';

export type AdventureChunk = {
  key: string;
  coordinate: ChunkCoordinate;
  biomeTiles: BiomeTile[];
  objects: WorldObject[];
  enemies: AdventureEnemy[];
  areas: WorldArea[];
  locations: WorldLocation[];
};
