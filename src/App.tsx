import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type CSSProperties } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, Coins, Crosshair, FlaskConical, Hammer, HandCoins, HeartPulse, PanelRightClose, PanelRightOpen, RotateCcw, Swords, Trophy, Upload, UserMinus, UsersRound, X } from 'lucide-react';
import { Battlefield } from './components/Battlefield';
import { ShopCard } from './components/ShopCard';
import {
  clearCustomMinions,
  combatMinions,
  getUnit,
  loadCustomMinions,
  minionSchemaExample,
  MinionJson,
  saveCustomMinions,
  unitDefinitions,
  validateMinionJson,
  workerMinions,
} from './game/content';
import {
  buyUnit,
  buyTechnology,
  clearSelection,
  commandSelected,
  createInitialState,
  dismissWorker,
  formatMoney,
  formatNumber,
  GameState,
  getAlivePlayerUnitCount,
  getEffectiveAttack,
  getScaledCost,
  getSelectionCastle,
  getSelectionUnit,
  getStats,
  selectBase,
  selectCastle,
  selectUnit,
  selectUnits,
  tickState,
} from './game/state';
import { GAME_SETTINGS } from './game/settings';
import {
  clearCustomTech,
  loadCustomTech,
  saveCustomTech,
  technologies,
  technologySchemaExample,
  TechnologyDefinition,
  TechnologyJson,
  validateTechnologyJson,
} from './game/technology';

type Action =
  | { type: 'tick'; now: number }
  | { type: 'click' }
  | { type: 'setCoins'; coins: number }
  | { type: 'addCoins'; coins: number }
  | { type: 'buy'; unitId: string }
  | { type: 'buyTech'; techId: string }
  | { type: 'dismissWorker'; unitId: string }
  | { type: 'select'; unitId?: string }
  | { type: 'selectUnits'; unitIds: string[] }
  | { type: 'selectCastle'; castleId: string }
  | { type: 'selectBase' }
  | { type: 'clearSelection' }
  | { type: 'command'; x: number; y: number; targetId?: string }
  | { type: 'reset' };

const STORAGE_KEY = 'minion-clicker-rts-save-v9';

declare global {
  interface Window {
    minionDebug?: {
      setCoins: (coins: number) => void;
      addCoins: (coins: number) => void;
      state: () => GameState;
      importMinions: (minions: MinionJson | MinionJson[]) => void;
      importTech: (tech: TechnologyJson | TechnologyJson[]) => void;
      clearCustomMinions: () => void;
      clearCustomTech: () => void;
      minionSchema: () => MinionJson;
      technologySchema: () => TechnologyJson;
    };
  }
}

const loadState = (): GameState => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return createInitialState();
    const parsed = JSON.parse(saved) as GameState;
    return {
      ...createInitialState(),
      ...parsed,
      lastTick: performance.now(),
      combatEvents: [],
      projectiles: [],
    };
  } catch {
    return createInitialState();
  }
};

const reducer = (state: GameState, action: Action): GameState => {
  if (action.type === 'tick') return tickState(state, action.now);
  if (action.type === 'buy') return buyUnit(state, action.unitId);
  if (action.type === 'buyTech') return buyTechnology(state, action.techId);
  if (action.type === 'dismissWorker') return dismissWorker(state, action.unitId);
  if (action.type === 'select') return selectUnit(state, action.unitId);
  if (action.type === 'selectUnits') return selectUnits(state, action.unitIds);
  if (action.type === 'selectCastle') return selectCastle(state, action.castleId);
  if (action.type === 'selectBase') return selectBase(state);
  if (action.type === 'clearSelection') return clearSelection(state);
  if (action.type === 'command') return commandSelected(state, action.x, action.y, action.targetId);

  if (action.type === 'click') {
    return {
      ...state,
      coins: state.coins + state.clickPower,
      totalCoins: state.totalCoins + state.clickPower,
      message: 'The treasury button produced another coin.',
    };
  }

  if (action.type === 'setCoins') {
    return {
      ...state,
      coins: Math.max(0, action.coins),
      totalCoins: Math.max(state.totalCoins, action.coins),
    };
  }

  if (action.type === 'addCoins') {
    return {
      ...state,
      coins: Math.max(0, state.coins + action.coins),
      totalCoins: Math.max(state.totalCoins, state.totalCoins + Math.max(0, action.coins)),
    };
  }

  return createInitialState();
};

export function App() {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);
  const [shopOpen, setShopOpen] = useState(true);
  const [shopTab, setShopTab] = useState<'combat' | 'worker' | 'tech'>('combat');
  const [importError, setImportError] = useState<string>();
  const [treasuryPops, setTreasuryPops] = useState<Array<{ id: number; amount: number; x: number }>>([]);
  const stats = useMemo(() => getStats(state), [state]);
  const selectedUnit = getSelectionUnit(state);
  const selectedCastle = getSelectionCastle(state);
  const selectedDefinition = selectedUnit ? getUnit(selectedUnit.defId) : undefined;
  const selectedHpClass = selectedUnit?.team === 'enemy' || selectedCastle ? 'enemy-hp' : 'friendly-hp';
  const baseWorkers = useMemo(
    () =>
      workerMinions
        .map((worker) => ({
          worker,
          count: state.units.filter((unit) => unit.team === 'player' && unit.defId === worker.id).length,
        }))
        .filter((entry) => entry.count > 0),
    [state.units],
  );
  const saveRef = useRef(0);
  const stateRef = useRef(state);
  const minionImportRef = useRef<HTMLInputElement | null>(null);
  const techImportRef = useRef<HTMLInputElement | null>(null);

  stateRef.current = state;

  useEffect(() => {
    let frame = 0;
    const loop = (now: number) => {
      dispatch({ type: 'tick', now });
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const now = performance.now();
    if (now - saveRef.current < GAME_SETTINGS.economy.autosaveMs) return;
    saveRef.current = now;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    window.minionDebug = {
      setCoins: (coins: number) => dispatch({ type: 'setCoins', coins }),
      addCoins: (coins: number) => dispatch({ type: 'addCoins', coins }),
      state: () => stateRef.current,
      importMinions: (minions: MinionJson | MinionJson[]) => {
        const list = Array.isArray(minions) ? minions : [minions];
        saveCustomMinions([...loadCustomMinions(), ...list.map(validateMinionJson)]);
        window.location.reload();
      },
      importTech: (tech: TechnologyJson | TechnologyJson[]) => {
        const list = Array.isArray(tech) ? tech : [tech];
        saveCustomTech([...loadCustomTech(), ...list.map(validateTechnologyJson)]);
        window.location.reload();
      },
      clearCustomMinions: () => {
        clearCustomMinions();
        window.location.reload();
      },
      clearCustomTech: () => {
        clearCustomTech();
        window.location.reload();
      },
      minionSchema: () => minionSchemaExample,
      technologySchema: () => technologySchemaExample,
    };
    console.log(
      [
        'Minion Clicker dev helpers:',
        'window.minionDebug.setCoins(9999)',
        'window.minionDebug.addCoins(500)',
        'window.minionDebug.state()',
        'window.minionDebug.minionSchema()',
        'window.minionDebug.importMinions(window.minionDebug.minionSchema())',
        'window.minionDebug.importTech(window.minionDebug.technologySchema())',
        'window.minionDebug.clearCustomMinions()',
        'window.minionDebug.clearCustomTech()',
      ].join('\n'),
    );
    return () => {
      delete window.minionDebug;
    };
  }, []);

  const handleReset = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    dispatch({ type: 'reset' });
  }, []);

  const handleTreasuryClick = useCallback(() => {
    const id = performance.now() + Math.random();
    dispatch({ type: 'click' });
    setTreasuryPops((pops) => [...pops.slice(-9), { id, amount: stateRef.current.clickPower, x: 36 + Math.random() * 28 }]);
    window.setTimeout(() => {
      setTreasuryPops((pops) => pops.filter((pop) => pop.id !== id));
    }, 1150);
  }, []);

  const handleImportFile = useCallback(async (file: File | undefined, kind: 'minion' | 'tech') => {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      const list = Array.isArray(parsed) ? parsed : [parsed];
      if (kind === 'minion') {
        const minions = list.map(validateMinionJson);
        ensureUniqueIds(minions.map((minion) => minion.id), unitDefinitions.map((unit) => unit.id), 'minion');
        saveCustomMinions([...loadCustomMinions(), ...minions]);
      } else {
        const tech = list.map(validateTechnologyJson);
        ensureUniqueIds(tech.map((item) => item.id), technologies.map((item) => item.id), 'technology');
        saveCustomTech([...loadCustomTech(), ...tech]);
      }
      window.location.reload();
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'The DLC file could not be imported.');
    }
  }, []);

  return (
    <main className="app-shell">
      <section className={`game-stage ${shopOpen ? 'shop-visible' : ''}`}>
        <Battlefield
          state={state}
          onSelectUnit={(unitId) => dispatch({ type: 'select', unitId })}
          onSelectUnits={(unitIds) => dispatch({ type: 'selectUnits', unitIds })}
          onSelectCastle={(castleId) => dispatch({ type: 'selectCastle', castleId })}
          onSelectBase={() => dispatch({ type: 'selectBase' })}
          onClearSelection={() => dispatch({ type: 'clearSelection' })}
          onCommand={(x, y, targetId) => dispatch({ type: 'command', x, y, targetId })}
        />

        <div className="hud-strip" aria-label="resources">
          <span className="hud-pill coin-pill">
            <Coins size={24} />
            {formatMoney(state.coins)}
          </span>
          <span className="hud-pill">
            <HandCoins size={22} />
            {formatMoney(stats.coinsPerSecond)}/s
          </span>
          <span className="hud-pill">
            <UsersRound size={22} />
            {formatNumber(stats.armySize + stats.workerCount)}
          </span>
          <span className="hud-pill danger">
            <Crosshair size={22} />
            {stats.castlesAlive} keeps
          </span>
        </div>

        <button className="treasury-button" type="button" onClick={handleTreasuryClick}>
          <span>🪙</span>
          <strong>+{formatMoney(state.clickPower)}</strong>
          {treasuryPops.map((pop) => (
            <span className="treasury-pop" key={pop.id} style={{ left: `${pop.x}%` }}>
              🪙 +{formatMoney(pop.amount)}
            </span>
          ))}
        </button>

        <section className="selected-overlay">
          <div className="section-title">
            <HeartPulse size={18} />
            <h2>Selected</h2>
            {state.selection.kind !== 'empty' && (
              <button className="clear-selection-button" type="button" onClick={() => dispatch({ type: 'clearSelection' })} aria-label="Cancel selection">
                <X size={16} />
              </button>
            )}
          </div>
          {selectedUnit && selectedDefinition ? (
            <div className="selected-card">
              <div
                className={`selected-face ${selectedUnit.team === 'enemy' ? 'enemy-unit' : 'friendly-unit'}`}
                style={{ '--unit-bg': selectedDefinition.background, '--unit-width': `${selectedDefinition.pillWidth}px` } as CSSProperties}
              >
                <span className="shop-hand">{selectedDefinition.leftHand}</span>
                <span className="shop-body">{selectedDefinition.body}</span>
                <span className="shop-hand">{selectedDefinition.rightHand}</span>
              </div>
              <div>
                <h3>{selectedDefinition.name}</h3>
              <p>{selectedDefinition.kind === 'worker' ? 'Worker' : 'Combat'}</p>
              </div>
              <Stat label="HP" value={`${formatNumber(selectedUnit.hp)} / ${formatNumber(selectedUnit.maxHp)}`} />
              {selectedDefinition.kind === 'worker' ? (
                <Stat label="Coins/s" value={formatMoney(selectedDefinition.coinsPerSecond ?? 0)} />
              ) : (
                <Stat
                  label="Attack"
                  value={formatNumber(selectedUnit.team === 'player' ? getEffectiveAttack(selectedDefinition.attack, state) : selectedDefinition.attack)}
                />
              )}
              <Stat label="Range" value={formatNumber(selectedDefinition.range)} />
              <Stat label="Speed" value={formatNumber(selectedDefinition.speed)} />
              <Stat label="Rate" value={`${formatRate(selectedDefinition.attackSpeed)}/s`} />
              <div className={`hp-track ${selectedHpClass}`}>
                <span style={{ width: `${Math.max(0, selectedUnit.hp / selectedUnit.maxHp) * 100}%` }} />
              </div>
            </div>
          ) : state.selection.kind === 'multi' ? (
            <div className="selected-summary">
              <strong>Squad selected</strong>
              <span>{state.selection.unitIds.length} minions ready</span>
            </div>
          ) : selectedCastle ? (
            <div className="selected-summary">
              <strong>
                {selectedCastle.symbol} {selectedCastle.name}
              </strong><br/>
              <span>HP {formatNumber(selectedCastle.hp)} / {formatNumber(selectedCastle.maxHp)}</span>
              <div className="hp-track enemy-hp">
                <span style={{ width: `${Math.max(0, selectedCastle.hp / selectedCastle.maxHp) * 100}%` }} />
              </div>
            </div>
          ) : state.selection.kind === 'base' ? (
            <div className="selected-summary">
              <strong>🏕️ Base</strong>
              <span>🪙 {formatMoney(stats.coinsPerSecond)}/s</span>
              {baseWorkers.length > 0 ? (
                <div className="base-worker-list">
                  {baseWorkers.map(({ worker, count }) => (
                    <div className="base-worker-row" key={worker.id} style={{ '--unit-bg': worker.background, '--unit-width': `${worker.pillWidth}px` } as CSSProperties}>
                      <span className="shop-hand">{worker.leftHand}</span>
                      <span className="shop-body">{worker.body}</span>
                      <span className="shop-hand">{worker.rightHand}</span>
                      <strong>x{count}</strong>
                      <small>+{formatMoney((worker.coinsPerSecond ?? 0) * count)}/s</small>
                      <button
                        className="dismiss-worker-button"
                        type="button"
                        onClick={() => dispatch({ type: 'dismissWorker', unitId: worker.id })}
                        title={`Dismiss ${worker.name}`}
                        aria-label={`Dismiss ${worker.name}`}
                      >
                        <UserMinus size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-box base-empty">No workers inside</div>
              )}
            </div>
          ) : (
            <div className="empty-box" />
          )}
        </section>

        <button className={`shop-toggle ${shopOpen ? 'drawer-open' : 'drawer-closed'}`} type="button" onClick={() => setShopOpen((open) => !open)} aria-label="Toggle shop">
          {shopOpen ? <PanelRightClose size={20} /> : <PanelRightOpen size={20} />}
          {shopOpen ? <ChevronDown className="mobile-drawer-icon" size={24} /> : <ChevronUp className="mobile-drawer-icon" size={24} />}
        </button>

        {shopOpen && (
          <aside className="shop-overlay">
            <div className="brand-block">
              <h1>Minion Clicker</h1>
              <p>SHOP</p>
            </div>

            <div className="tabs" role="tablist" aria-label="Shop categories">
              <button className={shopTab === 'combat' ? 'active' : ''} type="button" onClick={() => setShopTab('combat')}>
                <Swords size={17} />
                Combat
              </button>
              <button className={shopTab === 'worker' ? 'active' : ''} type="button" onClick={() => setShopTab('worker')}>
                <Hammer size={17} />
                Worker
              </button>
              <button className={shopTab === 'tech' ? 'active' : ''} type="button" onClick={() => setShopTab('tech')}>
                <FlaskConical size={17} />
                Tech
              </button>
            </div>

            <section className="shop-panel">
              {shopTab === 'tech'
                ? (
                  <>
                    {technologies.map((tech) => (
                      <TechCard
                        key={tech.id}
                        tech={tech}
                        unlocked={state.unlockedTech.includes(tech.id)}
                        coins={state.coins}
                        onBuy={(techId) => dispatch({ type: 'buyTech', techId })}
                      />
                    ))}
                    <ImportCard label="Import Tech DLC" onClick={() => techImportRef.current?.click()} />
                  </>
                )
                : (
                  <>
                    {(shopTab === 'combat' ? combatMinions : workerMinions).map((unit) => (
                      <ShopCard
                        key={unit.id}
                        unit={unit}
                        count={getAlivePlayerUnitCount(state, unit.id)}
                        cost={getScaledCost(unit.id, getAlivePlayerUnitCount(state))}
                        coins={state.coins}
                        onBuy={(unitId) => dispatch({ type: 'buy', unitId })}
                      />
                    ))}
                    <ImportCard label={`Import ${shopTab === 'combat' ? 'Combat' : 'Worker'} DLC`} onClick={() => minionImportRef.current?.click()} />
                  </>
                )}
            </section>
            <input
              ref={minionImportRef}
              className="hidden-file-input"
              type="file"
              accept="application/json,.json"
              onChange={(event) => {
                handleImportFile(event.currentTarget.files?.[0], 'minion');
                event.currentTarget.value = '';
              }}
            />
            <input
              ref={techImportRef}
              className="hidden-file-input"
              type="file"
              accept="application/json,.json"
              onChange={(event) => {
                handleImportFile(event.currentTarget.files?.[0], 'tech');
                event.currentTarget.value = '';
              }}
            />
            <button className="ghost-button" type="button" onClick={handleReset}>
              <RotateCcw size={16} />
              Reset run
            </button>
          </aside>
        )}

        {state.wonAt && (
          <section className="victory-overlay" role="dialog" aria-label="Victory">
            <div className="victory-panel">
              <Trophy size={34} />
              <h2>Victory</h2>
              <p>All keeps have fallen.</p>
              <div className="victory-stats">
                <Stat label="Time" value={formatDuration((state.wonAt - state.startedAt) / 1000)} />
                <Stat label="Coins" value={formatMoney(state.totalCoins)} />
                <Stat label="Hired" value={formatNumber(state.totalMinionsSpawned)} />
                <Stat label="Army" value={formatNumber(stats.armySize)} />
                <Stat label="Workers" value={formatNumber(stats.workerCount)} />
              </div>
              <button className="ghost-button" type="button" onClick={handleReset}>
                <RotateCcw size={16} />
                New run
              </button>
            </div>
          </section>
        )}
        {importError && (
          <section className="dlc-error-overlay" role="alertdialog" aria-label="DLC import error">
            <div className="dlc-error-panel">
              <AlertTriangle size={32} />
              <h2>Import Failed</h2>
              <p>{importError}</p>
              <button className="ghost-button" type="button" onClick={() => setImportError(undefined)}>
                <X size={16} />
                Close
              </button>
            </div>
          </section>
        )}
      </section>
    </main>
  );
}

function ImportCard({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button className="import-card" type="button" onClick={onClick}>
      <Upload size={25} />
      <strong>{label}</strong>
    </button>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span className="stat-row">
      <small>{label}</small>
      <strong>{value}</strong>
    </span>
  );
}

function TechCard({
  tech,
  unlocked,
  coins,
  onBuy,
}: {
  tech: TechnologyDefinition;
  unlocked: boolean;
  coins: number;
  onBuy: (techId: string) => void;
}) {
  const canBuy = !unlocked && coins >= tech.cost;
  return (
    <button
      className={`tech-card ${tech.source === 'dlc' ? 'dlc-card' : ''} ${unlocked ? 'unlocked' : ''} ${canBuy ? 'can-buy' : ''}`}
      type="button"
      disabled={!canBuy}
      onClick={() => onBuy(tech.id)}
      title={tech.description}
    >
      <span className="tech-icon">{tech.icon}</span>
      <strong>{tech.name}</strong>
      <small>{tech.description}</small>
      <span className="tech-price">{unlocked ? 'Unlocked' : `🪙 ${formatMoney(tech.cost)}`}</span>
    </button>
  );
}

function formatRate(value: number) {
  return value >= 10 ? value.toFixed(0) : value.toFixed(2).replace(/\.?0+$/, '');
}

function formatDuration(totalSeconds: number) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  return hours > 0 ? `${hours}h ${minutes}m ${rest}s` : `${minutes}m ${rest}s`;
}

function ensureUniqueIds(nextIds: string[], existingIds: string[], label: string) {
  const seen = new Set<string>();
  for (const id of nextIds) {
    if (seen.has(id)) throw new Error(`Duplicate ${label} id in DLC file: ${id}`);
    seen.add(id);
  }
  for (const id of nextIds) {
    if (existingIds.includes(id)) throw new Error(`DLC ${label} id already exists: ${id}`);
  }
}

export const allUnits = unitDefinitions;
