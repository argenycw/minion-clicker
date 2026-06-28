import type { ItemRank } from '../loot';
import type { WeaponAudioDefinition, WeaponDefinition } from './types';

const weaponAudioDefaults = {
  melee: {
    onUse: 'attack-melee',
  },
  projectile: {
    onUse: 'attack-ranged',
    onHit: 'impact-flesh',
  },
} satisfies Record<WeaponDefinition['kind'], WeaponAudioDefinition>;

const weaponDefinitionsData: WeaponDefinition[] = [
  {
    id: 'melee-00',
    name: 'Bare Fist',
    rank: 'D',
    handGlyph: 'ง',
    activeGlyph: '⇀',
    kind: 'melee',
    description: 'Nothing is equipped, just attack with your fist.',
    damage: 10,
    knockback: 16,
    range: 60,
    radius: 40,
    attackSpeed: 1.5,
    color: '#4777bd',
    effectGlyph: '💥',
    effectSize: 50,
    audio: { onUse: 'weapon-bare-fist-use' },
  },
  {
    id: 'melee-01',
    name: 'Punch',
    rank: 'C',
    handGlyph: 'Ͻ',
    activeGlyph: 'Ͻ',
    kind: 'melee',
    description: '',
    damage: 13,
    knockback: 20,
    range: 70,
    radius: 40,
    attackSpeed: 1.5,
    color: '#4777bd',
    effectGlyph: '💥',
    effectSize: 50,
    audio: { onUse: 'weapon-punch-use' },
  },
  {
    id: 'melee-02',
    name: 'Claw',
    rank: 'B',
    handGlyph: 'ミ',
    activeGlyph: 'ミ',
    kind: 'melee',
    description: 'A wider melee slash for dummy testing.',
    damage: 12,
    knockback: 5,
    range: 65,
    radius: 30,
    attackSpeed: 1.8,
    color: '#d94f5f',
    effectGlyph: '✗',
    effectSize: 30,
    audio: { onUse: 'weapon-claw-use' },
  },
  {
    id: 'ranged-01',
    name: 'Spark',
    rank: 'C',
    handGlyph: '-{p}',
    activeGlyph: '╯',
    kind: 'projectile',
    description: 'Fires a small spark toward the cursor.',
    damage: 14,
    knockback: 6,
    range: 680,
    radius: 18,
    attackSpeed: 1.2,
    projectile: {
      glyph: '✧',
      speed: 620,
    },
    color: '#f0a729',
    effectGlyph: '✧',
    effectSize: 45,
    audio: { onUse: 'weapon-spark-use', onHit: 'weapon-spark-hit' },
  },
  {
    id: 'ranged-02',
    name: 'Heart Tether',
    rank: 'B',
    handGlyph: '~{p}',
    activeGlyph: '~',
    kind: 'projectile',
    description: 'A slower heavy heart shot with a larger hit radius.',
    damage: 22,
    knockback: 0,
    range: 520,
    radius: 28,
    attackSpeed: 0.72,
    projectile: {
      glyph: '♥',
      speed: 450,
    },
    color: '#e83f79',
    effectGlyph: '💗',
    effectSize: 42,
    audio: { onUse: 'weapon-heart-tether-use', onHit: 'weapon-heart-tether-hit' },
  },
];

export const weaponDefinitions: WeaponDefinition[] = weaponDefinitionsData.map(validateWeapon);

export function getWeapon(id: string) {
  const weapon = weaponDefinitions.find((item) => item.id === id);
  if (!weapon) throw new Error(`Unknown weapon: ${id}`);
  return weapon;
}

export function getWeaponAudio(weapon: Pick<WeaponDefinition, 'kind' | 'audio'>): WeaponAudioDefinition {
  const defaults = weaponAudioDefaults[weapon.kind];
  return {
    onUse: weapon.audio?.onUse ?? defaults.onUse,
    onHit: weapon.audio?.onHit ?? ('onHit' in defaults ? defaults.onHit : undefined),
  };
}

function validateWeapon(input: unknown): WeaponDefinition {
  const weapon = input as Partial<WeaponDefinition>;
  if (!weapon || typeof weapon !== 'object') throw new Error('Weapon must be an object.');
  if (!weapon.id || !/^[a-z0-9-]+$/i.test(weapon.id)) throw new Error('Weapon id must be a slug.');
  if (!weapon.name) throw new Error(`Weapon ${weapon.id} requires a name.`);
  if (!isItemRank(weapon.rank)) throw new Error(`Weapon ${weapon.id} requires a valid rank.`);
  if (!weapon.handGlyph) throw new Error(`Weapon ${weapon.id} requires a handGlyph.`);
  if (weapon.kind !== 'melee' && weapon.kind !== 'projectile') throw new Error(`Weapon ${weapon.id} has an invalid kind.`);
  for (const key of ['damage', 'range', 'radius', 'attackSpeed'] as const) {
    if (typeof weapon[key] !== 'number' || weapon[key]! <= 0) throw new Error(`Weapon ${weapon.id} requires positive ${key}.`);
  }
  if (!weapon.color) throw new Error(`Weapon ${weapon.id} requires a color.`);
  if (!weapon.effectGlyph) throw new Error(`Weapon ${weapon.id} requires an effectGlyph.`);
  if (weapon.kind === 'projectile' && (!weapon.projectile?.glyph || typeof weapon.projectile.speed !== 'number')) {
    throw new Error(`Projectile weapon ${weapon.id} requires projectile glyph and speed.`);
  }
  if ((weapon.handGlyph.includes('{p}') || weapon.activeGlyph?.includes('{p}')) && !weapon.projectile?.glyph) {
    throw new Error(`Weapon ${weapon.id} uses {p} but has no projectile glyph.`);
  }
  return {
    id: weapon.id,
    name: weapon.name,
    rank: weapon.rank,
    handGlyph: weapon.handGlyph,
    activeGlyph: weapon.activeGlyph,
    kind: weapon.kind,
    description: weapon.description ?? '',
    damage: weapon.damage!,
    knockback: weapon.knockback,
    range: weapon.range!,
    radius: weapon.radius!,
    attackSpeed: weapon.attackSpeed!,
    color: weapon.color,
    effectGlyph: weapon.effectGlyph,
    effectSize: weapon.effectSize,
    audio: weapon.audio,
    projectile: weapon.projectile,
  };
}

function isItemRank(value: unknown): value is ItemRank {
  return value === 'D' || value === 'C' || value === 'B' || value === 'A' || value === 'S' || value === 'EX';
}
