// Central tuning surface for Minion Clicker.
// Change values here and the map, economy, enemies, UI, and controls adapt.

export const GAME_SETTINGS = {
  world: {
    width: 6000,
    height: 4000,
    playerSpawnRatioX: 0.5,
    playerSpawnRatioY: 0.5,
  },
  economy: {
    initialCoins: 0,
    clickPower: 1,
    minionCostGrowth: 1.1,
    autosaveMs: 900,
  },
  enemies: {
    castleCount: 6,
    minCastleDistance: 1200,
    minBaseDistance: 1200,
    placementAttempts: 120,
    edgePaddingX: 560,
    edgePaddingY: 520,
  },
  terrain: {
    propCount: 500,
    padding: 50,
    minSize: 0.75,
    maxSize: 1.5,
  },
  combat: {
    maxTickDeltaSeconds: 0.12,
    playerAutoTargetRadius: 360,
    castleDefense: 0,
    defaultProjectileSpeed: 500,
    defaultProjectileRadius: 22,
    playerBaseHealRadius: 360,
    playerBaseHpPerSecond: 1,
    defaultEnemyCastleHpPerSecond: 1,
  },
  map: {
    gridSize: 80,
    initialZoom: 1.0,
    initialViewportWidth: 1500,
    initialViewportHeight: 900,
    keyboardPanSpeed: 720,
    cameraPaddingX: 260,
    cameraPaddingY: 220,
    cameraOverscroll: 180,
  },
  ui: {
    maxCombatEvents: 20,
    maxMapPings: 18,
    maxCommandPingsBeforeAppend: 12,
    defaultMinionPillWidth: 64,
  },
} as const;

export const WORLD_WIDTH = GAME_SETTINGS.world.width;
export const WORLD_HEIGHT = GAME_SETTINGS.world.height;
