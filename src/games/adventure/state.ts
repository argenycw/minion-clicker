import { GAME_SETTINGS } from '../../shared/settings';
import type { WeaponDefinition } from './content';
import type { AdventureAudioCue } from './audio/types';
import type { AdventureEnemy } from './enemies/types';
import type { AdventureClanId } from './enemies/types';
import { getOutfit } from './outfits';
import { getActiveHasteBonus, getPassiveSkillModifiers, getSkill } from './skills';
import { adventureWorld, getAdventureWorldBounds, type BiomeTile, type WorldArea, type WorldObject } from './world';
import { generateAdventureChunk } from './world/chunks/generate';
import { getChunkCoordinate, getChunkKey, getLoadedChunkCoordinates } from './world/chunks/coordinates';
import type { AdventureChunk } from './world/chunks/types';
import { getAdventureItem, rollLootTable, type LootTable } from './loot';
import { generateDungeon } from './dungeons/generate';
import { getDungeonDefinition } from './dungeons/definitions';
import type { DungeonInstance, DungeonRect } from './dungeons/types';
import {
  getAdventureRankAtWorldPosition,
  scaleDungeonChestRollRangeForRank,
  scaleLootTableForRank,
} from './progression/system';
import { buyShopItem, sellInventoryItem } from './shops/system';
import type { ShopId, ShopStockId } from './shops/types';
import { createTownInstance, getNearbyTownNpc, isNearTownExit } from './towns/system';
import type { TownInstance } from './towns/types';
import type { WorldLocation } from './world/locations/types';
import { INITIAL_PLAYER_ID, INITIAL_PLAYER_SKILL_POINTS, INITIAL_POTION_LOADOUT, INITIAL_TRAIT_LOADOUT, INITIAL_UNLOCKED_SKILLS, INITIAL_WEAPON_LOADOUT } from './playerDefaults';
import type { AdventureCharacter } from './character/types';
import type { AdventureInventory, EffectiveWeapon, MaterialStack, PotionStack, TraitStack, WeaponInstance } from './inventory/types';
import { getEffectiveWeapon, getEquippedWeapon, usePotionByItemNo } from './inventory/system';
import type { AdventureSkills } from './skills/types';
import { getStatusModifiers, tickStatusEffects } from './status-effects/system';
import type { StatusEffectApplication, StatusEffectInstance, StatusTickEvent } from './status-effects/types';
import { getQueuedTextEffectBorn, makeHealEffect } from './combat/damage';
import type { CombatBehaviorInstance, CombatEffect, CombatTargetRef, PendingCircleAttack, PendingCombatAttack, PendingMeleeAttack } from './combat/types';
import { tickCombatRuntime } from './combat/runtime';
import { makeEnemyProjectile as makeRuntimeEnemyProjectile, makeProjectiles as makeRuntimeProjectiles } from './combat/projectileRuntime';
import { resolveMeleeAttack as resolveRuntimeMeleeAttack } from './combat/meleeRuntime';
import { getStatusInflictionsFromBehaviors, makeBehaviorInstance, makeMeleeBehaviorInstancesFromWeapon } from './combat/behaviorInstances';
import { areClansHostile } from './combat/clans';
import { circleIntersectsObject, isInsideWalkableArea, isInsideWorld, normalizedVector, type AdventureWorldBounds } from './combat/collision';
import { applyCombatTargetDamage } from './combat/damageRuntime';
import { makeChestRollDrops, makeCoinDrops, makeWorldDrops } from './combat/drops';
import { getEffectLife, makeEnemyAttackEffect, makeEnemyDeathEffect, makePlayerDeathEffect, makeStatusTickEffect } from './combat/effects';
import { applyKnockbackMotion, expireShield } from './combat/knockback';
import { makePropParticles } from './combat/particles';
import { hashRuntimeId, makeDeterministicRandom, randomRange } from './combat/random';

export type { AdventureCharacter } from './character/types';
export type { AdventureInventory, EffectiveWeapon, MaterialStack, PotionStack, TraitStack, WeaponInstance } from './inventory/types';
export type { AdventureSkills } from './skills/types';
export type { CombatEffect, PendingCircleAttack, PendingCombatAttack, PendingMeleeAttack } from './combat/types';
export { getEffectiveWeapon, getEquippedWeapon } from './inventory/system';
export { getNearbyTownNpc } from './towns/system';

export type Facing = 'left' | 'right';
export type HandSlot = 'left' | 'right';

export type WorldDrop = {
  id: string;
  kind: 'coin' | 'item';
  x: number;
  y: number;
  born: number;
  amount?: number;
  itemId?: string;
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
  shield: number;
  shieldExpiresAt: number;
  stiffness: number;
  knockbackMotion?: KnockbackMotion;
  statusEffects: StatusEffectInstance[];
};

export type KnockbackMotion = {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  startedAt: number;
  endsAt: number;
};

export type Projectile = {
  id: number;
  owner: 'player' | 'enemy';
  sourceClanId: AdventureClanId;
  weaponInstanceId: string;
  sourceId?: string;
  hand: HandSlot;
  x: number;
  y: number;
  vx: number;
  vy: number;
  remainingDistance: number;
  maxTravelDistance: number;
  radius: number;
  damage: number;
  knockback: number;
  penetrationRemaining: number;
  ricochetRemaining: number;
  hitTargetIds: string[];
  inflictions: StatusEffectApplication[];
  behaviors: CombatBehaviorInstance[];
  glyph: string;
  color: string;
  effectGlyph: string;
  effectSize?: number;
  hitAudioCue?: AdventureAudioCue;
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

export type CombatTarget = Exclude<CombatTargetRef, { kind: 'player' } | { kind: 'wall' }>;

export type AdventurePlayerId = `player-${string}`;

export type AdventurePlayerState = {
  id: AdventurePlayerId;
  actor: Actor;
  character: AdventureCharacter;
  inventory: AdventureInventory;
  coins: number;
  skills: AdventureSkills;
  death?: AdventurePlayerDeath;
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
  scene: 'overworld' | 'dungeon' | 'town';
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
  town?: TownInstance;
  overworldReturn?: OverworldReturnState;
  player: Actor;
  character: AdventureCharacter;
  inventory: AdventureInventory;
  coins: number;
  death?: AdventurePlayerDeath;
  worldDrops: WorldDrop[];
  enemies: AdventureEnemy[];
  worldObjects: WorldObject[];
  projectiles: Projectile[];
  pendingAttacks: PendingCombatAttack[];
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

export type AdventurePlayerDeath = {
  diedAt: number;
  respawnReadyAt: number;
};

export { adventureWorld } from './world';

export const PLAYER_MOVE_SPEED = 250;
export const MULTIPLAYER_RESPAWN_DELAY_MS = 10_000;
const PLAYER_CLAN_ID: AdventureClanId = 'player';

const GENERATED_CHUNK_CACHE_LIMIT = 121;
const generatedChunkCache = new Map<string, AdventureChunk>();

export const createInitialAdventureState = (options: CreateAdventureStateOptions = {}): AdventureState => {
  const random = options.random ?? Math.random;
  const now = options.now ?? performance.now();
  const mapSeed = options.mapSeed ?? Math.floor(random() * 1_000_000_000);
  const localPlayerId = options.localPlayerId ?? INITIAL_PLAYER_ID;
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
      shield: 0,
      shieldExpiresAt: 0,
      stiffness: 10,
      statusEffects: [],
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
    death: undefined,
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
      },
      ...loadedChunks.flatMap((chunk) => chunk.enemies).filter((enemy) => enemy.id !== 'enemy-00'),
    ],
    worldObjects: generatedWorld.objects.map((object) => ({ ...object })),
    projectiles: [],
    pendingAttacks: [],
    effects: [],
    propParticles: [],
    skills: {
      points: INITIAL_PLAYER_SKILL_POINTS,
      unlockedIds: [...INITIAL_UNLOCKED_SKILLS],
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
    .filter(isChunkInsideAdventureWorld)
    .map((coordinate) => getGeneratedAdventureChunk(mapSeed, coordinate, now));
}

export function getLocalAdventurePlayer(state: AdventureState): AdventurePlayerState {
  return state.players[state.localPlayerId] ?? {
    id: state.localPlayerId,
    actor: state.player,
    character: state.character,
    inventory: state.inventory,
    coins: state.coins,
    skills: state.skills,
    death: state.death,
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
    death: state.death,
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
    death: player.death,
    skills: player.skills,
    cooldownReadyAt: player.cooldownReadyAt,
    potionReadyAt: player.potionReadyAt,
    itemFlash: player.itemFlash,
    hotbarSlots: player.hotbarSlots,
    weaponFlash: player.weaponFlash,
    combatTarget: player.combatTarget,
  };
}

export function addAdventurePlayer(state: AdventureState, playerId: AdventurePlayerId, now: number): AdventureState {
  if (state.players[playerId]) return state;
  const local = getLocalAdventurePlayer(state);
  const offset = Object.keys(state.players).length * 72;
  const actor: Actor = {
    ...local.actor,
    id: playerId,
    name: `Player ${Object.keys(state.players).length + 1}`,
    x: state.player.x + offset,
    y: state.player.y + offset * 0.45,
    hp: 140,
    maxHp: 140,
    shield: 0,
    shieldExpiresAt: 0,
    stiffness: 10,
    statusEffects: [],
  };
  const player: AdventurePlayerState = {
    id: playerId,
    actor,
    character: { ...local.character },
    inventory: createInitialInventory(),
    coins: 0,
    death: undefined,
    skills: {
      points: INITIAL_PLAYER_SKILL_POINTS,
      unlockedIds: [...INITIAL_UNLOCKED_SKILLS],
      cooldownReadyAt: {},
      hasteUntil: 0,
    },
    cooldownReadyAt: { left: now, right: now },
    potionReadyAt: {},
    itemFlash: [],
    hotbarSlots: [{ kind: 'potion', itemNo: 201 }, undefined, undefined, undefined, undefined],
    weaponFlash: [],
  };
  return {
    ...state,
    players: {
      ...state.players,
      [playerId]: player,
    },
  };
}

export function removeAdventurePlayer(state: AdventureState, playerId: AdventurePlayerId): AdventureState {
  if (playerId === state.localPlayerId || !state.players[playerId]) return state;
  const { [playerId]: _removed, ...players } = state.players;
  return { ...state, players };
}

export function applyAdventureSnapshot(state: AdventureState, snapshot: AdventureState, localPlayerId: AdventurePlayerId): AdventureState {
  if (!snapshot.players[localPlayerId]) return state;
  const localActor = state.players[localPlayerId]?.actor ?? state.player;
  const players = localPlayerId === snapshot.hostPlayerId ? snapshot.players : {
    ...snapshot.players,
    [localPlayerId]: {
      ...snapshot.players[localPlayerId],
      actor: {
        ...snapshot.players[localPlayerId].actor,
        x: localActor.x,
        y: localActor.y,
        facing: localActor.facing,
      },
    },
  };
  const next = {
    ...snapshot,
    localPlayerId,
    players,
  };
  return useAdventurePlayerAsLocal(next, localPlayerId);
}

export function moveAdventureLocalPlayer(
  state: AdventureState,
  input: { moveX: number; moveY: number; aimX: number; aimY: number },
  deltaSeconds: number,
  now: number,
): AdventureState {
  if (state.death) return state;
  const skillModifiers = getPassiveSkillModifiers(state.skills.unlockedIds);
  const hasteBonus = now < state.skills.hasteUntil ? getActiveHasteBonus(state) : 0;
  const statusModifiers = getStatusModifiers(state.player.statusEffects);
  const speed = (PLAYER_MOVE_SPEED + (getOutfit(state.character.outfitId).speedBonus ?? 0) + skillModifiers.moveSpeed + hasteBonus)
    * skillModifiers.moveSpeedMultiplier
    * statusModifiers.movementSpeedMultiplier;
  return {
    ...state,
    player: movePlayer(
      state.player,
      state.worldObjects,
      movementToKeySet(input),
      { x: input.aimX, y: input.aimY },
      deltaSeconds,
      speed,
      state.dungeon?.walkable,
      state.scene === 'overworld' ? getAdventureWorldBounds() : undefined,
    ),
  };
}

export function applyAdventurePlayerPosition(
  state: AdventureState,
  playerId: AdventurePlayerId,
  position: { x: number; y: number; facing: Facing },
): AdventureState {
  const player = state.players[playerId];
  if (!player || playerId === state.localPlayerId) return state;
  return {
    ...state,
    players: {
      ...state.players,
      [playerId]: {
        ...player,
        actor: { ...player.actor, ...position },
      },
    },
  };
}

export function isPlayerDead(state: AdventureState) {
  return state.death !== undefined || state.player.hp <= 0;
}

function movementToKeySet(input: { moveX: number; moveY: number }) {
  const keys = new Set<string>();
  if (input.moveX < 0) keys.add('a');
  if (input.moveX > 0) keys.add('d');
  if (input.moveY < 0) keys.add('w');
  if (input.moveY > 0) keys.add('s');
  return keys;
}

function streamAdventureChunks(state: AdventureState, now: number): AdventureState {
  if (state.scene !== 'overworld') return state;
  const coordinates = getLoadedChunkCoordinates(getChunkCoordinate(state.player.x, state.player.y)).filter(isChunkInsideAdventureWorld);
  const desiredKeys = coordinates.map(getChunkKey);
  if (desiredKeys.length === state.loadedChunkKeys.length && desiredKeys.every((key) => state.loadedChunkKeys.includes(key))) return state;

  const chunkChanges = captureChunkChanges(state);
  const currentObjects = groupByChunk(state.worldObjects, (object) => object.chunkKey ?? getChunkKey(getChunkCoordinate(object.x, object.y)));
  const currentEnemies = groupByChunk(state.enemies, (enemy) => enemy.chunkKey ?? getChunkKey(getChunkCoordinate(enemy.spawnX, enemy.spawnY)));
  const currentDrops = groupByChunk(state.worldDrops, (drop) => getChunkKey(getChunkCoordinate(drop.x, drop.y)));
  const currentKeys = new Set(state.loadedChunkKeys);
  const loadedChunks = coordinates.map((coordinate) => {
    const generated = getGeneratedAdventureChunk(state.mapSeed, coordinate, now);
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

function getGeneratedAdventureChunk(mapSeed: number, coordinate: { x: number; y: number }, now: number) {
  const cacheKey = `${mapSeed}:${getChunkKey(coordinate)}`;
  const cached = generatedChunkCache.get(cacheKey);
  if (cached) {
    generatedChunkCache.delete(cacheKey);
    generatedChunkCache.set(cacheKey, cached);
    return cached;
  }

  const generated = generateAdventureChunk(mapSeed, coordinate, adventureWorld.spawn, now);
  generatedChunkCache.set(cacheKey, generated);
  while (generatedChunkCache.size > GENERATED_CHUNK_CACHE_LIMIT) {
    const oldestKey = generatedChunkCache.keys().next().value;
    if (oldestKey === undefined) break;
    generatedChunkCache.delete(oldestKey);
  }
  return generated;
}

function isChunkInsideAdventureWorld(coordinate: { x: number; y: number }) {
  const bounds = adventureWorld.chunkBounds;
  return coordinate.x >= bounds.minX
    && coordinate.x <= bounds.maxX
    && coordinate.y >= bounds.minY
    && coordinate.y <= bounds.maxY;
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
  if (state.death) return tickDeadAdventureState(state, now);
  const deltaSeconds = Math.min((now - state.lastTick) / 1000, GAME_SETTINGS.combat.maxTickDeltaSeconds);
  const skillModifiers = getPassiveSkillModifiers(state.skills.unlockedIds);
  const hasteBonus = now < state.skills.hasteUntil ? getActiveHasteBonus(state) : 0;
  const playerStatusModifiers = getStatusModifiers(state.player.statusEffects);
  const worldBounds = state.scene === 'overworld' ? getAdventureWorldBounds() : undefined;
  const shieldedPlayer = expireShield(state.player, now);
  let player = shieldedPlayer.knockbackMotion
    ? applyKnockbackMotion(shieldedPlayer, now)
    : movePlayer(
      shieldedPlayer,
      state.worldObjects,
      input.keys,
      input.aim,
      deltaSeconds,
      (PLAYER_MOVE_SPEED + (getOutfit(state.character.outfitId).speedBonus ?? 0) + skillModifiers.moveSpeed + hasteBonus)
        * skillModifiers.moveSpeedMultiplier
        * getFullHpStatMultiplier(shieldedPlayer, skillModifiers)
        * playerStatusModifiers.movementSpeedMultiplier,
      state.dungeon?.walkable,
      worldBounds,
    );
  let enemies = state.enemies.map((enemy) => ({ ...enemy }));
  let worldObjects = state.worldObjects;
  let worldDrops = state.worldDrops;
  let inventory = state.inventory;
  let coins = state.coins;
  const effects = state.effects.filter((effect) => now - effect.born < getEffectLife(effect));
  let propParticles = state.propParticles.filter((particle) => now - particle.born < particle.life);
  const spawnedProjectiles: Projectile[] = [];
  let pendingAttacks = state.pendingAttacks.filter((attack) => attack.kind === 'melee-area'
    ? now < attack.releasesAt
    : now < attack.endsAt);
  let nextEntityId = state.nextEntityId;
  let combatTarget = state.combatTarget;

  const playerStatusTick = tickStatusEffects(player, now);
  player = playerStatusTick.target;
  if (skillModifiers.hpRegenPerSecond > 0 && player.hp < player.maxHp) {
    const regenerated = Math.min(skillModifiers.hpRegenPerSecond * deltaSeconds, player.maxHp - player.hp);
    player = { ...player, hp: player.hp + regenerated };
  }
  for (const event of playerStatusTick.events) {
    effects.push(makeStatusTickEffect(nextEntityId, player.x, player.y, event, effects, now));
    nextEntityId += 1;
  }

  const enemyMeleeImpacts: Array<{ source: AdventureEnemy; target: AdventureEnemy }> = [];
  enemies = enemies.map((enemy) => {
    if (enemy.hp <= 0) return enemy;
    const tick = tickStatusEffects(enemy, now);
    const nextEnemy = enemy.invulnerable && tick.target.hp <= 0 ? { ...tick.target, hp: tick.target.maxHp } : tick.target;
    for (const event of tick.events) {
      effects.push(makeStatusTickEffect(nextEntityId, enemy.x, enemy.y, event, effects, now));
      nextEntityId += 1;
    }
    if (!enemy.invulnerable && enemy.hp > 0 && nextEnemy.hp <= 0) {
      effects.push(makeEnemyDeathEffect(nextEntityId, enemy, now));
      nextEntityId += 1;
      const spawned = makeWorldDrops(nextEntityId, enemy.x, enemy.y, enemy.loot, now);
      worldDrops = [...worldDrops, ...spawned];
      nextEntityId += spawned.length;
    }
    return nextEnemy;
  });

  enemies = enemies.map((enemy) => {
    if (enemy.hp <= 0 || getEnemyChaseRadius(enemy) <= 0) return enemy;
    const movedEnemy = enemy.knockbackMotion ? applyKnockbackMotion(enemy, now) : enemy;
    const sliding = movedEnemy.knockbackMotion !== undefined;
    const distance = Math.hypot(player.x - movedEnemy.x, player.y - movedEnemy.y);
    const statusModifiers = getStatusModifiers(enemy.statusEffects);
    const effectiveSpeed = enemy.speed * statusModifiers.movementSpeedMultiplier;
    const distanceFromSpawnToPlayer = Math.hypot(player.x - movedEnemy.spawnX, player.y - movedEnemy.spawnY);
    const shouldAlert = enemy.alerted || distance <= getEnemyAlertRadius(enemy);
    if (!shouldAlert || distanceFromSpawnToPlayer > getEnemyChaseRadius(enemy)) {
      return sliding
        ? { ...movedEnemy, alerted: false, alertedAt: undefined }
        : { ...returnEnemyToSpawn(movedEnemy, state.worldObjects, deltaSeconds, state.dungeon?.walkable, effectiveSpeed), alerted: false, alertedAt: undefined };
    }
    const facing = player.x < movedEnemy.x ? 'left' : 'right';
    if (distance > enemy.attackRange + player.radius) {
      return sliding
        ? { ...movedEnemy, facing, alerted: true, alertedAt: enemy.alertedAt ?? now }
        : { ...moveEnemyToward(movedEnemy, player, state.worldObjects, deltaSeconds, state.dungeon?.walkable, effectiveSpeed), facing, alerted: true, alertedAt: enemy.alertedAt ?? now };
    }
    if (now < enemy.attackReadyAt) return { ...movedEnemy, facing };
    if (enemy.attackKind === 'ranged' && enemy.projectile) {
      spawnedProjectiles.push(makeRuntimeEnemyProjectile(nextEntityId, movedEnemy, player));
      nextEntityId += 1;
    } else {
      effects.push(makeEnemyAttackEffect(nextEntityId, movedEnemy, player, now));
      nextEntityId += 1;
      const attackDirection = normalizedVector(movedEnemy, player);
      const attackCenter = {
        x: movedEnemy.x + attackDirection.x * Math.min(enemy.attackRange, Math.max(34, distance)),
        y: movedEnemy.y + attackDirection.y * Math.min(enemy.attackRange, Math.max(34, distance)),
      };
      if (areClansHostile({ id: movedEnemy.id, clanId: movedEnemy.clanId }, { id: state.player.id, clanId: PLAYER_CLAN_ID })) {
        const result = applyCombatTargetDamage({
          target: { kind: 'player', id: player.id },
          damage: enemy.attack,
          knockbackSource: movedEnemy,
          knockbackAmount: enemy.knockback,
          now,
          walkable: state.dungeon?.walkable,
          worldBounds,
        }, { enemies, player, worldObjects, worldDrops, propParticles, effects, nextEntityId, playerDamageReduction: skillModifiers.damageReduction });
        player = result.player;
        nextEntityId = result.nextEntityId;
        combatTarget = { kind: 'enemy', id: enemy.id };
      }
      const enemyMeleeRadius = Math.max(34, enemy.projectileRadius || enemy.radius * 0.85);
      for (const target of enemies) {
        if (target.hp <= 0 || !areClansHostile({ id: movedEnemy.id, clanId: movedEnemy.clanId }, { id: target.id, clanId: target.clanId })) continue;
        if (Math.hypot(target.x - attackCenter.x, target.y - attackCenter.y) > enemyMeleeRadius + target.radius) continue;
        enemyMeleeImpacts.push({ source: movedEnemy, target });
      }
      const objectHits = worldObjects.filter((object) => object.hp !== undefined && object.hp > 0 && circleIntersectsObject(attackCenter.x, attackCenter.y, enemyMeleeRadius, object));
      for (const object of objectHits) {
        const result = applyCombatTargetDamage({
          target: { kind: 'prop', id: object.id },
          damage: enemy.attack,
          now,
          walkable: state.dungeon?.walkable,
          worldBounds,
        }, {
          enemies,
          player,
          worldObjects,
          worldDrops,
          propParticles,
          effects,
          nextEntityId,
        });
        worldObjects = result.worldObjects;
        worldDrops = result.worldDrops;
        propParticles = result.propParticles;
        nextEntityId = result.nextEntityId;
      }
    }
    return { ...movedEnemy, facing, alerted: true, alertedAt: enemy.alertedAt ?? now, attackReadyAt: now + 1000 / (enemy.attackSpeed * statusModifiers.attackSpeedMultiplier) };
  });

  for (const impact of enemyMeleeImpacts) {
    const result = applyCombatTargetDamage({
      target: { kind: 'enemy', id: impact.target.id },
      damage: impact.source.attack,
      knockbackSource: impact.source,
      knockbackAmount: impact.source.knockback,
      now,
      walkable: state.dungeon?.walkable,
      worldBounds,
    }, {
      enemies,
      player,
      worldObjects,
      worldDrops,
      propParticles,
      effects,
          nextEntityId,
    });
    enemies = result.enemies;
    worldDrops = result.worldDrops;
    nextEntityId = result.nextEntityId;
  }

  for (const object of worldObjects) {
    if (object.family !== 'prop-sm' && object.family !== 'flowerbed') continue;
    const triggerRadius = player.radius + Math.max(object.width, object.height) * 0.5;
    const inside = Math.hypot(player.x - object.x, player.y - object.y) <= triggerRadius;
    if (inside !== Boolean(object.playerInside)) {
      worldObjects = worldObjects.map((candidate) => candidate.id === object.id ? { ...candidate, playerInside: inside } : candidate);
    }
    if (inside && !object.playerInside) {
      const particles = makePropParticles(nextEntityId, object, now, 'petal', object.family === 'flowerbed' ? 9 : 5);
      propParticles = [...propParticles, ...particles];
      nextEntityId += particles.length;
    }
  }

  const combatResult = tickCombatRuntime({
    enemies,
    player,
    playerClanId: PLAYER_CLAN_ID,
    worldObjects,
    worldDrops,
    propParticles,
    projectiles: state.projectiles,
    pendingAttacks: state.pendingAttacks,
    effects,
    combatTarget,
      nextEntityId,
      playerDamageReduction: skillModifiers.damageReduction,
    now,
    deltaSeconds,
    walkable: state.dungeon?.walkable,
    worldBounds,
    getWeapon: (weaponInstanceId) => getEffectiveWeapon(state, weaponInstanceId),
  });
  enemies = combatResult.enemies;
  player = combatResult.player;
  worldObjects = combatResult.worldObjects;
  worldDrops = combatResult.worldDrops;
  propParticles = combatResult.propParticles;
  pendingAttacks = combatResult.pendingAttacks;
  nextEntityId = combatResult.nextEntityId;
  combatTarget = combatResult.combatTarget;
  const projectiles = [...spawnedProjectiles, ...combatResult.projectiles];

  const collected = collectWorldDrops(worldDrops, player, inventory, coins, now);

  const nextState = finalizePlayerDeath({
    ...state,
    player,
    inventory: collected.inventory,
    coins: collected.coins,
    enemies,
    worldObjects,
    worldDrops: collected.worldDrops,
    projectiles,
    pendingAttacks,
    effects,
    propParticles,
    itemFlash: state.itemFlash.filter((flash) => now - flash.born < 420),
    weaponFlash: state.weaponFlash.filter((flash) => now - flash.born < 420),
    lastTick: now,
    simulationTick: state.simulationTick + 1,
    nextEntityId,
    combatTarget,
    dungeon: state.dungeon ? { ...state.dungeon, enemies, objects: worldObjects } : undefined,
    town: state.town ? { ...state.town, objects: worldObjects } : undefined,
  }, now);
  return state.scene === 'overworld' ? streamAdventureChunks(nextState, now) : nextState;
}

export function interactWithAdventure(state: AdventureState, now: number): AdventureState {
  if (state.death) return state;
  if (state.scene === 'overworld') {
    const location = getNearbyLocation(state);
    if (!location) return state;
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
    if (location.kind === 'town') {
      const town = createTownInstance(location.townId);
      return {
        ...state,
        scene: 'town',
        town,
        dungeon: undefined,
        overworldReturn,
        biomeTiles: [],
        worldAreas: [],
        worldLocations: [],
        worldDrops: [],
        enemies: [],
        worldObjects: town.objects,
        projectiles: [],
        pendingAttacks: [],
        effects: [],
        propParticles: [],
        player: { ...state.player, ...town.spawn },
        combatTarget: undefined,
        lastTick: now,
      };
    }
    const rank = getAdventureRankAtWorldPosition(location);
    const dungeon = generateDungeon(location.dungeonId, location.id, state.mapSeed, now, rank, 1);
    return {
      ...state,
      scene: 'dungeon',
      dungeon,
      town: undefined,
      overworldReturn,
      biomeTiles: [],
      worldAreas: [],
      worldLocations: [],
      worldDrops: [],
      enemies: dungeon.enemies,
      worldObjects: dungeon.objects,
      projectiles: [],
      pendingAttacks: [],
      effects: [],
      propParticles: [],
      player: { ...state.player, ...dungeon.spawn },
      combatTarget: undefined,
      lastTick: now,
    };
  }

  if (state.scene === 'town') {
    if (!state.town || !state.overworldReturn || !isNearTownExit(state)) return state;
    return {
      ...state,
      scene: 'overworld',
      town: undefined,
      dungeon: undefined,
      overworldReturn: undefined,
      ...state.overworldReturn,
      projectiles: [],
      pendingAttacks: [],
      effects: [],
      propParticles: [],
      lastTick: now,
    };
  }

  if (!state.dungeon || !state.overworldReturn) return state;
  if (isDungeonExitAvailable(state) && Math.hypot(state.player.x - state.dungeon.exit.x, state.player.y - state.dungeon.exit.y) <= 95) {
    return {
      ...state,
      scene: 'overworld',
      dungeon: undefined,
      town: undefined,
      overworldReturn: undefined,
      ...state.overworldReturn,
      projectiles: [],
      pendingAttacks: [],
      effects: [],
      propParticles: [],
      lastTick: now,
    };
  }

  if (state.dungeon.stairs && Math.hypot(state.player.x - state.dungeon.stairs.x, state.player.y - state.dungeon.stairs.y) <= 95) {
    const dungeon = generateDungeon(state.dungeon.definitionId, state.dungeon.entranceId, state.mapSeed, now, state.dungeon.rank, state.dungeon.stairs.targetDepth);
    return {
      ...state,
      dungeon,
      enemies: dungeon.enemies,
      worldObjects: dungeon.objects,
      worldDrops: [],
      projectiles: [],
      pendingAttacks: [],
      effects: [],
      propParticles: [],
      player: { ...state.player, ...dungeon.spawn },
      combatTarget: undefined,
      lastTick: now,
    };
  }

  const chest = state.dungeon.chests.find((candidate) => isDungeonChestAvailable(state, candidate) && !candidate.opened && Math.hypot(state.player.x - candidate.x, state.player.y - candidate.y) <= 92);
  if (!chest) return state;
  const definition = getDungeonDefinition(state.dungeon.definitionId);
  const rank = state.dungeon.rank;
  const rolls = randomRange(scaleDungeonChestRollRangeForRank(definition.chestRolls, rank), hashRuntimeId(chest.id));
  const chestLoot = scaleLootTableForRank(definition.chestLoot, rank) ?? definition.chestLoot;
  let nextEntityId = state.nextEntityId;
  const worldDrops = [...state.worldDrops];
  for (let index = 0; index < rolls; index += 1) {
    const angle = Math.PI * 2 * index / Math.max(1, rolls) - Math.PI / 2;
    const distance = 72 + (index % 2) * 26;
    const random = makeDeterministicRandom(hashRuntimeId(chest.id) + index * 97);
    const spawned = makeChestRollDrops(nextEntityId, chest.x + Math.cos(angle) * distance, chest.y + Math.sin(angle) * distance, chestLoot, now + index * 90, random);
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
  if (state.scene === 'town') {
    if (isNearTownExit(state)) return '[E] Exit';
    return getNearbyTownNpc(state) ? '[E] Interact' : undefined;
  }
  if (!state.dungeon) return undefined;
  if (isDungeonExitAvailable(state) && Math.hypot(state.player.x - state.dungeon.exit.x, state.player.y - state.dungeon.exit.y) <= 95) return '[E] Exit';
  if (state.dungeon.stairs && Math.hypot(state.player.x - state.dungeon.stairs.x, state.player.y - state.dungeon.stairs.y) <= 95) return '[E] Descend';
  const chest = state.dungeon.chests.find((candidate) => isDungeonChestAvailable(state, candidate) && !candidate.opened && Math.hypot(state.player.x - candidate.x, state.player.y - candidate.y) <= 92);
  return chest ? '[E] Open' : undefined;
}

function isDungeonBossDefeated(state: AdventureState) {
  const bossId = state.dungeon?.bossEnemyId;
  if (!bossId) return true;
  return !state.enemies.some((enemy) => enemy.id === bossId && enemy.hp > 0);
}

function isDungeonExitAvailable(state: AdventureState) {
  if (!state.dungeon) return false;
  return state.dungeon.depth < state.dungeon.totalDepth || isDungeonBossDefeated(state);
}

function isDungeonChestAvailable(state: AdventureState, chest: { requiresBossDefeat?: boolean }) {
  return !chest.requiresBossDefeat || isDungeonBossDefeated(state);
}

export function debugTeleportPlayer(state: AdventureState, x: number, y: number): AdventureState {
  return { ...state, player: { ...state.player, x, y } };
}

export function buyAdventureShopItem(state: AdventureState, shopId: ShopId, stockId: ShopStockId, quantity: number): AdventureState {
  if (state.death || state.scene !== 'town') return state;
  return buyShopItem(state, shopId, stockId, quantity);
}

export function sellAdventureShopItem(state: AdventureState, shopId: ShopId, kind: 'weapon' | 'trait' | 'potion', itemNo: number, quantity: number): AdventureState {
  if (state.death || state.scene !== 'town') return state;
  return sellInventoryItem(state, shopId, kind, itemNo, quantity);
}

function getNearbyLocation(state: AdventureState) {
  return state.worldLocations.find((location) => Math.hypot(state.player.x - location.x, state.player.y - location.y) <= location.radius + 70);
}

export function activateWeapon(state: AdventureState, hand: HandSlot, aim: { x: number; y: number }, now: number): AdventureState {
  if (state.death || state.player.hp <= 0) return state;
  if (now < state.cooldownReadyAt[hand]) return state;
  const weapon = getEquippedWeapon(state, hand);
  if (!weapon) return state;
  const worldBounds = state.scene === 'overworld' ? getAdventureWorldBounds() : undefined;
  const skillModifiers = getPassiveSkillModifiers(state.skills.unlockedIds);
  const cooldownMs = 1000 / (weapon.attackSpeed * getStatusModifiers(state.player.statusEffects).attackSpeedMultiplier * getFullHpStatMultiplier(state.player, skillModifiers));
  const nextReady = { ...state.cooldownReadyAt, [hand]: now + cooldownMs };
  const weaponFlash = [...state.weaponFlash.filter((flash) => flash.hand !== hand), { hand, born: now }];

  if (weapon.kind === 'melee') {
    const effectiveWeapon = { ...weapon, range: weapon.range * skillModifiers.rangeMultiplier };
    const hitCenter = getMeleeHitCenter(state.player, aim, effectiveWeapon);
    const outfit = getOutfit(state.character.outfitId);
    const skillDamageMultiplier = getSkillDamageMultiplier(state.player, skillModifiers);
    const skillAttackBonus = skillModifiers.attack + state.player.maxHp * skillModifiers.maxHpDamageRatio;
    const attackWeapon = { ...weapon, damage: Math.ceil((weapon.damage + (outfit.damageBonus ?? 0) + skillAttackBonus) * skillDamageMultiplier) };
    const behaviors = makeMeleeBehaviorInstancesFromWeapon(attackWeapon, attackWeapon.damage);
    const skillLifeDrain = getSkillLifeDrain(state.player, skillModifiers);
    if (skillLifeDrain > 0) behaviors.push(makeBehaviorInstance('behavior-008', 'skill-passive-life-drain', { ratio: skillLifeDrain }));
    const result = resolveRuntimeMeleeAttack({
      id: state.nextEntityId,
      source: { id: state.player.id, clanId: PLAYER_CLAN_ID, x: state.player.x, y: state.player.y },
      hitCenter,
      radius: effectiveWeapon.radius,
      damage: attackWeapon.damage,
      knockback: weapon.knockback,
      inflictions: getStatusInflictionsFromBehaviors(behaviors),
      behaviors,
      effectWeapon: weapon,
    }, state.enemies, state.player, state.worldObjects, state.worldDrops, state.propParticles, state.pendingAttacks, [...state.effects], state.nextEntityId, now, state.dungeon?.walkable, worldBounds);
    return {
      ...state,
      player: result.player,
      enemies: result.enemies,
      worldObjects: result.worldObjects,
      pendingAttacks: result.pendingAttacks,
      cooldownReadyAt: nextReady,
      weaponFlash,
      effects: result.effects,
      propParticles: result.propParticles,
      worldDrops: result.worldDrops,
      nextEntityId: result.nextEntityId,
      combatTarget: result.combatTarget ?? state.combatTarget,
    };
  }

  const origin = getHandPosition(state.player, state.character.pillWidth, hand);
  const direction = normalizedVector(origin, aim);
  const skillDamageMultiplier = getSkillDamageMultiplier(state.player, skillModifiers);
  const skillAttackBonus = skillModifiers.attack + state.player.maxHp * skillModifiers.maxHpDamageRatio;
  const projectiles = makeRuntimeProjectiles(
    state.nextEntityId,
    { ...weapon, range: weapon.range * skillModifiers.rangeMultiplier, damage: Math.ceil((weapon.damage + (getOutfit(state.character.outfitId).damageBonus ?? 0) + skillAttackBonus) * skillDamageMultiplier) },
    hand,
    origin,
    direction,
    { id: state.player.id, clanId: PLAYER_CLAN_ID },
    now,
    getSkillLifeDrain(state.player, skillModifiers) > 0 ? [makeBehaviorInstance('behavior-008', 'skill-passive-life-drain', { ratio: getSkillLifeDrain(state.player, skillModifiers) })] : [],
  );

  return {
    ...state,
    cooldownReadyAt: nextReady,
    weaponFlash,
    projectiles: [...state.projectiles, ...projectiles],
    nextEntityId: state.nextEntityId + projectiles.length,
  };
}

export function dropLootAtPlayer(state: AdventureState, itemId: string, now: number): AdventureState {
  if (state.death) return state;
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
  if (state.death) return state;
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

export function useAdventurePotionByItemNo(state: AdventureState, itemNo: number, now: number): AdventureState {
  const next = usePotionByItemNo(state, itemNo, now);
  if (next === state) return state;
  const healed = Math.max(0, next.player.hp - state.player.hp);
  if (healed <= 0) return next;
  return {
    ...next,
    effects: [...next.effects, makeHealEffect(next.nextEntityId, next.player.x, next.player.y, healed, getQueuedTextEffectBorn(next.effects, next.player.x, next.player.y, now, 'heal'))],
    nextEntityId: next.nextEntityId + 1,
  };
}

function getDebugDropPosition(player: Actor) {
  const distance = player.radius + 82;
  return {
    x: player.x + (player.facing === 'left' ? -distance : distance),
    y: player.y + 8,
  };
}

export function useHotbarSlot(state: AdventureState, slot: number, aim: { x: number; y: number }, now: number): AdventureState {
  if (state.death || state.player.hp <= 0) return flashItemSlot(state, slot, now);
  const entry = state.hotbarSlots[slot - 1];
  if (!entry) return flashItemSlot(state, slot, now);
  if (entry.kind === 'skill') {
    const next = activateSkill(state, entry.skillId, aim, now);
    return next === state ? state : flashItemSlot(next, slot, now);
  }
  const next = useAdventurePotionByItemNo(state, entry.itemNo, now);
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

export function activateSkill(state: AdventureState, skillId: string, aim: { x: number; y: number }, now: number): AdventureState {
  if (state.death || state.player.hp <= 0) return state;
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
    const player = blinkPlayer(
      state.player,
      aim,
      state.worldObjects,
      effect.distance,
      state.dungeon?.walkable,
      state.scene === 'overworld' ? getAdventureWorldBounds() : undefined,
    );
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

export function respawnAdventurePlayer(state: AdventureState, now: number): AdventureState {
  if (!state.death || now < state.death.respawnReadyAt) return state;
  return {
    ...state,
    scene: 'overworld',
    dungeon: undefined,
    overworldReturn: undefined,
    player: {
      ...state.player,
      x: adventureWorld.spawn.x,
      y: adventureWorld.spawn.y,
      hp: state.player.maxHp,
      shield: 0,
      shieldExpiresAt: 0,
      statusEffects: [],
      knockbackMotion: undefined,
    },
    death: undefined,
    projectiles: [],
    pendingAttacks: [],
    propParticles: [],
    combatTarget: undefined,
    lastTick: now,
    ...(state.overworldReturn ? {
      loadedChunks: state.overworldReturn.loadedChunks,
      loadedChunkKeys: state.overworldReturn.loadedChunkKeys,
      chunkChanges: state.overworldReturn.chunkChanges,
      biomeTiles: state.overworldReturn.biomeTiles,
      worldAreas: state.overworldReturn.worldAreas,
      worldLocations: state.overworldReturn.worldLocations,
      worldDrops: state.overworldReturn.worldDrops,
      enemies: state.overworldReturn.enemies,
      worldObjects: state.overworldReturn.worldObjects,
    } : {}),
  };
}

function tickDeadAdventureState(state: AdventureState, now: number): AdventureState {
  return {
    ...state,
    player: { ...state.player, hp: 0 },
    effects: state.effects.filter((effect) => now - effect.born < getEffectLife(effect)),
    propParticles: state.propParticles.filter((particle) => now - particle.born < particle.life),
    itemFlash: state.itemFlash.filter((flash) => now - flash.born < 420),
    weaponFlash: state.weaponFlash.filter((flash) => now - flash.born < 420),
    projectiles: [],
    pendingAttacks: [],
    lastTick: now,
    simulationTick: state.simulationTick + 1,
  };
}

function finalizePlayerDeath(state: AdventureState, now: number): AdventureState {
  if (state.death || state.player.hp > 0) return state;
  const death: AdventurePlayerDeath = {
    diedAt: now,
    respawnReadyAt: now,
  };
  return {
    ...state,
    player: {
      ...state.player,
      hp: 0,
      shield: 0,
      shieldExpiresAt: 0,
    },
    death,
    projectiles: [],
    pendingAttacks: [],
    effects: [...state.effects, makePlayerDeathEffect(state.nextEntityId, state, now)],
    nextEntityId: state.nextEntityId + 1,
  };
}

export function flashItemSlot(state: AdventureState, slot: number, now: number): AdventureState {
  return {
    ...state,
    itemFlash: [...state.itemFlash.filter((flash) => flash.slot !== slot), { slot, born: now }],
  };
}

function blinkPlayer(
  player: Actor,
  aim: { x: number; y: number },
  worldObjects: WorldObject[],
  distance: number,
  walkable?: DungeonRect[],
  worldBounds?: AdventureWorldBounds,
): Actor {
  const direction = normalizedVector(player, aim);
  const requestedDistance = Math.min(distance, Math.hypot(aim.x - player.x, aim.y - player.y));
  const blockers = worldObjects.filter((object) => object.blocking && object.hp !== 0);
  let result = player;
  const steps = Math.max(1, Math.ceil(requestedDistance / 12));
  for (let step = 1; step <= steps; step += 1) {
    const traveled = requestedDistance * step / steps;
    const x = player.x + direction.x * traveled;
    const y = player.y + direction.y * traveled;
    if (
      blockers.some((object) => circleIntersectsObject(x, y, player.radius, object))
      || !isInsideWalkableArea(x, y, player.radius, walkable)
      || !isInsideWorld(x, y, worldBounds, player.radius)
    ) break;
    result = { ...player, x, y, facing: direction.x < 0 ? 'left' : 'right' };
  }
  return result;
}

function movePlayer(
  player: Actor,
  worldObjects: WorldObject[],
  keys: Set<string>,
  aim: { x: number; y: number },
  deltaSeconds: number,
  speed: number,
  walkable?: DungeonRect[],
  worldBounds?: AdventureWorldBounds,
): Actor {
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
  const x = activeBlockers.some((object) => circleIntersectsObject(targetX, player.y, player.radius, object))
    || !isInsideWalkableArea(targetX, player.y, player.radius, walkable)
    || !isInsideWorld(targetX, player.y, worldBounds, player.radius)
    ? player.x
    : targetX;
  const y = activeBlockers.some((object) => circleIntersectsObject(x, targetY, player.radius, object))
    || !isInsideWalkableArea(x, targetY, player.radius, walkable)
    || !isInsideWorld(x, targetY, worldBounds, player.radius)
    ? player.y
    : targetY;
  return { ...player, x, y, facing: aim.x < player.x ? 'left' : 'right' };
}

function moveEnemyToward(enemy: AdventureEnemy, target: { x: number; y: number }, objects: WorldObject[], deltaSeconds: number, walkable?: DungeonRect[], speed = enemy.speed) {
  const dx = target.x - enemy.x;
  const dy = target.y - enemy.y;
  const length = Math.hypot(dx, dy) || 1;
  return moveEnemy(enemy, enemy.x + dx / length * speed * deltaSeconds, enemy.y + dy / length * speed * deltaSeconds, objects, walkable);
}

function returnEnemyToSpawn(enemy: AdventureEnemy, objects: WorldObject[], deltaSeconds: number, walkable?: DungeonRect[], speed = enemy.speed) {
  if (Math.hypot(enemy.x - enemy.spawnX, enemy.y - enemy.spawnY) < 8) return enemy;
  return moveEnemyToward(enemy, { x: enemy.spawnX, y: enemy.spawnY }, objects, deltaSeconds, walkable, speed);
}

function moveEnemy(enemy: AdventureEnemy, targetX: number, targetY: number, objects: WorldObject[], walkable?: DungeonRect[]) {
  const blockers = objects.filter((object) => object.blocking && object.hp !== 0);
  const x = blockers.some((object) => circleIntersectsObject(targetX, enemy.y, enemy.radius, object)) || !isInsideWalkableArea(targetX, enemy.y, enemy.radius, walkable) ? enemy.x : targetX;
  const y = blockers.some((object) => circleIntersectsObject(x, targetY, enemy.radius, object)) || !isInsideWalkableArea(x, targetY, enemy.radius, walkable) ? enemy.y : targetY;
  return { ...enemy, x, y };
}

function getEnemyAlertRadius(enemy: AdventureEnemy) {
  return enemy.alertRadius ?? Math.min(enemy.aggroRadius, 260);
}

function getEnemyChaseRadius(enemy: AdventureEnemy) {
  return enemy.chaseRadius ?? enemy.aggroRadius;
}

function getMeleeHitCenter(player: Actor, aim: { x: number; y: number }, weapon: WeaponDefinition) {
  const direction = normalizedVector(player, aim);
  const distance = Math.min(weapon.range, Math.max(36, Math.hypot(aim.x - player.x, aim.y - player.y)));
  return {
    x: player.x + direction.x * distance,
    y: player.y + direction.y * distance,
  };
}

function getSkillDamageMultiplier(player: Actor, modifiers: ReturnType<typeof getPassiveSkillModifiers>) {
  const hpRatio = player.maxHp > 0 ? player.hp / player.maxHp : 1;
  return modifiers.damageMultiplier
    * getFullHpStatMultiplier(player, modifiers)
    * (hpRatio < 0.5 ? modifiers.lowHpDamageMultiplier : modifiers.highHpDamageMultiplier);
}

function getSkillLifeDrain(player: Actor, modifiers: ReturnType<typeof getPassiveSkillModifiers>) {
  if (modifiers.lowHpLifeDrainMax <= 0) return modifiers.lifeDrain;
  const hpRatio = player.maxHp > 0 ? Math.max(0.01, player.hp / player.maxHp) : 1;
  const missingRatio = 1 - hpRatio;
  return modifiers.lifeDrain + modifiers.lowHpLifeDrainMax * missingRatio;
}

function getFullHpStatMultiplier(player: Actor, modifiers: ReturnType<typeof getPassiveSkillModifiers>) {
  return player.hp >= player.maxHp ? modifiers.fullHpStatMultiplier : 1;
}

function getHandPosition(player: Actor, pillWidth: number, hand: HandSlot) {
  const localX = (hand === 'left' ? -1 : 1) * (pillWidth / 2 + 16);
  return {
    x: player.x + (player.facing === 'left' ? -localX : localX),
    y: player.y,
  };
}

function createInitialInventory(): AdventureInventory {
  return {
    weapons: INITIAL_WEAPON_LOADOUT.map((weapon) => ({ ...weapon, traitIds: [...weapon.traitIds] })),
    traits: INITIAL_TRAIT_LOADOUT.map((trait) => ({ ...trait })),
    potions: INITIAL_POTION_LOADOUT.map((potion) => makePotionStack(potion.itemId, potion.itemNo, potion.count)),
    materials: [],
  };
}

function makePotionStack(itemId: string, itemNo: number, count: number): PotionStack {
  const item = getAdventureItem(itemId);
  if (item.kind !== 'potion') throw new Error(`Adventure item is not a potion: ${itemId}`);
  return { itemNo, itemId, name: item.name, icon: item.icon, iconSprite: item.iconSprite, rank: item.rank, count, heal: item.heal, cooldownMs: item.cooldownMs };
}

function makeMaterialStack(itemId: string, itemNo: number, count: number): MaterialStack {
  const item = getAdventureItem(itemId);
  const category = item.kind === 'material' ? item.category : 'mineral';
  return { itemNo, itemId, name: item.name, icon: item.icon, iconSprite: item.iconSprite, rank: item.rank, count, category };
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
    const item = getAdventureItem(drop.itemId);
    if (item.kind === 'potion') {
      const existing = nextInventory.potions.find((stack) => stack.itemId === drop.itemId);
      const potions = existing
        ? nextInventory.potions.map((stack) => stack.itemId === drop.itemId ? { ...stack, count: stack.count + 1 } : stack)
        : [...nextInventory.potions, makePotionStack(drop.itemId, Math.max(200, ...nextInventory.potions.map((stack) => stack.itemNo)) + 1, 1)];
      nextInventory = { ...nextInventory, potions };
      continue;
    }
    const existing = nextInventory.materials.find((stack) => stack.itemId === drop.itemId);
    const materials = existing
      ? nextInventory.materials.map((stack) => stack.itemId === drop.itemId ? { ...stack, count: stack.count + 1 } : stack)
      : [...nextInventory.materials, makeMaterialStack(drop.itemId, Math.max(300, ...nextInventory.materials.map((stack) => stack.itemNo)) + 1, 1)];
    nextInventory = { ...nextInventory, materials };
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

