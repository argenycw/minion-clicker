import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Coins, HandCoins, ShoppingBag, X } from 'lucide-react';
import { getTrait } from '../../content';
import { getAdventureItem, ITEM_RANK_BACKGROUNDS, ITEM_RANK_COLORS } from '../../loot';
import { getShopDefinition } from '../../shops/definitions';
import {
  canSellInventoryItem,
  getInventorySellPrice,
  getShopStockIcon,
  getShopStockName,
  getShopStockRank,
} from '../../shops/system';
import type { ShopId, ShopStockDefinition, ShopStockId } from '../../shops/types';
import type { AdventureState } from '../../state';
import { getWeapon } from '../../weapons/definitions';
import type { InventoryItemKind } from './useAdventureMenus';
import { StoneIcon } from './StoneIcon';

type ShopMode = 'buy' | 'sell';
type SellEntry = {
  key: string;
  kind: InventoryItemKind;
  itemNo: number;
  name: string;
  icon: ReactNode;
  rank: keyof typeof ITEM_RANK_COLORS;
  count: number;
  disabled?: boolean;
};

export function ShopMenu({
  state,
  shopId,
  onBuy,
  onSell,
  onClose,
}: {
  state: AdventureState;
  shopId: ShopId;
  onBuy: (shopId: ShopId, stockId: ShopStockId, quantity: number) => void;
  onSell: (shopId: ShopId, kind: InventoryItemKind, itemNo: number, quantity: number) => void;
  onClose: () => void;
}) {
  const shop = getShopDefinition(shopId);
  const [mode, setMode] = useState<ShopMode>('buy');
  const [selectedStockId, setSelectedStockId] = useState<ShopStockId>(shop.stock[0]?.id ?? 'stock-01');
  const sellEntries = useMemo(() => getSellEntries(state, shopId), [state, shopId]);
  const [selectedSellKey, setSelectedSellKey] = useState<string>();
  const [quantity, setQuantity] = useState(1);

  const selectedStock = shop.stock.find((stock) => stock.id === selectedStockId) ?? shop.stock[0];
  const selectedSell = sellEntries.find((entry) => entry.key === selectedSellKey) ?? sellEntries[0];
  const maxQuantity = mode === 'buy'
    ? Math.max(1, selectedStock?.stock ?? 1)
    : Math.max(1, selectedSell?.count ?? 1);
  const safeQuantity = clampQuantity(quantity, maxQuantity);
  const unitPrice = mode === 'buy'
    ? selectedStock?.price ?? 0
    : selectedSell ? getInventorySellPrice(state, shopId, selectedSell.kind, selectedSell.itemNo) : 0;
  const total = unitPrice * safeQuantity;
  const canTransact = mode === 'buy'
    ? Boolean(selectedStock && state.coins >= total)
    : Boolean(selectedSell && !selectedSell.disabled);

  const switchMode = (nextMode: ShopMode) => {
    setMode(nextMode);
    setQuantity(1);
  };

  return (
    <aside className="inventory-panel shop-menu-panel" aria-label="Merchant shop">
      <div className="inventory-heading">
        <div className="adventure-panel-tabs">
          <button className={mode === 'buy' ? 'selected' : undefined} type="button" onClick={() => switchMode('buy')}>
            <ShoppingBag size={17} /> Buy
          </button>
          <button className={mode === 'sell' ? 'selected' : undefined} type="button" onClick={() => switchMode('sell')}>
            <HandCoins size={17} /> Sell
          </button>
        </div>
        <div className="shop-merchant-heading">
          <strong>{shop.merchantName}</strong>
          <span><Coins size={15} /> {state.coins}</span>
        </div>
        <button type="button" onClick={onClose} aria-label="Close shop"><X size={18} /></button>
      </div>

      <div className="shop-menu-body">
        <section className="shop-item-list" aria-label={mode === 'buy' ? 'Merchant stock' : 'Inventory for sale'}>
          <h3>{mode === 'buy' ? shop.name : 'Your Inventory'}</h3>
          <div className="shop-list-scroll">
            {mode === 'buy' ? shop.stock.map((stock) => (
              <button
                key={stock.id}
                className={stock.id === selectedStock?.id ? 'selected' : undefined}
                type="button"
                onClick={() => {
                  setSelectedStockId(stock.id);
                  setQuantity(1);
                }}
              >
                <ShopItemIcon stock={stock} />
                <span>
                  <strong>{getShopStockName(stock)}</strong>
                  <small>{getShopStockRank(stock)} quality</small>
                </span>
                <em>{stock.price}</em>
              </button>
            )) : sellEntries.map((entry) => (
              <button
                key={entry.key}
                className={entry.key === selectedSell?.key ? 'selected' : undefined}
                type="button"
                disabled={entry.disabled}
                onClick={() => {
                  setSelectedSellKey(entry.key);
                  setQuantity(1);
                }}
              >
                <span className="shop-entry-icon" style={{ color: ITEM_RANK_COLORS[entry.rank], background: ITEM_RANK_BACKGROUNDS[entry.rank] }}>{entry.icon}</span>
                <span>
                  <strong>{entry.name}</strong>
                  <small>{entry.rank} quality{entry.count > 1 ? ` x${entry.count}` : ''}</small>
                </span>
                <em>{getInventorySellPrice(state, shopId, entry.kind, entry.itemNo)}</em>
              </button>
            ))}
          </div>
        </section>

        <section className="shop-detail-panel">
          {mode === 'buy' && selectedStock && <BuyDetails stock={selectedStock} />}
          {mode === 'sell' && selectedSell && <SellDetails entry={selectedSell} />}
          {mode === 'sell' && !selectedSell && <p>No sellable items.</p>}
        </section>

        <section className="shop-transaction-panel">
          <h3>{mode === 'buy' ? 'Purchase' : 'Buyback'}</h3>
          <div className="shop-price-row"><span>Coins</span><strong>{state.coins}</strong></div>
          <div className="shop-price-row"><span>Unit Price</span><strong>{unitPrice}</strong></div>
          <label className="shop-quantity-control">
            <span>Qty</span>
            <input
              type="number"
              min={1}
              max={maxQuantity}
              value={safeQuantity}
              onChange={(event) => setQuantity(clampQuantity(Number(event.target.value), maxQuantity))}
            />
          </label>
          <div className="shop-price-row total"><span>Total</span><strong>{total}</strong></div>
          <button
            type="button"
            disabled={!canTransact}
            onClick={() => {
              if (mode === 'buy' && selectedStock) onBuy(shopId, selectedStock.id, safeQuantity);
              if (mode === 'sell' && selectedSell) onSell(shopId, selectedSell.kind, selectedSell.itemNo, safeQuantity);
            }}
          >
            {mode === 'buy' ? 'Buy' : 'Sell'}
          </button>
          <small>{mode === 'buy' ? 'Merchant stock never includes blue quality items.' : `Buyback rate ${Math.round(shop.buybackRate * 100)}%.`}</small>
        </section>
      </div>
    </aside>
  );
}

function ShopItemIcon({ stock }: { stock: ShopStockDefinition }) {
  if (stock.kind === 'trait') {
    const trait = getTrait(stock.traitId);
    return <span className="shop-entry-icon" style={{ background: ITEM_RANK_BACKGROUNDS[trait.rank] }}><StoneIcon trait={trait} size="socket" /></span>;
  }
  const item = getAdventureItem(stock.itemId);
  return <span className="shop-entry-icon" style={{ color: ITEM_RANK_COLORS[item.rank], background: ITEM_RANK_BACKGROUNDS[item.rank] }}>{getShopStockIcon(stock)}</span>;
}

function BuyDetails({ stock }: { stock: ShopStockDefinition }) {
  if (stock.kind === 'trait') {
    const trait = getTrait(stock.traitId);
    return (
      <>
        <div className="inspector-header">
          <span style={{ background: ITEM_RANK_BACKGROUNDS[trait.rank] }}><StoneIcon trait={trait} size="header" /></span>
          <div><h3>{trait.name}</h3><p>{trait.rank} augmentation stone</p></div>
        </div>
        <p>{trait.description || 'Socket this stone into a weapon to change how it performs.'}</p>
      </>
    );
  }
  const item = getAdventureItem(stock.itemId);
  return (
    <>
      <div className="inspector-header">
        <span style={{ color: ITEM_RANK_COLORS[item.rank], background: ITEM_RANK_BACKGROUNDS[item.rank] }}>{item.icon}</span>
        <div><h3>{item.name}</h3><p>{item.rank} potion</p></div>
      </div>
      <p>{item.description} Restores {item.heal} HP. Cooldown: {item.cooldownMs / 1000}s.</p>
    </>
  );
}

function SellDetails({ entry }: { entry: SellEntry }) {
  return (
    <>
      <div className="inspector-header">
        <span style={{ color: ITEM_RANK_COLORS[entry.rank], background: ITEM_RANK_BACKGROUNDS[entry.rank] }}>{entry.icon}</span>
        <div><h3>{entry.name}</h3><p>{entry.rank} item{entry.count > 1 ? ` x${entry.count}` : ''}</p></div>
      </div>
      <p>{entry.disabled ? 'This merchant will not buy this item right now.' : 'The merchant will buy this item for coins.'}</p>
    </>
  );
}

function getSellEntries(state: AdventureState, shopId: ShopId): SellEntry[] {
  return [
    ...state.inventory.potions.map((item) => ({
      key: `potion-${item.itemNo}`,
      kind: 'potion' as const,
      itemNo: item.itemNo,
      name: item.name,
      icon: item.icon,
      rank: item.rank,
      count: item.count,
      disabled: !canSellInventoryItem(state, shopId, 'potion', item.itemNo),
    })),
    ...state.inventory.traits.map((item) => {
      const trait = getTrait(item.traitId);
      return {
        key: `trait-${item.itemNo}`,
        kind: 'trait' as const,
        itemNo: item.itemNo,
        name: trait.name,
        icon: <StoneIcon trait={trait} size="socket" />,
        rank: trait.rank,
        count: item.count,
        disabled: !canSellInventoryItem(state, shopId, 'trait', item.itemNo),
      };
    }),
    ...state.inventory.weapons.map((item) => {
      const weapon = getWeapon(item.baseWeaponId);
      return {
        key: `weapon-${item.itemNo}`,
        kind: 'weapon' as const,
        itemNo: item.itemNo,
        name: item.name,
        icon: weapon.projectile?.glyph ?? weapon.handGlyph,
        rank: weapon.rank,
        count: 1,
        disabled: !canSellInventoryItem(state, shopId, 'weapon', item.itemNo),
      };
    }),
  ];
}

function clampQuantity(value: number, max: number) {
  if (!Number.isFinite(value)) return 1;
  return Math.max(1, Math.min(max, Math.floor(value)));
}
