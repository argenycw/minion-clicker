import type { DungeonRect } from '../dungeons/types';
import type { WorldObject } from '../world';
import type { Projectile } from '../state';

export type AdventureWorldBounds = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

export function circleIntersectsObject(x: number, y: number, radius: number, object: WorldObject) {
  if (!object.collision) return false;
  const cos = Math.cos(-object.rotation);
  const sin = Math.sin(-object.rotation);
  const dx = x - object.x;
  const dy = y - object.y;
  const localX = dx * cos - dy * sin;
  const localY = dx * sin + dy * cos;

  if (object.collision.kind === 'circle') {
    const objectRadius = Math.min(object.width, object.height) * object.collision.radiusRatio;
    return Math.hypot(localX, localY) < radius + objectRadius;
  }
  if (object.collision.kind === 'ellipse') {
    const radiusX = object.width * object.collision.radiusXRatio + radius;
    const radiusY = object.height * object.collision.radiusYRatio + radius;
    return (localX * localX) / (radiusX * radiusX) + (localY * localY) / (radiusY * radiusY) < 1;
  }

  const halfWidth = object.width * object.collision.widthRatio / 2;
  const halfHeight = object.height * object.collision.heightRatio / 2;
  const closestX = clamp(localX, -halfWidth, halfWidth);
  const closestY = clamp(localY, -halfHeight, halfHeight);
  return Math.hypot(localX - closestX, localY - closestY) < radius;
}

export function isInsideWalkableArea(x: number, y: number, radius: number, walkable?: DungeonRect[]) {
  if (!walkable) return true;
  return walkable.some((rect) => x - radius >= rect.x && x + radius <= rect.x + rect.width && y - radius >= rect.y && y + radius <= rect.y + rect.height);
}

export function isInsideWorld(x: number, y: number, bounds?: AdventureWorldBounds, radius = 0) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
  if (!bounds) return true;
  return x - radius >= bounds.left
    && x + radius <= bounds.right
    && y - radius >= bounds.top
    && y + radius <= bounds.bottom;
}

export function getProjectileDungeonWallHit(projectile: Projectile, next: Projectile, walkable: DungeonRect[]) {
  const steps = Math.max(1, Math.ceil(Math.hypot(next.x - projectile.x, next.y - projectile.y) / Math.max(8, projectile.radius)));
  let previous = { x: projectile.x, y: projectile.y };
  for (let step = 1; step <= steps; step += 1) {
    const t = step / steps;
    const x = projectile.x + (next.x - projectile.x) * t;
    const y = projectile.y + (next.y - projectile.y) * t;
    if (!isInsideWalkableArea(x, y, next.radius, walkable)) {
      const xBlocked = !isInsideWalkableArea(x, previous.y, next.radius, walkable);
      const yBlocked = !isInsideWalkableArea(previous.x, y, next.radius, walkable);
      const normal = xBlocked && !yBlocked
        ? { x: previous.x < x ? -1 : 1, y: 0 }
        : yBlocked && !xBlocked
          ? { x: 0, y: previous.y < y ? -1 : 1 }
          : normalizedVector({ x, y }, previous);
      return {
        point: { x, y },
        reflectTarget: {
          x: x - normal.x,
          y: y - normal.y,
        },
      };
    }
    previous = { x, y };
  }
  return undefined;
}

export function projectileIntersectsObjectPath(projectile: Projectile, next: Projectile, object: WorldObject) {
  return getProjectileObjectHitPoint(projectile, next, object) !== undefined;
}

export function getProjectileObjectHitPoint(projectile: Projectile, next: Projectile, object: WorldObject) {
  const steps = Math.max(1, Math.ceil(Math.hypot(next.x - projectile.x, next.y - projectile.y) / Math.max(8, projectile.radius)));
  for (let step = 1; step <= steps; step += 1) {
    const t = step / steps;
    const x = projectile.x + (next.x - projectile.x) * t;
    const y = projectile.y + (next.y - projectile.y) * t;
    if (circleIntersectsObject(x, y, next.radius, object)) return { x, y };
  }
  return undefined;
}

export function projectileIntersectsActorPath(projectile: Projectile, next: Projectile, actor: { x: number; y: number; radius: number }) {
  return getProjectileActorHitPoint(projectile, next, actor) !== undefined;
}

export function getProjectileActorHitPoint(projectile: Projectile, next: Projectile, actor: { x: number; y: number; radius: number }) {
  const steps = Math.max(1, Math.ceil(Math.hypot(next.x - projectile.x, next.y - projectile.y) / Math.max(8, projectile.radius)));
  for (let step = 1; step <= steps; step += 1) {
    const t = step / steps;
    const x = projectile.x + (next.x - projectile.x) * t;
    const y = projectile.y + (next.y - projectile.y) * t;
    if (Math.hypot(actor.x - x, actor.y - y) <= actor.radius + next.radius) return { x, y };
  }
  return undefined;
}

export function normalizedVector(from: { x: number; y: number }, to: { x: number; y: number }) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  return { x: dx / length, y: dy / length };
}

export function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
