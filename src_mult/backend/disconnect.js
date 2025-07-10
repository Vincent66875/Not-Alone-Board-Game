const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'us-east-2' }));

exports.handler = async (event) => {
  const { connectionId } = event.requestContext;

  try {
    await ddb.send(new DeleteCommand({
      TableName: 'connections',
      Key: { connectionId }
    }));
    console.log(`Deleted connection ${connectionId}`);
    return { statusCode: 200 };
  } catch (err) {
    console.error('Error deleting connection:', err);
    return { statusCode: 500, body: 'Failed to delete connection' };
  }
};
