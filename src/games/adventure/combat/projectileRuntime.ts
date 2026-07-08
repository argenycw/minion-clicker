import type { AdventureEnemy } from '../enemies/types';
import type { Actor, HandSlot, Projectile, PropParticle, WorldDrop } from '../state';
import type { WorldObject } from '../world';
import type { DungeonRect } from '../dungeons/types';
import type { EffectiveWeapon } from '../inventory/types';
import { getWeaponAudio } from '../weapons/definitions';
import { makeProjectileCombatAttack } from './attacks';
import {
  getBehaviorInstancesById,
  getBehaviorNumber,
  getStatusInflictionsFromBehaviors,
  makeProjectileBehaviorInstancesFromWeapon,
} from './behaviorInstances';
import { createFollowSubscriber } from './behaviors/follow';
import { createProjectileContinuationSubscriber } from './behaviors/projectileContinuation';
import { createScatterSubscriber } from './behaviors/scatter';
import { areClansHostile } from './clans';
import {
  getProjectileActorHitPoint,
  getProjectileDungeonWallHit,
  getProjectileObjectHitPoint,
  isInsideWorld,
  normalizedVector,
  projectileIntersectsActorPath,
  projectileIntersectsObjectPath,
  type AdventureWorldBounds,
} from './collision';
import { applyCombatTargetDamage, applyWeaponSustain } from './damageRuntime';
import { makeHitEffect, makeProjectileHitEffect } from './effects';
import { dispatchCombatEvent } from './pipeline';
import { hasCombatTarget } from './targets';
import type { CombatBehaviorInstance, CombatEffect, CombatPatch, CombatSubscriber, ProjectileCombatAttack } from './types';

export type ProjectileRuntimeInput = {
  projectiles: Projectile[];
  enemies: AdventureEnemy[];
  player: Actor;
  playerClanId: AdventureEnemy['clanId'];
  worldObjects: WorldObject[];
  worldDrops: WorldDrop[];
  propParticles: PropParticle[];
  effects: CombatEffect[];
  nextEntityId: number;
  playerDamageReduction?: number;
  deltaSeconds: number;
  now: number;
  walkable?: DungeonRect[];
  worldBounds?: AdventureWorldBounds;
  getWeapon: (weaponInstanceId: string) => EffectiveWeapon;
};

export function advanceProjectiles(input: ProjectileRuntimeInput) {
  let enemies = input.enemies;
  let player = input.player;
  let worldObjects = input.worldObjects;
  let worldDrops = input.worldDrops;
  let propParticles = input.propParticles;
  const effects = input.effects;
  let nextEntityId = input.nextEntityId;
  let combatTarget: { kind: 'enemy' | 'prop'; id: string } | undefined;
  const projectiles: Projectile[] = [];

  for (const projectile of input.projectiles) {
    const movingProjectile = applyProjectileStepBehaviors(projectile, enemies, player, input.deltaSeconds, input.now);
    const distance = Math.hypot(movingProjectile.vx, movingProjectile.vy) * input.deltaSeconds;
    const next = {
      ...movingProjectile,
      x: movingProjectile.x + movingProjectile.vx * input.deltaSeconds,
      y: movingProjectile.y + movingProjectile.vy * input.deltaSeconds,
      remainingDistance: movingProjectile.remainingDistance - distance,
    };
    const dungeonWallHit = input.walkable ? getProjectileDungeonWallHit(movingProjectile, next, input.walkable) : undefined;
    if (dungeonWallHit) {
      effects.push(makeProjectileHitEffect(nextEntityId, dungeonWallHit.point.x, dungeonWallHit.point.y, next, input.now, next.owner === 'enemy' ? 'impact-prop' : undefined));
      nextEntityId += 1;
      const continued = continueProjectileAfterHit(next, dungeonWallHit.point, dungeonWallHit.reflectTarget, 'wall', 'dungeon-wall');
      if (continued && isInsideWorld(continued.x, continued.y, input.worldBounds)) projectiles.push(continued);
      continue;
    }
    const blockingObjectHit = worldObjects.find((object) => object.blocking && object.hp !== 0 && !hasProjectileHitTarget(next, 'prop', object.id) && projectileIntersectsObjectPath(movingProjectile, next, object));
    if (blockingObjectHit) {
      const hitPoint = getProjectileObjectHitPoint(movingProjectile, next, blockingObjectHit) ?? next;
      effects.push(makeProjectileHitEffect(nextEntityId, hitPoint.x, hitPoint.y, next, input.now, next.owner === 'enemy' ? 'impact-prop' : undefined));
      nextEntityId += 1;
      if (next.owner === 'enemy') {
        if (blockingObjectHit.hp !== undefined && blockingObjectHit.hp > 0) {
          const result = applyCombatTargetDamage({
            target: { kind: 'prop', id: blockingObjectHit.id },
            damage: next.damage,
            now: input.now,
            walkable: input.walkable,
            worldBounds: input.worldBounds,
          }, { enemies, player, worldObjects, worldDrops, propParticles, effects, nextEntityId, playerDamageReduction: input.playerDamageReduction });
          worldObjects = result.worldObjects;
          worldDrops = result.worldDrops;
          propParticles = result.propParticles;
          nextEntityId = result.nextEntityId;
        }
        continue;
      }
      if (blockingObjectHit.hp === undefined || blockingObjectHit.hp <= 0) continue;
      combatTarget = { kind: 'prop', id: blockingObjectHit.id };
      const result = applyCombatTargetDamage({
        target: { kind: 'prop', id: blockingObjectHit.id },
        damage: next.damage,
        now: input.now,
        walkable: input.walkable,
        worldBounds: input.worldBounds,
      }, { enemies, player, worldObjects, worldDrops, propParticles, effects, nextEntityId, playerDamageReduction: input.playerDamageReduction });
      worldObjects = result.worldObjects;
      worldDrops = result.worldDrops;
      propParticles = result.propParticles;
      nextEntityId = result.nextEntityId;
      ({ player, nextEntityId } = applyWeaponSustain(player, getSustainFromBehaviors(next.behaviors), next.damage, effects, nextEntityId, input.now));
      const continued = continueProjectileAfterHit(next, hitPoint, blockingObjectHit, 'prop', blockingObjectHit.id);
      if (continued && isInsideWorld(continued.x, continued.y, input.worldBounds)) projectiles.push(continued);
      continue;
    }
    if (next.owner === 'enemy') {
      const objectHit = worldObjects.find((object) => object.hp !== undefined && object.hp > 0 && !hasProjectileHitTarget(next, 'prop', object.id) && projectileIntersectsObjectPath(movingProjectile, next, object));
      if (objectHit) {
        const hitPoint = getProjectileObjectHitPoint(movingProjectile, next, objectHit) ?? next;
        effects.push(makeProjectileHitEffect(nextEntityId, hitPoint.x, hitPoint.y, next, input.now, 'impact-prop'));
        nextEntityId += 1;
        const result = applyCombatTargetDamage({
          target: { kind: 'prop', id: objectHit.id },
          damage: next.damage,
          now: input.now,
          walkable: input.walkable,
          worldBounds: input.worldBounds,
        }, { enemies, player, worldObjects, worldDrops, propParticles, effects, nextEntityId, playerDamageReduction: input.playerDamageReduction });
        worldObjects = result.worldObjects;
        worldDrops = result.worldDrops;
        propParticles = result.propParticles;
        nextEntityId = result.nextEntityId;
        continue;
      }
      const enemyHit = enemies.find((enemy) => enemy.hp > 0
        && areClansHostile({ id: next.sourceId ?? String(next.id), clanId: next.sourceClanId }, { id: enemy.id, clanId: enemy.clanId })
        && !hasProjectileHitTarget(next, 'enemy', enemy.id)
        && projectileIntersectsActorPath(movingProjectile, next, enemy));
      if (enemyHit) {
        const hitPoint = getProjectileActorHitPoint(movingProjectile, next, enemyHit) ?? next;
        effects.push(makeProjectileHitEffect(nextEntityId, hitPoint.x, hitPoint.y, next, input.now, 'impact-flesh'));
        nextEntityId += 1;
        const result = applyCombatTargetDamage({
          target: { kind: 'enemy', id: enemyHit.id },
          damage: next.damage,
          knockbackSource: next,
          knockbackAmount: next.knockback,
          now: input.now,
          walkable: input.walkable,
          worldBounds: input.worldBounds,
        }, { enemies, player, worldObjects, worldDrops, propParticles, effects, nextEntityId, playerDamageReduction: input.playerDamageReduction });
        enemies = result.enemies;
        worldDrops = result.worldDrops;
        nextEntityId = result.nextEntityId;
        continue;
      }
      if (player.hp > 0
        && areClansHostile({ id: next.sourceId ?? String(next.id), clanId: next.sourceClanId }, { id: player.id, clanId: input.playerClanId })
        && !hasProjectileHitTarget(next, 'player', player.id)
        && projectileIntersectsActorPath(movingProjectile, next, player)) {
        const hitPoint = getProjectileActorHitPoint(movingProjectile, next, player) ?? next;
        effects.push(makeProjectileHitEffect(nextEntityId, hitPoint.x, hitPoint.y, next, input.now, 'impact-flesh'));
        nextEntityId += 1;
        const result = applyCombatTargetDamage({
          target: { kind: 'player', id: player.id },
          damage: next.damage,
          knockbackSource: next,
          knockbackAmount: next.knockback,
          now: input.now,
          walkable: input.walkable,
          worldBounds: input.worldBounds,
        }, { enemies, player, worldObjects, worldDrops, propParticles, effects, nextEntityId, playerDamageReduction: input.playerDamageReduction });
        player = result.player;
        nextEntityId = result.nextEntityId;
        combatTarget = next.sourceId ? { kind: 'enemy', id: next.sourceId } : combatTarget;
        continue;
      }
      if (next.remainingDistance > 0 && isInsideWorld(next.x, next.y, input.worldBounds)) projectiles.push(next);
      continue;
    }
    const hit = enemies.find((enemy) => enemy.hp > 0
      && areClansHostile({ id: player.id, clanId: next.sourceClanId }, { id: enemy.id, clanId: enemy.clanId })
      && !hasProjectileHitTarget(next, 'enemy', enemy.id)
      && projectileIntersectsActorPath(movingProjectile, next, enemy));
    const objectHit = worldObjects.find((object) => object.hp !== undefined && object.hp > 0 && !hasProjectileHitTarget(next, 'prop', object.id) && projectileIntersectsObjectPath(movingProjectile, next, object));
    if (hit) {
      const hitPoint = getProjectileActorHitPoint(movingProjectile, next, hit) ?? next;
      combatTarget = { kind: 'enemy', id: hit.id };
      const weapon = input.getWeapon(next.weaponInstanceId);
      effects.push(makeHitEffect(nextEntityId, hitPoint.x, hitPoint.y, weapon, input.now));
      nextEntityId += 1;
      const result = applyCombatTargetDamage({
        target: { kind: 'enemy', id: hit.id },
        damage: next.damage,
        knockbackSource: next,
        knockbackAmount: next.knockback,
        inflictions: next.inflictions,
        statusRollSeed: nextEntityId,
        shouldAlertEnemy: true,
        now: input.now,
        walkable: input.walkable,
        worldBounds: input.worldBounds,
      }, { enemies, player, worldObjects, worldDrops, propParticles, effects, nextEntityId, playerDamageReduction: input.playerDamageReduction });
      enemies = result.enemies;
      worldDrops = result.worldDrops;
      nextEntityId = result.nextEntityId;
      ({ player, nextEntityId } = applyWeaponSustain(player, getSustainFromBehaviors(next.behaviors), next.damage, effects, nextEntityId, input.now));
      const continued = continueProjectileAfterHit(next, hitPoint, hit, 'enemy', hit.id);
      if (continued && isInsideWorld(continued.x, continued.y, input.worldBounds)) projectiles.push(continued);
    } else if (objectHit) {
      combatTarget = { kind: 'prop', id: objectHit.id };
      const weapon = input.getWeapon(next.weaponInstanceId);
      const hitPoint = getProjectileObjectHitPoint(movingProjectile, next, objectHit) ?? next;
      effects.push(makeHitEffect(nextEntityId, hitPoint.x, hitPoint.y, weapon, input.now, null));
      nextEntityId += 1;
      const result = applyCombatTargetDamage({
        target: { kind: 'prop', id: objectHit.id },
        damage: next.damage,
        now: input.now,
        walkable: input.walkable,
        worldBounds: input.worldBounds,
      }, { enemies, player, worldObjects, worldDrops, propParticles, effects, nextEntityId, playerDamageReduction: input.playerDamageReduction });
      worldObjects = result.worldObjects;
      worldDrops = result.worldDrops;
      propParticles = result.propParticles;
      nextEntityId = result.nextEntityId;
      ({ player, nextEntityId } = applyWeaponSustain(player, getSustainFromBehaviors(next.behaviors), next.damage, effects, nextEntityId, input.now));
      const continued = continueProjectileAfterHit(next, hitPoint, objectHit, 'prop', objectHit.id);
      if (continued && isInsideWorld(continued.x, continued.y, input.worldBounds)) projectiles.push(continued);
    } else if (next.remainingDistance > 0 && isInsideWorld(next.x, next.y, input.worldBounds)) {
      projectiles.push(next);
    }
  }

  return {
    enemies,
    player,
    worldObjects,
    worldDrops,
    propParticles,
    effects,
    projectiles,
    nextEntityId,
    combatTarget,
  };
}

export function makeProjectiles(
  startId: number,
  weapon: EffectiveWeapon,
  hand: HandSlot,
  origin: { x: number; y: number },
  direction: { x: number; y: number },
  source: { id: string; clanId: AdventureEnemy['clanId'] },
  now: number,
  extraBehaviors: CombatBehaviorInstance[] = [],
) {
  const angle = Math.atan2(direction.y, direction.x);
  const speed = weapon.projectile?.speed ?? 500;
  const behaviors = [...makeProjectileBehaviorInstancesFromWeapon(weapon), ...extraBehaviors.map((behavior) => ({ ...behavior, params: { ...behavior.params } }))];
  const baseProjectile: Projectile = {
    id: startId,
    owner: 'player',
    sourceClanId: source.clanId,
    sourceId: source.id,
    weaponInstanceId: weapon.instanceId,
    hand,
    x: origin.x,
    y: origin.y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    remainingDistance: weapon.range,
    maxTravelDistance: weapon.range,
    radius: weapon.radius,
    damage: weapon.damage,
    knockback: weapon.knockback,
    penetrationRemaining: getBehaviorInstancesById(behaviors, 'behavior-002').reduce((sum, behavior) => sum + getBehaviorNumber(behavior, 'count'), 0),
    ricochetRemaining: getBehaviorInstancesById(behaviors, 'behavior-004').reduce((sum, behavior) => sum + getBehaviorNumber(behavior, 'count'), 0),
    hitTargetIds: [],
    inflictions: getStatusInflictionsFromBehaviors(behaviors),
    behaviors,
    glyph: weapon.projectile?.glyph ?? weapon.effectGlyph,
    color: weapon.color,
    effectGlyph: weapon.effectGlyph,
    effectSize: weapon.effectSize,
    hitAudioCue: getWeaponAudio(weapon).onHit,
  };
  const releasePatches = dispatchCombatEvent(null, 'onAttackRelease', {
    now,
    attack: makeProjectileAttackEvent(baseProjectile, origin),
  }, createProjectileReleaseSubscribers(baseProjectile)).patches;
  return applyProjectileReleasePatches(baseProjectile, releasePatches);
}

export function makeEnemyProjectile(startId: number, enemy: AdventureEnemy, target: Actor): Projectile {
  const direction = normalizedVector(enemy, target);
  return {
    id: startId,
    owner: 'enemy',
    sourceClanId: enemy.clanId,
    sourceId: enemy.id,
    weaponInstanceId: 'enemy-projectile',
    hand: 'right',
    x: enemy.x,
    y: enemy.y,
    vx: direction.x * enemy.projectileSpeed,
    vy: direction.y * enemy.projectileSpeed,
    remainingDistance: enemy.attackRange + target.radius + 80,
    maxTravelDistance: enemy.attackRange + target.radius + 80,
    radius: Math.max(8, enemy.projectileRadius),
    damage: enemy.attack,
    knockback: enemy.knockback,
    penetrationRemaining: 0,
    ricochetRemaining: 0,
    hitTargetIds: [],
    inflictions: [],
    behaviors: [],
    glyph: enemy.projectile?.glyph ?? '?',
    color: enemy.projectile?.color ?? enemy.color,
    effectGlyph: enemy.projectile?.impact?.glyph ?? enemy.projectile?.glyph ?? '?',
    effectSize: Math.max(24, Math.min(42, enemy.projectileRadius * 1.6 || 28)),
    hitAudioCue: 'impact-flesh',
  };
}

function applyProjectileStepBehaviors(projectile: Projectile, enemies: AdventureEnemy[], player: Actor, deltaSeconds: number, now: number): Projectile {
  const seekTargets = projectile.owner === 'player'
    ? enemies
      .filter((enemy) => enemy.hp > 0
        && areClansHostile({ id: player.id, clanId: projectile.sourceClanId }, { id: enemy.id, clanId: enemy.clanId })
        && !hasProjectileHitTarget(projectile, 'enemy', enemy.id))
      .map((enemy) => ({ id: enemy.id, x: enemy.x, y: enemy.y }))
    : [];
  const patches = dispatchCombatEvent(null, 'onAttackStep', {
    now,
    deltaSeconds,
    attack: makeProjectileAttackEvent(projectile, projectile.owner === 'player' ? player : projectile),
    seekTargets,
  }, createProjectileSubscribers(projectile, undefined)).patches;
  return applyProjectileModifyPatches(projectile, patches);
}

function hasProjectileHitTarget(projectile: Pick<Projectile, 'hitTargetIds'>, kind: 'enemy' | 'player' | 'prop', id: string) {
  return hasCombatTarget(projectile.hitTargetIds, { kind, id });
}

function makeProjectileAttackEvent(projectile: Projectile, sourcePosition: { x: number; y: number }) {
  return makeProjectileCombatAttack({
    id: projectile.id,
    source: {
      id: projectile.sourceId ?? statePlayerIdPlaceholder(projectile),
      clanId: projectile.sourceClanId,
      x: sourcePosition.x,
      y: sourcePosition.y,
    },
    x: projectile.x,
    y: projectile.y,
    vx: projectile.vx,
    vy: projectile.vy,
    radius: projectile.radius,
    remainingDistance: projectile.remainingDistance,
    maxTravelDistance: projectile.maxTravelDistance,
    penetrationRemaining: projectile.penetrationRemaining,
    ricochetRemaining: projectile.ricochetRemaining,
    followStrength: getFollowStrength(projectile.behaviors),
    damage: projectile.damage,
    knockback: projectile.knockback,
    hitTargetIds: projectile.hitTargetIds,
    inflictions: projectile.inflictions,
    behaviors: projectile.behaviors,
  });
}

function statePlayerIdPlaceholder(projectile: Projectile) {
  return projectile.sourceId ?? 'player-01';
}

function createProjectileSubscribers(projectile: Projectile, reflectTarget: { x: number; y: number } | undefined): CombatSubscriber[] {
  const subscribers = projectile.behaviors.flatMap((behavior) => {
    if (behavior.behaviorId === 'behavior-003') {
      return createFollowSubscriber({ ownerId: behavior.ownerId, strength: getBehaviorNumber(behavior, 'strength') });
    }
    return undefined;
  });
  if (projectile.behaviors.some((behavior) => behavior.behaviorId === 'behavior-002' || behavior.behaviorId === 'behavior-004')) {
    subscribers.push(createProjectileContinuationSubscriber({
      ownerId: projectile.weaponInstanceId,
      reflect: (attack) => reflectTarget ? reflectVelocity(attack, attack, reflectTarget) : { vx: attack.vx, vy: attack.vy },
    }));
  }
  return subscribers.filter((subscriber): subscriber is CombatSubscriber => subscriber !== undefined);
}

function createProjectileReleaseSubscribers(projectile: Projectile): CombatSubscriber[] {
  const subscribers = projectile.behaviors.flatMap((behavior) => {
    if (behavior.behaviorId !== 'behavior-001') return undefined;
    return createScatterSubscriber({
      ownerId: behavior.ownerId,
      extraProjectiles: Math.max(0, getBehaviorNumber(behavior, 'extraProjectiles')),
      spreadStep: Math.PI / 24,
    });
  });
  return subscribers.filter((subscriber): subscriber is CombatSubscriber => subscriber !== undefined);
}

function applyProjectileReleasePatches(baseProjectile: Projectile, patches: CombatPatch[]): Projectile[] {
  let nextId = baseProjectile.id + 1;
  const projectiles: Projectile[] = [applyProjectileModifyPatches(baseProjectile, patches)];
  for (const patch of patches) {
    if (patch.kind !== 'spawnAttack' || patch.attack.kind !== 'projectile') continue;
    projectiles.push(projectileFromCombatAttack(patch.attack, {
      ...baseProjectile,
      id: nextId,
      hitTargetIds: [],
      inflictions: baseProjectile.inflictions.map((application) => ({ ...application })),
    }));
    nextId += 1;
  }
  return projectiles;
}

function projectileFromCombatAttack(attack: ProjectileCombatAttack, template: Projectile): Projectile {
  return {
    ...template,
    id: template.id,
    x: attack.x,
    y: attack.y,
    vx: attack.vx,
    vy: attack.vy,
    remainingDistance: attack.remainingDistance,
    maxTravelDistance: attack.maxTravelDistance,
    radius: attack.radius,
    damage: attack.damage,
    knockback: attack.knockback,
    penetrationRemaining: attack.penetrationRemaining,
    ricochetRemaining: attack.ricochetRemaining,
    hitTargetIds: [...attack.hitTargetIds],
    inflictions: attack.inflictions.map((application) => ({ ...application })),
    behaviors: attack.behaviors.map((behavior) => ({
      behaviorId: behavior.behaviorId,
      ownerId: behavior.ownerId,
      params: { ...behavior.params },
    })),
  };
}

function applyProjectileModifyPatches(projectile: Projectile, patches: CombatPatch[]): Projectile {
  return patches.reduce((next, patch) => {
    if (patch.kind !== 'modifyAttack' || patch.attackId !== next.id) return next;
    const modified = patch.attack as Partial<ProjectileCombatAttack>;
    return {
      ...next,
      vx: typeof modified.vx === 'number' ? modified.vx : next.vx,
      vy: typeof modified.vy === 'number' ? modified.vy : next.vy,
      remainingDistance: typeof modified.remainingDistance === 'number' ? modified.remainingDistance : next.remainingDistance,
      penetrationRemaining: typeof modified.penetrationRemaining === 'number' ? modified.penetrationRemaining : next.penetrationRemaining,
      ricochetRemaining: typeof modified.ricochetRemaining === 'number' ? modified.ricochetRemaining : next.ricochetRemaining,
      hitTargetIds: Array.isArray(modified.hitTargetIds) ? modified.hitTargetIds : next.hitTargetIds,
    };
  }, projectile);
}

function continueProjectileAfterHit(
  projectile: Projectile,
  hitPoint: { x: number; y: number },
  target: { x: number; y: number },
  targetKind: 'enemy' | 'player' | 'prop' | 'wall',
  targetId: string,
): Projectile | undefined {
  if (projectile.remainingDistance <= 0) return undefined;
  const attack = makeProjectileAttackEvent({ ...projectile, x: hitPoint.x, y: hitPoint.y }, hitPoint);
  const patches = dispatchCombatEvent(null, 'onAttackHit', {
    now: 0,
    attack,
    target: { kind: targetKind, id: targetId },
  }, createProjectileSubscribers(projectile, target)).patches;
  const patch = patches.find((candidate) => candidate.kind === 'modifyAttack' && candidate.attackId === projectile.id);
  if (!patch || patch.kind !== 'modifyAttack') return undefined;
  return {
    ...applyProjectileModifyPatches(projectile, [patch]),
    x: hitPoint.x,
    y: hitPoint.y,
  };
}

function reflectVelocity(projectile: Pick<Projectile, 'vx' | 'vy'>, hitPoint: { x: number; y: number }, target: { x: number; y: number }) {
  const speed = Math.hypot(projectile.vx, projectile.vy) || 1;
  const normal = normalizedVector(target, hitPoint);
  const dx = projectile.vx / speed;
  const dy = projectile.vy / speed;
  const dot = dx * normal.x + dy * normal.y;
  return {
    vx: (dx - 2 * dot * normal.x) * speed,
    vy: (dy - 2 * dot * normal.y) * speed,
  };
}

function getFollowStrength(behaviors: Projectile['behaviors']) {
  return getBehaviorInstancesById(behaviors, 'behavior-003')
    .reduce((sum, behavior) => sum + getBehaviorNumber(behavior, 'strength'), 0);
}

function getSustainFromBehaviors(behaviors: Projectile['behaviors']) {
  return {
    lifeDrain: getBehaviorInstancesById(behaviors, 'behavior-008')
      .reduce((sum, behavior) => sum + getBehaviorNumber(behavior, 'ratio'), 0),
    shield: getBehaviorInstancesById(behaviors, 'behavior-009')
      .reduce((sum, behavior) => sum + getBehaviorNumber(behavior, 'ratio'), 0),
  };
}

