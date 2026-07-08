import type { AdventureClanId } from '../enemies/types';

export function areClansHostile(
  source: { id: string; clanId: AdventureClanId },
  target: { id: string; clanId: AdventureClanId },
) {
  if (source.id === target.id) return false;
  if (source.clanId === 'neutral' || target.clanId === 'neutral') return true;
  return source.clanId !== target.clanId;
}
