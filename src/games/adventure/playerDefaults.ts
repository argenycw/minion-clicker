import type { TraitStack, WeaponInstance } from './inventory/types';

export const INITIAL_PLAYER_ID = 'player-01';
export const INITIAL_PLAYER_SKILL_POINTS = 15;
export const INITIAL_UNLOCKED_SKILLS = ['p0'];

export const INITIAL_WEAPON_LOADOUT: WeaponInstance[] = [
  { itemNo: 0, id: 'weapon-00', baseWeaponId: 'melee-00', name: 'Bare Fist', traitIds: [] },
  { itemNo: 1, id: 'weapon-01', baseWeaponId: 'melee-01', name: 'Training Fist', traitIds: [] },
  { itemNo: 2, id: 'weapon-02', baseWeaponId: 'ranged-01', name: 'Spark Wand', traitIds: [] },
  { itemNo: 3, id: 'weapon-03', baseWeaponId: 'melee-02', name: 'Heart Tether', traitIds: [] },
  { itemNo: 4, id: 'weapon-04', baseWeaponId: 'ranged-02', name: 'Practice Blade', traitIds: [] },
];

export const INITIAL_TRAIT_LOADOUT: TraitStack[] = [
  { itemNo: 101, traitId: 'augmentation-003', count: 5 },
  { itemNo: 102, traitId: 'augmentation-004', count: 5 },
  { itemNo: 103, traitId: 'augmentation-006', count: 5 },
  { itemNo: 104, traitId: 'augmentation-007', count: 5 },
  { itemNo: 105, traitId: 'augmentation-013', count: 5 },
  { itemNo: 106, traitId: 'augmentation-014', count: 5 },
  { itemNo: 107, traitId: 'augmentation-018', count: 5 },
  { itemNo: 108, traitId: 'augmentation-019', count: 5 },
  { itemNo: 109, traitId: 'augmentation-028', count: 5 },
  { itemNo: 110, traitId: 'augmentation-032', count: 5 },
  { itemNo: 111, traitId: 'augmentation-035', count: 5 },
  { itemNo: 112, traitId: 'augmentation-038', count: 5 },
  { itemNo: 113, traitId: 'augmentation-050', count: 5 },
  { itemNo: 114, traitId: 'augmentation-051', count: 5 },
  { itemNo: 115, traitId: 'augmentation-052', count: 5 },
  { itemNo: 116, traitId: 'augmentation-053', count: 5 },
];

export const INITIAL_POTION_LOADOUT = [
  { itemNo: 201, itemId: 'item-02', count: 3 },
];
