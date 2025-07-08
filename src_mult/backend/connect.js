const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'us-east-1' }));

exports.handler = async (event) => {
    const connectionId = event.requestContext.connectionId;
    
}