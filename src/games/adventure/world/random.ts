export function hash(value: string) {
  return [...value].reduce((result, character) => result + character.charCodeAt(0), 0);
}

export function seeded(seed: number) {
  const x = Math.sin(seed * 999) * 10000;
  return x - Math.floor(x);
}
