import Peer, { DataConnection } from 'peerjs';
import type { AdventureCommand } from '../commands';
import type { AdventurePlayerId, AdventureState } from '../state';
import type { AdventureMotionFrame } from './motion';

export type AdventureClientPosition = {
  sequence: number;
  x: number;
  y: number;
  facing: 'left' | 'right';
};

export type AdventurePeerStatus =
  | { kind: 'idle'; message: string }
  | { kind: 'hosting'; message: string; peerId: string }
  | { kind: 'joining'; message: string }
  | { kind: 'connected'; message: string; peerId: string }
  | { kind: 'error'; message: string };

export type AdventurePeerMessage =
  | { type: 'join-request' }
  | { type: 'welcome'; playerId: AdventurePlayerId }
  | { type: 'command'; command: AdventureCommand }
  | { type: 'player-position'; position: AdventureClientPosition }
  | { type: 'snapshot'; state: AdventureState }
  | { type: 'motion'; frame: AdventureMotionFrame }
  | { type: 'host-closed'; reason: string };

type AdventureChannel = 'control' | 'motion';
type AdventureConnectionMetadata = { channel: AdventureChannel };
type HostPeerConnections = {
  control?: DataConnection;
  motion?: DataConnection;
  playerId?: AdventurePlayerId;
  latestPositionSequence?: number;
};

export type AdventurePeerHostSession = {
  role: 'host';
  peerId: string;
  sendSnapshot: (state: AdventureState) => void;
  sendMotion: (frame: AdventureMotionFrame) => void;
  close: () => void;
};

export type AdventurePeerClientSession = {
  role: 'client';
  peerId: string;
  playerId?: AdventurePlayerId;
  sendCommand: (command: AdventureCommand) => void;
  sendPosition: (position: AdventureClientPosition) => void;
  close: () => void;
};

export type AdventurePeerSession = AdventurePeerHostSession | AdventurePeerClientSession;

export function createAdventureHostSession({ onReady, onClientJoined, onClientDisconnected, onCommand, onClientPosition, onStatus }: {
  onReady: (session: AdventurePeerHostSession) => void;
  onClientJoined: (playerId: AdventurePlayerId) => void;
  onClientDisconnected: (playerId: AdventurePlayerId) => void;
  onCommand: (command: AdventureCommand) => void;
  onClientPosition: (playerId: AdventurePlayerId, position: AdventureClientPosition) => void;
  onStatus: (status: AdventurePeerStatus) => void;
}) {
  installUnreliableDataChannelPolicy();
  const peer = new Peer();
  const peers = new Map<string, HostPeerConnections>();
  let nextPlayerIndex = 2;
  let session: AdventurePeerHostSession | undefined;

  peer.on('open', (peerId) => {
    session = {
      role: 'host',
      peerId,
      sendSnapshot: (state) => {
        for (const connections of peers.values()) {
          if (connections.control?.open) connections.control.send({ type: 'snapshot', state } satisfies AdventurePeerMessage);
        }
      },
      sendMotion: (frame) => {
        for (const connections of peers.values()) {
          if (connections.playerId && connections.motion?.open) connections.motion.send({ type: 'motion', frame } satisfies AdventurePeerMessage);
        }
      },
      close: () => {
        for (const connections of peers.values()) {
          if (connections.control?.open) connections.control.send({ type: 'host-closed', reason: 'Host ended the session.' } satisfies AdventurePeerMessage);
          connections.control?.close();
          connections.motion?.close();
        }
        peer.destroy();
      },
    };
    onReady(session);
    onStatus({ kind: 'hosting', peerId, message: 'Hosting adventure session.' });
  });

  peer.on('connection', (connection) => {
    const channel = getConnectionChannel(connection);
    const connections = peers.get(connection.peer) ?? {};
    connections[channel] = connection;
    peers.set(connection.peer, connections);
    if (channel === 'control') onStatus({ kind: 'hosting', peerId: peer.id, message: 'A player is connecting...' });

    connection.on('data', (data) => {
      const message = data as AdventurePeerMessage;
      const current = peers.get(connection.peer);
      if (!current) return;
      if (channel === 'control' && message.type === 'join-request') {
        if (current.playerId) return;
        const playerId = `player-${String(nextPlayerIndex).padStart(2, '0')}` as AdventurePlayerId;
        nextPlayerIndex += 1;
        current.playerId = playerId;
        onClientJoined(playerId);
        connection.send({ type: 'welcome', playerId } satisfies AdventurePeerMessage);
        onStatus({ kind: 'hosting', peerId: peer.id, message: `Player ${playerId} joined.` });
        return;
      }
      if (channel === 'control' && message.type === 'command' && current.playerId) {
        onCommand({ ...message.command, playerId: current.playerId } as AdventureCommand);
      }
      if (channel === 'motion' && message.type === 'player-position' && current.playerId) {
        if ((current.latestPositionSequence ?? -1) >= message.position.sequence) return;
        current.latestPositionSequence = message.position.sequence;
        onClientPosition(current.playerId, message.position);
      }
    });

    connection.on('close', () => {
      const current = peers.get(connection.peer);
      if (!current) return;
      current[channel] = undefined;
      if (channel !== 'control') return;
      peers.delete(connection.peer);
      current.motion?.close();
      if (current.playerId) onClientDisconnected(current.playerId);
      onStatus({ kind: 'hosting', peerId: peer.id, message: 'A player disconnected.' });
    });
  });

  peer.on('error', (error) => onStatus({ kind: 'error', message: error.message }));
  return () => session?.close() ?? peer.destroy();
}

export function createAdventureClientSession({ hostPeerId, onReady, onWelcome, onSnapshot, onMotion, onHostDisconnected, onStatus }: {
  hostPeerId: string;
  onReady: (session: AdventurePeerClientSession) => void;
  onWelcome: (playerId: AdventurePlayerId) => void;
  onSnapshot: (state: AdventureState, playerId: AdventurePlayerId) => void;
  onMotion: (frame: AdventureMotionFrame, playerId: AdventurePlayerId) => void;
  onHostDisconnected: (reason: string) => void;
  onStatus: (status: AdventurePeerStatus) => void;
}) {
  installUnreliableDataChannelPolicy();
  const peer = new Peer();
  let control: DataConnection | undefined;
  let motion: DataConnection | undefined;
  let session: AdventurePeerClientSession | undefined;
  let hostDisconnectHandled = false;
  let assignedPlayerId: AdventurePlayerId | undefined;
  let pendingSnapshot: AdventureState | undefined;
  let pendingMotion: AdventureMotionFrame | undefined;
  const handleHostDisconnected = (reason: string) => {
    if (hostDisconnectHandled) return;
    hostDisconnectHandled = true;
    onHostDisconnected(reason);
  };

  peer.on('open', (peerId) => {
    onStatus({ kind: 'joining', message: 'Connecting to host...' });
    control = peer.connect(hostPeerId, { reliable: true, metadata: { channel: 'control' } satisfies AdventureConnectionMetadata });
    motion = peer.connect(hostPeerId, { reliable: false, metadata: { channel: 'motion' } satisfies AdventureConnectionMetadata });
    session = {
      role: 'client',
      peerId,
      sendCommand: (command) => {
        if (control?.open) control.send({ type: 'command', command } satisfies AdventurePeerMessage);
      },
      sendPosition: (position) => {
        if (motion?.open) motion.send({ type: 'player-position', position } satisfies AdventurePeerMessage);
      },
      close: () => {
        hostDisconnectHandled = true;
        control?.close();
        motion?.close();
        peer.destroy();
      },
    };
    onReady(session);
    control.on('open', () => {
      control?.send({ type: 'join-request' } satisfies AdventurePeerMessage);
      onStatus({ kind: 'connected', peerId, message: 'Connected to host.' });
    });
    control.on('data', (data) => {
      const message = data as AdventurePeerMessage;
      if (message.type === 'welcome') {
        assignedPlayerId = message.playerId;
        session = session ? { ...session, playerId: message.playerId } : session;
        onWelcome(message.playerId);
        if (pendingSnapshot) onSnapshot(pendingSnapshot, message.playerId);
        if (pendingMotion) onMotion(pendingMotion, message.playerId);
        pendingSnapshot = undefined;
        pendingMotion = undefined;
      } else if (message.type === 'snapshot') {
        if (assignedPlayerId) onSnapshot(message.state, assignedPlayerId);
        else pendingSnapshot = message.state;
      } else if (message.type === 'host-closed') {
        handleHostDisconnected(message.reason);
      }
    });
    motion.on('data', (data) => {
      const message = data as AdventurePeerMessage;
      if (message.type !== 'motion') return;
      if (assignedPlayerId) onMotion(message.frame, assignedPlayerId);
      else pendingMotion = message.frame;
    });
    control.on('close', () => handleHostDisconnected('Host connection closed.'));
  });

  peer.on('error', (error) => onStatus({ kind: 'error', message: error.message }));
  return () => session?.close() ?? peer.destroy();
}

function getConnectionChannel(connection: DataConnection): AdventureChannel {
  const metadata = connection.metadata as Partial<AdventureConnectionMetadata> | undefined;
  return metadata?.channel === 'motion' ? 'motion' : 'control';
}

function installUnreliableDataChannelPolicy() {
  type PatchedPeerConnectionPrototype = typeof RTCPeerConnection.prototype & {
    __adventureUnreliablePatched?: boolean;
  };
  const prototype = globalThis.RTCPeerConnection?.prototype as PatchedPeerConnectionPrototype | undefined;
  if (!prototype || prototype.__adventureUnreliablePatched) return;
  const createDataChannel = prototype.createDataChannel;
  // PeerJS exposes unordered channels but not WebRTC's retransmit limit.
  prototype.createDataChannel = function (label: string, options?: RTCDataChannelInit) {
    const configured = options?.ordered === false && options.maxRetransmits === undefined && options.maxPacketLifeTime === undefined
      ? { ...options, ordered: false, maxRetransmits: 0 }
      : options;
    return createDataChannel.call(this, label, configured);
  };
  prototype.__adventureUnreliablePatched = true;
}
