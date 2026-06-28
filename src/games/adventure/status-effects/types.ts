export type StatusEffectId = `buff-${string}` | `debuff-${string}`;

export type StatusEffectBehavior =
  | { kind: 'damage-percent-max-hp'; amount: number; intervalTicks: number }
  | { kind: 'damage-constant'; amount: number; intervalTicks: number }
  | { kind: 'heal-percent-max-hp'; amount: number; intervalTicks: number }
  | { kind: 'heal-constant'; amount: number; intervalTicks: number }
  | { kind: 'movement-speed-multiplier'; multiplier: number }
  | { kind: 'attack-speed-multiplier'; multiplier: number };

export type StatusEffectDefinition = {
  id: StatusEffectId;
  kind: 'buff' | 'debuff';
  name: string;
  description: string;
  icon: string;
  color: string;
  behaviors: StatusEffectBehavior[];
};

export type StatusEffectInstance = {
  definitionId: StatusEffectId;
  appliedAt: number;
  nextTickAt: number;
  ticksElapsed: number;
  expiresAt?: number;
};

export type StatusEffectApplication = {
  statusId: StatusEffectId;
  chance: number;
  durationMs?: number;
};

export type StatusEffectTarget = {
  hp: number;
  maxHp: number;
  statusEffects: StatusEffectInstance[];
};

export type StatusTickEvent = {
  definitionId: StatusEffectId;
  kind: 'damage' | 'heal';
  amount: number;
};
