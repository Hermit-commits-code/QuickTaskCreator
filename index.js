// Catch-all event handler for debugging and error prevention
// Register generic catch-all handlers after app initialization
// ...existing code...
// Command handlers are now registered in commands.js
const { App, ExpressReceiver } = require('@slack/bolt');
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

// Set up ExpressReceiver for HTTP endpoints
const receiver = new ExpressReceiver({
  signingSecret: SLACK_SIGNING_SECRET,
  endpoints: ['/slack/commands', '/slack/events'],
});

// Initialize Slack Bolt app with ExpressReceiver

const app = new App({
  token: SLACK_BOT_TOKEN,
  receiver,
});

// Serve static files from /public on the same port
const path = require('path');
receiver.app.use(express.static(path.join(__dirname, 'public')));

// --- OAuth Redirect Handler for Slack Installation ---
const axios = require('axios');
receiver.app.get('/slack/oauth_redirect', async (req, res) => {
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
      saveTokenForTeam(teamId, botToken, (err) => {
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

// Register admin handlers
const registerAdminHandlers = require('./handlers/admin');
registerAdminHandlers(app, db);

// Register all command handlers
require('./commands')(app, db);
require('./commands/removeAdmin')(app, db);
require('./commands/setconfig')(app, db);
require('./commands/report')(app, db);
require('./commands/auditlog')(app);
require('./commands/welcome')(app); // Onboarding welcome message
require('./commands/help')(app);
require('./commands/support')(app);

// Digest channel config
let digestChannelId = process.env.TASKS_CHANNEL_ID;

// Register services
const { startReminderScheduler } = require('./services/reminderService');
const { startDigestScheduler } = require('./services/digestService');
startReminderScheduler(app);
startDigestScheduler(app, digestChannelId);

// Express server for health check
// Express server removed; Slack Bolt will handle HTTP on port 3000

// Start Slack Bolt app (HTTP server)
(async () => {
  await app.start(PORT);
  console.log(`⚡️ Slack Bolt app is running on port ${PORT}`);
})();
