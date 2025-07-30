const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const { ApiGatewayManagementApiClient, PostToConnectionCommand } = require('@aws-sdk/client-apigatewaymanagementapi');
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'us-east-2' }));
const apiGateway = new ApiGatewayManagementApiClient({ endpoint: process.env.WEBSOCKET_ENDPOINT });
const {v4: uuidv4} = require('uuid');

const TABLE_GAMES = 'games';
const TABLE_CONNECTIONS = 'connections';

const { startGame, initializeGame, handleActivateCard, handleCatching, handleReset, handleWill } = require('./gameEngine');

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
            case 'riverChoice':
                return await handleRiverChoice(body, connectionId);
            case 'activateCard':
                return await handleActivate(body, connectionId);
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
        game = initializeGame(roomId, []);
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
        readyToStart: game.players.length >= 3,
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

  //Load game 
  const game = await getGame(roomId);
  if (!game) {
    console.log("Game not found for roomId:", roomId);
    return { statusCode: 404, body: 'Game not found' };
  }

  //Find the player in game
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
    type: 'gameUpdate',
    game,
  });

  if (allPlayerPlayed && game.state.phase === 'planning') {
    game.state.phase = 'hunting';
    await saveGame(game);
    console.log("Transitioned to hunting phase");

    await broadcastToRoom(roomId, {
      type: 'planningComplete',
      game,
    });
  } 

  return { statusCode: 200 };
}

async function handleHuntChoice(body, connectionId) {
  console.log('handleHuntChoice called with body:', body);
 
  const { roomId, player, cardId, tokenType } = body;

  if (!roomId || !player?.id) {
    console.log('Missing roomId or player id');
    return { statusCode: 400, body: 'Missing roomId or player id' };
  }
  if (cardId === undefined || !tokenType) {
    console.log('Missing cardId or tokenType');
    return { statusCode: 400, body: 'Missing cardId or tokenType' };
  }

  const game = await getGame(roomId);
  if (!game) {
    console.log('Game not found for room:', roomId);
    return { statusCode: 404, body: 'Game not found' };
  }

  if (!Array.isArray(game.state.huntedLocations)) {
    game.state.huntedLocations = [];
  }

  game.state.huntedLocations.push({ cardId, type: tokenType });

  game.state.remainingTokens -= 1;

  if (game.state.remainingTokens <= 0) {
    const anyRiverActive = game.players.some(p => p.riverActive);
    if (anyRiverActive) {
        game.state.phase = 'riverChoice';
        console.log("Player with river active exist");
    }else{
        game.state.phase = 'resolution';
        console.log("Skip river choice page");
        game = handleCatching(game);
    }
  }

  await saveGame(game);

  await broadcastToRoom(roomId, {
    type: 'huntingComplete',
    game,
  });
  console.log('Broadcasted huntSelectUpdate');

  return { statusCode: 200 };
}

async function handleRiverChoice(body, connectionId) {
  const { roomId, player, cardId } = body;

  if (!roomId || !player?.id || cardId === undefined) {
    console.log('Missing roomId, player id, or cardId');
    return { statusCode: 400, body: 'Missing parameters' };
  }

  const game = await getGame(roomId);
  if (!game) {
    console.log('Game not found for room:', roomId);
    return { statusCode: 404, body: 'Game not found' };
  }

  const thisPlayer = game.players.find(p => p.id === player.id);
  if (!thisPlayer) {
    return { statusCode: 404, body: 'Player not found' };
  }

  // Update the player's state
  thisPlayer.riverActive = false;
  thisPlayer.playedCardAlt = undefined;
  thisPlayer.playedCard = cardId;

  // Check if any players still need to choose
  const stillWaiting = game.players.some(p => !p.isCreature && p.riverActive);

  if (!stillWaiting) {
    // Calculate catching and advance to resolution phase
    await handleCatching(game);
    game.state.phase = 'resolution';
    game.state.history.push('All River choices resolved. Moving to resolution phase.');
  }

  await saveGame(game);

  await broadcastToRoom(roomId, {
    type: stillWaiting ? 'gameUpdate' : 'riverComplete',
    game,
  });

  console.log(`Broadcasted ${stillWaiting ? 'riverUpdate' : 'riverComplete'}`);

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
      type: 'gameReady',
      game: updatedGame,
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
      stage: 'game',
    });

    await debugBroadcast(roomId, 'Broadcasted gameUpdate');
  } catch (err) {
    await debugBroadcast(roomId, 'Error saving/broadcasting gameUpdate: ' + err.message);
    return { statusCode: 500, body: 'Save failed' };
  }

  return { statusCode: 200 };
}

async function handleActivate(body, connectionId) {
  const { roomId, player, cardId, selectedCardIds, selectedSurvivalCard, targetPlayerId, effectChoice } = body;
  if (!roomId || !player?.id || cardId === undefined) {
    return { statusCode: 400, body: 'Missing parameters' };
  }

  const game = await getGame(roomId);
  if (!game) {
    return { statusCode: 404, body: 'Game not found' };
  }

  if (!game.players) {
    return { statusCode: 404, body: 'Players not available' };
  }

  const thisPlayerIndex = game.players.findIndex(p => p.id === player.id);
  if (thisPlayerIndex === -1) {
    return { statusCode: 404, body: 'Player not found' };
  }

  const updatedGame = handleActivateCard(game, player.id, cardId, {
    selectedCardIds,
    selectedSurvivalCard,
    targetPlayerId,
    effectChoice,
  });
  //Check Will change
  const checkedGame = handleWill(updatedGame);

  // Mark player as activated
  updatedGame.players[thisPlayerIndex].hasActivated = true;

  // Check if all players have activated
  const allActivated = updatedGame.players
    .filter(p => !p.isCreature) // Skip creature
    .every(p => p.hasActivated);

  await saveGame(updatedGame);

  if (allActivated) {
    updatedGame.state.phase = 'endTurn';
    await broadcastToRoom(roomId, {
      type: 'activationComplete',
      game: updatedGame,
    });
  } else {
    await broadcastToRoom(roomId, {
      type: 'gameUpdate',
      game: updatedGame,
    });
  }

  return { statusCode: 200 };
}

async function handleEndTurn(body, connectionId) {
  const { roomId, player } = body;

  if (!roomId || !player?.id) {
    console.log('Missing roomId or player');
    return { statusCode: 400, body: 'Missing parameters' };
  }

  const game = await getGame(roomId);
  if (!game) {
    console.log('Game not found');
    return { statusCode: 404, body: 'Game not found' };
  }

  const updatedGame = handleReset(game);

  await saveGame(updatedGame);

  await broadcastToRoom(roomId, {
    type: 'turnComplete',
    game: updatedGame,
  });

  console.log('Turn ended, broadcasted turnComplete');

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
            game,
            readyToStart: game.players.length>=3,
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

async function deleteGame(roomId) {
    await ddb.send(new DeleteCommand({
        TableName: TABLE_GAMES,
        Key: {roomId}
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
async function removeConnection(connectionId) {
    await ddb.send(new DeleteCommand({
        TableName: TABLE_CONNECTIONS,
        Key: {connectionId},
    }));
}
async function debugBroadcast(roomId, message) {
  await broadcastToRoom(roomId, {
    type: 'debug',
    message,
  });
}