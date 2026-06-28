import type { AdventurePeerStatus } from '../../multiplayer/peerSession';
import type { AdventureState, HandSlot } from '../../state';
import type { useGraphicsSettings } from '../../../../shared/graphicsSettings';
import { CharacterMenu } from './CharacterMenu';
import { InventoryMenuContent } from './CharacterMenuContent';
import { MultiplayerMenu } from './MultiplayerMenu';
import { SettingsMenu } from './SettingsMenu';
import { ShopMenu } from './ShopMenu';
import { SkillsMenu } from './SkillsMenu';
import type { AdventureMenusController, InventoryItemKind } from './useAdventureMenus';
import type { ShopId, ShopStockId } from '../../shops/types';

export type AdventureMenuActions = {
  unlockSkill: (skillId: string) => void;
  equipSkill: (skillId: string, slot: number) => void;
  equipWeapon: (hand: HandSlot, weaponInstanceId: string) => void;
  unequipWeapon: (hand: HandSlot) => void;
  applyTrait: (traitId: string, weaponInstanceId: string) => void;
  removeTrait: (weaponInstanceId: string, index: number) => void;
  usePotion: (itemNo: number) => void;
  equipItem: (itemNo: number, slot: number) => void;
  buyShopItem: (shopId: ShopId, stockId: ShopStockId, quantity: number) => void;
  sellShopItem: (shopId: ShopId, kind: InventoryItemKind, itemNo: number, quantity: number) => void;
  customizeCharacter: (changes: { body?: string; color?: string; pillWidth?: number }) => void;
  equipOutfit: (outfitId: string) => void;
  disposeItem: (kind: InventoryItemKind, itemNo: number) => void;
};

export function AdventureMenus({ state, menus, actions, graphics, onGraphicsChange, multiplayerStatus, hostCode, onHost, onJoin, onDisconnect }: {
  state: AdventureState;
  menus: AdventureMenusController;
  actions: AdventureMenuActions;
  graphics: ReturnType<typeof useGraphicsSettings>[0];
  onGraphicsChange: ReturnType<typeof useGraphicsSettings>[1];
  multiplayerStatus: AdventurePeerStatus;
  hostCode: string;
  onHost: () => void;
  onJoin: (code: string) => void;
  onDisconnect: () => void;
}) {
  const CharacterSkillsMenu = menus.active === 'skills' ? SkillsMenu : CharacterMenu;
  return <>
    {(menus.active === 'character' || menus.active === 'skills') && (
      <CharacterSkillsMenu skillPoints={state.skills.points} onOpen={menus.open} onClose={menus.close}>
        <InventoryMenuContent
          state={state}
          view={menus.active === 'skills' ? 'skills' : 'inventory'}
          selectedSkillId={menus.selectedSkillId}
          onSelectSkill={menus.selectSkill}
          onUnlockSkill={actions.unlockSkill}
          onEquipSkill={actions.equipSkill}
          selectedItem={menus.selectedItem}
          onSelectItem={menus.selectItem}
          onEquip={actions.equipWeapon}
          onUnequip={actions.unequipWeapon}
          onApplyTrait={actions.applyTrait}
          onRemoveTrait={actions.removeTrait}
          onUse={actions.usePotion}
          onEquipItem={actions.equipItem}
          onCustomize={actions.customizeCharacter}
          onEquipOutfit={actions.equipOutfit}
          onDispose={(kind, itemNo) => {
            actions.disposeItem(kind, itemNo);
            menus.selectItem(undefined);
            menus.closeTraitPicker();
          }}
          traitPickerWeaponNo={menus.traitPickerWeaponNo}
          onOpenTraitPicker={menus.openTraitPicker}
          onCloseTraitPicker={menus.closeTraitPicker}
        />
      </CharacterSkillsMenu>
    )}
    {menus.active === 'settings' && <SettingsMenu graphics={graphics} onGraphicsChange={onGraphicsChange} onClose={menus.close} />}
    {menus.active === 'shop' && menus.activeShopId && (
      <ShopMenu
        state={state}
        shopId={menus.activeShopId}
        onBuy={actions.buyShopItem}
        onSell={actions.sellShopItem}
        onClose={menus.close}
      />
    )}
    {menus.active === 'multiplayer' && (
      <MultiplayerMenu
        status={multiplayerStatus}
        hostCode={hostCode}
        localPlayerId={state.localPlayerId}
        players={Object.values(state.players)}
        onHost={onHost}
        onJoin={onJoin}
        onDisconnect={onDisconnect}
        onClose={menus.close}
      />
    )}
  </>;
}
