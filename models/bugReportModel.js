// Bug report model for SQLite
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("tasks.db");

function createBugReportTable() {
  db.run(`CREATE TABLE IF NOT EXISTS bug_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    bug_details TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
}

function insertBugReport(user_id, bug_details) {
  return new Promise((resolve, reject) => {
    db.run(
      "INSERT INTO bug_reports (user_id, bug_details) VALUES (?, ?)",
      [user_id, bug_details],
      function (err) {
        if (err) return reject(err);
        resolve(this.lastID);
      }
    );
  });
}

module.exports = { createBugReportTable, insertBugReport };
