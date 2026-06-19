export const ADVENTURE_CHUNK_SIZE = 1920;
export const ADVENTURE_CHUNK_RADIUS = 1;

export type ChunkCoordinate = { x: number; y: number };

export function getChunkCoordinate(x: number, y: number): ChunkCoordinate {
  return {
    x: Math.floor(x / ADVENTURE_CHUNK_SIZE),
    y: Math.floor(y / ADVENTURE_CHUNK_SIZE),
  };
}

export function getChunkKey(coordinate: ChunkCoordinate) {
  return `${coordinate.x},${coordinate.y}`;
}

export function getLoadedChunkCoordinates(center: ChunkCoordinate, radius = ADVENTURE_CHUNK_RADIUS) {
  const coordinates: ChunkCoordinate[] = [];
  for (let y = center.y - radius; y <= center.y + radius; y += 1) {
    for (let x = center.x - radius; x <= center.x + radius; x += 1) coordinates.push({ x, y });
  }
  return coordinates;
}

export function getChunkOrigin(coordinate: ChunkCoordinate) {
  return {
    x: coordinate.x * ADVENTURE_CHUNK_SIZE,
    y: coordinate.y * ADVENTURE_CHUNK_SIZE,
  };
}

export function makeGeneratedId(prefix: string, coordinate: ChunkCoordinate, localIndex: number) {
  const x = zigZag(coordinate.x);
  const y = zigZag(coordinate.y);
  const sum = x + y;
  const paired = sum * (sum + 1n) / 2n + y;
  return `${prefix}-${paired * 10000n + BigInt(localIndex)}`;
}

function zigZag(value: number) {
  const integer = BigInt(value);
  return integer >= 0n ? integer * 2n : -integer * 2n - 1n;
}
