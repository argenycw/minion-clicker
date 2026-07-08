import type { DungeonPoint, DungeonRect, DungeonRoom } from './types';

export function selectDungeonRoomKind(input: {
  seed: number;
  index: number;
  isBossFloor: boolean;
  random: (seed: number, salt: number) => number;
}): DungeonRoom['kind'] {
  if (input.isBossFloor) return 'boss';
  if (input.index === 0) return 'start';
  const roll = input.random(input.seed, input.index * 113 + 37);
  if (roll < 0.24) return 'l-shape';
  if (roll < 0.44) return 'clutter';
  return 'combat';
}

export function makeDungeonRoomWalkableRects(input: {
  seed: number;
  index: number;
  kind: DungeonRoom['kind'];
  bounds: DungeonRect;
  random: (seed: number, salt: number) => number;
}): DungeonRect[] {
  if (input.kind !== 'l-shape') return [input.bounds];
  const verticalWide = input.bounds.width * (0.48 + input.random(input.seed, input.index * 137 + 11) * 0.12);
  const horizontalHigh = input.bounds.height * (0.48 + input.random(input.seed, input.index * 137 + 12) * 0.12);
  const verticalOnLeft = input.random(input.seed, input.index * 137 + 13) < 0.5;
  const horizontalOnTop = input.random(input.seed, input.index * 137 + 14) < 0.5;
  const vertical: DungeonRect = {
    x: verticalOnLeft ? input.bounds.x : input.bounds.x + input.bounds.width - verticalWide,
    y: input.bounds.y,
    width: verticalWide,
    height: input.bounds.height,
  };
  const horizontal: DungeonRect = {
    x: input.bounds.x,
    y: horizontalOnTop ? input.bounds.y : input.bounds.y + input.bounds.height - horizontalHigh,
    width: input.bounds.width,
    height: horizontalHigh,
  };
  return [vertical, horizontal];
}

export function makeDungeonRoomFootprint(bounds: DungeonRect, walkableRects: DungeonRect[]): DungeonPoint[] {
  if (walkableRects.length === 1) return rectToPolygon(bounds);
  const [first, second] = walkableRects;
  const vertical = first.height >= bounds.height - 1 ? first : second;
  const horizontal = first === vertical ? second : first;
  const verticalOnLeft = approximatelyEqual(vertical.x, bounds.x);
  const horizontalOnTop = approximatelyEqual(horizontal.y, bounds.y);
  const left = bounds.x;
  const right = bounds.x + bounds.width;
  const top = bounds.y;
  const bottom = bounds.y + bounds.height;
  const verticalInnerX = verticalOnLeft ? vertical.x + vertical.width : vertical.x;
  const horizontalInnerY = horizontalOnTop ? horizontal.y + horizontal.height : horizontal.y;

  if (verticalOnLeft && horizontalOnTop) {
    return [
      { x: left, y: top },
      { x: right, y: top },
      { x: right, y: horizontalInnerY },
      { x: verticalInnerX, y: horizontalInnerY },
      { x: verticalInnerX, y: bottom },
      { x: left, y: bottom },
    ];
  }
  if (verticalOnLeft && !horizontalOnTop) {
    return [
      { x: left, y: top },
      { x: verticalInnerX, y: top },
      { x: verticalInnerX, y: horizontalInnerY },
      { x: right, y: horizontalInnerY },
      { x: right, y: bottom },
      { x: left, y: bottom },
    ];
  }
  if (!verticalOnLeft && horizontalOnTop) {
    return [
      { x: left, y: top },
      { x: right, y: top },
      { x: right, y: bottom },
      { x: verticalInnerX, y: bottom },
      { x: verticalInnerX, y: horizontalInnerY },
      { x: left, y: horizontalInnerY },
    ];
  }
  return [
    { x: left, y: top },
    { x: verticalInnerX, y: top },
    { x: verticalInnerX, y: horizontalInnerY },
    { x: left, y: horizontalInnerY },
    { x: left, y: bottom },
    { x: right, y: bottom },
    { x: right, y: top },
  ];
}

function rectToPolygon(rect: DungeonRect): DungeonPoint[] {
  return [
    { x: rect.x, y: rect.y },
    { x: rect.x + rect.width, y: rect.y },
    { x: rect.x + rect.width, y: rect.y + rect.height },
    { x: rect.x, y: rect.y + rect.height },
  ];
}

function approximatelyEqual(a: number, b: number) {
  return Math.abs(a - b) < 1;
}
