// Feedback model for SQLite
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("tasks.db");

function createFeedbackTable() {
  db.run(`CREATE TABLE IF NOT EXISTS feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    feedback TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
}

function insertFeedback(user_id, feedback) {
  return new Promise((resolve, reject) => {
    db.run(
      "INSERT INTO feedback (user_id, feedback) VALUES (?, ?)",
      [user_id, feedback],
      function (err) {
        if (err) return reject(err);
        resolve(this.lastID);
      }
    );
  });
}

module.exports = { createFeedbackTable, insertFeedback };
