// Legacy Slack Bolt code removed after migration to Express+Slack SDK
const express = require('express');
// DB models
const { db } = require('./models/taskModel');
const {
  initWorkspaceTokensTable,
  saveTokenForTeam,
  getTokenForTeam,
} = require('./models/workspaceTokensModel');
const { initAdminsTable } = require('./models/initDb');
const { initSettingsTable, getSetting } = require('./models/settingsModel');
const { initActivityLogTable } = require('./models/activityLogModel');
const {
  initNotificationPreferencesTable,
} = require('./models/notificationPreferencesModel');
require('dotenv').config();

// Load environment variables
const SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET;
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const PORT = process.env.PORT || 3000;
const EXPRESS_PORT = 3001;

// Initialize DB tables
// MongoDB does not require table initialization

const path = require('path');
const axios = require('axios');
const app = express();
app.use(express.static(path.join(__dirname, 'public')));

// --- OAuth Redirect Handler for Slack Installation ---
app.get('/slack/oauth_redirect', async (req, res) => {
  const code = req.query.code;
  const clientId = process.env.SLACK_CLIENT_ID;
  const clientSecret = process.env.SLACK_CLIENT_SECRET;
  const redirectUri =
    process.env.SLACK_REDIRECT_URI ||
    `${req.protocol}://${req.get('host')}/slack/oauth_redirect`;
  if (!code) {
    return res.status(400).send('Missing code parameter.');
  }
  if (!clientId || !clientSecret) {
    return res
      .status(500)
      .send(
        'Missing SLACK_CLIENT_ID or SLACK_CLIENT_SECRET in environment. Please add them to your .env file.',
      );
  }
  try {
    const response = await axios.get('https://slack.com/api/oauth.v2.access', {
      params: {
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      },
    });
    if (response.data.ok) {
      // Save workspace bot token
      const teamId = response.data.team.id;
      const botToken = response.data.access_token;
      saveTokenForTeam(teamId, botToken).catch((err) => {
        if (err) {
          console.error('Error saving workspace token:', err);
        } else {
          console.log('Saved bot token for team:', teamId);
        }
      });
      res.sendFile(path.join(__dirname, 'public', 'success.html'));
    } else {
      console.error('Slack OAuth error:', response.data);
      res.sendFile(path.join(__dirname, 'public', 'error.html'));
    }
  } catch (err) {
    console.error(
      'Slack OAuth exception:',
      err.response ? err.response.data : err,
    );
    res.status(500).send('OAuth error.');
  }
});

// Register admin handlers and services as needed (migrated to Express)
// TODO: Register admin handlers, commands, and services with Express app if needed
