import { getStatusEffectDefinition } from './definitions';
import type { StatusEffectApplication, StatusEffectInstance, StatusEffectTarget, StatusTickEvent } from './types';

export const STATUS_TICK_MS = 500;

// Selectors

export function getStatusModifiers(instances: StatusEffectInstance[] | undefined) {
  return (instances ?? []).reduce((modifiers, instance) => {
    const definition = getStatusEffectDefinition(instance.definitionId);
    for (const behavior of definition.behaviors) {
      if (behavior.kind === 'movement-speed-multiplier') modifiers.movementSpeedMultiplier *= behavior.multiplier;
      if (behavior.kind === 'attack-speed-multiplier') modifiers.attackSpeedMultiplier *= behavior.multiplier;
    }
    return modifiers;
  }, { movementSpeedMultiplier: 1, attackSpeedMultiplier: 1 });
}

// Operations

export function applyStatusEffect<T extends StatusEffectTarget>(target: T, application: StatusEffectApplication, now: number): T {
  getStatusEffectDefinition(application.statusId);
  const instance: StatusEffectInstance = {
    definitionId: application.statusId,
    appliedAt: now,
    nextTickAt: now + STATUS_TICK_MS,
    ticksElapsed: 0,
    expiresAt: application.durationMs === undefined ? undefined : now + application.durationMs,
  };
  const current = target.statusEffects ?? [];
  return {
    ...target,
    statusEffects: current.some((effect) => effect.definitionId === application.statusId)
      ? current.map((effect) => effect.definitionId === application.statusId ? instance : effect)
      : [...current, instance],
  };
}

export function tickStatusEffects<T extends StatusEffectTarget>(target: T, now: number): { target: T; events: StatusTickEvent[] } {
  let hp = target.hp;
  const events: StatusTickEvent[] = [];
  const statusEffects: StatusEffectInstance[] = [];

  for (const current of target.statusEffects ?? []) {
    const expiresAt = current.expiresAt;
    const tickUntil = expiresAt === undefined ? now : Math.min(now, expiresAt);
    let ticksElapsed = current.ticksElapsed;
    let nextTickAt = current.nextTickAt;
    const definition = getStatusEffectDefinition(current.definitionId);

    while (nextTickAt <= tickUntil) {
      ticksElapsed += 1;
      for (const behavior of definition.behaviors) {
        if (!('intervalTicks' in behavior) || ticksElapsed % behavior.intervalTicks !== 0) continue;
        const requested = behavior.kind === 'damage-percent-max-hp' || behavior.kind === 'heal-percent-max-hp'
          ? Math.max(1, Math.floor(target.maxHp * behavior.amount))
          : Math.max(1, behavior.amount);
        const isDamage = behavior.kind === 'damage-percent-max-hp' || behavior.kind === 'damage-constant';
        const amount = isDamage ? Math.min(hp, requested) : Math.min(target.maxHp - hp, requested);
        if (amount <= 0) continue;
        hp = isDamage ? hp - amount : hp + amount;
        events.push({ definitionId: current.definitionId, kind: isDamage ? 'damage' : 'heal', amount });
      }
      nextTickAt += STATUS_TICK_MS;
    }

    if (expiresAt === undefined || now < expiresAt) statusEffects.push({ ...current, ticksElapsed, nextTickAt });
  }

  return { target: { ...target, hp, statusEffects }, events };
}
