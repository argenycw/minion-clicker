import type { AdventureState } from '../state';
import { outfitDefinitions } from './definitions';
import type { AdventureCharacter } from './types';

// Selectors

export function getOutfit(id: string | undefined) {
  return outfitDefinitions.find((outfit) => outfit.id === id) ?? outfitDefinitions[0];
}

// Operations

export function customizeCharacter(
  state: AdventureState,
  changes: Partial<Pick<AdventureCharacter, 'body' | 'color' | 'pillWidth'>>,
): AdventureState {
  return { ...state, character: { ...state.character, ...changes } };
}

export function equipOutfit(state: AdventureState, outfitId: string): AdventureState {
  const current = getOutfit(state.character.outfitId);
  const next = getOutfit(outfitId);
  if (current.id === next.id) return state;
  const baseMaxHp = state.player.maxHp - (current.maxHpBonus ?? 0);
  const maxHp = baseMaxHp + (next.maxHpBonus ?? 0);
  return {
    ...state,
    character: { ...state.character, outfitId: next.id },
    player: {
      ...state.player,
      maxHp,
      hp: Math.min(maxHp, state.player.hp + Math.max(0, (next.maxHpBonus ?? 0) - (current.maxHpBonus ?? 0))),
    },
  };
}
