import { getAdventureEnemyDefinition } from '../enemies/definitions';
import type { AdventureEnemy } from '../enemies/types';
import {
  getAdventureRankMultiplier,
  scaleDungeonEnemyCountRangeForRank,
  scaleEnemyStatsForRank,
} from '../progression/system';
import type { AdventureRank } from '../progression/types';
import { createProp } from '../world/props';
import type { WorldObject } from '../world/types';
import { getDungeonDefinition } from './definitions';
import { makeDungeonRoomFootprint, makeDungeonRoomWalkableRects, selectDungeonRoomKind } from './rooms';
import { getDungeonPropSprite } from './sprites';
import type { DungeonInstance, DungeonProp, DungeonRect, DungeonRoom, DungeonId } from './types';

const GRID_X = 1220;
const GRID_Y = 920;
const CORRIDOR_WIDTH = 240;

export function generateDungeon(definitionId: DungeonId, entranceId: string, mapSeed: number, now: number, rank: AdventureRank, depth = 1): DungeonInstance {
  const definition = getDungeonDefinition(definitionId);
  const totalDepth = definition.totalDepth;
  const currentDepth = Math.max(1, Math.min(totalDepth, Math.floor(depth)));
  const isBossFloor = currentDepth >= totalDepth;
  const seed = hashText(`${mapSeed}:${entranceId}:${definitionId}:${currentDepth}`);
  const roomCount = isBossFloor ? 1 : randomInt(seed, 1, definition.roomCount);
  const cells = generateConnectedCells(seed, roomCount);
  const rooms = cells.map((cell, index): DungeonRoom => {
    const width = isBossFloor ? 1320 : randomBetween(seed, index * 17 + 21, definition.roomWidth);
    const height = isBossFloor ? 920 : randomBetween(seed, index * 17 + 22, definition.roomHeight);
    const centerX = cell.x * GRID_X;
    const centerY = cell.y * GRID_Y;
    const kind = selectDungeonRoomKind({ seed, index, isBossFloor, random });
    const bounds = {
      x: centerX - width / 2,
      y: centerY - height / 2,
      width,
      height,
    };
    const walkableRects = makeDungeonRoomWalkableRects({ seed, index, kind, bounds, random });
    return {
      id: makeDungeonEntityId('room', entranceId, index + 1),
      index,
      kind,
      ...bounds,
      walkableRects,
      footprint: makeDungeonRoomFootprint(bounds, walkableRects),
      centerX,
      centerY,
    };
  });
  const corridors = isBossFloor ? [] : makeDungeonCorridors(seed, cells, rooms);
  const rankMultiplier = getAdventureRankMultiplier(rank);
  const bossChestCount = 3 + Math.min(2, rankMultiplier.chestRollBonus);
  const chests = isBossFloor
    ? Array.from({ length: bossChestCount }, (_, index) => ({
      id: makeDungeonEntityId('chest', entranceId, currentDepth * 100 + index + 1),
      x: rooms[0].centerX + (index - (bossChestCount - 1) / 2) * 96,
      y: rooms[0].centerY - 190,
      opened: false,
      requiresBossDefeat: true,
    }))
    : rooms.slice(1).flatMap((room, index) => index === 0 || random(seed, index * 29 + 91) < Math.min(0.85, definition.chestChance + rankMultiplier.chestRollBonus * 0.08)
      ? [{
        id: makeDungeonEntityId('chest', entranceId, index + 1),
        x: room.centerX + room.width * (random(seed, index * 29 + 92) - 0.5) * 0.48,
        y: room.centerY + room.height * (random(seed, index * 29 + 93) - 0.5) * 0.42,
        opened: false,
      }]
      : []);
  const enemiesPerRoom = scaleDungeonEnemyCountRange(definition.enemiesPerRoom, rank);
  const enemies = isBossFloor
    ? [makeBossEnemy(seed, entranceId, rooms[0], definition.bossEnemyId, now, rank, currentDepth)]
    : rooms.slice(1).flatMap((room, roomIndex) => room.kind === 'clutter'
      ? makeRoomEnemies(seed, entranceId, room, roomIndex, definition.enemyIds, [0, 1], now, rank)
      : makeRoomEnemies(seed, entranceId, room, roomIndex, definition.enemyIds, enemiesPerRoom, now, rank));
  const first = rooms[0];
  const spawn = { x: first.centerX, y: first.centerY + (isBossFloor ? 280 : 80) };
  const exit = { id: makeDungeonEntityId('exit', entranceId, currentDepth), x: first.centerX, y: isBossFloor ? first.centerY - 320 : first.centerY - 90 };
  const stairs = isBossFloor ? undefined : {
    id: makeDungeonEntityId('stair', entranceId, currentDepth),
    x: rooms[rooms.length - 1].centerX,
    y: rooms[rooms.length - 1].centerY,
    targetDepth: currentDepth + 1,
  };
  const generatedRoomProps = rooms
    .flatMap((room, roomIndex) => makeRoomProps(seed, entranceId, room, roomIndex))
    .filter((prop) => Math.hypot(prop.x - spawn.x, prop.y - spawn.y) > 130)
    .filter((prop) => Math.hypot(prop.x - exit.x, prop.y - exit.y) > 130)
    .filter((prop) => !stairs || Math.hypot(prop.x - stairs.x, prop.y - stairs.y) > 130)
    .filter((prop) => chests.every((chest) => Math.hypot(prop.x - chest.x, prop.y - chest.y) > 105))
    .filter((prop) => enemies.every((enemy) => Math.hypot(prop.x - enemy.x, prop.y - enemy.y) > 90));
  const objects = generatedRoomProps
    .filter(isDungeonPropObject)
    .map((prop, index) => makeDungeonObject(entranceId, prop, index));
  const props = generatedRoomProps.filter((prop) => !isDungeonPropObject(prop));
  return {
    id: makeDungeonEntityId('dungeon-instance', entranceId, 1),
    definitionId,
    entranceId,
    rank,
    depth: currentDepth,
    totalDepth,
    rooms,
    corridors,
    walkable: [...rooms.flatMap((room) => room.walkableRects), ...corridors],
    enemies,
    chests,
    props,
    objects,
    exit,
    stairs,
    bossEnemyId: isBossFloor ? enemies[0]?.id : undefined,
    spawn,
  };
}

function makeRoomProps(seed: number, entranceId: string, room: DungeonRoom, roomIndex: number) {
  const countRange: [number, number] = room.kind === 'clutter' ? [16, 26] : room.kind === 'boss' ? [8, 12] : [6, 11];
  const count = randomInt(seed, roomIndex * 71 + 401, countRange);
  return Array.from({ length: count }, (_, index): DungeonProp => {
    const roll = random(seed, roomIndex * 83 + index * 11 + 501);
    const kind = selectDungeonPropKind(roll, room.kind);
    const point = pickDungeonPropPoint(seed, room, roomIndex, index, kind);
    return {
      id: makeDungeonEntityId('dungeon-prop', entranceId, roomIndex * 100 + index + 1),
      kind,
      x: point.x,
      y: point.y,
      scale: getDungeonPropScale(seed, roomIndex, index, kind),
      flipX: random(seed, roomIndex * 83 + index * 11 + 505) > 0.5,
    };
  });
}

function selectDungeonPropKind(roll: number, roomKind: DungeonRoom['kind']): DungeonProp['kind'] {
  if (roomKind === 'clutter') {
    if (roll < 0.2) return 'floor-pile';
    if (roll < 0.42) return 'stone-object';
    if (roll < 0.58) return 'stone-decor';
    if (roll < 0.78) return 'destroyable-prop';
    if (roll < 0.9) return 'tall-stone';
    return 'light-source';
  }
  if (roomKind === 'boss') {
    if (roll < 0.22) return 'floor-pile';
    if (roll < 0.44) return 'tall-stone';
    if (roll < 0.7) return 'stone-object';
    if (roll < 0.86) return 'stone-decor';
    return 'light-source';
  }
  if (roll < 0.18) return 'floor-pile';
  if (roll < 0.54) return 'stone-object';
  if (roll < 0.72) return 'tall-stone';
  if (roll < 0.88) return 'stone-decor';
  if (roll < 0.96) return 'destroyable-prop';
  return 'light-source';
}

function pickDungeonPropPoint(seed: number, room: DungeonRoom, roomIndex: number, propIndex: number, kind: DungeonProp['kind']) {
  const rects = room.walkableRects.length > 0 ? room.walkableRects : [room];
  const rect = rects[Math.floor(random(seed, roomIndex * 83 + propIndex * 11 + 502) * rects.length) % rects.length];
  const inset = kind === 'tall-stone' ? 94 : isDungeonPropObjectKind(kind) ? 72 : 48;
  const width = Math.max(1, rect.width - inset * 2);
  const height = Math.max(1, rect.height - inset * 2);
  return {
    x: rect.x + inset + random(seed, roomIndex * 83 + propIndex * 11 + 503) * width,
    y: rect.y + inset + random(seed, roomIndex * 83 + propIndex * 11 + 504) * height,
  };
}

function getDungeonPropScale(seed: number, roomIndex: number, propIndex: number, kind: DungeonProp['kind']) {
  const value = random(seed, roomIndex * 83 + propIndex * 11 + 506);
  if (kind === 'floor-pile') return 0.84 + value * 0.34;
  if (kind === 'tall-stone') return 0.9 + value * 0.24;
  if (kind === 'destroyable-prop') return 0.86 + value * 0.28;
  if (kind === 'light-source' || kind === 'wall-mount') return 0.8 + value * 0.18;
  return 0.82 + value * 0.36;
}

function generateConnectedCells(seed: number, count: number) {
  const cells = [{ x: 0, y: 0, parentIndex: 0 }];
  const used = new Set(['0,0']);
  for (let index = 1; index < count; index += 1) {
    let placed = false;
    const frontier = [...cells.keys()].sort((a, b) => {
      const cellA = cells[a];
      const cellB = cells[b];
      const openA = countOpenNeighbors(cellA, used);
      const openB = countOpenNeighbors(cellB, used);
      if (openA !== openB) return openB - openA;
      return random(seed, index * 97 + a) - random(seed, index * 97 + b);
    });
    for (let attempt = 0; attempt < 40 && !placed; attempt += 1) {
      const parentIndex = frontier[attempt % frontier.length];
      const parent = cells[parentIndex];
      const direction = Math.floor(random(seed, index * 53 + attempt * 3 + 2) * 4);
      const next = {
        x: parent.x + (direction === 0 ? 1 : direction === 1 ? -1 : 0),
        y: parent.y + (direction === 2 ? 1 : direction === 3 ? -1 : 0),
      };
      const key = `${next.x},${next.y}`;
      if (used.has(key)) continue;
      cells.push({ ...next, parentIndex });
      used.add(key);
      placed = true;
    }
    if (!placed) cells.push({ x: index, y: 0, parentIndex: index - 1 });
  }
  return cells;
}

function countOpenNeighbors(cell: { x: number; y: number }, used: Set<string>) {
  return getNeighborCells(cell).filter((neighbor) => !used.has(`${neighbor.x},${neighbor.y}`)).length;
}

function getNeighborCells(cell: { x: number; y: number }) {
  return [
    { x: cell.x + 1, y: cell.y },
    { x: cell.x - 1, y: cell.y },
    { x: cell.x, y: cell.y + 1 },
    { x: cell.x, y: cell.y - 1 },
  ];
}

function makeDungeonCorridors(seed: number, cells: Array<{ x: number; y: number; parentIndex: number }>, rooms: DungeonRoom[]) {
  const corridors: DungeonRect[] = [];
  const connected = new Set<string>();
  const addConnection = (fromIndex: number, toIndex: number) => {
    const key = [fromIndex, toIndex].sort((a, b) => a - b).join(':');
    if (connected.has(key)) return;
    connected.add(key);
    corridors.push(makeCorridor(rooms[fromIndex], rooms[toIndex]));
  };
  cells.slice(1).forEach((cell, index) => addConnection(cell.parentIndex, index + 1));
  cells.forEach((cell, index) => {
    for (const neighbor of getNeighborCells(cell)) {
      const neighborIndex = cells.findIndex((candidate) => candidate.x === neighbor.x && candidate.y === neighbor.y);
      if (neighborIndex <= index) continue;
      if (cells[neighborIndex].parentIndex === index || cell.parentIndex === neighborIndex) continue;
      if (random(seed, index * 131 + neighborIndex * 17 + 707) < 0.46) addConnection(index, neighborIndex);
    }
  });
  return corridors;
}

function makeCorridor(from: DungeonRoom, to: DungeonRoom): DungeonRect {
  if (from.centerX !== to.centerX) {
    return {
      x: Math.min(from.centerX, to.centerX),
      y: from.centerY - CORRIDOR_WIDTH / 2,
      width: Math.abs(to.centerX - from.centerX),
      height: CORRIDOR_WIDTH,
    };
  }
  return {
    x: from.centerX - CORRIDOR_WIDTH / 2,
    y: Math.min(from.centerY, to.centerY),
    width: CORRIDOR_WIDTH,
    height: Math.abs(to.centerY - from.centerY),
  };
}

function makeDungeonObject(entranceId: string, prop: DungeonProp, index: number): WorldObject {
  const object = createProp('rock-04', {
    id: makeDungeonEntityId('dungeon-object', entranceId, index + 1),
    x: prop.x,
    y: prop.y,
    scale: prop.kind === 'tall-stone' ? prop.scale * 1.2 : prop.scale * 1.04,
    flipX: prop.flipX,
  });
  if (prop.kind === 'destroyable-prop') {
    const maxHp = Math.round(60 * prop.scale);
    return {
      ...object,
      kind: 'dungeon-destroyable-prop',
      family: 'crate',
      width: 42 * prop.scale,
      height: 38 * prop.scale,
      maxHp,
      hp: maxHp,
      hitPieces: [3, 5],
      destroyPieces: [7, 11],
      collision: { kind: 'box', widthRatio: 0.82, heightRatio: 0.78 },
      loot: { coin: { probability: 0.45, amount: [1, 4] } },
      sprite: getDungeonPropSprite(prop.kind, index, prop.scale),
    };
  }
  const tall = prop.kind === 'tall-stone';
  const maxHp = Math.round((tall ? 260 : 150) * prop.scale);
  return {
    ...object,
    kind: tall ? 'dungeon-tall-stone' : 'dungeon-stone-object',
    family: tall ? 'ruin-pillar' : 'rock',
    width: tall ? 44 * prop.scale : 58 * prop.scale,
    height: tall ? 88 * prop.scale : 46 * prop.scale,
    maxHp,
    hp: maxHp,
    hitPieces: [2, 4],
    destroyPieces: tall ? [9, 14] : [7, 12],
    collision: tall
      ? { kind: 'ellipse', radiusXRatio: 0.34, radiusYRatio: 0.45 }
      : { kind: 'ellipse', radiusXRatio: 0.48, radiusYRatio: 0.42 },
    loot: { coin: { probability: 0.38, amount: [1, 3] } },
    sprite: getDungeonPropSprite(prop.kind, index, prop.scale),
  };
}

function isDungeonPropObject(prop: DungeonProp) {
  return isDungeonPropObjectKind(prop.kind);
}

function isDungeonPropObjectKind(kind: DungeonProp['kind']) {
  return kind === 'stone-object' || kind === 'tall-stone' || kind === 'destroyable-prop';
}

function makeRoomEnemies(seed: number, entranceId: string, room: DungeonRoom, roomIndex: number, enemyIds: string[], countRange: [number, number], now: number, rank: AdventureRank) {
  const count = randomInt(seed, roomIndex * 41 + 201, countRange);
  return Array.from({ length: count }, (_, index): AdventureEnemy => {
    const definition = getAdventureEnemyDefinition(enemyIds[Math.floor(random(seed, roomIndex * 67 + index * 7 + 301) * enemyIds.length)]);
    const x = room.centerX + room.width * (random(seed, roomIndex * 67 + index * 7 + 302) - 0.5) * 0.5;
    const y = room.centerY + room.height * (random(seed, roomIndex * 67 + index * 7 + 303) - 0.5) * 0.45;
    return scaleEnemyStatsForRank({
      id: makeDungeonEntityId('enemy', entranceId, roomIndex * 10 + index + 1),
      defId: definition.id,
      name: definition.name,
      x,
      y,
      spawnX: x,
      spawnY: y,
      hp: definition.maxHp,
      maxHp: definition.maxHp,
      facing: random(seed, roomIndex * 67 + index * 7 + 304) > 0.5 ? 'left' : 'right',
      radius: Math.max(26, definition.pillWidth * 0.42),
      body: definition.body,
      leftHand: definition.leftHand,
      rightHand: definition.rightHand,
      deathBody: definition.deathBody,
      deathLeftHand: definition.deathLeftHand,
      deathRightHand: definition.deathRightHand,
      color: definition.color,
      pillWidth: definition.pillWidth,
      attack: definition.attack,
      knockback: definition.knockback,
      speed: definition.speed,
      attackSpeed: definition.attackSpeed,
      attackRange: definition.attackRange,
      attackKind: definition.attackKind,
      projectile: definition.projectile,
      projectileSpeed: definition.projectileSpeed,
      projectileRadius: definition.projectileRadius,
      alertRadius: Math.max(definition.alertRadius, 260),
      chaseRadius: Math.max(definition.chaseRadius, 560),
      aggroRadius: Math.max(definition.aggroRadius, 420),
      attackReadyAt: now + random(seed, roomIndex * 67 + index * 7 + 305) * 900,
      clanId: 'neutral',
      alerted: false,
      statusEffects: [],
      loot: definition.loot,
    }, rank);
  });
}

function makeBossEnemy(seed: number, entranceId: string, room: DungeonRoom, enemyId: string, now: number, rank: AdventureRank, depth: number): AdventureEnemy {
  const definition = getAdventureEnemyDefinition(enemyId);
  const x = room.centerX;
  const y = room.centerY - 40;
  const boss = scaleEnemyStatsForRank({
    id: makeDungeonEntityId('boss', entranceId, depth),
    defId: definition.id,
    name: `${definition.name} Prime`,
    x,
    y,
    spawnX: x,
    spawnY: y,
    hp: Math.max(definition.maxHp * 8, definition.maxHp + 650),
    maxHp: Math.max(definition.maxHp * 8, definition.maxHp + 650),
    facing: 'left' as const,
    radius: Math.max(54, definition.pillWidth * 0.58),
    body: definition.body,
    leftHand: definition.leftHand,
    rightHand: definition.rightHand,
    deathBody: definition.deathBody,
    deathLeftHand: definition.deathLeftHand,
    deathRightHand: definition.deathRightHand,
    color: definition.color,
    pillWidth: Math.max(definition.pillWidth + 18, Math.round(definition.pillWidth * 1.25)),
    attack: Math.max(definition.attack + 8, Math.round(definition.attack * 1.8)),
    knockback: definition.knockback + 28,
    speed: Math.max(48, definition.speed * 0.82),
    attackSpeed: Math.max(0.35, definition.attackSpeed * 0.8),
    attackRange: Math.max(definition.attackRange, definition.attackKind === 'ranged' ? 260 : 94),
    attackKind: definition.attackKind,
    projectile: definition.projectile,
    projectileSpeed: definition.projectileSpeed,
    projectileRadius: Math.max(definition.projectileRadius, 16),
    alertRadius: 9999,
    chaseRadius: 9999,
    aggroRadius: 9999,
    attackReadyAt: now + random(seed, depth * 977 + 305) * 800,
    clanId: 'neutral' as const,
    alerted: true,
    alertedAt: now,
    statusEffects: [],
    loot: definition.loot,
  }, rank);
  return boss;
}

function scaleDungeonEnemyCountRange(range: [number, number], rank: AdventureRank): [number, number] {
  return scaleDungeonEnemyCountRangeForRank(range, rank);
}

function makeDungeonEntityId(prefix: string, entranceId: string, index: number) {
  const entranceNumber = BigInt(entranceId.split('-').at(-1) ?? '0');
  return `${prefix}-${entranceNumber * 1000n + BigInt(index)}`;
}

function hashText(text: string) {
  let hash = 2166136261;
  for (const character of text) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return hash >>> 0;
}

function randomInt(seed: number, salt: number, range: [number, number]) {
  return Math.floor(randomBetween(seed, salt, [range[0], range[1] + 1]));
}

function randomBetween(seed: number, salt: number, range: [number, number]) {
  return range[0] + random(seed, salt) * (range[1] - range[0]);
}

function random(seed: number, salt: number) {
  let value = Math.imul(seed ^ salt, 0x45d9f3b);
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  value ^= value >>> 16;
  return (value >>> 0) / 4294967296;
}
