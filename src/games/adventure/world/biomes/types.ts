import type { WorldObjectKind } from '../types';

export type BiomeId = 'biome-01' | 'biome-02';

export type BiomePropEntry = {
  kind: WorldObjectKind;
  weight: number;
  minScale: number;
  maxScale: number;
};

export type BiomeEnemyEntry = {
  id: string;
  weight: number;
};

export type BiomeDefinition = {
  id: BiomeId;
  name: string;
  ground: {
    base: string;
    light: string;
    dark: string;
    detail: string[];
  };
  ambient: 'leaves' | 'dust' | 'none';
  propDensity: number;
  props: BiomePropEntry[];
  enemies: BiomeEnemyEntry[];
};

export type BiomeTile = {
  id: string;
  biomeId: BiomeId;
  kind: 'green' | 'dry';
  x: number;
  y: number;
  width: number;
  height: number;
  variant: number;
  blend: number;
};
