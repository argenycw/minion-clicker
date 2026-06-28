import type { AdventureState } from '../state';
import { getTownDefinition } from './definitions';
import type { TownId, TownInstance, TownNpcDefinition } from './types';

// Selectors

export function createTownInstance(townId: TownId): TownInstance {
  const definition = getTownDefinition(townId);
  return {
    ...definition,
    npcs: definition.npcs.map((npc) => ({ ...npc })),
    objects: definition.objects.map((object) => ({ ...object })),
  };
}

export function getNearbyTownNpc(state: Pick<AdventureState, 'scene' | 'town' | 'player'>): TownNpcDefinition | undefined {
  if (state.scene !== 'town' || !state.town) return undefined;
  return state.town.npcs.find((npc) => Math.hypot(state.player.x - npc.x, state.player.y - npc.y) <= npc.radius + state.player.radius + 28);
}

export function isNearTownExit(state: Pick<AdventureState, 'scene' | 'town' | 'player'>) {
  return state.scene === 'town'
    && state.town !== undefined
    && Math.hypot(state.player.x - state.town.exit.x, state.player.y - state.town.exit.y) <= state.town.exit.radius;
}

// Operations
