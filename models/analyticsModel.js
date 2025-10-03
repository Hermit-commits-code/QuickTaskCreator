// models/analyticsModel.js
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./tasks.db");

function initAnalyticsTables() {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS workspaces (
      id TEXT PRIMARY KEY,
      name TEXT,
      first_seen TEXT,
      last_active TEXT
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      workspace_id TEXT,
      name TEXT,
      first_seen TEXT,
      last_active TEXT
    )`);
  });
}

function logWorkspace(workspaceId, name) {
  db.run(
    `INSERT OR IGNORE INTO workspaces (id, name, first_seen, last_active) VALUES (?, ?, datetime('now'), datetime('now'))`,
    [workspaceId, name]
  );
  db.run(`UPDATE workspaces SET last_active = datetime('now') WHERE id = ?`, [
    workspaceId,
  ]);
}

function logUser(userId, workspaceId, name) {
  db.run(
    `INSERT OR IGNORE INTO users (id, workspace_id, name, first_seen, last_active) VALUES (?, ?, ?, datetime('now'), datetime('now'))`,
    [userId, workspaceId, name]
  );
  db.run(`UPDATE users SET last_active = datetime('now') WHERE id = ?`, [
    userId,
  ]);
}

module.exports = {
  db,
  initAnalyticsTables,
  logWorkspace,
  logUser,
};
