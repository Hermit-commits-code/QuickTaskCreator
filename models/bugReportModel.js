// Bug report model for SQLite
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("tasks.db");

function createBugReportTable() {
  db.run(`CREATE TABLE IF NOT EXISTS bug_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workspace_id TEXT NOT NULL,
    user_id TEXT,
    bug_details TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
}

function insertBugReport(workspace_id, user_id, bug_details) {
  const { encrypt } = require("../utils/encryption");
  return new Promise((resolve, reject) => {
    const encryptedBugDetails = encrypt(bug_details);
    db.run(
      "INSERT INTO bug_reports (workspace_id, user_id, bug_details) VALUES (?, ?, ?)",
      [workspace_id, user_id, encryptedBugDetails],
      function (err) {
        if (err) return reject(err);
        resolve(this.lastID);
      }
    );
  });
}

module.exports = { createBugReportTable, insertBugReport };
