import type { StatusEffectDefinition, StatusEffectId } from './types';

export const statusEffectDefinitions: StatusEffectDefinition[] = [
  {
    id: 'debuff-01',
    kind: 'debuff',
    name: 'Poison I',
    description: 'Loses 1% of maximum HP every 3 seconds.',
    icon: '☠',
    color: '#7254ba',
    behaviors: [{ kind: 'damage-percent-max-hp', amount: 0.01, intervalTicks: 6 }],
  },
  {
    id: 'debuff-02',
    kind: 'debuff',
    name: 'Burnt I',
    description: 'Loses 2 HP every second.',
    icon: '♨',
    color: '#d86135',
    behaviors: [{ kind: 'damage-constant', amount: 2, intervalTicks: 2 }],
  },
  {
    id: 'debuff-03',
    kind: 'debuff',
    name: 'Frozen I',
    description: 'Movement speed is reduced by 10%.',
    icon: '❄',
    color: '#4a91c4',
    behaviors: [{ kind: 'movement-speed-multiplier', multiplier: 0.9 }],
  },
  {
    id: 'debuff-04',
    kind: 'debuff',
    name: 'Slow I',
    description: 'Attack speed is reduced by 10%.',
    icon: '◷',
    color: '#8865b3',
    behaviors: [{ kind: 'attack-speed-multiplier', multiplier: 0.9 }],
  },
];

export function getStatusEffectDefinition(id: StatusEffectId) {
  const definition = statusEffectDefinitions.find((candidate) => candidate.id === id);
  if (!definition) throw new Error(`Unknown status effect: ${id}`);
  return definition;
}
