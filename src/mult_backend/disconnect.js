const { removeConnection } = require('./game/gameDB');

exports.handler = async (event) => {
  const { connectionId } = event.requestContext;
  try {
    await removeConnection(connectionId);
    console.log(`Deleted connection ${connectionId}`);
    return { statusCode: 200 };
  } catch (err) {
    console.error('Error deleting connection:', err);
    return { statusCode: 500, body: 'Failed to delete connection' };
  }
};
