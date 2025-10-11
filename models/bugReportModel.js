const connectDB = require('../db');

async function insertBugReport(workspace_id, user_id, bug_details) {
  const { encrypt } = require('../utils/encryption');
  const db = await connectDB();
  const encryptedBugDetails = encrypt(bug_details);
  const result = await db.collection('bug_reports').insertOne({
    workspace_id,
    user_id,
    bug_details: encryptedBugDetails,
    timestamp: new Date().toISOString(),
  });
  return result.insertedId;
}

module.exports = { insertBugReport };
