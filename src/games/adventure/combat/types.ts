import type { AdventureAudioCue } from '../audio/types';
import type { AdventureClanId } from '../enemies/types';
import type { StatusEffectApplication } from '../status-effects/types';
import type { CombatBehaviorId } from './behaviorRegistry';

export type CombatAffinity = 'melee' | 'ranged' | 'skill';

export type CombatTargetRef =
  | { kind: 'enemy'; id: string }
  | { kind: 'prop'; id: string }
  | { kind: 'player'; id: string }
  | { kind: 'wall'; id: string };

export type CombatTargetKind = CombatTargetRef['kind'];

export type CombatEffect = {
  id: number;
  kind: 'hit' | 'damage' | 'heal' | 'death' | 'audio' | 'shockwave';
  x: number;
  y: number;
  glyph: string;
  color: string;
  born: number;
  size?: number;
  toX?: number;
  toY?: number;
  body?: string;
  leftHand?: string;
  rightHand?: string;
  background?: string;
  pillWidth?: number;
  team?: 'player' | 'enemy';
  audioCue?: AdventureAudioCue;
};

export type CombatSourceRef = {
  id: string;
  clanId: AdventureClanId;
  x: number;
  y: number;
};

export type CombatBehaviorParamValue = number | string | boolean | undefined;

export type CombatBehaviorInstance = {
  behaviorId: CombatBehaviorId;
  ownerId: string;
  params: Record<string, CombatBehaviorParamValue>;
};

export type CombatAttackBase = {
  id: number;
  source: CombatSourceRef;
  affinity: CombatAffinity;
  damage: number;
  knockback: number;
  hitTargetIds: string[];
  inflictions: StatusEffectApplication[];
  behaviors: CombatBehaviorInstance[];
  generation: number;
};

export type ProjectileCombatAttack = CombatAttackBase & {
  kind: 'projectile';
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  remainingDistance: number;
  maxTravelDistance: number;
  penetrationRemaining: number;
  ricochetRemaining: number;
  followStrength: number;
};

export type MeleeAreaCombatAttack = CombatAttackBase & {
  kind: 'melee-area';
  x: number;
  y: number;
  radius: number;
  releasesAt: number;
};

export type GrowingCircleCombatAttack = CombatAttackBase & {
  kind: 'growing-circle';
  x: number;
  y: number;
  born: number;
  endsAt: number;
  maxRadius: number;
};

export type CombatAttack =
  | ProjectileCombatAttack
  | MeleeAreaCombatAttack
  | GrowingCircleCombatAttack;

export type PendingMeleeAttack = {
  kind: 'melee-area';
  id: number;
  sourceId: string;
  sourceClanId: AdventureClanId;
  x: number;
  y: number;
  radius: number;
  damage: number;
  knockback: number;
  inflictions: StatusEffectApplication[];
  behaviors: CombatBehaviorInstance[];
  releasesAt: number;
  effectGlyph: string;
  effectSize?: number;
  color: string;
  audio?: { onHit?: AdventureAudioCue };
};

export type PendingCircleAttack = {
  kind: 'growing-circle';
  id: number;
  sourceId: string;
  sourceClanId: AdventureClanId;
  x: number;
  y: number;
  born: number;
  endsAt: number;
  maxRadius: number;
  damage: number;
  knockback: number;
  hitTargetIds: string[];
  color: string;
};

export type PendingCombatAttack =
  | PendingMeleeAttack
  | PendingCircleAttack;

export type CombatEventName =
  | 'onAttackRelease'
  | 'onAttackCollision'
  | 'onAttackHit'
  | 'onAttackStep'
  | 'onDamageBeforeApply'
  | 'onDamageAfterApply'
  | 'onAttackComplete';

export type CombatDamage = {
  amount: number;
  kind: 'damage' | 'heal';
  source: CombatSourceRef;
  target: CombatTargetRef;
  knockback: number;
  inflictions?: StatusEffectApplication[];
};

export type CombatDamageOperation =
  | { kind: 'multiply'; value: number }
  | { kind: 'add'; value: number }
  | { kind: 'min'; value: number }
  | { kind: 'max'; value: number };

export type CombatPatch =
  | { kind: 'modifyAttack'; attackId: number; attack: Partial<CombatAttack> }
  | { kind: 'modifyDamage'; target: CombatTargetRef; operation: CombatDamageOperation }
  | { kind: 'replaceDamage'; target: CombatTargetRef; amount: number }
  | { kind: 'damageTarget'; damage: CombatDamage }
  | { kind: 'healTarget'; damage: CombatDamage }
  | { kind: 'knockbackTarget'; target: CombatTargetRef; source: { x: number; y: number }; amount: number }
  | { kind: 'spawnAttack'; attack: CombatAttack }
  | { kind: 'spawnPendingAttack'; attack: PendingCombatAttack }
  | { kind: 'spawnVisualEffect'; effect: CombatVisualEffectPatch }
  | { kind: 'addCombatText'; target: CombatTargetRef; amount: number; textKind: 'damage' | 'heal' }
  | { kind: 'completeAttack'; attackId: number }
  | { kind: 'cancelDamage'; target: CombatTargetRef }
  | { kind: 'applyStatus'; target: CombatTargetRef; infliction: StatusEffectApplication };

export type CombatVisualEffectPatch = {
  effectKind?: 'hit' | 'shockwave' | 'audio';
  x: number;
  y: number;
  glyph: string;
  color: string;
  size?: number;
  audioCue?: AdventureAudioCue;
};

export type CombatEventContext = {
  eventName: CombatEventName;
  now: number;
  deltaSeconds?: number;
  attack?: CombatAttack;
  target?: CombatTargetRef;
  damage?: CombatDamage;
  seekTargets?: Array<{ id: string; x: number; y: number }>;
};

export type CombatSubscriber = {
  id: string;
  ownerId: string;
  priority?: number;
  hooks: Partial<Record<CombatEventName, (context: CombatEventContext) => CombatPatch[]>>;
};
