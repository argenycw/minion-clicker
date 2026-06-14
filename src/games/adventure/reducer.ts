import {
  activateWeapon,
  applyTraitToWeapon,
  createInitialAdventureState,
  customizeCharacter,
  disposeInventoryItem,
  equipPotionToSlot,
  equipSkillToSlot,
  equipOutfit,
  equipWeapon,
  removeTraitFromWeapon,
  tickAdventureState,
  unequipWeapon,
  usePotionByItemNo,
  unlockSkill,
  useHotbarSlot,
  type AdventureState,
  type HandSlot,
} from './state';

export type AdventureAction =
  | { type: 'tick'; now: number; keys: Set<string>; aim: { x: number; y: number } }
  | { type: 'activate'; hand: HandSlot; now: number; aim: { x: number; y: number } }
  | { type: 'hotbar'; slot: number; now: number; aim: { x: number; y: number } }
  | { type: 'equipItem'; itemNo: number; slot: number }
  | { type: 'equipSkill'; skillId: string; slot: number }
  | { type: 'unlockSkill'; skillId: string }
  | { type: 'customizeCharacter'; changes: { body?: string; color?: string; pillWidth?: number } }
  | { type: 'equipOutfit'; outfitId: string }
  | { type: 'equipWeapon'; hand: HandSlot; weaponInstanceId: string }
  | { type: 'unequipWeapon'; hand: HandSlot }
  | { type: 'applyTrait'; traitId: string; weaponInstanceId: string }
  | { type: 'removeTrait'; weaponInstanceId: string; index: number }
  | { type: 'usePotion'; itemNo: number; now: number }
  | { type: 'dispose'; kind: 'weapon' | 'trait' | 'potion'; itemNo: number }
  | { type: 'reset' };

export function adventureReducer(state: AdventureState, action: AdventureAction): AdventureState {
  if (action.type === 'tick') return tickAdventureState(state, action.now, action);
  if (action.type === 'activate') return activateWeapon(state, action.hand, action.aim, action.now);
  if (action.type === 'hotbar') return useHotbarSlot(state, action.slot, action.aim, action.now);
  if (action.type === 'equipItem') return equipPotionToSlot(state, action.itemNo, action.slot);
  if (action.type === 'equipSkill') return equipSkillToSlot(state, action.skillId, action.slot);
  if (action.type === 'unlockSkill') return unlockSkill(state, action.skillId);
  if (action.type === 'customizeCharacter') return customizeCharacter(state, action.changes);
  if (action.type === 'equipOutfit') return equipOutfit(state, action.outfitId);
  if (action.type === 'equipWeapon') return equipWeapon(state, action.hand, action.weaponInstanceId);
  if (action.type === 'unequipWeapon') return unequipWeapon(state, action.hand);
  if (action.type === 'applyTrait') return applyTraitToWeapon(state, action.traitId, action.weaponInstanceId);
  if (action.type === 'removeTrait') return removeTraitFromWeapon(state, action.weaponInstanceId, action.index);
  if (action.type === 'usePotion') return usePotionByItemNo(state, action.itemNo, action.now);
  if (action.type === 'dispose') return disposeInventoryItem(state, action.kind === 'potion' ? 'potion' : action.kind, action.itemNo);
  return createInitialAdventureState();
}
