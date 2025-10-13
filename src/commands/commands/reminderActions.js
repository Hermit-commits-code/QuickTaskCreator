// Reminder button action handlers
const { getTokenForTeam } = require('../../models/models/workspaceTokensModel');
const { WebClient } = require('@slack/web-api');
const { ObjectId } = require('mongodb');
const connectDB = require('../../db');
module.exports = function (app) {
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
    // MongoDB update
    const dbConn = await connectDB();
    await dbConn
      .collection('tasks')
      .updateOne(
        { _id: new ObjectId(taskId), workspace_id },
        { $set: { next_reminder_time: nextTime, reminder_status: 'pending' } },
      );
    try {
      const botToken = await getTokenForTeam(workspace_id);
      if (!botToken) {
        if (logger)
          logger.error(
            '[reminder_snooze_1h] No bot token found for workspace:',
            workspace_id,
          );
        else
          console.error(
            '[reminder_snooze_1h] No bot token found for workspace:',
            workspace_id,
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
      }
    } catch (err) {
      if (logger)
        logger.error('[reminder_snooze_1h] Error getting bot token:', err);
      else console.error('[reminder_snooze_1h] Error getting bot token:', err);
    }
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
    // MongoDB update
    const dbConn = await connectDB();
    await dbConn
      .collection('tasks')
      .updateOne(
        { _id: new ObjectId(taskId), workspace_id },
        { $set: { next_reminder_time: nextTime, reminder_status: 'pending' } },
      );
    try {
      const botToken = await getTokenForTeam(workspace_id);
      if (!botToken) {
        if (logger)
          logger.error(
            '[reminder_snooze_1d] No bot token found for workspace:',
            workspace_id,
          );
        else
          console.error(
            '[reminder_snooze_1d] No bot token found for workspace:',
            workspace_id,
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
    } catch (err) {
      if (logger)
        logger.error('[reminder_snooze_1d] Error getting bot token:', err);
      else console.error('[reminder_snooze_1d] Error getting bot token:', err);
    }
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
    try {
      const botToken = await getTokenForTeam(workspace_id);
      if (!botToken) {
        if (logger)
          logger.error(
            '[reminder_reschedule] No bot token found for workspace:',
            workspace_id,
          );
        else
          console.error(
            '[reminder_reschedule] No bot token found for workspace:',
            workspace_id,
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
    } catch (err) {
      if (logger)
        logger.error('[reminder_reschedule] Error getting bot token:', err);
      else console.error('[reminder_reschedule] Error getting bot token:', err);
    }
  });
};
