import type { EffectiveWeapon } from '../inventory/types';
import type { StatusEffectApplication, StatusEffectId } from '../status-effects/types';
import type { CombatBehaviorId } from './behaviorRegistry';
import type { CombatBehaviorInstance } from './types';

export function makeMeleeBehaviorInstancesFromWeapon(weapon: EffectiveWeapon, attackDamage: number): CombatBehaviorInstance[] {
  const behaviors: CombatBehaviorInstance[] = [];
  if (weapon.meleeExtraHits > 0) {
    behaviors.push(makeBehaviorInstance('behavior-005', weapon.instanceId, {
      extraHits: weapon.meleeExtraHits,
    }));
  }
  if (weapon.shockwaveRadiusMultiplier > 0 && weapon.shockwaveDamageMultiplier > 0) {
    behaviors.push(makeBehaviorInstance('behavior-006', weapon.instanceId, {
      radiusMultiplier: weapon.shockwaveRadiusMultiplier,
      radius: weapon.radius * weapon.shockwaveRadiusMultiplier,
      damageMultiplier: weapon.shockwaveDamageMultiplier,
    }));
  }
  if (weapon.aftershockCount > 0 && weapon.aftershockDamageMultiplier > 0) {
    behaviors.push(makeBehaviorInstance('behavior-007', weapon.instanceId, {
      count: weapon.aftershockCount,
      damageMultiplier: weapon.aftershockDamageMultiplier,
      delay: weapon.aftershockDelayMs,
      spacingMultiplier: weapon.aftershockSpacingMultiplier,
    }));
  }
  addCommonBehaviorInstances(behaviors, weapon);
  return behaviors;
}

export function makeProjectileBehaviorInstancesFromWeapon(weapon: EffectiveWeapon): CombatBehaviorInstance[] {
  const behaviors: CombatBehaviorInstance[] = [];
  if (weapon.projectileCount > 1) {
    behaviors.push(makeBehaviorInstance('behavior-001', weapon.instanceId, {
      extraProjectiles: weapon.projectileCount - 1,
    }));
  }
  if (weapon.penetration > 0) {
    behaviors.push(makeBehaviorInstance('behavior-002', weapon.instanceId, {
      count: weapon.penetration,
    }));
  }
  if (weapon.follow > 0) {
    behaviors.push(makeBehaviorInstance('behavior-003', weapon.instanceId, {
      strength: weapon.follow,
    }));
  }
  if (weapon.ricochet > 0) {
    behaviors.push(makeBehaviorInstance('behavior-004', weapon.instanceId, {
      count: weapon.ricochet,
    }));
  }
  addCommonBehaviorInstances(behaviors, weapon);
  return behaviors;
}

export function makeBehaviorInstance(
  behaviorId: CombatBehaviorId,
  ownerId: string,
  params: CombatBehaviorInstance['params'] = {},
): CombatBehaviorInstance {
  return {
    behaviorId,
    ownerId,
    params: { ...params },
  };
}

export function copyBehaviorInstances(behaviors: CombatBehaviorInstance[]) {
  return behaviors.map((behavior) => makeBehaviorInstance(behavior.behaviorId, behavior.ownerId, behavior.params));
}

export function withoutBehaviorInstances(behaviors: CombatBehaviorInstance[], excludedIds: CombatBehaviorId[]) {
  return behaviors
    .filter((behavior) => !excludedIds.includes(behavior.behaviorId))
    .map((behavior) => makeBehaviorInstance(behavior.behaviorId, behavior.ownerId, behavior.params));
}

export function getBehaviorNumber(
  behavior: CombatBehaviorInstance,
  name: string,
  fallback = 0,
) {
  const value = behavior.params[name];
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function getBehaviorString(
  behavior: CombatBehaviorInstance,
  name: string,
  fallback = '',
) {
  const value = behavior.params[name];
  return typeof value === 'string' ? value : fallback;
}

export function getBehaviorInstancesById(behaviors: CombatBehaviorInstance[], behaviorId: CombatBehaviorId) {
  return behaviors.filter((behavior) => behavior.behaviorId === behaviorId);
}

export function getStatusInflictionsFromBehaviors(behaviors: CombatBehaviorInstance[]): StatusEffectApplication[] {
  return getBehaviorInstancesById(behaviors, 'behavior-010')
    .map((behavior): StatusEffectApplication | undefined => {
      const statusId = getBehaviorString(behavior, 'statusId') as StatusEffectId;
      return statusId
        ? {
          statusId,
          chance: getBehaviorNumber(behavior, 'chance'),
          durationMs: getBehaviorNumber(behavior, 'time') || undefined,
        }
        : undefined;
    })
    .filter((application): application is StatusEffectApplication => application !== undefined);
}

function addCommonBehaviorInstances(behaviors: CombatBehaviorInstance[], weapon: EffectiveWeapon) {
  if (weapon.lifeDrain > 0) {
    behaviors.push(makeBehaviorInstance('behavior-008', weapon.instanceId, {
      ratio: weapon.lifeDrain,
    }));
  }
  if (weapon.shield > 0) {
    behaviors.push(makeBehaviorInstance('behavior-009', weapon.instanceId, {
      ratio: weapon.shield,
    }));
  }
  for (const [index, infliction] of weapon.inflictions.entries()) {
    behaviors.push(statusInflictionToBehavior(weapon.instanceId, infliction, index));
  }
}

function statusInflictionToBehavior(ownerId: string, infliction: StatusEffectApplication, index: number) {
  return makeBehaviorInstance('behavior-010', `${ownerId}:status-${index + 1}`, {
    statusId: infliction.statusId,
    chance: infliction.chance,
    time: infliction.durationMs,
  });
}
