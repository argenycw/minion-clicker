import type { CombatEffect } from './types';

export function makeDamageEffect(id: number, x: number, y: number, damage: number, born: number): CombatEffect {
  return { id, kind: 'damage', x, y, glyph: `${Math.ceil(damage)}`, color: '#c3293a', born };
}

export function makeHealEffect(id: number, x: number, y: number, amount: number, born: number): CombatEffect {
  return { id, kind: 'heal', x, y, glyph: `${Math.ceil(amount)}`, color: '#2f9e57', born };
}

export function getQueuedDamageBorn(effects: CombatEffect[], x: number, y: number, now: number) {
  return getQueuedTextEffectBorn(effects, x, y, now, 'damage');
}

export function getQueuedTextEffectBorn(effects: CombatEffect[], x: number, y: number, now: number, kind: 'damage' | 'heal') {
  const queueIndex = effects.filter(
    (effect) => effect.kind === kind && Math.hypot(effect.x - x, effect.y - y) < 24 && now - effect.born < 850,
  ).length;
  return now + queueIndex * 95;
}
