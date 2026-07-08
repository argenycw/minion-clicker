import type { AdventureAudioCue } from '../../audio/types';
import type { CombatBehaviorInstance, PendingMeleeAttack, CombatSubscriber } from '../types';

export function createAftershockSubscriber(input: {
  ownerId: string;
  count: number;
  damageMultiplier: number;
  delayMs: number;
  spacingMultiplier: number;
  derivedBehaviors: CombatBehaviorInstance[];
  effectGlyph: string;
  effectSize?: number;
  color: string;
  audio?: { onHit?: AdventureAudioCue };
}): CombatSubscriber | undefined {
  if (input.count <= 0 || input.damageMultiplier <= 0) return undefined;
  return {
    id: 'behavior-augment-aftershock',
    ownerId: input.ownerId,
    priority: 300,
    hooks: {
      onAttackRelease: (context) => {
        const attack = context.attack;
        if (!attack || attack.kind !== 'melee-area') return [];
        const direction = normalizedVector(attack.source, attack);
        const offset = attack.radius * 2 * input.spacingMultiplier;
        return Array.from({ length: input.count }, (_, repeatIndex) => {
          const damage = Math.max(1, Math.floor(attack.damage * Math.pow(input.damageMultiplier, repeatIndex + 1)));
          const pending: PendingMeleeAttack = {
            kind: 'melee-area',
            id: -1,
            sourceId: attack.source.id,
            sourceClanId: attack.source.clanId,
            x: attack.x + direction.x * offset * (repeatIndex + 1),
            y: attack.y + direction.y * offset * (repeatIndex + 1),
            radius: attack.radius,
            damage,
            knockback: attack.knockback,
            inflictions: attack.inflictions.map((application) => ({ ...application })),
            behaviors: input.derivedBehaviors.map((behavior) => ({
              behaviorId: behavior.behaviorId,
              ownerId: behavior.ownerId,
              params: { ...behavior.params },
            })),
            releasesAt: context.now + input.delayMs * (repeatIndex + 1),
            effectGlyph: input.effectGlyph,
            effectSize: input.effectSize,
            color: input.color,
            audio: input.audio,
          };
          return { kind: 'spawnPendingAttack' as const, attack: pending };
        });
      },
    },
  };
}

function normalizedVector(from: { x: number; y: number }, to: { x: number; y: number }) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  return { x: dx / length, y: dy / length };
}
