import { GAME_SETTINGS } from '../../shared/settings';
import { drawTerrainVisual } from '../../shared/terrainRenderer';
import { getEquippedWeapon, type AdventureState, type CombatEffect, type EffectiveWeapon, type HandSlot, type Projectile, type PropParticle } from './state';
import { adventureWorld, type WorldObject } from './world';
import { drawBiomeGround } from './world/biomes/render';
import type { AdventureEnemy } from './enemies/types';
import type { AdventureCamera } from './camera';
import { getOutfit } from './outfits';

const unitBodyHeight = 40;
const unitBodyFont = 18;
const unitHandFont = 17;
const unitHandGap = 8;

export function drawScene(canvas: HTMLCanvasElement, camera: AdventureCamera, state: AdventureState, aim: { x: number; y: number }, hoverHand: HandSlot | undefined, now: number) {
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  const width = Math.max(1, Math.floor(rect.width * ratio));
  const height = Math.max(1, Math.floor(rect.height * ratio));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, rect.width, rect.height);

  ctx.fillStyle = '#91b975';
  ctx.fillRect(0, 0, rect.width, rect.height);

  ctx.save();
  ctx.scale(camera.zoom, camera.zoom);
  ctx.translate(-camera.x, -camera.y);
  drawMap(ctx, state.biomeTiles, state.worldObjects, now);
  if (hoverHand) drawWeaponRange(ctx, state, hoverHand);
  drawAimCursor(ctx, aim);
  for (const enemy of state.enemies) drawEnemy(ctx, enemy, now);
  drawPlayer(ctx, state, now);
  for (const projectile of state.projectiles) drawProjectile(ctx, projectile);
  for (const effect of state.effects) drawEffect(ctx, effect, now);
  for (const particle of state.propParticles) drawPropParticle(ctx, particle, now);
  ctx.restore();
}

function drawMap(ctx: CanvasRenderingContext2D, biomeTiles: AdventureState['biomeTiles'], objects: WorldObject[], now: number) {
  drawBiomeGround(ctx, biomeTiles, adventureWorld.width, adventureWorld.height, now);
  ctx.strokeStyle = 'rgba(74, 107, 61, 0.065)';
  ctx.lineWidth = 1;
  for (let x = 0; x < adventureWorld.width; x += GAME_SETTINGS.map.gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, adventureWorld.height);
    ctx.stroke();
  }
  for (let y = 0; y < adventureWorld.height; y += GAME_SETTINGS.map.gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(adventureWorld.width, y);
    ctx.stroke();
  }
  for (const area of adventureWorld.areas) drawArea(ctx, area);
  for (const object of [...objects].sort((a, b) => a.y - b.y)) drawWorldObject(ctx, object, now);
}

function drawArea(ctx: CanvasRenderingContext2D, area: (typeof adventureWorld.areas)[number]) {
  ctx.save();
  ctx.fillStyle = 'rgba(57, 65, 51, 0.5)';
  ctx.font = '900 22px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(area.name, area.x, area.y - area.height / 2 - 28);
  ctx.restore();
}

function drawWorldObject(ctx: CanvasRenderingContext2D, object: WorldObject, now: number) {
  if (object.hp === 0 && (object.hitAt === undefined || now - object.hitAt > 220)) return;
  drawTerrainVisual(ctx, { ...object, destructible: object.hp !== undefined }, now);
  if (object.hp !== undefined && object.maxHp !== undefined && object.hp < object.maxHp) {
    drawHpBar(ctx, object.x - 22, object.y + object.height / 2 + 8, 44, 5, object.hp / object.maxHp, '#8b5a2b');
  }
}

function drawPlayer(ctx: CanvasRenderingContext2D, state: AdventureState, now: number) {
  const leftWeapon = getEquippedWeapon(state, 'left');
  const rightWeapon = getEquippedWeapon(state, 'right');
  const leftActive = state.weaponFlash.some((flash) => flash.hand === 'left');
  const rightActive = state.weaponFlash.some((flash) => flash.hand === 'right');
  drawKaomoji(ctx, {
    x: state.player.x,
    y: state.player.y,
    facing: state.player.facing,
    body: state.character.body,
    leftHand: getVisibleHandGlyph(leftWeapon, leftActive),
    rightHand: getVisibleHandGlyph(rightWeapon, rightActive),
    leftProjectile: leftWeapon?.projectile,
    rightProjectile: rightWeapon?.projectile,
    leftWeaponColor: leftWeapon?.color,
    rightWeaponColor: rightWeapon?.color,
    leftActive,
    rightActive,
    color: state.character.color,
    pillWidth: state.character.pillWidth,
    stroke: '#4777bd',
    selected: true,
    wobble: Math.sin(now / 220) * 1.1,
  });
  const outfit = getOutfit(state.character.outfitId);
  if (outfit.glyph) {
    ctx.save();
    ctx.fillStyle = outfit.color;
    ctx.font = '900 22px "Segoe UI Symbol", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(255,255,255,0.9)';
    ctx.shadowBlur = 4;
    ctx.fillText(outfit.glyph, state.player.x + (outfit.offsetX ?? 0), state.player.y + (outfit.offsetY ?? 0));
    ctx.restore();
  }
  drawHpBar(ctx, state.player.x - 36, state.player.y + 31, 72, 8, state.player.hp / state.player.maxHp, '#4777bd');
}

function drawEnemy(ctx: CanvasRenderingContext2D, enemy: AdventureEnemy, now: number) {
  if (enemy.hp <= 0) return;
  drawKaomoji(ctx, {
    x: enemy.x,
    y: enemy.y,
    facing: enemy.facing,
    body: enemy.body,
    leftHand: enemy.leftHand,
    rightHand: enemy.rightHand,
    color: enemy.color,
    pillWidth: enemy.pillWidth,
    stroke: '#bb3f4d',
    selected: false,
    wobble: Math.sin(now / 380 + enemy.x) * 0.8,
  });
  ctx.save();
  ctx.fillStyle = '#493542';
  ctx.font = '800 18px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(enemy.name, enemy.x, enemy.y - 48);
  drawHpBar(ctx, enemy.x - 48, enemy.y + 32, 96, 9, enemy.hp / enemy.maxHp, '#d94f5f');
  ctx.restore();
}

function drawKaomoji(
  ctx: CanvasRenderingContext2D,
  unit: {
    x: number;
    y: number;
    facing: 'left' | 'right';
    body: string;
    leftHand?: string;
    rightHand?: string;
    leftProjectile?: { glyph: string };
    rightProjectile?: { glyph: string };
    leftWeaponColor?: string;
    rightWeaponColor?: string;
    leftActive?: boolean;
    rightActive?: boolean;
    color: string;
    pillWidth: number;
    stroke: string;
    selected: boolean;
    wobble: number;
  },
) {
  ctx.save();
  ctx.translate(unit.x, unit.y);
  ctx.fillStyle = 'rgba(40, 52, 42, 0.28)';
  ctx.beginPath();
  ctx.ellipse(0, 23, unit.pillWidth / 2, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = unit.color;
  ctx.strokeStyle = unit.stroke;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(-unit.pillWidth / 2, -unitBodyHeight / 2, unit.pillWidth, unitBodyHeight, unitBodyHeight / 2);
  ctx.fill();
  ctx.stroke();
  ctx.save();
  if (unit.facing === 'left') ctx.scale(-1, 1);
  ctx.translate(0, unit.wobble);
  ctx.font = `${unitBodyFont}px "Trebuchet MS", "Segoe UI", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#182033';
  ctx.shadowColor = 'rgba(255,255,255,0.85)';
  ctx.shadowBlur = 4;
  ctx.fillText(unit.body, 0, 0);
  ctx.font = `${unitHandFont}px "Trebuchet MS", "Segoe UI", sans-serif`;
  if (unit.leftHand) {
    const activeAnchor = 0;
    drawHandGlyph(
      ctx,
      unit.leftHand,
      unit.leftActive ? activeAnchor : -unit.pillWidth / 2 + unitHandGap + 6, // to make the hand faces the cursor
      unit.leftActive ? 'left' : 'right',
      unit.leftProjectile?.glyph,
      unit.leftWeaponColor,
    );
  }
  if (unit.rightHand) {
    drawHandGlyph(ctx, unit.rightHand, unit.pillWidth / 2 + unitHandGap, 'left', unit.rightProjectile?.glyph, unit.rightWeaponColor);
  }
  ctx.restore();
  ctx.restore();
}

function drawHandGlyph(
  ctx: CanvasRenderingContext2D,
  template: string,
  anchorX: number,
  align: 'left' | 'right',
  projectileGlyph?: string,
  projectileColor?: string,
) {
  const marker = '{p}';
  if (!template.includes(marker) || !projectileGlyph) {
    ctx.textAlign = align;
    ctx.fillStyle = '#182033';
    ctx.fillText(template.replaceAll(marker, ''), anchorX, 0);
    return;
  }

  const [before, ...afterParts] = template.split(marker);
  const after = afterParts.join(marker);
  const beforeWidth = ctx.measureText(before).width;
  const projectileWidth = ctx.measureText(projectileGlyph).width;
  const afterWidth = ctx.measureText(after).width;
  let x = align === 'right' ? anchorX - beforeWidth - projectileWidth - afterWidth : anchorX;
  ctx.textAlign = 'left';

  ctx.fillStyle = '#182033';
  ctx.fillText(before, x, 0);
  x += beforeWidth;
  ctx.save();
  ctx.fillStyle = projectileColor ?? '#f0a729';
  ctx.shadowColor = projectileColor ?? '#f0a729';
  ctx.shadowBlur = 7;
  ctx.fillText(projectileGlyph, x, 0);
  ctx.restore();
  x += projectileWidth;
  ctx.fillStyle = '#182033';
  ctx.fillText(after, x, 0);
}

function drawProjectile(ctx: CanvasRenderingContext2D, projectile: Projectile) {
  ctx.save();
  ctx.translate(projectile.x, projectile.y);
  ctx.fillStyle = projectile.color;
  ctx.shadowColor = projectile.color;
  ctx.shadowBlur = 8;
  ctx.font = '700 31px "Segoe UI Symbol", "Segoe UI Emoji", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(projectile.glyph, 0, 0);
  ctx.restore();
}

function drawEffect(ctx: CanvasRenderingContext2D, effect: CombatEffect, now: number) {
  if (now < effect.born) return;
  if (effect.kind === 'death') {
    drawDeathEffect(ctx, effect, now);
    return;
  }
  const life = effect.kind === 'damage' ? 950 : 420;
  const t = Math.min(1, (now - effect.born) / life);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (effect.kind === 'damage') {
    ctx.globalAlpha = 1 - Math.max(0, t - 0.72) / 0.28;
    ctx.fillStyle = effect.color;
    ctx.font = '900 25px "Segoe UI", sans-serif';
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(255,255,255,0.88)';
    const y = effect.y - 48 - t * 54;
    ctx.strokeText(effect.glyph, effect.x, y);
    ctx.fillText(effect.glyph, effect.x, y);
  } else {
    const pulse = Math.sin(t * Math.PI);
    ctx.globalAlpha = 1 - Math.max(0, t - 0.72) / 0.28;
    ctx.fillStyle = effect.color;
    ctx.font = `${Math.round((effect.size ?? 42) + pulse * 10)}px "Segoe UI Emoji", "Segoe UI Symbol", sans-serif`;
    ctx.fillText(effect.glyph, effect.x, effect.y);
  }
  ctx.restore();
}

function drawDeathEffect(ctx: CanvasRenderingContext2D, effect: CombatEffect, now: number) {
  const t = Math.min(1, (now - effect.born) / 1250);
  const drift = 1 - Math.pow(1 - t, 2);
  const x = effect.x + ((effect.toX ?? effect.x) - effect.x) * drift;
  const y = effect.y - Math.sin(t * Math.PI) * 128 + Math.pow(t, 2.35) * 270;
  const spin = (effect.team === 'enemy' ? 1 : -1) * t * Math.PI * 1.8;

  ctx.save();
  ctx.globalAlpha = 1 - Math.max(0, t - 0.72) / 0.28;
  drawFxKaomoji(ctx, effect, x, y, spin);
  ctx.restore();
}

function drawFxKaomoji(ctx: CanvasRenderingContext2D, effect: CombatEffect, x: number, y: number, rotation: number) {
  const body = effect.body ?? effect.glyph;
  const bodyWidth = effect.pillWidth ?? 61;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.fillStyle = effect.background ?? '#dcecff';
  ctx.strokeStyle = effect.team === 'enemy' ? '#bb3f4d' : '#4777bd';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(-bodyWidth / 2, -unitBodyHeight / 2, bodyWidth, unitBodyHeight, unitBodyHeight / 2);
  ctx.fill();
  ctx.stroke();

  ctx.font = `${unitBodyFont}px "Trebuchet MS", "Segoe UI", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#182033';
  ctx.shadowColor = 'rgba(255,255,255,0.85)';
  ctx.shadowBlur = 4;
  ctx.fillText(body, 0, 0);
  ctx.font = `${unitHandFont}px "Trebuchet MS", "Segoe UI", sans-serif`;
  if (effect.leftHand) {
    ctx.textAlign = 'right';
    ctx.fillText(effect.leftHand, -bodyWidth / 2 - unitHandGap, 0);
  }
  if (effect.rightHand) {
    ctx.textAlign = 'left';
    ctx.fillText(effect.rightHand, bodyWidth / 2 + unitHandGap, 0);
  }
  ctx.restore();
}

function drawWeaponRange(ctx: CanvasRenderingContext2D, state: AdventureState, hand: HandSlot) {
  const weapon = getEquippedWeapon(state, hand);
  if (!weapon) return;
  ctx.save();
  ctx.strokeStyle = weapon.color;
  ctx.globalAlpha = 0.36;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(state.player.x, state.player.y, weapon.range, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = weapon.color;
  ctx.fill();
  ctx.restore();
}

function drawAimCursor(ctx: CanvasRenderingContext2D, aim: { x: number; y: number }) {
  ctx.save();
  ctx.fillStyle = '#f4b23f';
  ctx.font = '700 24px "Segoe UI Symbol", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('⌖', aim.x, aim.y);
  ctx.restore();
}

function getVisibleHandGlyph(weapon: EffectiveWeapon | undefined, active: boolean) {
  if (!weapon) return '╯';
  return active ? weapon.activeGlyph ?? weapon.handGlyph : weapon.handGlyph;
}

function drawHpBar(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, ratio: number, color: string) {
  ctx.fillStyle = '#2f2630';
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, height / 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x + 1, y + 1, Math.max(0, width - 2) * Math.max(0, Math.min(1, ratio)), height - 2, height / 2);
  ctx.fill();
}

function drawPropParticle(ctx: CanvasRenderingContext2D, particle: PropParticle, now: number) {
  const elapsed = Math.max(0, now - particle.born) / 1000;
  const progress = Math.min(1, (now - particle.born) / particle.life);
  const x = particle.x + particle.vx * elapsed;
  const y = particle.y + particle.vy * elapsed + particle.gravity * elapsed * elapsed * 0.5;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(particle.rotation + particle.spin * elapsed);
  ctx.globalAlpha = Math.max(0, 1 - progress * progress);
  ctx.fillStyle = particle.color;
  ctx.strokeStyle = 'rgba(45, 49, 36, 0.45)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  if (particle.kind === 'stone') {
    ctx.moveTo(-particle.size, 0);
    ctx.lineTo(-particle.size * 0.25, -particle.size * 0.8);
    ctx.lineTo(particle.size, -particle.size * 0.2);
    ctx.lineTo(particle.size * 0.45, particle.size * 0.75);
    ctx.closePath();
  } else if (particle.kind === 'wood') {
    ctx.roundRect(-particle.size, -particle.size * 0.32, particle.size * 2, particle.size * 0.64, 2);
  } else {
    ctx.ellipse(0, 0, particle.size, particle.size * 0.45, 0, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
