import type { AdventureAudioCue } from '../../audio/types';
import type { CombatSubscriber } from '../types';

export function createShockwaveSubscriber(input: {
  ownerId: string;
  radius: number;
  damage: number;
  color: string;
  audioCue?: AdventureAudioCue;
}): CombatSubscriber | undefined {
  if (input.radius <= 0 || input.damage <= 0) return undefined;
  return {
    id: 'behavior-augment-shockwave',
    ownerId: input.ownerId,
    priority: 200,
    hooks: {
      onAttackRelease: (context) => {
        const attack = context.attack;
        if (!attack || attack.kind !== 'melee-area') return [];
        return [
          {
            kind: 'spawnVisualEffect' as const,
            effect: {
              effectKind: 'shockwave',
              x: attack.x,
              y: attack.y,
              glyph: '',
              color: input.color,
              size: input.radius,
              audioCue: input.audioCue,
            },
          },
          {
            kind: 'spawnPendingAttack' as const,
            attack: {
              kind: 'growing-circle',
              id: -1,
              sourceId: attack.source.id,
              sourceClanId: attack.source.clanId,
              x: attack.x,
              y: attack.y,
              born: context.now,
              endsAt: context.now + 520,
              maxRadius: input.radius,
              damage: input.damage,
              knockback: attack.knockback,
              hitTargetIds: [],
              color: input.color,
            },
          },
        ];
      },
    },
  };
}
