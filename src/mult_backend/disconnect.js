const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
} = require('@aws-sdk/lib-dynamodb');

const REGION = 'us-east-2';
const TABLE_GAMES = 'games';
const TABLE_CONNECTIONS = 'connections';

const ddbClient = new DynamoDBClient({ region: REGION });
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

exports.handler = async (event) => {
  const { connectionId } = event.requestContext;

  try {
    const connectionInfo = await ddbDocClient.send(new GetCommand({
      TableName: TABLE_CONNECTIONS,
      Key: { connectionId }
    }));
    //1
    if(!connectionInfo.Item) {
      console.log(`Connection ${connectionId} not found in connection table`);
      return {statusCode: 200, body: "Connection not found"}
    }

    const {roomId} = connectionInfo.Item;


    await ddbDocClient.send(new DeleteCommand({
      TableName: TABLE_CONNECTIONS,
      Key: { connectionId },
    }));
    //2
    if(!roomId){
      return {statusCode: 200, body: 'Disconnected without room'};
    }

    const gameResult = await ddbDocClient.send(new GetCommand({
      TableName: TABLE_GAMES,
      Key: {roomId}
    }));
    //3
    if(!gameResult.Item){
      console.log(`Game with roomId {roomId} not found`);
      return {statusCode: 200, body: 'Game room not found'};
    }
    
    const game = gameResult.Item;

    game.players = game.players.filter(player => player.connectionId != connectionId);

    if (game.state.phase !== 'lobby') {
      await ddbDocClient.send(new DeleteCommand({
        TableName: TABLE_GAMES,
        Key: { roomId }
      }));
      console.log(`Deleted game ${roomId} due to player disconnect during active game`);
    } else {
      game.players = game.players.filter(player => player.connectionId !== connectionId);
      await ddbDocClient.send(new PutCommand({
        TableName: TABLE_GAMES,
        Item: game
      }));
    }

    console.log(`Deleted connection ${connectionId}`);
    return { statusCode: 200, body: 'Disconnected and cleaned up'};
  } catch (err) {
    console.error('Error deleting connection:', err);
    return { statusCode: 500, body: 'Failed to delete connection cleanly' };
  }
};
