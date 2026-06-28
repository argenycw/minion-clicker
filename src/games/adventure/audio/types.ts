export type AdventureAudioClipId = string;

export type AdventureAudioCue =
  | 'ui-click'
  | 'menu-open'
  | 'menu-close'
  | 'attack-melee'
  | 'attack-ranged'
  | 'weapon-bare-fist-use'
  | 'weapon-punch-use'
  | 'weapon-claw-use'
  | 'weapon-spark-use'
  | 'weapon-spark-hit'
  | 'weapon-heart-tether-use'
  | 'weapon-heart-tether-hit'
  | 'impact-flesh'
  | 'impact-prop'
  | 'prop-tree-hit'
  | 'prop-tree-destroy'
  | 'prop-bush-hit'
  | 'prop-bush-destroy'
  | 'prop-rock-hit'
  | 'prop-rock-destroy'
  | 'prop-wood-hit'
  | 'prop-wood-destroy'
  | 'prop-stone-hit'
  | 'prop-stone-destroy'
  | 'enemy-death'
  | 'player-death'
  | 'heal'
  | 'coin-pickup'
  | 'blink'
  | 'scene-transition';

export type AdventureAudioPoint = {
  x: number;
  y: number;
};
