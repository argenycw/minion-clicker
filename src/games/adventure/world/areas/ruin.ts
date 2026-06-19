import { createProp } from '../props';
import { hash, seeded } from '../random';
import type { WorldArea, WorldObject } from '../types';

export function createRuin(area: WorldArea, makeObjectId: (index: number) => string = (index) => `${area.id}-${index}`): WorldObject[] {
  const objects: WorldObject[] = [];
  const seed = hash(area.id);
  const wallCount = Math.max(16, Math.round((area.width + area.height) / 55));
  const left = area.x - area.width / 2;
  const top = area.y - area.height / 2;

  for (let index = 0; index < wallCount; index += 1) {
    const wallSeed = seed + index * 137;
    const angle = seeded(wallSeed + 5) * Math.PI;
    const length = 70 + seeded(wallSeed + 11) * 105;
    const margin = length * 0.34 + 24;
    objects.push(createProp('ruin-wall', {
      id: makeObjectId(index),
      x: left + margin + seeded(wallSeed + 19) * Math.max(1, area.width - margin * 2),
      y: top + margin + seeded(wallSeed + 29) * Math.max(1, area.height - margin * 2),
      width: length,
      height: 25 + seeded(wallSeed + 31) * 12,
      rotation: angle,
      areaId: area.id,
    }));
  }

  for (let index = 0; index < 22; index += 1) {
    const detailSeed = seed + index * 173 + 4000;
    const kind = index < 5 ? 'barrel' : index < 8 ? 'crate' : index < 11 ? 'ruin-pillar' : 'rubble';
    objects.push(createProp(kind, {
      id: makeObjectId(wallCount + index),
      x: left + 55 + seeded(detailSeed + 7) * (area.width - 110),
      y: top + 55 + seeded(detailSeed + 13) * (area.height - 110),
      rotation: seeded(detailSeed + 23) * Math.PI * 2,
      scale: 0.82 + seeded(detailSeed + 37) * 0.38,
      areaId: area.id,
    }));
  }

  return objects;
}
