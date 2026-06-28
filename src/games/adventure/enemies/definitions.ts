import { combatMinions } from '../../../shared/content';
import type { AdventureEnemyDefinition } from './types';

export const adventureEnemyDefinitions: AdventureEnemyDefinition[] = combatMinions.map((minion) => ({
  ...(() => {
    const alertRadius = 210 + Math.min(170, minion.cost * 0.16);
    const chaseRadius = alertRadius + 210 + Math.min(190, minion.cost * 0.14);
    return { alertRadius, chaseRadius, aggroRadius: chaseRadius };
  })(),
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
  knockback: minion.type === 'ranged' ? 34 : 52,
  speed: Math.max(55, minion.speed * 0.72),
  attackSpeed: Math.max(0.35, minion.attackSpeed),
  attackRange: minion.type === 'ranged'
    ? Math.max(140, minion.range * 0.82)
    : Math.max(48, Math.min(90, minion.range * 0.45)),
  attackKind: minion.type === 'ranged' ? 'ranged' : 'melee',
  projectile: minion.projectile,
  projectileSpeed: minion.projectileSpeed,
  projectileRadius: minion.projectileRadius,
  loot: {
    coin: { probability: 0.82, amount: [2, Math.max(3, Math.ceil(minion.cost / 35))] },
    loot: [
      { itemId: 'item-01', probability: 0.4 },
      { itemId: 'item-02', probability: 0.4 },
      { itemId: 'item-03', probability: 0.1 },
      { itemId: 'item-04', probability: 0.1 },
    ],
  },
}));

export function getAdventureEnemyDefinition(id: string) {
  const definition = adventureEnemyDefinitions.find((enemy) => enemy.id === id);
  if (!definition) throw new Error(`Unknown Adventure enemy: ${id}`);
  return definition;
}
