import traitsJson from './traits.json';
import type { ItemRank } from './loot';
import type { StatusEffectId } from './status-effects/types';
import { getStatusEffectDefinition } from './status-effects/definitions';
export { getWeapon, weaponDefinitions } from './weapons/definitions';
export type { WeaponDefinition, WeaponKind } from './weapons/types';

export type TraitDefinition = {
  id: string;
  name: string;
  rank: ItemRank;
  icon: string;
  color: string;
  family: 'attack' | 'defense' | 'utility' | 'magic' | 'impact';
  description: string;
  damageConstant?: number;
  damageMultiplier?: number;
  attackSpeedMultiplier?: number;
  rangeMultiplier?: number;
  radiusMultiplier?: number;
  extraProjectiles?: number;
  lifeDrain?: number;
  shield?: number;
  inflict?: {
    id: StatusEffectId;
    chance?: number;
    time?: number;
  };
};

export const traitDefinitions: TraitDefinition[] = (traitsJson as TraitDefinition[]).map(validateTrait);

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
  if (!isItemRank(trait.rank)) throw new Error(`Trait ${trait.id} requires a valid rank.`);
  if (!trait.icon) throw new Error(`Trait ${trait.id} requires an icon.`);
  if (!trait.color) throw new Error(`Trait ${trait.id} requires a color.`);
  if (trait.inflict) {
    getStatusEffectDefinition(trait.inflict.id);
    if (trait.inflict.chance !== undefined && (!Number.isFinite(trait.inflict.chance) || trait.inflict.chance < 0 || trait.inflict.chance > 1)) {
      throw new Error(`Trait ${trait.id} inflict chance must be between 0 and 1.`);
    }
    if (trait.inflict.time !== undefined && (!Number.isFinite(trait.inflict.time) || trait.inflict.time <= 0)) {
      throw new Error(`Trait ${trait.id} inflict time must be positive.`);
    }
  }
  return {
    id: trait.id,
    name: trait.name,
    rank: trait.rank,
    icon: trait.icon,
    color: trait.color,
    family: trait.family ?? 'utility',
    description: trait.description ?? '',
    damageConstant: trait.damageConstant,
    damageMultiplier: trait.damageMultiplier,
    attackSpeedMultiplier: trait.attackSpeedMultiplier,
    rangeMultiplier: trait.rangeMultiplier,
    radiusMultiplier: trait.radiusMultiplier,
    extraProjectiles: trait.extraProjectiles,
    lifeDrain: trait.lifeDrain,
    shield: trait.shield,
    inflict: trait.inflict ? { ...trait.inflict } : undefined,
  };
}

function isItemRank(value: unknown): value is ItemRank {
  return value === 'D' || value === 'C' || value === 'B' || value === 'A' || value === 'S' || value === 'EX';
}
