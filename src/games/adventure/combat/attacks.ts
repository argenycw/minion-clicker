import type {
  CombatSourceRef,
  CombatBehaviorInstance,
  GrowingCircleCombatAttack,
  MeleeAreaCombatAttack,
  ProjectileCombatAttack,
} from './types';
import type { StatusEffectApplication } from '../status-effects/types';

export function makeMeleeAreaCombatAttack(input: {
  id: number;
  source: CombatSourceRef;
  x: number;
  y: number;
  radius: number;
  damage: number;
  knockback: number;
  inflictions: StatusEffectApplication[];
  behaviors?: CombatBehaviorInstance[];
  releasesAt: number;
  generation?: number;
}): MeleeAreaCombatAttack {
  return {
    id: input.id,
    kind: 'melee-area',
    source: input.source,
    affinity: 'melee',
    x: input.x,
    y: input.y,
    radius: input.radius,
    damage: input.damage,
    knockback: input.knockback,
    hitTargetIds: [],
    inflictions: input.inflictions.map((application) => ({ ...application })),
    behaviors: input.behaviors?.map(copyBehaviorInstance) ?? [],
    releasesAt: input.releasesAt,
    generation: input.generation ?? 0,
  };
}

export function makeGrowingCircleCombatAttack(input: {
  id: number;
  source: CombatSourceRef;
  x: number;
  y: number;
  born: number;
  endsAt: number;
  maxRadius: number;
  damage: number;
  knockback: number;
  hitTargetIds: string[];
  behaviors?: CombatBehaviorInstance[];
  generation?: number;
}): GrowingCircleCombatAttack {
  return {
    id: input.id,
    kind: 'growing-circle',
    source: input.source,
    affinity: 'melee',
    x: input.x,
    y: input.y,
    born: input.born,
    endsAt: input.endsAt,
    maxRadius: input.maxRadius,
    damage: input.damage,
    knockback: input.knockback,
    hitTargetIds: [...input.hitTargetIds],
    inflictions: [],
    behaviors: input.behaviors?.map(copyBehaviorInstance) ?? [],
    generation: input.generation ?? 0,
  };
}

export function makeProjectileCombatAttack(input: {
  id: number;
  source: CombatSourceRef;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  remainingDistance: number;
  maxTravelDistance: number;
  penetrationRemaining: number;
  ricochetRemaining: number;
  followStrength: number;
  damage: number;
  knockback: number;
  hitTargetIds: string[];
  inflictions: StatusEffectApplication[];
  behaviors?: CombatBehaviorInstance[];
  generation?: number;
}): ProjectileCombatAttack {
  return {
    id: input.id,
    kind: 'projectile',
    source: input.source,
    affinity: 'ranged',
    x: input.x,
    y: input.y,
    vx: input.vx,
    vy: input.vy,
    radius: input.radius,
    remainingDistance: input.remainingDistance,
    maxTravelDistance: input.maxTravelDistance,
    penetrationRemaining: input.penetrationRemaining,
    ricochetRemaining: input.ricochetRemaining,
    followStrength: input.followStrength,
    damage: input.damage,
    knockback: input.knockback,
    hitTargetIds: [...input.hitTargetIds],
    inflictions: input.inflictions.map((application) => ({ ...application })),
    behaviors: input.behaviors?.map(copyBehaviorInstance) ?? [],
    generation: input.generation ?? 0,
  };
}

function copyBehaviorInstance(behavior: CombatBehaviorInstance): CombatBehaviorInstance {
  return {
    behaviorId: behavior.behaviorId,
    ownerId: behavior.ownerId,
    params: { ...behavior.params },
  };
}
