const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const { ApiGatewayManagementApiClient, PostToConnectionCommand } = require('@aws-sdk/client-apigatewaymanagementapi');
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'us-east-2' }));
const apiGateway = new ApiGatewayManagementApiClient({ endpoint: process.env.WEBSOCKET_ENDPOINT });
const {v4: uuidv4} = require('uuid');

const TABLE_GAMES = 'games';
const TABLE_CONNECTIONS = 'connections';

const { startGame } = require('./game/gameEngine');

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
        players: game.players.map(p => p.name),
        readyToStart: game.players.length >= 1,
    });

    return { statusCode: 200 };
}

async function handlePlayCard(body, connectionId) {
    const { roomId, cardId } = body;
    if (!roomId || !cardId) {
        return { statusCode: 400, body: 'Missing roomId or cardId' };
    }

    await broadcastToRoom(roomId, {
        type: 'cardPlayed',
        connectionId,
        cardId,
    });

    return { statusCode: 200 };
}

async function handleEndTurn(body, connectionId) {
    const { roomId } = body;
    if (!roomId) {
        return { statusCode: 400, body: 'Missing roomId' };
    }

    await broadcastToRoom(roomId, {
        type: 'playerEndedTurn',
        connectionId,
    });

    return { statusCode: 200 };
}

async function handleStartGame(body, connectionId) {
  const { roomId } = body;
  await broadcastToRoom(roomId, {
    type: 'Test broadCast',
    stage: 'join',
  });
  if (!roomId) {
    return { statusCode: 400, body: 'Missing roomId' };
  }

  const game = await getGame(roomId);
  if (!game) {
    return { statusCode: 404, body: 'Game not found' };
  }


  const updatedGame = startGame(game);
  await saveGame(updatedGame);

  await broadcastToRoom(roomId, {
    type: 'stageUpdate',
    stage: 'game',
  });

  await broadcastToRoom(roomId, {
    type: 'gameUpdate',
    gameState: game.state,
  });

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
        Item: game
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