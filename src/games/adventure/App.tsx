import { useEffect, useMemo, useReducer, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode, type WheelEvent } from 'react';
import { Backpack, Crosshair, FlaskConical, HeartPulse, Lock, MousePointer2, Sparkles, Swords } from 'lucide-react';
import { getTrait, weaponDefinitions, type TraitDefinition } from './content';
import {
  applyTraitToWeaponByItemNo,
  adventureWorld,
  createInitialAdventureState,
  getEffectiveWeapon,
  getEquippedWeapon,
  PLAYER_MOVE_SPEED,
  type AdventureState,
  type EffectiveWeapon,
  type HandSlot,
} from './state';
import { bindAdventureCameraZoom, createAdventureCamera, followPlayerCamera, screenToWorld, type AdventureCamera } from './camera';
import { adventureReducer } from './reducer';
import { drawScene } from './sceneRenderer';
import { getOutfit, outfitDefinitions } from './outfits';
import { createSkillTreeLayout, getPassiveSkillModifiers, getSkill, getSkillPrerequisites, skillTreeDefinition, type SkillNodeDefinition } from './skills';

type InventoryItemKind = 'weapon' | 'trait' | 'potion';

type InventorySelection =
  | { kind: 'weapon'; itemNo: number }
  | { kind: 'trait'; itemNo: number }
  | { kind: 'potion'; itemNo: number }
  | { kind: 'outfit'; outfitId: string }
  | { kind: 'skill'; skillId: string };

declare global {
  interface Window {
    adventureDebug?: {
      state: () => AdventureState;
      openInventory: () => void;
      closeInventory: () => void;
      selectItem: (kind: InventoryItemKind, itemNo: number) => void;
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

export function App() {
  const [state, dispatch] = useReducer(adventureReducer, undefined, createInitialAdventureState);
  const [hoverHand, setHoverHand] = useState<HandSlot | undefined>();
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [panelView, setPanelView] = useState<'inventory' | 'skills'>('inventory');
  const [selectedSkillId, setSelectedSkillId] = useState(skillTreeDefinition[0].id);
  const [selectedItem, setSelectedItem] = useState<InventorySelection | undefined>({ kind: 'weapon', itemNo: 2 });
  const [traitPickerWeaponNo, setTraitPickerWeaponNo] = useState<number | undefined>();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef(state);
  const hoverHandRef = useRef<HandSlot | undefined>(undefined);
  const keysRef = useRef(new Set<string>());
  const heldAttackRef = useRef(new Set<HandSlot>());
  const aimRef = useRef({ x: adventureWorld.spawn.x + 1, y: adventureWorld.spawn.y });
  const cameraRef = useRef<AdventureCamera>(createAdventureCamera());
  const trackedPlayerRef = useRef({ x: adventureWorld.spawn.x, y: adventureWorld.spawn.y });

  stateRef.current = state;
  hoverHandRef.current = hoverHand;
  const leftWeapon = useMemo(() => getEquippedWeapon(state, 'left'), [state]);
  const rightWeapon = useMemo(() => getEquippedWeapon(state, 'right'), [state]);
  const status = useMemo(() => getCharacterStatus(leftWeapon, rightWeapon, state), [leftWeapon, rightWeapon, state]);
  const combatTarget = getCombatTarget(state);
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
        dispatch({ type: 'hotbar', slot: Number(key), now: performance.now(), aim: aimRef.current });
      }
      if (key === 'i') {
        event.preventDefault();
        setPanelView('inventory');
        setInventoryOpen(true);
      }
      if (key === 'c') {
        event.preventDefault();
        setPanelView('inventory');
        setInventoryOpen(true);
      }
      if (key === 'k') {
        event.preventDefault();
        setPanelView('skills');
        setInventoryOpen(true);
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
    const canvas = canvasRef.current;
    if (!canvas) return;
    return bindAdventureCameraZoom(canvas, cameraRef, () => stateRef.current.player);
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
        followPlayerCamera(cameraRef.current, stateRef.current.player, trackedPlayerRef.current, canvas);
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
              <p>Explore | Combat | Strengthen</p>
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

        <div className="adventure-right-hud">
          {combatTarget && <CombatTargetPanel target={combatTarget} />}
          <div className="adventure-panel-toggles">
            <button className="inventory-toggle" type="button" onClick={() => { setPanelView('inventory'); setInventoryOpen(true); }}>
              <Backpack size={18} />
              [I/C] Character
            </button>
            <button className="inventory-toggle" type="button" onClick={() => { setPanelView('skills'); setInventoryOpen(true); }}>
              <Sparkles size={18} />
              [K] Skills · {state.skills.points} points
            </button>
          </div>
        </div>

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

        <div className="adventure-items" aria-label="Hotbar slots">
          {[1, 2, 3, 4, 5].map((slot) => {
            return <HotbarSlotButton
              key={slot}
              slot={slot}
              state={state}
              now={now}
              onActivate={() => dispatch({ type: 'hotbar', slot, now: performance.now(), aim: aimRef.current })}
            />;
          })}
        </div>

        <div className="adventure-controls">
          <MousePointer2 size={16} />
          <span>WASD/Arrows move · Cursor aims · Left/Right click attack · 1–5 item/skill · Wheel/pinch zoom · I inventory · K skills</span>
        </div>

        {inventoryOpen && (
          <InventoryPanel
            state={state}
            view={panelView}
            onViewChange={setPanelView}
            selectedSkillId={selectedSkillId}
            onSelectSkill={setSelectedSkillId}
            onUnlockSkill={(skillId) => dispatch({ type: 'unlockSkill', skillId })}
            onEquipSkill={(skillId, slot) => dispatch({ type: 'equipSkill', skillId, slot })}
            selectedItem={selectedItem}
            onSelectItem={setSelectedItem}
            onEquip={(hand, weaponInstanceId) => dispatch({ type: 'equipWeapon', hand, weaponInstanceId })}
            onUnequip={(hand) => dispatch({ type: 'unequipWeapon', hand })}
            onApplyTrait={(traitId, weaponInstanceId) => dispatch({ type: 'applyTrait', traitId, weaponInstanceId })}
            onRemoveTrait={(weaponInstanceId, index) => dispatch({ type: 'removeTrait', weaponInstanceId, index })}
            onUse={(itemNo) => dispatch({ type: 'usePotion', itemNo, now: performance.now() })}
            onEquipItem={(itemNo, slot) => dispatch({ type: 'equipItem', itemNo, slot })}
            onCustomize={(changes) => dispatch({ type: 'customizeCharacter', changes })}
            onEquipOutfit={(outfitId) => dispatch({ type: 'equipOutfit', outfitId })}
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

function HotbarSlotButton({ slot, state, now, onActivate }: { slot: number; state: AdventureState; now: number; onActivate: () => void }) {
  const entry = state.hotbarSlots[slot - 1];
  const flashed = state.itemFlash.some((flash) => flash.slot === slot);
  if (!entry) {
    return <button className={flashed ? 'item-slot item-used' : 'item-slot'} type="button" onClick={onActivate} title={`Empty hotbar slot ${slot}`}>
      <small>{slot}</small><FlaskConical size={18} />
    </button>;
  }
  if (entry.kind === 'potion') {
    const item = state.inventory.potions.find((potion) => potion.itemNo === entry.itemNo);
    return <button className={flashed ? 'item-slot item-used' : 'item-slot'} type="button" onClick={onActivate} title={item ? `${item.name} x${item.count}` : 'Unavailable item'}>
      <small>{slot}</small><span>{item?.icon ?? '×'}</span>{item && <em>x{item.count}</em>}
    </button>;
  }
  const skill = getSkill(entry.skillId);
  const readyAt = state.skills.cooldownReadyAt[skill.id] ?? 0;
  const cooldownMs = skill.active?.cooldownMs ?? 1;
  const remaining = Math.max(0, readyAt - now);
  const cooldown = Math.min(1, remaining / cooldownMs);
  return <button className={`item-slot active-skill-slot ${remaining <= 0 ? 'ready' : ''} ${flashed ? 'item-used' : ''}`} type="button" onClick={onActivate} title={`${skill.name}: ${skill.description}`}>
    <small>{slot}</small>
    <span className="active-skill-glyph" style={{ color: skill.color }}>{skill.icon}</span>
    <span className="weapon-cooldown" style={{ background: `conic-gradient(rgba(18, 22, 28, 0.68) ${cooldown * 100}%, rgba(18, 22, 28, 0) 0)`, opacity: remaining > 0 ? 1 : 0 }} />
    {remaining > 0 && <em>{Math.ceil(remaining / 1000)}s</em>}
  </button>;
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
  view,
  onViewChange,
  selectedSkillId,
  onSelectSkill,
  onUnlockSkill,
  onEquipSkill,
  selectedItem,
  onSelectItem,
  onEquip,
  onUnequip,
  onApplyTrait,
  onRemoveTrait,
  onUse,
  onEquipItem,
  onCustomize,
  onEquipOutfit,
  onDispose,
  traitPickerWeaponNo,
  onOpenTraitPicker,
  onCloseTraitPicker,
  onClose,
}: {
  state: AdventureState;
  view: 'inventory' | 'skills';
  onViewChange: (view: 'inventory' | 'skills') => void;
  selectedSkillId: string;
  onSelectSkill: (skillId: string) => void;
  onUnlockSkill: (skillId: string) => void;
  onEquipSkill: (skillId: string, slot: number) => void;
  selectedItem: InventorySelection | undefined;
  onSelectItem: (selection: InventorySelection | undefined) => void;
  onEquip: (hand: HandSlot, weaponInstanceId: string) => void;
  onUnequip: (hand: HandSlot) => void;
  onApplyTrait: (traitId: string, weaponInstanceId: string) => void;
  onRemoveTrait: (weaponInstanceId: string, index: number) => void;
  onUse: (itemNo: number) => void;
  onEquipItem: (itemNo: number, slot: number) => void;
  onCustomize: (changes: { body?: string; color?: string; pillWidth?: number }) => void;
  onEquipOutfit: (outfitId: string) => void;
  onDispose: (kind: InventoryItemKind, itemNo: number) => void;
  traitPickerWeaponNo: number | undefined;
  onOpenTraitPicker: (weaponItemNo: number) => void;
  onCloseTraitPicker: () => void;
  onClose: () => void;
}) {
  return (
    <aside className={`inventory-panel ${view === 'skills' ? 'skill-panel' : ''}`} aria-label="Adventure menu">
      <div className="inventory-heading">
        <div className="adventure-panel-tabs">
          <button className={view === 'inventory' ? 'selected' : undefined} type="button" onClick={() => onViewChange('inventory')}>
            <Backpack size={17} /> Character
          </button>
          <button className={view === 'skills' ? 'selected' : undefined} type="button" onClick={() => onViewChange('skills')}>
            <Sparkles size={17} /> Skills <em>{state.skills.points}</em>
          </button>
        </div>
        <button type="button" onClick={onClose} aria-label="Close inventory">×</button>
      </div>

      {view === 'skills' ? (
        <SkillTreePanel
          state={state}
          selectedSkillId={selectedSkillId}
          onSelectSkill={onSelectSkill}
          onUnlockSkill={onUnlockSkill}
          onEquipSkill={onEquipSkill}
        />
      ) : <div className="inventory-body">
        <CharacterEditor
          state={state}
          selectedItem={selectedItem}
          onSelectItem={onSelectItem}
          onCustomize={onCustomize}
        />

        <div className="inventory-bag">
          <InventoryGroup title="Items">
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

          <InventoryGroup title="Augmentations">
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
            onEquipItem={onEquipItem}
            onEquipSkill={onEquipSkill}
            onEquipOutfit={onEquipOutfit}
            onDispose={onDispose}
            traitPickerWeaponNo={traitPickerWeaponNo}
            onOpenTraitPicker={onOpenTraitPicker}
            onCloseTraitPicker={onCloseTraitPicker}
          />
        )}
      </div>}
    </aside>
  );
}

function SkillTreePanel({
  state,
  selectedSkillId,
  onSelectSkill,
  onUnlockSkill,
  onEquipSkill,
}: {
  state: AdventureState;
  selectedSkillId: string;
  onSelectSkill: (skillId: string) => void;
  onUnlockSkill: (skillId: string) => void;
  onEquipSkill: (skillId: string, slot: number) => void;
}) {
  const selected = getSkill(selectedSkillId);
  const unlocked = state.skills.unlockedIds.includes(selected.id);
  const layout = useMemo(createSkillTreeLayout, []);
  const [view, setView] = useState({ x: 24, y: 24, scale: 0.72 });
  const [holdingId, setHoldingId] = useState<string>();
  const [completedId, setCompletedId] = useState<string>();
  const [rejectedId, setRejectedId] = useState<string>();
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const completeTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const rejectTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const panRef = useRef<{ pointerId: number; clientX: number; clientY: number; x: number; y: number } | undefined>(undefined);

  useEffect(() => () => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    if (completeTimerRef.current) clearTimeout(completeTimerRef.current);
    if (rejectTimerRef.current) clearTimeout(rejectTimerRef.current);
  }, []);

  const stopHold = () => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    holdTimerRef.current = undefined;
    setHoldingId(undefined);
  };

  const rejectUnlock = (skillId: string) => {
    setRejectedId(skillId);
    if (rejectTimerRef.current) clearTimeout(rejectTimerRef.current);
    rejectTimerRef.current = setTimeout(() => setRejectedId(undefined), 520);
  };

  const startNodeHold = (event: ReactPointerEvent<HTMLButtonElement>, skill: SkillNodeDefinition) => {
    event.stopPropagation();
    onSelectSkill(skill.id);
    if (state.skills.unlockedIds.includes(skill.id)) return;
    setHoldingId(skill.id);
    holdTimerRef.current = setTimeout(() => {
      const prerequisitesMet = prerequisitesMetFor(state, skill);
      if (prerequisitesMet && state.skills.points >= skill.cost) {
        onUnlockSkill(skill.id);
        setCompletedId(skill.id);
        if (completeTimerRef.current) clearTimeout(completeTimerRef.current);
        completeTimerRef.current = setTimeout(() => setCompletedId(undefined), 620);
      } else rejectUnlock(skill.id);
      setHoldingId(undefined);
      holdTimerRef.current = undefined;
    }, 680);
  };

  const beginPan = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    panRef.current = { pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY, x: view.x, y: view.y };
  };

  const movePan = (event: ReactPointerEvent<HTMLDivElement>) => {
    const pan = panRef.current;
    if (!pan || pan.pointerId !== event.pointerId) return;
    setView((current) => ({ ...current, x: pan.x + event.clientX - pan.clientX, y: pan.y + event.clientY - pan.clientY }));
  };

  const endPan = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (panRef.current?.pointerId === event.pointerId) panRef.current = undefined;
  };

  const zoomTree = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const bounds = event.currentTarget.getBoundingClientRect();
    const cursorX = event.clientX - bounds.left;
    const cursorY = event.clientY - bounds.top;
    setView((current) => {
      const scale = Math.max(0.25, Math.min(1.0, current.scale * Math.exp(-event.deltaY * 0.0012)));
      const ratio = scale / current.scale;
      return { scale, x: cursorX - (cursorX - current.x) * ratio, y: cursorY - (cursorY - current.y) * ratio };
    });
  };

  const selectedPrerequisites = getSkillPrerequisites(selected);
  return (
    <div className="skill-tree-layout">
      <section className="skill-tree-board" aria-label="Skill tree">
        <div className="skill-tree-summary">
          <span><Sparkles size={17} /> Available skill points</span>
          <div className="skill-tree-tools">
            <button type="button" onClick={() => setView({ x: 24, y: 24, scale: 0.72 })}>Reset</button>
            <strong>{state.skills.points}</strong>
          </div>
        </div>
        <div className="skill-tree-canvas" onPointerDown={beginPan} onPointerMove={movePan} onPointerUp={endPan} onPointerCancel={endPan} onWheel={zoomTree}>
          <div className="skill-tree-world" style={{ width: layout.width, height: layout.height, transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}>
            <svg className="skill-tree-links" width={layout.width} height={layout.height} aria-hidden="true">
              {skillTreeDefinition.flatMap((skill) => getSkillPrerequisites(skill).map((requiredId) => {
                const from = layout.positions.get(requiredId)!;
                const to = layout.positions.get(skill.id)!;
                const active = state.skills.unlockedIds.includes(requiredId) && state.skills.unlockedIds.includes(skill.id);
                const progressing = holdingId === skill.id;
                const completed = completedId === skill.id;
                return <g key={`${requiredId}-${skill.id}`}>
                  <line className="skill-link-base" x1={from.x} y1={from.y} x2={to.x} y2={to.y} />
                  {(active || progressing || completed) && <line
                    pathLength="1"
                    className={`skill-link-progress ${active ? 'unlocked' : ''} ${progressing ? 'holding' : ''} ${completed ? 'completed' : ''}`}
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                  />}
                </g>;
              }))}
            </svg>
            {skillTreeDefinition.map((skill) => {
              const position = layout.positions.get(skill.id)!;
              const isUnlocked = state.skills.unlockedIds.includes(skill.id);
              const available = prerequisitesMetFor(state, skill);
              const assignedSlot = getAssignedSkillSlot(state, skill.id);
              return <button
                key={skill.id}
                className={`skill-node ${skill.kind} ${isUnlocked ? 'unlocked' : available ? 'available' : 'locked'} ${selected.id === skill.id ? 'selected' : ''} ${holdingId === skill.id ? 'holding' : ''} ${completedId === skill.id ? 'completed' : ''} ${rejectedId === skill.id ? 'rejected' : ''}`}
                style={{ '--skill-color': skill.color, left: position.x, top: position.y } as CSSProperties}
                type="button"
                onPointerDown={(event) => startNodeHold(event, skill)}
                onPointerUp={stopHold}
                onPointerLeave={stopHold}
                onPointerCancel={stopHold}
                onContextMenu={(event) => event.preventDefault()}
                aria-label={`${skill.name || 'Skill tree origin'}, ${skill.kind}, ${isUnlocked ? 'unlocked' : available ? 'available' : 'locked'}`}
              >
                <span className="skill-node-core">
                  <span className="skill-node-fill" />
                  <span className="skill-node-icon">{skill.icon}</span>
                </span>
                {!isUnlocked && !available && <span className="skill-lock-overlay"><Lock size={14} /></span>}
                {assignedSlot && <span className="skill-slot-badge">{assignedSlot}</span>}
                {skill.name && <strong>{skill.name}</strong>}
                <small className="skill-kind-tooltip">{skill.kind}</small>
              </button>;
            })}
          </div>
          <div className="skill-navigation-hint">
            <MousePointer2 size={16} />
            <span>Drag to pan · Wheel to zoom · Hold an available node to unlock</span>
          </div>
        </div>
        <div className="skill-tree-legend">
          <span><i className="passive" /> Passive stat bonus</span>
          <span><i className="active" /> Active hotbar skill</span>
          <span><i className="keystone" /> Keystone tradeoff</span>
        </div>
      </section>

      <section className="skill-inspector">
        <div className="skill-inspector-header">
          <span style={{ color: selected.color }}>{selected.icon}</span>
          <div><small>{selected.kind} skill</small>{selected.name && <h2>{selected.name}</h2>}</div>
          <em>{selected.cost} SP</em>
        </div>
        {selected.description && <p>{selected.description}</p>}
        {(selected.passive || selected.active) && <div className="skill-detail-card">
          {selected.passive && <SkillPassiveDetails skill={selected} />}
          {selected.active && <>
            <AttributeRow icon="⏱" label="Cooldown" value={`${selected.active.cooldownMs / 1000}s`} />
          </>}
        </div>}
        {selectedPrerequisites.length > 0 && <p className="skill-requirement">Requires {selectedPrerequisites.map((skillId) => getSkill(skillId).name).join(', ')}</p>}
        <div className="skill-inspector-actions">
          {!unlocked && <span className="skill-hold-hint">Press and hold the node to unlock</span>}
          {unlocked && selected.kind !== 'active' && <span className="skill-unlocked-label">{selected.kind === 'keystone' ? 'Keystone active' : 'Passive active'}</span>}
          {unlocked && selected.kind === 'active' && <div className="skill-slot-actions">
            <span>Assign to shared hotbar</span>
            <div>{[1, 2, 3, 4, 5].map((slot) => {
              const entry = state.hotbarSlots[slot - 1];
              const equipped = entry?.kind === 'skill' && entry.skillId === selected.id;
              return <button className={equipped ? 'equipped' : undefined} key={slot} type="button" onClick={() => onEquipSkill(selected.id, slot)}>{slot}</button>;
            })}</div>
          </div>}
        </div>
      </section>
    </div>
  );
}

function prerequisitesMetFor(state: AdventureState, skill: SkillNodeDefinition) {
  return getSkillPrerequisites(skill).every((skillId) => state.skills.unlockedIds.includes(skillId));
}

function getAssignedSkillSlot(state: AdventureState, skillId: string) {
  const slotIndex = state.hotbarSlots.findIndex((entry) => entry?.kind === 'skill' && entry.skillId === skillId);
  return slotIndex >= 0 ? slotIndex + 1 : undefined;
}

function SkillPassiveDetails({ skill }: { skill: SkillNodeDefinition }) {
  const passive = skill.passive;
  if (!passive) return null;
  return <>
    {passive.maxHp !== undefined && <AttributeRow icon="♥" label="Max HP" value={`+${passive.maxHp}`} />}
    {passive.moveSpeed !== undefined && <AttributeRow icon="👟" label="Movement speed" value={`+${passive.moveSpeed}`} />}
    {passive.moveSpeedMultiplier !== undefined && <AttributeRow icon="➜" label="Movement speed" value={`×${passive.moveSpeedMultiplier}`} />}
    {passive.damageMultiplier !== undefined && <AttributeRow icon="⚔" label="Weapon damage" value={`${Math.round((passive.damageMultiplier - 1) * 100)}%`} />}
  </>;
}

function CharacterEditor({
  state,
  selectedItem,
  onSelectItem,
  onCustomize,
}: {
  state: AdventureState;
  selectedItem: InventorySelection | undefined;
  onSelectItem: (selection: InventorySelection | undefined) => void;
  onCustomize: (changes: { body?: string; color?: string; pillWidth?: number }) => void;
}) {
  const faces = ['•̀_•́', '•_•', '´∀`', '¬_¬', '˘･з･', '*´∀`', '^_^', 'ಠ_ಠ'];
  const outfit = getOutfit(state.character.outfitId);
  const leftWeapon = getEquippedWeapon(state, 'left');
  const rightWeapon = getEquippedWeapon(state, 'right');
  const activeSkills = state.skills.unlockedIds
    .map((skillId) => getSkill(skillId))
    .filter((skill) => skill.kind === 'active');
  return (
    <section className="character-editor">
      <h3>Character</h3>
      <div className="character-preview character-editor-preview">
        <PreviewWeaponSlot hand="L" weapon={leftWeapon} />
        <div className="character-preview-minion">
          {outfit.glyph && (
            <span
              className="character-preview-outfit"
              style={{ color: outfit.color, transform: `translate(calc(-50% + ${outfit.offsetX ?? 0}px), calc(-50% + ${outfit.offsetY ?? 0}px))` }}
            >
              {outfit.glyph}
            </span>
          )}
          <strong style={{ background: state.character.color, width: state.character.pillWidth }}>{state.character.body}</strong>
        </div>
        <PreviewWeaponSlot hand="R" weapon={rightWeapon} />
      </div>
      <section className="character-section character-skills">
        <h3>Skills</h3>
        <div className="character-skill-grid">
          {activeSkills.map((skill) => {
            const assignedSlot = getAssignedSkillSlot(state, skill.id);
            return <button
              className={`character-skill-slot active ${selectedItem?.kind === 'skill' && selectedItem.skillId === skill.id ? 'selected' : ''}`}
              key={skill.id}
              type="button"
              title={`${skill.name}: ${skill.description}`}
              style={{ '--skill-color': skill.color } as CSSProperties}
              onClick={() => onSelectItem({ kind: 'skill', skillId: skill.id })}
            >
              {skill.icon}
              {assignedSlot && <span className="skill-slot-badge">{assignedSlot}</span>}
            </button>;
          })}
          {activeSkills.length === 0 && <span className="character-skills-empty">No active skills unlocked</span>}
        </div>
      </section>
      <section className="character-section">
        <h3>Kaomoji</h3>
        <div className="character-choice-grid">
          {faces.map((body) => <button className={state.character.body === body ? 'selected' : ''} key={body} type="button" onClick={() => onCustomize({ body })}>{body}</button>)}
        </div>
      </section>
      <section className="character-section">
        <label className="character-color-picker">Body color<input aria-label="Character RGB color" type="color" value={state.character.color} onChange={(event) => onCustomize({ color: event.target.value })} /></label>
      </section>
      <section className="character-section">
        <label className="character-width-control">Body width <strong>{state.character.pillWidth}</strong><input type="range" min="45" max="70" value={state.character.pillWidth} onChange={(event) => onCustomize({ pillWidth: Number(event.target.value) })} /></label>
      </section>
      <InventoryGroup title="Outfits">
        {outfitDefinitions.map((option) => (
          <button
            className={`inventory-slot outfit-inventory-slot ${selectedItem?.kind === 'outfit' && selectedItem.outfitId === option.id ? 'selected' : ''}`}
            key={option.id}
            type="button"
            onClick={() => onSelectItem({ kind: 'outfit', outfitId: option.id })}
            title={option.name}
          >
            <span className="slot-icon" style={{ color: option.color }}>{option.glyph ?? '·'}</span>
            {state.character.outfitId === option.id && <span className="equipped-mark right">E</span>}
          </button>
        ))}
      </InventoryGroup>
    </section>
  );
}

function PreviewWeaponSlot({ hand, weapon }: { hand: 'L' | 'R'; weapon: EffectiveWeapon | undefined }) {
  return (
    <span className="character-preview-weapon" title={weapon?.name ?? 'Bare Fist'}>
      <small>{hand}</small>
      <strong style={{ color: weapon?.color }}>{weapon?.projectile?.glyph ?? weapon?.handGlyph ?? 'ง'}</strong>
    </span>
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
  onEquipItem,
  onEquipSkill,
  onEquipOutfit,
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
  onEquipItem: (itemNo: number, slot: number) => void;
  onEquipSkill: (skillId: string, slot: number) => void;
  onEquipOutfit: (outfitId: string) => void;
  onDispose: (kind: InventoryItemKind, itemNo: number) => void;
  traitPickerWeaponNo: number | undefined;
  onOpenTraitPicker: (weaponItemNo: number) => void;
  onCloseTraitPicker: () => void;
}) {

  if (selection.kind === 'skill') {
    const skill = getSkill(selection.skillId);
    return (
      <section className="item-inspector skill-item-inspector">
        <div className="inspector-header">
          <span style={{ color: skill.color }}>{skill.icon}</span>
          <div><h3>{skill.name}</h3><p>Active skill</p></div>
        </div>
        <div className="inspector-scroll">
          <p>{skill.description}</p>
          {skill.active && <div className="skill-detail-card">
            <AttributeRow icon="⏱" label="Cooldown" value={`${skill.active.cooldownMs / 1000}s`} />
          </div>}
        </div>
        <div className="skill-slot-actions">
          <span>Assign to shared hotbar</span>
          <div>{[1, 2, 3, 4, 5].map((slot) => {
            const entry = state.hotbarSlots[slot - 1];
            const equipped = entry?.kind === 'skill' && entry.skillId === skill.id;
            return <button className={equipped ? 'equipped' : undefined} key={slot} type="button" onClick={() => onEquipSkill(skill.id, slot)}>{slot}</button>;
          })}</div>
        </div>
      </section>
    );
  }

  if (selection.kind === 'outfit') {
    const outfit = getOutfit(selection.outfitId);
    const equipped = state.character.outfitId === outfit.id;
    return (
      <section className="item-inspector outfit-inspector">
        <div className="inspector-header">
          <span style={{ color: outfit.color }}>{outfit.glyph ?? '·'}</span>
          <div><h3>{outfit.name}</h3><p>Outfit</p></div>
        </div>
        <div className="inspector-scroll">
          <div className="character-preview compact">
            {outfit.glyph && (
              <span
                className="character-preview-outfit"
                style={{ color: outfit.color, transform: `translate(calc(-50% + ${outfit.offsetX ?? 0}px), calc(-50% + ${outfit.offsetY ?? 0}px))` }}
              >
                {outfit.glyph}
              </span>
            )}
            <strong style={{ background: state.character.color, width: state.character.pillWidth }}>{state.character.body}</strong>
          </div>
          <p>{outfit.description}</p>
          <div className="attribute-list">
            {outfit.maxHpBonus && <AttributeRow icon="♥" label="Max HP" value={`+${outfit.maxHpBonus}`} />}
            {outfit.speedBonus && <AttributeRow icon="👟" label="Speed" value={`+${outfit.speedBonus}`} />}
            {outfit.damageBonus && <AttributeRow icon="⚔️" label="Damage" value={`+${outfit.damageBonus}`} />}
            {!outfit.maxHpBonus && !outfit.speedBonus && !outfit.damageBonus && <p>No stat bonus.</p>}
          </div>
        </div>
        <div className="inspector-actions">
          <button className={equipped ? 'equipped' : undefined} type="button" onClick={() => onEquipOutfit(outfit.id)}>{equipped ? 'Equipped' : 'Equip Outfit'}</button>
        </div>
      </section>
    );
  }

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
      <div className="potion-actions">
        <div className="potion-primary-actions">
          <button type="button" onClick={() => onUse(potion.itemNo)}>Use</button>
          <DisposeButton onDispose={() => onDispose('potion', potion.itemNo)} />
        </div>
        <div className="potion-equip-actions">
          {[1, 2, 3, 4, 5].map((slot) => {
            const entry = state.hotbarSlots[slot - 1];
            return <button
              key={slot}
              type="button"
              className={entry?.kind === 'potion' && entry.itemNo === potion.itemNo ? 'equipped' : undefined}
              onClick={() => onEquipItem(potion.itemNo, slot)}
            >
              Equip {slot}
            </button>;
          })}
        </div>
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
        <strong>Augmentation</strong>
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


function getCharacterStatus(leftWeapon: EffectiveWeapon | undefined, rightWeapon: EffectiveWeapon | undefined, state: AdventureState) {
  const weapons = [leftWeapon, rightWeapon].filter((weapon): weapon is EffectiveWeapon => Boolean(weapon));
  const outfit = getOutfit(state.character.outfitId);
  const skills = getPassiveSkillModifiers(state.skills.unlockedIds);
  const activeHaste = state.skills.hasteUntil > performance.now()
    ? state.skills.unlockedIds.reduce((bonus, skillId) => {
      const effect = getSkill(skillId).active?.effect;
      return effect?.kind === 'haste' ? Math.max(bonus, effect.speedBonus) : bonus;
    }, 0)
    : 0;
  return {
    attack: Math.ceil(weapons.reduce((value, weapon) => value + weapon.damage + (outfit.damageBonus ?? 0), 0) * skills.damageMultiplier),
    defense: 0,
    speed: Math.round((PLAYER_MOVE_SPEED + (outfit.speedBonus ?? 0) + skills.moveSpeed + activeHaste) * skills.moveSpeedMultiplier),
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

type CombatTargetDisplay =
  | { kind: 'enemy'; name: string; hp: number; maxHp: number; attack: number; speed: number; attackSpeed: number; range: number; aggro: number }
  | { kind: 'prop'; name: string; hp: number; maxHp: number };

function getCombatTarget(state: AdventureState): CombatTargetDisplay | undefined {
  if (!state.combatTarget) return undefined;
  if (state.combatTarget.kind === 'enemy') {
    const enemy = state.enemies.find((candidate) => candidate.id === state.combatTarget?.id);
    return enemy ? {
      kind: 'enemy',
      name: enemy.name,
      hp: enemy.hp,
      maxHp: enemy.maxHp,
      attack: enemy.attack,
      speed: Math.round(enemy.speed),
      attackSpeed: enemy.attackSpeed,
      range: Math.round(enemy.attackRange),
      aggro: Math.round(enemy.aggroRadius),
    } : undefined;
  }
  const object = state.worldObjects.find((candidate) => candidate.id === state.combatTarget?.id);
  return object?.hp !== undefined && object.maxHp !== undefined ? {
    kind: 'prop',
    name: formatTargetName(object.kind),
    hp: object.hp,
    maxHp: object.maxHp,
  } : undefined;
}

function CombatTargetPanel({ target }: { target: CombatTargetDisplay }) {
  return (
    <div className="adventure-target-panel" aria-label="Combat target">
      <div className="target-heading">
        <Crosshair size={18} />
        <span>{target.name}</span>
        <strong>{Math.ceil(target.hp)} / {target.maxHp}</strong>
      </div>
      <div className="adventure-bar"><span style={{ width: `${Math.max(0, target.hp / target.maxHp) * 100}%` }} /></div>
      {target.kind === 'enemy' && (
        <div className="target-stat-grid">
          <StatusLine icon="⚔️" label="ATK" value={target.attack} />
          <StatusLine icon="🛡️" label="DEF" value={0} />
          <StatusLine icon="👟" label="SPD" value={target.speed} />
          <StatusLine icon="⏱️" label="RATE" value={`${target.attackSpeed}/s`} />
          <StatusLine icon="↔️" label="RNG" value={target.range} />
          <StatusLine icon="◉" label="AGGRO" value={target.aggro} />
        </div>
      )}
    </div>
  );
}

function formatTargetName(kind: string) {
  return kind.split('-').map((part) => part[0].toUpperCase() + part.slice(1)).join(' ');
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


export const adventureWeapons = weaponDefinitions;
