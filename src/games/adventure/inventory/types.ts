import type { ItemRank } from '../loot';
import type { TraitDefinition, WeaponDefinition } from '../content';
import type { StatusEffectApplication } from '../status-effects/types';

export type WeaponInstance = {
  itemNo: number;
  id: string;
  baseWeaponId: string;
  name: string;
  traitIds: string[];
};

export type TraitStack = {
  itemNo: number;
  traitId: string;
  count: number;
};

export type PotionStack = {
  itemNo: number;
  itemId: string;
  name: string;
  icon: string;
  rank: ItemRank;
  count: number;
  heal: number;
  cooldownMs: number;
};

export type AdventureInventory = {
  weapons: WeaponInstance[];
  traits: TraitStack[];
  potions: PotionStack[];
};

export type EffectiveWeapon = WeaponDefinition & {
  instanceId: string;
  instanceName: string;
  traits: TraitDefinition[];
  projectileCount: number;
  baseDamage: number;
  knockback: number;
  baseAttackSpeed: number;
  baseRange: number;
  baseRadius: number;
  lifeDrain: number;
  shield: number;
  inflictions: StatusEffectApplication[];
};
