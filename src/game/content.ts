import builtInMinions from '../data/minions.json';
import builtInCastles from '../data/enemy.json';
import { GAME_SETTINGS, WORLD_HEIGHT, WORLD_WIDTH } from './settings';
import type { ContentSource } from './technology';

export type MinionType = 'melee' | 'ranged' | 'worker';
export type MinionTier = 'weak' | 'medium' | 'strong';
export type EnemyTier = 'easy' | 'medium' | 'hard';
export type UnitKind = 'combat' | 'worker';
export type AttackStyle = 'heart-shot' | 'melee' | 'shield-bash' | 'spark';

export type KaomojiParts = {
  body: string;
  leftHand?: string;
  rightHand?: string;
};

export type ProjectileDefinition = {
  glyph: string;
  color: string;
  speed?: number;
  radius?: number;
  impact?: {
    glyph: string;
    color?: string;
  };
};

export type MinionJson = {
  id: string;
  type: MinionType;
  tier?: MinionTier;
  name: string;
  description?: string;
  appearance: {
    base: KaomojiParts;
    attack?: KaomojiParts;
    death?: KaomojiParts;
    work?: KaomojiParts;
    projectile?: ProjectileDefinition;
  };
  visual?: {
    background?: string;
    pillWidth?: number;
  };
  attributes: {
    hp: number;
    attack: number;
    defense?: number;
    price: number;
    range: number;
    speed: number;
    attackSpeed?: number;
    coinsPerSecond?: number;
  };
};

export type UnitDefinition = {
  id: string;
  source: ContentSource;
  tier: MinionTier;
  type: MinionType;
  kind: UnitKind;
  face: string;
  body: string;
  leftHand?: string;
  rightHand?: string;
  attackBody: string;
  attackLeftHand?: string;
  attackRightHand?: string;
  deathBody: string;
  deathLeftHand?: string;
  deathRightHand?: string;
  workBody?: string;
  workLeftHand?: string;
  workRightHand?: string;
  projectile?: ProjectileDefinition;
  projectileSpeed: number;
  projectileRadius: number;
  background: string;
  pillWidth: number;
  name: string;
  description: string;
  cost: number;
  maxHp: number;
  attack: number;
  defense: number;
  attackSpeed: number;
  range: number;
  speed: number;
  style: AttackStyle;
  coinsPerSecond?: number;
};

export type CastleDefinition = {
  id: string;
  tier?: EnemyTier;
  name: string;
  symbol: string;
  x: number;
  y: number;
  maxHp: number;
  reward: number;
  aggroRadius: number;
  guardRespawnSeconds?: number;
  healPerSecond?: number;
  theme: string;
  defenders: CastleDefenderDefinition[];
};

export type CastleDefenderDefinition = {
  unitId?: string;
  tier?: MinionTier;
  type?: Exclude<MinionType, 'worker'>;
  dx: number;
  dy: number;
};

export type TerrainProp = {
  id: string;
  kind: 'tree' | 'rock' | 'flower' | 'mushroom' | 'stump';
  x: number;
  y: number;
  size: number;
  rotation: number;
};

const CUSTOM_MINIONS_KEY = 'minion-clicker-custom-minions-v1';

export const minionSchemaExample: MinionJson = {
  id: 'custom-heart-knight',
  type: 'melee',
  tier: 'weak',
  name: 'Heart Knight',
  description: 'Example custom melee minion.',
  appearance: {
    base: { body: '`v`', leftHand: '/', rightHand: ')' },
    attack: { body: '>v<', leftHand: '/', rightHand: ')' },
    death: { body: 'X_X' },
  },
  visual: { background: '#f5d6b8', pillWidth: 92 },
  attributes: { hp: 80, attack: 18, defense: 0, price: 120, range: 44, speed: 82, attackSpeed: 0.7 },
};

export function loadCustomMinions(): MinionJson[] {
  if (typeof window === 'undefined') return [];
  try {
    const saved = window.localStorage.getItem(CUSTOM_MINIONS_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    const list = Array.isArray(parsed) ? parsed : [parsed];
    return list.map(validateMinionJson);
  } catch {
    return [];
  }
}

export function saveCustomMinions(minions: MinionJson[]) {
  window.localStorage.setItem(CUSTOM_MINIONS_KEY, JSON.stringify(minions.map(validateMinionJson)));
}

export function clearCustomMinions() {
  window.localStorage.removeItem(CUSTOM_MINIONS_KEY);
}

export function validateMinionJson(input: unknown): MinionJson {
  const minion = input as Partial<MinionJson>;
  if (!minion || typeof minion !== 'object') throw new Error('Minion must be an object.');
  if (!minion.id || !/^[a-z0-9-]+$/i.test(minion.id)) throw new Error('Minion id must be a slug.');
  if (minion.type !== 'melee' && minion.type !== 'ranged' && minion.type !== 'worker') {
    throw new Error('Minion type must be melee, ranged, or worker.');
  }
  if (minion.tier !== undefined && minion.tier !== 'weak' && minion.tier !== 'medium' && minion.tier !== 'strong') {
    throw new Error('Minion tier must be weak, medium, or strong.');
  }
  if (!minion.name) throw new Error('Minion name is required.');
  if (!minion.appearance?.base?.body) throw new Error('Minion appearance.base.body is required.');
  if (minion.type === 'ranged' && !minion.appearance.projectile?.glyph) {
    throw new Error('Ranged minions require appearance.projectile.glyph.');
  }
  if (minion.type === 'worker' && !minion.appearance.work?.body) {
    throw new Error('Worker minions require appearance.work.body.');
  }
  if (minion.visual?.pillWidth !== undefined && (typeof minion.visual.pillWidth !== 'number' || minion.visual.pillWidth < 44)) {
    throw new Error('visual.pillWidth must be a number of at least 44.');
  }
  const attrs = minion.attributes;
  if (!attrs) throw new Error('Minion attributes are required.');
  for (const key of ['hp', 'attack', 'price', 'range', 'speed'] as const) {
    if (typeof attrs[key] !== 'number' || attrs[key] < 0) throw new Error(`attributes.${key} must be a positive number.`);
  }
  return {
    id: minion.id,
    type: minion.type,
    tier: minion.tier,
    name: minion.name,
    description: minion.description ?? '',
    appearance: {
      base: minion.appearance.base,
      attack: minion.appearance.attack,
      death: minion.appearance.death,
      work: minion.appearance.work,
      projectile: minion.appearance.projectile,
    },
    visual: minion.visual,
    attributes: {
      hp: attrs.hp,
      attack: attrs.attack,
      defense: 0,
      price: attrs.price,
      range: attrs.range,
      speed: attrs.speed,
      attackSpeed: attrs.attackSpeed ?? 0.5,
      coinsPerSecond: attrs.coinsPerSecond,
    },
  };
}

function normalizeMinion(minion: MinionJson, source: ContentSource): UnitDefinition {
  const attack = minion.appearance.attack ?? minion.appearance.base;
  const death = minion.appearance.death ?? { ...minion.appearance.base, body: 'X_X' };
  const work = minion.appearance.work;
  const projectile = minion.appearance.projectile;
  return {
    id: minion.id,
    source,
    tier: minion.tier ?? inferTier(minion.attributes.price),
    type: minion.type,
    kind: minion.type === 'worker' ? 'worker' : 'combat',
    face: joinParts(minion.appearance.base),
    body: minion.appearance.base.body,
    leftHand: minion.appearance.base.leftHand,
    rightHand: minion.appearance.base.rightHand,
    attackBody: attack.body,
    attackLeftHand: attack.leftHand,
    attackRightHand: attack.rightHand,
    deathBody: death.body,
    deathLeftHand: death.leftHand,
    deathRightHand: death.rightHand,
    workBody: work?.body,
    workLeftHand: work?.leftHand,
    workRightHand: work?.rightHand,
    projectile,
    projectileSpeed: projectile?.speed ?? GAME_SETTINGS.combat.defaultProjectileSpeed,
    projectileRadius: projectile?.radius ?? GAME_SETTINGS.combat.defaultProjectileRadius,
    background: minion.visual?.background ?? '#dcecff',
    pillWidth: minion.visual?.pillWidth ?? GAME_SETTINGS.ui.defaultMinionPillWidth,
    name: minion.name,
    description: minion.description ?? '',
    cost: minion.attributes.price,
    maxHp: minion.attributes.hp,
    attack: minion.attributes.attack,
    defense: 0,
    attackSpeed: minion.attributes.attackSpeed ?? 0.5,
    range: minion.attributes.range,
    speed: minion.attributes.speed,
    style: minion.type === 'ranged' ? (projectile?.glyph === '♥' ? 'heart-shot' : 'spark') : 'melee',
    coinsPerSecond: minion.attributes.coinsPerSecond,
  };
}

function inferTier(price: number): MinionTier {
  if (price >= 500) return 'strong';
  if (price >= 250) return 'medium';
  return 'weak';
}

function joinParts(parts: KaomojiParts) {
  return `${parts.leftHand ?? ''}${parts.body}${parts.rightHand ?? ''}`;
}

const mergedMinions = [
  ...(builtInMinions as MinionJson[]).map(validateMinionJson).map((minion) => ({ minion, source: 'built-in' as const })),
  ...loadCustomMinions().map((minion) => ({ minion, source: 'dlc' as const })),
];

export const unitDefinitions: UnitDefinition[] = mergedMinions.map(({ minion, source }) => normalizeMinion(minion, source));
export const combatMinions = unitDefinitions.filter((unit) => unit.kind === 'combat').sort((a, b) => a.cost - b.cost);
export const workerMinions = unitDefinitions.filter((unit) => unit.kind === 'worker').sort((a, b) => a.cost - b.cost);

export const getUnit = (id: string) => {
  const unit = unitDefinitions.find((definition) => definition.id === id);
  if (!unit) throw new Error(`Unknown unit: ${id}`);
  return unit;
};

function validateCastleJson(input: unknown): CastleDefinition {
  const castle = input as Partial<CastleDefinition>;
  if (!castle || typeof castle !== 'object') throw new Error('Castle must be an object.');
  if (!castle.id || !/^[a-z0-9-]+$/i.test(castle.id)) throw new Error('Castle id must be a slug.');
  if (!castle.name) throw new Error('Castle name is required.');
  if (!castle.symbol) throw new Error('Castle symbol is required.');
  for (const key of ['x', 'y', 'maxHp', 'reward', 'aggroRadius'] as const) {
    if (typeof castle[key] !== 'number' || castle[key]! < 0) throw new Error(`Castle ${key} must be a positive number.`);
  }
  if (!Array.isArray(castle.defenders)) throw new Error('Castle defenders must be an array.');
  const x = castle.x as number;
  const y = castle.y as number;
  const maxHp = castle.maxHp as number;
  const reward = castle.reward as number;
  const aggroRadius = castle.aggroRadius as number;
  return {
    id: castle.id,
    name: castle.name,
    symbol: castle.symbol,
    x,
    y,
    maxHp,
    reward,
    aggroRadius,
    guardRespawnSeconds: castle.guardRespawnSeconds,
    healPerSecond: castle.healPerSecond,
    theme: castle.theme ?? '#d9c08c',
    defenders: castle.defenders.map((defender, index) => {
      if (!defender.unitId && !defender.tier) throw new Error(`Castle defender ${index} needs unitId or tier.`);
      if (defender.tier !== undefined && defender.tier !== 'weak' && defender.tier !== 'medium' && defender.tier !== 'strong') {
        throw new Error(`Castle defender ${index} has invalid tier.`);
      }
      if (defender.type !== undefined && defender.type !== 'melee' && defender.type !== 'ranged') {
        throw new Error(`Castle defender ${index} has invalid type.`);
      }
      if (typeof defender.dx !== 'number' || typeof defender.dy !== 'number') throw new Error(`Castle defender ${index} needs numeric dx and dy.`);
      return { unitId: defender.unitId, tier: defender.tier, type: defender.type, dx: defender.dx, dy: defender.dy };
    }),
  };
}

export const castleDefinitions: CastleDefinition[] = (builtInCastles as CastleDefinition[]).map(validateCastleJson);

export const terrainProps: TerrainProp[] = Array.from({ length: GAME_SETTINGS.terrain.propCount }, (_, index) => {
  const r1 = seeded(index * 37 + 11);
  const r2 = seeded(index * 53 + 19);
  const r3 = seeded(index * 71 + 29);
  const kinds: TerrainProp['kind'][] = ['tree', 'tree', 'tree', 'rock', 'flower', 'mushroom', 'stump'];
  const padding = GAME_SETTINGS.terrain.padding;
  return {
    id: `prop-${index}`,
    kind: kinds[Math.floor(r3 * kinds.length)],
    x: padding + r1 * (WORLD_WIDTH - padding * 2),
    y: padding + r2 * (WORLD_HEIGHT - padding * 2),
    size: GAME_SETTINGS.terrain.minSize + seeded(index * 97 + 5) * (GAME_SETTINGS.terrain.maxSize - GAME_SETTINGS.terrain.minSize),
    rotation: seeded(index * 43 + 3) * Math.PI * 2,
  };
});

function seeded(seed: number) {
  const x = Math.sin(seed * 999) * 10000;
  return x - Math.floor(x);
}
