import type { DungeonId, DungeonLocationKind } from '../../dungeons/types';

export type WorldLocation = {
  id: string;
  kind: DungeonLocationKind;
  name: string;
  x: number;
  y: number;
  radius: number;
  dungeonId: DungeonId;
  chunkKey?: string;
};
