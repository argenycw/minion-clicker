import { Crosshair, HeartPulse, Swords, Workflow } from 'lucide-react';
import { getOutfit } from '../../outfits';
import { getPassiveSkillModifiers, getSkill } from '../../skills';
import { getEquippedWeapon, PLAYER_MOVE_SPEED, type AdventureState, type EffectiveWeapon } from '../../state';
import { getDungeonDefinition } from '../../dungeons/definitions';
import { getStatusEffectDefinition } from '../../status-effects/definitions';
import { getStatusModifiers } from '../../status-effects/system';
import type { StatusEffectInstance } from '../../status-effects/types';

function formatStatBonus(value: number) {
  return Math.round(value * 100) / 100;
}

function formatWorldCoordinate(value: number) {
  return (value / 10).toFixed(1);
}

export function AdventureStatusHud({ state, now }: { state: AdventureState; now: number }) {
  const leftWeapon = getEquippedWeapon(state, 'left');
  const rightWeapon = getEquippedWeapon(state, 'right');
  const status = getCharacterStatus(leftWeapon, rightWeapon, state, now);
  const sceneTitle = state.dungeon ? getDungeonDefinition(state.dungeon.definitionId).name : 'Adventure';
  const shield = state.player.shieldExpiresAt > now ? state.player.shield : 0;
  return (
    <div className="adventure-hud" aria-label="Adventure status">
      <div className="adventure-title">
        <Swords size={19} />
        <div>
          <h1>{sceneTitle}</h1>
          <p>{state.scene === 'dungeon' ? 'Explore | Clear rooms | Find loot' : 'Explore | Combat | Strengthen'}</p>
          <small className="adventure-coordinate-hint">x: {formatWorldCoordinate(state.player.x)}, y: {formatWorldCoordinate(state.player.y)}</small>
        </div>
      </div>
      <div className="adventure-vitals">
        <div className="adventure-coin-balance">🪙 {state.coins}</div>
        <div className="status-hp-row"><HeartPulse size={18} /><span>HP {Math.ceil(state.player.hp)} / {state.player.maxHp}{shield > 0 ? ` + ${Math.ceil(shield)} shield` : ''}</span></div>
        <div className="status-hp-bar">
          <span className="status-hp-fill" style={{ width: `${Math.max(0, state.player.hp / state.player.maxHp) * 100}%` }} />
          {shield > 0 && <span className="status-shield-fill" style={{ width: `${Math.min(1, shield / state.player.maxHp) * 100}%` }} />}
        </div>
        <StatusEffectList effects={state.player.statusEffects} now={now} />
        <div className="status-grid">
          <StatusLine icon="⚔️" label="ATK" value={status.attack} />
          <StatusLine icon="🛡️" label="DEF" value={status.defense} />
          <StatusLine icon="◆" label="STF" value={status.stiffness} />
          <StatusLine icon="👟" label="SPD" value={status.speed} />
          <StatusLine icon="⏱️" label="RATE" value={`${status.rate}/s`} />
          <StatusLine icon="↔️" label="RNG" value={status.range} />
          <StatusLine icon="💥" label="AREA" value={status.radius} />
        </div>
      </div>
    </div>
  );
}

export function AdventureDungeonDepthHud({ state }: { state: AdventureState }) {
  if (!state.dungeon) return null;
  return (
    <div className="adventure-depth-hud" aria-label="Dungeon depth">
      <Workflow size={28} strokeWidth={2.8} />
      <strong>{state.dungeon.depth} / {state.dungeon.totalDepth}</strong>
    </div>
  );
}

export function AdventureCombatTargetPanel({ state, now }: { state: AdventureState; now: number }) {
  const target = getCombatTarget(state);
  return target ? <CombatTargetPanel target={target} now={now} /> : null;
}

export function getCharacterStatus(leftWeapon: EffectiveWeapon | undefined, rightWeapon: EffectiveWeapon | undefined, state: AdventureState, now: number) {
  const weapons = [leftWeapon, rightWeapon].filter((weapon): weapon is EffectiveWeapon => Boolean(weapon));
  const outfit = getOutfit(state.character.outfitId);
  const skills = getPassiveSkillModifiers(state.skills.unlockedIds);
  const activeHaste = state.skills.hasteUntil > now
    ? state.skills.unlockedIds.reduce((bonus, skillId) => {
      const effect = getSkill(skillId).active?.effect;
      return effect?.kind === 'haste' ? Math.max(bonus, effect.speedBonus) : bonus;
    }, 0)
    : 0;
  return {
    attack: Math.ceil(weapons.reduce((value, weapon) => value + weapon.damage + (outfit.damageBonus ?? 0), 0) * skills.damageMultiplier),
    defense: 0,
    stiffness: `${Math.round(state.player.stiffness)}%`,
    speed: Math.round((PLAYER_MOVE_SPEED + (outfit.speedBonus ?? 0) + skills.moveSpeed + activeHaste) * skills.moveSpeedMultiplier),
    rate: formatStatBonus(weapons.reduce((value, weapon) => value + weapon.attackSpeed, 0)),
    range: weapons.length ? Math.round(Math.max(...weapons.map((weapon) => weapon.range)) * skills.rangeMultiplier) : 0,
    radius: weapons.length ? Math.max(...weapons.map((weapon) => weapon.radius)) : 0,
  };
}

export function StatusLine({ icon, label, value }: { icon: string; label: string; value: string | number }) {
  return (
    <span className="status-line">
      <span>{icon}</span>
      <small>{label}</small>
      <strong>{value}</strong>
    </span>
  );
}

type CombatTargetDisplay =
  | { kind: 'enemy'; name: string; hp: number; maxHp: number; attack: number; speed: number; attackSpeed: number; range: number; alert: number; chase: number; statusEffects: StatusEffectInstance[] }
  | { kind: 'prop'; name: string; hp: number; maxHp: number };

export function getCombatTarget(state: AdventureState): CombatTargetDisplay | undefined {
  if (!state.combatTarget) return undefined;
  if (state.combatTarget.kind === 'enemy') {
    const enemy = state.enemies.find((candidate) => candidate.id === state.combatTarget?.id);
    const modifiers = getStatusModifiers(enemy?.statusEffects);
    return enemy ? {
      kind: 'enemy',
      name: enemy.name,
      hp: enemy.hp,
      maxHp: enemy.maxHp,
      attack: enemy.attack,
      speed: Math.round(enemy.speed * modifiers.movementSpeedMultiplier),
      attackSpeed: formatStatBonus(enemy.attackSpeed * modifiers.attackSpeedMultiplier),
      range: Math.round(enemy.attackRange),
      alert: Math.round((enemy.alertRadius ?? enemy.aggroRadius) / 10) / 10,
      chase: Math.round((enemy.chaseRadius ?? enemy.aggroRadius) / 10) / 10,
      statusEffects: enemy.statusEffects,
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

export function CombatTargetPanel({ target, now }: { target: CombatTargetDisplay; now: number }) {
  return (
    <div className="adventure-target-panel" aria-label="Combat target">
      <div className="target-heading">
        <Crosshair size={18} />
        <span>{target.name}</span>
        <strong>{Math.ceil(target.hp)} / {target.maxHp}</strong>
      </div>
      <div className="adventure-bar"><span style={{ width: `${Math.max(0, target.hp / target.maxHp) * 100}%` }} /></div>
      {target.kind === 'enemy' && <StatusEffectList effects={target.statusEffects} now={now} />}
      {target.kind === 'enemy' && (
        <div className="target-stat-grid">
          <StatusLine icon="⚔️" label="ATK" value={target.attack} />
          <StatusLine icon="🛡️" label="DEF" value={0} />
          <StatusLine icon="👟" label="SPD" value={target.speed} />
          <StatusLine icon="⏱️" label="RATE" value={`${target.attackSpeed}/s`} />
          <StatusLine icon="↔️" label="RNG" value={target.range} />
          <StatusLine icon="!" label="ALERT" value={target.alert} />
          <StatusLine icon="◎" label="CHASE" value={target.chase} />
        </div>
      )}
    </div>
  );
}

function StatusEffectList({ effects, now }: { effects: StatusEffectInstance[] | undefined; now: number }) {
  if (!effects?.length) return null;
  return (
    <div className="status-effect-list" aria-label="Active status effects">
      {effects.map((effect) => {
        const definition = getStatusEffectDefinition(effect.definitionId);
        const timer = effect.expiresAt === undefined ? 'Permanent' : `${Math.max(0, Math.ceil((effect.expiresAt - now) / 1000))}s`;
        const elapsedDegrees = effect.expiresAt === undefined
          ? 0
          : 360 * (1 - Math.max(0, Math.min(1, (effect.expiresAt - now) / Math.max(1, effect.expiresAt - effect.appliedAt))));
        const iconBackground = effect.expiresAt === undefined
          ? definition.color
          : `conic-gradient(from -90deg, rgba(20, 24, 32, 0.48) 0deg ${elapsedDegrees}deg, ${definition.color} ${elapsedDegrees}deg 360deg)`;
        return (
          <span className={`status-effect-chip ${definition.kind}`} key={effect.definitionId} title={definition.description}>
            <i style={{ background: iconBackground }}>{definition.icon}</i>
            <span><strong>{definition.name}</strong><small>{timer}</small></span>
          </span>
        );
      })}
    </div>
  );
}

function formatTargetName(kind: string) {
  return kind.split('-').map((part) => part[0].toUpperCase() + part.slice(1)).join(' ');
}
