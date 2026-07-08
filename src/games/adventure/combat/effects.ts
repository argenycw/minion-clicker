import { getClosestBorderPoint } from '../../../shared/combatPresentation';
import type { AdventureAudioCue } from '../audio/types';
import { getWeaponAudio } from '../weapons/definitions';
import type { WeaponDefinition } from '../content';
import type { AdventureEnemy } from '../enemies/types';
import type { Actor, AdventureState, Projectile } from '../state';
import type { StatusTickEvent } from '../status-effects/types';
import { getQueuedTextEffectBorn, makeDamageEffect, makeHealEffect } from './damage';
import type { CombatEffect } from './types';

export function makeHitEffect(
  id: number,
  x: number,
  y: number,
  weapon: Pick<WeaponDefinition, 'effectGlyph' | 'color' | 'effectSize' | 'kind' | 'audio'>,
  born: number,
  audioCue: AdventureAudioCue | null | undefined = getWeaponAudio(weapon).onHit,
): CombatEffect {
  return { id, kind: 'hit', x, y, glyph: weapon.effectGlyph, color: weapon.color, born, size: weapon.effectSize, audioCue: audioCue ?? undefined };
}

export function makeProjectileHitEffect(
  id: number,
  x: number,
  y: number,
  projectile: Pick<Projectile, 'effectGlyph' | 'effectSize' | 'color' | 'hitAudioCue'>,
  born: number,
  audioCue = projectile.hitAudioCue,
): CombatEffect {
  return { id, kind: 'hit', x, y, glyph: projectile.effectGlyph, color: projectile.color, born, size: projectile.effectSize, audioCue };
}

export function makeAudioEffect(id: number, x: number, y: number, audioCue: AdventureAudioCue, born: number): CombatEffect {
  return { id, kind: 'audio', x, y, glyph: '', color: 'transparent', born, audioCue };
}

export function makeEnemyAttackEffect(id: number, enemy: AdventureEnemy, player: Actor, born: number): CombatEffect {
  if (enemy.attackKind === 'ranged') {
    const projectile = enemy.projectile;
    return {
      id,
      kind: 'hit',
      x: enemy.x,
      y: enemy.y,
      toX: player.x,
      toY: player.y,
      glyph: projectile?.glyph ?? '✦',
      color: projectile?.color ?? enemy.color,
      born,
      size: Math.max(24, Math.min(42, enemy.projectileRadius * 1.6 || 28)),
    };
  }
  const impact = getClosestBorderPoint(enemy, player, player.radius);
  return {
    id,
    kind: 'hit',
    x: impact.x,
    y: impact.y,
    glyph: '✧',
    color: enemy.color,
    born,
    size: 34,
  };
}

export function makeStatusTickEffect(
  id: number,
  x: number,
  y: number,
  event: StatusTickEvent,
  effects: CombatEffect[],
  now: number,
) {
  return event.kind === 'damage'
    ? makeDamageEffect(id, x, y, event.amount, getQueuedTextEffectBorn(effects, x, y, now, 'damage'))
    : makeHealEffect(id, x, y, event.amount, getQueuedTextEffectBorn(effects, x, y, now, 'heal'));
}

export function makeEnemyDeathEffect(id: number, enemy: AdventureEnemy, born: number): CombatEffect {
  return {
    id,
    kind: 'death',
    x: enemy.x,
    y: enemy.y,
    toX: enemy.x + 90,
    toY: enemy.y + 190,
    glyph: 'X_X',
    color: '#bb3f4d',
    body: enemy.deathBody,
    leftHand: enemy.deathLeftHand,
    rightHand: enemy.deathRightHand,
    background: enemy.color,
    pillWidth: enemy.pillWidth,
    team: 'enemy',
    born,
  };
}

export function makePlayerDeathEffect(id: number, state: AdventureState, born: number): CombatEffect {
  return {
    id,
    kind: 'death',
    x: state.player.x,
    y: state.player.y,
    toX: state.player.x,
    toY: state.player.y + 220,
    glyph: 'x_x',
    color: '#4777bd',
    body: state.character.body,
    leftHand: state.character.leftWeaponInstanceId ? '|' : undefined,
    rightHand: state.character.rightWeaponInstanceId ? '|' : undefined,
    background: state.character.color,
    pillWidth: state.character.pillWidth,
    team: 'player',
    born,
    audioCue: 'player-death',
  };
}

export function getEffectLife(effect: CombatEffect) {
  if (effect.kind === 'audio') return 60;
  if (effect.kind === 'death') return 1250;
  if (effect.kind === 'shockwave') return 520;
  return effect.kind === 'damage' || effect.kind === 'heal' ? 950 : 420;
}
