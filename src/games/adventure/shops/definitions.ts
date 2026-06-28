import { getTrait } from '../content';
import { getAdventureItem } from '../loot';
import type { ShopDefinition, ShopId } from './types';

export const shopDefinitions: ShopDefinition[] = [
  {
    id: 'shop-01',
    name: 'Field Goods',
    merchantName: 'Mallow Merchant',
    buybackRate: 0.2,
    allowedSellRanks: ['D', 'C', 'B'],
    stock: [
      { id: 'stock-01', kind: 'potion', itemId: 'item-02', price: 20, stock: 12 },
      { id: 'stock-02', kind: 'trait', traitId: 'augmentation-001', price: 35, stock: 5 },
      { id: 'stock-03', kind: 'trait', traitId: 'augmentation-006', price: 40, stock: 3 },
      { id: 'stock-04', kind: 'potion', itemId: 'item-03', price: 75, stock: 1 },
      { id: 'stock-05', kind: 'trait', traitId: 'augmentation-003', price: 120, stock: 1 },
    ],
  },
];

for (const shop of shopDefinitions) {
  for (const stock of shop.stock) {
    if (stock.kind === 'potion') getAdventureItem(stock.itemId);
    if (stock.kind === 'trait') getTrait(stock.traitId);
  }
}

export function getShopDefinition(id: ShopId) {
  const shop = shopDefinitions.find((candidate) => candidate.id === id);
  if (!shop) throw new Error(`Unknown shop: ${id}`);
  return shop;
}
