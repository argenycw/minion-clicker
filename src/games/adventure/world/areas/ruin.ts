import { createProp, propDefinitions } from '../props';
import { hash, seeded } from '../random';
import type { WorldArea, WorldObject, WorldObjectKind } from '../types';

const horizontalWallKinds = ['ruin-wall-w2-01', 'ruin-wall-w3-01', 'ruin-wall-w3-02'] as const;
const verticalWallKinds = ['ruin-wall-h2-01', 'ruin-wall-h3-01'] as const;
const compactWallKinds = ['ruin-wall-01', 'ruin-wall-02'] as const;
const pillarKinds = ['ruin-pillar-01'] as const;
const rubbleKinds = ['rubble-01', 'rubble-02', 'rubble-03'] as const;
const stashKinds = ['barrel-01', 'barrel-02', 'crate-01', 'crate-02'] as const;

export function createRuin(area: WorldArea, makeObjectId: (index: number) => string = (index) => `${area.id}-${index}`): WorldObject[] {
  const objects: WorldObject[] = [];
  const seed = hash(area.id);
  const bounds = {
    left: area.x - area.width / 2,
    right: area.x + area.width / 2,
    top: area.y - area.height / 2,
    bottom: area.y + area.height / 2,
  };
  let objectIndex = 0;

  const addProp = (kind: WorldObjectKind, x: number, y: number, propSeed: number, scaleOverride?: number) => {
    const definition = propDefinitions[kind];
    if (!definition) return;
    const scaleRange = definition.scaleRange ?? [1, 1];
    const scale = scaleOverride ?? scaleRange[0] + seeded(propSeed + 17) * (scaleRange[1] - scaleRange[0]);
    objects.push(createProp(kind, {
      id: makeObjectId(objectIndex),
      x,
      y,
      scale,
      flipX: definition.randomFlipX ? seeded(propSeed + 23) > 0.5 : false,
      areaId: area.id,
    }));
    objectIndex += 1;
  };

  const horizontalSegments = Math.max(3, Math.round(area.width / 190));
  for (let index = 0; index < horizontalSegments; index += 1) {
    const segmentSeed = seed + index * 149;
    const x = bounds.left + area.width * ((index + 0.5) / horizontalSegments) + (seeded(segmentSeed + 3) - 0.5) * 56;
    if (seeded(segmentSeed + 11) > 0.16) {
      addProp(pick(horizontalWallKinds, segmentSeed + 19), x, bounds.top + 44 + seeded(segmentSeed + 29) * 18, segmentSeed);
    }
    if (seeded(segmentSeed + 41) > 0.22) {
      addProp(pick(horizontalWallKinds, segmentSeed + 43), x, bounds.bottom - 44 - seeded(segmentSeed + 47) * 18, segmentSeed + 400);
    }
  }

  const verticalSegments = Math.max(3, Math.round(area.height / 185));
  for (let index = 0; index < verticalSegments; index += 1) {
    const segmentSeed = seed + index * 173 + 1200;
    const y = bounds.top + area.height * ((index + 0.5) / verticalSegments) + (seeded(segmentSeed + 3) - 0.5) * 50;
    if (seeded(segmentSeed + 11) > 0.2) {
      addProp(pick(verticalWallKinds, segmentSeed + 13), bounds.left + 48 + seeded(segmentSeed + 17) * 24, y, segmentSeed);
    }
    if (seeded(segmentSeed + 23) > 0.24) {
      addProp(pick(verticalWallKinds, segmentSeed + 29), bounds.right - 48 - seeded(segmentSeed + 31) * 24, y, segmentSeed + 500);
    }
  }

  for (const [cornerIndex, corner] of getCorners(bounds).entries()) {
    const cornerSeed = seed + cornerIndex * 97 + 2200;
    addProp(pick(pillarKinds, cornerSeed + 3), corner.x, corner.y, cornerSeed, 1.05 + seeded(cornerSeed + 5) * 0.18);
  }

  const innerWallCount = Math.max(3, Math.round((area.width + area.height) / 410));
  for (let index = 0; index < innerWallCount; index += 1) {
    const wallSeed = seed + index * 197 + 3000;
    const useVertical = seeded(wallSeed + 3) > 0.62;
    const position = randomInteriorPoint(bounds, wallSeed + 11, wallSeed + 13, Math.min(area.width, area.height) * 0.22);
    addProp(
      useVertical ? pick(verticalWallKinds, wallSeed + 5) : pick(index % 3 === 0 ? compactWallKinds : horizontalWallKinds, wallSeed + 7),
      position.x,
      position.y,
      wallSeed,
    );
  }

  const pillarCount = Math.max(4, Math.round(Math.min(area.width, area.height) / 190));
  for (let index = 0; index < pillarCount; index += 1) {
    const pillarSeed = seed + index * 211 + 4200;
    const position = randomInteriorPoint(bounds, pillarSeed + 5, pillarSeed + 7, Math.min(area.width, area.height) * 0.18);
    addProp(pick(pillarKinds, pillarSeed + 3), position.x, position.y, pillarSeed);
  }

  const detailCount = Math.max(14, Math.round((area.width * area.height) / 32000));
  for (let index = 0; index < detailCount; index += 1) {
    const detailSeed = seed + index * 223 + 5400;
    const pool = seeded(detailSeed + 3) > 0.72 ? stashKinds : rubbleKinds;
    const position = randomInteriorPoint(bounds, detailSeed + 7, detailSeed + 13, Math.min(area.width, area.height) * 0.14);
    addProp(pick(pool, detailSeed + 5), position.x, position.y, detailSeed);
  }

  return objects;
}

function getCorners(bounds: { left: number; right: number; top: number; bottom: number }) {
  return [
    { x: bounds.left + 52, y: bounds.top + 52 },
    { x: bounds.right - 52, y: bounds.top + 52 },
    { x: bounds.left + 52, y: bounds.bottom - 52 },
    { x: bounds.right - 52, y: bounds.bottom - 52 },
  ];
}

function pick<T>(values: readonly T[], seed: number) {
  return values[Math.floor(seeded(seed) * values.length)] ?? values[0];
}

function randomInside(min: number, max: number, seed: number) {
  const padding = 64;
  return min + padding + seeded(seed) * Math.max(1, max - min - padding * 2);
}

function randomInteriorPoint(
  bounds: { left: number; right: number; top: number; bottom: number },
  seedX: number,
  seedY: number,
  centerClearRadius: number,
) {
  const centerX = (bounds.left + bounds.right) / 2;
  const centerY = (bounds.top + bounds.bottom) / 2;
  let x = randomInside(bounds.left, bounds.right, seedX);
  let y = randomInside(bounds.top, bounds.bottom, seedY);
  for (let attempt = 1; attempt <= 6 && Math.hypot(x - centerX, y - centerY) < centerClearRadius; attempt += 1) {
    x = randomInside(bounds.left, bounds.right, seedX + attempt * 29);
    y = randomInside(bounds.top, bounds.bottom, seedY + attempt * 31);
  }
  return { x, y };
}
