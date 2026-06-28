import type { AdventureCommand } from '../../commands';
import type { AdventurePlayerId } from '../../state';
import type { AdventureMenuActions } from './AdventureMenus';

export function createAdventureMenuActions(
  getCommandContext: () => { playerId: AdventurePlayerId; tick: number },
  sendCommand: (command: AdventureCommand) => void,
): AdventureMenuActions {
  return {
    unlockSkill: (skillId) => sendCommand({ type: 'unlockSkill', ...getCommandContext(), skillId }),
    equipSkill: (skillId, slot) => sendCommand({ type: 'equipSkill', ...getCommandContext(), skillId, slot }),
    equipWeapon: (hand, weaponInstanceId) => sendCommand({ type: 'equipWeapon', ...getCommandContext(), hand, weaponInstanceId }),
    unequipWeapon: (hand) => sendCommand({ type: 'unequipWeapon', ...getCommandContext(), hand }),
    applyTrait: (traitId, weaponInstanceId) => sendCommand({ type: 'applyTrait', ...getCommandContext(), traitId, weaponInstanceId }),
    removeTrait: (weaponInstanceId, index) => sendCommand({ type: 'removeTrait', ...getCommandContext(), weaponInstanceId, index }),
    usePotion: (itemNo) => sendCommand({ type: 'usePotion', ...getCommandContext(), itemNo }),
    equipItem: (itemNo, slot) => sendCommand({ type: 'equipItem', ...getCommandContext(), itemNo, slot }),
    customizeCharacter: (changes) => sendCommand({ type: 'customizeCharacter', ...getCommandContext(), changes }),
    equipOutfit: (outfitId) => sendCommand({ type: 'equipOutfit', ...getCommandContext(), outfitId }),
    disposeItem: (kind, itemNo) => sendCommand({ type: 'dispose', ...getCommandContext(), kind, itemNo }),
  };
}
