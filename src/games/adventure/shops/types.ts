import type { ItemRank } from '../loot';

export type ShopId = `shop-${string}`;
export type ShopStockId = `stock-${string}`;

export type ShopStockDefinition =
  | {
    id: ShopStockId;
    kind: 'potion';
    itemId: string;
    price: number;
    stock: number;
  }
  | {
    id: ShopStockId;
    kind: 'trait';
    traitId: string;
    price: number;
    stock: number;
  };

export type ShopDefinition = {
  id: ShopId;
  name: string;
  merchantName: string;
  buybackRate: number;
  allowedSellRanks: ItemRank[];
  stock: ShopStockDefinition[];
};
