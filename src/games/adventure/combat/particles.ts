import type { PropParticle } from '../state';
import type { WorldObject } from '../world';
import { randomRange, seededParticle } from './random';

export function makePropParticles(
  startId: number,
  object: WorldObject,
  now: number,
  forcedKind?: PropParticle['kind'],
  forcedCount?: number,
  destroyed = false,
): PropParticle[] {
  const kind = forcedKind ?? getPropParticleKind(object);
  const configuredRange = destroyed ? object.destroyPieces : object.hitPieces;
  const fallbackRange: [number, number] = destroyed
    ? kind === 'leaf' ? [9, 14] : kind === 'stone' ? [7, 11] : [8, 13]
    : kind === 'leaf' ? [2, 4] : kind === 'stone' ? [1, 3] : [2, 4];
  const count = forcedCount ?? randomRange(configuredRange ?? fallbackRange, startId + object.id.length * 17);
  const colors = kind === 'leaf'
    ? ['#315f2b', '#5f9636', '#a8c948']
    : kind === 'petal'
      ? ['#ed78ad', '#fff0f5', '#f1c83e']
      : kind === 'stone'
        ? ['#777e7b', '#a0a59e', '#c0c2b6']
        : ['#79502c', '#a56a35', '#d0914d'];
  return Array.from({ length: count }, (_, index) => {
    const angle = (Math.PI * 2 * index) / count + seededParticle(startId + index) * 0.8;
    const speed = 45 + seededParticle(startId + index * 3 + 11) * 85;
    return {
      id: startId + index,
      kind,
      x: object.x,
      y: object.y - object.height * 0.15,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 70,
      gravity: kind === 'leaf' || kind === 'petal' ? 105 : 240,
      rotation: seededParticle(startId + index * 5 + 17) * Math.PI * 2,
      spin: (seededParticle(startId + index * 7 + 23) - 0.5) * 12,
      size: 4.5 + seededParticle(startId + index * 11 + 29) * (kind === 'stone' ? 5 : 4.5),
      color: colors[index % colors.length],
      born: now,
      life: kind === 'leaf' || kind === 'petal' ? 1150 : 800,
    };
  });
}

function getPropParticleKind(object: WorldObject): PropParticle['kind'] {
  const family = object.family;
  if (family === 'bush' || family === 'tree') return 'leaf';
  if (family === 'rock' || family === 'ruin-wall' || family === 'ruin-pillar' || family === 'rubble') return 'stone';
  return 'wood';
}
