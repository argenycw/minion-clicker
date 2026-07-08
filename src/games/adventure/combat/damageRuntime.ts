import type { AdventureEnemy } from '../enemies/types';
import type { Actor, PropParticle, WorldDrop } from '../state';
import type { WorldObject } from '../world';
import type { DungeonRect } from '../dungeons/types';
import { applyStatusEffect } from '../status-effects/system';
import type { StatusEffectApplication } from '../status-effects/types';
import type { EffectiveWeapon } from '../inventory/types';
import { getQueuedDamageBorn, getQueuedTextEffectBorn, makeDamageEffect, makeHealEffect } from './damage';
import { makeAudioEffect, makeEnemyDeathEffect } from './effects';
import { makeWorldDrops } from './drops';
import { makePropParticles } from './particles';
import { hashRuntimeId, seededParticle } from './random';
import { damageActor, expireShield, knockbackActor, knockbackEnemy } from './knockback';
import type { AdventureWorldBounds } from './collision';
import type { CombatEffect, CombatTargetRef } from './types';

export type CombatDamageRuntime = {
  enemies: AdventureEnemy[];
  player: Actor;
  worldObjects: WorldObject[];
  worldDrops: WorldDrop[];
  propParticles: PropParticle[];
  effects: CombatEffect[];
  nextEntityId: number;
  playerDamageReduction?: number;
};

export type CombatDamageRuntimeResult = CombatDamageRuntime & {
  applied: boolean;
  combatTarget?: Exclude<CombatTargetRef, { kind: 'player' } | { kind: 'wall' }>;
};

export function applyCombatTargetDamage(
  input: {
    target: CombatTargetRef;
    damage: number;
    now: number;
    knockbackSource?: { x: number; y: number };
    knockbackAmount?: number;
    inflictions?: StatusEffectApplication[];
    statusRollSeed?: number;
    shouldAlertEnemy?: boolean;
    walkable?: DungeonRect[];
    worldBounds?: AdventureWorldBounds;
  },
  runtime: CombatDamageRuntime,
): CombatDamageRuntimeResult {
  if (input.target.kind === 'enemy') {
    const current = runtime.enemies.find((enemy) => enemy.id === input.target.id);
    if (!current || current.hp <= 0) return { ...runtime, applied: false };
    let enemies = runtime.enemies.map((enemy) => {
      if (enemy.id !== input.target.id) return enemy;
      const damaged = damageEnemyActor(enemy, input.damage);
      return input.knockbackSource && (input.knockbackAmount ?? 0) > 0
        ? knockbackEnemy(damaged, input.knockbackSource, input.knockbackAmount ?? 0, runtime.worldObjects, input.now, input.walkable, input.worldBounds)
        : damaged;
    });
    if (input.shouldAlertEnemy) {
      enemies = alertEnemy(enemies, input.target.id, runtime.player, input.now);
    }
    if (input.inflictions?.length) {
      enemies = inflictWeaponStatuses(enemies, input.target.id, input.inflictions, input.now, input.statusRollSeed ?? runtime.nextEntityId);
    }
    runtime.effects.push(makeDamageEffect(
      runtime.nextEntityId,
      current.x,
      current.y,
      input.damage,
      getQueuedDamageBorn(runtime.effects, current.x, current.y, input.now),
    ));
    let nextEntityId = runtime.nextEntityId + 1;
    let worldDrops = runtime.worldDrops;
    if (!current.invulnerable && current.hp > 0 && current.hp - input.damage <= 0) {
      runtime.effects.push(makeEnemyDeathEffect(nextEntityId, current, input.now));
      nextEntityId += 1;
      const spawned = makeWorldDrops(nextEntityId, current.x, current.y, current.loot, input.now);
      worldDrops = [...worldDrops, ...spawned];
      nextEntityId += spawned.length;
    }
    return {
      ...runtime,
      enemies,
      worldDrops,
      nextEntityId,
      applied: true,
      combatTarget: { kind: 'enemy', id: input.target.id },
    };
  }

  if (input.target.kind === 'player') {
    if (runtime.player.hp <= 0 || runtime.player.id !== input.target.id) return { ...runtime, applied: false };
    const damage = Math.max(0, Math.ceil(input.damage * (1 - Math.max(0, Math.min(0.95, runtime.playerDamageReduction ?? 0)))));
    const player = input.knockbackSource && (input.knockbackAmount ?? 0) > 0
      ? knockbackActor(damageActor(runtime.player, damage, input.now), input.knockbackSource, input.knockbackAmount ?? 0, runtime.worldObjects, input.now, input.walkable, input.worldBounds)
      : damageActor(runtime.player, damage, input.now);
    runtime.effects.push(makeDamageEffect(
      runtime.nextEntityId,
      runtime.player.x,
      runtime.player.y,
      damage,
      getQueuedDamageBorn(runtime.effects, runtime.player.x, runtime.player.y, input.now),
    ));
    return {
      ...runtime,
      player,
      nextEntityId: runtime.nextEntityId + 1,
      applied: true,
    };
  }

  const object = runtime.worldObjects.find((candidate) => candidate.id === input.target.id);
  if (!object || object.hp === undefined || object.hp <= 0) return { ...runtime, applied: false };
  const destroyed = object.hp - input.damage <= 0;
  const worldObjects = damageWorldObject(runtime.worldObjects, object.id, input.damage, input.now);
  let worldDrops = runtime.worldDrops;
  let nextEntityId = runtime.nextEntityId;
  const particles = makePropParticles(nextEntityId, object, input.now, undefined, undefined, destroyed);
  runtime.propParticles.push(...particles);
  nextEntityId += particles.length;
  const propAudioCue = getPropAudioCue(object, destroyed);
  if (propAudioCue) {
    runtime.effects.push(makeAudioEffect(nextEntityId, object.x, object.y, propAudioCue, input.now));
    nextEntityId += 1;
  }
  runtime.effects.push(makeDamageEffect(
    nextEntityId,
    object.x,
    object.y,
    input.damage,
    getQueuedDamageBorn(runtime.effects, object.x, object.y, input.now),
  ));
  nextEntityId += 1;
  if (destroyed) {
    const spawned = makeWorldDrops(nextEntityId, object.x, object.y, object.loot, input.now);
    worldDrops = [...worldDrops, ...spawned];
    nextEntityId += spawned.length;
  }
  return {
    ...runtime,
    worldObjects,
    worldDrops,
    nextEntityId,
    applied: true,
    combatTarget: { kind: 'prop', id: input.target.id },
  };
}

export function applyWeaponSustain(
  player: Actor,
  sustain: Pick<EffectiveWeapon, 'lifeDrain' | 'shield'>,
  damage: number,
  effects: CombatEffect[],
  nextEntityId: number,
  now: number,
) {
  let nextPlayer = expireShield(player, now);
  if (sustain.lifeDrain > 0 && nextPlayer.hp < nextPlayer.maxHp) {
    const requestedHeal = Math.max(1, Math.floor(damage * sustain.lifeDrain));
    const healed = Math.min(requestedHeal, nextPlayer.maxHp - nextPlayer.hp);
    nextPlayer = { ...nextPlayer, hp: nextPlayer.hp + healed };
    effects.push(makeHealEffect(
      nextEntityId,
      nextPlayer.x,
      nextPlayer.y,
      healed,
      getQueuedTextEffectBorn(effects, nextPlayer.x, nextPlayer.y, now, 'heal'),
    ));
    nextEntityId += 1;
  }
  if (sustain.shield > 0) {
    const generatedShield = Math.max(1, Math.floor(damage * sustain.shield));
    nextPlayer = {
      ...nextPlayer,
      shield: Math.max(nextPlayer.shield, generatedShield),
      shieldExpiresAt: now + SHIELD_DURATION_MS,
    };
  }
  return { player: nextPlayer, nextEntityId };
}

function alertEnemy(enemies: AdventureEnemy[], enemyId: string, player: Actor, now: number) {
  return enemies.map((enemy) => {
    if (enemy.id !== enemyId || enemy.hp <= 0 || getEnemyChaseRadius(enemy) <= 0) return enemy;
    const playerWithinChase = Math.hypot(player.x - enemy.spawnX, player.y - enemy.spawnY) <= getEnemyChaseRadius(enemy);
    return playerWithinChase ? { ...enemy, alerted: true, alertedAt: enemy.alertedAt ?? now } : enemy;
  });
}

function getEnemyChaseRadius(enemy: AdventureEnemy) {
  return enemy.chaseRadius ?? enemy.aggroRadius;
}

function inflictWeaponStatuses(
  enemies: AdventureEnemy[],
  enemyId: string,
  applications: StatusEffectApplication[],
  now: number,
  rollSeed: number,
) {
  return enemies.map((enemy) => {
    if (enemy.id !== enemyId || enemy.hp <= 0) return enemy;
    return applications.reduce((target, application, index) => {
      const chance = Math.max(0, Math.min(1, application.chance));
      const roll = seededParticle(rollSeed + hashRuntimeId(application.statusId) + index * 101);
      return roll < chance ? applyStatusEffect(target, application, now) : target;
    }, enemy);
  });
}

function damageEnemyActor(enemy: AdventureEnemy, damage: number) {
  if (enemy.invulnerable && enemy.hp - damage <= 0) return { ...enemy, hp: enemy.maxHp };
  return { ...enemy, hp: Math.max(0, enemy.hp - damage) };
}

function damageWorldObject(objects: WorldObject[], objectId: string, damage: number, now: number) {
  return objects.map((object) => object.id === objectId && object.hp !== undefined
    ? { ...object, hp: Math.max(0, object.hp - damage), hitAt: now }
    : object);
}

function getPropAudioCue(object: WorldObject, destroyed: boolean) {
  return destroyed ? object.audio?.onDestroy : object.audio?.onHit;
}

const SHIELD_DURATION_MS = 10_000;
