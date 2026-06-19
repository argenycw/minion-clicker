import { adventureSpawn, authoredAdventureAreas } from './areas/definitions';

export type { CollisionShape, PropDefinition, WorldArea, WorldObject, WorldObjectKind } from './types';
export type { WorldLocation } from './locations/types';
export type { BiomeDefinition, BiomeId, BiomeTile } from './biomes/types';
export { biomeDefinitions, getBiome } from './biomes/definitions';
export { propDefinitions } from './props';

export const adventureWorld = {
  spawn: adventureSpawn,
  areas: authoredAdventureAreas,
};
