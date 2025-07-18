import { useEffect, useState } from 'react';
import JoinRoom from './JoinRoom';
import MainPage from './MainPage';
import { useWebSocket } from '../hooks/useWebsocket';
import type { Message } from '../hooks/useWebsocket';

export default function MultiplayerApp() {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [players, setPlayers] = useState<string[]>([]);
  const [playerName, setPlayerName] = useState<string | null>(null);
  const [stage, setStage] = useState<'join' | 'lobby' | 'game'>('join');

  const { sendMessage, messages, connected } = useWebSocket('wss://8w1e1yzd10.execute-api.us-east-2.amazonaws.com/production/');

  function handleJoin(roomId: string, playerName: string) {
    setRoomId(roomId);
    setPlayerName(playerName);
    setStage('lobby');
  }
  function handleStartGame() {
    sendMessage({"type": 'startGame', roomId});
    setStage('game');
  }
  useEffect(() => {
    const latestMessage = messages[messages.length - 1];
    if(!latestMessage) return;

    if(latestMessage.type === 'roomUpdate' && latestMessage.roomId === roomId){
      setPlayers(latestMessage.players || []);
    }

    if(latestMessage.type === 'stageUpdate' && latestMessage.stage === 'game'){
      setStage('game');
    }

  })

  return (
    <>
      {!connected && <p className="text-white text-center mt-10">Connecting to server...</p>}

      {stage === 'join' && <JoinRoom onJoin={handleJoin} sendMessage={sendMessage} />}

      {stage === 'lobby' && roomId && playerName && (
        <MainPage
          roomId={roomId}
          playerName={playerName}
          players={players}
          onStart={handleStartGame}
        />
      )}

      {stage === 'game' && (
        <div className="text-white text-center mt-10">
          <h2>Game in Progress!</h2>
        </div>
      )}
    </>
  );
}