// models/adminModel.js
const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./tasks.db");

function initAdminTable() {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS admins (
      user_id TEXT,
      workspace_id TEXT NOT NULL,
      PRIMARY KEY (user_id, workspace_id)
    )`);
  });
}

function addAdmin(userId, workspace_id, callback) {
  db.run(
    `INSERT OR IGNORE INTO admins (user_id, workspace_id) VALUES (?, ?)`,
    [userId, workspace_id],
    callback
  );
}

function removeAdmin(userId, workspace_id, callback) {
  db.run(
    `DELETE FROM admins WHERE user_id = ? AND workspace_id = ?`,
    [userId, workspace_id],
    callback
  );
}

function isAdmin(userId, workspace_id, callback) {
  db.get(
    `SELECT * FROM admins WHERE user_id = ? AND workspace_id = ?`,
    [userId, workspace_id],
    (err, row) => {
      callback(err, !!row);
    }
  );
}

module.exports = {
  db,
  initAdminTable,
  addAdmin,
  removeAdmin,
  isAdmin,
};
