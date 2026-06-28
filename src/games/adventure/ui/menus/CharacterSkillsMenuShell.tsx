import type { ReactNode } from 'react';
import { Backpack, Sparkles, X } from 'lucide-react';
import type { AdventureMenuId } from './useAdventureMenus';

export function CharacterSkillsMenuShell({ active, skillPoints, onOpen, onClose, children }: {
  active: 'character' | 'skills';
  skillPoints: number;
  onOpen: (menu: AdventureMenuId) => void;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <aside className={`inventory-panel ${active === 'skills' ? 'skill-panel' : ''}`} aria-label="Adventure menu">
      <div className="inventory-heading">
        <div className="adventure-panel-tabs">
          <button className={active === 'character' ? 'selected' : undefined} type="button" onClick={() => onOpen('character')}>
            <Backpack size={17} /> Character
          </button>
          <button className={active === 'skills' ? 'selected' : undefined} type="button" onClick={() => onOpen('skills')}>
            <Sparkles size={17} /> Skills <em>{skillPoints}</em>
          </button>
        </div>
        <button type="button" onClick={onClose} aria-label="Close menu"><X size={18} /></button>
      </div>
      {children}
    </aside>
  );
}
