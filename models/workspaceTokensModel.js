// models/workspaceTokensModel.js
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./tasks.db');

function initWorkspaceTokensTable() {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS workspace_tokens (
      team_id TEXT PRIMARY KEY,
      bot_token TEXT NOT NULL
    )`);
  });
}

function saveTokenForTeam(teamId, botToken, callback) {
  db.run(
    `INSERT OR REPLACE INTO workspace_tokens (team_id, bot_token) VALUES (?, ?)`,
    [teamId, botToken],
    callback,
  );
}

function getTokenForTeam(teamId, callback) {
  db.get(
    `SELECT bot_token FROM workspace_tokens WHERE team_id = ?`,
    [teamId],
    (err, row) => {
      if (err) return callback(err);
      callback(null, row ? row.bot_token : null);
    },
  );
}

module.exports = {
  initWorkspaceTokensTable,
  saveTokenForTeam,
  getTokenForTeam,
};
