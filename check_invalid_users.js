// check_invalid_users.js
// Script to find invalid Slack user IDs in the tasks table
const sqlite3 = require('sqlite3').verbose();
const axios = require('axios');
require('dotenv').config();

const db = new sqlite3.Database('./tasks.db');
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

db.all(
  'SELECT id, assigned_user FROM tasks WHERE assigned_user IS NOT NULL',
  async (err, rows) => {
    if (err) {
      console.error('DB error:', err);
      process.exit(1);
    }
    for (const row of rows) {
      if (!row.assigned_user) continue;
      const valid = await checkUser(row.assigned_user);
      if (!valid) {
        console.log(`Task ${row.id} has invalid user: ${row.assigned_user}`);
      }
    }
    db.close();
  },
);
