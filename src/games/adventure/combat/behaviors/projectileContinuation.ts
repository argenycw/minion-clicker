import type { CombatSubscriber, ProjectileCombatAttack } from '../types';

export function createProjectileContinuationSubscriber(input: {
  ownerId: string;
  reflect: (attack: ProjectileCombatAttack) => { vx: number; vy: number };
}): CombatSubscriber {
  return {
    id: 'behavior-augment-projectile-continuation',
    ownerId: input.ownerId,
    priority: 200,
    hooks: {
      onAttackHit: (context) => {
        const attack = context.attack;
        if (!attack || attack.kind !== 'projectile') return [];
        const hitTargetIds = context.target && context.target.kind !== 'wall'
          ? markHit(attack.hitTargetIds, context.target.kind, context.target.id)
          : attack.hitTargetIds;

        if (attack.ricochetRemaining > 0) {
          const velocity = input.reflect(attack);
          return [{
            kind: 'modifyAttack',
            attackId: attack.id,
            attack: {
              ...velocity,
              remainingDistance: attack.maxTravelDistance,
              ricochetRemaining: attack.ricochetRemaining - 1,
              hitTargetIds,
            },
          }];
        }

        if (attack.penetrationRemaining <= 0 || context.target?.kind === 'wall') return [];
        return [{
          kind: 'modifyAttack',
          attackId: attack.id,
          attack: {
            penetrationRemaining: attack.penetrationRemaining - 1,
            hitTargetIds,
          },
        }];
      },
    },
  };
}

function markHit(hitTargetIds: string[], kind: string, id: string) {
  const key = `${kind}:${id}`;
  return hitTargetIds.includes(key) ? hitTargetIds : [...hitTargetIds, key];
}
