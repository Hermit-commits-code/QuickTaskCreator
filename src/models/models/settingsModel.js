// models/settingsModel.js
const connectDB = require('../db');

async function getSetting(key, workspace_id) {
  const db = await connectDB();
  const row = await db.collection('settings').findOne({ key, workspace_id });
  return row ? row.value : null;
}

async function setSetting(key, value, workspace_id) {
  const db = await connectDB();
  await db
    .collection('settings')
    .updateOne({ key, workspace_id }, { $set: { value } }, { upsert: true });
}

module.exports = {
  getSetting,
  setSetting,
};
