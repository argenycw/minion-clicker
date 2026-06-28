import type { CSSProperties, ReactNode } from 'react';

export function InventoryGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="inventory-group">
      <h3>{title}</h3>
      <div className="inventory-grid">{children}</div>
    </section>
  );
}

export function InventorySlot({
  selected,
  itemNo,
  icon,
  color,
  name,
  rarityBackground,
  countLabel,
  equippedLeft,
  equippedRight,
  onClick,
}: {
  selected: boolean;
  itemNo: number;
  icon: ReactNode;
  color?: string;
  name: string;
  rarityBackground?: string;
  countLabel?: string;
  equippedLeft?: boolean;
  equippedRight?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`inventory-slot ${selected ? 'selected' : ''}`}
      style={rarityBackground ? { '--rarity-background': rarityBackground } as CSSProperties : undefined}
      type="button"
      onClick={onClick}
      title={`#${itemNo} ${name}`}
    >
      <span className="slot-icon" style={{ color }}>{icon}</span>
      {countLabel && <span className="slot-count">{countLabel}</span>}
      {equippedLeft && <span className="equipped-mark left">L</span>}
      {equippedRight && <span className="equipped-mark right">R</span>}
    </button>
  );
}

