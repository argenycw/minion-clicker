import { Backpack, Settings, Sparkles, Users } from 'lucide-react';
import type { AdventureMenuId } from './useAdventureMenus';

export function AdventureMenuBar({ skillPoints, playerCount, onOpen }: {
  skillPoints: number;
  playerCount: number;
  onOpen: (menu: AdventureMenuId) => void;
}) {
  return (
    <div className="adventure-panel-toggles">
      <button className="inventory-toggle" type="button" onClick={() => onOpen('character')}>
        <Backpack size={18} /> [C] Character
      </button>
      <button className="inventory-toggle" type="button" onClick={() => onOpen('skills')}>
        <Sparkles size={18} /> [K] Skills
        <span className="adventure-menu-chip" aria-label={`${skillPoints} skill points`}>{skillPoints}</span>
      </button>
      <button className="inventory-toggle" type="button" onClick={() => onOpen('multiplayer')}>
        <Users size={18} /> Multiplayer
        <span className="adventure-menu-chip" aria-label={`${playerCount} players`}>{playerCount}</span>
      </button>
      <button className="inventory-toggle" type="button" onClick={() => onOpen('settings')}>
        <Settings size={18} /> [Esc] Settings
      </button>
    </div>
  );
}
