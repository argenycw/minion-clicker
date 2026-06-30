import { drawAmbientTerrainEffects } from './terrainRenderer';

export type ProceduralGroundTile = {
  id: string;
  kind: 'green' | 'dry';
  x: number;
  y: number;
  width: number;
  height: number;
  variant: number;
  blend: number;
};

export type ProceduralGroundPalette = {
  light: string;
  dark: string;
  detail: string[];
};

const TILE_SIZE = 160;
const REGION_TILES = 7;
const palettes: Record<string, ProceduralGroundPalette> = {
  green: { light: '#b9db8b', dark: '#9bc76f', detail: ['#e8d668', '#e9dce0', '#709b45'] },
  dry: { light: '#e4cd83', dark: '#c8a95f', detail: ['#8f8a4b', '#b67c3e', '#eee0a2'] },
};

const cachedGround = new WeakMap<ProceduralGroundTile[], HTMLCanvasElement>();
const pseudoCache = new Map<string, number>();

export function createProceduralGround(width: number, height: number, spawn: { x: number; y: number }, seed: number) {
  return createProceduralGroundTiles(0, 0, width, height, spawn, seed, false, 0);
}

export function createProceduralGroundRegion(originX: number, originY: number, width: number, height: number, spawn: { x: number; y: number }, seed: number) {
  return createProceduralGroundTiles(originX, originY, width, height, spawn, seed, true, 1);
}

function createProceduralGroundTiles(originX: number, originY: number, width: number, height: number, spawn: { x: number; y: number }, seed: number, numericIds: boolean, bleedTiles: number) {
  const firstColumn = Math.floor(originX / TILE_SIZE) - bleedTiles;
  const firstRow = Math.floor(originY / TILE_SIZE) - bleedTiles;
  const columns = Math.ceil(width / TILE_SIZE) + bleedTiles * 2;
  const rows = Math.ceil(height / TILE_SIZE) + bleedTiles * 2;
  return Array.from({ length: columns * rows }, (_, index): ProceduralGroundTile => {
    const column = firstColumn + index % columns;
    const row = firstRow + Math.floor(index / columns);
    const x = column * TILE_SIZE;
    const y = row * TILE_SIZE;
    const distanceFromSpawn = Math.hypot(x + TILE_SIZE / 2 - spawn.x, y + TILE_SIZE / 2 - spawn.y);
    const regionalNoise = sampleRegionalNoise(column, row, seed);
    const spawnProtection = 1 - smoothstep(520, 1050, distanceFromSpawn);
    const blend = clamp01(regionalNoise - spawnProtection * 0.72);
    return {
      id: numericIds
        ? `ground-${pairIntegers(pairIntegers(BigInt(seed), BigInt(column)), BigInt(row))}`
        : `ground-${seed}-${column}-${row}`,
      kind: blend > 0.52 ? 'dry' : 'green',
      x,
      y,
      width: TILE_SIZE,
      height: TILE_SIZE,
      variant: sampleRegionalNoise(column + 29.5, row - 17.5, seed),
      blend,
    };
  });
}

export function drawProceduralGround(
  ctx: CanvasRenderingContext2D,
  tiles: ProceduralGroundTile[],
  width: number,
  height: number,
  now: number,
  bounds?: { left: number; top: number; right: number; bottom: number },
  ambientEffects = true,
  origin = { x: 0, y: 0 },
  resolvePalette: (tile: ProceduralGroundTile) => ProceduralGroundPalette = (tile) => palettes[tile.kind] ?? palettes.green,
) {
  const ground = getGroundCanvas(tiles, resolvePalette);
  const groundOriginX = Math.min(...tiles.map((tile) => tile.x));
  const groundOriginY = Math.min(...tiles.map((tile) => tile.y));
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(ground, groundOriginX, groundOriginY, ground.width * TILE_SIZE, ground.height * TILE_SIZE);
  for (const tile of tiles) {
    if (bounds && !intersects(bounds, tile.x, tile.y, tile.width, tile.height)) continue;
    const palette = resolvePalette(tile);
    drawTilePatches(ctx, tile, palette.light, palette.dark);
    drawTileDetails(ctx, tile, palette.detail);
  }
  if (ambientEffects && tiles.some((tile) => tile.kind === 'green')) {
    ctx.save();
    ctx.translate(origin.x, origin.y);
    drawAmbientTerrainEffects(ctx, width, height, now);
    ctx.restore();
  }
  if (ambientEffects) drawDust(ctx, tiles, now);
}

function intersects(bounds: { left: number; top: number; right: number; bottom: number }, x: number, y: number, width: number, height: number) {
  return x + width >= bounds.left && x <= bounds.right && y + height >= bounds.top && y <= bounds.bottom;
}

function getGroundCanvas(tiles: ProceduralGroundTile[], resolvePalette: (tile: ProceduralGroundTile) => ProceduralGroundPalette) {
  const cached = cachedGround.get(tiles);
  if (cached) return cached;
  const firstX = Math.min(...tiles.map((tile) => tile.x));
  const firstY = Math.min(...tiles.map((tile) => tile.y));
  const columns = Math.max(1, Math.round((Math.max(...tiles.map((tile) => tile.x)) - firstX) / TILE_SIZE) + 1);
  const rows = Math.max(1, Math.round((Math.max(...tiles.map((tile) => tile.y)) - firstY) / TILE_SIZE) + 1);
  const canvas = document.createElement('canvas');
  canvas.width = columns;
  canvas.height = rows;
  const context = canvas.getContext('2d');
  if (!context) return canvas;
  const image = context.createImageData(columns, rows);
  tiles.forEach((tile) => {
    const tone = (tile.variant - 0.5) * 0.1;
    const palette = resolvePalette(tile);
    const color = mixHex(palette.dark, palette.light, 0.5 + tone);
    const column = Math.round((tile.x - firstX) / TILE_SIZE);
    const row = Math.round((tile.y - firstY) / TILE_SIZE);
    image.data.set([...color, 255], (row * columns + column) * 4);
  });
  context.putImageData(image, 0, 0);
  cachedGround.set(tiles, canvas);
  return canvas;
}

function drawTilePatches(ctx: CanvasRenderingContext2D, tile: ProceduralGroundTile, light: string, dark: string) {
  for (let index = 0; index < 3; index += 1) {
    ctx.globalAlpha = 0.055;
    ctx.fillStyle = index % 2 === 0 ? light : dark;
    ctx.beginPath();
    ctx.ellipse(tile.x + pseudo(tile.id, index * 7 + 1) * tile.width, tile.y + pseudo(tile.id, index * 7 + 2) * tile.height, 45 + pseudo(tile.id, index * 7 + 3) * 90, 32 + pseudo(tile.id, index * 7 + 4) * 65, pseudo(tile.id, index * 7 + 5) * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawTileDetails(ctx: CanvasRenderingContext2D, tile: ProceduralGroundTile, colors: string[]) {
  for (let index = 0; index < 5; index += 1) {
    const x = tile.x + pseudo(tile.id, index * 13 + 21) * tile.width;
    const y = tile.y + pseudo(tile.id, index * 13 + 22) * tile.height;
    ctx.fillStyle = colors[index % colors.length];
    ctx.globalAlpha = 0.55;
    for (let dot = 0; dot < 3; dot += 1) {
      const angle = pseudo(tile.id, index * 31 + dot) * Math.PI * 2;
      const distance = 4 + pseudo(tile.id, index * 37 + dot) * 10;
      ctx.beginPath();
      ctx.arc(x + Math.cos(angle) * distance, y + Math.sin(angle) * distance, 1.2 + dot * 0.28, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

function drawDust(ctx: CanvasRenderingContext2D, tiles: ProceduralGroundTile[], now: number) {
  const dryTiles = tiles.filter((tile) => tile.kind === 'dry');
  for (let index = 0; index < 55; index += 1) {
    const tile = dryTiles[Math.floor(pseudo(`dust-${tiles[0]?.id}`, index) * dryTiles.length)];
    if (!tile) continue;
    const cycle = 6000 + pseudo('dust-cycle', index) * 5000;
    const progress = ((now + pseudo('dust-phase', index) * cycle) % cycle) / cycle;
    if (progress > 0.55) continue;
    ctx.globalAlpha = Math.sin((progress / 0.55) * Math.PI) * 0.28;
    ctx.fillStyle = '#8c6b35';
    ctx.beginPath();
    ctx.arc(tile.x + pseudo('dust-x', index) * tile.width + progress * 70, tile.y + pseudo('dust-y', index) * tile.height + Math.sin(progress * Math.PI * 4) * 14, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function sampleRegionalNoise(column: number, row: number, seed: number) {
  const gridX = column / REGION_TILES;
  const gridY = row / REGION_TILES;
  const x0 = Math.floor(gridX);
  const y0 = Math.floor(gridY);
  const tx = smootherstep(gridX - x0);
  const ty = smootherstep(gridY - y0);
  const value = (x: number, y: number) => seeded((x + 71) * 92821 + (y - 43) * 68917 + seed * 1709);
  return lerp(lerp(value(x0, y0), value(x0 + 1, y0), tx), lerp(value(x0, y0 + 1), value(x0 + 1, y0 + 1), tx), ty);
}

function mixHex(from: string, to: string, amount: number) { return mixRgb(hexToRgb(from), hexToRgb(to), amount); }
function mixRgb(from: [number, number, number], to: [number, number, number], amount: number): [number, number, number] { return from.map((value, index) => Math.round(value + (to[index] - value) * amount)) as [number, number, number]; }
function hexToRgb(hex: string): [number, number, number] { const value = Number.parseInt(hex.slice(1), 16); return [(value >> 16) & 255, (value >> 8) & 255, value & 255]; }
function seeded(seed: number) { const value = Math.sin(seed * 999) * 10000; return value - Math.floor(value); }
function pseudo(id: string, salt: number) {
  const key = `${id}:${salt}`;
  const cached = pseudoCache.get(key);
  if (cached !== undefined) return cached;
  let seed = salt * 97;
  for (const character of id) seed = (seed * 31 + character.charCodeAt(0)) | 0;
  const result = seeded(seed * 0.001);
  pseudoCache.set(key, result);
  return result;
}
function smootherstep(value: number) { return value * value * value * (value * (value * 6 - 15) + 10); }
function smoothstep(min: number, max: number, value: number) { const t = clamp01((value - min) / (max - min)); return t * t * (3 - 2 * t); }
function lerp(from: number, to: number, amount: number) { return from + (to - from) * amount; }
function clamp01(value: number) { return Math.max(0, Math.min(1, value)); }
function pairIntegers(first: bigint, second: bigint) {
  const x = first >= 0n ? first * 2n : -first * 2n - 1n;
  const y = second >= 0n ? second * 2n : -second * 2n - 1n;
  const sum = x + y;
  return sum * (sum + 1n) / 2n + y;
}
