import type { ItemRank } from '../loot';
import type { AdventureAudioCue } from '../audio/types';

export type WeaponKind = 'melee' | 'projectile';

export type WeaponAudioDefinition = {
  onUse?: AdventureAudioCue;
  onHit?: AdventureAudioCue;
};

export type WeaponDefinition = {
  id: string;
  name: string;
  rank: ItemRank;
  handGlyph: string;
  activeGlyph?: string;
  kind: WeaponKind;
  description: string;
  damage: number;
  knockback?: number;
  range: number;
  radius: number;
  attackSpeed: number;
  color: string;
  effectGlyph: string;
  effectSize?: number;
  audio?: WeaponAudioDefinition;
  projectile?: {
    glyph: string;
    speed: number;
  };
};
