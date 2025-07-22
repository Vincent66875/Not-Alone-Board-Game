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
    console.log("Sending: start room: " + roomId);
    setStage('game');
  }
  function handleLeaveGame() {
    console.log("Sending: leave room: " + roomId);
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
    if (!latestMessage) return;
    console.log('Received message:', latestMessage);

    if (latestMessage.type === 'roomUpdate' && latestMessage.roomId === roomId) {
      setPlayers(latestMessage.players || []);
      console.log('Updated players:', latestMessage.players);

      // Also update our player if it matches by connectionId or name
      if (player) {
        const updatedPlayer = latestMessage.players.find(
          (p: Player) =>
            p.connectionId === player.connectionId || p.name === player.name
        );
        if (updatedPlayer) {
          setPlayer(updatedPlayer);
          console.log('Updated player from roomUpdate:', updatedPlayer);
        }
      }
    }

    if (latestMessage.type === 'stageUpdate' && latestMessage.stage === 'game') {
      setStage('game');
      console.log('Stage updated to game');
    }

    if (latestMessage.type === 'gameUpdate') {
      const updatedGameState = latestMessage.gameState;
      setGameState(updatedGameState);
      setPlayers(latestMessage.players);
      console.log('GameState set:', updatedGameState);
      console.log('Game player: ', player);

      if (!updatedGameState.players) {
        console.warn('gameState.players is undefined or missing', updatedGameState);
        return;
      }

      if (!player) return;

      // Try to find updated player by connectionId first
      let updatedPlayer = updatedGameState.players.find(
        (p: Player) => p.connectionId === player.connectionId
      );

      // Fallback to id if connectionId didn't match
      if (!updatedPlayer && player.id) {
        updatedPlayer = updatedGameState.players.find(
          (p: Player) => p.id === player.id
        );
      }

      // Final fallback to name
      if (!updatedPlayer) {
        updatedPlayer = updatedGameState.players.find(
          (p: Player) => p.name === player.name
        );
      }

      if (updatedPlayer) {
        setPlayer(updatedPlayer);
        console.log('Updated player info from gameState:', updatedPlayer);
      } else {
        console.warn('No matching player found in gameState for', player);
      }
    }
  }, [messages, roomId]);


  return (
    <>
      {!connected && <p className="text-white text-center mt-10">Connecting to server...</p>}

      {stage === 'join' && <JoinRoom onJoin={handleJoin} sendMessage={sendMessage} />}

      {stage === 'lobby' && roomId && player && (
        <MainPage
          roomId={roomId}
          playerName={player.name}
          players={players}
          onStart={() => {
            console.log('Sending startGame message');
            handleStartGame();
            sendMessage({ type: 'startGame', roomId });
          }}
          onLeave={() => {
            console.log('Sending LeaveGame message');
            handleLeaveGame();
            sendMessage({ type: 'leaveRoom', roomId, player })
          }}
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