import { seeded } from '../world/random';
import { getBiome } from '../world/biomes/definitions';
import type { BiomeEnemyEntry, BiomeTile } from '../world/biomes/types';
import { getAdventureEnemyDefinition } from './definitions';
import type { AdventureEnemy } from './types';

export function generateAdventureEnemies(
  width: number,
  height: number,
  spawn: { x: number; y: number },
  biomeTiles: BiomeTile[],
  now: number,
  count = 22,
): AdventureEnemy[] {
  const padding = 180;
  const enemies: AdventureEnemy[] = [];
  for (let index = 0; index < count; index += 1) {
    let x = spawn.x;
    let y = spawn.y;
    for (let attempt = 0; attempt < 20; attempt += 1) {
      x = padding + seeded(index * 131 + attempt * 41 + 23) * (width - padding * 2);
      y = padding + seeded(index * 173 + attempt * 59 + 31) * (height - padding * 2);
      if (Math.hypot(x - spawn.x, y - spawn.y) > 620) break;
    }
    const tile = biomeTiles.find((candidate) => x >= candidate.x && x < candidate.x + candidate.width && y >= candidate.y && y < candidate.y + candidate.height);
    const biome = getBiome(tile?.biomeId ?? 'biome-01');
    const definition = getAdventureEnemyDefinition(pickWeightedEnemy(biome.enemies, seeded(index * 83 + 17)).id);
    enemies.push({
      id: `enemy-${String(index + 1).padStart(2, '0')}`,
      defId: definition.id,
      name: definition.name,
      x,
      y,
      spawnX: x,
      spawnY: y,
      hp: definition.maxHp,
      maxHp: definition.maxHp,
      facing: seeded(index * 47 + 7) > 0.5 ? 'left' : 'right',
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
      speed: definition.speed,
      attackSpeed: definition.attackSpeed,
      attackRange: definition.attackRange,
      aggroRadius: definition.aggroRadius,
      attackReadyAt: now + seeded(index * 101 + 43) * 900,
      loot: definition.loot,
    });
  }
  return enemies;
}

function pickWeightedEnemy(entries: BiomeEnemyEntry[], roll: number) {
  const total = entries.reduce((sum, entry) => sum + entry.weight, 0);
  let cursor = roll * total;
  for (const entry of entries) {
    cursor -= entry.weight;
    if (cursor <= 0) return entry;
  }
  return entries[entries.length - 1];
}
