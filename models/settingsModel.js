// models/settingsModel.js
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./tasks.db");

function initSettingsTable() {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )`);
    // Set defaults if not present
    db.run(
      `INSERT OR IGNORE INTO settings (key, value) VALUES ('digest_channel', '')`
    );
    db.run(
      `INSERT OR IGNORE INTO settings (key, value) VALUES ('digest_time', '0 9 * * *')`
    ); // 9am
    db.run(
      `INSERT OR IGNORE INTO settings (key, value) VALUES ('reminder_time', '0 8 * * *')`
    ); // 8am
  });
}

function getSetting(key, callback) {
  db.get(`SELECT value FROM settings WHERE key = ?`, [key], (err, row) => {
    callback(err, row ? row.value : null);
  });
}

function setSetting(key, value, callback) {
  db.run(
    `INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`,
    [key, value],
    callback
  );
}

module.exports = {
  db,
  initSettingsTable,
  getSetting,
  setSetting,
};
