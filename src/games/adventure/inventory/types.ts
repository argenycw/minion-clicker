import type { ItemRank } from '../loot';
import type { TraitDefinition, WeaponDefinition } from '../content';
import type { StatusEffectApplication } from '../status-effects/types';
import type { SpriteRef } from '../../../shared/sprites';
import type { CraftingMaterialCategory } from '../crafting/types';

export type WeaponInstance = {
  itemNo: number;
  id: string;
  baseWeaponId: string;
  name: string;
  traitIds: Array<string | undefined>;
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
  iconSprite?: SpriteRef;
  rank: ItemRank;
  count: number;
  heal: number;
  cooldownMs: number;
};

export type MaterialStack = {
  itemNo: number;
  itemId: string;
  name: string;
  icon: string;
  iconSprite?: SpriteRef;
  rank: ItemRank;
  count: number;
  category: CraftingMaterialCategory;
};

export type AdventureInventory = {
  weapons: WeaponInstance[];
  traits: TraitStack[];
  potions: PotionStack[];
  materials: MaterialStack[];
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
  penetration: number;
  follow: number;
  ricochet: number;
  meleeExtraHits: number;
  shockwaveRadiusMultiplier: number;
  shockwaveDamageMultiplier: number;
  aftershockCount: number;
  aftershockDamageMultiplier: number;
  aftershockDelayMs: number;
  aftershockSpacingMultiplier: number;
  lifeDrain: number;
  shield: number;
  inflictions: StatusEffectApplication[];
};
