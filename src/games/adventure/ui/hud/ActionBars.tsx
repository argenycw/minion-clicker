import { FlaskConical } from 'lucide-react';
import { getSkill } from '../../skills';
import type { AdventureState, EffectiveWeapon, HandSlot } from '../../state';

const cooldownMaskColor = 'rgba(18, 22, 28, 0.68)';

function getCooldownMask(cooldown: number) {
  const elapsed = Math.max(0, Math.min(1, 1 - cooldown));
  return `conic-gradient(from 0deg, rgba(18, 22, 28, 0) 0 ${elapsed * 100}%, ${cooldownMaskColor} 0 100%)`;
}

export function HotbarSlotButton({ slot, state, now, onActivate }: { slot: number; state: AdventureState; now: number; onActivate: () => void }) {
  const entry = state.hotbarSlots[slot - 1];
  const flashed = state.itemFlash.some((flash) => flash.slot === slot);
  if (!entry) {
    return <button className={flashed ? 'item-slot item-used' : 'item-slot'} type="button" onClick={onActivate} title={`Empty hotbar slot ${slot}`}>
      <small>{slot}</small><FlaskConical size={18} />
    </button>;
  }
  if (entry.kind === 'potion') {
    const item = state.inventory.potions.find((potion) => potion.itemNo === entry.itemNo);
    const readyAt = item ? state.potionReadyAt[item.itemId] ?? 0 : 0;
    const cooldownMs = item?.cooldownMs ?? 1;
    const remaining = Math.max(0, readyAt - now);
    const cooldown = Math.min(1, remaining / cooldownMs);
    return <button className={`item-slot ${remaining <= 0 ? 'ready' : ''} ${flashed ? 'item-used' : ''}`} type="button" onClick={onActivate} title={item ? `${item.name} x${item.count}` : 'Unavailable item'}>
      <small>{slot}</small><span>{item?.icon ?? '×'}</span>{item && <em>x{item.count}</em>}
      <span className="weapon-cooldown" style={{ background: getCooldownMask(cooldown), opacity: remaining > 0 ? 1 : 0 }} />
      {remaining > 0 && <strong className="slot-cooldown-time">{Math.ceil(remaining / 1000)}s</strong>}
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
    <span className="weapon-cooldown" style={{ background: getCooldownMask(cooldown), opacity: remaining > 0 ? 1 : 0 }} />
    {remaining > 0 && <strong className="slot-cooldown-time">{Math.ceil(remaining / 1000)}s</strong>}
  </button>;
}

export function WeaponSlot({
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
          background: getCooldownMask(cooldown),
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

export function AdventureActionBars({ state, now, leftWeapon, rightWeapon, onHoverWeapon, onActivateWeapon, onActivateHotbar }: {
  state: AdventureState;
  now: number;
  leftWeapon?: EffectiveWeapon;
  rightWeapon?: EffectiveWeapon;
  onHoverWeapon: (hand: HandSlot | undefined) => void;
  onActivateWeapon: (hand: HandSlot) => void;
  onActivateHotbar: (slot: number) => void;
}) {
  return <>
    <div className="adventure-weapons" aria-label="Weapon slots">
      <WeaponSlot hand="left" label="L" weapon={leftWeapon} readyAt={state.cooldownReadyAt.left} now={now} active={state.weaponFlash.some((flash) => flash.hand === 'left')} onHover={onHoverWeapon} onActivate={() => onActivateWeapon('left')} />
      <WeaponSlot hand="right" label="R" weapon={rightWeapon} readyAt={state.cooldownReadyAt.right} now={now} active={state.weaponFlash.some((flash) => flash.hand === 'right')} onHover={onHoverWeapon} onActivate={() => onActivateWeapon('right')} />
    </div>
    <div className="adventure-items" aria-label="Hotbar slots">
      {[1, 2, 3, 4, 5].map((slot) => <HotbarSlotButton key={slot} slot={slot} state={state} now={now} onActivate={() => onActivateHotbar(slot)} />)}
    </div>
  </>;
}
