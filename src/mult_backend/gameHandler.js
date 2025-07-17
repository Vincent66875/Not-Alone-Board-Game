const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { getGame, saveGame, addConnection, updateConnectionInfo } = require('./game/gameDB');
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({region: 'us-east-2'}));
const { ApiGatewayManagementApiClient, PostToConnectionCommand } = 
    require('@aws-sdk/client-apigatewaymanagementapi');

const apiGateway = new ApiGatewayManagementApiClient({
    endpoint: process.env.WEBSOCKET_ENDPOINT,
});
//Lambda testing
exports.handler = async (event) => {
    const {connectionId} = event.requestContext;
    let body;
    try {
        body = JSON.parse(event.body);
    } catch(err) {
        return {statusCode: 400, body: 'Invalid JSON'};
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
            default:
                return {statusCode: 400, body: 'Unknown message type'};
        }
    } catch(err) {
        console.error("Error handling message: ", err);
        return {statusCode: 500, body: "Internal server error"};
    }
};

async function handleJoinRoom(body, connectionId) {
    const {roomId, playerName} = body;
    if (!roomId || !playerName) {
        return {statusCode: 400, body: 'Missing room id or playerName'};
    }
    let game = await getGame(roomId);

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
        game.players.push({connectionId, name: playerName});
    }

    await saveGame(game);

    await addConnection(connectionId, roomId, playerName);
    await updateConnectionInfo(connectionId, roomId, playerName);
    
    await broadcastToRoom(roomId, {
        type: 'roomUpdate',
        players: game.players.map(p => p.name),
        readyToStart: game.players.length >= 1,
    });

    return {statusCode: 200};
}

async function handlePlayCard(body, connectionId) {
    const {roomId, cardId} = body;
    if (!roomId || !cardId) {
        return {statusCode: 400, body: 'Missing room id or cardId'};
    }
    // TODO: Add validation + update game state using gameDB helpers if needed

    await broadcastToRoom(roomId, {
        type: 'cardPlayed',
        connectionId,
        cardId,
    });

    return {statusCode: 200};
}

async function handleEndTurn(body, connectionId) {
    const { roomId } = body;
    if (!roomId) {
        return { statusCode: 400, body: 'Missing roomId' };
    }

    // TODO: Track ended turns and advance round if needed

    await broadcastToRoom(roomId, {
        type: 'playerEndedTurn',
        connectionId,
    });

    return { statusCode: 200 };
}

async function handleStartGame(body, connectionId) {
    const { roomId } = body;
    if (!roomId) {
        return {statusCode: 400, body: 'Missing roomId'};
    }

    const game = await getGame(roomId);
    // if (!game || game.players.length < 1) {
    //     return {statusCode: 400, body: "Not enough players to start the game"};
    // }

    game.state.phase = 'main';

    await saveGame(game);

    await broadcastToRoom(roomId, {
        type: 'gameStart',
        state: game.state,
    });

    return {statusCode: 200};
}

async function broadcastToRoom(roomId, message) {
    const game = await getGame(roomId);

    if (!game || !Array.isArray(game.players)) {
        return {statusCode: 404, body: 'Room not found or no players'};
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
