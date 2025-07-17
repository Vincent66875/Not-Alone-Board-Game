const { addConnection } = require('./gameDB'); // adjust path if needed

exports.handler = async (event) => {
  const connectionId = event.requestContext.connectionId;

  try {
    await addConnection(connectionId, '', '');
    return { statusCode: 200, body: 'Connected' };
  } catch (err) {
    console.error('Error storing connection:', err);
    return {
      statusCode: 500,
      body: 'Failed to connect',
    };
  }
};
