import { adventureSpawn } from '../areas/definitions';
import type { WorldLocation } from './types';

export const authoredAdventureLocations: WorldLocation[] = [
  {
    id: 'location-01',
    kind: 'cave',
    name: 'Echoing Cave',
    x: adventureSpawn.x,
    y: adventureSpawn.y + 420,
    radius: 58,
    dungeonId: 'dungeon-01',
  },
];
