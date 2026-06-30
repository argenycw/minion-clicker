import { getBiome } from './definitions';
import type { BiomeId, BiomeTile } from './types';
import { createProceduralGround, createProceduralGroundRegion } from '../../../../shared/proceduralGround';
import { getAdventureRankAtWorldPosition } from '../../progression/system';

type SpecialBiomeZone = {
  biomeId: BiomeId;
  angle: number;
  distance: number;
  radiusX: number;
  radiusY: number;
  rotation: number;
};

const SPAWN_BASE_RADIUS = 1600;
const SPECIAL_BIOME_ZONES: SpecialBiomeZone[] = [
  { biomeId: 'biome-03', angle: -0.12, distance: 7600, radiusX: 3900, radiusY: 2750, rotation: 0.18 },
  { biomeId: 'biome-03', angle: 2.92, distance: 14200, radiusX: 4300, radiusY: 2950, rotation: -0.2 },
  { biomeId: 'biome-04', angle: -2.22, distance: 8200, radiusX: 3500, radiusY: 3000, rotation: -0.52 },
  { biomeId: 'biome-04', angle: 0.98, distance: 13400, radiusX: 3850, radiusY: 3150, rotation: 0.34 },
  { biomeId: 'biome-05', angle: 0.42, distance: 7000, radiusX: 3800, radiusY: 3300, rotation: 0.42 },
  { biomeId: 'biome-05', angle: -2.92, distance: 12600, radiusX: 4200, radiusY: 3400, rotation: -0.18 },
  { biomeId: 'biome-06', angle: 2.1, distance: 9800, radiusX: 3600, radiusY: 2700, rotation: 0.16 },
  { biomeId: 'biome-06', angle: -0.9, distance: 15800, radiusX: 4200, radiusY: 3000, rotation: -0.36 },
  { biomeId: 'biome-07', angle: -1.52, distance: 9000, radiusX: 3900, radiusY: 3200, rotation: -0.28 },
  { biomeId: 'biome-07', angle: 1.58, distance: 15400, radiusX: 4300, radiusY: 3400, rotation: 0.28 },
];

export function generateBiomeTiles(width: number, height: number, spawn: { x: number; y: number }, seed = 0): BiomeTile[] {
  return createProceduralGround(width, height, spawn, seed).map((tile) => ({
    ...tile,
    biomeId: chooseBiomeId(tile, spawn, seed),
    rank: getAdventureRankAtWorldPosition({ x: tile.x + tile.width / 2, y: tile.y + tile.height / 2 }),
  }));
}

export function generateBiomeTilesRegion(originX: number, originY: number, width: number, height: number, spawn: { x: number; y: number }, seed = 0): BiomeTile[] {
  return createProceduralGroundRegion(originX, originY, width, height, spawn, seed).map((tile) => ({
    ...tile,
    biomeId: chooseBiomeId(tile, spawn, seed),
    rank: getAdventureRankAtWorldPosition({ x: tile.x + tile.width / 2, y: tile.y + tile.height / 2 }),
  }));
}

export function getBiomeAt(tiles: BiomeTile[], x: number, y: number) {
  const tile = tiles.find((candidate) => x >= candidate.x && x < candidate.x + candidate.width && y >= candidate.y && y < candidate.y + candidate.height);
  return getBiome(tile?.biomeId ?? 'biome-01');
}

function chooseBiomeId(tile: { kind: string; x: number; y: number; width: number; height: number; blend: number; variant: number }, spawn: { x: number; y: number }, seed: number): BiomeId {
  const centerX = tile.x + tile.width / 2;
  const centerY = tile.y + tile.height / 2;
  const distance = Math.hypot(centerX - spawn.x, centerY - spawn.y);
  const baseBiomeId: BiomeId = tile.kind === 'dry' ? 'biome-02' : 'biome-01';
  if (distance < SPAWN_BASE_RADIUS) return baseBiomeId;

  const zoneBiomeId = getSpecialBiomeZoneAt(centerX, centerY, tile.variant, spawn, seed);
  return zoneBiomeId ?? baseBiomeId;
}

function getSpecialBiomeZoneAt(x: number, y: number, tileVariant: number, spawn: { x: number; y: number }, seed: number) {
  const rotation = seeded(seed + 991) * Math.PI * 2;
  let best: { biomeId: BiomeId; score: number } | undefined;
  SPECIAL_BIOME_ZONES.forEach((zone, index) => {
    const angle = zone.angle + rotation + (seeded(seed + index * 97 + 13) - 0.5) * 0.18;
    const distance = zone.distance * (0.94 + seeded(seed + index * 131 + 41) * 0.12);
    const centerX = spawn.x + Math.cos(angle) * distance;
    const centerY = spawn.y + Math.sin(angle) * distance;
    const radiusX = zone.radiusX * (0.96 + seeded(seed + index * 149 + 71) * 0.08);
    const radiusY = zone.radiusY * (0.96 + seeded(seed + index * 167 + 89) * 0.08);
    const edgeNoise = (tileVariant - 0.5) * 0.05 + (seeded(Math.round(x / 160) * 37 + Math.round(y / 160) * 101 + seed + index * 211) - 0.5) * 0.04;
    const score = getEllipseScore(x, y, centerX, centerY, radiusX, radiusY, zone.rotation + rotation * 0.14) + edgeNoise;
    if (score <= 1 && (!best || score < best.score)) best = { biomeId: zone.biomeId, score };
  });
  return best?.biomeId;
}

function getEllipseScore(x: number, y: number, centerX: number, centerY: number, radiusX: number, radiusY: number, rotation: number) {
  const dx = x - centerX;
  const dy = y - centerY;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const localX = dx * cos + dy * sin;
  const localY = -dx * sin + dy * cos;
  return (localX / radiusX) ** 2 + (localY / radiusY) ** 2;
}

function seeded(seed: number) {
  const value = Math.sin(seed * 0.017) * 10000;
  return value - Math.floor(value);
}
