import type { AdventureState, HandSlot } from '../state';
import { getTrait, getWeapon } from '../content';
import type { EffectiveWeapon } from './types';

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
  const traits = instance.traitIds.map(getTrait);
  const damageMultiplier = traits.reduce((value, trait) => value * (trait.damageMultiplier ?? 1), 1);
  const damageConstant = traits.reduce((value, trait) => value + (trait.damageConstant ?? 0), 0);
  const attackSpeedMultiplier = traits.reduce((value, trait) => value * (trait.attackSpeedMultiplier ?? 1), 1);
  const rangeMultiplier = traits.reduce((value, trait) => value * (trait.rangeMultiplier ?? 1), 1);
  const radiusMultiplier = traits.reduce((value, trait) => value * (trait.radiusMultiplier ?? 1), 1);
  const extraProjectiles = traits.reduce((value, trait) => value + (trait.extraProjectiles ?? 0), 0);
  const lifeDrain = traits.reduce((value, trait) => value + (trait.lifeDrain ?? 0), 0);
  const shield = traits.reduce((value, trait) => value + (trait.shield ?? 0), 0);
  const inflictions = traits.flatMap((trait) => trait.inflict ? [{
    statusId: trait.inflict.id,
    chance: trait.inflict.chance ?? 1,
    durationMs: trait.inflict.time === undefined ? undefined : trait.inflict.time * 1000,
  }] : []);
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

export function applyTraitToWeapon(state: AdventureState, traitId: string, weaponInstanceId: string): AdventureState {
  const trait = state.inventory.traits.find((item) => item.traitId === traitId && item.count > 0);
  if (!trait) return state;
  const target = state.inventory.weapons.find((weapon) => weapon.id === weaponInstanceId);
  if (!target || target.traitIds.length >= 5) return state;
  return {
    ...state,
    inventory: {
      ...state.inventory,
      weapons: state.inventory.weapons.map((weapon) =>
        weapon.id === weaponInstanceId ? { ...weapon, traitIds: [...weapon.traitIds, traitId] } : weapon,
      ),
      traits: state.inventory.traits
        .map((item) => item.traitId === traitId ? { ...item, count: item.count - 1 } : item)
        .filter((item) => item.count > 0),
    },
  };
}

export function applyTraitToWeaponByItemNo(state: AdventureState, traitItemNo: number, weaponItemNo: number): AdventureState {
  const trait = state.inventory.traits.find((item) => item.itemNo === traitItemNo);
  const weapon = getWeaponByItemNo(state, weaponItemNo);
  return trait && weapon ? applyTraitToWeapon(state, trait.traitId, weapon.id) : state;
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
        ? { ...item, traitIds: item.traitIds.filter((_, traitIndex) => traitIndex !== index) }
        : item),
      traits: existingStack
        ? state.inventory.traits.map((item) => item.traitId === traitId ? { ...item, count: item.count + 1 } : item)
        : [...state.inventory.traits, { itemNo: Math.max(100, ...state.inventory.traits.map((item) => item.itemNo)) + 1, traitId, count: 1 }],
    },
  };
}
