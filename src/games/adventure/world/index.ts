import { GAME_SETTINGS, WORLD_HEIGHT, WORLD_WIDTH } from '../../../shared/settings';
import { createRuin } from './areas/ruin';
import { getBiome } from './biomes/definitions';
import { generateBiomeTiles } from './biomes/generate';
import type { BiomePropEntry } from './biomes/types';
import { createProp } from './props';
import { seeded } from './random';
import type { WorldArea, WorldObject } from './types';

export type { CollisionShape, PropDefinition, WorldArea, WorldObject, WorldObjectKind } from './types';
export type { BiomeDefinition, BiomeId, BiomeTile } from './biomes/types';
export { biomeDefinitions, getBiome } from './biomes/definitions';
export { propDefinitions } from './props';

const spawn = {
  x: Math.round(WORLD_WIDTH * GAME_SETTINGS.world.playerSpawnRatioX),
  y: Math.round(WORLD_HEIGHT * GAME_SETTINGS.world.playerSpawnRatioY),
};

const areas: WorldArea[] = [
  { id: 'area-01', kind: 'ruin', name: 'Mossbound Ruin', x: spawn.x - 980, y: spawn.y - 620, width: 720, height: 520 },
  { id: 'area-02', kind: 'ruin', name: 'Broken Watch', x: spawn.x + 700, y: spawn.y + 430, width: 620, height: 460 },
];
export const adventureWorld = {
  width: WORLD_WIDTH,
  height: WORLD_HEIGHT,
  spawn,
  biomeTiles: generateBiomeTiles(WORLD_WIDTH, WORLD_HEIGHT, spawn, 0),
  areas,
  objects: [] as WorldObject[],
};

export function createAdventureWorld(seed: number) {
  const biomeTiles = generateBiomeTiles(WORLD_WIDTH, WORLD_HEIGHT, spawn, seed);
  return { ...adventureWorld, biomeTiles, objects: [...makeWildernessObjects(biomeTiles, seed), ...areas.flatMap(createRuin)] };
}

function makeWildernessObjects(biomeTiles: ReturnType<typeof generateBiomeTiles>, seed: number): WorldObject[] {
  const padding = GAME_SETTINGS.terrain.padding;
  return Array.from({ length: GAME_SETTINGS.terrain.propCount }, (_, index) => {
    const x = padding + seeded(seed + index * 37 + 11) * (WORLD_WIDTH - padding * 2);
    const y = padding + seeded(seed + index * 53 + 19) * (WORLD_HEIGHT - padding * 2);
    const tile = biomeTiles.find((candidate) => x >= candidate.x && x < candidate.x + candidate.width && y >= candidate.y && y < candidate.y + candidate.height);
    const biome = getBiome(tile?.biomeId ?? 'biome-01');
    if (seeded(seed + index * 113 + 41) > biome.propDensity) return undefined;
    const entry = pickWeightedProp(biome.props, seeded(seed + index * 71 + 29));
    const scale = entry.minScale + seeded(seed + index * 97 + 5) * (entry.maxScale - entry.minScale);
    return createProp(entry.kind, {
      id: `wild-${index}`,
      x,
      y,
      scale,
      rotation: seeded(seed + index * 43 + 3) * Math.PI * 2,
      biomeId: biome.id,
    });
  }).filter((object): object is WorldObject => object !== undefined);
}

function pickWeightedProp(entries: BiomePropEntry[], roll: number) {
  const total = entries.reduce((sum, entry) => sum + entry.weight, 0);
  let cursor = roll * total;
  for (const entry of entries) {
    cursor -= entry.weight;
    if (cursor <= 0) return entry;
  }
  return entries[entries.length - 1];
}
