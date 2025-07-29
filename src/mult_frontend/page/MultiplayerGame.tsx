import { useEffect, useState } from 'react';
import JoinRoom from './JoinRoom';
import MainPage from './MainPage';
import WaitingPage from '../components/WaitingPage';
import HuntingPhase from '../components/HuntingPhase';
import PlanningPhase from '../components/PlanningPhase';
import RiverChoicePhase from '../components/RiverChoicePhase';
import ResolutionPhase from '../components/ResolutionPhase';
import EndingPage from '../components/EndingPhase';
import GameTopBar from '../components/GameTopBar';
import GameDownBar from '../components/GameDownBar';
import { useWebSocket } from '../hooks/useWebsocket';
import { getPhaseNumber } from '../../mult_backend/gameEngine';
import type { Player, GameState, Game } from '../../mult_backend/gameEngine';

export default function MultiplayerApp() {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [stage, setStage] = useState<'join' | 'lobby' | 'game' >('join');
  const [readyToStart, setReadyToStart] = useState<boolean>(false);

  const { sendMessage, messages, connected } = useWebSocket('wss://8w1e1yzd10.execute-api.us-east-2.amazonaws.com/production/');

  function updateFromGame(game: Game) {
    setGameState(game.state);
    setPlayers(game.players);

    if (!player) return;

    const updated = game.players.find(
      (p: Player) =>
        p.connectionId === player.connectionId ||
        p.id === player.id ||
        p.name === player.name
    );

    if (updated) {
      setPlayer(updated);
      console.log('Updated player info from', game);
    } else {
      console.warn('No matching player found in', game);
    }
  }

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
      riverActive: false,
      artefactActive: false,
    });
    setStage('lobby');
  }
  function handleStartGame() {
    sendMessage({"type": 'startGame', roomId});
    console.log("Sending: start room: " + roomId);
    // setStage('game');
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
  function handleHuntSelect(cardId: number, tokenType: 'c' | 'a' | 't') {
    if (!roomId || !player) return;

    console.log(`Hunt selected card ${cardId} with token type ${tokenType}`);

    sendMessage({
      type: 'huntSelect',
      roomId,
      player: { id: player.id },
      cardId,
      tokenType,
    });
  }
  function handleRiverChoice(cardId: number) {
    if (!roomId || !player) return;
    console.log("River player made the choice");
    sendMessage({
      type: 'riverChoice',
      roomId,
      player,
      cardId,
    })
  }
  function handleResolution() {
    if (!roomId || !player) return;

    console.log('Sending resolutionComplete message');

    sendMessage({
      type: 'resolutionComplete',
      roomId,
      playerId: player.id,
    });
  }
  function handleActivateCard(cardId: number) {
    if (!roomId || !player) return;

    console.log(`Activating card ${cardId}`);

    sendMessage({
      type: 'activateCard',
      roomId,
      player: { id: player.id },
      cardId,
    });
  }
  function handleEnding() {
    if (!roomId || !player) return;
    console.log('Going next turn! clearing data');

    sendMessage({
      type: 'endTurn',
      roomId,
      player,
    });
  }

  useEffect(() => {
    const latestMessage = messages[messages.length - 1];
    if (!latestMessage) return;
    console.log("Received: ", latestMessage);
    switch (latestMessage.type) {
      case 'roomUpdate':
        console.log("debug message: roomUpdate, readyToStart:", latestMessage.readyToStart);
        if (latestMessage.players) {
          setPlayers(latestMessage.players);
        }
        if (latestMessage.readyToStart !== undefined) {
          setReadyToStart(latestMessage.readyToStart);
        }
        break;
      case 'gameReady':
        console.log("debug message: updating: ", latestMessage.readyToStart, latestMessage.stage);
        if (latestMessage.game) {
          updateFromGame(latestMessage.game);
        }
        if (latestMessage.readyToStart !== undefined) {
          setReadyToStart(latestMessage.readyToStart);
        }
        if (latestMessage.stage) {
          setStage(latestMessage.stage);
          console.log('Stage updated to:', latestMessage.stage);
        }
        break;
      
      case 'gameUpdate':
      case 'planningComplete':
      case 'huntingComplete':
      case 'riverComplete':
      case 'activationComplete':
      case 'turnComplete':
        if (latestMessage.game?.state && latestMessage.game?.players) {
          updateFromGame(latestMessage.game);
        }
        break;

      default:
        break;
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
          readyToStart={readyToStart}
          onStart={() => {
            console.log('Sending startGame message');
            handleStartGame();
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
              artefactActive={player.artefactActive ?? false}
            />
          )}

          <div className="text-white text-center mt-10">
            {gameState && player ? (
              (() => {
                console.log("Current phase: ", gameState.phase);
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
                        onHuntSelect={handleHuntSelect}
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

                if (phase === 'riverChoice') {
                  return (
                    <RiverChoicePhase
                      player={player}
                      players={players}
                      gameState={gameState}
                      onSubmit={handleRiverChoice}
                    />
                  )
                }

                if (phase === 'resolution') {
                  if (player.isCreature) {
                    return (
                      <WaitingPage
                        gameState={gameState}
                        player={player}
                        players={players}
                      />
                    );
                  } else {
                    return (
                      <ResolutionPhase
                        gameState={gameState}
                        player={player}
                        players={players}
                        onContinue={handleResolution}
                        onActivateCard={handleActivateCard}
                      />
                    );
                  }
                }
                if (phase === 'ended') {
                  return (
                    <EndingPage
                      player={player}
                      gameState={gameState}
                      onEndTurn={handleEnding}
                    />
                  )
                }
              })()
            ) : (
              <h2>Waiting for game data...</h2>
            )}
            {gameState && player && <GameDownBar players={players} player={player} />}
          </div>
        </>

      )}
    </>
  );
}