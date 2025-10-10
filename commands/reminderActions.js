// Reminder button action handlers
const { getTokenForTeam } = require('../models/workspaceTokensModel');
const { WebClient } = require('@slack/web-api');
module.exports = function (app, db) {
  // Snooze 1 hour
  app.action('reminder_snooze_1h', async ({ ack, body, client, logger }) => {
    await ack();
    const taskId = body.actions[0].value;
    const workspace_id = body.team.id || body.team_id;
    const user_id = body.user.id;
    if (logger) {
      logger.info(
        `[reminder_snooze_1h] workspace_id: ${workspace_id}, user_id: ${user_id}`,
      );
    } else {
      console.log(
        '[reminder_snooze_1h] workspace_id:',
        workspace_id,
        'user_id:',
        user_id,
      );
    }
    const nextTime = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    db.run(
      `UPDATE tasks SET next_reminder_time = ?, reminder_status = 'pending' WHERE id = ?`,
      [nextTime, taskId],
    );
    getTokenForTeam(workspace_id, async (err, botToken) => {
      if (err || !botToken) {
        if (logger)
          logger.error(
            '[reminder_snooze_1h] No bot token found for workspace:',
            workspace_id,
            err,
          );
        else
          console.error(
            '[reminder_snooze_1h] No bot token found for workspace:',
            workspace_id,
            err,
          );
        return;
      }
      const realClient = new WebClient(botToken);
      try {
        await realClient.chat.postMessage({
          channel: user_id,
          text: `:zzz: Task reminder snoozed for 1 hour.`,
        });
      } catch (apiErr) {
        if (logger)
          logger.error('[reminder_snooze_1h] Slack API error:', apiErr);
        else console.error('[reminder_snooze_1h] Slack API error:', apiErr);
        // Optionally handle channel/user errors here
      }
    });
  });

  // Snooze 1 day
  app.action('reminder_snooze_1d', async ({ ack, body, client, logger }) => {
    await ack();
    const taskId = body.actions[0].value;
    const workspace_id = body.team.id || body.team_id;
    const user_id = body.user.id;
    if (logger) {
      logger.info(
        `[reminder_snooze_1d] workspace_id: ${workspace_id}, user_id: ${user_id}`,
      );
    } else {
      console.log(
        '[reminder_snooze_1d] workspace_id:',
        workspace_id,
        'user_id:',
        user_id,
      );
    }
    const nextTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    db.run(
      `UPDATE tasks SET next_reminder_time = ?, reminder_status = 'pending' WHERE id = ?`,
      [nextTime, taskId],
    );
    getTokenForTeam(workspace_id, async (err, botToken) => {
      if (err || !botToken) {
        if (logger)
          logger.error(
            '[reminder_snooze_1d] No bot token found for workspace:',
            workspace_id,
            err,
          );
        else
          console.error(
            '[reminder_snooze_1d] No bot token found for workspace:',
            workspace_id,
            err,
          );
        return;
      }
      const realClient = new WebClient(botToken);
      try {
        await realClient.chat.postMessage({
          channel: user_id,
          text: `:zzz: Task reminder snoozed for 1 day.`,
        });
      } catch (apiErr) {
        if (logger)
          logger.error('[reminder_snooze_1d] Slack API error:', apiErr);
        else console.error('[reminder_snooze_1d] Slack API error:', apiErr);
      }
    });
  });

  // Reschedule (prompt user to use /task-edit)
  app.action('reminder_reschedule', async ({ ack, body, client, logger }) => {
    await ack();
    const taskId = body.actions[0].value;
    const workspace_id = body.team.id || body.team_id;
    const user_id = body.user.id;
    if (logger) {
      logger.info(
        `[reminder_reschedule] workspace_id: ${workspace_id}, user_id: ${user_id}`,
      );
    } else {
      console.log(
        '[reminder_reschedule] workspace_id:',
        workspace_id,
        'user_id:',
        user_id,
      );
    }
    getTokenForTeam(workspace_id, async (err, botToken) => {
      if (err || !botToken) {
        if (logger)
          logger.error(
            '[reminder_reschedule] No bot token found for workspace:',
            workspace_id,
            err,
          );
        else
          console.error(
            '[reminder_reschedule] No bot token found for workspace:',
            workspace_id,
            err,
          );
        return;
      }
      const realClient = new WebClient(botToken);
      try {
        await realClient.chat.postMessage({
          channel: user_id,
          text: `:calendar: To reschedule, use /task-edit ${taskId} <new due date>.`,
        });
      } catch (apiErr) {
        if (logger)
          logger.error('[reminder_reschedule] Slack API error:', apiErr);
        else console.error('[reminder_reschedule] Slack API error:', apiErr);
      }
    });
  });
};
