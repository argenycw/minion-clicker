import type { CombatSubscriber } from '../types';

export function createFollowSubscriber(input: {
  ownerId: string;
  strength: number;
}): CombatSubscriber | undefined {
  if (input.strength <= 0) return undefined;
  return {
    id: 'behavior-augment-follow',
    ownerId: input.ownerId,
    priority: 100,
    hooks: {
      onAttackStep: (context) => {
        const attack = context.attack;
        if (!attack || attack.kind !== 'projectile' || input.strength <= 0) return [];
        const target = context.seekTargets
          ?.filter((candidate) => !attack.hitTargetIds.includes(`enemy:${candidate.id}`))
          .sort((a, b) => Math.hypot(a.x - attack.x, a.y - attack.y) - Math.hypot(b.x - attack.x, b.y - attack.y))[0];
        if (!target) return [];
        const deltaSeconds = context.deltaSeconds ?? 0;
        const speed = Math.hypot(attack.vx, attack.vy);
        if (speed <= 0 || deltaSeconds <= 0) return [];
        const currentAngle = Math.atan2(attack.vy, attack.vx);
        const desiredAngle = Math.atan2(target.y - attack.y, target.x - attack.x);
        const maxTurn = input.strength * deltaSeconds;
        const angle = currentAngle + clampAngle(desiredAngle - currentAngle, -maxTurn, maxTurn);
        return [{
          kind: 'modifyAttack',
          attackId: attack.id,
          attack: {
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
          },
        }];
      },
    },
  };
}

function clampAngle(value: number, min: number, max: number) {
  let angle = value;
  while (angle > Math.PI) angle -= Math.PI * 2;
  while (angle < -Math.PI) angle += Math.PI * 2;
  return Math.max(min, Math.min(max, angle));
}
