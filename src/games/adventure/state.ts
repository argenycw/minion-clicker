import { GAME_SETTINGS } from '../../shared/settings';
import { getClosestBorderPoint } from '../../shared/combatPresentation';
import type { WeaponDefinition } from './content';
import type { AdventureAudioCue } from './audio/types';
import { getWeaponAudio } from './weapons/definitions';
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
import { applyStatusEffect, getStatusModifiers, tickStatusEffects } from './status-effects/system';
import type { StatusEffectApplication, StatusEffectInstance, StatusTickEvent } from './status-effects/types';

export type { AdventureCharacter } from './character/types';
export type { AdventureInventory, EffectiveWeapon, MaterialStack, PotionStack, TraitStack, WeaponInstance } from './inventory/types';
export type { AdventureSkills } from './skills/types';
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
  radius: number;
  damage: number;
  knockback: number;
  lifeDrain: number;
  shield: number;
  inflictions: StatusEffectApplication[];
  glyph: string;
  color: string;
  effectGlyph: string;
  effectSize?: number;
  hitAudioCue?: AdventureAudioCue;
};

export type CombatEffect = {
  id: number;
  kind: 'hit' | 'damage' | 'heal' | 'death' | 'audio';
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
  audioCue?: AdventureAudioCue;
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

type AdventureWorldBounds = ReturnType<typeof getAdventureWorldBounds>;

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

function areClansHostile(
  source: { id: string; clanId: AdventureClanId },
  target: { id: string; clanId: AdventureClanId },
) {
  if (source.id === target.id) return false;
  if (source.clanId === 'neutral' || target.clanId === 'neutral') return true;
  return source.clanId !== target.clanId;
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
  const projectiles: Projectile[] = [];
  let nextEntityId = state.nextEntityId;
  let combatTarget = state.combatTarget;

  const playerStatusTick = tickStatusEffects(player, now);
  player = playerStatusTick.target;
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
      projectiles.push(makeEnemyProjectile(nextEntityId, movedEnemy, player));
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
        player = knockbackActor(damageActor(player, enemy.attack, now), movedEnemy, enemy.knockback, worldObjects, now, state.dungeon?.walkable, worldBounds);
        combatTarget = { kind: 'enemy', id: enemy.id };
        effects.push(makeDamageEffect(nextEntityId, player.x, player.y, enemy.attack, getQueuedDamageBorn(effects, player.x, player.y, now)));
        nextEntityId += 1;
      }
      const enemyMeleeRadius = Math.max(34, enemy.projectileRadius || enemy.radius * 0.85);
      for (const target of enemies) {
        if (target.hp <= 0 || !areClansHostile({ id: movedEnemy.id, clanId: movedEnemy.clanId }, { id: target.id, clanId: target.clanId })) continue;
        if (Math.hypot(target.x - attackCenter.x, target.y - attackCenter.y) > enemyMeleeRadius + target.radius) continue;
        enemyMeleeImpacts.push({ source: movedEnemy, target });
      }
      const objectHits = worldObjects.filter((object) => object.hp !== undefined && object.hp > 0 && circleIntersectsObject(attackCenter.x, attackCenter.y, enemyMeleeRadius, object));
      for (const object of objectHits) {
        const destroyed = object.hp! - enemy.attack <= 0;
        worldObjects = damageWorldObject(worldObjects, object.id, enemy.attack, now);
        const particles = makePropParticles(nextEntityId, object, now, undefined, undefined, destroyed);
        propParticles = [...propParticles, ...particles];
        nextEntityId += particles.length;
        const propAudioCue = getPropAudioCue(object, destroyed);
        if (propAudioCue) {
          effects.push(makeAudioEffect(nextEntityId, object.x, object.y, propAudioCue, now));
          nextEntityId += 1;
        }
        effects.push(makeDamageEffect(nextEntityId, object.x, object.y, enemy.attack, getQueuedDamageBorn(effects, object.x, object.y, now)));
        nextEntityId += 1;
      }
    }
    return { ...movedEnemy, facing, alerted: true, alertedAt: enemy.alertedAt ?? now, attackReadyAt: now + 1000 / (enemy.attackSpeed * statusModifiers.attackSpeedMultiplier) };
  });

  for (const impact of enemyMeleeImpacts) {
    enemies = enemies.map((enemy) => enemy.id === impact.target.id
      ? knockbackEnemy(damageEnemyActor(enemy, impact.source.attack), impact.source, impact.source.knockback, worldObjects, now, state.dungeon?.walkable, worldBounds)
      : enemy);
    effects.push(makeDamageEffect(nextEntityId, impact.target.x, impact.target.y, impact.source.attack, getQueuedDamageBorn(effects, impact.target.x, impact.target.y, now)));
    nextEntityId += 1;
    if (!impact.target.invulnerable && impact.target.hp > 0 && impact.target.hp - impact.source.attack <= 0) {
      effects.push(makeEnemyDeathEffect(nextEntityId, impact.target, now));
      nextEntityId += 1;
      const spawned = makeWorldDrops(nextEntityId, impact.target.x, impact.target.y, impact.target.loot, now);
      worldDrops = [...worldDrops, ...spawned];
      nextEntityId += spawned.length;
    }
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

  for (const projectile of state.projectiles) {
    const distance = Math.hypot(projectile.vx, projectile.vy) * deltaSeconds;
    const next = {
      ...projectile,
      x: projectile.x + projectile.vx * deltaSeconds,
      y: projectile.y + projectile.vy * deltaSeconds,
      remainingDistance: projectile.remainingDistance - distance,
    };
    const dungeonWallHitPoint = state.dungeon ? getProjectileDungeonWallHitPoint(projectile, next, state.dungeon.walkable) : undefined;
    if (dungeonWallHitPoint) {
      effects.push(makeProjectileHitEffect(nextEntityId, dungeonWallHitPoint.x, dungeonWallHitPoint.y, next, now, next.owner === 'enemy' ? 'impact-prop' : undefined));
      nextEntityId += 1;
      continue;
    }
    const blockingObjectHit = worldObjects.find((object) => object.blocking && object.hp !== 0 && projectileIntersectsObjectPath(projectile, next, object));
    if (blockingObjectHit) {
      const hitPoint = getProjectileObjectHitPoint(projectile, next, blockingObjectHit) ?? next;
      effects.push(makeProjectileHitEffect(nextEntityId, hitPoint.x, hitPoint.y, next, now, next.owner === 'enemy' ? 'impact-prop' : undefined));
      nextEntityId += 1;
      if (next.owner === 'enemy') {
        if (blockingObjectHit.hp !== undefined && blockingObjectHit.hp > 0) {
          const destroyed = blockingObjectHit.hp - next.damage <= 0;
          worldObjects = damageWorldObject(worldObjects, blockingObjectHit.id, next.damage, now);
          const particles = makePropParticles(nextEntityId, blockingObjectHit, now, undefined, undefined, destroyed);
          propParticles = [...propParticles, ...particles];
          nextEntityId += particles.length;
        }
        continue;
      }
      if (blockingObjectHit.hp === undefined || blockingObjectHit.hp <= 0) continue;
      combatTarget = { kind: 'prop', id: blockingObjectHit.id };
      const destroyed = blockingObjectHit.hp - next.damage <= 0;
      worldObjects = damageWorldObject(worldObjects, blockingObjectHit.id, next.damage, now);
      const particles = makePropParticles(nextEntityId, blockingObjectHit, now, undefined, undefined, destroyed);
      propParticles = [...propParticles, ...particles];
      nextEntityId += particles.length;
      const propAudioCue = getPropAudioCue(blockingObjectHit, destroyed);
      if (propAudioCue) {
        effects.push(makeAudioEffect(nextEntityId, hitPoint.x, hitPoint.y, propAudioCue, now));
        nextEntityId += 1;
      }
      effects.push(makeDamageEffect(nextEntityId, blockingObjectHit.x, blockingObjectHit.y, next.damage, getQueuedDamageBorn(effects, blockingObjectHit.x, blockingObjectHit.y, now)));
      nextEntityId += 1;
      ({ player, nextEntityId } = applyWeaponSustain(player, next, next.damage, effects, nextEntityId, now));
      if (destroyed) {
        const spawned = makeWorldDrops(nextEntityId, blockingObjectHit.x, blockingObjectHit.y, blockingObjectHit.loot, now);
        worldDrops = [...worldDrops, ...spawned];
        nextEntityId += spawned.length;
      }
      continue;
    }
    if (next.owner === 'enemy') {
      const objectHit = worldObjects.find((object) => object.hp !== undefined && object.hp > 0 && projectileIntersectsObjectPath(projectile, next, object));
      if (objectHit) {
        const hitPoint = getProjectileObjectHitPoint(projectile, next, objectHit) ?? next;
        const destroyed = objectHit.hp! - next.damage <= 0;
        worldObjects = damageWorldObject(worldObjects, objectHit.id, next.damage, now);
        const particles = makePropParticles(nextEntityId, objectHit, now, undefined, undefined, destroyed);
        propParticles = [...propParticles, ...particles];
        nextEntityId += particles.length;
        effects.push(makeProjectileHitEffect(nextEntityId, hitPoint.x, hitPoint.y, next, now, 'impact-prop'));
        nextEntityId += 1;
        continue;
      }
      const enemyHit = enemies.find((enemy) => enemy.hp > 0
        && areClansHostile({ id: next.sourceId ?? String(next.id), clanId: next.sourceClanId }, { id: enemy.id, clanId: enemy.clanId })
        && projectileIntersectsActorPath(projectile, next, enemy));
      if (enemyHit) {
        const hitPoint = getProjectileActorHitPoint(projectile, next, enemyHit) ?? next;
        effects.push(makeProjectileHitEffect(nextEntityId, hitPoint.x, hitPoint.y, next, now, 'impact-flesh'));
        nextEntityId += 1;
        enemies = enemies.map((enemy) => enemy.id === enemyHit.id
          ? knockbackEnemy(damageEnemyActor(enemy, next.damage), next, next.knockback, worldObjects, now, state.dungeon?.walkable, worldBounds)
          : enemy);
        effects.push(makeDamageEffect(nextEntityId, enemyHit.x, enemyHit.y, next.damage, getQueuedDamageBorn(effects, enemyHit.x, enemyHit.y, now)));
        nextEntityId += 1;
        if (!enemyHit.invulnerable && enemyHit.hp > 0 && enemyHit.hp - next.damage <= 0) {
          effects.push(makeEnemyDeathEffect(nextEntityId, enemyHit, now));
          nextEntityId += 1;
          const spawned = makeWorldDrops(nextEntityId, enemyHit.x, enemyHit.y, enemyHit.loot, now);
          worldDrops = [...worldDrops, ...spawned];
          nextEntityId += spawned.length;
        }
        continue;
      }
      if (player.hp > 0
        && areClansHostile({ id: next.sourceId ?? String(next.id), clanId: next.sourceClanId }, { id: state.player.id, clanId: PLAYER_CLAN_ID })
        && projectileIntersectsActorPath(projectile, next, player)) {
        const hitPoint = getProjectileActorHitPoint(projectile, next, player) ?? next;
        effects.push(makeProjectileHitEffect(nextEntityId, hitPoint.x, hitPoint.y, next, now, 'impact-flesh'));
        nextEntityId += 1;
        player = knockbackActor(damageActor(player, next.damage, now), next, next.knockback, worldObjects, now, state.dungeon?.walkable, worldBounds);
        combatTarget = next.sourceId ? { kind: 'enemy', id: next.sourceId } : combatTarget;
        effects.push(makeDamageEffect(nextEntityId, player.x, player.y, next.damage, getQueuedDamageBorn(effects, player.x, player.y, now)));
        nextEntityId += 1;
        continue;
      }
      if (next.remainingDistance > 0 && isInsideWorld(next.x, next.y, worldBounds)) projectiles.push(next);
      continue;
    }
    const hit = enemies.find((enemy) => enemy.hp > 0
      && areClansHostile({ id: state.player.id, clanId: next.sourceClanId }, { id: enemy.id, clanId: enemy.clanId })
      && Math.hypot(enemy.x - next.x, enemy.y - next.y) <= enemy.radius + next.radius);
    const objectHit = worldObjects.find((object) => object.hp !== undefined && object.hp > 0 && projectileIntersectsObjectPath(projectile, next, object));
    if (hit) {
      combatTarget = { kind: 'enemy', id: hit.id };
      enemies = enemies.map((enemy) => enemy.id === hit.id
        ? knockbackEnemy(damageEnemyActor(enemy, next.damage), next, next.knockback, worldObjects, now, state.dungeon?.walkable, worldBounds)
        : enemy);
      enemies = alertEnemy(enemies, hit.id, player, now);
      enemies = inflictWeaponStatuses(enemies, hit.id, next.inflictions, now, nextEntityId);
      const weapon = getEffectiveWeapon(state, next.weaponInstanceId);
      effects.push(makeHitEffect(nextEntityId, next.x, next.y, weapon, now));
      nextEntityId += 1;
      effects.push(makeDamageEffect(nextEntityId, next.x, next.y, next.damage, getQueuedDamageBorn(effects, next.x, next.y, now)));
      nextEntityId += 1;
      ({ player, nextEntityId } = applyWeaponSustain(player, next, next.damage, effects, nextEntityId, now));
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
      const hitPoint = getProjectileObjectHitPoint(projectile, next, objectHit) ?? next;
      const destroyed = objectHit.hp! - next.damage <= 0;
      worldObjects = damageWorldObject(worldObjects, objectHit.id, next.damage, now);
      const particles = makePropParticles(nextEntityId, objectHit, now, undefined, undefined, destroyed);
      propParticles = [...propParticles, ...particles];
      nextEntityId += particles.length;
      effects.push(makeHitEffect(nextEntityId, hitPoint.x, hitPoint.y, weapon, now, null));
      nextEntityId += 1;
      const propAudioCue = getPropAudioCue(objectHit, destroyed);
      if (propAudioCue) {
        effects.push(makeAudioEffect(nextEntityId, hitPoint.x, hitPoint.y, propAudioCue, now));
        nextEntityId += 1;
      }
      effects.push(makeDamageEffect(nextEntityId, objectHit.x, objectHit.y, next.damage, getQueuedDamageBorn(effects, objectHit.x, objectHit.y, now)));
      nextEntityId += 1;
      ({ player, nextEntityId } = applyWeaponSustain(player, next, next.damage, effects, nextEntityId, now));
      if (destroyed) {
        const spawned = makeWorldDrops(nextEntityId, objectHit.x, objectHit.y, objectHit.loot, now);
        worldDrops = [...worldDrops, ...spawned];
        nextEntityId += spawned.length;
      }
    } else if (next.remainingDistance > 0 && isInsideWorld(next.x, next.y, worldBounds)) {
      projectiles.push(next);
    }
  }

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
        effects: [],
        propParticles: [],
        player: { ...state.player, ...town.spawn },
        combatTarget: undefined,
        lastTick: now,
      };
    }
    const rank = getAdventureRankAtWorldPosition(location);
    const dungeon = generateDungeon(location.dungeonId, location.id, state.mapSeed, now, rank);
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
      effects: [],
      propParticles: [],
      lastTick: now,
    };
  }

  if (!state.dungeon || !state.overworldReturn) return state;
  if (Math.hypot(state.player.x - state.dungeon.exit.x, state.player.y - state.dungeon.exit.y) <= 95) {
    return {
      ...state,
      scene: 'overworld',
      dungeon: undefined,
      town: undefined,
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
  if (Math.hypot(state.player.x - state.dungeon.exit.x, state.player.y - state.dungeon.exit.y) <= 95) return '[E] Exit';
  const chest = state.dungeon.chests.find((candidate) => !candidate.opened && Math.hypot(state.player.x - candidate.x, state.player.y - candidate.y) <= 92);
  return chest ? '[E] Open' : undefined;
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
  const cooldownMs = 1000 / (weapon.attackSpeed * getStatusModifiers(state.player.statusEffects).attackSpeedMultiplier);
  const nextReady = { ...state.cooldownReadyAt, [hand]: now + cooldownMs };
  const weaponFlash = [...state.weaponFlash.filter((flash) => flash.hand !== hand), { hand, born: now }];

  if (weapon.kind === 'melee') {
    const hitCenter = getMeleeHitCenter(state.player, aim, weapon);
    const outfit = getOutfit(state.character.outfitId);
    const skillDamageMultiplier = getPassiveSkillModifiers(state.skills.unlockedIds).damageMultiplier;
    const attackWeapon = { ...weapon, damage: Math.ceil((weapon.damage + (outfit.damageBonus ?? 0)) * skillDamageMultiplier) };
    const meleeResult = applyMeleeWeapon(state.enemies, hitCenter, attackWeapon, { id: state.player.id, clanId: PLAYER_CLAN_ID, x: state.player.x, y: state.player.y }, state.worldObjects, now, state.dungeon?.walkable, worldBounds);
    let enemies = meleeResult.enemies;
    const hits = meleeResult.hits;
    const objectHits = state.worldObjects.filter((object) => object.hp !== undefined && object.hp > 0 && circleIntersectsObject(hitCenter.x, hitCenter.y, weapon.radius, object));
    const worldObjects = objectHits.reduce((objects, object) => damageWorldObject(objects, object.id, attackWeapon.damage, now), state.worldObjects);
    const effects = [...state.effects, makeHitEffect(state.nextEntityId, hitCenter.x, hitCenter.y, weapon, now)];
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
      enemies = alertEnemy(enemies, hit.id, state.player, now);
      enemies = inflictWeaponStatuses(enemies, hit.id, weapon.inflictions, now, nextEntityId);
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
      const propAudioCue = getPropAudioCue(hit, destroyed);
      if (propAudioCue) {
        effects.push(makeAudioEffect(nextEntityId, hit.x, hit.y, propAudioCue, now));
        nextEntityId += 1;
      }
      effects.push(makeDamageEffect(nextEntityId, hit.x, hit.y, attackWeapon.damage, getQueuedDamageBorn(effects, hit.x, hit.y, now)));
      nextEntityId += 1;
      if (destroyed) {
        const spawned = makeWorldDrops(nextEntityId, hit.x, hit.y, hit.loot, now);
        worldDrops = [...worldDrops, ...spawned];
        nextEntityId += spawned.length;
      }
    }
    let player = state.player;
    for (let index = 0; index < hits.length + objectHits.length; index += 1) {
      ({ player, nextEntityId } = applyWeaponSustain(player, weapon, attackWeapon.damage, effects, nextEntityId, now));
    }
    return {
      ...state,
      player,
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

function knockbackActor<T extends Actor>(
  actor: T,
  origin: { x: number; y: number },
  amount: number,
  worldObjects: WorldObject[],
  now: number,
  walkable?: DungeonRect[],
  worldBounds?: AdventureWorldBounds,
): T {
  const stiffness = Math.max(0, Math.min(100, actor.stiffness ?? 0));
  return scheduleKnockbackMotion(actor, normalizedVector(origin, actor), amount * (1 - stiffness / 100), worldObjects, now, walkable, worldBounds);
}

function knockbackEnemy(
  enemy: AdventureEnemy,
  origin: { x: number; y: number },
  amount: number,
  worldObjects: WorldObject[],
  now: number,
  walkable?: DungeonRect[],
  worldBounds?: AdventureWorldBounds,
) {
  return scheduleKnockbackMotion(enemy, normalizedVector(origin, enemy), amount, worldObjects, now, walkable, worldBounds);
}

function scheduleKnockbackMotion<T extends { x: number; y: number; radius: number; knockbackMotion?: KnockbackMotion }>(
  actor: T,
  direction: { x: number; y: number },
  distance: number,
  worldObjects: WorldObject[],
  now: number,
  walkable?: DungeonRect[],
  worldBounds?: AdventureWorldBounds,
): T {
  if (distance <= 0) return actor;
  const current = applyKnockbackMotion(actor, now);
  const activeBlockers = worldObjects.filter((object) => object.blocking && object.hp !== 0);
  const steps = Math.max(1, Math.ceil(distance / 10));
  let result = current;
  for (let step = 1; step <= steps; step += 1) {
    const traveled = distance * step / steps;
    const targetX = current.x + direction.x * traveled;
    const targetY = current.y + direction.y * traveled;
    const x = activeBlockers.some((object) => circleIntersectsObject(targetX, result.y, current.radius, object))
      || !isInsideWalkableArea(targetX, result.y, current.radius, walkable)
      || !isInsideWorld(targetX, result.y, worldBounds, current.radius)
      ? result.x
      : targetX;
    const y = activeBlockers.some((object) => circleIntersectsObject(x, targetY, current.radius, object))
      || !isInsideWalkableArea(x, targetY, current.radius, walkable)
      || !isInsideWorld(x, targetY, worldBounds, current.radius)
      ? result.y
      : targetY;
    result = { ...result, x, y };
    if (result.x !== targetX && result.y !== targetY) break;
  }
  const actualDistance = Math.hypot(result.x - current.x, result.y - current.y);
  if (actualDistance <= 0.5) return current;
  const duration = Math.max(200, Math.min(500, 180 + actualDistance * 3.2));
  return {
    ...current,
    knockbackMotion: {
      fromX: current.x,
      fromY: current.y,
      toX: result.x,
      toY: result.y,
      startedAt: now,
      endsAt: now + duration,
    },
  };
}

function applyKnockbackMotion<T extends { x: number; y: number; knockbackMotion?: KnockbackMotion }>(actor: T, now: number): T {
  const motion = actor.knockbackMotion;
  if (!motion) return actor;
  const duration = Math.max(1, motion.endsAt - motion.startedAt);
  const t = Math.max(0, Math.min(1, (now - motion.startedAt) / duration));
  const eased = 1 - Math.pow(1 - t, 3);
  const next = {
    ...actor,
    x: motion.fromX + (motion.toX - motion.fromX) * eased,
    y: motion.fromY + (motion.toY - motion.fromY) * eased,
  };
  return t >= 1 ? { ...next, knockbackMotion: undefined } : next;
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
  const kind = forcedKind ?? getPropParticleKind(object);
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

function getPropParticleKind(object: WorldObject): PropParticle['kind'] {
  const family = object.family;
  if (family === 'bush' || family === 'tree') return 'leaf';
  if (family === 'rock' || family === 'ruin-wall' || family === 'ruin-pillar' || family === 'rubble') return 'stone';
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

function applyMeleeWeapon(
  enemies: AdventureEnemy[],
  hitCenter: { x: number; y: number },
  weapon: EffectiveWeapon,
  source: { id: string; clanId: AdventureClanId; x: number; y: number },
  worldObjects: WorldObject[],
  now: number,
  walkable?: DungeonRect[],
  worldBounds?: AdventureWorldBounds,
) {
  const hits: AdventureEnemy[] = [];
  const nextEnemies = enemies.map((enemy) => {
    if (enemy.hp <= 0) return enemy;
    if (!areClansHostile(source, { id: enemy.id, clanId: enemy.clanId })) return enemy;
    if (Math.hypot(enemy.x - hitCenter.x, enemy.y - hitCenter.y) > weapon.radius + enemy.radius) return enemy;
    hits.push(enemy);
    return knockbackEnemy(damageEnemyActor(enemy, weapon.damage), source, weapon.knockback, worldObjects, now, walkable, worldBounds);
  });
  return { enemies: nextEnemies, hits };
}

function damageEnemy(enemies: AdventureEnemy[], enemyId: string, damage: number) {
  return enemies.map((enemy) => (enemy.id === enemyId ? damageEnemyActor(enemy, damage) : enemy));
}

function alertEnemy(enemies: AdventureEnemy[], enemyId: string, player: Actor, now: number) {
  return enemies.map((enemy) => {
    if (enemy.id !== enemyId || enemy.hp <= 0 || getEnemyChaseRadius(enemy) <= 0) return enemy;
    const playerWithinChase = Math.hypot(player.x - enemy.spawnX, player.y - enemy.spawnY) <= getEnemyChaseRadius(enemy);
    return playerWithinChase ? { ...enemy, alerted: true, alertedAt: enemy.alertedAt ?? now } : enemy;
  });
}

function getEnemyAlertRadius(enemy: AdventureEnemy) {
  return enemy.alertRadius ?? Math.min(enemy.aggroRadius, 260);
}

function getEnemyChaseRadius(enemy: AdventureEnemy) {
  return enemy.chaseRadius ?? enemy.aggroRadius;
}

function inflictWeaponStatuses(
  enemies: AdventureEnemy[],
  enemyId: string,
  applications: StatusEffectApplication[],
  now: number,
  rollSeed: number,
) {
  return enemies.map((enemy) => {
    if (enemy.id !== enemyId || enemy.hp <= 0) return enemy;
    return applications.reduce((target, application, index) => {
      const chance = Math.max(0, Math.min(1, application.chance));
      const roll = seededParticle(rollSeed + hashRuntimeId(application.statusId) + index * 101);
      return roll < chance ? applyStatusEffect(target, application, now) : target;
    }, enemy);
  });
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

const SHIELD_DURATION_MS = 10_000;

function applyWeaponSustain(
  player: Actor,
  weapon: Pick<EffectiveWeapon, 'lifeDrain' | 'shield'>,
  damage: number,
  effects: CombatEffect[],
  nextEntityId: number,
  now: number,
) {
  let nextPlayer = expireShield(player, now);
  if (weapon.lifeDrain > 0 && nextPlayer.hp < nextPlayer.maxHp) {
    const requestedHeal = Math.max(1, Math.floor(damage * weapon.lifeDrain));
    const healed = Math.min(requestedHeal, nextPlayer.maxHp - nextPlayer.hp);
    nextPlayer = { ...nextPlayer, hp: nextPlayer.hp + healed };
    effects.push(makeHealEffect(
      nextEntityId,
      nextPlayer.x,
      nextPlayer.y,
      healed,
      getQueuedTextEffectBorn(effects, nextPlayer.x, nextPlayer.y, now, 'heal'),
    ));
    nextEntityId += 1;
  }
  if (weapon.shield > 0) {
    const generatedShield = Math.max(1, Math.floor(damage * weapon.shield));
    nextPlayer = {
      ...nextPlayer,
      shield: Math.max(nextPlayer.shield, generatedShield),
      shieldExpiresAt: now + SHIELD_DURATION_MS,
    };
  }
  return { player: nextPlayer, nextEntityId };
}

function expireShield(actor: Actor, now: number): Actor {
  return (actor.shield ?? 0) > 0 && now >= (actor.shieldExpiresAt ?? 0) ? { ...actor, shield: 0, shieldExpiresAt: 0 } : actor;
}

function damageActor(actor: Actor, damage: number, now: number): Actor {
  const active = expireShield(actor, now);
  const shield = active.shield ?? 0;
  const absorbed = Math.min(shield, damage);
  return {
    ...active,
    shield: shield - absorbed,
    hp: Math.max(0, active.hp - (damage - absorbed)),
  };
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

function isInsideWalkableArea(x: number, y: number, radius: number, walkable?: DungeonRect[]) {
  if (!walkable) return true;
  return walkable.some((rect) => x - radius >= rect.x && x + radius <= rect.x + rect.width && y - radius >= rect.y && y + radius <= rect.y + rect.height);
}

function getProjectileDungeonWallHitPoint(projectile: Projectile, next: Projectile, walkable: DungeonRect[]) {
  const steps = Math.max(1, Math.ceil(Math.hypot(next.x - projectile.x, next.y - projectile.y) / Math.max(8, projectile.radius)));
  for (let step = 1; step <= steps; step += 1) {
    const t = step / steps;
    const x = projectile.x + (next.x - projectile.x) * t;
    const y = projectile.y + (next.y - projectile.y) * t;
    if (!isInsideWalkableArea(x, y, next.radius, walkable)) return { x, y };
  }
  return undefined;
}

function projectileIntersectsObjectPath(projectile: Projectile, next: Projectile, object: WorldObject) {
  return getProjectileObjectHitPoint(projectile, next, object) !== undefined;
}

function getProjectileObjectHitPoint(projectile: Projectile, next: Projectile, object: WorldObject) {
  const steps = Math.max(1, Math.ceil(Math.hypot(next.x - projectile.x, next.y - projectile.y) / Math.max(8, projectile.radius)));
  for (let step = 1; step <= steps; step += 1) {
    const t = step / steps;
    const x = projectile.x + (next.x - projectile.x) * t;
    const y = projectile.y + (next.y - projectile.y) * t;
    if (circleIntersectsObject(x, y, next.radius, object)) return { x, y };
  }
  return undefined;
}

function projectileIntersectsActorPath(projectile: Projectile, next: Projectile, actor: { x: number; y: number; radius: number }) {
  return getProjectileActorHitPoint(projectile, next, actor) !== undefined;
}

function getProjectileActorHitPoint(projectile: Projectile, next: Projectile, actor: { x: number; y: number; radius: number }) {
  const steps = Math.max(1, Math.ceil(Math.hypot(next.x - projectile.x, next.y - projectile.y) / Math.max(8, projectile.radius)));
  for (let step = 1; step <= steps; step += 1) {
    const t = step / steps;
    const x = projectile.x + (next.x - projectile.x) * t;
    const y = projectile.y + (next.y - projectile.y) * t;
    if (Math.hypot(actor.x - x, actor.y - y) <= actor.radius + next.radius) return { x, y };
  }
  return undefined;
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

function makeHitEffect(
  id: number,
  x: number,
  y: number,
  weapon: Pick<WeaponDefinition, 'effectGlyph' | 'color' | 'effectSize' | 'kind' | 'audio'>,
  born: number,
  audioCue: AdventureAudioCue | null | undefined = getWeaponAudio(weapon).onHit,
): CombatEffect {
  return { id, kind: 'hit', x, y, glyph: weapon.effectGlyph, color: weapon.color, born, size: weapon.effectSize, audioCue: audioCue ?? undefined };
}

function makeProjectileHitEffect(
  id: number,
  x: number,
  y: number,
  projectile: Pick<Projectile, 'effectGlyph' | 'effectSize' | 'color' | 'hitAudioCue'>,
  born: number,
  audioCue = projectile.hitAudioCue,
): CombatEffect {
  return { id, kind: 'hit', x, y, glyph: projectile.effectGlyph, color: projectile.color, born, size: projectile.effectSize, audioCue };
}

function makeAudioEffect(id: number, x: number, y: number, audioCue: AdventureAudioCue, born: number): CombatEffect {
  return { id, kind: 'audio', x, y, glyph: '', color: 'transparent', born, audioCue };
}

function getPropAudioCue(object: WorldObject, destroyed: boolean) {
  return destroyed ? object.audio?.onDestroy : object.audio?.onHit;
}

function makeDamageEffect(id: number, x: number, y: number, damage: number, born: number): CombatEffect {
  return { id, kind: 'damage', x, y, glyph: `-${damage}`, color: '#c3293a', born };
}

function makeEnemyAttackEffect(id: number, enemy: AdventureEnemy, player: Actor, born: number): CombatEffect {
  if (enemy.attackKind === 'ranged') {
    const projectile = enemy.projectile;
    return {
      id,
      kind: 'hit',
      x: enemy.x,
      y: enemy.y,
      toX: player.x,
      toY: player.y,
      glyph: projectile?.glyph ?? '✦',
      color: projectile?.color ?? enemy.color,
      born,
      size: Math.max(24, Math.min(42, enemy.projectileRadius * 1.6 || 28)),
    };
  }
  const impact = getClosestBorderPoint(enemy, player, player.radius);
  return {
    id,
    kind: 'hit',
    x: impact.x,
    y: impact.y,
    glyph: '✧',
    color: enemy.color,
    born,
    size: 34,
  };
}

function makeHealEffect(id: number, x: number, y: number, amount: number, born: number): CombatEffect {
  return { id, kind: 'heal', x, y, glyph: `+${Math.ceil(amount)}`, color: '#2f9e57', born };
}

function makeStatusTickEffect(
  id: number,
  x: number,
  y: number,
  event: StatusTickEvent,
  effects: CombatEffect[],
  now: number,
) {
  return event.kind === 'damage'
    ? makeDamageEffect(id, x, y, event.amount, getQueuedTextEffectBorn(effects, x, y, now, 'damage'))
    : makeHealEffect(id, x, y, event.amount, getQueuedTextEffectBorn(effects, x, y, now, 'heal'));
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
  return getQueuedTextEffectBorn(effects, x, y, now, 'damage');
}

function makePlayerDeathEffect(id: number, state: AdventureState, born: number): CombatEffect {
  return {
    id,
    kind: 'death',
    x: state.player.x,
    y: state.player.y,
    toX: state.player.x,
    toY: state.player.y + 220,
    glyph: 'x_x',
    color: '#4777bd',
    body: state.character.body,
    leftHand: state.character.leftWeaponInstanceId ? '|' : undefined,
    rightHand: state.character.rightWeaponInstanceId ? '|' : undefined,
    background: state.character.color,
    pillWidth: state.character.pillWidth,
    team: 'player',
    born,
    audioCue: 'player-death',
  };
}

function getQueuedTextEffectBorn(effects: CombatEffect[], x: number, y: number, now: number, kind: 'damage' | 'heal') {
  const queueIndex = effects.filter(
    (effect) => effect.kind === kind && Math.hypot(effect.x - x, effect.y - y) < 24 && now - effect.born < 850,
  ).length;
  return now + queueIndex * 150;
}

function getEffectLife(effect: CombatEffect) {
  if (effect.kind === 'audio') return 60;
  if (effect.kind === 'death') return 1250;
  return effect.kind === 'damage' || effect.kind === 'heal' ? 950 : 420;
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

function makeWorldDrops(startId: number, x: number, y: number, table: LootTable | undefined, now: number, random = makeDeterministicRandom(startId)): WorldDrop[] {
  const rolled = rollLootTable(table, random);
  const drops = makeCoinDrops(startId, x - 15, y + 5, rolled.coins, now);
  for (const itemId of rolled.itemIds) {
    const index = drops.length;
    drops.push({
      id: `drop-${String(startId + index).padStart(2, '0')}`,
      kind: 'item',
      x: x + 15 + (index % 3 - 1) * 18,
      y: y - 5 + Math.floor(index / 3) * 18,
      born: now + index * 35,
      itemId,
    });
  }
  return drops;
}

function makeChestRollDrops(startId: number, x: number, y: number, table: LootTable, now: number, random: () => number): WorldDrop[] {
  const rolled = rollLootTable(table, random);
  const drops: WorldDrop[] = [];
  if (rolled.coins > 0) drops.push({ id: `drop-${String(startId).padStart(2, '0')}`, kind: 'coin', x: x - 14, y: y + 6, born: now, amount: rolled.coins });
  for (const itemId of rolled.itemIds) {
    const index = drops.length;
    drops.push({
      id: `drop-${String(startId + index).padStart(2, '0')}`,
      kind: 'item',
      x: x + 14 + (index % 3 - 1) * 18,
      y: y - 6 + Math.floor(index / 3) * 18,
      born: now + 45 + index * 35,
      itemId,
    });
  }
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
      owner: 'player' as const,
      sourceClanId: PLAYER_CLAN_ID,
      weaponInstanceId: weapon.instanceId,
      hand,
      x: origin.x,
      y: origin.y,
      vx,
      vy,
      remainingDistance: weapon.range,
      radius: weapon.radius,
      damage: weapon.damage,
      knockback: weapon.knockback,
      lifeDrain: weapon.lifeDrain,
      shield: weapon.shield,
      inflictions: weapon.inflictions.map((application) => ({ ...application })),
      glyph: weapon.projectile?.glyph ?? weapon.effectGlyph,
      color: weapon.color,
      effectGlyph: weapon.effectGlyph,
      effectSize: weapon.effectSize,
      hitAudioCue: getWeaponAudio(weapon).onHit,
    };
  });
}

function makeEnemyProjectile(startId: number, enemy: AdventureEnemy, target: Actor): Projectile {
  const direction = normalizedVector(enemy, target);
  return {
    id: startId,
    owner: 'enemy',
    sourceClanId: enemy.clanId,
    sourceId: enemy.id,
    weaponInstanceId: 'enemy-projectile',
    hand: 'right',
    x: enemy.x,
    y: enemy.y,
    vx: direction.x * enemy.projectileSpeed,
    vy: direction.y * enemy.projectileSpeed,
    remainingDistance: enemy.attackRange + target.radius + 80,
    radius: Math.max(8, enemy.projectileRadius),
    damage: enemy.attack,
    knockback: enemy.knockback,
    lifeDrain: 0,
    shield: 0,
    inflictions: [],
    glyph: enemy.projectile?.glyph ?? '✦',
    color: enemy.projectile?.color ?? enemy.color,
    effectGlyph: enemy.projectile?.impact?.glyph ?? enemy.projectile?.glyph ?? '✦',
    effectSize: Math.max(24, Math.min(42, enemy.projectileRadius * 1.6 || 28)),
    hitAudioCue: 'impact-flesh',
  };
}

function isInsideWorld(x: number, y: number, bounds?: AdventureWorldBounds, radius = 0) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
  if (!bounds) return true;
  return x - radius >= bounds.left
    && x + radius <= bounds.right
    && y - radius >= bounds.top
    && y + radius <= bounds.bottom;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
