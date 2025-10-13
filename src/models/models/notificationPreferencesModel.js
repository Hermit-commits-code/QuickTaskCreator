// models/notificationPreferencesModel.js
const connectDB = require('../db');

async function setPreferences(
  userId,
  { muteAll, digestOnly, customReminderTime },
) {
  const db = await connectDB();
  await db.collection('notification_preferences').updateOne(
    { user_id: userId },
    {
      $set: {
        mute_all: muteAll ? 1 : 0,
        digest_only: digestOnly ? 1 : 0,
        custom_reminder_time: customReminderTime || null,
      },
    },
    { upsert: true },
  );
}

async function getPreferences(userId) {
  const db = await connectDB();
  return db.collection('notification_preferences').findOne({ user_id: userId });
}

module.exports = {
  setPreferences,
  getPreferences,
};
