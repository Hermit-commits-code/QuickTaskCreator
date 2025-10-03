// models/notificationPreferencesModel.js
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./tasks.db");

function initNotificationPreferencesTable() {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS notification_preferences (
      user_id TEXT PRIMARY KEY,
      mute_all INTEGER DEFAULT 0,
      digest_only INTEGER DEFAULT 0,
      custom_reminder_time TEXT DEFAULT NULL
    )`);
  });
}

function setPreferences(
  userId,
  { muteAll, digestOnly, customReminderTime },
  callback
) {
  db.run(
    `INSERT OR REPLACE INTO notification_preferences (user_id, mute_all, digest_only, custom_reminder_time) VALUES (?, ?, ?, ?)`,
    [userId, muteAll ? 1 : 0, digestOnly ? 1 : 0, customReminderTime || null],
    callback
  );
}

function getPreferences(userId, callback) {
  db.get(
    `SELECT * FROM notification_preferences WHERE user_id = ?`,
    [userId],
    callback
  );
}

module.exports = {
  db,
  initNotificationPreferencesTable,
  setPreferences,
  getPreferences,
};
