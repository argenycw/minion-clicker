import type { CSSProperties } from 'react';
import type { TraitDefinition } from '../../content';

export function StoneIcon({ trait, size = 'slot' }: { trait: TraitDefinition; size?: 'slot' | 'socket' | 'picker' | 'header' }) {
  return (
    <span className={`stone-icon ${size}`} style={{ '--stone-color': trait.color } as CSSProperties} title={`${trait.name} · ${trait.family}`}>
      <span>{trait.icon}</span>
    </span>
  );
}

