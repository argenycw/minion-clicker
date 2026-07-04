import { getTrait } from '../../content';
import type { EffectiveWeapon } from '../../state';
import { getStatusEffectDefinition } from '../../status-effects/definitions';

export function getTraitEffectSummary(trait: ReturnType<typeof getTrait>, weapon?: EffectiveWeapon) {
  const parts: string[] = [];
  if (trait.weaponAffinity) parts.push(trait.weaponAffinity === 'melee' ? 'Melee only' : 'Ranged only');
  if (trait.damageConstant) parts.push(`Damage +${trait.damageConstant}`);
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
  if (trait.penetration) parts.push(`Penetration +${trait.penetration}`);
  if (trait.follow) parts.push(`Follow ${trait.follow}`);
  if (trait.ricochet) parts.push(`Ricochet +${trait.ricochet}`);
  if (trait.meleeExtraHits) parts.push(`Multi-hit +${trait.meleeExtraHits}`);
  if (trait.shockwaveRadiusMultiplier && trait.shockwaveDamageMultiplier) {
    parts.push(`Shockwave ${Math.round(trait.shockwaveDamageMultiplier * 100)}% / ${Math.round(trait.shockwaveRadiusMultiplier * 100)}% radius`);
  }
  if (trait.aftershock) parts.push(`Aftershock x${trait.aftershock.count} at ${Math.round(trait.aftershock.damageMultiplier * 100)}%`);
  if (trait.lifeDrain) parts.push(`Life drain ${formatPercent(trait.lifeDrain)}`);
  if (trait.shield) parts.push(`Shield ${formatPercent(trait.shield)} for 10s`);
  if (trait.inflict) {
    const status = getStatusEffectDefinition(trait.inflict.id);
    const chance = Math.round((trait.inflict.chance ?? 1) * 100);
    const duration = trait.inflict.time === undefined ? 'permanently' : `for ${trait.inflict.time}s`;
    parts.push(`${chance}% chance to inflict ${status.name} ${duration}`);
  }
  return parts.join(' · ') || trait.description;
}

export function formatStatBonus(value: number) {
  return Math.round(value * 100) / 100;
}

function formatPercent(value: number) {
  return `${Math.round(value * 1000) / 10}%`;
}
