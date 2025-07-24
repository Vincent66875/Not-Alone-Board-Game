import { useEffect, useState } from 'react';
import JoinRoom from './JoinRoom';
import MainPage from './MainPage';
import WaitingPage from '../components/WaitingPage';
import HuntingPhase from '../components/HuntingPhase';
import PlanningPhase from '../components/PlanningPhase';
import GameTopBar from '../components/GameTopBar';
import GameDownBar from '../components/GameDownBar';
import { useWebSocket } from '../hooks/useWebsocket';
import { getPhaseNumber, type GameState, type Player } from '../../mult_backend/gameEngine';

export default function MultiplayerApp() {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [gameState, setGameState] = useState<GameState | null>(null);
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
      survival: [],
      riverActive: false });
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
      
      if (latestMessage.players) {
        setPlayers(latestMessage.players);
      } else {
        console.warn('gameUpdate missing players array');
        return;
      }

      if (!player) return;

      // Find updated player from separate players array, NOT inside gameState
      let updatedPlayer = latestMessage.players.find(
        (p: Player) => p.connectionId === player.connectionId
      ) || latestMessage.players.find(
        (p: Player) => p.id === player.id
      ) || latestMessage.players.find(
        (p: Player) => p.name === player.name
      );

      if (updatedPlayer) {
        setPlayer(updatedPlayer);
        console.log('Updated player info from gameUpdate:', updatedPlayer);
      } else {
        console.warn('No matching player found in gameUpdate players for', player);
      }
    }
  }, [messages, roomId]);


  return (
    <>
      {!connected && <p className="text-white text-center mt-10">Connecting to server...</p>}

      {stage === 'join' && <JoinRoom connection={connected} onJoin={handleJoin} sendMessage={sendMessage} />}

      {stage === 'lobby' && roomId && player && (
        <MainPage
          roomId={roomId}
          playerName={player.name}
          players={players.map((p) => p.name)}
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
        <>
          {gameState && player && (
            <GameTopBar
              turn={gameState.turn}
              phase={getPhaseNumber(gameState.phase)!}
              R_Progress={gameState.board.rescue}
              A_Progress={gameState.board.assimilation}
              players_num={players.length}
              riverActive={player.riverActive ?? false}
            />
          )}

          <div className="text-white text-center mt-10">
            {gameState && player ? (
              (() => {
                const { phase } = gameState;

                if (phase === 'planning') {
                  if (player.isCreature) {
                    return (
                      <WaitingPage
                        gameState={gameState}
                        player={player}
                        players={players}
                      />
                    );
                  } else {
                    return player.playedCard !== undefined ? (
                      <WaitingPage
                        gameState={gameState}
                        player={player}
                        players={players}
                      />
                    ) : (
                      <PlanningPhase
                        gameState={gameState}
                        player={player}
                        onCardSelect={(cardId: number, cardIdAlt?: number) => {
                          if (!roomId || !player) return;
                          console.log("Player " + player.id + " played the card: " + cardId);
                          console.log("Player message:", {
                            ...player,
                            playedCard: cardId,
                            ...(cardIdAlt !== undefined && { playedCardAlt: cardIdAlt }),
                          });
                          sendMessage({
                            type: 'playCard',
                            roomId,
                            player: {
                              ...player,
                              playedCard: cardId,
                              ...(cardIdAlt !== undefined && { playedCardAlt: cardIdAlt }),
                            },
                          });
                        }}
                      />
                    );
                  }
                }

                if (phase === 'hunting') {
                  if (player.isCreature) {
                    return (
                      <HuntingPhase
                        gameState={gameState}
                        player={player}
                        players={players}
                      />
                    );
                  } else {
                    return (
                      <WaitingPage
                        gameState={gameState}
                        player={player}
                        players={players}
                      />
                    );
                  }
                }

                return <h2>Phase: {phase}</h2>;
              })()
            ) : (
              <h2>Waiting for game data...</h2>
            )}


            {gameState && <GameDownBar players={players} />}
          </div>
        </>

      )}
    </>
  );
}