export type SpriteSheetId = 'adventure-props-01';

export type SpriteRef = {
  sheetId: SpriteSheetId;
  x: number;
  y: number;
  width?: number;
  height?: number;
};

export type SpriteSheetDefinition = {
  id: SpriteSheetId;
  src: string;
  columns: number;
  rows: number;
  cellSize: number;
};

export const spriteSheets: Record<SpriteSheetId, SpriteSheetDefinition> = {
  'adventure-props-01': {
    id: 'adventure-props-01',
    src: '/assets/sprites/adventure-props-sheet-01.png',
    columns: 4,
    rows: 4,
    cellSize: 256,
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
  const sourceWidth = sprite.width ?? sheet.cellSize;
  const sourceHeight = sprite.height ?? sheet.cellSize;
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
