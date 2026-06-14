import { getBiome } from './definitions';
import type { BiomeTile } from './types';
import { createProceduralGround } from '../../../../shared/proceduralGround';

export function generateBiomeTiles(width: number, height: number, spawn: { x: number; y: number }, seed = 0): BiomeTile[] {
  return createProceduralGround(width, height, spawn, seed).map((tile) => ({
    ...tile,
    biomeId: tile.kind === 'dry' ? 'biome-02' : 'biome-01',
  }));
}

export function getBiomeAt(tiles: BiomeTile[], x: number, y: number) {
  const tile = tiles.find((candidate) => x >= candidate.x && x < candidate.x + candidate.width && y >= candidate.y && y < candidate.y + candidate.height);
  return getBiome(tile?.biomeId ?? 'biome-01');
}
