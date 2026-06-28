import type { DungeonId, DungeonLocationKind } from '../../dungeons/types';
import type { TownId } from '../../towns/types';

export type WorldLocation =
  | {
  id: string;
  kind: DungeonLocationKind;
  name: string;
  x: number;
  y: number;
  radius: number;
  dungeonId: DungeonId;
  chunkKey?: string;
}
  | {
  id: string;
  kind: 'town';
  name: string;
  x: number;
  y: number;
  radius: number;
  townId: TownId;
  chunkKey?: string;
};
