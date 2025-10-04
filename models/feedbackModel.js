// Feedback model for SQLite
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("tasks.db");

function createFeedbackTable() {
  db.run(`CREATE TABLE IF NOT EXISTS feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workspace_id TEXT NOT NULL,
    user_id TEXT,
    feedback TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
}

function insertFeedback(workspace_id, user_id, feedback) {
  const { encrypt } = require("../utils/encryption");
  return new Promise((resolve, reject) => {
    const encryptedFeedback = encrypt(feedback);
    db.run(
      "INSERT INTO feedback (workspace_id, user_id, feedback) VALUES (?, ?, ?)",
      [workspace_id, user_id, encryptedFeedback],
      function (err) {
        if (err) return reject(err);
        resolve(this.lastID);
      }
    );
  });
}

module.exports = { createFeedbackTable, insertFeedback };
