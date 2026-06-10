import { useEffect, useMemo, useReducer, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Backpack, Crosshair, FlaskConical, HeartPulse, MousePointer2, Swords } from 'lucide-react';
import { GAME_SETTINGS } from '../../shared/settings';
import { getTrait, weaponDefinitions, type TraitDefinition } from './content';
import {
  applyTraitToWeapon,
  applyTraitToWeaponByItemNo,
  activateWeapon,
  adventureWorld,
  createInitialAdventureState,
  disposeInventoryItem,
  equipWeapon,
  flashItemSlot,
  getEffectiveWeapon,
  getEquippedWeapon,
  PLAYER_MOVE_SPEED,
  removeTraitFromWeapon,
  tickAdventureState,
  unequipWeapon,
  usePotionByItemNo,
  type Actor,
  type AdventureState,
  type CombatEffect,
  type EffectiveWeapon,
  type HandSlot,
  type Projectile,
} from './state';

type InventorySelection =
  | { kind: 'weapon'; itemNo: number }
  | { kind: 'trait'; itemNo: number }
  | { kind: 'potion'; itemNo: number };

declare global {
  interface Window {
    adventureDebug?: {
      state: () => AdventureState;
      openInventory: () => void;
      closeInventory: () => void;
      selectItem: (kind: InventorySelection['kind'], itemNo: number) => void;
      equip: (hand: HandSlot, itemNo: number) => void;
      useItem: (itemNo: number) => void;
      applyStone: (stoneItemNo: number, weaponItemNo: number) => void;
      itemIds: () => {
        weapons: Array<{ itemNo: number; name: string }>;
        stones: Array<{ itemNo: number; traitId: string; count: number }>;
        items: Array<{ itemNo: number; name: string; count: number }>;
      };
    };
  }
}

type Action =
  | { type: 'tick'; now: number; keys: Set<string>; aim: { x: number; y: number } }
  | { type: 'activate'; hand: HandSlot; now: number; aim: { x: number; y: number } }
  | { type: 'item'; slot: number; now: number }
  | { type: 'equipWeapon'; hand: HandSlot; weaponInstanceId: string }
  | { type: 'unequipWeapon'; hand: HandSlot }
  | { type: 'applyTrait'; traitId: string; weaponInstanceId: string }
  | { type: 'removeTrait'; weaponInstanceId: string; index: number }
  | { type: 'usePotion'; itemNo: number; now: number }
  | { type: 'dispose'; kind: InventorySelection['kind']; itemNo: number }
  | { type: 'reset' };

type Camera = {
  x: number;
  y: number;
  zoom: number;
};

const unitBodyHeight = 40;
const unitBodyFont = 18;
const unitHandFont = 17;
const unitHandGap = 8;
const initialZoom = 1.05;

function reducer(state: AdventureState, action: Action): AdventureState {
  if (action.type === 'tick') return tickAdventureState(state, action.now, action);
  if (action.type === 'activate') return activateWeapon(state, action.hand, action.aim, action.now);
  if (action.type === 'item') return flashItemSlot(state, action.slot, action.now);
  if (action.type === 'equipWeapon') return equipWeapon(state, action.hand, action.weaponInstanceId);
  if (action.type === 'unequipWeapon') return unequipWeapon(state, action.hand);
  if (action.type === 'applyTrait') return applyTraitToWeapon(state, action.traitId, action.weaponInstanceId);
  if (action.type === 'removeTrait') return removeTraitFromWeapon(state, action.weaponInstanceId, action.index);
  if (action.type === 'usePotion') return usePotionByItemNo(state, action.itemNo, action.now);
  if (action.type === 'dispose') return disposeInventoryItem(state, action.kind === 'potion' ? 'potion' : action.kind, action.itemNo);
  return createInitialAdventureState();
}

export function App() {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialAdventureState);
  const [hoverHand, setHoverHand] = useState<HandSlot | undefined>();
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventorySelection | undefined>({ kind: 'weapon', itemNo: 2 });
  const [traitPickerWeaponNo, setTraitPickerWeaponNo] = useState<number | undefined>();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef(state);
  const hoverHandRef = useRef<HandSlot | undefined>(undefined);
  const keysRef = useRef(new Set<string>());
  const heldAttackRef = useRef(new Set<HandSlot>());
  const aimRef = useRef({ x: adventureWorld.spawn.x + 1, y: adventureWorld.spawn.y });
  const cameraRef = useRef<Camera>({
    x: adventureWorld.spawn.x - GAME_SETTINGS.map.initialViewportWidth / initialZoom / 2,
    y: adventureWorld.spawn.y - GAME_SETTINGS.map.initialViewportHeight / initialZoom / 2,
    zoom: initialZoom,
  });

  stateRef.current = state;
  hoverHandRef.current = hoverHand;
  const leftWeapon = useMemo(() => getEquippedWeapon(state, 'left'), [state]);
  const rightWeapon = useMemo(() => getEquippedWeapon(state, 'right'), [state]);
  const status = useMemo(() => getCharacterStatus(leftWeapon, rightWeapon), [leftWeapon, rightWeapon]);
  const dummy = state.enemies[0];
  const now = performance.now();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
        event.preventDefault();
        keysRef.current.add(key);
      }
      if (/^[1-5]$/.test(key)) {
        event.preventDefault();
        dispatch({ type: 'item', slot: Number(key), now: performance.now() });
      }
      if (key === 'i') {
        event.preventDefault();
        setInventoryOpen((open) => !open);
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      keysRef.current.delete(event.key.toLowerCase());
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  useEffect(() => {
    const stopHeldAttacks = () => heldAttackRef.current.clear();
    window.addEventListener('mouseup', stopHeldAttacks);
    window.addEventListener('blur', stopHeldAttacks);
    return () => {
      window.removeEventListener('mouseup', stopHeldAttacks);
      window.removeEventListener('blur', stopHeldAttacks);
    };
  }, []);

  useEffect(() => {
    window.adventureDebug = {
      state: () => stateRef.current,
      openInventory: () => setInventoryOpen(true),
      closeInventory: () => setInventoryOpen(false),
      selectItem: (kind, itemNo) => {
        setInventoryOpen(true);
        setSelectedItem({ kind, itemNo });
      },
      equip: (hand, itemNo) => {
        dispatch({ type: 'equipWeapon', hand, weaponInstanceId: stateRef.current.inventory.weapons.find((item) => item.itemNo === itemNo)?.id ?? '' });
      },
      useItem: (itemNo) => dispatch({ type: 'usePotion', itemNo, now: performance.now() }),
      applyStone: (stoneItemNo, weaponItemNo) => {
        const next = applyTraitToWeaponByItemNo(stateRef.current, stoneItemNo, weaponItemNo);
        if (next !== stateRef.current) {
          const trait = stateRef.current.inventory.traits.find((item) => item.itemNo === stoneItemNo);
          const weapon = stateRef.current.inventory.weapons.find((item) => item.itemNo === weaponItemNo);
          if (trait && weapon) dispatch({ type: 'applyTrait', traitId: trait.traitId, weaponInstanceId: weapon.id });
        }
      },
      itemIds: () => ({
        weapons: stateRef.current.inventory.weapons.map((item) => ({ itemNo: item.itemNo, name: item.name })),
        stones: stateRef.current.inventory.traits.map((item) => ({ itemNo: item.itemNo, traitId: item.traitId, count: item.count })),
        items: stateRef.current.inventory.potions.map((item) => ({ itemNo: item.itemNo, name: item.name, count: item.count })),
      }),
    };
    console.log(
      [
        'Adventure debug helpers:',
        'window.adventureDebug.itemIds()',
        "window.adventureDebug.openInventory()",
        "window.adventureDebug.selectItem('weapon', 2)",
        "window.adventureDebug.equip('left', 3)",
        'window.adventureDebug.useItem(201)',
        'window.adventureDebug.applyStone(104, 2)',
        'window.adventureDebug.state()',
      ].join('\n'),
    );
    return () => {
      delete window.adventureDebug;
    };
  }, []);

  useEffect(() => {
    let frame = 0;
    const loop = (frameNow: number) => {
      dispatch({ type: 'tick', now: frameNow, keys: new Set(keysRef.current), aim: aimRef.current });
      for (const hand of heldAttackRef.current) {
        dispatch({ type: 'activate', hand, now: frameNow, aim: aimRef.current });
      }
      const canvas = canvasRef.current;
      if (canvas) {
        syncCamera(cameraRef.current, stateRef.current.player, canvas);
        drawScene(canvas, cameraRef.current, stateRef.current, aimRef.current, hoverHandRef.current, frameNow);
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, []);

  const updateAim = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    aimRef.current = screenToWorld(canvas, cameraRef.current, clientX, clientY);
  };

  const activate = (hand: HandSlot) => {
    dispatch({ type: 'activate', hand, now: performance.now(), aim: aimRef.current });
  };

  return (
    <main className="app-shell adventure-app">
      <section className="adventure-stage">
        <canvas
          ref={canvasRef}
          className="adventure-canvas"
          onContextMenu={(event) => event.preventDefault()}
          onMouseMove={(event) => updateAim(event.clientX, event.clientY)}
          onMouseDown={(event) => {
            updateAim(event.clientX, event.clientY);
            if (event.button === 0) {
              heldAttackRef.current.add('left');
              activate('left');
            }
            if (event.button === 2) {
              heldAttackRef.current.add('right');
              activate('right');
            }
          }}
          onMouseUp={(event) => {
            if (event.button === 0) heldAttackRef.current.delete('left');
            if (event.button === 2) heldAttackRef.current.delete('right');
          }}
        />

        <div className="adventure-hud" aria-label="Adventure status">
          <div className="adventure-title">
            <Swords size={19} />
            <div>
              <h1>Adventure</h1>
              <p>Prototype combat sandbox</p>
            </div>
          </div>
          <div className="adventure-vitals">
            <div className="status-hp-row">
              <HeartPulse size={18} />
              <span>HP {Math.ceil(state.player.hp)} / {state.player.maxHp}</span>
            </div>
            <div className="status-hp-bar">
              <span style={{ width: `${Math.max(0, state.player.hp / state.player.maxHp) * 100}%` }} />
            </div>
            <div className="status-grid">
              <StatusLine icon="⚔️" label="ATK" value={status.attack} />
              <StatusLine icon="🛡️" label="DEF" value={status.defense} />
              <StatusLine icon="👟" label="SPD" value={status.speed} />
              <StatusLine icon="⏱️" label="RATE" value={`${status.rate}/s`} />
              <StatusLine icon="↔️" label="RNG" value={status.range} />
              <StatusLine icon="💥" label="AREA" value={status.radius} />
            </div>
          </div>
        </div>

        <div className="adventure-dummy-panel">
          <Crosshair size={18} />
          <span>{dummy.name}</span>
          <strong>{Math.ceil(dummy.hp)} / {dummy.maxHp}</strong>
          <div className="adventure-bar">
            <span style={{ width: `${Math.max(0, dummy.hp / dummy.maxHp) * 100}%` }} />
          </div>
        </div>

        <button className="inventory-toggle" type="button" onClick={() => setInventoryOpen((open) => !open)}>
          <Backpack size={18} />
          [I] Inventory
        </button>

        <div className="adventure-weapons" aria-label="Weapon slots">
          <WeaponSlot
            hand="left"
            label="L"
            weapon={leftWeapon}
            readyAt={state.cooldownReadyAt.left}
            now={now}
            active={state.weaponFlash.some((flash) => flash.hand === 'left')}
            onHover={setHoverHand}
            onActivate={() => activate('left')}
          />
          <WeaponSlot
            hand="right"
            label="R"
            weapon={rightWeapon}
            readyAt={state.cooldownReadyAt.right}
            now={now}
            active={state.weaponFlash.some((flash) => flash.hand === 'right')}
            onHover={setHoverHand}
            onActivate={() => activate('right')}
          />
        </div>

        <div className="adventure-items" aria-label="Item slots">
          {[1, 2, 3, 4, 5].map((slot) => (
            <button
              key={slot}
              className={state.itemFlash.some((flash) => flash.slot === slot) ? 'item-slot item-used' : 'item-slot'}
              type="button"
              onClick={() => dispatch({ type: 'item', slot, now: performance.now() })}
              title={`Item slot ${slot}`}
            >
              <small>{slot}</small>
              <FlaskConical size={18} />
            </button>
          ))}
        </div>

        <div className="adventure-controls">
          <MousePointer2 size={16} />
          <span>WASD/Arrows move · Cursor aims · Left/Right click attack · I inventory</span>
        </div>

        {inventoryOpen && (
          <InventoryPanel
            state={state}
            selectedItem={selectedItem}
            onSelectItem={setSelectedItem}
            onEquip={(hand, weaponInstanceId) => dispatch({ type: 'equipWeapon', hand, weaponInstanceId })}
            onUnequip={(hand) => dispatch({ type: 'unequipWeapon', hand })}
            onApplyTrait={(traitId, weaponInstanceId) => dispatch({ type: 'applyTrait', traitId, weaponInstanceId })}
            onRemoveTrait={(weaponInstanceId, index) => dispatch({ type: 'removeTrait', weaponInstanceId, index })}
            onUse={(itemNo) => dispatch({ type: 'usePotion', itemNo, now: performance.now() })}
            onDispose={(kind, itemNo) => {
              dispatch({ type: 'dispose', kind, itemNo });
              setSelectedItem(undefined);
              setTraitPickerWeaponNo(undefined);
            }}
            traitPickerWeaponNo={traitPickerWeaponNo}
            onOpenTraitPicker={setTraitPickerWeaponNo}
            onCloseTraitPicker={() => setTraitPickerWeaponNo(undefined)}
            onClose={() => setInventoryOpen(false)}
          />
        )}
      </section>
    </main>
  );
}

function WeaponSlot({
  hand,
  label,
  weapon,
  readyAt,
  now,
  active,
  onHover,
  onActivate,
}: {
  hand: HandSlot;
  label: string;
  weapon?: EffectiveWeapon;
  readyAt: number;
  now: number;
  active: boolean;
  onHover: (hand: HandSlot | undefined) => void;
  onActivate: () => void;
}) {
  const cooldownMs = weapon ? 1000 / weapon.attackSpeed : 1;
  const progress = weapon ? Math.max(0, Math.min(1, 1 - (readyAt - now) / cooldownMs)) : 1;
  const ready = progress >= 1;
  const cooldown = Math.max(0, Math.min(1, 1 - progress));
  const icon = weapon?.projectile?.glyph ?? weapon?.handGlyph ?? '╯';
  return (
    <button
      className={`item-slot weapon-slot ${ready ? 'ready' : ''} ${active ? 'weapon-used' : ''}`}
      type="button"
      onMouseEnter={() => onHover(hand)}
      onMouseLeave={() => onHover(undefined)}
      onFocus={() => onHover(hand)}
      onBlur={() => onHover(undefined)}
      onClick={onActivate}
      title={weapon ? `${weapon.name}: ${weapon.description}` : 'No weapon equipped'}
    >
      <small>{label}</small>
      <span className="weapon-slot-icon" style={{ color: weapon?.color }}>
        {icon}
      </span>
      <span
        className="weapon-cooldown"
        style={{
          background: `conic-gradient(rgba(18, 22, 28, 0.68) ${cooldown * 100}%, rgba(18, 22, 28, 0) 0)`,
          opacity: ready ? 0 : 1,
        }}
      />
      {weapon && (
        <span className="weapon-tooltip">
          <strong>{weapon.name}</strong>
          <span>{weapon.kind === 'melee' ? 'Melee' : 'Ranged'} · {weapon.damage} dmg · {weapon.range} range</span>
          <span>{weapon.description}</span>
        </span>
      )}
    </button>
  );
}

function InventoryPanel({
  state,
  selectedItem,
  onSelectItem,
  onEquip,
  onUnequip,
  onApplyTrait,
  onRemoveTrait,
  onUse,
  onDispose,
  traitPickerWeaponNo,
  onOpenTraitPicker,
  onCloseTraitPicker,
  onClose,
}: {
  state: AdventureState;
  selectedItem: InventorySelection | undefined;
  onSelectItem: (selection: InventorySelection | undefined) => void;
  onEquip: (hand: HandSlot, weaponInstanceId: string) => void;
  onUnequip: (hand: HandSlot) => void;
  onApplyTrait: (traitId: string, weaponInstanceId: string) => void;
  onRemoveTrait: (weaponInstanceId: string, index: number) => void;
  onUse: (itemNo: number) => void;
  onDispose: (kind: InventorySelection['kind'], itemNo: number) => void;
  traitPickerWeaponNo: number | undefined;
  onOpenTraitPicker: (weaponItemNo: number) => void;
  onCloseTraitPicker: () => void;
  onClose: () => void;
}) {
  return (
    <aside className="inventory-panel" aria-label="Inventory">
      <div className="inventory-heading">
        <div>
          <h2>Inventory</h2>
          <p>Weapons, items, and Imprint Stones</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close inventory">×</button>
      </div>

      <div className="inventory-body">
        <div className="inventory-bag">
          <InventoryGroup title="Equipment">
            {state.inventory.weapons.map((weapon) => {
              const effective = getEffectiveWeapon(state, weapon.id);
              return (
                <InventorySlot
                  key={weapon.id}
                  selected={selectedItem?.kind === 'weapon' && selectedItem.itemNo === weapon.itemNo}
                  itemNo={weapon.itemNo}
                  icon={effective.projectile?.glyph ?? effective.handGlyph}
                  color={effective.color}
                  name={weapon.name}
                  equippedLeft={weapon.id === state.character.leftWeaponInstanceId}
                  equippedRight={weapon.id === state.character.rightWeaponInstanceId}
                  onClick={() => onSelectItem({ kind: 'weapon', itemNo: weapon.itemNo })}
                />
              );
            })}
          </InventoryGroup>

          <InventoryGroup title="Useable Items">
            {state.inventory.potions.map((item) => (
              <InventorySlot
                key={item.itemNo}
                selected={selectedItem?.kind === 'potion' && selectedItem.itemNo === item.itemNo}
                itemNo={item.itemNo}
                icon={item.icon}
                name={item.name}
                countLabel={`x${item.count}`}
                onClick={() => onSelectItem({ kind: 'potion', itemNo: item.itemNo })}
              />
            ))}
          </InventoryGroup>

          <InventoryGroup title="Imprint Stones">
            {state.inventory.traits.map((stack) => {
              const trait = getTrait(stack.traitId);
              return (
                <InventorySlot
                  key={stack.itemNo}
                  selected={selectedItem?.kind === 'trait' && selectedItem.itemNo === stack.itemNo}
                  itemNo={stack.itemNo}
                  icon={<StoneIcon trait={trait} size="slot" />}
                  name={trait.name}
                  countLabel={`x${stack.count}`}
                  onClick={() => onSelectItem({ kind: 'trait', itemNo: stack.itemNo })}
                />
              );
            })}
          </InventoryGroup>
        </div>

        {selectedItem && (
          <ItemInspector
            state={state}
            selection={selectedItem}
            onEquip={onEquip}
            onUnequip={onUnequip}
            onApplyTrait={onApplyTrait}
            onRemoveTrait={onRemoveTrait}
            onUse={onUse}
            onDispose={onDispose}
            traitPickerWeaponNo={traitPickerWeaponNo}
            onOpenTraitPicker={onOpenTraitPicker}
            onCloseTraitPicker={onCloseTraitPicker}
          />
        )}
      </div>
    </aside>
  );
}

function InventoryGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="inventory-group">
      <h3>{title}</h3>
      <div className="inventory-grid">{children}</div>
    </section>
  );
}

function InventorySlot({
  selected,
  itemNo,
  icon,
  color,
  name,
  countLabel,
  equippedLeft,
  equippedRight,
  onClick,
}: {
  selected: boolean;
  itemNo: number;
  icon: ReactNode;
  color?: string;
  name: string;
  countLabel?: string;
  equippedLeft?: boolean;
  equippedRight?: boolean;
  onClick: () => void;
}) {
  return (
    <button className={`inventory-slot ${selected ? 'selected' : ''}`} type="button" onClick={onClick} title={`#${itemNo} ${name}`}>
      <span className="slot-icon" style={{ color }}>{icon}</span>
      {countLabel && <span className="slot-count">{countLabel}</span>}
      {equippedLeft && <span className="equipped-mark left">L</span>}
      {equippedRight && <span className="equipped-mark right">R</span>}
    </button>
  );
}

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <span className="stat-pill">
      <small>{label}</small>
      <strong>{value}</strong>
    </span>
  );
}

function AttributeRow({ icon, label, value, bonus }: { icon: string; label: string; value: string | number; bonus?: string | number }) {
  return (
    <span className="attribute-row">
      <span>{icon}</span>
      <small>{label}</small>
      <strong>
        {value}
        {bonus !== undefined && bonus !== 0 && <em> (+{bonus})</em>}
      </strong>
    </span>
  );
}

function ItemInspector({
  state,
  selection,
  onEquip,
  onUnequip,
  onApplyTrait,
  onRemoveTrait,
  onUse,
  onDispose,
  traitPickerWeaponNo,
  onOpenTraitPicker,
  onCloseTraitPicker,
}: {
  state: AdventureState;
  selection: InventorySelection;
  onEquip: (hand: HandSlot, weaponInstanceId: string) => void;
  onUnequip: (hand: HandSlot) => void;
  onApplyTrait: (traitId: string, weaponInstanceId: string) => void;
  onRemoveTrait: (weaponInstanceId: string, index: number) => void;
  onUse: (itemNo: number) => void;
  onDispose: (kind: InventorySelection['kind'], itemNo: number) => void;
  traitPickerWeaponNo: number | undefined;
  onOpenTraitPicker: (weaponItemNo: number) => void;
  onCloseTraitPicker: () => void;
}) {
  if (selection.kind === 'weapon') {
    const weapon = state.inventory.weapons.find((item) => item.itemNo === selection.itemNo);
    if (!weapon) return null;
    const effective = getEffectiveWeapon(state, weapon.id);
    return (
      <section className="item-inspector">
        <InspectorHeader icon={effective.projectile?.glyph ?? effective.handGlyph} color={effective.color} name={weapon.name} itemNo={weapon.itemNo} />
        <div className="inspector-scroll">
          <div className="trait-slots">
            {Array.from({ length: 5 }, (_, index) => {
              const traitId = weapon.traitIds[index];
              const trait = traitId ? getTrait(traitId) : undefined;
              return (
                <button
                  className={trait ? 'stone-socket filled' : 'stone-socket'}
                  key={index}
                  type="button"
                  onClick={() => (trait ? onRemoveTrait(weapon.id, index) : onOpenTraitPicker(weapon.itemNo))}
                  title={trait?.description ?? 'Open trait slot'}
                >
                  {trait && <StoneIcon trait={trait} size="socket" />}
                  {trait && (
                    <span className="socket-tooltip">
                      <strong>{trait.name}</strong>
                      <small>{getTraitEffectSummary(trait, effective)}</small>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <p>{effective.description}</p>
          <div className="attribute-list">
            <AttributeRow icon="⚔️" label="Damage" value={effective.baseDamage} bonus={effective.damage - effective.baseDamage} />
            <AttributeRow
              icon="⏱️"
              label="Rate"
              value={`${effective.baseAttackSpeed}/s`}
              bonus={formatStatBonus(effective.attackSpeed - effective.baseAttackSpeed)}
            />
            <AttributeRow icon="↔️" label="Range" value={effective.baseRange} bonus={effective.range - effective.baseRange} />
            <AttributeRow icon="💥" label="Radius" value={effective.baseRadius} bonus={effective.radius - effective.baseRadius} />
          </div>
        </div>
        {traitPickerWeaponNo === weapon.itemNo && (
          <StonePicker
            state={state}
            weapon={weapon}
            onApplyTrait={(traitId) => {
              onApplyTrait(traitId, weapon.id);
              onCloseTraitPicker();
            }}
            onClose={onCloseTraitPicker}
          />
        )}
        <div className="inspector-actions">
          {weapon.id === state.character.leftWeaponInstanceId ? (
            <button type="button" onClick={() => onUnequip('left')}>Unequip L</button>
          ) : (
            <button type="button" onClick={() => onEquip('left', weapon.id)}>Equip L</button>
          )}
          {weapon.id === state.character.rightWeaponInstanceId ? (
            <button type="button" onClick={() => onUnequip('right')}>Unequip R</button>
          ) : (
            <button type="button" onClick={() => onEquip('right', weapon.id)}>Equip R</button>
          )}
          <DisposeButton disabled={weapon.id === state.character.leftWeaponInstanceId || weapon.id === state.character.rightWeaponInstanceId} onDispose={() => onDispose('weapon', weapon.itemNo)} />
        </div>
      </section>
    );
  }

  if (selection.kind === 'trait') {
    const stack = state.inventory.traits.find((item) => item.itemNo === selection.itemNo);
    if (!stack) return null;
    const trait = getTrait(stack.traitId);
    return (
      <section className="item-inspector">
        <InspectorHeader icon={<StoneIcon trait={trait} size="header" />} name={trait.name} itemNo={stack.itemNo} />
        <div className="inspector-scroll">
          <div className="trait-slots single">
            <span className="stone-socket filled"><StoneIcon trait={trait} size="socket" /></span>
          </div>
          <p>{trait.description}</p>
          <div className="inspector-meta">{getTraitEffectSummary(trait)}</div>
        </div>
        <div className="inspector-actions">
          <DisposeButton onDispose={() => onDispose('trait', stack.itemNo)} />
        </div>
      </section>
    );
  }

  const potion = state.inventory.potions.find((item) => item.itemNo === selection.itemNo);
  if (!potion) return null;
  return (
    <section className="item-inspector">
      <InspectorHeader icon={potion.icon} name={potion.name} itemNo={potion.itemNo} />
      <div className="inspector-scroll">
        <p>Restores {potion.heal} HP. Stack: x{potion.count}</p>
        <div className="weapon-stat-grid">
          <StatPill label="Heal" value={potion.heal} />
          <StatPill label="Count" value={potion.count} />
        </div>
      </div>
      <div className="inspector-actions">
        <button type="button" onClick={() => onUse(potion.itemNo)}>Use</button>
        <DisposeButton onDispose={() => onDispose('potion', potion.itemNo)} />
      </div>
    </section>
  );
}

function StonePicker({
  state,
  weapon,
  onApplyTrait,
  onClose,
}: {
  state: AdventureState;
  weapon: { name: string; traitIds: string[] };
  onApplyTrait: (traitId: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="stone-picker">
      <div className="stone-picker-heading">
        <strong>Imprint</strong>
        <button type="button" onClick={onClose} aria-label="Close stone picker">×</button>
      </div>
      <div className="stone-picker-grid">
        {state.inventory.traits.map((stack) => {
          const trait = getTrait(stack.traitId);
          return (
            <button key={stack.itemNo} type="button" onClick={() => onApplyTrait(trait.id)}>
              <StoneIcon trait={trait} size="picker" />
              <strong>{trait.name}</strong>
              <small>{getTraitEffectSummary(trait)}</small>
              <small>x{stack.count}</small>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function getTraitEffectSummary(trait: ReturnType<typeof getTrait>, weapon?: EffectiveWeapon) {
  const parts: string[] = [];
  if (trait.damageMultiplier) {
    const percent = Math.round((trait.damageMultiplier - 1) * 100);
    const value = weapon ? ` (+${Math.ceil(weapon.baseDamage * trait.damageMultiplier) - weapon.baseDamage})` : '';
    parts.push(`Damage +${percent}%${value}`);
  }
  if (trait.attackSpeedMultiplier) {
    const percent = Math.round((trait.attackSpeedMultiplier - 1) * 100);
    const value = weapon ? ` (+${formatStatBonus(weapon.baseAttackSpeed * trait.attackSpeedMultiplier - weapon.baseAttackSpeed)}/s)` : '';
    parts.push(`Rate +${percent}%${value}`);
  }
  if (trait.rangeMultiplier) {
    const percent = Math.round((trait.rangeMultiplier - 1) * 100);
    const value = weapon ? ` (+${Math.ceil(weapon.baseRange * trait.rangeMultiplier) - weapon.baseRange})` : '';
    parts.push(`Range +${percent}%${value}`);
  }
  if (trait.radiusMultiplier) {
    const percent = Math.round((trait.radiusMultiplier - 1) * 100);
    const value = weapon ? ` (+${Math.ceil(weapon.baseRadius * trait.radiusMultiplier) - weapon.baseRadius})` : '';
    parts.push(`Hit area +${percent}%${value}`);
  }
  if (trait.extraProjectiles) parts.push(`Projectiles +${trait.extraProjectiles}`);
  return parts.join(' · ') || trait.description;
}

function formatStatBonus(value: number) {
  return Math.round(value * 100) / 100;
}

function getCharacterStatus(leftWeapon: EffectiveWeapon | undefined, rightWeapon: EffectiveWeapon | undefined) {
  const weapons = [leftWeapon, rightWeapon].filter((weapon): weapon is EffectiveWeapon => Boolean(weapon));
  return {
    attack: weapons.reduce((value, weapon) => value + weapon.damage, 0),
    defense: 0,
    speed: PLAYER_MOVE_SPEED,
    rate: formatStatBonus(weapons.reduce((value, weapon) => value + weapon.attackSpeed, 0)),
    range: weapons.length ? Math.max(...weapons.map((weapon) => weapon.range)) : 0,
    radius: weapons.length ? Math.max(...weapons.map((weapon) => weapon.radius)) : 0,
  };
}

function StatusLine({ icon, label, value }: { icon: string; label: string; value: string | number }) {
  return (
    <span className="status-line">
      <span>{icon}</span>
      <small>{label}</small>
      <strong>{value}</strong>
    </span>
  );
}

function StoneIcon({ trait, size = 'slot' }: { trait: TraitDefinition; size?: 'slot' | 'socket' | 'picker' | 'header' }) {
  return (
    <span className={`stone-icon ${size}`} style={{ '--stone-color': trait.color } as CSSProperties} title={`${trait.name} · ${trait.family}`}>
      <span>{trait.icon}</span>
    </span>
  );
}

function InspectorHeader({ icon, color, name, itemNo }: { icon: ReactNode; color?: string; name: string; itemNo: number }) {
  return (
    <div className="inspector-header">
      <span style={{ color }}>{icon}</span>
      <div>
        <h3>{name}</h3>
      </div>
      <small className="inspector-item-no">Item #{itemNo}</small>
    </div>
  );
}

function DisposeButton({ disabled, onDispose }: { disabled?: boolean; onDispose: () => void }) {
  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const frameRef = useRef(0);
  const startRef = useRef(0);

  const stop = () => {
    window.cancelAnimationFrame(frameRef.current);
    setHolding(false);
    setProgress(0);
  };

  const start = () => {
    if (disabled) return;
    startRef.current = performance.now();
    setHolding(true);
    const step = (now: number) => {
      const next = Math.min(1, (now - startRef.current) / 900);
      setProgress(next);
      if (next >= 1) {
        setHolding(false);
        onDispose();
        return;
      }
      frameRef.current = window.requestAnimationFrame(step);
    };
    frameRef.current = window.requestAnimationFrame(step);
  };

  return (
    <button
      className="dispose-button"
      type="button"
      disabled={disabled}
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
    >
      <span>{holding ? 'Hold...' : 'Dispose'}</span>
      <i style={{ width: `${progress * 100}%` }} />
    </button>
  );
}

function drawScene(canvas: HTMLCanvasElement, camera: Camera, state: AdventureState, aim: { x: number; y: number }, hoverHand: HandSlot | undefined, now: number) {
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  const width = Math.max(1, Math.floor(rect.width * ratio));
  const height = Math.max(1, Math.floor(rect.height * ratio));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, rect.width, rect.height);

  ctx.fillStyle = '#91b975';
  ctx.fillRect(0, 0, rect.width, rect.height);

  ctx.save();
  ctx.scale(camera.zoom, camera.zoom);
  ctx.translate(-camera.x, -camera.y);
  drawMap(ctx);
  if (hoverHand) drawWeaponRange(ctx, state, hoverHand);
  drawAimCursor(ctx, aim);
  for (const enemy of state.enemies) drawEnemy(ctx, enemy, now);
  drawPlayer(ctx, state, now);
  for (const projectile of state.projectiles) drawProjectile(ctx, projectile);
  for (const effect of state.effects) drawEffect(ctx, effect, now);
  ctx.restore();
}

function drawMap(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = '#b7d889';
  ctx.fillRect(0, 0, adventureWorld.width, adventureWorld.height);
  ctx.strokeStyle = 'rgba(74, 107, 61, 0.16)';
  ctx.lineWidth = 2;
  for (let x = 0; x < adventureWorld.width; x += GAME_SETTINGS.map.gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, adventureWorld.height);
    ctx.stroke();
  }
  for (let y = 0; y < adventureWorld.height; y += GAME_SETTINGS.map.gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(adventureWorld.width, y);
    ctx.stroke();
  }
  for (const prop of adventureWorld.terrainProps) {
    drawTerrainProp(ctx, prop.kind, prop.x, prop.y, prop.size, prop.rotation);
  }
}

function drawTerrainProp(ctx: CanvasRenderingContext2D, kind: string, x: number, y: number, size: number, rotation: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.scale(size, size);
  if (kind === 'tree') {
    ctx.fillStyle = 'rgba(49, 113, 56, 0.28)';
    ctx.beginPath();
    ctx.ellipse(0, 3, 22, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#5f8e3f';
    ctx.beginPath();
    ctx.arc(-8, -6, 13, 0, Math.PI * 2);
    ctx.arc(8, -7, 15, 0, Math.PI * 2);
    ctx.arc(0, -18, 13, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === 'rock') {
    ctx.fillStyle = '#8f9187';
    ctx.beginPath();
    ctx.ellipse(0, 0, 16, 11, 0.2, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === 'flower') {
    ctx.fillStyle = '#d95f91';
    for (let i = 0; i < 5; i += 1) {
      ctx.beginPath();
      ctx.arc(Math.cos(i * 1.26) * 7, Math.sin(i * 1.26) * 7, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#f3d64f';
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === 'mushroom') {
    ctx.fillStyle = '#f4ead1';
    ctx.fillRect(-4, -2, 8, 13);
    ctx.fillStyle = '#c94d5d';
    ctx.beginPath();
    ctx.arc(0, -4, 12, Math.PI, 0);
    ctx.fill();
  } else {
    ctx.fillStyle = '#8a6740';
    ctx.beginPath();
    ctx.ellipse(0, 0, 12, 9, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawPlayer(ctx: CanvasRenderingContext2D, state: AdventureState, now: number) {
  const leftWeapon = getEquippedWeapon(state, 'left');
  const rightWeapon = getEquippedWeapon(state, 'right');
  const leftReady = now >= state.cooldownReadyAt.left;
  const rightReady = now >= state.cooldownReadyAt.right;
  drawKaomoji(ctx, {
    x: state.player.x,
    y: state.player.y,
    facing: state.player.facing,
    body: state.character.body,
    leftHand: getVisibleHandGlyph(leftWeapon, leftReady),
    rightHand: getVisibleHandGlyph(rightWeapon, rightReady),
    color: state.character.color,
    pillWidth: state.character.pillWidth,
    stroke: '#4777bd',
    selected: true,
    wobble: Math.sin(now / 220) * 1.1,
  });
  drawHpBar(ctx, state.player.x - 36, state.player.y + 31, 72, 8, state.player.hp / state.player.maxHp, '#4777bd');
}

function drawEnemy(ctx: CanvasRenderingContext2D, enemy: Actor, now: number) {
  if (enemy.hp <= 0) return;
  drawKaomoji(ctx, {
    x: enemy.x,
    y: enemy.y,
    facing: enemy.facing,
    body: 'x_x',
    leftHand: '|',
    rightHand: '|',
    color: '#f2d6c7',
    pillWidth: 78,
    stroke: '#bb3f4d',
    selected: false,
    wobble: Math.sin(now / 380 + enemy.x) * 0.8,
  });
  ctx.save();
  ctx.fillStyle = '#493542';
  ctx.font = '800 18px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(enemy.name, enemy.x, enemy.y - 48);
  drawHpBar(ctx, enemy.x - 48, enemy.y + 32, 96, 9, enemy.hp / enemy.maxHp, '#d94f5f');
  ctx.restore();
}

function drawKaomoji(
  ctx: CanvasRenderingContext2D,
  unit: {
    x: number;
    y: number;
    facing: 'left' | 'right';
    body: string;
    leftHand?: string;
    rightHand?: string;
    color: string;
    pillWidth: number;
    stroke: string;
    selected: boolean;
    wobble: number;
  },
) {
  ctx.save();
  ctx.translate(unit.x, unit.y);
  ctx.fillStyle = 'rgba(40, 52, 42, 0.28)';
  ctx.beginPath();
  ctx.ellipse(0, 23, unit.pillWidth / 2, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = unit.color;
  ctx.strokeStyle = unit.stroke;
  ctx.lineWidth = unit.selected ? 4 : 2;
  ctx.beginPath();
  ctx.roundRect(-unit.pillWidth / 2, -unitBodyHeight / 2, unit.pillWidth, unitBodyHeight, unitBodyHeight / 2);
  ctx.fill();
  ctx.stroke();
  ctx.save();
  if (unit.facing === 'left') ctx.scale(-1, 1);
  ctx.translate(0, unit.wobble);
  ctx.font = `${unitBodyFont}px "Trebuchet MS", "Segoe UI", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#182033';
  ctx.shadowColor = 'rgba(255,255,255,0.85)';
  ctx.shadowBlur = 4;
  ctx.fillText(unit.body, 0, 0);
  ctx.font = `${unitHandFont}px "Trebuchet MS", "Segoe UI", sans-serif`;
  if (unit.leftHand) {
    ctx.textAlign = 'right';
    ctx.fillText(unit.leftHand, -unit.pillWidth / 2 - unitHandGap, 0);
  }
  if (unit.rightHand) {
    ctx.textAlign = 'left';
    ctx.fillText(unit.rightHand, unit.pillWidth / 2 + unitHandGap, 0);
  }
  ctx.restore();
  ctx.restore();
}

function drawProjectile(ctx: CanvasRenderingContext2D, projectile: Projectile) {
  ctx.save();
  ctx.translate(projectile.x, projectile.y);
  ctx.fillStyle = projectile.color;
  ctx.shadowColor = projectile.color;
  ctx.shadowBlur = 8;
  ctx.font = '700 31px "Segoe UI Symbol", "Segoe UI Emoji", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(projectile.glyph, 0, 0);
  ctx.restore();
}

function drawEffect(ctx: CanvasRenderingContext2D, effect: CombatEffect, now: number) {
  if (now < effect.born) return;
  if (effect.kind === 'death') {
    drawDeathEffect(ctx, effect, now);
    return;
  }
  const life = effect.kind === 'damage' ? 950 : 420;
  const t = Math.min(1, (now - effect.born) / life);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (effect.kind === 'damage') {
    ctx.globalAlpha = 1 - Math.max(0, t - 0.72) / 0.28;
    ctx.fillStyle = effect.color;
    ctx.font = '900 25px "Segoe UI", sans-serif';
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(255,255,255,0.88)';
    const y = effect.y - 48 - t * 54;
    ctx.strokeText(effect.glyph, effect.x, y);
    ctx.fillText(effect.glyph, effect.x, y);
  } else {
    const pulse = Math.sin(t * Math.PI);
    ctx.globalAlpha = 1 - Math.max(0, t - 0.72) / 0.28;
    ctx.fillStyle = effect.color;
    ctx.font = `${Math.round((effect.size ?? 42) + pulse * 10)}px "Segoe UI Emoji", "Segoe UI Symbol", sans-serif`;
    ctx.fillText(effect.glyph, effect.x, effect.y);
  }
  ctx.restore();
}

function drawDeathEffect(ctx: CanvasRenderingContext2D, effect: CombatEffect, now: number) {
  const t = Math.min(1, (now - effect.born) / 1250);
  const drift = 1 - Math.pow(1 - t, 2);
  const x = effect.x + ((effect.toX ?? effect.x) - effect.x) * drift;
  const y = effect.y - Math.sin(t * Math.PI) * 128 + Math.pow(t, 2.35) * 270;
  const spin = (effect.team === 'enemy' ? 1 : -1) * t * Math.PI * 1.8;

  ctx.save();
  ctx.globalAlpha = 1 - Math.max(0, t - 0.72) / 0.28;
  drawFxKaomoji(ctx, effect, x, y, spin);
  ctx.restore();
}

function drawFxKaomoji(ctx: CanvasRenderingContext2D, effect: CombatEffect, x: number, y: number, rotation: number) {
  const body = effect.body ?? effect.glyph;
  const bodyWidth = effect.pillWidth ?? 76;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.fillStyle = effect.background ?? '#dcecff';
  ctx.strokeStyle = effect.team === 'enemy' ? '#bb3f4d' : '#4777bd';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-bodyWidth / 2, -unitBodyHeight / 2, bodyWidth, unitBodyHeight, unitBodyHeight / 2);
  ctx.fill();
  ctx.stroke();

  ctx.font = `${unitBodyFont}px "Trebuchet MS", "Segoe UI", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#182033';
  ctx.shadowColor = 'rgba(255,255,255,0.85)';
  ctx.shadowBlur = 4;
  ctx.fillText(body, 0, 0);
  ctx.font = `${unitHandFont}px "Trebuchet MS", "Segoe UI", sans-serif`;
  if (effect.leftHand) {
    ctx.textAlign = 'right';
    ctx.fillText(effect.leftHand, -bodyWidth / 2 - unitHandGap, 0);
  }
  if (effect.rightHand) {
    ctx.textAlign = 'left';
    ctx.fillText(effect.rightHand, bodyWidth / 2 + unitHandGap, 0);
  }
  ctx.restore();
}

function drawWeaponRange(ctx: CanvasRenderingContext2D, state: AdventureState, hand: HandSlot) {
  const weapon = getEquippedWeapon(state, hand);
  if (!weapon) return;
  ctx.save();
  ctx.strokeStyle = weapon.color;
  ctx.globalAlpha = 0.36;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(state.player.x, state.player.y, weapon.range, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = weapon.color;
  ctx.fill();
  ctx.restore();
}

function drawAimCursor(ctx: CanvasRenderingContext2D, aim: { x: number; y: number }) {
  ctx.save();
  ctx.fillStyle = '#f4b23f';
  ctx.font = '700 24px "Segoe UI Symbol", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('⌖', aim.x, aim.y);
  ctx.restore();
}

function getVisibleHandGlyph(weapon: EffectiveWeapon | undefined, ready: boolean) {
  if (!weapon) return '╯';
  if (ready || weapon.kind === 'melee') return weapon.handGlyph;
  return weapon.bareHandGlyph ?? '╯';
}

function drawHpBar(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, ratio: number, color: string) {
  ctx.fillStyle = '#2f2630';
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, height / 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x + 1, y + 1, Math.max(0, width - 2) * Math.max(0, Math.min(1, ratio)), height - 2, height / 2);
  ctx.fill();
}

function syncCamera(camera: Camera, player: Actor, canvas: HTMLCanvasElement) {
  const rect = canvas.getBoundingClientRect();
  camera.x = clamp(player.x - rect.width / camera.zoom / 2, -GAME_SETTINGS.map.cameraOverscroll, adventureWorld.width - rect.width / camera.zoom + GAME_SETTINGS.map.cameraOverscroll);
  camera.y = clamp(player.y - rect.height / camera.zoom / 2, -GAME_SETTINGS.map.cameraOverscroll, adventureWorld.height - rect.height / camera.zoom + GAME_SETTINGS.map.cameraOverscroll);
}

function screenToWorld(canvas: HTMLCanvasElement, camera: Camera, clientX: number, clientY: number) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (clientX - rect.left) / camera.zoom + camera.x,
    y: (clientY - rect.top) / camera.zoom + camera.y,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export const adventureWeapons = weaponDefinitions;
