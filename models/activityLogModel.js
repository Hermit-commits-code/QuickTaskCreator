// models/activityLogModel.js
const connectDB = require('../db');

async function logActivity(userId, action, details) {
  const db = await connectDB();
  await db.collection('activity_log').insertOne({
    user_id: userId,
    action,
    details,
    timestamp: new Date().toISOString(),
  });
}

async function getRecentActivity(limit) {
  const db = await connectDB();
  return db
    .collection('activity_log')
    .find({})
    .sort({ timestamp: -1 })
    .limit(limit)
    .toArray();
}

module.exports = {
  logActivity,
  getRecentActivity,
};
