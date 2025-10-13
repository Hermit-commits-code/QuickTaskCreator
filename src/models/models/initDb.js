// models/initDb.js
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./tasks.db");

// Ensure admins table exists with correct schema
function initAdminsTable() {
  db.run(`CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    workspace_id TEXT NOT NULL
  )`);
}

// You can call this function at app startup
initAdminsTable();

module.exports = { db, initAdminsTable };
