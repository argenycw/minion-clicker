import { adventureSpawn } from '../areas/definitions';
import type { WorldLocation } from './types';

export const authoredAdventureLocations: WorldLocation[] = [
  {
    id: 'location-02',
    kind: 'town',
    name: 'Hearthwick',
    x: adventureSpawn.x,
    y: adventureSpawn.y - 95,
    radius: 76,
    townId: 'town-01',
  },
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
