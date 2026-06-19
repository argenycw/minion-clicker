import { GAME_SETTINGS, WORLD_HEIGHT, WORLD_WIDTH } from '../../../../shared/settings';
import type { WorldArea } from '../types';

export const adventureSpawn = {
  x: Math.round(WORLD_WIDTH * GAME_SETTINGS.world.playerSpawnRatioX),
  y: Math.round(WORLD_HEIGHT * GAME_SETTINGS.world.playerSpawnRatioY),
};

export const authoredAdventureAreas: WorldArea[] = [
  { id: 'area-01', kind: 'ruin', name: 'Mossbound Ruin', x: adventureSpawn.x - 980, y: adventureSpawn.y - 620, width: 720, height: 520 },
  { id: 'area-02', kind: 'ruin', name: 'Broken Watch', x: adventureSpawn.x + 700, y: adventureSpawn.y + 430, width: 620, height: 460 },
];
