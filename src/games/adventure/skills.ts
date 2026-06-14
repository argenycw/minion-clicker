export type PassiveSkillModifiers = {
  maxHp?: number;
  moveSpeed?: number;
  moveSpeedMultiplier?: number;
  damageMultiplier?: number;
};

export type ActiveSkillEffect =
  | { kind: 'heal'; amount: number }
  | { kind: 'blink'; distance: number }
  | { kind: 'haste'; speedBonus: number; durationMs: number };

export type SkillNodeDefinition = {
  id: string;
  previousId?: string;
  name: string;
  kind: 'passive' | 'active' | 'keystone';
  icon: string;
  color: string;
  description: string;
  cost: number;
  passive?: PassiveSkillModifiers;
  active?: {
    cooldownMs: number;
    effect: ActiveSkillEffect;
  };
};

export const skillTreeDefinition: SkillNodeDefinition[] = [
  { id: 'passive-00', name: '', kind: 'passive', icon: '✦', color: '#d9982f', description: '', cost: 0 },
  { id: 'passive-01', previousId: 'passive-00', name: 'Adventurer Spirit', kind: 'passive', icon: '✦', color: '#d9982f', description: 'A sturdy first step. Max HP +15 and movement speed +10.', cost: 1, passive: { maxHp: 15, moveSpeed: 10 } },

  { id: 'passive-02', previousId: 'passive-00', name: 'Vitality', kind: 'passive', icon: '♥', color: '#d94f5f', description: 'Build a larger health reserve. Max HP +30.', cost: 1, passive: { maxHp: 30 } },
  { id: 'passive-03', previousId: 'passive-02', name: 'Steady Heart', kind: 'passive', icon: '♡', color: '#c85160', description: 'Max HP +20.', cost: 1, passive: { maxHp: 20 } },
  { id: 'active-01', previousId: 'passive-03', name: 'First Aid', kind: 'active', icon: '✚', color: '#49a86b', description: 'Restore 55 HP immediately. Long cooldown.', cost: 2, active: { cooldownMs: 22000, effect: { kind: 'heal', amount: 55 } } },
  { id: 'passive-04', previousId: 'passive-02', name: 'Deep Reserves', kind: 'passive', icon: '⬟', color: '#b84c61', description: 'Max HP +45.', cost: 2, passive: { maxHp: 45 } },
  { id: 'passive-05', previousId: 'passive-04', name: 'Iron Spirit', kind: 'passive', icon: '♦', color: '#963d53', description: 'Max HP +35 and weapon damage +4%.', cost: 2, passive: { maxHp: 35, damageMultiplier: 1.04 } },

  { id: 'passive-06', previousId: 'passive-00', name: 'Fleet Foot', kind: 'passive', icon: '➜', color: '#4388c8', description: 'Move with a lighter step. Movement speed +25.', cost: 1, passive: { moveSpeed: 25 } },
  { id: 'passive-07', previousId: 'passive-06', name: 'Trail Runner', kind: 'passive', icon: '⌁', color: '#397eb8', description: 'Movement speed +18.', cost: 1, passive: { moveSpeed: 18 } },
  { id: 'active-02', previousId: 'passive-07', name: 'Blink', kind: 'active', icon: '⋙', color: '#7267d8', description: 'Instantly blink up to 210 units toward the cursor.', cost: 2, active: { cooldownMs: 18000, effect: { kind: 'blink', distance: 210 } } },
  { id: 'passive-08', previousId: 'passive-06', name: 'Light Step', kind: 'passive', icon: '◌', color: '#4a91c4', description: 'Movement speed +15 and weapon damage +3%.', cost: 1, passive: { moveSpeed: 15, damageMultiplier: 1.03 } },
  { id: 'passive-09', previousId: 'passive-08', name: 'Wind Reader', kind: 'passive', icon: '≀', color: '#329ca7', description: 'Movement speed +24.', cost: 2, passive: { moveSpeed: 24 } },

  { id: 'passive-10', previousId: 'passive-00', name: 'Battle Rhythm', kind: 'passive', icon: '⚔', color: '#c7683b', description: 'Turn momentum into force. Weapon damage +12%.', cost: 1, passive: { damageMultiplier: 1.12 } },
  { id: 'passive-11', previousId: 'passive-10', name: 'Keen Edge', kind: 'passive', icon: '╱', color: '#bb5b37', description: 'Weapon damage +8%.', cost: 1, passive: { damageMultiplier: 1.08 } },
  { id: 'active-03', previousId: 'passive-11', name: 'Second Wind', kind: 'active', icon: '≋', color: '#37a7a2', description: 'Gain +110 movement speed for 4 seconds.', cost: 2, active: { cooldownMs: 26000, effect: { kind: 'haste', speedBonus: 110, durationMs: 4000 } } },
  { id: 'passive-12', previousId: 'passive-10', name: 'Heavy Hand', kind: 'passive', icon: '◆', color: '#a94f32', description: 'Weapon damage +10%, but this branch costs more to master.', cost: 2, passive: { damageMultiplier: 1.1 } },
  { id: 'passive-13', previousId: 'passive-12', name: 'Finishing Form', kind: 'passive', icon: '✧', color: '#913f2c', description: 'Weapon damage +14%.', cost: 2, passive: { damageMultiplier: 1.14 } },

  { id: 'passive-14', previousId: 'passive-07', name: 'Wayfarer', kind: 'passive', icon: '⌖', color: '#568d72', description: 'Max HP +15 and movement speed +12.', cost: 1, passive: { maxHp: 15, moveSpeed: 12 } },
  { id: 'passive-15', previousId: 'passive-14', name: 'Survival Instinct', kind: 'passive', icon: '❖', color: '#4b8267', description: 'Max HP +25 and weapon damage +5%.', cost: 2, passive: { maxHp: 25, damageMultiplier: 1.05 } },
  { id: 'keystone-01', previousId: 'passive-09', name: 'Unburdened Momentum', kind: 'keystone', icon: '⬡', color: '#8b5ac7', description: 'Movement speed is doubled, but weapon damage is halved.', cost: 3, passive: { moveSpeedMultiplier: 2, damageMultiplier: 0.5 } },
];

const skillById = new Map(skillTreeDefinition.map((skill) => [skill.id, skill]));

export function getSkill(skillId: string) {
  const skill = skillById.get(skillId);
  if (!skill) throw new Error(`Unknown skill: ${skillId}`);
  return skill;
}

export function getSkillPrerequisites(skill: SkillNodeDefinition) {
  return skill.previousId ? [skill.previousId] : [];
}

export type SkillNodePosition = { x: number; y: number };

export function createSkillTreeLayout() {
  const children = new Map<string | undefined, SkillNodeDefinition[]>();
  for (const skill of skillTreeDefinition) {
    const siblings = children.get(skill.previousId) ?? [];
    siblings.push(skill);
    children.set(skill.previousId, siblings);
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
  const width = Math.max(900, padding * 2 + Math.max(0, leafIndex - 1) * horizontalGap);
  const depth = Math.max(...skillTreeDefinition.map((skill) => {
    let current = skill;
    let value = 0;
    while (current.previousId) {
      value += 1;
      current = getSkill(current.previousId);
    }
    return value;
  }));
  return { positions, width, height: padding * 2 + depth * verticalGap };
}

export function getPassiveSkillModifiers(unlockedSkillIds: string[]): Required<PassiveSkillModifiers> {
  return unlockedSkillIds.reduce<Required<PassiveSkillModifiers>>((total, skillId) => {
    const passive = getSkill(skillId).passive;
    if (!passive) return total;
    return {
      maxHp: total.maxHp + (passive.maxHp ?? 0),
      moveSpeed: total.moveSpeed + (passive.moveSpeed ?? 0),
      moveSpeedMultiplier: total.moveSpeedMultiplier * (passive.moveSpeedMultiplier ?? 1),
      damageMultiplier: total.damageMultiplier * (passive.damageMultiplier ?? 1),
    };
  }, { maxHp: 0, moveSpeed: 0, moveSpeedMultiplier: 1, damageMultiplier: 1 });
}
