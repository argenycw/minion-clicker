import { GAME_SETTINGS, WORLD_HEIGHT, WORLD_WIDTH } from '../../shared/settings';
import { castleDefinitions, getUnit, terrainProps, unitDefinitions, type CastleDefenderDefinition } from '../../shared/content';
import { getClosestBorderPoint } from '../../shared/combatPresentation';
import { technologies } from './technology';

export type Team = 'player' | 'enemy';
export type Facing = 'left' | 'right';

export type UnitEntity = {
  id: string;
  defId: string;
  team: Team;
  x: number;
  y: number;
  homeX: number;
  homeY: number;
  hp: number;
  maxHp: number;
  facing: Facing;
  homeCastleId?: string;
  targetId?: string;
  moveTarget?: { x: number; y: number };
  retreating?: boolean;
  attackCooldown: number;
  lastAttackAt?: number;
  guardSlot?: number;
};

export type CastleEntity = {
  id: string;
  team: Team;
  name: string;
  symbol: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  reward: number;
  aggroRadius: number;
  guardRespawnSeconds: number;
  healPerSecond: number;
  nextGuardRespawnAt: number;
  guardSlots: Array<{ slot: number; unitId: string; dx: number; dy: number }>;
  theme: string;
};

export type OwnedUnits = Record<string, number>;

export type CombatEvent = {
  id: number;
  kind?: 'impact' | 'spawn' | 'death' | 'castle-destroyed';
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  glyph: string;
  color: string;
  text?: string;
  body?: string;
  leftHand?: string;
  rightHand?: string;
  background?: string;
  pillWidth?: number;
  team?: Team;
};

export type ProjectileEntity = {
  id: number;
  team: Team;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  remainingDistance: number;
  glyph: string;
  color: string;
  radius: number;
  impactGlyph?: string;
  impactColor?: string;
  targetId?: string;
};

export type MapPing = {
  id: number;
  x: number;
  y: number;
  kind: 'move' | 'attack' | 'select' | 'clear';
};

export type Selection =
  | { kind: 'empty' }
  | { kind: 'base' }
  | { kind: 'unit'; unitId: string }
  | { kind: 'castle'; castleId: string }
  | { kind: 'multi'; unitIds: string[] };

export type GameState = {
  coins: number;
  totalCoins: number;
  clickPower: number;
  owned: OwnedUnits;
  unlockedTech: string[];
  units: UnitEntity[];
  enemyCastles: CastleEntity[];
  selectedUnitId?: string;
  selectedUnitIds: string[];
  selection: Selection;
  message: string;
  lastTick: number;
  nextEntityId: number;
  combatEvents: CombatEvent[];
  projectiles: ProjectileEntity[];
  mapPings: MapPing[];
  mapSeed: number;
  startedAt: number;
  wonAt?: number;
  totalMinionsSpawned: number;
};

export type GameStats = {
  coinsPerSecond: number;
  armySize: number;
  workerCount: number;
  enemyCount: number;
  attackPower: number;
  castlesAlive: number;
};

const spawnPlayer = {
  x: Math.round(WORLD_WIDTH * GAME_SETTINGS.world.playerSpawnRatioX),
  y: Math.round(WORLD_HEIGHT * GAME_SETTINGS.world.playerSpawnRatioY),
};

const makeId = (state: Pick<GameState, 'nextEntityId'>, prefix: string) => `${prefix}-${state.nextEntityId}`;

function resolveDefenderUnitId(defender: CastleDefenderDefinition, castleId: string, slot: number) {
  if (defender.unitId) return defender.unitId;
  const combatUnits = unitDefinitions.filter((unit) => unit.kind === 'combat' && unit.source === 'built-in');
  const matchingType = defender.type ? combatUnits.filter((unit) => unit.type === defender.type) : combatUnits;
  const matchingTier = matchingType.filter((unit) => unit.tier === defender.tier);
  const candidates = matchingTier.length > 0 ? matchingTier : matchingType.length > 0 ? matchingType : combatUnits;
  if (candidates.length === 0) throw new Error(`Castle ${castleId} defender ${slot} cannot find a combat minion.`);
  return candidates[Math.floor(Math.random() * candidates.length)].id;
}

export const createInitialState = (): GameState => {
  const placedCastles = placeCastles();
  const startedAt = performance.now();
  const enemyCastles = placedCastles.map((castle, index) => {
    const guardSlots = castle.defenders
      .map((defender, slot) => ({ ...defender, unitId: resolveDefenderUnitId(defender, castle.id, slot), slot }))
      .filter((defender) => getUnit(defender.unitId).kind === 'combat');
    return {
      id: castle.id,
      team: 'enemy' as const,
      name: castle.name,
      symbol: castle.symbol,
      x: castle.x,
      y: castle.y,
      hp: castle.maxHp,
      maxHp: castle.maxHp,
      reward: castle.reward,
      aggroRadius: castle.aggroRadius,
      guardRespawnSeconds: castle.guardRespawnSeconds ?? Math.max(10, 28 - index * 2),
      healPerSecond: castle.healPerSecond ?? GAME_SETTINGS.combat.defaultEnemyCastleHpPerSecond,
      nextGuardRespawnAt: startedAt + (castle.guardRespawnSeconds ?? Math.max(10, 28 - index * 2)) * 1000,
      guardSlots,
      theme: castle.theme,
    };
  });

  const enemyUnits = enemyCastles.flatMap((castle, castleIndex) =>
    castle.guardSlots.map((defender) =>
      createUnit(
        defender.unitId,
        'enemy',
        castle.x + defender.dx,
        castle.y + defender.dy,
        `enemy-${castleIndex}-${defender.slot}`,
        castle.id,
        defender.slot,
      ),
    ),
  );

  return {
    coins: GAME_SETTINGS.economy.initialCoins,
    totalCoins: GAME_SETTINGS.economy.initialCoins,
    clickPower: GAME_SETTINGS.economy.clickPower,
    owned: Object.fromEntries(unitDefinitions.map((unit) => [unit.id, 0])),
    unlockedTech: [],
    units: enemyUnits,
    enemyCastles,
    selectedUnitIds: [],
    selection: { kind: 'empty' },
    message: 'Drag the map, wheel to zoom, buy minions, select them, then click a keep.',
    lastTick: startedAt,
    nextEntityId: 100,
    combatEvents: enemyUnits.map(makeSpawnEvent),
    projectiles: [],
    mapPings: [],
    mapSeed: Math.floor(Math.random() * 1_000_000_000),
    startedAt,
    totalMinionsSpawned: 0,
  };
};

export const createUnit = (
  defId: string,
  team: Team,
  x: number,
  y: number,
  id: string,
  homeCastleId?: string,
  guardSlot?: number,
): UnitEntity => {
  const definition = getUnit(defId);
  return {
    id,
    defId,
    team,
    x,
    y,
    homeX: x,
    homeY: y,
    hp: definition.maxHp,
    maxHp: definition.maxHp,
    facing: team === 'player' ? 'right' : 'left',
    homeCastleId,
    guardSlot,
    attackCooldown: Math.random() * 0.5,
  };
};

export const getStats = (state: GameState): GameStats => {
  let coinsPerSecond = 0;
  let armySize = 0;
  let workerCount = 0;
  let enemyCount = 0;
  let attackPower = 0;

  for (const unit of state.units) {
    const definition = getUnit(unit.defId);
    if (unit.team === 'enemy') {
      enemyCount += 1;
      continue;
    }
    if (definition.kind === 'worker') {
      workerCount += 1;
      coinsPerSecond += definition.coinsPerSecond ?? 0;
    } else {
      armySize += 1;
      attackPower += getEffectiveAttack(definition.attack, state);
    }
  }

  return {
    coinsPerSecond,
    armySize,
    workerCount,
    enemyCount,
    attackPower,
    castlesAlive: state.enemyCastles.filter((castle) => castle.hp > 0).length,
  };
};

export const getEffectiveAttack = (attack: number, state: Pick<GameState, 'unlockedTech'>) => {
  const multiplier = technologies.reduce(
    (value, tech) => (state.unlockedTech.includes(tech.id) ? value * (tech.effect.attackMultiplier ?? 1) : value),
    1,
  );
  return Math.ceil(attack * multiplier);
};

export const getEffectiveMaxHp = (maxHp: number, unlockedTech: string[]) => {
  const multiplier = technologies.reduce(
    (value, tech) => (unlockedTech.includes(tech.id) ? value * (tech.effect.healthMultiplier ?? 1) : value),
    1,
  );
  return Math.ceil(maxHp * multiplier);
};

export const getAlivePlayerUnitCount = (state: GameState, unitId?: string) =>
  state.units.filter((unit) => unit.team === 'player' && (!unitId || unit.defId === unitId)).length;

export const getScaledCost = (unitId: string, alivePlayerMinions: number) => {
  const unit = getUnit(unitId);
  return Math.ceil(unit.cost * Math.pow(GAME_SETTINGS.economy.minionCostGrowth, alivePlayerMinions));
};

export const formatNumber = (value: number) => {
  if (value < 1000) return Math.floor(value).toLocaleString();
  const units = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi'];
  const tier = Math.min(Math.floor(Math.log10(value) / 3), units.length - 1);
  const scaled = value / Math.pow(1000, tier);
  return `${scaled.toFixed(scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2)}${units[tier]}`;
};

export const formatMoney = (value: number) => Math.floor(value).toLocaleString();

export const buyUnit = (state: GameState, unitId: string): GameState => {
  const cost = getScaledCost(unitId, getAlivePlayerUnitCount(state));
  if (state.coins < cost) return { ...state, message: 'Not enough coins for that minion yet.' };

  const nextId = makeId(state, 'unit');
  const count = state.owned[unitId] ?? 0;
  const angle = count * 1.9;
  let unit = createUnit(
    unitId,
    'player',
    spawnPlayer.x + Math.cos(angle) * (46 + (count % 4) * 16),
    spawnPlayer.y + Math.sin(angle) * (46 + (count % 4) * 16),
    nextId,
  );
  const definition = getUnit(unitId);
  if (definition.kind === 'combat') {
    const maxHp = getEffectiveMaxHp(definition.maxHp, state.unlockedTech);
    unit = { ...unit, hp: maxHp, maxHp };
  }
  const selectedAfterBuy: Pick<GameState, 'selectedUnitId' | 'selectedUnitIds' | 'selection'> =
    definition.kind === 'worker'
      ? { selectedUnitId: undefined, selectedUnitIds: [], selection: { kind: 'base' } }
      : { selectedUnitId: unit.id, selectedUnitIds: [unit.id], selection: { kind: 'unit', unitId: unit.id } };

  return {
    ...state,
    coins: state.coins - cost,
    owned: { ...state.owned, [unitId]: count + 1 },
    units: [...state.units, unit],
    ...selectedAfterBuy,
    nextEntityId: state.nextEntityId + 1,
    totalMinionsSpawned: state.totalMinionsSpawned + 1,
    combatEvents:
      definition.kind === 'combat'
        ? [...state.combatEvents.slice(-GAME_SETTINGS.ui.maxCombatEvents), makeSpawnEvent(unit)]
        : state.combatEvents,
    message:
      definition.kind === 'worker'
        ? `${definition.name} joined the base crew.`
        : `${definition.name} entered the map. Click a destination or enemy to command it.`,
  };
};

export const buyTechnology = (state: GameState, techId: string): GameState => {
  const tech = technologies.find((item) => item.id === techId);
  if (!tech || state.unlockedTech.includes(tech.id)) return state;
  if (state.coins < tech.cost) return { ...state, message: 'Not enough coins for that technology yet.' };
  const unlockedTech = [...state.unlockedTech, tech.id];
  const units = state.units.map((unit) => {
    if (unit.team !== 'player' || getUnit(unit.defId).kind !== 'combat') return unit;
    const maxHp = getEffectiveMaxHp(getUnit(unit.defId).maxHp, unlockedTech);
    return { ...unit, maxHp, hp: Math.min(maxHp, unit.hp + Math.max(0, maxHp - unit.maxHp)) };
  });
  return {
    ...state,
    coins: state.coins - tech.cost,
    clickPower: state.clickPower + (tech.effect.clickPower ?? 0),
    unlockedTech,
    units,
    message: `${tech.name} unlocked.`,
  };
};

export const dismissWorker = (state: GameState, unitId: string): GameState => {
  const definition = getUnit(unitId);
  if (definition.kind !== 'worker') return state;
  const target = [...state.units].reverse().find((unit) => unit.team === 'player' && unit.defId === unitId);
  if (!target) return state;
  return {
    ...state,
    units: state.units.filter((unit) => unit.id !== target.id),
    selection: { kind: 'base' },
    selectedUnitId: undefined,
    selectedUnitIds: [],
    message: `${definition.name} was dismissed from the base crew.`,
  };
};

export const selectUnit = (state: GameState, unitId?: string): GameState => ({
  ...state,
  selectedUnitId: unitId,
  selectedUnitIds: unitId && state.units.find((unit) => unit.id === unitId)?.team === 'player' ? [unitId] : [],
  selection: unitId ? { kind: 'unit', unitId } : { kind: 'empty' },
  mapPings: unitId
    ? [
        ...state.mapPings.slice(-GAME_SETTINGS.ui.maxCommandPingsBeforeAppend),
        {
          id: performance.now() + Math.random(),
          x: state.units.find((unit) => unit.id === unitId)?.x ?? spawnPlayer.x,
          y: state.units.find((unit) => unit.id === unitId)?.y ?? spawnPlayer.y,
          kind: 'select',
        },
      ]
    : state.mapPings,
});

export const selectUnits = (state: GameState, unitIds: string[]): GameState => ({
  ...state,
  selectedUnitId: unitIds.length === 1 ? unitIds[0] : undefined,
  selectedUnitIds: unitIds,
  selection: unitIds.length === 0 ? { kind: 'empty' } : unitIds.length === 1 ? { kind: 'unit', unitId: unitIds[0] } : { kind: 'multi', unitIds },
});

export const selectCastle = (state: GameState, castleId: string): GameState => ({
  ...state,
  selectedUnitId: undefined,
  selectedUnitIds: [],
  selection: { kind: 'castle', castleId },
});

export const selectBase = (state: GameState): GameState => ({
  ...state,
  selectedUnitId: undefined,
  selectedUnitIds: [],
  selection: { kind: 'base' },
});

export const clearSelection = (state: GameState): GameState => ({
  ...state,
  selectedUnitId: undefined,
  selectedUnitIds: [],
  selection: { kind: 'empty' },
});

export const commandSelected = (state: GameState, x: number, y: number, targetId?: string): GameState => {
  const selectedPlayerUnits = state.selectedUnitIds
    .map((id) => state.units.find((unit) => unit.id === id && unit.team === 'player'))
    .filter((unit): unit is UnitEntity => Boolean(unit));
  if (selectedPlayerUnits.length === 0) {
    return {
      ...state,
      selectedUnitId: undefined,
      mapPings: [
        ...state.mapPings.slice(-GAME_SETTINGS.ui.maxCommandPingsBeforeAppend),
        { id: performance.now() + Math.random(), x, y, kind: 'clear' },
      ],
    };
  }
  const selectedPlayerIds = new Set(selectedPlayerUnits.map((unit) => unit.id));
  const moveTargets = targetId ? new Map<string, { x: number; y: number }>() : getFormationMoveTargets(selectedPlayerUnits, x, y);
  return {
    ...state,
    units: state.units.map((unit) =>
      selectedPlayerIds.has(unit.id)
        ? {
            ...unit,
            facing: (moveTargets.get(unit.id)?.x ?? x) < unit.x ? 'left' : 'right',
            targetId,
            moveTarget: targetId ? undefined : moveTargets.get(unit.id) ?? { x, y },
            retreating: targetId ? false : isPlayerUnitInCombat(unit, state.units, state.enemyCastles, state.lastTick),
          }
        : unit,
    ),
    mapPings: [
      ...state.mapPings.slice(-GAME_SETTINGS.ui.maxCommandPingsBeforeAppend),
      { id: performance.now() + Math.random(), x, y, kind: targetId ? 'attack' : 'move' },
    ],
  };
};

export const tickState = (state: GameState, now: number): GameState => {
  if (state.wonAt) return { ...state, lastTick: now };
  const deltaSeconds = Math.min((now - state.lastTick) / 1000, GAME_SETTINGS.combat.maxTickDeltaSeconds);
  const stats = getStats(state);
  let coins = state.coins + stats.coinsPerSecond * deltaSeconds;
  let totalCoins = state.totalCoins + stats.coinsPerSecond * deltaSeconds;
  let enemyCastles = state.enemyCastles.map((castle) => ({ ...castle }));
  let units = state.units.map((unit) => ({ ...unit, attackCooldown: Math.max(0, unit.attackCooldown - deltaSeconds) }));
  let projectiles = state.projectiles.map((projectile) => ({ ...projectile }));
  let nextEntityId = state.nextEntityId;
  const damageById = new Map<string, number>();
  const events: CombatEvent[] = [];
  let message = state.message;
  const hasLivingPlayerUnits = units.some((unit) => unit.team === 'player' && getUnit(unit.defId).kind === 'combat');

  units = units.map((unit) => {
    if (unit.team !== 'enemy') return unit;
    const homeCastle = enemyCastles.find((castle) => castle.id === unit.homeCastleId && castle.hp > 0);
    if (!homeCastle) return { ...unit, targetId: undefined, moveTarget: undefined };
    if (!hasLivingPlayerUnits) return returnHome(unit);
    const playerNearHome = units.some((other) => other.team === 'player' && distance(other, homeCastle) < homeCastle.aggroRadius);
    if (!playerNearHome) return returnHome(unit);
    if (unit.targetId && units.some((other) => other.id === unit.targetId && other.team === 'player')) return unit;
    const nearest = nearestEnemy(unit, units, 'player');
    const facing: Facing = nearest && nearest.x < unit.x ? 'left' : 'right';
    return nearest ? { ...unit, targetId: nearest.id, facing } : unit;
  });

  units = units.map((unit) => {
    const definition = getUnit(unit.defId);
    if (definition.kind === 'worker' && unit.team === 'player') return unit;

    let target: UnitEntity | CastleEntity | undefined;
    const castleTarget = unit.targetId ? enemyCastles.find((castle) => castle.id === unit.targetId && castle.hp > 0) : undefined;
    if (castleTarget) {
      target = castleTarget;
    } else if (unit.targetId) {
      target = units.find((other) => other.id === unit.targetId && other.team !== unit.team);
    }

    if (!target && unit.team === 'player' && !unit.retreating) {
      target = nearestEnemy(unit, units, 'enemy');
      if (target && distance(unit, target) > GAME_SETTINGS.combat.playerAutoTargetRadius) target = undefined;
      if (!target) {
        const castleTarget = nearestEnemyCastle(unit, enemyCastles);
        if (castleTarget && distance(unit, castleTarget) <= GAME_SETTINGS.combat.playerAutoTargetRadius) target = castleTarget;
      }
    }

    if (!target) {
      if (unit.moveTarget) return moveUnit(unit, unit.moveTarget, definition.speed, deltaSeconds);
      return unit;
    }

    const range = definition.range;
    const dist = distance(unit, target);
    const facing: Facing = target.x < unit.x ? 'left' : 'right';
    let nextUnit: UnitEntity = { ...unit, facing };
    if (dist > range * 0.92) {
      nextUnit = moveUnit(nextUnit, target, definition.speed, deltaSeconds, range * 0.82);
    }

    if (dist <= range && unit.attackCooldown <= 0) {
      if (definition.type === 'ranged' && definition.projectile) {
        projectiles.push(makeProjectile(nextUnit, target, state));
      } else {
        const attack = unit.team === 'player' ? getEffectiveAttack(definition.attack, state) : definition.attack;
        const rawDamage = resolveDamage(attack, target);
        if ('defId' in target) {
          damageById.set(target.id, (damageById.get(target.id) ?? 0) + rawDamage);
        } else {
          enemyCastles = enemyCastles.map((castle) =>
            castle.id === target.id ? { ...castle, hp: Math.max(0, castle.hp - rawDamage) } : castle,
          );
        }
        events.push(makeCombatEvent(unit, target, rawDamage, '💥', '#d94f5f'));
      }
      nextUnit = { ...nextUnit, attackCooldown: 1 / definition.attackSpeed, lastAttackAt: now };
    }

    return nextUnit;
  });

  const projectileResult = advanceProjectiles(projectiles, units, enemyCastles, deltaSeconds);
  projectiles = projectileResult.projectiles;
  enemyCastles = projectileResult.enemyCastles;
  for (const [id, damage] of projectileResult.damageById) {
    damageById.set(id, (damageById.get(id) ?? 0) + damage);
  }
  events.push(...projectileResult.events);

  const damagedUnits = units.map((unit) => {
    const damage = damageById.get(unit.id) ?? 0;
    if (!damage) return unit;
    return { ...unit, hp: unit.hp - damage };
  });
  for (const unit of damagedUnits) {
    if (unit.hp <= 0 && units.some((previous) => previous.id === unit.id && previous.hp > 0)) {
      events.push(makeDeathEvent(unit));
    }
  }
  units = damagedUnits.filter((unit) => unit.hp > 0);
  units = healUnits(units, enemyCastles, deltaSeconds);

  if (!units.some((unit) => unit.team === 'player')) {
    units = units.map((unit) => (unit.team === 'enemy' ? returnHome(unit) : unit));
  }

  const respawnResult = respawnCastleGuards(enemyCastles, units, now, nextEntityId);
  enemyCastles = respawnResult.enemyCastles;
  units = respawnResult.units;
  nextEntityId = respawnResult.nextEntityId;
  events.push(...respawnResult.events);

  const selectedUnitAlive = !state.selectedUnitId || units.some((unit) => unit.id === state.selectedUnitId);
  const selectedUnitId = selectedUnitAlive ? state.selectedUnitId : undefined;
  const selectedUnitIds = state.selectedUnitIds.filter((id) => units.some((unit) => unit.id === id));
  const currentSelection = state.selection;
  let selection: Selection = currentSelection;
  if (currentSelection.kind === 'unit' && !units.some((unit) => unit.id === currentSelection.unitId)) {
    selection = { kind: 'empty' };
  } else if (currentSelection.kind === 'multi') {
    selection =
      selectedUnitIds.length > 1
        ? { kind: 'multi', unitIds: selectedUnitIds }
        : selectedUnitIds.length === 1
          ? { kind: 'unit', unitId: selectedUnitIds[0] }
          : { kind: 'empty' };
  }

  if (!selectedUnitAlive) {
    message = 'Selected minion fell in combat.';
  }

  for (const previousCastle of state.enemyCastles) {
    const nextCastle = enemyCastles.find((castle) => castle.id === previousCastle.id);
    if (previousCastle.hp > 0 && nextCastle && nextCastle.hp <= 0) {
      coins += nextCastle.reward;
      totalCoins += nextCastle.reward;
      message = `${nextCastle.name} has fallen. The victory chest paid ${formatMoney(nextCastle.reward)} coins.`;
      events.push(makeCastleDestroyedEvent(nextCastle));
    }
  }

  const wonAt = state.wonAt ?? (enemyCastles.every((castle) => castle.hp <= 0) ? now : undefined);
  if (wonAt && !state.wonAt) {
    message = 'All keeps have fallen. The minions own the map.';
    projectiles = [];
  }

  return {
    ...state,
    coins,
    totalCoins,
    units,
    enemyCastles,
    projectiles,
    selectedUnitId,
    selectedUnitIds,
    selection,
    message,
    lastTick: now,
    nextEntityId,
    wonAt,
    combatEvents: [...state.combatEvents.slice(-GAME_SETTINGS.ui.maxCombatEvents), ...events],
    mapPings: state.mapPings.slice(-GAME_SETTINGS.ui.maxMapPings),
  };
};

export const getSelectedUnit = (state: GameState) => state.units.find((unit) => unit.id === state.selectedUnitId);

export const getSelectionUnit = (state: GameState) => {
  const selection = state.selection;
  if (selection.kind !== 'unit') return undefined;
  return state.units.find((unit) => unit.id === selection.unitId);
};

export const getSelectionCastle = (state: GameState) => {
  const selection = state.selection;
  if (selection.kind !== 'castle') return undefined;
  return state.enemyCastles.find((castle) => castle.id === selection.castleId);
};

export const getPrimaryCastle = (state: GameState) =>
  state.enemyCastles.find((castle) => castle.hp > 0) ?? state.enemyCastles[state.enemyCastles.length - 1];

export const world = {
  width: WORLD_WIDTH,
  height: WORLD_HEIGHT,
  spawnPlayer,
  terrainProps,
};

function nearestEnemy(unit: UnitEntity, units: UnitEntity[], team: Team) {
  let best: UnitEntity | undefined;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const other of units) {
    if (other.team !== team) continue;
    if (getUnit(other.defId).kind !== 'combat') continue;
    const dist = distance(unit, other);
    if (dist < bestDistance) {
      best = other;
      bestDistance = dist;
    }
  }
  return best;
}

function nearestEnemyCastle(unit: UnitEntity, castles: CastleEntity[]) {
  let best: CastleEntity | undefined;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const castle of castles) {
    if (castle.hp <= 0) continue;
    const dist = distance(unit, castle);
    if (dist < bestDistance) {
      best = castle;
      bestDistance = dist;
    }
  }
  return best;
}

function respawnCastleGuards(enemyCastles: CastleEntity[], units: UnitEntity[], now: number, nextEntityId: number) {
  let nextUnits = units;
  const events: CombatEvent[] = [];
  const nextCastles = enemyCastles.map((castle) => {
    if (castle.hp <= 0 || castle.guardSlots.length === 0) return castle;
    const liveSlots = new Set(
      nextUnits
        .filter((unit) => unit.team === 'enemy' && unit.homeCastleId === castle.id && unit.guardSlot !== undefined)
        .map((unit) => unit.guardSlot),
    );
    if (liveSlots.size >= castle.guardSlots.length) {
      return { ...castle, nextGuardRespawnAt: now + castle.guardRespawnSeconds * 1000 };
    }
    if (now < castle.nextGuardRespawnAt) return castle;

    const missingSlot = castle.guardSlots.find((slot) => !liveSlots.has(slot.slot));
    if (!missingSlot) return castle;
    const respawnAngle = missingSlot.slot * 1.7;
    const unit = createUnit(
      missingSlot.unitId,
      'enemy',
      castle.x + missingSlot.dx + Math.cos(respawnAngle) * 12,
      castle.y + missingSlot.dy + Math.sin(respawnAngle) * 12,
      `guard-${nextEntityId}`,
      castle.id,
      missingSlot.slot,
    );
    nextUnits = [...nextUnits, unit];
    events.push(makeSpawnEvent(unit));
    nextEntityId += 1;
    return { ...castle, nextGuardRespawnAt: now + castle.guardRespawnSeconds * 1000 };
  });

  return { enemyCastles: nextCastles, units: nextUnits, nextEntityId, events };
}

function healUnits(units: UnitEntity[], enemyCastles: CastleEntity[], deltaSeconds: number) {
  return units.map((unit) => {
    const definition = getUnit(unit.defId);
    if (definition.kind !== 'combat' || unit.hp >= unit.maxHp) return unit;

    let healPerSecond = 0;
    if (unit.team === 'player' && distance(unit, spawnPlayer) <= GAME_SETTINGS.combat.playerBaseHealRadius) {
      healPerSecond = GAME_SETTINGS.combat.playerBaseHpPerSecond;
    } else if (unit.team === 'enemy') {
      for (const castle of enemyCastles) {
        if (castle.hp <= 0) continue;
        if (distance(unit, castle) <= castle.aggroRadius) {
          healPerSecond = Math.max(healPerSecond, castle.healPerSecond);
        }
      }
    }

    if (healPerSecond <= 0) return unit;
    return { ...unit, hp: Math.min(unit.maxHp, unit.hp + healPerSecond * deltaSeconds) };
  });
}

function returnHome(unit: UnitEntity): UnitEntity {
  const dist = Math.hypot(unit.x - unit.homeX, unit.y - unit.homeY);
  return {
    ...unit,
    targetId: undefined,
    moveTarget: dist > 8 ? { x: unit.homeX, y: unit.homeY } : undefined,
    facing: unit.homeX < unit.x ? 'left' : 'right',
  };
}

function placeCastles() {
  const placed: typeof castleDefinitions = [];
  const minCastleDistance = GAME_SETTINGS.enemies.minCastleDistance;
  const minBaseDistance = GAME_SETTINGS.enemies.minBaseDistance;
  const count = Math.min(GAME_SETTINGS.enemies.castleCount, castleDefinitions.length);
  const edgeX = GAME_SETTINGS.enemies.edgePaddingX;
  const edgeY = GAME_SETTINGS.enemies.edgePaddingY;

  for (const castle of castleDefinitions.slice(0, count)) {
    let best = { x: castle.x, y: castle.y };
    for (let attempt = 0; attempt < GAME_SETTINGS.enemies.placementAttempts; attempt += 1) {
      const x = edgeX + Math.random() * (world.width - edgeX * 2);
      const y = edgeY + Math.random() * (world.height - edgeY * 2);
      const farFromBase = Math.hypot(x - spawnPlayer.x, y - spawnPlayer.y) >= minBaseDistance;
      const farFromCastles = placed.every((other) => Math.hypot(x - other.x, y - other.y) >= minCastleDistance);
      if (farFromBase && farFromCastles) {
        best = { x, y };
        break;
      }
    }
    placed.push({ ...castle, x: best.x, y: best.y });
  }

  return placed;
}

function moveUnit<T extends { x: number; y: number }>(
  unit: UnitEntity,
  target: T,
  speed: number,
  deltaSeconds: number,
  stopDistance = 0,
): UnitEntity {
  const dx = target.x - unit.x;
  const dy = target.y - unit.y;
  const dist = Math.hypot(dx, dy);
  if (dist <= stopDistance + 2) return { ...unit, moveTarget: undefined, retreating: false };
  const step = Math.min(speed * deltaSeconds, Math.max(0, dist - stopDistance));
  const facing: Facing = dx < 0 ? 'left' : 'right';
  return {
    ...unit,
    facing,
    x: unit.x + (dx / dist) * step,
    y: unit.y + (dy / dist) * step,
  };
}

function getFormationMoveTargets(units: UnitEntity[], x: number, y: number) {
  if (units.length <= 1) return new Map(units.map((unit) => [unit.id, { x, y }]));

  const center = units.reduce(
    (point, unit) => ({ x: point.x + unit.x / units.length, y: point.y + unit.y / units.length }),
    { x: 0, y: 0 },
  );
  return new Map(
    units.map((unit) => {
      const offset = clampVector(unit.x - center.x, unit.y - center.y, GAME_SETTINGS.combat.formationMaxMoveOffset);
      return [unit.id, { x: x + offset.x, y: y + offset.y }];
    }),
  );
}

function isPlayerUnitInCombat(unit: UnitEntity, units: UnitEntity[], enemyCastles: CastleEntity[], now: number) {
  if (unit.team !== 'player' || getUnit(unit.defId).kind !== 'combat') return false;
  if (unit.targetId) return true;
  if (unit.lastAttackAt && now - unit.lastAttackAt < 1500) return true;
  if (units.some((other) => other.team === 'enemy' && other.targetId === unit.id)) return true;

  const definition = getUnit(unit.defId);
  const attackReach = Math.max(definition.range, 64);
  if (units.some((other) => other.team === 'enemy' && getUnit(other.defId).kind === 'combat' && distance(unit, other) <= attackReach)) {
    return true;
  }
  return enemyCastles.some((castle) => castle.hp > 0 && distance(unit, castle) <= attackReach);
}

function clampVector(x: number, y: number, maxLength: number) {
  const length = Math.hypot(x, y);
  if (length <= maxLength || length === 0) return { x, y };
  const scale = maxLength / length;
  return { x: x * scale, y: y * scale };
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function resolveDamage(attack: number, target: UnitEntity | CastleEntity) {
  return Math.max(1, attack - ('defId' in target ? 0 : GAME_SETTINGS.combat.castleDefense));
}

function makeSpawnEvent(unit: UnitEntity): CombatEvent {
  const definition = getUnit(unit.defId);
  return {
    id: performance.now() + Math.random(),
    kind: 'spawn',
    fromX: unit.x,
    fromY: unit.y,
    toX: unit.x,
    toY: unit.y,
    glyph: '☁',
    color: unit.team === 'enemy' ? '#bb3f4d' : '#4777bd',
    body: definition.body,
    leftHand: definition.leftHand,
    rightHand: definition.rightHand,
    background: definition.background,
    pillWidth: definition.pillWidth,
    team: unit.team,
  };
}

function makeDeathEvent(unit: UnitEntity): CombatEvent {
  const definition = getUnit(unit.defId);
  const drift = unit.team === 'enemy' ? 90 : -90;
  return {
    id: performance.now() + Math.random(),
    kind: 'death',
    fromX: unit.x,
    fromY: unit.y,
    toX: unit.x + drift,
    toY: unit.y + 190,
    glyph: 'X_X',
    color: unit.team === 'enemy' ? '#bb3f4d' : '#4777bd',
    body: definition.deathBody,
    leftHand: definition.deathLeftHand,
    rightHand: definition.deathRightHand,
    background: definition.background,
    pillWidth: definition.pillWidth,
    team: unit.team,
  };
}

function makeCastleDestroyedEvent(castle: CastleEntity): CombatEvent {
  return {
    id: performance.now() + Math.random(),
    kind: 'castle-destroyed',
    fromX: castle.x,
    fromY: castle.y,
    toX: castle.x,
    toY: castle.y,
    glyph: '💥',
    color: '#e24d5b',
    text: castle.symbol,
  };
}

function makeProjectile(attacker: UnitEntity, target: UnitEntity | CastleEntity, state: Pick<GameState, 'unlockedTech'>): ProjectileEntity {
  const definition = getUnit(attacker.defId);
  const dx = target.x - attacker.x;
  const dy = target.y - attacker.y;
  const dist = Math.max(1, Math.hypot(dx, dy));
  return {
    id: performance.now() + Math.random(),
    team: attacker.team,
    x: attacker.x,
    y: attacker.y,
    vx: (dx / dist) * definition.projectileSpeed,
    vy: (dy / dist) * definition.projectileSpeed,
    damage: attacker.team === 'player' ? getEffectiveAttack(definition.attack, state) : definition.attack,
    remainingDistance: definition.range + 96,
    glyph: definition.projectile?.glyph ?? '!',
    color: definition.projectile?.color ?? '#f0a729',
    radius: definition.projectileRadius,
    impactGlyph: definition.projectile?.impact?.glyph ?? '💥',
    impactColor: definition.projectile?.impact?.color ?? definition.projectile?.color,
    targetId: target.id,
  };
}

function advanceProjectiles(
  projectiles: ProjectileEntity[],
  units: UnitEntity[],
  enemyCastles: CastleEntity[],
  deltaSeconds: number,
) {
  const damageById = new Map<string, number>();
  const events: CombatEvent[] = [];
  let castles = enemyCastles;
  const nextProjectiles: ProjectileEntity[] = [];

  for (const projectile of projectiles) {
    const step = Math.min(Math.hypot(projectile.vx, projectile.vy) * deltaSeconds, projectile.remainingDistance);
    if (step <= 0) continue;
    const speed = Math.max(1, Math.hypot(projectile.vx, projectile.vy));
    const from = { x: projectile.x, y: projectile.y };
    const to = {
      x: projectile.x + (projectile.vx / speed) * step,
      y: projectile.y + (projectile.vy / speed) * step,
    };

    const hitUnit = firstProjectileUnitHit(projectile, from, to, units);
    if (hitUnit) {
      const damage = resolveDamage(projectile.damage, hitUnit);
      damageById.set(hitUnit.id, (damageById.get(hitUnit.id) ?? 0) + damage);
      events.push(makeCombatEvent({ ...from }, hitUnit, damage, projectile.impactGlyph ?? '', projectile.impactColor ?? projectile.color));
      continue;
    }

    const hitCastle = firstProjectileCastleHit(projectile, from, to, castles);
    if (hitCastle) {
      const damage = resolveDamage(projectile.damage, hitCastle);
      castles = castles.map((castle) => (castle.id === hitCastle.id ? { ...castle, hp: Math.max(0, castle.hp - damage) } : castle));
      events.push(makeCombatEvent({ ...from }, hitCastle, damage, projectile.impactGlyph ?? '', projectile.impactColor ?? projectile.color));
      continue;
    }

    const remainingDistance = projectile.remainingDistance - step;
    if (remainingDistance > 0) {
      nextProjectiles.push({ ...projectile, x: to.x, y: to.y, remainingDistance });
    }
  }

  return { projectiles: nextProjectiles, damageById, enemyCastles: castles, events };
}

function firstProjectileUnitHit(projectile: ProjectileEntity, from: { x: number; y: number }, to: { x: number; y: number }, units: UnitEntity[]) {
  let best: { unit: UnitEntity; t: number } | undefined;
  for (const unit of units) {
    if (unit.team === projectile.team) continue;
    if (getUnit(unit.defId).kind !== 'combat') continue;
    const hit = segmentCircleHit(from, to, unit, projectile.radius + 30);
    if (hit === undefined) continue;
    if (!best || hit < best.t) best = { unit, t: hit };
  }
  return best?.unit;
}

function firstProjectileCastleHit(
  projectile: ProjectileEntity,
  from: { x: number; y: number },
  to: { x: number; y: number },
  castles: CastleEntity[],
) {
  let best: { castle: CastleEntity; t: number } | undefined;
  for (const castle of castles) {
    if (castle.team === projectile.team || castle.hp <= 0) continue;
    const hit = segmentCircleHit(from, to, castle, projectile.radius + 58);
    if (hit === undefined) continue;
    if (!best || hit < best.t) best = { castle, t: hit };
  }
  return best?.castle;
}

function segmentCircleHit(from: { x: number; y: number }, to: { x: number; y: number }, circle: { x: number; y: number }, radius: number) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq <= 0) return Math.hypot(circle.x - from.x, circle.y - from.y) <= radius ? 0 : undefined;
  const t = Math.max(0, Math.min(1, ((circle.x - from.x) * dx + (circle.y - from.y) * dy) / lenSq));
  const x = from.x + dx * t;
  const y = from.y + dy * t;
  return Math.hypot(circle.x - x, circle.y - y) <= radius ? t : undefined;
}

function makeCombatEvent(
  attacker: { x: number; y: number },
  target: UnitEntity | CastleEntity,
  damage: number,
  glyph: string,
  color: string,
): CombatEvent {
  const impact = getClosestBorderPoint(attacker, target, 'defId' in target ? 30 : 58);
  return {
    id: performance.now() + Math.random(),
    kind: 'impact',
    fromX: attacker.x,
    fromY: attacker.y,
    toX: impact.x,
    toY: impact.y,
    glyph,
    color,
    text: `-${Math.floor(damage)}`,
  };
}
