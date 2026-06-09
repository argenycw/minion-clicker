import type { CSSProperties } from 'react';
import { UnitDefinition } from '../game/content';
import { formatMoney, formatNumber } from '../game/state';

type Props = {
  unit: UnitDefinition;
  count: number;
  cost: number;
  coins: number;
  onBuy: (unitId: string) => void;
};

export function ShopCard({ unit, count, cost, coins, onBuy }: Props) {
  const canBuy = coins >= cost;
  const outputIcon = unit.kind === 'worker' ? '🪙' : '⚔️';
  const output = unit.kind === 'worker' ? `${formatMoney(unit.coinsPerSecond ?? 0)}/s` : formatNumber(unit.attack);

  return (
    <button
      className={`shop-card ${unit.type === 'ranged' ? 'ranged-card' : unit.type === 'melee' ? 'melee-card' : 'worker-card'} ${unit.source === 'dlc' ? 'dlc-card' : ''} ${canBuy ? 'can-buy' : ''}`}
      type="button"
      disabled={!canBuy}
      onClick={() => onBuy(unit.id)}
      title={unit.description}
      style={{ '--unit-bg': unit.background, '--unit-width': `${unit.pillWidth}px` } as CSSProperties}
    >
      <span className="shop-price">🪙 {formatMoney(cost)}</span>
      <div className="shop-card-head">
        <h3>{unit.name}</h3>
        <span>Alive {count}</span>
      </div>
      <div className="shop-face">
        <span className="shop-hand">{unit.leftHand}</span>
        <span className="shop-body">{unit.body}</span>
        <span className="shop-hand">{unit.rightHand}</span>
      </div>
      <div className="shop-meta">
        <Stat icon="❤️" value={formatNumber(unit.maxHp)} />
        <Stat icon={outputIcon} value={output} />
        {unit.kind === 'combat' && <Stat icon="↔️" value={formatNumber(unit.range)} />}
        <Stat icon="👟" value={formatNumber(unit.speed)} />
        {unit.kind === 'combat' && <Stat icon="⏱️" value={formatRate(unit.attackSpeed)} />}
      </div>
    </button>
  );
}

function formatRate(value: number) {
  return value >= 10 ? value.toFixed(0) : value.toFixed(2).replace(/\.?0+$/, '');
}

function Stat({ icon, value }: { icon: string; value: string }) {
  return (
    <span className="shop-stat">
      <span className="shop-stat-icon">{icon}</span>
      <span>{value}</span>
    </span>
  );
}
