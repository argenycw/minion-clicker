import { GAME_SETTINGS } from '../../../shared/settings';
import { adventureSpawn, authoredAdventureAreas } from './areas/definitions';
import { ADVENTURE_CHUNK_SIZE, getChunkCoordinate } from './chunks/coordinates';

export type { CollisionShape, PropDefinition, WorldArea, WorldObject, WorldObjectKind } from './types';
export type { WorldLocation } from './locations/types';
export type { BiomeDefinition, BiomeId, BiomeTile } from './biomes/types';
export { biomeDefinitions, getBiome } from './biomes/definitions';
export { propDefinitions } from './props';

const spawnChunk = getChunkCoordinate(adventureSpawn.x, adventureSpawn.y);
const maxTerrainChunksPerSide = GAME_SETTINGS.adventure.maxTerrainChunksPerSide;

export const adventureWorld = {
  spawn: adventureSpawn,
  areas: authoredAdventureAreas,
  maxTerrainChunksPerSide,
  chunkBounds: {
    minX: spawnChunk.x - maxTerrainChunksPerSide.x,
    maxX: spawnChunk.x + maxTerrainChunksPerSide.x,
    minY: spawnChunk.y - maxTerrainChunksPerSide.y,
    maxY: spawnChunk.y + maxTerrainChunksPerSide.y,
  },
};

export function getAdventureWorldBounds() {
  return {
    left: adventureWorld.chunkBounds.minX * ADVENTURE_CHUNK_SIZE,
    top: adventureWorld.chunkBounds.minY * ADVENTURE_CHUNK_SIZE,
    right: (adventureWorld.chunkBounds.maxX + 1) * ADVENTURE_CHUNK_SIZE,
    bottom: (adventureWorld.chunkBounds.maxY + 1) * ADVENTURE_CHUNK_SIZE,
  };
}
