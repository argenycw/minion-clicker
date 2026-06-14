import { combatMinions } from '../../../shared/content';
import type { AdventureEnemyDefinition } from './types';

export const adventureEnemyDefinitions: AdventureEnemyDefinition[] = combatMinions.map((minion) => ({
  id: minion.id,
  name: minion.name,
  body: minion.body,
  leftHand: minion.leftHand,
  rightHand: minion.rightHand,
  deathBody: minion.deathBody,
  deathLeftHand: minion.deathLeftHand,
  deathRightHand: minion.deathRightHand,
  color: minion.background,
  pillWidth: Math.max(48, Math.round(minion.pillWidth * 0.8)),
  maxHp: Math.max(45, Math.round(minion.maxHp * 0.8)),
  attack: Math.max(4, Math.round(minion.attack * 0.55)),
  speed: Math.max(55, minion.speed * 0.72),
  attackSpeed: Math.max(0.35, minion.attackSpeed),
  attackRange: Math.max(48, Math.min(90, minion.range * 0.45)),
  aggroRadius: 260 + Math.min(220, minion.cost * 0.22),
}));

export function getAdventureEnemyDefinition(id: string) {
  const definition = adventureEnemyDefinitions.find((enemy) => enemy.id === id);
  if (!definition) throw new Error(`Unknown Adventure enemy: ${id}`);
  return definition;
}
