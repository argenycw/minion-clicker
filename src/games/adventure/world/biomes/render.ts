import { drawProceduralGround } from '../../../../shared/proceduralGround';
import { getBiome } from './definitions';
import type { BiomeTile } from './types';

export function drawBiomeGround(ctx: CanvasRenderingContext2D, tiles: BiomeTile[], width: number, height: number, now: number, bounds?: { left: number; top: number; right: number; bottom: number }, ambientEffects = true, origin = { x: 0, y: 0 }) {
  drawProceduralGround(ctx, tiles, width, height, now, bounds, ambientEffects, origin, (tile) => {
    const biomeId = (tile as BiomeTile).biomeId ?? 'biome-01';
    return getBiome(biomeId).ground;
  });
}
