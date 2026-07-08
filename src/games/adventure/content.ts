import traitsJson from './traits.json';
import type { ItemRank } from './loot';
import type { StatusEffectId } from './status-effects/types';
import { getStatusEffectDefinition } from './status-effects/definitions';
import { combatBehaviorDefinitions, getCombatBehaviorDefinition, isCombatBehaviorId, type CombatBehaviorId } from './combat/behaviorRegistry';
export { getWeapon, weaponDefinitions } from './weapons/definitions';
export type { WeaponDefinition, WeaponKind } from './weapons/types';

export type TraitDefinition = {
  id: string;
  name: string;
  rank: ItemRank;
  icon: string;
  color: string;
  family: 'attack' | 'defense' | 'utility' | 'magic' | 'impact';
  weaponAffinity?: 'melee' | 'projectile';
  description: string;
  damageConstant?: number;
  damageMultiplier?: number;
  attackSpeedMultiplier?: number;
  rangeMultiplier?: number;
  radiusMultiplier?: number;
  extraProjectiles?: number;
  penetration?: number;
  follow?: number;
  ricochet?: number;
  meleeExtraHits?: number;
  shockwaveRadiusMultiplier?: number;
  shockwaveDamageMultiplier?: number;
  aftershock?: {
    count: number;
    damageMultiplier: number;
    delay: number;
    spacingMultiplier?: number;
  };
  lifeDrain?: number;
  shield?: number;
  inflict?: {
    id: StatusEffectId;
    chance?: number;
    time?: number;
  };
  behaviors: TraitBehaviorReference[];
};

export type TraitBehaviorReference = {
  id: CombatBehaviorId;
  params?: Record<string, number | string | undefined>;
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
  const behaviors = trait.behaviors ? trait.behaviors.map(validateTraitBehaviorReference) : inferTraitBehaviorReferences(trait);
  return {
    id: trait.id,
    name: trait.name,
    rank: trait.rank,
    icon: trait.icon,
    color: trait.color,
    family: trait.family ?? 'utility',
    weaponAffinity: trait.weaponAffinity,
    description: trait.description ?? '',
    damageConstant: trait.damageConstant,
    damageMultiplier: trait.damageMultiplier,
    attackSpeedMultiplier: trait.attackSpeedMultiplier,
    rangeMultiplier: trait.rangeMultiplier,
    radiusMultiplier: trait.radiusMultiplier,
    extraProjectiles: trait.extraProjectiles,
    penetration: trait.penetration,
    follow: trait.follow,
    ricochet: trait.ricochet,
    meleeExtraHits: trait.meleeExtraHits,
    shockwaveRadiusMultiplier: trait.shockwaveRadiusMultiplier,
    shockwaveDamageMultiplier: trait.shockwaveDamageMultiplier,
    aftershock: trait.aftershock ? { ...trait.aftershock } : undefined,
    lifeDrain: trait.lifeDrain,
    shield: trait.shield,
    inflict: trait.inflict ? { ...trait.inflict } : undefined,
    behaviors,
  };
}

function validateTraitBehaviorReference(input: unknown): TraitBehaviorReference {
  const reference = input as Partial<TraitBehaviorReference>;
  if (!isCombatBehaviorId(reference.id)) throw new Error(`Trait behavior requires a valid stable behavior id.`);
  const definition = getCombatBehaviorDefinition(reference.id);
  validateBehaviorParams(definition.kind, reference.params);
  return {
    id: reference.id,
    params: reference.params ? { ...reference.params } : undefined,
  };
}

function validateBehaviorParams(kind: string, params: TraitBehaviorReference['params']) {
  if (!params) return;
  const definition = getCombatBehaviorDefinitionByKind(kind);
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    if (!definition.params.includes(key)) throw new Error(`${kind} does not support param ${key}.`);
    if (key === 'statusId') {
      if (typeof value !== 'string') throw new Error(`${kind} statusId must be a string.`);
      getStatusEffectDefinition(value as StatusEffectId);
      continue;
    }
    if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`${kind} ${key} must be a finite number.`);
  }
}

function getCombatBehaviorDefinitionByKind(kind: string) {
  const behavior = combatBehaviorDefinitions.find((definition) => definition.kind === kind);
  if (!behavior) throw new Error(`Unknown behavior kind: ${kind}`);
  return behavior;
}

function inferTraitBehaviorReferences(trait: Partial<TraitDefinition>): TraitBehaviorReference[] {
  const behaviors: TraitBehaviorReference[] = [];
  if (trait.extraProjectiles) behaviors.push({ id: 'behavior-001', params: { extraProjectiles: trait.extraProjectiles } });
  if (trait.penetration) behaviors.push({ id: 'behavior-002', params: { count: trait.penetration } });
  if (trait.follow) behaviors.push({ id: 'behavior-003', params: { strength: trait.follow } });
  if (trait.ricochet) behaviors.push({ id: 'behavior-004', params: { count: trait.ricochet } });
  if (trait.meleeExtraHits) behaviors.push({ id: 'behavior-005', params: { extraHits: trait.meleeExtraHits } });
  if (trait.shockwaveRadiusMultiplier || trait.shockwaveDamageMultiplier) {
    behaviors.push({
      id: 'behavior-006',
      params: {
        radiusMultiplier: trait.shockwaveRadiusMultiplier,
        damageMultiplier: trait.shockwaveDamageMultiplier,
      },
    });
  }
  if (trait.aftershock) {
    behaviors.push({
      id: 'behavior-007',
      params: {
        count: trait.aftershock.count,
        damageMultiplier: trait.aftershock.damageMultiplier,
        delay: trait.aftershock.delay,
        spacingMultiplier: trait.aftershock.spacingMultiplier,
      },
    });
  }
  if (trait.lifeDrain) behaviors.push({ id: 'behavior-008', params: { ratio: trait.lifeDrain } });
  if (trait.shield) behaviors.push({ id: 'behavior-009', params: { ratio: trait.shield } });
  if (trait.inflict) {
    behaviors.push({
      id: 'behavior-010',
      params: {
        statusId: trait.inflict.id,
        chance: trait.inflict.chance,
        time: trait.inflict.time,
      },
    });
  }
  return behaviors;
}

function isItemRank(value: unknown): value is ItemRank {
  return value === 'D' || value === 'C' || value === 'B' || value === 'A' || value === 'S' || value === 'EX';
}
