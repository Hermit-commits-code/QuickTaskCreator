// models/activityLogModel.js
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./tasks.db");

function initActivityLogTable() {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      action TEXT,
      details TEXT,
      timestamp TEXT
    )`);
  });
}

function logActivity(userId, action, details, callback) {
  db.run(
    `INSERT INTO activity_log (user_id, action, details, timestamp) VALUES (?, ?, ?, datetime('now'))`,
    [userId, action, details],
    callback
  );
}

function getRecentActivity(limit, callback) {
  db.all(
    `SELECT * FROM activity_log ORDER BY timestamp DESC LIMIT ?`,
    [limit],
    callback
  );
}

module.exports = {
  db,
  initActivityLogTable,
  logActivity,
  getRecentActivity,
};
