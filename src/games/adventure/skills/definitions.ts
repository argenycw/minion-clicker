import type { SkillNodeDefinition } from './types';

export const skillTreeDefinition: SkillNodeDefinition[] = [
  // Root node - no effect.
  { id: 'p0', name: '', kind: 'passive', icon: '✦', color: '#d9982f', description: '', cost: 0 },

  // Branch 1 - Adventurer path: exploration, routing, and flexible survival.
  { id: 'p1', previousId: 'p0', name: 'Wayfarer', kind: 'passive', icon: '⌖', color: '#d9982f', description: 'A practical first step. Max HP +10 and movement speed +8.', cost: 1, passive: { maxHp: 10, moveSpeed: 8 } },

  // ├─ Branch 1-1 - Direct movement and repositioning.
  { id: 'p11', previousId: 'p1', name: 'Fleet Foot', kind: 'passive', icon: '➜', color: '#4388c8', description: 'Move with a lighter step. Movement speed +25.', cost: 1, passive: { moveSpeed: 25 } },
  { id: 'p111', previousId: 'p11', name: 'Trail Runner', kind: 'passive', icon: '⌁', color: '#397eb8', description: 'Keep momentum over rough ground. Movement speed +18.', cost: 1, passive: { moveSpeed: 18 } },
  { id: 'a1111', previousId: 'p111', name: 'Blink', kind: 'active', icon: '⋙', color: '#7267d8', description: 'Instantly blink up to 210 units toward the cursor.', cost: 2, active: { cooldownMs: 18000, effect: { kind: 'blink', distance: 210 } } },

  // └─ Branch 1-2 - Balanced travel stats.
  { id: 'p12', previousId: 'p1', name: 'Light Step', kind: 'passive', icon: '◌', color: '#4a91c4', description: 'Movement speed +15 and weapon damage +3%.', cost: 1, passive: { moveSpeed: 15, damageMultiplier: 1.03 } },
  { id: 'p121', previousId: 'p12', name: 'Wind Reader', kind: 'passive', icon: '≀', color: '#329ca7', description: 'Read openings before they appear. Movement speed +24.', cost: 2, passive: { moveSpeed: 24 } },

  // Merge-back: either travel branch opens the shared adventurer finish.
  { id: 'p13', previousId: ['a1111', 'p121'], name: 'Survival Instinct', kind: 'passive', icon: '❖', color: '#4b8267', description: 'Convert travel discipline into staying power. Max HP +25 and weapon damage +5%.', cost: 2, passive: { maxHp: 25, damageMultiplier: 1.05 } },
  { id: 'k131', previousId: 'p13', name: 'Unburdened', kind: 'keystone', icon: '⬡', color: '#8b5ac7', description: 'Movement speed is doubled, but weapon damage is halved.', cost: 3, passive: { moveSpeedMultiplier: 2, damageMultiplier: 0.5 } },

  // Branch 2 - Tank path: maximum HP and durable pressure.
  { id: 'p2', previousId: 'p0', name: 'Vitality', kind: 'passive', icon: '♥', color: '#d94f5f', description: 'Build a larger health reserve. Max HP +30.', cost: 1, passive: { maxHp: 30 } },

  // ├─ Branch 2-1 - Pure health.
  { id: 'p21', previousId: 'p2', name: 'Steady Heart', kind: 'passive', icon: '♡', color: '#c85160', description: 'Max HP +20.', cost: 1, passive: { maxHp: 20 } },
  { id: 'p211', previousId: 'p21', name: 'Deep Reserves', kind: 'passive', icon: '⬟', color: '#b84c61', description: 'Max HP +45.', cost: 2, passive: { maxHp: 45 } },

  // └─ Branch 2-2 - Health with modest offense.
  { id: 'p22', previousId: 'p2', name: 'Iron Spirit', kind: 'passive', icon: '♦', color: '#963d53', description: 'Max HP +35 and weapon damage +4%.', cost: 2, passive: { maxHp: 35, damageMultiplier: 1.04 } },

  // Merge-back: a tank can continue after committing to either bulk style.
  { id: 'p23', previousId: ['p211', 'p22'], name: 'Lasting Guard', kind: 'passive', icon: '◆', color: '#7f4058', description: 'Max HP +30 and weapon damage +3%.', cost: 2, passive: { maxHp: 30, damageMultiplier: 1.03 } },

  // Branch 3 - DPS path: weapon damage and tempo.
  { id: 'p3', previousId: 'p0', name: 'Battle Rhythm', kind: 'passive', icon: '⚔', color: '#c7683b', description: 'Turn momentum into force. Weapon damage +12%.', cost: 1, passive: { damageMultiplier: 1.12 } },

  // ├─ Branch 3-1 - Fast tempo and burst windows.
  { id: 'p31', previousId: 'p3', name: 'Keen Edge', kind: 'passive', icon: '╱', color: '#bb5b37', description: 'Weapon damage +8%.', cost: 1, passive: { damageMultiplier: 1.08 } },
  { id: 'a311', previousId: 'p31', name: 'Second Wind', kind: 'active', icon: '≋', color: '#37a7a2', description: 'Gain +110 movement speed for 4 seconds.', cost: 2, active: { cooldownMs: 26000, effect: { kind: 'haste', speedBonus: 110, durationMs: 4000 } } },

  // └─ Branch 3-2 - Heavier strikes.
  { id: 'p32', previousId: 'p3', name: 'Heavy Hand', kind: 'passive', icon: '◆', color: '#a94f32', description: 'Weapon damage +10%, but this branch costs more to master.', cost: 2, passive: { damageMultiplier: 1.1 } },
  { id: 'p321', previousId: 'p32', name: 'Finishing Form', kind: 'passive', icon: '✧', color: '#913f2c', description: 'Weapon damage +14%.', cost: 2, passive: { damageMultiplier: 1.14 } },

  // Merge-back: either burst tempo or heavy hits lead into the same finisher.
  { id: 'p33', previousId: ['a311', 'p321'], name: 'Predator Pace', kind: 'passive', icon: '⟡', color: '#a85a43', description: 'Weapon damage +8% and movement speed +10.', cost: 2, passive: { damageMultiplier: 1.08, moveSpeed: 10 } },

  // Branch 4 - Support path: healing access and flexible team utility.
  { id: 'p4', previousId: 'p0', name: 'Field Care', kind: 'passive', icon: '✚', color: '#49a86b', description: 'Max HP +12 and movement speed +6.', cost: 1, passive: { maxHp: 12, moveSpeed: 6 } },

  // ├─ Branch 4-1 - Direct recovery.
  { id: 'p41', previousId: 'p4', name: 'Bandage Kit', kind: 'passive', icon: '+', color: '#409c63', description: 'Max HP +18.', cost: 1, passive: { maxHp: 18 } },
  { id: 'a411', previousId: 'p41', name: 'First Aid', kind: 'active', icon: '✚', color: '#49a86b', description: 'Restore 20 HP immediately.', cost: 2, active: { cooldownMs: 22000, effect: { kind: 'heal', amount: 20 } } },

  // └─ Branch 4-2 - Mobile support.
  { id: 'p42', previousId: 'p4', name: 'Quick Hands', kind: 'passive', icon: '◇', color: '#3f9a88', description: 'Movement speed +16 and weapon damage +3%.', cost: 1, passive: { moveSpeed: 16, damageMultiplier: 1.03 } },
  { id: 'p421', previousId: 'p42', name: 'Rescue Pace', kind: 'passive', icon: '⌁', color: '#348f7c', description: 'Movement speed +20.', cost: 2, passive: { moveSpeed: 20 } },

  // Merge-back: healer and mobile support both return to the shared support capstone.
  { id: 'p43', previousId: ['a411', 'p421'], name: 'Reliable Aid', kind: 'passive', icon: '✦', color: '#408c68', description: 'Max HP +20 and movement speed +10.', cost: 2, passive: { maxHp: 20, moveSpeed: 10 } },
];
