// Reminder button action handlers
const { getTokenForTeam } = require('../models/workspaceTokensModel');
const { WebClient } = require('@slack/web-api');
module.exports = function (app, db) {
  // Snooze 1 hour
  app.action('reminder_snooze_1h', async ({ ack, body, client }) => {
    await ack();
    const taskId = body.actions[0].value;
    const workspace_id = body.team.id || body.team_id;
    // Set next_reminder_time to 1 hour from now
    const nextTime = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    db.run(
      `UPDATE tasks SET next_reminder_time = ?, reminder_status = 'pending' WHERE id = ?`,
      [nextTime, taskId],
    );
    getTokenForTeam(workspace_id, async (err, botToken) => {
      if (err || !botToken) {
        console.error('No bot token found for workspace:', workspace_id, err);
        return;
      }
      const realClient = new WebClient(botToken);
      await realClient.chat.postMessage({
        channel: body.user.id,
        text: `:zzz: Task reminder snoozed for 1 hour.`,
      });
    });
  });

  // Snooze 1 day
  app.action('reminder_snooze_1d', async ({ ack, body, client }) => {
    await ack();
    const taskId = body.actions[0].value;
    const workspace_id = body.team.id || body.team_id;
    const nextTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    db.run(
      `UPDATE tasks SET next_reminder_time = ?, reminder_status = 'pending' WHERE id = ?`,
      [nextTime, taskId],
    );
    getTokenForTeam(workspace_id, async (err, botToken) => {
      if (err || !botToken) {
        console.error('No bot token found for workspace:', workspace_id, err);
        return;
      }
      const realClient = new WebClient(botToken);
      await realClient.chat.postMessage({
        channel: body.user.id,
        text: `:zzz: Task reminder snoozed for 1 day.`,
      });
    });
  });

  // Reschedule (prompt user to use /task-edit)
  app.action('reminder_reschedule', async ({ ack, body, client }) => {
    await ack();
    const taskId = body.actions[0].value;
    const workspace_id = body.team.id || body.team_id;
    getTokenForTeam(workspace_id, async (err, botToken) => {
      if (err || !botToken) {
        console.error('No bot token found for workspace:', workspace_id, err);
        return;
      }
      const realClient = new WebClient(botToken);
      await realClient.chat.postMessage({
        channel: body.user.id,
        text: `:calendar: To reschedule, use /task-edit ${taskId} <new due date>.`,
      });
    });
  });
};
