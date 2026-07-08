import type { CombatSubscriber } from '../types';

export function createMultiHitSubscriber(input: {
  ownerId: string;
  extraHits: number;
}): CombatSubscriber | undefined {
  if (input.extraHits <= 0) return undefined;
  return {
    id: 'behavior-augment-multihit',
    ownerId: input.ownerId,
    priority: 100,
    hooks: {
      onAttackHit: (context) => {
        if (!context.damage || !context.target || context.attack?.affinity !== 'melee') return [];
        return Array.from({ length: input.extraHits }, () => ({
          kind: 'damageTarget' as const,
          damage: {
            ...context.damage!,
            target: context.target!,
            knockback: 0,
          },
        }));
      },
    },
  };
}
