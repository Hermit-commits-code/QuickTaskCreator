// Catch-all event handler for debugging and error prevention
// Register generic catch-all handlers after app initialization
// ...existing code...
// Command handlers are now registered in commands.js
const { App } = require("@slack/bolt");
const express = require("express");
// DB models
const { db, initTaskTable } = require("./models/taskModel");
const { initAdminTable } = require("./models/adminModel");
const { initSettingsTable, getSetting } = require("./models/settingsModel");
const { initActivityLogTable } = require("./models/activityLogModel");
const {
  initNotificationPreferencesTable,
} = require("./models/notificationPreferencesModel");
require("dotenv").config();

// Load environment variables
const SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET;
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const PORT = process.env.PORT || 3000;
const EXPRESS_PORT = 3001;

// Initialize DB tables
initTaskTable();
initAdminTable();
initSettingsTable();
initActivityLogTable();
initNotificationPreferencesTable();
const { initAnalyticsTables } = require("./models/analyticsModel");
initAnalyticsTables();
// Ensure feedback and bug report tables exist
const { createFeedbackTable } = require("./models/feedbackModel");
const { createBugReportTable } = require("./models/bugReportModel");
createFeedbackTable();
createBugReportTable();
// Initialize Slack Bolt app
const app = new App({
  signingSecret: SLACK_SIGNING_SECRET,
  token: SLACK_BOT_TOKEN,
  socketMode: false,
  // appToken: process.env.SLACK_APP_TOKEN, // Not needed for HTTP mode
});

// Register admin handlers
const registerAdminHandlers = require("./handlers/admin");
registerAdminHandlers(app, db);

// Register all command handlers
require("./commands")(app, db);
require("./commands/removeAdmin")(app, db);
require("./commands/setconfig")(app, db);
require("./commands/report")(app, db);
require("./commands/auditlog")(app);
require("./commands/welcome")(app); // Onboarding welcome message
require("./commands/help")(app);
require("./commands/support")(app);

// Digest channel config
let digestChannelId = process.env.TASKS_CHANNEL_ID;

// Register services
const { startReminderScheduler } = require("./services/reminderService");
const { startDigestScheduler } = require("./services/digestService");
startReminderScheduler(app);
startDigestScheduler(app, digestChannelId);

// Express server for health check
// Express server removed; Slack Bolt will handle HTTP on port 3000

// Start Slack Bolt app (Socket Mode, no HTTP server)
(async () => {
  await app.start(PORT); // Slack Bolt listens on port 3000
  console.log(`⚡️ Slack Bolt app is running on port ${PORT}`);
})();
