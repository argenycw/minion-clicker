import { useState, type FormEvent } from 'react';
import { Users, X } from 'lucide-react';
import type { AdventurePeerStatus } from '../../multiplayer/peerSession';
import type { AdventurePlayerId, AdventurePlayerState } from '../../state';

function formatWorldCoordinate(value: number) {
  return (value / 10).toFixed(1);
}

export function MultiplayerMenu({ status, hostCode, localPlayerId, players, onHost, onJoin, onDisconnect, onClose }: {
  status: AdventurePeerStatus;
  hostCode: string;
  localPlayerId: AdventurePlayerId;
  players: AdventurePlayerState[];
  onHost: () => void;
  onJoin: (code: string) => void;
  onDisconnect: () => void;
  onClose: () => void;
}) {
  const [joinCode, setJoinCode] = useState('');
  const connected = status.kind === 'hosting' || status.kind === 'connected';
  const submitJoin = (event: FormEvent) => {
    event.preventDefault();
    onJoin(joinCode);
  };

  return (
    <aside className="adventure-settings-panel adventure-multiplayer-panel" aria-label="Adventure multiplayer">
      <div className="inventory-heading">
        <div className="standalone-panel-title"><Users size={18} /> Multiplayer</div>
        <button type="button" onClick={onClose} aria-label="Close multiplayer"><X size={18} /></button>
      </div>
      <section className="multiplayer-status-card">
        <strong>{status.kind === 'hosting' ? 'Hosting' : status.kind === 'connected' ? 'Joined' : status.kind === 'joining' ? 'Connecting' : status.kind === 'error' ? 'Connection issue' : 'Offline host'}</strong>
        <span>{status.message}</span>
        <small>{players.length} player{players.length === 1 ? '' : 's'} | You are {localPlayerId}</small>
      </section>
      <section className="multiplayer-player-list" aria-label="Players">
        <strong>Players</strong>
        {players.map((player) => (
          <div className={player.id === localPlayerId ? 'local' : undefined} key={player.id}>
            <span>{player.id === localPlayerId ? 'You' : player.actor.name}</span>
            <small>x: {formatWorldCoordinate(player.actor.x)}, y: {formatWorldCoordinate(player.actor.y)}</small>
          </div>
        ))}
      </section>
      <div className="multiplayer-actions">
        <button type="button" onClick={onHost}>Host Game</button>
        {hostCode && <div className="room-code-display" aria-label="Room code"><span>Room code</span><strong>{hostCode}</strong></div>}
      </div>
      <form className="multiplayer-join-form" onSubmit={submitJoin}>
        <label>
          Join code
          <input
            inputMode="numeric"
            maxLength={6}
            pattern="[0-9]{6}"
            placeholder="000000"
            value={joinCode}
            onChange={(event) => setJoinCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
          />
        </label>
        <button type="submit">Join Game</button>
      </form>
      {connected && <button className="multiplayer-disconnect" type="button" onClick={onDisconnect}>Disconnect</button>}
    </aside>
  );
}
