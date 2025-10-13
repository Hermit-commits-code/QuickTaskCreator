// models/adminModel.js
const connectDB = require('../db');

async function addAdmin(userId, workspace_id) {
  const db = await connectDB();
  await db
    .collection('admins')
    .updateOne(
      { user_id: userId, workspace_id },
      { $setOnInsert: { user_id: userId, workspace_id } },
      { upsert: true },
    );
}

async function removeAdmin(userId, workspace_id) {
  const db = await connectDB();
  await db.collection('admins').deleteOne({ user_id: userId, workspace_id });
}

async function isAdmin(userId, workspace_id) {
  const db = await connectDB();
  const admin = await db
    .collection('admins')
    .findOne({ user_id: userId, workspace_id });
  return !!admin;
}

module.exports = {
  addAdmin,
  removeAdmin,
  isAdmin,
};
