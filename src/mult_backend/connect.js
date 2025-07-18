const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: 'us-east-2' });
const ddb = DynamoDBDocumentClient.from(client);

const CONNECTIONS_TABLE = 'connections';

exports.handler = async (event) => {
  const connectionId = event.requestContext.connectionId;

  try {
    // Check if connection already exists
    const getResp = await ddb.send(new GetCommand({
      TableName: CONNECTIONS_TABLE,
      Key: { connectionId },
    }));

    if (!getResp.Item) {
      await ddb.send(new PutCommand({
        TableName: CONNECTIONS_TABLE,
        Item: {
          connectionId,
          roomId: '',
          playerName: '',
          connectedAt: new Date().toISOString(),
        },
      }));
    }

    return { statusCode: 200, body: 'Connected' };
  } catch (err) {
    console.error('Error storing connection:', err);
    return {
      statusCode: 500,
      body: 'Failed to connect',
    };
  }
};
