import type { CSSProperties } from 'react';
import { getEquippedWeapon, type AdventureState, type EffectiveWeapon } from '../../state';
import { getOutfit, outfitDefinitions } from '../../outfits';
import { getAssignedSkillSlot, getSkill } from '../../skills';
import type { InventorySelection } from './useAdventureMenus';
import { InventoryGroup } from './InventoryGrid';

export function CharacterEditor({
  state,
  selectedItem,
  onSelectItem,
  onCustomize,
}: {
  state: AdventureState;
  selectedItem: InventorySelection | undefined;
  onSelectItem: (selection: InventorySelection | undefined) => void;
  onCustomize: (changes: { body?: string; color?: string; pillWidth?: number }) => void;
}) {
  const faces = ['•̀_•́', '•_•', '´∀`', '¬_¬', '˘･з･', '*´∀`', '^_^', 'ಠ_ಠ'];
  const outfit = getOutfit(state.character.outfitId);
  const leftWeapon = getEquippedWeapon(state, 'left');
  const rightWeapon = getEquippedWeapon(state, 'right');
  const activeSkills = state.skills.unlockedIds
    .map((skillId) => getSkill(skillId))
    .filter((skill) => skill.kind === 'active');
  return (
    <section className="character-editor">
      <h3>Character</h3>
      <div className="character-preview character-editor-preview">
        <PreviewWeaponSlot hand="L" weapon={leftWeapon} />
        <div className="character-preview-minion">
          {outfit.glyph && (
            <span
              className="character-preview-outfit"
              style={{ color: outfit.color, transform: `translate(calc(-50% + ${outfit.offsetX ?? 0}px), calc(-50% + ${outfit.offsetY ?? 0}px))` }}
            >
              {outfit.glyph}
            </span>
          )}
          <strong style={{ background: state.character.color, width: state.character.pillWidth }}>{state.character.body}</strong>
        </div>
        <PreviewWeaponSlot hand="R" weapon={rightWeapon} />
      </div>
      <section className="character-section character-skills">
        <h3>Skills</h3>
        <div className="character-skill-grid">
          {activeSkills.map((skill) => {
            const assignedSlot = getAssignedSkillSlot(state, skill.id);
            return <button
              className={`character-skill-slot active ${selectedItem?.kind === 'skill' && selectedItem.skillId === skill.id ? 'selected' : ''}`}
              key={skill.id}
              type="button"
              title={`${skill.name}: ${skill.description}`}
              style={{ '--skill-color': skill.color } as CSSProperties}
              onClick={() => onSelectItem({ kind: 'skill', skillId: skill.id })}
            >
              {skill.icon}
              {assignedSlot && <span className="skill-slot-badge">{assignedSlot}</span>}
            </button>;
          })}
          {activeSkills.length === 0 && <span className="character-skills-empty">No active skills unlocked</span>}
        </div>
      </section>
      <section className="character-section">
        <h3>Kaomoji</h3>
        <div className="character-choice-grid">
          {faces.map((body) => <button className={state.character.body === body ? 'selected' : ''} key={body} type="button" onClick={() => onCustomize({ body })}>{body}</button>)}
        </div>
      </section>
      <section className="character-section">
        <label className="character-color-picker">Body color<input aria-label="Character RGB color" type="color" value={state.character.color} onChange={(event) => onCustomize({ color: event.target.value })} /></label>
      </section>
      <section className="character-section">
        <label className="character-width-control">Body width <strong>{state.character.pillWidth}</strong><input type="range" min="45" max="70" value={state.character.pillWidth} onChange={(event) => onCustomize({ pillWidth: Number(event.target.value) })} /></label>
      </section>
      <InventoryGroup title="Outfits">
        {outfitDefinitions.map((option) => (
          <button
            className={`inventory-slot outfit-inventory-slot ${selectedItem?.kind === 'outfit' && selectedItem.outfitId === option.id ? 'selected' : ''}`}
            key={option.id}
            type="button"
            onClick={() => onSelectItem({ kind: 'outfit', outfitId: option.id })}
            title={option.name}
          >
            <span className="slot-icon" style={{ color: option.color }}>{option.glyph ?? '·'}</span>
            {state.character.outfitId === option.id && <span className="equipped-mark right">E</span>}
          </button>
        ))}
      </InventoryGroup>
    </section>
  );
}

function PreviewWeaponSlot({ hand, weapon }: { hand: 'L' | 'R'; weapon: EffectiveWeapon | undefined }) {
  return (
    <span className="character-preview-weapon" title={weapon?.name ?? 'Bare Fist'}>
      <small>{hand}</small>
      <strong style={{ color: weapon?.color }}>{weapon?.projectile?.glyph ?? weapon?.handGlyph ?? 'ง'}</strong>
    </span>
  );
}

