import type { AdventureEnemy } from '../enemies/types';
import type { Actor, KnockbackMotion } from '../state';
import type { WorldObject } from '../world';
import type { DungeonRect } from '../dungeons/types';
import { circleIntersectsObject, isInsideWalkableArea, isInsideWorld, normalizedVector, type AdventureWorldBounds } from './collision';

export function knockbackActor<T extends Actor>(
  actor: T,
  origin: { x: number; y: number },
  amount: number,
  worldObjects: WorldObject[],
  now: number,
  walkable?: DungeonRect[],
  worldBounds?: AdventureWorldBounds,
): T {
  const stiffness = Math.max(0, Math.min(100, actor.stiffness ?? 0));
  return scheduleKnockbackMotion(actor, origin, amount * (1 - stiffness / 100), worldObjects, now, walkable, worldBounds);
}

export function knockbackEnemy(
  enemy: AdventureEnemy,
  origin: { x: number; y: number },
  amount: number,
  worldObjects: WorldObject[],
  now: number,
  walkable?: DungeonRect[],
  worldBounds?: AdventureWorldBounds,
) {
  return scheduleKnockbackMotion(enemy, origin, amount, worldObjects, now, walkable, worldBounds);
}

export function scheduleKnockbackMotion<T extends { x: number; y: number; radius: number; knockbackMotion?: KnockbackMotion }>(
  actor: T,
  origin: { x: number; y: number },
  distance: number,
  worldObjects: WorldObject[],
  now: number,
  walkable?: DungeonRect[],
  worldBounds?: AdventureWorldBounds,
): T {
  if (distance <= 0) return actor;
  const current = applyKnockbackMotion(actor, now);
  const direction = normalizedVector(origin, current);
  const activeBlockers = worldObjects.filter((object) => object.blocking && object.hp !== 0);
  const steps = Math.max(1, Math.ceil(distance / 10));
  let result = current;
  for (let step = 1; step <= steps; step += 1) {
    const traveled = distance * step / steps;
    const targetX = current.x + direction.x * traveled;
    const targetY = current.y + direction.y * traveled;
    const x = activeBlockers.some((object) => circleIntersectsObject(targetX, result.y, current.radius, object))
      || !isInsideWalkableArea(targetX, result.y, current.radius, walkable)
      || !isInsideWorld(targetX, result.y, worldBounds, current.radius)
      ? result.x
      : targetX;
    const y = activeBlockers.some((object) => circleIntersectsObject(x, targetY, current.radius, object))
      || !isInsideWalkableArea(x, targetY, current.radius, walkable)
      || !isInsideWorld(x, targetY, worldBounds, current.radius)
      ? result.y
      : targetY;
    result = { ...result, x, y };
    if (result.x !== targetX && result.y !== targetY) break;
  }
  const actualDistance = Math.hypot(result.x - current.x, result.y - current.y);
  if (actualDistance <= 0.5) return current;
  const duration = Math.max(200, Math.min(500, 180 + actualDistance * 3.2));
  return {
    ...current,
    knockbackMotion: {
      fromX: current.x,
      fromY: current.y,
      toX: result.x,
      toY: result.y,
      startedAt: now,
      endsAt: now + duration,
    },
  };
}

export function applyKnockbackMotion<T extends { x: number; y: number; knockbackMotion?: KnockbackMotion }>(actor: T, now: number): T {
  const motion = actor.knockbackMotion;
  if (!motion) return actor;
  const duration = Math.max(1, motion.endsAt - motion.startedAt);
  const t = Math.max(0, Math.min(1, (now - motion.startedAt) / duration));
  const eased = 1 - Math.pow(1 - t, 3);
  const next = {
    ...actor,
    x: motion.fromX + (motion.toX - motion.fromX) * eased,
    y: motion.fromY + (motion.toY - motion.fromY) * eased,
  };
  return t >= 1 ? { ...next, knockbackMotion: undefined } : next;
}

export function damageActor(actor: Actor, damage: number, now: number): Actor {
  const active = expireShield(actor, now);
  const shield = active.shield ?? 0;
  const absorbed = Math.min(shield, damage);
  return {
    ...active,
    shield: shield - absorbed,
    hp: Math.max(0, active.hp - (damage - absorbed)),
  };
}

export function expireShield(actor: Actor, now: number): Actor {
  return (actor.shield ?? 0) > 0 && now >= (actor.shieldExpiresAt ?? 0) ? { ...actor, shield: 0, shieldExpiresAt: 0 } : actor;
}
