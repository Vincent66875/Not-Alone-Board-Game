const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const { ApiGatewayManagementApiClient, PostToConnectionCommand } = require('@aws-sdk/client-apigatewaymanagementapi');
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'us-east-2' }));
const apiGateway = new ApiGatewayManagementApiClient({ endpoint: process.env.WEBSOCKET_ENDPOINT });
const {v4: uuidv4} = require('uuid');

const TABLE_GAMES = 'games';
const TABLE_CONNECTIONS = 'connections';

const { startGame } = require('./gameEngine');

exports.handler = async (event) => {
    const { connectionId } = event.requestContext;
    let body;
    try {
        body = JSON.parse(event.body);
    } catch (err) {
        return { statusCode: 400, body: 'Invalid JSON' };
    }

    try {
        switch (body.type) {
            case 'joinRoom':
                return await handleJoinRoom(body, connectionId);
            case 'playCard':
                return await handlePlayCard(body, connectionId);
            case 'huntSelect':
                return await handleHuntChoice(body, connectionId);
            case 'endTurn':
                return await handleEndTurn(body, connectionId);
            case 'startGame':
                return await handleStartGame(body, connectionId);
            case 'leaveRoom':
                return await handleLeaveGame(body, connectionId);
            default:
                return { statusCode: 400, body: 'Unknown message type' };
        }
    } catch (err) {
        console.error("Error handling message:", err);
        return { statusCode: 500, body: "Internal server error" };
    }
};

async function handleJoinRoom(body, connectionId) {
    const { roomId, playerName } = body;
    if (!roomId || !playerName) {
        return { statusCode: 400, body: 'Missing roomId or playerName' };
    }

    let game = await getGame(roomId);
    const playerId = uuidv4();

    if (!game) {
        game = {
            roomId,
            players: [],
            state: {
                phase: 'lobby',
                turn: 0,
                board: {
                    rescue: 0,
                    assimilation: 0,
                },
                history: [],
            },
            host: connectionId,
            createdAt: new Date().toISOString(),
        };
    }

    const alreadyJoined = game.players.some(p => p.connectionId === connectionId);
    if (!alreadyJoined) {
        game.players.push({
            id: playerId,
            name: playerName,
            connectionId,
            hand: [],
            discard: [],
            isCreature: false,
            will: 0,
            survival: [],
            riverActive: false,
        });
    }

    await saveGame(game);
    await addConnection(connectionId, roomId, playerName);

    await broadcastToRoom(roomId, {
        type: 'roomUpdate',
        players: game.players.map(p => ({
            id: p.id,
            name: p.name,
            connectionId: p.connectionId,
            hand: p.hand,
            discard: p.discard,
            isCreature: p.isCreature,
            will: p.will,
            survival: p.survival,
            riverActive: p.riverActive,
        })),
        readyToStart: game.players.length >= 1,
    });

    return { statusCode: 200 };
}

async function handlePlayCard(body, connectionId) {
  const { roomId, player } = body;

  console.log("Incoming playCard:", JSON.stringify(body, null, 2));

  if (!roomId || !player) {
    console.log("Missing roomId or player object");
    return { statusCode: 400, body: 'Missing roomId or player' };
  }

  const { id: playerId, playedCard, playedCardAlt, riverActive } = player;

  if (!playerId) {
    console.log("Missing playerId");
    return { statusCode: 400, body: 'Missing playerId' };
  }
  if (!playedCard) {
    console.log("Missing cardId");
    return { statusCode: 400, body: 'Missing cardId' };
  }

  // ✅ Load game
  const game = await getGame(roomId);
  if (!game) {
    console.log("Game not found for roomId:", roomId);
    return { statusCode: 404, body: 'Game not found' };
  }

  // ✅ Find the player in game
  const thisPlayer = game.players.find(p => p.id === playerId);
  if (!thisPlayer) {
    console.log("Player not found in game:", playerId);
    return { statusCode: 404, body: 'Player not found in game' };
  }

  // Update player's playedCard
  if (riverActive) {
    if (!playedCardAlt) {
      console.log("River active but missing alt card");
      return { statusCode: 400, body: 'River active – need 2 cards' };
    }
    thisPlayer.playedCard = playedCard;
    thisPlayer.playedCardAlt = playedCardAlt;
  } else {
    thisPlayer.playedCard = playedCard;
    delete thisPlayer.playedCardAlt;
  }

  console.log(`Player ${playerId} played:`, {
    playedCard,
    playedCardAlt: thisPlayer.playedCardAlt,
  });

  const allPlayerPlayed = game.players
    .filter(p => !p.isCreature)
    .every(p => p.playedCard !== undefined);

  console.log("All players played?", allPlayerPlayed);

  await saveGame(game);
  console.log("Saved game after player played");

  await broadcastToRoom(roomId, {
    type: 'planningWait',
    game,
  });

  if (allPlayerPlayed && game.state.phase === 'planning') {
    game.state.phase = 'hunting';
    await saveGame(game);
    console.log("Transitioned to hunting phase");

    await broadcastToRoom(roomId, {
      type: 'cardPlayed',
      game,
    });
  }

  return { statusCode: 200 };
}

async function handleHuntChoice(body, connectionId) {
  const { roomId, player, cardId, actionType } = body;

  if (!roomId || !player?.id) {
    return { statusCode: 400, body: 'Missing roomId or player id' };
  }
  if (cardId === undefined || !actionType) {
    return { statusCode: 400, body: 'Missing cardId or actionType' };
  }

  const game = await getGame(roomId);
  if (!game) {
    return { statusCode: 404, body: 'Game not found' };
  }

  if (!Array.isArray(game.state.huntedLocations)) {
    game.state.huntedLocations = [];
  }

  game.state.huntedLocations.push({ cardId, type: actionType });

  game.state.remainingTokens -= 1;

  if (game.state.remainingTokens <= 0) {
    game.state.phase = 'resolution';
  }

  await saveGame(game);

  await broadcastToRoom(roomId, {
    type: 'huntSelectUpdate',
    game,
  });

  return { statusCode: 200 };
}


async function handleStartGame(body, connectionId) {
  const { roomId } = body;

  await debugBroadcast(roomId, 'handleStartGame triggered');

  if (!roomId) {
    await debugBroadcast(roomId, 'Missing roomId');
    return { statusCode: 400, body: 'Missing roomId' };
  }

  let game;
  try {
    game = await getGame(roomId);
    await debugBroadcast(roomId, 'Fetched game: ' + JSON.stringify(game));
  } catch (err) {
    await debugBroadcast(roomId, 'Error fetching game: ' + err.message);
    return { statusCode: 500, body: 'DB error' };
  }

  if (!game) {
    await debugBroadcast(roomId, 'Game not found');
    return { statusCode: 404, body: 'Game not found' };
  }

  let updatedGame;
  try {
    updatedGame = startGame(game);
    await debugBroadcast(roomId, 'Game after startGame: ' + JSON.stringify(updatedGame));
  } catch (err) {
    await debugBroadcast(roomId, 'Error in startGame: ' + err.message);
    return { statusCode: 500, body: 'startGame failed' };
  }

  try {
    await saveGame(updatedGame);
    await broadcastToRoom(roomId, {
      type: 'roomUpdate',
      players: updatedGame.players.map(p => ({
        id: p.id,
        name: p.name,
        connectionId: p.connectionId,
        hand: p.hand,
        discard: p.discard,
        isCreature: p.isCreature,
        will: p.will,
        survival: p.survival,
        riverActive: p.riverActive,
      })),
      readyToStart: true,
    });
    await debugBroadcast(roomId, 'Broadcasted roomUpdate');
  } catch (err) {
    await debugBroadcast(roomId, 'Error saving/broadcasting roomUpdate: ' + err.message);
    return { statusCode: 500, body: 'Save failed' };
  }

  try {
    await broadcastToRoom(roomId, {
      type: 'stageUpdate',
      stage: 'game',
    });
    await debugBroadcast(roomId, 'Broadcasted stageUpdate');

    await broadcastToRoom(roomId, {
      type: 'gameUpdate',
      gameState: updatedGame.state,
      players: updatedGame.players,
    });
    await debugBroadcast(roomId, 'Broadcasted gameUpdate');
  } catch (err) {
    await debugBroadcast(roomId, 'Broadcast error: ' + err.message);
  }

  return { statusCode: 200 };
}

async function handleLeaveGame(body, connectionId) {
    const { roomId, playerId } = body;
    if (!roomId || !playerId) {
        return { statusCode: 400, body: 'Missing roomId' };
    }

    const game = await getGame(roomId);
    if (!game) {
        return { statusCode: 404, body: 'Game not found' };
    }
    game.players = game.players.filter(p => p.id !== playerId);
    if(game.players.length === 0){
        await deleteGame(roomId);
    }else{
        await saveGame(game);
        await broadcastToRoom(roomId, {
            type: 'roomUpdate',
            players: game.players,
            readyToStart: game.players.length>=1,
        });
    }
    await removeConnection(connectionId);

    return { statusCode: 200 };
}

async function broadcastToRoom(roomId, message) {
    const game = await getGame(roomId);
    if (!game || !Array.isArray(game.players)) {
        return { statusCode: 404, body: 'Room not found or no players' };
    }

    await Promise.all(
        game.players.map(async (player) => {
            try {
                await apiGateway.send(new PostToConnectionCommand({
                    ConnectionId: player.connectionId,
                    Data: Buffer.from(JSON.stringify(message)),
                }));
            } catch (e) {
                console.warn(`Failed to send to ${player.connectionId}:`, e.message);
            }
        })
    );
}

async function getGame(roomId) {
    const result = await ddb.send(new GetCommand({
        TableName: TABLE_GAMES,
        Key: { roomId }
    }));
    return result.Item || null;
}

async function saveGame(game) {
    await ddb.send(new PutCommand({
        TableName: TABLE_GAMES,
        Item: game,
    }));
}

async function deleteGame(game) {
    await ddb.send(new DeleteCommand({
        TableName: TABLE_GAMES,
        Key: roomId
    }));
}

async function addConnection(connectionId, roomId, playerName) {
    await ddb.send(new PutCommand({
        TableName: TABLE_CONNECTIONS,
        Item: {
            connectionId,
            roomId,
            playerName,
            updatedAt: new Date().toISOString()
        }
    }));
}
async function removeConnection(connectionId, roomId, playerName) {
    await ddb.send(new DeleteCommand({
        TableName: TABLE_CONNECTIONS,
        Key: roomId,
    }));
}
async function debugBroadcast(roomId, message) {
  await broadcastToRoom(roomId, {
    type: 'debug',
    message,
  });
}