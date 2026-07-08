import type { SkillNodeDefinition } from './types';

export const skillTreeDefinition: SkillNodeDefinition[] = [
  // Root node - no effect.
  { id: 'p0', name: '', kind: 'passive', icon: '✦', color: '#d9982f', description: '', cost: 0 },

  // # Branch 1 - Adventurer path: exploration, routing, and flexible survival.
  { id: 'p1', previousId: 'p0', name: 'Entrance of Explorer', kind: 'passive', icon: '👁', color: '#d9982f', description: 'A practical first step. Max HP +10 and movement speed +8.', cost: 1, passive: { maxHp: 10, moveSpeed: 8 } },

  // ## Branch 1-1 - Direct movement and repositioning.
  { id: 'p11', previousId: 'p1', name: 'Fleet Foot', kind: 'passive', icon: '➜', color: '#4388c8', description: 'Move with a lighter step. Movement speed +25.', cost: 1, passive: { moveSpeed: 25 } },
  { id: 'p111', previousId: 'p11', name: 'Trail Runner', kind: 'passive', icon: '⌁', color: '#397eb8', description: 'Keep momentum over rough ground. Movement speed +18.', cost: 1, passive: { moveSpeed: 18 } },
  { id: 'a1111', previousId: 'p111', name: 'Blink', kind: 'active', icon: '⋙', color: '#7267d8', description: 'Instantly blink up to 210 units toward the cursor.', cost: 2, active: { cooldownMs: 18000, effect: { kind: 'blink', distance: 210 } } },

  // ## Branch 1-2 - Balanced travel stats.
  { id: 'p12', previousId: 'p1', name: 'Light Step', kind: 'passive', icon: '◌', color: '#4a91c4', description: 'Movement speed +15 and weapon damage +3%.', cost: 1, passive: { moveSpeed: 15, damageMultiplier: 1.03 } },
  { id: 'p121', previousId: 'p12', name: 'Wind Reader', kind: 'passive', icon: '≀', color: '#329ca7', description: 'Read openings before they appear. Movement speed +24.', cost: 2, passive: { moveSpeed: 24 } },

  // # Merge-back: either travel branch opens the shared adventurer finish.
  { id: 'p13', previousId: ['a1111', 'p121'], name: 'Survival Instinct', kind: 'passive', icon: '❖', color: '#4b8267', description: 'Convert travel discipline into staying power. Max HP +25 and weapon damage +5%.', cost: 2, passive: { maxHp: 25, damageMultiplier: 1.05 } },
  { id: 'k131', previousId: 'p13', name: 'Unburdened', kind: 'keystone', icon: '⬡', color: '#8b5ac7', description: 'Movement speed is doubled, but weapon damage is halved.', cost: 3, passive: { moveSpeedMultiplier: 2, damageMultiplier: 0.5 } },


  // # Branch 2 - Tank path: maximum HP and durable pressure.
  { id: 'p2', previousId: 'p0', name: 'Entrance of Tank', kind: 'passive', icon: '❤︎', color: '#d94f5f', description: 'Max HP +10.', cost: 1, passive: { maxHp: 10 } },

  // ## Branch 2-1 - Pure health.
  { id: 'p21', previousId: 'p2', name: 'Vitality I', kind: 'passive', icon: '♡', color: '#c85160', description: 'Max HP +5.', cost: 1, passive: { maxHp: 5 } },
  { id: 'p211', previousId: 'p21', name: 'Vitality I', kind: 'passive', icon: '♡', color: '#c85160', description: 'Max HP +5.', cost: 1, passive: { maxHp: 5 } },

  // ## Branch 2-2 - Damage Reduction
  { id: 'p22', previousId: 'p2', name: 'Sturdity I', kind: 'passive', icon: '⬡', color: '#963d53', description: 'Damage Reduction +2.5%.', cost: 1, passive: { damageReduction: 0.025 } },
  { id: 'p221', previousId: 'p22', name: 'Sturdity I', kind: 'passive', icon: '⬡', color: '#963d53', description: 'Damage Reduction +2.5%.', cost: 1, passive: { damageReduction: 0.025 } },

  // # Merge-back
  { id: 'p20', previousId: ['p211', 'p221'], name: 'Health', kind: 'passive', icon: '🌢', color: '#7f4058', description: 'Max HP +5%.', cost: 2, passive: { maxHpMultiplier: 1.05 } },

  // ## Branch 2-0-1 - Pure health
  { id: 'p201', previousId: 'p20', name: 'Vitality II', kind: 'passive', icon: '♡', color: '#c85160', description: 'Max HP +10.', cost: 1, passive: { maxHp: 10 } },
  { id: 'p2011', previousId: 'p201', name: 'Vitality II', kind: 'passive', icon: '♡', color: '#c85160', description: 'Max HP +10.', cost: 1, passive: { maxHp: 10 } },
  { id: 'p20111', previousId: 'p2011', name: 'Energetic', kind: 'passive', icon: '☉', color: '#c85160', description: 'Increase attack by 5% Max Health.', cost: 1, passive: { maxHpDamageRatio: 0.05 } },

  // ### Branch 2-0-1-1 - Low HP fighter: scaling life drain and risky damage conversion.
  { id: 'p201111', previousId: 'p20111', name: 'Life Steal', kind: 'passive', icon: '🙐', color: '#c85160', description: 'Life Steal +2%.', cost: 1, passive: { lifeDrain: 0.02 } },
  { id: 'p2011111', previousId: 'p201111', name: 'Blood Price', kind: 'passive', icon: '🙐', color: '#b94358', description: 'The lower your HP, the more life drain you gain, up to +60%.', cost: 2, passive: { lowHpLifeDrainMax: 0.6 } },
  { id: 'p2011112', previousId: 'p2011111', name: 'Last Drop', kind: 'passive', icon: '🙐', color: '#a83b50', description: 'Life Steal +4% and weapon damage +8%.', cost: 2, passive: { lifeDrain: 0.04, damageMultiplier: 1.08 } },
  { id: 'k2011113', previousId: 'p2011112', name: 'Desperate Might', kind: 'keystone', icon: '✹', color: '#8f2f45', description: 'Below 50% HP, attack is doubled. At or above 50% HP, attack is halved.', cost: 3, passive: { lowHpDamageMultiplier: 2, highHpDamageMultiplier: 0.5 } },


  // ### Branch 2-0-1-2 - High HP fighter: regeneration and full-health pressure.
  { id: 'p201112', previousId: 'p20111', name: 'Regeneration I', kind: 'passive', icon: '🙐', color: '#c85160', description: 'HP Regen +0.5 / s.', cost: 1, passive: { hpRegenPerSecond: 0.5 } },
  { id: 'p2011121', previousId: 'p201112', name: 'Pristine Form', kind: 'passive', icon: '✦', color: '#d0606b', description: 'When HP is full, attack, movement speed, and attack rate x1.2.', cost: 2, passive: { fullHpStatMultiplier: 1.2 } },
  { id: 'p2011122', previousId: 'p2011121', name: 'Regeneration II', kind: 'passive', icon: '🙐', color: '#c85160', description: 'HP Regen +1 / s and Max HP +5%.', cost: 2, passive: { hpRegenPerSecond: 1, maxHpMultiplier: 1.05 } },
  { id: 'k2011123', previousId: 'p2011122', name: 'Dominant Vitality', kind: 'keystone', icon: '✦', color: '#a94356', description: 'At or above 50% HP, attack is doubled. Below 50% HP, attack is halved.', cost: 3, passive: { highHpDamageMultiplier: 2, lowHpDamageMultiplier: 0.5 } },

  // ## Branch 2-0-2 - Anti-Knockback
  { id: 'p202', previousId: 'p20', name: 'Heavy', kind: 'passive', icon: '⬡', color: '#963d53', description: 'Anti-knockback 5%.', cost: 1, passive: { stiffness: 5 } },
  { id: 'p2021', previousId: 'p202', name: 'Heavy', kind: 'passive', icon: '⬡', color: '#963d53', description: 'Anti-knockback 5%.', cost: 1, passive: { stiffness: 5 } },
  { id: 'p20211', previousId: 'p2021', name: 'Rooted Stance', kind: 'passive', icon: '⬡', color: '#7d354d', description: 'Anti-knockback +15% and damage reduction +3%.', cost: 2, passive: { stiffness: 15, damageReduction: 0.03 } },
  { id: 'k202111', previousId: 'p20211', name: 'Immovable', kind: 'keystone', icon: '⬡', color: '#613047', description: 'Movement speed x0.75, anti-knockback +70%, and damage reduction +5%.', cost: 3, passive: { moveSpeedMultiplier: 0.75, stiffness: 70, damageReduction: 0.05 } },

  // ## Branch 2-0-3 - Damage Reduction
  { id: 'p203', previousId: 'p20', name: 'Sturdity II', kind: 'passive', icon: '⬡', color: '#963d53', description: 'Damage Reduction +5%.', cost: 1, passive: { damageReduction: 0.05 } },
  { id: 'p2031', previousId: 'p203', name: 'Sturdity II', kind: 'passive', icon: '⬡', color: '#963d53', description: 'Damage Reduction +5%.', cost: 1, passive: { damageReduction: 0.05 } },
  { id: 'p20311', previousId: 'p2031', name: 'Iron Skin', kind: 'passive', icon: '⬡', color: '#78364b', description: 'Damage Reduction +8% and Max HP +10.', cost: 2, passive: { damageReduction: 0.08, maxHp: 10 } },
  { id: 'k203111', previousId: 'p20311', name: 'Stone Oath', kind: 'keystone', icon: '⬡', color: '#623044', description: 'Weapon damage x0.75, Damage Reduction +15%.', cost: 3, passive: { damageMultiplier: 0.75, damageReduction: 0.15 } },
  

  // # Branch 3 - DPS path: weapon damage and tempo.
  { id: 'p3', previousId: 'p0', name: 'Battle Rhythm', kind: 'passive', icon: '⚔', color: '#c7683b', description: 'Turn momentum into force. Weapon damage +12%.', cost: 1, passive: { damageMultiplier: 1.12 } },

  // ## Branch 3-1 - Fast tempo and burst windows.
  { id: 'p31', previousId: 'p3', name: 'Keen Edge', kind: 'passive', icon: '╱', color: '#bb5b37', description: 'Base Attack +1.', cost: 1, passive: { attack: 1 } },
  { id: 'p311', previousId: 'p31', name: 'Keen Edge II', kind: 'passive', icon: '╱', color: '#bb5b37', description: 'Base Attack +2.', cost: 1, passive: { attack: 2 } },
  { id: 'p3111', previousId: 'p311', name: 'Battle Tempo', kind: 'passive', icon: '⚔', color: '#ad5134', description: 'Weapon damage +10% and movement speed +12.', cost: 2, passive: { damageMultiplier: 1.1, moveSpeed: 12 } },
  { id: 'k31111', previousId: 'p3111', name: 'Fever Pitch', kind: 'keystone', icon: '✹', color: '#8f3b2d', description: 'Max HP -25%, weapon damage x1.35, movement speed x1.15.', cost: 3, passive: { maxHpMultiplier: 0.75, damageMultiplier: 1.35, moveSpeedMultiplier: 1.15 } },

  // ## Branch 3-2 - Heavier strikes, with close-range and long-range sub-branches.
  { id: 'p32', previousId: 'p3', name: 'Heavy Hand', kind: 'passive', icon: '◆', color: '#a94f32', description: 'Weapon damage +2%.', cost: 2, passive: { damageMultiplier: 1.02 } },
  { id: 'p321', previousId: 'p32', name: 'Heavy Hand II', kind: 'passive', icon: '◆', color: '#a94f32', description: 'Weapon damage +4%.', cost: 1, passive: { damageMultiplier: 1.04 } },
  { id: 'p3211', previousId: 'p321', name: 'Close Brutality', kind: 'passive', icon: '◆', color: '#9e472f', description: 'Weapon damage +12% and movement speed +8.', cost: 2, passive: { damageMultiplier: 1.12, moveSpeed: 8 } },
  { id: 'k32111', previousId: 'p3211', name: 'Point Blank Doctrine', kind: 'keystone', icon: '✹', color: '#803728', description: 'Weapon damage x1.25 and Max HP +15.', cost: 3, passive: { damageMultiplier: 1.25, maxHp: 15 } },

  { id: 'p322', previousId: 'p32', name: 'Far Reach', kind: 'passive', icon: '↗', color: '#b65d3c', description: 'Weapon range +12%.', cost: 1, passive: { rangeMultiplier: 1.12 } },
  { id: 'p3221', previousId: 'p322', name: 'Far Reach II', kind: 'passive', icon: '↗', color: '#aa5237', description: 'Weapon range +15% and weapon damage +4%.', cost: 2, passive: { rangeMultiplier: 1.15, damageMultiplier: 1.04 } },
  { id: 'k32211', previousId: 'p3221', name: 'Sniper Discipline', kind: 'keystone', icon: '✦', color: '#873929', description: 'Weapon range x1.35 and weapon damage x1.15, but movement speed x0.9.', cost: 3, passive: { rangeMultiplier: 1.35, damageMultiplier: 1.15, moveSpeedMultiplier: 0.9 } },

  // Branch 4 - Support path: healing access and flexible team utility.
  { id: 'p4', previousId: 'p0', name: 'Field Care', kind: 'passive', icon: '✚', color: '#49a86b', description: 'Max HP +12 and movement speed +6.', cost: 1, passive: { maxHp: 12, moveSpeed: 6 } },

  // ## Branch 4-1 - Direct recovery.
  { id: 'p41', previousId: 'p4', name: 'Bandage Kit', kind: 'passive', icon: '+', color: '#409c63', description: 'Max HP +18.', cost: 1, passive: { maxHp: 18 } },
  { id: 'a411', previousId: 'p41', name: 'First Aid', kind: 'active', icon: '✚', color: '#49a86b', description: 'Restore 20 HP immediately.', cost: 2, active: { cooldownMs: 22000, effect: { kind: 'heal', amount: 20 } } },  

  // ## Branch 4-2 - Mobile support.
  { id: 'p42', previousId: 'p4', name: 'Quick Hands', kind: 'passive', icon: '◇', color: '#3f9a88', description: 'Movement speed +16 and weapon damage +3%.', cost: 1, passive: { moveSpeed: 16, damageMultiplier: 1.03 } },
  { id: 'p421', previousId: 'p42', name: 'Rescue Pace', kind: 'passive', icon: '⌁', color: '#348f7c', description: 'Movement speed +20.', cost: 2, passive: { moveSpeed: 20 } },

  // Merge-back: healer and mobile support both return to the shared support capstone.
  { id: 'p43', previousId: ['a411', 'p421'], name: 'Reliable Aid', kind: 'passive', icon: '✦', color: '#408c68', description: 'Max HP +20 and movement speed +10.', cost: 2, passive: { maxHp: 20, moveSpeed: 10 } },
];
