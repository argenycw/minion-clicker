export function getClosestBorderPoint(attacker: { x: number; y: number }, target: { x: number; y: number }, radius: number) {
  const dx = attacker.x - target.x;
  const dy = attacker.y - target.y;
  const length = Math.hypot(dx, dy) || 1;
  return { x: target.x + dx / length * radius, y: target.y + dy / length * radius };
}

export function getPunchOffset(attacker: { x: number; y: number }, target: { x: number; y: number }, progress: number) {
  const dx = target.x - attacker.x;
  const dy = target.y - attacker.y;
  const length = Math.hypot(dx, dy) || 1;
  const extension = Math.sin(Math.min(1, progress) * Math.PI) * 22;
  return { x: dx / length * extension, y: dy / length * extension };
}
