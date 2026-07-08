import type { WeaponDefinition } from '../content';
import type { AdventureClanId } from '../enemies/types';
import type { AdventureEnemy } from '../enemies/types';
import type { Actor, PropParticle, WorldDrop } from '../state';
import type { WorldObject } from '../world';
import type { DungeonRect } from '../dungeons/types';
import type { StatusEffectApplication } from '../status-effects/types';
import { makeGrowingCircleCombatAttack, makeMeleeAreaCombatAttack } from './attacks';
import {
  getBehaviorInstancesById,
  getBehaviorNumber,
  withoutBehaviorInstances,
} from './behaviorInstances';
import { createAftershockSubscriber } from './behaviors/aftershock';
import { createMultiHitSubscriber } from './behaviors/multihit';
import { createShockwaveSubscriber } from './behaviors/shockwave';
import { areClansHostile } from './clans';
import { circleIntersectsObject, type AdventureWorldBounds } from './collision';
import { applyCombatTargetDamage, applyWeaponSustain, type CombatDamageRuntime } from './damageRuntime';
import { makeHitEffect } from './effects';
import { dispatchCombatEvent } from './pipeline';
import { hasCombatTarget, markCombatTarget } from './targets';
import type { CombatBehaviorInstance, CombatDamage, CombatEffect, CombatPatch, CombatSubscriber, CombatTargetRef, PendingCircleAttack, PendingCombatAttack } from './types';

export type CombatTarget = Exclude<CombatTargetRef, { kind: 'player' } | { kind: 'wall' }>;

export type ResolvedMeleeAttack = {
  id: number;
  source: { id: string; clanId: AdventureClanId; x: number; y: number };
  hitCenter: { x: number; y: number };
  radius: number;
  damage: number;
  knockback: number;
  inflictions: StatusEffectApplication[];
  behaviors: CombatBehaviorInstance[];
  effectWeapon: Pick<WeaponDefinition, 'effectGlyph' | 'color' | 'effectSize' | 'kind' | 'audio'>;
};

export function resolveMeleeAttack(
  attack: ResolvedMeleeAttack,
  enemies: AdventureEnemy[],
  player: Actor,
  worldObjects: WorldObject[],
  worldDrops: WorldDrop[],
  propParticles: PropParticle[],
  pendingAttacks: PendingCombatAttack[],
  effects: CombatEffect[],
  nextEntityId: number,
  now: number,
  walkable?: DungeonRect[],
  worldBounds?: AdventureWorldBounds,
) {
  let nextEnemies = enemies;
  let nextPlayer = player;
  let nextWorldObjects = worldObjects;
  let nextWorldDrops = worldDrops;
  const nextPropParticles = [...propParticles];
  let nextPendingAttacks = pendingAttacks;
  let combatTarget: CombatTarget | undefined;
  let sustainCount = 0;

  const meleeAttack = makeMeleeAreaCombatAttack({
    id: attack.id,
    source: attack.source,
    x: attack.hitCenter.x,
    y: attack.hitCenter.y,
    radius: attack.radius,
    damage: attack.damage,
    knockback: attack.knockback,
    inflictions: attack.inflictions,
    behaviors: attack.behaviors,
    releasesAt: now,
  });
  const subscribers = createMeleeAttackSubscribers(attack);
  const releasePatches = dispatchCombatEvent(null, 'onAttackRelease', { now, attack: meleeAttack }, subscribers).patches;
  const releaseResult = applyMeleeBehaviorPatches(releasePatches, {
    enemies: nextEnemies,
    player: nextPlayer,
    worldObjects: nextWorldObjects,
    worldDrops: nextWorldDrops,
    propParticles: nextPropParticles,
    effects,
    nextEntityId,
    pendingAttacks: nextPendingAttacks,
    now,
    walkable,
    worldBounds,
  });
  nextEnemies = releaseResult.enemies;
  nextPlayer = releaseResult.player;
  nextWorldObjects = releaseResult.worldObjects;
  nextWorldDrops = releaseResult.worldDrops;
  nextPendingAttacks = releaseResult.pendingAttacks;
  nextEntityId = releaseResult.nextEntityId;
  sustainCount += releaseResult.appliedDamageCount;
  combatTarget = combatTarget ?? releaseResult.combatTarget;

  effects.push(makeHitEffect(nextEntityId, attack.hitCenter.x, attack.hitCenter.y, attack.effectWeapon, now));
  nextEntityId += 1;

  const hitEnemyIds = nextEnemies
    .filter((enemy) => enemy.hp > 0
      && areClansHostile(attack.source, { id: enemy.id, clanId: enemy.clanId })
      && Math.hypot(enemy.x - attack.hitCenter.x, enemy.y - attack.hitCenter.y) <= attack.radius + enemy.radius)
    .map((enemy) => enemy.id);
  const hitObjectIds = nextWorldObjects
    .filter((object) => object.hp !== undefined && object.hp > 0 && circleIntersectsObject(attack.hitCenter.x, attack.hitCenter.y, attack.radius, object))
    .map((object) => object.id);

  const applyHitBehaviorPatches = (target: CombatTarget, damage: number, knockbackAmount: number) => {
    const damageContext: CombatDamage = {
      amount: damage,
      kind: 'damage',
      source: attack.source,
      target,
      knockback: knockbackAmount,
      inflictions: attack.inflictions,
    };
    const patches = dispatchCombatEvent(null, 'onAttackHit', {
      now,
      attack: meleeAttack,
      target,
      damage: damageContext,
    }, subscribers).patches;
    const result = applyMeleeBehaviorPatches(patches, {
      enemies: nextEnemies,
      player: nextPlayer,
      worldObjects: nextWorldObjects,
      worldDrops: nextWorldDrops,
      propParticles: nextPropParticles,
      effects,
      nextEntityId,
      pendingAttacks: nextPendingAttacks,
      now,
      walkable,
      worldBounds,
    });
    nextEnemies = result.enemies;
    nextPlayer = result.player;
    nextWorldObjects = result.worldObjects;
    nextWorldDrops = result.worldDrops;
    nextPendingAttacks = result.pendingAttacks;
    nextEntityId = result.nextEntityId;
    sustainCount += result.appliedDamageCount;
    combatTarget = combatTarget ?? result.combatTarget;
  };

  for (const enemyId of hitEnemyIds) {
    const result = applyCombatTargetDamage({
      target: { kind: 'enemy', id: enemyId },
      damage: attack.damage,
      knockbackSource: attack.source,
      knockbackAmount: attack.knockback,
      inflictions: attack.inflictions,
      statusRollSeed: nextEntityId,
      shouldAlertEnemy: true,
      now,
      walkable,
      worldBounds,
    }, {
      enemies: nextEnemies,
      player: nextPlayer,
      worldObjects: nextWorldObjects,
      worldDrops: nextWorldDrops,
      propParticles: nextPropParticles,
      effects,
      nextEntityId,
    });
    nextEnemies = result.enemies;
    nextWorldDrops = result.worldDrops;
    nextEntityId = result.nextEntityId;
    if (result.applied) sustainCount += 1;
    combatTarget = combatTarget ?? result.combatTarget;
    if (result.applied) applyHitBehaviorPatches({ kind: 'enemy', id: enemyId }, attack.damage, attack.knockback);
  }

  for (const objectId of hitObjectIds) {
    const result = applyCombatTargetDamage({
      target: { kind: 'prop', id: objectId },
      damage: attack.damage,
      now,
      walkable,
      worldBounds,
    }, {
      enemies: nextEnemies,
      player: nextPlayer,
      worldObjects: nextWorldObjects,
      worldDrops: nextWorldDrops,
      propParticles: nextPropParticles,
      effects,
      nextEntityId,
    });
    nextWorldObjects = result.worldObjects;
    nextWorldDrops = result.worldDrops;
    nextEntityId = result.nextEntityId;
    if (result.applied) sustainCount += 1;
    combatTarget = combatTarget ?? result.combatTarget;
    if (result.applied) applyHitBehaviorPatches({ kind: 'prop', id: objectId }, attack.damage, 0);
  }

  for (let index = 0; index < sustainCount; index += 1) {
    ({ player: nextPlayer, nextEntityId } = applyWeaponSustain(nextPlayer, getSustainFromBehaviors(attack.behaviors), attack.damage, effects, nextEntityId, now));
  }

  return {
    enemies: nextEnemies,
    player: nextPlayer,
    worldObjects: nextWorldObjects,
    worldDrops: nextWorldDrops,
    propParticles: nextPropParticles,
    pendingAttacks: nextPendingAttacks,
    effects,
    nextEntityId,
    combatTarget,
  };
}

export function advanceCircleAttack(
  attack: PendingCircleAttack,
  enemies: AdventureEnemy[],
  player: Actor,
  worldObjects: WorldObject[],
  worldDrops: WorldDrop[],
  propParticles: PropParticle[],
  effects: CombatEffect[],
  nextEntityId: number,
  now: number,
  deltaSeconds: number,
  walkable?: DungeonRect[],
  worldBounds?: AdventureWorldBounds,
) {
  let nextEnemies = enemies;
  let nextWorldObjects = worldObjects;
  let nextWorldDrops = worldDrops;
  const nextPropParticles = [...propParticles];
  let nextAttack = { ...attack, hitTargetIds: [...attack.hitTargetIds] };
  let combatTarget: CombatTarget | undefined;
  const duration = Math.max(1, attack.endsAt - attack.born);
  const previousT = Math.max(0, Math.min(1, (now - deltaSeconds * 1000 - attack.born) / duration));
  const currentT = Math.max(0, Math.min(1, (now - attack.born) / duration));
  const previousRadius = attack.maxRadius * previousT;
  const currentRadius = attack.maxRadius * currentT;
  dispatchCombatEvent(null, 'onAttackStep', {
    now,
    attack: makeGrowingCircleCombatAttack({
      id: attack.id,
      source: { id: attack.sourceId, clanId: attack.sourceClanId, x: attack.x, y: attack.y },
      x: attack.x,
      y: attack.y,
      born: attack.born,
      endsAt: attack.endsAt,
      maxRadius: attack.maxRadius,
      damage: attack.damage,
      knockback: attack.knockback,
      hitTargetIds: nextAttack.hitTargetIds,
    }),
  }, []);
  const hasHit = (kind: 'enemy' | 'prop', id: string) => hasCombatTarget(nextAttack.hitTargetIds, { kind, id });
  const markHit = (kind: 'enemy' | 'prop', id: string) => {
    nextAttack = { ...nextAttack, hitTargetIds: markCombatTarget(nextAttack.hitTargetIds, { kind, id }) };
  };

  for (const enemy of nextEnemies) {
    if (enemy.hp <= 0 || hasHit('enemy', enemy.id)) continue;
    if (!areClansHostile({ id: attack.sourceId, clanId: attack.sourceClanId }, { id: enemy.id, clanId: enemy.clanId })) continue;
    const threshold = Math.max(0, Math.hypot(enemy.x - attack.x, enemy.y - attack.y) - enemy.radius);
    if (threshold > currentRadius || (threshold > 0 && threshold <= previousRadius)) continue;
    const result = applyCombatTargetDamage({
      target: { kind: 'enemy', id: enemy.id },
      damage: attack.damage,
      knockbackSource: attack,
      knockbackAmount: attack.knockback,
      now,
      walkable,
      worldBounds,
    }, {
      enemies: nextEnemies,
      player,
      worldObjects: nextWorldObjects,
      worldDrops: nextWorldDrops,
      propParticles: nextPropParticles,
      effects,
      nextEntityId,
    });
    nextEnemies = result.enemies;
    nextWorldDrops = result.worldDrops;
    nextEntityId = result.nextEntityId;
    markHit('enemy', enemy.id);
    combatTarget = combatTarget ?? result.combatTarget;
  }

  for (const object of nextWorldObjects) {
    if (object.hp === undefined || object.hp <= 0 || hasHit('prop', object.id)) continue;
    if (!circleIntersectsObject(attack.x, attack.y, currentRadius, object) || (previousRadius > 0 && circleIntersectsObject(attack.x, attack.y, previousRadius, object))) continue;
    const result = applyCombatTargetDamage({
      target: { kind: 'prop', id: object.id },
      damage: attack.damage,
      now,
      walkable,
      worldBounds,
    }, {
      enemies: nextEnemies,
      player,
      worldObjects: nextWorldObjects,
      worldDrops: nextWorldDrops,
      propParticles: nextPropParticles,
      effects,
      nextEntityId,
    });
    nextWorldObjects = result.worldObjects;
    nextWorldDrops = result.worldDrops;
    nextEntityId = result.nextEntityId;
    markHit('prop', object.id);
    combatTarget = combatTarget ?? { kind: 'prop', id: object.id };
  }

  return {
    circleAttack: nextAttack,
    enemies: nextEnemies,
    worldObjects: nextWorldObjects,
    worldDrops: nextWorldDrops,
    propParticles: nextPropParticles,
    nextEntityId,
    combatTarget,
  };
}

function createMeleeAttackSubscribers(attack: ResolvedMeleeAttack): CombatSubscriber[] {
  const subscribers = attack.behaviors.flatMap((behavior) => createMeleeBehaviorSubscriber(behavior, attack));
  return subscribers.filter((subscriber): subscriber is CombatSubscriber => subscriber !== undefined);
}

function createMeleeBehaviorSubscriber(behavior: CombatBehaviorInstance, attack: ResolvedMeleeAttack): CombatSubscriber | undefined {
  if (behavior.behaviorId === 'behavior-005') {
    return createMultiHitSubscriber({
      ownerId: behavior.ownerId,
      extraHits: getBehaviorNumber(behavior, 'extraHits'),
    });
  }
  if (behavior.behaviorId === 'behavior-006') {
    const radius = getBehaviorNumber(behavior, 'radius', attack.radius * getBehaviorNumber(behavior, 'radiusMultiplier'));
    const damageMultiplier = getBehaviorNumber(behavior, 'damageMultiplier');
    const damage = damageMultiplier > 0
      ? Math.max(1, Math.floor(attack.damage * damageMultiplier))
      : getBehaviorNumber(behavior, 'damage');
    return createShockwaveSubscriber({
      ownerId: behavior.ownerId,
      radius,
      damage,
      color: attack.effectWeapon.color,
    });
  }
  if (behavior.behaviorId === 'behavior-007') {
    return createAftershockSubscriber({
      ownerId: behavior.ownerId,
      count: getBehaviorNumber(behavior, 'count'),
      damageMultiplier: getBehaviorNumber(behavior, 'damageMultiplier'),
      delayMs: getBehaviorNumber(behavior, 'delay'),
      spacingMultiplier: Math.max(1, getBehaviorNumber(behavior, 'spacingMultiplier', 1)),
      derivedBehaviors: withoutBehaviorInstances(attack.behaviors, ['behavior-007']),
      effectGlyph: attack.effectWeapon.effectGlyph,
      effectSize: attack.effectWeapon.effectSize,
      color: attack.effectWeapon.color,
      audio: attack.effectWeapon.audio,
    });
  }
  return undefined;
}

function getSustainFromBehaviors(behaviors: CombatBehaviorInstance[]) {
  return {
    lifeDrain: getBehaviorInstancesById(behaviors, 'behavior-008')
      .reduce((sum, behavior) => sum + getBehaviorNumber(behavior, 'ratio'), 0),
    shield: getBehaviorInstancesById(behaviors, 'behavior-009')
      .reduce((sum, behavior) => sum + getBehaviorNumber(behavior, 'ratio'), 0),
  };
}

function applyMeleeBehaviorPatches(
  patches: CombatPatch[],
  input: CombatDamageRuntime & {
    pendingAttacks: PendingCombatAttack[];
    now: number;
    walkable?: DungeonRect[];
    worldBounds?: AdventureWorldBounds;
  },
) {
  let enemies = input.enemies;
  let player = input.player;
  let worldObjects = input.worldObjects;
  let worldDrops = input.worldDrops;
  let pendingAttacks = input.pendingAttacks;
  let nextEntityId = input.nextEntityId;
  let combatTarget: CombatTarget | undefined;
  let appliedDamageCount = 0;

  for (const patch of patches) {
    if (patch.kind === 'spawnPendingAttack') {
      pendingAttacks = [...pendingAttacks, { ...patch.attack, id: nextEntityId } as PendingCombatAttack];
      nextEntityId += 1;
      continue;
    }
    if (patch.kind === 'spawnVisualEffect') {
      input.effects.push({
        id: nextEntityId,
        kind: patch.effect.effectKind ?? 'hit',
        x: patch.effect.x,
        y: patch.effect.y,
        glyph: patch.effect.glyph,
        color: patch.effect.color,
        born: input.now,
        size: patch.effect.size,
        audioCue: patch.effect.audioCue,
      });
      nextEntityId += 1;
      continue;
    }
    if (patch.kind === 'damageTarget') {
      const result = applyCombatTargetDamage({
        target: patch.damage.target,
        damage: patch.damage.amount,
        knockbackSource: patch.damage.source,
        knockbackAmount: patch.damage.knockback,
        inflictions: patch.damage.inflictions,
        statusRollSeed: nextEntityId,
        shouldAlertEnemy: true,
        now: input.now,
        walkable: input.walkable,
        worldBounds: input.worldBounds,
      }, {
        enemies,
        player,
        worldObjects,
        worldDrops,
        propParticles: input.propParticles,
        effects: input.effects,
        nextEntityId,
      });
      enemies = result.enemies;
      player = result.player;
      worldObjects = result.worldObjects;
      worldDrops = result.worldDrops;
      nextEntityId = result.nextEntityId;
      if (result.applied) appliedDamageCount += 1;
      combatTarget = combatTarget ?? result.combatTarget;
    }
  }

  return {
    enemies,
    player,
    worldObjects,
    worldDrops,
    propParticles: input.propParticles,
    effects: input.effects,
    nextEntityId,
    pendingAttacks,
    appliedDamageCount,
    combatTarget,
  };
}
