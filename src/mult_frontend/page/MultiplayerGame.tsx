import { useState } from 'react';
import JoinRoom from './JoinRoom';
import { useWebSocket } from '../hooks/useWebsocket';
import type { Message } from '../hooks/useWebsocket';

export default function MultiplayerApp() {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState<string | null>(null);
  const [phase, setPhase] = useState<'join' | 'lobby' | 'game'>('join');

  const { sendMessage, messages, connected } = useWebSocket('wss://your-api-id.execute-api.us-east-2.amazonaws.com/production');

  function handleJoin(roomId: string, playerName: string) {
    setRoomId(roomId);
    setPlayerName(playerName);
    setPhase('lobby');
    // sendMessage already called in JoinRoom
  }

  // You can add useEffect here to listen for incoming messages and transition to game phase

  return (
    <>
      {!connected && <p className="text-white text-center mt-10">Connecting to server...</p>}

      {phase === 'join' && <JoinRoom onJoin={handleJoin} sendMessage={sendMessage} />}
      {phase === 'lobby' && (
        <div className="text-white text-center mt-10">
          <h2>Waiting in room <strong>{roomId}</strong> as <strong>{playerName}</strong>...</h2>
          <p>Other players will join soon.</p>
        </div>
      )}
      {phase === 'game' && (
        <p className="text-white">Game in progress (to be implemented)</p>
      )}
    </>
  );
}
