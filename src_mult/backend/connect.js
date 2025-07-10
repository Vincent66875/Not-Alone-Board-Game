const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');

const dynamodb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'us-east-2' }));

exports.handler = async (event) => {
    const connectionId = event.requestContext.connectionId;
    try{
        await dynamodb.send(new PutCommand({
            TableName: 'connections',
            Item: {
                connectionId,
                joinedAt: new Date().toISOString(),
            }
        }));
        return {statusCode: 200, body: 'Connected'}
    }catch(err){
        console.error('Error storing connection:', err)
        return {
            statusCode: 500,
            body: 'Failed to connect'
        };
    }
};