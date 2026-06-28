import {
  activateWeapon,
  createInitialAdventureState,
  dropLootAtPlayer,
  dropCoinsAtPlayer,
  tickAdventureState,
  useHotbarSlot,
  interactWithAdventure,
  debugTeleportPlayer,
  addAdventurePlayer,
  applyAdventureSnapshot,
  applyAdventurePlayerPosition,
  buyAdventureShopItem,
  moveAdventureLocalPlayer,
  removeAdventurePlayer,
  respawnAdventurePlayer,
  sellAdventureShopItem,
  syncLegacyFieldsToPlayers,
  useAdventurePlayerAsLocal,
  type AdventurePlayerId,
  type AdventureState,
  type HandSlot,
} from './state';
import { commandToKeySet, type AdventureCommand } from './commands';
import { customizeCharacter, equipOutfit } from './character/system';
import {
  applyTraitToWeapon,
  disposeInventoryItem,
  equipPotionToSlot,
  equipWeapon,
  removeTraitFromWeapon,
  unequipWeapon,
  usePotionByItemNo,
} from './inventory/system';
import { equipSkillToSlot, unlockSkill } from './skills/system';

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
  | { type: 'buyShopItem'; shopId: import('./shops/types').ShopId; stockId: import('./shops/types').ShopStockId; quantity: number }
  | { type: 'sellShopItem'; shopId: import('./shops/types').ShopId; kind: 'weapon' | 'trait' | 'potion'; itemNo: number; quantity: number }
  | { type: 'dropLoot'; itemId: string; now: number }
  | { type: 'dropCoins'; amount: number; now: number }
  | { type: 'interact'; now: number }
  | { type: 'debugTeleport'; x: number; y: number }
  | { type: 'command'; command: AdventureCommand; now: number }
  | { type: 'addPlayer'; playerId: AdventurePlayerId; now: number }
  | { type: 'removePlayer'; playerId: AdventurePlayerId }
  | { type: 'snapshot'; state: AdventureState; localPlayerId: AdventurePlayerId }
  | { type: 'clientMovement'; input: import('./commands').AdventureInputCommand; deltaSeconds: number; now: number }
  | { type: 'networkPlayerPosition'; playerId: AdventurePlayerId; position: { x: number; y: number; facing: import('./state').Facing } }
  | { type: 'respawn'; now: number }
  | { type: 'reset' };

export function adventureReducer(state: AdventureState, action: AdventureAction): AdventureState {
  return syncLegacyFieldsToPlayers(reduceAdventureAction(state, action));
}

function reduceAdventureAction(state: AdventureState, action: AdventureAction): AdventureState {
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
  if (action.type === 'buyShopItem') return buyAdventureShopItem(state, action.shopId, action.stockId, action.quantity);
  if (action.type === 'sellShopItem') return sellAdventureShopItem(state, action.shopId, action.kind, action.itemNo, action.quantity);
  if (action.type === 'dropLoot') return dropLootAtPlayer(state, action.itemId, action.now);
  if (action.type === 'dropCoins') return dropCoinsAtPlayer(state, action.amount, action.now);
  if (action.type === 'interact') return interactWithAdventure(state, action.now);
  if (action.type === 'debugTeleport') return debugTeleportPlayer(state, action.x, action.y);
  if (action.type === 'command') return applyAdventureCommand(state, action.command, action.now);
  if (action.type === 'addPlayer') return addAdventurePlayer(state, action.playerId, action.now);
  if (action.type === 'removePlayer') return removeAdventurePlayer(state, action.playerId);
  if (action.type === 'snapshot') return applyAdventureSnapshot(state, action.state, action.localPlayerId);
  if (action.type === 'clientMovement') return moveAdventureLocalPlayer(state, action.input, action.deltaSeconds, action.now);
  if (action.type === 'networkPlayerPosition') return applyAdventurePlayerPosition(state, action.playerId, action.position);
  if (action.type === 'respawn') return respawnAdventurePlayer(state, action.now);
  return createInitialAdventureState({ now: performance.now() });
}

function applyAdventureCommand(state: AdventureState, command: AdventureCommand, now: number): AdventureState {
  const scoped = useAdventurePlayerAsLocal(state, command.playerId);
  if (scoped.localPlayerId !== command.playerId) return state;
  const restoreLocalPlayer = (next: AdventureState) => useAdventurePlayerAsLocal(syncLegacyFieldsToPlayers(next), state.localPlayerId);
  if (command.type === 'input') {
    return restoreLocalPlayer(tickAdventureState(scoped, now, {
      keys: commandToKeySet(command),
      aim: { x: command.aimX, y: command.aimY },
    }));
  }
  if (command.type === 'attack') return restoreLocalPlayer(activateWeapon(scoped, command.hand, { x: command.aimX, y: command.aimY }, now));
  if (command.type === 'hotbar') return restoreLocalPlayer(useHotbarSlot(scoped, command.slot, { x: command.aimX, y: command.aimY }, now));
  if (command.type === 'interact') return restoreLocalPlayer(interactWithAdventure(scoped, now));
  if (command.type === 'equipItem') return restoreLocalPlayer(equipPotionToSlot(scoped, command.itemNo, command.slot));
  if (command.type === 'equipSkill') return restoreLocalPlayer(equipSkillToSlot(scoped, command.skillId, command.slot));
  if (command.type === 'unlockSkill') return restoreLocalPlayer(unlockSkill(scoped, command.skillId));
  if (command.type === 'customizeCharacter') return restoreLocalPlayer(customizeCharacter(scoped, command.changes));
  if (command.type === 'equipOutfit') return restoreLocalPlayer(equipOutfit(scoped, command.outfitId));
  if (command.type === 'equipWeapon') return restoreLocalPlayer(equipWeapon(scoped, command.hand, command.weaponInstanceId));
  if (command.type === 'unequipWeapon') return restoreLocalPlayer(unequipWeapon(scoped, command.hand));
  if (command.type === 'applyTrait') return restoreLocalPlayer(applyTraitToWeapon(scoped, command.traitId, command.weaponInstanceId));
  if (command.type === 'removeTrait') return restoreLocalPlayer(removeTraitFromWeapon(scoped, command.weaponInstanceId, command.index));
  if (command.type === 'usePotion') return restoreLocalPlayer(usePotionByItemNo(scoped, command.itemNo, now));
  if (command.type === 'buyShopItem') return restoreLocalPlayer(buyAdventureShopItem(scoped, command.shopId, command.stockId, command.quantity));
  if (command.type === 'sellShopItem') return restoreLocalPlayer(sellAdventureShopItem(scoped, command.shopId, command.kind, command.itemNo, command.quantity));
  if (command.type === 'respawn') return restoreLocalPlayer(respawnAdventurePlayer(scoped, now));
  return restoreLocalPlayer(disposeInventoryItem(scoped, command.kind === 'potion' ? 'potion' : command.kind, command.itemNo));
}
