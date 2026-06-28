import type { AdventureAudioClipId, AdventureAudioCue } from './types';

export type AdventureAudioClipDefinition = {
  id: AdventureAudioClipId;
  name: string;
  file: string;
  source?: string;
};

export type AdventureAudioCueDefinition = {
  clipId: AdventureAudioClipId;
  volume: number;
  rate?: [number, number];
  minIntervalMs: number;
  maxDistance?: number;
};

export const adventureAudioDefaults = {
  rate: [0.9, 1.1] as [number, number],
  maxDistance: 1000,
};

export const adventureAudioClips: AdventureAudioClipDefinition[] = [
  // Common Sounds
  { id: 'sfx-09', name: 'Enemy death', file: 'enemy-death.mp3', source: 'ANIME WEBSITE / Main Anime SFX / Chibi Two' },
  { id: 'sfx-14', name: 'Player death', file: 'menu-close.mp3', source: 'Main Anime SFX / Slide Down' },
  { id: 'sfx-10', name: 'Heal', file: 'heal.mp3', source: 'All Battle SFX / Magic / Healing Magic Two' },
  { id: 'sfx-11', name: 'Coin pickup', file: 'coin-pickup.mp3', source: 'Slice of Life SFX / Money / Bag Change' },
  { id: 'sfx-12', name: 'Blink', file: 'blink.mp3', source: 'All Battle SFX / Video Game Combat / Teleport Punch Two' },
  { id: 'sfx-13', name: 'Scene transition', file: 'scene-transition.mp3', source: 'Slice of Game Show SFX / Main Squeeze / Scene Change Two' }, 

  // UI Sounds
  { id: 'sfx-01', name: 'UI click', file: 'ui-click.mp3', source: 'Slice of Life SFX / TV SFX / Click Two' },
  { id: 'sfx-03', name: 'Menu open', file: 'menu-open.mp3', source: 'Main Anime SFX / Slide Up' },
  { id: 'sfx-04', name: 'Menu close', file: 'menu-close.mp3', source: 'Main Anime SFX / Slide Down' },

  // Weapon Sounds
  { id: 'sfx-melee-01', name: 'Melee attack 01 (default)', file: 'attack-melee-01.mp3', source: 'All Battle SFX / Video Game Combat / Punch' },
  { id: 'sfx-melee-02', name: 'Melee attack 02 (punch/kick)', file: 'attack-melee-02.mp3', source: 'All Battle SFX / Video Game Combat / Kick' },
  { id: 'sfx-melee-03', name: 'Melee attack 03 (punch/kick)', file: 'attack-melee-03.mp3', source: 'All Battle SFX / Video Game Combat / Kick Two' },

  { id: 'sfx-ranged-01', name: 'Ranged attack 01 (default)', file: 'attack-ranged-01.mp3', source: 'All Battle SFX / Weapons / Quickie Whoosh' },

  { id: 'sfx-ranged-hit-01', name: 'Ranged hit 01 (default)', file: 'pop-01.mp3', source: 'Main Anime SFX / POP' },
  { id: 'sfx-ranged-hit-02', name: 'Ranged hit 02', file: 'pop-02.mp3', source: 'Main Anime SFX / POP TWO' },
  { id: 'sfx-ranged-hit-03', name: 'Ranged hit 03', file: 'pop-03.mp3', source: 'Main Anime SFX / POP THREE' },
  
  // Impact sounds
  { id: 'sfx-impact-01', name: 'Flesh impact', file: 'impact-flesh.mp3', source: 'All Battle SFX / Hand Combat Anime Action / Deep Punch' },
  { id: 'sfx-impact-02', name: 'Prop impact', file: 'impact-prop.mp3', source: 'Pickaxe SFX / Dig Two' },
  { id: 'sfx-impact-03', name: 'Plant impact 01', file: 'impact-plant-01.mp3', source: 'Elevenlabs' },
  { id: 'sfx-impact-04', name: 'Plant impact 02', file: 'impact-plant-02.mp3', source: 'Elevenlabs' },
  { id: 'sfx-impact-05', name: 'Rock impact 01', file: 'impact-rock-01.mp3', source: 'Elevenlabs' },
  { id: 'sfx-impact-06', name: 'Rock impact 02', file: 'impact-rock-02.mp3', source: 'Elevenlabs' },
  { id: 'sfx-impact-07', name: 'Wooden impact 01', file: 'impact-wood-01.mp3', source: 'Elevenlabs' },
  { id: 'sfx-impact-08', name: 'Wooden impact 02', file: 'impact-wood-shatter-01.mp3', source: 'Elevenlabs' },
];

export const adventureAudioClipsById = Object.fromEntries(
  adventureAudioClips.map((clip) => [clip.id, clip]),
) as Record<AdventureAudioClipId, AdventureAudioClipDefinition>;

export const adventureAudioCues = {
  'ui-click': { clipId: 'sfx-01', volume: 0.32, minIntervalMs: 35 },
  'menu-open': { clipId: 'sfx-03', volume: 0.28, minIntervalMs: 120 },
  'menu-close': { clipId: 'sfx-04', volume: 0.24, minIntervalMs: 120 },
  'attack-melee': { clipId: 'sfx-melee-01', volume: 0.42, minIntervalMs: 45 },
  'attack-ranged': { clipId: 'sfx-ranged-01', volume: 0.34, minIntervalMs: 55 },
  'weapon-bare-fist-use': { clipId: 'sfx-melee-01', volume: 0.36, minIntervalMs: 45 },
  'weapon-punch-use': { clipId: 'sfx-melee-02', volume: 0.42, minIntervalMs: 45 },
  'weapon-claw-use': { clipId: 'sfx-melee-01', volume: 0.38, minIntervalMs: 45, rate: [1.04, 1.16] },
  'weapon-spark-use': { clipId: 'sfx-ranged-01', volume: 0.34, minIntervalMs: 55 },
  'weapon-spark-hit': { clipId: 'sfx-ranged-hit-01', volume: 0.42, minIntervalMs: 45 },
  'weapon-heart-tether-use': { clipId: 'sfx-ranged-01', volume: 0.28, minIntervalMs: 80, rate: [0.82, 0.96] },
  'weapon-heart-tether-hit': { clipId: 'sfx-ranged-hit-01', volume: 0.5, minIntervalMs: 80, rate: [0.82, 0.98] },
  'impact-flesh': { clipId: 'sfx-impact-01', volume: 0.46, minIntervalMs: 45 },
  'impact-prop': { clipId: 'sfx-impact-02', volume: 0.38, minIntervalMs: 55 },
  'prop-tree-hit': { clipId: 'sfx-impact-04', volume: 0.24, minIntervalMs: 80, rate: [0.92, 1.04] },
  'prop-tree-destroy': { clipId: 'sfx-impact-04', volume: 0.42, minIntervalMs: 160, rate: [0.72, 0.88] },
  'prop-bush-hit': { clipId: 'sfx-impact-03', volume: 0.18, minIntervalMs: 80, rate: [1.04, 1.18] },
  'prop-bush-destroy': { clipId: 'sfx-impact-03', volume: 0.32, minIntervalMs: 160, rate: [0.96, 1.08] },
  'prop-stone-hit': { clipId: 'sfx-impact-05', volume: 0.34, minIntervalMs: 80, rate: [0.78, 0.94] },
  'prop-stone-destroy': { clipId: 'sfx-impact-06', volume: 0.5, minIntervalMs: 160, rate: [0.6, 0.76] },
  'prop-rock-hit': { clipId: 'sfx-impact-05', volume: 0.36, minIntervalMs: 80, rate: [0.8, 0.96] },
  'prop-rock-destroy': { clipId: 'sfx-impact-06', volume: 0.52, minIntervalMs: 160, rate: [0.62, 0.78] },
  'prop-wood-hit': { clipId: 'sfx-impact-07', volume: 0.3, minIntervalMs: 80, rate: [0.94, 1.08] },
  'prop-wood-destroy': { clipId: 'sfx-impact-08', volume: 0.44, minIntervalMs: 160, rate: [0.76, 0.92] },
  'enemy-death': { clipId: 'sfx-09', volume: 0.42, minIntervalMs: 120 },
  'player-death': { clipId: 'sfx-14', volume: 0.42, minIntervalMs: 300, rate: [0.68, 0.76] },
  'heal': { clipId: 'sfx-10', volume: 0.3, minIntervalMs: 120 },
  'coin-pickup': { clipId: 'sfx-11', volume: 0.32, minIntervalMs: 45 },
  'blink': { clipId: 'sfx-12', volume: 0.34, minIntervalMs: 80 },
  'scene-transition': { clipId: 'sfx-13', volume: 0.28, minIntervalMs: 260 },
} satisfies Record<AdventureAudioCue, AdventureAudioCueDefinition>;
