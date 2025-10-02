// models/adminModel.js
const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./tasks.db");

function initAdminTable() {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS admins (
      user_id TEXT PRIMARY KEY
    )`);
  });
}

function addAdmin(userId, callback) {
  db.run(
    `INSERT OR IGNORE INTO admins (user_id) VALUES (?)`,
    [userId],
    callback
  );
}

function removeAdmin(userId, callback) {
  db.run(`DELETE FROM admins WHERE user_id = ?`, [userId], callback);
}

function isAdmin(userId, callback) {
  db.get(`SELECT * FROM admins WHERE user_id = ?`, [userId], (err, row) => {
    callback(err, !!row);
  });
}

module.exports = {
  db,
  initAdminTable,
  addAdmin,
  removeAdmin,
  isAdmin,
};
