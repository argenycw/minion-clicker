import type { AdventureState } from '../state';
import { skillTreeDefinition } from './definitions';
import type { PassiveSkillModifiers, SkillNodeDefinition } from './types';

// Selectors

const BASE_PLAYER_MAX_HP = 140;

const skillById = new Map(skillTreeDefinition.map((skill) => [skill.id, skill]));

export function getSkill(skillId: string) {
  const skill = skillById.get(skillId);
  if (!skill) throw new Error(`Unknown skill: ${skillId}`);
  return skill;
}

export function getSkillPrerequisites(skill: SkillNodeDefinition) {
  if (!skill.previousId) return [];
  return Array.isArray(skill.previousId) ? skill.previousId : [skill.previousId];
}

export type SkillNodePosition = { x: number; y: number };

export function createSkillTreeLayout() {
  const children = new Map<string | undefined, SkillNodeDefinition[]>();
  for (const skill of skillTreeDefinition) {
    const primaryPreviousId = getPrimarySkillPrerequisite(skill);
    const siblings = children.get(primaryPreviousId) ?? [];
    siblings.push(skill);
    children.set(primaryPreviousId, siblings);
  }
  const positions = new Map<string, SkillNodePosition>();
  let leafIndex = 0;
  const horizontalGap = 180;
  const verticalGap = 180;
  const padding = 120;
  const place = (skill: SkillNodeDefinition, depth: number): number => {
    const descendants = children.get(skill.id) ?? [];
    const x = descendants.length
      ? descendants.reduce((sum, child) => sum + place(child, depth + 1), 0) / descendants.length
      : padding + leafIndex++ * horizontalGap;
    positions.set(skill.id, { x, y: padding + depth * verticalGap });
    return x;
  };
  for (const root of children.get(undefined) ?? []) place(root, 0);
  alignMergedBranches(children, positions);
  const extents = [...positions.values()].reduce((bounds, position) => ({
    maxX: Math.max(bounds.maxX, position.x),
    maxY: Math.max(bounds.maxY, position.y),
  }), { maxX: 0, maxY: 0 });
  return { positions, width: Math.max(900, padding + extents.maxX), height: Math.max(600, padding + extents.maxY) };
}

export function getPassiveSkillModifiers(unlockedSkillIds: string[]): Required<PassiveSkillModifiers> {
  return unlockedSkillIds.reduce<Required<PassiveSkillModifiers>>((total, skillId) => {
    const passive = getSkill(skillId).passive;
    if (!passive) return total;
    return {
      maxHp: total.maxHp + (passive.maxHp ?? 0),
      maxHpMultiplier: total.maxHpMultiplier * (passive.maxHpMultiplier ?? 1),
      moveSpeed: total.moveSpeed + (passive.moveSpeed ?? 0),
      moveSpeedMultiplier: total.moveSpeedMultiplier * (passive.moveSpeedMultiplier ?? 1),
      attack: total.attack + (passive.attack ?? 0),
      damageMultiplier: total.damageMultiplier * (passive.damageMultiplier ?? 1),
      rangeMultiplier: total.rangeMultiplier * (passive.rangeMultiplier ?? 1),
      damageReduction: 1 - ((1 - total.damageReduction) * (1 - (passive.damageReduction ?? 0))),
      lifeDrain: total.lifeDrain + (passive.lifeDrain ?? 0),
      lowHpLifeDrainMax: Math.max(total.lowHpLifeDrainMax, passive.lowHpLifeDrainMax ?? 0),
      hpRegenPerSecond: total.hpRegenPerSecond + (passive.hpRegenPerSecond ?? 0),
      stiffness: total.stiffness + (passive.stiffness ?? 0),
      maxHpDamageRatio: total.maxHpDamageRatio + (passive.maxHpDamageRatio ?? 0),
      fullHpStatMultiplier: Math.max(total.fullHpStatMultiplier, passive.fullHpStatMultiplier ?? 1),
      lowHpDamageMultiplier: total.lowHpDamageMultiplier * (passive.lowHpDamageMultiplier ?? 1),
      highHpDamageMultiplier: total.highHpDamageMultiplier * (passive.highHpDamageMultiplier ?? 1),
    };
  }, {
    maxHp: 0,
    maxHpMultiplier: 1,
    moveSpeed: 0,
    moveSpeedMultiplier: 1,
    attack: 0,
    damageMultiplier: 1,
    rangeMultiplier: 1,
    damageReduction: 0,
    lifeDrain: 0,
    lowHpLifeDrainMax: 0,
    hpRegenPerSecond: 0,
    stiffness: 0,
    maxHpDamageRatio: 0,
    fullHpStatMultiplier: 1,
    lowHpDamageMultiplier: 1,
    highHpDamageMultiplier: 1,
  });
}

export function getActiveHasteBonus(state: AdventureState) {
  return state.skills.unlockedIds.reduce((bonus, skillId) => {
    const effect = getSkill(skillId).active?.effect;
    return effect?.kind === 'haste' ? Math.max(bonus, effect.speedBonus) : bonus;
  }, 0);
}

export function getAssignedSkillSlot(state: AdventureState, skillId: string) {
  const slotIndex = state.hotbarSlots.findIndex((entry) => entry?.kind === 'skill' && entry.skillId === skillId);
  return slotIndex >= 0 ? slotIndex + 1 : undefined;
}

export function canUnlockSkill(state: AdventureState, skillId: string) {
  if (state.skills.unlockedIds.includes(skillId)) return false;
  const skill = getSkill(skillId);
  return state.skills.points >= skill.cost && areSkillPrerequisitesMet(state, skillId);
}

export function areSkillPrerequisitesMet(state: AdventureState, skillId: string) {
  const prerequisites = getSkillPrerequisites(getSkill(skillId));
  return prerequisites.length === 0 || prerequisites.some((requiredId) => state.skills.unlockedIds.includes(requiredId));
}

// Operations

export function equipSkillToSlot(state: AdventureState, skillId: string, slot: number): AdventureState {
  const skill = getSkill(skillId);
  if (slot < 1 || slot > 5 || skill.kind !== 'active' || !state.skills.unlockedIds.includes(skillId)) return state;
  return {
    ...state,
    hotbarSlots: state.hotbarSlots.map((entry, index) =>
      index === slot - 1 ? { kind: 'skill', skillId } : entry?.kind === 'skill' && entry.skillId === skillId ? undefined : entry,
    ),
  };
}

export function unlockSkill(state: AdventureState, skillId: string): AdventureState {
  if (!canUnlockSkill(state, skillId)) return state;
  const skill = getSkill(skillId);
  const previousModifiers = getPassiveSkillModifiers(state.skills.unlockedIds);
  const unlockedIds = [...state.skills.unlockedIds, skillId];
  const nextModifiers = getPassiveSkillModifiers(unlockedIds);
  const previousMaxHp = Math.ceil((BASE_PLAYER_MAX_HP + previousModifiers.maxHp) * previousModifiers.maxHpMultiplier);
  const nextMaxHp = Math.ceil((BASE_PLAYER_MAX_HP + nextModifiers.maxHp) * nextModifiers.maxHpMultiplier);
  const gainedMaxHp = nextMaxHp - previousMaxHp;
  const gainedStiffness = nextModifiers.stiffness - previousModifiers.stiffness;
  return {
    ...state,
    player: gainedMaxHp > 0 || gainedStiffness !== 0
      ? {
        ...state.player,
        maxHp: state.player.maxHp + gainedMaxHp,
        hp: state.player.hp + Math.max(0, gainedMaxHp),
        stiffness: state.player.stiffness + gainedStiffness,
      }
      : state.player,
    skills: { ...state.skills, points: state.skills.points - skill.cost, unlockedIds },
  };
}

function getPrimarySkillPrerequisite(skill: SkillNodeDefinition) {
  return getSkillPrerequisites(skill)[0];
}

function alignMergedBranches(
  children: Map<string | undefined, SkillNodeDefinition[]>,
  positions: Map<string, SkillNodePosition>,
) {
  for (const skill of skillTreeDefinition) {
    const prerequisites = getSkillPrerequisites(skill);
    if (prerequisites.length < 2) continue;
    const current = positions.get(skill.id);
    const prerequisitePositions = prerequisites
      .map((skillId) => positions.get(skillId))
      .filter((position): position is SkillNodePosition => position !== undefined);
    if (!current || prerequisitePositions.length < 2) continue;
    const mergedX = prerequisitePositions.reduce((sum, position) => sum + position.x, 0) / prerequisitePositions.length;
    shiftSkillBranch(skill.id, mergedX - current.x, children, positions);
  }
}

function shiftSkillBranch(
  skillId: string,
  deltaX: number,
  children: Map<string | undefined, SkillNodeDefinition[]>,
  positions: Map<string, SkillNodePosition>,
) {
  if (Math.abs(deltaX) < 0.01) return;
  const position = positions.get(skillId);
  if (position) positions.set(skillId, { ...position, x: position.x + deltaX });
  for (const child of children.get(skillId) ?? []) shiftSkillBranch(child.id, deltaX, children, positions);
}
