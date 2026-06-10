import { terrainProps } from '../../shared/content';
import { GAME_SETTINGS, WORLD_HEIGHT, WORLD_WIDTH } from '../../shared/settings';
import { getTrait, getWeapon, type TraitDefinition, type WeaponDefinition } from './content';

export type Facing = 'left' | 'right';
export type HandSlot = 'left' | 'right';

export type AdventureCharacter = {
  body: string;
  color: string;
  pillWidth: number;
  leftWeaponInstanceId?: string;
  rightWeaponInstanceId?: string;
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
  name: string;
  icon: string;
  count: number;
  heal: number;
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

export type AdventureState = {
  player: Actor;
  character: AdventureCharacter;
  inventory: AdventureInventory;
  enemies: Actor[];
  projectiles: Projectile[];
  effects: CombatEffect[];
  cooldownReadyAt: Record<HandSlot, number>;
  itemFlash: Array<{ slot: number; born: number }>;
  weaponFlash: Array<{ hand: HandSlot; born: number }>;
  lastTick: number;
  nextEntityId: number;
};

export const adventureWorld = {
  width: WORLD_WIDTH,
  height: WORLD_HEIGHT,
  spawn: {
    x: Math.round(WORLD_WIDTH * GAME_SETTINGS.world.playerSpawnRatioX),
    y: Math.round(WORLD_HEIGHT * GAME_SETTINGS.world.playerSpawnRatioY),
  },
  terrainProps,
};

export const PLAYER_MOVE_SPEED = 250;

export const createInitialAdventureState = (): AdventureState => {
  const now = performance.now();
  return {
    player: {
      id: 'player',
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
      pillWidth: 76,
      leftWeaponInstanceId: 'weapon-training-fist-a',
      rightWeaponInstanceId: 'weapon-spark-wand-a',
    },
    inventory: createInitialInventory(),
    enemies: [
      {
        id: 'dummy-01',
        name: 'Training Dummy',
        x: adventureWorld.spawn.x + 360,
        y: adventureWorld.spawn.y - 90,
        hp: 1200,
        maxHp: 1200,
        facing: 'left',
        radius: 38,
      },
    ],
    projectiles: [],
    effects: [],
    cooldownReadyAt: { left: now, right: now },
    itemFlash: [],
    weaponFlash: [],
    lastTick: now,
    nextEntityId: 1,
  };
};

export function tickAdventureState(
  state: AdventureState,
  now: number,
  input: {
    keys: Set<string>;
    aim: { x: number; y: number };
  },
): AdventureState {
  const deltaSeconds = Math.min((now - state.lastTick) / 1000, GAME_SETTINGS.combat.maxTickDeltaSeconds);
  const player = movePlayer(state.player, input.keys, input.aim, deltaSeconds);
  let enemies = state.enemies.map((enemy) => ({ ...enemy }));
  const effects = state.effects.filter((effect) => now - effect.born < getEffectLife(effect));
  const projectiles: Projectile[] = [];
  let nextEntityId = state.nextEntityId;

  for (const projectile of state.projectiles) {
    const distance = Math.hypot(projectile.vx, projectile.vy) * deltaSeconds;
    const next = {
      ...projectile,
      x: projectile.x + projectile.vx * deltaSeconds,
      y: projectile.y + projectile.vy * deltaSeconds,
      remainingDistance: projectile.remainingDistance - distance,
    };
    const hit = enemies.find((enemy) => enemy.hp > 0 && Math.hypot(enemy.x - next.x, enemy.y - next.y) <= enemy.radius + next.radius);
    if (hit) {
      enemies = damageEnemy(enemies, hit.id, next.damage);
      const weapon = getEffectiveWeapon(state, next.weaponInstanceId);
      effects.push(makeHitEffect(nextEntityId, next.x, next.y, weapon, now));
      nextEntityId += 1;
      effects.push(makeDamageEffect(nextEntityId, next.x, next.y, next.damage, getQueuedDamageBorn(effects, next.x, next.y, now)));
      nextEntityId += 1;
      if (hit.hp > 0 && hit.hp - next.damage <= 0) {
        effects.push(makeEnemyDeathEffect(nextEntityId, hit, now));
        nextEntityId += 1;
      }
    } else if (next.remainingDistance > 0 && isInsideWorld(next.x, next.y)) {
      projectiles.push(next);
    }
  }

  return {
    ...state,
    player,
    enemies,
    projectiles,
    effects,
    itemFlash: state.itemFlash.filter((flash) => now - flash.born < 420),
    weaponFlash: state.weaponFlash.filter((flash) => now - flash.born < 420),
    lastTick: now,
    nextEntityId,
  };
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
    const { enemies, hits } = applyMeleeWeapon(state.enemies, hitCenter, weapon);
    const effects = [...state.effects, makeHitEffect(state.nextEntityId, hitCenter.x, hitCenter.y, weapon, now)];
    let nextEntityId = state.nextEntityId + 1;
    for (const hit of hits) {
      effects.push(makeDamageEffect(nextEntityId, hit.x, hit.y, weapon.damage, getQueuedDamageBorn(effects, hit.x, hit.y, now)));
      nextEntityId += 1;
      if (hit.hp > 0 && hit.hp - weapon.damage <= 0) {
        effects.push(makeEnemyDeathEffect(nextEntityId, hit, now));
        nextEntityId += 1;
      }
    }
    return {
      ...state,
      enemies,
      cooldownReadyAt: nextReady,
      weaponFlash,
      effects,
      nextEntityId,
    };
  }

  const direction = normalizedVector(state.player, aim);
  const origin = getHandPosition(state.player, state.character.pillWidth, hand);
  const projectiles = makeProjectiles(state.nextEntityId, weapon, hand, origin, direction);

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
  if (!potion) return state;
  return {
    ...state,
    player: { ...state.player, hp: Math.min(state.player.maxHp, state.player.hp + potion.heal) },
    inventory: {
      ...state.inventory,
      potions: state.inventory.potions
        .map((item) => (item.itemNo === itemNo ? { ...item, count: item.count - 1 } : item))
        .filter((item) => item.count > 0),
    },
    itemFlash: [...state.itemFlash.slice(-8), { slot: itemNo, born: now }],
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
  return weaponInstanceId ? getEffectiveWeapon(state, weaponInstanceId) : undefined;
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

function movePlayer(player: Actor, keys: Set<string>, aim: { x: number; y: number }, deltaSeconds: number): Actor {
  let dx = 0;
  let dy = 0;
  if (keys.has('a') || keys.has('arrowleft')) dx -= 1;
  if (keys.has('d') || keys.has('arrowright')) dx += 1;
  if (keys.has('w') || keys.has('arrowup')) dy -= 1;
  if (keys.has('s') || keys.has('arrowdown')) dy += 1;
  const length = Math.hypot(dx, dy) || 1;
  return {
    ...player,
    x: clamp(player.x + (dx / length) * PLAYER_MOVE_SPEED * deltaSeconds, 40, adventureWorld.width - 40),
    y: clamp(player.y + (dy / length) * PLAYER_MOVE_SPEED * deltaSeconds, 40, adventureWorld.height - 40),
    facing: aim.x < player.x ? 'left' : 'right',
  };
}

function getMeleeHitCenter(player: Actor, aim: { x: number; y: number }, weapon: WeaponDefinition) {
  const direction = normalizedVector(player, aim);
  const distance = Math.min(weapon.range, Math.max(36, Math.hypot(aim.x - player.x, aim.y - player.y)));
  return {
    x: player.x + direction.x * distance,
    y: player.y + direction.y * distance,
  };
}

function applyMeleeWeapon(enemies: Actor[], hitCenter: { x: number; y: number }, weapon: EffectiveWeapon) {
  const hits: Actor[] = [];
  const nextEnemies = enemies.map((enemy) => {
    if (enemy.hp <= 0) return enemy;
    if (Math.hypot(enemy.x - hitCenter.x, enemy.y - hitCenter.y) > weapon.radius + enemy.radius) return enemy;
    hits.push(enemy);
    return { ...enemy, hp: Math.max(0, enemy.hp - weapon.damage) };
  });
  return { enemies: nextEnemies, hits };
}

function damageEnemy(enemies: Actor[], enemyId: string, damage: number) {
  return enemies.map((enemy) => (enemy.id === enemyId ? { ...enemy, hp: Math.max(0, enemy.hp - damage) } : enemy));
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

function makeEnemyDeathEffect(id: number, enemy: Actor, born: number): CombatEffect {
  return {
    id,
    kind: 'death',
    x: enemy.x,
    y: enemy.y,
    toX: enemy.x + 90,
    toY: enemy.y + 190,
    glyph: 'X_X',
    color: '#bb3f4d',
    body: 'x_x',
    leftHand: '|',
    rightHand: '|',
    background: '#f2d6c7',
    pillWidth: 78,
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
      { itemNo: 1, id: 'weapon-training-fist-a', baseWeaponId: 'training-fist', name: 'Training Fist', traitIds: [] },
      { itemNo: 2, id: 'weapon-spark-wand-a', baseWeaponId: 'spark-wand', name: 'Spark Wand', traitIds: [] },
      { itemNo: 3, id: 'weapon-heart-tether-a', baseWeaponId: 'heart-tether', name: 'Heart Tether', traitIds: ['reach-stone'] },
      { itemNo: 4, id: 'weapon-practice-blade-a', baseWeaponId: 'practice-blade', name: 'Practice Blade', traitIds: ['impact-stone'] },
    ],
    traits: [
      { itemNo: 101, traitId: 'keen-edge-stone', count: 3 },
      { itemNo: 102, traitId: 'quickening-stone', count: 2 },
      { itemNo: 103, traitId: 'reach-stone', count: 2 },
      { itemNo: 104, traitId: 'scatter-stone', count: 2 },
      { itemNo: 105, traitId: 'impact-stone', count: 2 },
    ],
    potions: [{ itemNo: 201, name: 'Small Potion', icon: '🧪', count: 3, heal: 35 }],
  };
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
  return x >= 0 && x <= adventureWorld.width && y >= 0 && y <= adventureWorld.height;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
