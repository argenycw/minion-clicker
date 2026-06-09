import { useEffect, useRef } from 'react';
import { LocateFixed } from 'lucide-react';
import { getUnit } from '../game/content';
import { CastleEntity, CombatEvent, GameState, ProjectileEntity, UnitEntity, world } from '../game/state';
import { GAME_SETTINGS } from '../game/settings';

type Props = {
  state: GameState;
  onSelectUnit: (unitId?: string) => void;
  onSelectUnits: (unitIds: string[]) => void;
  onSelectCastle: (castleId: string) => void;
  onSelectBase: () => void;
  onClearSelection: () => void;
  onCommand: (x: number, y: number, targetId?: string) => void;
};

type Camera = {
  x: number;
  y: number;
  zoom: number;
};

type Fx = CombatEvent & {
  born: number;
  life: number;
};

const minZoom = 0.25;
const maxZoom = 2.00;
const unitBodyHeight = 38;
const unitBodyFont = 17;
const unitHandFont = 16;
const unitHandGap = 7;
const initialCamera = {
  x: world.spawnPlayer.x - GAME_SETTINGS.map.initialViewportWidth / GAME_SETTINGS.map.initialZoom / 2,
  y: world.spawnPlayer.y - GAME_SETTINGS.map.initialViewportHeight / GAME_SETTINGS.map.initialZoom / 2,
  zoom: GAME_SETTINGS.map.initialZoom,
};

export function Battlefield({ state, onSelectUnit, onSelectUnits, onSelectCastle, onSelectBase, onClearSelection, onCommand }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef(state);
  const cameraRef = useRef<Camera>(clampCamera(initialCamera));
  const dragRef = useRef({
    active: false,
    moved: false,
    mode: 'none' as 'none' | 'pan' | 'select',
    x: 0,
    y: 0,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
  });
  const keysRef = useRef(new Set<string>());
  const touchPointsRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef<{ distance: number; center: { x: number; y: number } } | undefined>(undefined);
  const fxRef = useRef<Fx[]>([]);
  const pingRef = useRef<Array<{ id: number; born: number; x: number; y: number; kind: string }>>([]);
  const seenEvents = useRef(new Set<number>());
  const seenPings = useRef(new Set<number>());
  const handlersRef = useRef({ onSelectUnit, onSelectUnits, onSelectCastle, onSelectBase, onClearSelection, onCommand });

  stateRef.current = state;
  handlersRef.current = { onSelectUnit, onSelectUnits, onSelectCastle, onSelectBase, onClearSelection, onCommand };

  const centerOnSpawn = () => {
    const canvas = canvasRef.current;
    const rect = canvas?.getBoundingClientRect();
    const width = rect?.width ?? GAME_SETTINGS.map.initialViewportWidth;
    const height = rect?.height ?? GAME_SETTINGS.map.initialViewportHeight;
    const zoom = cameraRef.current.zoom;
    cameraRef.current = clampCamera({
      ...cameraRef.current,
      x: world.spawnPlayer.x - width / zoom / 2,
      y: world.spawnPlayer.y - height / zoom / 2,
    });
  };

  useEffect(() => {
    for (const event of state.combatEvents) {
      if (seenEvents.current.has(event.id)) continue;
      seenEvents.current.add(event.id);
      fxRef.current.push({
        ...event,
        born: performance.now(),
        life: event.glyph === '♥' || event.glyph === '✧' ? 640 : 360,
      });
    }
  }, [state.combatEvents]);

  useEffect(() => {
    for (const ping of state.mapPings) {
      if (seenPings.current.has(ping.id)) continue;
      seenPings.current.add(ping.id);
      pingRef.current.push({ ...ping, born: performance.now() });
    }
  }, [state.mapPings]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const toWorld = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      const camera = cameraRef.current;
      return {
        x: (clientX - rect.left) / camera.zoom + camera.x,
        y: (clientY - rect.top) / camera.zoom + camera.y,
      };
    };

    const onPointerDown = (event: PointerEvent) => {
      event.preventDefault();
      canvas.setPointerCapture(event.pointerId);
      if (event.pointerType === 'touch') touchPointsRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      const touchPan = event.pointerType === 'touch' && touchPointsRef.current.size >= 2;
      const center = touchPan ? touchCenter(touchPointsRef.current) : { x: event.clientX, y: event.clientY };
      if (touchPan) {
        pinchRef.current = { distance: touchDistance(touchPointsRef.current), center };
      }
      const mode = touchPan ? 'pan' : event.button === 0 ? 'select' : event.button === 1 || event.button === 2 ? 'pan' : 'none';
      dragRef.current = {
        active: true,
        moved: false,
        mode,
        x: center.x,
        y: center.y,
        startX: center.x,
        startY: center.y,
        currentX: center.x,
        currentY: center.y,
      };
      if (mode === 'pan') canvas.classList.add('is-panning');
    };

    const onPointerMove = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag.active) return;
      if (event.pointerType === 'touch' && touchPointsRef.current.has(event.pointerId)) {
        touchPointsRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      }
      const touchPan = event.pointerType === 'touch' && touchPointsRef.current.size >= 2;
      if (touchPan) drag.mode = 'pan';
      const point = touchPan ? touchCenter(touchPointsRef.current) : { x: event.clientX, y: event.clientY };
      const dx = point.x - drag.x;
      const dy = point.y - drag.y;
      if (Math.hypot(dx, dy) > 3) drag.moved = true;
      drag.x = point.x;
      drag.y = point.y;
      drag.currentX = point.x;
      drag.currentY = point.y;
      if (drag.mode === 'pan') {
        canvas.classList.add('is-panning');
        if (touchPan) {
          const distance = touchDistance(touchPointsRef.current);
          const previous = pinchRef.current ?? { distance, center: point };
          const before = toWorld(previous.center.x, previous.center.y);
          const zoom = clamp(cameraRef.current.zoom * (distance / Math.max(1, previous.distance)), minZoom, maxZoom);
          const rect = canvas.getBoundingClientRect();
          cameraRef.current = clampCamera({
            zoom,
            x: before.x - (point.x - rect.left) / zoom,
            y: before.y - (point.y - rect.top) / zoom,
          });
          pinchRef.current = { distance, center: point };
        } else {
          cameraRef.current = clampCamera({
            ...cameraRef.current,
            x: cameraRef.current.x - dx / cameraRef.current.zoom,
            y: cameraRef.current.y - dy / cameraRef.current.zoom,
          });
        }
      }
    };

    const onPointerUp = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (event.pointerType === 'touch') touchPointsRef.current.delete(event.pointerId);
      if (touchPointsRef.current.size < 2) pinchRef.current = undefined;
      drag.active = false;
      canvas.classList.remove('is-panning');
      if (drag.mode === 'pan' && drag.moved) return;
      const point = toWorld(event.clientX, event.clientY);

      if (drag.mode === 'select' && drag.moved) {
        const start = toWorld(drag.startX, drag.startY);
        const end = toWorld(event.clientX, event.clientY);
        const left = Math.min(start.x, end.x);
        const right = Math.max(start.x, end.x);
        const top = Math.min(start.y, end.y);
        const bottom = Math.max(start.y, end.y);
        const unitIds = stateRef.current.units
          .filter((unit) => {
            if (unit.team !== 'player') return false;
            if (getUnit(unit.defId).kind !== 'combat') return false;
            return unit.x >= left && unit.x <= right && unit.y >= top && unit.y <= bottom;
          })
          .map((unit) => unit.id);
        handlersRef.current.onSelectUnits(unitIds);
        return;
      }

      if (event.button === 2) {
        const clickedUnit = hitUnit(point.x, point.y, stateRef.current.units);
        if (clickedUnit?.team === 'enemy') {
          handlersRef.current.onCommand(clickedUnit.x, clickedUnit.y, clickedUnit.id);
          return;
        }
        const clickedCastle = hitCastle(point.x, point.y, stateRef.current.enemyCastles);
        if (clickedCastle) {
          handlersRef.current.onCommand(clickedCastle.x, clickedCastle.y, clickedCastle.id);
          return;
        }
        handlersRef.current.onCommand(point.x, point.y);
        return;
      }
      if (drag.mode === 'pan') return;

      const clickedUnit = hitUnit(point.x, point.y, stateRef.current.units);
      if (event.pointerType === 'touch' && stateRef.current.selectedUnitIds.length > 0 && clickedUnit?.team === 'enemy') {
        handlersRef.current.onCommand(clickedUnit.x, clickedUnit.y, clickedUnit.id);
        return;
      }
      if (clickedUnit) {
        handlersRef.current.onSelectUnit(clickedUnit.id);
        return;
      }
      const clickedCastle = hitCastle(point.x, point.y, stateRef.current.enemyCastles);
      if (event.pointerType === 'touch' && stateRef.current.selectedUnitIds.length > 0 && clickedCastle) {
        handlersRef.current.onCommand(clickedCastle.x, clickedCastle.y, clickedCastle.id);
        return;
      }
      if (clickedCastle) {
        handlersRef.current.onSelectCastle(clickedCastle.id);
        return;
      }
      if (hitBase(point.x, point.y)) {
        handlersRef.current.onSelectBase();
        return;
      }
      if (event.pointerType === 'touch' && stateRef.current.selectedUnitIds.length > 0) {
        handlersRef.current.onCommand(point.x, point.y);
        return;
      }
      handlersRef.current.onClearSelection();
    };

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const before = toWorld(event.clientX, event.clientY);
      const zoom = clamp(cameraRef.current.zoom * (event.deltaY > 0 ? 0.9 : 1.1), minZoom, maxZoom);
      const rect = canvas.getBoundingClientRect();
      cameraRef.current = clampCamera({
        zoom,
        x: before.x - (event.clientX - rect.left) / zoom,
        y: before.y - (event.clientY - rect.top) / zoom,
      });
    };

    const onContextMenu = (event: MouseEvent) => event.preventDefault();
    const isPanKey = (key: string) => ['w', 'a', 's', 'd', 'arrowup', 'arrowleft', 'arrowdown', 'arrowright'].includes(key);
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (!isPanKey(key)) return;
      event.preventDefault();
      keysRef.current.add(key);
    };
    const onKeyUp = (event: KeyboardEvent) => {
      keysRef.current.delete(event.key.toLowerCase());
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('contextmenu', onContextMenu);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('contextmenu', onContextMenu);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let frame = 0;
    let lastNow = performance.now();

    const render = (now: number) => {
      const delta = Math.min((now - lastNow) / 1000, 0.05);
      lastNow = now;
      applyKeyboardPan(keysRef.current, cameraRef.current, delta);
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const width = Math.max(320, Math.floor(rect.width));
      const height = Math.max(320, Math.floor(rect.height));

      if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      drawScene(ctx, width, height, cameraRef.current, stateRef.current, fxRef.current, pingRef.current, dragRef.current, now);
      fxRef.current = fxRef.current.filter((fx) => now - fx.born < getFxLife(fx));
      pingRef.current = pingRef.current.filter((ping) => now - ping.born < 850);
      frame = requestAnimationFrame(render);
    };

    frame = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <section className="battlefield-wrap" aria-label="top-down map">
      <canvas ref={canvasRef} className="battlefield-canvas" />
      <button className="home-camera-button" type="button" onClick={centerOnSpawn} title="Return to base" aria-label="Return to base">
        <LocateFixed size={21} />
      </button>
      <div className="map-hint">L select · R command · M/R drag pan · Wheel zoom</div>
    </section>
  );
}

function drawScene(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  camera: Camera,
  state: GameState,
  fx: Fx[],
  pings: Array<{ id: number; born: number; x: number; y: number; kind: string }>,
  drag: {
    active: boolean;
    moved: boolean;
    mode: 'none' | 'pan' | 'select';
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  },
  now: number,
) {
  ctx.fillStyle = '#9ac27c';
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.scale(camera.zoom, camera.zoom);
  ctx.translate(-camera.x, -camera.y);

  drawMap(ctx);
  drawBase(ctx);
  for (const castle of state.enemyCastles) drawCastle(ctx, castle);
  for (const ping of pings) drawPing(ctx, ping, now);
  for (const unit of state.units) {
    if (unit.team === 'player' && getUnit(unit.defId).kind === 'worker') continue;
    drawUnit(ctx, unit, state.selectedUnitIds.includes(unit.id) || state.selection.kind === 'unit' && state.selection.unitId === unit.id, now);
  }
  for (const projectile of state.projectiles) drawProjectile(ctx, projectile);
  for (const effect of fx) drawEffect(ctx, effect, now);

  ctx.restore();

  if (drag.active && drag.mode === 'select' && drag.moved) {
    drawSelectionBox(ctx, drag);
  }
}

function drawMap(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = '#b7d889';
  ctx.fillRect(0, 0, world.width, world.height);

  ctx.strokeStyle = 'rgba(74, 107, 61, 0.16)';
  ctx.lineWidth = 2;
  for (let x = 0; x < world.width; x += GAME_SETTINGS.map.gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, world.height);
    ctx.stroke();
  }
  for (let y = 0; y < world.height; y += GAME_SETTINGS.map.gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(world.width, y);
    ctx.stroke();
  }

  for (const prop of world.terrainProps) {
    drawTerrainProp(ctx, prop.kind, prop.x, prop.y, prop.size, prop.rotation);
  }
}

function drawTerrainProp(ctx: CanvasRenderingContext2D, kind: string, x: number, y: number, size: number, rotation: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.scale(size, size);

  if (kind === 'tree') {
    ctx.fillStyle = 'rgba(49, 113, 56, 0.28)';
    ctx.beginPath();
    ctx.ellipse(0, 3, 22, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#5f8e3f';
    ctx.beginPath();
    ctx.arc(-8, -6, 13, 0, Math.PI * 2);
    ctx.arc(8, -7, 15, 0, Math.PI * 2);
    ctx.arc(0, -18, 13, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === 'rock') {
    ctx.fillStyle = '#8f9187';
    ctx.beginPath();
    ctx.ellipse(0, 0, 16, 11, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.beginPath();
    ctx.ellipse(-5, -4, 6, 3, -0.4, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === 'flower') {
    ctx.fillStyle = '#d95f91';
    for (let i = 0; i < 5; i += 1) {
      ctx.beginPath();
      ctx.arc(Math.cos(i * 1.26) * 7, Math.sin(i * 1.26) * 7, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#f3d64f';
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === 'mushroom') {
    ctx.fillStyle = '#f4ead1';
    ctx.fillRect(-4, -2, 8, 13);
    ctx.fillStyle = '#c94d5d';
    ctx.beginPath();
    ctx.arc(0, -4, 12, Math.PI, 0);
    ctx.fill();
  } else {
    ctx.fillStyle = '#8a6740';
    ctx.beginPath();
    ctx.ellipse(0, 0, 12, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(60, 42, 24, 0.35)';
    ctx.stroke();
  }

  ctx.restore();
}

function drawBase(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.translate(world.spawnPlayer.x, world.spawnPlayer.y);
  ctx.fillStyle = 'rgba(76, 175, 111, 0.08)';
  ctx.strokeStyle = 'rgba(64, 156, 94, 0.42)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, 0, GAME_SETTINGS.combat.playerBaseHealRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = 'rgba(47, 73, 42, 0.5)';
  ctx.beginPath();
  ctx.ellipse(0, 28, 64, 20, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 255, 255, 1)';
  ctx.font = '76px "Segoe UI Emoji", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🏕️', 0, 0);
  ctx.fillStyle = '#243824';
  ctx.font = '700 20px "Segoe UI", sans-serif';
  ctx.fillText('You are here', 0, 66);
  ctx.restore();
}

function drawCastle(ctx: CanvasRenderingContext2D, castle: CastleEntity) {
  if (castle.hp <= 0) return;
  ctx.save();
  ctx.translate(castle.x, castle.y);

  ctx.fillStyle = 'rgba(70, 45, 42, 0.5)';
  ctx.beginPath();
  ctx.ellipse(0, 42, 76, 18, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(255, 255, 255, 1)';
  ctx.font = '104px "Segoe UI Emoji", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(castle.symbol, 0, 0);

  ctx.fillStyle = '#493542';
  ctx.font = '800 20px "Segoe UI", sans-serif';
  ctx.fillText(castle.name, 0, 90);

  drawHpBar(ctx, -78, -90, 156, 14, castle.hp / castle.maxHp, '#e24d5b');
  ctx.strokeStyle = 'rgba(219, 58, 75, 0.2)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, castle.aggroRadius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

function drawUnit(ctx: CanvasRenderingContext2D, unit: UnitEntity, selected: boolean, now: number) {
  const definition = getUnit(unit.defId);
  const faceWobble = Math.sin(now / 240 + unit.x * 0.01) * 1.2;
  const isEnemy = unit.team === 'enemy';
  const isAttacking = Boolean(unit.lastAttackAt && now - unit.lastAttackAt < 320);
  const isWorking = definition.kind === 'worker' && definition.coinsPerSecond && Math.sin(now / 360 + unit.x) > 0.58;
  const body = isAttacking ? definition.attackBody : isWorking && definition.workBody ? definition.workBody : definition.body;
  const useAttackHands = isAttacking && definition.type === 'ranged';
  const leftHand = useAttackHands ? definition.attackLeftHand : isWorking ? definition.workLeftHand ?? definition.leftHand : definition.leftHand;
  const rightHand = useAttackHands ? definition.attackRightHand : isWorking ? definition.workRightHand ?? definition.rightHand : definition.rightHand;
  const bodyWidth = definition.pillWidth;

  ctx.save();
  ctx.translate(unit.x, unit.y);
  ctx.fillStyle = 'rgba(40, 52, 42, 0.28)';
  ctx.beginPath();
  ctx.ellipse(0, 22, bodyWidth / 2, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = definition.background;
  ctx.strokeStyle = isEnemy ? '#bb3f4d' : '#4777bd';
  ctx.lineWidth = selected ? 4 : 2;
  ctx.beginPath();
  ctx.roundRect(-bodyWidth / 2, -unitBodyHeight / 2, bodyWidth, unitBodyHeight, unitBodyHeight / 2);
  ctx.fill();
  ctx.stroke();

  ctx.save();
  if (unit.facing === 'left') ctx.scale(-1, 1);
  ctx.translate(0, faceWobble);
  ctx.font = `${unitBodyFont}px "Trebuchet MS", "Segoe UI", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#182033';
  ctx.shadowColor = 'rgba(255,255,255,0.85)';
  ctx.shadowBlur = 4;
  ctx.fillText(body, 0, 0);
  ctx.font = `${unitHandFont}px "Trebuchet MS", "Segoe UI", sans-serif`;
  if (leftHand) {
    ctx.fillText(leftHand, -bodyWidth / 2 - unitHandGap, 0);
  }
  if (rightHand) {
    ctx.fillText(rightHand, bodyWidth / 2 + unitHandGap, 0);
  }
  ctx.restore();

  drawHpBar(ctx, -31, 26, 62, 7, unit.hp / unit.maxHp, isEnemy ? '#d94f5f' : '#4777bd');

  if (selected) {
    ctx.strokeStyle = 'rgba(244, 178, 63, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, definition.range, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawProjectile(ctx: CanvasRenderingContext2D, projectile: ProjectileEntity) {
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

function drawEffect(ctx: CanvasRenderingContext2D, effect: Fx, now: number) {
  if (effect.kind === 'spawn') {
    drawSpawnEffect(ctx, effect, now);
    return;
  }
  if (effect.kind === 'death') {
    drawDeathEffect(ctx, effect, now);
    return;
  }
  if (effect.kind === 'castle-destroyed') {
    drawCastleDestroyedEffect(ctx, effect, now);
    return;
  }
  if (effect.kind === 'impact') {
    drawImpactEffect(ctx, effect, now);
    return;
  }

  const t = (now - effect.born) / getFxLife(effect);
  const projectileLike = effect.glyph === '♥' || effect.glyph === '✧';
  const travel = projectileLike ? 1 - Math.pow(1 - Math.min(1, t), 3) : Math.min(1, t * 2);
  const arc = projectileLike ? Math.sin(travel * Math.PI) * 36 : 0;
  const x = effect.fromX + (effect.toX - effect.fromX) * travel;
  const y = effect.fromY + (effect.toY - effect.fromY) * travel - arc;

  ctx.save();
  ctx.globalAlpha = 1 - Math.max(0, t - 0.75) * 4;
  ctx.fillStyle = effect.color;
  ctx.font = `700 ${projectileLike ? 34 : 28}px "Segoe UI Symbol", "Segoe UI Emoji", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(effect.glyph, x, y);
  if (effect.text && t > 0.25) {
    ctx.fillStyle = '#7c2431';
    ctx.font = '900 25px "Segoe UI", sans-serif';
    ctx.fillText(effect.text, effect.toX, effect.toY - 48 - (t - 0.25) * 46);
  }
  ctx.restore();
}

function drawImpactEffect(ctx: CanvasRenderingContext2D, effect: Fx, now: number) {
  const t = Math.min(1, (now - effect.born) / getFxLife(effect));
  const pulse = Math.sin(Math.min(1, t * 1.35) * Math.PI);
  const alpha = 1 - Math.max(0, t - 0.7) / 0.3;

  ctx.save();
  ctx.translate(effect.toX, effect.toY);
  ctx.globalAlpha = alpha;
  if (effect.glyph) {
    ctx.font = `${Math.round(24 + pulse * 8)}px "Segoe UI Emoji", "Segoe UI Symbol", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = effect.color;
    ctx.fillText(effect.glyph, 0, -4);
  }

  if (effect.text && t > 0.16) {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#7c2431';
    ctx.font = '900 25px "Segoe UI", sans-serif';
    ctx.fillText(effect.text, 0, -52 - (t - 0.16) * 48);
  }
  ctx.restore();
}

function getFxLife(effect: Fx) {
  if (effect.kind === 'death') return 1250;
  if (effect.kind === 'spawn') return 720;
  if (effect.kind === 'castle-destroyed') return 1200;
  if (effect.text) return Math.max(effect.life, 950);
  return effect.life;
}

function drawSpawnEffect(ctx: CanvasRenderingContext2D, effect: Fx, now: number) {
  const t = Math.min(1, (now - effect.born) / getFxLife(effect));

  ctx.save();
  ctx.translate(effect.fromX, effect.fromY);
  ctx.globalAlpha = 0.5 * (1 - t);
  ctx.fillStyle = '#f4f0df';
  for (let i = 0; i < 5; i += 1) {
    const angle = i * 1.26;
    const radius = 16 + t * 38;
    ctx.beginPath();
    ctx.ellipse(Math.cos(angle) * radius, Math.sin(angle) * radius * 0.58, 28 - t * 7, 16 - t * 3, angle, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 0.9;
  ctx.strokeStyle = effect.team === 'enemy' ? 'rgba(187, 63, 77, 0.38)' : 'rgba(71, 119, 189, 0.38)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, 0, 22 + Math.sin(t * Math.PI) * 12, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawDeathEffect(ctx: CanvasRenderingContext2D, effect: Fx, now: number) {
  const t = Math.min(1, (now - effect.born) / getFxLife(effect));
  const drift = 1 - Math.pow(1 - t, 2);
  const x = effect.fromX + (effect.toX - effect.fromX) * drift;
  const y = effect.fromY - Math.sin(t * Math.PI) * 128 + Math.pow(t, 2.35) * 270;
  const spin = (effect.team === 'enemy' ? 1 : -1) * t * Math.PI * 1.8;

  ctx.save();
  ctx.globalAlpha = 1 - Math.max(0, t - 0.72) / 0.28;
  drawFxKaomoji(ctx, effect, x, y, spin);
  ctx.restore();
}

function drawCastleDestroyedEffect(ctx: CanvasRenderingContext2D, effect: Fx, now: number) {
  const t = Math.min(1, (now - effect.born) / getFxLife(effect));

  ctx.save();
  ctx.translate(effect.fromX, effect.fromY);
  ctx.globalAlpha = 1 - t;
  ctx.strokeStyle = '#fff0a8';
  ctx.lineWidth = 5;
  for (let i = 0; i < 12; i += 1) {
    const angle = (i / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * (26 + t * 30), Math.sin(angle) * (26 + t * 30));
    ctx.lineTo(Math.cos(angle) * (80 + t * 145), Math.sin(angle) * (80 + t * 145));
    ctx.stroke();
  }
  ctx.font = `${Math.round(88 + t * 70)}px "Segoe UI Emoji", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('💥', 0, 0);
  if (effect.text) {
    ctx.globalAlpha = Math.max(0, 0.45 - t);
    ctx.font = '104px "Segoe UI Emoji", sans-serif';
    ctx.fillText(effect.text, 0, -8 + t * 90);
  }
  ctx.restore();
}

function drawFxKaomoji(ctx: CanvasRenderingContext2D, effect: Fx, x: number, y: number, rotation: number) {
  const body = effect.body ?? effect.glyph;
  const bodyWidth = effect.pillWidth ?? GAME_SETTINGS.ui.defaultMinionPillWidth;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.fillStyle = effect.background ?? '#dcecff';
  ctx.strokeStyle = effect.team === 'enemy' ? '#bb3f4d' : '#4777bd';
  ctx.lineWidth = 2;
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
  if (effect.leftHand) ctx.fillText(effect.leftHand, -bodyWidth / 2 - unitHandGap, 0);
  if (effect.rightHand) ctx.fillText(effect.rightHand, bodyWidth / 2 + unitHandGap, 0);
  ctx.restore();
}

function drawPing(ctx: CanvasRenderingContext2D, ping: { born: number; x: number; y: number; kind: string }, now: number) {
  const age = now - ping.born;
  const t = Math.min(1, age / 850);
  const radius = 18 + t * 34;
  const color = ping.kind === 'attack' ? '#d94f5f' : ping.kind === 'select' ? '#f4b23f' : '#4777bd';
  const glyph = ping.kind === 'attack' ? '⚔' : ping.kind === 'select' ? '✓' : ping.kind === 'clear' ? '·' : '⌖';

  ctx.save();
  ctx.globalAlpha = 1 - t;
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(ping.x, ping.y, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.font = '700 28px "Segoe UI Symbol", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(glyph, ping.x, ping.y);
  ctx.restore();
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

function hitUnit(x: number, y: number, units: UnitEntity[]) {
  return [...units].reverse().find((unit) => getUnit(unit.defId).kind === 'combat' && Math.hypot(unit.x - x, unit.y - y) < 48);
}

function hitCastle(x: number, y: number, castles: CastleEntity[]) {
  return castles.find((castle) => castle.hp > 0 && Math.abs(x - castle.x) < 74 && Math.abs(y - castle.y) < 88);
}

function hitBase(x: number, y: number) {
  return Math.abs(x - world.spawnPlayer.x) < 86 && Math.abs(y - world.spawnPlayer.y) < 86;
}

function drawSelectionBox(
  ctx: CanvasRenderingContext2D,
  drag: { startX: number; startY: number; currentX: number; currentY: number },
) {
  const x = Math.min(drag.startX, drag.currentX);
  const y = Math.min(drag.startY, drag.currentY);
  const width = Math.abs(drag.currentX - drag.startX);
  const height = Math.abs(drag.currentY - drag.startY);
  ctx.save();
  ctx.fillStyle = 'rgba(71, 119, 189, 0.12)';
  ctx.strokeStyle = 'rgba(71, 119, 189, 0.85)';
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 6]);
  ctx.fillRect(x, y, width, height);
  ctx.strokeRect(x, y, width, height);
  ctx.restore();
}

function clampCamera(camera: Camera): Camera {
  return {
    zoom: camera.zoom,
    x: clamp(camera.x, -GAME_SETTINGS.map.cameraOverscroll, world.width - GAME_SETTINGS.map.cameraPaddingX),
    y: clamp(camera.y, -GAME_SETTINGS.map.cameraOverscroll, world.height - GAME_SETTINGS.map.cameraPaddingY),
  };
}

function touchCenter(points: Map<number, { x: number; y: number }>) {
  let x = 0;
  let y = 0;
  for (const point of points.values()) {
    x += point.x;
    y += point.y;
  }
  const count = Math.max(1, points.size);
  return { x: x / count, y: y / count };
}

function touchDistance(points: Map<number, { x: number; y: number }>) {
  const [first, second] = [...points.values()];
  if (!first || !second) return 1;
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function applyKeyboardPan(keys: Set<string>, camera: Camera, deltaSeconds: number) {
  if (keys.size === 0) return;
  const speed = GAME_SETTINGS.map.keyboardPanSpeed / camera.zoom;
  let dx = 0;
  let dy = 0;
  if (keys.has('a') || keys.has('arrowleft')) dx -= speed * deltaSeconds;
  if (keys.has('d') || keys.has('arrowright')) dx += speed * deltaSeconds;
  if (keys.has('w') || keys.has('arrowup')) dy -= speed * deltaSeconds;
  if (keys.has('s') || keys.has('arrowdown')) dy += speed * deltaSeconds;
  const next = clampCamera({ ...camera, x: camera.x + dx, y: camera.y + dy });
  camera.x = next.x;
  camera.y = next.y;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
