import type { CombatSubscriber, ProjectileCombatAttack } from '../types';

export function createScatterSubscriber(input: {
  ownerId: string;
  extraProjectiles: number;
  spreadStep: number;
}): CombatSubscriber | undefined {
  if (input.extraProjectiles <= 0) return undefined;
  return {
    id: 'behavior-augment-scatter',
    ownerId: input.ownerId,
    priority: 100,
    hooks: {
      onAttackRelease: (context) => {
        const attack = context.attack;
        if (!attack || attack.kind !== 'projectile') return [];
        const count = 1 + input.extraProjectiles;
        const speed = Math.hypot(attack.vx, attack.vy);
        if (speed <= 0) return [];
        const baseAngle = Math.atan2(attack.vy, attack.vx);
        const offset = ((count - 1) * input.spreadStep) / 2;
        return Array.from({ length: count }, (_, index) => {
          const angle = baseAngle - offset + index * input.spreadStep;
          const velocity = {
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
          };
          if (index === 0) {
            return {
              kind: 'modifyAttack' as const,
              attackId: attack.id,
              attack: velocity,
            };
          }
          return {
            kind: 'spawnAttack' as const,
            attack: {
              ...attack,
              ...velocity,
              id: -1,
              hitTargetIds: [],
              inflictions: attack.inflictions.map((application) => ({ ...application })),
            } satisfies ProjectileCombatAttack,
          };
        });
      },
    },
  };
}
