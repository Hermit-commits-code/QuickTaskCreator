// check_invalid_users.js

// Script to find invalid Slack user IDs in the tasks collection (MongoDB)
const connectDB = require('./db');
const axios = require('axios');
require('dotenv').config();

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;

async function checkUser(userId) {
  try {
    const response = await axios.get('https://slack.com/api/users.info', {
      params: { user: userId },
      headers: { Authorization: `Bearer ${SLACK_BOT_TOKEN}` },
    });
    return response.data.ok;
  } catch (e) {
    return false;
  }
}

(async () => {
  try {
    const db = await connectDB();
    const tasks = await db
      .collection('tasks')
      .find({ assigned_user: { $ne: null } })
      .project({ _id: 1, assigned_user: 1 })
      .toArray();
    for (const task of tasks) {
      if (!task.assigned_user) continue;
      const valid = await checkUser(task.assigned_user);
      if (!valid) {
        console.log(`Task ${task._id} has invalid user: ${task.assigned_user}`);
      }
    }
    process.exit(0);
  } catch (err) {
    console.error('DB error:', err);
    process.exit(1);
  }
})();
