import type { WorldObject } from '../world';

export type TownId = `town-${string}`;
export type TownNpcId = `npc-${string}`;

export type TownNpcDefinition = {
  id: TownNpcId;
  name: string;
  kind: 'merchant' | 'blacksmith' | 'villager';
  x: number;
  y: number;
  radius: number;
  body: string;
  color: string;
  pillWidth: number;
  facing: 'left' | 'right';
  shopId?: `shop-${string}`;
};

export type TownDefinition = {
  id: TownId;
  name: string;
  width: number;
  height: number;
  spawn: { x: number; y: number };
  exit: { x: number; y: number; radius: number };
  npcs: TownNpcDefinition[];
  objects: WorldObject[];
};

export type TownInstance = TownDefinition;
