import { useEffect, useMemo, useReducer, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { MousePointer2 } from 'lucide-react';
import {
  adventureWorld,
  createInitialAdventureState,
  getEquippedWeapon,
  getAdventureInteractionPrompt,
  MULTIPLAYER_RESPAWN_DELAY_MS,
  type AdventureState,
  type HandSlot,
} from './state';
import { applyTraitToWeaponByItemNo } from './inventory/system';
import { bindAdventureCameraZoom, createAdventureCamera, followPlayerCamera, screenToWorld, type AdventureCamera } from './camera';
import { adventureReducer } from './reducer';
import { keysToAdventureInputCommand, type AdventureCommand } from './commands';
import { clearAdventureRoom, createRoomCode, findAdventureRoom, normalizeRoomCode, publishAdventureRoom } from './multiplayer/rooms';
import { createAdventureClientSession, createAdventureHostSession, type AdventurePeerSession, type AdventurePeerStatus } from './multiplayer/peerSession';
import {
  captureAdventureMotionFrame,
  updateAdventureRenderMotion,
  type AdventureMotionHistory,
  type AdventureMotionTargets,
  type AdventureRenderMotion,
} from './multiplayer/motion';
import { rebaseAdventureSnapshotClock } from './multiplayer/snapshot';
import { drawScene } from './sceneRenderer';
import { GAME_SETTINGS } from '../../shared/settings';
import { useGraphicsSettings } from '../../shared/graphicsSettings';
import { AdventureMenuBar } from './ui/menus/AdventureMenuBar';
import { useAdventureMenus, type InventoryItemKind } from './ui/menus/useAdventureMenus';
import { AdventureMenus } from './ui/menus/AdventureMenus';
import { createAdventureMenuActions } from './ui/menus/menuActions';
import { AdventureActionBars } from './ui/hud/ActionBars';
import { AdventureCombatTargetPanel, AdventureStatusHud } from './ui/hud/StatusPanels';
import { AdventureAudioSystem } from './audio/system';
import type { AdventureAudioCue, AdventureAudioPoint } from './audio/types';
import { getWeaponAudio } from './weapons/definitions';
type SceneTransition = { phase: 'covering' | 'uncovering'; direction: 'enter' | 'exit' };

const CLIENT_POSITION_SEND_INTERVAL_MS = 50;
const HOST_MOTION_SEND_INTERVAL_MS = 50;
const HOST_SNAPSHOT_SEND_INTERVAL_MS = 500;

declare global {
  interface Window {
    adventureDebug?: {
      state: () => AdventureState;
      openInventory: () => void;
      closeInventory: () => void;
      selectItem: (kind: InventoryItemKind, itemNo: number) => void;
      equip: (hand: HandSlot, itemNo: number) => void;
      useItem: (itemNo: number) => void;
      applyStone: (stoneItemNo: number, weaponItemNo: number) => void;
      dropLoot: (itemId: string) => void;
      dropCoin: (amount: number) => void;
      teleport: (x: number, y: number) => void;
      interact: () => void;
      itemIds: () => {
        weapons: Array<{ itemNo: number; name: string }>;
        stones: Array<{ itemNo: number; traitId: string; count: number }>;
        items: Array<{ itemNo: number; name: string; count: number }>;
      };
    };
  }
}

export function App() {
  const [state, dispatch] = useReducer(adventureReducer, undefined, createInitialAdventureState);
  const [hoverHand, setHoverHand] = useState<HandSlot | undefined>();
  const menus = useAdventureMenus();
  const [multiplayerStatus, setMultiplayerStatus] = useState<AdventurePeerStatus>({ kind: 'idle', message: 'Offline host. Your world is local.' });
  const [hostCode, setHostCode] = useState('');
  const [graphics, updateGraphics] = useGraphicsSettings();
  const [measuredFps, setMeasuredFps] = useState(0);
  const [sceneTransition, setSceneTransition] = useState<SceneTransition | undefined>();
  const [transitionLoading, setTransitionLoading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef(state);
  const previousAudioStateRef = useRef<AdventureState | undefined>(undefined);
  const audioSystemRef = useRef<AdventureAudioSystem | undefined>(undefined);
  const graphicsRef = useRef(graphics);
  const hoverHandRef = useRef<HandSlot | undefined>(undefined);
  const keysRef = useRef(new Set<string>());
  const heldAttackRef = useRef(new Set<HandSlot>());
  const aimRef = useRef({ x: adventureWorld.spawn.x + 1, y: adventureWorld.spawn.y });
  const cameraRef = useRef<AdventureCamera>(createAdventureCamera());
  const trackedPlayerRef = useRef({ x: adventureWorld.spawn.x, y: adventureWorld.spawn.y });
  const transitionActiveRef = useRef(false);
  const interactionRef = useRef<() => void>(() => undefined);
  const transitionTimersRef = useRef<number[]>([]);
  const multiplayerSessionRef = useRef<AdventurePeerSession | undefined>(undefined);
  const multiplayerCleanupRef = useRef<(() => void) | undefined>(undefined);
  const hostedRoomCodeRef = useRef<string | undefined>(undefined);
  const networkPlayerIdRef = useRef(state.localPlayerId);
  const lastSnapshotSentRef = useRef(0);
  const lastMotionSentRef = useRef(0);
  const motionSequenceRef = useRef(0);
  const motionHistoryRef = useRef<AdventureMotionHistory | undefined>(undefined);
  const motionTargetsRef = useRef<AdventureMotionTargets | undefined>(undefined);
  const renderMotionRef = useRef<AdventureRenderMotion>({ players: {}, enemies: {}, projectiles: [], effects: [] });
  const lastRenderMotionAtRef = useRef(performance.now());
  const lastClientPositionSentRef = useRef(0);
  const clientPositionSequenceRef = useRef(0);
  const lastHeldAttackSentRef = useRef(0);
  const offlineStateBeforeJoinRef = useRef<AdventureState | undefined>(undefined);
  const suppressHostDisconnectRef = useRef(false);

  stateRef.current = state;
  audioSystemRef.current ??= new AdventureAudioSystem();
  graphicsRef.current = graphics;
  hoverHandRef.current = hoverHand;
  if (multiplayerSessionRef.current?.role !== 'client') networkPlayerIdRef.current = state.localPlayerId;
  const now = performance.now();
  const leftWeapon = useMemo(() => getEquippedWeapon(state, 'left'), [state]);
  const rightWeapon = useMemo(() => getEquippedWeapon(state, 'right'), [state]);
  const connectedPlayerCount = Object.keys(state.players).length;
  const menuOpen = menus.isOpen;
  const isMultiplayerConnected = multiplayerSessionRef.current !== undefined;
  const respawnAvailableAt = state.death ? state.death.diedAt + (isMultiplayerConnected ? MULTIPLAYER_RESPAWN_DELAY_MS : 0) : 0;
  const respawnRemainingMs = state.death ? Math.max(0, respawnAvailableAt - now) : 0;
  const respawnReady = state.death !== undefined && respawnRemainingMs <= 0;

  const sendOrApplyCommand = (command: AdventureCommand, commandNow = performance.now()) => {
    const session = multiplayerSessionRef.current;
    if (stateRef.current.death && command.type !== 'respawn') return;
    if (session?.role === 'client') {
      session.sendCommand(command);
      return;
    }
    dispatch({ type: 'command', command, now: commandNow });
  };

  const playUiSound = (cue: AdventureAudioCue) => {
    void audioSystemRef.current?.playUi(cue);
  };

  const playWorldSound = (cue: AdventureAudioCue, source: AdventureAudioPoint) => {
    const listener = stateRef.current.player;
    void audioSystemRef.current?.playWorld(cue, source, listener);
  };

  const waitForTransition = (duration: number) => new Promise<void>((resolve) => {
    transitionTimersRef.current.push(window.setTimeout(resolve, duration));
  });

  const runSceneTransition = async (direction: SceneTransition['direction'], midpoint: () => void | Promise<void>) => {
    if (transitionActiveRef.current) return Promise.resolve();
    transitionActiveRef.current = true;
    playUiSound('scene-transition');
    setTransitionLoading(false);
    setSceneTransition({ phase: 'covering', direction });
    const loadingTimer = window.setTimeout(() => setTransitionLoading(true), 2000);
    transitionTimersRef.current.push(loadingTimer);
    await waitForTransition(340);
    try {
      await midpoint();
    } finally {
      window.clearTimeout(loadingTimer);
      setTransitionLoading(false);
      setSceneTransition({ phase: 'uncovering', direction });
      await waitForTransition(420);
      transitionActiveRef.current = false;
      setSceneTransition(undefined);
    }
  };

  useEffect(() => {
    const unlockAudio = () => {
      void audioSystemRef.current?.unlock();
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
    window.addEventListener('pointerdown', unlockAudio);
    window.addEventListener('keydown', unlockAudio);
    return () => {
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
  }, []);

  useEffect(() => {
    const previous = previousAudioStateRef.current;
    previousAudioStateRef.current = state;
    if (!previous) return;

    for (const flash of state.weaponFlash) {
      if (previous.weaponFlash.some((candidate) => candidate.hand === flash.hand && candidate.born === flash.born)) continue;
      const weapon = getEquippedWeapon(state, flash.hand);
      if (weapon) playWorldSound(getWeaponAudio(weapon).onUse ?? (weapon.kind === 'projectile' ? 'attack-ranged' : 'attack-melee'), state.player);
    }

    for (const effect of state.effects) {
      if (previous.effects.some((candidate) => candidate.id === effect.id && candidate.born === effect.born)) continue;
      const point = { x: effect.x, y: effect.y };
      if (effect.audioCue) {
        playWorldSound(effect.audioCue, point);
      } else if (effect.kind === 'death') {
        playWorldSound('enemy-death', point);
      } else if (effect.kind === 'heal') {
        playWorldSound('heal', point);
      }
    }

    if (state.coins > previous.coins) playUiSound('coin-pickup');
  }, [state]);

  interactionRef.current = () => {
    if (transitionActiveRef.current) return;
    const prompt = getAdventureInteractionPrompt(stateRef.current);
    if (!prompt) return;
    if (prompt === '[E] Open') {
      const commandNow = performance.now();
      sendOrApplyCommand({ type: 'interact', playerId: stateRef.current.localPlayerId, tick: stateRef.current.simulationTick + 1 }, commandNow);
      return;
    }
    const direction = stateRef.current.scene === 'overworld' ? 'enter' : 'exit';
    void runSceneTransition(direction, () => {
      const commandNow = performance.now();
      sendOrApplyCommand({ type: 'interact', playerId: stateRef.current.localPlayerId, tick: stateRef.current.simulationTick + 1 }, commandNow);
    });
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const target = event.target as HTMLElement | null;
      const editing = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable;
      if (key === 'escape') {
        event.preventDefault();
        if (menuOpen) menus.close();
        else menus.open('settings');
        return;
      }
      if (editing) return;
      if (stateRef.current.death) return;
      if (key === 'c') {
        event.preventDefault();
        menus.toggle('character');
        return;
      }
      if (key === 'k') {
        event.preventDefault();
        menus.toggle('skills');
        return;
      }
      if (menuOpen) return;
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
        event.preventDefault();
        keysRef.current.add(key);
      }
      if (/^[1-5]$/.test(key)) {
        event.preventDefault();
        const commandNow = performance.now();
        sendOrApplyCommand({
          type: 'hotbar',
          playerId: stateRef.current.localPlayerId,
          tick: stateRef.current.simulationTick + 1,
          slot: Number(key),
          aimX: aimRef.current.x,
          aimY: aimRef.current.y,
        }, commandNow);
      }
      if (key === 'e' && !event.repeat) {
        event.preventDefault();
        interactionRef.current();
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      keysRef.current.delete(event.key.toLowerCase());
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    keysRef.current.clear();
    heldAttackRef.current.clear();
  }, [menuOpen]);

  useEffect(() => () => {
    for (const timer of transitionTimersRef.current) window.clearTimeout(timer);
  }, []);

  useEffect(() => () => {
    multiplayerCleanupRef.current?.();
    if (hostedRoomCodeRef.current) void clearAdventureRoom(hostedRoomCodeRef.current);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    return bindAdventureCameraZoom(canvas, cameraRef, () => stateRef.current.player);
  }, []);

  useEffect(() => {
    const stopHeldAttacks = () => heldAttackRef.current.clear();
    window.addEventListener('mouseup', stopHeldAttacks);
    window.addEventListener('blur', stopHeldAttacks);
    return () => {
      window.removeEventListener('mouseup', stopHeldAttacks);
      window.removeEventListener('blur', stopHeldAttacks);
    };
  }, []);

  useEffect(() => {
    window.adventureDebug = {
      state: () => stateRef.current,
      openInventory: () => menus.open('character'),
      closeInventory: menus.close,
      selectItem: (kind, itemNo) => {
        menus.open('character');
        menus.selectItem({ kind, itemNo });
      },
      equip: (hand, itemNo) => {
        dispatch({ type: 'equipWeapon', hand, weaponInstanceId: stateRef.current.inventory.weapons.find((item) => item.itemNo === itemNo)?.id ?? '' });
      },
      useItem: (itemNo) => dispatch({ type: 'usePotion', itemNo, now: performance.now() }),
      applyStone: (stoneItemNo, weaponItemNo) => {
        const next = applyTraitToWeaponByItemNo(stateRef.current, stoneItemNo, weaponItemNo);
        if (next !== stateRef.current) {
          const trait = stateRef.current.inventory.traits.find((item) => item.itemNo === stoneItemNo);
          const weapon = stateRef.current.inventory.weapons.find((item) => item.itemNo === weaponItemNo);
          if (trait && weapon) dispatch({ type: 'applyTrait', traitId: trait.traitId, weaponInstanceId: weapon.id });
        }
      },
      dropLoot: (itemId) => dispatch({ type: 'dropLoot', itemId, now: performance.now() }),
      dropCoin: (amount) => dispatch({ type: 'dropCoins', amount, now: performance.now() }),
      teleport: (x, y) => dispatch({ type: 'debugTeleport', x, y }),
      interact: () => dispatch({ type: 'interact', now: performance.now() }),
      itemIds: () => ({
        weapons: stateRef.current.inventory.weapons.map((item) => ({ itemNo: item.itemNo, name: item.name })),
        stones: stateRef.current.inventory.traits.map((item) => ({ itemNo: item.itemNo, traitId: item.traitId, count: item.count })),
        items: stateRef.current.inventory.potions.map((item) => ({ itemNo: item.itemNo, name: item.name, count: item.count })),
      }),
    };
    console.log(
      [
        'Adventure debug helpers:',
        'window.adventureDebug.itemIds()',
        "window.adventureDebug.openInventory()",
        "window.adventureDebug.selectItem('weapon', 2)",
        "window.adventureDebug.equip('left', 3)",
        'window.adventureDebug.useItem(201)',
        'window.adventureDebug.applyStone(104, 2)',
        "window.adventureDebug.dropLoot('item-01')",
        'window.adventureDebug.dropCoin(11)',
        'window.adventureDebug.state()',
      ].join('\n'),
    );
    return () => {
      delete window.adventureDebug;
    };
  }, []);

  useEffect(() => {
    let frame = 0;
    let lastTick = performance.now();
    let fpsFrames = 0;
    let fpsStartedAt = performance.now();
    const loop = (frameNow: number) => {
      const frameMs = 1000 / graphicsRef.current.fps;
      if (document.visibilityState !== 'visible') {
        lastTick = frameNow;
        frame = requestAnimationFrame(loop);
        return;
      }
      if (frameNow - lastTick >= frameMs) {
        const transitioning = transitionActiveRef.current;
        const dead = stateRef.current.death !== undefined;
        if (dead) {
          keysRef.current.clear();
          heldAttackRef.current.clear();
        }
        const keys = transitioning || dead ? new Set<string>() : new Set(keysRef.current);
        const session = multiplayerSessionRef.current;
        const inputPlayerId = session?.role === 'client' ? networkPlayerIdRef.current : stateRef.current.localPlayerId;
        const input = keysToAdventureInputCommand(inputPlayerId, stateRef.current.simulationTick + 1, keys, aimRef.current);
        if (session?.role === 'client') {
          dispatch({ type: 'clientMovement', input, deltaSeconds: Math.min(0.05, Math.max(0, frameNow - lastTick) / 1000), now: frameNow });
          if (frameNow - lastClientPositionSentRef.current >= CLIENT_POSITION_SEND_INTERVAL_MS) {
            clientPositionSequenceRef.current += 1;
            session.sendPosition({
              sequence: clientPositionSequenceRef.current,
              x: stateRef.current.player.x,
              y: stateRef.current.player.y,
              facing: stateRef.current.player.facing,
            });
            lastClientPositionSentRef.current = frameNow;
          }
        } else {
          dispatch({ type: 'command', command: input, now: frameNow });
        }
        const canSendHeldAttack = !dead && (session?.role !== 'client' || frameNow - lastHeldAttackSentRef.current >= 50);
        for (const hand of transitioning || !canSendHeldAttack ? [] : heldAttackRef.current) {
          sendOrApplyCommand({
            type: 'attack',
            playerId: stateRef.current.localPlayerId,
            tick: stateRef.current.simulationTick + 1,
            hand,
            aimX: aimRef.current.x,
            aimY: aimRef.current.y,
          }, frameNow);
        }
        if (heldAttackRef.current.size && canSendHeldAttack) lastHeldAttackSentRef.current = frameNow;
        const canvas = canvasRef.current;
        if (canvas) {
          const isClient = session?.role === 'client';
          const usesNetworkMotion = isClient || (session?.role === 'host' && Object.keys(stateRef.current.players).length > 1);
          if (usesNetworkMotion) {
            const renderDeltaSeconds = Math.min(0.05, Math.max(0, frameNow - lastRenderMotionAtRef.current) / 1000);
            renderMotionRef.current = updateAdventureRenderMotion(
              stateRef.current,
              renderMotionRef.current,
              motionTargetsRef.current,
              stateRef.current.localPlayerId,
              frameNow,
              renderDeltaSeconds,
            );
          }
          lastRenderMotionAtRef.current = frameNow;
          const renderedLocalPlayer = usesNetworkMotion
            ? renderMotionRef.current.players[stateRef.current.localPlayerId] ?? stateRef.current.player
            : stateRef.current.player;
          followPlayerCamera(cameraRef.current, renderedLocalPlayer, trackedPlayerRef.current, canvas);
          drawScene(
            canvas,
            cameraRef.current,
            stateRef.current,
            graphicsRef.current,
            aimRef.current,
            hoverHandRef.current,
            getAdventureInteractionPrompt(stateRef.current),
            frameNow,
            usesNetworkMotion ? renderMotionRef.current : undefined,
          );
        }
        lastTick = frameNow - ((frameNow - lastTick) % frameMs);
        fpsFrames += 1;
        if (frameNow - fpsStartedAt >= 500) {
          setMeasuredFps(Math.min(graphicsRef.current.fps, Math.round(fpsFrames * 1000 / (frameNow - fpsStartedAt))));
          fpsFrames = 0;
          fpsStartedAt = frameNow;
        }
        if (session?.role === 'host' && frameNow - lastMotionSentRef.current >= HOST_MOTION_SEND_INTERVAL_MS) {
          const captured = captureAdventureMotionFrame(
            stateRef.current,
            motionHistoryRef.current,
            frameNow,
            motionSequenceRef.current + 1,
          );
          motionSequenceRef.current += 1;
          motionHistoryRef.current = captured.history;
          motionTargetsRef.current = { frame: captured.frame, receivedAt: frameNow };
          session.sendMotion(captured.frame);
          lastMotionSentRef.current = frameNow;
        }
        if (session?.role === 'host' && frameNow - lastSnapshotSentRef.current >= HOST_SNAPSHOT_SEND_INTERVAL_MS) {
          session.sendSnapshot(stateRef.current);
          lastSnapshotSentRef.current = frameNow;
        }
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, []);

  const updateAim = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    aimRef.current = screenToWorld(canvas, cameraRef.current, clientX, clientY);
  };

  const activate = (hand: HandSlot) => {
    if (stateRef.current.death) return;
    const commandNow = performance.now();
    sendOrApplyCommand({
      type: 'attack',
      playerId: stateRef.current.localPlayerId,
      tick: stateRef.current.simulationTick + 1,
      hand,
      aimX: aimRef.current.x,
      aimY: aimRef.current.y,
    }, commandNow);
  };

  const activateHotbar = (slot: number) => {
    if (stateRef.current.death) return;
    sendOrApplyCommand({
      type: 'hotbar',
      playerId: stateRef.current.localPlayerId,
      tick: stateRef.current.simulationTick + 1,
      slot,
      aimX: aimRef.current.x,
      aimY: aimRef.current.y,
    });
  };

  const respawn = () => {
    if (!stateRef.current.death) return;
    const commandNow = performance.now();
    sendOrApplyCommand({
      type: 'respawn',
      playerId: stateRef.current.localPlayerId,
      tick: stateRef.current.simulationTick + 1,
    }, commandNow);
  };

  const handleUiClickCapture = (event: ReactMouseEvent<HTMLElement>) => {
    const target = event.target instanceof Element ? event.target.closest('button') : undefined;
    if (target && event.currentTarget.contains(target)) playUiSound('ui-click');
  };

  const menuActions = createAdventureMenuActions(
    () => ({ playerId: stateRef.current.localPlayerId, tick: stateRef.current.simulationTick + 1 }),
    sendOrApplyCommand,
  );

  const closeMultiplayer = async (message = 'Offline host. Your world is local.') => {
    suppressHostDisconnectRef.current = true;
    multiplayerCleanupRef.current?.();
    suppressHostDisconnectRef.current = false;
    multiplayerCleanupRef.current = undefined;
    multiplayerSessionRef.current = undefined;
    motionTargetsRef.current = undefined;
    renderMotionRef.current = { players: {}, enemies: {}, projectiles: [], effects: [] };
    motionHistoryRef.current = undefined;
    motionSequenceRef.current = 0;
    lastClientPositionSentRef.current = 0;
    clientPositionSequenceRef.current = 0;
    if (hostedRoomCodeRef.current) {
      await clearAdventureRoom(hostedRoomCodeRef.current).catch(() => undefined);
      hostedRoomCodeRef.current = undefined;
    }
    setHostCode('');
    setMultiplayerStatus({ kind: 'idle', message });
  };

  const restoreOfflineWorld = (message: string) => {
    const offlineState = offlineStateBeforeJoinRef.current;
    if (offlineState) {
      dispatch({ type: 'snapshot', state: offlineState, localPlayerId: offlineState.localPlayerId });
      networkPlayerIdRef.current = offlineState.localPlayerId;
      offlineStateBeforeJoinRef.current = undefined;
    }
    setMultiplayerStatus({ kind: 'error', message });
  };

  const disconnectFromMultiplayer = async (message = 'Disconnected. Your local world has been restored.') => {
    const wasClient = multiplayerSessionRef.current?.role === 'client';
    await runSceneTransition('exit', async () => {
      await closeMultiplayer(message);
      if (wasClient) restoreOfflineWorld(message);
    });
  };

  const startHosting = async () => {
    await closeMultiplayer();
    const code = createRoomCode();
    setHostCode(code);
    setMultiplayerStatus({ kind: 'joining', message: 'Starting PeerJS host...' });
    multiplayerCleanupRef.current = createAdventureHostSession({
      onReady: (session) => {
        multiplayerSessionRef.current = session;
        hostedRoomCodeRef.current = code;
        void publishAdventureRoom({ code, hostPeerId: session.peerId, mapSeed: stateRef.current.mapSeed })
          .then(() => setMultiplayerStatus({ kind: 'hosting', peerId: session.peerId, message: `Hosting. Room code ${code}.` }))
          .catch((error: Error) => setMultiplayerStatus({ kind: 'error', message: error.message }));
      },
      onClientJoined: (playerId) => dispatch({ type: 'addPlayer', playerId, now: performance.now() }),
      onClientDisconnected: (playerId) => {
        dispatch({ type: 'removePlayer', playerId });
      },
      onCommand: (command) => {
        if (command.type === 'input') return;
        dispatch({ type: 'command', command, now: performance.now() });
      },
      onClientPosition: (playerId, position) => {
        dispatch({ type: 'networkPlayerPosition', playerId, position });
      },
      onStatus: setMultiplayerStatus,
    });
  };

  const joinHostedGame = async (joinCode: string) => {
    await closeMultiplayer();
    const code = normalizeRoomCode(joinCode);
    if (!code) {
      setMultiplayerStatus({ kind: 'error', message: 'Enter a 6-digit room code.' });
      return;
    }
    setMultiplayerStatus({ kind: 'joining', message: `Looking up room ${code}...` });
    const room = await findAdventureRoom(code);
    if (!room) {
      setMultiplayerStatus({ kind: 'error', message: 'Room not found. Ask the host for a fresh code.' });
      return;
    }
    offlineStateBeforeJoinRef.current = stateRef.current;
    setMultiplayerStatus({ kind: 'joining', message: 'Opening PeerJS connection...' });
    await runSceneTransition('enter', () => new Promise<void>((resolve) => {
      let worldLoaded = false;
      let loadingTimeout = 0;
      const finishLoading = () => {
        if (worldLoaded) return;
        worldLoaded = true;
        window.clearTimeout(loadingTimeout);
        resolve();
      };
      loadingTimeout = window.setTimeout(() => {
        multiplayerCleanupRef.current?.();
        multiplayerCleanupRef.current = undefined;
        multiplayerSessionRef.current = undefined;
        restoreOfflineWorld('Timed out while loading the host world.');
        finishLoading();
      }, 15_000);
      multiplayerCleanupRef.current = createAdventureClientSession({
        hostPeerId: room.hostPeerId,
        onReady: (session) => {
          multiplayerSessionRef.current = session;
        },
        onWelcome: (playerId) => {
          networkPlayerIdRef.current = playerId;
          setMultiplayerStatus({ kind: 'joining', message: `Loading world as ${playerId}...` });
        },
        onSnapshot: (snapshot, playerId) => {
          if (!snapshot.players[playerId]) return;
          networkPlayerIdRef.current = playerId;
          dispatch({
            type: 'snapshot',
            state: rebaseAdventureSnapshotClock(snapshot, performance.now()),
            localPlayerId: playerId,
          });
          setMultiplayerStatus({ kind: 'connected', peerId: room.hostPeerId, message: `Joined as ${playerId}.` });
          finishLoading();
        },
        onMotion: (frame) => {
          if ((motionTargetsRef.current?.frame.sequence ?? -1) >= frame.sequence) return;
          motionTargetsRef.current = { frame, receivedAt: performance.now() };
        },
        onHostDisconnected: (reason) => {
          if (suppressHostDisconnectRef.current) return;
          multiplayerCleanupRef.current = undefined;
          multiplayerSessionRef.current = undefined;
          if (!worldLoaded || transitionActiveRef.current) {
            restoreOfflineWorld(reason);
            finishLoading();
            return;
          }
          void runSceneTransition('exit', () => restoreOfflineWorld(reason));
        },
        onStatus: (status) => {
          setMultiplayerStatus(status);
          if (status.kind === 'error') {
            multiplayerCleanupRef.current?.();
            multiplayerCleanupRef.current = undefined;
            multiplayerSessionRef.current = undefined;
            restoreOfflineWorld(status.message);
            finishLoading();
          }
        },
      });
    }));
  };

  return (
    <main
      className="app-shell adventure-app"
      onClickCapture={handleUiClickCapture}
    >
      <section className="adventure-stage">
        <canvas
          ref={canvasRef}
          className="adventure-canvas"
          data-player-x={Math.round(state.player.x)}
          data-player-y={Math.round(state.player.y)}
          data-loaded-chunks={state.loadedChunkKeys.join(' ')}
          data-scene={state.scene}
          data-dungeon-rooms={state.dungeon?.rooms.length ?? 0}
          data-dungeon-chests={state.dungeon?.chests.length ?? 0}
          data-open-chests={state.dungeon?.chests.filter((chest) => chest.opened).length ?? 0}
          data-enemies={state.enemies.filter((enemy) => enemy.hp > 0).length}
          data-world-drops={state.worldDrops.length}
          data-first-chest-x={state.dungeon?.chests.find((chest) => !chest.opened)?.x ?? ''}
          data-first-chest-y={state.dungeon?.chests.find((chest) => !chest.opened)?.y ?? ''}
          onContextMenu={(event) => event.preventDefault()}
          onMouseMove={(event) => updateAim(event.clientX, event.clientY)}
          onMouseDown={(event) => {
            if (stateRef.current.death) return;
            updateAim(event.clientX, event.clientY);
            if (event.button === 0) {
              heldAttackRef.current.add('left');
              activate('left');
            }
            if (event.button === 2) {
              heldAttackRef.current.add('right');
              activate('right');
            }
          }}
          onMouseUp={(event) => {
            if (event.button === 0) heldAttackRef.current.delete('left');
            if (event.button === 2) heldAttackRef.current.delete('right');
          }}
        />
        <div className="adventure-gameplay-vignette" aria-hidden="true" />

        {sceneTransition && (
          <div
            key={`${sceneTransition.direction}-${sceneTransition.phase}`}
            className={`adventure-scene-swipe ${sceneTransition.phase} ${sceneTransition.direction}`}
            aria-live="polite"
          >
            {transitionLoading && sceneTransition.phase === 'covering' && <span className="adventure-transition-loading">Loading...</span>}
          </div>
        )}

        {state.death && <AdventureDeathOverlay
          ready={respawnReady}
          remainingMs={respawnRemainingMs}
          onRespawn={respawn}
        />}

        <AdventureStatusHud state={state} now={now} />

        <div className="adventure-right-hud">
          <AdventureCombatTargetPanel state={state} now={now} />
          <AdventureMenuBar skillPoints={state.skills.points} playerCount={connectedPlayerCount} onOpen={menus.toggle} />
        </div>

        <AdventureActionBars state={state} now={now} leftWeapon={leftWeapon} rightWeapon={rightWeapon} onHoverWeapon={setHoverHand} onActivateWeapon={activate} onActivateHotbar={activateHotbar} />

        <div className="adventure-controls">
          <MousePointer2 size={16} />
          <span>WASD/Arrows move · Cursor aims · Left/Right click attack · 1–5 item/skill · Wheel/pinch zoom · C character · K skills · Esc settings</span>
        </div>
        {graphics.showFps && <div className="fps-counter adventure-fps-counter">{measuredFps} FPS</div>}

        <AdventureMenus
          state={state}
          menus={menus}
          actions={menuActions}
          graphics={graphics}
          onGraphicsChange={updateGraphics}
          multiplayerStatus={multiplayerStatus}
          hostCode={hostCode}
          onHost={() => void startHosting()}
          onJoin={(code) => void joinHostedGame(code)}
          onDisconnect={() => void disconnectFromMultiplayer()}
        />
      </section>
    </main>
  );
}

function AdventureDeathOverlay({
  ready,
  remainingMs,
  onRespawn,
}: {
  ready: boolean;
  remainingMs: number;
  onRespawn: () => void;
}) {
  const seconds = Math.ceil(remainingMs / 1000);
  return (
    <div className="adventure-death-layer" aria-live="assertive">
      <div className="adventure-death-vignette" />
      <div className="adventure-death-panel">
        <h2>You are dead</h2>
        <button type="button" disabled={!ready} onClick={onRespawn}>
          {ready ? 'Respawn' : `Respawn Available in ${seconds}s`}
        </button>
      </div>
    </div>
  );
}
