export type PassiveSkillModifiers = {
  maxHp?: number;
  maxHpMultiplier?: number;
  moveSpeed?: number;
  moveSpeedMultiplier?: number;
  attack?: number;
  damageMultiplier?: number;
  rangeMultiplier?: number;
  damageReduction?: number;
  lifeDrain?: number;
  lowHpLifeDrainMax?: number;
  hpRegenPerSecond?: number;
  stiffness?: number;
  maxHpDamageRatio?: number;
  fullHpStatMultiplier?: number;
  lowHpDamageMultiplier?: number;
  highHpDamageMultiplier?: number;
};

export type ActiveSkillEffect =
  | { kind: 'heal'; amount: number }
  | { kind: 'blink'; distance: number }
  | { kind: 'haste'; speedBonus: number; durationMs: number };

export type SkillNodeDefinition = {
  id: string;
  previousId?: string | string[];
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

export type AdventureSkills = {
  points: number;
  unlockedIds: string[];
  cooldownReadyAt: Record<string, number>;
  hasteUntil: number;
};
