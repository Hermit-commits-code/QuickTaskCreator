const connectDB = require('../db');

async function insertFeedback(workspace_id, user_id, feedback) {
  const { encrypt } = require('../utils/encryption');
  const db = await connectDB();
  const encryptedFeedback = encrypt(feedback);
  const result = await db.collection('feedback').insertOne({
    workspace_id,
    user_id,
    feedback: encryptedFeedback,
    timestamp: new Date().toISOString(),
  });
  return result.insertedId;
}

module.exports = { insertFeedback };
