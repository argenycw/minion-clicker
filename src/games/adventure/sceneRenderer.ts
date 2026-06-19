import { GAME_SETTINGS } from '../../shared/settings';
import { drawTerrainVisual } from '../../shared/terrainRenderer';
import { getEffectiveWeapon, getEquippedWeapon, type AdventurePlayerState, type AdventureState, type CombatEffect, type EffectiveWeapon, type HandSlot, type Projectile, type PropParticle } from './state';
import type { WorldArea, WorldObject } from './world';
import { drawBiomeGround } from './world/biomes/render';
import { ADVENTURE_CHUNK_SIZE, getChunkOrigin } from './world/chunks/coordinates';
import type { AdventureEnemy } from './enemies/types';
import type { AdventureCamera } from './camera';
import { getOutfit } from './outfits';
import type { GraphicsSettings } from '../../shared/graphicsSettings';
import { getAdventureItem, ITEM_RANK_COLORS, ITEM_RANK_EFFECT_COLORS } from './loot';
import { getDungeonDefinition } from './dungeons/definitions';
import type { DungeonChest, DungeonProp, DungeonRect } from './dungeons/types';
import type { WorldLocation } from './world/locations/types';

const unitBodyHeight = 40;
const unitBodyFont = 18;
const unitHandFont = 17;
const unitHandGap = 8;
type ViewBounds = { left: number; top: number; right: number; bottom: number };
const sortedObjectsCache = new WeakMap<WorldObject[], WorldObject[]>();

export function drawScene(
  canvas: HTMLCanvasElement,
  camera: AdventureCamera,
  state: AdventureState,
  graphics: GraphicsSettings,
  aim: { x: number; y: number },
  hoverHand: HandSlot | undefined,
  interactionPrompt: string | undefined,
  now: number,
) {
  const rect = canvas.getBoundingClientRect();
  const ratio = Math.min(window.devicePixelRatio || 1, graphics.resolutionScale);
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

  const margin = GAME_SETTINGS.performance.cullMargin;
  const bounds: ViewBounds = {
    left: camera.x - margin,
    top: camera.y - margin,
    right: camera.x + rect.width / camera.zoom + margin,
    bottom: camera.y + rect.height / camera.zoom + margin,
  };

  ctx.save();
  ctx.scale(camera.zoom, camera.zoom);
  ctx.translate(-camera.x, -camera.y);
  drawMap(ctx, state, bounds, now, graphics.ambientEffects);
  for (const drop of state.worldDrops) if (isPointVisible(drop, bounds, 120)) drawWorldDrop(ctx, drop, now);
  if (hoverHand) drawWeaponRange(ctx, state, hoverHand);
  if (isPointVisible(aim, bounds, 40)) drawAimCursor(ctx, aim);
  for (const enemy of state.enemies) if (isPointVisible(enemy, bounds, 90)) drawEnemy(ctx, enemy, now);
  for (const playerState of Object.values(state.players)) {
    if (playerState.id !== state.localPlayerId && isPointVisible(playerState.actor, bounds, 90)) {
      drawPlayer(ctx, state, playerState.actor, now, playerState, false);
    }
  }
  drawPlayer(ctx, state, state.player, now, undefined, true);
  if (interactionPrompt) drawInteractionThought(ctx, state.player, interactionPrompt);
  for (const projectile of state.projectiles) if (isPointVisible(projectile, bounds, 50)) drawProjectile(ctx, projectile);
  for (const effect of state.effects) if (isPointVisible(effect, bounds, 160)) drawEffect(ctx, effect, now);
  for (const particle of state.propParticles) if (isPointVisible(particle, bounds, 30)) drawPropParticle(ctx, particle, now);
  ctx.restore();
}

function drawInteractionThought(ctx: CanvasRenderingContext2D, player: AdventureState['player'], prompt: string) {
  ctx.save();
  ctx.font = '900 15px "Segoe UI", sans-serif';
  const width = Math.max(82, ctx.measureText(prompt).width + 28);
  const x = player.x + player.radius + 14;
  const y = player.y - 68;
  ctx.fillStyle = 'rgba(255, 249, 229, 0.96)';
  ctx.strokeStyle = 'rgba(65, 51, 36, 0.76)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, width, 34, 17);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(player.x + player.radius + 6, player.y - 34, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#33291f';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(prompt, x + width / 2, y + 17);
  ctx.restore();
}

function drawWorldDrop(ctx: CanvasRenderingContext2D, drop: AdventureState['worldDrops'][number], now: number) {
  const age = Math.max(0, now - drop.born);
  const bob = Math.sin(age / 220) * 3;
  if (drop.kind === 'coin') {
    drawSpinningCoin(ctx, drop.x, drop.y + bob, getCoinKind(drop.amount ?? 1), age + drop.id.length * 37);
    return;
  }

  ctx.save();
  ctx.translate(drop.x, drop.y + bob);
  if (!drop.itemId) {
    ctx.restore();
    return;
  }
  const item = getAdventureItem(drop.itemId);
  const color = ITEM_RANK_EFFECT_COLORS[item.rank];
  const textColor = ITEM_RANK_COLORS[item.rank];
  const pulse = 0.72 + Math.sin(age / 260) * 0.14;
  const gradient = ctx.createRadialGradient(0, 0, 3, 0, 0, 34);
  gradient.addColorStop(0, `${color}dd`);
  gradient.addColorStop(1, `${color}00`);
  ctx.globalAlpha = pulse;
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(0, 0, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.font = '700 27px "Segoe UI Emoji", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(item.icon, 0, 0);
  ctx.font = '900 14px "Segoe UI", sans-serif';
  const labelWidth = ctx.measureText(item.name).width + 18;
  ctx.fillStyle = 'rgba(20, 22, 27, 0.9)';
  ctx.fillRect(-labelWidth / 2, 24, labelWidth, 24);
  ctx.fillStyle = color;
  ctx.fillText(item.name, 0, 36);
  ctx.restore();
}

function drawSpinningCoin(ctx: CanvasRenderingContext2D, x: number, y: number, kind: CoinKind, age: number) {
  const palette = COIN_PALETTES[kind];
  const squash = Math.max(0.16, Math.abs(Math.cos(age / 180)));
  const radiusX = 8 * squash;
  const radiusY = 11;
  ctx.save();
  ctx.translate(x, y);
  ctx.shadowColor = palette.glow;
  ctx.shadowBlur = 9;
  ctx.fillStyle = palette.fill;
  ctx.strokeStyle = palette.edge;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, 0, radiusX, radiusY, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = palette.shine;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(0, 0, Math.max(0.8, radiusX - 3), Math.max(3.5, radiusY - 3.5), 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

type CoinKind = 'bronze' | 'silver' | 'gold';

const COIN_PALETTES: Record<CoinKind, { fill: string; edge: string; shine: string; glow: string }> = {
  bronze: { fill: '#b76b32', edge: '#713b1f', shine: '#e4a061', glow: '#db7b38' },
  silver: { fill: '#b9c2ca', edge: '#66717c', shine: '#f1f4f6', glow: '#dce8ef' },
  gold: { fill: '#efb33f', edge: '#9b6313', shine: '#ffe28a', glow: '#ffd766' },
};

function getCoinKind(amount: number): CoinKind {
  if (amount >= 10) return 'gold';
  if (amount >= 5) return 'silver';
  return 'bronze';
}

function drawMap(ctx: CanvasRenderingContext2D, state: AdventureState, bounds: ViewBounds, now: number, ambientEffects: boolean) {
  if (state.scene === 'dungeon' && state.dungeon) {
    drawDungeonMap(ctx, state.dungeon, bounds, now);
    return;
  }
  for (const chunk of state.loadedChunks) {
    const origin = getChunkOrigin(chunk.coordinate);
    if (!intersectsBounds(bounds, origin.x, origin.y, ADVENTURE_CHUNK_SIZE, ADVENTURE_CHUNK_SIZE)) continue;
    ctx.save();
    ctx.beginPath();
    ctx.rect(origin.x, origin.y, ADVENTURE_CHUNK_SIZE, ADVENTURE_CHUNK_SIZE);
    ctx.clip();
    drawBiomeGround(ctx, chunk.biomeTiles, ADVENTURE_CHUNK_SIZE, ADVENTURE_CHUNK_SIZE, now, bounds, ambientEffects, origin);
    ctx.restore();
  }
  ctx.strokeStyle = 'rgba(74, 107, 61, 0.065)';
  ctx.lineWidth = 1;
  const firstX = Math.floor(bounds.left / GAME_SETTINGS.map.gridSize) * GAME_SETTINGS.map.gridSize;
  const lastX = bounds.right;
  const firstY = Math.floor(bounds.top / GAME_SETTINGS.map.gridSize) * GAME_SETTINGS.map.gridSize;
  const lastY = bounds.bottom;
  for (let x = firstX; x <= lastX; x += GAME_SETTINGS.map.gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, firstY);
    ctx.lineTo(x, lastY);
    ctx.stroke();
  }
  for (let y = firstY; y <= lastY; y += GAME_SETTINGS.map.gridSize) {
    ctx.beginPath();
    ctx.moveTo(firstX, y);
    ctx.lineTo(lastX, y);
    ctx.stroke();
  }
  for (const area of state.worldAreas) if (isPointVisible(area, bounds, Math.max(area.width, area.height) / 2)) drawArea(ctx, area);
  for (const object of getSortedObjects(state.worldObjects)) {
    if (!isPointVisible(object, bounds, Math.max(object.width, object.height))) continue;
    drawWorldObject(ctx, object, now);
  }
  for (const location of state.worldLocations) if (isPointVisible(location, bounds, 120)) drawWorldLocation(ctx, location, now);
}

function drawDungeonMap(ctx: CanvasRenderingContext2D, dungeon: NonNullable<AdventureState['dungeon']>, bounds: ViewBounds, now: number) {
  const definition = getDungeonDefinition(dungeon.definitionId);
  ctx.fillStyle = definition.colors.void;
  ctx.fillRect(bounds.left, bounds.top, bounds.right - bounds.left, bounds.bottom - bounds.top);
  for (const corridor of dungeon.corridors) drawDungeonRect(ctx, corridor, definition.colors.corridor, definition.colors.floorEdge);
  for (const room of dungeon.rooms) drawDungeonRect(ctx, room, definition.colors.floor, definition.colors.floorEdge);

  ctx.strokeStyle = definition.colors.grid;
  ctx.lineWidth = 1;
  for (const rect of dungeon.walkable) {
    const firstX = Math.ceil(rect.x / GAME_SETTINGS.map.gridSize) * GAME_SETTINGS.map.gridSize;
    const firstY = Math.ceil(rect.y / GAME_SETTINGS.map.gridSize) * GAME_SETTINGS.map.gridSize;
    for (let x = firstX; x < rect.x + rect.width; x += GAME_SETTINGS.map.gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, rect.y);
      ctx.lineTo(x, rect.y + rect.height);
      ctx.stroke();
    }
    for (let y = firstY; y < rect.y + rect.height; y += GAME_SETTINGS.map.gridSize) {
      ctx.beginPath();
      ctx.moveTo(rect.x, y);
      ctx.lineTo(rect.x + rect.width, y);
      ctx.stroke();
    }
  }
  for (const prop of [...dungeon.props].sort((a, b) => a.y - b.y)) drawDungeonProp(ctx, prop);
  drawDungeonExit(ctx, dungeon.exit.x, dungeon.exit.y, now);
  for (const chest of dungeon.chests) drawDungeonChest(ctx, chest, now);
}

function drawDungeonProp(ctx: CanvasRenderingContext2D, prop: DungeonProp) {
  ctx.save();
  ctx.translate(prop.x, prop.y);
  ctx.rotate(prop.rotation);
  ctx.scale(prop.scale, prop.scale);
  ctx.fillStyle = 'rgba(27, 17, 10, 0.28)';
  ctx.beginPath();
  ctx.ellipse(0, 15, 28, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  if (prop.kind === 'rock') {
    ctx.fillStyle = '#756654';
    ctx.strokeStyle = '#493d32';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-25, 10);
    ctx.lineTo(-18, -12);
    ctx.lineTo(2, -22);
    ctx.lineTo(24, -9);
    ctx.lineTo(28, 10);
    ctx.lineTo(8, 20);
    ctx.lineTo(-14, 18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#94836d';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-15, -8);
    ctx.lineTo(2, -15);
    ctx.lineTo(14, -7);
    ctx.stroke();
  } else if (prop.kind === 'stalagmite') {
    ctx.fillStyle = '#6a5947';
    ctx.strokeStyle = '#44372c';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-21, 17);
    ctx.lineTo(-7, -10);
    ctx.lineTo(0, -38);
    ctx.lineTo(9, -8);
    ctx.lineTo(23, 17);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#8b765f';
    ctx.beginPath();
    ctx.moveTo(0, -31);
    ctx.lineTo(-2, 8);
    ctx.stroke();
  } else {
    ctx.strokeStyle = '#d7c8a7';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-20, -10);
    ctx.lineTo(20, 12);
    ctx.moveTo(-18, 13);
    ctx.lineTo(18, -12);
    ctx.stroke();
    ctx.fillStyle = '#e6d9ba';
    for (const [x, y] of [[-22, -12], [22, 14], [-20, 15], [20, -14]] as const) {
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawDungeonRect(ctx: CanvasRenderingContext2D, rect: DungeonRect, fill: string, edge: string) {
  ctx.fillStyle = fill;
  ctx.strokeStyle = edge;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.roundRect(rect.x, rect.y, rect.width, rect.height, 28);
  ctx.fill();
  ctx.stroke();
}

function drawWorldLocation(ctx: CanvasRenderingContext2D, location: WorldLocation, now: number) {
  ctx.save();
  ctx.translate(location.x, location.y);
  const pulse = 1 + Math.sin(now / 500 + location.x) * 0.025;
  ctx.scale(pulse, pulse);
  ctx.fillStyle = 'rgba(27, 31, 30, 0.26)';
  ctx.beginPath();
  ctx.ellipse(0, 34, 66, 20, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#626b66';
  ctx.strokeStyle = '#343b38';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(-66, 26);
  ctx.quadraticCurveTo(-55, -50, 0, -62);
  ctx.quadraticCurveTo(58, -48, 68, 26);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#171b1a';
  ctx.beginPath();
  ctx.ellipse(0, 6, 39, 43, 0, Math.PI, Math.PI * 2);
  ctx.lineTo(39, 27);
  ctx.lineTo(-39, 27);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#f1e7c4';
  ctx.font = '900 18px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(location.name, 0, -78);
  ctx.restore();
}

function drawDungeonExit(ctx: CanvasRenderingContext2D, x: number, y: number, now: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = '#a9d9df';
  ctx.lineWidth = 5;
  ctx.globalAlpha = 0.75 + Math.sin(now / 260) * 0.18;
  ctx.beginPath();
  ctx.ellipse(0, 0, 44, 23, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = 'rgba(126, 210, 221, 0.22)';
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#d8f3f5';
  ctx.font = '800 16px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('EXIT', 0, 5);
  ctx.restore();
}

function drawDungeonChest(ctx: CanvasRenderingContext2D, chest: DungeonChest, now: number) {
  ctx.save();
  ctx.translate(chest.x, chest.y);
  ctx.fillStyle = 'rgba(10, 12, 12, 0.32)';
  ctx.beginPath();
  ctx.ellipse(0, 22, 36, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#51351e';
  ctx.lineWidth = 4;
  ctx.fillStyle = chest.opened ? '#74604c' : '#a66a2e';
  ctx.beginPath();
  ctx.roundRect(-34, chest.opened ? -4 : -18, 68, 40, 8);
  ctx.fill();
  ctx.stroke();
  if (!chest.opened) {
    ctx.fillStyle = '#c98939';
    ctx.beginPath();
    ctx.roundRect(-34, -28, 68, 22, [12, 12, 4, 4]);
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.save();
    ctx.translate(0, -18);
    ctx.rotate(-0.42);
    ctx.fillStyle = '#80613f';
    ctx.fillRect(-34, -8, 68, 16);
    ctx.restore();
  }
  ctx.fillStyle = '#e6c45c';
  ctx.fillRect(-5, chest.opened ? 1 : -13, 10, 15);
  if (!chest.opened) {
    ctx.globalAlpha = 0.5 + Math.sin(now / 300) * 0.2;
    ctx.strokeStyle = '#f4dc86';
    ctx.lineWidth = 2;
    ctx.strokeRect(-40, -34, 80, 64);
  }
  ctx.restore();
}

function intersectsBounds(bounds: ViewBounds, x: number, y: number, width: number, height: number) {
  return x + width >= bounds.left && x <= bounds.right && y + height >= bounds.top && y <= bounds.bottom;
}

function getSortedObjects(objects: WorldObject[]) {
  const cached = sortedObjectsCache.get(objects);
  if (cached) return cached;
  const sorted = [...objects].sort((a, b) => a.y - b.y);
  sortedObjectsCache.set(objects, sorted);
  return sorted;
}

function isPointVisible(point: { x: number; y: number }, bounds: ViewBounds, margin = 0) {
  return point.x >= bounds.left - margin && point.x <= bounds.right + margin && point.y >= bounds.top - margin && point.y <= bounds.bottom + margin;
}


function drawArea(ctx: CanvasRenderingContext2D, area: WorldArea) {
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

function drawPlayer(
  ctx: CanvasRenderingContext2D,
  state: AdventureState,
  player: AdventureState['player'],
  now: number,
  playerState?: AdventurePlayerState,
  selected = true,
) {
  const character = playerState?.character ?? state.character;
  const leftWeapon = playerState ? getEquippedWeaponForPlayer(playerState, 'left') : getEquippedWeapon(state, 'left');
  const rightWeapon = playerState ? getEquippedWeaponForPlayer(playerState, 'right') : getEquippedWeapon(state, 'right');
  const flashes = playerState?.weaponFlash ?? state.weaponFlash;
  const leftActive = flashes.some((flash) => flash.hand === 'left');
  const rightActive = flashes.some((flash) => flash.hand === 'right');
  drawKaomoji(ctx, {
    x: player.x,
    y: player.y,
    facing: player.facing,
    body: character.body,
    leftHand: getVisibleHandGlyph(leftWeapon, leftActive),
    rightHand: getVisibleHandGlyph(rightWeapon, rightActive),
    leftProjectile: leftWeapon?.projectile,
    rightProjectile: rightWeapon?.projectile,
    leftWeaponColor: leftWeapon?.color,
    rightWeaponColor: rightWeapon?.color,
    leftActive,
    rightActive,
    color: character.color,
    pillWidth: character.pillWidth,
    stroke: selected ? '#4777bd' : '#59666b',
    selected,
    wobble: Math.sin(now / 220) * 1.1,
  });
  const outfit = getOutfit(character.outfitId);
  if (outfit.glyph) {
    ctx.save();
    ctx.fillStyle = outfit.color;
    ctx.font = '900 22px "Segoe UI Symbol", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(255,255,255,0.9)';
    ctx.shadowBlur = 4;
    ctx.fillText(outfit.glyph, player.x + (outfit.offsetX ?? 0), player.y + (outfit.offsetY ?? 0));
    ctx.restore();
  }
  drawHpBar(ctx, player.x - 36, player.y + 31, 72, 8, player.hp / player.maxHp, '#4777bd');
}

function getEquippedWeaponForPlayer(player: AdventurePlayerState, hand: HandSlot): EffectiveWeapon | undefined {
  const weaponInstanceId = hand === 'left' ? player.character.leftWeaponInstanceId : player.character.rightWeaponInstanceId;
  const fallback = player.inventory.weapons.find((weapon) => weapon.baseWeaponId === 'melee-00');
  const resolvedId = weaponInstanceId ?? fallback?.id;
  return resolvedId ? getEffectiveWeapon(player, resolvedId) : undefined;
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
