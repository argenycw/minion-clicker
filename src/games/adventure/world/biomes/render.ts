import { drawProceduralGround } from '../../../../shared/proceduralGround';
import type { BiomeTile } from './types';

export function drawBiomeGround(ctx: CanvasRenderingContext2D, tiles: BiomeTile[], width: number, height: number, now: number) {
  drawProceduralGround(ctx, tiles, width, height, now);
}
