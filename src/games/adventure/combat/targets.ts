import type { CombatTargetKind, CombatTargetRef } from './types';

export function getCombatTargetKey(target: CombatTargetRef) {
  return `${target.kind}:${target.id}`;
}

export function makeCombatTarget(kind: CombatTargetKind, id: string): CombatTargetRef {
  return { kind, id };
}

export function hasCombatTarget(targetKeys: string[], target: CombatTargetRef) {
  return targetKeys.includes(getCombatTargetKey(target));
}

export function markCombatTarget(targetKeys: string[], target: CombatTargetRef) {
  const key = getCombatTargetKey(target);
  return targetKeys.includes(key) ? targetKeys : [...targetKeys, key];
}
