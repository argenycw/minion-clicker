import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type WheelEvent } from 'react';
import { Lock, MousePointer2, Sparkles } from 'lucide-react';
import type { AdventureState } from '../../state';
import { areSkillPrerequisitesMet, createSkillTreeLayout, getAssignedSkillSlot, getSkill, getSkillPrerequisites, skillTreeDefinition, type SkillNodeDefinition } from '../../skills';
import { AttributeRow } from './MenuPrimitives';

export function SkillTreePanel({
  state,
  selectedSkillId,
  onSelectSkill,
  onUnlockSkill,
  onEquipSkill,
}: {
  state: AdventureState;
  selectedSkillId: string;
  onSelectSkill: (skillId: string) => void;
  onUnlockSkill: (skillId: string) => void;
  onEquipSkill: (skillId: string, slot: number) => void;
}) {
  const selected = getSkill(selectedSkillId);
  const unlocked = state.skills.unlockedIds.includes(selected.id);
  const layout = useMemo(createSkillTreeLayout, []);
  const [view, setView] = useState({ x: 24, y: 24, scale: 0.72 });
  const [holdingId, setHoldingId] = useState<string>();
  const [completedId, setCompletedId] = useState<string>();
  const [rejectedId, setRejectedId] = useState<string>();
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const completeTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const rejectTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const panRef = useRef<{ pointerId: number; clientX: number; clientY: number; x: number; y: number } | undefined>(undefined);

  useEffect(() => () => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    if (completeTimerRef.current) clearTimeout(completeTimerRef.current);
    if (rejectTimerRef.current) clearTimeout(rejectTimerRef.current);
  }, []);

  const stopHold = () => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    holdTimerRef.current = undefined;
    setHoldingId(undefined);
  };

  const rejectUnlock = (skillId: string) => {
    setRejectedId(skillId);
    if (rejectTimerRef.current) clearTimeout(rejectTimerRef.current);
    rejectTimerRef.current = setTimeout(() => setRejectedId(undefined), 520);
  };

  const startNodeHold = (event: ReactPointerEvent<HTMLButtonElement>, skill: SkillNodeDefinition) => {
    event.stopPropagation();
    onSelectSkill(skill.id);
    if (state.skills.unlockedIds.includes(skill.id)) return;
    if (!areSkillPrerequisitesMet(state, skill.id)) {
      holdTimerRef.current = setTimeout(() => {
        rejectUnlock(skill.id);
        holdTimerRef.current = undefined;
      }, 500);
      return;
    }
    setHoldingId(skill.id);
    holdTimerRef.current = setTimeout(() => {
      if (state.skills.points >= skill.cost) {
        onUnlockSkill(skill.id);
        setCompletedId(skill.id);
        if (completeTimerRef.current) clearTimeout(completeTimerRef.current);
        completeTimerRef.current = setTimeout(() => setCompletedId(undefined), 620);
      } else rejectUnlock(skill.id);
      setHoldingId(undefined);
      holdTimerRef.current = undefined;
    }, 680);
  };

  const beginPan = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    panRef.current = { pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY, x: view.x, y: view.y };
  };

  const movePan = (event: ReactPointerEvent<HTMLDivElement>) => {
    const pan = panRef.current;
    if (!pan || pan.pointerId !== event.pointerId) return;
    setView((current) => ({ ...current, x: pan.x + event.clientX - pan.clientX, y: pan.y + event.clientY - pan.clientY }));
  };

  const endPan = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (panRef.current?.pointerId === event.pointerId) panRef.current = undefined;
  };

  const zoomTree = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const bounds = event.currentTarget.getBoundingClientRect();
    const cursorX = event.clientX - bounds.left;
    const cursorY = event.clientY - bounds.top;
    setView((current) => {
      const scale = Math.max(0.25, Math.min(1.0, current.scale * Math.exp(-event.deltaY * 0.0012)));
      const ratio = scale / current.scale;
      return { scale, x: cursorX - (cursorX - current.x) * ratio, y: cursorY - (cursorY - current.y) * ratio };
    });
  };

  const selectedPrerequisites = getSkillPrerequisites(selected);
  return (
    <div className="skill-tree-layout">
      <section className="skill-tree-board" aria-label="Skill tree">
        <div className="skill-tree-summary">
          <span><Sparkles size={17} /> Available skill points</span>
          <div className="skill-tree-tools">
            <button type="button" onClick={() => setView({ x: 24, y: 24, scale: 0.72 })}>Reset</button>
            <strong>{state.skills.points}</strong>
          </div>
        </div>
        <div className="skill-tree-canvas" onPointerDown={beginPan} onPointerMove={movePan} onPointerUp={endPan} onPointerCancel={endPan} onWheel={zoomTree}>
          <div className="skill-tree-world" style={{ width: layout.width, height: layout.height, transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}>
            <svg className="skill-tree-links" width={layout.width} height={layout.height} aria-hidden="true">
              {skillTreeDefinition.flatMap((skill) => getSkillPrerequisites(skill).map((requiredId) => {
                const from = layout.positions.get(requiredId)!;
                const to = layout.positions.get(skill.id)!;
                const active = state.skills.unlockedIds.includes(requiredId) && state.skills.unlockedIds.includes(skill.id);
                const progressing = holdingId === skill.id;
                const completed = completedId === skill.id;
                return <g key={`${requiredId}-${skill.id}`}>
                  <line className="skill-link-base" x1={from.x} y1={from.y} x2={to.x} y2={to.y} />
                  {(active || progressing || completed) && <line
                    pathLength="1"
                    className={`skill-link-progress ${active ? 'unlocked' : ''} ${progressing ? 'holding' : ''} ${completed ? 'completed' : ''}`}
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                  />}
                </g>;
              }))}
            </svg>
            {skillTreeDefinition.map((skill) => {
              const position = layout.positions.get(skill.id)!;
              const isUnlocked = state.skills.unlockedIds.includes(skill.id);
              const available = areSkillPrerequisitesMet(state, skill.id);
              const assignedSlot = getAssignedSkillSlot(state, skill.id);
              return <button
                key={skill.id}
                className={`skill-node ${skill.kind} ${isUnlocked ? 'unlocked' : available ? 'available' : 'locked'} ${selected.id === skill.id ? 'selected' : ''} ${holdingId === skill.id ? 'holding' : ''} ${completedId === skill.id ? 'completed' : ''} ${rejectedId === skill.id ? 'rejected' : ''}`}
                style={{ '--skill-color': skill.color, left: position.x, top: position.y } as CSSProperties}
                type="button"
                onPointerDown={(event) => startNodeHold(event, skill)}
                onPointerUp={stopHold}
                onPointerLeave={stopHold}
                onPointerCancel={stopHold}
                onContextMenu={(event) => event.preventDefault()}
                aria-label={`${skill.name || 'Skill tree origin'}, ${skill.kind}, ${isUnlocked ? 'unlocked' : available ? 'available' : 'locked'}`}
              >
                <span className="skill-node-core">
                  <span className="skill-node-fill" />
                  <span className="skill-node-icon">{skill.icon}</span>
                </span>
                {!isUnlocked && !available && <span className="skill-lock-overlay"><Lock size={14} /></span>}
                {assignedSlot && <span className="skill-slot-badge">{assignedSlot}</span>}
                {skill.name && <strong>{skill.name}</strong>}
                <small className="skill-kind-tooltip">{skill.kind}</small>
              </button>;
            })}
          </div>
          <div className="skill-navigation-hint">
            <MousePointer2 size={16} />
            <span>Drag to pan · Wheel to zoom · Hold an available node to unlock</span>
          </div>
        </div>
        <div className="skill-tree-legend">
          <span><i className="passive" /> Passive stat bonus</span>
          <span><i className="active" /> Active hotbar skill</span>
          <span><i className="keystone" /> Keystone tradeoff</span>
        </div>
      </section>

      <section className="skill-inspector">
        <div className="skill-inspector-header">
          <span style={{ color: selected.color }}>{selected.icon}</span>
          <div><small>{selected.kind} skill</small>{selected.name && <h2>{selected.name}</h2>}</div>
          <em>{selected.cost} SP</em>
        </div>
        {selected.description && <p>{selected.description}</p>}
        {(selected.passive || selected.active) && <div className="skill-detail-card">
          {selected.passive && <SkillPassiveDetails skill={selected} />}
          {selected.active && <>
            <AttributeRow icon="⏱" label="Cooldown" value={`${selected.active.cooldownMs / 1000}s`} />
          </>}
        </div>}
        {selectedPrerequisites.length > 0 && <p className="skill-requirement">Requires {selectedPrerequisites.map((skillId) => getSkill(skillId).name || 'Skill tree origin').join(' or ')}</p>}
        <div className="skill-inspector-actions">
          {!unlocked && <span className="skill-hold-hint">Press and hold the node to unlock</span>}
          {unlocked && selected.kind !== 'active' && <span className="skill-unlocked-label">{selected.kind === 'keystone' ? 'Keystone active' : 'Passive active'}</span>}
          {unlocked && selected.kind === 'active' && <div className="skill-slot-actions">
            <span>Assign to shared hotbar</span>
            <div>{[1, 2, 3, 4, 5].map((slot) => {
              const entry = state.hotbarSlots[slot - 1];
              const equipped = entry?.kind === 'skill' && entry.skillId === selected.id;
              return <button className={equipped ? 'equipped' : undefined} key={slot} type="button" onClick={() => onEquipSkill(selected.id, slot)}>{slot}</button>;
            })}</div>
          </div>}
        </div>
      </section>
    </div>
  );
}

function SkillPassiveDetails({ skill }: { skill: SkillNodeDefinition }) {
  const passive = skill.passive;
  if (!passive) return null;
  return <>
    {passive.maxHp !== undefined && <AttributeRow icon="♥" label="Max HP" value={`+${passive.maxHp}`} />}
    {passive.moveSpeed !== undefined && <AttributeRow icon="👟" label="Movement speed" value={`+${passive.moveSpeed}`} />}
    {passive.moveSpeedMultiplier !== undefined && <AttributeRow icon="➜" label="Movement speed" value={`×${passive.moveSpeedMultiplier}`} />}
    {passive.damageMultiplier !== undefined && <AttributeRow icon="⚔" label="Weapon damage" value={`${Math.round((passive.damageMultiplier - 1) * 100)}%`} />}
  </>;
}
