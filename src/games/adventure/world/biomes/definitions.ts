import type { BiomeDefinition, BiomeId } from './types';

export const biomeDefinitions: Record<BiomeId, BiomeDefinition> = {
  'biome-01': {
    id: 'biome-01',
    name: 'Green Plains',
    ground: {
      base: '#acd27d',
      light: '#b9db8b',
      dark: '#9bc76f',
      detail: ['#e8d668', '#e9dce0', '#709b45'],
    },
    ambient: 'leaves',
    propDensity: 1,
    props: [
      { kind: 'tree', weight: 28, minScale: 0.78, maxScale: 1.45 },
      { kind: 'bush', weight: 18, minScale: 0.72, maxScale: 1.25 },
      { kind: 'rock', weight: 12, minScale: 0.65, maxScale: 1.15 },
      { kind: 'flower', weight: 14, minScale: 0.7, maxScale: 1.2 },
      { kind: 'flowerbed', weight: 6, minScale: 0.7, maxScale: 1.1 },
      { kind: 'mushroom', weight: 9, minScale: 0.72, maxScale: 1.1 },
      { kind: 'stump', weight: 7, minScale: 0.72, maxScale: 1.15 },
      { kind: 'dead-tree', weight: 3, minScale: 0.78, maxScale: 1.12 },
      { kind: 'rubble', weight: 3, minScale: 0.7, maxScale: 1.05 },
    ],
    enemies: [
      { id: 'minion-01', weight: 30 },
      { id: 'minion-04', weight: 24 },
      { id: 'minion-02', weight: 24 },
      { id: 'minion-03', weight: 16 },
      { id: 'minion-09', weight: 6 },
    ],
  },
  'biome-02': {
    id: 'biome-02',
    name: 'Sunbaked Plains',
    ground: {
      base: '#d9bf72',
      light: '#e4cd83',
      dark: '#c8a95f',
      detail: ['#8f8a4b', '#b67c3e', '#eee0a2'],
    },
    ambient: 'dust',
    propDensity: 0.72,
    props: [
      { kind: 'rock', weight: 29, minScale: 0.68, maxScale: 1.35 },
      { kind: 'dead-tree', weight: 18, minScale: 0.72, maxScale: 1.25 },
      { kind: 'stump', weight: 14, minScale: 0.68, maxScale: 1.2 },
      { kind: 'bush', weight: 7, minScale: 0.6, maxScale: 0.9 },
      { kind: 'mushroom', weight: 2, minScale: 0.65, maxScale: 0.9 },
      { kind: 'rubble', weight: 24, minScale: 0.65, maxScale: 1.25 },
      { kind: 'flower', weight: 6, minScale: 0.62, maxScale: 0.88 },
    ],
    enemies: [
      { id: 'minion-04', weight: 22 },
      { id: 'minion-03', weight: 20 },
      { id: 'minion-09', weight: 22 },
      { id: 'minion-05', weight: 22 },
      { id: 'minion-06', weight: 8 },
      { id: 'minion-07', weight: 6 },
    ],
  },
};

export function getBiome(id: BiomeId) {
  return biomeDefinitions[id];
}
