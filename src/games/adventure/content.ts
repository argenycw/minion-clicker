import weaponsJson from './weapons.json';
import traitsJson from './traits.json';

export type WeaponKind = 'melee' | 'projectile';

export type WeaponDefinition = {
  id: string;
  name: string;
  handGlyph: string;
  bareHandGlyph?: string;
  kind: WeaponKind;
  description: string;
  damage: number;
  range: number;
  radius: number;
  attackSpeed: number;
  color: string;
  effectGlyph: string;
  effectSize?: number;
  projectile?: {
    glyph: string;
    speed: number;
  };
};

export type TraitDefinition = {
  id: string;
  name: string;
  icon: string;
  color: string;
  family: 'attack' | 'defense' | 'utility' | 'magic' | 'impact';
  description: string;
  damageMultiplier?: number;
  attackSpeedMultiplier?: number;
  rangeMultiplier?: number;
  radiusMultiplier?: number;
  extraProjectiles?: number;
};

function validateWeapon(input: unknown): WeaponDefinition {
  const weapon = input as Partial<WeaponDefinition>;
  if (!weapon || typeof weapon !== 'object') throw new Error('Weapon must be an object.');
  if (!weapon.id || !/^[a-z0-9-]+$/i.test(weapon.id)) throw new Error('Weapon id must be a slug.');
  if (!weapon.name) throw new Error(`Weapon ${weapon.id} requires a name.`);
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
  const damage = weapon.damage!;
  const range = weapon.range!;
  const radius = weapon.radius!;
  const attackSpeed = weapon.attackSpeed!;

  return {
    id: weapon.id,
    name: weapon.name,
    handGlyph: weapon.handGlyph,
    bareHandGlyph: weapon.bareHandGlyph,
    kind: weapon.kind,
    description: weapon.description ?? '',
    damage,
    range,
    radius,
    attackSpeed,
    color: weapon.color,
    effectGlyph: weapon.effectGlyph,
    effectSize: weapon.effectSize,
    projectile: weapon.projectile,
  };
}

export const weaponDefinitions: WeaponDefinition[] = (weaponsJson as WeaponDefinition[]).map(validateWeapon);
export const traitDefinitions: TraitDefinition[] = (traitsJson as TraitDefinition[]).map(validateTrait);

export function getWeapon(id: string) {
  const weapon = weaponDefinitions.find((item) => item.id === id);
  if (!weapon) throw new Error(`Unknown weapon: ${id}`);
  return weapon;
}

export function getTrait(id: string) {
  const trait = traitDefinitions.find((item) => item.id === id);
  if (!trait) throw new Error(`Unknown trait: ${id}`);
  return trait;
}

function validateTrait(input: unknown): TraitDefinition {
  const trait = input as Partial<TraitDefinition>;
  if (!trait || typeof trait !== 'object') throw new Error('Trait must be an object.');
  if (!trait.id || !/^[a-z0-9-]+$/i.test(trait.id)) throw new Error('Trait id must be a slug.');
  if (!trait.name) throw new Error(`Trait ${trait.id} requires a name.`);
  if (!trait.icon) throw new Error(`Trait ${trait.id} requires an icon.`);
  if (!trait.color) throw new Error(`Trait ${trait.id} requires a color.`);
  return {
    id: trait.id,
    name: trait.name,
    icon: trait.icon,
    color: trait.color,
    family: trait.family ?? 'utility',
    description: trait.description ?? '',
    damageMultiplier: trait.damageMultiplier,
    attackSpeedMultiplier: trait.attackSpeedMultiplier,
    rangeMultiplier: trait.rangeMultiplier,
    radiusMultiplier: trait.radiusMultiplier,
    extraProjectiles: trait.extraProjectiles,
  };
}
