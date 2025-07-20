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
  const [stage, setStage] = useState<'join' | 'lobby' | 'game'>('join');

  const { sendMessage, messages, connected } = useWebSocket('wss://8w1e1yzd10.execute-api.us-east-2.amazonaws.com/production/');

  function handleJoin(roomId: string, playerName: string) {
    setRoomId(roomId);
    setPlayer({ 
      id: '',
      name: playerName,
      connectionId: '',
      hand: [],
      discard: [],
      isCreature: false,
      will: 0,
      survival: [] });
    setStage('lobby');
  }
  function handleStartGame() {
    sendMessage({"type": 'startGame', roomId});
    setStage('game');
  }
  function handleLeaveGame() {
    if (!roomId || !player) return;
    sendMessage({ type: 'leaveRoom', roomId, playerId: player.id });
    setRoomId(null);
    setPlayer(null);
    setGameState(null);
    setPlayers([]);
    setStage('join');
  }
  useEffect(() => {
    const latestMessage = messages[messages.length - 1];
    if(!latestMessage) return;
    console.log('Received message:', latestMessage);
    if(latestMessage.type === 'roomUpdate' && latestMessage.roomId === roomId){
      setPlayers(latestMessage.players || []);
      console.log('Updated players:', latestMessage.players);
    }

    if(latestMessage.type === 'stageUpdate' && latestMessage.stage === 'game'){
      setStage('game');
      console.log('Stage updated to game');
    }
    if (latestMessage.type === 'gameUpdate') {
      setGameState(latestMessage.gameState);
      console.log('GameState set:', latestMessage.gameState);

      // Update our Player object by matching id
      if (player && player.id) {
        const updatedPlayer = latestMessage.gameState.players.find((p: Player) => p.id === player.id);
        if (updatedPlayer){ 
          setPlayer(updatedPlayer);
          console.log('Updated player by id:', updatedPlayer);
        }
      } else if (player && !player.id) {
        // Fallback: find by name (for initial join before player.id assigned)
        const updatedPlayer = latestMessage.gameState.players.find((p: Player) => p.name === player.name);
        if (updatedPlayer) {
          setPlayer(updatedPlayer);
          console.log('Updated player by name:', updatedPlayer);
        }
      }
    }
  }, [messages, roomId, player]);

  return (
    <>
      {!connected && <p className="text-white text-center mt-10">Connecting to server...</p>}

      {stage === 'join' && <JoinRoom onJoin={handleJoin} sendMessage={sendMessage} />}

      {stage === 'lobby' && roomId && player && (
        <MainPage
          roomId={roomId}
          playerName={player.name}
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
                    if (!roomId || !player) return;
                    sendMessage({
                      type: 'playCard',
                      roomId,
                      playerId: player.id,
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