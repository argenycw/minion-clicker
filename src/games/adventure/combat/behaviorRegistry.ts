export type CombatBehaviorId =
  | 'behavior-001'
  | 'behavior-002'
  | 'behavior-003'
  | 'behavior-004'
  | 'behavior-005'
  | 'behavior-006'
  | 'behavior-007'
  | 'behavior-008'
  | 'behavior-009'
  | 'behavior-010';

export type CombatBehaviorAffinity = 'melee' | 'projectile' | 'any';

export type CombatBehaviorDefinition = {
  id: CombatBehaviorId;
  kind: string;
  affinity: CombatBehaviorAffinity;
  name: string;
  params: readonly string[];
};

export const combatBehaviorDefinitions: CombatBehaviorDefinition[] = [
  { id: 'behavior-001', kind: 'scatter', affinity: 'projectile', name: 'Scatter', params: ['extraProjectiles'] },
  { id: 'behavior-002', kind: 'penetrate', affinity: 'projectile', name: 'Penetrate', params: ['count'] },
  { id: 'behavior-003', kind: 'follow', affinity: 'projectile', name: 'Follow', params: ['strength'] },
  { id: 'behavior-004', kind: 'ricochet', affinity: 'projectile', name: 'Ricochet', params: ['count'] },
  { id: 'behavior-005', kind: 'multi-hit', affinity: 'melee', name: 'Multi-hit', params: ['extraHits'] },
  { id: 'behavior-006', kind: 'shockwave', affinity: 'melee', name: 'Shockwave', params: ['radiusMultiplier', 'damageMultiplier'] },
  { id: 'behavior-007', kind: 'aftershock', affinity: 'melee', name: 'Aftershock', params: ['count', 'damageMultiplier', 'delay', 'spacingMultiplier'] },
  { id: 'behavior-008', kind: 'life-drain', affinity: 'any', name: 'Life Drain', params: ['ratio'] },
  { id: 'behavior-009', kind: 'shield', affinity: 'any', name: 'Shield', params: ['ratio'] },
  { id: 'behavior-010', kind: 'inflict-status', affinity: 'any', name: 'Inflict Status', params: ['statusId', 'chance', 'time'] },
];

export function getCombatBehaviorDefinition(id: CombatBehaviorId) {
  const definition = combatBehaviorDefinitions.find((behavior) => behavior.id === id);
  if (!definition) throw new Error(`Unknown combat behavior: ${id}`);
  return definition;
}

export function isCombatBehaviorId(value: unknown): value is CombatBehaviorId {
  return typeof value === 'string' && combatBehaviorDefinitions.some((behavior) => behavior.id === value);
}
