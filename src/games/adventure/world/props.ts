import type { PropDefinition, WorldObject, WorldObjectKind } from './types';

export const propDefinitions: Record<WorldObjectKind, PropDefinition> = {
  tree: { kind: 'tree', width: 58, height: 52, blocking: true, maxHp: 86, collision: { kind: 'circle', radiusRatio: 0.34 }, loot: { coin: { probability: 0.45, amount: [1, 2] } }, audio: { onHit: 'prop-tree-hit', onDestroy: 'prop-tree-destroy' }, sprite: { sheetId: 'adventure-props-01', x: 0, y: 0 } },
  bush: { kind: 'bush', width: 46, height: 38, blocking: true, maxHp: 28, hitPieces: [2, 4], destroyPieces: [8, 10], collision: { kind: 'ellipse', radiusXRatio: 0.45, radiusYRatio: 0.42 }, loot: { coin: { probability: 0.45, amount: [1, 2] } }, audio: { onHit: 'prop-bush-hit', onDestroy: 'prop-bush-destroy' }, sprite: { sheetId: 'adventure-props-01', x: 2, y: 0 } },
  rock: { kind: 'rock', width: 36, height: 28, blocking: true, maxHp: 130, hitPieces: [2, 3], destroyPieces: [6, 8], collision: { kind: 'ellipse', radiusXRatio: 0.46, radiusYRatio: 0.42 }, loot: { coin: { probability: 0.45, amount: [1, 2] } }, audio: { onHit: 'prop-rock-hit', onDestroy: 'prop-rock-destroy' }, sprite: { sheetId: 'adventure-props-01', x: 3, y: 0 } },
  flower: { kind: 'flower', width: 18, height: 18, blocking: false },
  flowerbed: { kind: 'flowerbed', width: 42, height: 28, blocking: false },
  mushroom: { kind: 'mushroom', width: 18, height: 18, blocking: false },
  stump: { kind: 'stump', width: 26, height: 22, blocking: true, collision: { kind: 'ellipse', radiusXRatio: 0.46, radiusYRatio: 0.44 } },
  'dead-tree': { kind: 'dead-tree', width: 46, height: 58, blocking: true, collision: { kind: 'circle', radiusRatio: 0.28 } },
  'ruin-wall': { kind: 'ruin-wall', width: 100, height: 30, blocking: true, collision: { kind: 'box', widthRatio: 1, heightRatio: 1 } },
  'ruin-pillar': { kind: 'ruin-pillar', width: 38, height: 44, blocking: true, maxHp: 110, hitPieces: [2, 3], destroyPieces: [6, 8], collision: { kind: 'box', widthRatio: 0.8, heightRatio: 0.8 }, loot: { coin: { probability: 0.45, amount: [1, 2] } }, audio: { onHit: 'prop-stone-hit', onDestroy: 'prop-stone-destroy' } },
  barrel: { kind: 'barrel', width: 34, height: 34, blocking: true, maxHp: 45, hitPieces: [3, 4], destroyPieces: [6, 8], collision: { kind: 'box', widthRatio: 0.9, heightRatio: 0.9 }, loot: { coin: { probability: 0.65, amount: [1, 2] } }, audio: { onHit: 'prop-wood-hit', onDestroy: 'prop-wood-destroy' } },
  crate: { kind: 'crate', width: 38, height: 38, blocking: true, maxHp: 52, hitPieces: [3, 4], destroyPieces: [6, 8], collision: { kind: 'box', widthRatio: 0.9, heightRatio: 0.9 }, loot: { coin: { probability: 0.65, amount: [1, 2] } }, audio: { onHit: 'prop-wood-hit', onDestroy: 'prop-wood-destroy' } },
  rubble: { kind: 'rubble', width: 28, height: 20, blocking: false },
};

export function createProp(
  kind: WorldObjectKind,
  options: { id: string; x: number; y: number; scale?: number; width?: number; height?: number; rotation?: number; biomeId?: string; areaId?: string },
): WorldObject {
  const definition = propDefinitions[kind];
  const scale = options.scale ?? 1;
  const maxHp = definition.maxHp === undefined ? undefined : Math.round(definition.maxHp * scale);
  return {
    id: options.id,
    kind,
    x: options.x,
    y: options.y,
    width: options.width ?? definition.width * scale,
    height: options.height ?? definition.height * scale,
    rotation: options.rotation ?? 0,
    blocking: definition.blocking,
    collision: definition.collision,
    hp: maxHp,
    maxHp,
    hitPieces: definition.hitPieces,
    destroyPieces: definition.destroyPieces,
    biomeId: options.biomeId,
    areaId: options.areaId,
    loot: definition.loot,
    audio: definition.audio,
    sprite: definition.sprite,
  };
}
