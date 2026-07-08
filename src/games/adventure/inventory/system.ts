import type { AdventureState, HandSlot } from '../state';
import { getTrait, getWeapon } from '../content';
import type { TraitDefinition } from '../content';
import type { EffectiveWeapon } from './types';
import type { StatusEffectId } from '../status-effects/types';

// Selectors

export function getWeaponByItemNo(state: AdventureState, itemNo: number) {
  return state.inventory.weapons.find((item) => item.itemNo === itemNo);
}

export function getEquippedWeapon(state: AdventureState, hand: HandSlot): EffectiveWeapon | undefined {
  const weaponInstanceId = hand === 'left' ? state.character.leftWeaponInstanceId : state.character.rightWeaponInstanceId;
  const fallback = state.inventory.weapons.find((weapon) => weapon.baseWeaponId === 'melee-00');
  return getEffectiveWeapon(state, weaponInstanceId ?? fallback?.id ?? '');
}

export function getEffectiveWeapon(state: Pick<AdventureState, 'inventory'>, weaponInstanceId: string): EffectiveWeapon {
  const instance = state.inventory.weapons.find((weapon) => weapon.id === weaponInstanceId);
  if (!instance) throw new Error(`Unknown weapon instance: ${weaponInstanceId}`);
  const base = getWeapon(instance.baseWeaponId);
  const traits = instance.traitIds.filter((traitId): traitId is string => traitId !== undefined).map(getTrait);
  const damageMultiplier = traits.reduce((value, trait) => value * (trait.damageMultiplier ?? 1), 1);
  const damageConstant = traits.reduce((value, trait) => value + (trait.damageConstant ?? 0), 0);
  const attackSpeedMultiplier = traits.reduce((value, trait) => value * (trait.attackSpeedMultiplier ?? 1), 1);
  const rangeMultiplier = traits.reduce((value, trait) => value * (trait.rangeMultiplier ?? 1), 1);
  const radiusMultiplier = traits.reduce((value, trait) => value * (trait.radiusMultiplier ?? 1), 1);
  const behaviors = traits.flatMap((trait) => trait.behaviors);
  const extraProjectiles = sumBehaviorNumber(behaviors, 'behavior-001', 'extraProjectiles');
  const penetration = sumBehaviorNumber(behaviors, 'behavior-002', 'count');
  const follow = sumBehaviorNumber(behaviors, 'behavior-003', 'strength');
  const ricochet = sumBehaviorNumber(behaviors, 'behavior-004', 'count');
  const meleeExtraHits = sumBehaviorNumber(behaviors, 'behavior-005', 'extraHits');
  const shockwaveRadiusMultiplier = maxBehaviorNumber(behaviors, 'behavior-006', 'radiusMultiplier');
  const shockwaveDamageMultiplier = maxBehaviorNumber(behaviors, 'behavior-006', 'damageMultiplier');
  const aftershockCount = maxBehaviorNumber(behaviors, 'behavior-007', 'count');
  const aftershockDamageMultiplier = maxBehaviorNumber(behaviors, 'behavior-007', 'damageMultiplier');
  const aftershockDelayMs = maxBehaviorNumber(behaviors, 'behavior-007', 'delay');
  const aftershockSpacingMultiplier = Math.max(1, maxBehaviorNumber(behaviors, 'behavior-007', 'spacingMultiplier'));
  const lifeDrain = sumBehaviorNumber(behaviors, 'behavior-008', 'ratio');
  const shield = sumBehaviorNumber(behaviors, 'behavior-009', 'ratio');
  const inflictions = behaviors
    .filter((behavior) => behavior.id === 'behavior-010')
    .flatMap((behavior) => {
      const statusId = behavior.params?.statusId;
      if (typeof statusId !== 'string') return [];
      return [{
        statusId: statusId as StatusEffectId,
        chance: getBehaviorNumber(behavior, 'chance') ?? 1,
        durationMs: getBehaviorNumber(behavior, 'time') === undefined ? undefined : getBehaviorNumber(behavior, 'time')! * 1000,
      }];
    });
  return {
    ...base,
    instanceId: instance.id,
    instanceName: instance.name,
    traits,
    baseDamage: base.damage,
    knockback: base.knockback ?? (base.kind === 'melee' ? 44 : 30),
    baseAttackSpeed: base.attackSpeed,
    baseRange: base.range,
    baseRadius: base.radius,
    damage: Math.ceil(base.damage * damageMultiplier + damageConstant),
    attackSpeed: Math.round(base.attackSpeed * attackSpeedMultiplier * 100) / 100,
    range: Math.ceil(base.range * rangeMultiplier),
    radius: Math.ceil(base.radius * radiusMultiplier),
    projectileCount: base.kind === 'projectile' ? 1 + extraProjectiles : 1,
    penetration: base.kind === 'projectile' ? penetration : 0,
    follow: base.kind === 'projectile' ? follow : 0,
    ricochet: base.kind === 'projectile' ? ricochet : 0,
    meleeExtraHits: base.kind === 'melee' ? meleeExtraHits : 0,
    shockwaveRadiusMultiplier: base.kind === 'melee' ? shockwaveRadiusMultiplier : 0,
    shockwaveDamageMultiplier: base.kind === 'melee' ? shockwaveDamageMultiplier : 0,
    aftershockCount: base.kind === 'melee' ? aftershockCount : 0,
    aftershockDamageMultiplier: base.kind === 'melee' ? aftershockDamageMultiplier : 0,
    aftershockDelayMs: base.kind === 'melee' ? aftershockDelayMs : 0,
    aftershockSpacingMultiplier: base.kind === 'melee' ? aftershockSpacingMultiplier : 1,
    lifeDrain,
    shield,
    inflictions,
  };
}

// Operations

export function equipWeapon(state: AdventureState, hand: HandSlot, weaponInstanceId: string): AdventureState {
  if (!state.inventory.weapons.some((weapon) => weapon.id === weaponInstanceId)) return state;
  return {
    ...state,
    character: {
      ...state.character,
      [hand === 'left' ? 'leftWeaponInstanceId' : 'rightWeaponInstanceId']: weaponInstanceId,
    },
  };
}

export function unequipWeapon(state: AdventureState, hand: HandSlot): AdventureState {
  return {
    ...state,
    character: {
      ...state.character,
      [hand === 'left' ? 'leftWeaponInstanceId' : 'rightWeaponInstanceId']: undefined,
    },
  };
}

export function equipWeaponByItemNo(state: AdventureState, hand: HandSlot, itemNo: number): AdventureState {
  const weapon = getWeaponByItemNo(state, itemNo);
  return weapon ? equipWeapon(state, hand, weapon.id) : state;
}

export function applyTraitToWeapon(state: AdventureState, traitId: string, weaponInstanceId: string, slotIndex?: number): AdventureState {
  const trait = state.inventory.traits.find((item) => item.traitId === traitId && item.count > 0);
  if (!trait) return state;
  const target = state.inventory.weapons.find((weapon) => weapon.id === weaponInstanceId);
  if (!target) return state;
  if (!canApplyTraitToWeapon(getTrait(traitId), getWeapon(target.baseWeaponId).kind)) return state;
  const targetSlot = slotIndex ?? getFirstOpenTraitSlot(target.traitIds);
  if (targetSlot < 0 || targetSlot >= 5 || target.traitIds[targetSlot]) return state;
  return {
    ...state,
    inventory: {
      ...state.inventory,
      weapons: state.inventory.weapons.map((weapon) =>
        weapon.id === weaponInstanceId ? { ...weapon, traitIds: setTraitSlot(weapon.traitIds, targetSlot, traitId) } : weapon,
      ),
      traits: state.inventory.traits
        .map((item) => item.traitId === traitId ? { ...item, count: item.count - 1 } : item)
        .filter((item) => item.count > 0),
    },
  };
}

export function canApplyTraitToWeapon(trait: TraitDefinition, weaponKind: 'melee' | 'projectile') {
  return trait.weaponAffinity === undefined || trait.weaponAffinity === weaponKind;
}

export function applyTraitToWeaponByItemNo(state: AdventureState, traitItemNo: number, weaponItemNo: number, slotIndex?: number): AdventureState {
  const trait = state.inventory.traits.find((item) => item.itemNo === traitItemNo);
  const weapon = getWeaponByItemNo(state, weaponItemNo);
  return trait && weapon ? applyTraitToWeapon(state, trait.traitId, weapon.id, slotIndex) : state;
}

export function usePotionByItemNo(state: AdventureState, itemNo: number, now: number): AdventureState {
  if (state.death || state.player.hp <= 0) return state;
  const potion = state.inventory.potions.find((item) => item.itemNo === itemNo && item.count > 0);
  if (!potion || now < (state.potionReadyAt[potion.itemId] ?? 0)) return state;
  return {
    ...state,
    player: { ...state.player, hp: Math.min(state.player.maxHp, state.player.hp + potion.heal) },
    inventory: {
      ...state.inventory,
      potions: state.inventory.potions
        .map((item) => item.itemNo === itemNo ? { ...item, count: item.count - 1 } : item)
        .filter((item) => item.count > 0),
    },
    potionReadyAt: { ...state.potionReadyAt, [potion.itemId]: now + potion.cooldownMs },
  };
}

export function equipPotionToSlot(state: AdventureState, itemNo: number, slot: number): AdventureState {
  if (slot < 1 || slot > 5 || !state.inventory.potions.some((item) => item.itemNo === itemNo)) return state;
  return {
    ...state,
    hotbarSlots: state.hotbarSlots.map((entry, index) =>
      index === slot - 1 ? { kind: 'potion', itemNo } : entry?.kind === 'potion' && entry.itemNo === itemNo ? undefined : entry,
    ),
  };
}

export function disposeInventoryItem(state: AdventureState, kind: 'weapon' | 'trait' | 'potion' | 'material', itemNo: number): AdventureState {
  if (kind === 'weapon') {
    const weapon = getWeaponByItemNo(state, itemNo);
    if (!weapon || weapon.id === state.character.leftWeaponInstanceId || weapon.id === state.character.rightWeaponInstanceId) return state;
    return { ...state, inventory: { ...state.inventory, weapons: state.inventory.weapons.filter((item) => item.itemNo !== itemNo) } };
  }
  if (kind === 'trait') {
    return { ...state, inventory: { ...state.inventory, traits: state.inventory.traits.filter((item) => item.itemNo !== itemNo) } };
  }
  if (kind === 'material') {
    return { ...state, inventory: { ...state.inventory, materials: state.inventory.materials.filter((item) => item.itemNo !== itemNo) } };
  }
  return {
    ...state,
    inventory: { ...state.inventory, potions: state.inventory.potions.filter((item) => item.itemNo !== itemNo) },
    hotbarSlots: state.hotbarSlots.map((entry) => entry?.kind === 'potion' && entry.itemNo === itemNo ? undefined : entry),
  };
}

export function removeTraitFromWeapon(state: AdventureState, weaponInstanceId: string, index: number): AdventureState {
  const weapon = state.inventory.weapons.find((item) => item.id === weaponInstanceId);
  const traitId = weapon?.traitIds[index];
  if (!weapon || !traitId) return state;
  const existingStack = state.inventory.traits.find((item) => item.traitId === traitId);
  return {
    ...state,
    inventory: {
      ...state.inventory,
      weapons: state.inventory.weapons.map((item) => item.id === weaponInstanceId
        ? { ...item, traitIds: setTraitSlot(item.traitIds, index, undefined) }
        : item),
      traits: existingStack
        ? state.inventory.traits.map((item) => item.traitId === traitId ? { ...item, count: item.count + 1 } : item)
        : [...state.inventory.traits, { itemNo: Math.max(100, ...state.inventory.traits.map((item) => item.itemNo)) + 1, traitId, count: 1 }],
    },
  };
}

function getFirstOpenTraitSlot(traitIds: Array<string | undefined>) {
  for (let index = 0; index < 5; index += 1) {
    if (!traitIds[index]) return index;
  }
  return -1;
}

function setTraitSlot(traitIds: Array<string | undefined>, index: number, traitId: string | undefined) {
  return Array.from({ length: 5 }, (_, slot) => (slot === index ? traitId : traitIds[slot]));
}

type TraitBehaviorReference = TraitDefinition['behaviors'][number];

function getBehaviorNumber(behavior: TraitBehaviorReference, key: string) {
  const value = behavior.params?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function sumBehaviorNumber(behaviors: TraitBehaviorReference[], behaviorId: TraitBehaviorReference['id'], key: string) {
  return behaviors.reduce((value, behavior) => behavior.id === behaviorId ? value + (getBehaviorNumber(behavior, key) ?? 0) : value, 0);
}

function maxBehaviorNumber(behaviors: TraitBehaviorReference[], behaviorId: TraitBehaviorReference['id'], key: string) {
  return behaviors.reduce((value, behavior) => behavior.id === behaviorId ? Math.max(value, getBehaviorNumber(behavior, key) ?? 0) : value, 0);
}
