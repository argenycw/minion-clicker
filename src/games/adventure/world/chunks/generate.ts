import { getAdventureEnemyDefinition } from '../../enemies/definitions';
import type { AdventureEnemy } from '../../enemies/types';
import {
  getAdventureRankAtWorldPosition,
  getMaxAdventureDungeons,
  scaleEnemyStatsForRank,
} from '../../progression/system';
import { createRuin } from '../areas/ruin';
import { authoredAdventureAreas } from '../areas/definitions';
import { adventureWorld } from '../index';
import { getBiome } from '../biomes/definitions';
import { generateBiomeTilesRegion } from '../biomes/generate';
import type { BiomeEnemyEntry, BiomePropEntry, BiomeTile } from '../biomes/types';
import { createProp, propDefinitions } from '../props';
import type { WorldArea, WorldObject } from '../types';
import { authoredAdventureLocations } from '../locations/definitions';
import type { WorldLocation } from '../locations/types';
import { ADVENTURE_CHUNK_SIZE, getChunkKey, getChunkOrigin, makeGeneratedId, type ChunkCoordinate } from './coordinates';
import type { AdventureChunk } from './types';

const PROP_CANDIDATES = 72;
const ENEMY_COUNT = 4;

export function generateAdventureChunk(worldSeed: number, coordinate: ChunkCoordinate, spawn: { x: number; y: number }, now: number): AdventureChunk {
  const key = getChunkKey(coordinate);
  const origin = getChunkOrigin(coordinate);
  const chunkSeed = hashNumbers(worldSeed, coordinate.x, coordinate.y);
  const biomeTiles = generateBiomeTilesRegion(origin.x, origin.y, ADVENTURE_CHUNK_SIZE, ADVENTURE_CHUNK_SIZE, spawn, worldSeed);
  const areas = generateAreas(coordinate, chunkSeed, spawn);
  const locations = generateLocations(worldSeed, coordinate, spawn);
  const wilderness = generateWildernessObjects(coordinate, chunkSeed, biomeTiles, spawn);
  const areaObjects = areas.flatMap((area, areaIndex) => createRuin(
    area,
    (objectIndex) => makeGeneratedId('wild', coordinate, 1000 + areaIndex * 100 + objectIndex),
  ));
  const enemies = generateEnemies(coordinate, chunkSeed, biomeTiles, spawn, now);
  if (getChunkKey(coordinate) === getChunkKey({
    x: Math.floor(spawn.x / ADVENTURE_CHUNK_SIZE),
    y: Math.floor(spawn.y / ADVENTURE_CHUNK_SIZE),
  })) enemies.unshift(createTrainingDummy(spawn, now));

  return {
    key,
    coordinate,
    biomeTiles,
    objects: [...wilderness, ...areaObjects]
      .filter((object) => locations.every((location) => Math.hypot(object.x - location.x, object.y - location.y) > location.radius + 70))
      .map((object) => ({ ...object, chunkKey: key })),
    enemies: enemies.map((enemy) => ({ ...enemy, chunkKey: key })),
    areas,
    locations: locations.map((location) => ({ ...location, chunkKey: key })),
  };
}

function generateLocations(worldSeed: number, coordinate: ChunkCoordinate, spawn: { x: number; y: number }) {
  const chunkSeed = hashNumbers(worldSeed, coordinate.x, coordinate.y);
  const origin = getChunkOrigin(coordinate);
  const locations: WorldLocation[] = authoredAdventureLocations.filter((location) => (
    location.x >= origin.x
    && location.x < origin.x + ADVENTURE_CHUNK_SIZE
    && location.y >= origin.y
    && location.y < origin.y + ADVENTURE_CHUNK_SIZE
    && (location.kind === 'town' || isAuthoredDungeonAllowed(location.id))
  ));
  if (shouldGenerateProceduralDungeon(worldSeed, coordinate, spawn)) {
    const location: WorldLocation = {
      id: makeGeneratedId('location', coordinate, 1),
      kind: 'cave',
      name: 'Echoing Cave',
      x: origin.x + 180 + random(chunkSeed, 402) * (ADVENTURE_CHUNK_SIZE - 360),
      y: origin.y + 180 + random(chunkSeed, 403) * (ADVENTURE_CHUNK_SIZE - 360),
      radius: 58,
      dungeonId: 'dungeon-01',
    };
    if (Math.hypot(location.x - spawn.x, location.y - spawn.y) > 760) locations.push(location);
  }
  return locations;
}

function shouldGenerateProceduralDungeon(worldSeed: number, coordinate: ChunkCoordinate, spawn: { x: number; y: number }) {
  const allowedAuthoredDungeonCount = getAllowedAuthoredDungeonIds().length;
  const maxProcedural = Math.max(0, getMaxAdventureDungeons() - allowedAuthoredDungeonCount);
  if (maxProcedural <= 0) return false;
  const candidates: Array<{ coordinate: ChunkCoordinate; score: number }> = [];
  const bounds = adventureWorld.chunkBounds;
  for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
    for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
      const candidateSeed = hashNumbers(worldSeed, x, y);
      const origin = getChunkOrigin({ x, y });
      const dungeonX = origin.x + 180 + random(candidateSeed, 402) * (ADVENTURE_CHUNK_SIZE - 360);
      const dungeonY = origin.y + 180 + random(candidateSeed, 403) * (ADVENTURE_CHUNK_SIZE - 360);
      if (Math.hypot(dungeonX - spawn.x, dungeonY - spawn.y) <= 760) continue;
      if (random(candidateSeed, 401) >= 0.12) continue;
      candidates.push({ coordinate: { x, y }, score: hashNumbers(worldSeed, x, y, 8128) });
    }
  }
  candidates.sort((a, b) => a.score - b.score);
  return candidates.slice(0, maxProcedural).some((candidate) => candidate.coordinate.x === coordinate.x && candidate.coordinate.y === coordinate.y);
}

function isAuthoredDungeonAllowed(locationId: string) {
  return getAllowedAuthoredDungeonIds().includes(locationId);
}

function getAllowedAuthoredDungeonIds() {
  return authoredAdventureLocations
    .filter((location) => location.kind !== 'town')
    .map((location) => location.id)
    .sort()
    .slice(0, getMaxAdventureDungeons());
}

function createTrainingDummy(spawn: { x: number; y: number }, now: number): AdventureEnemy {
  return {
    id: 'enemy-00',
    defId: 'enemy-definition-00',
    name: 'Training Dummy',
    x: spawn.x + 360,
    y: spawn.y - 90,
    spawnX: spawn.x + 360,
    spawnY: spawn.y - 90,
    hp: 1200,
    maxHp: 1200,
    facing: 'left',
    radius: 38,
    body: '( -_-)',
    leftHand: '|',
    rightHand: '|',
    deathBody: '( x_x)',
    color: '#f2d6c7',
    pillWidth: 62,
    attack: 0,
    knockback: 0,
    speed: 0,
    attackSpeed: 1,
    attackRange: 0,
    attackKind: 'melee',
    projectileSpeed: 0,
    projectileRadius: 0,
    alertRadius: 0,
    chaseRadius: 0,
    aggroRadius: 0,
    attackReadyAt: now,
    clanId: 'neutral',
    alerted: false,
    statusEffects: [],
    invulnerable: true,
  };
}

function generateWildernessObjects(coordinate: ChunkCoordinate, chunkSeed: number, biomeTiles: BiomeTile[], spawn: { x: number; y: number }) {
  const origin = getChunkOrigin(coordinate);
  const objects: WorldObject[] = [];
  for (let index = 0; index < PROP_CANDIDATES; index += 1) {
    const x = origin.x + random(chunkSeed, index * 11 + 1) * ADVENTURE_CHUNK_SIZE;
    const y = origin.y + random(chunkSeed, index * 11 + 2) * ADVENTURE_CHUNK_SIZE;
    if (Math.hypot(x - spawn.x, y - spawn.y) < 240) continue;
    const biome = getBiomeAtTiles(biomeTiles, x, y);
    if (random(chunkSeed, index * 11 + 3) > biome.propDensity) continue;
    const entry = pickWeighted(biome.props, random(chunkSeed, index * 11 + 4));
    const definition = propDefinitions[entry.kind];
    if (!definition) continue;
    const scaleRange = definition.scaleRange ?? [1, 1];
    const scale = scaleRange[0] + random(chunkSeed, index * 11 + 5) * (scaleRange[1] - scaleRange[0]);
    objects.push(createProp(entry.kind, {
      id: makeGeneratedId('wild', coordinate, index),
      x,
      y,
      scale,
      flipX: definition.randomFlipX ? random(chunkSeed, index * 11 + 6) > 0.5 : false,
      biomeId: biome.id,
    }));
  }
  return objects;
}

function generateEnemies(coordinate: ChunkCoordinate, chunkSeed: number, biomeTiles: BiomeTile[], spawn: { x: number; y: number }, now: number) {
  const origin = getChunkOrigin(coordinate);
  const enemies: AdventureEnemy[] = [];
  for (let index = 0; index < ENEMY_COUNT; index += 1) {
    let x = origin.x;
    let y = origin.y;
    for (let attempt = 0; attempt < 12; attempt += 1) {
      x = origin.x + 140 + random(chunkSeed, index * 31 + attempt * 2 + 101) * (ADVENTURE_CHUNK_SIZE - 280);
      y = origin.y + 140 + random(chunkSeed, index * 31 + attempt * 2 + 102) * (ADVENTURE_CHUNK_SIZE - 280);
      if (Math.hypot(x - spawn.x, y - spawn.y) > 620) break;
    }
    if (Math.hypot(x - spawn.x, y - spawn.y) <= 620) continue;
    const biome = getBiomeAtTiles(biomeTiles, x, y);
    const entry = pickWeighted(biome.enemies, random(chunkSeed, index * 17 + 201));
    const definition = getAdventureEnemyDefinition(entry.id);
    const rank = getAdventureRankAtWorldPosition({ x, y });
    enemies.push(scaleEnemyStatsForRank({
      id: makeGeneratedId('enemy', coordinate, index + 1),
      defId: definition.id,
      name: definition.name,
      x,
      y,
      spawnX: x,
      spawnY: y,
      hp: definition.maxHp,
      maxHp: definition.maxHp,
      facing: random(chunkSeed, index * 17 + 202) > 0.5 ? 'left' : 'right',
      radius: Math.max(26, definition.pillWidth * 0.42),
      body: definition.body,
      leftHand: definition.leftHand,
      rightHand: definition.rightHand,
      deathBody: definition.deathBody,
      deathLeftHand: definition.deathLeftHand,
      deathRightHand: definition.deathRightHand,
      color: definition.color,
      pillWidth: definition.pillWidth,
      attack: definition.attack,
      knockback: definition.knockback,
      speed: definition.speed,
      attackSpeed: definition.attackSpeed,
      attackRange: definition.attackRange,
      attackKind: definition.attackKind,
      projectile: definition.projectile,
      projectileSpeed: definition.projectileSpeed,
      projectileRadius: definition.projectileRadius,
      alertRadius: definition.alertRadius,
      chaseRadius: definition.chaseRadius,
      aggroRadius: definition.aggroRadius,
      attackReadyAt: now + random(chunkSeed, index * 17 + 203) * 900,
      clanId: 'neutral',
      alerted: false,
      statusEffects: [],
      loot: definition.loot,
    }, rank));
  }
  return enemies;
}

function generateAreas(coordinate: ChunkCoordinate, chunkSeed: number, spawn: { x: number; y: number }) {
  const origin = getChunkOrigin(coordinate);
  const areas: WorldArea[] = authoredAdventureAreas.filter((area) => (
    area.x >= origin.x
    && area.x < origin.x + ADVENTURE_CHUNK_SIZE
    && area.y >= origin.y
    && area.y < origin.y + ADVENTURE_CHUNK_SIZE
  ));
  if (random(chunkSeed, 301) < 0.16) {
    const width = 820 + random(chunkSeed, 302) * 320;
    const height = 620 + random(chunkSeed, 303) * 260;
    const area: WorldArea = {
      id: makeGeneratedId('area', coordinate, 1),
      kind: 'ruin',
      name: 'Wilderness Ruin',
      x: origin.x + width / 2 + 100 + random(chunkSeed, 304) * Math.max(1, ADVENTURE_CHUNK_SIZE - width - 200),
      y: origin.y + height / 2 + 100 + random(chunkSeed, 305) * Math.max(1, ADVENTURE_CHUNK_SIZE - height - 200),
      width,
      height,
    };
    if (Math.hypot(area.x - spawn.x, area.y - spawn.y) > 700) areas.push(area);
  }
  return areas;
}

function getBiomeAtTiles(tiles: BiomeTile[], x: number, y: number) {
  const tile = tiles.find((candidate) => x >= candidate.x && x < candidate.x + candidate.width && y >= candidate.y && y < candidate.y + candidate.height);
  return getBiome(tile?.biomeId ?? 'biome-01');
}

function pickWeighted<T extends BiomePropEntry | BiomeEnemyEntry>(entries: T[], roll: number): T {
  const total = entries.reduce((sum, entry) => sum + entry.weight, 0);
  let cursor = roll * total;
  for (const entry of entries) {
    cursor -= entry.weight;
    if (cursor <= 0) return entry;
  }
  return entries[entries.length - 1];
}

function hashNumbers(...values: number[]) {
  let hash = 2166136261;
  for (const value of values) {
    const text = String(value);
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    hash ^= 124;
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function random(seed: number, salt: number) {
  let value = Math.imul(seed ^ salt, 0x45d9f3b);
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  value ^= value >>> 16;
  return (value >>> 0) / 4294967296;
}
