const { getConnection, addConnection } = require('./game/gameDB');

exports.handler = async (event) => {
  const connectionId = event.requestContext.connectionId;

  try {
    // Check if connection already exists to avoid overwriting
    const existing = await getConnection(connectionId);
    if (!existing) {
      await addConnection(connectionId, '', '');
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
