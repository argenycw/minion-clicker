export type SpriteSheetId = 'sheet-01' | 'sheet-02' | 'sheet-03' | 'sheet-04' | 'sheet-05' | 'sheet-06' | 'sheet-07';

export type SpriteRef = {
  sheetId: SpriteSheetId;
  /** Zero-based 64x64 grid column in the sheet. */
  x: number;
  /** Zero-based 64x64 grid row in the sheet. */
  y: number;
  /** Number of grid cells covered by this sprite horizontally. */
  cellsWide?: number;
  /** Number of grid cells covered by this sprite vertically. */
  cellsHigh?: number;
  /** Multiplies the destination draw size without affecting gameplay hitboxes. */
  drawScale?: number;
  /** World-space visual nudge after the prop has been anchored at its gameplay position. */
  offsetX?: number;
  offsetY?: number;
};

export type SpriteSheetDefinition = {
  id: SpriteSheetId;
  src: string;
  columns: number;
  rows: number;
  cellSize: number;
};

export const spriteSheets: Record<SpriteSheetId, SpriteSheetDefinition> = {
  'sheet-01': {
    id: 'sheet-01',
    src: '/assets/sprites/plain.png',
    columns: 16,
    rows: 16,
    cellSize: 64,
  },
  'sheet-02': {
    id: 'sheet-02',
    src: '/assets/sprites/soil.png',
    columns: 16,
    rows: 16,
    cellSize: 64,
  },
  'sheet-03': {
    id: 'sheet-03',
    src: '/assets/sprites/desert.png',
    columns: 16,
    rows: 16,
    cellSize: 64,
  },
  'sheet-04': {
    id: 'sheet-04',
    src: '/assets/sprites/swamp.png',
    columns: 16,
    rows: 16,
    cellSize: 64,
  },
  'sheet-05': {
    id: 'sheet-05',
    src: '/assets/sprites/forest.png',
    columns: 16,
    rows: 16,
    cellSize: 64,
  },
  'sheet-06': {
    id: 'sheet-06',
    src: '/assets/sprites/volcano.png',
    columns: 16,
    rows: 16,
    cellSize: 64,
  },
  'sheet-07': {
    id: 'sheet-07',
    src: '/assets/sprites/snowland.png',
    columns: 16,
    rows: 16,
    cellSize: 64,
  },
};

const imageCache = new Map<SpriteSheetId, HTMLImageElement>();

export function preloadSpriteSheets() {
  for (const sheet of Object.values(spriteSheets)) getSpriteSheetImage(sheet.id);
}

export function getSpriteSheetImage(sheetId: SpriteSheetId) {
  const cached = imageCache.get(sheetId);
  if (cached) return cached;
  if (typeof Image === 'undefined') return undefined;
  const sheet = spriteSheets[sheetId];
  const image = new Image();
  image.decoding = 'async';
  image.src = sheet.src;
  imageCache.set(sheetId, image);
  return image;
}

export function getSpriteSourceSize(sprite: SpriteRef) {
  const sheet = spriteSheets[sprite.sheetId];
  return {
    width: (sprite.cellsWide ?? 1) * sheet.cellSize,
    height: (sprite.cellsHigh ?? 1) * sheet.cellSize,
  };
}

export function getSpriteDrawSize(sprite: SpriteRef) {
  const source = getSpriteSourceSize(sprite);
  const scale = sprite.drawScale ?? 1;
  return {
    width: source.width * scale,
    height: source.height * scale,
  };
}

export function drawSpriteRef(
  ctx: CanvasRenderingContext2D,
  sprite: SpriteRef,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const sheet = spriteSheets[sprite.sheetId];
  const image = getSpriteSheetImage(sprite.sheetId);
  if (!image?.complete || image.naturalWidth === 0) return false;
  const { width: sourceWidth, height: sourceHeight } = getSpriteSourceSize(sprite);
  ctx.drawImage(
    image,
    sprite.x * sheet.cellSize,
    sprite.y * sheet.cellSize,
    sourceWidth,
    sourceHeight,
    x - width / 2,
    y - height / 2,
    width,
    height,
  );
  return true;
}
