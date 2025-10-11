// Analytics handler for workspace and user logging (MongoDB async)
const connectDB = require('../../db');

async function logWorkspace(workspaceId, name) {
  const db = await connectDB();
  await db
    .collection('workspaces')
    .updateOne(
      { id: workspaceId },
      {
        $setOnInsert: { name, first_seen: new Date().toISOString() },
        $set: { last_active: new Date().toISOString() },
      },
      { upsert: true },
    );
}

async function logUser(userId, workspaceId, name) {
  const db = await connectDB();
  await db
    .collection('users')
    .updateOne(
      { id: userId },
      {
        $setOnInsert: {
          workspace_id: workspaceId,
          name,
          first_seen: new Date().toISOString(),
        },
        $set: { last_active: new Date().toISOString() },
      },
      { upsert: true },
    );
}

module.exports = { logWorkspace, logUser };
