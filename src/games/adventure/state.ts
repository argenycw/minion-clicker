import { GAME_SETTINGS } from '../../shared/settings';
import { getClosestBorderPoint } from '../../shared/combatPresentation';
import { getTrait, getWeapon, type TraitDefinition, type WeaponDefinition } from './content';
import type { AdventureEnemy } from './enemies/types';
import { getOutfit } from './outfits';
import { getPassiveSkillModifiers, getSkill, getSkillPrerequisites } from './skills';
import { adventureWorld, type BiomeTile, type WorldArea, type WorldObject } from './world';
import { generateAdventureChunk } from './world/chunks/generate';
import { getChunkCoordinate, getChunkKey, getLoadedChunkCoordinates } from './world/chunks/coordinates';
import type { AdventureChunk } from './world/chunks/types';
import { getAdventureItem, rollLootTable, type ItemRank, type LootTable } from './loot';
import { generateDungeon } from './dungeons/generate';
import { getDungeonDefinition } from './dungeons/definitions';
import type { DungeonInstance, DungeonRect } from './dungeons/types';
import type { WorldLocation } from './world/locations/types';

export type Facing = 'left' | 'right';
export type HandSlot = 'left' | 'right';

export type AdventureCharacter = {
  body: string;
  color: string;
  pillWidth: number;
  leftWeaponInstanceId?: string;
  rightWeaponInstanceId?: string;
  outfitId: string;
};

export type WeaponInstance = {
  itemNo: number;
  id: string;
  baseWeaponId: string;
  name: string;
  traitIds: string[];
};

export type TraitStack = {
  itemNo: number;
  traitId: string;
  count: number;
};

export type PotionStack = {
  itemNo: number;
  itemId: string;
  name: string;
  icon: string;
  rank: ItemRank;
  count: number;
  heal: number;
  cooldownMs: number;
};

export type WorldDrop = {
  id: string;
  kind: 'coin' | 'item';
  x: number;
  y: number;
  born: number;
  amount?: number;
  itemId?: string;
};

export type AdventureInventory = {
  weapons: WeaponInstance[];
  traits: TraitStack[];
  potions: PotionStack[];
};

export type EffectiveWeapon = WeaponDefinition & {
  instanceId: string;
  instanceName: string;
  traits: TraitDefinition[];
  projectileCount: number;
  baseDamage: number;
  baseAttackSpeed: number;
  baseRange: number;
  baseRadius: number;
};

export type Actor = {
  id: string;
  name: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  facing: Facing;
  radius: number;
};

export type Projectile = {
  id: number;
  weaponInstanceId: string;
  hand: HandSlot;
  x: number;
  y: number;
  vx: number;
  vy: number;
  remainingDistance: number;
  radius: number;
  damage: number;
  glyph: string;
  color: string;
};

export type CombatEffect = {
  id: number;
  kind: 'hit' | 'damage' | 'death';
  x: number;
  y: number;
  glyph: string;
  color: string;
  born: number;
  size?: number;
  toX?: number;
  toY?: number;
  body?: string;
  leftHand?: string;
  rightHand?: string;
  background?: string;
  pillWidth?: number;
  team?: 'player' | 'enemy';
};

export type PropParticle = {
  id: number;
  kind: 'leaf' | 'petal' | 'stone' | 'wood';
  x: number;
  y: number;
  vx: number;
  vy: number;
  gravity: number;
  rotation: number;
  spin: number;
  size: number;
  color: string;
  born: number;
  life: number;
};

export type HotbarSlot =
  | { kind: 'potion'; itemNo: number }
  | { kind: 'skill'; skillId: string };

export type AdventureSkills = {
  points: number;
  unlockedIds: string[];
  cooldownReadyAt: Record<string, number>;
  hasteUntil: number;
};

export type CombatTarget =
  | { kind: 'enemy'; id: string }
  | { kind: 'prop'; id: string };

export type AdventurePlayerId = `player-${string}`;

export type AdventurePlayerState = {
  id: AdventurePlayerId;
  actor: Actor;
  character: AdventureCharacter;
  inventory: AdventureInventory;
  coins: number;
  skills: AdventureSkills;
  cooldownReadyAt: Record<HandSlot, number>;
  potionReadyAt: Record<string, number>;
  itemFlash: Array<{ slot: number; born: number }>;
  hotbarSlots: Array<HotbarSlot | undefined>;
  weaponFlash: Array<{ hand: HandSlot; born: number }>;
  combatTarget?: CombatTarget;
};

export type CreateAdventureStateOptions = {
  now?: number;
  mapSeed?: number;
  localPlayerId?: AdventurePlayerId;
  hostPlayerId?: AdventurePlayerId;
  random?: () => number;
};

export type AdventureState = {
  scene: 'overworld' | 'dungeon';
  mapSeed: number;
  localPlayerId: AdventurePlayerId;
  hostPlayerId: AdventurePlayerId;
  players: Record<AdventurePlayerId, AdventurePlayerState>;
  simulationTick: number;
  loadedChunks: AdventureChunk[];
  loadedChunkKeys: string[];
  chunkChanges: Record<string, ChunkChanges>;
  biomeTiles: BiomeTile[];
  worldAreas: WorldArea[];
  worldLocations: WorldLocation[];
  dungeon?: DungeonInstance;
  overworldReturn?: OverworldReturnState;
  player: Actor;
  character: AdventureCharacter;
  inventory: AdventureInventory;
  coins: number;
  worldDrops: WorldDrop[];
  enemies: AdventureEnemy[];
  worldObjects: WorldObject[];
  projectiles: Projectile[];
  effects: CombatEffect[];
  propParticles: PropParticle[];
  skills: AdventureSkills;
  cooldownReadyAt: Record<HandSlot, number>;
  potionReadyAt: Record<string, number>;
  itemFlash: Array<{ slot: number; born: number }>;
  hotbarSlots: Array<HotbarSlot | undefined>;
  weaponFlash: Array<{ hand: HandSlot; born: number }>;
  lastTick: number;
  nextEntityId: number;
  combatTarget?: CombatTarget;
};

type OverworldReturnState = Pick<AdventureState,
  | 'loadedChunks'
  | 'loadedChunkKeys'
  | 'chunkChanges'
  | 'biomeTiles'
  | 'worldAreas'
  | 'worldLocations'
  | 'worldDrops'
  | 'enemies'
  | 'worldObjects'
  | 'combatTarget'
> & { player: Actor };

type ChunkChanges = {
  objectHp: Record<string, number>;
  enemyHp: Record<string, number>;
  drops: WorldDrop[];
};

export { adventureWorld } from './world';

export const PLAYER_MOVE_SPEED = 250;

export const createInitialAdventureState = (options: CreateAdventureStateOptions = {}): AdventureState => {
  const random = options.random ?? Math.random;
  const now = options.now ?? performance.now();
  const mapSeed = options.mapSeed ?? Math.floor(random() * 1_000_000_000);
  const localPlayerId = options.localPlayerId ?? 'player-01';
  const hostPlayerId = options.hostPlayerId ?? localPlayerId;
  const loadedChunks = createLoadedChunks(mapSeed, adventureWorld.spawn, now);
  const generatedWorld = {
    biomeTiles: loadedChunks.flatMap((chunk) => chunk.biomeTiles),
    objects: loadedChunks.flatMap((chunk) => chunk.objects),
  };
  const state: AdventureState = {
    scene: 'overworld',
    mapSeed,
    localPlayerId,
    hostPlayerId,
    players: {},
    simulationTick: 0,
    loadedChunks,
    loadedChunkKeys: loadedChunks.map((chunk) => chunk.key),
    chunkChanges: {},
    biomeTiles: generatedWorld.biomeTiles,
    worldAreas: loadedChunks.flatMap((chunk) => chunk.areas),
    worldLocations: loadedChunks.flatMap((chunk) => chunk.locations),
    player: {
      id: 'player-01',
      name: 'You',
      x: adventureWorld.spawn.x,
      y: adventureWorld.spawn.y,
      hp: 140,
      maxHp: 140,
      facing: 'right',
      radius: 34,
    },
    character: {
      body: '•̀_•́',
      color: '#d9f2e3',
      pillWidth: 61,
      leftWeaponInstanceId: 'weapon-01',
      rightWeaponInstanceId: 'weapon-02',
      outfitId: 'outfit-00',
    },
    inventory: createInitialInventory(),
    coins: 0,
    worldDrops: [],
    enemies: [
      {
        id: 'enemy-00',
        defId: 'enemy-definition-00',
        name: 'Training Dummy',
        x: adventureWorld.spawn.x + 360,
        y: adventureWorld.spawn.y - 90,
        spawnX: adventureWorld.spawn.x + 360,
        spawnY: adventureWorld.spawn.y - 90,
        hp: 1200,
        maxHp: 1200,
        facing: 'left',
        radius: 38,
        body: '•_•',
        leftHand: '|',
        rightHand: '|',
        deathBody: '•_•',
        color: '#f2d6c7',
        pillWidth: 62,
        attack: 0,
        speed: 0,
        attackSpeed: 1,
        attackRange: 0,
        aggroRadius: 0,
        attackReadyAt: now,
        invulnerable: true,
      },
      ...loadedChunks.flatMap((chunk) => chunk.enemies).filter((enemy) => enemy.id !== 'enemy-00'),
    ],
    worldObjects: generatedWorld.objects.map((object) => ({ ...object })),
    projectiles: [],
    effects: [],
    propParticles: [],
    skills: {
      points: 15,
      unlockedIds: ['passive-00'],
      cooldownReadyAt: {},
      hasteUntil: 0,
    },
    cooldownReadyAt: { left: now, right: now },
    potionReadyAt: {},
    itemFlash: [],
    hotbarSlots: [{ kind: 'potion', itemNo: 201 }, undefined, undefined, undefined, undefined],
    weaponFlash: [],
    lastTick: now,
    nextEntityId: 1,
    combatTarget: { kind: 'enemy', id: 'enemy-00' },
  };
  return syncLegacyFieldsToPlayers(state);
};

function createLoadedChunks(mapSeed: number, position: { x: number; y: number }, now: number) {
  return getLoadedChunkCoordinates(getChunkCoordinate(position.x, position.y))
    .map((coordinate) => generateAdventureChunk(mapSeed, coordinate, adventureWorld.spawn, now));
}

export function getLocalAdventurePlayer(state: AdventureState): AdventurePlayerState {
  return state.players[state.localPlayerId] ?? {
    id: state.localPlayerId,
    actor: state.player,
    character: state.character,
    inventory: state.inventory,
    coins: state.coins,
    skills: state.skills,
    cooldownReadyAt: state.cooldownReadyAt,
    potionReadyAt: state.potionReadyAt,
    itemFlash: state.itemFlash,
    hotbarSlots: state.hotbarSlots,
    weaponFlash: state.weaponFlash,
    combatTarget: state.combatTarget,
  };
}

export function syncLegacyFieldsToPlayers(state: AdventureState): AdventureState {
  const localPlayer: AdventurePlayerState = {
    id: state.localPlayerId,
    actor: state.player,
    character: state.character,
    inventory: state.inventory,
    coins: state.coins,
    skills: state.skills,
    cooldownReadyAt: state.cooldownReadyAt,
    potionReadyAt: state.potionReadyAt,
    itemFlash: state.itemFlash,
    hotbarSlots: state.hotbarSlots,
    weaponFlash: state.weaponFlash,
    combatTarget: state.combatTarget,
  };
  return {
    ...state,
    players: {
      ...state.players,
      [state.localPlayerId]: localPlayer,
    },
  };
}

export function useAdventurePlayerAsLocal(state: AdventureState, playerId: AdventurePlayerId): AdventureState {
  const player = state.players[playerId];
  if (!player) return state;
  return {
    ...state,
    localPlayerId: playerId,
    player: player.actor,
    character: player.character,
    inventory: player.inventory,
    coins: player.coins,
    skills: player.skills,
    cooldownReadyAt: player.cooldownReadyAt,
    potionReadyAt: player.potionReadyAt,
    itemFlash: player.itemFlash,
    hotbarSlots: player.hotbarSlots,
    weaponFlash: player.weaponFlash,
    combatTarget: player.combatTarget,
  };
}

function streamAdventureChunks(state: AdventureState, now: number): AdventureState {
  if (state.scene === 'dungeon') return state;
  const coordinates = getLoadedChunkCoordinates(getChunkCoordinate(state.player.x, state.player.y));
  const desiredKeys = coordinates.map(getChunkKey);
  if (desiredKeys.length === state.loadedChunkKeys.length && desiredKeys.every((key) => state.loadedChunkKeys.includes(key))) return state;

  const chunkChanges = captureChunkChanges(state);
  const currentObjects = groupByChunk(state.worldObjects, (object) => object.chunkKey ?? getChunkKey(getChunkCoordinate(object.x, object.y)));
  const currentEnemies = groupByChunk(state.enemies, (enemy) => enemy.chunkKey ?? getChunkKey(getChunkCoordinate(enemy.spawnX, enemy.spawnY)));
  const currentDrops = groupByChunk(state.worldDrops, (drop) => getChunkKey(getChunkCoordinate(drop.x, drop.y)));
  const currentKeys = new Set(state.loadedChunkKeys);
  const loadedChunks = coordinates.map((coordinate) => {
    const generated = generateAdventureChunk(state.mapSeed, coordinate, adventureWorld.spawn, now);
    const changes = chunkChanges[generated.key];
    const objects = currentKeys.has(generated.key)
      ? currentObjects[generated.key] ?? []
      : applyObjectChanges(generated.objects, changes);
    const enemies = currentKeys.has(generated.key)
      ? currentEnemies[generated.key] ?? []
      : applyEnemyChanges(generated.enemies, changes);
    return { ...generated, objects, enemies };
  });

  return {
    ...state,
    loadedChunks,
    loadedChunkKeys: desiredKeys,
    chunkChanges,
    biomeTiles: loadedChunks.flatMap((chunk) => chunk.biomeTiles),
    worldAreas: loadedChunks.flatMap((chunk) => chunk.areas),
    worldLocations: loadedChunks.flatMap((chunk) => chunk.locations),
    worldObjects: loadedChunks.flatMap((chunk) => chunk.objects),
    enemies: loadedChunks.flatMap((chunk) => chunk.enemies),
    worldDrops: loadedChunks.flatMap((chunk) => currentKeys.has(chunk.key)
      ? currentDrops[chunk.key] ?? []
      : chunkChanges[chunk.key]?.drops ?? []),
  };
}

function captureChunkChanges(state: AdventureState) {
  const changes = { ...state.chunkChanges };
  for (const key of state.loadedChunkKeys) {
    const objectHp = Object.fromEntries(state.worldObjects
      .filter((object) => (object.chunkKey ?? getChunkKey(getChunkCoordinate(object.x, object.y))) === key && object.hp !== undefined && object.hp !== object.maxHp)
      .map((object) => [object.id, object.hp!]));
    const enemyHp = Object.fromEntries(state.enemies
      .filter((enemy) => (enemy.chunkKey ?? getChunkKey(getChunkCoordinate(enemy.spawnX, enemy.spawnY))) === key && enemy.hp !== enemy.maxHp)
      .map((enemy) => [enemy.id, enemy.hp]));
    const drops = state.worldDrops.filter((drop) => getChunkKey(getChunkCoordinate(drop.x, drop.y)) === key);
    if (Object.keys(objectHp).length || Object.keys(enemyHp).length || drops.length) changes[key] = { objectHp, enemyHp, drops };
    else delete changes[key];
  }
  return changes;
}

function applyObjectChanges(objects: WorldObject[], changes?: ChunkChanges) {
  if (!changes) return objects;
  return objects.map((object) => changes.objectHp[object.id] === undefined ? object : { ...object, hp: changes.objectHp[object.id] });
}

function applyEnemyChanges(enemies: AdventureEnemy[], changes?: ChunkChanges) {
  if (!changes) return enemies;
  return enemies.map((enemy) => changes.enemyHp[enemy.id] === undefined ? enemy : { ...enemy, hp: changes.enemyHp[enemy.id] });
}

function groupByChunk<T>(values: T[], getKey: (value: T) => string) {
  const groups: Record<string, T[]> = {};
  for (const value of values) (groups[getKey(value)] ??= []).push(value);
  return groups;
}

export function tickAdventureState(
  state: AdventureState,
  now: number,
  input: {
    keys: Set<string>;
    aim: { x: number; y: number };
  },
): AdventureState {
  const deltaSeconds = Math.min((now - state.lastTick) / 1000, GAME_SETTINGS.combat.maxTickDeltaSeconds);
  const skillModifiers = getPassiveSkillModifiers(state.skills.unlockedIds);
  const hasteBonus = now < state.skills.hasteUntil ? getActiveHasteBonus(state) : 0;
  let player = movePlayer(
    state.player,
    state.worldObjects,
    input.keys,
    input.aim,
    deltaSeconds,
    (PLAYER_MOVE_SPEED + (getOutfit(state.character.outfitId).speedBonus ?? 0) + skillModifiers.moveSpeed + hasteBonus) * skillModifiers.moveSpeedMultiplier,
    state.dungeon?.walkable,
  );
  let enemies = state.enemies.map((enemy) => ({ ...enemy }));
  let worldObjects = state.worldObjects;
  let worldDrops = state.worldDrops;
  let inventory = state.inventory;
  let coins = state.coins;
  const effects = state.effects.filter((effect) => now - effect.born < getEffectLife(effect));
  let propParticles = state.propParticles.filter((particle) => now - particle.born < particle.life);
  const projectiles: Projectile[] = [];
  let nextEntityId = state.nextEntityId;
  let combatTarget = state.combatTarget;

  enemies = enemies.map((enemy) => {
    if (enemy.hp <= 0 || enemy.aggroRadius <= 0) return enemy;
    const distance = Math.hypot(player.x - enemy.x, player.y - enemy.y);
    if (distance > enemy.aggroRadius) return returnEnemyToSpawn(enemy, state.worldObjects, deltaSeconds, state.dungeon?.walkable);
    const facing = player.x < enemy.x ? 'left' : 'right';
    if (distance > enemy.attackRange + player.radius) {
      return { ...moveEnemyToward(enemy, player, state.worldObjects, deltaSeconds, state.dungeon?.walkable), facing };
    }
    if (now < enemy.attackReadyAt) return { ...enemy, facing };
    player = { ...player, hp: Math.max(0, player.hp - enemy.attack) };
    combatTarget = { kind: 'enemy', id: enemy.id };
    effects.push(makeDamageEffect(nextEntityId, player.x, player.y, enemy.attack, getQueuedDamageBorn(effects, player.x, player.y, now)));
    nextEntityId += 1;
    return { ...enemy, facing, attackReadyAt: now + 1000 / enemy.attackSpeed };
  });

  for (const object of worldObjects) {
    if (object.kind !== 'flower' && object.kind !== 'flowerbed') continue;
    const triggerRadius = player.radius + Math.max(object.width, object.height) * 0.5;
    const inside = Math.hypot(player.x - object.x, player.y - object.y) <= triggerRadius;
    if (inside !== Boolean(object.playerInside)) {
      worldObjects = worldObjects.map((candidate) => candidate.id === object.id ? { ...candidate, playerInside: inside } : candidate);
    }
    if (inside && !object.playerInside) {
      const particles = makePropParticles(nextEntityId, object, now, 'petal', object.kind === 'flowerbed' ? 9 : 5);
      propParticles = [...propParticles, ...particles];
      nextEntityId += particles.length;
    }
  }

  for (const projectile of state.projectiles) {
    const distance = Math.hypot(projectile.vx, projectile.vy) * deltaSeconds;
    const next = {
      ...projectile,
      x: projectile.x + projectile.vx * deltaSeconds,
      y: projectile.y + projectile.vy * deltaSeconds,
      remainingDistance: projectile.remainingDistance - distance,
    };
    const hit = enemies.find((enemy) => enemy.hp > 0 && Math.hypot(enemy.x - next.x, enemy.y - next.y) <= enemy.radius + next.radius);
    const objectHit = worldObjects.find((object) => object.hp !== undefined && object.hp > 0 && circleIntersectsObject(next.x, next.y, next.radius, object));
    if (hit) {
      combatTarget = { kind: 'enemy', id: hit.id };
      enemies = damageEnemy(enemies, hit.id, next.damage);
      const weapon = getEffectiveWeapon(state, next.weaponInstanceId);
      effects.push(makeHitEffect(nextEntityId, next.x, next.y, weapon, now));
      nextEntityId += 1;
      effects.push(makeDamageEffect(nextEntityId, next.x, next.y, next.damage, getQueuedDamageBorn(effects, next.x, next.y, now)));
      nextEntityId += 1;
      if (!hit.invulnerable && hit.hp > 0 && hit.hp - next.damage <= 0) {
        effects.push(makeEnemyDeathEffect(nextEntityId, hit, now));
        nextEntityId += 1;
        const spawned = makeWorldDrops(nextEntityId, hit.x, hit.y, hit.loot, now);
        worldDrops = [...worldDrops, ...spawned];
        nextEntityId += spawned.length;
      }
    } else if (objectHit) {
      combatTarget = { kind: 'prop', id: objectHit.id };
      const weapon = getEffectiveWeapon(state, next.weaponInstanceId);
      const destroyed = objectHit.hp! - next.damage <= 0;
      worldObjects = damageWorldObject(worldObjects, objectHit.id, next.damage, now);
      const particles = makePropParticles(nextEntityId, objectHit, now, undefined, undefined, destroyed);
      propParticles = [...propParticles, ...particles];
      nextEntityId += particles.length;
      effects.push(makeHitEffect(nextEntityId, next.x, next.y, weapon, now));
      nextEntityId += 1;
      effects.push(makeDamageEffect(nextEntityId, objectHit.x, objectHit.y, next.damage, getQueuedDamageBorn(effects, objectHit.x, objectHit.y, now)));
      nextEntityId += 1;
      if (destroyed) {
        const spawned = makeWorldDrops(nextEntityId, objectHit.x, objectHit.y, objectHit.loot, now);
        worldDrops = [...worldDrops, ...spawned];
        nextEntityId += spawned.length;
      }
    } else if (next.remainingDistance > 0 && isInsideWorld(next.x, next.y)) {
      projectiles.push(next);
    }
  }

  const collected = collectWorldDrops(worldDrops, player, inventory, coins, now);

  const nextState = {
    ...state,
    player,
    inventory: collected.inventory,
    coins: collected.coins,
    enemies,
    worldObjects,
    worldDrops: collected.worldDrops,
    projectiles,
    effects,
    propParticles,
    itemFlash: state.itemFlash.filter((flash) => now - flash.born < 420),
    weaponFlash: state.weaponFlash.filter((flash) => now - flash.born < 420),
    lastTick: now,
    simulationTick: state.simulationTick + 1,
    nextEntityId,
    combatTarget,
    dungeon: state.dungeon ? { ...state.dungeon, enemies } : undefined,
  };
  return state.scene === 'dungeon' ? nextState : streamAdventureChunks(nextState, now);
}

export function interactWithAdventure(state: AdventureState, now: number): AdventureState {
  if (state.scene === 'overworld') {
    const location = getNearbyLocation(state);
    if (!location) return state;
    const dungeon = generateDungeon(location.dungeonId, location.id, state.mapSeed, now);
    const overworldReturn: OverworldReturnState = {
      loadedChunks: state.loadedChunks,
      loadedChunkKeys: state.loadedChunkKeys,
      chunkChanges: state.chunkChanges,
      biomeTiles: state.biomeTiles,
      worldAreas: state.worldAreas,
      worldLocations: state.worldLocations,
      worldDrops: state.worldDrops,
      enemies: state.enemies,
      worldObjects: state.worldObjects,
      combatTarget: state.combatTarget,
      player: state.player,
    };
    return {
      ...state,
      scene: 'dungeon',
      dungeon,
      overworldReturn,
      biomeTiles: [],
      worldAreas: [],
      worldLocations: [],
      worldDrops: [],
      enemies: dungeon.enemies,
      worldObjects: [],
      projectiles: [],
      effects: [],
      propParticles: [],
      player: { ...state.player, ...dungeon.spawn },
      combatTarget: undefined,
      lastTick: now,
    };
  }

  if (!state.dungeon || !state.overworldReturn) return state;
  if (Math.hypot(state.player.x - state.dungeon.exit.x, state.player.y - state.dungeon.exit.y) <= 95) {
    return {
      ...state,
      scene: 'overworld',
      dungeon: undefined,
      overworldReturn: undefined,
      ...state.overworldReturn,
      projectiles: [],
      effects: [],
      propParticles: [],
      lastTick: now,
    };
  }

  const chest = state.dungeon.chests.find((candidate) => !candidate.opened && Math.hypot(state.player.x - candidate.x, state.player.y - candidate.y) <= 92);
  if (!chest) return state;
  const definition = getDungeonDefinition(state.dungeon.definitionId);
  const rolls = randomRange(definition.chestRolls, hashRuntimeId(chest.id));
  let nextEntityId = state.nextEntityId;
  const worldDrops = [...state.worldDrops];
  for (let index = 0; index < rolls; index += 1) {
    const angle = Math.PI * 2 * index / Math.max(1, rolls) - Math.PI / 2;
    const distance = 72 + (index % 2) * 26;
    const random = makeDeterministicRandom(hashRuntimeId(chest.id) + index * 97);
    const spawned = makeChestRollDrops(nextEntityId, chest.x + Math.cos(angle) * distance, chest.y + Math.sin(angle) * distance, definition.chestLoot, now + index * 90, random);
    worldDrops.push(...spawned);
    nextEntityId += Math.max(1, spawned.length);
  }
  return {
    ...state,
    dungeon: { ...state.dungeon, chests: state.dungeon.chests.map((candidate) => candidate.id === chest.id ? { ...candidate, opened: true } : candidate) },
    worldDrops,
    nextEntityId,
  };
}

export function getAdventureInteractionPrompt(state: AdventureState) {
  if (state.scene === 'overworld') {
    const location = getNearbyLocation(state);
    return location ? '[E] Enter' : undefined;
  }
  if (!state.dungeon) return undefined;
  if (Math.hypot(state.player.x - state.dungeon.exit.x, state.player.y - state.dungeon.exit.y) <= 95) return '[E] Exit';
  const chest = state.dungeon.chests.find((candidate) => !candidate.opened && Math.hypot(state.player.x - candidate.x, state.player.y - candidate.y) <= 92);
  return chest ? '[E] Open' : undefined;
}

export function debugTeleportPlayer(state: AdventureState, x: number, y: number): AdventureState {
  return { ...state, player: { ...state.player, x, y } };
}

function getNearbyLocation(state: AdventureState) {
  return state.worldLocations.find((location) => Math.hypot(state.player.x - location.x, state.player.y - location.y) <= location.radius + 70);
}

export function activateWeapon(state: AdventureState, hand: HandSlot, aim: { x: number; y: number }, now: number): AdventureState {
  if (now < state.cooldownReadyAt[hand]) return state;
  const weapon = getEquippedWeapon(state, hand);
  if (!weapon) return state;
  const cooldownMs = 1000 / weapon.attackSpeed;
  const nextReady = { ...state.cooldownReadyAt, [hand]: now + cooldownMs };
  const weaponFlash = [...state.weaponFlash.filter((flash) => flash.hand !== hand), { hand, born: now }];

  if (weapon.kind === 'melee') {
    const hitCenter = getMeleeHitCenter(state.player, aim, weapon);
    const outfit = getOutfit(state.character.outfitId);
    const skillDamageMultiplier = getPassiveSkillModifiers(state.skills.unlockedIds).damageMultiplier;
    const attackWeapon = { ...weapon, damage: Math.ceil((weapon.damage + (outfit.damageBonus ?? 0)) * skillDamageMultiplier) };
    const { enemies, hits } = applyMeleeWeapon(state.enemies, hitCenter, attackWeapon);
    const objectHits = state.worldObjects.filter((object) => object.hp !== undefined && object.hp > 0 && circleIntersectsObject(hitCenter.x, hitCenter.y, weapon.radius, object));
    const worldObjects = objectHits.reduce((objects, object) => damageWorldObject(objects, object.id, attackWeapon.damage, now), state.worldObjects);
    const impact = hits[0] ? getClosestBorderPoint(state.player, hits[0], hits[0].radius) : hitCenter;
    const effects = [...state.effects, makeHitEffect(state.nextEntityId, impact.x, impact.y, weapon, now)];
    const propParticles = [...state.propParticles];
    let worldDrops = state.worldDrops;
    const combatTarget: CombatTarget | undefined = hits[0]
      ? { kind: 'enemy', id: hits[0].id }
      : objectHits[0]
        ? { kind: 'prop', id: objectHits[0].id }
        : state.combatTarget;
    let nextEntityId = state.nextEntityId + 1;
    for (const hit of hits) {
      effects.push(makeDamageEffect(nextEntityId, hit.x, hit.y, attackWeapon.damage, getQueuedDamageBorn(effects, hit.x, hit.y, now)));
      nextEntityId += 1;
      if (!hit.invulnerable && hit.hp > 0 && hit.hp - attackWeapon.damage <= 0) {
        effects.push(makeEnemyDeathEffect(nextEntityId, hit, now));
        nextEntityId += 1;
        const spawned = makeWorldDrops(nextEntityId, hit.x, hit.y, hit.loot, now);
        worldDrops = [...worldDrops, ...spawned];
        nextEntityId += spawned.length;
      }
    }
    for (const hit of objectHits) {
      const destroyed = hit.hp! - attackWeapon.damage <= 0;
      const particles = makePropParticles(nextEntityId, hit, now, undefined, undefined, destroyed);
      propParticles.push(...particles);
      nextEntityId += particles.length;
      effects.push(makeDamageEffect(nextEntityId, hit.x, hit.y, attackWeapon.damage, getQueuedDamageBorn(effects, hit.x, hit.y, now)));
      nextEntityId += 1;
      if (destroyed) {
        const spawned = makeWorldDrops(nextEntityId, hit.x, hit.y, hit.loot, now);
        worldDrops = [...worldDrops, ...spawned];
        nextEntityId += spawned.length;
      }
    }
    return {
      ...state,
      enemies,
      worldObjects,
      cooldownReadyAt: nextReady,
      weaponFlash,
      effects,
      propParticles,
      worldDrops,
      nextEntityId,
      combatTarget,
    };
  }

  const origin = getHandPosition(state.player, state.character.pillWidth, hand);
  const direction = normalizedVector(origin, aim);
  const skillDamageMultiplier = getPassiveSkillModifiers(state.skills.unlockedIds).damageMultiplier;
  const projectiles = makeProjectiles(
    state.nextEntityId,
    { ...weapon, damage: Math.ceil((weapon.damage + (getOutfit(state.character.outfitId).damageBonus ?? 0)) * skillDamageMultiplier) },
    hand,
    origin,
    direction,
  );

  return {
    ...state,
    cooldownReadyAt: nextReady,
    weaponFlash,
    projectiles: [...state.projectiles, ...projectiles],
    nextEntityId: state.nextEntityId + projectiles.length,
  };
}

export function equipWeapon(state: AdventureState, hand: HandSlot, weaponInstanceId: string): AdventureState {
  if (!state.inventory.weapons.some((weapon) => weapon.id === weaponInstanceId)) return state;
  return {
    ...state,
    character: {
      ...state.character,
      [hand === 'left' ? 'leftWeaponInstanceId' : 'rightWeaponInstanceId']: weaponInstanceId,
    },
  };
}

export function unequipWeapon(state: AdventureState, hand: HandSlot): AdventureState {
  return {
    ...state,
    character: {
      ...state.character,
      [hand === 'left' ? 'leftWeaponInstanceId' : 'rightWeaponInstanceId']: undefined,
    },
  };
}

export function equipWeaponByItemNo(state: AdventureState, hand: HandSlot, itemNo: number): AdventureState {
  const weapon = state.inventory.weapons.find((item) => item.itemNo === itemNo);
  return weapon ? equipWeapon(state, hand, weapon.id) : state;
}

export function applyTraitToWeapon(state: AdventureState, traitId: string, weaponInstanceId: string): AdventureState {
  const trait = state.inventory.traits.find((item) => item.traitId === traitId && item.count > 0);
  if (!trait) return state;
  const target = state.inventory.weapons.find((weapon) => weapon.id === weaponInstanceId);
  if (!target || target.traitIds.length >= 5) return state;

  return {
    ...state,
    inventory: {
      ...state.inventory,
      weapons: state.inventory.weapons.map((weapon) =>
        weapon.id === weaponInstanceId ? { ...weapon, traitIds: [...weapon.traitIds, traitId] } : weapon,
      ),
      traits: state.inventory.traits
        .map((item) => (item.traitId === traitId ? { ...item, count: item.count - 1 } : item))
        .filter((item) => item.count > 0),
    },
  };
}

export function applyTraitToWeaponByItemNo(state: AdventureState, traitItemNo: number, weaponItemNo: number): AdventureState {
  const trait = state.inventory.traits.find((item) => item.itemNo === traitItemNo);
  const weapon = state.inventory.weapons.find((item) => item.itemNo === weaponItemNo);
  if (!trait || !weapon) return state;
  return applyTraitToWeapon(state, trait.traitId, weapon.id);
}

export function usePotionByItemNo(state: AdventureState, itemNo: number, now: number): AdventureState {
  const potion = state.inventory.potions.find((item) => item.itemNo === itemNo && item.count > 0);
  if (!potion || now < (state.potionReadyAt[potion.itemId] ?? 0)) return state;
  return {
    ...state,
    player: { ...state.player, hp: Math.min(state.player.maxHp, state.player.hp + potion.heal) },
    inventory: {
      ...state.inventory,
      potions: state.inventory.potions
        .map((item) => (item.itemNo === itemNo ? { ...item, count: item.count - 1 } : item))
        .filter((item) => item.count > 0),
    },
    potionReadyAt: { ...state.potionReadyAt, [potion.itemId]: now + potion.cooldownMs },
  };
}

export function dropLootAtPlayer(state: AdventureState, itemId: string, now: number): AdventureState {
  getAdventureItem(itemId);
  const position = getDebugDropPosition(state.player);
  return {
    ...state,
    worldDrops: [...state.worldDrops, {
      id: `drop-${String(state.nextEntityId).padStart(2, '0')}`,
      kind: 'item',
      x: position.x,
      y: position.y,
      born: now,
      itemId,
    }],
    nextEntityId: state.nextEntityId + 1,
  };
}

export function dropCoinsAtPlayer(state: AdventureState, amount: number, now: number): AdventureState {
  const coinAmount = Math.max(0, Math.floor(amount));
  if (coinAmount <= 0) return state;
  const position = getDebugDropPosition(state.player);
  const drops = makeCoinDrops(state.nextEntityId, position.x, position.y, coinAmount, now);
  return {
    ...state,
    worldDrops: [...state.worldDrops, ...drops],
    nextEntityId: state.nextEntityId + drops.length,
  };
}

function getDebugDropPosition(player: Actor) {
  const distance = player.radius + 82;
  return {
    x: player.x + (player.facing === 'left' ? -distance : distance),
    y: player.y + 8,
  };
}

export function customizeCharacter(state: AdventureState, changes: Partial<Pick<AdventureCharacter, 'body' | 'color' | 'pillWidth'>>): AdventureState {
  return { ...state, character: { ...state.character, ...changes } };
}

export function equipOutfit(state: AdventureState, outfitId: string): AdventureState {
  const current = getOutfit(state.character.outfitId);
  const next = getOutfit(outfitId);
  if (current.id === next.id) return state;
  const baseMaxHp = state.player.maxHp - (current.maxHpBonus ?? 0);
  const maxHp = baseMaxHp + (next.maxHpBonus ?? 0);
  return {
    ...state,
    character: { ...state.character, outfitId: next.id },
    player: { ...state.player, maxHp, hp: Math.min(maxHp, state.player.hp + Math.max(0, (next.maxHpBonus ?? 0) - (current.maxHpBonus ?? 0))) },
  };
}

export function equipPotionToSlot(state: AdventureState, itemNo: number, slot: number): AdventureState {
  if (slot < 1 || slot > 5 || !state.inventory.potions.some((item) => item.itemNo === itemNo)) return state;
  return {
    ...state,
    hotbarSlots: state.hotbarSlots.map((entry, index) =>
      index === slot - 1 ? { kind: 'potion', itemNo } : entry?.kind === 'potion' && entry.itemNo === itemNo ? undefined : entry,
    ),
  };
}

export function equipSkillToSlot(state: AdventureState, skillId: string, slot: number): AdventureState {
  const skill = getSkill(skillId);
  if (slot < 1 || slot > 5 || skill.kind !== 'active' || !state.skills.unlockedIds.includes(skillId)) return state;
  return {
    ...state,
    hotbarSlots: state.hotbarSlots.map((entry, index) =>
      index === slot - 1 ? { kind: 'skill', skillId } : entry?.kind === 'skill' && entry.skillId === skillId ? undefined : entry,
    ),
  };
}

export function useHotbarSlot(state: AdventureState, slot: number, aim: { x: number; y: number }, now: number): AdventureState {
  const entry = state.hotbarSlots[slot - 1];
  if (!entry) return flashItemSlot(state, slot, now);
  if (entry.kind === 'skill') {
    const next = activateSkill(state, entry.skillId, aim, now);
    return next === state ? state : flashItemSlot(next, slot, now);
  }
  const next = usePotionByItemNo(state, entry.itemNo, now);
  if (next === state) return state;
  const stillAvailable = next.inventory.potions.some((item) => item.itemNo === entry.itemNo);
  return {
    ...next,
    hotbarSlots: stillAvailable
      ? next.hotbarSlots
      : next.hotbarSlots.map((candidate) => candidate?.kind === 'potion' && candidate.itemNo === entry.itemNo ? undefined : candidate),
    itemFlash: [...next.itemFlash.filter((flash) => flash.slot !== slot), { slot, born: now }],
  };
}

export function unlockSkill(state: AdventureState, skillId: string): AdventureState {
  if (state.skills.unlockedIds.includes(skillId)) return state;
  const skill = getSkill(skillId);
  if (state.skills.points < skill.cost || getSkillPrerequisites(skill).some((requiredId) => !state.skills.unlockedIds.includes(requiredId))) return state;
  const previousModifiers = getPassiveSkillModifiers(state.skills.unlockedIds);
  const unlockedIds = [...state.skills.unlockedIds, skillId];
  const nextModifiers = getPassiveSkillModifiers(unlockedIds);
  const gainedMaxHp = nextModifiers.maxHp - previousModifiers.maxHp;
  return {
    ...state,
    player: gainedMaxHp > 0
      ? { ...state.player, maxHp: state.player.maxHp + gainedMaxHp, hp: state.player.hp + gainedMaxHp }
      : state.player,
    skills: { ...state.skills, points: state.skills.points - skill.cost, unlockedIds },
  };
}

export function activateSkill(state: AdventureState, skillId: string, aim: { x: number; y: number }, now: number): AdventureState {
  const skill = getSkill(skillId);
  if (skill.kind !== 'active' || !skill.active || !state.skills.unlockedIds.includes(skillId)) return state;
  if (now < (state.skills.cooldownReadyAt[skillId] ?? 0)) return state;
  const cooldownReadyAt = { ...state.skills.cooldownReadyAt, [skillId]: now + skill.active.cooldownMs };
  const effect = skill.active.effect;
  if (effect.kind === 'heal') {
    if (state.player.hp >= state.player.maxHp) return state;
    return {
      ...state,
      player: { ...state.player, hp: Math.min(state.player.maxHp, state.player.hp + effect.amount) },
      skills: { ...state.skills, cooldownReadyAt },
      effects: [...state.effects, { id: state.nextEntityId, kind: 'hit', x: state.player.x, y: state.player.y - 20, glyph: skill.icon, color: skill.color, born: now, size: 28 }],
      nextEntityId: state.nextEntityId + 1,
    };
  }
  if (effect.kind === 'blink') {
    const player = blinkPlayer(state.player, aim, state.worldObjects, effect.distance, state.dungeon?.walkable);
    return {
      ...state,
      player,
      skills: { ...state.skills, cooldownReadyAt },
      effects: [...state.effects, { id: state.nextEntityId, kind: 'hit', x: player.x, y: player.y, glyph: skill.icon, color: skill.color, born: now, size: 30 }],
      nextEntityId: state.nextEntityId + 1,
    };
  }
  return {
    ...state,
    skills: { ...state.skills, cooldownReadyAt, hasteUntil: now + effect.durationMs },
    effects: [...state.effects, { id: state.nextEntityId, kind: 'hit', x: state.player.x, y: state.player.y, glyph: skill.icon, color: skill.color, born: now, size: 30 }],
    nextEntityId: state.nextEntityId + 1,
  };
}

export function disposeInventoryItem(state: AdventureState, kind: 'weapon' | 'trait' | 'potion', itemNo: number): AdventureState {
  if (kind === 'weapon') {
    const weapon = state.inventory.weapons.find((item) => item.itemNo === itemNo);
    if (!weapon || weapon.id === state.character.leftWeaponInstanceId || weapon.id === state.character.rightWeaponInstanceId) return state;
    return {
      ...state,
      inventory: { ...state.inventory, weapons: state.inventory.weapons.filter((item) => item.itemNo !== itemNo) },
    };
  }
  if (kind === 'trait') {
    return {
      ...state,
      inventory: { ...state.inventory, traits: state.inventory.traits.filter((item) => item.itemNo !== itemNo) },
    };
  }
  return {
    ...state,
    inventory: { ...state.inventory, potions: state.inventory.potions.filter((item) => item.itemNo !== itemNo) },
    hotbarSlots: state.hotbarSlots.map((entry) => entry?.kind === 'potion' && entry.itemNo === itemNo ? undefined : entry),
  };
}

export function removeTraitFromWeapon(state: AdventureState, weaponInstanceId: string, index: number): AdventureState {
  const weapon = state.inventory.weapons.find((item) => item.id === weaponInstanceId);
  const traitId = weapon?.traitIds[index];
  if (!weapon || !traitId) return state;
  return {
    ...state,
    inventory: {
      ...state.inventory,
      weapons: state.inventory.weapons.map((item) =>
        item.id === weaponInstanceId ? { ...item, traitIds: item.traitIds.filter((_, traitIndex) => traitIndex !== index) } : item,
      ),
      traits: addTraitStack(state.inventory.traits, traitId),
    },
  };
}

export function getEquippedWeapon(state: AdventureState, hand: HandSlot): EffectiveWeapon | undefined {
  const weaponInstanceId = hand === 'left' ? state.character.leftWeaponInstanceId : state.character.rightWeaponInstanceId;
  const fallback = state.inventory.weapons.find((weapon) => weapon.baseWeaponId === 'melee-00');
  return getEffectiveWeapon(state, weaponInstanceId ?? fallback?.id ?? '');
}

export function getEffectiveWeapon(state: Pick<AdventureState, 'inventory'>, weaponInstanceId: string): EffectiveWeapon {
  const instance = state.inventory.weapons.find((weapon) => weapon.id === weaponInstanceId);
  if (!instance) throw new Error(`Unknown weapon instance: ${weaponInstanceId}`);
  const base = getWeapon(instance.baseWeaponId);
  const traits = instance.traitIds.map(getTrait);
  const damageMultiplier = traits.reduce((value, trait) => value * (trait.damageMultiplier ?? 1), 1);
  const attackSpeedMultiplier = traits.reduce((value, trait) => value * (trait.attackSpeedMultiplier ?? 1), 1);
  const rangeMultiplier = traits.reduce((value, trait) => value * (trait.rangeMultiplier ?? 1), 1);
  const radiusMultiplier = traits.reduce((value, trait) => value * (trait.radiusMultiplier ?? 1), 1);
  const extraProjectiles = traits.reduce((value, trait) => value + (trait.extraProjectiles ?? 0), 0);

  return {
    ...base,
    instanceId: instance.id,
    instanceName: instance.name,
    traits,
    baseDamage: base.damage,
    baseAttackSpeed: base.attackSpeed,
    baseRange: base.range,
    baseRadius: base.radius,
    damage: Math.ceil(base.damage * damageMultiplier),
    attackSpeed: roundStat(base.attackSpeed * attackSpeedMultiplier),
    range: Math.ceil(base.range * rangeMultiplier),
    radius: Math.ceil(base.radius * radiusMultiplier),
    projectileCount: base.kind === 'projectile' ? 1 + extraProjectiles : 1,
  };
}

export function flashItemSlot(state: AdventureState, slot: number, now: number): AdventureState {
  return {
    ...state,
    itemFlash: [...state.itemFlash.filter((flash) => flash.slot !== slot), { slot, born: now }],
  };
}

function getActiveHasteBonus(state: AdventureState) {
  return state.skills.unlockedIds.reduce((bonus, skillId) => {
    const effect = getSkill(skillId).active?.effect;
    return effect?.kind === 'haste' ? Math.max(bonus, effect.speedBonus) : bonus;
  }, 0);
}

function blinkPlayer(player: Actor, aim: { x: number; y: number }, worldObjects: WorldObject[], distance: number, walkable?: DungeonRect[]): Actor {
  const direction = normalizedVector(player, aim);
  const requestedDistance = Math.min(distance, Math.hypot(aim.x - player.x, aim.y - player.y));
  const blockers = worldObjects.filter((object) => object.blocking && object.hp !== 0);
  let result = player;
  const steps = Math.max(1, Math.ceil(requestedDistance / 12));
  for (let step = 1; step <= steps; step += 1) {
    const traveled = requestedDistance * step / steps;
    const x = player.x + direction.x * traveled;
    const y = player.y + direction.y * traveled;
    if (blockers.some((object) => circleIntersectsObject(x, y, player.radius, object)) || !isInsideWalkableArea(x, y, player.radius, walkable)) break;
    result = { ...player, x, y, facing: direction.x < 0 ? 'left' : 'right' };
  }
  return result;
}

function movePlayer(player: Actor, worldObjects: WorldObject[], keys: Set<string>, aim: { x: number; y: number }, deltaSeconds: number, speed: number, walkable?: DungeonRect[]): Actor {
  let dx = 0;
  let dy = 0;
  if (keys.has('a') || keys.has('arrowleft')) dx -= 1;
  if (keys.has('d') || keys.has('arrowright')) dx += 1;
  if (keys.has('w') || keys.has('arrowup')) dy -= 1;
  if (keys.has('s') || keys.has('arrowdown')) dy += 1;
  const length = Math.hypot(dx, dy) || 1;
  const targetX = player.x + (dx / length) * speed * deltaSeconds;
  const targetY = player.y + (dy / length) * speed * deltaSeconds;
  const activeBlockers = worldObjects.filter((object) => object.blocking && object.hp !== 0);
  const x = activeBlockers.some((object) => circleIntersectsObject(targetX, player.y, player.radius, object)) || !isInsideWalkableArea(targetX, player.y, player.radius, walkable) ? player.x : targetX;
  const y = activeBlockers.some((object) => circleIntersectsObject(x, targetY, player.radius, object)) || !isInsideWalkableArea(x, targetY, player.radius, walkable) ? player.y : targetY;
  return { ...player, x, y, facing: aim.x < player.x ? 'left' : 'right' };
}

function damageWorldObject(objects: WorldObject[], objectId: string, damage: number, now: number) {
  return objects.map((object) => object.id === objectId && object.hp !== undefined
    ? { ...object, hp: Math.max(0, object.hp - damage), hitAt: now }
    : object);
}

function makePropParticles(
  startId: number,
  object: WorldObject,
  now: number,
  forcedKind?: PropParticle['kind'],
  forcedCount?: number,
  destroyed = false,
): PropParticle[] {
  const kind = forcedKind ?? getPropParticleKind(object.kind);
  const configuredRange = destroyed ? object.destroyPieces : object.hitPieces;
  const fallbackRange: [number, number] = destroyed
    ? kind === 'leaf' ? [9, 14] : kind === 'stone' ? [7, 11] : [8, 13]
    : kind === 'leaf' ? [2, 4] : kind === 'stone' ? [1, 3] : [2, 4];
  const count = forcedCount ?? randomRange(configuredRange ?? fallbackRange, startId + object.id.length * 17);
  const colors = kind === 'leaf'
    ? ['#315f2b', '#5f9636', '#a8c948']
    : kind === 'petal'
      ? ['#ed78ad', '#fff0f5', '#f1c83e']
      : kind === 'stone'
        ? ['#777e7b', '#a0a59e', '#c0c2b6']
        : ['#79502c', '#a56a35', '#d0914d'];
  return Array.from({ length: count }, (_, index) => {
    const angle = (Math.PI * 2 * index) / count + seededParticle(startId + index) * 0.8;
    const speed = 45 + seededParticle(startId + index * 3 + 11) * 85;
    return {
      id: startId + index,
      kind,
      x: object.x,
      y: object.y - object.height * 0.15,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 70,
      gravity: kind === 'leaf' || kind === 'petal' ? 105 : 240,
      rotation: seededParticle(startId + index * 5 + 17) * Math.PI * 2,
      spin: (seededParticle(startId + index * 7 + 23) - 0.5) * 12,
      size: 4.5 + seededParticle(startId + index * 11 + 29) * (kind === 'stone' ? 5 : 4.5),
      color: colors[index % colors.length],
      born: now,
      life: kind === 'leaf' || kind === 'petal' ? 1150 : 800,
    };
  });
}

function randomRange(range: [number, number], seed: number) {
  const min = Math.min(range[0], range[1]);
  const max = Math.max(range[0], range[1]);
  return min + Math.floor(seededParticle(seed) * (max - min + 1));
}

function getPropParticleKind(kind: WorldObject['kind']): PropParticle['kind'] {
  if (kind === 'bush' || kind === 'tree') return 'leaf';
  if (kind === 'rock' || kind === 'ruin-wall' || kind === 'ruin-pillar' || kind === 'rubble') return 'stone';
  return 'wood';
}

function seededParticle(seed: number) {
  const value = Math.sin(seed * 917.31) * 10000;
  return value - Math.floor(value);
}

function circleIntersectsObject(x: number, y: number, radius: number, object: WorldObject) {
  if (!object.collision) return false;
  const cos = Math.cos(-object.rotation);
  const sin = Math.sin(-object.rotation);
  const dx = x - object.x;
  const dy = y - object.y;
  const localX = dx * cos - dy * sin;
  const localY = dx * sin + dy * cos;

  if (object.collision.kind === 'circle') {
    const objectRadius = Math.min(object.width, object.height) * object.collision.radiusRatio;
    return Math.hypot(localX, localY) < radius + objectRadius;
  }
  if (object.collision.kind === 'ellipse') {
    const radiusX = object.width * object.collision.radiusXRatio + radius;
    const radiusY = object.height * object.collision.radiusYRatio + radius;
    return (localX * localX) / (radiusX * radiusX) + (localY * localY) / (radiusY * radiusY) < 1;
  }

  const halfWidth = object.width * object.collision.widthRatio / 2;
  const halfHeight = object.height * object.collision.heightRatio / 2;
  const closestX = clamp(localX, -halfWidth, halfWidth);
  const closestY = clamp(localY, -halfHeight, halfHeight);
  return Math.hypot(localX - closestX, localY - closestY) < radius;
}

function getMeleeHitCenter(player: Actor, aim: { x: number; y: number }, weapon: WeaponDefinition) {
  const direction = normalizedVector(player, aim);
  const distance = Math.min(weapon.range, Math.max(36, Math.hypot(aim.x - player.x, aim.y - player.y)));
  return {
    x: player.x + direction.x * distance,
    y: player.y + direction.y * distance,
  };
}

function applyMeleeWeapon(enemies: AdventureEnemy[], hitCenter: { x: number; y: number }, weapon: EffectiveWeapon) {
  const hits: AdventureEnemy[] = [];
  const nextEnemies = enemies.map((enemy) => {
    if (enemy.hp <= 0) return enemy;
    if (Math.hypot(enemy.x - hitCenter.x, enemy.y - hitCenter.y) > weapon.radius + enemy.radius) return enemy;
    hits.push(enemy);
    return damageEnemyActor(enemy, weapon.damage);
  });
  return { enemies: nextEnemies, hits };
}

function damageEnemy(enemies: AdventureEnemy[], enemyId: string, damage: number) {
  return enemies.map((enemy) => (enemy.id === enemyId ? damageEnemyActor(enemy, damage) : enemy));
}

function hashRuntimeId(value: string) {
  let hash = 2166136261;
  for (const character of value) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return hash >>> 0;
}

function makeDeterministicRandom(seed: number) {
  let salt = 0;
  return () => seededParticle(seed + salt++ * 101);
}

function damageEnemyActor(enemy: AdventureEnemy, damage: number) {
  if (enemy.invulnerable && enemy.hp - damage <= 0) return { ...enemy, hp: enemy.maxHp };
  return { ...enemy, hp: Math.max(0, enemy.hp - damage) };
}

function moveEnemyToward(enemy: AdventureEnemy, target: { x: number; y: number }, objects: WorldObject[], deltaSeconds: number, walkable?: DungeonRect[]) {
  const dx = target.x - enemy.x;
  const dy = target.y - enemy.y;
  const length = Math.hypot(dx, dy) || 1;
  return moveEnemy(enemy, enemy.x + dx / length * enemy.speed * deltaSeconds, enemy.y + dy / length * enemy.speed * deltaSeconds, objects, walkable);
}

function returnEnemyToSpawn(enemy: AdventureEnemy, objects: WorldObject[], deltaSeconds: number, walkable?: DungeonRect[]) {
  if (Math.hypot(enemy.x - enemy.spawnX, enemy.y - enemy.spawnY) < 8) return enemy;
  return moveEnemyToward(enemy, { x: enemy.spawnX, y: enemy.spawnY }, objects, deltaSeconds, walkable);
}

function moveEnemy(enemy: AdventureEnemy, targetX: number, targetY: number, objects: WorldObject[], walkable?: DungeonRect[]) {
  const blockers = objects.filter((object) => object.blocking && object.hp !== 0);
  const x = blockers.some((object) => circleIntersectsObject(targetX, enemy.y, enemy.radius, object)) || !isInsideWalkableArea(targetX, enemy.y, enemy.radius, walkable) ? enemy.x : targetX;
  const y = blockers.some((object) => circleIntersectsObject(x, targetY, enemy.radius, object)) || !isInsideWalkableArea(x, targetY, enemy.radius, walkable) ? enemy.y : targetY;
  return { ...enemy, x, y };
}

function isInsideWalkableArea(x: number, y: number, radius: number, walkable?: DungeonRect[]) {
  if (!walkable) return true;
  return walkable.some((rect) => x - radius >= rect.x && x + radius <= rect.x + rect.width && y - radius >= rect.y && y + radius <= rect.y + rect.height);
}

function normalizedVector(from: { x: number; y: number }, to: { x: number; y: number }) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  return { x: dx / length, y: dy / length };
}

function getHandPosition(player: Actor, pillWidth: number, hand: HandSlot) {
  const localX = (hand === 'left' ? -1 : 1) * (pillWidth / 2 + 16);
  return {
    x: player.x + (player.facing === 'left' ? -localX : localX),
    y: player.y,
  };
}

function makeHitEffect(id: number, x: number, y: number, weapon: Pick<WeaponDefinition, 'effectGlyph' | 'color' | 'effectSize'>, born: number): CombatEffect {
  return { id, kind: 'hit', x, y, glyph: weapon.effectGlyph, color: weapon.color, born, size: weapon.effectSize };
}

function makeDamageEffect(id: number, x: number, y: number, damage: number, born: number): CombatEffect {
  return { id, kind: 'damage', x, y, glyph: `-${damage}`, color: '#c3293a', born };
}

function makeEnemyDeathEffect(id: number, enemy: AdventureEnemy, born: number): CombatEffect {
  return {
    id,
    kind: 'death',
    x: enemy.x,
    y: enemy.y,
    toX: enemy.x + 90,
    toY: enemy.y + 190,
    glyph: 'X_X',
    color: '#bb3f4d',
    body: enemy.deathBody,
    leftHand: enemy.deathLeftHand,
    rightHand: enemy.deathRightHand,
    background: enemy.color,
    pillWidth: enemy.pillWidth,
    team: 'enemy',
    born,
  };
}

function getQueuedDamageBorn(effects: CombatEffect[], x: number, y: number, now: number) {
  const queueIndex = effects.filter(
    (effect) => effect.kind === 'damage' && Math.hypot(effect.x - x, effect.y - y) < 24 && now - effect.born < 850,
  ).length;
  return now + queueIndex * 150;
}

function getEffectLife(effect: CombatEffect) {
  if (effect.kind === 'death') return 1250;
  return effect.kind === 'damage' ? 950 : 420;
}

function createInitialInventory(): AdventureInventory {
  return {
    weapons: [
      { itemNo: 0, id: 'weapon-00', baseWeaponId: 'melee-00', name: 'Bare Fist', traitIds: [] },
      { itemNo: 1, id: 'weapon-01', baseWeaponId: 'melee-01', name: 'Training Fist', traitIds: [] },
      { itemNo: 2, id: 'weapon-02', baseWeaponId: 'ranged-01', name: 'Spark Wand', traitIds: [] },
      { itemNo: 3, id: 'weapon-03', baseWeaponId: 'melee-02', name: 'Heart Tether', traitIds: ['augmentation-06'] },
      { itemNo: 4, id: 'weapon-04', baseWeaponId: 'ranged-02', name: 'Practice Blade', traitIds: ['augmentation-09'] },
    ],
    traits: [
      { itemNo: 101, traitId: 'augmentation-01', count: 3 },
      { itemNo: 102, traitId: 'augmentation-04', count: 2 },
      { itemNo: 103, traitId: 'augmentation-06', count: 2 },
      { itemNo: 104, traitId: 'augmentation-08', count: 2 },
      { itemNo: 105, traitId: 'augmentation-09', count: 2 },
    ],
    potions: [makePotionStack('item-02', 201, 3)],
  };
}

function makePotionStack(itemId: string, itemNo: number, count: number): PotionStack {
  const item = getAdventureItem(itemId);
  return { itemNo, itemId, name: item.name, icon: item.icon, rank: item.rank, count, heal: item.heal, cooldownMs: item.cooldownMs };
}

function makeWorldDrops(startId: number, x: number, y: number, table: LootTable | undefined, now: number, random = makeDeterministicRandom(startId)): WorldDrop[] {
  const rolled = rollLootTable(table, random);
  const drops = makeCoinDrops(startId, x - 15, y + 5, rolled.coins, now);
  if (rolled.itemId) {
    drops.push({ id: `drop-${String(startId + drops.length).padStart(2, '0')}`, kind: 'item', x: x + 15, y: y - 5, born: now, itemId: rolled.itemId });
  }
  return drops;
}

function makeChestRollDrops(startId: number, x: number, y: number, table: LootTable, now: number, random: () => number): WorldDrop[] {
  const rolled = rollLootTable(table, random);
  const drops: WorldDrop[] = [];
  if (rolled.coins > 0) drops.push({ id: `drop-${String(startId).padStart(2, '0')}`, kind: 'coin', x: x - 14, y: y + 6, born: now, amount: rolled.coins });
  if (rolled.itemId) drops.push({ id: `drop-${String(startId + drops.length).padStart(2, '0')}`, kind: 'item', x: x + 14, y: y - 6, born: now + 45, itemId: rolled.itemId });
  return drops;
}

function makeCoinDrops(startId: number, x: number, y: number, amount: number, now: number): WorldDrop[] {
  const values = decomposeCoinValues(amount);
  const columns = Math.min(5, values.length);
  return values.map((value, index) => {
    const row = Math.floor(index / columns);
    const rowCount = Math.min(columns, values.length - row * columns);
    const column = index % columns;
    return {
      id: `drop-${String(startId + index).padStart(2, '0')}`,
      kind: 'coin',
      x: x + (column - (rowCount - 1) / 2) * 22,
      y: y + row * 20 + (index % 2 === 0 ? -3 : 3),
      born: now + index * 35,
      amount: value,
    };
  });
}

function decomposeCoinValues(amount: number) {
  let remaining = Math.max(0, Math.floor(amount));
  const values: number[] = [];
  while (remaining >= 10) {
    values.push(10);
    remaining -= 10;
  }
  while (remaining >= 5) {
    values.push(5);
    remaining -= 5;
  }
  while (remaining > 0) {
    values.push(1);
    remaining -= 1;
  }
  return values;
}

function collectWorldDrops(worldDrops: WorldDrop[], player: Actor, inventory: AdventureInventory, coins: number, now: number) {
  let nextInventory = inventory;
  let nextCoins = coins;
  const remaining: WorldDrop[] = [];
  for (const drop of worldDrops) {
    if (now - drop.born < 1200 || Math.hypot(drop.x - player.x, drop.y - player.y) > player.radius + 28) {
      remaining.push(drop);
      continue;
    }
    if (drop.kind === 'coin') {
      nextCoins += drop.amount ?? 0;
      continue;
    }
    if (!drop.itemId) continue;
    const existing = nextInventory.potions.find((item) => item.itemId === drop.itemId);
    const potions = existing
      ? nextInventory.potions.map((item) => item.itemId === drop.itemId ? { ...item, count: item.count + 1 } : item)
      : [...nextInventory.potions, makePotionStack(drop.itemId, Math.max(200, ...nextInventory.potions.map((item) => item.itemNo)) + 1, 1)];
    nextInventory = { ...nextInventory, potions };
  }
  return { worldDrops: remaining, inventory: nextInventory, coins: nextCoins };
}

function addTraitStack(stacks: TraitStack[], traitId: string) {
  if (stacks.some((item) => item.traitId === traitId)) {
    return stacks.map((item) => (item.traitId === traitId ? { ...item, count: item.count + 1 } : item));
  }
  const nextItemNo = Math.max(100, ...stacks.map((item) => item.itemNo)) + 1;
  return [...stacks, { itemNo: nextItemNo, traitId, count: 1 }];
}

function makeProjectiles(
  startId: number,
  weapon: EffectiveWeapon,
  hand: HandSlot,
  origin: { x: number; y: number },
  direction: { x: number; y: number },
) {
  const count = weapon.projectileCount;
  const spreadStep = count > 1 ? Math.PI / 24 : 0;
  const offset = ((count - 1) * spreadStep) / 2;
  return Array.from({ length: count }, (_, index) => {
    const angle = Math.atan2(direction.y, direction.x) - offset + index * spreadStep;
    const vx = Math.cos(angle) * (weapon.projectile?.speed ?? 500);
    const vy = Math.sin(angle) * (weapon.projectile?.speed ?? 500);
    return {
      id: startId + index,
      weaponInstanceId: weapon.instanceId,
      hand,
      x: origin.x,
      y: origin.y,
      vx,
      vy,
      remainingDistance: weapon.range,
      radius: weapon.radius,
      damage: weapon.damage,
      glyph: weapon.projectile?.glyph ?? weapon.effectGlyph,
      color: weapon.color,
    };
  });
}

function roundStat(value: number) {
  return Math.round(value * 100) / 100;
}

function isInsideWorld(x: number, y: number) {
  return Number.isFinite(x) && Number.isFinite(y);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
