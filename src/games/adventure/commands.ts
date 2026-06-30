import type { AdventurePlayerId, HandSlot } from './state';
import type { ShopId, ShopStockId } from './shops/types';
import type { CraftingIngredientSelection } from './crafting/types';

export type AdventureInputCommand = {
  type: 'input';
  playerId: AdventurePlayerId;
  tick: number;
  moveX: number;
  moveY: number;
  aimX: number;
  aimY: number;
};

export type AdventureCommand =
  | AdventureInputCommand
  | { type: 'attack'; playerId: AdventurePlayerId; tick: number; hand: HandSlot; aimX: number; aimY: number }
  | { type: 'hotbar'; playerId: AdventurePlayerId; tick: number; slot: number; aimX: number; aimY: number }
  | { type: 'interact'; playerId: AdventurePlayerId; tick: number }
  | { type: 'equipItem'; playerId: AdventurePlayerId; tick: number; itemNo: number; slot: number }
  | { type: 'equipSkill'; playerId: AdventurePlayerId; tick: number; skillId: string; slot: number }
  | { type: 'unlockSkill'; playerId: AdventurePlayerId; tick: number; skillId: string }
  | { type: 'customizeCharacter'; playerId: AdventurePlayerId; tick: number; changes: { body?: string; color?: string; pillWidth?: number } }
  | { type: 'equipOutfit'; playerId: AdventurePlayerId; tick: number; outfitId: string }
  | { type: 'equipWeapon'; playerId: AdventurePlayerId; tick: number; hand: HandSlot; weaponInstanceId: string }
  | { type: 'unequipWeapon'; playerId: AdventurePlayerId; tick: number; hand: HandSlot }
  | { type: 'applyTrait'; playerId: AdventurePlayerId; tick: number; traitId: string; weaponInstanceId: string }
  | { type: 'removeTrait'; playerId: AdventurePlayerId; tick: number; weaponInstanceId: string; index: number }
  | { type: 'usePotion'; playerId: AdventurePlayerId; tick: number; itemNo: number }
  | { type: 'craftItem'; playerId: AdventurePlayerId; tick: number; itemId: string; selections?: CraftingIngredientSelection[] }
  | { type: 'buyShopItem'; playerId: AdventurePlayerId; tick: number; shopId: ShopId; stockId: ShopStockId; quantity: number }
  | { type: 'sellShopItem'; playerId: AdventurePlayerId; tick: number; shopId: ShopId; kind: 'weapon' | 'trait' | 'potion'; itemNo: number; quantity: number }
  | { type: 'dispose'; playerId: AdventurePlayerId; tick: number; kind: 'weapon' | 'trait' | 'potion' | 'material'; itemNo: number }
  | { type: 'respawn'; playerId: AdventurePlayerId; tick: number };

export function keysToAdventureInputCommand(
  playerId: AdventurePlayerId,
  tick: number,
  keys: Set<string>,
  aim: { x: number; y: number },
): AdventureInputCommand {
  const moveX = Number(keys.has('d') || keys.has('arrowright')) - Number(keys.has('a') || keys.has('arrowleft'));
  const moveY = Number(keys.has('s') || keys.has('arrowdown')) - Number(keys.has('w') || keys.has('arrowup'));
  return { type: 'input', playerId, tick, moveX, moveY, aimX: aim.x, aimY: aim.y };
}

export function commandToKeySet(command: AdventureInputCommand): Set<string> {
  const keys = new Set<string>();
  if (command.moveX < 0) keys.add('a');
  if (command.moveX > 0) keys.add('d');
  if (command.moveY < 0) keys.add('w');
  if (command.moveY > 0) keys.add('s');
  return keys;
}
