const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient,
    GetCommand, 
    PutCommand, 
    UpdateCommand} = require('@aws-sdk/lib-dynamodb');
const AWS = require('aws-sdk');
const { connect } = require('http2');
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({region: 'us-east-1'}));
const apiGateway = new AWS.apiGatewayManagementApi({
    endpoint: process.env.WEBSOCKET_ENDPOINT,
});

exports.handler = async (event) => {
    const {connectionId} = event.requestContext;
    const body = JSON.parse(event.body)

    try{
        body = JSON.parse(event.body);
    }catch(err){
        return {statusCode: 400, body: 'Invalid JSON'};
    }

    try{
        switch (body.type){
            case 'joinRoom':
                return await handleJoinRoom(body, connectionId);
                break;
            case 'playCard':
                return await handlePlayCard(body, connectionId);
                break;
            case 'endTurn':
                return await handleEndTurn(body, connectionId);
                break;
            default:
                return {statusCode: 400, body: 'Unknown message type'};
        }
    } catch(err) {
        console.error("Error handling message: ", err);
        return {statusCode: 500, body: "Internal server error"};
    };
};

async function handleJoinRoom(body, connectionId) {
    const {roomId, playerName} = body;
    if(!roomId || !playerName) {
        return {statusCode: 400, body: 'Missing room id or playerName'};
    }
    const gameRes = await ddb.send(new GetCommand({
        TableName: 'games',
        Key: {roomId},
    }));

    const game = gameRes.Item || {
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
    const alreadyjoined = game.players.some(p => p.connectionId === connectionId);
    if (!alreadyjoined) {
        game.players.push({connectionId, name: playerName});
    }
    
    await ddb.send(new PutCommand({
        TableName: 'games',
        Item: game
    }));
    await ddb.send(new PutCommand({
        TableName: 'connections',
        Item: {
            connectionId,
            roomId,
            playerName,
            joinedAt: new Date().toISOString(),
        }
    }));
    await broadcastToRoom(roomId, {
        type: 'roomUpdate',
        players: game.players.map(p => p.name)
    });

    return {statusCode: 200};
}

async function handlePlayCard(body, connectionId){
    const {roomId, cardId} = body;
    if(!roomId || !cardId){
        return {statusCode: 400, body: 'Missing room id or cardId'};
    }
    //add valudation + update state
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

  // Later: Track which players have ended their turn and progress the round

  await broadcastToRoom(roomId, {
    type: 'playerEndedTurn',
    connectionId
  });

  return { statusCode: 200 };
}

async function broadcastToRoom(roomId, message){
    const gameRes = await ddb.send(new GetCommand({
        TableName: 'games',
        Key: {roomId}
    }));

    const game = gameRes.Item;
    if(!game || !Array.isArray(game.players)) return;

    const postData = JSON.stringify(message);

    await Promise.all(
        game.players.map(async (player) => {
        try {
            await apiGateway.postToConnection({
            ConnectionId: player.connectionId,
            Data: postData
            }).promise();
        } catch (e) {
            console.warn(`Failed to send to ${player.connectionId}:`, e.message);
        }
        })
    );
}