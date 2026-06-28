import type { AdventureEnemy } from '../enemies/types';
import { type Actor, type AdventurePlayerId, type AdventureState, type CombatEffect, type Facing, type Projectile } from '../state';

export type AdventureMotionEntity = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: Facing;
};

export type AdventureMotionFrame = {
  sequence: number;
  players: Partial<Record<AdventurePlayerId, AdventureMotionEntity>>;
  enemies: Record<string, AdventureMotionEntity>;
  projectiles: Projectile[];
  effects: Array<Omit<CombatEffect, 'born'> & { ageMs: number }>;
};

export type AdventureMotionHistory = {
  capturedAt: number;
  players: Record<string, { x: number; y: number }>;
  enemies: Record<string, { x: number; y: number }>;
};

export type AdventureMotionTargets = {
  receivedAt: number;
  frame: AdventureMotionFrame;
};

export type AdventureRenderMotion = {
  players: Partial<Record<AdventurePlayerId, Actor>>;
  enemies: Record<string, Pick<AdventureEnemy, 'x' | 'y' | 'facing'>>;
  projectiles: Projectile[];
  effects: CombatEffect[];
};

export function captureAdventureMotionFrame(
  state: AdventureState,
  previous: AdventureMotionHistory | undefined,
  capturedAt: number,
  sequence: number,
): { frame: AdventureMotionFrame; history: AdventureMotionHistory } {
  const elapsedSeconds = previous ? Math.max(0.001, (capturedAt - previous.capturedAt) / 1000) : 0;
  const players = Object.fromEntries(Object.entries(state.players).map(([id, player]) => [
    id,
    motionEntity(player.actor, previous?.players[id], elapsedSeconds),
  ])) as AdventureMotionFrame['players'];
  const enemies = Object.fromEntries(state.enemies.map((enemy) => [
    enemy.id,
    motionEntity(enemy, previous?.enemies[enemy.id], elapsedSeconds),
  ]));
  return {
    frame: {
      sequence,
      players,
      enemies,
      projectiles: state.projectiles,
      effects: state.effects.map(({ born, ...effect }) => ({ ...effect, ageMs: Math.max(0, capturedAt - born) })),
    },
    history: {
      capturedAt,
      players: Object.fromEntries(Object.entries(state.players).map(([id, player]) => [id, { x: player.actor.x, y: player.actor.y }])),
      enemies: Object.fromEntries(state.enemies.map((enemy) => [enemy.id, { x: enemy.x, y: enemy.y }])),
    },
  };
}

export function updateAdventureRenderMotion(
  state: AdventureState,
  rendered: AdventureRenderMotion,
  targets: AdventureMotionTargets | undefined,
  localPlayerId: AdventurePlayerId,
  now: number,
  deltaSeconds: number,
): AdventureRenderMotion {
  const players: AdventureRenderMotion['players'] = {};
  const enemies: AdventureRenderMotion['enemies'] = {};
  const extrapolationSeconds = targets ? Math.min(0.15, Math.max(0, now - targets.receivedAt) / 1000) : 0;
  const smoothing = 1 - Math.exp(-14 * deltaSeconds);

  for (const [id, player] of Object.entries(state.players) as Array<[AdventurePlayerId, AdventureState['players'][AdventurePlayerId]]>) {
    const current = rendered.players[id] ?? player.actor;
    const targetMotion = targets?.frame.players[id];
    const target = targetMotion ? extrapolate(targetMotion, extrapolationSeconds) : player.actor;
    if (id === localPlayerId) {
      players[id] = player.actor;
    } else {
      players[id] = {
        ...player.actor,
        x: lerp(current.x, target.x, smoothing),
        y: lerp(current.y, target.y, smoothing),
        facing: targetMotion?.facing ?? player.actor.facing,
      };
    }
  }

  for (const enemy of state.enemies) {
    const current = rendered.enemies[enemy.id] ?? enemy;
    const targetMotion = targets?.frame.enemies[enemy.id];
    const target = targetMotion ? extrapolate(targetMotion, extrapolationSeconds) : enemy;
    enemies[enemy.id] = {
      x: lerp(current.x, target.x, smoothing),
      y: lerp(current.y, target.y, smoothing),
      facing: targetMotion?.facing ?? enemy.facing,
    };
  }
  const projectiles = targets
    ? targets.frame.projectiles.map((projectile) => ({
      ...projectile,
      x: projectile.x + projectile.vx * extrapolationSeconds,
      y: projectile.y + projectile.vy * extrapolationSeconds,
    }))
    : state.projectiles;
  const effects = targets
    ? targets.frame.effects.map(({ ageMs, ...effect }) => ({ ...effect, born: targets.receivedAt - ageMs }))
    : state.effects;
  return { players, enemies, projectiles, effects };
}

function motionEntity(entity: { x: number; y: number; facing: Facing }, previous: { x: number; y: number } | undefined, elapsedSeconds: number): AdventureMotionEntity {
  return {
    x: entity.x,
    y: entity.y,
    vx: previous && elapsedSeconds ? (entity.x - previous.x) / elapsedSeconds : 0,
    vy: previous && elapsedSeconds ? (entity.y - previous.y) / elapsedSeconds : 0,
    facing: entity.facing,
  };
}

function extrapolate(entity: AdventureMotionEntity, seconds: number) {
  return { x: entity.x + entity.vx * seconds, y: entity.y + entity.vy * seconds };
}

function lerp(from: number, to: number, amount: number) {
  return from + (to - from) * amount;
}
