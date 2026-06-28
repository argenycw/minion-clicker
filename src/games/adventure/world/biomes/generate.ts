import { getBiome } from './definitions';
import type { BiomeTile } from './types';
import { createProceduralGround, createProceduralGroundRegion } from '../../../../shared/proceduralGround';
import { getAdventureRankAtWorldPosition } from '../../progression/system';

export function generateBiomeTiles(width: number, height: number, spawn: { x: number; y: number }, seed = 0): BiomeTile[] {
  return createProceduralGround(width, height, spawn, seed).map((tile) => ({
    ...tile,
    biomeId: tile.kind === 'dry' ? 'biome-02' : 'biome-01',
    rank: getAdventureRankAtWorldPosition({ x: tile.x + tile.width / 2, y: tile.y + tile.height / 2 }),
  }));
}

export function generateBiomeTilesRegion(originX: number, originY: number, width: number, height: number, spawn: { x: number; y: number }, seed = 0): BiomeTile[] {
  return createProceduralGroundRegion(originX, originY, width, height, spawn, seed).map((tile) => ({
    ...tile,
    biomeId: tile.kind === 'dry' ? 'biome-02' : 'biome-01',
    rank: getAdventureRankAtWorldPosition({ x: tile.x + tile.width / 2, y: tile.y + tile.height / 2 }),
  }));
}

export function getBiomeAt(tiles: BiomeTile[], x: number, y: number) {
  const tile = tiles.find((candidate) => x >= candidate.x && x < candidate.x + candidate.width && y >= candidate.y && y < candidate.y + candidate.height);
  return getBiome(tile?.biomeId ?? 'biome-01');
}
