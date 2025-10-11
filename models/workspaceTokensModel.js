// models/workspaceTokensModel.js
const connectDB = require('../db');

async function saveTokenForTeam(teamId, botToken) {
  const db = await connectDB();
  await db
    .collection('workspace_tokens')
    .updateOne(
      { team_id: teamId },
      { $set: { bot_token: botToken } },
      { upsert: true },
    );
}

async function getTokenForTeam(teamId) {
  const db = await connectDB();
  const row = await db
    .collection('workspace_tokens')
    .findOne({ team_id: teamId });
  return row ? row.bot_token : null;
}

module.exports = {
  saveTokenForTeam,
  getTokenForTeam,
};
