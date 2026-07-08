import { validateImportedBehaviorReferences } from './importValidation';
import { dispatchCombatEvent } from './pipeline';
import type { CombatSubscriber } from './types';

export function runCombatPipelineSmokeTests() {
  const events: string[] = [];
  const subscribers: CombatSubscriber[] = [
    { id: 'behavior-002', ownerId: 'trait-02', priority: 10, hooks: { onAttackRelease: () => { events.push('b'); return []; } } },
    { id: 'behavior-001', ownerId: 'trait-01', priority: 10, hooks: { onAttackRelease: () => { events.push('a'); return []; } } },
  ];
  dispatchCombatEvent({}, 'onAttackRelease', { now: 0 }, subscribers);
  if (events.join(',') !== 'a,b') throw new Error('Combat subscriber ordering is unstable.');

  const valid = validateImportedBehaviorReferences([{ id: 'behavior-001', params: { extraProjectiles: 2 } }], 'projectile');
  if (valid.diagnostics.length > 0 || valid.behaviors.length !== 1) throw new Error('Valid imported combat behavior was rejected.');

  const invalid = validateImportedBehaviorReferences([{ id: 'behavior-006', params: { radiusMultiplier: 2 } }], 'projectile');
  if (!invalid.diagnostics.some((diagnostic) => diagnostic.code === 'invalid-affinity')) {
    throw new Error('Invalid combat behavior affinity was not reported.');
  }
}
