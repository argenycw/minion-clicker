import { GAME_SETTINGS } from '../../shared/settings';
import type { Actor } from './state';
import { adventureWorld } from './world';

export type AdventureCamera = { x: number; y: number; zoom: number };

const minZoom = 0.75;
const maxZoom = 1.5;
const initialZoom = 1.0;

export function createAdventureCamera(): AdventureCamera {
  return {
    x: adventureWorld.spawn.x - GAME_SETTINGS.map.initialViewportWidth / initialZoom / 2,
    y: adventureWorld.spawn.y - GAME_SETTINGS.map.initialViewportHeight / initialZoom / 2,
    zoom: initialZoom,
  };
}

export function bindAdventureCameraZoom(canvas: HTMLCanvasElement, cameraRef: { current: AdventureCamera }, getPlayer: () => Actor) {
  const touchPoints = new Map<number, { x: number; y: number }>();
  let pinch: { distance: number; center: { x: number; y: number } } | undefined;
  const zoomAtPlayer = (zoom: number) => {
    const rect = canvas.getBoundingClientRect();
    const nextZoom = clamp(zoom, minZoom, maxZoom);
    const player = getPlayer();
    cameraRef.current = clampCamera({
      zoom: nextZoom,
      x: player.x - rect.width / nextZoom / 2,
      y: player.y - rect.height / nextZoom / 2,
    }, canvas);
  };
  const onWheel = (event: WheelEvent) => {
    event.preventDefault();
    zoomAtPlayer(cameraRef.current.zoom * (event.deltaY > 0 ? 0.9 : 1.1));
  };
  const onPointerDown = (event: PointerEvent) => {
    if (event.pointerType !== 'touch') return;
    touchPoints.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (touchPoints.size >= 2) pinch = { distance: touchDistance(touchPoints), center: touchCenter(touchPoints) };
  };
  const onPointerMove = (event: PointerEvent) => {
    if (event.pointerType !== 'touch' || !touchPoints.has(event.pointerId)) return;
    touchPoints.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (touchPoints.size < 2) return;
    event.preventDefault();
    const center = touchCenter(touchPoints);
    const distance = touchDistance(touchPoints);
    const previous = pinch ?? { distance, center };
    zoomAtPlayer(cameraRef.current.zoom * (distance / Math.max(1, previous.distance)));
    pinch = { distance, center };
  };
  const onPointerUp = (event: PointerEvent) => {
    touchPoints.delete(event.pointerId);
    if (touchPoints.size < 2) pinch = undefined;
  };
  canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove, { passive: false });
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);
  return () => {
    canvas.removeEventListener('wheel', onWheel);
    canvas.removeEventListener('pointerdown', onPointerDown);
    canvas.removeEventListener('pointermove', onPointerMove);
    canvas.removeEventListener('pointerup', onPointerUp);
    canvas.removeEventListener('pointercancel', onPointerUp);
  };
}

export function followPlayerCamera(camera: AdventureCamera, player: Actor, trackedPlayer: { x: number; y: number }, canvas: HTMLCanvasElement) {
  camera.x += player.x - trackedPlayer.x;
  camera.y += player.y - trackedPlayer.y;
  trackedPlayer.x = player.x;
  trackedPlayer.y = player.y;
  Object.assign(camera, clampCamera(camera, canvas));
}

export function screenToWorld(canvas: HTMLCanvasElement, camera: AdventureCamera, clientX: number, clientY: number) {
  const rect = canvas.getBoundingClientRect();
  return { x: (clientX - rect.left) / camera.zoom + camera.x, y: (clientY - rect.top) / camera.zoom + camera.y };
}

function clampCamera(camera: AdventureCamera, canvas: HTMLCanvasElement): AdventureCamera {
  const rect = canvas.getBoundingClientRect();
  return {
    ...camera,
    x: clamp(camera.x, -GAME_SETTINGS.map.cameraOverscroll, adventureWorld.width - rect.width / camera.zoom + GAME_SETTINGS.map.cameraOverscroll),
    y: clamp(camera.y, -GAME_SETTINGS.map.cameraOverscroll, adventureWorld.height - rect.height / camera.zoom + GAME_SETTINGS.map.cameraOverscroll),
  };
}

function touchCenter(points: Map<number, { x: number; y: number }>) {
  const values = [...points.values()];
  return { x: values.reduce((sum, point) => sum + point.x, 0) / values.length, y: values.reduce((sum, point) => sum + point.y, 0) / values.length };
}

function touchDistance(points: Map<number, { x: number; y: number }>) {
  const [first, second] = [...points.values()];
  return first && second ? Math.hypot(first.x - second.x, first.y - second.y) : 1;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
