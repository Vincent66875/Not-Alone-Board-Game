import type {Game} from './gameEngine';
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
} = require('@aws-sdk/lib-dynamodb');

const ddbClient = new DynamoDBClient({ region: 'us-east-2' });
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

const TABLE_GAMES = 'games';
const TABLE_CONNECTIONS = 'connections';

async function getGame(roomId: string): Promise<Game | null>{
    const result = await ddbDocClient.send(new GetCommand({
        TableName: TABLE_GAMES,
        Key: {roomId}
    }));
    return (result.Item as Game) || null;

}
//Save or Update
async function saveGame(game: Game): Promise<void> {
    await ddbClient.send( new PutCommand({
        TableName: TABLE_GAMES,
        Item: game,
    }));
}

async function removeConnection(connectionId: string): Promise<void> {
    await ddbClient.send(new DeleteCommand({
        TableName: TABLE_CONNECTIONS,
        Key: { connectionId },
    }));
}

async function addConnection(connectionId: string, roomId: string, playerName: string): Promise<void> {
  console.log("addConnection called with", connectionId, roomId, playerName); // <-- Add this
  await ddbDocClient.send(new PutCommand({
    TableName: TABLE_CONNECTIONS,
    Item: {
      connectionId,
      roomId,
      playerName,
      joinedAt: new Date().toISOString(),
    },
  }));
}


async function updateConnectionInfo(connectionId: string, roomId: string, playerName: string): Promise<void> {
  await ddbClient.send(new UpdateCommand({
    TableName: 'connections',
    Key: { connectionId },
    UpdateExpression: 'SET roomId = :roomId, playerName = :playerName',
    ExpressionAttributeValues: {
      ':roomId': roomId,
      ':playerName': playerName,
    },
  }));
}

module.exports = {
  getGame,
  saveGame,
  removeConnection,
  addConnection,
  updateConnectionInfo,
};
