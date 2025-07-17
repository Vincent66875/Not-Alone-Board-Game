import { 
    DynamoDBDocumentClient,
    GetCommand,
    PutCommand,
    UpdateCommand,
    DeleteCommand,
} from "@aws-sdk/lib-dynamodb";
import {DynamoDBClient} from '@aws-sdk/client-dynamodb';
import type {Game} from './gameEngine';

const REGION = 'us-east-2';
const TABLE_GAMES = 'games';
const TABLE_CONNECTIONS = 'connections';

const ddbClient = new DynamoDBClient({region: REGION});
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

export async function getGame(roomId: string): Promise<Game | null>{
    const result = await ddbDocClient.send(new GetCommand({
        TableName: TABLE_GAMES,
        Key: {roomId}
    }));
    return result.Item as Game || null;
}
//Save or Update
export async function saveGame(game: Game): Promise<void> {
    await ddbClient.send( new PutCommand({
        TableName: TABLE_GAMES,
        Item: game,
    }));
}

export async function removeConnection(connectionId: string): Promise<void> {
    await ddbClient.send(new DeleteCommand({
        TableName: TABLE_CONNECTIONS,
        Key: { connectionId },
    }));
}

export async function addConnection(connectionId: string, roomId: string, playerName: string): Promise<void> {
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

export async function updateConnectionInfo(connectionId: string, roomId: string, playerName: string): Promise<void> {
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