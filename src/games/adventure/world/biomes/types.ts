import type { WorldObjectKind } from '../types';
import type { AdventureRank } from '../../progression/types';

export type BiomeId = 'biome-01' | 'biome-02' | 'biome-03' | 'biome-04' | 'biome-05' | 'biome-06' | 'biome-07';

export type BiomePropEntry = {
  kind: WorldObjectKind;
  weight: number;
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
  rank: AdventureRank;
};
