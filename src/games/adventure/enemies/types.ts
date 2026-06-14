import type { Facing } from '../state';

export type AdventureEnemyDefinition = {
  id: string;
  name: string;
  body: string;
  leftHand?: string;
  rightHand?: string;
  deathBody: string;
  deathLeftHand?: string;
  deathRightHand?: string;
  color: string;
  pillWidth: number;
  maxHp: number;
  attack: number;
  speed: number;
  attackSpeed: number;
  attackRange: number;
  aggroRadius: number;
};

export type AdventureEnemy = {
  id: string;
  defId: string;
  name: string;
  x: number;
  y: number;
  spawnX: number;
  spawnY: number;
  hp: number;
  maxHp: number;
  facing: Facing;
  radius: number;
  body: string;
  leftHand?: string;
  rightHand?: string;
  deathBody: string;
  deathLeftHand?: string;
  deathRightHand?: string;
  color: string;
  pillWidth: number;
  attack: number;
  speed: number;
  attackSpeed: number;
  attackRange: number;
  aggroRadius: number;
  attackReadyAt: number;
  invulnerable?: boolean;
};
