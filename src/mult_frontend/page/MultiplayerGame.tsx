import { useEffect, useState } from 'react';
import JoinRoom from './JoinRoom';
import MainPage from './MainPage';
import PlanningPhase from '../components/PlanningPhase';
import { useWebSocket } from '../hooks/useWebsocket';
import type { GameState, Player } from '../../mult_backend/game/gameEngine';

export default function MultiplayerApp() {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [players, setPlayers] = useState<string[]>([]);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
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
  function handleLeaveGame() {
    sendMessage({ type: 'leaveRoom', roomId, playerName });
    // Reset all game state
    setRoomId(null);
    setPlayerName(null);
    setPlayers([]);
    setStage('join');
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
    if (latestMessage.type === 'gameUpdate') {
      setGameState(latestMessage.gameState);
      const self = latestMessage.gameState.players.find((p: Player) => p.name === playerName);
      if (self) setPlayer(self);
    }
  }, [messages]);

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
          onLeave={handleLeaveGame}
        />
      )}

    {stage === 'game' && (
      <div className="text-white text-center mt-10">
        {gameState && player ? (
          <>
            {gameState.phase === 'planning' ? (
              <PlanningPhase
                gameState={gameState}
                player={player}
                onCardSelect={(cardId: number) => {
                  sendMessage({
                    type: 'playCard',
                    roomId,
                    playerName,
                    cardId,
                  });
                }}
              />
            ) : (
              <h2>Phase: {gameState.phase}</h2>
            )}
          </>
        ) : (
          <h2>Waiting for game data...</h2>
        )}
      </div>
    )}

    </>
  );
}