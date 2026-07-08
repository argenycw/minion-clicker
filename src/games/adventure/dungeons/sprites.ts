import type { SpriteRef } from '../../../shared/sprites';
import type { DungeonProp } from './types';

const sheetId = 'sheet-08' as const;

export const dungeonChestSprites = {
  closed: { sheetId, x: 3, y: 9, drawScale: 1.02 },
  opened: { sheetId, x: 4, y: 9, drawScale: 1.02 },
} satisfies Record<'closed' | 'opened', SpriteRef>;

export const dungeonObjectiveSprites = {
  stairs: { sheetId, x: 0, y: 10, cellsWide: 2, cellsHigh: 2, drawScale: 0.98, offsetY: -16 },
  exit: { sheetId, x: 4, y: 10, cellsWide: 2, cellsHigh: 2, drawScale: 1.02, offsetY: -16 },
} satisfies Record<'stairs' | 'exit', SpriteRef>;

export const dungeonPropSprites = {
  'floor-pile': [
    { sheetId, x: 0, y: 0, drawScale: 1.0 },
    { sheetId, x: 1, y: 0, drawScale: 1.0 },
  ],
  'stone-object': [
    { sheetId, x: 0, y: 2, drawScale: 1.16 },
    { sheetId, x: 1, y: 2, drawScale: 1.18 },
    { sheetId, x: 2, y: 2, drawScale: 1.12 },
    { sheetId, x: 3, y: 2, drawScale: 1.14 },
    { sheetId, x: 4, y: 2, drawScale: 1.1 },
  ],
  'stone-decor': [
    { sheetId, x: 6, y: 3, drawScale: 1.0 },
    { sheetId, x: 7, y: 3, drawScale: 1.0 },
    { sheetId, x: 8, y: 3, drawScale: 1.0 },
    { sheetId, x: 9, y: 3, drawScale: 1.0 },
    { sheetId, x: 10, y: 3, drawScale: 1.0 },
    { sheetId, x: 11, y: 3, drawScale: 1.0 },
    { sheetId, x: 12, y: 3, drawScale: 1.0 },
    { sheetId, x: 13, y: 3, drawScale: 1.0 },
  ],
  'tall-stone': [
    { sheetId, x: 0, y: 4, drawScale: 1.04, offsetY: -28 },
    { sheetId, x: 1, y: 4, drawScale: 1.04, offsetY: -28 },
    { sheetId, x: 2, y: 4, drawScale: 1.08, offsetY: -28 },
    { sheetId, x: 3, y: 4, drawScale: 1.08, offsetY: -28 },
    { sheetId, x: 4, y: 4, drawScale: 1.02, offsetY: -28 },
    { sheetId, x: 5, y: 4, drawScale: 1.02, offsetY: -28 },
    { sheetId, x: 6, y: 4, drawScale: 1.02, offsetY: -28 },
    { sheetId, x: 7, y: 4, drawScale: 1.02, offsetY: -28 },
    { sheetId, x: 8, y: 4, drawScale: 1.02, offsetY: -28 },
    { sheetId, x: 9, y: 4, drawScale: 1.02, offsetY: -28 },
  ],
  'wall-mount': [
    { sheetId, x: 0, y: 5, drawScale: 1.0 },
    { sheetId, x: 1, y: 5, drawScale: 1.0 },
    { sheetId, x: 2, y: 5, drawScale: 1.0 },
    { sheetId, x: 3, y: 5, drawScale: 1.0 },
    { sheetId, x: 4, y: 5, drawScale: 1.0 },
    { sheetId, x: 5, y: 5, drawScale: 1.0 },
  ],
  'light-source': [
    { sheetId, x: 0, y: 6, drawScale: 1.0 },
    { sheetId, x: 1, y: 6, drawScale: 1.0 },
    { sheetId, x: 2, y: 6, drawScale: 1.0 },
    { sheetId, x: 3, y: 6, drawScale: 1.0 },
  ],
  'destroyable-prop': [
    { sheetId, x: 0, y: 8, drawScale: 1.06 },
    { sheetId, x: 1, y: 8, drawScale: 1.06 },
    { sheetId, x: 2, y: 8, drawScale: 1.06 },
    { sheetId, x: 3, y: 8, drawScale: 1.06 },
    { sheetId, x: 4, y: 8, drawScale: 1.0 },
    { sheetId, x: 5, y: 8, drawScale: 1.0 },
    { sheetId, x: 7, y: 8, drawScale: 1.0 },
    { sheetId, x: 8, y: 8, drawScale: 1.0 },
    { sheetId, x: 9, y: 8, drawScale: 1.0 },
    { sheetId, x: 10, y: 8, drawScale: 1.0 },
    { sheetId, x: 11, y: 8, drawScale: 1.0 },
    { sheetId, x: 12, y: 8, drawScale: 1.0 },
  ],
} satisfies Record<DungeonProp['kind'], SpriteRef[]>;

export function getDungeonPropSprite(kind: DungeonProp['kind'], index: number, scale = 1): SpriteRef {
  const options = dungeonPropSprites[kind];
  const sprite = options[Math.abs(index) % options.length];
  return { ...sprite, drawScale: (sprite.drawScale ?? 1) * scale };
}
