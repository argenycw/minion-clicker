import { useState } from 'react';
import { skillTreeDefinition } from '../../skills';
import type { ShopId } from '../../shops/types';

export type AdventureMenuId = 'character' | 'skills' | 'crafting' | 'multiplayer' | 'settings' | 'shop';

export type InventoryItemKind = 'weapon' | 'trait' | 'potion' | 'material';

export type InventorySelection =
  | { kind: 'weapon'; itemNo: number }
  | { kind: 'trait'; itemNo: number }
  | { kind: 'potion'; itemNo: number }
  | { kind: 'material'; itemNo: number }
  | { kind: 'outfit'; outfitId: string }
  | { kind: 'skill'; skillId: string };

export function useAdventureMenus() {
  const [active, setActive] = useState<AdventureMenuId>();
  const [selectedSkillId, setSelectedSkillId] = useState(skillTreeDefinition[0].id);
  const [selectedItem, setSelectedItem] = useState<InventorySelection | undefined>({ kind: 'weapon', itemNo: 2 });
  const [selectedCraftItemId, setSelectedCraftItemId] = useState<string>();
  const [traitPickerWeaponNo, setTraitPickerWeaponNo] = useState<number>();
  const [traitPickerSlotIndex, setTraitPickerSlotIndex] = useState<number>();
  const [activeShopId, setActiveShopId] = useState<ShopId>();

  return {
    active,
    isOpen: active !== undefined,
    open: (menu: AdventureMenuId | undefined) => {
      setActive(menu);
      if (menu !== 'shop') setActiveShopId(undefined);
    },
    toggle: (menu: AdventureMenuId) => setActive((current) => current === menu ? undefined : menu),
    openShop: (shopId: ShopId) => {
      setActiveShopId(shopId);
      setActive('shop');
    },
    close: () => {
      setActive(undefined);
      setActiveShopId(undefined);
    },
    activeShopId,
    selectedSkillId,
    selectSkill: setSelectedSkillId,
    selectedItem,
    selectItem: setSelectedItem,
    selectedCraftItemId,
    selectCraftItem: setSelectedCraftItemId,
    traitPickerWeaponNo,
    traitPickerSlotIndex,
    openTraitPicker: (weaponItemNo: number, slotIndex: number) => {
      setTraitPickerWeaponNo(weaponItemNo);
      setTraitPickerSlotIndex(slotIndex);
    },
    closeTraitPicker: () => {
      setTraitPickerWeaponNo(undefined);
      setTraitPickerSlotIndex(undefined);
    },
  };
}

export type AdventureMenusController = ReturnType<typeof useAdventureMenus>;
