import type { AdventureEnemy } from '../enemies/types';
import type { Actor, CombatTarget, Projectile, PropParticle, WorldDrop } from '../state';
import type { WorldObject } from '../world';
import type { DungeonRect } from '../dungeons/types';
import type { EffectiveWeapon } from '../inventory/types';
import { advanceCircleAttack, resolveMeleeAttack } from './meleeRuntime';
import { advanceProjectiles } from './projectileRuntime';
import type { AdventureWorldBounds } from './collision';
import type { CombatEffect, PendingCircleAttack, PendingCombatAttack, PendingMeleeAttack } from './types';

export type CombatRuntimeInput = {
  enemies: AdventureEnemy[];
  player: Actor;
  playerClanId: AdventureEnemy['clanId'];
  worldObjects: WorldObject[];
  worldDrops: WorldDrop[];
  propParticles: PropParticle[];
  projectiles: Projectile[];
  pendingAttacks: PendingCombatAttack[];
  effects: CombatEffect[];
  combatTarget?: CombatTarget;
  nextEntityId: number;
  playerDamageReduction?: number;
  now: number;
  deltaSeconds: number;
  walkable?: DungeonRect[];
  worldBounds?: AdventureWorldBounds;
  getWeapon: (weaponInstanceId: string) => EffectiveWeapon;
};

export function tickCombatRuntime(input: CombatRuntimeInput) {
  let enemies = input.enemies;
  let player = input.player;
  let worldObjects = input.worldObjects;
  let worldDrops = input.worldDrops;
  let propParticles = input.propParticles;
  let pendingAttacks = input.pendingAttacks.filter((attack) => attack.kind === 'melee-area'
    ? input.now < attack.releasesAt
    : input.now < attack.endsAt);
  const effects = input.effects;
  let nextEntityId = input.nextEntityId;
  let combatTarget = input.combatTarget;

  for (const delayedAttack of input.pendingAttacks.filter((attack): attack is PendingMeleeAttack => attack.kind === 'melee-area' && input.now >= attack.releasesAt)) {
    const result = resolveMeleeAttack({
      id: delayedAttack.id,
      source: { id: delayedAttack.sourceId, clanId: delayedAttack.sourceClanId, x: delayedAttack.x, y: delayedAttack.y },
      hitCenter: delayedAttack,
      radius: delayedAttack.radius,
      damage: delayedAttack.damage,
      knockback: delayedAttack.knockback,
      inflictions: delayedAttack.inflictions,
      behaviors: delayedAttack.behaviors,
      effectWeapon: { ...delayedAttack, kind: 'melee' },
    }, enemies, player, worldObjects, worldDrops, propParticles, pendingAttacks, effects, nextEntityId, input.now, input.walkable, input.worldBounds);
    enemies = result.enemies;
    player = result.player;
    worldObjects = result.worldObjects;
    worldDrops = result.worldDrops;
    propParticles = result.propParticles;
    pendingAttacks = result.pendingAttacks;
    nextEntityId = result.nextEntityId;
    if (result.combatTarget) combatTarget = result.combatTarget;
  }

  for (const circleAttack of input.pendingAttacks.filter((attack): attack is PendingCircleAttack => attack.kind === 'growing-circle' && input.now < attack.endsAt)) {
    const result = advanceCircleAttack(circleAttack, enemies, player, worldObjects, worldDrops, propParticles, effects, nextEntityId, input.now, input.deltaSeconds, input.walkable, input.worldBounds);
    enemies = result.enemies;
    worldObjects = result.worldObjects;
    worldDrops = result.worldDrops;
    propParticles = result.propParticles;
    pendingAttacks = pendingAttacks.map((attack) => attack.id === circleAttack.id ? result.circleAttack : attack);
    nextEntityId = result.nextEntityId;
    if (result.combatTarget) combatTarget = result.combatTarget;
  }

  const projectileResult = advanceProjectiles({
    projectiles: input.projectiles,
    enemies,
    player,
    playerClanId: input.playerClanId,
    worldObjects,
    worldDrops,
    propParticles,
    effects,
    nextEntityId,
    playerDamageReduction: input.playerDamageReduction,
    deltaSeconds: input.deltaSeconds,
    now: input.now,
    walkable: input.walkable,
    worldBounds: input.worldBounds,
    getWeapon: input.getWeapon,
  });

  return {
    enemies: projectileResult.enemies,
    player: projectileResult.player,
    worldObjects: projectileResult.worldObjects,
    worldDrops: projectileResult.worldDrops,
    propParticles: projectileResult.propParticles,
    projectiles: projectileResult.projectiles,
    pendingAttacks,
    effects,
    nextEntityId: projectileResult.nextEntityId,
    combatTarget: projectileResult.combatTarget ?? combatTarget,
  };
}
