// models/analyticsModel.js
const connectDB = require('../db');

// No need for table creation in MongoDB

async function logWorkspace(workspaceId, name) {
  const db = await connectDB();
  const workspaces = db.collection('workspaces');
  await workspaces.updateOne(
    { id: workspaceId },
    {
      $setOnInsert: {
        first_seen: new Date(),
      },
      $set: {
        name,
        last_active: new Date(),
      },
    },
    { upsert: true },
  );
}

async function logUser(userId, workspaceId, name) {
  const db = await connectDB();
  const users = db.collection('users');
  await users.updateOne(
    { id: userId, workspace_id: workspaceId },
    {
      $setOnInsert: {
        first_seen: new Date(),
      },
      $set: {
        name,
        last_active: new Date(),
        workspace_id: workspaceId,
      },
    },
    { upsert: true },
  );
}

module.exports = {
  logWorkspace,
  logUser,
};
