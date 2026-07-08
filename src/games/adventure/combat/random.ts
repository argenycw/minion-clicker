export function randomRange(range: [number, number], seed: number) {
  const min = Math.min(range[0], range[1]);
  const max = Math.max(range[0], range[1]);
  return min + Math.floor(seededParticle(seed) * (max - min + 1));
}

export function seededParticle(seed: number) {
  const value = Math.sin(seed * 917.31) * 10000;
  return value - Math.floor(value);
}

export function hashRuntimeId(value: string) {
  let hash = 2166136261;
  for (const character of value) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return hash >>> 0;
}

export function makeDeterministicRandom(seed: number) {
  let salt = 0;
  return () => seededParticle(seed + salt++ * 101);
}
