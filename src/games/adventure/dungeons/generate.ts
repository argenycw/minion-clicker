import { getAdventureEnemyDefinition } from '../enemies/definitions';
import type { AdventureEnemy } from '../enemies/types';
import { getDungeonDefinition } from './definitions';
import type { DungeonInstance, DungeonProp, DungeonRect, DungeonRoom, DungeonId } from './types';

const GRID_X = 1220;
const GRID_Y = 920;
const CORRIDOR_WIDTH = 240;

export function generateDungeon(definitionId: DungeonId, entranceId: string, mapSeed: number, now: number): DungeonInstance {
  const definition = getDungeonDefinition(definitionId);
  const seed = hashText(`${mapSeed}:${entranceId}:${definitionId}`);
  const roomCount = randomInt(seed, 1, definition.roomCount);
  const cells = generateConnectedCells(seed, roomCount);
  const rooms = cells.map((cell, index): DungeonRoom => {
    const width = randomBetween(seed, index * 17 + 21, definition.roomWidth);
    const height = randomBetween(seed, index * 17 + 22, definition.roomHeight);
    const centerX = cell.x * GRID_X;
    const centerY = cell.y * GRID_Y;
    return {
      id: makeDungeonEntityId('room', entranceId, index + 1),
      index,
      x: centerX - width / 2,
      y: centerY - height / 2,
      width,
      height,
      centerX,
      centerY,
    };
  });
  const corridors = rooms.slice(1).map((room, index) => makeCorridor(rooms[cells[index + 1].parentIndex], room));
  const chests = rooms.slice(1).flatMap((room, index) => index === 0 || random(seed, index * 29 + 91) < definition.chestChance
    ? [{
      id: makeDungeonEntityId('chest', entranceId, index + 1),
      x: room.centerX + room.width * (random(seed, index * 29 + 92) - 0.5) * 0.48,
      y: room.centerY + room.height * (random(seed, index * 29 + 93) - 0.5) * 0.42,
      opened: false,
    }]
    : []);
  const enemies = rooms.slice(1).flatMap((room, roomIndex) => makeRoomEnemies(seed, entranceId, room, roomIndex, definition.enemyIds, definition.enemiesPerRoom, now));
  const first = rooms[0];
  const spawn = { x: first.centerX, y: first.centerY + 80 };
  const exit = { id: makeDungeonEntityId('exit', entranceId, 1), x: first.centerX, y: first.centerY - 90 };
  const props = rooms
    .flatMap((room, roomIndex) => makeRoomProps(seed, entranceId, room, roomIndex))
    .filter((prop) => Math.hypot(prop.x - spawn.x, prop.y - spawn.y) > 130)
    .filter((prop) => Math.hypot(prop.x - exit.x, prop.y - exit.y) > 130)
    .filter((prop) => chests.every((chest) => Math.hypot(prop.x - chest.x, prop.y - chest.y) > 105))
    .filter((prop) => enemies.every((enemy) => Math.hypot(prop.x - enemy.x, prop.y - enemy.y) > 90));
  return {
    id: makeDungeonEntityId('dungeon-instance', entranceId, 1),
    definitionId,
    entranceId,
    rooms,
    corridors,
    walkable: [...rooms, ...corridors],
    enemies,
    chests,
    props,
    exit,
    spawn,
  };
}

function makeRoomProps(seed: number, entranceId: string, room: DungeonRoom, roomIndex: number) {
  const count = randomInt(seed, roomIndex * 71 + 401, [4, 9]);
  return Array.from({ length: count }, (_, index): DungeonProp => {
    const roll = random(seed, roomIndex * 83 + index * 11 + 501);
    const kind: DungeonProp['kind'] = roll < 0.55 ? 'rock' : roll < 0.86 ? 'stalagmite' : 'bones';
    return {
      id: makeDungeonEntityId('dungeon-prop', entranceId, roomIndex * 20 + index + 1),
      kind,
      x: room.centerX + room.width * (random(seed, roomIndex * 83 + index * 11 + 502) - 0.5) * 0.72,
      y: room.centerY + room.height * (random(seed, roomIndex * 83 + index * 11 + 503) - 0.5) * 0.68,
      scale: 0.72 + random(seed, roomIndex * 83 + index * 11 + 504) * 0.8,
      rotation: random(seed, roomIndex * 83 + index * 11 + 505) * Math.PI * 2,
    };
  });
}

function generateConnectedCells(seed: number, count: number) {
  const cells = [{ x: 0, y: 0, parentIndex: 0 }];
  const used = new Set(['0,0']);
  for (let index = 1; index < count; index += 1) {
    let placed = false;
    for (let attempt = 0; attempt < 30 && !placed; attempt += 1) {
      const parentIndex = Math.floor(random(seed, index * 53 + attempt * 3 + 1) * cells.length);
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

function makeRoomEnemies(seed: number, entranceId: string, room: DungeonRoom, roomIndex: number, enemyIds: string[], countRange: [number, number], now: number) {
  const count = randomInt(seed, roomIndex * 41 + 201, countRange);
  return Array.from({ length: count }, (_, index): AdventureEnemy => {
    const definition = getAdventureEnemyDefinition(enemyIds[Math.floor(random(seed, roomIndex * 67 + index * 7 + 301) * enemyIds.length)]);
    const x = room.centerX + room.width * (random(seed, roomIndex * 67 + index * 7 + 302) - 0.5) * 0.5;
    const y = room.centerY + room.height * (random(seed, roomIndex * 67 + index * 7 + 303) - 0.5) * 0.45;
    return {
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
      speed: definition.speed,
      attackSpeed: definition.attackSpeed,
      attackRange: definition.attackRange,
      aggroRadius: Math.max(definition.aggroRadius, 420),
      attackReadyAt: now + random(seed, roomIndex * 67 + index * 7 + 305) * 900,
      loot: definition.loot,
    };
  });
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
